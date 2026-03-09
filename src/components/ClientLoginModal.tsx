import React, { useState, useEffect } from 'react';
import { PLANS } from '@/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEvents } from '@/hooks/useEvents';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Switch } from '@/components/ui/switch';
import { User, Phone, Edit2, Calendar, Clock, Camera, ArrowLeft, Save, QrCode, CreditCard, Upload, Loader2 } from 'lucide-react';
import { Event, EventType } from '@/types';
import { QRCodeDisplay } from './QRCodeDisplay';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface ClientLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEventId?: string;
}

const EVENT_TYPES: { value: EventType; label: string; emoji: string }[] = [
  { value: 'casamento', label: 'Casamento', emoji: '💒' },
  { value: 'aniversario', label: 'Aniversário', emoji: '🎂' },
  { value: 'festa', label: 'Festa', emoji: '🎉' },
  { value: 'corporativo', label: 'Evento Corporativo', emoji: '💼' },
  { value: 'batizado', label: 'Batizado', emoji: '👶' },
  { value: 'formatura', label: 'Formatura', emoji: '🎓' },
  { value: 'churrasco', label: 'Churrasco', emoji: '🍖' },
  { value: 'outro', label: 'Outro', emoji: '✨' },
];

export function ClientLoginModal({ isOpen, onClose, initialEventId }: ClientLoginModalProps) {
  const [mode, setMode] = useState<'login' | 'manage' | 'edit'>('login');
  const [loginMethod, setLoginMethod] = useState<'name' | 'phone'>('phone');
  const [inputValue, setInputValue] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Event>>({});
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(localStorage.getItem('pendingPaymentEventId'));
  
  const { events, updateEvent, uploadPaymentReceipt, getEvent, loading } = useEvents();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && initialEventId) {
      const event = getEvent(initialEventId);
      if (event) {
        setSelectedEvent(event);
        setMode('manage');
      }
    } else if (!isOpen) {
      setMode('login');
      setInputValue('');
      setSelectedEvent(null);
    }
  }, [isOpen, initialEventId, getEvent]);

  // Check for pending payments when window gains focus
  useEffect(() => {
    const handleFocus = async () => {
      const pendingEventId = localStorage.getItem('pendingPaymentEventId');
      if (pendingEventId && isOpen && selectedEvent?.id === pendingEventId) {
        try {
          const response = await fetch('/api/payments/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: pendingEventId })
          });
          const data = await response.json();
          if (data.success) {
            localStorage.removeItem('pendingPaymentEventId');
            setPendingPaymentId(null);
            toast.success('Pagamento confirmado! Evento liberado.');
            // The real-time listener will update the event status automatically
          }
        } catch (error) {
          console.error('Failed to claim payment:', error);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen, selectedEvent]);

  const hasStarted = (event: Event) => {
    const [year, month, day] = event.eventDate.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    return new Date() >= startDate;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) {
      toast.error('Por favor, preencha o campo.');
      return;
    }

    const matchedEvent = events.find(event => {
      if (loginMethod === 'phone') {
        const cleanInput = inputValue.replace(/\D/g, '');
        const cleanPhone = event.clientPhone?.replace(/\D/g, '');
        return cleanPhone && cleanPhone === cleanInput;
      } else {
        return event.clientName.toLowerCase().includes(inputValue.toLowerCase());
      }
    });

    if (matchedEvent) {
      // Grant creator privileges on this device upon successful login
      const createdEvents = JSON.parse(localStorage.getItem('created_events') || '[]');
      if (!createdEvents.includes(matchedEvent.id)) {
        createdEvents.push(matchedEvent.id);
        localStorage.setItem('created_events', JSON.stringify(createdEvents));
      }
      
      setSelectedEvent(matchedEvent);
      setMode('manage');
    } else {
      toast.error('Nenhuma galeria encontrada com esses dados.');
    }
  };

  const handleStartEdit = () => {
    if (selectedEvent) {
      setEditFormData({
        eventName: selectedEvent.eventName,
        eventDate: selectedEvent.eventDate,
        eventTime: selectedEvent.eventTime,
        eventType: selectedEvent.eventType,
        description: selectedEvent.description,
      });
      setMode('edit');
    }
  };

  const handleSaveEdit = async () => {
    if (selectedEvent && selectedEvent.id) {
      try {
        await updateEvent(selectedEvent.id, editFormData);
        toast.success('Evento atualizado com sucesso!');
        setSelectedEvent({ ...selectedEvent, ...editFormData } as Event);
        setMode('manage');
      } catch (error) {
        toast.error('Erro ao atualizar evento.');
      }
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedEvent) {
      const file = e.target.files[0];
      try {
        setIsUploadingReceipt(true);
        toast.loading('Enviando comprovante...', { id: 'upload-receipt' });
        const fileUrl = await uploadToCloudinary(file);
        await uploadPaymentReceipt(selectedEvent.id, fileUrl);
        
        toast.dismiss('upload-receipt');
        toast.success('Comprovante enviado com sucesso!');
        // Update local state to reflect changes
        setSelectedEvent(prev => prev ? { 
          ...prev, 
          paymentStatus: 'paid', 
          status: 'active', 
          paymentReceiptUrl: fileUrl 
        } as Event : null);
      } catch (error) {
        console.error('Error uploading receipt:', error);
        toast.error('Erro ao enviar comprovante.');
      } finally {
        setIsUploadingReceipt(false);
      }
    }
  };

  if (isOpen && initialEventId && loading && !selectedEvent) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
          <p className="text-gray-500 text-sm">Carregando detalhes do evento...</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              {mode === 'login' && 'Acessar Minha Galeria'}
              {mode === 'manage' && 'Minha Galeria'}
              {mode === 'edit' && 'Editar Evento'}
            </DialogTitle>
          </DialogHeader>
          
          {mode === 'login' && (
            <>
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={loginMethod === 'phone' ? 'default' : 'outline'}
                  className={`flex-1 ${loginMethod === 'phone' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                  onClick={() => {
                    setLoginMethod('phone');
                    setInputValue('');
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Telefone
                </Button>
                <Button
                  type="button"
                  variant={loginMethod === 'name' ? 'default' : 'outline'}
                  className={`flex-1 ${loginMethod === 'name' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                  onClick={() => {
                    setLoginMethod('name');
                    setInputValue('');
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  Nome
                </Button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    {loginMethod === 'phone' ? 'Seu número de WhatsApp' : 'Seu Nome'}
                  </Label>
                  <Input
                    placeholder={loginMethod === 'phone' ? 'Ex: (11) 99999-9999' : 'Ex: Maria Silva'}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  Buscar Galeria
                </Button>
              </form>
            </>
          )}

          {mode === 'manage' && selectedEvent && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="font-bold text-lg text-purple-700 mb-1">{selectedEvent.eventName}</h3>
                <p className="text-sm text-gray-500 mb-4">{selectedEvent.clientName}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedEvent.eventDate).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    {selectedEvent.eventTime}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => setIsQRModalOpen(true)}
                  className="w-full bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code do Evento
                </Button>

                <Button 
                  onClick={() => {
                    onClose();
                    navigate(`/evento/${selectedEvent.id}`);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Ver Galeria
                </Button>

                <Button 
                  onClick={async () => {
                    if (!selectedEvent) return;
                    
                    if (selectedEvent.settings.isOneRealTestMode) {
                      const plan = PLANS.test;
                      if (plan && plan.link) {
                        localStorage.setItem('pendingPaymentEventId', selectedEvent.id);
                        setPendingPaymentId(selectedEvent.id);
                        window.open(plan.link, '_blank');
                      } else {
                        toast.error('Link de teste não disponível.');
                      }
                      return;
                    }

                    const basePlanKey = selectedEvent.plan || 'festa';
                    const planKey = basePlanKey;
                    const plan = PLANS[planKey as keyof typeof PLANS];
                    
                    try {
                      toast.loading('Gerando link de pagamento...', { id: 'payment-link' });
                      const response = await fetch('/api/payments/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          handle: 'crysramosfotografia',
                          items: [{
                            id: planKey,
                            description: plan.name,
                            amount: Math.round(plan.price * 100),
                            quantity: 1
                          }],
                          userId: selectedEvent.clientPhone,
                          plan: planKey,
                          eventId: selectedEvent.id
                        })
                      });
                      
                      const data = await response.json();
                      toast.dismiss('payment-link');
                      
                      if (data.success && data.paymentUrl) {
                        localStorage.setItem('pendingPaymentEventId', selectedEvent.id);
                        setPendingPaymentId(selectedEvent.id);
                        window.open(data.paymentUrl, '_blank');
                      } else {
                        // Fallback to static link if API fails or credentials missing
                        console.warn('API de pagamento falhou, usando link estático de fallback.');
                        if (plan && plan.link) {
                          localStorage.setItem('pendingPaymentEventId', selectedEvent.id);
                          setPendingPaymentId(selectedEvent.id);
                          // Try to append metadata to static link just in case InfinitePay supports it
                          try {
                            const url = new URL(plan.link);
                            url.searchParams.append('metadata', JSON.stringify({ eventId: selectedEvent.id }));
                            window.open(url.toString(), '_blank');
                          } catch (e) {
                            window.open(plan.link, '_blank');
                          }
                        } else {
                          toast.error('Link de pagamento não disponível para este plano.');
                        }
                      }
                    } catch (error) {
                      toast.dismiss('payment-link');
                      console.error('Erro ao gerar pagamento:', error);
                      // Fallback to static link
                      if (plan && plan.link) {
                        localStorage.setItem('pendingPaymentEventId', selectedEvent.id);
                        setPendingPaymentId(selectedEvent.id);
                        try {
                          const url = new URL(plan.link);
                          url.searchParams.append('metadata', JSON.stringify({ eventId: selectedEvent.id }));
                          window.open(url.toString(), '_blank');
                        } catch (e) {
                          window.open(plan.link, '_blank');
                        }
                      } else {
                        toast.error('Link de pagamento não disponível.');
                      }
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Realizar Pagamento
                </Button>

                {selectedEvent.paymentStatus !== 'paid' && (
                  <Button 
                    variant="outline"
                    disabled={isCheckingPayment}
                    onClick={async () => {
                      try {
                        setIsCheckingPayment(true);
                        toast.loading('Verificando pagamento...', { id: 'check-payment' });
                        const response = await fetch('/api/payments/claim', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ eventId: selectedEvent.id })
                        });
                        const data = await response.json();
                        
                        if (data.success) {
                          localStorage.removeItem('pendingPaymentEventId');
                          setPendingPaymentId(null);
                          toast.success('Pagamento confirmado! Evento liberado.', { id: 'check-payment' });
                          setSelectedEvent(prev => prev ? { ...prev, paymentStatus: 'paid', status: 'active' } as Event : null);
                        } else {
                          toast.error('Pagamento ainda não reconhecido pela InfinitePay. Isso pode levar alguns minutos. Se você já pagou, envie o comprovante abaixo para agilizar.', { id: 'check-payment', duration: 5000 });
                        }
                      } catch (error) {
                        console.error('Failed to claim payment:', error);
                        toast.error('Erro ao verificar pagamento.', { id: 'check-payment' });
                      } finally {
                        setIsCheckingPayment(false);
                      }
                    }}
                    className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  >
                    {isCheckingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      'Já realizei o pagamento (Verificar)'
                    )}
                  </Button>
                )}

                {selectedEvent.paymentStatus !== 'paid' && (
                  <div className="w-full">
                    <label className="w-full cursor-pointer">
                      <div className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
                        {isUploadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isUploadingReceipt ? 'Enviando...' : 'Enviar Comprovante'}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        className="hidden" 
                        onChange={handleReceiptUpload} 
                        disabled={isUploadingReceipt} 
                      />
                    </label>
                  </div>
                )}

                {!hasStarted(selectedEvent) ? (
                  <Button 
                    variant="outline" 
                    onClick={handleStartEdit}
                    className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar Detalhes
                  </Button>
                ) : (
                  <p className="text-xs text-center text-gray-400 italic">
                    O evento já iniciou ou passou, alterações não são mais permitidas.
                  </p>
                )}
              </div>
            </div>
          )}

          {mode === 'edit' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Evento</Label>
                <Input 
                  value={editFormData.eventName}
                  onChange={(e) => setEditFormData({ ...editFormData, eventName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input 
                    type="date"
                    value={editFormData.eventDate}
                    onChange={(e) => setEditFormData({ ...editFormData, eventDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input 
                    type="time"
                    value={editFormData.eventTime}
                    onChange={(e) => setEditFormData({ ...editFormData, eventTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
                <Select 
                  value={editFormData.eventType}
                  onValueChange={(val) => setEditFormData({ ...editFormData, eventType: val as EventType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.emoji} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea 
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setMode('manage')}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedEvent && (
        <QRCodeDisplay
          eventId={selectedEvent.id}
          eventName={selectedEvent.eventName}
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          frameSettings={selectedEvent.settings.frameSettings}
          status={selectedEvent.status}
          paymentReceiptUrl={selectedEvent.paymentReceiptUrl}
          isCreator={true}
        />
      )}
    </>
  );
}
