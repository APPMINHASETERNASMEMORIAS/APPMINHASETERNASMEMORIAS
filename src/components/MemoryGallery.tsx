import React, { useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Heart, MessageCircle, PlayCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

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

export function MemoryGallery({ eventId, refreshTrigger }: { eventId?: string, refreshTrigger: number }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const memoriesRef = useRef<Memory[]>([]);
  const uploaderId = localStorage.getItem('memory_uploader_id');

  const handleLike = async (memoryId: string, currentLikes: number) => {
    if (!isSupabaseConfigured) return;
    
    // Optimistic update
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
      // Rollback
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
        .eq('uploader_id', uploaderId); // Security check

      if (error) throw error;
      
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      toast.success('Memória excluída com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Não foi possível excluir a memória.');
    }
  };

  // Keep ref in sync with state for use in callbacks
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
        // Se não tiver eventId (página principal), busca TODAS as memórias

        const { data, error } = await query;
        
        console.log('[MemoryGallery] Fetch result:', { data, error, eventId });

        if (error) {
          if (error.message.includes('event_id')) {
            console.error('O banco de dados precisa ser atualizado. Por favor, adicione a coluna "event_id" (tipo TEXT) na tabela "memories" do seu Supabase.');
            // Fallback to fetch without event_id if the column doesn't exist yet
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

    // Memória Inteligente (Merge): Mantém fotos recém-chegadas (últimos 15s) que ainda não estão no banco
    const mergeMemories = (fetchedMemories: Memory[]) => {
      const now = new Date().getTime();
      const currentMemories = memoriesRef.current;
      
      // Encontra memórias locais que são muito recentes (menos de 15 segundos)
      const recentLocalMemories = currentMemories.filter(localMem => {
        const memTime = new Date(localMem.created_at).getTime();
        const isRecent = (now - memTime) < 15000; // 15 segundos
        // Verifica se essa memória já veio no fetch do banco
        const existsInDb = fetchedMemories.some(dbMem => dbMem.id === localMem.id);
        
        return isRecent && !existsInDb;
      });

      // Mescla as memórias do banco com as recentes locais
      const merged = [...recentLocalMemories, ...fetchedMemories];
      
      // Ordena por data de criação (mais recentes primeiro)
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Remove duplicatas baseadas no ID
      const uniqueMemories = merged.filter((mem, index, self) => 
        index === self.findIndex((m) => m.id === mem.id)
      );

      setMemories(uniqueMemories);
    };

    // Busca inicial
    fetchMemories();

    // Sincronização Blindada: Atualização automática a cada 5 segundos
    const pollInterval = setInterval(() => {
      fetchMemories(true);
    }, 5000);

    // Conexão Direta (Socket): Escuta novos inserts em tempo real
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
          
          // Filtra localmente para garantir que a memória pertence a este mural
          if (eventId) {
            if (newMemory.event_id !== eventId) return;
          }
          // Se não tiver eventId (página principal), aceita TODAS as memórias

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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 grid-flow-dense gap-0.5 bg-gray-200 p-0.5 rounded-3xl overflow-hidden shadow-2xl">
      {memories.map((memory, index) => {
        // Lógica para o Bento Grid: alguns itens ocupam mais espaço
        const isFeatured = index % 10 === 0; // A cada 10 fotos, uma fica grande
        const isWide = index % 7 === 0 && !isFeatured; // Algumas ficam largas
        
        return (
          <div 
            key={memory.id} 
            className={`relative bg-white overflow-hidden group transition-all duration-500 hover:z-10 hover:scale-[1.02] ${
              isFeatured ? 'col-span-2 row-span-2' : isWide ? 'col-span-2' : ''
            }`}
          >
            {/* Media Container */}
            <div className="w-full h-full aspect-square bg-gray-100">
              {memory.type === 'video' ? (
                <div className="relative w-full h-full">
                  <video
                    src={memory.url}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    onMouseOver={(e) => e.currentTarget.play()}
                    onMouseOut={(e) => e.currentTarget.pause()}
                  />
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-2 rounded-full text-white pointer-events-none">
                    <PlayCircle className="w-5 h-5" />
                  </div>
                </div>
              ) : (
                <img
                  src={memory.url}
                  alt={`Memória de ${memory.uploader_name}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
              )}
            </div>

            {/* Overlay: Message Preview & Actions */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              {/* Message Preview */}
              {memory.message && (
                <div className="mb-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-sm font-medium line-clamp-3 italic bg-black/30 backdrop-blur-sm p-2 rounded-lg border border-white/10">
                    "{memory.message}"
                  </p>
                </div>
              )}

              {/* Footer Info & Actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-white font-bold text-xs truncate max-w-[100px]">
                    {memory.uploader_name}
                  </span>
                  <span className="text-white/60 text-[10px]">
                    {new Date(memory.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Like Button */}
                  <button 
                    onClick={() => handleLike(memory.id, memory.likes_count)}
                    className="flex items-center gap-1 bg-white/20 backdrop-blur-md hover:bg-red-500/80 text-white px-2 py-1 rounded-full text-xs transition-colors"
                  >
                    <Heart className={`w-3.5 h-3.5 ${memory.likes_count > 0 ? 'fill-current text-red-400' : ''}`} />
                    <span>{memory.likes_count || 0}</span>
                  </button>

                  {/* Delete Button (Only for uploader) */}
                  {uploaderId === memory.uploader_id && (
                    <button 
                      onClick={() => handleDelete(memory.id)}
                      className="p-1.5 bg-white/20 backdrop-blur-md hover:bg-red-600 text-white rounded-full transition-colors"
                      title="Excluir minha foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
