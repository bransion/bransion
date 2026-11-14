// =====================================================================
// BRANSION V3 — Admin Fulfillment Actions
// =====================================================================
"use server";

import { revalidatePath } from "next/cache";
import { createClient, serviceRoleClient } from "@/lib/supabase/server";
// import { requireServerEnv } from '@/lib/env';
import type { FulfillmentProduct } from "../../../types";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const admin = serviceRoleClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  return { userId: user.id, admin };
}

// ── List products by review status ───────────────────────────────────
export async function listProductsByStatus(
  status: "pending_review" | "published" | "rejected",
): Promise<FulfillmentProduct[]> {
  await assertAdmin();
  const admin = serviceRoleClient();

  const { data, error } = await admin
    .from("products")
    .select(
      `id, name, description, slug, raw_creator_artwork_url, final_composite_product_url,
       base_cost_calculated, user_profit_markup, total_retail_price,
       bransion_commission_fee, creator_net_payout, status, rejection_reason,
       created_at, published_at, image_locked,
       brands(id, name, slug, creator_id, profiles!brands_creator_id_fkey(email)),
       base_plain_apparel(id, name, category, description, main_image_url, default_base_cost),
       sub_children_styles(id, style_title, style_description, preview_image_url, additional_cost_markup)`,
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(status === "published" ? 100 : 200);

  if (error) throw error;

  type Raw = {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    raw_creator_artwork_url: string | null;
    final_composite_product_url: string | null;
    base_cost_calculated: number | null;
    user_profit_markup: number | null;
    total_retail_price: number | null;
    bransion_commission_fee: number | null;
    creator_net_payout: number | null;
    status: string;
    rejection_reason: string | null;
    created_at: string;
    published_at: string | null;
    image_locked: boolean;
    brands: {
      id: string;
      name: string;
      slug: string;
      creator_id: string;
      profiles: { email: string } | { email: string }[] | null;
    } | null;
    base_plain_apparel: {
      id: string;
      name: string;
      category: string;
      description: string;
      main_image_url: string;
      default_base_cost: number;
    } | null;
    sub_children_styles: {
      id: string;
      style_title: string;
      style_description: string | null;
      preview_image_url: string;
      additional_cost_markup: number;
    } | null;
  };

  return ((data ?? []) as unknown as Raw[]).map((p) => {
    const creator = Array.isArray(p.brands?.profiles)
      ? p.brands?.profiles[0]
      : p.brands?.profiles;
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      slug: p.slug,
      raw_creator_artwork_url: p.raw_creator_artwork_url,
      final_composite_product_url: p.final_composite_product_url,
      base_cost_calculated: Number(p.base_cost_calculated ?? 0),
      user_profit_markup: Number(p.user_profit_markup ?? 0),
      total_retail_price: Number(p.total_retail_price ?? 0),
      bransion_commission_fee: Number(p.bransion_commission_fee ?? 0),
      creator_net_payout: Number(p.creator_net_payout ?? 0),
      status: p.status,
      rejection_reason: p.rejection_reason,
      created_at: p.created_at,
      published_at: p.published_at,
      image_locked: p.image_locked,
      creator_email: creator?.email ?? null,
      creator_id: p.brands?.creator_id ?? null,
      brand_name: p.brands?.name ?? null,
      brand_slug: p.brands?.slug ?? null,
      apparel_name: p.base_plain_apparel?.name ?? null,
      apparel_category: p.base_plain_apparel?.category ?? null,
      apparel_description: p.base_plain_apparel?.description ?? null,
      apparel_image_url: p.base_plain_apparel?.main_image_url ?? null,
      style_title: p.sub_children_styles?.style_title ?? null,
      style_description: p.sub_children_styles?.style_description ?? null,
      style_preview_url: p.sub_children_styles?.preview_image_url ?? null,
      style_cost: Number(p.sub_children_styles?.additional_cost_markup ?? 0),
    };
  });
}


// ── Signed URL for raw asset (15 min) ────────────────────────────────
export async function getProductRawAssetSignedUrl(
  productId: string,
): Promise<string> {
  const { admin } = await assertAdmin();

  const { data: product } = await admin
    .from("products")
    .select("raw_creator_artwork_url")
    .eq("id", productId)
    .maybeSingle();

  if (!product?.raw_creator_artwork_url) {
    throw new Error("No raw asset for this product");
  }

  // Extract storage path from full public URL, or use as-is
  const marker = "/storage/v1/object/public/brand-assets/";
  const idx = product.raw_creator_artwork_url.indexOf(marker);
  const path =
    idx >= 0
      ? product.raw_creator_artwork_url.slice(idx + marker.length)
      : product.raw_creator_artwork_url;

  const { data, error } = await admin.storage
    .from("brand-assets")
    .createSignedUrl(path, 60 * 15); // 15 minutes

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Failed to create signed URL");
  }

  return data.signedUrl;
}

// ── Upload final composite ───────────────────────────────────────────
export async function uploadFinalComposite(file: File): Promise<string> {
  const { admin } = await assertAdmin();

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Only JPEG, PNG, or WebP are allowed");
  }
  if (file.size > 10_000_000) {
    throw new Error("File must be under 10 MB");
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await admin.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data } = admin.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

// ── Publish product ──────────────────────────────────────────────────
export async function publishProduct(
  productId: string,
  finalCompositeUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { userId, admin } = await assertAdmin();

    const { data: product } = await admin
      .from("products")
      .select("id, name, slug, brand_id, status, brands(slug, creator_id)")
      .eq("id", productId)
      .maybeSingle();

    if (!product) return { ok: false, error: "Product not found" };
    if (product.status !== "pending_review") {
      return { ok: false, error: "Product is not pending review" };
    }

    const brand = Array.isArray(product.brands)
      ? product.brands[0]
      : product.brands;
    const creatorId = (brand as { creator_id: string } | null)?.creator_id;
    const brandSlug = (brand as { slug: string } | null)?.slug;
    const now = new Date().toISOString();

    const { error: updErr } = await admin
      .from("products")
      .update({
        final_composite_product_url: finalCompositeUrl,
        status: "published",
        published_at: now,
        published_by: userId,
        image_locked: true,
        rejection_reason: null,
      })
      .eq("id", productId);

    if (updErr) throw updErr;

    await admin.from("admin_audit_logs").insert({
      admin_id: userId,
      action: "product_published",
      target_table: "products",
      target_id: productId,
      new_state: {
        final_composite_product_url: finalCompositeUrl,
        published_at: now,
      },
    });

    if (creatorId) {
      await admin.from("notifications").insert({
        recipient_id: creatorId,
        title: "Your product is live!",
        body: `"${product.name}" has been approved and is now visible on the Bransion marketplace.`,
        type: "success",
        notification_type_v3: "product_published",
        link_url: `/store/${brandSlug}/product/${productId}`,
      });
    }

    revalidatePath("/admin/fulfillment");
    revalidatePath("/store");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Publish failed",
    };
  }
}

// ── Reject product ───────────────────────────────────────────────────
export async function rejectProduct(
  productId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { userId, admin } = await assertAdmin();

    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      return { ok: false, error: "Reason must be at least 5 characters" };
    }

    const { data: product } = await admin
      .from("products")
      .select("id, name, status, brands(creator_id)")
      .eq("id", productId)
      .maybeSingle();

    if (!product) return { ok: false, error: "Product not found" };
    if (product.status !== "pending_review") {
      return { ok: false, error: "Product is not pending review" };
    }

    const brand = Array.isArray(product.brands)
      ? product.brands[0]
      : product.brands;
    const creatorId = (brand as { creator_id: string } | null)?.creator_id;

    const { error: updErr } = await admin
      .from("products")
      .update({
        status: "rejected",
        rejection_reason: trimmed,
      })
      .eq("id", productId);

    if (updErr) throw updErr;

    await admin.from("admin_audit_logs").insert({
      admin_id: userId,
      action: "product_rejected",
      target_table: "products",
      target_id: productId,
      new_state: { rejection_reason: trimmed },
      justification: trimmed,
    });

    if (creatorId) {
      await admin.from("notifications").insert({
        recipient_id: creatorId,
        title: "Product needs revision",
        body: `"${product.name}" was not approved. Reason: ${trimmed}`,
        type: "warning",
        notification_type_v3: "product_rejected",
        link_url: "/products",
      });
    }

    revalidatePath("/admin/fulfillment");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Reject failed",
    };
  }
}
