import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { HashRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Toaster } from 'react-hot-toast';
import { UploadMemory } from './components/UploadMemory';
import { MemoryGallery } from './components/MemoryGallery';
import { PaymentReceiptUpload } from './components/PaymentReceiptUpload';
import { 
  Heart, 
  Sparkles, 
  Camera, 
  Users, 
  Zap, 
  ChevronRight, 
  Star,
  Instagram,
  Facebook,
  Twitter,
  ArrowRight,
  Play,
  X,
  Menu,
  Shield,
  Clock,
  Infinity as InfinityIcon,
  Gift,
  CheckCircle2,
  Download,
  Share2,
  Lock,
  QrCode
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Switch } from './components/ui/switch';
import { useEvents } from './hooks/useEvents';
import { CreateEventModal } from './components/CreateEventModal';
import { QRCodeDisplay } from './components/QRCodeDisplay';
import { AdminPanel } from './components/AdminPanel';
import { ClientLoginModal } from './components/ClientLoginModal';
import { CountdownTimer } from './components/CountdownTimer';
import { DownloadEventButton } from './components/DownloadEventButton';
import { WhatsAppButton } from './components/WhatsAppButton';
import { WebhookTester } from './components/WebhookTester';
import { Event } from './types';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-white text-center">
          <div className="max-w-md">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Ops! Algo deu errado.</h2>
            <p className="text-gray-400 mb-8">Ocorreu um erro ao carregar o painel administrativo. Isso pode ser causado por dados corrompidos no navegador.</p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="bg-red-600 hover:bg-red-700 h-12 font-bold"
              >
                Limpar Tudo e Recomeçar
              </Button>
              <Button 
                variant="ghost"
                onClick={() => window.location.href = '/'}
                className="text-gray-400 hover:text-white"
              >
                Voltar para o Início
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Animation Components
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ 
        duration: 0.8, 
        delay,
        ease: [0.165, 0.84, 0.44, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FloatingElement({ children, delay = 0, duration = 3 }: { children: React.ReactNode; delay?: number; duration?: number }) {
  return (
    <motion.div
      animate={{ 
        y: [-10, 10, -10],
      }}
      transition={{ 
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
}

function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function ValueCard({ icon: Icon, title, description, gradient, delay }: { 
  icon: any; 
  title: string; 
  description: string; 
  gradient: string;
  delay: number;
}) {
  return (
    <AnimatedSection delay={delay}>
      <motion.div
        whileHover={{ y: -10, scale: 1.02 }}
        transition={{ duration: 0.3 }}
        className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
      >
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </motion.div>
    </AnimatedSection>
  );
}

function StepCard({ number, title, description, icon: Icon, delay }: { 
  number: string; 
  title: string; 
  description: string; 
  icon: any;
  delay: number;
}) {
  return (
    <AnimatedSection delay={delay}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="relative bg-white rounded-3xl p-8 shadow-xl text-center group"
      >
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
          {number}
        </div>
        <div className="mt-6 mb-4 flex justify-center">
          <FloatingElement delay={delay * 0.5}>
            <Icon className="w-12 h-12 text-purple-600" />
          </FloatingElement>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </motion.div>
    </AnimatedSection>
  );
}

function FeatureRow({ icon: Icon, title, description, image, reverse = false, delay }: { 
  icon: any; 
  title: string; 
  description: string; 
  image: string;
  reverse?: boolean;
  delay: number;
}) {
  return (
    <AnimatedSection delay={delay}>
      <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12`}>
        <motion.div 
          className="flex-1"
          whileInView={{ opacity: 1, x: 0 }}
          initial={{ opacity: 0, x: reverse ? 50 : -50 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center mb-6">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{title}</h3>
          <p className="text-lg text-gray-600 leading-relaxed">{description}</p>
        </motion.div>
        <motion.div 
          className="flex-1"
          whileInView={{ opacity: 1, scale: 1 }}
          initial={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl transform rotate-3 opacity-20" />
            <img 
              src={image} 
              alt={title}
              className="relative rounded-3xl shadow-2xl w-full"
            />
          </div>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}

function LandingPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isClientLoginModalOpen, setIsClientLoginModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<Event | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('festa');
  const [isTestMode, setIsTestMode] = useState(false);
  const { events, createEvent } = useEvents();

  const handleCreateEvent = async (data: any) => {
    const event = await createEvent(data);
    setCreatedEvent(event);
    setIsCreateModalOpen(false);
    setIsQRModalOpen(true);
  };

  const openCreateModal = (plan: string, testMode: boolean = false) => {
    setSelectedPlan(plan);
    setIsTestMode(testMode);
    setIsCreateModalOpen(true);
  };

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Parallax effect for hero
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);

  const navigate = useNavigate();

  useEffect(() => {
    // Barreiras contra cópia
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      // Opcional: Mostrar um alerta discreto
      // toast.error('Conteúdo protegido por direitos autorais.');
    };
    
    const handleDragStart = (e: DragEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquear F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+P, Ctrl+C (opcional)
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') || 
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'p')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Minhas Eternas Memórias
              </span>
            </motion.div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {['Início', 'Como Funciona', 'Recursos', 'Planos', 'Depoimentos'].map((item, index) => (
                <motion.button
                  key={item}
                  onClick={() => scrollToSection(['hero', 'how-it-works', 'features', 'pricing', 'testimonials'][index])}
                  className="text-gray-600 hover:text-purple-600 font-medium transition-colors"
                  whileHover={{ y: -2 }}
                >
                  {item}
                </motion.button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <motion.button
                onClick={() => setIsClientLoginModalOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-purple-600 font-semibold hover:text-purple-800 transition-colors"
              >
                Acessar Minha Galeria
              </motion.button>
              <motion.button
                onClick={() => openCreateModal('festa')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-full font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                Criar Galeria
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-gray-100"
            >
              <div className="px-4 py-4 space-y-3">
                {['Início', 'Como Funciona', 'Recursos', 'Planos', 'Depoimentos'].map((item, index) => (
                  <button
                    key={item}
                    onClick={() => scrollToSection(['hero', 'how-it-works', 'features', 'pricing', 'testimonials'][index])}
                    className="block w-full text-left py-3 px-4 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
                  >
                    {item}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setIsClientLoginModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-purple-100 text-purple-600 px-6 py-3 rounded-full font-semibold mb-2"
                >
                  Acessar Minha Galeria
                </button>
                <button
                  onClick={() => {
                    openCreateModal('festa');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-semibold"
                >
                  Criar Galeria
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gray-900">
          <img 
            src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1920&q=80" 
            alt="Background" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/90 via-pink-500/90 to-orange-400/90" />
          <ParticleBackground />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
        </div>

        <motion.div 
          style={{ y: heroY }}
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-8"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-white text-sm font-medium">✨ Transforme momentos em eternidade</span>
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight"
          >
            Minhas Eternas
            <br />
            <span className="bg-gradient-to-r from-yellow-300 via-white to-yellow-300 bg-clip-text text-transparent">
              Memórias
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-white/90 mb-4 font-light"
          >
            Onde cada instante vira eternidade
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-lg text-white/70 mb-12 max-w-2xl mx-auto"
          >
            Capture, compartilhe e reviva seus momentos mais especiais. 
            Crie galerias únicas para cada ocasião e mantenha suas memórias vivas para sempre.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button
              onClick={() => openCreateModal('festa')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-white/25 transition-shadow flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Criar Minha Galeria
            </motion.button>
            <motion.button
              onClick={() => setIsClientLoginModalOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 px-8 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Ver minha galeria
            </motion.button>
          </motion.div>
          <motion.button
            onClick={() => setIsVideoModalOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-8 text-white/80 hover:text-white underline transition-colors"
          >
            Ver Como Funciona
          </motion.button>

          {/* Video Modal */}
          <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
              <div className="aspect-video w-full">
                <iframe
                  src="https://drive.google.com/file/d/1wPusunuiHGiF8dlP8_02oiL9r7MCeLcX/preview"
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { value: '10K+', label: 'Galerias Criadas' },
              { value: '500K+', label: 'Fotos Compartilhadas' },
              { value: '50K+', label: 'Famílias Felizes' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-white/60 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2"
          >
            <motion.div className="w-1.5 h-3 bg-white/80 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-gradient-to-b from-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="text-purple-600 font-semibold text-sm uppercase tracking-wider">Nossos Valores</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mt-4 mb-6">
              Por que escolher <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Minhas Eternas Memórias</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Oferecemos a melhor experiência para preservar seus momentos especiais com tecnologia de ponta e muito carinho.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ValueCard
              icon={Heart}
              title="Feito com Amor"
              description="Cada detalhe foi pensado para tornar sua experiência única e especial, com carinho em cada pixel."
              gradient="from-pink-500 to-rose-500"
              delay={0.1}
            />
            <ValueCard
              icon={Shield}
              title="100% Seguro"
              description="Suas memórias estão protegidas com criptografia de ponta a ponta e backup automático na nuvem."
              gradient="from-blue-500 to-cyan-500"
              delay={0.2}
            />
            <ValueCard
              icon={Zap}
              title="Super Rápido"
              description="Upload instantâneo e compartilhamento em segundos. Não perca tempo, aproveite o momento."
              gradient="from-yellow-500 to-orange-500"
              delay={0.3}
            />
            <ValueCard
              icon={InfinityIcon}
              title="Para Sempre"
              description="Suas memórias duram a eternidade. Armazenamento ilimitado e acesso vitalício garantido."
              gradient="from-purple-500 to-indigo-500"
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="text-purple-600 font-semibold text-sm uppercase tracking-wider">Como Funciona</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mt-4 mb-6">
              Em apenas <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">3 passos</span> simples
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comece a criar e compartilhar suas memórias em menos de 5 minutos
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <StepCard
              number="1"
              title="Crie sua Galeria"
              description="Escolha um nome, personalize com suas cores favoritas e defina as configurações do seu evento."
              icon={Camera}
              delay={0.1}
            />
            <StepCard
              number="2"
              title="Compartilhe o QR Code"
              description="Envie o código único para seus convidados ou imprima para deixar disponível no local."
              icon={Share2}
              delay={0.2}
            />
            <StepCard
              number="3"
              title="Receba as Fotos"
              description="Todas as fotos e vídeos enviados aparecem automaticamente no seu mural exclusivo."
              icon={Heart}
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          <FeatureRow
            icon={Users}
            title="Colaboração em Tempo Real"
            description="Todos os convidados podem enviar fotos e vídeos instantaneamente. Veja as memórias sendo criadas ao vivo durante seu evento especial."
            image="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80"
            delay={0.1}
          />
          <FeatureRow
            icon={Clock}
            title="Linha do Tempo Mágica"
            description="Reúna todos os momentos especiais em um único lugar, organizados como um calendário mágico de lembranças inesquecíveis."
            image="https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=800&q=80"
            reverse
            delay={0.2}
          />
          <FeatureRow
            icon={Heart}
            title="Amor Eternizado"
            description="Guarde o sentimento de cada momento. Suas memórias são tratadas com o maior carinho e segurança."
            image="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80"
            delay={0.3}
          />
          <FeatureRow
            icon={Camera}
            title="Momentos Românticos"
            description="Perfeito para casamentos, noivados e bodas. Capture a essência do seu amor com galerias dedicadas."
            image="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80"
            reverse
            delay={0.4}
          />
          <FeatureRow
            icon={Download}
            title="Download em Alta Qualidade"
            description="Baixe todas as fotos e vídeos em resolução original. Crie álbuns personalizados e compartilhe como quiser."
            image="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80"
            delay={0.5}
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-playfair font-bold text-gray-900 mb-6">
              Planos e Valores
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Escolha o plano ideal para o tamanho do seu evento. Sem mensalidades, pagamento único.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Plano Íntimo */}
            <AnimatedSection delay={0.1}>
              <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Íntimo</h3>
                  <p className="text-gray-500">Para pequenos encontros</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">R$ 59</span>
                  <span className="text-gray-500">,99</span>
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Até <strong>50</strong> acessos/convidados</span>
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>QR Code para compartilhar</span>
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Link para baixar todas as fotos</span>
                  </li>
                  <li className="flex items-center text-gray-600">
                    <Clock className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                    <span>Acessos guardados por <strong>7 dias</strong></span>
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Galeria interativa em tempo real</span>
                  </li>
                  <li className="flex items-center text-gray-600">
                    <Clock className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                    <span>Evento dura <strong>12 horas</strong> a partir da criação</span>
                  </li>
                </ul>
                <button 
                  onClick={() => openCreateModal('intimo')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-xl transition-colors"
                >
                  Escolher Plano
                </button>
              </div>
            </AnimatedSection>

            {/* Plano Festa (Destaque) */}
            <AnimatedSection delay={0.2}>
              <div className="bg-gradient-to-b from-purple-600 to-pink-600 rounded-3xl p-8 shadow-xl transform md:-translate-y-4 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                  Mais Popular
                </div>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Festa</h3>
                  <p className="text-purple-100">O ideal para a maioria</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">R$ 99</span>
                  <span className="text-purple-200">,99</span>
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-center text-white">
                    <CheckCircle2 className="w-5 h-5 text-yellow-300 mr-3 flex-shrink-0" />
                    <span>Até <strong>100</strong> acessos/convidados</span>
                  </li>
                  <li className="flex items-center text-white">
                    <CheckCircle2 className="w-5 h-5 text-yellow-300 mr-3 flex-shrink-0" />
                    <span>QR Code para compartilhar</span>
                  </li>
                  <li className="flex items-center text-white">
                    <CheckCircle2 className="w-5 h-5 text-yellow-300 mr-3 flex-shrink-0" />
                    <span>Link para baixar todas as fotos</span>
                  </li>
                  <li className="flex items-center text-white">
                    <Clock className="w-5 h-5 text-yellow-300 mr-3 flex-shrink-0" />
                    <span>Acessos guardados por <strong>30 dias</strong></span>
                  </li>
                  <li className="flex items-center text-white">
                    <CheckCircle2 className="w-5 h-5 text-yellow-300 mr-3 flex-shrink-0" />
                    <span>Galeria interativa em tempo real</span>
                  </li>
                  <li className="flex items-center text-white">
                    <Clock className="w-5 h-5 text-yellow-300 mr-3 flex-shrink-0" />
                    <span>Evento dura <strong>12 horas</strong> a partir da criação</span>
                  </li>
                  <li className="flex items-center text-white">
                    <CheckCircle2 className="w-5 h-5 text-yellow-300 mr-3 flex-shrink-0" />
                    <span>Moderação de acessos (opcional)</span>
                  </li>
                </ul>
                <button 
                  onClick={() => openCreateModal('festa')}
                  className="w-full bg-white text-purple-600 hover:bg-gray-50 font-bold py-3 rounded-xl transition-colors shadow-lg"
                >
                  Escolher Plano
                </button>
              </div>
            </AnimatedSection>

            {/* Plano Celebração */}
            <AnimatedSection delay={0.3}>
              <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Celebração</h3>
                  <p className="text-gray-500">Para grandes eventos</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">R$ 159</span>
                  <span className="text-gray-500">,99</span>
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Até <strong>150</strong> acessos/convidados</span>
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>QR Code para compartilhar</span>
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Link para baixar todas as fotos</span>
                  </li>
                  <li className="flex items-center text-gray-600">
                    <Clock className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                    <span>Acessos guardados por <strong>90 dias</strong></span>
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Galeria interativa em tempo real</span>
                  </li>
                  <li className="flex items-center text-gray-600">
                    <Clock className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                    <span>Evento dura <strong>12 horas</strong> a partir da criação</span>
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Download em Alta Resolução</span>
                  </li>
                </ul>
                <button 
                  onClick={() => openCreateModal('celebracao')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-xl transition-colors"
                >
                  Escolher Plano
                </button>
              </div>
            </AnimatedSection>

            {/* Plano Ilimitado */}
            <AnimatedSection delay={0.4}>
              <div className="bg-gray-900 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Ilimitado</h3>
                  <p className="text-gray-400">Sem preocupações</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">R$ 239</span>
                  <span className="text-gray-400">,99</span>
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-center text-gray-300">
                    <InfinityIcon className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
                    <span><strong>Acessos Ilimitados</strong></span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
                    <span>QR Code para compartilhar</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
                    <span>Link para baixar todas as fotos</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <Clock className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
                    <span>Acessos guardados por <strong>6 meses</strong></span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
                    <span>Galeria interativa em tempo real</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <Clock className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
                    <span>Evento dura <strong>12 horas</strong> a partir da criação</span>
                  </li>
                  <li className="flex items-center text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
                    <span>Backup extra em nuvem</span>
                  </li>
                </ul>
                <button 
                  onClick={() => openCreateModal('ilimitado')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Escolher Plano
                </button>
              </div>
            </AnimatedSection>
          </div>
          
          {/* Botão de Teste Admin removido da landing page e movido para o painel admin */}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              O que nossos clientes dizem
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Histórias reais de pessoas que transformaram seus momentos especiais em memórias eternas
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Maria Santos',
                event: 'Casamento',
                text: 'Foi incrível ver todas as fotos do nosso casamento em um só lugar. Nossos convidados adoraram poder contribuir!',
                image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80'
              },
              {
                name: 'João Pedro',
                event: 'Aniversário de 15 anos',
                text: 'A festa da minha filha ficou ainda mais especial com o mural de fotos. Recomendo demais!',
                image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80'
              },
              {
                name: 'Ana Carolina',
                event: 'Chá de Bebê',
                text: 'Conseguimos capturar momentos únicos do chá de bebê. Agora temos lembranças para toda a vida.',
                image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&h=100&q=80'
              }
            ].map((testimonial, index) => (
              <AnimatedSection key={index} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -10 }}
                  className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 text-white"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white/30"
                    />
                    <div>
                      <h4 className="font-bold">{testimonial.name}</h4>
                      <p className="text-white/60 text-sm">{testimonial.event}</p>
                    </div>
                  </div>
                  <p className="text-white/90 leading-relaxed">"{testimonial.text}"</p>
                  <div className="flex gap-1 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                    ))}
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="relative bg-gray-900 rounded-3xl p-12 md:p-16 text-center overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&h=800&q=80" 
                alt="Celebration" 
                className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 to-pink-600/90" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
              <ParticleBackground />
              
              <h2 className="relative text-4xl md:text-5xl font-bold text-white mb-6">
                Pronto para criar suas memórias eternas?
              </h2>
              <p className="relative text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Comece gratuitamente hoje mesmo. Não precisa de cartão de crédito.
              </p>
              <motion.button
                onClick={() => setIsCreateModalOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative bg-white text-purple-600 px-10 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-white/25 transition-shadow"
              >
                Criar Minha Primeira Galeria
              </motion.button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">Minhas Eternas Memórias</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Transformando momentos especiais em memórias que duram para sempre.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Links Rápidos</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => scrollToSection('hero')} className="hover:text-white transition-colors">Início</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">Como Funciona</button></li>
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Recursos</button></li>
                <li><button onClick={() => scrollToSection('testimonials')} className="hover:text-white transition-colors">Depoimentos</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => navigate('/admin')} className="hover:text-white transition-colors">Painel Admin</button></li>
                <li>
                  <button 
                    onClick={() => {
                      if (window.confirm('Isso limpará todos os dados locais. Deseja continuar?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }} 
                    className="hover:text-red-400 transition-colors text-xs opacity-50"
                  >
                    Limpar Cache do Site
                  </button>
                </li>
                <li><a href="mailto:linktestadoeaprovado@gmail.com" className="hover:text-white transition-colors">linktestadoeaprovado@gmail.com</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Redes Sociais</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-purple-600 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-sky-500 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4 text-xs">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Proteção Anti-Cópia Ativa</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Dados Criptografados</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Uso Exclusivo para Eventos</span>
            </div>
            <p className="mb-2">&copy; 2024 Minhas Eternas Memórias. Todos os direitos reservados.</p>
            <p className="text-[10px] opacity-50 max-w-2xl mx-auto">
              Diretrizes de Proteção: É estritamente proibida a reprodução, cópia ou distribuição não autorizada de qualquer conteúdo visual ou textual deste site. 
              As imagens e vídeos carregados são de propriedade de seus respectivos autores e protegidos por leis internacionais de copyright. 
              O uso indevido de scripts para extração de dados resultará em bloqueio imediato do IP.
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        selectedPlan={selectedPlan}
        isTestMode={isTestMode}
        onCreate={handleCreateEvent}
      />

      <ClientLoginModal
        isOpen={isClientLoginModalOpen}
        onClose={() => setIsClientLoginModalOpen(false)}
      />

      {createdEvent && (
        <QRCodeDisplay
          eventId={createdEvent.id}
          eventName={createdEvent.eventName}
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          frameSettings={createdEvent.settings.frameSettings}
          status={createdEvent.status}
        />
      )}
    </div>
  );
}

function EventPage() {
  const { id } = useParams();
  const [refreshGallery, setRefreshGallery] = useState(0);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const navigate = useNavigate();
  const { getEvent, uploadPaymentReceipt, isEventCreator, getEventMedia } = useEvents();
  
  const event = id ? getEvent(id) : undefined;
  const isCreator = id ? isEventCreator(id) : false;
  const media = id ? getEventMedia(id) : [];
  
  // Logic for locking/pausing
  // 1. If status is paused/ended -> Paused for everyone
  // 2. If status is pending:
  //    - If no receipt -> Locked for everyone (waiting payment)
  //    - If receipt exists:
  //      - Creator -> Unlocked (to test/print)
  //      - Guest -> Locked until event day
  
  const today = new Date().toISOString().split('T')[0];
  const isEventDayOrPast = event ? today >= event.eventDate : false;
  
  const isPaused = event?.status === 'paused' || event?.status === 'ended';
  
  // We pass these down to components to handle their specific locking UI
  
  const isEnded = event?.status === 'ended';

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      
      {/* Simple Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Memórias
            </span>
          </div>
          
          {event && (
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsQRModalOpen(true)}
                className="text-gray-600 hover:text-purple-600"
              >
                <QrCode className="w-5 h-5" />
              </Button>
              <CountdownTimer 
                eventDate={event.eventDate} 
                eventTime={event.eventTime}
                clientPhone={event.clientPhone}
              />
            </div>
          )}
        </div>
      </header>

      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-gray-900 mb-4">
              {event ? event.eventName : 'Compartilhe seu momento!'}
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {isEnded
                ? 'Este evento foi finalizado. Agradecemos a todos que compartilharam suas memórias!'
                : isPaused 
                  ? 'O recebimento de fotos para este evento foi pausado pelo administrador.'
                  : (event?.status === 'pending' && !event.paymentReceiptUrl)
                    ? 'Aguardando envio do comprovante para liberar a galeria.'
                    : (event?.status === 'pending' && event.paymentReceiptUrl && !isCreator && !isEventDayOrPast)
                      ? 'A galeria será aberta para convidados no dia do evento.'
                      : 'Tire uma foto ou grave um vídeo e deixe uma mensagem especial.'}
            </p>

            {event?.status === 'pending' && (
              <div className="mt-6">
                <Button 
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
                >
                  Enviar Comprovante
                </Button>
              </div>
            )}
          </div>

            <div className="space-y-8">
              <UploadMemory 
                eventId={id} 
                isPaused={isPaused} 
                status={event?.status} 
                paymentReceiptUrl={event?.paymentReceiptUrl}
                isCreator={isCreator}
                isEventDayOrPast={isEventDayOrPast}
                onUploadSuccess={() => setRefreshGallery(prev => prev + 1)} 
              />
              {event && (
                <DownloadEventButton 
                  eventName={event.eventName} 
                  isEnded={isEnded} 
                  media={media} 
                />
              )}
              <MemoryGallery eventId={id} refreshTrigger={refreshGallery} event={event} />
            </div>
        </div>
      </main>

      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-none">
          <PaymentReceiptUpload 
            eventId={id!} 
            onUploadSuccess={(url) => {
              uploadPaymentReceipt(id!, url);
              setIsReceiptModalOpen(false);
            }} 
          />
        </DialogContent>
      </Dialog>

      {event && (
        <QRCodeDisplay
          eventId={event.id}
          eventName={event.eventName}
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          frameSettings={event.settings.frameSettings}
          status={event.status}
          paymentReceiptUrl={event.paymentReceiptUrl}
          isCreator={isCreator}
          isEventDayOrPast={isEventDayOrPast}
        />
      )}
    </div>
  );
}



function App() {
  return (
    <Router>
      <Toaster position="top-center" />
      <WhatsAppButton />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={
          <ErrorBoundary>
            <AdminPanel onClose={() => window.location.href = '/'} />
          </ErrorBoundary>
        } />
        <Route path="/admin/webhooks" element={<WebhookTester />} />
        <Route path="/evento/:id" element={<EventPage />} />
      </Routes>
    </Router>
  );
}

export default App;
