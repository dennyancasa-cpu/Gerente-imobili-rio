/**
 * Service for Native Push Notifications & Background Due Date Alerts (Vencimentos)
 */

import { toast } from 'sonner';
import { Payment, Property, Tenant } from '../types';

export interface NotificationStatusInfo {
  isSupported: boolean;
  permission: NotificationPermission;
  isIOS: boolean;
  isStandalone: boolean;
  hasServiceWorker: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  notifyOverdue: boolean;
  notifyDueToday: boolean;
  notifyUpcoming: boolean;
  backgroundCheck: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  notifyOverdue: true,
  notifyDueToday: true,
  notifyUpcoming: true,
  backgroundCheck: true,
};

const STORAGE_PREFS_KEY = 'imob_notification_preferences';
const STORAGE_LAST_CHECK_KEY = 'imob_last_vencimento_push_check';

export function getNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_PREFS_KEY);
    if (raw) {
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Erro ao ler preferências de notificação:', e);
  }
  return DEFAULT_PREFS;
}

export function saveNotificationPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  const current = getNotificationPreferences();
  const updated = { ...current, ...prefs };
  try {
    localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao salvar preferências de notificação:', e);
  }
  return updated;
}

/**
 * Retorna o status de suporte e autorização das notificações nativas
 */
export function getNotificationStatus(): NotificationStatusInfo {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      permission: 'default',
      isIOS: false,
      isStandalone: false,
      hasServiceWorker: false,
    };
  }

  const isSupported = 'Notification' in window;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const permission = isSupported ? Notification.permission : 'default';

  return {
    isSupported,
    permission,
    isIOS,
    isStandalone,
    hasServiceWorker,
  };
}

/**
 * Dispara o prompt nativo do navegador para permissão de notificações.
 * Trata compatibilidade moderna (Promise) e legado (callback), além de especificidades do iOS e PWA.
 */
export async function requestNativeNotificationPermission(): Promise<{
  permission: NotificationPermission;
  success: boolean;
  message: string;
}> {
  if (typeof window === 'undefined') {
    return { permission: 'default', success: false, message: 'Ambiente não suportado' };
  }

  const status = getNotificationStatus();

  // Caso navegador não suporte Notification
  if (!status.isSupported) {
    if (status.isIOS && !status.isStandalone) {
      const msg = 'No iPhone/iPad (iOS), as notificações do sistema exigem adicionar o aplicativo à Tela de Início (Compartilhar > Adicionar à Tela de Início).';
      toast.info(msg, { duration: 6000 });
      return { permission: 'default', success: false, message: msg };
    }
    const msg = 'Este navegador não suporta notificações nativas push.';
    toast.error(msg);
    return { permission: 'default', success: false, message: msg };
  }

  try {
    let resultPermission: NotificationPermission = Notification.permission;

    // Se ainda estiver default, abre o prompt nativo
    if (resultPermission === 'default') {
      try {
        const reqPromise = Notification.requestPermission();
        if (reqPromise && typeof reqPromise.then === 'function') {
          resultPermission = await reqPromise;
        } else {
          resultPermission = await new Promise<NotificationPermission>((resolve) => {
            Notification.requestPermission((p) => resolve(p));
          });
        }
      } catch (err) {
        console.warn('Fallback Notification.requestPermission via callback:', err);
        resultPermission = await new Promise<NotificationPermission>((resolve) => {
          try {
            Notification.requestPermission((p) => resolve(p));
          } catch {
            resolve('denied');
          }
        });
      }
    }

    if (resultPermission === 'granted') {
      saveNotificationPreferences({ enabled: true });
      toast.success('Notificações nativas autorizadas com sucesso!');

      // Envia notificação nativa imediata de confirmação
      await sendNativeNotification(
        '🔔 Notificações Nativas Ativadas!',
        {
          body: 'Você agora receberá avisos automáticos de vencimentos e cobranças mesmo com o app em segundo plano.',
          tag: 'welcome-notification',
          requireInteraction: false,
        }
      );

      return {
        permission: 'granted',
        success: true,
        message: 'Permissão concedida. Avisos de vencimento em segundo plano ativados.',
      };
    }

    if (resultPermission === 'denied') {
      saveNotificationPreferences({ enabled: false });
      const msg = 'Permissão bloqueada pelo navegador. Para ativar, clique no ícone de cadeado/configurações ao lado da URL e permita Notificações.';
      toast.error(msg, { duration: 7000 });
      return {
        permission: 'denied',
        success: false,
        message: msg,
      };
    }

    return {
      permission: resultPermission,
      success: false,
      message: 'Permissão não foi concedida (fechada pelo usuário).',
    };
  } catch (err: any) {
    console.error('Erro ao solicitar permissão de notificação nativa:', err);
    const msg = `Falha ao solicitar permissão: ${err?.message || 'Erro desconhecido'}`;
    toast.error(msg);
    return {
      permission: Notification.permission || 'default',
      success: false,
      message: msg,
    };
  }
}

/**
 * Envia uma notificação nativa usando Service Worker (permitindo segundo plano / PWA)
 * com fallback seguro para a API desktop Notification.
 */
export async function sendNativeNotification(
  title: string,
  options: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
    renotify?: boolean;
  } = {}
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions: NotificationOptions & { renotify?: boolean } = {
    icon: options.icon || '/icon-192.png',
    badge: options.badge || '/icon-192.png',
    body: options.body || '',
    tag: options.tag || 'vencimento-alert',
    renotify: options.renotify !== false,
    requireInteraction: options.requireInteraction ?? false,
    data: options.data || { url: '/?tab=receivables' },
  };

  // 1. Tentar via Service Worker registration (funciona em segundo plano e em dispositivos móveis/PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions as any);
        return true;
      }
    } catch (swErr) {
      console.warn('Falha ao disparar notificação via Service Worker:', swErr);
    }
  }

  // 2. Fallback via construtor Notification (Desktop browsers)
  try {
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      window.focus();
      notif.close();
      if (options.data?.url && typeof window !== 'undefined') {
        window.location.hash = options.data.url;
      }
    };
    return true;
  } catch (constrErr) {
    // "TypeError: Illegal constructor" em alguns navegadores mobile quando chamado fora de Service Worker
    console.warn('Fallback construtor Notification falhou:', constrErr);
  }

  return false;
}

/**
 * Dispara uma notificação nativa de teste com simulação realista de vencimento de aluguel
 */
export async function triggerTestVencimentoNotification(customData?: {
  tenantName?: string;
  propertyName?: string;
  amount?: number;
}): Promise<boolean> {
  const status = getNotificationStatus();
  if (status.permission !== 'granted') {
    toast.error('Você precisa autorizar as notificações nativas primeiro.');
    return false;
  }

  const tenant = customData?.tenantName || 'Inquilino Demonstrativo';
  const property = customData?.propertyName || 'Apartamento 302 - Residencial Flores';
  const amountStr = (customData?.amount || 2500).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const success = await sendNativeNotification(
    '⚠️ Alerta de Vencimento: Cobrança Pendente',
    {
      body: `${tenant} (${property}) possui cobrança de aluguel no valor de ${amountStr} com vencimento hoje.`,
      tag: 'test-vencimento-sample',
      requireInteraction: true,
      data: { url: '/?tab=receivables' },
    }
  );

  if (success) {
    toast.success('Notificação nativa enviada com sucesso ao seu dispositivo!');
  } else {
    toast.error('Não foi possível disparar a notificação no seu dispositivo.');
  }

  return success;
}

/**
 * Analisa as cobranças/pagamentos e dispara notificações nativas de vencimento
 * para cobranças que estão atrasadas ou vencendo hoje.
 */
export async function checkAndNotifyDuePayments(
  payments: Payment[] = [],
  properties: Property[] = [],
  tenants: Tenant[] = [],
  options: { force?: boolean } = {}
): Promise<{
  overdueCount: number;
  dueTodayCount: number;
  upcomingCount: number;
  notified: boolean;
}> {
  const status = getNotificationStatus();
  if (status.permission !== 'granted') {
    return { overdueCount: 0, dueTodayCount: 0, upcomingCount: 0, notified: false };
  }

  const prefs = getNotificationPreferences();
  if (!prefs.enabled) {
    return { overdueCount: 0, dueTodayCount: 0, upcomingCount: 0, notified: false };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingPayments = payments.filter((p) => p.status === 'pending');

  const overdue = pendingPayments.filter((p) => p.dueDate < todayStr);
  const dueToday = pendingPayments.filter((p) => p.dueDate === todayStr);

  // Próximos 2 dias
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const upcoming = pendingPayments.filter((p) => p.dueDate > todayStr && p.dueDate <= tomorrowStr);

  const overdueCount = overdue.length;
  const dueTodayCount = dueToday.length;
  const upcomingCount = upcoming.length;

  if (overdueCount === 0 && dueTodayCount === 0 && upcomingCount === 0) {
    return { overdueCount, dueTodayCount, upcomingCount, notified: false };
  }

  // Rate limit para não enviar spam a cada 2 minutos (respeitar intervalo mínimo de 2 horas)
  if (!options.force) {
    try {
      const lastCheck = localStorage.getItem(STORAGE_LAST_CHECK_KEY);
      if (lastCheck) {
        const lastTime = parseInt(lastCheck, 10);
        const elapsedHours = (Date.now() - lastTime) / (1000 * 60 * 60);
        if (elapsedHours < 2) {
          // Menos de 2 horas desde a última notificação automática
          return { overdueCount, dueTodayCount, upcomingCount, notified: false };
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }

  // Montar conteúdo da notificação
  let title = '';
  let body = '';

  if (dueTodayCount > 0 && prefs.notifyDueToday) {
    const firstPayment = dueToday[0];
    const tenant = tenants.find((t) => t.id === firstPayment.tenantId)?.name || 'Inquilino';
    const prop = properties.find((p) => p.id === firstPayment.propertyId)?.name || '';
    const val = firstPayment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (dueTodayCount === 1) {
      title = `🔔 Vencimento Hoje: ${val}`;
      body = `Aluguel de ${tenant}${prop ? ` (${prop})` : ''} vence hoje no valor de ${val}.`;
    } else {
      title = `🔔 ${dueTodayCount} Aluguéis Vencem Hoje!`;
      body = `Você possui ${dueTodayCount} cobranças com vencimento hoje, incluindo ${tenant} (${val}).`;
    }
  } else if (overdueCount > 0 && prefs.notifyOverdue) {
    const totalLate = overdue.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    title = `⚠️ ${overdueCount} Pagamento(s) em Atraso`;
    body = `Total pendente de ${totalLate}. Verifique os inquilinos com pendências de aluguel.`;
  } else if (upcomingCount > 0 && prefs.notifyUpcoming) {
    title = `📅 ${upcomingCount} Vencimento(s) Próximos`;
    body = `Lembrete: você possui cobranças programadas para os próximos dias.`;
  }

  if (!title) {
    return { overdueCount, dueTodayCount, upcomingCount, notified: false };
  }

  const notified = await sendNativeNotification(title, {
    body,
    tag: `vencimento-alert-${todayStr}`,
    requireInteraction: true,
    data: { url: '/?tab=receivables' },
  });

  if (notified) {
    try {
      localStorage.setItem(STORAGE_LAST_CHECK_KEY, Date.now().toString());
    } catch {}
  }

  return { overdueCount, dueTodayCount, upcomingCount, notified };
}

/**
 * Configura observadores para disparar checagem de vencimentos
 * quando o usuário minimiza a janela ou coloca a aba em segundo plano.
 */
export function setupBackgroundDueChecker(
  getData: () => { payments: Payment[]; properties: Property[]; tenants: Tenant[] }
): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // Listener para quando o app vai para segundo plano (document.visibilityState === 'hidden')
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      const prefs = getNotificationPreferences();
      if (!prefs.backgroundCheck || !prefs.enabled) return;

      const { payments, properties, tenants } = getData();
      if (payments && payments.length > 0) {
        checkAndNotifyDuePayments(payments, properties, tenants, { force: false }).catch((err) =>
          console.warn('Erro ao verificar vencimentos em segundo plano:', err)
        );
      }
    }
  };

  // Intervalo em segundo plano para checar a cada 45 minutos
  const intervalId = setInterval(() => {
    const prefs = getNotificationPreferences();
    if (!prefs.backgroundCheck || !prefs.enabled) return;

    const { payments, properties, tenants } = getData();
    if (payments && payments.length > 0) {
      checkAndNotifyDuePayments(payments, properties, tenants, { force: false }).catch((err) =>
        console.warn('Erro no timer de vencimentos:', err)
      );
    }
  }, 45 * 60 * 1000);

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(intervalId);
  };
}
