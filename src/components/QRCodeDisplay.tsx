import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, Copy, Check, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FrameSettings } from '@/types';

interface QRCodeDisplayProps {
  eventId: string;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
  frameSettings?: FrameSettings;
}

export function QRCodeDisplay({ eventId, eventName, isOpen, onClose, frameSettings }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  
  const eventUrl = `${window.location.origin}/#/evento/${eventId}`;
  
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
          case 'floral':
            ctx.setLineDash([]);
            ctx.strokeRect(40, 40, size - 80, size - 80);
            ctx.lineWidth = 10;
            ctx.strokeRect(80, 80, size - 160, size - 160);
            break;
          case 'modern':
            ctx.lineWidth = 60;
            ctx.globalAlpha = 0.1;
            ctx.strokeRect(30, 30, size - 60, size - 60);
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = 10;
            ctx.strokeRect(60, 60, size - 120, size - 120);
            break;
          case 'classic':
            ctx.lineWidth = 5;
            ctx.strokeRect(20, 20, size - 40, size - 40);
            ctx.lineWidth = 15;
            ctx.strokeRect(60, 60, size - 120, size - 120);
            // Corners
            ctx.lineWidth = 20;
            const cS = 100;
            ctx.beginPath(); ctx.moveTo(60, 60 + cS); ctx.lineTo(60, 60); ctx.lineTo(60 + cS, 60); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(size - 60 - cS, 60); ctx.lineTo(size - 60, 60); ctx.lineTo(size - 60, 60 + cS); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(60, size - 60 - cS); ctx.lineTo(60, size - 60); ctx.lineTo(60 + cS, size - 60); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(size - 60 - cS, size - 60); ctx.lineTo(size - 60, size - 60); ctx.lineTo(size - 60, size - 60 - cS); ctx.stroke();
            break;
          case 'minimal':
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
            <QRCodeSVG
              id="event-qr-code"
              value={eventUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="text-center">
            <h3 className="font-semibold text-lg text-gray-800">{eventName}</h3>
            <p className="text-sm text-gray-500 mt-1">Escaneie para participar</p>
          </div>

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
