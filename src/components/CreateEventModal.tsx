import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Type, 
  FileText, 
  Camera, 
  ChevronDown, 
  CreditCard, 
  CheckCircle2, 
  Loader2,
  Palette,
  Type as TypeIcon,
  Layout,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FrameOverlay } from './FrameOverlay';
import type { EventType, EventSettings, FrameSettings } from '@/types';
import toast from 'react-hot-toast';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: string;
  isTestMode?: boolean;
  onCreate: (data: {
    clientName: string;
    clientPhone?: string;
    eventName: string;
    eventDate: string;
    eventTime: string;
    eventType: EventType;
    description: string;
    settings: EventSettings;
    plan: string;
  }) => void;
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

const PLANS = {
  intimo: { name: 'Íntimo', price: 59.99, limit: 50, storage: '7 dias' },
  festa: { name: 'Festa', price: 99.99, limit: 100, storage: '30 dias' },
  celebracao: { name: 'Celebração', price: 159.99, limit: 150, storage: '90 dias' },
  ilimitado: { name: 'Ilimitado', price: 239.99, limit: 'Ilimitados', storage: '6 meses' },
  test: { name: 'Teste Admin', price: 1.00, limit: 10, storage: '24 horas' }
};

const FRAME_TEMPLATES = [
  { id: 'https://lh3.googleusercontent.com/d/120rNh5NBi9PvY_39RhBXHPtgO-ebEQtN', name: 'Moldura 1', preview: '' },
  { id: 'https://lh3.googleusercontent.com/d/1FggHjWmgmc9vEhGioanZ3AOuwrczlHJy', name: 'Moldura 2', preview: '' },
  { id: 'https://lh3.googleusercontent.com/d/1HR57KOb3MsrbakmroB_A5p_5-2Gzc1pX', name: 'Moldura 3', preview: '' },
  { id: 'https://lh3.googleusercontent.com/d/1MiTQtunEjExr5rt-E29Rfe641KIl6pzy', name: 'Moldura 4', preview: '' },
  { id: 'https://lh3.googleusercontent.com/d/1Pj5xIiA8pgwcsJNWiITHw98q1C8E8dAW', name: 'Moldura 5', preview: '' },
  { id: 'https://lh3.googleusercontent.com/d/1_b1MF4Tctc5aegI5KplZAxYAOAOT0EgI', name: 'Moldura 6', preview: '' },
  { id: 'https://lh3.googleusercontent.com/d/1d9BLngmfACtXYzUW0meqOuRbnAnK6Y2B', name: 'Moldura 7', preview: '' },
  { id: 'https://lh3.googleusercontent.com/d/1lJK0OCBDafda1kedU3lt-If7us1iWAzg', name: 'Moldura 8', preview: '' },
  { id: 'https://lh3.googleusercontent.com/d/1mKl3ZdyBgE8-UTsXX0uTD2u7tPwwwntc', name: 'Moldura 9', preview: '' },
  { id: 'https://lh3.googleusercontent.com/d/1qfiljJNdrCpTm2KS0HqjM6_JL_0BkdDr', name: 'Moldura 10', preview: '' },
  { id: 'https://lh3.googleusercontent.com/d/1t8-igj8dualWINI6kQZlAZalPlLUD1OJ', name: 'Moldura 11', preview: '' },
  { id: 'https://lh3.googleusercontent.com/d/1uQUN0-Jmggl678plcCFQWRhXoppMOQ5j', name: 'Moldura 12', preview: '' },
];

export function CreateEventModal({ isOpen, onClose, selectedPlan = 'festa', isTestMode = false, onCreate }: CreateEventModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    eventName: '',
    eventDate: '',
    eventTime: '',
    eventType: '' as EventType,
    description: '',
  });
  const [settings, setSettings] = useState<EventSettings>({
    allowUploads: true,
    requireApproval: false,
    maxFileSize: 50,
    allowedTypes: ['image', 'video'],
    revealMode: 'immediate',
  });
  const [frameSettings, setFrameSettings] = useState<FrameSettings>({
    enabled: false,
    color: '#FFFFFF',
    font: 'font-playfair',
    text: '',
    templateId: FRAME_TEMPLATES[0].id,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const [localPlan, setLocalPlan] = useState(selectedPlan);

  // Sync localPlan when selectedPlan prop changes
  useEffect(() => {
    setLocalPlan(selectedPlan);
  }, [selectedPlan]);

  const activePlan = localPlan || 'festa';
  const planDetails = PLANS[activePlan as keyof typeof PLANS] || PLANS.festa;
  const totalPrice = isTestMode ? 0.00 : (planDetails.price + (frameSettings.enabled ? 9.99 : 0));

  const handleGeneratePayment = async (overridePrice?: number, isTestOverride?: boolean) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase!.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar logado para realizar o pagamento.');
        setIsSubmitting(false);
        return;
      }

      const finalPrice = overridePrice !== undefined ? overridePrice : totalPrice;
      const finalIsTest = isTestOverride !== undefined ? isTestOverride : isTestMode;

      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: "crysramosfotografia",
          items: [
            {
              quantity: 1,
              price: Math.round(finalPrice * 100), // Preço em centavos
              description: planDetails.name + (frameSettings.enabled ? ' + Moldura' : '')
            }
          ],
          userId: user.id,
          isTest: finalIsTest
        })
      });
      
      const data = await response.json();
      if (data.success && data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        toast.success('Link de pagamento gerado!');
      } else {
        throw new Error('Falha ao gerar pagamento');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao conectar com o servidor de pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFreeEvent = async () => {
    setIsSubmitting(true);
    try {
      // Simulate a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const generatedEventName = `${EVENT_TYPES.find(t => t.value === formData.eventType)?.label || 'Evento'} de ${formData.clientName}`;
      const generatedEventTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      onCreate({ 
        ...formData, 
        eventName: generatedEventName,
        eventTime: generatedEventTime,
        settings: { ...settings, frameSettings: frameSettings.enabled ? frameSettings : undefined }, 
        plan: activePlan 
      });
      
      toast.success('Evento de teste criado com sucesso!');
      resetForm();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar evento de teste');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setPaymentUrl(null);
    setFormData({
      clientName: '',
      clientPhone: '',
      eventName: '',
      eventDate: '',
      eventTime: '',
      eventType: '' as EventType,
      description: '',
    });
    setSettings({
      allowUploads: true,
      requireApproval: false,
      maxFileSize: 50,
      allowedTypes: ['image', 'video'],
      revealMode: 'immediate',
    });
    setFrameSettings({
      enabled: false,
      color: '#FFFFFF',
      font: 'font-playfair',
      text: '',
      templateId: FRAME_TEMPLATES[0].id,
    });
  };

  const isStep1Valid = formData.clientName && formData.clientPhone && formData.eventDate && formData.eventType;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {step === 1 ? 'Criar Novo Evento' : step === 2 ? 'Configurações' : step === 3 ? 'Moldura Personalizada' : 'Pagamento'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                step >= s ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{s}</div>
              {s < 4 && (
                <div className={`w-8 sm:w-12 h-1 rounded mx-1 transition-colors ${step > s ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><User className="w-4 h-4" />Seu Nome *</Label>
              <Input
                placeholder="Ex: Maria Silva"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><User className="w-4 h-4" />Número de WhatsApp *</Label>
              <Input
                placeholder="Ex: (11) 99999-9999"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
              />
              <p className="text-xs text-gray-500">Obrigatório para receber notificações sobre sua galeria.</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Camera className="w-4 h-4" />Tipo de Evento *</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) => setFormData({ ...formData, eventType: value as EventType })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o tipo de evento" /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2"><span>{type.emoji}</span><span>{type.label}</span></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" />Data *</Label>
              <Input type="date" value={formData.eventDate} onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })} />
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 flex items-start gap-3">
              <Clock className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">Duração do Evento</h4>
                <p className="text-sm text-purple-700">O evento durará 12 horas a partir da sua criação.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><FileText className="w-4 h-4" />Descrição</Label>
              <Textarea
                placeholder="Conte um pouco sobre o evento..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!isStep1Valid} className="bg-gradient-to-r from-purple-600 to-pink-600">
                Próximo<ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-semibold text-gray-800">Permitir Uploads</h4>
                <p className="text-sm text-gray-500">Convidados podem enviar fotos</p>
              </div>
              <Switch checked={settings.allowUploads} onCheckedChange={(checked) => setSettings({ ...settings, allowUploads: checked })} />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-semibold text-gray-800">Aprovação Manual</h4>
                <p className="text-sm text-gray-500">Você aprova cada foto antes de aparecer</p>
              </div>
              <Switch checked={settings.requireApproval} onCheckedChange={(checked) => setSettings({ ...settings, requireApproval: checked })} />
            </div>

            <div className="space-y-2">
              <Label>Pacote do Evento</Label>
              <Select value={activePlan} onValueChange={(value) => setLocalPlan(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PLANS)
                    .filter(([key]) => key !== 'test')
                    .map(([key, plan]) => (
                    <SelectItem key={key} value={key}>
                      {plan.name} - {plan.limit === 'Ilimitados' ? 'Acessos Ilimitados' : `Até ${plan.limit} acessos`} ({plan.storage})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipos de Arquivo Permitidos</Label>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const hasImage = settings.allowedTypes.includes('image');
                    const hasVideo = settings.allowedTypes.includes('video');
                    if (hasImage) {
                      setSettings({ ...settings, allowedTypes: hasVideo ? ['video'] : [] });
                    } else {
                      setSettings({ ...settings, allowedTypes: [...settings.allowedTypes, 'image'] });
                    }
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    settings.allowedTypes.includes('image') ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  📸 Fotos
                </button>
                <button
                  onClick={() => {
                    const hasImage = settings.allowedTypes.includes('image');
                    const hasVideo = settings.allowedTypes.includes('video');
                    if (hasVideo) {
                      setSettings({ ...settings, allowedTypes: hasImage ? ['image'] : [] });
                    } else {
                      setSettings({ ...settings, allowedTypes: [...settings.allowedTypes, 'video'] });
                    }
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    settings.allowedTypes.includes('video') ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  🎥 Vídeos
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quando as fotos aparecem?</Label>
              <Select value={settings.revealMode} onValueChange={(value: 'immediate' | 'delayed' | 'manual') => setSettings({ ...settings, revealMode: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Imediatamente</SelectItem>
                  <SelectItem value="delayed">Depois do evento (surpresa!)</SelectItem>
                  <SelectItem value="manual">Quando eu aprovar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)} disabled={settings.allowedTypes.length === 0} className="bg-gradient-to-r from-purple-600 to-pink-600">
                Próximo<ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl text-white shadow-lg">
              <div className="flex-1">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  Moldura Personalizada
                </h3>
                <p className="text-purple-100 text-sm mt-1">
                  Adicione uma moldura elegante e automática em todas as fotos do evento por apenas R$ 9,99 extras.
                </p>
              </div>
              <div className="ml-4">
                <Switch 
                  checked={frameSettings.enabled} 
                  onCheckedChange={(checked) => setFrameSettings({ ...frameSettings, enabled: checked })}
                  className="bg-white/20"
                />
              </div>
            </div>

            {frameSettings.enabled ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2"><Layout className="w-4 h-4" />Escolha sua Moldura</Label>
                    <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {FRAME_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setFrameSettings({ ...frameSettings, templateId: t.id })}
                          className={`relative aspect-video rounded-xl border-2 transition-all overflow-hidden group ${
                            frameSettings.templateId === t.id ? 'border-purple-600 ring-2 ring-purple-600/20' : 'border-gray-100 hover:border-gray-300'
                          }`}
                        >
                          {/* Visual Preview of the Frame */}
                          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                            <img 
                              src={t.id} 
                              alt={t.name}
                              className="w-full h-full object-cover opacity-70"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          
                          {/* Selection Indicator */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm py-1 text-center">
                            <span className="text-[10px] text-white font-medium uppercase tracking-wider">{t.name}</span>
                          </div>
                          
                          {frameSettings.templateId === t.id && (
                            <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-0.5 shadow-sm">
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Prévia da Moldura</Label>
                  <div className="aspect-[4/5] bg-gray-100 rounded-2xl relative overflow-hidden flex items-center justify-center border-4 border-white shadow-inner">
                    <FrameOverlay 
                      settings={{
                        ...frameSettings,
                        enabled: true
                      }}
                      className="w-full h-full"
                    >
                      <div className="flex flex-col items-center justify-center w-full h-full">
                        <Camera className="w-12 h-12 text-gray-300" />
                        <p className="text-xs text-gray-400 mt-2">Sua foto aqui</p>
                      </div>
                    </FrameOverlay>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Palette className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Ative a moldura para personalizar suas fotos!</p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={() => setStep(4)} className="bg-gradient-to-r from-purple-600 to-pink-600">
                Próximo: Pagamento<ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Resumo do Pedido</h3>
              <div className="space-y-1 mb-4">
                <p className="text-purple-700">Plano {planDetails.name} (Até {planDetails.limit} acessos)</p>
                <p className="text-xs text-purple-500">Fotos guardadas por {planDetails.storage}</p>
                {frameSettings.enabled && (
                  <p className="text-sm font-medium text-purple-800 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Adicional: Moldura Personalizada (+ R$ 9,99)
                  </p>
                )}
              </div>
              <div className="text-4xl font-bold text-purple-900 mb-2">
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </div>
              {isTestMode && (
                <span className="inline-block bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide">
                  Modo de Teste
                </span>
              )}
            </div>

            {!paymentUrl ? (
              isTestMode ? (
                <div className="space-y-4">
                  <p className="text-center text-gray-600 text-sm">
                    Você está no modo de teste administrativo. Escolha como deseja prosseguir:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleCreateFreeEvent} 
                      disabled={isSubmitting} 
                      className="flex-1 h-14 text-base sm:text-lg bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                      {isSubmitting ? 'Criando...' : 'Criar Grátis (Teste)'}
                    </Button>
                    <Button 
                      onClick={() => handleGeneratePayment(1.00, false)} 
                      disabled={isSubmitting} 
                      className="flex-1 h-14 text-base sm:text-lg bg-orange-500 hover:bg-orange-600 text-white font-bold"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
                      {isSubmitting ? 'Gerando...' : 'Pagar R$ 1,00 (Teste)'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-gray-600 text-sm">
                    Você será redirecionado para o ambiente seguro para concluir o pagamento via Pix ou Cartão de Crédito.
                  </p>
                  <Button 
                    onClick={() => handleGeneratePayment()} 
                    disabled={isSubmitting} 
                    className="w-full h-14 text-lg bg-[#00E676] hover:bg-[#00C853] text-black font-bold"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CreditCard className="w-6 h-6 mr-2" />}
                    {isSubmitting ? 'Gerando...' : 'Clique aqui para pagar'}
                  </Button>
                </div>
              )
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Link de Pagamento Pronto!</h3>
                <p className="text-gray-600 mb-6">
                  Escolha sua forma de pagamento (Pix ou Cartão) na página seguinte. Seu evento será liberado automaticamente após a confirmação.
                </p>
                <a 
                  href={paymentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-colors mb-4"
                >
                  Ir para Pagamento (Pix ou Cartão)
                </a>
                
                <button 
                  onClick={handleCreateFreeEvent}
                  disabled={isSubmitting}
                  className="text-sm text-gray-400 underline hover:text-gray-600"
                >
                  {isSubmitting ? 'Aguardando...' : '(Dev) Simular Pagamento Aprovado'}
                </button>
              </div>
            )}

            <div className="flex justify-start pt-4 border-t">
              <Button variant="ghost" onClick={() => { setStep(3); setPaymentUrl(null); }} disabled={isSubmitting}>
                Voltar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
