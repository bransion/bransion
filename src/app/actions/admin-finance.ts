// =====================================================================
// BRANSION — Admin finance actions.
// =====================================================================
'use server';

import { revalidatePath } from 'next/cache';
import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { roundMoney } from '@/lib/pricing';

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const admin = serviceRoleClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Forbidden');
  return { userId: user.id, admin };
}

export async function approveWithdrawal(withdrawalId: string) {
  try {
    const { userId: adminId, admin } = await checkAdmin();
    const { data: wd } = await admin.from('withdrawal_requests').select('*').eq('id', withdrawalId).maybeSingle();
    if (!wd || wd.status !== 'pending') return { ok: false, error: 'Not pending' };

    const { data: profile } = await admin.from('profiles').select('wallet_balance').eq('id', wd.creator_id).maybeSingle();
    if (!profile || profile.wallet_balance < wd.amount) return { ok: false, error: 'Insufficient balance' };

    const newBalance = profile.wallet_balance - wd.amount;
    await admin.from('profiles').update({ wallet_balance: newBalance }).eq('id', wd.creator_id);
    await admin.from('wallet_transactions').insert({
      creator_id: wd.creator_id, type: 'withdrawal', amount: -wd.amount, balance_after: newBalance, description: 'Withdrawal approved', reference: withdrawalId
    });
    await admin.from('withdrawal_requests').update({ status: 'paid', processed_at: new Date().toISOString() }).eq('id', withdrawalId);
    await admin.from('admin_audit_logs').insert({
      admin_id: adminId, action: 'withdrawal_approved', target_table: 'withdrawal_requests', target_id: withdrawalId
    });
    await admin.from('notifications').insert({
      recipient_id: wd.creator_id, title: 'Withdrawal Approved', body: `Your withdrawal of ₦${wd.amount.toLocaleString()} has been paid.`, type: 'success'
    });

    revalidatePath('/admin/finances');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function rejectWithdrawal(withdrawalId: string, reason: string) {
  try {
    const { userId: adminId, admin } = await checkAdmin();
    const { data: wd } = await admin.from('withdrawal_requests').select('*').eq('id', withdrawalId).maybeSingle();
    if (!wd || wd.status !== 'pending') return { ok: false, error: 'Not pending' };

    await admin.from('withdrawal_requests').update({ status: 'rejected', admin_note: reason, processed_at: new Date().toISOString() }).eq('id', withdrawalId);
    await admin.from('admin_audit_logs').insert({
      admin_id: adminId, action: 'withdrawal_rejected', target_table: 'withdrawal_requests', target_id: withdrawalId, details: { reason }
    });
    await admin.from('notifications').insert({
      recipient_id: wd.creator_id, title: 'Withdrawal Rejected', body: `Your request was rejected. Reason: ${reason}`, type: 'error'
    });

    revalidatePath('/admin/finances');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function getReferralTree(userId: string) {
  await checkAdmin();
  const admin = serviceRoleClient();

  type Node = { id: string; email: string; joined: string; split: string; children: Node[] };
  async function fetchTree(uid: string, level: number): Promise<Node | null> {
    if (level > 3) return null;
    const { data: u } = await admin.from('profiles').select('id, email, created_at').eq('id', uid).maybeSingle();
    if (!u) return null;
    const { data: contracts } = await admin.from('referral_contracts').select('referee_id, lifetime_split, locked_at').eq('referrer_id', uid);

    const children: Node[] = [];
    for (const c of contracts || []) {
      const childNode = await fetchTree(c.referee_id, level + 1);
      if (childNode) { childNode.split = c.lifetime_split; childNode.joined = c.locked_at; children.push(childNode); }
    }
    return { id: u.id, email: u.email, joined: u.created_at, split: '', children };
  }
  return await fetchTree(userId, 1);
}

export async function getRevenueBreakdown(month: string) {
  await checkAdmin();
  const admin = serviceRoleClient();
  const [year, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(year, m, 1)).toISOString();

  const { data: items } = await admin.from('order_items').select('markup, quantity, orders!inner(status, paid_at)').in('orders.status', ['paid', 'fulfilled']).gte('orders.paid_at', start).lt('orders.paid_at', end);
  let totalMarkup = 0;
  for (const i of items || []) totalMarkup += Number(i.markup) * Number(i.quantity);

  const bransionGross = roundMoney(totalMarkup * 0.30);
  const creatorNet = roundMoney(totalMarkup * 0.70);

  const { data: comms } = await admin.from('commissions_ledger').select('commission_amount').eq('type', 'lifetime_sale').gte('created_at', start).lt('created_at', end);
  const referralPayouts = (comms || []).reduce((s, c) => s + Number(c.commission_amount), 0);
  
  return { totalMarkup, bransionGross, creatorNet, referralPayouts, bransionNet: roundMoney(bransionGross - referralPayouts) };
}