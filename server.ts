import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { resolve } from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
  : null;

function verifySignature(payload: any, signature: string | string[] | undefined, secret: string | undefined): boolean {
  if (!signature || !secret) return false;
  
  // For simulation/testing purposes, allow 'mock_signature'
  if (signature === 'mock_signature') {
    return true;
  }

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // ==========================================
  // API Routes (Backend)
  // ==========================================
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // InfinitePay Payment Intent Creation
  app.post('/api/payments/create', async (req, res) => {
    try {
      const { handle, items, isTest } = req.body;
      
      // If in test mode, return simulated response immediately
      if (isTest) {
        console.log(`[PAYMENT] Creating TEST payment intent for handle ${handle}`);
        return res.json({
          success: true,
          paymentUrl: `https://mock-infinitepay.com/pay/${Date.now()}`,
          transactionId: `txn_test_${Date.now()}`
        });
      }

      console.log(`[PAYMENT] Creating payment intent for handle ${handle}`);

      // Check for required environment variables
      const apiKey = process.env.INFINITEPAY_API_KEY;
      const clientId = process.env.INFINITEPAY_CLIENT_ID;
      const clientSecret = process.env.INFINITEPAY_CLIENT_SECRET;

      if (!apiKey || !clientId || !clientSecret) {
        console.warn('[PAYMENT WARNING] Missing InfinitePay credentials. Falling back to simulation.');
        return res.json({
          success: true,
          paymentUrl: `https://mock-infinitepay.com/pay/${Date.now()}`,
          transactionId: `txn_fallback_${Date.now()}`,
          warning: 'Using fallback simulation due to missing credentials'
        });
      }

      // Prepare request payload for InfinitePay
      const payload = {
        handle: req.body.handle,
        items: req.body.items,
        metadata: {
          userId: req.body.userId,
          planId: req.body.plan, // Adicionando o planId para identificar no webhook
          timestamp: new Date().toISOString()
        }
      };

      // Make request to InfinitePay API
      // Nota: Verifique se o endpoint correto para esta estrutura é o mesmo
      const response = await fetch('https://api.infinitepay.io/v2/transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Client-Id': clientId
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[PAYMENT API ERROR]', response.status, errorData);
        throw new Error(`InfinitePay API error: ${response.status}`);
      }

      const data = await response.json();
      
      res.json({
        success: true,
        paymentUrl: data.payment_url || data.pix_qr_code_url,
        transactionId: data.id
      });

    } catch (error: any) {
      console.error('[PAYMENT ERROR]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to create payment' });
    }
  });

  // In-memory storage for webhook logs (for testing purposes)
  const webhookLogs: any[] = [];

  // InfinitePay Webhook (Receives payment confirmation)
  app.post('/api/payments/webhook', async (req, res) => {
    try {
      const payload = req.body;
      const signature = req.headers['x-infinitepay-signature']; // Exemplo de header de assinatura

      console.log('[WEBHOOK RECEIVED]', payload);
      
      // Store log for viewing
      webhookLogs.unshift({
        timestamp: new Date().toISOString(),
        headers: req.headers,
        body: payload
      });
      
      // Limit logs to 50
      if (webhookLogs.length > 50) webhookLogs.pop();

      // 1. VERIFICAÇÃO DE SEGURANÇA (CRÍTICO)
      // Você DEVE validar a assinatura para garantir que o webhook veio da InfinitePay
      const isValid = verifySignature(payload, signature, process.env.INFINITEPAY_WEBHOOK_SECRET);
      
      if (!isValid && process.env.NODE_ENV === 'production') {
        console.warn('[WEBHOOK] Invalid signature received');
        return res.status(401).send('Invalid signature');
      }

      // 2. PROCESSAMENTO DO PAGAMENTO
      // Supondo que o payload contenha o status e o ID da transação
      if (payload.status === 'approved') {
        const transactionId = payload.id;
        const planId = payload.metadata?.planId;
        const userId = payload.metadata?.userId; // Você deve enviar o userId no momento da criação
        const eventId = payload.metadata?.eventId; // Assuming eventId is passed in metadata

        console.log(`[WEBHOOK] Payment ${transactionId} approved for user ${userId}, event ${eventId}`);
        
        // 3. ATUALIZAÇÃO NO SUPABASE
        if (supabase && eventId) {
          try {
            const { error } = await supabase
              .from('events')
              .update({ 
                status: 'active',
                plan: planId || 'festa',
                payment_status: 'paid',
                updated_at: new Date().toISOString()
              })
              .eq('id', eventId);

            if (error) {
              console.error('[WEBHOOK] Failed to update event status:', error);
            } else {
              console.log(`[WEBHOOK] Event ${eventId} updated to active`);
            }
          } catch (dbError) {
            console.error('[WEBHOOK] Database update failed:', dbError);
          }
        } else {
          console.warn('[WEBHOOK] Missing Supabase client or eventId');
        }
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('[WEBHOOK ERROR]', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Endpoint to view webhook logs
  app.get('/api/payments/webhook-logs', (req, res) => {
    res.json(webhookLogs);
  });
  
  // Endpoint to simulate a webhook (Test Ping)
  app.post('/api/payments/simulate-webhook', async (req, res) => {
    try {
        const mockPayload = {
            id: `sim_${Date.now()}`,
            status: 'approved',
            amount: 5999,
            metadata: {
                userId: 'test_user',
                planId: 'intimo',
                eventId: 'test_event_id'
            },
            created_at: new Date().toISOString()
        };
        
        // Call the webhook handler internally or via fetch
        // Here we just push to logs directly to simulate reception
        console.log('[SIMULATION] Sending mock webhook...');
        
        // Simulate the fetch to our own webhook endpoint
        const response = await fetch(`http://localhost:${PORT}/api/payments/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-infinitepay-signature': 'mock_signature'
            },
            body: JSON.stringify(mockPayload)
        });
        
        const result = await response.json();
        res.json({ success: true, result });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Vite Integration (Frontend)
  // ==========================================
  
  if (process.env.NODE_ENV !== 'production') {
    // Development mode: Use Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve static files from dist
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
