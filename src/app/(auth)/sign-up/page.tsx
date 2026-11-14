// =====================================================================
// BRANSION — Sign-up route. Public.
// Functionally identical to sign-in (same Google button); only the
// marketing subtext differs (see AuthForm's COPY map).
// =====================================================================
import { AuthForm } from '@/components/auth/auth-form';

export const metadata = {
  title: 'Create account — Bransion',
  description:
    'Create your free Bransion account. Upload a design, set your markup, keep 70% of every sale.',
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return <AuthForm mode="sign-up" next={next ?? '/dashboard'} error={error} />;
}