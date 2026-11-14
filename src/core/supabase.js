/**
 * Supabase Client Configuration
 * Connected to FunnyGame Production Database
 */
const SUPABASE_URL = 'https://wiulcvbvpifpxmuxdtus.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6vgWG2bpVDPXq2jLi9t85A_GvIuS8FD';

// Client instance initialized on window load or through CDN/ESM
let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient) {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  }
  return supabaseClient;
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
