// =====================================================================
// BRANSION — Paystack webhook.
// Order payments → finalizeOrder (idempotent, credits 70% + referral)
// Tier payments  → handleTierWebhook (unchanged — DB trigger handles 10%)
// =====================================================================
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { serviceRoleClient } from '@/lib/supabase/server';
import { requireServerEnv } from '@/lib/env';
import { finalizeOrder } from '@/lib/paystack/finalize-order';
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
// ORDER PAYMENT — via shared finalizeOrder (idempotent)
// =====================================================================
async function handleOrderWebhook(
  data: { reference: string; status: string; amount: number },
  admin: ReturnType<typeof serviceRoleClient>
) {
  const reference = data.reference;

  const { data: order } = await admin
    .from('orders')
    .select('id')
    .eq('payment_reference', reference)
    .maybeSingle();

  if (!order) {
    console.warn('Order webhook: order not found for reference', reference);
    return NextResponse.json({ received: true });
  }

  const result = await finalizeOrder(order.id, admin);

  if (!result.ok) {
    console.error('finalizeOrder failed:', result.reason);
    return NextResponse.json(
      { error: result.reason ?? 'finalize failed' },
      { status: 500 }
    );
  }

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
        account_tier: tier,
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

  // 10% initial referral commission handled by DB trigger
  // `lock_referral_contract` on subscription_payments.status='paid'.

  return NextResponse.json({ received: true, tier });
}