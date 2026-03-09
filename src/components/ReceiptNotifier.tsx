import { useEffect, useRef } from 'react';
import { useEvents } from '@/hooks/useEvents';

export function ReceiptNotifier() {
  const { events } = useEvents();
  const processedReceipts = useRef<Set<string>>(new Set());

  useEffect(() => {
    events.forEach(event => {
      if (event.paymentReceiptUrl && !processedReceipts.current.has(event.id)) {
        processedReceipts.current.add(event.id);
        
        fetch('/api/notify-support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: event.id,
            eventName: event.eventName,
            receiptUrl: event.paymentReceiptUrl
          })
        }).catch(console.error);
      }
    });
  }, [events]);

  return null;
}
