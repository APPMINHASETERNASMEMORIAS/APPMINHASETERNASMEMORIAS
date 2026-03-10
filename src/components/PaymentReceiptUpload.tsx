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
        const fileUrl = await uploadToCloudinary(file, 'comprovantes');
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
    <div className="p-4 bg-white rounded-xl border border-gray-100 text-center">
      <h3 className="text-lg font-bold mb-2">Já fez o pagamento?</h3>
      <p className="text-xs text-gray-500 mb-4">Envie o comprovante para liberar seu evento agora.</p>
      
      <label className="cursor-pointer inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors">
        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {isUploading ? 'Enviando...' : 'Enviar Comprovante'}
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} disabled={isUploading} />
      </label>
    </div>
  );
}
