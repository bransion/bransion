// =====================================================================
// BRANSION V3 — Admin Synthesis Actions
// Normalizes joined data so the frontend always gets objects.
// =====================================================================
'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';

export async function getPendingV3Products() {
  const { admin } = await assertAdmin();
  const { data } = await admin
    .from('products')
    .select(`
      id, name, description, raw_creator_artwork_url, user_profit_markup, base_cost_calculated, total_retail_price,
      brands(name, slug, creator_id),
      base_plain_apparel(name, main_image_url),
      sub_children_styles(style_title, preview_image_url, style_description)
    `)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });

  // Normalize the joined data — Supabase can return objects OR arrays
  const normalized = (data ?? []).map((p: any) => {
    const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
    const apparel = Array.isArray(p.base_plain_apparel) ? p.base_plain_apparel[0] : p.base_plain_apparel;
    const style = Array.isArray(p.sub_children_styles) ? p.sub_children_styles[0] : p.sub_children_styles;

    return {
      ...p,
      brands: brand || null,
      base_plain_apparel: apparel || null,
      sub_children_styles: style || null,
    };
  });

  return normalized;
}

export async function publishV3ProductWithEdits(
  productId: string,
  data: { name: string; description: string; markup: number; compositeUrl: string }
) {
  try {
    const { userId, admin } = await assertAdmin();

    const { data: product } = await admin
      .from('products')
      .select('brands(creator_id, slug)')
      .eq('id', productId)
      .single();

    if (!product) throw new Error('Product not found');

    const brandInfo = Array.isArray(product.brands) ? product.brands[0] : (product.brands as any);
    const creatorId = brandInfo?.creator_id;
    const brandSlug = brandInfo?.slug;

    const { data: baseCostData } = await admin
      .from('products')
      .select('base_cost_calculated')
      .eq('id', productId)
      .single();
    const baseCost = baseCostData?.base_cost_calculated || 0;

    const totalRetail = baseCost + data.markup;
    const bransionFee = data.markup * 0.30;
    const creatorNet = data.markup * 0.70;

    const { error } = await admin
      .from('products')
      .update({
        name: data.name,
        description: data.description,
        user_profit_markup: data.markup,
        total_retail_price: totalRetail,
        bransion_commission_fee: bransionFee,
        creator_net_payout: creatorNet,
        final_composite_product_url: data.compositeUrl,
        design_url: data.compositeUrl,
        final_image_url: data.compositeUrl,
        creator_markup: data.markup,
        status: 'published',
        image_locked: true,
        published_at: new Date().toISOString(),
        published_by: userId,
      })
      .eq('id', productId);

    if (error) throw error;

    if (creatorId && brandSlug) {
      const productLink = `/store/${brandSlug}/product/${productId}`;
      await admin.from('notifications').insert({
        recipient_id: creatorId,
        title: 'Your product is live! 🎉',
        body: `Your product "${data.name}" has been approved and published to the store.`,
        type: 'success',
        link_url: productLink,
      });
    }

    await admin.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'product_published',
      target_table: 'products',
      target_id: productId,
      justification: 'Admin edited and published the product to store.',
    });

    revalidatePath('/admin/fulfillment');
    revalidatePath('/store');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to publish' };
  }
}