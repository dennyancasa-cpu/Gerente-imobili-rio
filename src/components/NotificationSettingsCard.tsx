import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Info,
  Smartphone,
  ShieldCheck,
  Send,
  RefreshCw,
  Sparkles,
  Zap,
  ExternalLink,
  HelpCircle,
  Clock,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { Payment, Property, Tenant } from '../types';
import { SetupGuideModal } from './SetupGuideModal';
import {
  getNotificationStatus,
  requestNativeNotificationPermission,
  triggerTestVencimentoNotification,
  checkAndNotifyDuePayments,
  getNotificationPreferences,
  saveNotificationPreferences,
  NotificationPreferences,
  NotificationStatusInfo,
} from '../services/notificationService';

interface NotificationSettingsCardProps {
  payments?: Payment[];
  properties?: Property[];
  tenants?: Tenant[];
  isDriveConnected?: boolean;
  onConnectDrive?: () => void;
  onDriveStatusChanged?: () => void;
  onPermissionChange?: (perm: NotificationPermission) => void;
}

export const NotificationSettingsCard: React.FC<NotificationSettingsCardProps> = ({
  payments = [],
  properties = [],
  tenants = [],
  isDriveConnected = false,
  onConnectDrive,
  onDriveStatusChanged,
  onPermissionChange,
}) => {
  const [status, setStatus] = useState<NotificationStatusInfo>(() => getNotificationStatus());
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getNotificationPreferences());
  const [isRequesting, setIsRequesting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isCheckingDues, setIsCheckingDues] = useState(false);
  const [showHelpDetails, setShowHelpDetails] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Atualizar status ao montar ou mudar foco
  useEffect(() => {
    const update = () => {
      const current = getNotificationStatus();
      setStatus(current);
      if (onPermissionChange) {
        onPermissionChange(current.permission);
      }
    };
    update();

    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, [onPermissionChange]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const res = await requestNativeNotificationPermission();
      const updatedStatus = getNotificationStatus();
      setStatus(updatedStatus);
      if (onPermissionChange) {
        onPermissionChange(updatedStatus.permission);
      }
      if (res.success) {
        // Se houver pagamentos vencidos ou vencendo hoje, faz um check inicial
        if (payments.length > 0) {
          checkAndNotifyDuePayments(payments, properties, tenants, { force: true }).catch(() => {});
        }
        // Exibe o fluxo inicial guiado de configuração para orientar a conexão da agenda e do Drive
        if (res.permission === 'granted') {
          setIsGuideModalOpen(true);
        }
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      // Pega um inquilino e imóvel real se houver
      const pendingRent = payments.find((p) => p.status === 'pending');
      let sampleData;
      if (pendingRent) {
        const tenant = tenants.find((t) => t.id === pendingRent.tenantId);
        const property = properties.find((p) => p.id === pendingRent.propertyId);
        sampleData = {
          tenantName: tenant?.name || 'Inquilino',
          propertyName: property?.name || 'Imóvel Cadastrado',
          amount: pendingRent.amount,
        };
      }
      await triggerTestVencimentoNotification(sampleData);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCheckDuesNow = async () => {
    setIsCheckingDues(true);
    try {
      const result = await checkAndNotifyDuePayments(payments, properties, tenants, { force: true });
      if (result.notified) {
        toast.success(`Alerta push disparado com sucesso (${result.dueTodayCount} hoje, ${result.overdueCount} atrasado(s))!`);
      } else if (result.dueTodayCount === 0 && result.overdueCount === 0) {
        toast.info('Nenhum vencimento atrasado ou vencendo hoje no momento.');
      } else {
        toast.info('Checagem concluída. As notificações estão desativadas nas preferências.');
      }
    } catch (e: any) {
      toast.error('Erro ao verificar vencimentos: ' + (e?.message || 'Falha'));
    } finally {
      setIsCheckingDues(false);
    }
  };

  const handleTogglePref = (key: keyof NotificationPreferences) => {
    const updated = saveNotificationPreferences({ [key]: !prefs[key] });
    setPrefs(updated);
    toast.success('Preferência atualizada!');
  };

  // Contagem de vencimentos do sistema
  const todayStr = new Date().toISOString().split('T')[0];
  const pending = payments.filter((p) => p.status === 'pending');
  const overdueCount = pending.filter((p) => p.dueDate < todayStr).length;
  const dueTodayCount = pending.filter((p) => p.dueDate === todayStr).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
      {/* Header com Ícone e Título */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 transition-colors ${
            status.permission === 'granted'
              ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-emerald-200'
              : status.permission === 'denied'
              ? 'bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-red-200'
              : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-200'
          }`}>
            {status.permission === 'granted' ? (
              <BellRing className="w-6 h-6 animate-pulse" />
            ) : status.permission === 'denied' ? (
              <BellOff className="w-6 h-6" />
            ) : (
              <Bell className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Notificações Nativas & Push de Vencimentos
              </h2>
              {/* Badge de status */}
              {status.permission === 'granted' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ativas no Dispositivo
                </span>
              ) : status.permission === 'denied' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Bloqueadas no Navegador
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Aguardando Permissão
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Receba avisos instantâneos do sistema operacional sobre aluguéis a vencer ou atrasados mesmo com o navegador fechado ou app em segundo plano.
            </p>
          </div>
        </div>

        {/* Resumo rápido dos vencimentos pendentes */}
        {(overdueCount > 0 || dueTodayCount > 0) && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2 shrink-0">
            {dueTodayCount > 0 && (
              <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                {dueTodayCount} vence(m) hoje
              </span>
            )}
            {dueTodayCount > 0 && overdueCount > 0 && <span className="text-slate-300">|</span>}
            {overdueCount > 0 && (
              <span className="text-xs font-bold text-rose-600">
                {overdueCount} em atraso
              </span>
            )}
          </div>
        )}
      </div>

      {/* CARD PRINCIPAL DE AÇÃO */}
      <div className={`p-5 rounded-2xl border transition-all ${
        status.permission === 'granted'
          ? 'bg-emerald-50/50 border-emerald-200/80'
          : status.permission === 'denied'
          ? 'bg-rose-50/50 border-rose-200/80'
          : 'bg-amber-50/60 border-amber-200/80'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              {status.permission === 'granted' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Permissão Nativa Concedida
                </>
              ) : status.permission === 'denied' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Notificações Desativadas nas Configurações
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 text-amber-600" />
                  Solicitar Permissão de Notificação Nativa
                </>
              )}
            </h3>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              {status.permission === 'granted'
                ? 'O navegador e o sistema operacional estão autorizados a enviar avisos push de vencimento. As cobranças são monitoradas mesmo em segundo plano.'
                : status.permission === 'denied'
                ? 'Você bloqueou as notificações deste site anteriormente. Para liberar, clique no cadeado ao lado do endereço e marque Notificações como "Permitir".'
                : 'Clique no botão abaixo para abrir a janela de permissão oficial do seu navegador. Uma vez autorizado, o aplicativo dispara avisos automáticos.'}
            </p>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            {status.permission !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-amber-200 transition-all cursor-pointer"
              >
                {isRequesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Solicitando ao Navegador...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Ativar Notificações Nativas
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isTesting}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                  title="Disparar notificação de teste simulada"
                >
                  {isTesting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  Testar Alerta Push
                </button>

                <button
                  type="button"
                  onClick={handleCheckDuesNow}
                  disabled={isCheckingDues}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-100 transition-all cursor-pointer active:scale-95"
                  title="Verificar pagamentos do dia e disparar notificação real se houver pendências"
                >
                  {isCheckingDues ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  Verificar Vencimentos Agora
                </button>

                <button
                  type="button"
                  onClick={() => setIsGuideModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
                  title="Abrir o fluxo guiado para configurar Google Drive e Google Agenda"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Guia (Drive & Agenda)
                </button>
              </>
            )}
          </div>
        </div>

        {/* AJUDA PARA DESBLOQUEAR CASO NEGADO */}
        {status.permission === 'denied' && (
          <div className="mt-4 pt-3 border-t border-rose-200/80 text-[11px] text-rose-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" /> Como reativar no navegador:
            </p>
            <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-rose-700">
              <li>Clique no ícone de <strong>Ajustes / Cadeado</strong> ao lado esquerdo da barra de endereço URL.</li>
              <li>Localize a opção <strong>"Notificações"</strong> e mude para <strong>"Permitir"</strong>.</li>
              <li>Recarregue a página para aplicar a alteração no sistema.</li>
            </ol>
          </div>
        )}
      </div>

      {/* PREFERÊNCIAS & REGRAS DE ENVIO EM SEGUNDO PLANO */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          Regras de Disparo de Alertas em Segundo Plano
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Toggle 1: Vencem Hoje */}
          <div
            onClick={() => handleTogglePref('notifyDueToday')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              prefs.notifyDueToday
                ? 'bg-slate-50 border-indigo-200'
                : 'bg-white border-slate-200 opacity-60'
            }`}
          >
            <div className="pr-2">
              <p className="text-xs font-bold text-slate-900">Cobranças que vencem hoje</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Alerta prioritário no dia do vencimento do aluguel ou acordo.
              </p>
            </div>
            <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
              prefs.notifyDueToday ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
            }`}>
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </div>
          </div>

          {/* Toggle 2: Em Atraso */}
          <div
            onClick={() => handleTogglePref('notifyOverdue')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              prefs.notifyOverdue
                ? 'bg-slate-50 border-indigo-200'
                : 'bg-white border-slate-200 opacity-60'
            }`}
          >
            <div className="pr-2">
              <p className="text-xs font-bold text-slate-900">Cobranças em atraso</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Avisa quando há pagamentos vencidos acumulando juros ou pendência.
              </p>
            </div>
            <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
              prefs.notifyOverdue ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
            }`}>
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </div>
          </div>

          {/* Toggle 3: Vencimentos Próximos */}
          <div
            onClick={() => handleTogglePref('notifyUpcoming')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              prefs.notifyUpcoming
                ? 'bg-slate-50 border-indigo-200'
                : 'bg-white border-slate-200 opacity-60'
            }`}
          >
            <div className="pr-2">
              <p className="text-xs font-bold text-slate-900">Vencimentos próximos (1 a 2 dias)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Lembrete preventivo para acompanhar repasses e cobranças.
              </p>
            </div>
            <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
              prefs.notifyUpcoming ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
            }`}>
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </div>
          </div>

          {/* Toggle 4: Checagem em Segundo Plano */}
          <div
            onClick={() => handleTogglePref('backgroundCheck')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              prefs.backgroundCheck
                ? 'bg-slate-50 border-indigo-200'
                : 'bg-white border-slate-200 opacity-60'
            }`}
          >
            <div className="pr-2">
              <p className="text-xs font-bold text-slate-900">Monitoramento com app minimizado</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Executa checagens periódicas e ao trocar de aba via Service Worker.
              </p>
            </div>
            <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
              prefs.backgroundCheck ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
            }`}>
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </div>
          </div>
        </div>
      </div>

      {/* NOTA TÉCNICA E EXPLICATIVA SOBRE SEGUNDO PLANO */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-800">Como funciona o alerta em segundo plano:</strong> O sistema utiliza o{' '}
          <span className="font-semibold text-slate-800">Service Worker nativo do PWA</span>. Ao autorizar, as notificações
          aparecem na central de notificações do seu computador (Windows/macOS) ou na barra de avisos do seu smartphone (Android/iOS),
          garantindo que você não perca datas de vencimento mesmo com a aba minimizada.
        </div>
      </div>

      {/* Modal que guia o usuário pelo fluxo inicial de configuração (Agenda & Drive) */}
      <SetupGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        isDriveConnected={isDriveConnected}
        onConnectDrive={onConnectDrive}
        onDriveStatusChanged={onDriveStatusChanged}
        payments={payments}
        properties={properties}
        tenants={tenants}
      />
    </div>
  );
};
