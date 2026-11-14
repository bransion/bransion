// =====================================================================
// BRANSION — Attach a referral to a user's profile.
// Server-only. Uses service role for cross-row write.
// =====================================================================
import { serviceRoleClient } from '@/lib/supabase/server';
import { validateReferralCodeFormat } from './code';

export type AttachResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'no_code'
        | 'invalid_format'
        | 'invalid_code'
        | 'self_referral'
        | 'profile_not_found'
        | 'already_referred'
        | 'update_failed';
    };

export async function attachReferralToProfile(
  userId: string,
  code: string
): Promise<AttachResult> {
  if (!code || code.trim() === '') return { ok: false, reason: 'no_code' };
  if (!validateReferralCodeFormat(code))
    return { ok: false, reason: 'invalid_format' };

  const admin = serviceRoleClient();

  const { data: referrer } = await admin
    .from('profiles')
    .select('id')
    .eq('referral_code', code)
    .maybeSingle();

  if (!referrer) return { ok: false, reason: 'invalid_code' };
  if (referrer.id === userId) return { ok: false, reason: 'self_referral' };

  const { data: current } = await admin
    .from('profiles')
    .select('referred_by')
    .eq('id', userId)
    .maybeSingle();

  if (!current) return { ok: false, reason: 'profile_not_found' };
  if (current.referred_by !== null)
    return { ok: false, reason: 'already_referred' };

  const { error } = await admin
    .from('profiles')
    .update({ referred_by: referrer.id })
    .eq('id', userId);

  if (error) {
    console.error('attachReferralToProfile update error:', error);
    return { ok: false, reason: 'update_failed' };
  }
  return { ok: true };
}