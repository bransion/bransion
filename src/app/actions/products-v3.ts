// =====================================================================
// BRANSION V3 — Creator Product Actions
// =====================================================================
'use server';

import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { productCreateV3Schema } from '@/lib/validations/v3';
import { calcPricingV3 } from '@/lib/pricing';
import { slugify } from '@/lib/utils';

export async function listActiveApparels() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('base_plain_apparel')
    .select('*, sub_children_styles(count)')
    .eq('is_active', true)
    .order('name');
  return data ?? [];
}

export async function listStylesForApparel(apparelId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sub_children_styles')
    .select('*')
    .eq('plain_apparel_id', apparelId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  return data ?? [];
}

export async function createProductV3(input: any) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not signed in' };

    // 1. Validate
    const parsed = productCreateV3Schema.safeParse(input);
    if (!parsed.success) {
      const firstError =
        Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .filter((v): v is string => typeof v === 'string')[0] ?? 'Invalid input';
      return { ok: false, error: firstError };
    }
    const data = parsed.data;
    const admin = serviceRoleClient();

    // 2. Verify brand ownership
    const { data: brand } = await admin
      .from('brands')
      .select('id, creator_id')
      .eq('id', data.brand_id)
      .maybeSingle();

    if (!brand || brand.creator_id !== user.id) {
      return { ok: false, error: 'Brand not found or not owned by you' };
    }

    // 3. Tier limits
    const { data: profile } = await admin
      .from('profiles')
      .select('account_tier, tier')
      .eq('id', user.id)
      .maybeSingle();
    const tier = profile?.account_tier ?? profile?.tier ?? 'basic';

    if (tier === 'basic') {
      const { data: userBrands } = await admin
        .from('brands')
        .select('id')
        .eq('creator_id', user.id);
      const brandIds = (userBrands ?? []).map((b) => b.id);
      if (brandIds.length > 0) {
        const { count } = await admin
          .from('products')
          .select('id', { count: 'exact', head: true })
          .in('brand_id', brandIds);
        if ((count ?? 0) >= 1) {
          return {
            ok: false,
            error:
              'Basic tier allows only 1 product total. Upgrade to Standard or Premium to add more.',
          };
        }
      }
    } else if (tier === 'standard') {
      const { count } = await admin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', data.brand_id);
      if ((count ?? 0) >= 3) {
        return {
          ok: false,
          error:
            'Standard tier allows up to 3 products per brand. Upgrade to Premium for unlimited.',
        };
      }
    }

    // 4. Recompute pricing server-side
    const { data: apparel } = await admin
      .from('base_plain_apparel')
      .select('*')
      .eq('id', data.plain_apparel_id)
      .single();
    const { data: style } = await admin
      .from('sub_children_styles')
      .select('*')
      .eq('id', data.selected_style_id)
      .single();

    if (!apparel || !style) {
      return { ok: false, error: 'Apparel or style not found' };
    }

    const pricing = calcPricingV3(apparel, style, data.user_profit_markup);
    const slug =
      slugify(data.title) + '-' + Math.random().toString(36).slice(2, 6);

    // 5. Insert with legacy column fallbacks
    const insertPayload = {
      brand_id: data.brand_id,
      plain_apparel_id: data.plain_apparel_id,
      selected_style_id: data.selected_style_id,
      selected_size: data.selected_size,
      name: data.title,
      description: data.description,
      slug,
      raw_creator_artwork_url: data.raw_creator_artwork_url,
      user_profit_markup: data.user_profit_markup,
      base_cost_calculated: pricing.baseCost,
      total_retail_price: pricing.totalRetail,
      bransion_commission_fee: pricing.bransionFee,
      creator_net_payout: pricing.creatorNet,
      status: 'pending_review' as const,
      image_locked: false,
      // Legacy V2 fallbacks (schema still has these NOT NULL in some installs)
      apparel_id: null,
      design_url: data.raw_creator_artwork_url,
      creator_markup: data.user_profit_markup,
    };

    const { data: product, error } = await admin
      .from('products')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      // Detailed logging so future issues are diagnosable
      console.error('[createProductV3] Insert failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload: insertPayload,
      });
      throw new Error(error.message || 'Database insert failed');
    }

    return { ok: true, product_id: product.id };
  } catch (err) {
    console.error('[createProductV3] Error:', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to create product',
    };
  }
}