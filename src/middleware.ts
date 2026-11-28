// =====================================================================
// BRANSION — Auth gate middleware (+ referral cookie capture).
// Rule 🅰️: gate everything. Only truly-public paths skip the session.
// Refreshes session + captures ?ref=CODE into HttpOnly cookie.
// =====================================================================
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const TRULY_PUBLIC_PATHS = [
  '/auth/callback',
  '/auth/signout',
  '/api/paystack/webhook',
  '/api/cron/maintenance',
  '/privacy',
  '/terms',
];

const AUTH_ENTRY_PATH = '/sign-in';

const STATIC_EXT = /\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2|ttf|map)$/i;

// ── Referral cookie capture ───────────────────────────────────────────
const REF_COOKIE_NAME = 'bransion_ref';
const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const REF_FORMAT = /^BRN-[A-Z0-9]{4}-[A-Z0-9]{2}$/;

function attachRefCookie(res: NextResponse, ref: string | null): NextResponse {
  if (ref) {
    res.cookies.set(REF_COOKIE_NAME, ref, {
      maxAge: REF_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Capture ?ref=CODE from ANY request (before any redirect)
  const rawRef = request.nextUrl.searchParams.get('ref');
  const ref = rawRef && REF_FORMAT.test(rawRef) ? rawRef : null;

  // 1) Static assets → allow.
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    STATIC_EXT.test(pathname)
  ) {
    return attachRefCookie(NextResponse.next(), ref);
  }

  // 2) Truly public → allow.
  if (
    TRULY_PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  ) {
    return attachRefCookie(NextResponse.next(), ref);
  }

  // 3) Refresh session.
  const { response, user } = await updateSession(request);

  // 4) Auth entry page — public, but logged-in users get bounced.
  if (pathname === AUTH_ENTRY_PATH || pathname === '/welcome') {
    if (user) {
      const nextParam = request.nextUrl.searchParams.get('next');
      const target =
        nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
          ? nextParam
          : '/store';
      return attachRefCookie(
        NextResponse.redirect(new URL(target, request.url)),
        ref
      );
    }
    return attachRefCookie(response, ref);
  }

  // 5) Not logged in → /sign-in?next=...
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = '';
    url.searchParams.set('next', pathname + search);
    return attachRefCookie(NextResponse.redirect(url), ref);
  }

  // 6) Admin gate.
  if (pathname.startsWith('/admin')) {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return attachRefCookie(
        NextResponse.redirect(new URL('/store', request.url)),
        ref
      );
    }
  }

  // 7) All checks passed.
  return attachRefCookie(response, ref);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};