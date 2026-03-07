import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
}
