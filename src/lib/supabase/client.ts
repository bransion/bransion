// =====================================================================
// BRANSION — Supabase browser client.
// 'use client' at the top ensures this file can ONLY be imported by
// client components. Keeps anon-key browser access separate from
// server-only helpers in server.ts.
// =====================================================================
'use client';

import { createBrowserClient } from '@supabase/ssr';
import { clientEnv } from '@/lib/env';

/**
 * Create (or reuse) a singleton Supabase browser client.
 * Call this from 'use client' components, hooks, and event handlers.
 */
export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}