// =====================================================================
// BRANSION — Admin orders list.
// Filter by status. Mark paid orders as fulfilled.
// =====================================================================
import { serviceRoleClient } from '@/lib/supabase/server';
import { formatNaira } from '@/lib/utils';
import { Download } from 'lucide-react';
import { AdminActionButton } from '@/components/admin/AdminActionButton';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Paid', value: 'paid' },
  { label: 'Fulfilled', value: 'fulfilled' },
  { label: 'Pending payment', value: 'pending_payment' },
] as const;

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const admin = serviceRoleClient();

  let query = admin
    .from('orders')
    .select(
      `id, status, total_amount, delivery_fee, created_at, paid_at,
       payment_reference, shipping_full_name, shipping_state, shipping_lga,
       profiles!orders_buyer_id_fkey(email)`
    )
    .order('created_at', { ascending: false })
    .limit(300);

  if (status) query = query.eq('status', status);

  const { data: orders } = await query;

  type Row = {
    id: string;
    status: string;
    total_amount: number;
    delivery_fee: number;
    created_at: string;
    paid_at: string | null;
    payment_reference: string | null;
    shipping_full_name: string;
    shipping_state: string;
    shipping_lga: string;
    profiles: { email: string } | null;
  };
  const list = (orders ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track orders and mark them fulfilled after shipping.
          </p>
        </div>
        
        {/* Client Component for CSV Export */}
        <a 
          href={`data:text/csv;charset=utf-8,Reference,Buyer,Amount,Status,Date\n${(list || []).map(o => `"${o.payment_reference}","${o.shipping_full_name}",${o.total_amount},"${o.status}","${o.created_at}"`).join('\n')}`}
          download="bransion-orders.csv"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border bg-background hover:bg-muted h-9 px-4 py-2"
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </a>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <Link
            key={f.value || 'all'}
            href={f.value ? `/admin/orders?status=${f.value}` : '/admin/orders'}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              (status ?? '') === f.value
                ? 'bg-[#0B0B0F] text-white border-[#0B0B0F] dark:bg-white dark:text-[#0B0B0F] dark:border-white'
                : 'bg-background hover:bg-muted'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-3 px-4 text-left">Order</th>
              <th className="py-3 px-4 text-left">Buyer</th>
              <th className="py-3 px-4 text-left">Ship to</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            ) : (
              list.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4">
                    <div className="font-mono text-[11px] text-muted-foreground truncate">
                      {o.id.slice(0, 8)}…
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {format(new Date(o.created_at), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <div className="truncate">{o.shipping_full_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {o.profiles?.email ?? ''}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {o.shipping_lga}, {o.shipping_state}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {formatNaira(Number(o.total_amount))}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                        o.status === 'paid'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                          : o.status === 'fulfilled'
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                            : o.status === 'pending_payment'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                                    <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/orders/${o.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                      {o.status === 'paid' && (
                        <AdminActionButton
                          action="order.fulfill"
                          payload={{ orderId: o.id }}
                          label="Mark fulfilled"
                          confirmMessage={`Mark order ${o.id.slice(0, 8)} as fulfilled? This is irreversible.`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}