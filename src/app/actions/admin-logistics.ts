"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createClient, serviceRoleClient } from "@/lib/supabase/server";
import { geoShippingSchema } from "@/lib/validations/v3";

export async function listShippingRates() {
  const { admin } = await assertAdmin();
  const { data } = await admin
    .from("geo_shipping_rates")
    .select("*")
    .order("state")
    .order("lga");
  return data ?? [];
}

export async function bulkUpsertStateRates(
  state: string,
  lgas: { lga: string; fee: number }[],
) {
  try {
    const { userId, admin } = await assertAdmin();

    const inserts = lgas.map((l) => ({
      state,
      lga: l.lga,
      fee: l.fee,
      is_active: true,
    }));

    const { error } = await admin
      .from("geo_shipping_rates")
      .upsert(inserts, { onConflict: "state, lga" });

    if (error) throw error;

    await admin.from("admin_audit_logs").insert({
      admin_id: userId,
      action: "user_tier_override", // Using a valid enum for now
      target_table: "geo_shipping_rates",
      new_state: { state, lga_count: lgas.length },
      justification: "Bulk updated LGA shipping rates",
    });

    revalidatePath("/admin/logistics");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function upsertShippingRate(input: any) {
  try {
    const { userId, admin } = await assertAdmin();
    const parsed = geoShippingSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid data" };

    const { error } = await admin.from("geo_shipping_rates").upsert(
      {
        ...parsed.data,
        is_active: true,
      },
      { onConflict: "state, lga" },
    );

    if (error) throw error;

    revalidatePath("/admin/logistics");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

// This action is called by the checkout form
export async function quoteDeliveryFee(state: string, lga: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("geo_shipping_rates")
    .select("fee")
    .eq("state", state)
    .eq("lga", lga)
    .eq("is_active", true)
    .maybeSingle();

  if (!data)
    return {
      ok: false,
      error: "Delivery fee not available for this location yet.",
    };
  return { ok: true, fee: Number(data.fee) };
}
