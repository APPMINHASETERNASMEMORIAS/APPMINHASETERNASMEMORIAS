import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabase) {
    console.warn('Supabase client not initialized. Missing environment variables.');
    return res.status(200).json([]); // Return empty logs if Supabase is not configured
  }

  try {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching logs:', error);
      // If table doesn't exist, return empty array to avoid frontend error
      if (error.code === '42P01') { // undefined_table
        return res.status(200).json([]);
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  } catch (error: any) {
    console.error('Error in webhook-logs handler:', error);
    return res.status(500).json({ error: error.message });
  }
}
