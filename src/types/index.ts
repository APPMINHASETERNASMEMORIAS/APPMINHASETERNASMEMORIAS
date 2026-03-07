export interface Event {
  id: string;
  clientName: string;
  clientPhone?: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventType: EventType;
  description: string;
  coverImage?: string;
  qrCode: string;
  createdAt: string;
  startedAt?: string;
  status: 'active' | 'paused' | 'ended' | 'pending';
  settings: EventSettings;
  stats: EventStats;
  plan?: string;
  paymentReceiptUrl?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed';
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
  clientPhone?: string;
  startedAt?: string;
  isOneRealTestMode?: boolean;
}

export interface FrameSettings {
  enabled: boolean;
  color: string;
  font: string;
  text: string;
  templateId?: string;
  imageUrl?: string;
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
  uploaderId?: string;
  likesCount?: number;
  status: 'pending' | 'approved' | 'rejected';
  fileSize: number;
  dimensions?: {
    width: number;
    height: number;
  };
}
