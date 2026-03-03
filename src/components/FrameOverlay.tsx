import React from 'react';
import { FrameSettings } from '@/types';

interface FrameOverlayProps {
  settings?: FrameSettings;
  className?: string;
  children?: React.ReactNode;
}

export function FrameOverlay({ settings, className = '', children }: FrameOverlayProps) {
  if (!settings || !settings.enabled) {
    return <>{children}</>;
  }

  const getTemplateStyles = () => {
    switch (settings.templateId) {
      case 'floral':
        return 'border-4 border-double';
      case 'modern':
        return 'border-8 border-black/5';
      case 'classic':
        return 'outline outline-4 outline-offset-[-12px]';
      case 'minimal':
      default:
        return 'border-2';
    }
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {children}
      
      {/* Frame Overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-all duration-500 ${getTemplateStyles()}`}
        style={{ borderColor: settings.color, color: settings.color }}
      >
        {settings.text && (
          <div className="absolute bottom-4 left-0 right-0 text-center px-2">
            <p 
              className={`${settings.font} text-sm md:text-base font-medium drop-shadow-md`}
              style={{ color: settings.color }}
            >
              {settings.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
