import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from Vercel environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Error handling for missing environment variables
if (!supabaseUrl) {
  throw new Error('Missing REACT_APP_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing REACT_APP_SUPABASE_ANON_KEY environment variable');
}

// Create and configure Supabase client with schema settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'ai_tour_plan,public' // Set schema search path
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    enabled: true
  }
});
