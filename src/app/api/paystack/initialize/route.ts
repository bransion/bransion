// =====================================================================
// BRANSION — Paystack transaction initializer (tier purchases).
// Updated for V3 Referral logic.
// =====================================================================
import { NextResponse } from 'next/server';
import { serviceRoleClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth-helpers';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { requireServerEnv } from '@/lib/env';
import { initializeTransaction } from '@/lib/paystack';
import { tierSchema } from '@/lib/validations';
import { TIER_PRICES } from '../../../../../types';
import { z } from 'zod';

const inputSchema = z.object({
  purpose: z.literal('tier'),
  tier: tierSchema.shape.tier,
  pending_brand_id: z.string().uuid().nullable().optional(),
  referral_code: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  // ── 0) RATE LIMIT ──────────────────────────────────────────────────
  const rl = checkRateLimit(req, {
    keyPrefix: 'paystack:initialize',
    windowMs: 60_000,
    max: 5,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    // ── 1) AUTH ─────────────────────────────────────────────────────
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    const { user } = session;

    // ── 2) VALIDATE ─────────────────────────────────────────────────
    const body = (await req.json()) as Record<string, unknown>;

    if (body.purpose === 'order') {
      return NextResponse.json(
        { error: 'Use /api/orders/checkout for order payments.' },
        { status: 400 }
      );
    }

    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const { tier, pending_brand_id, referral_code } = parsed.data;

    // ── 3) Admin client for secure operations ───────────────────────
    const admin = serviceRoleClient();

    // ── 4) REFERRAL LOGIC (First purchase only) ─────────────────────
    if (referral_code) {
      const { data: currentUser } = await admin
        .from('profiles')
        .select('referred_by, tier_paid_at')
        .eq('id', user.id)
        .single();

      // Only allow referral if they have NEVER paid before AND have no referrer
      const isFirstPurchase =
        currentUser && !currentUser.tier_paid_at && !currentUser.referred_by;

      if (isFirstPurchase) {
        const { data: referrer } = await admin
          .from('profiles')
          .select('id')
          .eq('referral_code', referral_code)
          .maybeSingle();

        if (referrer && referrer.id !== user.id) {
          await admin
            .from('profiles')
            .update({ referred_by: referrer.id })
            .eq('id', user.id);
        }
      }
    }

    // ── 5) Verify pending brand belongs to user ─────────────────────
    if (pending_brand_id) {
      const { data: brand } = await admin
        .from('brands')
        .select('id, creator_id, is_active')
        .eq('id', pending_brand_id)
        .maybeSingle();

      if (!brand || brand.creator_id !== user.id) {
        return NextResponse.json(
          { error: 'Pending brand not found' },
          { status: 400 }
        );
      }
    }

    // ── 6) Create subscription payment record ───────────────────────
    const amountNgn = TIER_PRICES[tier];
    const reference = crypto.randomUUID();
    const env = requireServerEnv();

    const { data: sp, error: spErr } = await admin
      .from('subscription_payments')
      .insert({
        creator_id: user.id,
        tier,
        amount: amountNgn,
        payment_reference: reference,
        status: 'pending',
      })
      .select('id')
      .single();

    if (spErr || !sp) {
      console.error('subscription_payments insert error:', spErr);
      return NextResponse.json(
        { error: 'Failed to start subscription' },
        { status: 500 }
      );
    }

    // ── 7) Initialize Paystack ──────────────────────────────────────
    const callbackUrl = pending_brand_id
      ? `${env.NEXT_PUBLIC_SITE_URL}/subscription?pending_brand_id=${pending_brand_id}`
      : `${env.NEXT_PUBLIC_SITE_URL}/subscription`;

    const init = await initializeTransaction({
      email: user.email,
      amountKobo: amountNgn * 100,
      reference,
      callbackUrl,
      metadata: {
        purpose: 'tier',
        tier,
        user_id: user.id,
        pending_brand_id: pending_brand_id ?? null,
        subscription_payment_id: sp.id,
      },
    });

    return NextResponse.json({
      authorization_url: init.authorization_url,
      reference,
    });
  } catch (err) {
    console.error('Tier initialize error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Initialize failed' },
      { status: 500 }
    );
  }
}