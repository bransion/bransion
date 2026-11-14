// =====================================================================
// BRANSION — Session refresh helper called by src/middleware.ts.
// Wraps Next 15's cookie-based Supabase client construction and returns
// both the (possibly refreshed) response and the authenticated user.
// =====================================================================
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { clientEnv } from '@/lib/env';

export interface UpdateSessionResult {
  response: NextResponse;
  user: { id: string; email?: string } | null;
}

/**
 * Refresh the Supabase session cookie on every request and return the
 * current user (or null if unauthenticated).
 *
 * IMPORTANT: this does NOT decide to redirect — it only refreshes and
 * reports. The route-gating policy lives in src/middleware.ts so it's
 * easy to change in one place.
 */
export async function updateSession(
  request: NextRequest
): Promise<UpdateSessionResult> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror onto the request first (so downstream sees them)...
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // ...then rebuild the response and set them there too.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() also triggers automatic token refresh if the access token
  // is expired but the refresh token is still valid.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    response,
    user: user ? { id: user.id, email: user.email ?? undefined } : null,
  };
}