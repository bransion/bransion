// =====================================================================
// BRANSION — Monthly maintenance cron.
// Vercel Cron calls this on the 1st of each month at midnight UTC.
// Protected by Authorization: Bearer <CRON_SECRET> header.
//
// Flow per creator with at least one brand:
//   1. Create a maintenance_invoice for the current billing month
//      (idempotent — skips if already exists).
//   2. Attempt atomic auto-deduction from wallet via
//      apply_maintenance_from_wallet() (FOR UPDATE-locked).
//   3. If wallet balance insufficient, invoice stays unpaid and rolls
//      over to next month's batch (nothing else needed — unpaid invoices
//      are already picked up by sale credits via apply_maintenance_offset).
//
// Safe to re-run: never creates duplicate invoices, never double-debits.
// =====================================================================
import { NextResponse } from 'next/server';
import { serviceRoleClient } from '@/lib/supabase/server';
import { requireServerEnv } from '@/lib/env';
import { TIER_MONTHLY_FEES } from '../../../../../types';

export const maxDuration = 60; // Vercel: allow up to 60s

export async function GET(req: Request) {
  // ── 1) Auth ─────────────────────────────────────────────────────────
  const env = requireServerEnv();
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2) Compute billing month ────────────────────────────────────────
  const now = new Date();
  const billingMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}-01`;

  const admin = serviceRoleClient();

  // ── 3) Find eligible creators ───────────────────────────────────────
  // Eligibility: has >= 1 brand AND tier != 'none'
  const { data: brandRows } = await admin
    .from('brands')
    .select('creator_id');

  const uniqueCreatorIds = Array.from(
    new Set((brandRows ?? []).map((b) => b.creator_id))
  );

  if (uniqueCreatorIds.length === 0) {
    return NextResponse.json({
      billing_month: billingMonth,
      creators: 0,
      created: 0,
      paid: 0,
      skipped: 0,
      results: [],
    });
  }

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, tier')
    .in('id', uniqueCreatorIds)
    .neq('tier', 'none');

  const creators = (profiles ?? []) as Array<{
    id: string;
    tier: 'basic' | 'standard' | 'premium';
  }>;

  // ── 4) Process each creator ─────────────────────────────────────────
  let created = 0;
  let paid = 0;
  let skipped = 0;
  const results: Array<{
    creator_id: string;
    invoice_id: string;
    paid: boolean;
    reason?: string;
  }> = [];

  for (const creator of creators) {
    const monthlyFee = TIER_MONTHLY_FEES[creator.tier];
    if (!monthlyFee) continue;

    // 4a. Ensure invoice exists for this month (idempotent)
    const { data: existing } = await admin
      .from('maintenance_invoices')
      .select('id, status')
      .eq('creator_id', creator.id)
      .eq('billing_month', billingMonth)
      .maybeSingle();

    let invoiceId = existing?.id;
    if (!invoiceId) {
      const { data: newInv, error: createErr } = await admin
        .from('maintenance_invoices')
        .insert({
          creator_id: creator.id,
          tier: creator.tier,
          amount: monthlyFee,
          billing_month: billingMonth,
          status: 'unpaid',
        })
        .select('id')
        .single();

      if (createErr || !newInv) {
        console.error(
          'Cron: invoice creation failed',
          creator.id,
          createErr
        );
        results.push({
          creator_id: creator.id,
          invoice_id: '',
          paid: false,
          reason: 'invoice_create_failed',
        });
        continue;
      }
      invoiceId = newInv.id;
      created++;
    }

    // 4b. Attempt atomic auto-deduction
    const { data: wasPaid, error: rpcErr } = await admin.rpc(
      'apply_maintenance_from_wallet',
      {
        p_creator_id: creator.id,
        p_invoice_id: invoiceId,
      }
    );

    if (rpcErr) {
      console.error('Cron: rpc failed', creator.id, rpcErr);
      results.push({
        creator_id: creator.id,
        invoice_id: invoiceId,
        paid: false,
        reason: 'rpc_failed',
      });
      skipped++;
      continue;
    }

    if (wasPaid) {
      paid++;
      results.push({
        creator_id: creator.id,
        invoice_id: invoiceId,
        paid: true,
      });
    } else {
      skipped++;
      results.push({
        creator_id: creator.id,
        invoice_id: invoiceId,
        paid: false,
        reason: 'insufficient_balance',
      });
    }
  }

  // ── 5) Response ─────────────────────────────────────────────────────
  return NextResponse.json({
    billing_month: billingMonth,
    creators: creators.length,
    created,
    paid,
    skipped,
    results,
  });
}