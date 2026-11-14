// =====================================================================
// BRANSION — Global error boundary.
// 'use client' — Next.js requires this for error boundaries (uses hooks).
// Catches runtime errors in any route below app/layout.tsx.
// Shows a friendly message + retry button + error digest for support.
// =====================================================================
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for local debugging. In production, hook this into
    // Sentry, Logtail, or Vercel's built-in logs.
    console.error('[Bransion Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            An unexpected error occurred. You can try again, or go back to the
            dashboard.
          </p>
          {error.digest && (
            <p className="mt-3 text-[11px] font-mono text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button onClick={() => reset()} className="w-full sm:w-auto">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Go to dashboard
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground pt-4">
          If this keeps happening, message us on WhatsApp with the error ID
          above.
        </p>
      </div>
    </div>
  );
}