import express from 'express';
import dotenv from 'dotenv';
import { resolve } from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

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

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// ==========================================
// API Routes (Backend)
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

  // Endpoint to notify support about a new receipt
  app.post('/api/notify-support', async (req, res) => {
    try {
      const { eventId, eventName, receiptUrl } = req.body;
      console.log(`[NOTIFY] New receipt for event ${eventId}: ${receiptUrl}`);

      // 1. Send Email
      if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT),
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: '"Minhas Eternas Memórias" <suporte@minhaseternasmemorias.com.br>',
          to: 'linktestadoeaprovado@gmail.com',
          subject: `Novo Comprovante: ${eventName}`,
          text: `Novo comprovante recebido para o evento ${eventName} (ID: ${eventId}). URL: ${receiptUrl}`,
          html: `<p>Novo comprovante recebido para o evento <strong>${eventName}</strong> (ID: ${eventId}).</p><p><a href="${receiptUrl}">Ver Comprovante</a></p>`,
        });
      } else {
        console.warn('[NOTIFY] SMTP configuration missing, skipping email notification.');
      }

      // 2. Send Webhook
      if (process.env.SUPPORT_WEBHOOK_URL) {
        await fetch(process.env.SUPPORT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            eventName,
            receiptUrl,
            timestamp: new Date().toISOString()
          })
        });
      }

      // 3. Send to Make.com Webhook (if configured)
      if (process.env.MAKE_WEBHOOK_URL) {
        try {
          await fetch(process.env.MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'new_receipt',
              eventId,
              eventName,
              receiptUrl,
              timestamp: new Date().toISOString()
            })
          });
          console.log(`[NOTIFY] Successfully sent receipt notification to Make.com`);
        } catch (makeError) {
          console.error('[NOTIFY] Failed to send to Make.com:', makeError);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[NOTIFY ERROR]', error);
      res.status(500).json({ success: false, error: 'Failed to send notification' });
    }
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
  const unmatchedPayments: any[] = [];

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
            if (index > -1) unmatchedPayments.splice(index, 1);
            
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
      const logEntry = {
        timestamp: new Date().toISOString(),
        headers: req.headers,
        body: payload
      };
      webhookLogs.unshift(logEntry);
      
      // Limit logs to 50
      if (webhookLogs.length > 50) webhookLogs.pop();

      // Insert into Supabase if available
      if (supabase) {
        try {
          await supabase.from('webhook_logs').insert([{
            headers: req.headers,
            payload: payload,
            body: payload
          }]);
        } catch (dbError) {
          console.error('[WEBHOOK] Failed to insert log into Supabase:', dbError);
        }
      }

      // 1. VERIFICAÇÃO DE SEGURANÇA (CRÍTICO)
      // Você DEVE validar a assinatura para garantir que o webhook veio da InfinitePay
      console.log('[WEBHOOK] Signature header:', signature);
      console.log('[WEBHOOK] Secret set:', !!process.env.INFINITEPAY_WEBHOOK_SECRET);
      console.log('[WEBHOOK] Payload:', JSON.stringify(payload));
      
      const isValid = verifySignature(payload, signature, process.env.INFINITEPAY_WEBHOOK_SECRET);
      console.log('[WEBHOOK] Signature valid:', isValid);
      
      if (!isValid) {
        console.warn('[WEBHOOK] Invalid signature received or verification failed');
        if (process.env.NODE_ENV === 'production' && process.env.INFINITEPAY_WEBHOOK_SECRET) {
           return res.status(401).send('Invalid signature');
        }
      }

      // 2. PROCESSAMENTO DO PAGAMENTO
      // Supondo que o payload contenha o status e o ID da transação
      const status = (payload.status || payload.data?.status || '').toLowerCase();
      const transactionId = payload.id || payload.data?.id;
      const metadata = payload.metadata || payload.data?.metadata;
      
      console.log('[WEBHOOK] Extracted data:', { status, transactionId, metadata });

      if (status === 'approved' || status === 'paid' || status === 'confirmed') {
        const planId = metadata?.planId;
        const userId = metadata?.userId;
        let eventId = metadata?.eventId;

        console.log('[WEBHOOK] Event ID from metadata:', eventId);

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
                
                // Send webhook to Make.com if configured
                if (process.env.MAKE_WEBHOOK_URL) {
                  try {
                    await fetch(process.env.MAKE_WEBHOOK_URL, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        event: 'payment_confirmed',
                        eventId,
                        transactionId,
                        planId,
                        userId,
                        timestamp: new Date().toISOString()
                      })
                    });
                    console.log(`[WEBHOOK] Successfully sent payment confirmation to Make.com`);
                  } catch (makeError) {
                    console.error('[WEBHOOK] Failed to send to Make.com:', makeError);
                  }
                }
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
          
          // Keep unmatched payments array from growing too large (max 100)
          if (unmatchedPayments.length > 100) {
            unmatchedPayments.shift();
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
  app.get('/api/payments/webhook-logs', async (req, res) => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('webhook_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (!error && data) {
          return res.json(data);
        }
      } catch (dbError) {
        console.error('[LOGS] Failed to fetch from Supabase:', dbError);
      }
    }
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
        const logEntry = {
          timestamp: new Date().toISOString(),
          headers: { 'x-infinitepay-signature': 'mock_signature', 'content-type': 'application/json' },
          body: mockPayload
        };
        webhookLogs.unshift(logEntry);
        
        if (webhookLogs.length > 50) webhookLogs.pop();

        // Insert into Supabase if available
        if (supabase) {
          try {
            await supabase.from('webhook_logs').insert([{
              headers: logEntry.headers,
              payload: mockPayload,
              body: mockPayload
            }]);
          } catch (dbError) {
            console.error('[SIMULATION] Failed to insert log into Supabase:', dbError);
          }
        }

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
  // Production Integration (Frontend fallback)
  // ==========================================
  
  // Only serve static files if not running in a serverless environment like Vercel
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    // Production mode: Serve static files from dist
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(resolve('dist', 'index.html'));
    });
  }

  // Only start the server if not running in a serverless environment like Vercel
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT as number, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }

export default app;
