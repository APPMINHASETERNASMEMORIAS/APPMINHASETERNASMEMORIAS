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
        console.warn('[PAYMENT WARNING] Missing InfinitePay credentials.');
        if (process.env.NODE_ENV === 'production') {
          return res.status(400).json({
            success: false,
            error: 'Missing InfinitePay credentials'
          });
        }
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
          eventId: req.body.eventId, // CRITICAL: needed for webhook to identify the event
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
  
  // In-memory storage for unmatched payments (for static link fallback)
  let unmatchedPayments: any[] = [];
  try {
    const fs = require('fs');
    if (fs.existsSync('unmatched_payments.json')) {
      unmatchedPayments = JSON.parse(fs.readFileSync('unmatched_payments.json', 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load unmatched payments', e);
  }

  function saveUnmatchedPayments() {
    try {
      const fs = require('fs');
      fs.writeFileSync('unmatched_payments.json', JSON.stringify(unmatchedPayments, null, 2));
    } catch (e) {
      console.error('Failed to save unmatched payments', e);
    }
  }

  // Endpoint to claim an unmatched payment
  app.post('/api/payments/claim', async (req, res) => {
    try {
      const { eventId } = req.body;
      if (!eventId) return res.status(400).json({ error: 'eventId is required' });

      if (supabase) {
        // First, check if the event is already paid in the database
        const { data: event, error: fetchError } = await supabase
          .from('events')
          .select('payment_status, status')
          .eq('id', eventId)
          .single();

        if (event && event.payment_status === 'paid') {
          console.log(`[PAYMENT CLAIM] Event ${eventId} is already marked as paid in database.`);
          return res.json({ success: true, message: 'Payment already confirmed' });
        }

        // Find an unmatched payment from the last 1 hour
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentUnmatched = unmatchedPayments.filter(p => p.timestamp > oneHourAgo);

        if (recentUnmatched.length > 0) {
          // Take the most recent one
          const payment = recentUnmatched[recentUnmatched.length - 1];
          
          const { error } = await supabase
            .from('events')
            .update({ 
              status: 'active',
              payment_status: 'paid',
              payment_id: payment.transactionId,
              updated_at: new Date().toISOString()
            })
            .eq('id', eventId);

          if (!error) {
            // Remove from unmatched
            const index = unmatchedPayments.indexOf(payment);
            if (index > -1) {
              unmatchedPayments.splice(index, 1);
              saveUnmatchedPayments();
            }
            
            console.log(`[PAYMENT CLAIMED] Event ${eventId} claimed payment ${payment.transactionId}`);
            return res.json({ success: true, message: 'Payment claimed successfully' });
          }
        }
      }

      res.json({ success: false, message: 'No recent unmatched payments found' });
    } catch (error) {
      console.error('[CLAIM ERROR]', error);
      res.status(500).json({ error: 'Failed to claim payment' });
    }
  });

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
      console.log('[WEBHOOK] Log added. Current logs count:', webhookLogs.length);
      
      // Write to file for debugging
      try {
        const fs = require('fs');
        fs.writeFileSync('webhook_debug.json', JSON.stringify(webhookLogs, null, 2));
      } catch (e) {
        console.error('Failed to write debug file', e);
      }
      
      // Limit logs to 50
      if (webhookLogs.length > 50) webhookLogs.pop();

      // 1. VERIFICAÇÃO DE SEGURANÇA (CRÍTICO)
      // Você DEVE validar a assinatura para garantir que o webhook veio da InfinitePay
      const isValid = verifySignature(payload, signature, process.env.INFINITEPAY_WEBHOOK_SECRET);
      
      // Log to Supabase if client is available
      if (supabase) {
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
        if (!process.env.INFINITEPAY_WEBHOOK_SECRET) {
          console.warn('[WEBHOOK] Webhook secret not set. Bypassing signature verification for now, but this is INSECURE.');
        } else {
          console.warn('[WEBHOOK] Invalid signature received');
          return res.status(401).send('Invalid signature');
        }
      }

      // 2. PROCESSAMENTO DO PAGAMENTO
      // Supondo que o payload contenha o status e o ID da transação
      const status = (payload.status || payload.data?.status || '').toLowerCase();
      const transactionId = payload.id || payload.data?.id;
      const metadata = payload.metadata || payload.data?.metadata;
      
      console.log(`[WEBHOOK] Processing payment ${transactionId} with status: ${status}`);

      if (status === 'approved' || status === 'paid' || status === 'confirmed') {
        const planId = metadata?.planId;
        const userId = metadata?.userId;
        let eventId = metadata?.eventId;

        // Se não tiver eventId no metadata (caso de link estático), tenta encontrar pelo cliente
        if (!eventId && supabase) {
          const customer = payload.customer || payload.data?.customer;
          const customerPhone = customer?.phone?.replace(/\D/g, '');
          const customerName = customer?.name?.toLowerCase();
          const customerEmail = customer?.email?.toLowerCase();
          
          console.log(`[WEBHOOK] No eventId in metadata. Trying to match by customer:`, { customerPhone, customerName, customerEmail });
          
          if (customerPhone || customerName || customerEmail) {
            // Busca eventos pendentes
            const { data: pendingEvents } = await supabase
              .from('events')
              .select('id, clientPhone, clientName, clientEmail')
              .eq('status', 'pending');
              
            if (pendingEvents && pendingEvents.length > 0) {
              // Tenta encontrar um match exato
              const matchedEvent = pendingEvents.find(e => {
                const ePhone = e.clientPhone?.replace(/\D/g, '');
                const eName = e.clientName?.toLowerCase();
                const eEmail = e.clientEmail?.toLowerCase();
                
                return (customerPhone && ePhone && ePhone === customerPhone) ||
                       (customerEmail && eEmail && eEmail === customerEmail) ||
                       (customerName && eName && eName.includes(customerName));
              });
              
              if (matchedEvent) {
                eventId = matchedEvent.id;
                console.log(`[WEBHOOK] Matched payment to event ${eventId} via customer details`);
              }
            }
          }
        }

        if (eventId) {
          console.log(`[WEBHOOK] Payment ${transactionId} approved for user ${userId}, event ${eventId}`);
          
          // 3. ATUALIZAÇÃO NO SUPABASE
          if (supabase) {
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
          }
        } else {
          console.log(`[WEBHOOK] Payment ${transactionId} approved, but could not match to any event. Storing as unmatched.`);
          unmatchedPayments.push({
            transactionId,
            status,
            timestamp: Date.now(),
            payload
          });
          saveUnmatchedPayments();
          
          // Keep unmatched payments array from growing too large (max 100)
          if (unmatchedPayments.length > 100) {
            unmatchedPayments.shift();
            saveUnmatchedPayments();
          }
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
        const { eventId, status, amount } = req.body;
        
        const mockPayload = {
            id: `sim_${Date.now()}`,
            status: status || 'approved',
            amount: amount || 5999,
            metadata: {
                userId: 'test_user',
                planId: 'intimo',
                eventId: eventId || 'test_event_id'
            },
            created_at: new Date().toISOString()
        };
        
        console.log('[SIMULATION] Processing mock webhook internally...');
        
        // Store log for viewing
        webhookLogs.unshift({
          timestamp: new Date().toISOString(),
          headers: { 'x-infinitepay-signature': 'mock_signature', 'content-type': 'application/json' },
          body: mockPayload
        });
        console.log('[SIMULATION] Log added. Current logs count:', webhookLogs.length);
        
        if (webhookLogs.length > 50) webhookLogs.pop();

        const paymentStatus = mockPayload.status;
        const metadata = mockPayload.metadata;
        
        if (paymentStatus === 'approved' || paymentStatus === 'paid') {
          const targetEventId = metadata.eventId;
          
          if (targetEventId && targetEventId !== 'test_event_id') {
            console.log(`[SIMULATION] Payment approved for event ${targetEventId}`);
            if (supabase) {
              const { error } = await supabase
                .from('events')
                .update({ 
                  status: 'active',
                  payment_status: 'paid',
                  updated_at: new Date().toISOString()
                })
                .eq('id', targetEventId);

              if (error) {
                console.error('[SIMULATION] Error updating event in Supabase:', error);
              }
            }
          }
        }
        
        res.json({ success: true, message: 'Webhook simulated successfully' });
    } catch (error: any) {
        console.error('[SIMULATION ERROR]', error);
        res.status(500).json({ success: false, error: error.message });
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
