// =====================================================================
// BRANSION — Store sub-layout.
// Wraps every /store/* page with Header + Footer.
// Fetches user (for header) and tier (for CreateBrandNudge).
// =====================================================================
import { createClient } from '@/lib/supabase/server';
import { Header, type HeaderUser } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CreateBrandNudge } from '@/components/storefront/CreateBrandNudge';

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let headerUser: HeaderUser | null = null;
  let userTier = 'none';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, avatar_url, role, tier')
      .eq('id', user.id)
      .maybeSingle();

    headerUser = {
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
      email: profile?.email ?? user.email ?? '',
      avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      role: profile?.role ?? 'buyer',
    };
    userTier = profile?.tier ?? 'none';
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header user={headerUser} />
      <main className="flex-1">{children}</main>
      <Footer />
      {headerUser && <CreateBrandNudge userTier={userTier} />}
    </div>
  );
}