import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Create account — Bransion",
  description:
    "Create your free Bransion account. Upload a design, set your markup, keep 70% of every sale.",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthForm mode="sign-up" />
    </Suspense>
  );
}
