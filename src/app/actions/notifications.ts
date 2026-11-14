// =====================================================================
// BRANSION — User notification actions.
// =====================================================================
'use server';

import { createClient } from '@/lib/supabase/server';

export async function getMyNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .or(`recipient_id.eq.${user.id},recipient_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(10);

  return data ?? [];
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false);

  return { ok: true };
}