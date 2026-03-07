import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
    console.log('[PAYMENT API RESPONSE]', data);
    
    const paymentUrl = data.payment_url || data.pix_qr_code_url || data.url || (data.metadata && data.metadata.payment_url);

    if (!paymentUrl) {
      throw new Error('A API da InfinitePay não retornou um link de pagamento válido. Verifique as credenciais e o formato da requisição.');
    }

    res.json({
      success: true,
      paymentUrl: paymentUrl,
      transactionId: data.id
    });

  } catch (error: any) {
    console.error('[PAYMENT ERROR]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create payment' });
  }
}
