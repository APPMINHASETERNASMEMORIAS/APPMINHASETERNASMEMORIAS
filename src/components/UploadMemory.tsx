import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, Image as ImageIcon, Video, Loader2, Camera, Plus, X as CloseIcon, Check, ChevronLeft, Layout } from 'lucide-react';
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

// Define available frames/aspect ratios
const FRAMES = [
  { id: 'story', name: 'Story (Cheia)', aspect: 9 / 16, icon: '📱' },
  { id: 'portrait', name: 'Retrato', aspect: 4 / 5, icon: '🖼️' },
  { id: 'square', name: 'Quadrado', aspect: 1 / 1, icon: '🟦' },
  { id: 'landscape', name: 'Paisagem', aspect: 16 / 9, icon: '📺' },
];

type Step = 'frame' | 'upload' | 'crop' | 'details';

export function UploadMemory({ 
  eventId, 
  isPaused = false, 
  onUploadSuccess, 
  status, 
  paymentStatus,
  isCreator = false,
  isEventDayOrPast = false,
  mediaCount = 0
}: { 
  eventId?: string, 
  isPaused?: boolean, 
  onUploadSuccess?: () => void, 
  status?: 'active' | 'paused' | 'ended' | 'pending', 
  paymentReceiptUrl?: string,
  paymentStatus?: 'pending' | 'paid' | 'failed',
  isCreator?: boolean,
  isEventDayOrPast?: boolean,
  mediaCount?: number
}) {
  const [step, setStep] = useState<Step>('frame');
  const [selectedFrame, setSelectedFrame] = useState(FRAMES[0]);
  
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Locking Logic
  // 1. Creator: Needs paymentStatus === 'paid' to upload before event. Limit 20.
  // 2. Guest: Only on event day.
  
  const isPaid = paymentStatus === 'paid';
  const creatorLimit = 20;
  
  let isLocked = false;
  let lockMessage = '';

  if (isEventDayOrPast) {
    // On event day or after, everyone can upload (if not paused/ended)
    isLocked = false;
  } else if (isCreator) {
    // Before event day, creator can upload if paid, up to 20 photos
    if (!isPaid) {
      isLocked = true;
      lockMessage = 'Aguardando confirmação de pagamento para liberar seus envios exclusivos.';
    } else if (mediaCount >= creatorLimit) {
      isLocked = true;
      lockMessage = `Você atingiu o limite de ${creatorLimit} envios antecipados. Mais envios estarão disponíveis no dia do evento.`;
    }
  } else {
    // Guest before event day
    isLocked = true;
    lockMessage = 'O envio de fotos para convidados será liberado apenas no dia do evento.';
  }
  
  // Remove "Verifying" message as requested ("retire esse modo de teste")
  // We just unlock it for the creator.
  
  // Cropper state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow animation to finish
      setTimeout(() => {
        setStep('frame');
        setFile(null);
        setPreviewUrl(null);
        setName('');
        setMessage('');
        setZoom(1);
        setCrop({ x: 0, y: 0 });
        setCroppedImage(null);
        setSelectedFrame(FRAMES[0]);
      }, 300);
    }
  }, [isOpen]);

  const getUploaderId = () => {
    let id = localStorage.getItem('memory_uploader_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('memory_uploader_id', id);
    }
    return id;
  };

  const handleFrameSelect = (frame: typeof FRAMES[0]) => {
    setSelectedFrame(frame);
    setStep('upload');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);

      if (selectedFile.type.startsWith('image/')) {
        setStep('crop');
      } else {
        // Skip crop for videos
        setStep('details');
      }
    }
  };

  const handleConfirmCrop = async () => {
    if (previewUrl && croppedAreaPixels) {
      try {
        const cropped = await getCroppedImg(previewUrl, croppedAreaPixels, 0);
        setCroppedImage(cropped);
        setStep('details');
        toast.success('Foto enquadrada!');
      } catch (e) {
        console.error(e);
        toast.error('Erro ao processar imagem');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isPaused) {
      toast.error('Evento pausado.');
      return;
    }
    
    if (!isCloudinaryConfigured || !isSupabaseConfigured) {
      toast.error('Erro de configuração do sistema.');
      return;
    }

    if (!file || !name) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsUploading(true);
      let fileToUpload: File | Blob = croppedImage || file;
      const isVideo = file.type.startsWith('video/');

      if (isVideo) {
        // Validação de duração - Mais resiliente para dispositivos móveis
        let duration = 0;
        try {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.muted = true;
          video.playsInline = true;
          
          duration = await new Promise<number>((resolve) => {
            // Timeout de 4 segundos para não travar o upload se o browser demorar a ler
            const timeout = setTimeout(() => {
              console.warn('Timeout ao ler metadados do vídeo');
              resolve(0);
            }, 4000);

            video.onloadedmetadata = () => {
              clearTimeout(timeout);
              console.log('Metadados carregados, duração:', video.duration);
              resolve(video.duration || 0);
            };
            
            video.onerror = () => {
              clearTimeout(timeout);
              console.warn('Erro ao ler metadados do vídeo, permitindo upload sem validação de tempo');
              resolve(0); // Resolve com 0 para não bloquear o upload em dispositivos problemáticos
            };
            
            video.src = URL.createObjectURL(file);
          });
          
          if (video.src) URL.revokeObjectURL(video.src);
        } catch (e) {
          console.error('Erro na extração de metadados:', e);
          duration = 0;
        }

        // Só bloqueia se tivermos certeza que a duração é maior que o limite
        if (duration > 0 && duration > 20.5) { 
          toast.error('Vídeo muito longo (Máx 20 segundos).');
          setIsUploading(false);
          return;
        }

        const maxSize = 30 * 1024 * 1024; // 30MB
        if (file.size > maxSize) {
          toast.error('Vídeo muito grande (Máx 30MB).');
          setIsUploading(false);
          return;
        }
      } else if (file.type.startsWith('image/')) {
        const currentSize = fileToUpload.size;
        if (currentSize > 1024 * 1024) {
          const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          try {
            fileToUpload = await imageCompression(fileToUpload as File, options);
          } catch (error) {
            console.error('Erro compressão:', error);
          }
        }
      }
      
      toast.loading('Enviando...', { id: 'upload' });
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
      toast.success('Enviado com sucesso!');
      
      setIsOpen(false);
      if (onUploadSuccess) onUploadSuccess();
      
    } catch (error: any) {
      console.error('Erro upload:', error);
      toast.error(`Erro ao enviar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const resetFlow = () => {
    setStep('frame');
    setFile(null);
    setPreviewUrl(null);
    setCroppedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed bottom-8 right-4 sm:bottom-6 sm:right-6 z-50">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button
            disabled={isPaused || isLocked}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group ${
              isPaused || isLocked
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400'
            }`}
          >
            <div className="relative">
              <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:opacity-0 transition-opacity duration-300" />
              <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-white absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </button>
        </DialogTrigger>
        
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-3xl border-none p-0 overflow-hidden bg-white max-h-[90vh] flex flex-col">
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar h-full">
            
            {isLocked && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl mb-6 text-center text-sm font-medium">
                {lockMessage}
              </div>
            )}
            
            {/* Header with Back Button */}
            <div className="flex items-center justify-between mb-6">
              {step !== 'frame' && (
                <button 
                  onClick={() => {
                    if (step === 'upload') setStep('frame');
                    if (step === 'crop') setStep('upload');
                    if (step === 'details') {
                      if (file?.type.startsWith('video/')) {
                        setStep('upload');
                      } else {
                        setStep('crop');
                      }
                    }
                  }}
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-600" />
                </button>
              )}
              <DialogTitle className="text-xl font-bold text-gray-900 flex-1 text-center pr-8">
                {step === 'frame' && 'Escolha a Moldura'}
                {step === 'upload' && 'Selecione a Foto'}
                {step === 'crop' && 'Ajuste a Foto'}
                {step === 'details' && 'Finalizar'}
              </DialogTitle>
            </div>

            {/* STEP 1: FRAME SELECTION */}
            {step === 'frame' && (
              <div className="grid grid-cols-2 gap-4">
                {FRAMES.map((frame) => (
                  <button
                    key={frame.id}
                    onClick={() => handleFrameSelect(frame)}
                    className="flex flex-col items-center p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-500 hover:bg-purple-50 transition-all group"
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{frame.icon}</div>
                    <span className="font-medium text-gray-700">{frame.name}</span>
                    <div 
                      className="mt-3 bg-gray-200 rounded-sm border-2 border-gray-300"
                      style={{ 
                        width: '40px', 
                        height: `${40 / frame.aspect}px`,
                        maxHeight: '60px'
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* STEP 2: UPLOAD */}
            {step === 'upload' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <div 
                  className="w-32 bg-gray-100 rounded-lg border-4 border-dashed border-gray-300 flex items-center justify-center mb-4"
                  style={{ aspectRatio: selectedFrame.aspect }}
                >
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
                
                <p className="text-center text-gray-600 px-4">
                  A foto será ajustada para o formato <strong>{selectedFrame.name}</strong>
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <label
                  htmlFor="file-upload"
                  className="w-full bg-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <Camera className="w-6 h-6" />
                  Tirar ou Escolher Foto
                </label>
              </div>
            )}

            {/* STEP 3: CROP (Simplified) */}
            {step === 'crop' && previewUrl && (
              <div className="flex flex-col h-full">
                <div className="relative w-full bg-gray-100 rounded-xl overflow-hidden shadow-inner mb-6" style={{ height: '50vh' }}>
                  <Cropper
                    image={previewUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={selectedFrame.aspect}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    showGrid={false}
                    objectFit="cover" // Ensure it fills the frame
                  />
                </div>
                
                <p className="text-center text-sm text-gray-500 mb-6">
                  Arraste a imagem para ajustar o enquadramento
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStep('upload');
                      setFile(null);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Trocar Foto
                  </button>
                  <button
                    onClick={handleConfirmCrop}
                    className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Confirmar
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: DETAILS */}
            {step === 'details' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center mb-6">
                  <div 
                    className="relative rounded-lg overflow-hidden shadow-md border border-gray-200"
                    style={{ width: '120px', aspectRatio: selectedFrame.aspect }}
                  >
                    {file?.type.startsWith('video/') ? (
                      <video 
                        src={previewUrl!} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <img 
                        src={croppedImage ? URL.createObjectURL(croppedImage) : previewUrl!} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>

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
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Mensagem (Opcional)
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Deixe uma mensagem..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar para o Álbum'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={resetFlow}
                  className="w-full text-gray-500 text-sm py-2 hover:text-gray-700"
                >
                  Começar do zero
                </button>
              </form>
            )}

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
