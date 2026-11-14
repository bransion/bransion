// =====================================================================
// BRANSION — Admin user management actions.
// =====================================================================
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient, serviceRoleClient } from '@/lib/supabase/server';

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const admin = serviceRoleClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Forbidden');
  return { userId: user.id, admin };
}

// ── TIER OVERRIDE ─────────────────────────────────────────────────────
export async function overrideTier(
  userId: string,
  tier: 'basic' | 'standard' | 'premium',
  reason: string
) {
  try {
    const { userId: adminId, admin } = await checkAdmin();
    if (reason.trim().length < 3) return { ok: false, error: 'Reason required (min 3 chars)' };

    // Update BOTH legacy and v3 columns to prevent UI desync
    const { error } = await admin
      .from('profiles')
      .update({
        tier: tier,
        account_tier: tier,
        tier_paid_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: adminId,
      action: 'user_tier_override',
      target_table: 'profiles',
      target_id: userId,
      details: { new_tier: tier, reason },
    });

    await admin.from('notifications').insert({
      recipient_id: userId,
      title: 'Account tier updated',
      body: `An admin updated your tier to ${tier}. Reason: ${reason}`,
      type: 'info',
    });

    revalidatePath('/admin/users');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ── ROLE TOGGLE ───────────────────────────────────────────────────────
export async function toggleRole(userId: string, role: 'user' | 'admin') {
  try {
    const { userId: adminId, admin } = await checkAdmin();
    if (adminId === userId) return { ok: false, error: 'Cannot change your own role' };

    const legacyRole = role === 'admin' ? 'admin' : 'buyer';
    const { error } = await admin
      .from('profiles')
      .update({ user_role: role, role: legacyRole })
      .eq('id', userId);

    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: adminId,
      action: 'user_role_change',
      target_table: 'profiles',
      target_id: userId,
      details: { new_role: role },
    });

    revalidatePath('/admin/users');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ── DELETE ACCOUNT ────────────────────────────────────────────────────
export async function deleteUserAccount(userId: string) {
  try {
    const { userId: adminId, admin } = await checkAdmin();
    if (adminId === userId) return { ok: false, error: 'Cannot delete yourself' };

    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();
    if (!profile) return { ok: false, error: 'User not found' };

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: adminId,
      action: 'user_deleted',
      target_table: 'profiles',
      target_id: userId,
      details: { email_hash: Buffer.from(profile.email).toString('base64').slice(0, 10) },
    });

    revalidatePath('/admin/users');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ── IMPERSONATION ─────────────────────────────────────────────────────
export async function startImpersonation(userId: string) {
  try {
    await checkAdmin();
    const cookieStore = await cookies();
    cookieStore.set('admin_impersonating_user_id', userId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 2,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: 'Unauthorized' };
  }
}

export async function stopImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_impersonating_user_id');
  return { ok: true };
}