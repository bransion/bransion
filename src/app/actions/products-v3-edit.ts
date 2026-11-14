"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createClient, serviceRoleClient } from "@/lib/supabase/server";
import { calcPricingV3 } from "@/lib/pricing";
import { z } from "zod";

const creatorEditSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().min(10),
  user_profit_markup: z.coerce.number().positive(),
});

export async function updateProductCreator(productId: string, patch: any) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in" };

    const parsed = creatorEditSchema.safeParse(patch);
    if (!parsed.success) {
      const firstError = Object.values(
        parsed.error.flatten().fieldErrors,
      ).flat()[0];
      return { ok: false, error: firstError ?? "Invalid input" };
    }
    const data = parsed.data;

    const admin = serviceRoleClient();

    const { data: product } = await admin
      .from("products")
      .select(
        `
        id, brand_id, base_cost_calculated,
        brands(creator_id),
        base_plain_apparel(*),
        sub_children_styles(*)
      `,
      )
      .eq("id", productId)
      .maybeSingle();

    if (!product) return { ok: false, error: "Product not found" };
    const brand = Array.isArray(product.brands)
      ? product.brands[0]
      : product.brands;
    if (brand?.creator_id !== user.id)
      return { ok: false, error: "Not authorized" };

    const apparel = Array.isArray(product.base_plain_apparel)
      ? product.base_plain_apparel[0]
      : product.base_plain_apparel;
    const style = Array.isArray(product.sub_children_styles)
      ? product.sub_children_styles[0]
      : product.sub_children_styles;

    if (!apparel || !style)
      return { ok: false, error: "Missing apparel or style data" };

    // Cast to any — supabase untyped joins don't match strict function signature
    const pricing = calcPricingV3(
      apparel as any,
      style as any,
      data.user_profit_markup,
    );

    const { error } = await admin
      .from("products")
      .update({
        name: data.title,
        description: data.description,
        user_profit_markup: data.user_profit_markup,
        base_cost_calculated: pricing.baseCost,
        total_retail_price: pricing.totalRetail,
        bransion_commission_fee: pricing.bransionFee,
        creator_net_payout: pricing.creatorNet,
      })
      .eq("id", productId);

    if (error) throw error;

    revalidatePath("/products");
    revalidatePath("/store");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Update failed",
    };
  }
}

export async function adminUpdateProductV3(productId: string, patch: any) {
  try {
    const { userId, admin } = await assertAdmin();

    const updateData: any = {};
    if (patch.title) updateData.name = patch.title;
    if (patch.description) updateData.description = patch.description;
    if (patch.user_profit_markup)
      updateData.user_profit_markup = patch.user_profit_markup;
    if (patch.final_composite_product_url) {
      updateData.final_composite_product_url =
        patch.final_composite_product_url;
      updateData.image_locked = true;
    }

    if (patch.user_profit_markup) {
      const { data: prod } = await admin
        .from("products")
        .select(
          `
          base_plain_apparel(default_base_cost, size_price_modifiers),
          sub_children_styles(additional_cost_markup)
        `,
        )
        .eq("id", productId)
        .single();

      if (prod) {
        const apparel = Array.isArray(prod.base_plain_apparel)
          ? prod.base_plain_apparel[0]
          : prod.base_plain_apparel;
        const style = Array.isArray(prod.sub_children_styles)
          ? prod.sub_children_styles[0]
          : prod.sub_children_styles;

        if (apparel && style) {
          // Cast to any — supabase untyped joins don't match strict function signature
          const pricing = calcPricingV3(
            apparel as any,
            style as any,
            patch.user_profit_markup,
          );
          updateData.base_cost_calculated = pricing.baseCost;
          updateData.total_retail_price = pricing.totalRetail;
          updateData.bransion_commission_fee = pricing.bransionFee;
          updateData.creator_net_payout = pricing.creatorNet;
        }
      }
    }

    const { error } = await admin
      .from("products")
      .update(updateData)
      .eq("id", productId);
    if (error) throw error;

    await admin.from("admin_audit_logs").insert({
      admin_id: userId,
      action: "product_image_replaced",
      target_table: "products",
      target_id: productId,
      new_state: updateData,
      justification: "Admin updated product via catalog modal",
    });

    revalidatePath("/products");
    revalidatePath("/store");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}
