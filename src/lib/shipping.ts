// =====================================================================
// BRANSION V3 — Dynamic Shipping Calculator
// =====================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateDeliveryFee } from "./nigeria-lgas";

export async function getV3DeliveryFee(
  state: string,
  lga: string,
  supabase: SupabaseClient,
): Promise<{ fee: number; is_dynamic: boolean }> {
  try {
    // 1. Try to fetch from the new V3 DB table
    const { data, error } = await supabase
      .from("geo_shipping_rates")
      .select("fee")
      .eq("state", state)
      .eq("lga", lga)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      return { fee: Number(data.fee), is_dynamic: true };
    }

    // 2. Fallback to V2 static file if no DB rate exists
    const fallbackFee = calculateDeliveryFee(state, lga);
    return { fee: fallbackFee, is_dynamic: false };
  } catch (err) {
    console.error("Error fetching V3 shipping fee:", err);
    // Ultimate fallback so checkout never crashes
    return { fee: 3500, is_dynamic: false };
  }
}
