import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config();

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
          userId: req.body.userId, // Adicionando o userId para identificar no webhook
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

    } catch (error) {
      console.error('[PAYMENT ERROR]', error);
      res.status(500).json({ success: false, error: 'Failed to create payment' });
    }
  });

  // InfinitePay Webhook (Receives payment confirmation)
  app.post('/api/payments/webhook', async (req, res) => {
    try {
      const payload = req.body;
      const signature = req.headers['x-infinitepay-signature']; // Exemplo de header de assinatura

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
