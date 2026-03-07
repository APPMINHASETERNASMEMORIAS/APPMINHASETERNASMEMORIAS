import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { MediaItem } from '@/types';

interface DownloadEventButtonProps {
  eventName: string;
  isEnded: boolean;
  media: MediaItem[];
}

export function DownloadEventButton({ eventName, isEnded, media }: DownloadEventButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!isEnded) {
      toast.error('O download só estará disponível após o término do evento.');
      return;
    }

    try {
      setIsDownloading(true);
      toast.loading('Preparando download...', { id: 'download-zip' });

      if (media.length === 0) {
        toast.dismiss('download-zip');
        toast.error('Não há fotos para baixar.');
        setIsDownloading(false);
        return;
      }

      const zip = new JSZip();
      const folder = zip.folder(eventName.replace(/[^a-z0-9]/gi, '_')) || zip;

      // Download each file
      const promises = media.map(async (item, index) => {
        try {
          // Use originalUrl if available, otherwise url
          const url = item.originalUrl || item.url;
          const response = await fetch(url);
          const blob = await response.blob();
          
          // Determine extension
          let ext = 'jpg';
          if (item.type === 'video') ext = 'mp4';
          else if (blob.type === 'image/png') ext = 'png';
          else if (blob.type === 'image/jpeg') ext = 'jpg';
          
          const filename = `media_${index + 1}.${ext}`;
          folder.file(filename, blob);
        } catch (err) {
          console.error('Error downloading file:', item.url, err);
        }
      });

      await Promise.all(promises);

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${eventName}-memorias.zip`);

      toast.dismiss('download-zip');
      toast.success('Download iniciado!');
    } catch (error) {
      console.error('Error creating zip:', error);
      toast.dismiss('download-zip');
      toast.error('Erro ao gerar arquivo zip.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed bottom-24 left-4 sm:bottom-24 sm:left-6 z-50">
      <button
        onClick={handleDownload}
        disabled={!isEnded || isDownloading}
        className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 font-medium text-sm sm:text-base group ${
          !isEnded
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white text-purple-600 hover:bg-purple-50 hover:scale-105 active:scale-95'
        }`}
      >
        {isDownloading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Download className="w-5 h-5" />
        )}
        <span className="max-w-[150px] sm:max-w-none truncate">
          Clique aqui para baixar todo o evento
        </span>
      </button>
    </div>
  );
}
