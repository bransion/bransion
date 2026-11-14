// =====================================================================
// BRANSION — Sign-in route. Public.
// URL: /sign-in (route group "(auth)" is invisible in the URL).
// =====================================================================
import { AuthForm } from '@/components/auth/auth-form';

export const metadata = {
  title: 'Sign in — Bransion',
  description: 'Sign in with Google to shop or start earning as a creator.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return <AuthForm mode="sign-in" next={next ?? '/dashboard'} error={error} />;
}
