// =====================================================================
// BRANSION — Admin shell layout.
// await connection() forces request-time rendering (avoids Date.now() error).
// export const instant = false allows this blocking route in Next.js 16.3+.
// =====================================================================
import { connection } from 'next/server';
import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';

export const metadata = { title: 'Admin — Bransion' };

// Allow this route to block (fetch data at request time) instead of prerendering
export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const admin = serviceRoleClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    redirect('/store');
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav
        user={{
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
        }}
      />
      <div className="md:pl-64">
        <main className="pb-20 md:pb-0">{children}</main>
      </div>
    </div>
  );
}