/**
 * Server-side Supabase client.
 *
 * Backend routes perform privileged work (validating licence keys, storing OTPs,
 * counting rate limits) that must bypass Row Level Security, so this client
 * prefers the service-role key. It falls back to the anon key so local/preview
 * environments keep working, and to a null client when nothing is configured at
 * all -- callers then return `isOfflineFallback` and degrade to offline mode.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Project URL and anon key fall back to the same public defaults used by
// src/lib/supabase.ts and src/lib/auth-verify.ts. The service-role key has no
// fallback and must always come from the environment.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://wxgzbfjosxficpeczgvj.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Xu8aNJh9hn2xk9Pop5x5mw_4iTy38We';

const key = serviceRoleKey || anonKey;

if (!supabaseUrl || !key) {
  console.warn('WARNING: Supabase is not configured on the server. Database operations will fall back to offline mode.');
} else if (!serviceRoleKey) {
  console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to the anon key; Row Level Security will apply to server routes.');
}

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && key);
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)');
  }
  if (!client) {
    client = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}
