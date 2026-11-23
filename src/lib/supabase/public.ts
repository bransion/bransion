// =====================================================================
// BRANSION — Public Supabase client.
// No cookies, no session. Safe to use with 'use cache' and static pages.
// =====================================================================
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { clientEnv } from '@/lib/env';

export function createPublicClient() {
  return createSupabaseJsClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}