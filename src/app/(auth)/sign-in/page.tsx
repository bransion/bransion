import { AuthForm } from '@/components/auth/auth-form';

// Allow this route to block — it reads searchParams (?next= / ?error=)
export const instant = false;

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