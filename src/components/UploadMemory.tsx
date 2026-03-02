import React, { useState } from 'react';
import { Upload, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { uploadToCloudinary, isCloudinaryConfigured } from '../lib/cloudinary';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

export function UploadMemory({ eventId, onUploadSuccess }: { eventId?: string, onUploadSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isCloudinaryConfigured || !isSupabaseConfigured) {
      toast.error('O sistema ainda não está conectado ao Cloudinary/Supabase. Configure as chaves no .env');
      return;
    }

    if (!file || !name) {
      toast.error('Por favor, selecione uma foto/vídeo e informe seu nome.');
      return;
    }

    try {
      setIsUploading(true);
      
      // 1. Upload to Cloudinary
      const fileUrl = await uploadToCloudinary(file);
      
      // 2. Save to Supabase
      const isVideo = file.type.startsWith('video/');
      const { error } = await supabase!.from('memories').insert([
        {
          url: fileUrl,
          type: isVideo ? 'video' : 'image',
          uploader_name: name,
          message: message || null,
          event_id: eventId || null,
        }
      ]);

      if (error) throw error;

      toast.success('Memória enviada com sucesso! Obrigado por compartilhar.');
      
      // Reset form
      setFile(null);
      setName('');
      setMessage('');
      if (onUploadSuccess) onUploadSuccess();
      
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error(error.message || 'Ocorreu um erro ao enviar sua memória.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-auto border border-purple-100">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-playfair font-bold text-gray-900">Compartilhe uma Memória</h3>
        <p className="text-gray-500 mt-2">Envie suas fotos ou vídeos deste momento especial.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Input */}
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              file ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {file ? (
              <div className="text-center p-4">
                {file.type.startsWith('video/') ? (
                  <Video className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                )}
                <p className="text-sm font-medium text-purple-900 truncate max-w-[200px]">
                  {file.name}
                </p>
                <p className="text-xs text-purple-600 mt-1">Clique para trocar</p>
              </div>
            ) : (
              <div className="text-center p-4">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Clique para selecionar</p>
                <p className="text-xs text-gray-500 mt-1">Fotos ou Vídeos</p>
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
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
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
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isUploading}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar Memória'
          )}
        </button>
      </form>
    </div>
  );
}
