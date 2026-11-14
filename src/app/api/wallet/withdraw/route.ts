// =====================================================================
// BRANSION — Withdrawal request API.
// SECURITY:
//   • Rate-limited 3/min/IP (money leaving the platform).
//   • Uses getSessionUser() for auth.
//   • Zod validates all fields.
//   • Server enforces: amount <= wallet_balance - unpaid - pending.
//   • Insert uses the caller's session client → RLS applies on top.
// =====================================================================
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-helpers';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { withdrawalSchema } from '@/lib/validations';

export async function POST(req: Request) {
  // ── 0) RATE LIMIT ──────────────────────────────────────────────────
  const rl = checkRateLimit(req, {
    keyPrefix: 'wallet:withdraw',
    windowMs: 60_000,
    max: 3,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    // ── 1) AUTH ─────────────────────────────────────────────────────
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    const { user, supabase } = session;

    // ── 2) VALIDATE ─────────────────────────────────────────────────
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = withdrawalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid withdrawal details',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // ── 3) BUSINESS RULES ───────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .maybeSingle();
    const walletBalance = Number(profile?.wallet_balance ?? 0);

    const { data: unpaid } = await supabase
      .from('maintenance_invoices')
      .select('amount')
      .eq('creator_id', user.id)
      .eq('status', 'unpaid');
    const unpaidTotal = (unpaid ?? []).reduce(
      (s, i) => s + Number(i.amount),
      0
    );

    const { data: pendingWds } = await supabase
      .from('withdrawal_requests')
      .select('amount')
      .eq('creator_id', user.id)
      .eq('status', 'pending');
    const pendingWdsTotal = (pendingWds ?? []).reduce(
      (s, i) => s + Number(i.amount),
      0
    );

    const withdrawable = walletBalance - unpaidTotal - pendingWdsTotal;

    if (data.amount > withdrawable) {
      return NextResponse.json(
        {
          error: `Withdrawable amount is ₦${withdrawable.toLocaleString()}. You requested ₦${data.amount.toLocaleString()}.`,
        },
        { status: 400 }
      );
    }

    // ── 4) INSERT (RLS applies — creator_id must equal auth.uid()) ──
    const { data: inserted, error: insertErr } = await supabase
      .from('withdrawal_requests')
      .insert({
        creator_id: user.id,
        amount: data.amount,
        bank_full_name: data.bank_full_name,
        account_number: data.account_number,
        bank_name: data.bank_name,
        phone: data.phone,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      console.error('Withdrawal insert error:', insertErr);
      return NextResponse.json(
        { error: 'Failed to create withdrawal request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawal_id: inserted.id,
      amount: data.amount,
    });
  } catch (err) {
    console.error('Withdrawal error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Withdrawal failed' },
      { status: 500 }
    );
  }
}