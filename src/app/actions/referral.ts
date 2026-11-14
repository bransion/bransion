// =====================================================================
// BRANSION — Referral server actions.
// 'use server' → all exports are async server functions.
// Uses service role for cross-user reads (mask before display).
// =====================================================================
'use server';

import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { attachReferralToProfile as attachImpl } from '@/lib/referral/attach';

/**
 * Attach a referral code to the currently signed-in user.
 * Delegates to lib/referral/attach.ts — this wrapper only resolves
 * the session user; the business logic lives in one place.
 */
export async function attachReferralToProfile(code: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: 'no_code' as const };
  return attachImpl(user.id, code);
}

export interface ReferralStats {
  code: string | null;
  referred_count: number;
  total_earned: number;
  missed_earnings_if_premium: number;
  user_tier: 'basic' | 'standard' | 'premium';
}

/**
 * Aggregate stats for the current user's referral activity.
 */
export async function getReferralStats(): Promise<ReferralStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      code: null,
      referred_count: 0,
      total_earned: 0,
      missed_earnings_if_premium: 0,
      user_tier: 'basic',
    };
  }

  const admin = serviceRoleClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('referral_code, account_tier')
    .eq('id', user.id)
    .maybeSingle();

  const tier = (profile?.account_tier ?? 'basic') as
    | 'basic'
    | 'standard'
    | 'premium';

  const { count: referredCount } = await admin
    .from('referral_contracts')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', user.id);

  const { data: commissions } = await admin
    .from('commissions_ledger')
    .select('commission_amount')
    .eq('referrer_id', user.id);

  const totalEarned = (commissions ?? []).reduce(
    (s, c) => s + Number(c.commission_amount),
    0
  );

  const missed = await computeMissedLifetimeEarnings(user.id, tier);

  return {
    code: profile?.referral_code ?? null,
    referred_count: referredCount ?? 0,
    total_earned: Math.round(totalEarned * 100) / 100,
    missed_earnings_if_premium: missed,
    user_tier: tier,
  };
}

/**
 * INTERNAL — not exported.
 * For basic: delta is 5% (they earn 0% on lifetime sales).
 * For standard: delta is 3% (they earn 2%, premium earns 5%).
 * For premium: returns 0 (they already earn max).
 *
 * Base amounts come from lifetime_sale commissions already recorded.
 * If no lifetime sales yet → 0 (nothing to miss).
 */
async function computeMissedLifetimeEarnings(
  userId: string,
  tier: 'basic' | 'standard' | 'premium'
): Promise<number> {
  if (tier === 'premium') return 0;

  const admin = serviceRoleClient();
  const { data: lifetimeCommissions } = await admin
    .from('commissions_ledger')
    .select('base_amount')
    .eq('referrer_id', userId)
    .eq('type', 'lifetime_sale');

  const totalMarkupBase = (lifetimeCommissions ?? []).reduce(
    (s, c) => s + Number(c.base_amount),
    0
  );
  if (totalMarkupBase === 0) return 0;

  const currentRate = tier === 'standard' ? 0.02 : 0;
  const delta = 0.05 - currentRate;
  return Math.round(totalMarkupBase * delta * 100) / 100;
}