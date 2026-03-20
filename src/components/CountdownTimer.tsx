import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CountdownTimerProps {
  eventDate: string;
  eventTime: string;
  createdAt: string;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  onEnd?: () => void;
  onTestEnd?: () => void;
  clientPhone?: string;
  isInfiniteFreeMode?: boolean;
}

export function CountdownTimer({ eventDate, eventTime, createdAt, paymentStatus, onEnd, onTestEnd, clientPhone, isInfiniteFreeMode }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timeUntilStart, setTimeUntilStart] = useState<number>(0);
  const [notified, setNotified] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  const ADMIN_WHATSAPP = '12996181965';
  const DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
  const TRIAL_DURATION_MS = 10 * 60 * 1000; // 10 minutes

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const isPaid = paymentStatus === 'paid';
      
      if (isInfiniteFreeMode) {
        setTimeLeft(Infinity);
        setIsTestMode(false);
        return;
      }
      
      if (!isPaid) {
        setIsTestMode(true);
        const trialStartTime = new Date(createdAt).getTime();
        const difference = trialStartTime + TRIAL_DURATION_MS - now;
        
        if (difference <= 0) {
          setTimeLeft(0);
          if (onTestEnd) onTestEnd();
          return;
        }
        
        setTimeLeft(difference);
        setTimeUntilStart(0);
      } else {
        setIsTestMode(false);
        const [year, month, day] = eventDate.split('-').map(Number);
        const [hours, minutes] = eventTime.split(':').map(Number);
        
        // Use the provided eventTime for the start date
        const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        const startTime = startDate.getTime();

        const diffStart = startTime - now;
        if (diffStart > 0) {
          setTimeUntilStart(diffStart);
        } else {
          setTimeUntilStart(0);
        }

        const difference = startTime + DURATION_MS - now;
        
        if (difference <= 0) {
          setTimeLeft(0);
          if (onEnd) onEnd();
          return;
        }

        setTimeLeft(difference);

        // Notify when 30 minutes left
        if (difference < 30 * 60 * 1000 && !notified) {
          setNotified(true);
          sendSimulatedWhatsApp();
        }
      }
    };

    const sendSimulatedWhatsApp = () => {
      console.log('Simulating WhatsApp notifications...');
      console.log(`To Admin (${ADMIN_WHATSAPP}): O evento está prestes a terminar!`);
      if (clientPhone) {
        console.log(`To Client (${clientPhone}): Sua galeria expira em 30 minutos!`);
      }
      toast('Notificações de término enviadas via WhatsApp!', {
        icon: '📱',
        duration: 5000,
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [eventDate, eventTime, createdAt, paymentStatus, notified, clientPhone, onEnd, onTestEnd]);

  const formatTime = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isInfiniteFreeMode) {
    return null;
  }

  if (timeLeft <= 0) {
    if (isTestMode) {
      return (
        <div className="flex items-center gap-2 text-yellow-600 font-bold bg-yellow-50 px-4 py-2 rounded-full border border-yellow-100">
          <AlertTriangle className="w-4 h-4" />
          <span>Teste Finalizado</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-red-600 font-bold bg-red-50 px-4 py-2 rounded-full border border-red-100">
        <AlertTriangle className="w-4 h-4" />
        <span>Evento Finalizado</span>
      </div>
    );
  }

  const isLowTime = timeLeft < 60 * 60 * 1000; // Less than 1 hour

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className={`flex items-center gap-2 font-mono font-bold px-3 py-1.5 rounded-full border transition-colors ${
        isTestMode
          ? 'text-green-600 bg-green-50 border-green-100 animate-pulse'
          : isLowTime 
            ? 'text-red-600 bg-red-50 border-red-100 animate-pulse' 
            : 'text-purple-600 bg-purple-50 border-purple-100'
      }`}>
        <Clock className={`w-3.5 h-3.5 ${isTestMode ? 'text-green-600' : isLowTime ? 'text-red-600' : 'text-purple-600'}`} />
        <span className="text-sm">{formatTime(timeLeft)}</span>
      </div>
      {isTestMode ? (
        <span className="text-[9px] text-green-600 font-medium opacity-80 mr-2">
          Evento em teste
        </span>
      ) : timeUntilStart > 0 ? (
        <span className="text-[9px] text-gray-500 font-medium opacity-80 mr-2">
          Envio liberado em: {formatTime(timeUntilStart)}
        </span>
      ) : null}
    </div>
  );
}
