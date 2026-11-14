// =====================================================================
// BRANSION — Root route.
// Middleware gates unauthenticated → /sign-in.
// Logged-in users hitting / go to their dashboard.
// =====================================================================
import { redirect } from 'next/navigation';

export default async function RootPage() {
  redirect('/dashboard');
}