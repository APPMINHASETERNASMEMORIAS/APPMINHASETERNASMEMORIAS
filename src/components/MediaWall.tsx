import { useState, useEffect, useCallback } from 'react';
import { X, Download, Check, Trash2, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FrameOverlay } from './FrameOverlay';
import type { MediaItem, Event } from '@/types';

interface MediaWallProps {
  event: Event;
  media: MediaItem[];
  isAdmin?: boolean;
  onApprove?: (mediaId: string, approved: boolean) => void;
  onDelete?: (mediaId: string) => void;
}

function MediaItemCard({ item, event, isAdmin, onApprove, onDelete, onClick }: {
  item: MediaItem;
  event?: Event;
  isAdmin?: boolean;
  onApprove?: (mediaId: string, approved: boolean) => void;
  onDelete?: (mediaId: string) => void;
  onClick: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      )}

      {item.type === 'image' ? (
        <FrameOverlay settings={event?.settings?.frameSettings} className="w-full h-full">
          <img
            src={item.thumbnailUrl}
            alt={item.caption || 'Foto do evento'}
            className={`w-full h-full object-cover transition-all duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${isHovered ? 'scale-110' : 'scale-100'}`}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => setIsLoaded(true)}
          />
        </FrameOverlay>
      ) : (
        <div className="relative w-full h-full">
          <video src={item.url} className={`w-full h-full object-cover transition-all duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} preload="metadata" onLoadedData={() => setIsLoaded(true)} onError={() => setIsLoaded(true)} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center"><Video className="w-6 h-6 text-white" /></div>
          </div>
        </div>
      )}

      <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        {item.caption && <div className="absolute bottom-16 left-4 right-4"><p className="text-white text-sm line-clamp-2">{item.caption}</p></div>}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <span className="text-white/80 text-xs">{item.uploadedBy}</span>
          {isAdmin && (
            <div className="flex gap-2">
              {item.status === 'pending' && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onApprove?.(item.id, true); }} className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"><Check className="w-4 h-4 text-white" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onApprove?.(item.id, false); }} className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"><X className="w-4 h-4 text-white" /></button>
                </>
              )}
              <button onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }} className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center hover:bg-gray-700 transition-colors"><Trash2 className="w-4 h-4 text-white" /></button>
            </div>
          )}
        </div>
      </div>

      {isAdmin && item.status === 'pending' && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-yellow-500 text-white text-xs font-semibold">Pendente</div>
      )}
    </div>
  );
}

function Lightbox({ item, event, isOpen, onClose, onNext, onPrev, hasNext, hasPrev }: {
  item: MediaItem | null;
  event?: Event;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}) {
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-full flex items-center justify-center">
          <button onClick={onClose} className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"><X className="w-6 h-6 text-white" /></button>
          {hasPrev && <button onClick={onPrev} className="absolute left-4 z-50 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"><span className="text-white text-2xl">‹</span></button>}
          {hasNext && <button onClick={onNext} className="absolute right-4 z-50 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"><span className="text-white text-2xl">›</span></button>}
          {item.type === 'image' ? (
            <FrameOverlay settings={event?.settings?.frameSettings} className="max-w-full max-h-full">
              <img src={item.originalUrl} alt={item.caption || 'Foto'} className="w-full h-full object-contain" />
            </FrameOverlay>
          ) : (
            <video src={item.url} controls className="max-w-full max-h-full" autoPlay />
          )}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                {item.caption && <p className="text-white text-lg mb-1">{item.caption}</p>}
                <p className="text-white/60 text-sm">Enviado por {item.uploadedBy} • {new Date(item.uploadedAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10" onClick={() => { const link = document.createElement('a'); link.href = item.originalUrl; link.download = `foto-${item.id}.jpg`; link.click(); }}>
                <Download className="w-4 h-4 mr-2" />Baixar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MediaWall({ event, media, isAdmin, onApprove, onDelete }: MediaWallProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'pending'>('all');

  if (!event) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <p className="text-gray-500">Selecione um evento para visualizar as mídias.</p>
      </div>
    );
  }

  const filteredMedia = (media || []).filter((item) => {
    if (!item) return false;
    if (filter === 'all') return true;
    if (filter === 'pending') return item.status === 'pending';
    return item.type === filter;
  });

  const handleNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < filteredMedia.length - 1) setSelectedIndex(selectedIndex + 1);
  }, [selectedIndex, filteredMedia.length]);

  const handlePrev = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setSelectedIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, handleNext, handlePrev]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{event.eventName}</h2>
          <p className="text-gray-500">{filteredMedia.length} mídias no mural</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todas</button>
          <button onClick={() => setFilter('image')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${filter === 'image' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><ImageIcon className="w-4 h-4" />Fotos</button>
          <button onClick={() => setFilter('video')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${filter === 'video' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Video className="w-4 h-4" />Vídeos</button>
          {isAdmin && <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Pendentes</button>}
        </div>
      </div>

      {filteredMedia.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredMedia.map((item, index) => (
            item && <MediaItemCard key={item.id} item={item} event={event} isAdmin={isAdmin} onApprove={onApprove} onDelete={onDelete} onClick={() => setSelectedIndex(index)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center"><ImageIcon className="w-12 h-12 text-gray-400" /></div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Nenhuma mídia ainda</h3>
          <p className="text-gray-500 max-w-md mx-auto">Compartilhe o QR code do evento com seus convidados para que eles possam enviar fotos!</p>
        </div>
      )}

      <Lightbox
        item={selectedIndex !== null ? filteredMedia[selectedIndex] : null}
        event={event}
        isOpen={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
        onNext={handleNext}
        onPrev={handlePrev}
        hasNext={selectedIndex !== null && selectedIndex < filteredMedia.length - 1}
        hasPrev={selectedIndex !== null && selectedIndex > 0}
      />
    </div>
  );
}
