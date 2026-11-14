// =====================================================================
// BRANSION — Referral commission math.
//
// ═══════════════════════════════════════════════════════════════════
// OFFICIAL BRANSION REFERRAL LEDGER RULES
// ═══════════════════════════════════════════════════════════════════
//
// Two separate commission streams:
//
// 1. INITIAL TIER COMMISSION (one-time per referee)
//    Amount: 10% of the tier payment the referee made
//    Base:   ₦5,000 / ₦20,000 / ₦50,000
//    Result: ₦500 / ₦2,000 / ₦5,000
//    Source: Bransion's tier revenue (Bransion nets 90% of each tier sale)
//    Where:  Credited by DB trigger `lock_referral_contract` — NOT by code.
//            computeInitialTierCommission() is DISPLAY-ONLY for previews.
//
// 2. LIFETIME SALE COMMISSION (recurring, every sale by the referee)
//    Base:   orderMarkupTotal (the brand owner's input profit, e.g. ₦10,000)
//    Rates:  Basic referrer    → 0%   → ₦0
//            Standard referrer → 2%   → ₦200  (of a ₦10,000 markup)
//            Premium referrer  → 5%   → ₦500  (of a ₦10,000 markup)
//
//    SOURCE — HARD RULE, NEVER CHANGE:
//    The 2% / 5% comes OUT OF Bransion's 30% markup fee.
//    The creator's 70% split is UNTOUCHED.
//
//    Example with ₦10,000 markup:
//      Bransion's 30% = ₦3,000
//      Standard referrer gets 2% × ₦10,000 = ₦200
//      Bransion nets ₦3,000 - ₦200 = ₦2,800 (= 28% of markup)
//      Creator keeps ₦7,000 (70%, unchanged) ✓
//
//      Premium referrer gets 5% × ₦10,000 = ₦500
//      Bransion nets ₦3,000 - ₦500 = ₦2,500 (= 25% of markup)
//      Creator keeps ₦7,000 (70%, unchanged) ✓
//
// ═══════════════════════════════════════════════════════════════════
// =====================================================================
import { roundMoney } from '@/lib/pricing';

/**
 * 10% of tier price. DISPLAY-ONLY — the actual wallet credit is
 * performed by the DB trigger `lock_referral_contract`.
 *
 * ⚠️ Do NOT call this from a route that also triggers the DB trigger —
 * you would double-credit the referrer.
 */
export function computeInitialTierCommission(
  refereeTierPrice: number,
  _referrerTier: 'basic' | 'standard' | 'premium'
): number {
  return roundMoney(refereeTierPrice * 0.10);
}

/**
 * 2% or 5% of the referred brand owner's markup, carved from
 * Bransion's 30% fee. Creator's 70% untouched.
 *
 * `orderMarkupTotal` MUST be the referred creator's markup for THIS
 * order — not the total across all creators if the cart had multiple
 * brands. The webhook is responsible for scoping per-brand.
 */
export function computeLifetimeSaleCommission(
  orderMarkupTotal: number,
  referrerSplit: 'none' | 'two_percent' | 'five_percent'
): number {
  if (referrerSplit === 'none') return 0;
  if (referrerSplit === 'two_percent') return roundMoney(orderMarkupTotal * 0.02);
  if (referrerSplit === 'five_percent') return roundMoney(orderMarkupTotal * 0.05);
  return 0;
}

/**
 * Maps a referrer's tier → their lifetime split rate.
 * Basic = no lifetime commission (only gets the 10% initial tier cut).
 */
export function computeReferrerSplitFromTier(
  referrerTier: 'basic' | 'standard' | 'premium'
): 'none' | 'two_percent' | 'five_percent' {
  if (referrerTier === 'premium') return 'five_percent';
  if (referrerTier === 'standard') return 'two_percent';
  return 'none';
}

/**
 * What Bransion keeps AFTER paying the lifetime commission.
 * Useful for reporting/dashboards — confirms the 28% / 25% net shown
 * in the official ledger.
 *
 * Example: markup ₦10,000, standard referrer:
 *   computeBransionNetAfterCommission(10000, 'two_percent') → 2800
 */
export function computeBransionNetAfterCommission(
  orderMarkupTotal: number,
  referrerSplit: 'none' | 'two_percent' | 'five_percent'
): number {
  const bransionGross = roundMoney(orderMarkupTotal * 0.30);
  const commission = computeLifetimeSaleCommission(orderMarkupTotal, referrerSplit);
  return roundMoney(bransionGross - commission);
}

/**
 * The 30% fee Bransion charged, BEFORE commission deduction.
 * Used as `source_fee_amount` when writing to commissions_ledger.
 */
export function computeSourceFeeAmount(orderMarkupTotal: number): number {
  return roundMoney(orderMarkupTotal * 0.30);
}