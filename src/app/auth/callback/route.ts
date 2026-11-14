// =====================================================================
// BRANSION — Google OAuth callback (+ referral attach).
// 1. Exchange OAuth code → session
// 2. If email matches ADMIN_EMAIL → promote to admin
// 3. If bransion_ref cookie present → attach referral, clear cookie
// 4. Redirect to `next` or /dashboard
// =====================================================================
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { serverEnv } from '@/lib/env';
import { serviceRoleClient } from '@/lib/supabase/server';
import { attachReferralToProfile } from '@/lib/referral/attach';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
            // Ignore — session cookies land on the redirect response below.
          }
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/sign-in?error=no_user`);
  }

  // ── Admin promotion (server-side, unforgeable) ────────────────────
  const isAdminEmail =
    user.email &&
    user.email.toLowerCase() === serverEnv.ADMIN_EMAIL.toLowerCase();

  if (isAdminEmail) {
    const admin = serviceRoleClient();
    await admin.from('profiles').upsert(
      {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    await admin.from('profiles').update({ role: 'admin' }).eq('id', user.id);
  }

  // ── Referral attach (fires at most once per user) ─────────────────
  const refCode = cookieStore.get('bransion_ref')?.value;
  if (refCode) {
    try {
      await attachReferralToProfile(user.id, refCode);
    } catch (err) {
      // Never block login on referral failures
      console.error('Referral attach failed:', err);
    }
    try {
      cookieStore.delete({ name: 'bransion_ref', path: '/' });
    } catch {
      // Cookie deletion is best-effort — ignore
    }
  }

  // ── Redirect (safe relative next, default /dashboard) ────────────
  const safeNext =
    next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  return NextResponse.redirect(`${origin}${safeNext}`);
}