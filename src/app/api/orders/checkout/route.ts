// =====================================================================
// BRANSION V3 — Checkout API
// Handles both V3 products (base_plain_apparel + sub_children_styles)
// and V2 products (plain_apparel + size_pricing) as fallback.
// =====================================================================
import { NextResponse } from "next/server";
import { serviceRoleClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { requireServerEnv } from "@/lib/env";
import { initializeTransaction } from "@/lib/paystack";
import { calculateDeliveryFee } from "@/lib/nigeria-lgas";
import { checkoutSchema } from "@/lib/validations";
import { calculatePricing, roundMoney } from "@/lib/pricing";

interface BodyItem {
  productId: string;
  size: string;
  qty: number;
}

interface Body extends Record<string, unknown> {
  items: BodyItem[];
}

interface OrderItemRow {
  product_id: string;
  size: string;
  size_price: number;
  markup: number;
  quantity: number;
  line_total: number;
}

export async function POST(req: Request) {
  // ── 0) RATE LIMIT ──────────────────────────────────────────────────
  const rl = checkRateLimit(req, {
    keyPrefix: "orders:checkout",
    windowMs: 60_000,
    max: 5,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    // ── 1) AUTH ─────────────────────────────────────────────────────
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const { user } = session;

    // ── 2) VALIDATE ─────────────────────────────────────────────────
    const body = (await req.json()) as Body;
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid shipping info",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const form = parsed.data;

    // ── 3) FETCH PRODUCTS (V3 + V2 joins) ───────────────────────────
    const admin = serviceRoleClient();
    const productIds = Array.from(new Set(body.items.map((i) => i.productId)));

    const { data: rawProducts, error: prodErr } = await admin
      .from("products")
      .select(
        `
        id, brand_id, status, legacy_status, creator_markup, user_profit_markup,
        plain_apparel_id, selected_style_id, apparel_id,
        v3_apparel:base_plain_apparel(default_base_cost, size_price_modifiers),
        v3_style:sub_children_styles(additional_cost_markup),
        brands(creator_id),
        v2_apparel:plain_apparel(size_pricing(size, price))
      `,
      )
      .in("id", productIds);

    if (prodErr || !rawProducts || rawProducts.length === 0) {
      return NextResponse.json(
        { error: "One or more products are unavailable" },
        { status: 400 },
      );
    }

    // Filter to only published/live products (safe — avoids broken .or())
    type ProdRow = {
      id: string;
      brand_id: string;
      status: string;
      legacy_status: string | null;
      creator_markup: number | null;
      user_profit_markup: number | null;
      plain_apparel_id: string | null;
      selected_style_id: string | null;
      apparel_id: string | null;
      v3_apparel:
        | {
            default_base_cost: number;
            size_price_modifiers: Record<string, number>;
          }
        | {
            default_base_cost: number;
            size_price_modifiers: Record<string, number>;
          }[]
        | null;
      v3_style:
        | { additional_cost_markup: number }
        | { additional_cost_markup: number }[]
        | null;
      brands: { creator_id: string } | { creator_id: string }[] | null;
      v2_apparel:
        | { size_pricing: { size: string; price: number }[] }
        | { size_pricing: { size: string; price: number }[] }[]
        | null;
    };

    const products = (rawProducts as unknown as ProdRow[]).filter(
      (p) => p.status === "published" || p.legacy_status === "live",
    );

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No published products in cart" },
        { status: 400 },
      );
    }

    // ── 4) NORMALIZE JOIN SHAPES (Supabase returns array OR object) ─
    function first<T>(x: T | T[] | null | undefined): T | null {
      if (!x) return null;
      return Array.isArray(x) ? (x[0] ?? null) : x;
    }

    const productMap = new Map<string, ProdRow>();
    for (const p of products) productMap.set(p.id, p);

    let subtotal = 0;
    let bransionFee = 0;
    const orderItems: OrderItemRow[] = [];

    for (const item of body.items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        return NextResponse.json(
          { error: `Product ${item.productId} unavailable` },
          { status: 400 },
        );
      }

      const qty = Math.max(1, Math.floor(item.qty));
      let sizePrice = 0;
      let markup = 0;

      const v3Apparel = first(prod.v3_apparel);
      const v3Style = first(prod.v3_style);
      const v2Apparel = first(prod.v2_apparel);

      if (v3Apparel && v3Style) {
        // V3 product path
        const sizeMod = v3Apparel.size_price_modifiers[item.size] ?? 0;
        sizePrice =
          Number(v3Apparel.default_base_cost) +
          Number(sizeMod) +
          Number(v3Style.additional_cost_markup);
        markup = Number(prod.user_profit_markup ?? 0);
      } else if (
        v2Apparel &&
        v2Apparel.size_pricing &&
        v2Apparel.size_pricing.length > 0
      ) {
        // V2 product fallback
        const sizeRow = v2Apparel.size_pricing.find(
          (s) => s.size === item.size,
        );
        if (!sizeRow) {
          return NextResponse.json(
            { error: `Size ${item.size} unavailable for ${prod.id}` },
            { status: 400 },
          );
        }
        sizePrice = Number(sizeRow.price);
        markup = Number(prod.creator_markup ?? 0);
      } else {
        return NextResponse.json(
          { error: `Pricing unavailable for product ${prod.id}` },
          { status: 400 },
        );
      }

      const lineTotal = roundMoney((sizePrice + markup) * qty);
      const pricing = calculatePricing(sizePrice, markup);

      subtotal = roundMoney(subtotal + lineTotal);
      bransionFee = roundMoney(bransionFee + pricing.bransionFee * qty);

      orderItems.push({
        product_id: prod.id,
        size: item.size,
        size_price: sizePrice,
        markup,
        quantity: qty,
        line_total: lineTotal,
      });
    }

    // ── 5) DELIVERY FEE (dynamic from geo_shipping_rates) ──────────
    const { data: geoFee } = await admin
      .from("geo_shipping_rates")
      .select("fee")
      .eq("state", form.shipping_state)
      .eq("lga", form.shipping_lga)
      .eq("is_active", true)
      .maybeSingle();

    const deliveryFee = geoFee
      ? Number(geoFee.fee)
      : calculateDeliveryFee(form.shipping_state, form.shipping_lga);

    const totalAmount = roundMoney(subtotal + deliveryFee);

    // ── 6) CREATE ORDER + ITEMS ─────────────────────────────────────
    const primaryBrandId = productMap.get(orderItems[0].product_id)!.brand_id;
    const paymentReference = crypto.randomUUID();

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        buyer_id: user.id,
        brand_id: primaryBrandId,
        status: "pending_payment",
        total_amount: totalAmount,
        delivery_fee: deliveryFee,
        payment_reference: paymentReference,
        shipping_full_name: form.shipping_full_name,
        shipping_primary_phone: form.shipping_primary_phone,
        shipping_secondary_phone: form.shipping_secondary_phone || null,
        shipping_current_address: form.shipping_current_address,
        shipping_address: form.shipping_address,
        shipping_state: form.shipping_state,
        shipping_lga: form.shipping_lga,
        notes: form.notes || null,
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("Order insert error:", orderErr);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 },
      );
    }

    const itemsWithOrder = orderItems.map((i) => ({
      ...i,
      order_id: order.id,
    }));

    const { error: itemsErr } = await admin
      .from("order_items")
      .insert(itemsWithOrder);

    if (itemsErr) {
      await admin.from("orders").delete().eq("id", order.id);
      console.error("Order items insert error:", itemsErr);
      return NextResponse.json(
        { error: "Failed to save order items" },
        { status: 500 },
      );
    }

    // ── 7) INITIALIZE PAYSTACK ──────────────────────────────────────
    const env = requireServerEnv();
    const callbackUrl = `${env.NEXT_PUBLIC_SITE_URL}/checkout/success`;

    const init = await initializeTransaction({
      email: user.email,
      amountKobo: Math.round(totalAmount * 100),
      reference: paymentReference,
      callbackUrl,
      metadata: {
        purpose: "order",
        order_id: order.id,
        buyer_id: user.id,
        bransion_fee_ngn: bransionFee,
      },
    });

    return NextResponse.json({
      authorization_url: init.authorization_url,
      reference: paymentReference,
      order_id: order.id,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 },
    );
  }
}
