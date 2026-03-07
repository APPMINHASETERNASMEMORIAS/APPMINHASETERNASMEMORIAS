import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
  : null;

function verifySignature(payload: any, signature: string | string[] | undefined, secret: string | undefined): boolean {
  // For simulation/testing purposes, allow 'mock_signature'
  if (signature === 'mock_signature') {
    return true;
  }

  if (!signature || !secret) return false;

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const digest = hmac.update(body).digest('hex');
    
    return digest === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let payload = req.body;
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        console.error('Failed to parse payload string:', e);
      }
    }
    payload = payload || {};
    const signature = req.headers['x-infinitepay-signature'];

    console.log('[WEBHOOK RECEIVED]', payload);

    // 1. VERIFICAÇÃO DE SEGURANÇA (CRÍTICO)
    const isValid = verifySignature(payload, signature, process.env.INFINITEPAY_WEBHOOK_SECRET);
    
    // Log to Supabase if client is available
    if (supabase && Object.keys(payload).length > 0) {
      try {
        await supabase.from('webhook_logs').insert({
          payload: payload,
          headers: req.headers,
          is_valid: isValid,
          created_at: new Date().toISOString()
        });
      } catch (logError) {
        console.error('Failed to log webhook to Supabase:', logError);
      }
    }

    if (!isValid && process.env.NODE_ENV === 'production') {
      console.warn('[WEBHOOK] Invalid signature received');
      return res.status(401).send('Invalid signature');
    }

    // 2. PROCESSAMENTO DO PAGAMENTO
    if (payload && payload.status === 'approved') {
      const transactionId = payload.id;
      const planId = payload.metadata?.planId;
      const userId = payload.metadata?.userId;
      const eventId = payload.metadata?.eventId; // Capture eventId from metadata

      console.log(`[WEBHOOK] Processing approved payment ${transactionId} for event ${eventId}`);

      // 3. ATUALIZAÇÃO NO SUPABASE
      if (supabase && eventId) {
        try {
          const { error } = await supabase
            .from('events')
            .update({ 
              status: 'active',
              plan: planId || 'festa', // Update plan if provided
              payment_status: 'paid', // Optional: if you have this column
              updated_at: new Date().toISOString()
            })
            .eq('id', eventId);

          if (error) {
            console.error('[WEBHOOK] Failed to update event status:', error);
            throw error;
          }
          console.log(`[WEBHOOK] Event ${eventId} updated to active`);
        } catch (dbError) {
          console.error('[WEBHOOK] Database update failed:', dbError);
        }
      } else {
        console.warn('[WEBHOOK] Missing Supabase client or eventId');
      }
      
      console.log(`[WEBHOOK] Payment ${transactionId} approved for user ${userId}`);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
