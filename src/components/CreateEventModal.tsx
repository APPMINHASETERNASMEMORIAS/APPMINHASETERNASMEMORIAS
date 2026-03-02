import { useState } from 'react';
import { Calendar, Clock, User, Type, FileText, Camera, ChevronDown } from 'lucide-react';
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
import type { EventType, EventSettings } from '@/types';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    clientName: string;
    eventName: string;
    eventDate: string;
    eventTime: string;
    eventType: EventType;
    description: string;
    settings: EventSettings;
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

export function CreateEventModal({ isOpen, onClose, onCreate }: CreateEventModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clientName: '',
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onCreate({ ...formData, settings });
    setIsSubmitting(false);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      clientName: '',
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
  };

  const isStep1Valid = formData.clientName && formData.eventName && formData.eventDate && formData.eventTime && formData.eventType;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {step === 1 ? 'Criar Novo Evento' : 'Configurações do Evento'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-4 mb-6">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            step >= 1 ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>1</div>
          <div className={`w-16 h-1 rounded ${step >= 2 ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gray-200'}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
            step >= 2 ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>2</div>
        </div>

        {step === 1 ? (
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
              <Label className="flex items-center gap-2"><Type className="w-4 h-4" />Nome do Evento *</Label>
              <Input
                placeholder="Ex: Nosso Casamento"
                value={formData.eventName}
                onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
              />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" />Data *</Label>
                <Input type="date" value={formData.eventDate} onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Clock className="w-4 h-4" />Horário *</Label>
                <Input type="time" value={formData.eventTime} onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })} />
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
        ) : (
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
              <Label>Tamanho Máximo do Arquivo</Label>
              <Select value={settings.maxFileSize.toString()} onValueChange={(value) => setSettings({ ...settings, maxFileSize: parseInt(value) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 MB</SelectItem>
                  <SelectItem value="30">30 MB</SelectItem>
                  <SelectItem value="50">50 MB</SelectItem>
                  <SelectItem value="100">100 MB</SelectItem>
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
              <Button onClick={handleSubmit} disabled={isSubmitting || settings.allowedTypes.length === 0} className="bg-gradient-to-r from-purple-600 to-pink-600">
                {isSubmitting ? 'Criando...' : 'Criar Evento'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
