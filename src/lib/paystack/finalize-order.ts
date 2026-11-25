// =====================================================================
// BRANSION — Finalize paid order.
// Called by BOTH the Paystack webhook AND /api/paystack/verify-order.
// Fully idempotent — safe to call multiple times for the same order.
//   1. Marks order as 'paid' (if not already)
//   2. Credits creator 70% of markup (if not already credited)
//   3. Credits referrer 2%/5% lifetime commission (if not already credited)
//   4. Sends in-app notification to referrer when commission is credited
// =====================================================================
import { serviceRoleClient } from '@/lib/supabase/server';
import { calculatePricing, roundMoney } from '@/lib/pricing';
import {
  computeLifetimeSaleCommission,
  computeSourceFeeAmount,
} from '@/lib/referral/commissions';

type Admin = ReturnType<typeof serviceRoleClient>;

export interface FinalizeResult {
  ok: boolean;
  reason?: string;
  order_id?: string;
}

export async function finalizeOrder(
  orderId: string,
  admin: Admin
): Promise<FinalizeResult> {
  // ── 1) Fetch order ────────────────────────────────────────────────
  const { data: order } = await admin
    .from('orders')
    .select('id, status, paid_at')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return { ok: false, reason: 'order_not_found' };

  const wasAlreadyPaid = order.status === 'paid' || Boolean(order.paid_at);

  // ── 2) Mark paid (idempotent via status guard) ───────────────────
  if (!wasAlreadyPaid) {
    await admin
      .from('orders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending_payment');
  }

  // ── 3) Fetch order items + aggregate markup by creator ───────────
  const { data: items } = await admin
    .from('order_items')
    .select(`markup, quantity, products(name, brands(creator_id))`)
    .eq('order_id', orderId);

  type OI = {
    markup: number;
    quantity: number;
    products: {
      name: string;
      brands: { creator_id: string } | null;
    } | null;
  };

  const markupByCreator = new Map<
    string,
    { totalMarkup: number; productName: string }
  >();
  for (const item of (items ?? []) as unknown as OI[]) {
    const cid = item.products?.brands?.creator_id;
    if (!cid) continue;
    const totalMarkup = Number(item.markup) * Number(item.quantity);
    const existing = markupByCreator.get(cid);
    if (existing) {
      existing.totalMarkup += totalMarkup;
    } else {
      markupByCreator.set(cid, {
        totalMarkup,
        productName: item.products?.name ?? 'a product',
      });
    }
  }

  // ── 4) For each creator: credit 70% + referral commission ────────
  for (const [creatorId, data] of markupByCreator.entries()) {
    const { totalMarkup, productName } = data;

    // 4a. Credit creator 70% — only if this is the first pass
    if (!wasAlreadyPaid) {
      const { netCreatorProfit } = calculatePricing(0, totalMarkup);
      await admin.rpc('apply_maintenance_offset', {
        p_creator_id: creatorId,
        p_credit_amount: netCreatorProfit,
      });
    }

    // 4b. Referral lifetime commission — idempotent via DB unique index
    const { data: existingCommission } = await admin
      .from('commissions_ledger')
      .select('id')
      .eq('order_id', orderId)
      .eq('referee_id', creatorId)
      .eq('type', 'lifetime_sale')
      .maybeSingle();

    if (existingCommission) continue;

    const { data: contract } = await admin
      .from('referral_contracts')
      .select('id, referrer_id, lifetime_split')
      .eq('referee_id', creatorId)
      .eq('is_active', true)
      .maybeSingle();

    if (!contract || contract.lifetime_split === 'none') continue;

    const commission = computeLifetimeSaleCommission(
      totalMarkup,
      contract.lifetime_split
    );
    if (commission <= 0) continue;

    const sourceFee = computeSourceFeeAmount(totalMarkup);
    const pct = contract.lifetime_split === 'five_percent' ? 5 : 2;

    const { data: referrer } = await admin
      .from('profiles')
      .select('wallet_balance, lifetime_earnings, full_name, email')
      .eq('id', contract.referrer_id)
      .maybeSingle();

    const newBalance = roundMoney(
      Number(referrer?.wallet_balance ?? 0) + commission
    );
    const newEarnings = roundMoney(
      Number(referrer?.lifetime_earnings ?? 0) + commission
    );

    await admin
      .from('profiles')
      .update({
        wallet_balance: newBalance,
        lifetime_earnings: newEarnings,
      })
      .eq('id', contract.referrer_id);

    await admin.from('wallet_transactions').insert({
      creator_id: contract.referrer_id,
      order_id: orderId,
      type: 'sale_credit',
      amount: commission,
      balance_after: newBalance,
      description: `Referral commission on order ${orderId.slice(0, 8)}`,
      reference: `ref_order_${orderId}_${creatorId}`,
    });

    // 4c. Insert ledger row (unique index prevents duplicate)
    const { error: ledgerErr } = await admin
      .from('commissions_ledger')
      .insert({
        referrer_id: contract.referrer_id,
        referee_id: creatorId,
        order_id: orderId,
        type: 'lifetime_sale',
        base_amount: totalMarkup,
        commission_pct: pct,
        commission_amount: commission,
        source_fee_amount: sourceFee,
      });

    if (ledgerErr) {
      console.warn(
        'Referral commission ledger insert skipped (idempotent):',
        ledgerErr.message
      );
      continue;
    }

    // 4d. Notify the referrer
    const creatorName = referrer?.full_name?.split(' ')[0] ?? 'Someone you referred';
    await admin.from('notifications').insert({
      recipient_id: contract.referrer_id,
      title: 'Lifetime referral commission earned 🎉',
      body: `${creatorName} just sold "${productName}". Your ${pct}% lifetime commission on their ₦${totalMarkup.toLocaleString()} markup has been credited: ₦${commission.toLocaleString()}.`,
      type: 'payout_alert',
      link_url: '/referrals',
      is_read: false,
    });
  }

  return { ok: true, order_id: orderId };
}