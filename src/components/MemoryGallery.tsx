import React, { useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Heart, MessageCircle, PlayCircle } from 'lucide-react';

interface Memory {
  id: string;
  created_at: string;
  url: string;
  type: 'image' | 'video';
  uploader_name: string;
  message: string | null;
}

export function MemoryGallery({ eventId, refreshTrigger }: { eventId?: string, refreshTrigger: number }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const memoriesRef = useRef<Memory[]>([]);

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
        } else {
          query = query.is('event_id', null);
        }

        const { data, error } = await query;

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
          filter: eventId ? `event_id=eq.${eventId}` : undefined,
        },
        (payload) => {
          const newMemory = payload.new as Memory;
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {memories.map((memory) => (
        <div key={memory.id} className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group">
          {/* Media Container */}
          <div className="relative aspect-square bg-gray-100 overflow-hidden">
            {memory.type === 'video' ? (
              <>
                <video
                  src={memory.url}
                  className="w-full h-full object-cover"
                  controls
                />
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-2 rounded-full text-white pointer-events-none">
                  <PlayCircle className="w-5 h-5" />
                </div>
              </>
            ) : (
              <img
                src={memory.url}
                alt={`Memória de ${memory.uploader_name}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            )}
          </div>

          {/* Content Container */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-900">{memory.uploader_name}</span>
              <span className="text-xs text-gray-500">
                {new Date(memory.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            
            {memory.message && (
              <div className="flex items-start gap-3 text-gray-600 bg-purple-50/50 p-4 rounded-xl">
                <MessageCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <p className="text-sm italic">"{memory.message}"</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
