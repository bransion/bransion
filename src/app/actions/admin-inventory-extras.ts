// =====================================================================
// BRANSION — Small inventory extras.
// =====================================================================
'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';

export async function adminUnarchiveSubStyle(id: string) {
  try {
    const { admin } = await assertAdmin();
    const { error } = await admin
      .from('sub_children_styles')
      .update({ is_active: true })
      .eq('id', id);
    if (error) throw error;

    revalidatePath('/admin/inventory');
    revalidatePath('/products/create');
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : 'Failed to unarchive style',
    };
  }
}