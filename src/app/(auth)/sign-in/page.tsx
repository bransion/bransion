import { AuthForm } from '@/components/auth/auth-form';

export const metadata = {
  title: 'Sign in — Bransion',
  description: 'Sign in with Google to shop or start earning as a creator.',
};

export default function SignInPage() {
  return <AuthForm mode="sign-in" />;
}