import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Video, Loader2, Camera, Plus, X as CloseIcon } from 'lucide-react';
import { uploadToCloudinary, isCloudinaryConfigured } from '../lib/cloudinary';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function UploadMemory({ eventId, isPaused = false, onUploadSuccess }: { eventId?: string, isPaused?: boolean, onUploadSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Clean up preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Clear preview when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreviewUrl(null);
      setName('');
      setMessage('');
    }
  }, [isOpen]);

  // Get or create a persistent uploader ID for this browser
  const getUploaderId = () => {
    let id = localStorage.getItem('memory_uploader_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('memory_uploader_id', id);
    }
    return id;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isPaused) {
      toast.error('Este evento está pausado. Não é possível enviar novas mídias.');
      return;
    }
    
    if (!isCloudinaryConfigured || !isSupabaseConfigured) {
      toast.error('O sistema não está totalmente configurado. Verifique as chaves do Supabase e Cloudinary.');
      return;
    }

    if (!file || !name) {
      toast.error('Por favor, selecione uma foto/vídeo e informe seu nome.');
      return;
    }

    try {
      setIsUploading(true);
      let fileToUpload = file;
      const isVideo = file.type.startsWith('video/');

      // Real upload logic
      if (isVideo) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          toast.error('O vídeo é muito grande. O tamanho máximo permitido é 10MB.');
          setIsUploading(false);
          return;
        }
      } else if (file.type.startsWith('image/')) {
        if (file.size > 1024 * 1024) {
          const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          try {
            toast.loading('Otimizando imagem...', { id: 'compress' });
            fileToUpload = await imageCompression(file, options);
            toast.dismiss('compress');
          } catch (error) {
            console.error('Erro ao comprimir imagem:', error);
            toast.dismiss('compress');
          }
        }
      }
      
      toast.loading('Enviando arquivo...', { id: 'upload' });
      const fileUrl = await uploadToCloudinary(fileToUpload);
      toast.dismiss('upload');
      
      const { error } = await supabase!.from('memories').insert([
        {
          url: fileUrl,
          type: isVideo ? 'video' : 'image',
          uploader_name: name,
          message: message || null,
          event_id: eventId || null,
          uploader_id: getUploaderId(),
        }
      ]);

      if (error) throw error;
      toast.success('Memória enviada com sucesso! Obrigado por compartilhar.');
      
      // Reset form
      setFile(null);
      setPreviewUrl(null);
      setName('');
      setMessage('');
      setIsOpen(false);
      if (onUploadSuccess) onUploadSuccess();
      
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error(error.message || 'Ocorreu um erro ao enviar sua memória.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button
            disabled={isPaused}
            className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group ${
              isPaused 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400'
            }`}
          >
            <div className="relative">
              <Camera className="w-7 h-7 text-white group-hover:opacity-0 transition-opacity duration-300" />
              <Plus className="w-7 h-7 text-white absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            {/* Tooltip-like label */}
            <span className="absolute right-20 bg-white text-purple-600 px-4 py-2 rounded-xl shadow-lg font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border border-purple-100">
              Enviar Foto/Vídeo
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md rounded-3xl border-none p-0 overflow-hidden bg-white">
          <div className="p-8">
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl font-playfair font-bold text-gray-900">Compartilhe uma Memória</DialogTitle>
              <p className="text-gray-500 mt-2">Envie suas fotos ou vídeos deste momento especial.</p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Input */}
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  disabled={isPaused}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className={`flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed rounded-2xl transition-all overflow-hidden relative ${
                    isPaused 
                      ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60' 
                      : file 
                        ? 'border-purple-500 bg-purple-50 cursor-pointer' 
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  {file && previewUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center relative group/preview">
                      {file.type.startsWith('video/') ? (
                        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                          <video 
                            src={previewUrl} 
                            className="max-h-full max-w-full"
                            muted
                            playsInline
                            onMouseOver={(e) => e.currentTarget.play()}
                            onMouseOut={(e) => e.currentTarget.pause()}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/preview:bg-black/40 transition-colors">
                            <Video className="w-12 h-12 text-white opacity-80" />
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                          <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/20 transition-colors flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-white opacity-0 group-hover/preview:opacity-80 transition-opacity" />
                          </div>
                        </div>
                      )}
                      
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white">
                        <p className="text-xs font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-[10px] opacity-80">Clique para trocar</p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
                      >
                        <CloseIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <Upload className={`w-8 h-8 mx-auto mb-2 ${isPaused ? 'text-gray-300' : 'text-gray-400'}`} />
                      <p className={`text-sm font-medium ${isPaused ? 'text-gray-500' : 'text-gray-700'}`}>
                        {isPaused ? 'Envios Pausados' : 'Clique para selecionar'}
                      </p>
                      <p className={`text-xs mt-1 ${isPaused ? 'text-gray-400' : 'text-gray-500'}`}>
                        Fotos ou Vídeos
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* Name Input */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Seu Nome
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Tio João"
                  disabled={isPaused}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:bg-gray-100 disabled:text-gray-500"
                  required
                />
              </div>

              {/* Message Input */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Mensagem (Opcional)
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Deixe uma mensagem de carinho..."
                  rows={3}
                  disabled={isPaused}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading || isPaused}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : isPaused ? (
                  'Evento Pausado'
                ) : (
                  'Enviar Memória'
                )}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
