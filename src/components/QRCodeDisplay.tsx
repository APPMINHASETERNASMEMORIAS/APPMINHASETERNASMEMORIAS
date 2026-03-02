import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface QRCodeDisplayProps {
  eventId: string;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeDisplay({ eventId, eventName, isOpen, onClose }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  
  const eventUrl = `${window.location.origin}/evento/${eventId}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('event-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 4;
      canvas.height = img.height * 4;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qrcode-${eventName.replace(/\s+/g, '-').toLowerCase()}.png`;
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            QR Code do Evento
          </DialogTitle>
          <DialogDescription className="text-center">
            Compartilhe com seus convidados para que eles possam enviar fotos
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg">
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

          <div className="flex gap-3 w-full">
            <Button onClick={handleDownloadQR} variant="outline" className="flex-1 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Baixar QR
            </Button>
            <Button onClick={handleShare} className="flex-1 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
              <Share2 className="w-4 h-4" />
              Compartilhar
            </Button>
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
