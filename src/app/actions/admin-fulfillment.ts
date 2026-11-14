// =====================================================================
// BRANSION — Admin fulfillment server actions.
// All checks admin-first. Uses service role for cross-row writes.
// =====================================================================
"use server";

import { revalidatePath } from "next/cache";
import { createClient, serviceRoleClient } from "@/lib/supabase/server";

interface PendingProduct {
  id: string;
  name: string;
  description: string | null;
  design_url: string;
  raw_asset_url: string | null;
  style_config: Record<string, unknown>;
  style_cost_modifier: number;
  creator_markup: number;
  slug: string;
  created_at: string;
  brand_name: string | null;
  brand_slug: string | null;
  creator_email: string | null;
  creator_name: string | null;
  apparel_name: string | null;
  apparel_color_name: string | null;
  apparel_color_hex: string | null;
  apparel_base_price: number;
}

async function assertAdmin(): Promise<{
  userId: string;
  admin: ReturnType<typeof serviceRoleClient>;
}> {
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

export async function getPendingProducts(): Promise<PendingProduct[]> {
  await assertAdmin();
  const admin = serviceRoleClient();

  const { data, error } = await admin
    .from("products")
    .select(
      `
      id, name, description, design_url, raw_asset_url,
      style_config, style_cost_modifier, creator_markup, slug, created_at,
      brands(id, name, slug, creator_id, profiles!brands_creator_id_fkey(email, full_name)),
      plain_apparel(id, name, color_name, color_hex, base_medium_price)
    `,
    )
    .eq("review_status", "pending_review")
    .order("created_at", { ascending: true });

  if (error) throw error;

  type Raw = {
    id: string;
    name: string;
    description: string | null;
    design_url: string;
    raw_asset_url: string | null;
    style_config: Record<string, unknown> | null;
    style_cost_modifier: number;
    creator_markup: number;
    slug: string;
    created_at: string;
    brands: {
      name: string;
      slug: string;
      creator_id: string;
      profiles:
        | { email: string; full_name: string | null }
        | { email: string; full_name: string | null }[]
        | null;
    } | null;
    plain_apparel: {
      name: string;
      color_name: string | null;
      color_hex: string | null;
      base_medium_price: number;
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
      design_url: p.design_url,
      raw_asset_url: p.raw_asset_url,
      style_config: p.style_config ?? {},
      style_cost_modifier: Number(p.style_cost_modifier),
      creator_markup: Number(p.creator_markup),
      slug: p.slug,
      created_at: p.created_at,
      brand_name: p.brands?.name ?? null,
      brand_slug: p.brands?.slug ?? null,
      creator_email: creator?.email ?? null,
      creator_name: creator?.full_name ?? null,
      apparel_name: p.plain_apparel?.name ?? null,
      apparel_color_name: p.plain_apparel?.color_name ?? null,
      apparel_color_hex: p.plain_apparel?.color_hex ?? null,
      apparel_base_price: Number(p.plain_apparel?.base_medium_price ?? 0),
    };
  });
}

export async function getSignedRawAssetUrl(
  storedUrlOrPath: string,
): Promise<string> {
  await assertAdmin();
  const admin = serviceRoleClient();

  // Extract storage path if this is a full public URL
  const marker = "/storage/v1/object/public/brand-assets/";
  const idx = storedUrlOrPath.indexOf(marker);
  const path =
    idx >= 0 ? storedUrlOrPath.slice(idx + marker.length) : storedUrlOrPath;

  const { data, error } = await admin.storage
    .from("brand-assets")
    .createSignedUrl(path, 60 * 60); // 1 hour

  if (error || !data?.signedUrl) throw error ?? new Error("Failed to sign URL");
  return data.signedUrl;
}

export async function publishProduct(
  productId: string,
  finalImageUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { userId, admin } = await assertAdmin();

    const { data: product } = await admin
      .from("products")
      .select("id, name, brand_id, review_status, status, brands(creator_id)")
      .eq("id", productId)
      .maybeSingle();

    if (!product) return { ok: false, error: "Product not found" };
    if (product.review_status !== "pending_review")
      return { ok: false, error: "Product is not pending review" };

    const creatorId = (
      Array.isArray(product.brands)
        ? (product.brands[0] as { creator_id: string } | undefined)
        : (product.brands as { creator_id: string } | null)
    )?.creator_id;

    const { error: updErr } = await admin
      .from("products")
      .update({
        design_url: finalImageUrl,
        final_image_url: finalImageUrl,
        status: "live",
        review_status: "published",
        published_at: new Date().toISOString(),
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", productId);

    if (updErr) throw updErr;

    await admin.from("admin_audit_logs").insert({
      admin_id: userId,
      action: "product_published",
      target_table: "products",
      target_id: productId,
      details: { final_image_url: finalImageUrl },
    });

    if (creatorId) {
      await admin.from("notifications").insert({
        recipient_id: creatorId,
        title: "Your product is live!",
        body: `"${product.name}" has been approved and is now visible on the marketplace.`,
        type: "success",
        link_url: "/products",
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

export async function rejectProduct(
  productId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { userId, admin } = await assertAdmin();

    const trimmed = reason.trim();
    if (trimmed.length < 3)
      return { ok: false, error: "Please provide a reason (min 3 characters)" };

    const { data: product } = await admin
      .from("products")
      .select("id, name, review_status, brands(creator_id)")
      .eq("id", productId)
      .maybeSingle();

    if (!product) return { ok: false, error: "Product not found" };
    if (product.review_status !== "pending_review")
      return { ok: false, error: "Product is not pending review" };

    const creatorId = (
      Array.isArray(product.brands)
        ? (product.brands[0] as { creator_id: string } | undefined)
        : (product.brands as { creator_id: string } | null)
    )?.creator_id;

    const { error: updErr } = await admin
      .from("products")
      .update({
        status: "draft",
        review_status: "rejected",
        rejection_reason: trimmed,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (updErr) throw updErr;

    await admin.from("admin_audit_logs").insert({
      admin_id: userId,
      action: "product_rejected",
      target_table: "products",
      target_id: productId,
      details: { reason: trimmed },
    });

    if (creatorId) {
      await admin.from("notifications").insert({
        recipient_id: creatorId,
        title: "Product needs revision",
        body: `"${product.name}" was not approved. Reason: ${trimmed}`,
        type: "warning",
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
