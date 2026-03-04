import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useEvents } from '@/hooks/useEvents';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Phone } from 'lucide-react';

interface ClientLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClientLoginModal({ isOpen, onClose }: ClientLoginModalProps) {
  const [loginMethod, setLoginMethod] = useState<'name' | 'phone'>('phone');
  const [inputValue, setInputValue] = useState('');
  const { events } = useEvents();
  const navigate = useNavigate();

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
      toast.success('Galeria encontrada!');
      onClose();
      navigate(`/evento/${matchedEvent.id}`);
    } else {
      toast.error('Nenhuma galeria encontrada com esses dados.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Acessar Minha Galeria</DialogTitle>
        </DialogHeader>
        
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
      </DialogContent>
    </Dialog>
  );
}
