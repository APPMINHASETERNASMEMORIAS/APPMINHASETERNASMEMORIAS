import { useState } from 'react';
import { Calendar, Clock, Image, Video, Eye, QrCode, MoreVertical, Edit, Trash2, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
  onView: () => void;
  onQRCode: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

const EVENT_TYPE_EMOJI: Record<string, string> = {
  casamento: '💒', aniversario: '🎂', festa: '🎉', corporativo: '💼',
  batizado: '👶', formatura: '🎓', churrasco: '🍖', outro: '✨',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  casamento: 'Casamento', aniversario: 'Aniversário', festa: 'Festa',
  corporativo: 'Corporativo', batizado: 'Batizado', formatura: 'Formatura',
  churrasco: 'Churrasco', outro: 'Outro',
};

export function EventCard({ event, onView, onQRCode, onEdit, onDelete, onToggleStatus }: EventCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="group bg-white rounded-3xl shadow-lg overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
      <div className="relative h-48 overflow-hidden">
        {!imageLoaded && <div className="absolute inset-0 bg-gradient-to-br from-purple-200 to-pink-200 animate-pulse" />}
        <img
          src={'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800'}
          alt={event.eventName}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
        />
        
        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold ${
          event.status === 'active' ? 'bg-green-500 text-white' : event.status === 'paused' ? 'bg-yellow-500 text-white' : 'bg-gray-500 text-white'
        }`}>
          {event.status === 'active' ? 'Ativo' : event.status === 'paused' ? 'Pausado' : 'Encerrado'}
        </div>

        <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm">
          <span className="mr-1">{EVENT_TYPE_EMOJI[event.eventType]}</span>
          <span className="text-gray-700">{EVENT_TYPE_LABEL[event.eventType]}</span>
        </div>

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Button onClick={onView} variant="secondary" size="sm" className="rounded-full">
            <Eye className="w-4 h-4 mr-2" />Ver Mural
          </Button>
          <Button onClick={onQRCode} size="sm" className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
            <QrCode className="w-4 h-4 mr-2" />QR Code
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">{event.eventName}</h3>
            <p className="text-sm text-gray-500">de {event.clientName}</p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full"><MoreVertical className="w-5 h-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleStatus}>
                {event.status === 'active' ? <><Pause className="w-4 h-4 mr-2" />Pausar</> : <><Play className="w-4 h-4 mr-2" />Ativar</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>{formatDate(event.eventDate)}</span></div>
          <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>{event.eventTime}</span></div>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><Image className="w-4 h-4 text-purple-600" /></div>
            <span className="font-semibold">{event.stats.totalPhotos}</span><span className="text-gray-400">fotos</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center"><Video className="w-4 h-4 text-pink-600" /></div>
            <span className="font-semibold">{event.stats.totalVideos}</span><span className="text-gray-400">vídeos</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 ml-auto">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><Eye className="w-4 h-4 text-amber-600" /></div>
            <span className="font-semibold">{event.stats.totalViews}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
