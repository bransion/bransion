// =====================================================================
// BRANSION — Wallet page.
// Shows balances, ledger, and withdraw form.
// Withdrawable = wallet_balance - unpaid_invoices - pending_withdrawals.
// =====================================================================
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { WalletCard } from '@/components/dashboard/WalletCard';
import { WithdrawForm } from '@/components/dashboard/WithdrawForm';
import { formatNaira } from '@/lib/utils';
import { format } from 'date-fns';

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance, pending_balance, lifetime_earnings')
    .eq('id', user.id)
    .maybeSingle();

  const { data: unpaidInvoices } = await supabase
    .from('maintenance_invoices')
    .select('amount')
    .eq('creator_id', user.id)
    .eq('status', 'unpaid');
  const unpaidTotal = (unpaidInvoices ?? []).reduce(
    (s, i) => s + Number(i.amount),
    0
  );

  const { data: pendingWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select('amount')
    .eq('creator_id', user.id)
    .eq('status', 'pending');
  const pendingWithdrawalsTotal = (pendingWithdrawals ?? []).reduce(
    (s, i) => s + Number(i.amount),
    0
  );

  const { data: ledger } = await supabase
    .from('wallet_transactions')
    .select('id, type, amount, description, created_at, balance_after')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const available = Number(profile?.wallet_balance ?? 0);
  const pending = Number(profile?.pending_balance ?? 0);
  const lifetime = Number(profile?.lifetime_earnings ?? 0);
  const withdrawable = Math.max(
    0,
    available - unpaidTotal - pendingWithdrawalsTotal
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your earnings and withdrawal history.
        </p>
      </div>

      <WalletCard
        available={available}
        pending={pending}
        lifetime={lifetime}
        withdrawable={withdrawable}
      />

      {unpaidTotal > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">
            Unpaid maintenance fees: {formatNaira(unpaidTotal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This amount is excluded from your withdrawable balance.
          </p>
        </div>
      )}

      <div id="withdraw-section">
        <WithdrawForm withdrawable={withdrawable} />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Transaction history</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Last 50 transactions
          </p>
        </div>
        <div className="p-4">
            {!ledger || ledger.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                No transactions yet. Your sale credits and withdrawals will appear
                here.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {ledger.map((tx) => {
                const amount = Number(tx.amount);
                const isCredit = amount > 0;
                return (
                  <li
                    key={tx.id}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-xs uppercase font-medium text-muted-foreground">
                        {tx.type.replace('_', ' ')}
                      </span>
                      <p className="text-sm truncate mt-0.5">
                        {tx.description ?? '—'}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {format(new Date(tx.created_at), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div
                        className={`text-sm font-semibold ${
                          isCredit
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-destructive'
                        }`}
                      >
                        {isCredit ? '+' : ''}
                        {formatNaira(amount)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Bal: {formatNaira(Number(tx.balance_after))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}