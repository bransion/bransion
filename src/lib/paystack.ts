// =====================================================================
// BRANSION — Paystack API client.
// SERVER-ONLY — imported by /api/paystack/* route handlers only.
// Uses plain fetch (no SDK) per spec Part 2.1 — fewer moving parts.
// All Paystack amounts are in KOBO (1 NGN = 100 kobo).
// =====================================================================
import { createHmac, timingSafeEqual } from 'crypto';
import { requireServerEnv } from './env';

const PAYSTACK_BASE = 'https://api.paystack.co';

// ── INITIALIZE — create a payment and get the redirect URL ───────────
export interface InitTransactionParams {
  email: string;
  amountKobo: number; // Paystack expects kobo, not naira
  reference: string;  // UUID we generate — makes webhook idempotency possible
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializeTransaction(
  params: InitTransactionParams
): Promise<InitTransactionResult> {
  const env = requireServerEnv();
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    }),
  });

  const json = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: InitTransactionResult;
  };

  if (!res.ok || !json.status || !json.data) {
    throw new Error(`Paystack initialize failed: ${json.message ?? res.statusText}`);
  }
  return json.data;
}

// ── VERIFY — called on /checkout/success to confirm payment ──────────
export interface VerifyResult {
  status: 'success' | 'failed' | 'abandoned' | 'pending' | string;
  reference: string;
  amount: number; // kobo
  metadata: Record<string, unknown>;
  paidAt: string | null;
}

export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const env = requireServerEnv();
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
    }
  );

  const json = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: {
      status: string;
      reference: string;
      amount: number;
      metadata?: Record<string, unknown>;
      paid_at?: string | null;
    };
  };

  if (!res.ok || !json.status || !json.data) {
    throw new Error(`Paystack verify failed: ${json.message ?? res.statusText}`);
  }

  const d = json.data;
  return {
    status: d.status,
    reference: d.reference,
    amount: d.amount,
    metadata: d.metadata ?? {},
    paidAt: d.paid_at ?? null,
  };
}

// ── WEBHOOK SIGNATURE — cryptographic proof the request is from Paystack
// Paystack sends `x-paystack-signature` = HMAC-SHA512(secret, raw body).
// We compare using timingSafeEqual to prevent timing attacks.
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  const env = requireServerEnv();
  const expected = createHmac('sha512', env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}