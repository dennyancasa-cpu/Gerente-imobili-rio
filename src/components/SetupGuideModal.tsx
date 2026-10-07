import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Cloud,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  ExternalLink,
  X,
  RefreshCw,
  FolderOpen,
  Lock,
  ChevronRight,
  MapPin,
  Bot,
  FileText,
  Search,
  CheckSquare,
  Volume2,
  DatabaseBackup,
  RotateCcw,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Payment, Property, Tenant } from '../types';
import { createCalendarEvent, listUpcomingEvents, getGoogleAccessToken } from '../services/calendarService';
import {
  getNotificationStatus,
  requestNativeNotificationPermission,
  triggerTestVencimentoNotification,
} from '../services/notificationService';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDriveConnected: boolean;
  onConnectDrive?: () => void;
  onDriveStatusChanged?: () => void;
  payments?: Payment[];
  properties?: Property[];
  tenants?: Tenant[];
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  isOpen,
  onClose,
  isDriveConnected,
  onConnectDrive,
  onDriveStatusChanged,
  payments = [],
  properties = [],
  tenants = [],
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarSyncSuccess, setCalendarSyncSuccess] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';
  });
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotifPermission(Notification.permission);
      }
    }
  }, [isOpen]);

  const handleRequestNotif = async () => {
    const res = await requestNativeNotificationPermission();
    setNotifPermission(res.permission);
    if (res.success) {
      toast.success('Permissão de notificações concedida com sucesso!');
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    try {
      const sent = await triggerTestVencimentoNotification();
      if (sent) {
        toast.success('Notificação de teste disparada! Verifique a barra de avisos.');
      } else {
        toast.info('Ative as notificações no botão acima para receber o teste.');
      }
    } catch {
      toast.error('Erro ao testar notificação.');
    } finally {
      setIsTestingNotif(false);
    }
  };

  const handleAuthorizeGoogleDirect = async () => {
    if (onConnectDrive) {
      onConnectDrive();
      return;
    }

    setIsConnectingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/tasks');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (credential && credential.accessToken) {
        const tokens = { access_token: credential.accessToken };
        localStorage.setItem('google_drive_tokens', JSON.stringify(tokens));

        try {
          await fetch('/api/auth/google/save-tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens, uid: result.user.uid }),
          });

          if (db && result.user) {
            await setDoc(
              doc(db, 'config', result.user.uid),
              {
                googleDriveTokens: JSON.stringify(tokens),
                googleDriveConnected: true,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
        } catch (e) {
          console.error('Error saving Google tokens:', e);
        }

        window.dispatchEvent(new Event('drive-connected'));
        if (onDriveStatusChanged) onDriveStatusChanged();
        toast.success('Google Drive e Google Agenda conectados com sucesso!');
      }
    } catch (error: any) {
      console.error('Google authorization error:', error);
      toast.error('Erro ao conectar com Google. Verifique se os popups estão autorizados.');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleSyncCalendarNow = async () => {
    setIsSyncingCalendar(true);
    try {
      const token = await getGoogleAccessToken();
      if (!token && !isDriveConnected) {
        toast.error('Conecte sua conta do Google no passo anterior primeiro.');
        return;
      }

      const pendingPayments = payments.filter((p) => p.status === 'pending' || p.status === 'late');
      if (pendingPayments.length === 0) {
        toast.info('Não há cobranças pendentes para sincronizar no momento.');
        setCalendarSyncSuccess(true);
        return;
      }

      let existingSummaries: string[] = [];
      try {
        const upcoming = await listUpcomingEvents();
        existingSummaries = upcoming.items?.map((item: any) => item.summary) || [];
      } catch (e) {
        console.warn('Não foi possível listar eventos existentes, prosseguindo com criação:', e);
      }

      let count = 0;
      for (const p of pendingPayments) {
        const tenant = tenants.find((t) => t.id === p.tenantId);
        const property = properties.find((prop) => prop.id === p.propertyId);
        const title = `Cobrança: ${tenant?.name || 'Inquilino'} - ${property?.name || 'Imóvel'}`;
        const description = `Valor: R$ ${p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nVencimento: ${p.dueDate}\nStatus: ${p.status === 'late' ? 'ATRASADO' : 'Pendente'}`;

        if (!existingSummaries.includes(title)) {
          await createCalendarEvent(title, description, p.dueDate);
          count++;
        }
      }

      setSyncedCount(count);
      setCalendarSyncSuccess(true);
      toast.success(
        count > 0
          ? `${count} evento(s) de vencimento adicionados à sua Google Agenda!`
          : 'Sua agenda já estava atualizada com os vencimentos.'
      );
    } catch (err: any) {
      console.error('Erro ao sincronizar agenda:', err);
      toast.error(err?.message || 'Falha ao sincronizar com o Google Agenda.');
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleCloseGuide = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('imob_setup_guide_completed_v1', 'true');
      } catch {}
    }
    onClose();
  };

  if (!isOpen) return null;

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending' || p.status === 'late').length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl overflow-hidden my-4 flex flex-col"
        >
          {/* Header com Banner Gradiente */}
          <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white">
            <button
              onClick={handleCloseGuide}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Guia de Configuração & Novidades v6.9.0
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Guia Passo a Passo & Automações
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Explore e configure as novas ferramentas: Notificações em Segundo Plano, Google Maps Autocomplete, Google Tasks/Agenda, Hub Jurídico e Robô Assistente.
            </p>

            {/* Stepper Visual (5 Passos) */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 mt-6">
              {[
                { step: 1, label: 'Notificações', icon: Bell, done: notifPermission === 'granted' },
                { step: 2, label: 'Google Nuvem', icon: Cloud, done: isDriveConnected },
                { step: 3, label: 'Google Maps', icon: MapPin, done: true },
                { step: 4, label: 'Hub IA & Robô', icon: Bot, done: true },
                { step: 5, label: 'Concluído', icon: ShieldCheck, done: currentStep === 5 },
              ].map((s) => {
                const Icon = s.icon;
                const isCurrent = currentStep === s.step;
                const isPassed = s.done || currentStep > s.step;

                return (
                  <button
                    key={s.step}
                    onClick={() => setCurrentStep(s.step)}
                    className={`flex flex-col items-center p-2 sm:p-2.5 rounded-2xl transition-all text-left ${
                      isCurrent
                        ? 'bg-white/20 border border-white/40 shadow-inner'
                        : isPassed
                        ? 'bg-white/10 border border-white/10'
                        : 'bg-white/5 border border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <div
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                          s.done
                            ? 'bg-emerald-400 text-slate-950'
                            : isCurrent
                            ? 'bg-indigo-400 text-white'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                      </div>
                      <Icon className="w-3.5 h-3.5 hidden sm:block text-slate-200" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-200 truncate w-full text-center">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conteúdo do Passo Atual */}
          <div className="p-5 sm:p-7 space-y-6 flex-1">
            {/* PASSO 1: NOTIFICAÇÕES */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        Passo 1: Notificações Nativas e em Segundo Plano
                      </h3>
                      {notifPermission === 'granted' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </span>
                      ) : notifPermission === 'denied' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          Bloqueado no Navegador
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                          Pendente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Receba alertas prioritários no dia do vencimento do aluguel ou acordo, avisos de cobranças em atraso e chamados de manutenção, mesmo com a aba fechada ou minimizada via Service Worker!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" /> Disparo Automático no Vencimento
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      O verificador em segundo plano notifica você logo pela manhã sobre os aluguéis que vencem no dia.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-indigo-500" /> Som & Vibração Nativa
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Alertas no padrão do sistema operacional do seu celular (Android/iOS) ou PC (Windows/macOS).
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-700">
                    <p className="font-bold text-slate-900">
                      {notifPermission === 'granted'
                        ? 'Notificações já ativadas no seu dispositivo!'
                        : 'Ative as notificações para nunca mais esquecer uma cobrança:'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Você pode ajustar suas preferências a qualquer momento no menu Configurações.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    {notifPermission !== 'granted' && (
                      <button
                        onClick={handleRequestNotif}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                      >
                        <Bell className="w-4 h-4" /> Ativar Alertas
                      </button>
                    )}
                    <button
                      onClick={handleTestNotification}
                      disabled={isTestingNotif}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      {isTestingNotif ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5 text-amber-500" />}
                      Testar Agora
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md shadow-indigo-100 transition-all cursor-pointer"
                  >
                    Próximo: Google Nuvem & Agenda <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 2: GOOGLE DRIVE & AGENDA / TASKS */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        Passo 2: Integrações Google (Drive, Calendar & Tasks)
                      </h3>
                      {isDriveConnected ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          Conectado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                          Opcional
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Sincronize vencimentos na sua Google Agenda, receba afazeres operacionais no Google Tasks do celular e faça backup de recibos no Google Drive.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4 text-indigo-600" /> Google Drive
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Salva comprovantes de pagamento e laudos em pastas na sua nuvem sem ocupar seu aparelho.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-500" /> Google Agenda
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Lembretes dos vencimentos de aluguel e renovação contratual na sua agenda pessoal.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-emerald-600" /> Google Tasks
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Afazeres diários com 1 clique para marcar como concluído pelo app de tarefas no celular.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-700">
                    <p className="font-bold text-slate-900">
                      {isDriveConnected
                        ? 'Conta Google conectada com sucesso!'
                        : 'Vincule sua conta Google de forma segura (OAuth 2.0):'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Permite sincronização contínua com Calendar, Tasks e Drive.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isDriveConnected ? (
                      <button
                        type="button"
                        disabled={isConnectingGoogle}
                        onClick={handleAuthorizeGoogleDirect}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                      >
                        {isConnectingGoogle ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Conectando...
                          </>
                        ) : (
                          <>
                            <Cloud className="w-4 h-4" /> Conectar Conta Google
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSyncingCalendar}
                        onClick={handleSyncCalendarNow}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                      >
                        {isSyncingCalendar ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Calendar className="w-4 h-4" />
                        )}
                        Sincronizar Vencimentos na Agenda
                      </button>
                    )}
                  </div>
                </div>

                {/* Destaque de Backup, Restauração e Versionamento de Documentos */}
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <DatabaseBackup className="w-4 h-4 text-emerald-600" />
                    <span>Backup Inteligente, Restauração & Histórico de Contratos</span>
                  </div>
                  <ul className="text-[11px] text-emerald-800 space-y-1 list-disc list-inside leading-relaxed">
                    <li><strong>Backup em 1 Clique:</strong> Gere cópia de segurança em JSON e PDF sem burocracia de confirmação de e-mail.</li>
                    <li><strong>Restauração Fácil:</strong> Recupere seus dados subindo o arquivo .json ou puxando do Google Drive com prévia de itens antes de confirmar.</li>
                    <li><strong>Versões de Contratos:</strong> Ao substituir contratos ou termos, as vias anteriores ficam salvas para consulta ou restauração instantânea.</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
                  >
                    Próximo: Google Maps & Localização <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 3: GOOGLE MAPS PLATFORM */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        Passo 3: Localização Inteligente (Google Maps Platform)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Novo Recurso
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Cadastro ágil de imóveis com busca preditiva de endereços, mapa interativo, geocodificação de coordenadas exatas e rota direta pelo Google Maps!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Search className="w-4 h-4 text-emerald-600" /> Autocomplete de Endereço
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Basta começar a digitar o condomínio ou rua para preencher CEP, bairro, cidade e número automaticamente.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-rose-500" /> Pin Interativo no Mapa
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Visualize a localização em mapa detalhado e clique para ajustar o pin no ponto exato do imóvel.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4 text-blue-500" /> Navegação com 1 Clique
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Botão para abrir rotas no Waze ou Google Maps diretamente ao fazer vistorias ou visitas.
                    </p>
                  </div>
                </div>

                {/* Demonstração visual */}
                <div className="p-4 bg-gradient-to-r from-emerald-50/70 to-slate-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Onde experimentar:</p>
                    <p className="text-slate-600 text-[11px]">
                      Acesse o menu <span className="font-bold text-slate-900">"Imóveis"</span> &gt; <span className="font-bold text-slate-900">"Novo Imóvel"</span> para ver o campo com busca dinâmica do Google Maps!
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
                  >
                    Próximo: Hub Jurídico IA & Robô <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 4: HUB JURÍDICO IA & ROBÔ ASSISTENTE */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        Passo 4: Hub Jurídico IA & Robô Mascote Proativo
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                        Inteligência Artificial
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Seu copiloto imobiliário agora lê contratos por OCR, audita cláusulas abusivas segundo a Lei do Inquilinato e monitora seus prazos proativamente!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" /> Leitor OCR de Contratos
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Envie uma foto ou PDF do contrato impresso. A IA extrai inquilino, imóvel, aluguel, caução e vencimento em segundos.
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-indigo-600" /> Robô Assistente no Canto da Tela
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Com 8 expressões visuais, o robô analisa sua carteira e avisa quando há cobranças vencendo nos próximos 5 dias ou contratos a renovar.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs space-y-1.5">
                  <p className="font-bold text-purple-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" /> Auditoria Jurídica Inteligente (Lei nº 8.245/1991)
                  </p>
                  <p className="text-purple-900/80 text-[11px] leading-relaxed">
                    Ao importar qualquer contrato, nossa IA analisa se há juros abusivos, ausência de regras de devolução de caução ou prazos em desconformidade com a legislação brasileira.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
                  >
                    Próximo: Resumo & Conclusão <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 5: RESUMO FINAL & CONCLUSÃO */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-emerald-950">
                      Tudo Pronto! Sistema Atualizado e Integrado
                    </h3>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      Seu Gerente Imobiliário está com as mais recentes inovações ativas: Notificações Nativas, Google Maps, Google Tasks/Agenda, Hub Jurídico IA e Robô Assistente.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-1">
                    <div className="flex items-center justify-between">
                      <Bell className="w-4 h-4 text-amber-500" />
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="font-bold text-slate-900 text-[11px]">Notificações</p>
                    <p className="text-[10px] text-slate-500">Alertas automáticos</p>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-1">
                    <div className="flex items-center justify-between">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="font-bold text-slate-900 text-[11px]">Google Maps</p>
                    <p className="text-[10px] text-slate-500">Autocomplete e pin</p>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-1">
                    <div className="flex items-center justify-between">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="font-bold text-slate-900 text-[11px]">Google Tasks</p>
                    <p className="text-[10px] text-slate-500">Agenda & Afazeres</p>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-1">
                    <div className="flex items-center justify-between">
                      <Bot className="w-4 h-4 text-purple-600" />
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="font-bold text-slate-900 text-[11px]">Hub Jurídico</p>
                    <p className="text-[10px] text-slate-500">OCR & Robô Mascote</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Não exibir este guia automaticamente</span>
                  </label>

                  <button
                    onClick={handleCloseGuide}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-md shadow-emerald-200 transition-all cursor-pointer"
                  >
                    Concluir e Acessar Painel <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

