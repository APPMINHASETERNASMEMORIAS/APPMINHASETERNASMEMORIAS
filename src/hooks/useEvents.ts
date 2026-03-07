import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Event, EventType, EventSettings, MediaItem } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS: EventSettings = {
  allowUploads: true,
  requireApproval: false,
  maxFileSize: 50,
  allowedTypes: ['image', 'video'],
  revealMode: 'immediate',
};

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [media, setMedia] = useState<Record<string, MediaItem[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchEventsAndMedia = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase!
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventsError) {
        if (eventsError.message.includes('relation "public.events" does not exist')) {
          console.error('A tabela "events" não existe no Supabase. Por favor, crie-a usando o SQL fornecido.');
          return; // Stop execution if table doesn't exist
        }
        throw eventsError;
      }

      const mappedEvents: Event[] = (eventsData || []).map(row => ({
        id: row.id,
        clientName: row.client_name,
        clientPhone: row.settings?.clientPhone || '',
        eventName: row.event_name,
        eventDate: row.event_date,
        eventTime: row.event_time,
        eventType: row.event_type as EventType,
        description: row.description || '',
        qrCode: row.qr_code || `${window.location.origin}/#/evento/${row.id}`,
        createdAt: row.created_at,
        startedAt: row.settings?.startedAt,
        status: row.status as 'active' | 'paused' | 'ended',
        settings: row.settings || DEFAULT_SETTINGS,
        stats: row.stats || { totalPhotos: 0, totalVideos: 0, totalViews: 0, totalDownloads: 0 },
      }));

      setEvents(mappedEvents);

      // Fetch media from memories table
      const { data: memoriesData, error: memoriesError } = await supabase!
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });

      if (memoriesError) throw memoriesError;

      const newMedia: Record<string, MediaItem[]> = {};
      
      (memoriesData || []).forEach(row => {
        const eventId = row.event_id || 'global';
        if (!newMedia[eventId]) newMedia[eventId] = [];
        
        newMedia[eventId].push({
          id: row.id,
          eventId: eventId,
          type: row.type as 'image' | 'video',
          url: row.url,
          thumbnailUrl: row.url, // Cloudinary URL can be transformed, but we use original for now
          originalUrl: row.url,
          caption: row.message || undefined,
          uploadedBy: row.uploader_name,
          uploadedAt: row.created_at,
          status: 'approved', // Default to approved since we don't have status in DB yet
          fileSize: 0,
        });
      });

      setMedia(newMedia);
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      toast.error('Erro ao carregar dados do servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEventsAndMedia();

    if (!isSupabaseConfigured) return;

    // Realtime subscription for events
    const eventsChannel = supabase!
      .channel('public:events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          fetchEventsAndMedia();
        }
      )
      .subscribe();

    // Realtime subscription for memories
    const memoriesChannel = supabase!
      .channel('public:memories_admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memories' },
        () => {
          fetchEventsAndMedia();
        }
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(eventsChannel);
      supabase!.removeChannel(memoriesChannel);
    };
  }, [fetchEventsAndMedia]);

  const createEvent = useCallback(async (data: any): Promise<Event> => {
    const id = uuidv4();
    const newEvent: Event = {
      ...data,
      id,
      qrCode: `${window.location.origin}/#/evento/${id}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      settings: { ...(data.settings || DEFAULT_SETTINGS), clientPhone: data.clientPhone },
      stats: {
        totalPhotos: 0,
        totalVideos: 0,
        totalViews: 0,
        totalDownloads: 0,
      },
    };

    // Optimistic update
    setEvents(prev => [newEvent, ...prev]);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase!.from('events').insert([{
          id: newEvent.id,
          client_name: newEvent.clientName,
          event_name: newEvent.eventName,
          event_date: newEvent.eventDate,
          event_time: newEvent.eventTime,
          event_type: newEvent.eventType,
          description: newEvent.description,
          qr_code: newEvent.qrCode,
          created_at: newEvent.createdAt,
          status: newEvent.status,
          settings: newEvent.settings,
          stats: newEvent.stats,
          plan: data.plan || 'festa'
        }]);

        if (error) throw error;
        
        // Save to local storage as creator
        const createdEvents = JSON.parse(localStorage.getItem('created_events') || '[]');
        if (!createdEvents.includes(newEvent.id)) {
          createdEvents.push(newEvent.id);
          localStorage.setItem('created_events', JSON.stringify(createdEvents));
        }
      } catch (error) {
        console.error('Error creating event in Supabase:', error);
        toast.error('Erro ao salvar evento no servidor.');
        // Revert optimistic update on error
        setEvents(prev => prev.filter(e => e.id !== id));
      }
    } else {
       // Save to local storage as creator even if offline/demo
        const createdEvents = JSON.parse(localStorage.getItem('created_events') || '[]');
        if (!createdEvents.includes(newEvent.id)) {
          createdEvents.push(newEvent.id);
          localStorage.setItem('created_events', JSON.stringify(createdEvents));
        }
    }

    return newEvent;
  }, []);

  const isEventCreator = useCallback((eventId: string): boolean => {
    const createdEvents = JSON.parse(localStorage.getItem('created_events') || '[]');
    return createdEvents.includes(eventId);
  }, []);

  const updateEvent = useCallback(async (id: string, updates: Partial<Event>) => {
    // Optimistic update
    setEvents(prev =>
      prev.map(event =>
        event.id === id ? { ...event, ...updates } : event
      )
    );

    if (isSupabaseConfigured) {
      try {
        const dbUpdates: any = {};
        if (updates.clientName) dbUpdates.client_name = updates.clientName;
        if (updates.eventName) dbUpdates.event_name = updates.eventName;
        if (updates.eventDate) dbUpdates.event_date = updates.eventDate;
        if (updates.eventTime) dbUpdates.event_time = updates.eventTime;
        if (updates.eventType) dbUpdates.event_type = updates.eventType;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.settings) dbUpdates.settings = updates.settings;
        if (updates.stats) dbUpdates.stats = updates.stats;
        
        if (updates.startedAt !== undefined) {
          const currentEvent = events.find(e => e.id === id);
          if (currentEvent) {
            dbUpdates.settings = { ...currentEvent.settings, startedAt: updates.startedAt };
          }
        }

        const { error } = await supabase!
          .from('events')
          .update(dbUpdates)
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating event in Supabase:', error);
        toast.error('Erro ao atualizar evento no servidor.');
        fetchEventsAndMedia(); // Revert on error
      }
    }
  }, [fetchEventsAndMedia]);

  const deleteEvent = useCallback(async (id: string) => {
    // Optimistic update
    setEvents(prev => prev.filter(event => event.id !== id));
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase!
          .from('events')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Evento excluído com sucesso!');
      } catch (error) {
        console.error('Error deleting event in Supabase:', error);
        toast.error('Erro ao excluir evento no servidor.');
        fetchEventsAndMedia(); // Revert on error
      }
    }
  }, [fetchEventsAndMedia]);

  const getEvent = useCallback((id: string): Event | undefined => {
    return events.find(event => event.id === id);
  }, [events]);

  const getEventMedia = useCallback((eventId: string): MediaItem[] => {
    return media[eventId] || [];
  }, [media]);

  const approveMedia = useCallback(async (id: string, approved: boolean) => {
    // Since we don't have a status column in memories yet, we'll just delete if rejected
    if (!approved && isSupabaseConfigured) {
      try {
        const { error } = await supabase!
          .from('memories')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        toast.success('Mídia rejeitada/excluída.');
      } catch (error) {
        console.error('Error deleting media:', error);
        toast.error('Erro ao excluir mídia.');
      }
    }
  }, []);

  const deleteMedia = useCallback(async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase!
          .from('memories')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        toast.success('Mídia excluída com sucesso.');
      } catch (error) {
        console.error('Error deleting media:', error);
        toast.error('Erro ao excluir mídia.');
      }
    }
  }, []);

  const getStats = useCallback(() => {
    try {
      const safeMedia = media || {};
      const safeEvents = Array.isArray(events) ? events : [];
      
      const allMedia: MediaItem[] = [];
      Object.values(safeMedia).forEach(mediaList => {
        if (Array.isArray(mediaList)) {
          mediaList.forEach(item => {
            if (item && typeof item === 'object') {
              allMedia.push(item);
            }
          });
        }
      });

      const totalEvents = safeEvents.filter(e => e && typeof e === 'object').length;
      const totalMedia = allMedia.length;
      const totalStorage = allMedia.reduce((acc, item) => acc + (item?.fileSize || 0), 0);
      const activeEvents = safeEvents.filter(e => e && typeof e === 'object' && e.status === 'active').length;
      const recentUploads = [...allMedia]
        .filter(item => item && item.uploadedAt)
        .sort((a, b) => {
          const dateA = new Date(a.uploadedAt).getTime();
          const dateB = new Date(b.uploadedAt).getTime();
          return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        })
        .slice(0, 10);

      return {
        totalEvents,
        totalMedia,
        totalStorage,
        activeEvents,
        recentUploads,
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        totalEvents: 0,
        totalMedia: 0,
        totalStorage: 0,
        activeEvents: 0,
        recentUploads: [],
      };
    }
  }, [events, media]);

  const getFlattenedMedia = useCallback(() => {
    const safeMedia = media || {};
    const flattened: MediaItem[] = [];
    Object.values(safeMedia).forEach(mediaList => {
      if (Array.isArray(mediaList)) {
        mediaList.forEach(item => {
          if (item && typeof item === 'object') {
            flattened.push(item);
          }
        });
      }
    });
    return flattened;
  }, [media]);

  const uploadPaymentReceipt = useCallback(async (eventId: string, receiptUrl: string) => {
    // Optimistic update
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId ? { ...event, paymentReceiptUrl: receiptUrl } : event
      )
    );

    // Grant creator status to the uploader
    const createdEvents = JSON.parse(localStorage.getItem('created_events') || '[]');
    if (!createdEvents.includes(eventId)) {
      createdEvents.push(eventId);
      localStorage.setItem('created_events', JSON.stringify(createdEvents));
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase!
          .from('events')
          .update({ payment_receipt_url: receiptUrl })
          .eq('id', eventId);

        if (error) throw error;
        toast.success('Comprovante enviado! Acesso liberado para você.');
      } catch (error) {
        console.error('Error uploading receipt:', error);
        toast.error('Erro ao enviar comprovante.');
        fetchEventsAndMedia(); // Revert on error
      }
    } else {
        toast.success('Comprovante enviado! Acesso liberado para você (Demo).');
    }
  }, [fetchEventsAndMedia]);

  return {
    events: Array.isArray(events) ? events.filter(e => e && typeof e === 'object') : [],
    media: getFlattenedMedia(),
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    uploadPaymentReceipt,
    getEvent,
    getEventMedia,
    approveMedia,
    deleteMedia,
    stats: getStats(),
    isEventCreator,
  };
}
