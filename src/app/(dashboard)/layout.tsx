// =====================================================================
// BRANSION — Dashboard layout (creator shell).
// await connection() + export const instant = false allows this route
// to fetch data at request time, avoiding the Next.js 16 prerender crash.
// =====================================================================
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { cookies } from 'next/headers';


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ⚠️ MUST be the first statement — marks this layout dynamic
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, role')
    .eq('id', user.id)
    .maybeSingle();

  const navUser = {
    full_name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    email: profile?.email ?? user.email ?? '',
    avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
    role: profile?.role ?? 'buyer',
  };

  // Impersonation check
  const cookieStore = await cookies();
  const impersonatedId = cookieStore.get('admin_impersonating_user_id')?.value;
  let impersonatedUser: { full_name: string | null; email: string } | null = null;
  if (impersonatedId) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', impersonatedId)
      .maybeSingle();
    impersonatedUser = data;
  }

  return (
    <div className="min-h-screen bg-background">
      {impersonatedUser && <ImpersonationBanner user={impersonatedUser} />}
      <DashboardNav user={navUser} />
      <div className="md:pl-64">
        <main className="pb-20 md:pb-0">{children}</main>
      </div>
    </div>
  );
}