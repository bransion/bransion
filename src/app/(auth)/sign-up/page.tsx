import { AuthForm } from '@/components/auth/auth-form';

// Allow this route to block — it reads searchParams (?next= / ?error=)
export const instant = false;

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