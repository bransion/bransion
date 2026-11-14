// =====================================================================
// BRANSION — Paystack webhook.
// Handles order + tier purposes. Logs signature mismatches.
// NEW: lifetime referral commissions carved from Bransion's 30%.
// =====================================================================
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { serviceRoleClient } from '@/lib/supabase/server';
import { requireServerEnv } from '@/lib/env';
import { calculatePricing, roundMoney } from '@/lib/pricing';
import {
  computeLifetimeSaleCommission,
  computeSourceFeeAmount,
} from '@/lib/referral/commissions';
import { writeAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  const env = requireServerEnv();
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  const expected = createHmac('sha512', env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  let signatureValid = false;
  if (signature) {
    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(signature, 'hex');
      signatureValid = a.length === b.length && timingSafeEqual(a, b);
    } catch {
      signatureValid = false;
    }
  }

  if (!signatureValid) {
    const admin = serviceRoleClient();
    await writeAuditLog(admin, {
      adminId: null,
      action: 'webhook.signature_mismatch',
      targetTable: 'orders',
      meta: {
        has_signature: Boolean(signature),
        body_preview: rawBody.slice(0, 300),
      },
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  type PaystackEvent = {
    event: string;
    data: {
      reference: string;
      status: string;
      amount: number;
      metadata?: Record<string, unknown>;
    };
  };

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    const admin = serviceRoleClient();
    await writeAuditLog(admin, {
      adminId: null,
      action: 'webhook.malformed_json',
      meta: { body_preview: rawBody.slice(0, 300) },
    });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true });
  }

  const reference = event.data.reference;
  if (!reference) {
    return NextResponse.json({ error: 'No reference' }, { status: 400 });
  }

  const admin = serviceRoleClient();
  const metadata = event.data.metadata ?? {};
  const purpose = (metadata.purpose as string | undefined) ?? 'order';

  if (purpose === 'tier') {
    return handleTierWebhook(event.data, metadata, admin);
  }
  return handleOrderWebhook(event.data, admin);
}

// =====================================================================
// ORDER PAYMENT HANDLER
// =====================================================================
async function handleOrderWebhook(
  data: { reference: string; status: string; amount: number },
  admin: ReturnType<typeof serviceRoleClient>
) {
  const reference = data.reference;

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, buyer_id, brand_id, status, payment_reference, paid_at')
    .eq('payment_reference', reference)
    .maybeSingle();

  if (orderErr || !order) {
    console.warn('Order webhook: order not found for reference', reference);
    return NextResponse.json({ received: true });
  }

  if (order.status === 'paid' || order.paid_at) {
    return NextResponse.json({ received: true, idempotent: true });
  }

  const { error: updateErr } = await admin
    .from('orders')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', order.id)
    .eq('status', 'pending_payment');

  if (updateErr) {
    console.error('Order webhook: update failed', updateErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  const { data: orderItems } = await admin
    .from('order_items')
    .select(
      `id, markup, quantity,
       products(brands(creator_id))`
    )
    .eq('order_id', order.id);

  type OI = {
    id: string;
    markup: number;
    quantity: number;
    products: { brands: { creator_id: string } | null } | null;
  };

  // ── Credit creator wallets (existing logic — 70% of markup) ──────
  for (const item of (orderItems ?? []) as unknown as OI[]) {
    const creatorId = item.products?.brands?.creator_id;
    if (!creatorId) continue;

    const totalMarkup = Number(item.markup) * Number(item.quantity);
    const { netCreatorProfit } = calculatePricing(0, totalMarkup);

    const { error: rpcErr } = await admin.rpc('apply_maintenance_offset', {
      p_creator_id: creatorId,
      p_credit_amount: netCreatorProfit,
    });

    if (rpcErr) {
      console.error('apply_maintenance_offset failed:', rpcErr, {
        creatorId,
        netCreatorProfit,
      });
    }
  }

  // ── NEW: Lifetime referral commissions (2%/5% of markup) ─────────
  await creditLifetimeReferralCommissions(order.id, admin);

  return NextResponse.json({ received: true, order_id: order.id });
}

// =====================================================================
// TIER PURCHASE HANDLER (unchanged — DB trigger handles 10% + contract)
// =====================================================================
async function handleTierWebhook(
  data: { reference: string; status: string; amount: number },
  metadata: Record<string, unknown>,
  admin: ReturnType<typeof serviceRoleClient>
) {
  const tier = metadata.tier as 'basic' | 'standard' | 'premium' | undefined;
  const userId = metadata.user_id as string | undefined;
  const pendingBrandId = (metadata.pending_brand_id as string | null) ?? null;
  const subscriptionPaymentId = metadata.subscription_payment_id as
    | string
    | undefined;

  if (!tier || !userId || !subscriptionPaymentId) {
    console.warn('Tier webhook: missing metadata', {
      tier,
      userId,
      subscriptionPaymentId,
    });
    return NextResponse.json({ received: true });
  }

  const { data: sp } = await admin
    .from('subscription_payments')
    .select('id, status, creator_id')
    .eq('id', subscriptionPaymentId)
    .maybeSingle();

  if (!sp) {
    console.warn(
      'Tier webhook: subscription_payment not found',
      subscriptionPaymentId
    );
    return NextResponse.json({ received: true });
  }
  if (sp.status === 'paid') {
    return NextResponse.json({ received: true, idempotent: true });
  }
  if (sp.creator_id !== userId) {
    console.warn('Tier webhook: creator_id mismatch');
    return NextResponse.json({ received: true });
  }

  const { error: spErr } = await admin
    .from('subscription_payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', subscriptionPaymentId)
    .eq('status', 'pending');

  if (spErr) {
    console.error('Tier webhook: subscription_payments update failed', spErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  const TIER_RANK = { none: 0, basic: 1, standard: 2, premium: 3 } as const;
  const { data: profile } = await admin
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .maybeSingle();
  const currentTier = (profile?.tier ?? 'none') as keyof typeof TIER_RANK;

  if (TIER_RANK[tier] >= TIER_RANK[currentTier]) {
    await admin
      .from('profiles')
      .update({
        tier,
        tier_paid_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  if (pendingBrandId) {
    await admin
      .from('brands')
      .update({
        is_active: true,
        published_at: new Date().toISOString(),
      })
      .eq('id', pendingBrandId)
      .eq('creator_id', userId)
      .eq('is_active', false);
  } else {
    const { data: oldest } = await admin
      .from('brands')
      .select('id')
      .eq('creator_id', userId)
      .eq('is_active', false)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (oldest) {
      await admin
        .from('brands')
        .update({
          is_active: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', oldest.id);
    }
  }

  return NextResponse.json({ received: true, tier });
}

// =====================================================================
// LIFETIME REFERRAL COMMISSION
// Per creator in the order: if they were referred (active contract),
// credit their referrer 2%/5% of that creator's markup — carved from
// Bransion's 30%. Creator's 70% split is untouched.
// =====================================================================
async function creditLifetimeReferralCommissions(
  orderId: string,
  admin: ReturnType<typeof serviceRoleClient>
) {
  const { data: items } = await admin
    .from('order_items')
    .select(
      `id, markup, quantity,
       products(brands(creator_id))`
    )
    .eq('order_id', orderId);

  type OI = {
    id: string;
    markup: number;
    quantity: number;
    products: { brands: { creator_id: string } | null } | null;
  };

  // Group markup by creator
  const markupByCreator = new Map<string, number>();
  for (const item of (items ?? []) as unknown as OI[]) {
    const cid = item.products?.brands?.creator_id;
    if (!cid) continue;
    const totalMarkup = Number(item.markup) * Number(item.quantity);
    markupByCreator.set(cid, (markupByCreator.get(cid) ?? 0) + totalMarkup);
  }

  for (const [creatorId, markupTotal] of markupByCreator.entries()) {
    // Look up active contract for this creator as referee
    const { data: contract } = await admin
      .from('referral_contracts')
      .select('id, referrer_id, lifetime_split')
      .eq('referee_id', creatorId)
      .eq('is_active', true)
      .maybeSingle();

    if (!contract) continue;
    if (contract.lifetime_split === 'none') continue;

    const commission = computeLifetimeSaleCommission(
      markupTotal,
      contract.lifetime_split
    );
    if (commission <= 0) continue;

    const sourceFee = computeSourceFeeAmount(markupTotal);

    const { data: referrer } = await admin
      .from('profiles')
      .select('wallet_balance, lifetime_earnings')
      .eq('id', contract.referrer_id)
      .maybeSingle();

    const currentBalance = Number(referrer?.wallet_balance ?? 0);
    const currentEarnings = Number(referrer?.lifetime_earnings ?? 0);
    const newBalance = roundMoney(currentBalance + commission);
    const newEarnings = roundMoney(currentEarnings + commission);

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

    const pct = contract.lifetime_split === 'five_percent' ? 5 : 2;

    await admin.from('commissions_ledger').insert({
      referrer_id: contract.referrer_id,
      referee_id: creatorId,
      order_id: orderId,
      type: 'lifetime_sale',
      base_amount: markupTotal,
      commission_pct: pct,
      commission_amount: commission,
      source_fee_amount: sourceFee,
    });
  }
}