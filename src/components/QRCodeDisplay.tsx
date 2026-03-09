import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { Download, Share2, Copy, Check, Printer, Lock, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FrameSettings } from '@/types';
import { PaymentReceiptUpload } from './PaymentReceiptUpload';
import { useEvents } from '@/hooks/useEvents';

interface QRCodeDisplayProps {
  eventId: string;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
  frameSettings?: FrameSettings;
  status: 'active' | 'paused' | 'ended' | 'pending';
  paymentReceiptUrl?: string;
  isCreator?: boolean;
  isEventDayOrPast?: boolean;
  onGoToPayment?: () => void;
}

export function QRCodeDisplay({ 
  eventId, 
  eventName, 
  isOpen, 
  onClose, 
  frameSettings, 
  status, 
  paymentReceiptUrl,
  isCreator = false,
  isEventDayOrPast = false,
  onGoToPayment
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const { uploadPaymentReceipt } = useEvents();
  
  const hasReceipt = !!paymentReceiptUrl;
  const isPending = status === 'pending';

  // Check for pending payments when window gains focus
  useEffect(() => {
    const handleFocus = async () => {
      const pendingEventId = localStorage.getItem('pendingPaymentEventId');
      if (pendingEventId && isOpen && eventId === pendingEventId && isCreator && (isPending || status === 'paused')) {
        try {
          const response = await fetch('/api/payments/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: pendingEventId })
          });
          const data = await response.json();
          if (data.success) {
            localStorage.removeItem('pendingPaymentEventId');
            toast.success('Pagamento confirmado! Evento liberado.');
          }
        } catch (error) {
          console.error('Failed to claim payment:', error);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen, eventId, isCreator, isPending, status]);

  const eventUrl = `${window.location.origin}/#/evento/${eventId}`;
  
  let isLocked = false;
  let lockMessage = '';
  let showUploadButton = false;

  if (isCreator) {
    // Creator never sees the lock icon, but sees the upload button if pending
    isLocked = false;
    if (isPending && !hasReceipt) {
      showUploadButton = true;
    }
  } else {
    // Guest view
    if (isPending && !hasReceipt) {
      isLocked = true;
      lockMessage = 'Aguardando confirmação de pagamento pelo organizador.';
      showUploadButton = false;
    } else if (isPending && hasReceipt) {
      isLocked = true;
      lockMessage = 'Pagamento em análise. O QR Code será liberado em breve.';
      showUploadButton = false;
    }
  }
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadQR = (withFrame: boolean = false) => {
    if (isLocked) return;
    const svg = document.getElementById('event-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const size = 1200; // High resolution for printing
      canvas.width = size;
      canvas.height = size;

      // Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      if (withFrame && frameSettings?.enabled) {
        const color = frameSettings.color || '#000000';
        ctx.strokeStyle = color;
        ctx.lineWidth = 40;

        // Draw Frame based on template
        switch (frameSettings.templateId) {
          case 'luxury':
            ctx.setLineDash([]);
            ctx.lineWidth = 40;
            ctx.strokeRect(40, 40, size - 80, size - 80);
            ctx.lineWidth = 10;
            ctx.strokeRect(90, 90, size - 180, size - 180);
            // Corner ornaments
            ctx.lineWidth = 15;
            const cornerLen = 100;
            // Top Left
            ctx.strokeRect(40, 40, cornerLen, 15);
            ctx.strokeRect(40, 40, 15, cornerLen);
            // Top Right
            ctx.strokeRect(size - 40 - cornerLen, 40, cornerLen, 15);
            ctx.strokeRect(size - 40 - 15, 40, 15, cornerLen);
            // Bottom Left
            ctx.strokeRect(40, size - 40 - 15, cornerLen, 15);
            ctx.strokeRect(40, size - 40 - cornerLen, 15, cornerLen);
            // Bottom Right
            ctx.strokeRect(size - 40 - cornerLen, size - 40 - 15, cornerLen, 15);
            ctx.strokeRect(size - 40 - 15, size - 40 - cornerLen, 15, cornerLen);
            break;
          case 'retro':
            ctx.lineWidth = 80;
            ctx.strokeRect(40, 40, size - 80, size - 80);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(40, size - 160, size - 80, 120);
            break;
          case 'neon':
            ctx.lineWidth = 20;
            ctx.shadowBlur = 30;
            ctx.shadowColor = color;
            ctx.strokeRect(40, 40, size - 80, size - 80);
            ctx.shadowBlur = 0;
            break;
          case 'romance':
            ctx.lineWidth = 20;
            const radius = 100;
            ctx.beginPath();
            ctx.moveTo(40 + radius, 40);
            ctx.lineTo(size - 40 - radius, 40);
            ctx.quadraticCurveTo(size - 40, 40, size - 40, 40 + radius);
            ctx.lineTo(size - 40, size - 40 - radius);
            ctx.quadraticCurveTo(size - 40, size - 40, size - 40 - radius, size - 40);
            ctx.lineTo(40 + radius, size - 40);
            ctx.quadraticCurveTo(40, size - 40, 40, size - 40 - radius);
            ctx.lineTo(40, 40 + radius);
            ctx.quadraticCurveTo(40, 40, 40 + radius, 40);
            ctx.stroke();
            // Inner double line
            ctx.lineWidth = 5;
            ctx.stroke();
            break;
          default:
            ctx.lineWidth = 15;
            ctx.strokeRect(40, 40, size - 80, size - 80);
            break;
        }

        // Draw Text
        if (frameSettings.text) {
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.font = `bold 60px sans-serif`; // Simplified for canvas
          ctx.fillText(frameSettings.text, size / 2, size - 100);
        }
      }

      // Draw QR Code in the center
      const qrSize = size * 0.6;
      ctx.drawImage(img, (size - qrSize) / 2, (size - qrSize) / 2 - 40, qrSize, qrSize);

      // Event Name
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'center';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText(eventName, size / 2, (size - qrSize) / 2 + qrSize + 20);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qrcode-${withFrame ? 'moldura-' : ''}${eventName.replace(/\s+/g, '-').toLowerCase()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Participe do evento: ${eventName}`,
          text: 'Escaneie o QR code ou acesse o link para enviar suas fotos!',
          url: eventUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            QR Code do Evento
          </DialogTitle>
          <DialogDescription className="text-center">
            Compartilhe com seus convidados para que eles possam enviar fotos
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            {isLocked ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded-lg">
                <Lock className="w-12 h-12 text-gray-400" />
              </div>
            ) : (
              <QRCodeSVG
                id="event-qr-code"
                value={eventUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            )}
          </div>

          <div className="text-center w-full">
            <h3 className="font-semibold text-lg text-gray-800">{eventName}</h3>
            {isLocked ? (
              <div className="space-y-4 mt-2">
                <p className="text-sm text-red-500 font-medium">{lockMessage}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mt-1">Escaneie para participar</p>
                {isCreator && (isPending || status === 'paused') && !hasReceipt && (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-sm text-amber-800 font-medium mb-3">
                      Seu evento está aguardando pagamento para ser liberado para os convidados.
                    </p>
                    <PaymentReceiptUpload 
                      eventId={eventId} 
                      onUploadSuccess={(url) => uploadPaymentReceipt(eventId, url)} 
                    />
                    {onGoToPayment && (
                      <div className="flex flex-col gap-2 mt-2">
                        <Button 
                          variant="outline"
                          onClick={async () => {
                            try {
                              setIsCheckingPayment(true);
                              toast.loading('Verificando pagamento...', { id: 'check-payment-qr' });
                              const response = await fetch('/api/payments/claim', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ eventId: eventId })
                              });
                              const data = await response.json();
                              
                              if (data.success) {
                                toast.success('Pagamento confirmado! Evento liberado.', { id: 'check-payment-qr' });
                                // The real-time listener or parent state update will handle the rest
                              } else {
                                toast.error('Pagamento ainda não reconhecido. Se você já pagou, envie o comprovante acima.', { id: 'check-payment-qr' });
                              }
                            } catch (error) {
                              console.error('Failed to claim payment:', error);
                              toast.error('Erro ao verificar pagamento.', { id: 'check-payment-qr' });
                            } finally {
                              setIsCheckingPayment(false);
                            }
                          }}
                          className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50 text-xs"
                        >
                          {isCheckingPayment ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              Verificando...
                            </>
                          ) : (
                            'Já fiz o pagamento (Verificar)'
                          )}
                        </Button>
                        <Button 
                          variant="link"
                          onClick={onGoToPayment}
                          className="text-amber-700 text-xs"
                        >
                          Ainda não pagou? Ir para pagamento
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {isCreator && isPending && hasReceipt && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                    <p className="text-sm text-blue-800 font-medium">
                      Comprovante enviado! Estamos analisando seu pagamento para liberar o evento.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {!isLocked && (
            <>
              <div className="w-full bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={eventUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
                />
                <button onClick={handleCopyLink} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-500" />}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 w-full">
                {frameSettings?.enabled && (
                  <Button 
                    onClick={() => handleDownloadQR(true)} 
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-6"
                  >
                    <Printer className="w-5 h-5" />
                    Baixar QR Code com Moldura (Para Imprimir)
                  </Button>
                )}
                <div className="flex gap-3">
                  <Button onClick={() => handleDownloadQR(false)} variant="outline" className="flex-1 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Apenas QR
                  </Button>
                  <Button onClick={handleShare} className="flex-1 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
                    <Share2 className="w-4 h-4" />
                    Compartilhar
                  </Button>
                </div>
              </div>
              
              <Button 
                onClick={() => window.open(eventUrl, '_blank')} 
                variant="ghost" 
                className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                Acessar página do evento
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
