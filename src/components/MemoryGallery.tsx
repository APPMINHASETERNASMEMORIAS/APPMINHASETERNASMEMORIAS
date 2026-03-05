import React, { useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Heart, MessageCircle, PlayCircle, Trash2, Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { FrameOverlay } from './FrameOverlay';
import { Event } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface Memory {
  id: string;
  created_at: string;
  url: string;
  type: 'image' | 'video';
  uploader_name: string;
  message: string | null;
  event_id: string | null;
  likes_count: number;
  uploader_id: string | null;
}

// Helper to extract frame settings from memory message or fallback to event settings
const getMemoryFrame = (memory: Memory, eventSettings?: any) => {
  if (!memory.message) return eventSettings;

  const frameMatch = memory.message.match(/Frame: (https?:\/\/[^\s]+)/);
  if (frameMatch) {
    return {
      enabled: true,
      templateId: frameMatch[1],
      // We don't have color/font/text for per-photo frames
    };
  }
  
  return eventSettings;
};

// Helper to clean the message for display
const getCleanMessage = (message: string | null) => {
  if (!message) return null;
  return message.replace(/\n?Frame: https?:\/\/[^\s]+/, '').trim();
};

export function MemoryGallery({ eventId, refreshTrigger, event }: { eventId?: string, refreshTrigger: number, event?: Event }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isLightboxVideoPlaying, setIsLightboxVideoPlaying] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [numCols, setNumCols] = useState(2);
  
  const memoriesRef = useRef<Memory[]>([]);
  const lightboxVideoRef = useRef<HTMLVideoElement>(null);
  const uploaderId = localStorage.getItem('memory_uploader_id');

  // Responsive Columns for Masonry
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1280) setNumCols(5);
      else if (width >= 1024) setNumCols(4);
      else if (width >= 768) setNumCols(3);
      else setNumCols(2);
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Rotate Featured Memory
  useEffect(() => {
    if (memories.length === 0) return;
    const interval = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % memories.length);
    }, 8000); // Change every 8 seconds
    return () => clearInterval(interval);
  }, [memories.length]);

  // Auto-play video when lightbox opens
  useEffect(() => {
    if (selectedMemory?.type === 'video') {
      const timer = setTimeout(() => {
        if (lightboxVideoRef.current) {
          lightboxVideoRef.current.play().catch(err => {
            console.log("Autoplay blocked or failed:", err);
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedMemory]);

  const handleLike = async (memoryId: string, currentLikes: number) => {
    if (!isSupabaseConfigured) return;
    
    setMemories(prev => prev.map(m => 
      m.id === memoryId ? { ...m, likes_count: (m.likes_count || 0) + 1 } : m
    ));

    try {
      const { error } = await supabase!
        .from('memories')
        .update({ likes_count: (currentLikes || 0) + 1 })
        .eq('id', memoryId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao curtir:', error);
      setMemories(prev => prev.map(m => 
        m.id === memoryId ? { ...m, likes_count: currentLikes } : m
      ));
    }
  };

  const handleDelete = async (memoryId: string) => {
    if (!isSupabaseConfigured) return;
    if (!window.confirm('Tem certeza que deseja excluir esta memória?')) return;

    try {
      const { error } = await supabase!
        .from('memories')
        .delete()
        .eq('id', memoryId)
        .eq('uploader_id', uploaderId);

      if (error) throw error;
      
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      toast.success('Memória excluída com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Não foi possível excluir a memória.');
    }
  };

  useEffect(() => {
    memoriesRef.current = memories;
  }, [memories]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const fetchMemories = async (isBackground = false) => {
      try {
        let query = supabase!
          .from('memories')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (eventId) {
          query = query.eq('event_id', eventId);
        }

        const { data, error } = await query;
        
        if (error) {
          if (error.message.includes('event_id')) {
            const fallbackQuery = supabase!
              .from('memories')
              .select('*')
              .order('created_at', { ascending: false });
            const { data: fallbackData, error: fallbackError } = await fallbackQuery;
            if (fallbackError) throw fallbackError;
            mergeMemories(fallbackData || []);
            return;
          }
          throw error;
        }
        
        mergeMemories(data || []);
      } catch (error) {
        console.error('Erro ao buscar memórias:', error);
      } finally {
        if (!isBackground) {
          setIsLoading(false);
        }
      }
    };

    const mergeMemories = (fetchedMemories: Memory[]) => {
      const now = new Date().getTime();
      const currentMemories = memoriesRef.current;
      
      const recentLocalMemories = currentMemories.filter(localMem => {
        const memTime = new Date(localMem.created_at).getTime();
        const isRecent = (now - memTime) < 15000;
        const existsInDb = fetchedMemories.some(dbMem => dbMem.id === localMem.id);
        return isRecent && !existsInDb;
      });

      const merged = [...recentLocalMemories, ...fetchedMemories];
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const uniqueMemories = merged.filter((mem, index, self) => 
        index === self.findIndex((m) => m.id === mem.id)
      );

      setMemories(uniqueMemories);
    };

    fetchMemories();

    const pollInterval = setInterval(() => {
      fetchMemories(true);
    }, 5000);

    const channel = supabase!
      .channel('public:memories')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'memories',
        },
        (payload) => {
          const newMemory = payload.new as Memory;
          if (eventId && newMemory.event_id !== eventId) return;

          setMemories((current) => {
            if (current.some(m => m.id === newMemory.id)) return current;
            return [newMemory, ...current];
          });
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase!.removeChannel(channel);
    };
  }, [refreshTrigger, eventId]);

  // Distribute memories into columns for Masonry
  const columns = Array.from({ length: numCols }, () => [] as Memory[]);
  memories.forEach((mem, i) => {
    columns[i % numCols].push(mem);
  });

  const featuredMemory = memories.length > 0 ? memories[featuredIndex % memories.length] : null;

  if (!isSupabaseConfigured) {
    return (
      <div className="text-center p-12 bg-purple-50 rounded-3xl border border-purple-100">
        <Heart className="w-12 h-12 text-purple-300 mx-auto mb-4" />
        <h3 className="text-xl font-playfair font-semibold text-purple-900 mb-2">
          Galeria em Construção
        </h3>
        <p className="text-purple-600 max-w-md mx-auto">
          Assim que o banco de dados (Supabase) for conectado, as fotos e vídeos enviados pelos convidados aparecerão aqui.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-xl font-playfair font-semibold text-gray-900 mb-2">
          Nenhuma memória ainda
        </h3>
        <p className="text-gray-500">
          Seja o primeiro a compartilhar uma foto ou vídeo deste momento especial!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Hero / Featured Section */}
      <div className="relative w-full h-[50vh] md:h-[60vh] overflow-hidden bg-black group mb-0">
        <div className="absolute inset-0 bg-black/40 z-10" />
        
        {/* Animated Background Image */}
        <AnimatePresence mode="wait">
          {featuredMemory && (
            <motion.div 
              key={featuredMemory.id} 
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
            >
               {featuredMemory.type === 'video' ? (
                  <video
                    src={featuredMemory.url}
                    className="w-full h-full object-cover opacity-60 blur-sm"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
               ) : (
                  <motion.img
                    src={featuredMemory.url}
                    alt="Destaque"
                    className="w-full h-full object-cover opacity-60 blur-sm"
                    animate={{ scale: [1, 1.1] }}
                    transition={{ duration: 10, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                  />
               )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Featured Content */}
        <AnimatePresence mode="wait">
          {featuredMemory && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
              <motion.div 
                key={featuredMemory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8 }}
                className="relative max-h-full max-w-4xl shadow-2xl cursor-pointer"
                onClick={() => setSelectedMemory(featuredMemory)}
              >
                <FrameOverlay settings={getMemoryFrame(featuredMemory, event?.settings?.frameSettings)} className="rounded-lg overflow-hidden shadow-2xl border-4 border-white/20">
                  {featuredMemory.type === 'video' ? (
                    <video
                      src={featuredMemory.url}
                      className="max-h-[40vh] md:max-h-[50vh] w-auto object-contain rounded-lg"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={featuredMemory.url}
                      alt="Destaque Principal"
                      className="max-h-[40vh] md:max-h-[50vh] w-auto object-contain rounded-lg"
                    />
                  )}
                </FrameOverlay>
                
                {/* Featured Caption */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white text-center">
                  <p className="font-playfair text-2xl md:text-3xl font-bold mb-2 drop-shadow-lg">
                    {featuredMemory.uploader_name}
                  </p>
                  {getCleanMessage(featuredMemory.message) && (
                    <p className="text-white/90 italic text-lg drop-shadow-md">
                      "{getCleanMessage(featuredMemory.message)}"
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Masonry Grid - No Gaps */}
      <div className="flex gap-0">
        {columns.map((col, colIndex) => (
          <div key={colIndex} className="flex-1 flex flex-col gap-0">
            {col.map((memory) => (
              <div 
                key={memory.id} 
                className="relative group cursor-pointer overflow-hidden bg-gray-100"
                onClick={() => setSelectedMemory(memory)}
              >
                {/* Media */}
                <div className="w-full">
                  {memory.type === 'video' ? (
                    <div className="relative w-full aspect-[3/4]">
                      <video
                        src={memory.url}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        onMouseOver={(e) => e.currentTarget.play()}
                        onMouseOut={(e) => e.currentTarget.pause()}
                      />
                      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm p-1.5 rounded-full text-white pointer-events-none">
                        <PlayCircle className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <FrameOverlay settings={getMemoryFrame(memory, event?.settings?.frameSettings)} className="w-full h-auto">
                      <img
                        src={memory.url}
                        alt={`Memória de ${memory.uploader_name}`}
                        className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    </FrameOverlay>
                  )}
                </div>

                {/* Overlay Info */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                  <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white font-bold text-sm truncate">
                      {memory.uploader_name}
                    </p>
                    {getCleanMessage(memory.message) && (
                      <p className="text-white/80 text-xs line-clamp-2 italic mt-0.5">
                        {getCleanMessage(memory.message)}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(memory.id, memory.likes_count);
                        }}
                        className="flex items-center gap-1 text-white hover:text-red-400 transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${memory.likes_count > 0 ? 'fill-current text-red-500' : ''}`} />
                        <span className="text-xs">{memory.likes_count || 0}</span>
                      </button>
                      
                      {uploaderId === memory.uploader_id && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(memory.id);
                          }}
                          className="text-white/60 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedMemory && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
          onClick={() => setSelectedMemory(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-10"
            onClick={() => setSelectedMemory(null)}
          >
            <X className="w-8 h-8" />
          </button>

          <div 
            className="relative max-w-5xl w-full max-h-full flex flex-col items-center gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black flex items-center justify-center group/lightbox">
              {selectedMemory.type === 'video' ? (
                <>
                  <video
                    ref={lightboxVideoRef}
                    src={selectedMemory.url}
                    className="max-w-full max-h-[70vh] rounded-lg cursor-pointer"
                    controls
                    autoPlay
                    playsInline
                    onPlay={() => setIsLightboxVideoPlaying(true)}
                    onPause={() => setIsLightboxVideoPlaying(false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (lightboxVideoRef.current) {
                        if (lightboxVideoRef.current.paused) {
                          lightboxVideoRef.current.play();
                        } else {
                          lightboxVideoRef.current.pause();
                        }
                      }
                    }}
                  />
                </>
              ) : (
                <div className="relative inline-block max-w-full max-h-[70vh]">
                  <FrameOverlay settings={getMemoryFrame(selectedMemory, event?.settings?.frameSettings)}>
                    <img
                      src={selectedMemory.url}
                      alt={`Memória de ${selectedMemory.uploader_name}`}
                      className="max-w-full max-h-[70vh] block rounded-lg"
                    />
                  </FrameOverlay>
                </div>
              )}
            </div>

            <div className="w-full max-w-2xl text-center space-y-4">
              {getCleanMessage(selectedMemory.message) && (
                <p className="text-white text-lg sm:text-xl font-medium italic leading-relaxed">
                  "{getCleanMessage(selectedMemory.message)}"
                </p>
              )}
              <div className="flex flex-col items-center gap-1">
                <span className="text-purple-400 font-playfair font-bold text-lg">
                  {selectedMemory.uploader_name}
                </span>
                <span className="text-white/40 text-sm">
                  {new Date(selectedMemory.created_at).toLocaleDateString('pt-BR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              <div className="flex justify-center gap-4 pt-4">
                <button 
                  onClick={() => handleLike(selectedMemory.id, selectedMemory.likes_count)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-red-500/20 text-white px-6 py-3 rounded-full transition-all border border-white/10"
                >
                  <Heart className={`w-5 h-5 ${selectedMemory.likes_count > 0 ? 'fill-current text-red-400' : ''}`} />
                  <span className="font-bold">{selectedMemory.likes_count || 0} curtidas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
