import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Cloud, 
  Bell, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Lock, 
  RefreshCw, 
  ExternalLink, 
  X, 
  Info,
  CheckSquare,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface PermissionsOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDriveConnected: boolean;
  user: any;
  isInstallable: boolean;
  onInstallPWA: () => void;
  onDriveStatusChanged?: () => void;
}

export const PermissionsOnboardingModal: React.FC<PermissionsOnboardingModalProps> = ({
  isOpen,
  onClose,
  isDriveConnected,
  user,
  isInstallable,
  onInstallPWA,
  onDriveStatusChanged
}) => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [isAuthorizingGoogle, setIsAuthorizingGoogle] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [isOpen]);

  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined') return;

    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (!('Notification' in window)) {
      if (isIOS) {
        toast.info(
          'No iPhone (iOS), as notificações do sistema exigem a instalação do app na Tela de Início (PWA).',
          { duration: 6000 }
        );
      } else {
        toast.error('Este navegador no celular não suporta notificações push nativas.');
      }
      return;
    }

    try {
      let permission: NotificationPermission = Notification.permission;

      if (permission === 'default') {
        try {
          const req = Notification.requestPermission();
          if (req && typeof req.then === 'function') {
            permission = await req;
          } else {
            permission = await new Promise<NotificationPermission>((resolve) => {
              Notification.requestPermission((p) => resolve(p));
            });
          }
        } catch (err) {
          console.warn('Promise Notification.requestPermission failed, trying callback:', err);
          permission = await new Promise<NotificationPermission>((resolve) => {
            try {
              Notification.requestPermission((p) => resolve(p));
            } catch (e2) {
              resolve('denied');
            }
          });
        }
      }

      setNotificationPermission(permission);

      if (permission === 'granted') {
        toast.success('Notificações de vencimentos e alertas ativadas com sucesso!');

        // Trigger welcome notification safely without throwing Illegal constructor on Mobile
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (reg && reg.showNotification) {
              await reg.showNotification('Gerente Imobiliário', {
                body: 'Notificações de cobrança e vencimento ativadas com sucesso!',
                icon: '/icon-192.png',
                badge: '/icon-192.png'
              } as any);
              return;
            }
          } catch (swErr) {
            console.log('SW notification attempt info:', swErr);
          }
        }

        // Desktop constructor fallback
        try {
          new Notification('Gerente Imobiliário', {
            body: 'Notificações de cobrança e vencimento ativadas com sucesso!',
            icon: '/icon-192.png'
          });
        } catch (e) {
          // "TypeError: Illegal constructor" is normal on mobile Chrome & WebKit - safely ignored
          console.log('Mobile constructor notification skipped safely');
        }
      } else if (permission === 'denied') {
        toast.error(
          'Notificações bloqueadas. Habilite a permissão nas configurações do navegador ou no Android/iOS.',
          { duration: 5000 }
        );
      }
    } catch (e) {
      console.error('Error requesting notification permission:', e);

      // Verify if permission was actually granted despite error
      if ('Notification' in window && Notification.permission === 'granted') {
        setNotificationPermission('granted');
        toast.success('Notificações ativadas com sucesso!');
      } else if (isIOS) {
        toast.info('No iOS, instale o app na Tela de Início para autorizar notificações do sistema.');
      } else {
        toast.error('Não foi possível alterar a permissão. Verifique os ajustes de permissão do site no celular.');
      }
    }
  };

  const handleAuthorizeGoogleFull = async () => {
    setIsAuthorizingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/tasks');
      provider.addScope('https://www.googleapis.com/auth/tasks.readonly');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (credential && credential.accessToken) {
        const tokens = { access_token: credential.accessToken };
        localStorage.setItem('google_drive_tokens', JSON.stringify(tokens));

        try {
          await fetch('/api/auth/google/save-tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens, uid: result.user.uid })
          });

          if (db && result.user) {
            await setDoc(doc(db, 'config', result.user.uid), {
              googleDriveTokens: JSON.stringify(tokens),
              googleDriveConnected: true,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (e) {
          console.error('Error saving Google tokens:', e);
        }

        window.dispatchEvent(new Event('drive-connected'));
        if (onDriveStatusChanged) onDriveStatusChanged();
        toast.success('Acesso ao Google Agenda, Drive e Tasks autorizado com sucesso!');
      }
    } catch (error: any) {
      console.error('Google authorization error:', error);
      toast.error('Erro na autorização do Google. Verifique se os popups estão liberados.');
    } finally {
      setIsAuthorizingGoogle(false);
    }
  };

  // Calculate completed steps
  const isCalendarDriveGranted = isDriveConnected;
  const isNotificationGranted = notificationPermission === 'granted';
  const isPwaReady = !isInstallable || (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches);

  const totalSteps = 3;
  let completedSteps = 0;
  if (isCalendarDriveGranted) completedSteps++;
  if (isNotificationGranted) completedSteps++;
  if (isPwaReady) completedSteps++;

  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const handleFinish = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('app_permissions_setup_completed_v1', 'true');
      } catch (e) {}
    }
    onClose();
  };

  const handleAuthorizeAllPending = async () => {
    if (!isCalendarDriveGranted) {
      await handleAuthorizeGoogleFull();
    }
    if (!isNotificationGranted) {
      await handleRequestNotificationPermission();
    }
    if (isInstallable) {
      onInstallPWA();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-[2rem] border border-slate-200/80 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative z-10 max-h-[92vh]"
          >
            {/* Header Banner */}
            <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between relative z-10 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2dbf64] to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" /> Primeiro Acesso & Automação
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      Central de Permissões do Sistema
                    </h2>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 mt-3 font-normal leading-relaxed relative z-10">
                Agrupamos todas as solicitações autorizativas em um único lugar. Ative os acessos abaixo para evitar falhas e permitir que a sincronização da agenda, drive e alertas funcionem perfeitamente.
              </p>

              {/* Progress Bar */}
              <div className="mt-5 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 relative z-10">
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="text-slate-300">Progresso da Configuração Inicial</span>
                  <span className={completedSteps === totalSteps ? "text-emerald-400 font-extrabold" : "text-amber-300 font-extrabold"}>
                    {completedSteps} de {totalSteps} Concluídos ({progressPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* List of Permissions */}
            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/50">
              
              {/* 1. Google Agenda e Sincronização de Vencimentos */}
              <div className={`p-4 rounded-2xl border transition-all ${isCalendarDriveGranted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCalendarDriveGranted ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-600'}`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">Google Agenda (Lembretes de Cobrança)</h3>
                        {isCalendarDriveGranted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Conectado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Pendente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Cria automaticamente eventos no Google Agenda com os lembretes de vencimento dos aluguéis e acordos de parcelamento dos inquilinos.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    {!isCalendarDriveGranted ? (
                      <button
                        onClick={handleAuthorizeGoogleFull}
                        disabled={isAuthorizingGoogle}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isAuthorizingGoogle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        {isAuthorizingGoogle ? 'Conectando...' : 'Autorizar Agenda'}
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-100/80 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" /> Autorizado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Google Drive & Armazenamento de Documentos e Recibos */}
              <div className={`p-4 rounded-2xl border transition-all ${isCalendarDriveGranted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCalendarDriveGranted ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'}`}>
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">Google Drive (Backup de Contratos e Recibos)</h3>
                        {isCalendarDriveGranted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Conectado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Pendente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Armazena com segurança fotos de vistorias, comprovantes de pagamento e minutas de contrato direto na nuvem do seu Google Drive.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    {!isCalendarDriveGranted ? (
                      <button
                        onClick={handleAuthorizeGoogleFull}
                        disabled={isAuthorizingGoogle}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isAuthorizingGoogle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                        {isAuthorizingGoogle ? 'Conectando...' : 'Conectar Drive'}
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-100/80 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" /> Autorizado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Notificações do Navegador e Alertas de Pagamento/Vencimento */}
              <div className={`p-4 rounded-2xl border transition-all ${isNotificationGranted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isNotificationGranted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600'}`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">Notificações Push & Alertas de Vencimentos</h3>
                        {isNotificationGranted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ativo
                          </span>
                        ) : notificationPermission === 'denied' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Bloqueado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Pendente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Permite que o navegador exiba avisos pop-up e alertas na tela para pagamentos em atraso, vencimentos próximos e novos chamados.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    {!isNotificationGranted ? (
                      <button
                        onClick={handleRequestNotificationPermission}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-200 flex items-center gap-2"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Ativar Notificações
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-100/80 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" /> Ativado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Modo Nativo PWA & Operação Offline */}
              <div className={`p-4 rounded-2xl border transition-all ${isPwaReady ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPwaReady ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">Modo App Nativo & Acesso Offline</h3>
                        {isPwaReady ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Pronto
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                            Disponível
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Instale o aplicativo na tela inicial do celular ou computador para operar rapidamente sem depender do navegador aberto.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    {isInstallable ? (
                      <button
                        onClick={onInstallPWA}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 flex items-center gap-2"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        Instalar App
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-100/80 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" /> Pronto
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Controls */}
            <div className="p-6 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                Não abrir este painel automaticamente no início
              </label>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {completedSteps < totalSteps && (
                  <button
                    onClick={handleAuthorizeAllPending}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-4 h-4 text-indigo-600" />
                    Autorizar Passos Pendentes
                  </button>
                )}
                <button
                  onClick={handleFinish}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Concluir e Ir para o App
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
