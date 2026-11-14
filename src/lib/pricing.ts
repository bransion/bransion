// =====================================================================
// BRANSION — SINGLE SOURCE OF TRUTH for all money math.
// Business rule (NEVER change without a product decision):
//   • Cost price is untouched — 100% goes to covering the blank + print.
//   • Bransion takes 30% of the CREATOR'S MARKUP only.
//   • Creator keeps 70% of their markup.
//   • Delivery fee goes 100% to Bransion fulfillment.
// Every price shown anywhere in the app must come from this file.
// =====================================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApparelSize } from '../../types';
// ── V3 PRICING ENGINE ────────────────────────────────────────────────
import type { BasePlainApparel, SubChildrenStyle } from '../../types';

// ── Constants ────────────────────────────────────────────────────────
export const BRANSION_FEE_RATE = 0.30;
export const CREATOR_PROFIT_RATE = 0.70;

// ── Rounding helper (avoid floating-point drift on money) ────────────
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// ── Per-product pricing breakdown ────────────────────────────────────
export interface PricingBreakdown {
  costPrice: number;        // e.g. ₦5,000 (blank + print)
  addedProfit: number;      // creator's markup, e.g. ₦10,000
  totalRetail: number;      // what buyer pays, e.g. ₦15,000
  bransionFee: number;      // 30% of markup, e.g. ₦3,000
  netCreatorProfit: number; // 70% of markup, e.g. ₦7,000
}

export function calculatePricing(
  costPrice: number,
  creatorMarkup: number
): PricingBreakdown {
  const cost = roundMoney(costPrice);
  const markup = roundMoney(creatorMarkup);
  const totalRetail = roundMoney(cost + markup);
  const bransionFee = roundMoney(markup * BRANSION_FEE_RATE);
  const netCreatorProfit = roundMoney(markup - bransionFee);

  return {
    costPrice: cost,
    addedProfit: markup,
    totalRetail,
    bransionFee,
    netCreatorProfit,
  };
}

// ── Fetch the correct price for a chosen size from the DB ────────────
// Uses the anon client — RLS allows public read of size_pricing.
export async function getSizePrice(
  apparelId: string,
  size: ApparelSize,
  supabase: SupabaseClient
): Promise<number> {
  const { data, error } = await supabase
    .from('size_pricing')
    .select('price')
    .eq('apparel_id', apparelId)
    .eq('size', size)
    .single();

  if (error || !data) {
    throw new Error(`No price found for size "${size}" on apparel ${apparelId}`);
  }
  return roundMoney(Number(data.price));
}

// ── Cart / order total (multi-line, one delivery fee) ────────────────
export interface OrderLine {
  sizePrice: number; // per-unit blank cost for the chosen size
  markup: number;    // per-unit creator markup
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;            // sum of (sizePrice + markup) × quantity
  deliveryFee: number;
  total: number;               // subtotal + deliveryFee
  totalBransionFee: number;    // 30% of all markups in the order
  totalCreatorProfit: number;  // 70% of all markups in the order
}

export function calculateOrderTotal(
  items: OrderLine[],
  deliveryFee: number
): OrderTotals {
  let subtotal = 0;
  let bransionFee = 0;
  let creatorProfit = 0;

  for (const it of items) {
    const lineRetail = (it.sizePrice + it.markup) * it.quantity;
    subtotal = roundMoney(subtotal + lineRetail);

    const lineFee = it.markup * BRANSION_FEE_RATE * it.quantity;
    const lineProfit = it.markup * CREATOR_PROFIT_RATE * it.quantity;

    bransionFee = roundMoney(bransionFee + lineFee);
    creatorProfit = roundMoney(creatorProfit + lineProfit);
  }

  return {
    subtotal,
    deliveryFee: roundMoney(deliveryFee),
    total: roundMoney(subtotal + deliveryFee),
    totalBransionFee: bransionFee,
    totalCreatorProfit: creatorProfit,
  };
}



// ── Pricing with style modifier ──────────────────────────────────────
// Style modifier = extra printing cost (e.g. back print +₦2,500).
// 100% goes to Bransion (covers extra print/fabric). Not part of the split.
// 30/70 still applies to MARKUP ONLY, per Rule 2.1.
export interface PricingWithStyle {
  cost: number;              // base M price, e.g. ₦5,000
  costPrice: number;         // alias of `cost` — matches PricingBreakdown shape
  styleModifier: number;     // e.g. ₦2,500
  subtotalCost: number;      // cost + styleModifier, e.g. ₦7,500
  addedProfit: number;       // creator markup, e.g. ₦10,000
  totalRetail: number;       // what buyer pays, e.g. ₦17,500
  bransionFee: number;       // 30% of MARKUP only, e.g. ₦3,000
  netCreatorProfit: number;  // 70% of MARKUP only, e.g. ₦7,000
}

export function calculatePricingWithStyle(
  baseCost: number,
  styleModifier: number,
  creatorMarkup: number
): PricingWithStyle {
  const cost = roundMoney(baseCost);
  const style = roundMoney(Math.max(0, styleModifier));
  const subtotalCost = roundMoney(cost + style);
  const markup = roundMoney(creatorMarkup);
  const totalRetail = roundMoney(subtotalCost + markup);
  const bransionFee = roundMoney(markup * BRANSION_FEE_RATE);
  const netCreatorProfit = roundMoney(markup - bransionFee);

    return {
    cost,
    costPrice: cost, // alias — lets callers use either name
    styleModifier: style,
    subtotalCost,
    addedProfit: markup,
    totalRetail,
    bransionFee,
    netCreatorProfit,
  };
}




// ── V3 PRICING ENGINE ────────────────────────────────────────────────
// Appended for V3 Styling Engine. Handles base cost + style markup +
// size modifier, and applies the 30/70 split ONLY to user_profit_markup.

export interface V3PricingResult {
  base_cost_calculated: number;
  total_retail_price: number;
  bransion_commission_fee: number;
  creator_net_payout: number;
}

export function calculateV3Pricing(
  defaultBaseCost: number,
  styleMarkup: number,
  sizeModifier: number,
  userProfitMarkup: number
): V3PricingResult {
  const base = roundMoney(defaultBaseCost);
  const style = roundMoney(styleMarkup);
  const size = roundMoney(sizeModifier);
  const profit = roundMoney(userProfitMarkup);

  // 1. Calculate base cost (Brand keeps none of this)
  const baseCostCalculated = roundMoney(base + style + size);
  
  // 2. Calculate total retail (What the buyer pays, minus shipping)
  const totalRetailPrice = roundMoney(baseCostCalculated + profit);

  // 3. Calculate 30/70 split on profit ONLY
  const bransionCommission = roundMoney(profit * BRANSION_FEE_RATE);
  const creatorNet = roundMoney(profit - bransionCommission);

  return {
    base_cost_calculated: baseCostCalculated,
    total_retail_price: totalRetailPrice,
    bransion_commission_fee: bransionCommission,
    creator_net_payout: creatorNet,
  };
}





/**
 * Calculates the base cost for a product using the 'M' size modifier.
 * M is the base. The 30/70 split is on userMarkup only — cost and style
 * markup are never touched.
 */
export function calcBaseCostM(apparel: BasePlainApparel, style: SubChildrenStyle): number {
  const mModifier = apparel.size_price_modifiers['M'] ?? 0;
  return apparel.default_base_cost + mModifier + style.additional_cost_markup;
}

/**
 * Calculates the full V3 pricing breakdown for a creator setting a markup.
 * M is the base. The 30/70 split is on userMarkup only — cost and style
 * markup are never touched.
 */
export function calcPricingV3(apparel: BasePlainApparel, style: SubChildrenStyle, userMarkup: number) {
  const baseCost = calcBaseCostM(apparel, style);
  const totalRetail = baseCost + userMarkup;
  return {
    baseCost,
    userMarkup,
    totalRetail,
    bransionFee: userMarkup * 0.30,
    creatorNet: userMarkup * 0.70,
  };
}

/**
 * Calculates the buyer-visible price at checkout based on the selected size.
 * M is the base. The 30/70 split is on userMarkup only — cost and style
 * markup are never touched.
 */
export function calcBuyerSizePrice(
  apparel: BasePlainApparel,
  style: SubChildrenStyle,
  size: string,
  creatorMarkup: number
): number {
  const sizeMod = apparel.size_price_modifiers[size] ?? 0;
  return apparel.default_base_cost + sizeMod + style.additional_cost_markup + creatorMarkup;
}