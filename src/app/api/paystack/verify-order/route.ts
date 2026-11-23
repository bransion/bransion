// =====================================================================
// BRANSION — Order verification endpoint.
// Called by the success page poller every 2 seconds while pending.
// Idempotent: if order is already paid, returns immediately.
// =====================================================================
import { NextResponse } from 'next/server';
import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { verifyTransaction } from '@/lib/paystack';
import { calculatePricing } from '@/lib/pricing';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');
    if (!reference) {
      return NextResponse.json({ status: 'error', message: 'No reference' });
    }

    // Auth: must be the buyer
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ status: 'error', message: 'Not signed in' }, { status: 401 });
    }

    const admin = serviceRoleClient();

    const { data: order } = await admin
      .from('orders')
      .select('id, buyer_id, status, total_amount, paid_at')
      .eq('payment_reference', reference)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ status: 'not_found' });
    }

    if (order.buyer_id !== user.id) {
      return NextResponse.json({ status: 'forbidden' }, { status: 403 });
    }

    // Already paid → return success immediately
    if (order.status === 'paid' || order.paid_at) {
      return NextResponse.json({ status: 'paid' });
    }

    // Not pending_payment → terminal state, don't touch
    if (order.status !== 'pending_payment') {
      return NextResponse.json({ status: order.status });
    }

    // Verify with Paystack
    const verify = await verifyTransaction(reference);

    if (verify.status !== 'success') {
      return NextResponse.json({ status: 'pending', paystack_status: verify.status });
    }

    // Amount check (kobo comparison)
    if (verify.amount < order.total_amount * 100) {
      return NextResponse.json({ status: 'pending', message: 'Amount mismatch' });
    }

    // Mark paid
    await admin
      .from('orders')
      .update({
        status: 'paid',
        paid_at: verify.paidAt ?? new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', 'pending_payment');

    // Credit creators (same as success page + webhook)
    const { data: items } = await admin
      .from('order_items')
      .select(`markup, quantity, products(brands(creator_id))`)
      .eq('order_id', order.id);

    type OI = {
      markup: number;
      quantity: number;
      products: { brands: { creator_id: string } | null } | null;
    };

    for (const item of (items ?? []) as unknown as OI[]) {
      const creatorId = item.products?.brands?.creator_id;
      if (!creatorId) continue;
      const totalMarkup = Number(item.markup) * Number(item.quantity);
      const { netCreatorProfit } = calculatePricing(0, totalMarkup);
      await admin.rpc('apply_maintenance_offset', {
        p_creator_id: creatorId,
        p_credit_amount: netCreatorProfit,
      });
    }

    return NextResponse.json({ status: 'paid' });
  } catch (err) {
    console.error('verify-order error:', err);
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}