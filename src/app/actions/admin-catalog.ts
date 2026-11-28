// =====================================================================
// BRANSION — Admin catalog governance server actions.
// Whitelist-only field edits, audit-logged, order-safe deletes.
// =====================================================================
'use server';

import { revalidatePath } from 'next/cache';
import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { requireServerEnv } from '@/lib/env';
import { z } from 'zod';

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const admin = serviceRoleClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Forbidden');
  return { userId: user.id, admin };
}

function urlAllowed(url: string | null | undefined, bucket: string): boolean {
  if (!url) return true;
  const env = requireServerEnv();
  return url.startsWith(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/`
  );
}

// ── Schemas (whitelist only) ─────────────────────────────────────────
const brandPatchSchema = z
  .object({
    name: z.string().min(2).max(60).optional(),
    description: z.string().max(500).nullable().optional(),
    phone: z.string().max(20).nullable().optional(),
    logo_url: z.string().url().nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Empty patch' });

const productPatchSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(1000).nullable().optional(),
    creator_markup: z.coerce.number().min(0).max(1_000_000).optional(),
    status: z.enum(['draft', 'live', 'archived']).optional(),
    review_status: z
      .enum(['draft', 'pending_review', 'published', 'archived', 'rejected'])
      .optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Empty patch' });

// ── Data types ───────────────────────────────────────────────────────
export interface CatalogBrand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  owner_email: string | null;
  owner_name: string | null;
  owner_tier: string;
  product_count: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  design_url: string;
  creator_markup: number;
  style_cost_modifier: number;
  status: string;
  review_status: string;
  created_at: string;
  brand_id: string;
  brand_name: string | null;
  owner_email: string | null;
  apparel_name: string | null;
  apparel_base_price: number;
  retail_price: number;
}

export interface CatalogData {
  brands: CatalogBrand[];
  products: CatalogProduct[];
}

// ── Fetch all catalog data ───────────────────────────────────────────
export async function getCatalogData(): Promise<CatalogData> {
  await assertAdmin();
  const admin = serviceRoleClient();

  const { data: brandsRaw } = await admin
    .from('brands')
    .select(
      `id, name, slug, description, phone, logo_url, is_active, created_at,
       profiles!brands_creator_id_fkey(email, full_name, account_tier, tier)`
    )
    .order('created_at', { ascending: false });

  const { data: productsRaw } = await admin
    .from('products')
    .select(
      `id, name, slug, description, design_url, creator_markup,
       style_cost_modifier, status, review_status, created_at, brand_id,
       brands(id, name, slug, profiles!brands_creator_id_fkey(email)),
       plain_apparel(name, base_medium_price)`
    )
    .order('created_at', { ascending: false });

  type BRow = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    phone: string | null;
    logo_url: string | null;
    is_active: boolean;
    created_at: string;
    profiles:
      | { email: string; full_name: string | null; account_tier: string; tier: string }
      | { email: string; full_name: string | null; account_tier: string; tier: string }[]
      | null;
  };

  type PRow = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    design_url: string;
    creator_markup: number;
    style_cost_modifier: number;
    status: string;
    review_status: string;
    created_at: string;
    brand_id: string;
    brands: {
      id: string;
      name: string;
      slug: string;
      profiles: { email: string } | { email: string }[] | null;
    } | null;
    plain_apparel: { name: string; base_medium_price: number } | null;
  };

  const productCountByBrand = new Map<string, number>();
  for (const p of (productsRaw ?? []) as unknown as PRow[]) {
    if (p.brand_id)
      productCountByBrand.set(
        p.brand_id,
        (productCountByBrand.get(p.brand_id) ?? 0) + 1
      );
  }

  const brands: CatalogBrand[] = ((brandsRaw ?? []) as unknown as BRow[]).map(
    (b) => {
      const owner = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        description: b.description,
        phone: b.phone,
        logo_url: b.logo_url,
        is_active: b.is_active,
        created_at: b.created_at,
        owner_email: owner?.email ?? null,
        owner_name: owner?.full_name ?? null,
        owner_tier: owner?.account_tier ?? owner?.tier ?? 'none',
        product_count: productCountByBrand.get(b.id) ?? 0,
      };
    }
  );

  const products: CatalogProduct[] = (
    (productsRaw ?? []) as unknown as PRow[]
  ).map((p) => {
    const brand = p.brands;
    const owner = brand
      ? Array.isArray(brand.profiles)
        ? brand.profiles[0]
        : brand.profiles
      : null;
    const base = Number(p.plain_apparel?.base_medium_price ?? 0);
    const style = Number(p.style_cost_modifier ?? 0);
    const markup = Number(p.creator_markup ?? 0);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      design_url: p.design_url,
      creator_markup: markup,
      style_cost_modifier: style,
      status: p.status,
      review_status: p.review_status,
      created_at: p.created_at,
      brand_id: p.brand_id,
      brand_name: brand?.name ?? null,
      owner_email: owner?.email ?? null,
      apparel_name: p.plain_apparel?.name ?? null,
      apparel_base_price: base,
      retail_price: base + style + markup,
    };
  });

  return { brands, products };
}

// ── Update brand ─────────────────────────────────────────────────────
export async function adminUpdateBrand(
  brandId: string,
  patch: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { userId, admin } = await assertAdmin();
    const parsed = brandPatchSchema.safeParse(patch);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
          'Invalid patch',
      };
    }
    if (
      parsed.data.logo_url &&
      !urlAllowed(parsed.data.logo_url, 'brand-logos')
    ) {
      return {
        ok: false,
        error: 'Logo must be uploaded to brand-logos bucket',
      };
    }

    const { data: before } = await admin
      .from('brands')
      .select('name, description, phone, logo_url, is_active')
      .eq('id', brandId)
      .maybeSingle();
    if (!before) return { ok: false, error: 'Brand not found' };

    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of Object.keys(parsed.data) as (keyof typeof parsed.data)[]) {
      const prev = (before as Record<string, unknown>)[k];
      const next = parsed.data[k];
      if (prev !== next) diff[k] = { from: prev, to: next };
    }

    const { error } = await admin
      .from('brands')
      .update(parsed.data)
      .eq('id', brandId);
    if (error) {
      if (error.code === '23505') {
        return {
          ok: false,
          error:
            'This brand name has already been taken. Please choose another name.',
        };
      }
      throw error;
    }

    await admin.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'brand_deleted', // no dedicated 'brand_updated' enum — flagged
      target_table: 'brands',
      target_id: brandId,
      details: { diff, note: 'brand_update' },
    });

    revalidatePath('/admin/catalog');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ── Update brand logo (isolated) ────────────────────────────────────
export async function adminUpdateBrandLogo(brandId: string, logoUrl: string) {
  try {
    const { userId, admin } = await assertAdmin();
    const { error } = await admin
      .from('brands')
      .update({ logo_url: logoUrl })
      .eq('id', brandId);
    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'product_image_replaced', // Valid enum; meta clarifies scope
      target_table: 'brands',
      target_id: brandId,
      details: { new_logo_url: logoUrl, type: 'brand_logo_update' },
    });

    revalidatePath('/admin/catalog');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ── Update product ───────────────────────────────────────────────────
export async function adminUpdateProduct(
  productId: string,
  patch: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { userId, admin } = await assertAdmin();
    const parsed = productPatchSchema.safeParse(patch);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
          'Invalid patch',
      };
    }

    const { data: before } = await admin
      .from('products')
      .select('name, description, creator_markup, status, review_status')
      .eq('id', productId)
      .maybeSingle();
    if (!before) return { ok: false, error: 'Product not found' };

    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of Object.keys(parsed.data) as (keyof typeof parsed.data)[]) {
      const prev = (before as Record<string, unknown>)[k];
      const next = parsed.data[k];
      if (prev !== next) diff[k] = { from: prev, to: next };
    }

    const { error } = await admin
      .from('products')
      .update(parsed.data)
      .eq('id', productId);
    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'product_published', // no 'product_updated' enum — flagged
      target_table: 'products',
      target_id: productId,
      details: { diff, note: 'product_update' },
    });

    revalidatePath('/admin/catalog');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ── Replace product image (admin-only) ──────────────────────────────
export async function adminReplaceProductImage(
  productId: string,
  newImageUrl: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { userId, admin } = await assertAdmin();
    if (!urlAllowed(newImageUrl, 'product-images')) {
      return { ok: false, error: 'Image must be uploaded to product-images' };
    }

    const { error } = await admin
      .from('products')
      .update({
        design_url: newImageUrl,
        final_composite_product_url: newImageUrl,
        final_image_url: newImageUrl,
      })
      .eq('id', productId);
    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'product_image_replaced',
      target_table: 'products',
      target_id: productId,
      details: { new_image_url: newImageUrl },
    });

    revalidatePath('/admin/catalog');
    revalidatePath('/store');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ── Force delete brand (order-safe) ──────────────────────────────────
export async function adminForceDeleteBrand(
  brandId: string
): Promise<
  | { ok: true }
  | { ok: false; error: string; hint?: 'has_orders'; order_count?: number }
> {
  try {
    const { userId, admin } = await assertAdmin();

    const { data: products } = await admin
      .from('products')
      .select('id, name')
      .eq('brand_id', brandId);

    const productIds = (products ?? []).map((p) => p.id);

    if (productIds.length > 0) {
      const { count } = await admin
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .in('product_id', productIds);

      if ((count ?? 0) > 0) {
        return {
          ok: false,
          error: `This brand has ${count} order${count === 1 ? '' : 's'} on record. Archive instead to preserve financial history.`,
          hint: 'has_orders',
          order_count: count ?? 0,
        };
      }
    }

    const { error } = await admin.from('brands').delete().eq('id', brandId);
    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'brand_deleted',
      target_table: 'brands',
      target_id: brandId,
      details: { product_count_at_delete: productIds.length },
    });

    revalidatePath('/admin/catalog');
    revalidatePath('/store');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ── Force delete product (archive if ordered) ────────────────────────
export async function adminForceDeleteProduct(
  productId: string
): Promise<{ ok: true; archived?: boolean } | { ok: false; error: string }> {
  try {
    const { userId, admin } = await assertAdmin();

    const { count } = await admin
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId);

    if ((count ?? 0) > 0) {
      const { error } = await admin
        .from('products')
        .update({ status: 'archived', review_status: 'archived' })
        .eq('id', productId);
      if (error) throw error;

      await admin.from('admin_audit_logs').insert({
        admin_id: userId,
        action: 'product_deleted',
        target_table: 'products',
        target_id: productId,
        details: { mode: 'archived', order_count: count },
      });

      revalidatePath('/admin/catalog');
      revalidatePath('/store');
      return { ok: true, archived: true };
    }

    const { error } = await admin.from('products').delete().eq('id', productId);
    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'product_deleted',
      target_table: 'products',
      target_id: productId,
      details: { mode: 'hard_delete' },
    });

    revalidatePath('/admin/catalog');
    revalidatePath('/store');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}