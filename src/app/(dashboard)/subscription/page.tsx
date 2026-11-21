// =====================================================================
// BRANSION — Subscription page.
// Shows 3 pricing cards. Also handles:
//   1. ?reference=X (return from Paystack) → verify, update tier, activate
//      any pending brand, show success.
//   2. ?pending_brand_id=Y → if user has tier, activate brand inline;
//      else show pricing cards (they need to pay).
// =====================================================================
import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { verifyTransaction } from '@/lib/paystack';
import { SubscriptionView } from '@/components/subscription/SubscriptionView';

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

  // Fetch profile with the new tier_paid_at for the referral logic
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, account_tier, tier_paid_at')
    .eq('id', user.id)
    .maybeSingle();
    
  const userTier = profile?.account_tier ?? profile?.tier ?? 'none';
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
          await admin
            .from('subscription_payments')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
            })
            .eq('id', sp.id);

          // Only set tier if this is an upgrade (never downgrade)
          if (TIER_RANK[sp.tier] >= TIER_RANK[userTier]) {
            await admin
              .from('profiles')
              .update({
                tier: sp.tier,
                account_tier: sp.tier,
                tier_paid_at: new Date().toISOString(),
              })
              .eq('id', user.id);
          }

          // Activate pending brand if provided
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
            // No specific brand — activate oldest pending if any
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

  // ── CASE 2: ?pending_brand_id=Y (user returned from brand form) ──
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
        // User has a tier — activate the brand now (no payment needed)
        await admin
          .from('brands')
          .update({
            is_active: true,
            published_at: new Date().toISOString(),
          })
          .eq('id', pending_brand_id);

        successMessage = 'Brand activated!';
      }
      // else: userTier === 'none' → fall through, show pricing cards
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