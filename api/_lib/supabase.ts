import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Functions use process.env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Create a client with the anon key (for public access) or service role key (for admin access)
// For webhooks, we might need service role key if we are updating protected tables
// But for now, let's stick to anon key if possible, or use service role if available
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseServiceKey || supabaseAnonKey || ''
);
