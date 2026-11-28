// =====================================================================
// BRANSION — Account deletion actions.
// Defensive: cleans up dependent rows BEFORE deleting auth.users.
// Blocks sole-admin deletion. Surfaces real error messages.
// =====================================================================
"use server";

import { createClient, serviceRoleClient } from "@/lib/supabase/server";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = serviceRoleClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role, wallet_balance")
    .eq("id", user.id)
    .maybeSingle();

  const { data: brands } = await admin
    .from("brands")
    .select("id")
    .eq("creator_id", user.id);
  const brandIds = (brands ?? []).map((b) => b.id);

  let productCount = 0;
  if (brandIds.length > 0) {
    const { count } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .in("brand_id", brandIds);
    productCount = count ?? 0;
  }

  const { count: orderCount } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", user.id);

  let isSoleAdmin = false;
  if (profile?.role === "admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    isSoleAdmin = (count ?? 0) <= 1;
  }

  return {
    brandCount: brands?.length ?? 0,
    productCount,
    walletBalance: Number(profile?.wallet_balance ?? 0),
    isAdmin: profile?.role === "admin",
    isSoleAdmin,
    orderCount: orderCount ?? 0,
  };
}

export async function deleteMyAccount(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in" };

    const admin = serviceRoleClient();

    // ── 1) Sole-admin guard ────────────────────────────────────────
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "admin") {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if ((count ?? 0) <= 1) {
        return {
          ok: false,
          error:
            "You are the only admin. Promote another user to admin from /admin/users first, then you can delete this account.",
        };
      }
    }

    // ── 2) Defensive cleanup (belt + suspenders) ───────────────────
    // Even if FKs are correct, explicit cleanup prevents edge-case blocks.

    // Null out referred_by on all other profiles that point to this user
    await admin
      .from("profiles")
      .update({ referred_by: null })
      .eq("referred_by", user.id);

    // Null out audit log references
    await admin
      .from("admin_audit_logs")
      .update({ admin_id: null })
      .eq("admin_id", user.id);

    // Null out buyer references on orders
    await admin
      .from("orders")
      .update({ buyer_id: null })
      .eq("buyer_id", user.id);

    // Delete referral contracts (both as referrer and referee)
    await admin
      .from("referral_contracts")
      .delete()
      .or(`referrer_id.eq.${user.id},referee_id.eq.${user.id}`);

    // Delete commissions (both as referrer and referee)
    await admin
      .from("commissions_ledger")
      .delete()
      .or(`referrer_id.eq.${user.id},referee_id.eq.${user.id}`);

    // Delete wallet transactions
    await admin.from("wallet_transactions").delete().eq("creator_id", user.id);

    // Delete maintenance invoices
    await admin.from("maintenance_invoices").delete().eq("creator_id", user.id);

    // Delete withdrawal requests
    await admin.from("withdrawal_requests").delete().eq("creator_id", user.id);

    // Delete subscription payments
    await admin
      .from("subscription_payments")
      .delete()
      .eq("creator_id", user.id);

    // Delete notifications
    await admin.from("notifications").delete().eq("recipient_id", user.id);

    // Delete products under user's brands (nulls order_items.product_id)
    const { data: brands } = await admin
      .from("brands")
      .select("id")
      .eq("creator_id", user.id);
    const brandIds = (brands ?? []).map((b) => b.id);

    if (brandIds.length > 0) {
      await admin.from("products").delete().in("brand_id", brandIds);
      await admin.from("brands").delete().in("id", brandIds);
    }

    // ── 2.5) Purge storage objects owned by this user ──────────────
    // Prevents orphaned files + edge-case storage-related delete blocks.
    const buckets = [
      "designs",
      "brand-assets",
      "product-images",
      "brand-logos",
      "plain-apparel",
      "style-previews",
    ];

    for (const bucket of buckets) {
      try {
        const { data: files } = await admin.storage
          .from(bucket)
          .list(user.id, { limit: 1000 });
        if (files && files.length > 0) {
          const paths = files.map((f) => `${user.id}/${f.name}`);
          await admin.storage.from(bucket).remove(paths);
        }
      } catch (storageErr) {
        // Non-fatal — log but continue
        console.warn(`Storage cleanup failed for ${bucket}:`, storageErr);
      }
    }

    // ── 3) Delete auth user (cascades to profiles) ─────────────────
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("[deleteMyAccount] auth.admin.deleteUser failed:", {
        code: (error as any).code,
        message: error.message,
        status: (error as any).status,
        stack: (error as any).stack,
      });
      return {
        ok: false,
        error: `Delete failed: ${error.message}`,
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[deleteMyAccount] Exception:", { message, err });
    return {
      ok: false,
      error: `Delete failed: ${message}. If this persists, contact support@bransion.com.`,
    };
  }
}
