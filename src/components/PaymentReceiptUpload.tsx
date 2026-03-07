import { useState } from 'react';
import { Upload, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadToCloudinary } from '@/lib/cloudinary';
import toast from 'react-hot-toast';

interface PaymentReceiptUploadProps {
  eventId: string;
  onUploadSuccess: (url: string) => void;
}

export function PaymentReceiptUpload({ eventId, onUploadSuccess }: PaymentReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setIsUploading(true);
        toast.loading('Enviando comprovante...', { id: 'upload-receipt' });
        const fileUrl = await uploadToCloudinary(file);
        toast.dismiss('upload-receipt');
        toast.success('Comprovante enviado com sucesso!');
        onUploadSuccess(fileUrl);
      } catch (error) {
        console.error('Error uploading receipt:', error);
        toast.error('Erro ao enviar comprovante.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-200 text-center">
      <h3 className="text-xl font-bold mb-4">Enviar Comprovante de Pagamento</h3>
      <p className="text-gray-600 mb-6">Para liberar seu evento, por favor, envie o comprovante de pagamento.</p>
      
      <label className="cursor-pointer inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity">
        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
        {isUploading ? 'Enviando...' : 'Selecionar Comprovante'}
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} disabled={isUploading} />
      </label>
    </div>
  );
}
