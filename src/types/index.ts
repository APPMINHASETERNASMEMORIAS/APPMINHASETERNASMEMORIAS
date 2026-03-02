export interface Event {
  id: string;
  clientName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventType: EventType;
  description: string;
  coverImage?: string;
  qrCode: string;
  createdAt: string;
  status: 'active' | 'paused' | 'ended';
  settings: EventSettings;
  stats: EventStats;
}

export type EventType = 
  | 'casamento' 
  | 'aniversario' 
  | 'festa' 
  | 'corporativo' 
  | 'batizado' 
  | 'formatura' 
  | 'churrasco' 
  | 'outro';

export interface EventSettings {
  allowUploads: boolean;
  requireApproval: boolean;
  maxFileSize: number;
  allowedTypes: ('image' | 'video')[];
  revealMode: 'immediate' | 'delayed' | 'manual';
  delayedRevealTime?: string;
  frameSettings?: FrameSettings;
}

export interface FrameSettings {
  enabled: boolean;
  color: string;
  font: string;
  text: string;
  templateId?: string;
}

export interface EventStats {
  totalPhotos: number;
  totalVideos: number;
  totalViews: number;
  totalDownloads: number;
  lastUploadAt?: string;
}

export interface MediaItem {
  id: string;
  eventId: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string;
  originalUrl: string;
  caption?: string;
  uploadedBy: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  fileSize: number;
  dimensions?: {
    width: number;
    height: number;
  };
}
