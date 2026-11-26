// =====================================================================
// BRANSION — Admin inventory actions v2.
// Edit / Delete / Unarchive with cascades + notifications.
// Does NOT replace admin-inventory.ts (v1 remains intact).
// =====================================================================
'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { roundMoney } from '@/lib/pricing';

// ── Helpers ──────────────────────────────────────────────────────────

async function recalcProductsForApparel(
  admin: ReturnType<typeof assertAdmin> extends Promise<{ admin: infer A }> ? A : never,
  apparelId: string
) {
  // Fetch fresh apparel
  const { data: apparel } = await admin
    .from('base_plain_apparel')
    .select('*')
    .eq('id', apparelId)
    .single();

  if (!apparel) return { productsAffected: 0, creatorMap: new Map<string, string[]>() };

  // Fetch all products using this apparel
  const { data: products } = await admin
    .from('products')
    .select(
      'id, name, selected_size, user_profit_markup, selected_style_id, brands(creator_id)'
    )
    .eq('plain_apparel_id', apparelId);

  type Row = {
    id: string;
    name: string;
    selected_size: string | null;
    user_profit_markup: number | null;
    selected_style_id: string | null;
    brands: { creator_id: string } | { creator_id: string }[] | null;
  };

  const creatorMap = new Map<string, string[]>();
  let affected = 0;

  for (const p of (products ?? []) as unknown as Row[]) {
    // Determine style cost
    let styleCost = 0;
    if (p.selected_style_id) {
      const { data: style } = await admin
        .from('sub_children_styles')
        .select('additional_cost_markup')
        .eq('id', p.selected_style_id)
        .maybeSingle();
      styleCost = Number(style?.additional_cost_markup ?? 0);
    }

    const sizeMod = Number(
      (apparel.size_price_modifiers as Record<string, number> | null)?.[
        p.selected_size ?? 'M'
      ] ?? 0
    );
    const baseCost = roundMoney(
      Number(apparel.default_base_cost) + sizeMod + styleCost
    );
    const markup = Number(p.user_profit_markup ?? 0);
    const totalRetail = roundMoney(baseCost + markup);
    const bransionFee = roundMoney(markup * 0.3);
    const creatorNet = roundMoney(markup * 0.7);

    await admin
      .from('products')
      .update({
        base_cost_calculated: baseCost,
        total_retail_price: totalRetail,
        bransion_commission_fee: bransionFee,
        creator_net_payout: creatorNet,
      })
      .eq('id', p.id);

    affected += 1;

    const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
    const creatorId = brand?.creator_id;
    if (creatorId) {
      if (!creatorMap.has(creatorId)) creatorMap.set(creatorId, []);
      creatorMap.get(creatorId)!.push(p.name);
    }
  }

  return { productsAffected: affected, creatorMap };
}

// =====================================================================
// 1. EDIT PLAIN APPAREL (with cascade + notifications)
// =====================================================================
export async function adminUpdatePlainApparelV2(
  id: string,
  patch: {
    name?: string;
    category?: string;
    description?: string;
    main_image_url?: string;
    default_base_cost?: number;
    size_price_modifiers?: Record<string, number>;
    is_active?: boolean;
  }
) {
  try {
    const { admin } = await assertAdmin();

    // Fetch old row to compare
    const { data: old } = await admin
      .from('base_plain_apparel')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!old) return { ok: false as const, error: 'Apparel not found' };

    // Update apparel
    const { error } = await admin
      .from('base_plain_apparel')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;

    // Fetch new row (for notification content)
    const { data: newRow } = await admin
      .from('base_plain_apparel')
      .select('*')
      .eq('id', id)
      .single();

    if (!newRow) return { ok: false as const, error: 'Apparel reload failed' };

    // Compute change list
    const changes: string[] = [];
    if (Number(old.default_base_cost) !== Number(newRow.default_base_cost)) {
      changes.push(
        `Cost price changed from ₦${Number(old.default_base_cost).toLocaleString()} to ₦${Number(newRow.default_base_cost).toLocaleString()}`
      );
    }
    if (old.description !== newRow.description) {
      changes.push(`Cloth quality description updated`);
    }
    if (old.name !== newRow.name) {
      changes.push(`Name changed from "${old.name}" to "${newRow.name}"`);
    }
    if (old.main_image_url !== newRow.main_image_url) {
      changes.push(`Main image updated`);
    }

    // Recalc products + notify
    const { productsAffected, creatorMap } = await recalcProductsForApparel(
      admin,
      id
    );

    if (changes.length > 0 && creatorMap.size > 0) {
      for (const [creatorId, productNames] of creatorMap) {
        await admin.from('notifications').insert({
          recipient_id: creatorId,
          title: `Base Plain Apparel "${newRow.name}" was updated by Bransion`,
          body: `Bransion Admin made changes to "${newRow.name}". Changes: ${changes.join('; ')}. These changes have been automatically applied to your product${productNames.length > 1 ? 's' : ''}: ${productNames.join(', ')}.`,
          type: 'info',
          link_url: '/products',
        });
      }
    }

    revalidatePath('/admin/inventory');
    revalidatePath('/store');
    revalidatePath('/products');
    revalidatePath('/products/create');

    return {
      ok: true as const,
      productsAffected,
      changesCount: changes.length,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : 'Failed to update apparel',
    };
  }
}

// =====================================================================
// 2. DELETE PLAIN APPAREL (cascade delete products + notify)
// =====================================================================
export async function adminDeletePlainApparelV2(id: string) {
  try {
    const { admin } = await assertAdmin();

    // Fetch apparel
    const { data: apparel } = await admin
      .from('base_plain_apparel')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (!apparel) return { ok: false as const, error: 'Apparel not found' };

    // Find all products using it + their creators
    const { data: products } = await admin
      .from('products')
      .select('id, name, brands(creator_id)')
      .eq('plain_apparel_id', id);

    type Row = {
      id: string;
      name: string;
      brands: { creator_id: string } | { creator_id: string }[] | null;
    };

    const productList = (products ?? []) as unknown as Row[];
    const creatorMap = new Map<string, string[]>();

    for (const p of productList) {
      const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
      const cid = brand?.creator_id;
      if (cid) {
        if (!creatorMap.has(cid)) creatorMap.set(cid, []);
        creatorMap.get(cid)!.push(p.name);
      }
    }

    // Delete all products first (order_items FK is ON DELETE SET NULL — history preserved)
    if (productList.length > 0) {
      const { error: delErr } = await admin
        .from('products')
        .delete()
        .in('id', productList.map((p) => p.id));
      if (delErr) throw delErr;
    }

    // Delete apparel (cascade to sub_children_styles)
    const { error } = await admin
      .from('base_plain_apparel')
      .delete()
      .eq('id', id);
    if (error) throw error;

    // Notify each affected creator
    for (const [creatorId, productNames] of creatorMap) {
      await admin.from('notifications').insert({
        recipient_id: creatorId,
        title: `Base Plain Apparel "${apparel.name}" was deleted`,
        body: `Bransion Admin has permanently deleted the Base Plain Apparel "${apparel.name}". Your following product${productNames.length > 1 ? 's' : ''} that used it have been automatically deleted: ${productNames.join(', ')}. If you want to sell similar products, please create a new product using a different apparel.`,
        type: 'warning',
        link_url: '/products',
      });
    }

    revalidatePath('/admin/inventory');
    revalidatePath('/store');
    revalidatePath('/products');
    revalidatePath('/products/create');

    return {
      ok: true as const,
      productsDeleted: productList.length,
      creatorsNotified: creatorMap.size,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : 'Failed to delete apparel',
    };
  }
}

// =====================================================================
// 3. UNARCHIVE PLAIN APPAREL (set is_active = true)
// =====================================================================
export async function adminUnarchivePlainApparel(id: string) {
  try {
    const { admin } = await assertAdmin();
    const { error } = await admin
      .from('base_plain_apparel')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;

    revalidatePath('/admin/inventory');
    revalidatePath('/products/create');
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : 'Failed to unarchive',
    };
  }
}

// =====================================================================
// 4. EDIT SUB-STYLE (with cascade + notifications)
// =====================================================================
export async function adminUpdateSubStyleV2(
  id: string,
  patch: {
    style_title?: string;
    style_description?: string | null;
    preview_image_url?: string;
    additional_cost_markup?: number;
    display_order?: number;
    is_active?: boolean;
  }
) {
  try {
    const { admin } = await assertAdmin();

    // Fetch old + apparel reference
    const { data: old } = await admin
      .from('sub_children_styles')
      .select('*, base_plain_apparel(id, name)')
      .eq('id', id)
      .maybeSingle();

    if (!old) return { ok: false as const, error: 'Style not found' };

    const apparel = Array.isArray(old.base_plain_apparel)
      ? old.base_plain_apparel[0]
      : old.base_plain_apparel;

    if (!apparel) return { ok: false as const, error: 'Apparel not linked' };

    // Update style
    const { error } = await admin
      .from('sub_children_styles')
      .update(patch)
      .eq('id', id);
    if (error) throw error;

    // Fetch fresh
    const { data: newRow } = await admin
      .from('sub_children_styles')
      .select('*')
      .eq('id', id)
      .single();

    if (!newRow) return { ok: false as const, error: 'Style reload failed' };

    // Changes
    const changes: string[] = [];
    if (old.style_title !== newRow.style_title) {
      changes.push(
        `Style name changed from "${old.style_title}" to "${newRow.style_title}"`
      );
    }
    if (Number(old.additional_cost_markup) !== Number(newRow.additional_cost_markup)) {
      changes.push(
        `Style additional cost changed from ₦${Number(old.additional_cost_markup).toLocaleString()} to ₦${Number(newRow.additional_cost_markup).toLocaleString()}`
      );
    }
    if (old.preview_image_url !== newRow.preview_image_url) {
      changes.push(`Style preview image updated`);
    }

    // Recalc products that use THIS apparel (recalc all, safe)
    const { productsAffected, creatorMap } = await recalcProductsForApparel(
      admin,
      apparel.id
    );

    if (changes.length > 0 && creatorMap.size > 0) {
      for (const [creatorId, productNames] of creatorMap) {
        await admin.from('notifications').insert({
          recipient_id: creatorId,
          title: `Style "${newRow.style_title}" under "${apparel.name}" was updated`,
          body: `Bransion Admin updated the style "${newRow.style_title}" for "${apparel.name}". Changes: ${changes.join('; ')}. These changes have been automatically applied to your product${productNames.length > 1 ? 's' : ''}: ${productNames.join(', ')}.`,
          type: 'info',
          link_url: '/products',
        });
      }
    }

    revalidatePath('/admin/inventory');
    revalidatePath('/store');
    revalidatePath('/products');
    revalidatePath('/products/create');

    return {
      ok: true as const,
      productsAffected,
      changesCount: changes.length,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : 'Failed to update style',
    };
  }
}