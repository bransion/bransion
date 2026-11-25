// =====================================================================
// BRANSION — Checkout success page (V3).
// Uses finalizeOrder() for BOTH 70% creator credit AND referral commissions.
// This makes referral 2%/5% fire even on localhost (where webhooks miss).
// =====================================================================
import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, XCircle, ShoppingBag, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyTransaction } from '@/lib/paystack';
import { finalizeOrder } from '@/lib/paystack/finalize-order';
import { formatNaira } from '@/lib/utils';
import { PendingPaymentPoller } from '@/components/checkout/PendingPaymentPoller';

interface PageProps {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}

export default async function SuccessPage({ searchParams }: PageProps) {
  const { reference } = await searchParams;
  if (!reference) redirect('/store');

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect(`/sign-in?next=/checkout/success?reference=${reference}`);

  const admin = serviceRoleClient();
  let order = await fetchOrder(reference);

  if (!order || order.buyer_id !== user.id) {
    redirect('/store');
  }

  // ── BACKUP VERIFY (works on localhost) ──────────────────────────
  if (order && order.status === 'pending_payment') {
    try {
      const verify = await verifyTransaction(reference);
      if (
        verify.status === 'success' &&
        verify.amount >= order.total_amount * 100
      ) {
        await finalizeOrder(order.id, admin);
        order = await fetchOrder(reference);
      }
    } catch (err) {
      console.warn('Backup verify failed:', err);
    }
  }

  // ── If order is paid but referral commissions may be missing ────
  // (e.g. webhook fired first, but success page loaded after)
  if (order && (order.status === 'paid' || order.paid_at)) {
    try {
      await finalizeOrder(order.id, admin);
    } catch (err) {
      console.warn('Late finalize failed:', err);
    }
  }

  const paid = order?.status === 'paid';
  const pending = order?.status === 'pending_payment';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border bg-card p-8 text-center space-y-4">
        {paid && (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold">Payment successful</h1>
            <p className="text-sm text-muted-foreground">
              Your order has been received. You&apos;ll be contacted on the
              phone number you provided for delivery updates.
            </p>
          </>
        )}

        {pending && (
          <>
            <Clock className="mx-auto h-16 w-16 text-amber-500 animate-pulse" />
            <h1 className="text-2xl font-bold">Confirming payment…</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;re waiting for Paystack to confirm your payment.
            </p>
            <PendingPaymentPoller reference={reference} />
          </>
        )}

        {!paid && !pending && (
          <>
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold">Payment not completed</h1>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t confirm this payment. If you were charged,
              contact support with your reference: <code>{reference}</code>
            </p>
          </>
        )}

        {order && (
          <div className="rounded-md bg-muted/50 p-4 text-left text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs">{order.payment_reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">
                {formatNaira(order.total_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-semibold capitalize">
                {order.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        )}

        {paid && (
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/checkout">
              <Button className="w-full">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Continue Shopping
              </Button>
            </Link>
            <Link href="/store">
              <Button variant="outline" className="w-full">
                <Store className="mr-2 h-4 w-4" />
                Go to Store
              </Button>
            </Link>
          </div>
        )}

        {!paid && !pending && (
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
            <Link href="/store">
              <Button variant="outline" className="w-full">
                Back to Store
              </Button>
            </Link>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Need help? Message us on WhatsApp with your reference.
        </p>
      </div>
    </div>
  );
}

async function fetchOrder(reference: string) {
  const admin = serviceRoleClient();
  const { data } = await admin
    .from('orders')
    .select(
      'id, buyer_id, status, total_amount, payment_reference, paid_at'
    )
    .eq('payment_reference', reference)
    .maybeSingle();
  return data;
}