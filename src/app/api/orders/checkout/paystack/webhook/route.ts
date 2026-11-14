// =====================================================================
// BRANSION — Paystack webhook handler.
// Triggered by Paystack on every successful payment.
// SECURITY:
//   1. Verify x-paystack-signature via HMAC-SHA512 (timingSafeEqual).
//   2. Idempotent: skip if order already paid.
//   3. Wallet credit uses apply_maintenance_offset (atomic).
// This route MUST be public — it's the only one that fully trusts
// its own signature check instead of a user session.
// =====================================================================
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { serviceRoleClient } from '@/lib/supabase/server';
import { requireServerEnv } from '@/lib/env';
import { calculatePricing } from '@/lib/pricing';

export async function POST(req: Request) {
  const env = requireServerEnv();
  const rawBody = await req.text(); // RAW body — needed for HMAC
  const signature = req.headers.get('x-paystack-signature');

  // ── 1) VERIFY SIGNATURE ─────────────────────────────────────────────
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  const expected = createHmac('sha512', env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── 2) PARSE + DISPATCH ─────────────────────────────────────────────
  let event: {
    event: string;
    data: {
      reference: string;
      status: string;
      amount: number;
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only handle charge.success — everything else is a no-op.
  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true });
  }

  const reference = event.data.reference;
  if (!reference) {
    return NextResponse.json({ error: 'No reference' }, { status: 400 });
  }

  const admin = serviceRoleClient();

  // ── 3) FETCH ORDER (idempotency) ────────────────────────────────────
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select(
      'id, buyer_id, brand_id, status, payment_reference, paid_at'
    )
    .eq('payment_reference', reference)
    .maybeSingle();

  if (orderErr || !order) {
    // Order not found — this shouldn't happen but log and 200 to prevent
    // Paystack from retrying forever.
    console.warn('Webhook: order not found for reference', reference);
    return NextResponse.json({ received: true });
  }

  // Already paid → idempotency guard. Return 200 so Paystack stops retrying.
  if (order.status === 'paid' || order.paid_at) {
    return NextResponse.json({ received: true, idempotent: true });
  }

  // ── 4) FLIP ORDER TO PAID ───────────────────────────────────────────
  const { error: updateErr } = await admin
    .from('orders')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', order.id)
    .eq('status', 'pending_payment'); // race-safe

  if (updateErr) {
    console.error('Order update failed:', updateErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  // ── 5) CREDIT CREATOR WALLETS (per order_item) ──────────────────────
  // For each order_item: find the creator, compute 30/70 split on markup,
  // then call apply_maintenance_offset to pay outstanding invoices first.
  const { data: orderItems } = await admin
    .from('order_items')
    .select(`
      id, markup, quantity,
      products(brands(creator_id))
    `)
    .eq('order_id', order.id);

  type OI = {
    id: string;
    markup: number;
    quantity: number;
    products: { brands: { creator_id: string } | null } | null;
  };

  for (const item of (orderItems ?? []) as unknown as OI[]) {
    const creatorId = item.products?.brands?.creator_id;
    if (!creatorId) continue;

    const totalMarkup = Number(item.markup) * Number(item.quantity);
    const { netCreatorProfit } = calculatePricing(0, totalMarkup);

    // apply_maintenance_offset: pays oldest unpaid invoices first, then
    // credits remaining netCreatorProfit to wallet_balance. Atomic.
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

  // ── 6) SUCCESS ──────────────────────────────────────────────────────
  return NextResponse.json({ received: true, order_id: order.id });
}