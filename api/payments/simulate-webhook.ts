import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse body string:', e);
      }
    }
    body = body || {};
    const { eventId, status, amount } = body;

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

    // Construct the webhook URL
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'];
    const webhookUrl = `${protocol}://${host}/api/payments/webhook`;

    console.log('[SIMULATION] Sending mock webhook to:', webhookUrl);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-infinitepay-signature': 'mock_signature'
      },
      body: JSON.stringify(mockPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SIMULATION ERROR]', response.status, errorText);
      return res.status(response.status).json({ error: `Webhook call failed: ${errorText}` });
    }

    const result = await response.json();
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('[SIMULATION ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
}
