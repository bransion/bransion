// =====================================================================
// BRANSION — Shared auth form (client component).
// Used by BOTH /sign-in and /sign-up — identical button & flow, only
// the marketing subtext differs. Calls Supabase Google OAuth.
// =====================================================================
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type AuthMode = 'sign-in' | 'sign-up';

interface AuthFormProps {
  mode: AuthMode;
  next: string;
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: 'Google sign-in failed. Please try again.',
  missing_code: 'No sign-in code was returned. Please try again.',
  no_user: 'Could not load your account. Please try again.',
};

const COPY: Record<AuthMode, { headline: string; subtext: string; cta: string }> = {
  'sign-in': {
    headline: 'Welcome back',
    subtext: 'Sign in with Google to shop, manage your brand, or track orders.',
    cta: 'Continue with Google',
  },
  'sign-up': {
    headline: 'Start earning today',
    subtext:
      'Create your free Bransion account. Upload a design, set your markup, keep 70% of every sale.',
    cta: 'Continue with Google',
  },
};

export function AuthForm({ mode, next, error }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const initialError = error
    ? ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.'
    : null;
  const displayError = localError ?? initialError;
  const copy = COPY[mode];

  async function handleSignIn() {
    setLoading(true);
    setLocalError(null);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      if (signInError) throw signInError;
      // Browser is navigating to Google — leave loading ON.
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : 'Sign in failed. Please try again.'
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* ── LEFT: brand story (hidden on mobile) ──────────────────── */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#0B0B0F] text-white">
        <div className="text-2xl font-bold tracking-tight">BRANSION</div>

        <div className="space-y-6 max-w-md">
          <h1 className="text-5xl font-bold leading-tight">
            Wear your{' '}
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
              brand.
            </span>
          </h1>
          <p className="text-lg text-gray-300 leading-relaxed">
            Upload a design, pick an apparel, set your price, and start earning.
            Bransion handles printing, shipping, and payments.
          </p>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-white">✓</span>
              <span>70% of every markup goes straight to you</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white">✓</span>
              <span>Zero upfront cost on apparel inventory</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white">✓</span>
              <span>Track earnings, withdraw any time</span>
            </li>
          </ul>
        </div>

        <div className="text-xs text-gray-500">
          © {new Date().getFullYear()} Bransion · Made in Nigeria
        </div>
      </div>

      {/* ── RIGHT: auth card ─────────────────────────────────────── */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden text-2xl font-bold text-center">
            BRANSION
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              {copy.headline}
            </h2>
            <p className="text-sm text-muted-foreground">{copy.subtext}</p>
          </div>

          {displayError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {displayError}
            </div>
          )}

          <Button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to Google…
              </>
            ) : (
              <>
                <GoogleIcon />
                {copy.cta}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            By continuing, you agree to Bransion&apos;s Terms of Service and
            Privacy Policy. Bransion never posts on your behalf.
          </p>
        </div>
      </div>
    </div>
  );
}

// Official Google brand mark.
function GoogleIcon() {
  return (
    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 5.04c1.71 0 3.24.59 4.44 1.74l3.31-3.31C17.74 1.68 15.1.75 12 .75 7.31.75 3.28 3.44 1.28 7.35l3.86 2.99C6.09 7.05 8.82 5.04 12 5.04z"
      />
      <path
        fill="#4285F4"
        d="M23.25 12.27c0-.79-.07-1.55-.2-2.27H12v4.51h6.3c-.27 1.45-1.09 2.68-2.32 3.51l3.58 2.77c2.09-1.93 3.69-4.77 3.69-8.52z"
      />
      <path
        fill="#FBBC05"
        d="M5.14 14.66c-.24-.71-.38-1.47-.38-2.26s.14-1.55.38-2.26L1.28 7.35C.46 9.01 0 10.86 0 12.75s.46 3.74 1.28 5.4l3.86-3.49z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.58-2.77c-1 .67-2.28 1.07-4.36 1.07-3.18 0-5.91-2.01-6.86-5.32l-3.86 2.99C3.28 20.56 7.31 24 12 24z"
      />
    </svg>
  );
}