// =====================================================================
// BRANSION — Smart dashboard (Rule 1.8).
// Batch 2: added persistent Browse Store CTA + State-A secondary link.
// =====================================================================
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { connection } from 'next/server';
import {
  Sparkles,
  TrendingUp,
  Wallet,
  Crown,
  Layers,
  Clock,
  Bell,
  Share2,
  Calendar,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDashboardState } from '@/lib/dashboard-state';
import { formatNaira } from '@/lib/utils';

export default async function DashboardPage() {
  await connection();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'tier, role, account_tier, wallet_balance, pending_balance, lifetime_earnings, full_name, total_slots_used'
    )
    .eq('id', user.id)
    .maybeSingle();

  const { data: brands } = await supabase
    .from('brands')
    .select('id')
    .eq('creator_id', user.id);

  const brandIds = (brands ?? []).map((b) => b.id);
  const brandCount = brandIds.length;

  let pendingReviewsCount = 0;
  if (brandIds.length > 0) {
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .in('brand_id', brandIds)
      .eq('review_status', 'pending_review');
    pendingReviewsCount = count ?? 0;
  }

  const { count: unreadNotifCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false);

  const { data: commissions } = await supabase
    .from('commissions_ledger')
    .select('commission_amount')
    .eq('referrer_id', user.id);
  const lifetimeRefEarnings = (commissions ?? []).reduce(
    (sum, c) => sum + Number(c.commission_amount),
    0
  );

  const { data: unpaidInvoices } = await supabase
    .from('maintenance_invoices')
    .select('amount')
    .eq('creator_id', user.id)
    .eq('status', 'unpaid');
  const unpaidTotal = (unpaidInvoices ?? []).reduce(
    (s, i) => s + Number(i.amount),
    0
  );

  const { data: recentSales } = await supabase
    .from('wallet_transactions')
    .select('id, amount, description, created_at')
    .eq('creator_id', user.id)
    .eq('type', 'sale_credit')
    .order('created_at', { ascending: false })
    .limit(5);

  const tier = (profile?.account_tier ?? profile?.tier ?? 'none') as
    | 'none'
    | 'basic'
    | 'standard'
    | 'premium';

  const state = getDashboardState({ tier, brandCount });

  const nextChargeDate = new Date();
  nextChargeDate.setMonth(nextChargeDate.getMonth() + 1, 1);
  const nextChargeStr = nextChargeDate.toLocaleDateString('en-NG', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const monthlyFee =
    tier === 'basic' ? 1000
    : tier === 'standard' ? 2000
    : tier === 'premium' ? 3000
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* ── Header row with Browse Store CTA ─────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome
            {profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {state === 'A' && "Let's get your brand started."}
            {state === 'B' && 'Grow your brand to the next level.'}
            {state === 'C' && 'Premium creator dashboard.'}
          </p>
        </div>
        <Link href="/store">
          <Button variant="outline" size="sm">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Browse Store
          </Button>
        </Link>
      </div>

      {/* ── U10 TOP KPI ROW ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKPI
          label="Slots Used"
          value={`${profile?.total_slots_used ?? 0}`}
          icon={<Layers className="h-4 w-4" />}
        />
        <MiniKPI
          label="Pending Reviews"
          value={`${pendingReviewsCount}`}
          icon={<Clock className="h-4 w-4" />}
        />
        <MiniKPI
          label="Unread Notifs"
          value={`${unreadNotifCount ?? 0}`}
          icon={<Bell className="h-4 w-4" />}
        />
        <MiniKPI
          label="Ref Earnings"
          value={formatNaira(lifetimeRefEarnings)}
          icon={<Share2 className="h-4 w-4" />}
        />
      </div>

      {/* ── STATE-SPECIFIC BANNER ────────────────────────────────── */}
      {state === 'A' && (
        <div className="rounded-lg border-2 border-[#0B0B0F] bg-gradient-to-r from-[#0B0B0F]/5 to-transparent p-6 dark:border-white dark:from-white/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Sparkles className="h-6 w-6 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                Create your own Brand and Start Earning
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a design, pick an apparel, set your markup. Keep 70% of
                every sale.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <Link href="/brands/new" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">Create a Brand</Button>
              </Link>
              <Link
                href="/store"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline text-center sm:text-right"
              >
                Or just browse the store →
              </Link>
            </div>
          </div>
        </div>
      )}

      {state === 'B' && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Crown className="h-6 w-6 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Upgrade your brand Now</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Premium gives you unlimited brand slots and priority support.
              </p>
            </div>
            <Link href="/subscription">
              <Button>Upgrade</Button>
            </Link>
          </div>
        </div>
      )}

      {(state === 'B' || state === 'C') && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Monthly maintenance fee:{' '}
              <span className="font-medium text-foreground">
                {formatNaira(monthlyFee)}
              </span>{' '}
              — Next charge: {nextChargeStr}.{' '}
              {unpaidTotal > 0 ? (
                <>
                  Unpaid balance:{' '}
                  <span className="font-medium text-destructive">
                    {formatNaira(unpaidTotal)}
                  </span>
                </>
              ) : (
                <span>All settled.</span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Available Balance"
          value={formatNaira(profile?.wallet_balance ?? 0)}
          icon={<Wallet className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          label="Lifetime Earnings"
          value={formatNaira(profile?.lifetime_earnings ?? 0)}
          icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          label="Brand Slots"
          value={
            tier === 'premium'
              ? `${profile?.total_slots_used ?? 0} / Unlimited`
              : tier === 'basic'
                ? `${profile?.total_slots_used ?? 0} / 1`
                : tier === 'standard'
                  ? `${profile?.total_slots_used ?? 0} / 5`
                  : `${profile?.total_slots_used ?? 0} / 0`
          }
          icon={<Sparkles className="h-5 w-5 text-muted-foreground" />}
        />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold">Recent Sales</h2>
        </div>
        <div className="p-4">
          {!recentSales || recentSales.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No sales yet. Publish your first product to get started.
            </p>
          ) : (
            <ul className="divide-y">
              {recentSales.map((s) => (
                <li key={s.id} className="flex justify-between py-2 text-sm">
                  <span className="text-muted-foreground">
                    {s.description ?? 'Sale'}
                  </span>
                  <span className="font-medium">+{formatNaira(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniKPI({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}