import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CountdownTimerProps {
  eventDate: string;
  eventTime: string;
  onEnd?: () => void;
  clientPhone?: string;
}

export function CountdownTimer({ eventDate, eventTime, onEnd, clientPhone }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [notified, setNotified] = useState(false);

  const ADMIN_WHATSAPP = '12996181965';
  const DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

  useEffect(() => {
    const calculateTimeLeft = () => {
      const [year, month, day] = eventDate.split('-').map(Number);
      const [hours, minutes] = eventTime.split(':').map(Number);
      
      // Use the provided eventTime for the start date
      const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const startTime = startDate.getTime();

      const now = new Date().getTime();
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
  }, [eventDate, eventTime, notified, clientPhone, onEnd]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (timeLeft <= 0) {
    return (
      <div className="flex items-center gap-2 text-red-600 font-bold bg-red-50 px-4 py-2 rounded-full border border-red-100">
        <AlertTriangle className="w-4 h-4" />
        <span>Evento Finalizado</span>
      </div>
    );
  }

  const isLowTime = timeLeft < 60 * 60 * 1000; // Less than 1 hour

  return (
    <div className={`flex items-center gap-2 font-mono font-bold px-4 py-2 rounded-full border transition-colors ${
      isLowTime 
        ? 'text-red-600 bg-red-50 border-red-100 animate-pulse' 
        : 'text-purple-600 bg-purple-50 border-purple-100'
    }`}>
      <Clock className={`w-4 h-4 ${isLowTime ? 'text-red-600' : 'text-purple-600'}`} />
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
}
