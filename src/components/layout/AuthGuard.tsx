// =====================================================================
// BRANSION — Second-layer client gate.
// Middleware is the FIRST layer (server-side redirect). AuthGuard is
// the SECOND (client-side check inside a protected page). Together they
// cover race conditions, cache quirks, and browser back-button past
// session expiry.
// Usage in a protected layout:
//   <AuthGuard>{children}</AuthGuard>
// =====================================================================
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  /** Optional: restrict to a specific role. If set, non-matching users get bounced. */
  requireRole?: 'admin' | 'creator' | 'buyer';
}

export function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'checking' | 'authorized' | 'denied'>(
    'checking'
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        // Client-side redirect as a safety net (middleware usually
        // catches this before we even mount).
        router.replace(
          `/sign-in?next=${encodeURIComponent(pathname || '/dashboard')}`
        );
        setStatus('denied');
        return;
      }

      if (requireRole) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profile?.role !== requireRole) {
          router.replace('/store');
          setStatus('denied');
          return;
        }
      }

      setStatus('authorized');
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname, requireRole]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Checking your session…</span>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return null; // Redirect is already in flight.
  }

  return <>{children}</>;
}