import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Event, EventType, EventSettings, MediaItem } from '@/types';

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    clientName: 'Maria e João',
    eventName: 'Nosso Casamento',
    eventDate: '2024-12-15',
    eventTime: '16:00',
    eventType: 'casamento',
    description: 'O dia mais especial das nossas vidas!',
    qrCode: 'https://minhasmemorias.com/event/1',
    createdAt: '2024-11-01T10:00:00Z',
    status: 'active',
    settings: {
      allowUploads: true,
      requireApproval: false,
      maxFileSize: 50,
      allowedTypes: ['image', 'video'],
      revealMode: 'immediate',
    },
    stats: {
      totalPhotos: 156,
      totalVideos: 23,
      totalViews: 892,
      totalDownloads: 45,
      lastUploadAt: '2024-11-28T15:30:00Z',
    },
  },
  {
    id: '2',
    clientName: 'Família Silva',
    eventName: 'Aniversário da Vovó',
    eventDate: '2024-11-20',
    eventTime: '14:00',
    eventType: 'aniversario',
    description: '90 anos de amor e alegria!',
    qrCode: 'https://minhasmemorias.com/event/2',
    createdAt: '2024-10-15T08:00:00Z',
    status: 'active',
    settings: {
      allowUploads: true,
      requireApproval: true,
      maxFileSize: 30,
      allowedTypes: ['image'],
      revealMode: 'delayed',
      delayedRevealTime: '2024-11-21T10:00:00Z',
    },
    stats: {
      totalPhotos: 89,
      totalVideos: 0,
      totalViews: 234,
      totalDownloads: 12,
      lastUploadAt: '2024-11-20T18:45:00Z',
    },
  },
];

const MOCK_MEDIA: Record<string, MediaItem[]> = {
  '1': [
    {
      id: 'm1',
      eventId: '1',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
      originalUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600',
      caption: 'O primeiro olhar!',
      uploadedBy: 'Convidado Anônimo',
      uploadedAt: '2024-12-15T17:30:00Z',
      status: 'approved',
      fileSize: 2.5,
    },
    {
      id: 'm2',
      eventId: '1',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400',
      originalUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1600',
      caption: 'Momento mágico',
      uploadedBy: 'Carlos Fotógrafo',
      uploadedAt: '2024-12-15T18:15:00Z',
      status: 'approved',
      fileSize: 1.8,
    },
  ],
  '2': [
    {
      id: 'm3',
      eventId: '2',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1530103862676-de3c9a59aa38?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1530103862676-de3c9a59aa38?w=400',
      originalUrl: 'https://images.unsplash.com/photo-1530103862676-de3c9a59aa38?w=1600',
      caption: 'Família reunida!',
      uploadedBy: 'Ana Paula',
      uploadedAt: '2024-11-20T15:00:00Z',
      status: 'approved',
      fileSize: 3.2,
    },
  ],
};

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

  useEffect(() => {
    const savedEvents = localStorage.getItem('memorias_events');
    const savedMedia = localStorage.getItem('memorias_media');
    
    try {
      if (savedEvents) {
        const parsed = JSON.parse(savedEvents);
        setEvents(Array.isArray(parsed) ? parsed : MOCK_EVENTS);
      } else {
        setEvents(MOCK_EVENTS);
        localStorage.setItem('memorias_events', JSON.stringify(MOCK_EVENTS));
      }
      
      if (savedMedia) {
        try {
          const parsed = JSON.parse(savedMedia);
          setMedia(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : MOCK_MEDIA);
        } catch (e) {
          console.error('Failed to parse saved media:', e);
          setMedia(MOCK_MEDIA);
        }
      } else {
        setMedia(MOCK_MEDIA);
        localStorage.setItem('memorias_media', JSON.stringify(MOCK_MEDIA));
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      setEvents(MOCK_EVENTS);
      setMedia(MOCK_MEDIA);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('memorias_events', JSON.stringify(events));
      } catch (e) {
        console.error('Failed to save events to localStorage:', e);
      }
    }
  }, [events, loading]);

  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('memorias_media', JSON.stringify(media));
      } catch (e) {
        console.error('Failed to save media to localStorage:', e);
      }
    }
  }, [media, loading]);

  const createEvent = useCallback((data: any): Event => {
    const id = uuidv4();
    const newEvent: Event = {
      ...data,
      id,
      qrCode: `${window.location.origin}/#/evento/${id}`,
      createdAt: new Date().toISOString(),
      status: 'active',
      settings: data.settings || DEFAULT_SETTINGS,
      stats: {
        totalPhotos: 0,
        totalVideos: 0,
        totalViews: 0,
        totalDownloads: 0,
      },
    };

    setEvents(prev => [newEvent, ...prev]);
    setMedia(prev => ({ ...prev, [newEvent.id]: [] }));
    
    return newEvent;
  }, []);

  const updateEvent = useCallback((id: string, updates: Partial<Event>) => {
    setEvents(prev =>
      prev.map(event =>
        event.id === id ? { ...event, ...updates } : event
      )
    );
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(event => event.id !== id));
    setMedia(prev => {
      const newMedia = { ...prev };
      delete newMedia[id];
      return newMedia;
    });
  }, []);

  const getEvent = useCallback((id: string): Event | undefined => {
    return events.find(event => event.id === id);
  }, [events]);

  const getEventMedia = useCallback((eventId: string): MediaItem[] => {
    return media[eventId] || [];
  }, [media]);

  const approveMedia = useCallback((id: string, approved: boolean) => {
    setMedia(prev => {
      const newMedia = { ...prev };
      for (const eventId in newMedia) {
        newMedia[eventId] = newMedia[eventId].map(item => 
          item.id === id ? { ...item, status: approved ? 'approved' : 'rejected' } : item
        );
      }
      return newMedia;
    });
  }, []);

  const deleteMedia = useCallback((id: string) => {
    setMedia(prev => {
      const newMedia = { ...prev };
      for (const eventId in newMedia) {
        newMedia[eventId] = newMedia[eventId].filter(item => item.id !== id);
      }
      return newMedia;
    });
  }, []);

  const getStats = useCallback(() => {
    try {
      const safeMedia = media || {};
      const safeEvents = Array.isArray(events) ? events : [];
      
      // Manual flatten for better compatibility
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

  return {
    events: Array.isArray(events) ? events.filter(e => e && typeof e === 'object') : [],
    media: getFlattenedMedia(),
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    getEvent,
    getEventMedia,
    approveMedia,
    deleteMedia,
    stats: getStats(),
  };
}
