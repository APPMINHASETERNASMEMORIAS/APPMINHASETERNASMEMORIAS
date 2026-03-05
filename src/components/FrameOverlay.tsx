import React from 'react';
import { FrameSettings } from '@/types';
import { Flower, Leaf, Sun, Sparkles, Star } from 'lucide-react';

interface FrameOverlayProps {
  settings?: FrameSettings;
  className?: string;
  children?: React.ReactNode;
}

export function FrameOverlay({ settings, className = '', children }: FrameOverlayProps) {
  if (!settings || !settings.enabled) {
    return <>{children}</>;
  }

  if (settings.imageUrl) {
    return (
      <div className={`relative w-full h-full overflow-hidden ${className}`}>
        {children}
        <div className="absolute inset-0 pointer-events-none z-10">
          <img 
            src={settings.imageUrl} 
            alt="Frame" 
            className="w-full h-full object-fill opacity-90"
            referrerPolicy="no-referrer"
          />
        </div>
        {settings.text && (
          <div className={`absolute left-0 right-0 text-center px-4 bottom-8 z-20`}>
            <p 
              className={`${settings.font} text-xl md:text-2xl font-bold drop-shadow-lg`}
              style={{ color: settings.color }}
            >
              {settings.text}
            </p>
          </div>
        )}
      </div>
    );
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
        return 'border-[20px] border-double border-green-700/80 shadow-[0_0_20px_rgba(34,197,94,0.4)]';
      case 'vintage':
        return 'border-[25px] border-double border-amber-950 shadow-[0_0_30px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.3)]';
      case 'gold':
        return 'border-[15px] border-solid border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)]';
      default:
        return 'border-[4px]';
    }
  };

  const renderDecorations = () => {
    const iconSize = 40;
    const color = settings.color || 'currentColor';
    
    switch (settings.templateId) {
      case 'floral':
        return (
          <>
            <Flower className="absolute top-2 left-2" size={iconSize} color={color} />
            <Flower className="absolute top-2 right-2" size={iconSize} color={color} />
            <Leaf className="absolute bottom-2 left-2" size={iconSize} color={color} />
            <Leaf className="absolute bottom-2 right-2" size={iconSize} color={color} />
          </>
        );
      case 'gold':
        return (
          <>
            <Sun className="absolute top-2 left-2" size={iconSize} color={color} />
            <Sun className="absolute top-2 right-2" size={iconSize} color={color} />
            <Sparkles className="absolute bottom-2 left-2" size={iconSize} color={color} />
            <Sparkles className="absolute bottom-2 right-2" size={iconSize} color={color} />
          </>
        );
      case 'vintage':
        return (
          <>
            <Star className="absolute top-2 left-2" size={iconSize} color={color} />
            <Star className="absolute top-2 right-2" size={iconSize} color={color} />
            <Star className="absolute bottom-2 left-2" size={iconSize} color={color} />
            <Star className="absolute bottom-2 right-2" size={iconSize} color={color} />
          </>
        );
      default:
        return null;
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
        }}
      >
        {settings.text && (
          <div className={`absolute left-0 right-0 text-center px-4 bottom-8`}>
            <p 
              className={`${settings.font} text-xl md:text-2xl font-bold drop-shadow-lg`}
              style={{ color: settings.color }}
            >
              {settings.text}
            </p>
          </div>
        )}
      </div>
      {renderDecorations()}
    </div>
  );
}
