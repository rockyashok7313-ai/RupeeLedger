import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wxgzbfjosxficpeczgvj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Xu8aNJh9hn2xk9Pop5x5mw_4iTy38We';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
