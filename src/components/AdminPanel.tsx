import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Event, MediaItem } from '@/types';
import { useEvents } from '@/hooks/useEvents';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MediaWall } from './MediaWall';
import { QRCodeDisplay } from './QRCodeDisplay';
import { CreateEventModal } from './CreateEventModal';
import { WebhookTester } from './WebhookTester';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Calendar,
  Image,
  Settings,
  Search,
  Plus,
  QrCode,
  Trash2,
  Eye,
  Users,
  TrendingUp,
  LogOut,
  ChevronRight,
  Download,
  Play,
  Pause,
  Eraser,
  Lock,
  Shield,
  RotateCcw,
  CheckCircle2,
  Activity,
  FileText
} from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
}

type AdminView = 'dashboard' | 'events' | 'media' | 'settings' | 'webhooks' | 'receipts';

export function AdminPanel({ onClose }: AdminPanelProps) {
  const ADMIN_EMAIL = 'linktestadoeaprovado@gmail.com';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [view, setView] = useState<AdminView>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showMediaWall, setShowMediaWall] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isFreeTestMode, setIsFreeTestMode] = useState(false);
  const [isOneRealTestMode, setIsOneRealTestMode] = useState(false);
  const [isInfiniteFreeMode, setIsInfiniteFreeMode] = useState(false);

  const {
    events,
    media,
    createEvent,
    updateEvent,
    deleteEvent,
    approveMedia,
    deleteMedia,
    stats
  } = useEvents();

  useEffect(() => {
    supabase?.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      }
    });

    // Listen for WhatsApp notifications from useEvents hook
    const handleWhatsAppNotification = (e: any) => {
      const { phone, message, url, eventName } = e.detail;
      toast((t) => (
        <div className="flex flex-col gap-2">
          <p className="font-bold text-sm">Notificação Pendente: {eventName}</p>
          <p className="text-xs text-gray-600">O evento foi pausado. Enviar aviso ao cliente?</p>
          <div className="flex gap-2 mt-1">
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
              onClick={() => {
                window.open(url, '_blank');
                toast.dismiss(t.id);
              }}
            >
              Enviar WhatsApp
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-8"
              onClick={() => toast.dismiss(t.id)}
            >
              Ignorar
            </Button>
          </div>
        </div>
      ), {
        duration: 10000,
        position: 'top-right',
        icon: '📱'
      });
    };

    window.addEventListener('whatsapp-notification', handleWhatsAppNotification);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('whatsapp-notification', handleWhatsAppNotification);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!supabase) {
      // Fallback for when Supabase is not configured
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
      if (password === adminPassword) {
        setIsAuthenticated(true);
        toast.success('Bem-vindo ao painel!');
      } else {
        toast.error('Senha incorreta');
      }
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: password
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        // Try to create the account if it's the default password
        const defaultPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
        if (password === defaultPassword) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: ADMIN_EMAIL,
            password: password
          });
          if (signUpError) {
            toast.error('Erro ao criar conta de admin: ' + signUpError.message);
          } else {
            toast.success('Conta de admin criada! Verifique o email ' + ADMIN_EMAIL + ' para confirmar.');
          }
        } else {
          toast.error('Senha incorreta.');
        }
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Por favor, confirme o email ' + ADMIN_EMAIL + ' primeiro.');
      } else {
        toast.error('Erro ao fazer login: ' + error.message);
      }
    } else {
      setIsAuthenticated(true);
      toast.success('Bem-vindo ao painel!');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!supabase) {
      toast.error('Supabase não configurado');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, {
      redirectTo: window.location.origin + '/#/admin',
    });
    if (error) {
      toast.error('Erro ao enviar email: ' + error.message);
    } else {
      toast.success('Email de recuperação enviado para ' + ADMIN_EMAIL);
    }
    setIsLoading(false);
  };

  const handleDownloadEvent = async (event: Event) => {
    try {
      setIsDownloading(event.id);
      toast.loading(`Preparando download do evento ${event.eventName}...`, { id: 'download' });

      const eventMedia = media.filter(m => m.eventId === event.id && m.status === 'approved');
      
      if (eventMedia.length === 0) {
        toast.error('Não há mídias aprovadas para baixar neste evento.', { id: 'download' });
        setIsDownloading(null);
        return;
      }

      const zip = new JSZip();
      const folder = zip.folder(event.eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase());

      if (!folder) {
         throw new Error('Erro ao criar pasta no arquivo zip');
      }

      // Download each file and add to zip
      const downloadPromises = eventMedia.map(async (item, index) => {
        try {
          const response = await fetch(item.originalUrl || item.url);
          const blob = await response.blob();
          const extension = item.type === 'video' ? 'mp4' : 'jpg';
          const filename = `${item.uploadedBy.replace(/[^a-z0-9]/gi, '_')}_${index + 1}.${extension}`;
          folder.file(filename, blob);
        } catch (error) {
          console.error(`Erro ao baixar arquivo ${item.url}:`, error);
        }
      });

      await Promise.all(downloadPromises);

      toast.loading('Compactando arquivos...', { id: 'download' });
      const content = await zip.generateAsync({ type: 'blob' });
      
      saveAs(content, `${event.eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_memorias.zip`);
      toast.success('Download concluído!', { id: 'download' });
    } catch (error) {
      console.error('Erro no download:', error);
      toast.error('Erro ao fazer o download das mídias.', { id: 'download' });
    } finally {
      setIsDownloading(null);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event =>
      event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

  const pendingMediaCount = useMemo(() => {
    return media.filter(item => item.status === 'pending').length;
  }, [media]);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total de Eventos</p>
                <p className="text-3xl font-bold">{stats.totalEvents}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total de Mídias</p>
                <p className="text-3xl font-bold">{stats.totalMedia}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Image className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Pendentes</p>
                <p className="text-3xl font-bold">{pendingMediaCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Eventos Ativos</p>
                <p className="text-3xl font-bold">{stats.activeEvents}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Eventos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.slice(0, 5).map(event => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedEvent(event);
                  setShowMediaWall(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                    {event.eventName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{event.eventName}</p>
                    <p className="text-sm text-gray-500">{event.clientName}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhum evento criado ainda</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5 text-blue-600" />
              Mídias Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {media.filter(m => m.status === 'pending').slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                <img
                  src={item.thumbnailUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.uploadedBy}</p>
                  <p className="text-sm text-gray-500">{new Date(item.uploadedAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => approveMedia(item.id, true)}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => approveMedia(item.id, false)}
                  >
                    Rejeitar
                  </Button>
                </div>
              </div>
            ))}
            {pendingMediaCount === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhuma mídia pendente</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderReceipts = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Comprovantes de Pagamento</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.filter(e => e.paymentReceiptUrl).map(event => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle className="text-lg">{event.eventName}</CardTitle>
              <p className="text-sm text-gray-500">{event.clientName}</p>
            </CardHeader>
            <CardContent>
              {event.paymentReceiptUrl.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-48 flex flex-col items-center justify-center bg-gray-100 rounded-lg mb-4 border border-gray-200">
                  <FileText className="w-16 h-16 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Documento PDF</p>
                </div>
              ) : (
                <img 
                  src={event.paymentReceiptUrl} 
                  alt="Comprovante" 
                  className="w-full h-48 object-cover rounded-lg mb-4" 
                  onError={(e) => {
                    console.error(`Erro ao carregar imagem do comprovante: ${event.paymentReceiptUrl}`);
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Erro+ao+carregar';
                  }}
                />
              )}
              <Button 
                className="w-full"
                onClick={() => {
                  // Abre a URL original diretamente.
                  // O Cloudinary deve servir o arquivo corretamente agora que a configuração foi ajustada.
                  window.open(event.paymentReceiptUrl, '_blank');
                }}
              >
                Ver Comprovante
              </Button>
            </CardContent>
          </Card>
        ))}
        {events.filter(e => e.paymentReceiptUrl).length === 0 && (
          <p className="text-center text-gray-500 py-8 col-span-full">Nenhum comprovante enviado ainda.</p>
        )}
      </div>
    </div>
  );

  const renderEvents = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm">
            <span className="text-sm font-medium text-gray-700">Modo Grátis (Admin)</span>
            <Switch 
              checked={isFreeTestMode} 
              onCheckedChange={setIsFreeTestMode}
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm">
            <span className="text-sm font-medium text-gray-700">Modo Infinito Grátis</span>
            <Switch 
              checked={isInfiniteFreeMode} 
              onCheckedChange={setIsInfiniteFreeMode}
            />
          </div>
          <Button
            onClick={() => {
              setIsFreeTestMode(false);
              setIsOneRealTestMode(true);
              setIsInfiniteFreeMode(false);
              setShowCreateModal(true);
            }}
            variant="outline"
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            Teste R$ 1,00
          </Button>
          <Button
            onClick={() => {
              setIsFreeTestMode(false);
              setIsOneRealTestMode(false);
              setIsInfiniteFreeMode(false);
              setShowCreateModal(true);
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map(event => {
          const eventMedia = media.filter(m => m.eventId === event.id);
          const pendingCount = eventMedia.filter(m => m.status === 'pending').length;

          return (
            <Card key={event.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                    {event.eventName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadEvent(event)}
                      disabled={isDownloading === event.id}
                      className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-all disabled:opacity-50 shadow-sm"
                      title="Baixar todas as mídias (ZIP)"
                    >
                      <Download className={`w-5 h-5 text-blue-600 ${isDownloading === event.id ? 'animate-bounce' : ''}`} />
                    </button>
                    <button
                      onClick={() => {
                        const newStatus = event.status === 'active' ? 'paused' : 'active';
                        const message = newStatus === 'active' 
                          ? 'Evento retomado! Novos envios permitidos.' 
                          : 'Evento pausado! Novos envios estão bloqueados.';
                        
                        updateEvent(event.id, { status: newStatus });
                        toast.success(message);
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        event.status === 'paused' 
                          ? 'bg-green-100 hover:bg-green-200 text-green-600' 
                          : 'bg-orange-100 hover:bg-orange-200 text-orange-600'
                      }`}
                      title={event.status === 'paused' ? 'Retomar envios' : 'Pausar envios'}
                    >
                      {event.status === 'paused' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => {
                        if (event.status === 'ended') {
                          updateEvent(event.id, { status: 'active' });
                          toast.success('Evento reiniciado com sucesso!');
                        } else {
                          if (window.confirm('Deseja finalizar este evento? Isso bloqueará novos envios permanentemente (até que você reinicie).')) {
                            updateEvent(event.id, { status: 'ended' });
                            toast.success('Evento finalizado!');
                            handleDownloadEvent(event); // Suggest download on end
                          }
                        }
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        event.status === 'ended'
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-600'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                      title={event.status === 'ended' ? 'Reiniciar Evento' : 'Finalizar Evento'}
                    >
                      {event.status === 'ended' ? <RotateCcw className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja apagar TODAS as mídias deste evento para liberar espaço? Esta ação não pode ser desfeita.')) {
                          const eventMedia = media.filter(m => m.eventId === event.id);
                          eventMedia.forEach(m => deleteMedia(m.id));
                          toast.success('Mídias apagadas com sucesso! Espaço liberado.');
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center hover:bg-yellow-200 transition-all shadow-sm"
                      title="Limpar mídias (Liberar espaço)"
                    >
                      <Eraser className="w-5 h-5 text-yellow-600" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowQRCode(true);
                      }}
                      className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all shadow-sm"
                      title="Ver QR Code"
                    >
                      <QrCode className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(event.id)}
                      className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-all shadow-sm"
                      title="Excluir evento"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                    {event.status === 'paused' && event.settings?.clientPhone && (
                      <button
                        onClick={() => {
                          const message = `Olá! Notamos que o pagamento para o seu evento "${event.eventName}" ainda não foi confirmado. Sua galeria foi pausada temporariamente. Assim que o pagamento for confirmado, ela será ativada automaticamente!`;
                          const whatsappUrl = `https://api.whatsapp.com/send?phone=${event.settings.clientPhone.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
                          window.open(whatsappUrl, '_blank');
                        }}
                        className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-all shadow-sm"
                        title="Enviar aviso via WhatsApp"
                      >
                        <svg className="w-5 h-5 text-green-600 fill-current" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <CardTitle className="mt-4 text-lg">{event.eventName}</CardTitle>
                <p className="text-sm text-gray-500">{event.clientName}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(event.eventDate).toLocaleDateString('pt-BR')} às {event.eventTime}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    event.status === 'active' ? 'bg-green-100 text-green-700' :
                    event.status === 'paused' ? 'bg-orange-100 text-orange-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {event.status === 'active' ? 'Ativo' :
                     event.status === 'paused' ? 'Pausado' : 'Finalizado'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    event.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                    event.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {event.paymentStatus === 'paid' ? 'Pago' :
                     event.paymentStatus === 'failed' ? 'Falhou' : 'Pagamento Pendente'}
                  </span>
                  {event.paymentReceiptUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(event.paymentReceiptUrl, '_blank');
                      }}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Ver Recibo
                    </Button>
                  )}
                  <span className="flex items-center gap-1">
                    <Image className="w-4 h-4" />
                    {eventMedia.length} mídias
                  </span>
                </div>
                {pendingCount > 0 && (
                  <div className="mb-4 px-3 py-2 bg-yellow-50 rounded-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-sm text-yellow-700">{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowMediaWall(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Mural
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Nenhum evento encontrado</h3>
          <p className="text-gray-500">Crie um novo evento para começar</p>
        </div>
      )}

      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Tem certeza que deseja excluir este evento? Todas as mídias serão perdidas.</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (showDeleteConfirm) {
                  deleteEvent(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }
              }}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center p-4">
        <div className="text-white text-xl font-bold">Carregando...</div>
      </div>
    );
  }

  if (isRecoveryMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Nova Senha</h2>
          <p className="text-gray-500 mb-8">Digite sua nova senha de administrador</p>
          
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if (newPassword !== confirmPassword) {
                toast.error('As senhas não coincidem');
                return;
              }
              if (newPassword.length < 6) {
                toast.error('A senha deve ter pelo menos 6 caracteres');
                return;
              }
              setIsLoading(true);
              const { error } = await supabase!.auth.updateUser({ password: newPassword });
              if (error) {
                toast.error('Erro ao atualizar senha: ' + error.message);
              } else {
                toast.success('Senha atualizada com sucesso!');
                setIsRecoveryMode(false);
                setView('dashboard');
              }
              setIsLoading(false);
            }}
            className="space-y-4"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="password"
                placeholder="Nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 h-12 rounded-xl text-lg"
                autoFocus
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 h-12 rounded-xl text-lg"
              />
            </div>
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
          <p className="text-gray-500 mb-8">Digite a senha para acessar o painel administrativo</p>
          
          <form 
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="password"
                placeholder="Senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 rounded-xl text-lg"
                autoFocus
              />
            </div>
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                Esqueci a senha
              </button>
            </div>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1 h-12 rounded-xl"
              >
                Voltar
              </Button>
              <Button 
                type="submit"
                disabled={isLoading}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <div className="flex">
        {/* Sidebar (Desktop) */}
        <aside className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 z-40">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-800">Admin</h1>
                <p className="text-xs text-gray-500">Minhas Eternas Memórias</p>
              </div>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => setView('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </button>
              <button
                onClick={() => setView('events')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'events' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Calendar className="w-5 h-5" />
                Eventos
              </button>
              <button
                onClick={() => setView('media')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'media' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Image className="w-5 h-5" />
                Mídias
                {pendingMediaCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
                    {pendingMediaCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setView('receipts')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'receipts' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FileText className="w-5 h-5" />
                Comprovantes
              </button>
              <button
                onClick={() => setView('webhooks')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'webhooks' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Activity className="w-5 h-5" />
                Webhooks / Logs
              </button>
              <button
                onClick={() => setView('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'settings' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Settings className="w-5 h-5" />
                Configurações
              </button>
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </div>
        </aside>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-40 pb-safe">
          <button
            onClick={() => setView('dashboard')}
            className={`flex flex-col items-center p-2 rounded-lg ${view === 'dashboard' ? 'text-purple-600' : 'text-gray-500'}`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px] mt-1">Início</span>
          </button>
          <button
            onClick={() => setView('events')}
            className={`flex flex-col items-center p-2 rounded-lg ${view === 'events' ? 'text-purple-600' : 'text-gray-500'}`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-[10px] mt-1">Eventos</span>
          </button>
          <button
            onClick={() => setView('media')}
            className={`flex flex-col items-center p-2 rounded-lg relative ${view === 'media' ? 'text-purple-600' : 'text-gray-500'}`}
          >
            <Image className="w-6 h-6" />
            <span className="text-[10px] mt-1">Mídias</span>
            {pendingMediaCount > 0 && (
              <span className="absolute top-1 right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          <button
            onClick={() => setView('webhooks')}
            className={`flex flex-col items-center p-2 rounded-lg ${view === 'webhooks' ? 'text-purple-600' : 'text-gray-500'}`}
          >
            <Activity className="w-6 h-6" />
            <span className="text-[10px] mt-1">Logs</span>
          </button>
          <button
            onClick={async () => {
              if (supabase) {
                await supabase.auth.signOut();
              }
              onClose();
            }}
            className="flex flex-col items-center p-2 rounded-lg text-gray-500"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] mt-1">Sair</span>
          </button>
        </nav>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 p-4 md:p-8 w-full">
          <div className="max-w-7xl mx-auto">
            {view === 'dashboard' && renderDashboard()}
            {view === 'events' && renderEvents()}
            {view === 'receipts' && renderReceipts()}
            {view === 'media' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-2xl font-bold text-gray-800">Todas as Mídias</h2>
                  <Button 
                    onClick={() => window.open(`/#/evento/${events[0]?.id || ''}`, '_blank')}
                    className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Testar Upload
                  </Button>
                </div>
                {events.length > 0 ? (
                  <MediaWall
                    event={events[0]}
                    media={media}
                    isAdmin={true}
                    onApprove={approveMedia}
                    onDelete={deleteMedia}
                  />
                ) : (
                  <p className="text-center text-gray-500 py-16">Nenhum evento criado ainda</p>
                )}
              </div>
            )}
            {view === 'webhooks' && <WebhookTester />}
            {view === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>Segurança</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-gray-600">Para trocar a senha do administrador, enviaremos um link de confirmação para o email <strong>{ADMIN_EMAIL}</strong>.</p>
                    <Button 
                      onClick={handleForgotPassword}
                      disabled={isLoading}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      {isLoading ? 'Enviando...' : 'Trocar Senha'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* QR Code Modal */}
      {selectedEvent && (
        <QRCodeDisplay
          eventId={selectedEvent.id}
          eventName={selectedEvent.eventName}
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          status={selectedEvent.status}
        />
      )}

      {/* Media Wall Modal */}
      <Dialog open={showMediaWall} onOpenChange={setShowMediaWall}>
        <DialogContent className="max-w-7xl w-[95vw] h-[90vh] overflow-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle>Mural de Mídias</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="mt-4">
              <div className="flex justify-end mb-4">
                <Button 
                  onClick={() => window.open(`/#/evento/${selectedEvent.id}`, '_blank')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Testar Upload
                </Button>
              </div>
              <MediaWall
                event={selectedEvent}
                media={media.filter(m => m.eventId === selectedEvent.id)}
                isAdmin={true}
                onApprove={approveMedia}
                onDelete={deleteMedia}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setIsOneRealTestMode(false);
          setIsInfiniteFreeMode(false);
        }}
        selectedPlan={isInfiniteFreeMode ? 'infinito' : (isFreeTestMode ? 'test' : 'festa')}
        isTestMode={isFreeTestMode}
        isOneRealTestMode={isOneRealTestMode}
        isInfiniteFreeMode={isInfiniteFreeMode}
        onCreate={async (data) => {
          const newEvent = await createEvent(data);
          setSelectedEvent(newEvent);
          setShowQRCode(true);
        }}
      />
    </div>
  );
}
