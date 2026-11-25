// =====================================================================
// BRANSION — Order verification endpoint (idempotent).
// Called by the success page poller every 2 seconds while pending.
// Also credits referral commissions (this is what makes testing work
// on localhost, where Paystack webhooks cannot reach).
// =====================================================================
import { NextResponse } from 'next/server';
import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { verifyTransaction } from '@/lib/paystack';
import { finalizeOrder } from '@/lib/paystack/finalize-order';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');
    if (!reference) {
      return NextResponse.json({ status: 'error', message: 'No reference' });
    }

    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'Not signed in' },
        { status: 401 }
      );
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

    if (order.status === 'paid' || order.paid_at) {
      // Order already paid — still call finalizeOrder (idempotent)
      // so any missed referral commissions get credited on this call.
      await finalizeOrder(order.id, admin);
      return NextResponse.json({ status: 'paid' });
    }

    if (order.status !== 'pending_payment') {
      return NextResponse.json({ status: order.status });
    }

    const verify = await verifyTransaction(reference);

    if (verify.status !== 'success') {
      return NextResponse.json({
        status: 'pending',
        paystack_status: verify.status,
      });
    }

    if (verify.amount < order.total_amount * 100) {
      return NextResponse.json({
        status: 'pending',
        message: 'Amount mismatch',
      });
    }

    const result = await finalizeOrder(order.id, admin);

    if (!result.ok) {
      return NextResponse.json(
        { status: 'error', message: result.reason },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'paid' });
  } catch (err) {
    console.error('verify-order error:', err);
    return NextResponse.json(
      {
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed',
      },
      { status: 500 }
    );
  }
}