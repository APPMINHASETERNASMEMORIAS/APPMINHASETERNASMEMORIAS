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
        return 'border-[12px] border-double';
      case 'modern':
        return 'border-[16px] border-black/5';
      case 'classic':
        return 'outline outline-2 outline-offset-[-16px] border-[20px]';
      case 'minimal':
      default:
        return 'border-[4px]';
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
        {/* Corner Ornaments */}
        {settings.templateId === 'floral' && (
          <>
            <div className="absolute top-2 left-2 w-12 h-12 border-t-2 border-l-2 rounded-tl-3xl opacity-60" />
            <div className="absolute top-2 right-2 w-12 h-12 border-t-2 border-r-2 rounded-tr-3xl opacity-60" />
            <div className="absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 rounded-bl-3xl opacity-60" />
            <div className="absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 rounded-br-3xl opacity-60" />
          </>
        )}

        {settings.templateId === 'classic' && (
          <>
            <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 opacity-80" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 opacity-80" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 opacity-80" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 opacity-80" />
          </>
        )}

        {settings.templateId === 'modern' && (
          <>
            <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-current to-transparent opacity-10" />
            <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-current to-transparent opacity-10" />
          </>
        )}

        {settings.text && (
          <div className="absolute bottom-6 left-0 right-0 text-center px-4">
            <p 
              className={`${settings.font} text-lg md:text-xl font-medium drop-shadow-lg`}
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
