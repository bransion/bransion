// =====================================================================
// BRANSION — Admin delivery fees server actions.
// =====================================================================
'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';

export interface GeoShippingRate {
  id: string;
  state: string;
  lga: string;
  fee: number;
  is_active: boolean;
  updated_at: string;
}

export async function listGeoShippingRates(): Promise<GeoShippingRate[]> {
  const { admin } = await assertAdmin();
  const { data, error } = await admin
    .from('geo_shipping_rates')
    .select('id, state, lga, fee, is_active, updated_at')
    .order('state')
    .order('lga');

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    ...r,
    fee: Number(r.fee),
  }));
}

export async function upsertGeoShippingRate(input: {
  id?: string;
  state: string;
  lga: string;
  fee: number;
  is_active: boolean;
}) {
  try {
    const { admin } = await assertAdmin();

    const payload = {
      state: input.state.trim(),
      lga: input.lga.trim(),
      fee: input.fee,
      is_active: input.is_active,
    };

    if (input.id) {
      const { error } = await admin
        .from('geo_shipping_rates')
        .update(payload)
        .eq('id', input.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from('geo_shipping_rates').insert(payload);
      if (error) throw error;
    }

    revalidatePath('/admin/delivery-fees');
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : 'Failed to save rate',
    };
  }
}

export async function deleteGeoShippingRate(id: string) {
  try {
    const { admin } = await assertAdmin();
    const { error } = await admin
      .from('geo_shipping_rates')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/delivery-fees');
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : 'Failed to delete rate',
    };
  }
}