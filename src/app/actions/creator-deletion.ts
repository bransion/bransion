// =====================================================================
// BRANSION — Creator self-service deletion actions.
// =====================================================================
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient, serviceRoleClient } from "@/lib/supabase/server";

// ── Delete Brand ─────────────────────────────────────────────────────
export async function deleteBrand(brandId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in" };

    // RLS enforces ownership on DELETE. But we'll check for products with orders first.
    const { data: products } = await supabase
      .from("products")
      .select("id")
      .eq("brand_id", brandId);
    if (products && products.length > 0) {
      const productIds = products.map((p) => p.id);
      const { count } = await supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .in("product_id", productIds);
      if (count && count > 0) {
        return {
          ok: false,
          error:
            "Cannot delete this brand because it has past sales. Please delete its products first and archive the brand.",
        };
      }
    }

    // Delete brand (cascades to products). Trigger `recount_slots` fires automatically.
    const { error } = await supabase.from("brands").delete().eq("id", brandId);
    if (error) throw error;

    revalidatePath("/brands");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete brand",
    };
  }
}

// ── Delete Product ───────────────────────────────────────────────────
export async function deleteProduct(productId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in" };

    // Check for order history
    const { count } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);
    if (count && count > 0) {
      return {
        ok: false,
        error:
          "This product has past orders and cannot be deleted. Please archive it instead.",
      };
    }

    // Delete product (RLS ensures ownership)
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    if (error) throw error;

    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete product",
    };
  }
}

// ── Delete Account ───────────────────────────────────────────────────
export async function deleteAccount() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in" };

    const admin = serviceRoleClient();

    // 1. Anonymize audit logs (preserve the record, hide the identity)
    await admin
      .from("admin_audit_logs")
      .update({
        admin_id: null,
        details: { anonymized: true, reason: "user_deleted" },
      })
      .eq("admin_id", user.id);

    // 2. Delete the auth user (cascades to profiles -> brands -> products -> wallet)
    // This action also invalidates the session automatically.
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    // 3. Clear cookies (best effort, Next.js will redirect anyway)
    const cookieStore = await cookies();
    cookieStore.delete("sb-access-token");

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete account",
    };
  }
}
