import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Sign in — Bransion",
  description: "Sign in with Google to shop or start earning as a creator.",
};

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthForm mode="sign-in" />
    </Suspense>
  );
}
