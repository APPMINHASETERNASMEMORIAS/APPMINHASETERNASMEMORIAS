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
      const { planId, amount, isTest } = req.body;
      
      // We will implement the actual InfinitePay API call here in the next step.
      // For now, we return a simulated response to verify the frontend flow.
      console.log(`[PAYMENT] Creating payment intent for plan ${planId} (R$ ${amount}) - Test: ${isTest}`);
      
      // Simulated response
      res.json({
        success: true,
        paymentUrl: `https://mock-infinitepay.com/pay/${Date.now()}`,
        transactionId: `txn_${Date.now()}`
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
      console.log('[WEBHOOK RECEIVED]', payload);
      
      // Here we will validate the webhook signature and update the event status
      // ...
      
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
