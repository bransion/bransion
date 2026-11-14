// =====================================================================
// BRANSION — Full referrals page (server component).
// Left: ReferralCard. Right: referees list + commission history.
// =====================================================================
import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Users, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { ReferralCard } from '@/components/dashboard/ReferralCard';
import { getReferralStats } from '@/app/actions/referral';
import { formatNaira } from '@/lib/utils';

function maskEmail(email: string | null | undefined): string {
  if (!email) return 'user***@***';
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'user***@***';
  return `${local.slice(0, Math.min(4, local.length))}***@${domain}`;
}

export default async function ReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const stats = await getReferralStats();
  const admin = serviceRoleClient();

  // Referral contracts
  const { data: contracts } = await admin
    .from('referral_contracts')
    .select('id, referee_id, initial_fee_paid, lifetime_split, locked_at')
    .eq('referrer_id', user.id)
    .order('locked_at', { ascending: false });

  const refereeIds = (contracts ?? []).map((c) => c.referee_id);
  const refereesRes =
    refereeIds.length > 0
      ? await admin.from('profiles').select('id, email').in('id', refereeIds)
      : { data: [] as { id: string; email: string | null }[] };

  const emailMap = new Map<string, string | null>(
    (refereesRes.data ?? []).map((r) => [r.id, r.email])
  );

  // Commission history
  const { data: commissions } = await admin
    .from('commissions_ledger')
    .select('id, type, base_amount, commission_pct, commission_amount, created_at')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referrals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share Bransion and earn from every creator you bring in.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ReferralCard
            code={stats.code}
            referredCount={stats.referred_count}
            totalEarned={stats.total_earned}
            missedEarnings={stats.missed_earnings_if_premium}
            tier={stats.user_tier}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Referrals list */}
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="border-b p-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Your Referrals ({contracts?.length ?? 0})
              </h2>
            </div>
            <div className="p-4">
              {!contracts || contracts.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    No referrals yet. Share your code to get started.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {contracts.map((c) => (
                    <li
                      key={c.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="text-sm truncate">
                        {maskEmail(emailMap.get(c.referee_id))}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        Joined {format(new Date(c.locked_at), 'MMM d, yyyy')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Commission history */}
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="border-b p-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Commission History
              </h2>
            </div>
            <div className="p-4">
              {!commissions || commissions.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Receipt className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    No commissions yet. You&apos;ll see income here once your
                    referrals start buying or selling.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {commissions.map((c) => (
                    <li
                      key={c.id}
                      className="py-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs uppercase font-medium text-muted-foreground">
                          {c.type === 'initial_tier'
                            ? 'Initial tier'
                            : 'Lifetime sale'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(
                            new Date(c.created_at),
                            'MMM d, yyyy · h:mm a'
                          )}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                          +{formatNaira(Number(c.commission_amount))}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.commission_pct}% of{' '}
                          {formatNaira(Number(c.base_amount))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}