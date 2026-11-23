// =====================================================================
// BRANSION — Checkout success page (V3).
// - Verifies payment via Paystack (backup if webhook missed).
// - Credits creator wallet (via apply_maintenance_offset).
// - Shows "Continue Shopping" and "Buy More" buttons.
// =====================================================================
import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, XCircle, ShoppingBag, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyTransaction } from '@/lib/paystack';
import { formatNaira } from '@/lib/utils';
import { calculatePricing } from '@/lib/pricing';
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

  // ── BACKUP VERIFY (Layer 4 — works on localhost) ─────────────────
  if (order && order.status === 'pending_payment') {
    try {
      const verify = await verifyTransaction(reference);
      if (
        verify.status === 'success' &&
        verify.amount >= order.total_amount * 100
      ) {
        await admin
          .from('orders')
          .update({
            status: 'paid',
            paid_at: verify.paidAt ?? new Date().toISOString(),
          })
          .eq('id', order.id)
          .eq('status', 'pending_payment');

        // Credit each creator in this order
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

        order = await fetchOrder(reference);
      }
    } catch (err) {
      console.warn('Backup verify failed:', err);
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

        {/* TWO BUTTONS: Continue Shopping + Buy More */}
        {paid && (
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/store">
              <Button className="w-full">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Continue Shopping
              </Button>
            </Link>
            <Link href="/checkout">
              <Button variant="outline" className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Buy More
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