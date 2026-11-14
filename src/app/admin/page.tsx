import { serviceRoleClient } from '@/lib/supabase/server';
import { formatNaira } from '@/lib/utils';
import { DollarSign, Users, AlertCircle, ShoppingBag, ArrowRight, Activity, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default async function AdminDashboard() {
  const admin = serviceRoleClient();

  // KPIs
  const { data: paidOrders } = await admin.from('orders').select('total_amount').eq('status', 'paid');
  const totalRevenue = (paidOrders ?? []).reduce((s, o) => s + Number(o.total_amount), 0);

  const { count: activeCreators } = await admin.from('profiles').select('id', { count: 'exact', head: true }).neq('tier', 'none');

  const { data: unpaid } = await admin.from('maintenance_invoices').select('amount').eq('status', 'unpaid');
  const unpaidTotal = (unpaid ?? []).reduce((s, i) => s + Number(i.amount), 0);

  const { count: pendingReviews } = await admin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending_review');
  const { count: pendingWithdrawals } = await admin.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending');

  // Recent Activity (Audit Logs)
  const { data: recentLogs } = await admin
    .from('admin_audit_logs')
    .select('id, action, target_table, created_at, admin:profiles!admin_audit_logs_admin_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor Bransion's health and manage daily operations.</p>
      </div>

      {/* Critical Alerts / Actionable Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/fulfillment" className="block group">
          <div className="rounded-lg border bg-card p-5 shadow-sm group-hover:border-amber-500/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Pending Reviews</span>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold">{pendingReviews ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Products waiting for synthesis</p>
          </div>
        </Link>

        <Link href="/admin/finances" className="block group">
          <div className="rounded-lg border bg-card p-5 shadow-sm group-hover:border-destructive/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-destructive">Pending Withdrawals</span>
              <DollarSign className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-2xl font-bold">{pendingWithdrawals ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Creator payout requests</p>
          </div>
        </Link>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{formatNaira(totalRevenue)}</div>
          <p className="text-xs text-muted-foreground mt-1">Lifetime paid orders</p>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Unpaid Maint.</span>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{formatNaira(unpaidTotal)}</div>
          <p className="text-xs text-muted-foreground mt-1">Outstanding creator fees</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Links */}
        <div className="md:col-span-1 space-y-4">
          <h2 className="font-semibold text-lg">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/admin/inventory">
              <Button variant="outline" className="w-full justify-between h-12">
                Manage Inventory <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/catalog">
              <Button variant="outline" className="w-full justify-between h-12">
                Catalog Governance <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/communications">
              <Button variant="outline" className="w-full justify-between h-12">
                Send Broadcast <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/referrals">
              <Button variant="outline" className="w-full justify-between h-12">
                Referral Network <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" /> Recent Admin Activity
          </h2>
          <div className="rounded-lg border bg-card">
            {(!recentLogs || recentLogs.length === 0) ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No recent activity logged.</p>
            ) : (
              <div className="divide-y">
                {recentLogs.map((log: any) => (
                  <div key={log.id} className="p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{log.admin?.full_name || log.admin?.email || 'System'}</span> performed <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{log.action}</span> on {log.target_table}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}