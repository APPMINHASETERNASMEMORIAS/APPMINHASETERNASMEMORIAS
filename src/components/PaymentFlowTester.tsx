import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEvents } from '@/hooks/useEvents';
import { Loader2, Play, Pause, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export function PaymentFlowTester() {
  const { createEvent, events, updateEvent } = useEvents();
  const [testEventId, setTestEventId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  const testEvent = events.find(e => e.id === testEventId);

  // Simulate 5-minute timer (scaled down to 30 seconds for testing)
  useEffect(() => {
    // Stop timer if event is not found, or if it's already paid, or if it's paused
    if (!testEvent || testEvent.paymentStatus === 'paid' || testEvent.status === 'paused') return;

    // Start timer if not started
    if (timeLeft === null) {
      setTimeLeft(30); // 30 seconds for test
    }

    if (timeLeft === 0) {
      // Time's up! Pause event if not paid
      handleTimeExpired();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [testEvent, timeLeft]);

  const handleCreateTestEvent = async () => {
    setIsCreating(true);
    try {
      const newEvent = await createEvent({
        clientName: 'Teste de Fluxo',
        clientPhone: '11999999999',
        eventName: `Evento Teste ${new Date().toLocaleTimeString()}`,
        eventDate: new Date().toISOString().split('T')[0],
        eventTime: '12:00',
        eventType: 'festa',
        description: 'Evento para teste de fluxo de pagamento',
        settings: {
          allowUploads: true,
          requireApproval: false,
          maxFileSize: 50,
          allowedTypes: ['image', 'video'],
          revealMode: 'immediate',
        },
        plan: 'festa'
      });
      
      setTestEventId(newEvent.id);
      setTimeLeft(30); // Reset timer
      toast.success('Evento de teste criado! Aguardando pagamento...');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar evento de teste');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTimeExpired = async () => {
    if (!testEventId) return;
    
    // Double check current status to avoid race conditions
    const currentEvent = events.find(e => e.id === testEventId);
    if (currentEvent && currentEvent.paymentStatus === 'paid') return;
    
    try {
      await updateEvent(testEventId, { status: 'paused' });
      toast.error('Tempo esgotado! Evento pausado por falta de pagamento.');
      setTimeLeft(null);
    } catch (error) {
      console.error(error);
    }
  };

  const simulatePayment = async () => {
    if (!testEventId) return;
    setIsSimulatingPayment(true);

    // Optimistic update to prevent race condition with timer
    // We immediately set it to paid locally so the timer stops
    updateEvent(testEventId, { status: 'active', paymentStatus: 'paid' });

    try {
      // Simulate webhook call
      const response = await fetch('/api/payments/simulate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: testEventId,
          status: 'approved',
          amount: 5990
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Pagamento simulado! O status deve atualizar em breve.');
      } else {
        toast.error('Falha na simulação: ' + data.error);
        // Revert optimistic update if failed
        updateEvent(testEventId, { status: 'active', paymentStatus: 'pending' });
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao simular pagamento');
      // Revert optimistic update if failed
      updateEvent(testEventId, { status: 'active', paymentStatus: 'pending' });
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  return (
    <Card className="mt-8 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Play className="w-5 h-5" />
          Simulador de Fluxo de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-700 mb-4">
          Este teste cria um evento, aguarda 30 segundos (simulando 5 min) e pausa se não houver pagamento.
          Se o pagamento for confirmado via webhook, o evento permanece ativo.
        </p>

        {!testEvent ? (
          <Button 
            onClick={handleCreateTestEvent} 
            disabled={isCreating}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Iniciar Teste
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-100">
              <div>
                <h3 className="font-bold text-gray-800">{testEvent.eventName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                    testEvent.status === 'active' && testEvent.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                    testEvent.status === 'paused' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {testEvent.status === 'active' && testEvent.paymentStatus === 'paid' ? 'Ativo (Pago)' :
                     testEvent.status === 'paused' ? 'Pausado (Não Pago)' :
                     'Aguardando Pagamento'}
                  </span>
                  {testEvent.status === 'active' && testEvent.paymentStatus === 'pending' && timeLeft !== null && (
                    <span className="text-sm font-mono text-orange-600">
                      Tempo restante: {timeLeft}s
                    </span>
                  )}
                </div>
              </div>
              
              {testEvent.status === 'active' && testEvent.paymentStatus === 'pending' && (
                <Button 
                  onClick={simulatePayment}
                  disabled={isSimulatingPayment}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSimulatingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Simular Pagamento (Webhook)
                </Button>
              )}
            </div>

            {testEvent.status === 'paused' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="text-sm">
                    O evento foi pausado automaticamente por falta de pagamento.
                  </p>
                </div>
                
                {testEvent.clientPhone && (
                  <Button 
                    variant="outline"
                    className="w-full border-green-500 text-green-600 hover:bg-green-50"
                    onClick={() => {
                      const message = `Olá! Notamos que o pagamento para o seu evento "${testEvent.eventName}" ainda não foi confirmado. Sua galeria foi pausada temporariamente. Assim que o pagamento for confirmado, ela será ativada automaticamente!`;
                      const whatsappUrl = `https://api.whatsapp.com/send?phone=${testEvent.clientPhone.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                  >
                    <svg className="w-4 h-4 mr-2 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Enviar Mensagem via WhatsApp
                  </Button>
                )}
              </div>
            )}

            {testEvent.status === 'active' && testEvent.paymentStatus === 'paid' && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-sm">
                  Pagamento confirmado! O evento está liberado e ativo.
                </p>
              </div>
            )}

            <Button variant="outline" onClick={() => {
              setTestEventId(null);
              setTimeLeft(null);
            }} className="w-full">
              Reiniciar Teste
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
