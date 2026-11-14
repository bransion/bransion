// =====================================================================
// BRANSION — Admin action dispatcher.
// SECURITY:
//   • requireAdmin() — 401 if no session, 403 if role ≠ 'admin'.
//   • Per-action Zod schema — no manual string checks.
//   • Every write is followed by an admin_audit_log entry (writeAuditLog).
//   • All writes use the service-role client AFTER admin auth verified,
//     because some actions (wallet debit, withdrawal flip) are only valid
//     from a trusted server context.
// =====================================================================
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceRoleClient } from '@/lib/supabase/server';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';
import { writeAuditLog } from '@/lib/audit';

// ── Per-action payload schemas ──────────────────────────────────────
const SCHEMAS = {
  'user.set_role': z.object({
    userId: z.string().uuid(),
    role: z.enum(['buyer', 'creator', 'admin']),
  }),
  'brand.suspend': z.object({
    brandId: z.string().uuid(),
  }),
  'brand.reactivate': z.object({
    brandId: z.string().uuid(),
  }),
  'order.fulfill': z.object({
    orderId: z.string().uuid(),
  }),
  'withdrawal.approve': z.object({
    withdrawalId: z.string().uuid(),
  }),
  'withdrawal.reject': z.object({
    withdrawalId: z.string().uuid(),
    note: z.string().max(500).optional(),
  }),
  'invoice.mark_paid': z.object({
    invoiceId: z.string().uuid(),
  }),
  'invoice.waive': z.object({
    invoiceId: z.string().uuid(),
  }),
} as const;

type ActionKey = keyof typeof SCHEMAS;

const outerSchema = z.object({
  action: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

export async function POST(req: Request) {
  // ── 1) AUTH + ADMIN CHECK ──────────────────────────────────────
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const { user } = auth;

  try {
    // ── 2) OUTER BODY SHAPE ──────────────────────────────────────
    const body = (await req.json()) as Record<string, unknown>;
    const outer = outerSchema.safeParse(body);
    if (!outer.success) {
      return NextResponse.json(
        {
          error: 'Invalid request shape',
          issues: outer.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { action, payload } = outer.data;

    // ── 3) PER-ACTION ZOD ────────────────────────────────────────
    if (!(action in SCHEMAS)) {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }
    const actionSchema = SCHEMAS[action as ActionKey];
    const parsed = actionSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: `Invalid payload for ${action}`,
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const admin = serviceRoleClient();
    let message = 'Done';
    let target: { table: string; id: string; meta?: Record<string, unknown> };

    // ── 4) DISPATCH ──────────────────────────────────────────────
    switch (action as ActionKey) {
      // ── USERS ─────────────────────────────────────────────────
      case 'user.set_role': {
        const { userId, role } = parsed.data as z.infer<
          typeof SCHEMAS['user.set_role']
        >;

        if (userId === user.id && role !== 'admin') {
          return NextResponse.json(
            { error: 'You cannot demote yourself. Ask another admin.' },
            { status: 400 }
          );
        }

        const { error } = await admin
          .from('profiles')
          .update({ role })
          .eq('id', userId);
        if (error) throw error;

        message = `Role set to ${role}`;
        target = {
          table: 'profiles',
          id: userId,
          meta: { role },
        };
        break;
      }

      // ── BRANDS ────────────────────────────────────────────────
      case 'brand.suspend': {
        const { brandId } = parsed.data as z.infer<
          typeof SCHEMAS['brand.suspend']
        >;
        const { error } = await admin
          .from('brands')
          .update({ is_active: false })
          .eq('id', brandId);
        if (error) throw error;
        message = 'Brand suspended';
        target = { table: 'brands', id: brandId };
        break;
      }

      case 'brand.reactivate': {
        const { brandId } = parsed.data as z.infer<
          typeof SCHEMAS['brand.reactivate']
        >;
        const { error } = await admin
          .from('brands')
          .update({
            is_active: true,
            published_at: new Date().toISOString(),
          })
          .eq('id', brandId);
        if (error) throw error;
        message = 'Brand reactivated';
        target = { table: 'brands', id: brandId };
        break;
      }

      // ── ORDERS ────────────────────────────────────────────────
      case 'order.fulfill': {
        const { orderId } = parsed.data as z.infer<
          typeof SCHEMAS['order.fulfill']
        >;
        const { error } = await admin
          .from('orders')
          .update({ status: 'fulfilled' })
          .eq('id', orderId)
          .eq('status', 'paid');
        if (error) throw error;
        message = 'Order marked fulfilled';
        target = { table: 'orders', id: orderId };
        break;
      }

      // ── WITHDRAWALS ───────────────────────────────────────────
      case 'withdrawal.approve': {
        const { withdrawalId } = parsed.data as z.infer<
          typeof SCHEMAS['withdrawal.approve']
        >;

        const { data: wd } = await admin
          .from('withdrawal_requests')
          .select('id, creator_id, amount, status')
          .eq('id', withdrawalId)
          .maybeSingle();

        if (!wd) {
          return NextResponse.json(
            { error: 'Not found' },
            { status: 404 }
          );
        }
        if (wd.status !== 'pending') {
          return NextResponse.json(
            { error: `Already ${wd.status}` },
            { status: 400 }
          );
        }

        const { data: profile } = await admin
          .from('profiles')
          .select('wallet_balance')
          .eq('id', wd.creator_id)
          .maybeSingle();
        const balance = Number(profile?.wallet_balance ?? 0);
        const amount = Number(wd.amount);
        if (balance < amount) {
          return NextResponse.json(
            { error: 'Creator wallet has insufficient balance' },
            { status: 400 }
          );
        }
        const newBalance = balance - amount;

        await admin
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', wd.creator_id);

        await admin.from('wallet_transactions').insert({
          creator_id: wd.creator_id,
          type: 'withdrawal',
          amount: -amount,
          balance_after: newBalance,
          description: `Withdrawal approved (${withdrawalId.slice(0, 8)})`,
          reference: withdrawalId,
        });

        const { error } = await admin
          .from('withdrawal_requests')
          .update({
            status: 'paid',
            processed_at: new Date().toISOString(),
          })
          .eq('id', withdrawalId);
        if (error) throw error;

        message = 'Withdrawal marked paid and wallet debited';
        target = {
          table: 'withdrawal_requests',
          id: withdrawalId,
          meta: { amount, creator_id: wd.creator_id },
        };
        break;
      }

      case 'withdrawal.reject': {
        const { withdrawalId, note } = parsed.data as z.infer<
          typeof SCHEMAS['withdrawal.reject']
        >;

        const { data: wd } = await admin
          .from('withdrawal_requests')
          .select('status')
          .eq('id', withdrawalId)
          .maybeSingle();
        if (!wd || wd.status !== 'pending') {
          return NextResponse.json(
            { error: 'Not pending' },
            { status: 400 }
          );
        }

        const { error } = await admin
          .from('withdrawal_requests')
          .update({
            status: 'rejected',
            admin_note: note ?? null,
            processed_at: new Date().toISOString(),
          })
          .eq('id', withdrawalId);
        if (error) throw error;

        message = 'Withdrawal rejected';
        target = {
          table: 'withdrawal_requests',
          id: withdrawalId,
          meta: note ? { note } : undefined,
        };
        break;
      }

      // ── MAINTENANCE INVOICES ──────────────────────────────────
      case 'invoice.mark_paid': {
        const { invoiceId } = parsed.data as z.infer<
          typeof SCHEMAS['invoice.mark_paid']
        >;
        const { error } = await admin
          .from('maintenance_invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            paid_via: 'manual',
          })
          .eq('id', invoiceId)
          .eq('status', 'unpaid');
        if (error) throw error;
        message = 'Invoice marked paid';
        target = { table: 'maintenance_invoices', id: invoiceId };
        break;
      }

      case 'invoice.waive': {
        const { invoiceId } = parsed.data as z.infer<
          typeof SCHEMAS['invoice.waive']
        >;
        const { error } = await admin
          .from('maintenance_invoices')
          .update({ status: 'waived' })
          .eq('id', invoiceId)
          .eq('status', 'unpaid');
        if (error) throw error;
        message = 'Invoice waived';
        target = { table: 'maintenance_invoices', id: invoiceId };
        break;
      }
    }

    // ── 5) AUDIT LOG (every action) ──────────────────────────────
    await writeAuditLog(admin, {
      adminId: user.id,
      action,
      targetTable: target.table,
      targetId: target.id,
      meta: target.meta ?? null,
    });

    return NextResponse.json({ ok: true, message });
  } catch (err) {
    console.error('Admin action error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed' },
      { status: 500 }
    );
  }
}