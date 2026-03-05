import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Upload, Image as ImageIcon, Video, Loader2, Camera, Plus, X as CloseIcon, Check, Maximize2 } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../lib/cropImage';
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
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);
  const [aspect, setAspect] = useState(16 / 9); // Matches the aspect-video container

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

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
      setCroppedImage(null);
      
      // Create preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);

      if (selectedFile.type.startsWith('image/')) {
        setIsCropping(true);
      }
    }
  };

  const handleConfirmCrop = async () => {
    if (previewUrl && croppedAreaPixels) {
      try {
        const cropped = await getCroppedImg(previewUrl, croppedAreaPixels, 0);
        setCroppedImage(cropped);
        setIsCropping(false);
        toast.success('Enquadramento definido!');
      } catch (e) {
        console.error(e);
        toast.error('Erro ao processar imagem');
      }
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
      let fileToUpload: File | Blob = croppedImage || file;
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
        // Use the size of what we're actually uploading
        const currentSize = fileToUpload.size;
        if (currentSize > 1024 * 1024) {
          const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          try {
            toast.loading('Otimizando imagem...', { id: 'compress' });
            // Compress the cropped image if it exists, otherwise the original
            fileToUpload = await imageCompression(fileToUpload as File, options);
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
      setCroppedImage(null);
      setIsCropping(false);
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
    <div className="fixed bottom-8 right-4 sm:bottom-6 sm:right-6 z-50">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button
            disabled={isPaused}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group ${
              isPaused 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400'
            }`}
          >
            <div className="relative">
              <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:opacity-0 transition-opacity duration-300" />
              <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-white absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            {/* Tooltip-like label - Hidden on small mobile */}
            <span className="hidden sm:block absolute right-20 bg-white text-purple-600 px-4 py-2 rounded-xl shadow-lg font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border border-purple-100">
              Enviar Foto/Vídeo
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-3xl border-none p-0 overflow-hidden bg-white max-h-[90vh] flex flex-col">
          <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar">
            <DialogHeader className="text-center mb-4 sm:mb-6">
              <DialogTitle className="text-lg sm:text-2xl font-playfair font-bold text-gray-900">Compartilhe uma Memória</DialogTitle>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Envie suas fotos ou vídeos deste momento especial.</p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                  className={`flex flex-col items-center justify-center w-full min-h-[120px] sm:min-h-[160px] border-2 border-dashed rounded-2xl transition-all overflow-hidden relative ${
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
                            src={croppedImage ? URL.createObjectURL(croppedImage) : previewUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/20 transition-colors flex items-center justify-center z-20">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsCropping(true);
                              }}
                              className="bg-white/90 text-purple-600 px-4 py-2 rounded-full shadow-lg opacity-0 group-hover/preview:opacity-100 transition-all hover:scale-105 flex items-center gap-2"
                            >
                              <Maximize2 className="w-4 h-4" />
                              <span className="text-sm font-bold">Ajustar Enquadramento</span>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white">
                        <p className="text-xs font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-xs opacity-80">Clique para trocar</p>
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

      {isCropping && previewUrl && createPortal(
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
          <div className="relative flex-1 w-full h-full">
            <Cropper
              image={previewUrl}
              crop={crop}
              zoom={1}
              rotation={0}
              aspect={aspect}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              showGrid={false}
              maxZoom={1}
              objectFit="contain"
            />
          </div>
          
          <div className="bg-black/90 p-6 pb-8 z-[101] flex justify-center gap-4 safe-area-bottom">
            <button
              type="button"
              onClick={() => setIsCropping(false)}
              className="bg-gray-800 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmCrop();
              }}
              className="bg-purple-600 text-white px-8 py-3 rounded-full flex items-center gap-2 shadow-lg hover:bg-purple-700 transition-colors font-bold text-sm"
            >
              <Check className="w-4 h-4" />
              Confirmar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
