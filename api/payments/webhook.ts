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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    const signature = req.headers['x-infinitepay-signature']; // Exemplo de header de assinatura

    console.log('[WEBHOOK RECEIVED]', payload);

    // Log to Supabase if client is available
    if (supabase) {
      try {
        await supabase.from('webhook_logs').insert({
          payload: payload,
          headers: req.headers,
          created_at: new Date().toISOString()
        });
      } catch (logError) {
        console.error('Failed to log webhook to Supabase:', logError);
      }
    }

    // 1. VERIFICAÇÃO DE SEGURANÇA (CRÍTICO)
    // Você DEVE validar a assinatura para garantir que o webhook veio da InfinitePay
    // const isValid = verifySignature(payload, signature, process.env.INFINITEPAY_WEBHOOK_SECRET);
    // if (!isValid) return res.status(401).send('Invalid signature');

    console.log('[WEBHOOK RECEIVED]', payload);

    // 2. PROCESSAMENTO DO PAGAMENTO
    // Supondo que o payload contenha o status e o ID da transação
    if (payload.status === 'approved') {
      const transactionId = payload.id;
      const planId = payload.metadata?.planId;
      const userId = payload.metadata?.userId; // Você deve enviar o userId no momento da criação

      // 3. ATUALIZAÇÃO NO FIRESTORE
      // Aqui você usaria o Firebase Admin SDK para atualizar o banco
      // await admin.firestore().collection('subscriptions').doc(userId).update({
      //   status: 'active',
      //   planId: planId,
      //   updatedAt: new Date()
      // });
      
      console.log(`[WEBHOOK] Payment ${transactionId} approved for user ${userId}`);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
