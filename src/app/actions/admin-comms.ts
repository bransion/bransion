// =====================================================================
// BRANSION — Admin communication (broadcast) actions.
// Returns pre-formatted date strings so the page render has no
// new Date() calls (cacheComponents: true compliance).
// =====================================================================
'use server';

import { createClient, serviceRoleClient } from '@/lib/supabase/server';

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const admin = serviceRoleClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Forbidden');
  return { userId: user.id, admin };
}

export async function sendBroadcast(
  title: string,
  body: string,
  type: string,
  target: string
) {
  try {
    const { userId: adminId, admin } = await assertAdmin();

    let query = admin.from('profiles').select('id');
    if (target.startsWith('tier:')) {
      const tier = target.split(':')[1];
      query = query.eq('account_tier', tier);
    } else if (target !== 'all') {
      query = query.eq('id', target);
    }

    const { data: users } = await query;
    if (!users || users.length === 0)
      return { ok: false, error: 'No recipients found' };

    const inserts = users.map((u) => ({
      recipient_id: u.id,
      title,
      body,
      type: 'broadcast',
      link_url: null,
    }));

    for (let i = 0; i < inserts.length; i += 1000) {
      const chunk = inserts.slice(i, i + 1000);
      const { error } = await admin.from('notifications').insert(chunk);
      if (error) throw error;
    }

    await admin.from('admin_audit_logs').insert({
      admin_id: adminId,
      action: 'broadcast_sent',
      target_table: 'notifications',
      details: { title, type, target, recipient_count: users.length },
    });

    return { ok: true, count: users.length };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed',
    };
  }
}

export interface BroadcastHistoryItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  created_at: string;
  formatted_date: string;
  count: number;
}

export async function getBroadcastHistory(): Promise<BroadcastHistoryItem[]> {
  await assertAdmin();
  const admin = serviceRoleClient();

  const { data } = await admin
    .from('notifications')
    .select('id, title, body, type, created_at')
    .eq('type', 'broadcast')
    .order('created_at', { ascending: false })
    .limit(100);

  // Group identical broadcasts sent in the same minute
  const historyMap = new Map<
    string,
    {
      id: string;
      title: string;
      body: string | null;
      type: string;
      created_at: string;
      count: number;
    }
  >();

  for (const n of data || []) {
    const key = `${n.title}-${n.body}-${n.created_at.slice(0, 16)}`;
    if (!historyMap.has(key)) {
      historyMap.set(key, { ...n, count: 1 });
    } else {
      historyMap.get(key)!.count += 1;
    }
  }

  // Precompute formatted date STRINGS so the page has no Date() call
  const items = Array.from(historyMap.values());
  return items.map((h) => ({
    ...h,
    formatted_date: new Date(h.created_at).toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));
}