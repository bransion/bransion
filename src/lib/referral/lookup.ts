// =====================================================================
// BRANSION — Referrer lookup by code.
// =====================================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateReferralCodeFormat } from './code';

export interface ResolvedReferrer {
  referrer_id: string;
  referrer_tier: 'basic' | 'standard' | 'premium';
}

export async function resolveReferrer(
  code: string,
  supabase: SupabaseClient
): Promise<ResolvedReferrer | null> {
  if (!validateReferralCodeFormat(code)) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, account_tier')
    .eq('referral_code', code)
    .maybeSingle();

  if (error || !data) return null;

  return {
    referrer_id: data.id as string,
    referrer_tier: data.account_tier as 'basic' | 'standard' | 'premium',
  };
}