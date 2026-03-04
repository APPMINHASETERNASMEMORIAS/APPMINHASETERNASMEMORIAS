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

const FONTS = [
  { name: 'Playfair', value: 'font-playfair' },
  { name: 'Dancing', value: 'font-dancing' },
  { name: 'Great Vibes', value: 'font-great-vibes' },
  { name: 'Cinzel', value: 'font-cinzel' },
  { name: 'Alex Brush', value: 'font-alex-brush' },
  { name: 'Satisfy', value: 'font-satisfy' },
  { name: 'Parisienne', value: 'font-parisienne' },
  { name: 'Cormorant', value: 'font-cormorant' },
  { name: 'Libre', value: 'font-libre' },
  { name: 'Poppins', value: 'font-poppins' },
];

const FRAME_TEMPLATES = [
  { id: 'minimal', name: 'Minimalista', preview: 'border-2' },
  { id: 'floral', name: 'Floral', preview: 'border-4 border-double' },
  { id: 'modern', name: 'Moderno', preview: 'border-8 border-black/5' },
  { id: 'classic', name: 'Clássico', preview: 'outline outline-4 outline-offset-[-12px]' },
];

const COLORS = [
  '#000000', '#FFFFFF', '#FFD700', '#C0C0C0', '#FF69B4', '#8A2BE2', '#4169E1', '#2E8B57', '#FF4500', '#704214'
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
    color: '#FFD700',
    font: 'font-playfair',
    text: '',
    templateId: 'minimal',
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
  const totalPrice = isTestMode ? 1.00 : (planDetails.price + (frameSettings.enabled ? 9.99 : 0));

  const handleGeneratePayment = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: activePlan,
          amount: totalPrice,
          isTest: isTestMode,
          hasFrame: frameSettings.enabled
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
      toast.error('Erro ao conectar com a InfinitePay');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulatePaymentSuccess = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('Pagamento aprovado!');
    
    const generatedEventName = `${EVENT_TYPES.find(t => t.value === formData.eventType)?.label || 'Evento'} de ${formData.clientName}`;
    const generatedEventTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    onCreate({ 
      ...formData, 
      eventName: generatedEventName,
      eventTime: generatedEventTime,
      settings: { ...settings, frameSettings: frameSettings.enabled ? frameSettings : undefined }, 
      plan: activePlan 
    });
    setIsSubmitting(false);
    resetForm();
    onClose();
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
      color: '#FFD700',
      font: 'font-playfair',
      text: '',
      templateId: 'minimal',
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
                    <Label className="flex items-center gap-2"><Layout className="w-4 h-4" />Modelo da Moldura</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {FRAME_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setFrameSettings({ ...frameSettings, templateId: t.id })}
                          className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                            frameSettings.templateId === t.id ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2"><Palette className="w-4 h-4" />Cor Principal</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setFrameSettings({ ...frameSettings, color: c })}
                          className={`w-8 h-8 rounded-full border-2 transition-transform ${
                            frameSettings.color === c ? 'scale-125 border-purple-600' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2"><TypeIcon className="w-4 h-4" />Fonte do Texto</Label>
                    <Select value={frameSettings.font} onValueChange={(v) => setFrameSettings({ ...frameSettings, font: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONTS.map((f) => (
                          <SelectItem key={f.value} value={f.value} className={f.value}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2"><FileText className="w-4 h-4" />Texto na Moldura</Label>
                    <Input 
                      placeholder="Ex: Maria & João 2024" 
                      value={frameSettings.text}
                      onChange={(e) => setFrameSettings({ ...frameSettings, text: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Prévia da Moldura</Label>
                  <div className="aspect-[4/5] bg-gray-100 rounded-2xl relative overflow-hidden flex items-center justify-center border-4 border-white shadow-inner">
                    <div 
                      className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
                        FRAME_TEMPLATES.find(t => t.id === frameSettings.templateId)?.preview
                      }`}
                      style={{ borderColor: frameSettings.color, color: frameSettings.color }}
                    >
                      <div className="absolute bottom-6 left-0 right-0 text-center px-4">
                        <p className={`${frameSettings.font} text-xl font-medium drop-shadow-sm`}>
                          {frameSettings.text || 'Seu Texto Aqui'}
                        </p>
                      </div>
                    </div>
                    <Camera className="w-12 h-12 text-gray-300" />
                    <p className="text-xs text-gray-400 mt-16 absolute">Sua foto aqui</p>
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
              <div className="space-y-4">
                <p className="text-center text-gray-600 text-sm">
                  Você será redirecionado para o ambiente seguro da InfinitePay para concluir o pagamento via Pix ou Cartão de Crédito.
                </p>
                <Button 
                  onClick={handleGeneratePayment} 
                  disabled={isSubmitting} 
                  className="w-full h-14 text-lg bg-[#00E676] hover:bg-[#00C853] text-black font-bold"
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CreditCard className="w-6 h-6 mr-2" />}
                  {isSubmitting ? 'Gerando...' : 'Pagar com InfinitePay'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Link Gerado!</h3>
                <p className="text-gray-600 mb-6">
                  Clique no botão abaixo para abrir a página de pagamento. Seu evento será liberado automaticamente após a confirmação.
                </p>
                <a 
                  href={paymentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-colors mb-4"
                >
                  Abrir Página de Pagamento
                </a>
                
                <button 
                  onClick={handleSimulatePaymentSuccess}
                  disabled={isSubmitting}
                  className="text-sm text-gray-400 underline hover:text-gray-600"
                >
                  {isSubmitting ? 'Aguardando...' : '(Dev) Simular Pagamento Aprovado'}
                </button>
              </div>
            )}

            <div className="flex justify-start pt-4 border-t">
              <Button variant="ghost" onClick={() => setStep(3)} disabled={isSubmitting || !!paymentUrl}>
                Voltar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
