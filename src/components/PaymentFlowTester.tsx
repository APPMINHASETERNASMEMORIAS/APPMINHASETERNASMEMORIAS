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
    if (!testEvent || testEvent.status !== 'pending') return;

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
    
    // Check if already paid (active)
    // In this simulation, we assume 'pending' means not paid yet.
    // If status became 'active' via webhook, this wouldn't run (due to useEffect check).
    
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
        // The useEvents hook subscription should update the UI automatically
      } else {
        toast.error('Falha na simulação: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao simular pagamento');
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
                    testEvent.status === 'active' ? 'bg-green-100 text-green-700' :
                    testEvent.status === 'paused' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {testEvent.status === 'active' ? 'Ativo (Pago)' :
                     testEvent.status === 'paused' ? 'Pausado (Não Pago)' :
                     'Aguardando Pagamento'}
                  </span>
                  {testEvent.status === 'pending' && timeLeft !== null && (
                    <span className="text-sm font-mono text-orange-600">
                      Tempo restante: {timeLeft}s
                    </span>
                  )}
                </div>
              </div>
              
              {testEvent.status === 'pending' && (
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
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm">
                  O evento foi pausado automaticamente. Uma mensagem seria enviada ao WhatsApp do cliente.
                </p>
              </div>
            )}

            {testEvent.status === 'active' && (
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
