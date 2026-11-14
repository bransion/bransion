// =====================================================================
// BRANSION — Shared auth helpers for API routes.
//
// getSessionUser()   → { user, supabase } | null
//   Reads the authenticated user from HttpOnly cookies via Supabase SSR.
//   The returned `supabase` is a SESSION-scoped client (RLS applies).
//
// requireAdmin()     → { user, supabase } | NextResponse(401/403)
//   Assumes a valid session + checks profiles.role = 'admin'.
//
// CSRF note: @supabase/ssr sets cookies with sameSite=lax by default
// (verified in @supabase/ssr source). This is our CSRF defense for all
// state-changing POST routes — same-site forms can't read or forge these
// cookies, and cross-origin HTML form posts can't set them.
// =====================================================================
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface AuthUser {
  id: string;
  email: string;
}

export type SessionSupabase = Awaited<ReturnType<typeof createClient>>;

export interface AuthSession {
  user: AuthUser;
  supabase: SessionSupabase;
  isImpersonating: boolean;
}

/**
 * Return the currently authenticated user + a session-scoped Supabase
 * client, or null if there is no valid session.
 */
export async function getSessionUser(): Promise<AuthSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;
  const cookieStore = await cookies();
  const isImpersonating = !!cookieStore.get('admin_impersonating_user_id')?.value;
  return { user: { id: user.id, email: user.email }, supabase, isImpersonating };
}

/**
 * Require an authenticated admin. Returns either:
 *   • { user, supabase }  → caller is an authenticated admin
 *   • NextResponse(401)   → no session
 *   • NextResponse(403)   → session exists but role ≠ 'admin'
 */
export async function requireAdmin(): Promise<
  { user: AuthUser; supabase: SessionSupabase } | NextResponse
> {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (session.isImpersonating) {
    return NextResponse.json({ error: 'Cannot perform write actions while impersonating' }, { status: 403 });
  }

  const { data: profile } = await session.supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return session;
}

/**
 * Type guard: distinguishes NextResponse (error) from AuthSession (success).
 * Usage:
 *   const auth = await requireAdmin();
 *   if (isNextResponse(auth)) return auth;
 *   // ...auth.user is now typed
 */
export function isNextResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}