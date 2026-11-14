// =====================================================================
// BRANSION — Supabase server clients.
//   1. createClient()      → session-aware, respects RLS (server components / route handlers)
//   2. serviceRoleClient() → bypasses RLS, SERVER-ONLY (admin routes, webhook, order creation)
// =====================================================================
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { clientEnv, requireServerEnv } from '@/lib/env';

/**
 * Session-aware server client. Reads the current user's session from
 * HttpOnly cookies. Respects Row Level Security.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components can't set cookies — silently ignore.
            // Session refresh happens in middleware instead.
          }
        },
      },
    }
  );
}

/**
 * ⚠️ SERVICE-ROLE CLIENT — BYPASSES ALL Row Level Security.
 * Runtime guard throws if called from the browser so the master key
 * can never leak into a client bundle.
 *
 * Allowed use cases ONLY:
 *   • /api/paystack/webhook (must update any order)
 *   • Admin promotion in /auth/callback
 *   • Order creation in /api/orders/*
 *   • /admin/* server routes that need cross-user reads
 */
export function serviceRoleClient() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'serviceRoleClient is SERVER-ONLY. Never import it from a "use client" component.'
    );
  }
  const env = requireServerEnv();

  return createSupabaseJsClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}