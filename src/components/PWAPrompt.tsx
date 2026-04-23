import React, { useState, useEffect } from 'react';
import { Download, MonitorSmartphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const PWAPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostra o botão flutuante se houver o evento
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('Instalação iniciada!', {
        description: 'O Gerente Imobiliário aparecerá na sua tela inicial.'
      });
      setShowPrompt(false);
    } else {
      toast.info('Instalação cancelada', {
        description: 'Você pode instalar depois pelo menu do navegador.'
      });
    }
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 inset-x-4 md:inset-x-auto md:right-6 md:left-auto md:w-96 z-50 pointer-events-auto"
        >
          <div className="bg-slate-900 shadow-2xl rounded-2xl p-4 border border-slate-800 flex items-center gap-4 text-white">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
              <MonitorSmartphone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm tracking-tight">Instalar Aplicativo</h4>
              <p className="text-[10px] text-slate-400 leading-tight">Adicione à tela inicial para acesso rápido e offline.</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button 
                onClick={handleInstallClick}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-3.5 h-3.5" /> Instalar
              </button>
            </div>
            <button 
              onClick={() => setShowPrompt(false)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 border-2 border-slate-900 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
