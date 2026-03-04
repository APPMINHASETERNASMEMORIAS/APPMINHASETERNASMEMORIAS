import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEvents } from '@/hooks/useEvents';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Phone, Edit2, Calendar, Clock, Camera, ArrowLeft, Save, QrCode } from 'lucide-react';
import { Event, EventType } from '@/types';
import { QRCodeDisplay } from './QRCodeDisplay';

interface ClientLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function ClientLoginModal({ isOpen, onClose }: ClientLoginModalProps) {
  const [mode, setMode] = useState<'login' | 'manage' | 'edit'>('login');
  const [loginMethod, setLoginMethod] = useState<'name' | 'phone'>('phone');
  const [inputValue, setInputValue] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Event>>({});
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  const { events, updateEvent } = useEvents();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setMode('login');
      setInputValue('');
      setSelectedEvent(null);
    }
  }, [isOpen]);

  const hasStarted = (event: Event) => {
    const eventDateTime = new Date(`${event.eventDate}T${event.eventTime}`);
    return new Date() >= eventDateTime;
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
        />
      )}
    </>
  );
}
