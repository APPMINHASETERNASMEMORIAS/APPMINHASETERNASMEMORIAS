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
      case 'luxury':
        return 'border-[16px] border-double border-yellow-600 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)]';
      case 'retro':
        return 'border-[20px] border-b-[80px] shadow-2xl bg-white/5 border-amber-900';
      case 'neon':
        return 'border-[3px] shadow-[0_0_20px_currentcolor,inset_0_0_10px_currentcolor]';
      case 'romance':
        return 'border-[10px] rounded-[50px] border-double shadow-[0_0_15px_rgba(255,182,193,0.3)]';
      case 'floral':
        // Simula moldura floral com gradiente verde e borda dupla
        return 'border-[20px] border-double border-green-700/80 shadow-[0_0_20px_rgba(34,197,94,0.4)]';
      case 'vintage':
        // Simula moldura vintage ornamentada com borda grossa e sombra
        return 'border-[25px] border-double border-amber-950 shadow-[0_0_30px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.3)]';
      case 'gold':
        // Simula moldura dourada com gradiente
        return 'border-[15px] border-solid border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)]';
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
        style={{ 
          borderColor: settings.color, 
          color: settings.color,
          ...(settings.templateId === 'luxury' ? {
            borderImage: `linear-gradient(45deg, ${settings.color}, #ffffff, ${settings.color}, #ffffff, ${settings.color}) 1`,
          } : {})
        }}
      >
        {/* Corner Ornaments */}
        {settings.templateId === 'luxury' && (
          <>
            <div className="absolute top-1 left-1 w-12 h-12 border-t-2 border-l-2 opacity-100" style={{ borderColor: settings.color }} />
            <div className="absolute top-1 right-1 w-12 h-12 border-t-2 border-r-2 opacity-100" style={{ borderColor: settings.color }} />
            <div className="absolute bottom-1 left-1 w-12 h-12 border-b-2 border-l-2 opacity-100" style={{ borderColor: settings.color }} />
            <div className="absolute bottom-1 right-1 w-12 h-12 border-b-2 border-r-2 opacity-100" style={{ borderColor: settings.color }} />
            {/* Decorative dots */}
            <div className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            <div className="absolute bottom-4 left-4 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            <div className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
          </>
        )}

        {settings.templateId === 'romance' && (
          <>
            <div className="absolute -top-2 -left-2 w-16 h-16 opacity-40 blur-xl bg-pink-400" />
            <div className="absolute -bottom-2 -right-2 w-16 h-16 opacity-40 blur-xl bg-pink-400" />
            {/* Heart ornaments */}
            <div className="absolute top-4 left-4 text-2xl">❤️</div>
            <div className="absolute top-4 right-4 text-2xl">❤️</div>
            <div className="absolute bottom-4 left-4 text-2xl">❤️</div>
            <div className="absolute bottom-4 right-4 text-2xl">❤️</div>
          </>
        )}

        {settings.templateId === 'neon' && (
          <div className="absolute inset-0 animate-pulse opacity-50" style={{ boxShadow: `0 0 30px ${settings.color}, inset 0 0 20px ${settings.color}` }} />
        )}

        {settings.text && (
          <div className={`absolute left-0 right-0 text-center px-4 ${settings.templateId === 'retro' ? 'bottom-4' : 'bottom-8'}`}>
            <p 
              className={`${settings.font} ${settings.templateId === 'retro' ? 'text-gray-800' : ''} text-xl md:text-2xl font-bold drop-shadow-lg`}
              style={settings.templateId === 'retro' ? { fontFamily: 'cursive' } : { color: settings.color }}
            >
              {settings.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
