// =====================================================================
// BRANSION — Subscription page.
// Uses `tier` as source of truth (account_tier kept in sync).
// Includes manual referral contract creation as backup.
// =====================================================================
import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { verifyTransaction } from '@/lib/paystack';
import { SubscriptionView } from '@/components/subscription/SubscriptionView';
import { roundMoney } from '@/lib/pricing';

interface PageProps {
  searchParams: Promise<{
    reference?: string;
    pending_brand_id?: string;
  }>;
}

const TIER_RANK: Record<string, number> = {
  none: 0,
  basic: 1,
  standard: 2,
  premium: 3,
};

export default async function SubscriptionPage({ searchParams }: PageProps) {
  const { reference, pending_brand_id } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, account_tier, tier_paid_at')
    .eq('id', user.id)
    .maybeSingle();

  // ── Source of truth is `tier` (not account_tier) ────────────────
  const userTier = profile?.tier ?? 'none';
  const isFirstPurchase = !profile?.tier_paid_at;

  let successMessage: string | null = null;
  let errorMessage: string | null = null;

  // ── CASE 1: Return from Paystack (?reference=X) ──────────────────
  if (reference) {
    try {
      const admin = serviceRoleClient();

      const { data: sp } = await admin
        .from('subscription_payments')
        .select('id, creator_id, tier, amount, status')
        .eq('payment_reference', reference)
        .maybeSingle();

      if (!sp || sp.creator_id !== user.id) {
        errorMessage = 'Payment not found.';
      } else if (sp.status === 'paid') {
        successMessage = `Your ${sp.tier} tier is active.`;
      } else {
        const verify = await verifyTransaction(reference);
        if (verify.status !== 'success') {
          errorMessage = `Payment not confirmed (${verify.status}).`;
        } else if (verify.amount < Number(sp.amount) * 100) {
          errorMessage = 'Payment amount does not match.';
        } else {
          // 1. Mark subscription_payments as paid (fires DB trigger)
          await admin
            .from('subscription_payments')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
            })
            .eq('id', sp.id);

          // 2. Update profile — sync BOTH tier and account_tier
          if (TIER_RANK[sp.tier] >= TIER_RANK[userTier]) {
            await admin
              .from('profiles')
              .update({
                tier: sp.tier,
                account_tier: sp.tier as 'basic' | 'standard' | 'premium',
                tier_paid_at: new Date().toISOString(),
              })
              .eq('id', user.id);
          }

          // 3. BACKUP: ensure referral contract exists (in case trigger missed)
          await ensureReferralContract(
            admin,
            user.id,
            Number(sp.amount),
            sp.id
          );

          // 4. Activate pending brand if applicable
          if (pending_brand_id) {
            await admin
              .from('brands')
              .update({
                is_active: true,
                published_at: new Date().toISOString(),
              })
              .eq('id', pending_brand_id)
              .eq('creator_id', user.id)
              .eq('is_active', false);
          } else {
            const { data: oldest } = await admin
              .from('brands')
              .select('id')
              .eq('creator_id', user.id)
              .eq('is_active', false)
              .order('created_at')
              .limit(1)
              .maybeSingle();
            if (oldest) {
              await admin
                .from('brands')
                .update({
                  is_active: true,
                  published_at: new Date().toISOString(),
                })
                .eq('id', oldest.id);
            }
          }

          successMessage = `Payment confirmed. Your ${sp.tier} tier is now active.`;
        }
      }
    } catch (err) {
      console.error('Verify error:', err);
      errorMessage = 'Could not verify payment. Contact support.';
    }
  }

  // ── CASE 2: ?pending_brand_id=Y (returned from brand form) ──────
  if (pending_brand_id && !reference) {
    try {
      const admin = serviceRoleClient();
      const { data: brand } = await admin
        .from('brands')
        .select('id, creator_id, is_active')
        .eq('id', pending_brand_id)
        .maybeSingle();

      if (!brand || brand.creator_id !== user.id) {
        errorMessage = 'Pending brand not found.';
      } else if (brand.is_active) {
        successMessage = 'Your brand is already active.';
      } else if (userTier !== 'none') {
        await admin
          .from('brands')
          .update({
            is_active: true,
            published_at: new Date().toISOString(),
          })
          .eq('id', pending_brand_id);

        successMessage = 'Brand activated!';
      }
    } catch (err) {
      console.error('Pending brand check error:', err);
      errorMessage = 'Could not load your brand.';
    }
  }

  return (
    <SubscriptionView
      userTier={userTier}
      successMessage={successMessage}
      errorMessage={errorMessage}
      pendingBrandId={pending_brand_id}
      isFirstPurchase={isFirstPurchase}
    />
  );
}

// =====================================================================
// Manual referral contract creation (backup for DB trigger)
// Idempotent — returns early if contract already exists.
// =====================================================================
async function ensureReferralContract(
  admin: ReturnType<typeof serviceRoleClient>,
  refereeId: string,
  amountPaid: number,
  subscriptionPaymentId: string
) {
  // Does referee have a referrer?
  const { data: referee } = await admin
    .from('profiles')
    .select('referred_by')
    .eq('id', refereeId)
    .maybeSingle();

  if (!referee?.referred_by) return;

  // Contract already exists? (created by DB trigger)
  const { data: existing } = await admin
    .from('referral_contracts')
    .select('id')
    .eq('referee_id', refereeId)
    .maybeSingle();

  if (existing) return;

  // Fetch referrer's tier for split lock
  const { data: referrer } = await admin
    .from('profiles')
    .select('account_tier, tier')
    .eq('id', referee.referred_by)
    .single();

  if (!referrer) return;

  const referrerTier =
    (referrer.account_tier ?? referrer.tier ?? 'basic') as
      | 'basic'
      | 'standard'
      | 'premium';

  const lifetimeSplit =
    referrerTier === 'premium'
      ? ('five_percent' as const)
      : referrerTier === 'standard'
        ? ('two_percent' as const)
        : ('none' as const);

  // 10% of the tier payment
  const commission = roundMoney(amountPaid * 0.1);

  // Create contract
  await admin.from('referral_contracts').insert({
    referrer_id: referee.referred_by,
    referee_id: refereeId,
    initial_fee_paid: amountPaid,
    initial_commission_pct: 10.0,
    lifetime_split: lifetimeSplit,
    referrer_tier_at_lock: referrerTier,
  });

  // Credit referrer wallet
  const { data: refProfile } = await admin
    .from('profiles')
    .select('wallet_balance, lifetime_earnings')
    .eq('id', referee.referred_by)
    .single();

  const newBalance = roundMoney(
    Number(refProfile?.wallet_balance ?? 0) + commission
  );
  const newEarnings = roundMoney(
    Number(refProfile?.lifetime_earnings ?? 0) + commission
  );

  await admin
    .from('profiles')
    .update({
      wallet_balance: newBalance,
      lifetime_earnings: newEarnings,
    })
    .eq('id', referee.referred_by);

  await admin.from('wallet_transactions').insert({
    creator_id: referee.referred_by,
    type: 'sale_credit',
    amount: commission,
    balance_after: newBalance,
    description: 'Referral commission: initial tier payment',
    reference: `ref_${subscriptionPaymentId}`,
  });

  await admin.from('commissions_ledger').insert({
    referrer_id: referee.referred_by,
    referee_id: refereeId,
    type: 'initial_tier',
    base_amount: amountPaid,
    commission_pct: 10.0,
    commission_amount: commission,
    source_fee_amount: amountPaid,
  });
}