// =====================================================================
// BRANSION — Simple in-memory sliding-window rate limiter.
//
// ⚠️ LIMITATIONS (read before going live):
//   • Per-process memory only. On Vercel serverless, each instance has
//     its own Map — an attacker hitting multiple lambdas gets multiple
//     windows. This is intentionally a "first wall" not a fortress.
//   • For production-grade distributed rate limiting, replace with
//     @upstash/ratelimit + Upstash Redis (or Vercel KV) — a drop-in
//     swap of checkRateLimit()'s internals; the API stays identical.
//
// This file works well for: local dev, single-instance deploys, and
// catching naive bots / runaway tab reloads.
// =====================================================================

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically prune expired buckets so the Map doesn't grow forever.
// Best-effort — the runtime does not guarantee this fires. If not, entries
// are still cleaned up on next access to the same key.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets.entries()) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Time window in milliseconds (e.g. 60_000 = 1 minute). */
  windowMs: number;
  /** Max requests allowed per window per IP. */
  max: number;
  /** Scope prefix so different endpoints don't share buckets. */
  keyPrefix: string;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

/**
 * Extract a best-effort client IP from common proxy headers.
 * Falls back to 'unknown' — treat as a single shared bucket if no IP.
 */
function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

/**
 * Check + increment the rate limit bucket for this request.
 * Call at the very top of a POST handler; return 429 if !ok.
 */
export function checkRateLimit(
  req: Request,
  opts: RateLimitOptions
): RateLimitResult {
  const ip = getClientIp(req);
  const key = `${opts.keyPrefix}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  // No bucket or window expired → start fresh.
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: opts.max - 1, resetAt, retryAfterSec: 0 };
  }

  // Window still active, already at max → reject.
  if (bucket.count >= opts.max) {
    return {
      ok: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  // Room left → increment and allow.
  bucket.count++;
  return {
    ok: true,
    remaining: opts.max - bucket.count,
    resetAt: bucket.resetAt,
    retryAfterSec: 0,
  };
}

/**
 * Standard 429 response with Retry-After header.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please wait and try again.',
      retry_after_seconds: result.retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSec),
      },
    }
  );
}