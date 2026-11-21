// =====================================================================
// BRANSION — Account deletion actions.
// Blocks sole-admin deletion to prevent lockout.
// =====================================================================
'use server';

import { createClient, serviceRoleClient } from '@/lib/supabase/server';

export interface DeletionPreview {
  brandCount: number;
  productCount: number;
  walletBalance: number;
  isAdmin: boolean;
  isSoleAdmin: boolean;
  orderCount: number;
}

export async function getDeletionPreview(): Promise<DeletionPreview | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = serviceRoleClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('role, wallet_balance')
    .eq('id', user.id)
    .maybeSingle();

  const { data: brands } = await admin
    .from('brands')
    .select('id')
    .eq('creator_id', user.id);
  const brandIds = (brands ?? []).map((b) => b.id);

  let productCount = 0;
  if (brandIds.length > 0) {
    const { count } = await admin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .in('brand_id', brandIds);
    productCount = count ?? 0;
  }

  const { count: orderCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', user.id);

  let isSoleAdmin = false;
  if (profile?.role === 'admin') {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');
    isSoleAdmin = (count ?? 0) <= 1;
  }

  return {
    brandCount: brands?.length ?? 0,
    productCount,
    walletBalance: Number(profile?.wallet_balance ?? 0),
    isAdmin: profile?.role === 'admin',
    isSoleAdmin,
    orderCount: orderCount ?? 0,
  };
}

export async function deleteMyAccount(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not signed in' };

    const admin = serviceRoleClient();

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'admin') {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if ((count ?? 0) <= 1) {
        return {
          ok: false,
          error:
            'You are the only admin. Promote another user to admin first, or this will lock everyone out of admin access.',
        };
      }
    }

    // Delete auth.users — cascades profiles → brands → products.
    // Orders preserved with buyer_id/brand_id SET NULL.
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to delete account',
    };
  }
}