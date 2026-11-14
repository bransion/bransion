import { serviceRoleClient } from '@/lib/supabase/server';
import { formatNaira } from '@/lib/utils';
import { Share2, TrendingUp, Users } from 'lucide-react';
import { format } from 'date-fns';

export default async function AdminReferralsPage() {
  const admin = serviceRoleClient();

  const { data: contracts } = await admin
    .from('referral_contracts')
    .select(`
      id, locked_at, lifetime_split, initial_fee_paid,
      referrer:profiles!referral_contracts_referrer_id_fkey(id, email, full_name),
      referee:profiles!referral_contracts_referee_id_fkey(id, email, full_name)
    `)
    .order('locked_at', { ascending: false });

  // Get commissions totals
  const { data: commissions } = await admin
    .from('commissions_ledger')
    .select('referrer_id, commission_amount');

  const earningsMap = new Map<string, number>();
  for (const c of commissions ?? []) {
    earningsMap.set(c.referrer_id, (earningsMap.get(c.referrer_id) ?? 0) + Number(c.commission_amount));
  }

  const totalPaidOut = Array.from(earningsMap.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referral Network</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor all referral contracts and payouts across Bransion.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Users className="h-4 w-4" /> Total Contracts
          </div>
          <div className="text-2xl font-bold">{contracts?.length ?? 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" /> Total Commissions Paid
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatNaira(totalPaidOut)}</div>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Share2 className="h-4 w-4" /> Active Referrers
          </div>
          <div className="text-2xl font-bold">{earningsMap.size}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-3 px-4 text-left">Referrer</th>
              <th className="py-3 px-4 text-left">Referee</th>
              <th className="py-3 px-4 text-left">Split Locked</th>
              <th className="py-3 px-4 text-right">Ref Earnings</th>
              <th className="py-3 px-4 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {(!contracts || contracts.length === 0) ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">No referral contracts exist yet.</td>
              </tr>
            ) : (
              contracts.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4">
                    <div className="font-medium truncate">{c.referrer?.full_name || 'User'}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.referrer?.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium truncate">{c.referee?.full_name || 'User'}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.referee?.email}</div>
                  </td>
                  <td className="py-3 px-4 text-xs capitalize">{c.lifetime_split.replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-right font-medium text-green-600 dark:text-green-400">
                    {formatNaira(earningsMap.get(c.referrer?.id) ?? 0)}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {format(new Date(c.locked_at), 'MMM d, yyyy')}
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