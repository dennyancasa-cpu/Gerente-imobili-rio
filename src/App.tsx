/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updateProfile, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs,
  getDocFromServer,
  orderBy,
  Timestamp,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  Property, 
  Tenant, 
  Expense, 
  Payment, 
  Agreement,
  OperationType, 
  PropertyStatus, 
  TenantStatus, 
  ExpenseType, 
  PaymentStatus
} from './types';
import { handleFirestoreError } from './utils/firestoreError';
import { Auth } from './components/Auth';
import { 
  LayoutDashboard, 
  Home, 
  Users, 
  User as UserIcon,
  DollarSign, 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Star, 
  FileText, 
  Image as ImageIcon,
  Upload,
  X,
  Camera,
  ChevronRight,
  ArrowRightLeft,
  Archive,
  Clock,
  Hammer,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar, 
  RotateCcw,
  Filter,
  Settings,
  Menu,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  MinusCircle,
  ArrowDownLeft,
  Paperclip,
  ExternalLink,
  HelpCircle,
  BookOpen,
  Info,
  ArrowUpRight,
  BarChart3,
  Lock,
  Download,
  Cloud,
  CloudOff,
  RefreshCw,
  Copy,
  UserCircle,
  Smartphone,
  Sparkles,
  Send,
  AlertTriangle,
  Folder,
  FolderOpen,
  Zap,
  ChevronDown,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { format, addDays, addMonths, setDate, isAfter, isBefore, parseISO, startOfMonth, endOfMonth, differenceInDays, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HelpView } from './components/HelpView';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const cleanObject = (obj: any) => {
  const result: any = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined && val !== null && val !== '') {
      result[key] = val;
    }
  });
  return result;
};

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1 align-middle">
    <Info className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500 cursor-help transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none leading-tight">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
    </div>
  </div>
);

const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const Tooltip = ({ children }: { children: React.ReactNode }) => <div className="group relative inline-block">{children}</div>;
const TooltipTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>;
const TooltipContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block transition-all z-[100] pointer-events-none", className)}>
    {children}
    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white dark:border-t-slate-800" />
  </div>
);

// --- Components ---

export const LogoSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 240" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2dbf64" />
        <stop offset="100%" stopColor="#0c6b37" />
      </linearGradient>
      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </defs>
    
    {/* Base Ring / Shadow */}
    <ellipse cx="100" cy="220" rx="60" ry="15" fill="#2dbf64" />
    <ellipse cx="100" cy="220" rx="40" ry="10" fill="#042f1c" />

    {/* Map Pin Outer Shape */}
    <path d="M 0 90 C 0 -10, 200 -10, 200 90 C 200 160, 100 210, 100 210 C 100 210, 0 160, 0 90 Z" fill="url(#pinGrad)" />
    
    {/* Inner White Cutout Area */}
    <path d="M 15 90 C 15 10, 185 10, 185 90 C 185 150, 100 195, 100 195 C 100 195, 15 150, 15 90 Z" fill="#ffffff" />
    
    {/* Roof overlap */}
    <path d="M 100 10 L 190 70 L 160 80 L 100 35 L 40 80 L 10 70 Z" fill="#146d36" />
    <rect x="40" y="20" width="15" height="30" fill="#146d36" />

    {/* Rising Gold Bars */}
    <path d="M 45 145 L 65 145 L 65 180 L 45 180 Z" fill="url(#barGrad)" />
    <path d="M 80 110 L 100 110 L 100 170 L 80 170 Z" fill="url(#barGrad)" />
    <path d="M 115 75 L 135 75 L 135 160 L 115 160 Z" fill="url(#barGrad)" />
    <path d="M 150 40 L 170 40 L 170 145 L 150 145 Z" fill="url(#barGrad)" />
    
    <rect x="90" y="60" width="8" height="8" fill="#146d36" />
    <rect x="102" y="60" width="8" height="8" fill="#146d36" />
    <rect x="90" y="72" width="8" height="8" fill="#146d36" />
    <rect x="102" y="72" width="8" height="8" fill="#146d36" />
  </svg>
);


const isGoogleDriveLink = (url?: string) => {
  return url?.includes('drive.google.com') || url?.includes('googleapis.com');
};

const getGoogleDrivePreviewUrl = (url?: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com') && url.includes('/view')) {
    return url.replace('/view', '/preview');
  }
  return url;
};

const TenantTimeline = ({ tenant, payments, property, onConfirmPayment, setPreviewReceipt }: { tenant: Tenant; payments: Payment[]; property?: Property; onConfirmPayment?: (id: string) => void; setPreviewReceipt: (p: { url: string, name: string, isImage: boolean } | null) => void }) => {
  const today = new Date();
  
  // 1. History (Past)
  const history = useMemo(() => {
    return payments
      .filter(p => p.tenantId === tenant.id && (p.status === 'paid' || p.status === 'partial'))
      .sort((a, b) => parseISO(b.dueDate).getTime() - parseISO(a.dueDate).getTime());
  }, [payments, tenant.id]);

  // 2. Pending (Now)
  const pending = useMemo(() => {
    return payments
      .filter(p => p.tenantId === tenant.id && (p.status === 'pending' || p.status === 'late'))
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
  }, [payments, tenant.id]);

  // 3. Projections (Future)
  const projections = useMemo(() => {
    if (!property || tenant.status !== 'allocated') return [];
    
    const lastPending = pending[pending.length - 1];
    const startDate = lastPending ? addMonths(parseISO(lastPending.dueDate), 1) : addMonths(today, 1);
    
    return Array.from({ length: 3 }).map((_, i) => {
      const dueDate = addMonths(startDate, i);
      return {
        id: `proj-${i}`,
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        amount: property.rentValue,
        description: 'Aluguel (Projeção)',
        status: 'projected' as const
      };
    });
  }, [property, tenant.status, pending, today]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Linha do Tempo Financeira</h4>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Pago
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pendente
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Projeção
          </span>
        </div>
      </div>

      <div className="relative space-y-4 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
        {/* Pending / Late */}
        {pending.map((p, idx) => {
          const isRemainder = p.description?.startsWith('Restante:') || p.description?.includes('parte');
          return (
            <div key={p.id} className="relative flex items-center gap-4 group">
              <div className={cn(
                "absolute left-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110",
                p.status === 'late' ? "bg-red-500 text-white" : 
                isRemainder ? "bg-indigo-500 text-white" : "bg-amber-500 text-white"
              )}>
                {p.status === 'late' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <div className={cn(
                "ml-10 flex-1 p-3 rounded-2xl border transition-all",
                p.status === 'late' ? "bg-red-50 border-red-100" : 
                isRemainder ? "bg-indigo-50 border-indigo-100" : "bg-amber-50 border-amber-100"
              )}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className={cn(
                      "text-xs font-bold",
                      isRemainder ? "text-indigo-900" : "text-slate-900"
                    )}>{p.description || 'Aluguel'}</p>
                    <p className="text-[10px] text-slate-500">Vencimento: {format(parseISO(p.dueDate), 'dd/MM/yyyy')}</p>
                  </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="sm:text-sm text-xs font-black text-slate-900">R$ {p.amount.toLocaleString()}</p>
                      {isRemainder && <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-tighter">Saldo Pendente</p>}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-6 text-[9px] font-bold text-primary hover:bg-primary/10 px-2 rounded-lg"
                        onClick={() => {
                          if (onConfirmPayment) {
                            onConfirmPayment(p.id);
                          } else {
                            const element = document.getElementById(`payment-${p.id}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }
                        }}
                      >
                        Confirmar na Central
                      </Button>
                    </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Projections */}
        {projections.map((p) => (
          <div key={p.id} className="relative flex items-center gap-4 group opacity-60 hover:opacity-100 transition-opacity">
            <div className="absolute left-0 w-8 h-8 rounded-full border-4 border-white bg-slate-200 text-slate-500 flex items-center justify-center z-10 shadow-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="ml-10 flex-1 p-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400">{p.description}</p>
                  <p className="text-[10px] text-slate-400">Previsão: {format(parseISO(p.dueDate), 'dd/MM/yyyy')}</p>
                </div>
                <p className="text-sm font-bold text-slate-400">R$ {p.amount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}

        {/* History */}
        {history.slice(0, 5).map((p) => (
          <div key={p.id} className="relative flex items-center gap-4 group">
            <div className={cn(
              "absolute left-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110",
              p.status === 'paid' ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white"
            )}>
              {p.status === 'paid' ? <CheckCircle2 className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            </div>
            <div className={cn(
              "ml-10 flex-1 p-3 rounded-2xl border transition-all",
              p.status === 'paid' ? "bg-emerald-50/30 border-emerald-100" : "bg-indigo-50/30 border-indigo-100"
            )}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-700">{p.description || 'Aluguel'}</p>
                  <p className="text-[10px] text-slate-500">Pago em: {p.paidDate ? format(parseISO(p.paidDate), 'dd/MM/yyyy') : '-'}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="text-sm font-bold text-slate-900">R$ {p.paidAmount?.toLocaleString() || p.amount.toLocaleString()}</p>
                  <div className="flex items-center gap-2">
                    {p.receiptUrl && (
                      <button 
                        onClick={() => {
                          const isImage = p.receiptUrl?.match(/\.(jpeg|jpg|gif|png)$/i) || p.thumbnailLink || p.receiptUrl?.startsWith('data:image');
                          setPreviewReceipt({ url: p.receiptUrl!, name: p.description || 'Recibo', isImage: !!isImage });
                        }}
                        className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1"
                        title="Ver Recibo"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        {isGoogleDriveLink(p.receiptUrl) && <Cloud className="w-3 h-3" />}
                      </button>
                    )}
                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Liquidado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserGuide = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const steps = [
    {
      title: "1. Cadastro de Imóveis",
      description: "Comece cadastrando seus imóveis na aba 'Imóveis'. Defina o valor do aluguel e o dia de vencimento padrão.",
      icon: <Home className="w-5 h-5 text-emerald-500" />
    },
    {
      title: "2. Alocação de Inquilinos",
      description: "Ao alocar um inquilino em um imóvel, o sistema gera automaticamente a primeira cobrança (Aluguel ou Caução).",
      icon: <Users className="w-5 h-5 text-blue-500" />
    },
    {
      title: "3. Confirmação de Pagamentos",
      description: "Na Dashboard ou aba 'Financeiro', clique em 'Confirmar' quando receber um valor. Se o valor for menor que o total, o sistema cria automaticamente um 'Saldo Pendente' para o restante.",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    },
    {
      title: "4. Acordos e Parcelamentos",
      description: "Para dívidas antigas, use a função 'Acordo'. Isso criará parcelas mensais que aparecem separadamente no seu panorama financeiro.",
      icon: <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
    },
    {
      title: "5. Panorama Financeiro",
      description: "Acompanhe o que já foi recebido e o que ainda falta cair no mês através dos gráficos e cards de resumo.",
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Guia de Uso do Sistema</h2>
                  <p className="text-xs text-muted-foreground">Aprenda a gerenciar suas cobranças com eficiência</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              <div className="grid gap-4">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                    <div className="shrink-0">{step.icon}</div>
                    <div>
                      <h3 className="font-bold text-sm mb-1">{step.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Dica de Previsibilidade:</strong> O sistema sempre prioriza mostrar o próximo pagamento mais próximo. Se houver um saldo pendente (pagamento parcial), ele aparecerá com destaque em Indigo.
                </p>
              </div>
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end">
              <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Entendi, vamos lá!
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface HomeViewProps {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  agreements: Agreement[];
  onConfirmPayment: (paymentId: string) => void;
  onOpenTenantDetail: (t: Tenant) => void;
}

const HomeView = ({ properties, tenants, payments, expenses, agreements, onConfirmPayment, onOpenTenantDetail }: HomeViewProps) => {
  const today = new Date();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const tenantStatus = useMemo(() => {
    return tenants.map(tenant => {
      const property = properties.find(p => p.id === tenant.propertyId);
      const tenantPayments = payments.filter(p => p.tenantId === tenant.id);
      
      // Check if any payment is late
      const latePayments = tenantPayments.filter(p => p.status === 'late' || (p.status === 'pending' && isBefore(parseISO(p.dueDate), today)));
      const isUpToDate = latePayments.length === 0;

      // Find next payment (any type)
      const upcomingPayments = tenantPayments
        .filter(p => p.status === 'pending' && isAfter(parseISO(p.dueDate), today))
        .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
      
      const nextPayment = upcomingPayments[0] || null;

      // Find last paid payment
      const lastPaid = tenantPayments
        .filter(p => (p.status === 'paid' || p.status === 'partial') && p.paidDate)
        .sort((a, b) => parseISO(b.paidDate!).getTime() - parseISO(a.paidDate!).getTime())[0];

      // Find active agreement
      const activeAgreement = agreements.find(a => a.tenantId === tenant.id);
      const nextAgreementInstallment = tenantPayments
        .filter(p => p.agreementId === activeAgreement?.id && p.status === 'pending')
        .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())[0];

      const hasPendingRemainder = tenantPayments.some(p => p.status === 'pending' && p.description?.startsWith('Restante:'));

      return {
        tenant,
        property,
        isUpToDate,
        hasPendingRemainder,
        latePaymentsCount: latePayments.length,
        nextPayment,
        lastPaid,
        activeAgreement,
        nextAgreementInstallment
      };
    });
  }, [tenants, properties, payments, agreements, today]);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Olá, {auth.currentUser?.displayName?.split(' ')[0] || 'Proprietário'}!</h1>
          <p className="text-muted-foreground">Aqui está o resumo dos seus inquilinos hoje.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsGuideOpen(true)}
          className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
        >
          <HelpCircle className="w-4 h-4" /> Guia do Sistema
        </Button>
      </header>

      <UserGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenantStatus.map(({ tenant, property, isUpToDate, hasPendingRemainder, latePaymentsCount, nextPayment, lastPaid, activeAgreement, nextAgreementInstallment }, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={tenant.id} 
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
            <Card className="p-6 flex flex-col gap-4 h-full border-slate-100/60 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1 relative z-10 transition-all duration-300 rounded-[1.5rem]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 cursor-pointer group/name" onClick={() => onOpenTenantDetail(tenant)}>
                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover/name:bg-indigo-50 group-hover/name:text-indigo-600 transition-colors shadow-sm">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 group-hover/name:text-indigo-600 transition-colors">{tenant.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Home className="w-3 h-3 text-slate-400" /> {property?.name || 'Sem imóvel'}
                    </p>
                  </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div 
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                    !isUpToDate ? "bg-red-100 text-red-700" : 
                    hasPendingRemainder ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-500/20 hover:bg-indigo-200 cursor-pointer" : 
                    "bg-emerald-100 text-emerald-700"
                  )}
                  onClick={() => hasPendingRemainder && onOpenTenantDetail(tenant)}
                  title={hasPendingRemainder ? "Clique para ver detalhes do saldo pendente" : ""}
                >
                  {!isUpToDate ? `${latePaymentsCount} Atraso(s)` : 
                   hasPendingRemainder ? 'Saldo Pendente' : 'Em Dia'}
                </div>
                {activeAgreement && (
                  <div className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-tight">
                    Acordo Ativo
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Último Recebido</p>
                  {lastPaid ? (
                    <div>
                      <p className="text-xs font-bold text-slate-700 truncate">{lastPaid.description || 'Aluguel'}</p>
                      <p className="text-[10px] font-bold text-emerald-600">R$ {lastPaid.paidAmount?.toLocaleString() || lastPaid.amount.toLocaleString()}</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">Nenhum</p>
                  )}
                </div>
                <div className={cn(
                  "p-3 rounded-xl border",
                  nextPayment?.description?.startsWith('Restante:') ? "bg-indigo-50/50 border-indigo-100" : "bg-emerald-50/30 border-emerald-100"
                )}>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Próximo</p>
                  {nextPayment ? (
                    <div>
                      <p className="text-xs font-bold text-slate-700 truncate">{nextPayment.description || 'Aluguel'}</p>
                      <p className={cn(
                        "text-[10px] font-bold",
                        nextPayment.description?.startsWith('Restante:') ? "text-indigo-600" : "text-emerald-600"
                      )}>R$ {nextPayment.amount.toLocaleString()}</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">Nenhum</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ação Pendente</p>
                {nextPayment ? (
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                    nextPayment.description?.startsWith('Restante:') 
                      ? "bg-indigo-50/30 border-indigo-100 ring-1 ring-indigo-500/5" 
                      : "bg-slate-50 border-slate-100"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        nextPayment.description?.startsWith('Restante:') ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                      )}>
                        {nextPayment.description?.startsWith('Restante:') ? <TrendingUp className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-700">
                            {nextPayment.description?.replace(/^Restante:\s*Restante:\s*/, 'Restante: ') || 'Aluguel'}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {format(parseISO(nextPayment.dueDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button 
                        size="sm" 
                        className={cn(
                          "h-7 text-[10px] border-none shadow-sm px-3 rounded-lg text-white",
                          nextPayment.description?.startsWith('Restante:') ? "bg-indigo-500 hover:bg-indigo-600" : "bg-emerald-500 hover:bg-emerald-600"
                        )}
                        onClick={() => onConfirmPayment(nextPayment.id)}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">Nenhum pagamento futuro agendado.</p>
                )}
              </div>

              {activeAgreement && nextAgreementInstallment && nextAgreementInstallment.id !== nextPayment?.id && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Próxima Parcela do Acordo</p>
                  <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div>
                      <p className="text-xs font-bold text-blue-900">{nextAgreementInstallment.description}</p>
                      <p className="text-[10px] text-blue-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(parseISO(nextAgreementInstallment.dueDate), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="font-bold text-blue-700">R$ {nextAgreementInstallment.amount.toLocaleString()}</p>
                      <Button 
                        size="sm" 
                        className="h-7 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm px-3 rounded-lg"
                        onClick={() => onConfirmPayment(nextAgreementInstallment.id)}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
          </motion.div>
        ))}
        {tenants.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground italic border-2 border-dashed rounded-2xl">
            Nenhum inquilino cadastrado.
          </div>
        )}
      </div>

      {/* Resumo de Dashboard na parte de baixo removido a pedido do usuário */}
    </div>
  );
};

interface FinancialSummaryProps {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  agreements: Agreement[];
  onConfirmPayment: (paymentId: string) => void;
  onOpenTenantDetail: (t: Tenant) => void;
}

const FinancialSummary = ({ properties, tenants, payments, expenses, agreements, onConfirmPayment, onOpenTenantDetail }: FinancialSummaryProps) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const today = new Date();

  const alerts = useMemo(() => {
    const list: any[] = [];

    payments.forEach(p => {
      const dueDate = parseISO(p.dueDate);
      const diff = differenceInDays(dueDate, today);
      
      if (p.status === 'pending' || p.status === 'late') {
        if (diff <= 5 && diff >= 0) {
          list.push({ ...p, alertType: 'warning', alertMessage: `Vence em ${diff} dias` });
        } else if (diff < 0) {
          list.push({ ...p, alertType: 'danger', alertMessage: `Atrasado há ${Math.abs(diff)} dias` });
        }
      }
    });

    return list.sort((a, b) => differenceInDays(parseISO(a.dueDate), today) - differenceInDays(parseISO(b.dueDate), today));
  }, [payments, today]);

  const projectionData = useMemo(() => {
    const data: any[] = [];
    
    for (let i = -3; i <= 3; i++) {
      const monthDate = addMonths(today, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM/yy', { locale: ptBR });
      
      const monthPayments = payments.filter(p => {
        const d = parseISO(p.dueDate);
        return d >= mStart && d <= mEnd && p.status !== 'cancelled' && p.type !== 'deposit';
      });
      
      const received = monthPayments
        .filter(p => (p.status === 'paid' || p.status === 'partial'))
        .reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);
        
      const pending = monthPayments
        .filter(p => p.status === 'pending' || p.status === 'late')
        .reduce((acc, p) => acc + p.amount, 0);
        
      const monthExpenses = expenses
        .filter(e => parseISO(e.date) >= mStart && parseISO(e.date) <= mEnd)
        .reduce((acc, e) => acc + e.amount, 0);
        
      // For future months, project rent based on active tenants
      let projectedRent = 0;
      if (i > 0) {
        tenants.forEach(t => {
          if (t.propertyId && t.status === 'allocated') {
            const prop = properties.find(p => p.id === t.propertyId);
            if (prop) {
              projectedRent += prop.rentValue;
            }
          }
        });
      }

      data.push({
        name: monthLabel,
        recebido: received,
        pendente: pending,
        projetado: i > 0 ? projectedRent : 0,
        despesas: monthExpenses,
        isFuture: i > 0,
        isCurrent: i === 0
      });
    }
    return data;
  }, [payments, expenses, tenants, today]);

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const rentPayments = payments.filter(p => !p.type || p.type === 'rent');
  const agreementPayments = payments.filter(p => p.type === 'agreement');

  const rentExpected = rentPayments.filter(p => {
    const date = parseISO(p.dueDate);
    return p.status !== 'cancelled' && date >= monthStart && date <= monthEnd;
  }).reduce((acc, p) => acc + p.amount, 0);

  const rentReceived = rentPayments.filter(p => 
    (p.status === 'paid' || p.status === 'partial') && 
    p.paidDate && parseISO(p.paidDate) >= monthStart
  ).reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);

  const rentPending = rentPayments.filter(p => 
    (p.status === 'pending' || p.status === 'late') && 
    parseISO(p.dueDate) >= monthStart && parseISO(p.dueDate) <= monthEnd
  ).reduce((acc, p) => acc + p.amount, 0);

  const rentPartialPending = rentPayments.filter(p => 
    (p.status === 'pending' || p.status === 'late') && 
    p.description?.includes('parte')
  ).reduce((acc, p) => acc + p.amount, 0);

  const agreementTotal = agreements.filter(a => a.status === 'active').reduce((acc, a) => acc + a.totalAmount, 0);
  
  const agreementMonthExpected = agreementPayments.filter(p => {
    const date = parseISO(p.dueDate);
    return p.status !== 'cancelled' && date >= monthStart && date <= monthEnd;
  }).reduce((acc, p) => acc + p.amount, 0);

  const agreementMonthReceived = agreementPayments.filter(p => 
    (p.status === 'paid' || p.status === 'partial') && 
    p.paidDate && parseISO(p.paidDate) >= monthStart
  ).reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);

  const agreementTotalReceived = agreementPayments.filter(p => 
    (p.status === 'paid' || p.status === 'partial')
  ).reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);

  const totalExpenses = expenses.filter(e => parseISO(e.date) >= monthStart).reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panorama Financeiro</h1>
          <p className="text-muted-foreground">Acompanhe o desempenho e as projeções da sua carteira.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsGuideOpen(true)}
          className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
        >
          <HelpCircle className="w-4 h-4" /> Guia do Sistema
        </Button>
      </header>

      <UserGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Panorama Financeiro (Mês)
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Receita Prevista (Aluguéis)</span>
              <span className="font-semibold">R$ {rentExpected.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Receita Recebida (Aluguéis)</span>
              <span className="font-semibold text-emerald-600">R$ {rentReceived.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saldo a Receber (Mês)</span>
              <span className="font-semibold text-amber-600">R$ {rentPending.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saldos Pendentes (Parciais)</span>
              <span className="font-semibold text-indigo-600">R$ {rentPartialPending.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Despesas Totais</span>
              <span className="font-semibold text-destructive">R$ {totalExpenses.toLocaleString()}</span>
            </div>
            <div className="pt-4 border-t flex items-center justify-between">
              <span className="font-bold">Saldo Líquido</span>
              <span className="text-xl font-bold">R$ {(rentReceived + agreementMonthReceived - totalExpenses).toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-1 p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-500" />
            Panorama de Acordos
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total dos Acordos</span>
              <span className="font-semibold">R$ {agreementTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">A Receber no Mês</span>
              <span className="font-semibold text-amber-600">R$ {agreementMonthExpected.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Arrecadado no Mês</span>
              <span className="font-semibold text-emerald-600">R$ {agreementMonthReceived.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Arrecadado</span>
              <span className="font-semibold text-blue-600">R$ {agreementTotalReceived.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Restante a Receber</span>
              <span className="font-semibold text-indigo-600">R$ {(agreementTotal - agreementTotalReceived).toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-1 p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Alertas de Pagamento
          </h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground italic border-2 border-dashed rounded-2xl">
                Nenhum alerta pendente no momento.
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={cn(
                  "p-4 rounded-2xl border flex items-center justify-between transition-all",
                  alert.alertType === 'danger' ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-xl",
                      alert.alertType === 'danger' ? "bg-red-500 text-white" : "bg-amber-500 text-white"
                    )}>
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p 
                          className="font-bold text-sm truncate max-w-[120px] cursor-pointer hover:text-indigo-600 transition-colors"
                          onClick={() => {
                            const tenant = tenants.find(t => t.propertyId === alert.propertyId);
                            if (tenant) onOpenTenantDetail(tenant);
                          }}
                        >
                          {properties.find(p => p.id === alert.propertyId)?.name}
                        </p>
                        {alert.revertReason && (
                          <button 
                            title={`Revertido: ${alert.revertReason}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info(`Justificativa da Reversão: ${alert.revertReason}`, {
                                duration: 5000,
                              });
                            }}
                            className="text-amber-500 hover:text-amber-600 transition-colors"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs font-medium",
                        alert.alertType === 'danger' ? "text-destructive" : 
                        alert.alertType === 'warning' ? "text-amber-600" : 
                        "text-emerald-600"
                      )}>
                        {alert.alertMessage}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="font-bold text-sm">R$ {alert.amount.toLocaleString()}</p>
                    <Button 
                      size="sm" 
                      className="bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm h-7 px-2 text-[10px]"
                      onClick={() => onConfirmPayment(alert.id)}
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-500" />
              Projeção Financeira (7 Meses)
            </h2>
            <p className="text-sm text-muted-foreground">Comparativo entre valores recebidos, pendentes e projeções futuras.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" /> Recebido
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-500" /> Pendente
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-indigo-400" /> Projetado
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-400" /> Despesas
            </div>
          </div>
        </div>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
              />
              <RechartsTooltip 
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 min-w-[180px]">
                        <p className="text-sm font-black text-slate-800 mb-3 border-b pb-2">{label}</p>
                        <div className="space-y-2">
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{entry.name}</span>
                              </div>
                              <span className="text-xs font-black text-slate-700">R$ {entry.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="recebido" name="Recebido" stackId="a" radius={[0, 0, 0, 0]}>
                {projectionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isCurrent ? '#10b981' : '#34d399'} />
                ))}
              </Bar>
              <Bar dataKey="pendente" name="Pendente" stackId="a" radius={[4, 4, 0, 0]}>
                {projectionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isCurrent ? '#f59e0b' : '#fbbf24'} />
                ))}
              </Bar>
              <Bar dataKey="projetado" name="Projetado" stackId="a" radius={[4, 4, 0, 0]}>
                {projectionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#818cf8" />
                ))}
              </Bar>
              <Bar dataKey="despesas" name="Despesas" radius={[4, 4, 4, 4]}>
                {projectionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#f87171" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Resumo Financeiro por Imóvel */}
      <div id="financial-summary-section" className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
            Resumo Financeiro por Imóvel (Total Acumulado)
          </h2>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
            Histórico Completo
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {properties.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground italic border-2 border-dashed rounded-2xl">
              Nenhum imóvel cadastrado para exibir o resumo.
            </div>
          ) : (
            properties.map(property => {
              const propPayments = payments.filter(p => p.propertyId === property.id && (p.status === 'paid' || p.status === 'partial') && p.type !== 'deposit');
              const propPending = payments.filter(p => p.propertyId === property.id && (p.status === 'pending' || p.status === 'late') && p.type !== 'deposit');
              const propExpenses = expenses.filter(e => e.propertyId === property.id);
              
              const totalRent = propPayments.reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);
              const totalPending = propPending.reduce((acc, p) => acc + p.amount, 0);
              const totalRenovation = propExpenses.filter(e => e.type === 'renovation').reduce((acc, e) => acc + e.amount, 0);
              const totalRepair = propExpenses.filter(e => e.type === 'repair').reduce((acc, e) => acc + e.amount, 0);
              const totalTax = propExpenses.filter(e => e.type === 'tax').reduce((acc, e) => acc + e.amount, 0);
              const totalFine = propExpenses.filter(e => e.type === 'fine').reduce((acc, e) => acc + e.amount, 0);
              const totalOther = propExpenses.filter(e => e.type === 'other').reduce((acc, e) => acc + e.amount, 0);
              
              const totalInvested = totalRenovation + totalRepair;
              const balance = totalRent - totalInvested - totalTax - totalFine - totalOther;

              return (
                <Card key={property.id} className="p-5 flex flex-col gap-4 hover:shadow-md transition-shadow border-slate-200 bg-white/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{property.name}</h3>
                      <p className="text-[10px] text-slate-400 truncate">{property.address}</p>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ml-2",
                      property.status === 'rented' ? "bg-emerald-100 text-emerald-700" :
                      property.status === 'vacant' ? "bg-amber-100 text-amber-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {property.status === 'rented' ? 'Alugado' : property.status === 'vacant' ? 'Livre' : 'Reforma'}
                    </div>
                  </div>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs text-slate-500">Total Aluguéis</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">R$ {totalRent.toLocaleString()}</span>
                    </div>

                    {totalPending > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className="text-xs text-slate-500">Saldo Pendente</span>
                        </div>
                        <span className="text-xs font-bold text-indigo-600">R$ {totalPending.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-xs text-slate-500">Invest. Reforma</span>
                      </div>
                      <span className="text-xs font-bold text-amber-600">R$ {totalInvested.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="text-xs text-slate-500">Total Impostos</span>
                      </div>
                      <span className="text-xs font-bold text-rose-600">R$ {totalTax.toLocaleString()}</span>
                    </div>

                    {(totalFine > 0) && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                          <span className="text-xs text-slate-500">Total Multas</span>
                        </div>
                        <span className="text-xs font-bold text-red-600">R$ {totalFine.toLocaleString()}</span>
                      </div>
                    )}

                    {(totalOther > 0) && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span className="text-xs text-slate-500">Outros Gastos</span>
                        </div>
                        <span className="text-xs font-bold text-slate-600">R$ {totalOther.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-4 border-t flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Saldo Líquido</span>
                      <span className={cn(
                        "font-black text-xl leading-none mt-1",
                        balance >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        R$ {balance.toLocaleString()}
                      </span>
                    </div>
                    <div className={cn(
                      "p-2 rounded-xl",
                      balance >= 0 ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                    )}>
                      {balance >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

interface PropertiesViewProps {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  addProperty: (p: any) => Promise<void>;
  updateProperty: (id: string, p: any) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  removeTenantFromProperty: (pId: string, tId: string, action: 'waiting' | 'archived' | 'delete') => Promise<void>;
  onSecurityCheck: (onSuccess: () => void, description?: string) => void;
}

const PropertiesView = ({ properties, tenants, payments, addProperty, updateProperty, deleteProperty, removeTenantFromProperty, onSecurityCheck }: PropertiesViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    status: 'vacant' as PropertyStatus,
    rentValue: 0,
    paymentDay: 5,
    currentTenantId: ''
  });

  const handleOpenModal = (p?: Property) => {
    if (p) {
      setEditingProperty(p);
      setFormData({
        name: p.name,
        address: p.address,
        status: p.status,
        rentValue: p.rentValue,
        paymentDay: p.paymentDay || 5,
        currentTenantId: p.currentTenantId || ''
      });
    } else {
      setEditingProperty(null);
      setFormData({ name: '', address: '', status: 'vacant', rentValue: 0, paymentDay: 5, currentTenantId: '' });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetail = (p: Property) => {
    setSelectedProperty(p);
    setIsDetailModalOpen(true);
  };

  const currentProperty = useMemo(() => {
    if (!selectedProperty) return null;
    return properties.find(p => p.id === selectedProperty.id) || selectedProperty;
  }, [selectedProperty, properties]);

  const propertyPayments = useMemo(() => {
    if (!currentProperty) return [];
    return payments.filter(p => p.propertyId === currentProperty.id);
  }, [currentProperty, payments]);

  const latePayments = useMemo(() => {
    const today = new Date();
    return propertyPayments.filter(p => 
      p.status === 'late' || 
      (p.status === 'pending' && isBefore(parseISO(p.dueDate), today))
    ).sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
  }, [propertyPayments]);

  const pendingPayments = useMemo(() => {
    const today = new Date();
    return propertyPayments.filter(p => 
      p.status === 'pending' && !isBefore(parseISO(p.dueDate), today)
    ).sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
  }, [propertyPayments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProperty) {
      onSecurityCheck(async () => {
        setIsSubmitting(true);
        try {
          await updateProperty(editingProperty.id, formData);
          setIsModalOpen(false);
        } catch (error) {
          console.error('Erro ao salvar imóvel:', error);
        } finally {
          setIsSubmitting(false);
        }
      }, `Ao confirmar, você alterará os dados do imóvel ${editingProperty.name}.`);
    } else {
      setIsSubmitting(true);
      try {
        await addProperty(formData);
        setIsModalOpen(false);
      } catch (error) {
        console.error('Erro ao salvar imóvel:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Imóveis</h1>
          <p className="text-muted-foreground">Gerencie suas casas e apartamentos.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Imóvel
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {properties.map(p => {
          const tenant = tenants.find(t => t.id === p.currentTenantId);
          return (
            <Card key={p.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpenDetail(p)}>
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{p.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {p.address}
                    </p>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded text-[10px] uppercase font-bold",
                    p.status === 'rented' ? "bg-emerald-100 text-emerald-700" :
                    p.status === 'vacant' ? "bg-amber-100 text-amber-700" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    {p.status === 'rented' ? 'Alugada' : p.status === 'vacant' ? 'Livre' : 'Reforma'}
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Aluguel:</span>
                    <span className="font-semibold">R$ {p.rentValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Inquilino:</span>
                    <span className="font-medium text-primary">
                      {tenant ? tenant.name : <span className="text-muted-foreground italic">Nenhum</span>}
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleOpenModal(p)}>
                    <Edit className="w-3 h-3" /> Editar
                  </Button>
                  {p.currentTenantId && (
                    <div className="relative group/menu">
                      <Button variant="outline" size="sm" className="gap-1">
                        <ArrowRightLeft className="w-3 h-3" /> Remover
                      </Button>
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover/menu:flex flex-col bg-white border rounded-lg shadow-xl z-10 min-w-[150px]">
                        <button onClick={() => removeTenantFromProperty(p.id, p.currentTenantId!, 'waiting')} className="px-4 py-2 text-xs text-left hover:bg-accent">Deixar em Espera</button>
                        <button onClick={() => removeTenantFromProperty(p.id, p.currentTenantId!, 'archived')} className="px-4 py-2 text-xs text-left hover:bg-accent">Arquivar</button>
                        <button onClick={() => removeTenantFromProperty(p.id, p.currentTenantId!, 'delete')} className="px-4 py-2 text-xs text-left hover:bg-destructive hover:text-white">Excluir Inquilino</button>
                      </div>
                    </div>
                  )}
                  <Button variant="danger" size="sm" onClick={() => onSecurityCheck(() => deleteProperty(p.id), `Ao confirmar, você excluirá permanentemente o imóvel ${p.name}.`)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalhes do Imóvel">
        {currentProperty && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <p className={cn(
                  "text-sm font-bold",
                  currentProperty.status === 'rented' ? "text-emerald-600" :
                  currentProperty.status === 'vacant' ? "text-amber-600" :
                  "text-blue-600"
                )}>
                  {currentProperty.status === 'rented' ? 'Alugada' : currentProperty.status === 'vacant' ? 'Livre' : 'Reforma'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valor do Aluguel</p>
                <p className="text-sm font-bold text-slate-900">R$ {currentProperty.rentValue.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Endereço Completo</p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                <p className="text-sm text-slate-700">{currentProperty.address}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Inquilino Atual</p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">
                    {tenants.find(t => t.id === currentProperty.currentTenantId)?.name || 'Nenhum inquilino alocado'}
                  </p>
                </div>
                {currentProperty.paymentDay && (
                  <p className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded-lg">
                    Vencimento: Dia {currentProperty.paymentDay}
                  </p>
                )}
              </div>
            </div>

            {/* Pagamentos Pendentes e em Atraso */}
            {(pendingPayments.length > 0 || latePayments.length > 0) && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Pagamentos do Imóvel</p>
                <div className="space-y-2">
                  {latePayments.map(p => {
                    const daysLate = differenceInDays(new Date(), parseISO(p.dueDate));
                    return (
                      <div key={p.id} className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-red-900">{p.description || 'Aluguel'}</p>
                              {p.revertReason && (
                                <button 
                                  title={`Revertido: ${p.revertReason}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.info(`Justificativa da Reversão: ${p.revertReason}`, {
                                      duration: 5000,
                                    });
                                  }}
                                  className="text-amber-500 hover:text-amber-600 transition-colors"
                                >
                                  <AlertCircle className="w-3 h-3" />
                                </button>
                              )}
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase">
                                {daysLate} dias
                              </span>
                            </div>
                            <p className="text-[10px] text-red-700">Vencimento: {format(parseISO(p.dueDate), 'dd/MM/yyyy')}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-red-900">R$ {(p.amount + (p.interestAmount || 0)).toLocaleString()}</p>
                      </div>
                    );
                  })}
                  {pendingPayments.map(p => (
                    <div key={p.id} className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-blue-900">{p.description || 'Aluguel'}</p>
                            {p.revertReason && (
                              <button 
                                title={`Revertido: ${p.revertReason}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.info(`Justificativa da Reversão: ${p.revertReason}`, {
                                    duration: 5000,
                                  });
                                }}
                                className="text-amber-500 hover:text-amber-600 transition-colors"
                              >
                                <AlertCircle className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-blue-700">Vencimento: {format(parseISO(p.dueDate), 'dd/MM/yyyy')}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-blue-900">R$ {p.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <Button className="flex-1 py-3" onClick={() => {
                setIsDetailModalOpen(false);
                handleOpenModal(selectedProperty);
              }}>
                <Edit className="w-4 h-4 mr-2" /> Editar Informações
              </Button>
              <Button variant="outline" className="py-3" onClick={() => setIsDetailModalOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProperty ? "Editar Imóvel" : "Novo Imóvel"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            id="name" 
            label="Nome do Imóvel" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            required 
          />
          <Input 
            id="address" 
            label="Endereço" 
            value={formData.address} 
            onChange={e => setFormData({...formData, address: e.target.value})} 
            required 
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Status
                <InfoTooltip text="Livre: Disponível para alugar. Alugada: Já possui inquilino. Reforma: Indisponível temporariamente." />
              </label>
              <Select 
                id="status" 
                value={formData.status} 
                onChange={e => {
                  const newStatus = e.target.value as PropertyStatus;
                  if (newStatus === 'renovation' && formData.currentTenantId) {
                    setFormData({...formData, status: newStatus, currentTenantId: ''});
                  } else {
                    setFormData({...formData, status: newStatus});
                  }
                }} 
                options={[
                  { label: 'Livre', value: 'vacant' },
                  { label: 'Alugada', value: 'rented' },
                  { label: 'Reforma', value: 'renovation' }
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Valor do Aluguel
                <InfoTooltip text="Valor base mensal que será cobrado do inquilino." />
              </label>
              <CurrencyInput 
                id="rentValue" 
                value={formData.rentValue} 
                onChange={val => setFormData({...formData, rentValue: val})} 
                required 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Dia de Vencimento
                <InfoTooltip text="Dia do mês em que o aluguel deve ser pago (ex: 5, 10, 15)." />
              </label>
              <Input 
                id="paymentDay" 
                type="number" 
                value={formData.paymentDay} 
                onChange={e => setFormData({...formData, paymentDay: Number(e.target.value)})} 
                required 
                placeholder="Ex: 5"
              />
            </div>
          </div>
          {formData.status === 'rented' && (
            <Select 
              id="tenant" 
              label="Inquilino Atual" 
              value={formData.currentTenantId} 
              onChange={e => setFormData({...formData, currentTenantId: e.target.value})} 
              options={[
                { label: 'Nenhum', value: '' },
                ...tenants
                  .filter(t => t.status !== 'archived' && (!t.propertyId || t.propertyId === editingProperty?.id))
                  .map(t => ({ label: t.name, value: t.id }))
              ]}
            />
          )}
          <div className="pt-4 flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

interface TenantsViewProps {
  tenants: Tenant[];
  properties: Property[];
  payments: Payment[];
  addTenant: (t: any) => Promise<void>;
  updateTenant: (id: string, t: any) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  onOpenDetail: (t: Tenant) => void;
  onSecurityCheck: (onSuccess: () => void, description?: string) => void;
  isDriveConnected: boolean;
  uploadToDrive: (fileName: string, fileData: string, mimeType: string, folderName?: string) => Promise<any>;
  setPreviewReceipt: (preview: { url: string; name: string; isImage: boolean } | null) => void;
}

const TenantsView = ({ tenants, properties, payments, addTenant, updateTenant, deleteTenant, onOpenDetail, onSecurityCheck, isDriveConnected, uploadToDrive, setPreviewReceipt }: TenantsViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    contact: '',
    secondaryContact: '',
    status: 'waiting' as TenantStatus,
    rating: 5,
    observations: '',
    propertyId: '',
    contractFile: '',
    initialPaymentType: 'rent' as 'deposit' | 'rent',
    depositValue: 0,
    depositInstallments: 1,
    depositDay: 10,
    evidenceLocation: '',
    evidenceName: '',
    thumbnailLink: ''
  });

  const handleOpenModal = (t?: Tenant) => {
    if (t) {
      setEditingTenant(t);
      setFormData({
        name: t.name,
        cpf: t.cpf,
        contact: t.contact,
        secondaryContact: t.secondaryContact || '',
        status: t.status,
        rating: t.rating || 5,
        observations: t.observations || '',
        propertyId: t.propertyId || '',
        contractFile: t.contractFile || '',
        initialPaymentType: t.initialPaymentType || 'rent',
        depositValue: t.depositValue || 0,
        depositInstallments: t.depositInstallments || 1,
        depositDay: t.depositDay || 10,
        evidenceLocation: t.evidenceLocation || '',
        evidenceName: t.evidenceName || '',
        thumbnailLink: t.thumbnailLink || ''
      });
    } else {
      setEditingTenant(null);
      setFormData({ 
        name: '', 
        cpf: '', 
        contact: '', 
        secondaryContact: '', 
        status: 'waiting', 
        rating: 5, 
        observations: '', 
        propertyId: '', 
        contractFile: '',
        initialPaymentType: 'rent',
        depositValue: 0,
        depositInstallments: 1,
        depositDay: 10,
        evidenceLocation: '',
        evidenceName: '',
        thumbnailLink: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTenant) {
      onSecurityCheck(async () => {
        setIsSubmitting(true);
        try {
          await updateTenant(editingTenant.id, formData);
          setIsModalOpen(false);
        } catch (error) {
          console.error('Erro ao salvar inquilino:', error);
        } finally {
          setIsSubmitting(false);
        }
      }, `Ao confirmar, você alterará os dados cadastrais de ${editingTenant.name}.`);
    } else {
      setIsSubmitting(true);
      try {
        await addTenant(formData);
        setIsModalOpen(false);
      } catch (error) {
        console.error('Erro ao salvar inquilino:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inquilinos</h1>
          <p className="text-muted-foreground">Gerencie seus contatos e contratos.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Inquilino
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tenants.map(t => (
          <Card key={t.id} className="p-6 space-y-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onOpenDetail(t)}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold group-hover:text-primary transition-colors">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">{t.cpf}</p>
                </div>
              </div>
              <div className={cn(
                "px-2 py-1 rounded text-[10px] uppercase font-bold",
                t.status === 'allocated' ? "bg-emerald-100 text-emerald-700" :
                t.status === 'waiting' ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-700"
              )}>
                {t.status === 'allocated' ? 'Alocado' : t.status === 'waiting' ? 'Espera' : 'Arquivado'}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /> {t.contact}</p>
              
              {/* Deposit Warning */}
              {payments.some(p => p.tenantId === t.id && p.type === 'deposit' && (p.status === 'pending' || p.status === 'late')) && (
                <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 rounded-lg border border-amber-100">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-tighter">Caução Pendente</span>
                </div>
              )}

              {t.contractFile && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const isImage = t.contractFile?.match(/\.(jpeg|jpg|gif|png)$/i) || t.thumbnailLink;
                    setPreviewReceipt({ url: t.contractFile!, name: `Contrato - ${t.name}`, isImage: !!isImage });
                  }}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <FileText className="w-3 h-3" /> Ver Contrato
                </button>
              )}
              {t.rating && (
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("w-3 h-3", i < t.rating! ? "text-amber-400 fill-amber-400" : "text-muted")} />
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleOpenModal(t)}>
                <Edit className="w-3 h-3" /> Perfil
              </Button>
              <Button variant="danger" size="sm" onClick={() => onSecurityCheck(() => deleteTenant(t.id), `Ao confirmar, você excluirá permanentemente o registro de ${t.name}.`)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTenant ? "Editar Perfil" : "Novo Inquilino"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Nome Completo" id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                CPF
                <InfoTooltip text="Documento de identificação obrigatório para o contrato." />
              </label>
              <Input id="cpf" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Celular do Inquilino
                <InfoTooltip text="Número de contato principal (WhatsApp)." />
              </label>
              <Input id="contact" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
              Contato de Emergência (Outra Pessoa)
              <InfoTooltip text="Nome e telefone de um parente ou amigo para casos de emergência." />
            </label>
            <Input id="sec" value={formData.secondaryContact} onChange={e => setFormData({...formData, secondaryContact: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
              Localização do Comprovante
              <InfoTooltip text="Onde o contrato físico está guardado ou link para pasta digital." />
            </label>
            <Input id="evidence" value={formData.evidenceLocation} onChange={e => setFormData({...formData, evidenceLocation: e.target.value})} placeholder="Ex: Pasta 5, Gaveta 2 ou Link" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Status
                <InfoTooltip text="Alocado: Atualmente em um imóvel. Espera: Aguardando vaga. Arquivado: Contrato encerrado." />
              </label>
              <Select 
                id="status" 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value as TenantStatus})} 
                options={[
                  { label: 'Em Espera', value: 'waiting' },
                  { label: 'Alocado', value: 'allocated' },
                  { label: 'Arquivado', value: 'archived' }
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Avaliação (1-5)
                <InfoTooltip text="Nota para o comportamento e pontualidade do inquilino." />
              </label>
              <Input id="rating" type="number" value={formData.rating} onChange={e => setFormData({...formData, rating: Number(e.target.value)})} />
            </div>
          </div>
          {formData.status === 'allocated' && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <Select 
                label="Imóvel Alocado" 
                id="propertyId" 
                value={formData.propertyId} 
                onChange={e => {
                  const propId = e.target.value;
                  setFormData({...formData, propertyId: propId});
                }} 
                options={[
                  { label: 'Nenhum', value: '' },
                  ...properties.map(p => {
                    const statusLabel = 
                      p.status === 'renovation' ? '(EM REFORMA)' : 
                      p.status === 'rented' ? '(OCUPADA)' : 
                      '(DISPONÍVEL)';
                    
                    // Prohibit 2 tenants: disable if rented and not the current tenant's property
                    const isOccupiedByOther = p.status === 'rented' && p.currentTenantId !== editingTenant?.id;

                    return { 
                      label: `${p.name} ${statusLabel}`, 
                      value: p.id,
                      disabled: isOccupiedByOther
                    };
                  })
                ]}
              />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Configuração Financeira</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-slate-400 hover:text-indigo-500 transition-colors">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px] p-4 bg-white border border-slate-200 shadow-xl rounded-2xl">
                    <p className="text-xs leading-relaxed text-slate-600">
                      <span className="font-bold text-slate-800">Depósito Caução (Garantia):</span> valor retido como garantia contratual, não considerado receita. Pode ser devolvido ao final do contrato ou utilizado para cobrir danos e pendências do inquilino.
                      <br /><br />
                      <span className="font-bold text-slate-800">Aluguel:</span> valor mensal pelo uso do imóvel, considerado receita.
                      <br /><br />
                      <span className="italic text-[10px]">Isso segue a Lei do Inquilinato (Lei nº 8.245/1991).</span>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
              <CurrencyInput 
                label="Depósito Caução (Garantia Total)" 
                id="depositValue" 
                value={formData.depositValue} 
                onChange={val => setFormData({...formData, depositValue: val})} 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Parcelas</label>
                  <Select 
                    id="depositInstallments" 
                    value={String(formData.depositInstallments)} 
                    onChange={e => setFormData({...formData, depositInstallments: Number(e.target.value)})} 
                    options={[
                      { label: 'À Vista', value: '1' },
                      { label: '2x', value: '2' },
                      { label: '3x', value: '3' },
                      { label: '4x', value: '4' },
                      { label: '5x', value: '5' },
                      { label: '6x', value: '6' },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Dia Venc. Caução</label>
                  <Input 
                    type="number" 
                    id="depositDay" 
                    value={String(formData.depositDay)} 
                    onChange={e => setFormData({...formData, depositDay: Number(e.target.value)})} 
                    min="1" max="31"
                  />
                </div>
              </div>
              
              {formData.depositInstallments > 1 && formData.depositValue > 0 && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight">
                    {formData.depositInstallments} parcelas de R$ {(formData.depositValue / formData.depositInstallments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              <p className="text-[10px] text-slate-400 font-medium px-1 italic">* O Caução será classificado como Garantia/Passivo e não entrará no faturamento.</p>
            </div>
          </div>
        </div>
      )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Anexar Contrato (PDF/Foto)</label>
            <div className="flex items-center gap-3 p-3 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <input type="file" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    if (isDriveConnected) {
                      toast.promise(
                        uploadToDrive(file.name, base64, file.type, formData.name || 'Geral'),
                        {
                          loading: 'Enviando contrato para o Google Drive...',
                          success: (data) => {
                            setFormData({...formData, contractFile: data.webViewLink, evidenceName: file.name, thumbnailLink: data.thumbnailLink});
                            return 'Contrato salvo no Google Drive!';
                          },
                          error: 'Erro ao enviar para o Google Drive.'
                        }
                      );
                    } else {
                      setFormData({...formData, contractFile: base64, evidenceName: file.name});
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
              {formData.contractFile && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-500 w-4 h-4" />
                  {(formData.contractFile.startsWith('data:image') || formData.thumbnailLink || (formData.evidenceName && /\.(jpg|jpeg|png|webp)$/i.test(formData.evidenceName))) && (
                    <img 
                      src={formData.thumbnailLink || formData.contractFile} 
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm" 
                      alt="Preview"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Observações</label>
            <textarea 
              className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-slate-400"
              placeholder="Alguma observação importante sobre o inquilino..."
              value={formData.observations}
              onChange={e => setFormData({...formData, observations: e.target.value})}
            />
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="submit" className="flex-1 py-3" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Inquilino'}
            </Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="py-3" disabled={isSubmitting}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

interface FinancialViewProps {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  agreements: Agreement[];
  addExpense: (e: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addPayment: (p: any) => Promise<void>;
  markPaymentAsPaid: (paymentId: string, paidAmount?: number, receiptUrl?: string, evidenceName?: string, evidenceLocation?: string, remainderDueDate?: string, remainderObservations?: string) => Promise<void>;
  setIsAgreementModalOpen: (open: boolean) => void;
  onConfirmPayment: (paymentId: string) => void;
  setArchivingAgreement: (a: Agreement) => void;
  setIsArchiveAgreementModalOpen: (open: boolean) => void;
  setIsRevertModalOpen: (open: boolean) => void;
  setRevertingPayment: (p: Payment | null) => void;
  onOpenTenantDetail: (t: Tenant) => void;
  isDriveConnected: boolean;
  uploadToDrive: (fileName: string, fileData: string, mimeType: string, folderName?: string) => Promise<any>;
  setPreviewReceipt: (preview: { url: string; name: string; isImage: boolean } | null) => void;
}

const FinancialView = ({ 
  properties, 
  tenants, 
  payments, 
  expenses, 
  agreements,
  addExpense, 
  deleteExpense,
  addPayment, 
  markPaymentAsPaid, 
  setIsAgreementModalOpen,
  onConfirmPayment,
  setArchivingAgreement,
  setIsArchiveAgreementModalOpen,
  setIsRevertModalOpen,
  setRevertingPayment,
  onOpenTenantDetail,
  isDriveConnected,
  uploadToDrive,
  setPreviewReceipt
}: FinancialViewProps) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentDetailModalOpen, setIsPaymentDetailModalOpen] = useState(false);
  const [isExpenseDetailModalOpen, setIsExpenseDetailModalOpen] = useState(false);
  const [isAllExpensesModalOpen, setIsAllExpensesModalOpen] = useState(false);
  const [isDeleteExpenseModalOpen, setIsDeleteExpenseModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [expenseForm, setExpenseForm] = useState({
    propertyId: '',
    description: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'repair' as ExpenseType,
    evidence: '',
    evidenceName: '',
    evidenceLocation: '',
    thumbnailLink: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    propertyId: '',
    tenantId: '',
    amount: 0,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    type: 'rent' as 'rent' | 'deposit' | 'agreement',
    description: 'Aluguel Mensal'
  });

  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  
  const [filterPropertyId, setFilterPropertyId] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filterExpensePropertyId, setFilterExpensePropertyId] = useState('');
  const [filterExpenseType, setFilterExpenseType] = useState('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');

  const displayItems = useMemo(() => {
    const items: any[] = [];
    const agreementMap: { [key: string]: Payment[] } = {};
    
    // Filter payments
    const filteredPayments = payments.filter(p => {
      const matchesProperty = !filterPropertyId || p.propertyId === filterPropertyId;
      const matchesType = filterType === 'all' || filterType === 'payment' || (filterType === 'agreement' && p.agreementId);
      const tenant = tenants.find(t => t.id === p.tenantId);
      const prop = properties.find(pr => pr.id === p.propertyId);
      const matchesSearch = !searchQuery || 
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesProperty && matchesType && matchesSearch;
    });

    // Separate standalone payments and group agreement payments
    filteredPayments.forEach(p => {
      if (p.agreementId) {
        if (!agreementMap[p.agreementId]) agreementMap[p.agreementId] = [];
        agreementMap[p.agreementId].push(p);
      } else {
        items.push({ 
          type: 'payment', 
          id: p.id, 
          data: p, 
          date: parseISO(p.dueDate) 
        });
      }
    });

    // Process agreement groups
    Object.entries(agreementMap).forEach(([id, groupPayments]) => {
      groupPayments.sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
      
      const agreement = agreements.find(a => a.id === id);
      const hasLate = groupPayments.some(p => p.status === 'late');
      const allPaid = groupPayments.every(p => p.status === 'paid' || p.status === 'partial');
      const status = hasLate ? 'late' : allPaid ? 'paid' : 'pending';
      const paidCount = groupPayments.filter(p => p.status === 'paid' || p.status === 'partial').length;
      const totalCount = groupPayments.length;
      
      // Find the "most relevant" date for sorting (the next pending or the latest)
      const nextPayment = groupPayments.find(p => p.status !== 'paid') || groupPayments[groupPayments.length - 1];

      items.push({ 
        type: 'agreement_group', 
        id, 
        agreement,
        payments: groupPayments, 
        date: parseISO(nextPayment.dueDate),
        status,
        paidCount,
        totalCount
      });
    });

    // Sort all items by date (newest first)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [payments, agreements, filterPropertyId, filterType, searchQuery, tenants, properties]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addExpense(expenseForm);
      toast.success('Despesa adicionada com sucesso!');
      setIsExpenseModalOpen(false);
      setExpenseForm({
        propertyId: '',
        description: '',
        amount: 0,
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'repair' as ExpenseType,
        evidence: '',
        evidenceName: '',
        evidenceLocation: '',
        thumbnailLink: ''
      });
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      toast.error('Erro ao salvar a despesa. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addPayment({
        ...paymentForm,
        status: 'pending'
      });
      setIsNewPaymentModalOpen(false);
      setPaymentForm({
        propertyId: '',
        tenantId: '',
        amount: 0,
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        type: 'rent' as 'rent' | 'deposit' | 'agreement',
        description: 'Aluguel Mensal'
      });
    } catch (error) {
      console.error('Erro ao adicionar pagamento:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Controle de entradas e saídas.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => {
              document.getElementById('financial-summary-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Resumo por Imóvel
          </Button>
          <Button onClick={() => setIsAgreementModalOpen(true)} variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
            <FileText className="w-4 h-4" /> Acordo
          </Button>
          <Button onClick={() => setIsNewPaymentModalOpen(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Receber
          </Button>
          <Button onClick={() => setIsExpenseModalOpen(true)} className="gap-2">
            <TrendingDown className="w-4 h-4" /> Despesa
          </Button>
        </div>
      </header>

      <FinancialSummary 
        properties={properties} 
        tenants={tenants} 
        payments={payments} 
        expenses={expenses} 
        agreements={agreements}
        onConfirmPayment={onConfirmPayment} 
        onOpenTenantDetail={onOpenTenantDetail}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-4 bg-slate-50 border-slate-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar pagamentos (inquilino, imóvel, desc)..." 
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select 
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={filterPropertyId}
                  onChange={e => setFilterPropertyId(e.target.value)}
                >
                  <option value="">Todos os Imóveis</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select 
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="payment">Pagamentos Diretos</option>
                  <option value="agreement">Acordos</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Histórico de Pagamentos</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="w-3 h-3" />
                <span>Mais recentes primeiro</span>
              </div>
            </div>

            <div className="space-y-3">
              {displayItems.map(item => {
                if (item.type === 'payment') {
                  const p = item.data as Payment;
                  const prop = properties.find(pr => pr.id === p.propertyId);
                  const tenant = tenants.find(t => t.id === p.tenantId);
                  const isExpanded = expandedPaymentId === p.id;

                  return (
                    <div 
                      key={p.id} 
                      className={cn(
                        "group border rounded-2xl transition-all duration-300 overflow-hidden",
                        isExpanded ? "ring-2 ring-primary/20 border-primary/30 bg-primary/5 shadow-sm" : "hover:border-slate-300 hover:bg-slate-50/50"
                      )}
                    >
                      {/* Header / Bar */}
                      <div 
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                        onClick={() => setExpandedPaymentId(isExpanded ? null : p.id!)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            p.status === 'paid' ? "bg-emerald-100 text-emerald-600" :
                            p.status === 'partial' ? "bg-indigo-100 text-indigo-600" :
                            p.status === 'late' ? "bg-red-100 text-red-600" :
                            p.status === 'cancelled' ? "bg-slate-100 text-slate-500" :
                            "bg-amber-100 text-amber-600"
                          )}>
                            {p.status === 'paid' ? <CheckCircle2 className="w-5 h-5" /> : 
                             p.status === 'partial' ? <TrendingUp className="w-5 h-5" /> : 
                             p.status === 'late' ? <ShieldAlert className="w-5 h-5" /> : 
                             p.status === 'cancelled' ? <XCircle className="w-5 h-5" /> : 
                             <Clock className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-bold text-slate-900 truncate">{prop?.name}</h3>
                              {p.revertReason && (
                                <button 
                                  title={`Revertido: ${p.revertReason}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.info(`Justificativa da Reversão: ${p.revertReason}`, {
                                      duration: 5000,
                                    });
                                  }}
                                  className="text-amber-500 hover:text-amber-600 transition-colors"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-tight shrink-0">
                                {p.type === 'rent' ? 'Aluguel' : p.type === 'deposit' ? 'Caução' : 'Acordo'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <UserIcon className="w-3 h-3" /> {tenant?.name} 
                              <span className="mx-1 text-slate-300">•</span>
                              <span className="truncate italic">{(p.description || 'Aluguel Mensal').replace(/^Restante:\s*Restante:\s*/, 'Restante: ')}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencimento</p>
                            <p className="text-sm font-medium text-slate-700">{format(parseISO(p.dueDate), 'dd/MM/yyyy')}</p>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor</p>
                            <p className="text-sm font-bold text-slate-900">R$ {p.amount.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "hidden sm:inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight",
                              p.status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                              p.status === 'partial' ? "bg-indigo-100 text-indigo-700 font-black ring-2 ring-indigo-500/20" :
                              (p.status === 'pending' && p.description?.startsWith('Restante:')) ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-500/10" :
                              p.status === 'late' ? "bg-red-100 text-red-700" :
                              p.status === 'cancelled' ? "bg-slate-100 text-slate-500" :
                              "bg-amber-100 text-amber-700"
                            )}>
                              {p.status === 'paid' ? 'Pago' : 
                               p.status === 'partial' ? 'Parcial' : 
                               (p.status === 'pending' && p.description?.startsWith('Restante:')) ? 'Saldo Pendente' :
                               p.status === 'late' ? 'Atrasado' : 
                               p.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                            </span>
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300",
                              isExpanded ? "rotate-180 bg-primary/10 text-primary" : "text-slate-400 group-hover:bg-slate-200"
                            )}>
                              <ChevronRight className="w-4 h-4 rotate-90" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descrição do Pagamento</p>
                                    <p className="text-sm text-slate-700 font-medium">{(p.description || 'Aluguel Mensal').replace(/^Restante:\s*Restante:\s*/, 'Restante: ')}</p>
                                  </div>
                                  {p.observations && (
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observações</p>
                                      <p className="text-sm text-slate-600 italic">{p.observations}</p>
                                    </div>
                                  )}
                                  {p.paidDate && (
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data de Recebimento</p>
                                      <p className="text-sm text-emerald-600 font-bold">{format(parseISO(p.paidDate), 'dd/MM/yyyy')}</p>
                                    </div>
                                  )}
                                  {p.interestAmount && p.interestAmount > 0 && (
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Juros/Multa Aplicados</p>
                                      <p className="text-sm text-red-600 font-bold">R$ {p.interestAmount.toLocaleString()}</p>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col justify-end gap-3">
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="flex-1 h-10 gap-2"
                                      onClick={() => {
                                        setSelectedPayment(p);
                                        setIsPaymentDetailModalOpen(true);
                                      }}
                                    >
                                      <Search className="w-4 h-4" /> Detalhes Completos
                                    </Button>
                                    
                                    {(p.status === 'paid' || p.status === 'partial') && (
                                      <Button 
                                        variant="outline"
                                        className="flex-1 h-10 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl flex items-center justify-center text-sm font-medium transition-colors"
                                        onClick={() => {
                                          setRevertingPayment(p);
                                          setIsRevertModalOpen(true);
                                        }}
                                      >
                                        <RotateCcw className="w-4 h-4" /> Reverter
                                      </Button>
                                    )}

                                    {(p.status === 'paid' || p.status === 'partial') && p.receiptUrl && (
                                      <div className="flex flex-col gap-2 flex-1">
                                        {p.thumbnailLink ? (
                                          <div className="relative group overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                            <img 
                                              src={p.thumbnailLink} 
                                              className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform duration-500" 
                                              alt="Recibo"
                                              referrerPolicy="no-referrer"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const isImage = p.receiptUrl?.match(/\.(jpeg|jpg|gif|png)$/i) || p.thumbnailLink || p.receiptUrl?.startsWith('data:image');
                                                setPreviewReceipt({ url: p.receiptUrl!, name: p.evidenceName || 'Recibo', isImage: !!isImage });
                                              }}
                                            />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                              <ExternalLink className="w-5 h-5 text-white" />
                                            </div>
                                            {isGoogleDriveLink(p.receiptUrl) && (
                                              <div className="absolute top-2 right-2 bg-white/90 p-1 rounded-lg shadow-sm">
                                                <Cloud className="w-3 h-3 text-emerald-500" />
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="w-full h-24 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center relative">
                                            <ImageIcon className="w-6 h-6 text-slate-300" />
                                            {isGoogleDriveLink(p.receiptUrl) && (
                                              <div className="absolute top-2 right-2 bg-white/90 p-1 rounded-lg shadow-sm">
                                                <Cloud className="w-3 h-3 text-emerald-500" />
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        <Button 
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const isImage = p.receiptUrl?.match(/\.(jpeg|jpg|gif|png)$/i) || p.thumbnailLink || p.receiptUrl?.startsWith('data:image');
                                            setPreviewReceipt({ url: p.receiptUrl!, name: p.evidenceName || 'Recibo', isImage: !!isImage });
                                          }}
                                          className="h-10 gap-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl flex items-center justify-center text-sm font-medium transition-colors"
                                        >
                                          <ImageIcon className="w-4 h-4" /> Ver Recibo
                                          {isGoogleDriveLink(p.receiptUrl) && <Cloud className="w-3 h-3 ml-1 opacity-50" />}
                                        </Button>
                                      </div>
                                    )}

                                    {(p.status === 'paid' || p.status === 'partial') && p.evidenceLocation && (
                                      <div className="flex-1 h-10 gap-2 border border-slate-200 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-600 font-medium px-3 truncate">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        {p.evidenceLocation.startsWith('http') ? (
                                          <a 
                                            href={p.evidenceLocation} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            onClick={(e) => e.stopPropagation()}
                                            className="hover:underline truncate"
                                          >
                                            Link Externo
                                          </a>
                                        ) : (
                                          <span className="truncate">{p.evidenceLocation}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {p.status !== 'paid' && p.status !== 'cancelled' && p.status !== 'partial' && (
                                    <Button 
                                      className="w-full h-10 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-md font-bold"
                                      onClick={() => onConfirmPayment(p.id)}
                                    >
                                      <CheckCircle2 className="w-4 h-4" /> Confirmar Recebimento
                                    </Button>
                                  )}

                                  {p.status === 'cancelled' && (
                                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center">
                                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pagamento Cancelado</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                } else {
                  // Agreement Group
                  const group = item;
                  const isExpanded = expandedPaymentId === group.id;
                  const firstPayment = group.payments[0];
                  const prop = properties.find(pr => pr.id === firstPayment.propertyId);
                  const tenant = tenants.find(t => t.id === firstPayment.tenantId);

                  return (
                    <div 
                      key={group.id} 
                      className={cn(
                        "group border rounded-2xl transition-all duration-300 overflow-hidden",
                        isExpanded ? "ring-2 ring-blue-500/20 border-blue-500/30 bg-blue-50/30 shadow-sm" : "hover:border-blue-300 hover:bg-blue-50/10"
                      )}
                    >
                      {/* Header / Bar */}
                      <div 
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                        onClick={() => setExpandedPaymentId(isExpanded ? null : group.id)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            (group.status === 'paid' || group.status === 'partial') ? "bg-emerald-100 text-emerald-600" :
                            group.status === 'late' ? "bg-red-100 text-red-600" :
                            "bg-blue-100 text-blue-600"
                          )}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-bold text-slate-900 truncate">{prop?.name}</h3>
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[9px] font-bold text-blue-600 uppercase tracking-tight shrink-0">
                                Acordo • {group.paidCount}/{group.totalCount} Pagas
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <UserIcon className="w-3 h-3" /> {tenant?.name} 
                              <span className="mx-1 text-slate-300">•</span>
                              <span className="truncate italic">{group.agreement?.description || 'Acordo de Débito'}</span>
                            </p>
                            {group.agreement?.evidence && (
                              <a 
                                href={group.agreement.evidence} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tight"
                                onClick={e => e.stopPropagation()}
                              >
                                <ImageIcon className="w-2.5 h-2.5" /> Ver Evidência do Acordo
                              </a>
                            )}
                            {group.agreement?.evidenceLocation && (
                              <div className="inline-flex items-center gap-1 mt-1 ml-2 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                <MapPin className="w-2.5 h-2.5" />
                                {group.agreement.evidenceLocation.startsWith('http') ? (
                                  <a 
                                    href={group.agreement.evidenceLocation} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    onClick={(e) => e.stopPropagation()}
                                    className="hover:underline"
                                  >
                                    Link Externo
                                  </a>
                                ) : (
                                  <span>{group.agreement.evidenceLocation}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Próximo Venc.</p>
                            <p className="text-sm font-medium text-slate-700">{format(item.date, 'dd/MM/yyyy')}</p>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Acordo</p>
                            <p className="text-sm font-bold text-slate-900">R$ {group.agreement?.totalAmount.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300",
                              isExpanded ? "rotate-180 bg-blue-500/10 text-blue-500" : "text-slate-400 group-hover:bg-slate-200"
                            )}>
                              <ChevronRight className="w-4 h-4 rotate-90" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content - List of Installments */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <div className="px-4 pb-4 pt-2 border-t border-blue-100 bg-blue-50/20">
                              <div className="space-y-2 mt-2">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider ml-1 mb-2">Parcelas do Acordo</p>
                                {group.payments.map((p: Payment) => (
                                  <div 
                                    key={p.id} 
                                    className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between hover:border-blue-200 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                        p.status === 'paid' || p.status === 'partial' ? "bg-emerald-50 text-emerald-500" :
                                        p.status === 'late' ? "bg-red-50 text-red-500" :
                                        "bg-slate-50 text-slate-400"
                                      )}>
                                        {p.status === 'paid' || p.status === 'partial' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs font-bold text-slate-700">{p.description}</p>
                                          {p.revertReason && (
                                            <button 
                                              title={`Revertido: ${p.revertReason}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toast.info(`Justificativa da Reversão: ${p.revertReason}`, {
                                                  duration: 5000,
                                                });
                                              }}
                                              className="text-amber-500 hover:text-amber-600 transition-colors"
                                            >
                                              <AlertCircle className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-500">Vencimento: {format(parseISO(p.dueDate), 'dd/MM/yyyy')}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                      <p className="text-sm font-bold text-slate-900">R$ {p.amount.toLocaleString()}</p>
                                      <div className="flex gap-1">
                                        {p.status !== 'paid' && p.status !== 'cancelled' && p.status !== 'partial' ? (
                                          <Button 
                                            size="sm" 
                                            className="h-8 px-3 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm font-bold"
                                            onClick={() => onConfirmPayment(p.id)}
                                          >
                                            Confirmar
                                          </Button>
                                        ) : (
                                          <div className="flex gap-1 items-center">
                                            {(p.status === 'paid' || p.status === 'partial') && (
                                              <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="h-8 px-3 text-[10px] border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                                                onClick={() => {
                                                  setRevertingPayment(p);
                                                  setIsRevertModalOpen(true);
                                                }}
                                              >
                                                Reverter
                                              </Button>
                                            )}
                                            {(p.status === 'paid' || p.status === 'partial') && p.receiptUrl ? (
                                              <a 
                                                href={p.receiptUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="h-8 px-3 rounded-lg border border-emerald-100 text-emerald-600 hover:bg-emerald-50 flex items-center text-[10px] font-bold"
                                              >
                                                Recibo
                                              </a>
                                            ) : null}
                                            {p.status === 'paid' && p.evidenceLocation && (
                                              <div className="h-8 px-2 rounded-lg border border-slate-100 bg-slate-50 flex items-center gap-1 text-[9px] font-bold text-slate-500 max-w-[100px] truncate">
                                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                {p.evidenceLocation.startsWith('http') ? (
                                                  <a 
                                                    href={p.evidenceLocation} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="hover:underline truncate"
                                                  >
                                                    Link
                                                  </a>
                                                ) : (
                                                  <span className="truncate">{p.evidenceLocation}</span>
                                                )}
                                              </div>
                                            )}
                                            {p.status !== 'paid' && (
                                              <span className="text-[10px] font-bold text-slate-400 uppercase px-2">
                                                {p.status === 'cancelled' ? 'Cancelado' : ''}
                                              </span>
                                            )}
                                            {(p.status === 'paid' || p.status === 'partial') && !p.receiptUrl && !p.evidenceLocation && (
                                              <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Pago</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }
              })}

              {payments.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Receipt className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium">Nenhum pagamento registrado.</p>
                  <p className="text-xs text-slate-400">Clique em "Receber" para adicionar um novo pagamento.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-6">Acordos Ativos</h2>
            <div className="space-y-8">
              {properties.filter(p => agreements.some(a => a.propertyId === p.id && a.status === 'active')).map(prop => (
                <div key={prop.id} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Home className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{prop.name}</h3>
                  </div>
                  <div className="space-y-4">
                    {agreements.filter(a => a.propertyId === prop.id && a.status === 'active').map(a => {
                      const tenant = tenants.find(t => t.id === a.tenantId);
                      const paidInstallments = payments.filter(p => p.agreementId === a.id && (p.status === 'paid' || p.status === 'partial')).length;
                      
                      return (
                        <div key={a.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                {a.description}
                                {(a.evidence || a.evidenceLocation) && <Paperclip className="w-3 h-3 text-slate-400" />}
                              </h3>
                              <p className="text-xs text-slate-500">{tenant?.name}</p>
                              {(a.evidence || a.evidenceLocation) && (
                                <div className="flex items-center gap-3 mt-1">
                                  {a.thumbnailLink && (
                                    <img 
                                      src={a.thumbnailLink} 
                                      className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-sm cursor-pointer hover:scale-110 transition-transform" 
                                      alt="Preview"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const isImage = a.evidenceLocation?.match(/\.(jpeg|jpg|gif|png)$/i) || a.thumbnailLink;
                                        setPreviewReceipt({ url: a.evidenceLocation!, name: `Evidência - ${a.description}`, isImage: !!isImage });
                                      }}
                                    />
                                  )}
                                  {a.evidence && (
                                    <a href={a.evidence} target="_blank" rel="noreferrer" className="text-[10px] text-primary flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3" /> Ver Anexo
                                    </a>
                                  )}
                                  {a.evidenceLocation && (
                                    a.evidenceLocation.startsWith('http') ? (
                                      <a href={a.evidenceLocation} target="_blank" rel="noreferrer" className="text-[10px] text-primary flex items-center gap-1 hover:underline">
                                        <MapPin className="w-3 h-3" /> Link Externo
                                      </a>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {a.evidenceLocation}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px]"
                                onClick={() => {
                                  setArchivingAgreement(a);
                                  setIsArchiveAgreementModalOpen(true);
                                }}
                              >
                                Arquivar / Excluir
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                              <p className="text-sm font-bold text-slate-900">R$ {a.totalAmount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Parcela</p>
                              <p className="text-sm font-bold text-emerald-600">R$ {a.installmentAmount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Progresso</p>
                              <p className="text-sm font-bold text-slate-900">{paidInstallments} de {a.durationMonths}</p>
                            </div>
                          </div>

                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-500" 
                              style={{ width: `${(paidInstallments / a.durationMonths) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {agreements.filter(a => a.status === 'active').length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm italic">Nenhum acordo ativo no momento.</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Despesas Recentes</h2>
            <div className="flex gap-2">
              <select 
                className="text-[10px] h-7 px-1 bg-slate-50 border border-slate-200 rounded font-bold text-slate-500 outline-none focus:ring-1 focus:ring-primary/20"
                value={filterExpensePropertyId}
                onChange={e => setFilterExpensePropertyId(e.target.value)}
              >
                <option value="">Todas</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-[10px] h-7 px-2 uppercase font-bold tracking-wider"
                onClick={() => setIsAllExpensesModalOpen(true)}
              >
                Ver Tudo
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            {expenses
              .filter(e => !filterExpensePropertyId || e.propertyId === filterExpensePropertyId)
              .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
              .slice(0, 10)
              .map(e => {
              const prop = properties.find(pr => pr.id === e.propertyId);
              return (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border bg-accent/20 hover:bg-accent/30 transition-colors cursor-pointer group" onClick={() => {
                  setSelectedExpense(e);
                  setIsExpenseDetailModalOpen(true);
                }}>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold">
                      {e.type === 'repair' ? 'Manutenção' : 
                       e.type === 'renovation' ? 'Reforma' : 
                       e.type === 'tax' ? 'Imposto' : 
                       e.type === 'fine' ? 'Multa' : 'Outro'}
                    </p>
                    <p className="font-medium group-hover:text-primary transition-colors flex items-center gap-2">
                      {e.description}
                      {(e.evidence || e.evidenceLocation) && <Paperclip className="w-3 h-3 text-slate-400" />}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{prop?.name} • {format(parseISO(e.date), 'dd/MM/yyyy')}</p>
                    {(e.evidence || e.evidenceLocation) && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {e.evidence && (
                          <a href={e.evidence} target="_blank" rel="noreferrer" className="text-[10px] text-primary flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <ImageIcon className="w-3 h-3" /> Ver Anexo
                          </a>
                        )}
                        {e.evidenceLocation && (
                          e.evidenceLocation.startsWith('http') ? (
                            <a href={e.evidenceLocation} target="_blank" rel="noreferrer" className="text-[10px] text-primary flex items-center gap-1 hover:underline" onClick={e => e.stopPropagation()}>
                              <MapPin className="w-3 h-3" /> Link Externo
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {e.evidenceLocation}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-destructive">- R$ {e.amount.toLocaleString()}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-none bg-transparent"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setExpenseToDelete(e);
                        setIsDeleteExpenseModalOpen(true);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Modal isOpen={isPaymentDetailModalOpen} onClose={() => setIsPaymentDetailModalOpen(false)} title="Detalhes do Pagamento">
        {selectedPayment && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <p className={cn(
                  "text-sm font-bold",
                  (selectedPayment.status === 'paid' || selectedPayment.status === 'partial') ? "text-emerald-600" :
                  selectedPayment.status === 'late' ? "text-destructive" :
                  selectedPayment.status === 'cancelled' ? "text-slate-500" :
                  "text-amber-600"
                )}>
                  {selectedPayment.status === 'paid' ? 'Pago' : selectedPayment.status === 'partial' ? 'Parcial' : selectedPayment.status === 'late' ? 'Atrasado' : selectedPayment.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valor</p>
                <p className="text-sm font-bold text-slate-900">R$ {selectedPayment.amount.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">{properties.find(p => p.id === selectedPayment.propertyId)?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">{tenants.find(t => t.id === selectedPayment.tenantId)?.name}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Vencimento</p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <p className="text-sm">{format(parseISO(selectedPayment.dueDate), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Data de Pagamento</p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    <p className="text-sm">{selectedPayment.paidDate ? format(parseISO(selectedPayment.paidDate), 'dd/MM/yyyy') : 'Pendente'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Descrição / Tipo</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm font-medium uppercase text-slate-500 text-[10px] mb-1">{selectedPayment.type}</p>
                  <p className="text-sm text-slate-700">{selectedPayment.description}</p>
                </div>
              </div>

              {selectedPayment.evidenceLocation && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Localização do Comprovante</p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {selectedPayment.evidenceLocation.startsWith('http') ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const isImage = selectedPayment.evidenceLocation?.match(/\.(jpeg|jpg|gif|png)$/i) || selectedPayment.thumbnailLink;
                          setPreviewReceipt({ url: selectedPayment.evidenceLocation!, name: `Evidência`, isImage: !!isImage });
                        }}
                        className="text-sm text-primary hover:underline break-all text-left"
                      >
                        {selectedPayment.evidenceLocation}
                      </button>
                    ) : (
                      <p className="text-sm">{selectedPayment.evidenceLocation}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedPayment.revertReason && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider ml-1">Justificativa da Reversão</p>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 italic">"{selectedPayment.revertReason}"</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-3">
              {selectedPayment.status !== 'paid' && selectedPayment.status !== 'cancelled' && (
                <Button className="flex-1 py-3" onClick={() => {
                  setIsPaymentDetailModalOpen(false);
                  onConfirmPayment(selectedPayment.id);
                }}>
                  Confirmar Pagamento
                </Button>
              )}
              {selectedPayment.receiptUrl && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Comprovante</p>
                  {selectedPayment.thumbnailLink ? (
                    <div className="relative group overflow-hidden rounded-2xl border border-slate-200">
                      <img 
                        src={selectedPayment.thumbnailLink} 
                        alt="Recibo" 
                        className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                        onClick={() => {
                          const isImage = selectedPayment.receiptUrl?.match(/\.(jpeg|jpg|gif|png)$/i) || selectedPayment.thumbnailLink;
                          if (isImage) {
                            setPreviewReceipt({ url: selectedPayment.receiptUrl!, name: selectedPayment.evidenceName || 'Recibo', isImage: true });
                          } else {
                            window.open(selectedPayment.receiptUrl, '_blank');
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <div className="bg-white/90 text-slate-900 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                          <ExternalLink className="w-3 h-3" /> Abrir no Drive
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">Comprovante de Pagamento</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Arquivo Anexado</p>
                        </div>
                      </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-9 gap-2"
                            onClick={() => {
                              const isImage = selectedPayment.receiptUrl?.match(/\.(jpeg|jpg|gif|png)$/i) || selectedPayment.thumbnailLink;
                              if (isImage) {
                                setPreviewReceipt({ url: selectedPayment.receiptUrl!, name: selectedPayment.evidenceName || 'Recibo', isImage: true });
                              } else {
                                window.open(selectedPayment.receiptUrl, '_blank');
                              }
                            }}
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Abrir
                          </Button>
                          {selectedPayment.evidenceLocation === 'Google Drive' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 px-3 gap-2"
                            onClick={() => {
                              // Force download by using webContentLink if we had it, 
                              // but we only stored webViewLink in receiptUrl.
                              // We can try to append &export=download to webViewLink or just open it.
                              window.open(selectedPayment.receiptUrl?.replace('/view', '/view?usp=sharing'), '_blank');
                            }}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Button variant="outline" className="py-3" onClick={() => setIsPaymentDetailModalOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isExpenseDetailModalOpen} onClose={() => setIsExpenseDetailModalOpen(false)} title="Detalhes da Despesa">
        {selectedExpense && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo</p>
                <p className="text-sm font-bold text-slate-900 uppercase">{selectedExpense.type}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valor</p>
                <p className="text-sm font-bold text-destructive">R$ {selectedExpense.amount.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Imóvel</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <Home className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-medium">{properties.find(p => p.id === selectedExpense.propertyId)?.name}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Data</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <p className="text-sm">{format(parseISO(selectedExpense.date), 'dd/MM/yyyy')}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Descrição</p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedExpense.description}</p>
                </div>
              </div>

              {selectedExpense.evidenceLocation && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Localização do Comprovante</p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {selectedExpense.evidenceLocation.startsWith('http') ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const isImage = selectedExpense.evidenceLocation?.match(/\.(jpeg|jpg|gif|png)$/i) || selectedExpense.thumbnailLink;
                          setPreviewReceipt({ url: selectedExpense.evidenceLocation!, name: `Evidência - ${selectedExpense.description}`, isImage: !!isImage });
                        }}
                        className="text-sm text-primary hover:underline break-all text-left"
                      >
                        {selectedExpense.evidenceLocation}
                      </button>
                    ) : (
                      <p className="text-sm">{selectedExpense.evidenceLocation}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-3">
              {selectedExpense.evidence && (
                <a href={selectedExpense.evidence} target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full py-3">
                    <ImageIcon className="w-4 h-4 mr-2" /> Ver Comprovante
                  </Button>
                </a>
              )}
              <Button variant="outline" className="flex-1 py-3" onClick={() => setIsExpenseDetailModalOpen(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Nova Despesa">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <Select 
            label="Imóvel" 
            id="prop" 
            value={expenseForm.propertyId} 
            onChange={e => setExpenseForm({...expenseForm, propertyId: e.target.value})} 
            options={[
              { label: 'Selecione um imóvel', value: '' },
              ...properties.map(p => ({ label: p.name, value: p.id }))
            ]}
            required
          />
          <Input label="Descrição" id="desc" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <CurrencyInput 
              label="Valor" 
              id="val" 
              value={expenseForm.amount} 
              onChange={val => setExpenseForm({...expenseForm, amount: val})} 
              required 
            />
            <Input label="Data" id="date" type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} required />
          </div>
          <Select 
            label="Tipo" 
            id="type" 
            value={expenseForm.type} 
            onChange={e => setExpenseForm({...expenseForm, type: e.target.value as ExpenseType})} 
            options={[
              { label: 'Reforma', value: 'renovation' },
              { label: 'Reparo', value: 'repair' },
              { label: 'Imposto', value: 'tax' },
              { label: 'Multa', value: 'fine' },
              { label: 'Outro', value: 'other' }
            ]}
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">Anexar Evidência (Foto/PDF)</label>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                id="expense-evidence"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      const base64 = reader.result as string;
                      if (isDriveConnected) {
                        const tenantName = tenants.find(t => t.propertyId === expenseForm.propertyId)?.name || 'Geral';
                        toast.promise(
                          uploadToDrive(file.name, base64, file.type, tenantName),
                          {
                            loading: 'Enviando evidência para o Google Drive...',
                            success: (data) => {
                              setExpenseForm({
                                ...expenseForm, 
                                evidence: data.webViewLink,
                                evidenceName: file.name,
                                thumbnailLink: data.thumbnailLink
                              });
                              return 'Evidência salva no Google Drive!';
                            },
                            error: 'Erro ao enviar para o Google Drive.'
                          }
                        );
                      } else {
                        setExpenseForm({
                          ...expenseForm, 
                          evidence: base64,
                          evidenceName: file.name,
                          thumbnailLink: ''
                        });
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }} 
              />
              <button
                type="button"
                onClick={() => document.getElementById('expense-evidence')?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl border border-slate-200 transition-colors text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Escolher Arquivo
              </button>
              {expenseForm.evidence && (
                <button
                  type="button"
                  onClick={() => setExpenseForm({...expenseForm, evidence: '', evidenceName: ''})}
                  className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors border border-transparent hover:border-rose-100"
                  title="Remover anexo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {expenseForm.evidence && (
              <div className="mt-2 p-2 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                {expenseForm.evidence.startsWith('data:image') ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <img src={expenseForm.evidence} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{expenseForm.evidenceName || 'Arquivo anexado'}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Pronto para salvar</p>
                </div>
              </div>
            )}
          </div>
          <Input 
            label="Localização do Comprovante (Opcional)" 
            id="evidence-location" 
            placeholder="Ex: Pasta Física 2024, Google Drive, etc."
            value={expenseForm.evidenceLocation} 
            onChange={e => setExpenseForm({...expenseForm, evidenceLocation: e.target.value})} 
          />
          <div className="pt-4 flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Despesa'}
            </Button>
            <Button variant="outline" onClick={() => setIsExpenseModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
          </div>
        </form>
      </Modal>
      
      <Modal isOpen={isAllExpensesModalOpen} onClose={() => setIsAllExpensesModalOpen(false)} title="Todas as Despesas">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar despesas (descrição)..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={expenseSearchQuery}
                onChange={e => setExpenseSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select 
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={filterExpensePropertyId}
                onChange={e => setFilterExpensePropertyId(e.target.value)}
              >
                <option value="">Todos os Imóveis</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select 
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={filterExpenseType}
                onChange={e => setFilterExpenseType(e.target.value)}
              >
                <option value="all">Todos os Tipos</option>
                <option value="repair">Manutenção</option>
                <option value="renovation">Reforma</option>
                <option value="tax">Imposto</option>
                <option value="fine">Multa</option>
                <option value="other">Outros</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {expenses
              .filter(e => {
                const matchesProperty = !filterExpensePropertyId || e.propertyId === filterExpensePropertyId;
                const matchesType = filterExpenseType === 'all' || e.type === filterExpenseType;
                const typeLabel = e.type === 'repair' ? 'manutenção' : 
                                 e.type === 'renovation' ? 'reforma' : 
                                 e.type === 'tax' ? 'imposto' : 
                                 e.type === 'fine' ? 'multa' : 'outro';
                const matchesSearch = !expenseSearchQuery || 
                                     e.description.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
                                     typeLabel.includes(expenseSearchQuery.toLowerCase());
                return matchesProperty && matchesType && matchesSearch;
              })
              .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
              .map(e => {
                const prop = properties.find(pr => pr.id === e.propertyId);
                return (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group" onClick={() => {
                    setSelectedExpense(e);
                    setIsExpenseDetailModalOpen(true);
                  }}>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        {e.type === 'repair' ? 'Manutenção' : 
                         e.type === 'renovation' ? 'Reforma' : 
                         e.type === 'tax' ? 'Imposto' : 
                         e.type === 'fine' ? 'Multa' : 'Outro'}
                      </p>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {e.description}
                        {(e.evidence || e.evidenceLocation) && <Paperclip className="w-3 h-3 text-slate-400" />}
                        {e.thumbnailLink && (
                          <img 
                            src={e.thumbnailLink} 
                            className="w-6 h-6 rounded object-cover border border-slate-200" 
                            alt="Preview" 
                          />
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500">{prop?.name} • {format(parseISO(e.date), 'dd/MM/yyyy')}</p>
                      {e.evidenceLocation && (
                        e.evidenceLocation.startsWith('http') ? (
                          <a href={e.evidenceLocation} target="_blank" rel="noreferrer" className="text-[9px] text-primary mt-0.5 flex items-center gap-1 hover:underline" onClick={e => e.stopPropagation()}>
                            <MapPin className="w-2.5 h-2.5" /> Link Externo
                          </a>
                        ) : (
                          <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> {e.evidenceLocation}
                          </p>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-rose-600">- R$ {e.amount.toLocaleString()}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-none bg-transparent"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setExpenseToDelete(e);
                          setIsDeleteExpenseModalOpen(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            {expenses.filter(e => {
              const matchesProperty = !filterExpensePropertyId || e.propertyId === filterExpensePropertyId;
              const matchesType = filterExpenseType === 'all' || e.type === filterExpenseType;
              const typeLabel = e.type === 'repair' ? 'manutenção' : 
                               e.type === 'renovation' ? 'reforma' : 
                               e.type === 'tax' ? 'imposto' : 
                               e.type === 'fine' ? 'multa' : 'outro';
              const matchesSearch = !expenseSearchQuery || 
                                   e.description.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
                                   typeLabel.includes(expenseSearchQuery.toLowerCase());
              return matchesProperty && matchesType && matchesSearch;
            }).length === 0 && (
              <p className="text-center py-8 text-slate-400 italic">Nenhuma despesa encontrada com estes filtros.</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isNewPaymentModalOpen} onClose={() => setIsNewPaymentModalOpen(false)} title="Novo Recebimento">
        <form onSubmit={handleAddPayment} className="space-y-4">
          <Select 
            label="Inquilino" 
            id="tenant" 
            value={paymentForm.tenantId} 
            onChange={e => {
              const tId = e.target.value;
              const tenant = tenants.find(t => t.id === tId);
              const property = properties.find(p => p.id === tenant?.propertyId);
              setPaymentForm({
                ...paymentForm, 
                tenantId: tId,
                propertyId: tenant?.propertyId || '',
                amount: property?.rentValue || 0
              });
            }} 
            options={[
              { label: 'Selecione um inquilino', value: '' },
              ...tenants.filter(t => t.status === 'allocated').map(t => ({ label: t.name, value: t.id }))
            ]}
            required
          />
          <Input label="Descrição" id="pdesc" value={paymentForm.description} onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} required />
          <CurrencyInput 
            label="Valor" 
            id="pamt" 
            value={paymentForm.amount} 
            onChange={val => setPaymentForm({...paymentForm, amount: val})} 
            required 
          />
          <Input label="Data de Vencimento" id="pdate" type="date" value={paymentForm.dueDate} onChange={e => setPaymentForm({...paymentForm, dueDate: e.target.value})} required />
          <Select 
            label="Tipo" 
            id="ptype" 
            value={paymentForm.type} 
            onChange={e => setPaymentForm({...paymentForm, type: e.target.value as any})} 
            options={[
              { label: 'Aluguel', value: 'rent' },
              { label: 'Caução', value: 'deposit' },
              { label: 'Acordo/Extra', value: 'agreement' }
            ]}
          />
          
          <div className="pt-4 flex gap-3">
            <Button type="submit" className="flex-1 py-3" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Recebimento'}
            </Button>
            <Button variant="outline" onClick={() => setIsNewPaymentModalOpen(false)} className="py-3" disabled={isSubmitting}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteExpenseModalOpen} onClose={() => setIsDeleteExpenseModalOpen(false)} title="Excluir Despesa">
        <div className="space-y-6">
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4">
            <div className="p-2 bg-red-500 text-white rounded-xl">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-900">Confirmar Exclusão</p>
              <p className="text-xs text-red-700">Esta ação não pode ser desfeita.</p>
            </div>
          </div>

          {expenseToDelete && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Despesa selecionada</p>
              <p className="text-sm font-bold text-slate-900">{expenseToDelete.description}</p>
              <p className="text-xs text-slate-500">Valor: R$ {expenseToDelete.amount.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Data: {format(parseISO(expenseToDelete.date), 'dd/MM/yyyy')}</p>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <Button 
              variant="danger" 
              className="flex-1 py-3" 
              disabled={isSubmitting}
              onClick={async () => {
                if (expenseToDelete) {
                  await deleteExpense(expenseToDelete.id!);
                  setIsDeleteExpenseModalOpen(false);
                  setExpenseToDelete(null);
                }
              }}
            >
              {isSubmitting ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 py-3" 
              disabled={isSubmitting}
              onClick={() => setIsDeleteExpenseModalOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

interface ReceivablesViewProps {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  agreements: Agreement[];
  setConfirmingPayment: (p: any) => void;
  setIsPaymentModalOpen: (open: boolean) => void;
  onOpenTenantDetail: (t: Tenant) => void;
  highlightedPaymentId: string | null;
  setHighlightedPaymentId: (id: string | null) => void;
  isDriveConnected: boolean;
  uploadToDrive: (fileName: string, fileData: string, mimeType: string, folderName?: string) => Promise<any>;
}

const ReceivablesView = ({ 
  properties, 
  tenants, 
  payments, 
  agreements, 
  setConfirmingPayment, 
  setIsPaymentModalOpen,
  onOpenTenantDetail,
  highlightedPaymentId,
  setHighlightedPaymentId,
  isDriveConnected,
  uploadToDrive
}: ReceivablesViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'rent' | 'agreement'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'late'>('all');
  const [activeTab, setActiveTab] = useState<'pending' | 'receipts'>('pending');

  const [receiptModalPayment, setReceiptModalPayment] = useState<Payment | null>(null);
  const [receiptType, setReceiptType] = useState<'simple' | 'detailed'>('simple');

  useEffect(() => {
    if (highlightedPaymentId) {
      // Clear filters to ensure the item is visible
      setSearchQuery('');
      setFilterType('all');
      setFilterStatus('all');

      // Small delay to ensure the list is rendered and filtered
      const timer = setTimeout(() => {
        const element = document.getElementById(`payment-${highlightedPaymentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      // Clear highlight after 4 seconds
      const clearTimer = setTimeout(() => {
        setHighlightedPaymentId(null);
      }, 4000);

      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [highlightedPaymentId, setHighlightedPaymentId]);

  const pendingPayments = useMemo(() => {
    return payments
      .filter(p => p.status === 'pending' || p.status === 'late')
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return pendingPayments.filter(p => {
      const tenant = tenants.find(t => t.id === p.tenantId);
      const property = properties.find(pr => pr.id === p.propertyId);
      const matchesSearch = !searchQuery || 
        tenant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || 
        (filterType === 'rent' && (!p.type || p.type === 'rent')) ||
        (filterType === 'agreement' && p.type === 'agreement');
        
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [pendingPayments, tenants, properties, searchQuery, filterType, filterStatus]);

  const paidPayments = useMemo(() => {
    return payments
      .filter(p => p.status === 'paid')
      .sort((a, b) => {
         const dateA = a.paidDate ? parseISO(a.paidDate).getTime() : parseISO(a.dueDate).getTime();
         const dateB = b.paidDate ? parseISO(b.paidDate).getTime() : parseISO(b.dueDate).getTime();
         return dateB - dateA;
      });
  }, [payments]);

  const filteredPaidPayments = useMemo(() => {
    return paidPayments.filter(p => {
      const tenant = tenants.find(t => t.id === p.tenantId);
      const property = properties.find(pr => pr.id === p.propertyId);
      return !searchQuery || 
        tenant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [paidPayments, tenants, properties, searchQuery]);

  const stats = useMemo(() => {
    const today = new Date();
    const rentAndAgreements = pendingPayments.filter(p => p.type !== 'deposit');
    const late = rentAndAgreements.filter(p => p.status === 'late');
    const todayPending = rentAndAgreements.filter(p => format(parseISO(p.dueDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
    
    return {
      total: rentAndAgreements.reduce((acc, p) => acc + p.amount, 0),
      count: rentAndAgreements.length,
      lateTotal: late.reduce((acc, p) => acc + p.amount, 0),
      lateCount: late.length,
      todayTotal: todayPending.reduce((acc, p) => acc + p.amount, 0),
      todayCount: todayPending.length
    };
  }, [pendingPayments]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Central de Recebimentos</h1>
        <p className="text-muted-foreground">Confirme pagamentos de aluguéis e acordos em um só lugar.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Pendente</p>
              <p className="text-2xl font-bold text-emerald-900">R$ {stats.total.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-600 font-medium">{stats.count} recebimentos aguardando</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-rose-50 border-rose-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Atrasado</p>
              <p className="text-2xl font-bold text-rose-900">R$ {stats.lateTotal.toLocaleString()}</p>
              <p className="text-[10px] text-rose-600 font-medium">{stats.lateCount} pagamentos em atraso</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-amber-50 border-amber-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Vencendo Hoje</p>
              <p className="text-2xl font-bold text-amber-900">R$ {stats.todayTotal.toLocaleString()}</p>
              <p className="text-[10px] text-amber-600 font-medium">{stats.todayCount} para hoje</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 border-b mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={cn("pb-3 font-semibold text-sm border-b-2 transition-colors", activeTab === 'pending' ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700")}
        >
          A Receber ({pendingPayments.length})
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={cn("pb-3 font-semibold text-sm border-b-2 transition-colors", activeTab === 'receipts' ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700")}
        >
          Histórico e Recibos
        </button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por inquilino, imóvel ou descrição..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === 'pending' && <div className="flex gap-2">
            <select 
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
            >
              <option value="all">Todos os Tipos</option>
              <option value="rent">Aluguéis</option>
              <option value="deposit">Caução (Garantia)</option>
              <option value="agreement">Acordos</option>
            </select>
            <select 
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="late">Atrasados</option>
            </select>
          </div>}
        </div>

        {activeTab === 'pending' && <div className="space-y-4">
          {filteredPayments.length > 0 ? (
            filteredPayments.map(p => {
                const tenant = tenants.find(t => t.id === p.tenantId);
                const property = properties.find(pr => pr.id === p.propertyId);
                const isLate = p.status === 'late';
                
                return (
                  <div 
                    id={`payment-${p.id}`}
                    key={p.id} 
                    className={cn(
                      "p-4 rounded-2xl border transition-all hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                      isLate ? "bg-rose-50/30 border-rose-100" : "bg-white border-slate-100",
                      highlightedPaymentId === p.id && "ring-4 ring-primary ring-offset-2 scale-[1.02] shadow-xl z-10 bg-primary/5 border-primary"
                    )}
                  >
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center min-w-0">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                            p.type === 'agreement' ? "bg-blue-100 text-blue-600" : 
                            p.type === 'deposit' ? "bg-amber-100 text-amber-600" : 
                            "bg-indigo-100 text-indigo-600"
                          )}>
                            {p.type === 'agreement' ? <FileText className="w-6 h-6" /> : 
                             p.type === 'deposit' ? <ShieldCheck className="w-6 h-6" /> : 
                             <Home className="w-6 h-6" />}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center flex-wrap gap-2 mb-0.5">
                            <h3 className="font-bold text-slate-900">{property?.name}</h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              p.type === 'agreement' ? "bg-blue-100 text-blue-700" : 
                              p.type === 'deposit' ? "bg-amber-100 text-amber-700 border border-amber-200" : 
                              "bg-indigo-100 text-indigo-700"
                            )}>
                              {p.type === 'agreement' ? 'Acordo' : p.type === 'deposit' ? 'Caução (Garantia)' : 'Aluguel'}
                            </span>
                            {isLate && (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
                              Atrasado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <button 
                            onClick={() => tenant && onOpenTenantDetail(tenant)}
                            className="flex items-center gap-1 hover:text-primary transition-colors font-medium"
                          >
                            <UserIcon className="w-3 h-3" /> {tenant?.name}
                          </button>
                          <span className="text-slate-300">|</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Vence em {format(parseISO(p.dueDate), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        {p.description && (
                          <p className="text-[10px] text-slate-400 mt-1 italic">{p.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-none pt-3 sm:pt-0">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor a Receber</p>
                        <p className="text-lg font-bold text-slate-900">R$ {p.amount.toLocaleString()}</p>
                      </div>
                      <Button 
                        className="bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-lg shadow-emerald-200/50 font-bold px-6"
                        onClick={() => {
                          setConfirmingPayment(p);
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Tudo em dia!</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">Nenhum recebimento pendente encontrado para os filtros selecionados.</p>
              </div>
            )}
          </div>}

          {activeTab === 'receipts' && <div className="space-y-4">
            {filteredPaidPayments.length > 0 ? (
              filteredPaidPayments.map(p => {
                const tenant = tenants.find(t => t.id === p.tenantId);
                const property = properties.find(pr => pr.id === p.propertyId);
                
                return (
                  <div 
                    key={p.id} 
                    className="p-4 rounded-2xl border bg-slate-50/50 border-slate-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 opacity-75">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-200 text-slate-500">
                        {p.type === 'agreement' ? <FileText className="w-6 h-6" /> : <Home className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-slate-900 line-through decoration-slate-300">{property?.name}</h3>
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                            Recebido
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <UserIcon className="w-3 h-3" /> {tenant?.name}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {p.paidDate ? format(parseISO(p.paidDate), 'dd/MM/yyyy') : 'Pago'}
                          </span>
                        </div>
                        {p.description && (
                          <p className="text-[10px] text-slate-400 mt-1 italic">{p.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-none pt-3 sm:pt-0">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Recebido</p>
                        <p className="text-lg font-bold text-slate-600 line-through decoration-slate-300">R$ {p.amount.toLocaleString()}</p>
                      </div>
                      <Button 
                        variant="outline"
                        className="gap-2 font-bold px-6"
                        onClick={() => setReceiptModalPayment(p)}
                      >
                        <Receipt className="w-4 h-4" /> Gerar Recibo
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Receipt className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Página de Recibos Vazia</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">Nenhum pagamento concluído encontrado.</p>
              </div>
            )}
          </div>}
      </Card>

      {/* Modal de Recibo */}
      <Modal isOpen={!!receiptModalPayment} onClose={() => { setReceiptModalPayment(null); setReceiptType('simple'); }} title="Recibo de Pagamento">
        {receiptModalPayment && (() => {
           const property = properties.find(p => p.id === receiptModalPayment.propertyId);
           const tenant = tenants.find(t => t.id === receiptModalPayment.tenantId);
           const paymentDate = receiptModalPayment.paidDate ? format(parseISO(receiptModalPayment.paidDate), 'dd/MM/yyyy') : '-';
           
           return (
             <div className="space-y-6 print:space-y-4 print:text-black">
               <div className="flex gap-2 print:hidden mb-4 border-b border-slate-100 pb-4">
                 <button 
                   onClick={() => setReceiptType('simple')}
                   className={cn("px-4 py-2 text-sm font-bold rounded-xl transition-all", receiptType === 'simple' ? "bg-emerald-100 text-emerald-700" : "bg-slate-50 text-slate-500 hover:bg-slate-100")}
                 >
                   Recibo Simples
                 </button>
                 <button 
                   onClick={() => setReceiptType('detailed')}
                   className={cn("px-4 py-2 text-sm font-bold rounded-xl transition-all", receiptType === 'detailed' ? "bg-emerald-100 text-emerald-700" : "bg-slate-50 text-slate-500 hover:bg-slate-100")}
                 >
                   Recibo Detalhado
                 </button>
               </div>

               <div className="p-8 bg-white border-2 border-slate-100 rounded-[2rem] shadow-sm print:border-none print:p-0">
                 {receiptType === 'simple' ? (
                   <>
                     <div className="text-center space-y-2 border-b-2 border-dashed border-slate-100 pb-8 print:pb-6 mb-8 print:mb-6">
                       <div className="flex justify-between items-start mb-6">
                         <LogoSVG className="w-12 h-12 print:hidden" />
                         <div className="text-right">
                           <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Recibo de Quitação</h2>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ref: {receiptModalPayment.id?.substring(0, 8).toUpperCase()}</p>
                         </div>
                       </div>
                       <div className="bg-emerald-50 rounded-2xl py-4 px-6 inline-block mb-2">
                         <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Valor Recebido</p>
                         <p className="text-3xl font-black text-emerald-700">R$ {receiptModalPayment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       </div>
                     </div>
                     
                     <div className="space-y-6 text-sm text-slate-700">
                       <div className="space-y-4 leading-relaxed">
                         <p>Recebemos de <strong className="text-slate-900 uppercase">{tenant?.name}</strong>, 
                            inscrito sob o CPF/CNPJ <strong className="text-slate-900">{tenant?.cpf || '___.___.___-__'}</strong>, 
                            a importância de <strong className="text-slate-900">R$ {receiptModalPayment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.</p>
                         
                         <p>Referente a <strong className="text-slate-900 uppercase font-black">{(receiptModalPayment.description || (receiptModalPayment.type === 'rent' ? 'Aluguel Mensal' : 'Acordo Financeiro'))}</strong> 
                            do imóvel localizado em: <strong className="text-slate-900">{property?.name} {property?.address ? `(${property.address})` : ''}</strong>.</p>
                         
                         <p>Damos, por meio deste, plena e total quitação pelo valor acima mencionado.</p>
                       </div>

                       <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                         <div className="space-y-1">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Locador Responsável</p>
                           <p className="font-bold text-slate-800">{auth.currentUser?.displayName || 'Gerente de Imóveis'}</p>
                         </div>
                         <div className="space-y-1 text-right">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Pagamento</p>
                           <p className="font-bold text-slate-800">{paymentDate}</p>
                         </div>
                       </div>

                       {/* Digital Signature Block */}
                       <div className="mt-12 pt-8 border-t-2 border-slate-50 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                             <QrCode className="w-10 h-10 text-slate-300" />
                           </div>
                           <div className="space-y-1">
                             <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Assinatura Digital Ativa</p>
                             <p className="text-[10px] font-mono text-slate-400">HASH: {receiptModalPayment.id?.substring(0, 12).toUpperCase()}-{new Date().getTime().toString().substring(8)}</p>
                           </div>
                         </div>
                         <div className="text-right">
                           <ShieldCheck className="w-8 h-8 text-emerald-500 opacity-20 ml-auto" />
                           <p className="text-[8px] text-slate-400 uppercase font-medium mt-1">Validado pelo Sistema</p>
                         </div>
                       </div>
                     </div>
                   </>
                 ) : (
                   <div className="text-sm text-slate-800 space-y-6">
                     <div className="text-center space-y-1 mb-8 border-b pb-6 print:pb-4">
                       <LogoSVG className="w-16 h-16 mx-auto mb-4 print:hidden" />
                          <h2 className="text-2xl font-black text-indigo-900 tracking-tighter leading-none">RECIBO DETALHADO</h2>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Gestão Profissional de Aluguéis</p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="bg-indigo-900 text-white px-4 py-2 rounded-xl inline-block mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Número do Título</p>
                            <p className="text-lg font-black">{receiptModalPayment.id?.substring(0, 10).toUpperCase()}</p>
                          </div>
                          <p className="text-xs font-bold text-slate-500">Emitido em: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                       <div className="flex justify-between items-center mt-4 text-left">
                         <p className="font-medium"><strong>Nº do Recibo:</strong> {receiptModalPayment.id?.substring(0, 8).toUpperCase() || '________________'}</p>
                         <p className="font-medium flex items-center gap-1"><strong>Data:</strong> <input type="text" defaultValue={paymentDate} className="w-24 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" /></p>
                       </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="space-y-2 bg-slate-50 p-4 rounded-xl print:p-0 print:bg-transparent">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <UserIcon className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">DADOS DO LOCADOR</h4>
                          </div>
                         <div className="flex items-center gap-2">
                           <strong className="shrink-0">Nome:</strong>
                           <input type="text" defaultValue={auth.currentUser?.displayName || ''} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                         </div>
                         <div className="flex items-center gap-2">
                           <strong className="shrink-0">CPF/CNPJ:</strong>
                           <input type="text" className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                         </div>
                       </div>
                     </div>
                       
                     <div className="space-y-2 bg-slate-50 p-4 rounded-xl print:p-0 print:bg-transparent">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <UserIcon className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">DADOS DO LOCATÁRIO</h4>
                          </div>
                         <div className="flex items-center gap-2">
                           <strong className="shrink-0">Nome:</strong> 
                           <input type="text" defaultValue={tenant?.name} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                         </div>
                         <div className="flex items-center gap-2">
                            <strong className="shrink-0">CPF/CNPJ:</strong>
                            <input type="text" defaultValue={tenant?.cpf || ''} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <strong className="shrink-0">Status Atual:</strong>
                            <input type="text" defaultValue={tenant?.status === 'waiting' ? 'Em Espera' : tenant?.status === 'allocated' ? 'Locado' : tenant?.status === 'archived' ? 'Arquivado' : ''} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                          </div>
                        </div>
                      </div>
                    </div>

                     <div className="space-y-2 bg-slate-50 p-4 rounded-xl print:p-0 print:bg-transparent">
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">IMÓVEL</p>
                       <div className="flex items-start gap-2">
                         <strong className="shrink-0">Endereço:</strong> 
                         <input type="text" defaultValue={`${property?.name || ''} ${property?.address ? `- ${property.address}` : ''}`} className="flex-1 w-full bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                       </div>
                     </div>

                     <div className="space-y-4">
                       <p className="font-bold border-b pb-2 uppercase text-slate-500 text-xs tracking-widest">DECLARAÇÃO</p>
                       <p className="leading-relaxed">
                         Declaro, para os devidos fins, que recebi do(a) LOCATÁRIO(a) acima identificado(a) a quantia de:
                       </p>
                       <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                         <p className="text-lg font-bold shrink-0 flex items-center gap-1">R$ <input type="text" defaultValue={(receiptModalPayment.paidAmount || receiptModalPayment.amount).toLocaleString()} className="w-24 bg-transparent text-lg font-bold border-b border-slate-300 outline-none focus:border-emerald-500 print:border-none print:p-0" /></p>
                         <input type="text" placeholder="Ex: Mil e quinhentos reais e cinquenta centavos" className="flex-1 font-normal text-sm text-slate-600 border-b border-dashed border-slate-300 outline-none focus:border-emerald-500 bg-transparent px-1 print:border-none print:p-0" />
                       </div>
                       <p className="leading-relaxed mt-2">
                         Referente ao pagamento de '{receiptModalPayment.description || (receiptModalPayment.type === 'rent' ? 'Aluguel' : 'Acordo')}' do imóvel descrito acima, correspondente ao período com vencimento em:
                       </p>
                       <p className="font-medium"><strong>{format(parseISO(receiptModalPayment.dueDate), 'dd/MM/yyyy')}</strong></p>
                     </div>

                     <div className="space-y-4">
                       <p className="font-bold border-b pb-2 uppercase text-slate-500 text-xs tracking-widest">DETALHAMENTO DO PAGAMENTO</p>
                       <ul className="space-y-2">
                         <li className="flex gap-2 justify-between items-center">
                           <span>Valor do Aluguel:</span> 
                           <span className="flex items-center gap-1 font-medium">R$ <input type="text" defaultValue={receiptModalPayment.amount.toLocaleString()} className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0" /></span>
                         </li>
                         <li className="flex gap-2 justify-between items-center">
                           <span>Multa (se houver):</span> 
                           <span className="flex items-center gap-1 font-medium">R$ <input type="text" defaultValue="0,00" className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0" /></span>
                         </li>
                         <li className="flex gap-2 justify-between items-center">
                           <span>Juros (se houver):</span> 
                           <span className="flex items-center gap-1 font-medium">R$ <input type="text" defaultValue="0,00" className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0" /></span>
                         </li>
                         <li className="flex gap-2 justify-between items-center border-b pb-2">
                           <span>Outros (ex: IPTU):</span> 
                           <span className="flex items-center gap-1 font-medium">R$ <input type="text" defaultValue="0,00" className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0" /></span>
                         </li>
                         <li className="flex gap-2 justify-between items-center font-bold text-base pt-1">
                           <span>Valor Total Pago:</span> 
                            <span className="flex items-center gap-1">R$ <input type="text" defaultValue={(receiptModalPayment.paidAmount || receiptModalPayment.amount).toLocaleString()} className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0" /></span>
                         </li>
                       </ul>
                     </div>

                     {(receiptModalPayment.status === 'partial' || (receiptModalPayment.paidAmount && receiptModalPayment.paidAmount < receiptModalPayment.amount)) && (
                     <div className="space-y-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100 print:bg-transparent print:border-none print:p-0 mb-4 mt-4">
                        <p className="font-bold border-b border-orange-200 print:border-slate-300 pb-2 uppercase text-orange-800 print:text-slate-500 text-xs tracking-widest">PAGAMENTO PARCIAL / RESTANTE (PREENCHA SE APLICÁVEL)</p>
                        <ul className="space-y-3">
                          <li className="flex gap-2 justify-between items-center text-orange-900 print:text-slate-900 font-medium pt-1">
                            <span>Faltante a receber:</span> 
                            <span className="flex items-center gap-1">R$ <input type="text" defaultValue={(receiptModalPayment.status === 'partial' || (receiptModalPayment.paidAmount && receiptModalPayment.paidAmount < receiptModalPayment.amount) ? receiptModalPayment.amount - (receiptModalPayment.paidAmount || 0) : 0).toLocaleString()} className="w-24 text-right bg-transparent border-b border-orange-300 print:border-slate-300 outline-none focus:border-orange-500 print:border-b-0 print:p-0" /></span>
                          </li>
                          <li className="flex flex-col gap-1">
                            <span className="text-orange-900 print:text-slate-900 font-medium">Motivo declarado (Inquilino):</span> 
                            <input type="text" placeholder="Ex: Atraso no salário, problemas médicos, etc." className="w-full bg-transparent border-b border-orange-300 print:border-slate-300 outline-none focus:border-orange-500 print:border-b-0 print:p-0 placeholder:text-orange-300/70 py-1" />
                          </li>
                          <li className="flex gap-2 justify-between items-center pt-2">
                            <span className="text-orange-900 print:text-slate-900 font-medium">Cobrança da próxima / Prazo:</span> 
                            <input type="text" placeholder="DD/MM/AAAA" className="w-32 text-right bg-transparent border-b border-orange-300 print:border-slate-300 outline-none focus:border-orange-500 print:border-b-0 print:p-0 py-1" />
                          </li>
                        </ul>
                      </div>
                     )}

                     <div className="space-y-4">
                       <p className="font-bold border-b pb-2 uppercase text-slate-500 text-xs tracking-widest">FORMA DE PAGAMENTO</p>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                         <label className="flex items-center gap-2 cursor-pointer font-medium"><input type="radio" name="payment_method" className="w-4 h-4 text-emerald-600 accent-emerald-600" /> Dinheiro</label>
                         <label className="flex items-center gap-2 cursor-pointer font-medium"><input type="radio" name="payment_method" className="w-4 h-4 text-emerald-600 accent-emerald-600" /> Transferência</label>
                         <label className="flex items-center gap-2 cursor-pointer font-medium"><input type="radio" name="payment_method" className="w-4 h-4 text-emerald-600 accent-emerald-600" defaultChecked /> PIX</label>
                         <label className="flex items-center gap-2 cursor-pointer font-medium"><input type="radio" name="payment_method" className="w-4 h-4 text-emerald-600 accent-emerald-600" /> Depósito</label>
                         
                         <div className="col-span-2 sm:col-span-4 mt-2 flex items-start flex-col gap-2">
                           <div className="flex w-full items-center gap-2">
                             <strong className="shrink-0">Comprovante (opcional):</strong>
                             <input type="text" defaultValue={receiptModalPayment.evidenceName || receiptModalPayment.evidenceLocation || ''} className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                           </div>
                           {receiptModalPayment.thumbnailLink ? (
                             <img src={receiptModalPayment.thumbnailLink} alt="Miniatura do comprovante" className="w-32 h-32 object-cover rounded-lg border border-slate-200 mt-2 print:block border-slate-300 print:w-48 print:h-48" />
                           ) : receiptModalPayment.receiptUrl?.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                             <img src={receiptModalPayment.receiptUrl} alt="Comprovante" className="w-32 h-32 object-cover rounded-lg border border-slate-200 mt-2 print:block border-slate-300 print:w-48 print:h-48" />
                           ) : null}
                         </div>
                       </div>
                     </div>

                     <div className="space-y-4 pt-4 border-t">
                       <p className="leading-relaxed">Declaro que o valor acima foi recebido integralmente, dando plena quitação referente ao período mencionado.</p>
                     </div>

                     <div className="pt-16 pb-8 grid grid-cols-2 gap-8 text-center mt-8">
                       <div className="border-t border-slate-400 pt-2">
                         <p className="font-bold">Locador (Proprietário)</p>
                       </div>
                       <div className="border-t border-slate-400 pt-2">
                         <p className="font-bold">Locatário (Inquilino)</p>
                       </div>
                     </div>

                     <div className="pt-2 text-slate-600 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                       <div className="flex items-center gap-2 flex-1">
                         <strong className="shrink-0">Local:</strong>
                         <input type="text" className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                       </div>
                       <div className="flex items-center gap-2">
                         <strong className="shrink-0">Data:</strong>
                         <input type="text" defaultValue={paymentDate} className="w-28 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0" />
                       </div>
                     </div>

                   </div>
                 )}
               </div>
               
               <div className="flex justify-end gap-3 print:hidden">
                 <Button variant="outline" onClick={() => { setReceiptModalPayment(null); setReceiptType('simple'); }}>Fechar</Button>
                 <Button className="bg-slate-900 text-white" onClick={() => window.print()}> <Receipt className="w-4 h-4 mr-2" /> Imprimir / Salvar PDF</Button>
               </div>
             </div>
           );
        })()}
      </Modal>
    </div>
  );
};

interface SettingsViewProps {
  user: User | null;
  setIsResetModalOpen: (open: boolean) => void;
  agreements: Agreement[];
  properties: Property[];
  tenants: Tenant[];
  setAgreementForm: (a: Partial<Agreement>) => void;
  setIsAgreementModalOpen: (open: boolean) => void;
  setArchivingAgreement: (a: Agreement) => void;
  setIsArchiveAgreementModalOpen: (open: boolean) => void;
  securityPassword: string;
  setSecurityPassword: (p: string) => void;
  isDriveConnected: boolean;
  driveError: string | null;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  setPreviewReceipt: (preview: { url: string; name: string; isImage: boolean } | null) => void;
}

const SettingsView = ({ 
  user, 
  setIsResetModalOpen, 
  agreements, 
  properties, 
  tenants,
  setAgreementForm,
  setIsAgreementModalOpen,
  setArchivingAgreement,
  setIsArchiveAgreementModalOpen,
  securityPassword,
  setSecurityPassword,
  isDriveConnected,
  driveError,
  onConnectDrive,
  onDisconnectDrive,
  setPreviewReceipt
}: SettingsViewProps) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState(securityPassword);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.displayName || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.photoURL || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      await updateProfile(user, { displayName: profileName, photoURL: profilePhoto });
      toast.success('Perfil atualizado com sucesso!');
      setIsEditingProfile(false);
      setTimeout(() => window.location.reload(), 1500); // Reload to reflect changes
    } catch (error) {
      console.error("Update profile error", error);
      toast.error('Erro ao atualizar o perfil.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleActionClick = (type: 'edit' | 'archive' | 'delete', agreement: Agreement) => {
    if (type === 'edit') {
      setAgreementForm(agreement);
      setIsAgreementModalOpen(true);
    } else if (type === 'archive' || type === 'delete') {
      setArchivingAgreement(agreement);
      setIsArchiveAgreementModalOpen(true);
    }
  };

    const [isAgreementsOpen, setIsAgreementsOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações</h1>
        <p className="text-slate-500">Gerencie sua conta, aplicativos e integrações do sistema.</p>
      </header>

      <div className="space-y-6">
        <Card className="overflow-hidden border-slate-200">
          <div className="p-6 bg-white flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* User Profile */}
            <div className="flex-1 flex items-center gap-4">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-16 h-16 rounded-full object-cover border border-slate-200 shadow-sm" />
              ) : (
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-2xl shadow-sm">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900 text-lg leading-tight">{user?.displayName || 'Administrador'}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold" onClick={() => setIsEditingProfile(true)}>Editar Perfil</Button>
                </div>
              </div>
            </div>
            
            <div className="w-full sm:w-auto h-px sm:h-auto sm:w-px bg-slate-100 self-stretch my-2 sm:my-0"></div>
            
            {/* Segurança */}
            <div className="flex-1 space-y-4 w-full sm:w-auto">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-500"/> Segurança da Conta</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Senha de Confirmação</p>
                    <p className="text-[10px] text-slate-500">Para ações sensíveis.</p>
                  </div>
                  {isChangingPassword ? (
                    <div className="flex gap-2">
                      <Input 
                        id="security-password-change"
                        type="password" 
                        className="h-8 w-24 text-xs" 
                        value={newPasswordInput}
                        onChange={e => setNewPasswordInput(e.target.value)}
                      />
                      <Button size="sm" className="h-8 text-[10px]" onClick={() => {
                        setSecurityPassword(newPasswordInput);
                        setIsChangingPassword(false);
                        toast.success('Senha atualizada!');
                      }}>Salvar</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => setIsChangingPassword(true)}>Alterar</Button>
                  )}
                </div>
                <Button variant="danger" size="sm" onClick={() => auth.signOut()} className="w-full font-bold h-9">Sair do Gerente Imobiliário</Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6">
          <Card className="p-6 border border-slate-200 flex flex-col items-start text-left">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-slate-900">
              <Cloud className="w-5 h-5 text-emerald-500" /> Integração Google Drive
            </h3>
            <p className="text-sm text-slate-500 mb-6 flex-1 w-full text-left">
              {isDriveConnected ? 'Status: Conectado. O sistema pode ler e salvar comprovantes e recibos.' : 'Conecte para salvar e visualizar arquivos de forma segura.'}
            </p>
            {!isDriveConnected ? (
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10" onClick={onConnectDrive}>
                <Cloud className="w-4 h-4 mr-2" /> Conectar Google Drive
              </Button>
            ) : (
              <Button className="w-full font-bold h-10" variant="outline" onClick={onDisconnectDrive}>
                <CloudOff className="w-4 h-4 mr-2"/> Desconectar Drive
              </Button>
            )}
            {driveError && <p className="text-[10px] text-red-500 mt-2 font-medium bg-red-50 p-2 rounded-lg w-full text-left">{driveError}</p>}
          </Card>
        </div>

        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
          <button 
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            onClick={() => setIsAgreementsOpen(!isAgreementsOpen)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><FileText className="w-5 h-5"/></div>
              <div>
                <h3 className="font-bold text-slate-900">Gerenciar Acordos</h3>
                <p className="text-xs text-slate-500">{agreements.length} contrato(s) registrado(s)</p>
              </div>
            </div>
            <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isAgreementsOpen && "rotate-180")}/>
          </button>
          <AnimatePresence>
            {isAgreementsOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50">
                  <div className="space-y-3 mt-4">
                    {agreements.length > 0 ? (
                      agreements.map(a => {
                        const prop = properties.find(p => p.id === a.propertyId);
                        const tenant = tenants.find(t => t.id === a.tenantId);
                        return (
                          <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{a.description}</h4>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{prop?.name} • {tenant?.name}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={cn(
                                  "inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight",
                                  a.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                )}>
                                  {a.status === 'active' ? 'Ativo' : 'Arquivado'}
                                </span>
                                {a.thumbnailLink && (
                                  <img 
                                    src={a.thumbnailLink} 
                                    className="w-6 h-6 rounded object-cover border border-slate-200 cursor-pointer hover:scale-110 transition-transform" 
                                    alt="Preview"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isImage = (a.evidence || a.evidenceLocation)?.match(/.(jpeg|jpg|gif|png)$/i) || a.thumbnailLink;
                                      setPreviewReceipt({ url: (a.evidence || a.evidenceLocation)!, name: `Evidência - ${a.description}`, isImage: !!isImage });
                                    }}
                                  />
                                )}
                                {a.evidence && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isImage = a.evidence?.match(/.(jpeg|jpg|gif|png)$/i) || a.thumbnailLink;
                                      setPreviewReceipt({ url: a.evidence!, name: `Evidência - ${a.description}`, isImage: !!isImage });
                                    }}
                                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tight"
                                  >
                                    <ImageIcon className="w-3 h-3" /> Ver Evidência
                                  </button>
                                )}
                                {a.evidenceLocation && (
                                  <div className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                    <MapPin className="w-3 h-3" />
                                    {a.evidenceLocation.startsWith('http') ? (
                                      <a href={a.evidenceLocation} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:underline">Link Externo</a>
                                    ) : <span>{a.evidenceLocation}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button variant="outline" size="sm" className="flex-1 sm:w-10 sm:flex-none p-0 h-9" onClick={() => handleActionClick('edit', a)}><Edit className="w-4 h-4 mx-auto" /></Button>
                              <Button variant="outline" size="sm" className="flex-1 sm:w-10 sm:flex-none p-0 h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => handleActionClick('archive', a)}><Archive className="w-4 h-4 mx-auto" /></Button>
                              <Button variant="outline" size="sm" className="flex-1 sm:w-10 sm:flex-none p-0 h-9 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleActionClick('delete', a)}><Trash2 className="w-4 h-4 mx-auto" /></Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-6">Nenhum acordo encontrado.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Card className="p-4 border border-destructive/20 bg-red-50 flex items-center justify-between sm:flex-row flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-4 w-full sm:w-auto text-left">
            <div className="p-2 bg-white text-destructive rounded-lg border border-red-100 shrink-0"><Trash2 className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-bold text-destructive">Reset de Dados do Sistema</h3>
              <p className="text-[10px] text-destructive/70 font-medium">Exclui permanentemente todos os registros vinculados à sua conta.</p>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setIsResetModalOpen(true)} className="whitespace-nowrap w-full sm:w-auto font-bold shrink-0 shadow-sm h-9">
            <AlertCircle className="w-4 h-4 mr-1.5" /> Limpar Dados
          </Button>
        </Card>
        
        <div className="pt-6 flex flex-col items-center justify-center text-center opacity-60">
          <div className="w-10 h-10 flex items-center justify-center mb-2">
            <LogoSVG className="w-8 h-8 opacity-75" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gerente Imobiliário</p>
          <p className="text-[10px] font-medium text-slate-400 mt-1">Versão 4.1.1 <span className="mx-1.5 opacity-50">•</span> 02/05/2026</p>
        </div>

      </div>

      <Modal isOpen={isEditingProfile} onClose={() => setIsEditingProfile(false)} title="Editar Perfil">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome de Exibição</label>
            <Input id="profile-name" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">URL da Foto de Perfil</label>
            <Input id="profile-photo" value={profilePhoto} onChange={e => setProfilePhoto(e.target.value)} placeholder="https://exemplo.com/foto.jpg" />
            <p className="text-[10px] text-muted-foreground">Insira o link para uma imagem pública para usar como foto de perfil.</p>
          </div>
          <div className="pt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsEditingProfile(false)} disabled={isUpdatingProfile}>Cancelar</Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
              {isUpdatingProfile ? <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const AssistantCentral = ({ 
  properties,
  tenants,
  payments,
  expenses,
  agreements,
  isDriveConnected, 
  driveError, 
  onConnectDrive, 
  syncLogs,
  uploadToDrive,
  setPreviewReceipt,
  user,
  addProperty,
  addTenant
}: { 
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  expenses: Expense[];
  agreements: Agreement[];
  isDriveConnected: boolean; 
  driveError: string | null; 
  onConnectDrive: () => void;
  syncLogs: any[];
  uploadToDrive: any;
  setPreviewReceipt: (p: any) => void;
  user: User | null;
  addProperty: (p: Property) => Promise<void>;
  addTenant: (t: Tenant) => Promise<void>;
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'integration'>('chat');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'success' | 'error'>('all');
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant' | 'system', content: string}[]>([
    { role: 'assistant', content: 'Olá! Sou seu Assistente do Gerente Imobiliário. Como posso te ajudar hoje? Posso criar imóveis, inquilinos ou analisar seus dados.' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredLogs = syncLogs.filter(log => activeFilter === 'all' || log.status === activeFilter);
  const errorCount = syncLogs.filter(l => l.status === 'error').length;
  const pendingCount = syncLogs.filter(l => l.status === 'pending').length;
  const successCount = syncLogs.filter(l => l.status === 'success').length;

  const loadDiagnostics = async () => {
    try {
      const url = user ? `/api/auth/google/diagnostics?uid=${user.uid}` : '/api/auth/google/diagnostics';
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      setDiagnostics(data);
    } catch (e) {
      console.log('Failed to load diagnostics');
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleToolCall = async (calls: any[]) => {
    const responses = [];
    for (const call of calls) {
      if (call.name === 'create_property') {
        const { name, address, rentValue, status } = call.args;
        try {
          await addProperty({
            name,
            address: address || '',
            rentValue: Number(rentValue),
            status: (status as any) || 'vacant',
            ownerId: user?.uid || ''
          });
          responses.push(`✅ Imóvel "${name}" criado com sucesso!`);
        } catch (e) {
          responses.push(`❌ Erro ao criar imóvel "${name}": ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
        }
      } else if (call.name === 'create_tenant') {
        const { name, contact, cpf } = call.args;
        try {
          await addTenant({
            name,
            contact,
            cpf: cpf || '',
            status: 'waiting',
            ownerId: user?.uid || ''
          });
          responses.push(`✅ Inquilino "${name}" cadastrado com sucesso!`);
        } catch (e) {
          responses.push(`❌ Erro ao cadastrar inquilino "${name}": ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
        }
      } else if (call.name === 'generate_missing_info_report') {
        const missingTenants = tenants.filter(t => !t.cpf || !t.contact);
        const report = missingTenants.length > 0 
          ? `Relatório de Pendências:\n${missingTenants.map(t => `- ${t.name}: Faltando ${(t.cpf ? '' : 'CPF') + (t.contact ? '' : ' Contato')}`).join('\n')}`
          : "Nenhuma pendência crítica de informação encontrada nos inquilinos.";
        responses.push(report);
      }
    }
    return responses.join('\n\n');
  };

  const sendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMsg = userInput;
    setUserInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await getManagerAgentResponse({
        properties,
        tenants,
        payments,
        expenses,
        agreements,
        authDiagnostics: diagnostics
      }, userMsg, chatHistory);

      if (typeof response === 'object' && (response as any).type === 'tool_call') {
        const toolFeedback = await handleToolCall((response as any).calls);
        setChatHistory(prev => [...prev, { role: 'assistant', content: toolFeedback + "\n\nO que mais posso fazer por você?" }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', content: response as string }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Desculpe, tive um problema técnico. Pode repetir?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-160px)]">
      {/* Sidebar - Quick Alerts & Drive Status */}
      <div className="lg:col-span-4 space-y-6 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Assistente IA</h1>
          <p className="text-slate-500 text-sm mt-1">Seu co-piloto para gestão imobiliária.</p>
        </header>

        {/* System Health / Drive Section */}
        <Card className="p-5 border-indigo-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronização Cloud</h3>
            <div className={cn("w-2 h-2 rounded-full", isDriveConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
          </div>
          <div className="space-y-4">
            {!isDriveConnected && (
              <Button onClick={onConnectDrive} size="sm" className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                <Cloud className="w-4 h-4" /> Conectar Drive
              </Button>
            )}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs font-medium text-slate-600">Status</span>
              <span className={cn("text-xs font-bold", isDriveConnected ? "text-emerald-600" : "text-slate-400")}>
                {isDriveConnected ? "Conectado" : "Desconectado"}
              </span>
            </div>
            
            <button 
              onClick={() => setActiveTab('integration')}
              className={cn(
                "w-full py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                activeTab === 'integration' 
                  ? "bg-indigo-600 text-white border-indigo-600" 
                  : "bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50"
              )}
            >
              {activeTab === 'integration' ? <FolderOpen className="w-3 h-3" /> : <Folder className="w-3 h-3" />}
              {activeTab === 'integration' ? 'Vendo Detalhes' : 'Ver Detalhes do Drive'}
            </button>
          </div>
        </Card>

        {/* AI Alerts Column */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Alertas do Sistema</h3>
          
          {properties.filter(p => p.status === 'renovation').map(p => (
            <div key={p.id} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-left-4">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0 h-fit">
                <Hammer className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-900">{p.name} em Reforma</p>
                <p className="text-[10px] text-amber-700 mt-0.5">Sugestão: Definir prazo de entrega para evitar vacância prolongada.</p>
              </div>
            </div>
          ))}

          {tenants.filter(t => !t.cpf).slice(0, 2).map(t => (
            <div key={t.id} className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-left-4">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0 h-fit">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-red-900">Inquilino: {t.name}</p>
                <p className="text-[10px] text-red-700 mt-0.5">Pendente: CPF não cadastrado. Risco na emissão de contratos.</p>
              </div>
            </div>
          ))}

          {payments.filter(p => p.status === 'late').length > 0 && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-left-4">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0 h-fit">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-indigo-900">Pagamentos em Atraso</p>
                <p className="text-[10px] text-indigo-700 mt-0.5">Existem {payments.filter(p => p.status === 'late').length} pendências. Deseja que eu gere uma mensagem de cobrança?</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Container - Chat Focus */}
      <div className="lg:col-span-8 flex flex-col h-full bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

        {/* Chat Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-xl relative z-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('chat')}
              className={cn(
                "flex items-center gap-3 py-1 transition-all",
                activeTab === 'chat' ? "text-white opacity-100" : "text-slate-500 hover:text-slate-300 opacity-60"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all",
                activeTab === 'chat' ? "bg-indigo-600 text-white shadow-indigo-500/20" : "bg-slate-800 text-slate-400"
              )}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h2 className="text-xs font-bold">Assistente Chat</h2>
                {activeTab === 'chat' && <div className="flex items-center gap-1.5"><span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">Online</span></div>}
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('integration')}
              className={cn(
                "flex items-center gap-3 py-1 transition-all",
                activeTab === 'integration' ? "text-white opacity-100" : "text-slate-500 hover:text-slate-300 opacity-60"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all",
                activeTab === 'integration' ? "bg-emerald-600 text-white shadow-emerald-500/20" : "bg-slate-800 text-slate-400"
              )}>
                <Cloud className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h2 className="text-xs font-bold">Integração Drive</h2>
                {activeTab === 'integration' && <div className="flex items-center gap-1.5"><span className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" /><span className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">Sincronizado</span></div>}
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {activeTab === 'integration' && (
              <button 
                onClick={() => {
                  setIsRefreshing(true);
                  loadDiagnostics();
                  setTimeout(() => setIsRefreshing(false), 1000);
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Sincronizar Manualmente"
              >
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </button>
            )}
            <button 
              onClick={() => activeTab === 'chat' ? setChatHistory([{ role: 'assistant', content: 'Histórico limpo. Como posso ajudar agora?' }]) : setActiveTab('chat')}
              className="p-2 text-slate-500 hover:text-white transition-colors"
              title={activeTab === 'chat' ? "Limpar Conversa" : "Voltar para Chat"}
            >
              {activeTab === 'chat' ? <Trash2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {activeTab === 'chat' ? (
          <>
            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar relative z-10"
            >
              {chatHistory.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex w-full mb-4",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] px-5 py-3.5 rounded-3xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10" 
                      : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none text-left"
                  )}>
                    <div className="whitespace-pre-wrap">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 border border-slate-700 px-5 py-4 rounded-3xl rounded-tl-none">
                    <div className="flex gap-1">
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-slate-900 border-t border-slate-800 relative z-10">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Digite sua mensagem aqui..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-6 py-4 rounded-3xl pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500 text-sm"
                />
                <button 
                  onClick={sendMessage}
                  disabled={isLoading || !userInput.trim()}
                  className="absolute right-2 top-2 p-3 bg-indigo-600 hover:bg-indigo-50 text-white rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-500 mt-4 uppercase tracking-widest font-bold">Assistente Conectado ao Seu Banco de Dados</p>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 space-y-8 relative z-10 custom-scrollbar">
            {/* Folder Explorer Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-emerald-400" /> Explorador de Arquivos no Drive
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mt-1">Sincronização automática com sua conta do Google</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-2xl border border-slate-700">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all",
                      activeFilter === 'all' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    TUDO
                  </button>
                  <button
                    onClick={() => setActiveFilter('error')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all",
                      activeFilter === 'error' ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    ERROS
                  </button>
                </div>
              </div>

              {/* Hierarchical Folder View */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Root Folders Overview */}
                {properties.map(prop => {
                  const propLogs = syncLogs.filter(l => 
                    l.fileName?.includes(prop.name) || 
                    tenants.find(t => t.id === l.tenantId)?.propertyId === prop.id
                  );
                  
                  if (propLogs.length === 0) return null;

                  return (
                    <motion.div 
                      key={prop.id}
                      whileHover={{ scale: 1.02 }}
                      className="p-5 bg-slate-800/40 border border-slate-700 rounded-[2rem] hover:bg-slate-800 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl group-hover:bg-indigo-500 group-hover:text-white transition-all">
                          <Folder className="w-5 h-5 fill-current" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-white truncate uppercase tracking-wider">{prop.name}</h4>
                          <p className="text-[10px] text-slate-500 font-bold">{propLogs.length} arquivos</p>
                        </div>
                      </div>
                      <div className="space-y-2 border-t border-slate-700/50 pt-3">
                        {propLogs.slice(0, 3).map(log => (
                          <div key={log.id} className="flex items-center justify-between group/item">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3 h-3 text-slate-500" />
                              <span className="text-[10px] text-slate-400 truncate">{log.fileName}</span>
                            </div>
                            {log.url && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewReceipt({ url: log.url, name: log.fileName, isImage: !log.url.includes('/view') });
                                }}
                                className="opacity-0 group-hover/item:opacity-100 text-[9px] font-black text-indigo-400 hover:underline"
                              >
                                VER
                              </button>
                            )}
                          </div>
                        ))}
                        {propLogs.length > 3 && (
                          <p className="text-[9px] text-slate-600 font-bold italic text-center mt-1">+ {propLogs.length - 3} outros arquivos</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Internal / Other Folder */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="p-5 bg-slate-800/20 border border-slate-700/50 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center opacity-60 hover:opacity-100 transition-all"
                >
                  <div className="p-3 bg-slate-700/30 text-slate-500 rounded-2xl mb-3">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navegar no Drive</h4>
                  <p className="text-[9px] text-slate-600 mt-1 max-w-[120px]">Acesse a pasta raiz para ver toda estrutura</p>
                </motion.div>
              </div>
            </div>

            {/* Health Info Section - Re-designed as Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 bg-slate-800/30 border border-slate-700 rounded-[2.5rem] space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none">Status da Saúde</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Conexão Estabelecida</p>
                  </div>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Erros Reportados</span>
                    <span className={cn("text-xs font-black font-mono", errorCount > 0 ? "text-rose-500" : "text-emerald-400")}>{errorCount}</span>
                  </div>
                  <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Espaço em uso</span>
                    <span className="text-xs font-black font-mono text-indigo-400">1.2 GB</span>
                  </div>
                  <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Último Backup</span>
                    <span className="text-xs font-black font-mono text-slate-400">Agora mesmo</span>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-indigo-600/10 border border-indigo-500/20 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2 mb-6">
                  <Zap className="w-5 h-5 text-indigo-400" /> Resumo Inteligente
                </h3>
                <div className="space-y-4">
                  <p className="text-sm font-medium text-indigo-100/90 leading-relaxed">
                    "Detectamos que a pasta de <b>Contratos</b> é a mais acessada esta semana. Sugerimos criar um atalho na Dashboard principal para facilitar seu fluxo."
                  </p>
                  <div className="pt-4 flex items-center gap-3">
                    <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/25">
                      Seguir Recomendação
                    </button>
                    <span className="text-[9px] text-indigo-400 font-bold uppercase">Feedback da IA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={cn("bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  className,
  disabled,
  type = 'button'
}: { 
  children: React.ReactNode; 
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}) => {
  const variants = {
    primary: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
    ghost: 'hover:bg-slate-100 text-slate-600',
    outline: 'border border-slate-200 text-slate-600 hover:bg-slate-50'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({ 
  label, 
  id, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  required,
  className,
  min,
  max,
  disabled,
  onKeyDown
}: { 
  label?: string; 
  id: string; 
  type?: string; 
  value: string | number; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder?: string;
  required?: boolean;
  className?: string;
  min?: string | number;
  max?: string | number;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && <label htmlFor={id} className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      min={min}
      max={max}
      className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
    />
  </div>
);

const CurrencyInput = ({ 
  label, 
  id, 
  value, 
  onChange, 
  required,
  className 
}: { 
  label?: string; 
  id: string; 
  value: number; 
  onChange: (val: number) => void; 
  required?: boolean;
  className?: string;
}) => {
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const [displayValue, setDisplayValue] = useState(formatValue(value));

  useEffect(() => {
    setDisplayValue(formatValue(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = Number(rawValue) / 100;
    onChange(numericValue);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <label htmlFor={id} className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={displayValue}
          onChange={handleChange}
          required={required}
          className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 font-medium"
        />
      </div>
    </div>
  );
};

const Select = ({ 
  label, 
  id, 
  value, 
  onChange, 
  options,
  className,
  required
}: { 
  label?: string; 
  id: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
  options: { label: string; value: string; disabled?: boolean }[];
  className?: string;
  required?: boolean;
}) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && <label htmlFor={id} className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <select
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white/95 backdrop-blur-xl rounded-[2rem] border border-white/50 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-lg overflow-hidden flex flex-col relative z-10"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white/50">
              <h2 className="text-xl font-black tracking-tight text-slate-800">{title}</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors active:scale-95"><XCircle className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[75vh] custom-scrollbar bg-white/80">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const SecurityCheckModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  correctPassword,
  description
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void; 
  correctPassword: string;
  description?: string;
}) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === correctPassword) {
      setError(false);
      setInput('');
      onSuccess();
      onClose();
    } else {
      setError(true);
      toast.error('Senha de segurança incorreta!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-sm border border-slate-100 text-center space-y-6"
      >
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">Ação Sensível</h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            {description || "Esta ação requer sua senha de segurança para ser concluída."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="password" 
              autoFocus
              placeholder="Digite sua senha"
              className={cn(
                "w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl text-center text-xl font-bold tracking-[0.5em] outline-none transition-all focus:ring-4 focus:ring-amber-500/10",
                error ? "border-rose-500 bg-rose-50 animate-shake" : "border-slate-200 focus:border-amber-500"
              )}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                setError(false);
              }}
            />
          </div>
          
          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 py-4 rounded-2xl font-bold text-slate-600"
              onClick={() => {
                setInput('');
                setError(false);
                onClose();
              }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1 py-4 rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-white border-none shadow-lg shadow-amber-200"
            >
              Confirmar
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App ---

import { getDriveAgentResponse, getManagerAgentResponse } from './services/geminiService';

const DriveIntegrationModalPlaceholder = () => null;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'tenant' | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'properties' | 'tenants' | 'financial' | 'settings' | 'receivables' | 'cloud' | 'help'>('dashboard');
  const [highlightedPaymentId, setHighlightedPaymentId] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Auto-show guide for first-time visitors who are not in standalone
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      const guideShown = localStorage.getItem('pwa_guide_shown');
      if (!isStandalone && !guideShown) {
         setShowPwaGuide(true);
         localStorage.setItem('pwa_guide_shown', 'true');
      }
    };

    const installedHandler = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa_guide_shown', 'true');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const redirectToReceivables = (paymentId: string) => {
    setHighlightedPaymentId(paymentId);
    setActiveTab('receivables');
    setIsTenantDetailModalOpen(false); // Close tenant detail if open
  };
  const [securityPassword, setSecurityPassword] = useState('1234');

  useEffect(() => {
    if (!user) return;
    const loadConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'config', user.uid));
        if (configDoc.exists()) {
          setSecurityPassword(configDoc.data().securityPassword || '1234');
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      }
    };
    loadConfig();
  }, [user]);

  const updateSecurityPassword = async (newPassword: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'config', user.uid), cleanObject({
        securityPassword: newPassword,
        updatedAt: new Date().toISOString()
      }), { merge: true });
      setSecurityPassword(newPassword);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config');
    }
  };
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityDescription, setSecurityDescription] = useState('');
  const [onSecuritySuccess, setOnSecuritySuccess] = useState<(() => void) | null>(null);

  const executeWithSecurity = (action: () => void, description: string = '') => {
    setOnSecuritySuccess(() => action);
    setSecurityDescription(description);
    setIsSecurityModalOpen(true);
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [revertingPayment, setRevertingPayment] = useState<Payment | null>(null);
  const [revertReason, setRevertReason] = useState('');
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoveTenantModalOpen, setIsRemoveTenantModalOpen] = useState(false);
  const [removeTenantData, setRemoveTenantData] = useState<{ propertyId: string; tenantId: string; action: 'waiting' | 'archived' | 'delete' } | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [settlementType, setSettlementType] = useState<'extra' | 'discount'>('extra');
  const [confirmingPayment, setConfirmingPayment] = useState<any | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [paymentReceipt, setPaymentReceipt] = useState<string | null>(null);
  const [paymentReceiptLocation, setPaymentReceiptLocation] = useState<string>('');
  const [paymentReceiptName, setPaymentReceiptName] = useState<string>('');
  const [paymentReceiptThumbnail, setPaymentReceiptThumbnail] = useState<string | null>(null);
  const [paymentRemainderDueDate, setPaymentRemainderDueDate] = useState<string>(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [paymentRemainderObservations, setPaymentRemainderObservations] = useState<string>('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [agreementForm, setAgreementForm] = useState<Partial<Agreement>>({
    tenantId: '',
    description: '',
    totalAmount: 0,
    installmentAmount: 0,
    durationMonths: 1,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    justification: '',
    evidence: '',
    evidenceName: '',
    evidenceLocation: '',
    thumbnailLink: ''
  });
  
  const [isArchiveAgreementModalOpen, setIsArchiveAgreementModalOpen] = useState(false);
  const [archivingAgreement, setArchivingAgreement] = useState<Agreement | null>(null);
  const [archiveJustification, setArchiveJustification] = useState('');
  
  const [isTenantDetailModalOpen, setIsTenantDetailModalOpen] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<{ url: string, name: string, isImage: boolean } | null>(null);
  const [selectedTenantForDetail, setSelectedTenantForDetail] = useState<Tenant | null>(null);

  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [syncLogs, setSyncLogs] = useState<{
    id: string;
    fileName: string;
    status: 'pending' | 'success' | 'error';
    timestamp: string;
    error?: string;
    url?: string;
    type: 'receipt' | 'contract' | 'expense';
  }[]>([]);

  const addSyncLog = useCallback((log: Omit<{ id: string, fileName: string, status: 'pending' | 'success' | 'error', timestamp: string, error?: string, url?: string, type: 'receipt' | 'contract' | 'expense' }, 'id' | 'timestamp'>) => {
    const newLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    setSyncLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const checkDriveStatus = useCallback(async (retries = 5) => {
    try {
      console.log(`[Drive] Checking status... Retries left: ${retries}`);
      const storedTokens = localStorage.getItem('google_drive_tokens');
      const url = user ? `/api/auth/google/status?uid=${user.uid}` : '/api/auth/google/status';
      
      const headers: Record<string, string> = {};
      if (storedTokens) {
        headers['X-Drive-Tokens'] = storedTokens;
      }

      const res = await fetch(url, { 
        credentials: 'include',
        headers
      });
      const contentType = res.headers.get("content-type");

      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Erro HTTP ${res.status}`);
        }
        throw new Error(`Erro do Servidor: ${res.status}`);
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Resposta inválida do servidor (não é JSON).");
      }

      const data = await res.json();
      console.log('[Drive] Status response:', data);
      
      setIsDriveConnected(data.connected);
      setDriveError(null);
      
      // If we expected to be connected but aren't, and we have retries left
      if (!data.connected && retries > 0) {
        console.log('[Drive] Not connected yet, retrying in 2s...');
        setTimeout(() => checkDriveStatus(retries - 1), 2000);
      } else if (data.connected) {
        console.log('[Drive] Connected successfully!');
      }
    } catch (error) {
      console.error('[Drive] Error checking status:', error);
      if (retries > 0) {
        setTimeout(() => checkDriveStatus(retries - 1), 2000);
      } else {
        setDriveError(error instanceof Error ? error.message : 'Erro desconhecido');
        setIsDriveConnected(false);
      }
    }
  }, [user]);

  useEffect(() => {
    checkDriveStatus();
  }, [checkDriveStatus]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log('[Drive] Message received:', event.data?.type);
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const tokens = event.data.tokens;
        console.log('[Drive] Tokens received from popup');
        
        // Clear any previous error immediately
        setDriveError(null);
        
        if (tokens) {
          console.log('[Drive] Received tokens via postMessage, synchronizing session...');
          localStorage.setItem('google_drive_tokens', JSON.stringify(tokens));
          try {
            const saveRes = await fetch('/api/auth/google/save-tokens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tokens, uid: user?.uid }),
              credentials: 'include'
            });
            
            if (!saveRes.ok) {
              const errData = await saveRes.json().catch(() => ({ error: 'Desconhecido' }));
              console.error('[Drive] Failed to sync tokens to session:', errData.error);
              toast.error('Falha ao sincronizar sessão: ' + errData.error);
            } else {
              const result = await saveRes.json();
              console.log('[Drive] Session synchronized successfully. Firestore saved:', result.firestoreSaved);
              
              // Immediate check after sync
              setTimeout(() => checkDriveStatus(3), 500);
            }
          } catch (err) {
            console.error('[Drive] Error syncing tokens:', err);
          }
        }
        
        // Wait a bit for session to propagate and check status
        setTimeout(() => {
          console.log('Post-auth check triggered');
          checkDriveStatus(3); // Fewer retries needed now with direct sync
          toast.success('Google Drive conectado com sucesso!');
        }, 1000);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkDriveStatus]);

  const handleConnectDrive = async () => {
    setDriveError(null); // Clear error when starting new attempt
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await fetch(`/api/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`, { credentials: 'include' });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || 'Erro ao iniciar conexão com Google Drive.');
        return;
      }

      const { url } = data;
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url, 
        'google_oauth', 
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );
      
      if (!authWindow) {
        toast.error('O bloqueador de popups impediu a abertura da janela de conexão.');
        return;
      }
    } catch (error) {
      console.error('Error connecting to Drive:', error);
      toast.error('Erro ao iniciar conexão com Google Drive.');
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      const res = await fetch('/api/auth/google/logout', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        localStorage.removeItem('google_drive_tokens');
        setIsDriveConnected(false);
        toast.success('Desconectado da conta Google com sucesso.');
      } else {
        throw new Error('Falha ao desconectar');
      }
    } catch (error) {
      console.error('Error disconnecting drive:', error);
      toast.error('Erro ao desconectar da conta Google.');
    }
  };

  const uploadToDrive = async (fileName: string, fileData: string, mimeType: string, folderName?: string, type: 'receipt' | 'contract' | 'expense' = 'receipt') => {
    addSyncLog({ fileName, status: 'pending', type });
    try {
      const storedTokens = localStorage.getItem('google_drive_tokens');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedTokens) {
        headers['X-Drive-Tokens'] = storedTokens;
      }

      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({ fileName, fileData, mimeType, folderName, uid: user?.uid }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      addSyncLog({ fileName, status: 'success', url: data.webViewLink, type });
      return data;
    } catch (error: any) {
      console.error('Drive upload error:', error);
      addSyncLog({ fileName, status: 'error', error: error.message, type });
      throw error;
    }
  };

  const handleOpenTenantDetail = (t: Tenant) => {
    setSelectedTenantForDetail(t);
    setIsTenantDetailModalOpen(true);
  };

  // Data State
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthReady(true);
      
      if (u) {
        // Ensure user document exists in Firestore for RBAC
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          let role: 'admin' | 'tenant' = (u.email === 'dennyancasa@gmail.com' || u.email === 'dennayncasa@gmail.com' || u.email === 'dennyan.moto@gmail.com') ? 'admin' : 'tenant';
          
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', u.uid), cleanObject({
              email: u.email,
              role: role,
              createdAt: serverTimestamp()
            }));
            setUserRole(role);
          } else {
            const data = userDoc.data();
            // If the email is in the admin list but the doc says tenant, update it
            if (role === 'admin' && data.role !== 'admin') {
              await setDoc(doc(db, 'users', u.uid), cleanObject({ role: 'admin' }), { merge: true });
              setUserRole('admin');
            } else {
              setUserRole(data.role);
            }
          }
        } catch (err) {
          console.error('Error ensuring user document:', err);
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Connection Test
  useEffect(() => {
    if (!isAuthReady) return;
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, [isAuthReady]);

  // Data Listeners
  useEffect(() => {
    if (!isAuthReady || !user) {
      if (!user) {
        setProperties([]);
        setTenants([]);
        setExpenses([]);
        setPayments([]);
        setAgreements([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    
    // If admin, show all data. If tenant, show only owned data.
    const qProps = userRole === 'admin' ? collection(db, 'properties') : query(collection(db, 'properties'), where('ownerId', '==', user.uid));
    const qTenants = userRole === 'admin' ? collection(db, 'tenants') : query(collection(db, 'tenants'), where('ownerId', '==', user.uid));
    const qExpenses = userRole === 'admin' ? collection(db, 'expenses') : query(collection(db, 'expenses'), where('ownerId', '==', user.uid));
    const qPayments = userRole === 'admin' ? collection(db, 'payments') : query(collection(db, 'payments'), where('ownerId', '==', user.uid));
    const qAgreements = userRole === 'admin' ? collection(db, 'agreements') : query(collection(db, 'agreements'), where('ownerId', '==', user.uid));

    const unsubProps = onSnapshot(qProps, (snap) => {
      setProperties(snap.docs.map(d => ({ id: d.id, ...d.data() } as Property)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'properties'));

    const unsubTenants = onSnapshot(qTenants, (snap) => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tenants'));

    const unsubExpenses = onSnapshot(qExpenses, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'expenses'));

    const unsubPayments = onSnapshot(qPayments, (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'payments'));

    const unsubAgreements = onSnapshot(qAgreements, (snap) => {
      setAgreements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Agreement)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'agreements'));

    return () => {
      unsubProps();
      unsubTenants();
      unsubExpenses();
      unsubPayments();
      unsubAgreements();
    };
  }, [isAuthReady, user]);

  // Check for late payments
  useEffect(() => {
    if (!user || payments.length === 0) return;

    const checkLatePayments = async () => {
      const today = new Date();
      for (const p of payments) {
        if (p.status === 'pending') {
          const dueDate = parseISO(p.dueDate);
          if (isBefore(dueDate, today)) {
            // Calculate interest (e.g., 2% fine + 0.33% per day)
            const daysLate = differenceInDays(today, dueDate);
            const interest = (p.amount * 0.02) + (p.amount * 0.0033 * daysLate);
            
            try {
              await updateDoc(doc(db, 'payments', p.id), {
                status: 'late',
                interestAmount: Number(interest.toFixed(2)),
                updatedAt: new Date().toISOString()
              });
            } catch (err) { console.error('Error updating late payment:', err); }
          }
        }
      }
    };

    checkLatePayments();
  }, [user, payments]);

  const sidebarItems = useMemo(() => {
    const pendingCount = payments.filter(p => p.status === 'pending' || p.status === 'late').length;
    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'receivables', label: 'Recebimentos', icon: CheckCircle2, badge: pendingCount > 0 ? pendingCount : null },
      { id: 'properties', label: 'Imóveis', icon: Home },
      { id: 'tenants', label: 'Inquilinos', icon: Users },
      { id: 'financial', label: 'Financeiro', icon: DollarSign },
      { id: 'cloud', label: 'Assistente IA', icon: Sparkles, badge: syncLogs.filter(l => l.status === 'error').length || null },
      { id: 'settings', label: 'Configurações', icon: Settings },
    ];
    
    return items;
  }, [payments, syncLogs]);

  // --- Actions ---
  
  useEffect(() => {
    if (confirmingPayment) {
      setPaymentAmountInput(confirmingPayment.amount);
    } else {
      setPaymentAmountInput(0);
    }
  }, [confirmingPayment]);

  const getNextDueDate = (day: number) => {
    const today = new Date();
    let dueDate = setDate(today, day);
    if (isBefore(dueDate, today)) {
      dueDate = addMonths(dueDate, 1);
    }
    return format(dueDate, 'yyyy-MM-dd');
  };

  const getDepositDueDate = (day: number, monthOffset: number = 0) => {
    const today = new Date();
    let dueDate = setDate(today, day);
    if (monthOffset > 0 || isBefore(dueDate, today)) {
       dueDate = addMonths(dueDate, monthOffset + (isBefore(dueDate, today) && monthOffset === 0 ? 1 : 0));
    }
    return format(dueDate, 'yyyy-MM-dd');
  };

  const addProperty = async (data: Partial<Property>) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'properties'), cleanObject({
        ...data,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // If created as rented with a tenant, update the tenant
      if (data.status === 'rented' && data.currentTenantId) {
        await updateDoc(doc(db, 'tenants', data.currentTenantId), cleanObject({
          status: 'allocated',
          propertyId: docRef.id,
          updatedAt: new Date().toISOString()
        }));

        // Create separate entries for Rent and Deposit
        // 1. Rent
        await addDoc(collection(db, 'payments'), cleanObject({
          propertyId: docRef.id,
          tenantId: data.currentTenantId,
          amount: data.rentValue || 0,
          dueDate: data.paymentDay ? getNextDueDate(data.paymentDay) : format(addDays(new Date(), 30), 'yyyy-MM-dd'),
          status: 'pending',
          ownerId: user.uid,
          type: 'rent',
          description: 'Primeiro Aluguel',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        // 2. Deposit if applicable (need to check tenant data, but usually it's in the formData)
        // Since addProperty logic is also used in the modal, we'll assume the caller passes deposit info if needed
        // For now, these functions are mostly called from the main dashboard or dedicated views.
      }
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'properties'); }
  };

  const updateProperty = async (id: string, data: Partial<Property>) => {
    try {
      const oldProp = properties.find(p => p.id === id);
      await updateDoc(doc(db, 'properties', id), cleanObject({
        ...data,
        updatedAt: new Date().toISOString()
      }));

      // Handle tenant status change if property status changed to rented
      if (data.status === 'rented' && data.currentTenantId) {
        if (oldProp?.currentTenantId !== data.currentTenantId || oldProp?.status !== 'rented') {
          // Update new tenant
          await updateDoc(doc(db, 'tenants', data.currentTenantId), cleanObject({
            status: 'allocated',
            propertyId: id,
            updatedAt: new Date().toISOString()
          }));

          // If there was a previous tenant, update them to waiting
          if (oldProp?.currentTenantId && oldProp.currentTenantId !== data.currentTenantId) {
            await updateDoc(doc(db, 'tenants', oldProp.currentTenantId), {
              status: 'waiting',
              propertyId: '',
              updatedAt: new Date().toISOString()
            });
          }

          // Create initial payment if status changed to rented
          if (oldProp?.status !== 'rented') {
            await addDoc(collection(db, 'payments'), {
              propertyId: id,
              tenantId: data.currentTenantId,
              amount: data.rentValue || oldProp?.rentValue || 0,
              dueDate: data.paymentDay ? getNextDueDate(data.paymentDay) : (oldProp?.paymentDay ? getNextDueDate(oldProp.paymentDay) : format(addDays(new Date(), 30), 'yyyy-MM-dd')),
              status: 'pending',
              ownerId: user?.uid,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
      } else if (data.status !== 'rented' && oldProp?.status === 'rented' && oldProp?.currentTenantId) {
        // Property was rented but now is not, update tenant to waiting
        await updateDoc(doc(db, 'tenants', oldProp.currentTenantId), {
          status: 'waiting',
          propertyId: '',
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `properties/${id}`); }
  };

  const deleteProperty = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este imóvel? Todas as informações vinculadas serão perdidas.')) return;
    setIsSubmitting(true);
    try {
      const property = properties.find(p => p.id === id);
      if (property?.currentTenantId) {
        await updateDoc(doc(db, 'tenants', property.currentTenantId), {
          status: 'waiting',
          propertyId: '',
          updatedAt: new Date().toISOString()
        });
      }
      await deleteDoc(doc(db, 'properties', id));
    } catch (err) { 
      handleFirestoreError(err, OperationType.DELETE, `properties/${id}`); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpense = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'expenses', id));
      toast.success('Despesa excluída com sucesso!');
    } catch (err) { 
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTenant = async (data: Partial<Tenant>) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'tenants'), cleanObject({
        ...data,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // If created as allocated with a property, update the property
      if (data.status === 'allocated' && data.propertyId) {
        const property = properties.find(p => p.id === data.propertyId);
        await updateDoc(doc(db, 'properties', data.propertyId), cleanObject({
          status: 'rented',
          currentTenantId: docRef.id,
          updatedAt: new Date().toISOString()
        }));

        const dueDate = property?.paymentDay ? getNextDueDate(property.paymentDay) : format(addDays(new Date(), 30), 'yyyy-MM-dd');

        // 1. Rent entry (Revenue)
        await addDoc(collection(db, 'payments'), cleanObject({
          propertyId: data.propertyId,
          tenantId: docRef.id,
          amount: property?.rentValue || 0,
          dueDate: dueDate,
          status: 'pending',
          ownerId: user.uid,
          type: 'rent',
          description: 'Primeiro Aluguel',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        // 2. Deposit entries (Guarantee/Liability) if value > 0
        if (data.depositValue && data.depositValue > 0) {
          const installments = data.depositInstallments || 1;
          const installmentAmount = data.depositValue / installments;
          const depositDay = data.depositDay || 10;

          for (let i = 0; i < installments; i++) {
            const dueDate = i === 0 ? format(new Date(), 'yyyy-MM-dd') : getDepositDueDate(depositDay, i);
            
            await addDoc(collection(db, 'payments'), cleanObject({
              propertyId: data.propertyId,
              tenantId: docRef.id,
              amount: installmentAmount,
              dueDate: dueDate,
              status: 'pending',
              depositStatus: 'pending',
              ownerId: user.uid,
              type: 'deposit',
              installmentNumber: i + 1,
              totalInstallments: installments,
              description: installments > 1 ? `Caução (Parcela ${i + 1}/${installments})` : 'Depósito Caução (Garantia)',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }));
          }
        }
      }
      toast.success('Inquilino cadastrado com sucesso!');
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'tenants'); }
  };

  const updateTenant = async (id: string, data: Partial<Tenant>) => {
    try {
      const oldTenant = tenants.find(t => t.id === id);
      await updateDoc(doc(db, 'tenants', id), cleanObject({
        ...data,
        updatedAt: new Date().toISOString()
      }));

      // Handle property status change if tenant status changed to allocated
      if (data.status === 'allocated' && data.propertyId) {
        if (oldTenant?.propertyId !== data.propertyId || oldTenant?.status !== 'allocated') {
          const property = properties.find(p => p.id === data.propertyId);
          // Update new property
          await updateDoc(doc(db, 'properties', data.propertyId), cleanObject({
            status: 'rented',
            currentTenantId: id,
            updatedAt: new Date().toISOString()
          }));

          // If there was a previous property, update it to vacant
          if (oldTenant?.propertyId && oldTenant.propertyId !== data.propertyId) {
            await updateDoc(doc(db, 'properties', oldTenant.propertyId), cleanObject({
              status: 'vacant',
              currentTenantId: '',
              updatedAt: new Date().toISOString()
            }));
          }

          // Create initial payment if status changed to allocated
          if (oldTenant?.status !== 'allocated') {
            const dueDate = property?.paymentDay ? getNextDueDate(property.paymentDay) : format(addDays(new Date(), 30), 'yyyy-MM-dd');

            // 1. Rent entry
            await addDoc(collection(db, 'payments'), cleanObject({
              propertyId: data.propertyId,
              tenantId: id,
              amount: property?.rentValue || 0,
              dueDate: dueDate,
              status: 'pending',
              ownerId: user?.uid,
              type: 'rent',
              description: 'Primeiro Aluguel',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }));

            // 2. Deposit entry if exists
            if (data.depositValue && data.depositValue > 0) {
              const installments = data.depositInstallments || 1;
              const installmentAmount = data.depositValue / installments;
              const depositDay = data.depositDay || 10;

              for (let i = 0; i < installments; i++) {
                const dueDate = i === 0 ? format(new Date(), 'yyyy-MM-dd') : getDepositDueDate(depositDay, i);

                await addDoc(collection(db, 'payments'), cleanObject({
                  propertyId: data.propertyId,
                  tenantId: id,
                  amount: installmentAmount,
                  dueDate: dueDate,
                  status: 'pending',
                  depositStatus: 'pending',
                  ownerId: user?.uid,
                  type: 'deposit',
                  installmentNumber: i + 1,
                  totalInstallments: installments,
                  description: installments > 1 ? `Caução (Parcela ${i + 1}/${installments})` : 'Depósito Caução (Garantia)',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }));
              }
            }
          }
        }
      } else if (data.status !== 'allocated' && oldTenant?.status === 'allocated' && oldTenant?.propertyId) {
        // Tenant was allocated but now is not, update property to vacant
        await updateDoc(doc(db, 'properties', oldTenant.propertyId), cleanObject({
          status: 'vacant',
          currentTenantId: '',
          updatedAt: new Date().toISOString()
        }));
      }
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `tenants/${id}`); }
  };

  const handleAddAgreement = async () => {
    if (!user || !agreementForm.tenantId) return;
    setIsSubmitting(true);

    try {
      const tenant = tenants.find(t => t.id === agreementForm.tenantId);
      if (!tenant) return;

      const duration = agreementForm.durationMonths || 1;
      const totalAmount = agreementForm.totalAmount || 0;
      const installmentAmount = totalAmount / duration;
      const batch = writeBatch(db);

      if (agreementForm.id) {
        // Update existing agreement
        const agreementRef = doc(db, 'agreements', agreementForm.id);
        batch.update(agreementRef, cleanObject({
          tenantId: agreementForm.tenantId,
          propertyId: tenant.propertyId || '',
          description: agreementForm.description,
          totalAmount,
          installmentAmount,
          durationMonths: duration,
          startDate: agreementForm.startDate,
          justification: agreementForm.justification,
          evidence: agreementForm.evidence,
          evidenceName: agreementForm.evidenceName,
          evidenceLocation: agreementForm.evidenceLocation,
          updatedAt: new Date().toISOString()
        }));

        // Handle payments: delete non-paid and recreate them based on new duration/start date
        const paidPayments = payments.filter(p => p.agreementId === agreementForm.id && (p.status === 'paid' || p.status === 'partial'));
        const paidCount = paidPayments.length;
        const toDeletePayments = payments.filter(p => p.agreementId === agreementForm.id && (p.status === 'pending' || p.status === 'late'));
        
        // Update descriptions of PAID payments to keep consistency
        for (const p of paidPayments) {
          if (p.id) {
            const pRef = doc(db, 'payments', p.id);
            const installmentIndex = p.description?.match(/\((\d+)\//)?.[1] || '1';
            batch.update(pRef, {
              description: `${agreementForm.description} (${installmentIndex}/${duration})`,
              updatedAt: new Date().toISOString()
            });
          }
        }

        // Delete old pending/late payments
        for (const p of toDeletePayments) {
          if (p.id) {
            const pRef = doc(db, 'payments', p.id);
            batch.delete(pRef);
          }
        }

        // Create new pending payments
        const startDate = parseISO(agreementForm.startDate || format(new Date(), 'yyyy-MM-dd'));
        const newPaymentDay = startDate.getDate();

        // Sync with property if it's a rent-related agreement or if requested
        if (tenant.propertyId) {
          const propRef = doc(db, 'properties', tenant.propertyId);
          const isRentRelated = agreementForm.description?.toLowerCase().includes('aluguel');
          
          if (isRentRelated) {
            batch.update(propRef, {
              paymentDay: newPaymentDay,
              rentValue: installmentAmount,
              updatedAt: new Date().toISOString()
            });
          }
        }

        for (let i = paidCount; i < duration; i++) {
          const dueDate = addMonths(startDate, i);
          const newPaymentRef = doc(collection(db, 'payments'));
          batch.set(newPaymentRef, {
            propertyId: tenant.propertyId || '',
            tenantId: agreementForm.tenantId,
            amount: installmentAmount,
            dueDate: format(dueDate, 'yyyy-MM-dd'),
            status: 'pending',
            ownerId: user.uid,
            type: 'agreement',
            description: `${agreementForm.description} (${i + 1}/${duration})`,
            agreementId: agreementForm.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        
        await batch.commit();
        toast.success('Acordo atualizado com sucesso!');
      } else {
        // 1. Create the agreement document
        const agreementRef = doc(collection(db, 'agreements'));
        batch.set(agreementRef, cleanObject({
          tenantId: agreementForm.tenantId,
          propertyId: tenant.propertyId || '',
          description: agreementForm.description,
          totalAmount,
          installmentAmount,
          durationMonths: duration,
          startDate: agreementForm.startDate,
          status: 'active',
          evidence: agreementForm.evidence,
          evidenceName: agreementForm.evidenceName,
          evidenceLocation: agreementForm.evidenceLocation,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        // 2. Generate recurring payments
        const startDate = parseISO(agreementForm.startDate || format(new Date(), 'yyyy-MM-dd'));
        const newPaymentDay = startDate.getDate();

        // Sync with property if it's a rent-related agreement
        if (tenant.propertyId) {
          const propRef = doc(db, 'properties', tenant.propertyId);
          const isRentRelated = agreementForm.description?.toLowerCase().includes('aluguel');
          
          if (isRentRelated) {
            batch.update(propRef, cleanObject({
              paymentDay: newPaymentDay,
              rentValue: installmentAmount,
              updatedAt: new Date().toISOString()
            }));
          }
        }
        
        for (let i = 0; i < duration; i++) {
          const dueDate = addMonths(startDate, i);
          const newPaymentRef = doc(collection(db, 'payments'));
          batch.set(newPaymentRef, cleanObject({
            propertyId: tenant.propertyId || '',
            tenantId: agreementForm.tenantId,
            amount: installmentAmount,
            dueDate: format(dueDate, 'yyyy-MM-dd'),
            status: 'pending',
            ownerId: user.uid,
            type: 'agreement',
            description: `${agreementForm.description} (${i + 1}/${duration})`,
            agreementId: agreementRef.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
        }
        
        await batch.commit();
        toast.success('Acordo criado com sucesso!');
      }

      setIsAgreementModalOpen(false);
      setAgreementForm({
        tenantId: '',
        description: '',
        totalAmount: 0,
        installmentAmount: 0,
        durationMonths: 1,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        justification: '',
        evidence: '',
        evidenceName: '',
        evidenceLocation: '',
        thumbnailLink: ''
      });
    } catch (err) {
      handleFirestoreError(err, agreementForm.id ? OperationType.UPDATE : OperationType.CREATE, 'agreements');
    } finally {
      setIsSubmitting(false);
    }
  };

  const archiveAgreement = async (agreement: Agreement, justification: string, action: 'archived' | 'deleted') => {
    if (!user || !agreement.id) return;
    setIsSubmitting(true);

    try {
      // 1. Update agreement status
      await updateDoc(doc(db, 'agreements', agreement.id), cleanObject({
        status: action,
        justification,
        updatedAt: new Date().toISOString()
      }));

      // 2. Cancel pending payments linked to this agreement
      const pendingPayments = payments.filter(p => p.agreementId === agreement.id && p.status === 'pending');
      for (const p of pendingPayments) {
        if (p.id) {
          await updateDoc(doc(db, 'payments', p.id), cleanObject({
            status: 'cancelled',
            observations: `Acordo ${action === 'archived' ? 'arquivado' : 'excluído'}: ${justification}`,
            updatedAt: new Date().toISOString()
          }));
        }
      }

      setIsArchiveAgreementModalOpen(false);
      setArchivingAgreement(null);
      setArchiveJustification('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `agreements/${agreement.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSystemData = async () => {
    if (!user) return;
    
    if (resetConfirmText !== user.email) {
      alert('Para confirmar o reset, digite seu e-mail exatamente como aparece no sistema.');
      return;
    }

    setLoading(true);
    try {
      const collections = ['properties', 'tenants', 'expenses', 'payments', 'agreements'];
      
      for (const collName of collections) {
        const q = query(collection(db, collName), where('ownerId', '==', user.uid));
        const snap = await getDocs(q);
        
        const deletePromises = snap.docs.map(d => deleteDoc(doc(db, collName, d.id)));
        await Promise.all(deletePromises);
      }
      
      alert('Sistema resetado com sucesso! Todos os dados foram removidos.');
      setIsResetModalOpen(false);
      setResetConfirmText('');
      setActiveTab('dashboard');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'system-reset');
    } finally {
      setLoading(false);
    }
  };

  const deleteTenant = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este inquilino?')) return;
    setIsSubmitting(true);
    try {
      const property = properties.find(p => p.currentTenantId === id);
      if (property) {
        await updateDoc(doc(db, 'properties', property.id), {
          status: 'vacant',
          currentTenantId: '',
          updatedAt: new Date().toISOString()
        });
      }
      await deleteDoc(doc(db, 'tenants', id));
    } catch (err) { 
      handleFirestoreError(err, OperationType.DELETE, `tenants/${id}`); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const addExpense = async (data: Partial<Expense>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'expenses'), cleanObject({
        ...data,
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      }));
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'expenses'); }
  };

  const addPayment = async (data: Partial<Payment>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'payments'), cleanObject({
        ...data,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'payments'); }
  };

  const markPaymentAsPaid = async (paymentId: string, paidAmount?: number, receiptUrl?: string, evidenceName?: string, evidenceLocation?: string, remainderDueDate?: string, remainderObservations?: string, thumbnailLink?: string) => {
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;

      const isPartial = paidAmount !== undefined && paidAmount < payment.amount;
      const amountToPay = paidAmount !== undefined ? paidAmount : payment.amount;

      // Update current payment as paid (or partial)
      await updateDoc(doc(db, 'payments', paymentId), cleanObject({
        status: isPartial ? 'partial' : 'paid',
        amount: amountToPay, // Update total amount to what was actually paid
        paidAmount: amountToPay,
        paidDate: new Date().toISOString(),
        receiptUrl: receiptUrl || null,
        evidenceName: evidenceName || null,
        evidenceLocation: evidenceLocation || null,
        thumbnailLink: thumbnailLink || null,
        updatedAt: new Date().toISOString()
      }));

      // If partial, create a new pending payment for the remainder
      if (isPartial) {
        const remainder = payment.amount - amountToPay;
        const originalAmountForRemainder = payment.amount;
        
        // Extract part number if exists to increment it
        const partMatch = payment.description?.match(/(\d+)ª parte/);
        const nextPart = partMatch ? parseInt(partMatch[1]) + 1 : 2;
        
        // Clean up base description
        const baseDescription = payment.description
          ?.replace(/^Restante:\s*/, '')
          ?.replace(/\s*\(\d+ª parte de R\$.*?\)/, '') || 'Aluguel';
          
        const newDescription = `Restante: ${baseDescription} (${nextPart}ª parte de R$ ${originalAmountForRemainder.toLocaleString()})`;

        await addDoc(collection(db, 'payments'), cleanObject({
          propertyId: payment.propertyId,
          tenantId: payment.tenantId,
          amount: remainder,
          dueDate: remainderDueDate || payment.dueDate,
          status: 'pending',
          ownerId: payment.ownerId,
          type: payment.type || 'rent',
          description: newDescription,
          observations: `Pagamento parcial de R$ ${amountToPay.toLocaleString()} realizado em ${format(new Date(), 'dd/MM/yyyy')}.${remainderObservations ? ' Obs: ' + remainderObservations : ''}`,
          agreementId: payment.agreementId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        toast.success(`Pagamento parcial de R$ ${amountToPay.toLocaleString()} confirmado! O restante de R$ ${remainder.toLocaleString()} foi gerado como ${nextPart}ª parte.`);
      } else {
        toast.success('Pagamento confirmado com sucesso!');
      }
    } catch (err) { 
      handleFirestoreError(err, OperationType.UPDATE, `payments/${paymentId}`);
      toast.error('Erro ao confirmar pagamento.');
    }
  };

  const revertPayment = async (paymentId: string, reason: string) => {
    if (!user) return;
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;

      const dueDate = parseISO(payment.dueDate);
      const today = new Date();
      const newStatus = isBefore(dueDate, today) ? 'late' : 'pending';

      await updateDoc(doc(db, 'payments', paymentId), cleanObject({
        status: newStatus,
        paidDate: null,
        receiptUrl: null,
        revertReason: reason,
        updatedAt: new Date().toISOString()
      }));
      toast.success('Pagamento revertido com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payments/${paymentId}`);
      toast.error('Erro ao reverter pagamento.');
    }
  };

  const removeTenantFromProperty = async (propertyId: string, tenantId: string, action: 'waiting' | 'archived' | 'delete') => {
    setRemoveTenantData({ propertyId, tenantId, action });
    setSettlementAmount(0);
    setSettlementType('extra');
    setIsRemoveTenantModalOpen(true);
  };

  const confirmRemoveTenant = async () => {
    if (!removeTenantData || !user) return;
    
    executeWithSecurity(async () => {
      const { propertyId, tenantId, action } = removeTenantData;

      try {
        // 1. Update Property to vacant
        await updateDoc(doc(db, 'properties', propertyId), {
          status: 'vacant',
          currentTenantId: '',
          updatedAt: new Date().toISOString()
        });

        // 2. Update or Delete Tenant
        if (action === 'delete') {
          await deleteDoc(doc(db, 'tenants', tenantId));
        } else {
          await updateDoc(doc(db, 'tenants', tenantId), {
            status: action,
            propertyId: '',
            updatedAt: new Date().toISOString()
          });
        }

        // 3. Cancel pending payments for this tenant and property
        const pendingPayments = payments.filter(p => 
          p.tenantId === tenantId && 
          p.propertyId === propertyId && 
          (p.status === 'pending' || p.status === 'late')
        );

        for (const p of pendingPayments) {
          if (p.id) {
            await updateDoc(doc(db, 'payments', p.id), {
              status: 'cancelled',
              updatedAt: new Date().toISOString()
            });
          }
        }

        // 4. Handle settlement payment if any
        if (settlementAmount > 0) {
          const finalAmount = settlementType === 'extra' ? settlementAmount : -settlementAmount;
          await addDoc(collection(db, 'payments'), {
            propertyId,
            tenantId,
            amount: finalAmount,
            dueDate: format(new Date(), 'yyyy-MM-dd'),
            paidDate: new Date().toISOString(),
            status: 'paid',
            ownerId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            observations: `Acerto final: ${settlementType === 'extra' ? 'Pagamento extra' : 'Desconto/Devolução'}`
          });
        }

        setIsRemoveTenantModalOpen(false);
        setRemoveTenantData(null);
      } catch (err) { 
        handleFirestoreError(err, OperationType.UPDATE, `properties/${propertyId}`); 
      }
    });
  };

  const DepositManager = ({ tenant, payments, onUpdatePayment }: { tenant: Tenant; payments: Payment[]; onUpdatePayment: (id: string, data: Partial<Payment>) => Promise<void> }) => {
    const depositPayments = payments.filter(p => p.tenantId === tenant.id && p.type === 'deposit' && p.status !== 'cancelled');
    
    const [isAbating, setIsAbating] = useState(false);
    const [abatementForm, setAbatementForm] = useState({ amount: 0, reason: '' });

    if (depositPayments.length === 0) return null;

    const totalAgreed = depositPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalReceived = depositPayments
      .filter(p => p.status === 'paid')
      .reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);
    
    // Usage is usually stored in one of the payments (the first one by convention now)
    // but let's look for usage in all of them to be safe
    const allUsages = depositPayments.flatMap(p => p.depositUsage || []);
    const usedAmount = allUsages.reduce((acc, u) => acc + u.amount, 0);
    
    const currentBalance = totalReceived - usedAmount;
    const pendingAmount = totalAgreed - totalReceived;

    const masterDeposit = depositPayments[0]; // Master for status tracking

    const handleAbate = async () => {
      if (!abatementForm.reason || abatementForm.amount <= 0) {
        toast.error('Informe o motivo e um valor válido.');
        return;
      }
      if (abatementForm.amount > currentBalance) {
        toast.error('Valor superior ao saldo atualmente recebido.');
        return;
      }

      const newUsage = {
        id: crypto.randomUUID(),
        amount: abatementForm.amount,
        reason: abatementForm.reason,
        date: new Date().toISOString(),
        userName: user?.email || 'Sistema',
        timestamp: new Date()
      };

      // We'll add the usage to the first paid payment found
      const firstPaid = depositPayments.find(p => p.status === 'paid');
      if (!firstPaid) return;

      const updatedUsage = [...(firstPaid.depositUsage || []), newUsage];

      try {
        await onUpdatePayment(firstPaid.id!, {
          depositUsage: updatedUsage,
          depositStatus: 'partially_used',
          updatedAt: new Date().toISOString()
        });
        toast.success('Abatimento registrado com sucesso!');
        setIsAbating(false);
        setAbatementForm({ amount: 0, reason: '' });
      } catch (err) {
        console.error(err);
      }
    };

    const handleRefund = async () => {
      if (!window.confirm(`Deseja devolver o saldo de R$ ${currentBalance.toLocaleString()}?`)) return;
      try {
        // Mark all paid deposit payments as refunded
        for (const p of depositPayments.filter(p => p.status === 'paid')) {
          await onUpdatePayment(p.id!, {
            depositStatus: 'refunded',
            updatedAt: new Date().toISOString()
          });
        }
        toast.success('Caução marcado como devolvido!');
      } catch (err) {
        console.error(err);
      }
    };

    const allRefunded = depositPayments.every(p => p.depositStatus === 'refunded');

    return (
      <div className="space-y-4 mb-6">
        <div className="p-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Acordo de Caução (Garantia)</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">Valores retidos conforme Lei 8.245/91</p>
              </div>
            </div>
            <div className={cn(
              "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest",
              allRefunded ? "bg-slate-100 text-slate-500" :
              totalReceived === totalAgreed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            )}>
              {allRefunded ? 'DEVOLVIDO' : totalReceived === totalAgreed ? 'TOTALMENTE PAGO' : 'PAGAMENTO EM CURSO'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100/50 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Acordado</p>
              <p className="text-lg font-black text-slate-700">R$ {totalAgreed.toLocaleString()}</p>
            </div>
            <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100/50 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Já Recebido</p>
              <p className="text-lg font-black text-emerald-700">R$ {totalReceived.toLocaleString()}</p>
            </div>
            <div className={cn(
              "p-5 rounded-3xl border flex flex-col items-center justify-center text-center transition-all",
              currentBalance > 0 ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-100" : "bg-slate-100 border-slate-200 text-slate-400"
            )}>
              <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", currentBalance > 0 ? "text-indigo-100" : "text-slate-400")}>Saldo Disponível</p>
              <p className="text-lg font-black">R$ {currentBalance.toLocaleString()}</p>
            </div>
          </div>

          {/* Installments List */}
          <div className="space-y-3 mb-8">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cronograma de Pagamento</h5>
            <div className="space-y-2">
              {depositPayments.sort((a, b) => a.installmentNumber! - b.installmentNumber!).map(p => (
                <div key={p.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black",
                      p.status === 'paid' ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-600"
                    )}>
                      {p.installmentNumber || 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Parcela {p.installmentNumber}/{p.totalInstallments || 1}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Vencimento: {format(parseISO(p.dueDate), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-black text-slate-800">R$ {p.amount.toLocaleString()}</p>
                    <div className={cn(
                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase",
                      p.status === 'paid' ? "bg-emerald-100 text-emerald-600" : 
                      p.status === 'late' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {p.status === 'paid' ? 'PAGO' : p.status === 'late' ? 'ATRASADO' : 'PENDENTE'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {pendingAmount > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                  Atenção: Restam R$ {pendingAmount.toLocaleString()} para quitação total da caução. 
                  <span className="block italic font-normal normal-case opacity-70">O saldo disponível para abatimentos é composto apenas por valores já recebidos.</span>
                </p>
              </div>
            )}
          </div>

          {!isAbating ? (
            <div className="flex items-center gap-3">
              {!allRefunded && (
                <>
                  <Button 
                    onClick={() => setIsAbating(true)}
                    disabled={currentBalance <= 0}
                    className="flex-1 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm"
                    variant="outline"
                  >
                    <MinusCircle className="w-4 h-4 mr-2 text-rose-500" /> Abater Saldo
                  </Button>
                  <Button 
                    onClick={handleRefund}
                    disabled={totalReceived === 0}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                  >
                    <Undo2 className="w-4 h-4 mr-2" /> Devolver Garantia
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-200 shadow-xl max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Utilizar Saldo da Caução</h5>
                <X className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => setIsAbating(false)} />
              </div>
              <div className="space-y-4">
                <CurrencyInput 
                  label="Valor a Abater" 
                  id="abateAmount"
                  value={abatementForm.amount} 
                  onChange={v => setAbatementForm({...abatementForm, amount: v})} 
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Motivo</label>
                  <select 
                    value={abatementForm.reason}
                    onChange={e => setAbatementForm({...abatementForm, reason: e.target.value})}
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
                  >
                    <option value="">SELECIONE O MOTIVO...</option>
                    <option value="Danos ao imóvel">DANOS AO IMÓVEL</option>
                    <option value="Reparos pendentes">REPAROS PENDENTES</option>
                    <option value="Pendência Financeira">PENDÊNCIA FINANCEIRA</option>
                    <option value="Quebra de contrato">QUEBRA DE CONTRATO</option>
                    <option value="Outros">OUTROS</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={() => setIsAbating(false)} variant="outline" className="flex-1 h-11 rounded-xl text-[10px] font-bold">CANCELAR</Button>
                <Button onClick={handleAbate} className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase shadow-lg shadow-indigo-600/20">CONFIRMAR ABATIMENTO</Button>
              </div>
            </div>
          )}
        </div>

        {allUsages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de Movimentação</h5>
              <div className="h-[1px] flex-1 bg-slate-100 mx-4" />
            </div>
            <div className="space-y-2">
              {allUsages.slice().sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map(usage => (
                <div key={entry_usage_id(usage)} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-rose-100 transition-colors shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-50 text-rose-500 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-all">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider">{usage.reason}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">{format(parseISO(usage.date), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-rose-600">- R$ {usage.amount.toLocaleString()}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">{usage.userName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const entry_usage_id = (u: any) => u.id || Math.random().toString();

  const updatePaymentRecord = async (id: string, data: Partial<Payment>) => {
    try {
      await updateDoc(doc(db, 'payments', id), {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payments/${id}`);
    }
  };

  // --- Render Helpers ---
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <HomeView properties={properties} tenants={tenants} payments={payments} expenses={expenses} agreements={agreements} onConfirmPayment={redirectToReceivables} onOpenTenantDetail={handleOpenTenantDetail} />;
      case 'properties':
        return <PropertiesView properties={properties} tenants={tenants} payments={payments} addProperty={addProperty} updateProperty={updateProperty} deleteProperty={deleteProperty} removeTenantFromProperty={removeTenantFromProperty} onSecurityCheck={executeWithSecurity} />;
      case 'tenants':
        return (
          <TenantsView 
            tenants={tenants} 
            properties={properties} 
            payments={payments} 
            addTenant={addTenant} 
            updateTenant={updateTenant} 
            deleteTenant={deleteTenant} 
            onOpenDetail={handleOpenTenantDetail} 
            onSecurityCheck={executeWithSecurity} 
            isDriveConnected={isDriveConnected}
            uploadToDrive={uploadToDrive}
            setPreviewReceipt={setPreviewReceipt}
          />
        );
      case 'receivables':
        return (
          <ReceivablesView 
            properties={properties} 
            tenants={tenants} 
            payments={payments} 
            agreements={agreements} 
            setConfirmingPayment={setConfirmingPayment} 
            setIsPaymentModalOpen={setIsPaymentModalOpen} 
            onOpenTenantDetail={handleOpenTenantDetail}
            highlightedPaymentId={highlightedPaymentId}
            setHighlightedPaymentId={setHighlightedPaymentId}
            isDriveConnected={isDriveConnected}
            uploadToDrive={uploadToDrive}
          />
        );
      case 'financial':
        return (
          <FinancialView 
            properties={properties} 
            tenants={tenants} 
            payments={payments} 
            expenses={expenses} 
            agreements={agreements}
            addExpense={addExpense} 
            deleteExpense={deleteExpense}
            addPayment={addPayment} 
            markPaymentAsPaid={markPaymentAsPaid} 
            setIsAgreementModalOpen={setIsAgreementModalOpen}
            onConfirmPayment={redirectToReceivables}
            setArchivingAgreement={setArchivingAgreement}
            setIsArchiveAgreementModalOpen={setIsArchiveAgreementModalOpen}
            setIsRevertModalOpen={setIsRevertModalOpen}
            setRevertingPayment={setRevertingPayment}
            onOpenTenantDetail={handleOpenTenantDetail}
            isDriveConnected={isDriveConnected}
            uploadToDrive={uploadToDrive}
            setPreviewReceipt={setPreviewReceipt}
          />
        );
      case 'settings':
        return (
          <SettingsView 
            user={user} 
            setIsResetModalOpen={setIsResetModalOpen} 
            agreements={agreements}
            properties={properties}
            tenants={tenants}
            setAgreementForm={setAgreementForm}
            setIsAgreementModalOpen={setIsAgreementModalOpen}
            setArchivingAgreement={setArchivingAgreement}
            setIsArchiveAgreementModalOpen={setIsArchiveAgreementModalOpen}
            securityPassword={securityPassword}
            setSecurityPassword={updateSecurityPassword}
            isDriveConnected={isDriveConnected}
            driveError={driveError}
            onConnectDrive={handleConnectDrive}
            onDisconnectDrive={handleDisconnectDrive}
            setPreviewReceipt={setPreviewReceipt}
          />
        );
      case 'cloud':
        return (
          <AssistantCentral 
            properties={properties}
            tenants={tenants}
            payments={payments}
            expenses={expenses}
            agreements={agreements}
            isDriveConnected={isDriveConnected}
            driveError={driveError}
            onConnectDrive={handleConnectDrive}
            syncLogs={syncLogs}
            uploadToDrive={uploadToDrive}
            setPreviewReceipt={setPreviewReceipt}
            user={user}
            addProperty={addProperty}
            addTenant={addTenant}
          />
        );
      case 'help':
        return <HelpView />;
      default:
        return <HomeView properties={properties} tenants={tenants} payments={payments} expenses={expenses} agreements={agreements} onConfirmPayment={redirectToReceivables} onOpenTenantDetail={handleOpenTenantDetail} />;
    }
  };

  if (!isAuthReady) return <div className="h-screen flex items-center justify-center"><Clock className="animate-spin text-indigo-500 w-12 h-12" /></div>;

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-md bg-white/5 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 text-center space-y-8 relative z-10"
        >
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4 drop-shadow-2xl">
            <LogoSVG className="w-24 h-24" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">
              <span className="text-emerald-400">GERENTE</span> <span className="text-indigo-400">IMOBILIÁRIO</span>
            </h1>
            <p className="text-slate-400 font-medium tracking-tight">Controle total dos seus imóveis. <span className="text-[10px] opacity-30">v4.1.1</span></p>
          </div>
          <div className="bg-white/5 p-2 rounded-2xl border border-white/5 shadow-inner">
            <Auth key="login-form" user={user} />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* PWA Installation Assistant Modal */}
      <Modal 
        isOpen={showPwaGuide} 
        onClose={() => setShowPwaGuide(false)} 
        title="Assistente de Instalação PWA v4.1.1"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-[2rem] shadow-inner mb-2">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg shrink-0">
               <LogoSVG className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-indigo-900 tracking-tight leading-4">Agente de Suporte</h3>
              <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-widest mt-1">Monitoramento Ativo</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              Olá! Identifiquei que você está acessando pelo navegador. Para uma experiência completa de **Gerente Imobiliário**, instale nosso aplicativo nativo.
            </p>

            <div className="grid gap-3">
              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Monitor className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800">Android / Chrome</span>
                </div>
                <p className="text-xs text-slate-500">1. Clique no botão azul **"Instalar Aplicativo"** abaixo.<br/>2. Ou clique nos <span className="font-extrabold">3 pontos</span> do navegador e escolha <span className="font-extrabold underline">"Instalar aplicativo"</span>.</p>
              </div>

              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800">iOS / Safari (iPhone)</span>
                </div>
                <p className="text-xs text-slate-500">1. Toque no botão de **Compartilhar** (ícone do quadrado com seta pra cima).<br/>2. Role para baixo e selecione <span className="font-extrabold underline">"Adicionar à Tela de Início"</span>.</p>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              {isInstallable ? (
                <Button 
                  onClick={() => {
                    handleInstallClick();
                  }}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base shadow-xl rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <Download className="w-6 h-6" /> INSTALAR AGORA
                </Button>
              ) : (
                <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center gap-3">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                   <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Aguardando gatilho do navegador...</span>
                </div>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => setShowPwaGuide(false)} 
                className="w-full py-3 rounded-xl text-slate-400 border-slate-200"
              >
                Talvez depois
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Floating Installation Assistant Toggle */}
      {!window.matchMedia('(display-mode: standalone)').matches && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowPwaGuide(true)}
          className="fixed bottom-24 right-6 md:bottom-32 md:right-10 z-[60] w-14 h-14 bg-indigo-600 text-white rounded-full shadow-[0_10px_40px_rgba(79,70,229,0.4)] flex items-center justify-center group"
          title="Assistente de Instalação"
        >
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
             <span className="text-[10px] font-black leading-none">1</span>
          </div>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <Download className="w-6 h-6" />
          </motion.div>
          <div className="absolute right-full mr-4 bg-slate-900 text-white px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-bold opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none">
             Instalar Aplicativo Nativo
          </div>
        </motion.button>
      )}

      {/* Receipt Preview Modal */}
      <Modal 
        isOpen={!!previewReceipt} 
        onClose={() => setPreviewReceipt(null)} 
        title={previewReceipt?.name || 'Visualização de Recibo'}
      >
        <div className="relative w-full h-[70vh] flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden">
          {previewReceipt?.isImage ? (
            <img 
              src={previewReceipt.url} 
              alt={previewReceipt.name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <iframe 
              src={getGoogleDrivePreviewUrl(previewReceipt?.url)} 
              className="w-full h-full border-none bg-white"
              title="Document Preview"
            />
          )}
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <a 
              href={previewReceipt?.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-white text-slate-900 rounded-full text-sm font-bold shadow-xl flex items-center gap-2 hover:bg-slate-100 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Abrir Original
              {isGoogleDriveLink(previewReceipt?.url) && <Cloud className="w-4 h-4 ml-1 text-emerald-500" />}
            </a>
          </div>
        </div>
      </Modal>

      <Toaster position="top-right" richColors />
      
      {/* Mobile Top Header (Only visible on mobile) */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 w-6 h-6">
              <LogoSVG className="w-full h-full drop-shadow-sm" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base tracking-tight text-[#0f4a34] leading-none">GERENTE</span>
              <span className="text-[7px] font-bold text-[#64a51e] uppercase tracking-widest">IMOBILIÁRIO</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('cloud')}
            className={cn(
              "p-2 rounded-xl transition-all active:scale-95",
              isDriveConnected ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400 bg-slate-800/50"
            )}
            title="Central Cloud"
          >
            {isDriveConnected ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Responsive Navigation Overlay for Mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 pointer-events-auto cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Unified Sidebar (Desktop & Mobile - Floating Capsule) */}
      <aside 
        className={cn(
          "fixed z-50 flex flex-col items-center py-6 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group",
          // Floating layout adjustments: "curtinho" and floating
          "bg-white rounded-[2rem] border border-slate-100",
          "top-4 bottom-4 md:top-1/2 md:-translate-y-1/2 md:h-fit md:bottom-auto h-[calc(100dvh-2rem)]", 
          // Mobile state
          isMobileMenuOpen ? "left-4 translate-x-0" : "-left-4 -translate-x-[110%] md:translate-x-0 md:left-4",
          // Width: 75vw on mobile (approx 70% screen shown), 20 space on desktop
          "w-[75vw] max-w-[280px] md:w-20 md:hover:w-64 overflow-hidden" 
        )}
      >
        <div className="w-full px-4 md:px-5 flex flex-col gap-6 h-full">
          {/* Logo / Header Section */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex shrink-0 w-8 h-8 drop-shadow-md">
              <LogoSVG className="w-full h-full" />
            </div>
            <div className="flex flex-col md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap">
              <span className="font-black text-xl tracking-tight text-[#0f4a34] leading-none">GERENTE</span>
              <span className="text-[10px] font-bold text-[#64a51e] uppercase tracking-[0.2em]">IMOBILIÁRIO</span>
            </div>
            
            {/* Mobile close button */}
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden ml-auto p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Area */}
          <nav className="flex-1 flex flex-col gap-1.5 relative overflow-y-auto no-scrollbar">
            {sidebarItems.map((item, index) => {
              const isActive = activeTab === item.id;
              
              return (
                <div key={item.id} className="relative w-full">
                  {/* The Background Pill for Active State */}
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-emerald-500 rounded-2xl shadow-[0_8px_16px_rgba(16,185,129,0.3)] z-0"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  
                  <button
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "group/btn relative w-full flex items-center px-4 md:px-0 py-3.5 md:py-3 md:justify-center rounded-2xl transition-colors duration-200 z-10",
                      isActive 
                        ? "text-white" 
                        : "text-slate-500 hover:bg-slate-100/60 hover:text-slate-800"
                    )}
                  >
                    <div className="flex w-full md:w-auto md:group-hover:w-full items-center gap-4 transition-all duration-300 md:justify-start">
                      <div className="flex justify-center items-center shrink-0 w-8 md:w-10">
                         <item.icon className={cn("w-5 h-5 md:w-[22px] md:h-[22px] transition-colors", isActive ? "text-white" : "group-hover/btn:text-emerald-500")} />
                      </div>
                      
                      <span className={cn(
                        "text-sm font-bold whitespace-nowrap transition-all duration-300 flex-1 text-left",
                        "md:opacity-0 md:-translate-x-4 md:absolute md:left-14 md:group-hover:opacity-100 md:group-hover:translate-x-0 md:group-hover:relative md:group-hover:left-0",
                        !isActive && "group-hover/btn:text-slate-800"
                      )}>
                        {item.label}
                      </span>

                      {item.badge && (
                        <span className={cn(
                          "shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shadow-sm transition-all duration-300",
                          "md:opacity-0 md:-translate-x-2 md:absolute md:right-0 md:group-hover:opacity-100 md:group-hover:translate-x-0 md:group-hover:relative md:group-hover:left-0",
                          isActive ? "bg-white text-emerald-600" : "bg-emerald-100 text-emerald-600"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Bottom Actions area */}
          <div className="mt-auto pt-4 pb-2 space-y-4 shrink-0 border-t border-slate-100">
             <div className="w-full flex md:justify-center md:group-hover:justify-start md:px-0 transition-all">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img 
                      src={user?.photoURL || 'https://ui-avatars.com/api/?name=' + user?.email + '&background=10b981&color=fff'} 
                      alt="User" 
                      className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-slate-200 border-2 border-white shadow-sm object-cover" 
                    />
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                       <CheckCircle2 className="w-2 h-2 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:opacity-0 md:hidden md:group-hover:flex md:group-hover:opacity-100 transition-all duration-300 overflow-hidden whitespace-nowrap">
                     <p className="text-xs font-bold text-slate-800 truncate w-32">{user?.displayName || 'Usuário'}</p>
                     <p className="text-[10px] font-medium text-slate-500 truncate w-32">{user?.email}</p>
                  </div>
                </div>
             </div>
             
             <button
               onClick={() => { setActiveTab('help'); setIsMobileMenuOpen(false); }}
               className="w-full flex items-center gap-4 px-4 md:px-0 py-3 md:justify-center rounded-2xl text-slate-500 hover:bg-slate-100/60 hover:text-slate-800 transition-all duration-300"
             >
                <div className="flex justify-center items-center shrink-0 w-8 md:w-10">
                   <HelpCircle className="w-5 h-5 md:w-[22px] md:h-[22px] group-hover:text-emerald-500 transition-colors" />
                </div>
                <span className="text-sm font-bold whitespace-nowrap md:opacity-0 md:-translate-x-4 md:absolute md:group-hover:opacity-100 md:group-hover:translate-x-0 md:group-hover:relative transition-all duration-300 text-left w-full">
                  Ajuda e Suporte
                </span>
             </button>

             {isInstallable && (
               <button
                 onClick={handleInstallClick}
                 className="w-full flex items-center gap-4 px-4 md:px-0 py-3 md:justify-center rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-300 shadow-md group/installbtn"
               >
                  <div className="flex justify-center items-center shrink-0 w-8 md:w-10">
                     <Download className="w-5 h-5 md:w-[22px] md:h-[22px] text-white transition-colors" />
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap md:opacity-0 md:-translate-x-4 md:absolute md:group-hover:opacity-100 md:group-hover:translate-x-0 md:group-hover:relative transition-all duration-300 text-left w-full">
                    Instalar App
                  </span>
               </button>
             )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 md:pl-32 pb-20 overflow-y-auto bg-slate-50 relative min-h-screen">
        <div className="absolute top-0 right-0 w-full h-[50vh] bg-gradient-to-b from-indigo-50/50 via-emerald-50/20 to-transparent pointer-events-none" />
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative z-10"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Modals */}
      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Autorização de Limpeza">
        <div className="space-y-6">
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-bold uppercase tracking-tight">Ação Irreversível!</p>
              <p>Todos os dados serão apagados permanentemente. Para confirmar, você deve se identificar.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Digite seu e-mail para confirmar:</label>
              <Input 
                id="reset-email-confirm"
                placeholder={user?.email || ''} 
                value={resetConfirmText} 
                onChange={e => setResetConfirmText(e.target.value)} 
              />
              <p className="text-[10px] text-muted-foreground italic">Solicitamos seu e-mail como confirmação de segurança para esta ação crítica.</p>
            </div>

            <div className="pt-2 flex gap-3">
              <Button 
                variant="danger" 
                className="flex-1 py-3" 
                onClick={() => executeWithSecurity(resetSystemData, "Ao confirmar, todos os dados do sistema serão apagados permanentemente.")}
                disabled={loading}
              >
                {loading ? 'Limpando...' : 'Confirmar e Limpar Tudo'}
              </Button>
              <Button variant="outline" onClick={() => setIsResetModalOpen(false)} className="py-3">Cancelar</Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Confirmar Pagamento">
        <div className="space-y-4">
          <div className="p-4 bg-accent/20 rounded-xl border">
            <p className="text-sm text-muted-foreground uppercase font-bold">Resumo do Pagamento</p>
            <p className="text-lg font-bold">R$ {confirmingPayment?.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Vencimento: {confirmingPayment && format(parseISO(confirmingPayment.dueDate), 'dd/MM/yyyy')}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Valor Pago (R$)</label>
            <Input 
              id="payment-amount-input"
              type="number" 
              value={paymentAmountInput}
              onChange={e => setPaymentAmountInput(Number(e.target.value))}
              placeholder="Digite o valor pago"
              className="font-bold text-emerald-600"
            />
            {confirmingPayment && paymentAmountInput < confirmingPayment.amount && (
              <div className="space-y-4">
                <p className="text-[10px] text-amber-600 font-medium bg-amber-50 p-2 rounded-lg border border-amber-100">
                  Atenção: Você está registrando um pagamento parcial. O sistema gerará automaticamente uma nova cobrança de R$ {(confirmingPayment.amount - paymentAmountInput).toLocaleString()} para o restante.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Data para pagar o restante</label>
                  <Input 
                    id="payment-remainder-due-date"
                    type="date"
                    value={paymentRemainderDueDate}
                    onChange={e => setPaymentRemainderDueDate(e.target.value)}
                    className="font-bold text-amber-600"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Observação do Restante</label>
                  <Input 
                    id="payment-remainder-observations"
                    placeholder="Ex: Prometeu pagar na sexta-feira..."
                    value={paymentRemainderObservations}
                    onChange={e => setPaymentRemainderObservations(e.target.value)}
                    className="text-amber-700"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Anexar Comprovante (Opcional)</label>
            <input 
              type="file" 
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setPaymentReceiptName(file.name);
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    if (isDriveConnected) {
                      const tenantName = tenants.find(t => t.id === confirmingPayment.tenantId)?.name || 'Geral';
                      toast.promise(
                        uploadToDrive(file.name, base64, file.type, tenantName),
                        {
                          loading: 'Enviando comprovante para o Google Drive...',
                          success: (data) => {
                            setPaymentReceipt(data.webViewLink);
                            setPaymentReceiptLocation('Google Drive');
                            setPaymentReceiptThumbnail(data.thumbnailLink);
                            return 'Comprovante salvo no Google Drive!';
                          },
                          error: 'Erro ao enviar para o Google Drive.'
                        }
                      );
                    } else {
                      setPaymentReceipt(base64);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }} 
              className="text-xs" 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Localização do Comprovante (Opcional)</label>
            <Input 
              id="payment-evidence-location"
              placeholder="Ex: Pasta Drive, Gaveta 2, etc..."
              value={paymentReceiptLocation}
              onChange={e => setPaymentReceiptLocation(e.target.value)}
            />
          </div>

          <div className="pt-4 flex gap-2">
            <Button 
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-md font-bold" 
              disabled={isSubmitting || paymentAmountInput <= 0}
              onClick={() => {
                if (confirmingPayment) {
                  const tenantName = tenants.find(t => t.id === confirmingPayment.tenantId)?.name || 'Inquilino';
                  const description = `Ao confirmar, você registrará o recebimento de R$ ${paymentAmountInput.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de ${tenantName}.`;
                  
                  executeWithSecurity(async () => {
                    setIsSubmitting(true);
                    try {
                      await markPaymentAsPaid(
                        confirmingPayment.id, 
                        paymentAmountInput,
                        paymentReceipt || undefined,
                        paymentReceiptName || undefined,
                        paymentReceiptLocation || undefined,
                        paymentRemainderDueDate,
                        paymentRemainderObservations,
                        paymentReceiptThumbnail || undefined
                      );
                      setIsPaymentModalOpen(false);
                      setConfirmingPayment(null);
                      setPaymentReceipt(null);
                      setPaymentReceiptName('');
                      setPaymentReceiptLocation('');
                      setPaymentReceiptThumbnail(null);
                      setPaymentRemainderDueDate(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
                      setPaymentRemainderObservations('');
                    } catch (error) {
                      console.error('Erro ao confirmar pagamento:', error);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }, description);
                }
              }}
            >
              {isSubmitting ? 'Processando...' : 'Confirmar Recebimento'}
            </Button>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isRevertModalOpen} onClose={() => setIsRevertModalOpen(false)} title="Reverter Pagamento">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-sm text-red-800 uppercase font-bold">Atenção</p>
            <p className="text-xs text-red-600">Você está prestes a reverter um pagamento já confirmado. O status voltará para pendente ou atrasado.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo da Reversão</label>
            <textarea 
              className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none placeholder:text-slate-400"
              placeholder="Ex: Erro de digitação, pagamento não realizado, etc..."
              value={revertReason}
              onChange={e => setRevertReason(e.target.value)}
            />
          </div>

          <div className="pt-4 flex gap-2">
            <Button 
              className="flex-1 bg-red-500 hover:bg-red-600 text-white border-none shadow-md font-bold" 
              disabled={isSubmitting || !revertReason.trim()}
              onClick={() => {
                if (revertingPayment) {
                  const description = `Ao confirmar, você reverterá o pagamento de R$ ${revertingPayment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, tornando-o pendente novamente.`;
                  
                  executeWithSecurity(async () => {
                    setIsSubmitting(true);
                    try {
                      await revertPayment(revertingPayment.id, revertReason);
                      setIsRevertModalOpen(false);
                      setRevertingPayment(null);
                      setRevertReason('');
                    } catch (error) {
                      console.error('Erro ao reverter pagamento:', error);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }, description);
                }
              }}
            >
              {isSubmitting ? 'Processando...' : 'Confirmar Reversão'}
            </Button>
            <Button variant="outline" onClick={() => setIsRevertModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isRemoveTenantModalOpen} onClose={() => setIsRemoveTenantModalOpen(false)} title="Remover Inquilino">
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-bold">Atenção!</p>
              <p>Ao remover o inquilino, todas as cobranças pendentes deste imóvel serão canceladas automaticamente.</p>
              {removeTenantData && tenants.find(t => t.id === removeTenantData.tenantId)?.depositValue ? (
                <p className="mt-2 font-semibold text-blue-800 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                  Valor da Caução a ser devolvido: R$ {tenants.find(t => t.id === removeTenantData.tenantId)?.depositValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">Houve algum acerto final (pagamento extra ou desconto)?</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setSettlementType('extra')}
                className={cn(
                  "p-3 rounded-xl border text-sm font-medium transition-all",
                  settlementType === 'extra' ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-200 text-slate-600"
                )}
              >
                Pagamento Extra
              </button>
              <button 
                onClick={() => setSettlementType('discount')}
                className={cn(
                  "p-3 rounded-xl border text-sm font-medium transition-all",
                  settlementType === 'discount' ? "bg-red-50 border-red-500 text-red-700" : "bg-white border-slate-200 text-slate-600"
                )}
              >
                Desconto / Devolução
              </button>
            </div>

            <CurrencyInput 
              id="settlementAmount"
              label="Valor do Acerto"
              value={settlementAmount}
              onChange={val => setSettlementAmount(val)}
            />
            <p className="text-[10px] text-slate-400 italic">Deixe R$ 0,00 se não houver acerto financeiro.</p>
          </div>

          <div className="pt-4 flex gap-2">
            <Button 
              className="flex-1" 
              onClick={() => {
                const tenantName = removeTenantData ? tenants.find(t => t.id === removeTenantData.tenantId)?.name : 'Inquilino';
                const description = `Ao confirmar, ${tenantName} será removido do imóvel e as cobranças futuras serão canceladas.`;
                executeWithSecurity(confirmRemoveTenant, description);
              }}
            >
              Confirmar Remoção
            </Button>
            <Button variant="outline" onClick={() => setIsRemoveTenantModalOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isAgreementModalOpen} 
        onClose={() => {
          setIsAgreementModalOpen(false);
          setAgreementForm({
            tenantId: '',
            description: '',
            totalAmount: 0,
            installmentAmount: 0,
            durationMonths: 1,
            startDate: format(new Date(), 'yyyy-MM-dd'),
            justification: ''
          });
        }} 
        title={agreementForm.id ? "Editar Acordo" : "Novo Acordo / Parcelamento"}
      >
        <form onSubmit={handleAddAgreement} className="space-y-4">
          <Select 
            label="Inquilino" 
            id="agreement-tenant" 
            value={agreementForm.tenantId} 
            onChange={e => setAgreementForm({...agreementForm, tenantId: e.target.value})} 
            options={[
              { label: 'Selecione um inquilino', value: '' },
              ...tenants.filter(t => t.status === 'allocated').map(t => ({ label: t.name, value: t.id }))
            ]}
            required
          />
          <Input 
            label="Descrição do Acordo" 
            id="agreement-desc" 
            placeholder="Ex: Pintura, Reparo de Infiltração, etc."
            value={agreementForm.description} 
            onChange={e => setAgreementForm({...agreementForm, description: e.target.value})} 
            required 
          />
          <CurrencyInput 
            label="Valor Total do Acordo" 
            id="agreement-amt" 
            value={agreementForm.totalAmount} 
            onChange={val => setAgreementForm({...agreementForm, totalAmount: val})} 
            required 
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Nº de Parcelas" 
              id="agreement-duration" 
              type="number" 
              min="1"
              value={agreementForm.durationMonths} 
              onChange={e => setAgreementForm({...agreementForm, durationMonths: parseInt(e.target.value)})} 
              required 
            />
            <Input 
              label="Data de Início" 
              id="agreement-start" 
              type="date" 
              value={agreementForm.startDate} 
              onChange={e => setAgreementForm({...agreementForm, startDate: e.target.value})} 
              required 
            />
          </div>

          {agreementForm.id && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Justificativa da Edição</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-slate-400"
                placeholder="Descreva o motivo da alteração..."
                value={agreementForm.justification}
                onChange={e => setAgreementForm({...agreementForm, justification: e.target.value})}
                required
              />
            </div>
          )}
          
          {agreementForm.totalAmount! > 0 && agreementForm.durationMonths! > 0 && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Cálculo das Parcelas</p>
              <p className="text-lg font-bold text-emerald-700">
                {agreementForm.durationMonths}x de R$ {((agreementForm.totalAmount || 0) / (agreementForm.durationMonths || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-emerald-600/70 mt-1 italic">As cobranças serão geradas automaticamente no financeiro.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Anexar Evidência (Foto/PDF)</label>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                id="agreement-evidence"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      const base64 = reader.result as string;
                      if (isDriveConnected) {
                        const tenantName = tenants.find(t => t.id === agreementForm.tenantId)?.name || 'Geral';
                        toast.promise(
                          uploadToDrive(file.name, base64, file.type, tenantName),
                          {
                            loading: 'Enviando evidência para o Google Drive...',
                            success: (data) => {
                              setAgreementForm({
                                ...agreementForm, 
                                evidence: data.webViewLink,
                                evidenceName: file.name,
                                thumbnailLink: data.thumbnailLink
                              });
                              return 'Evidência salva no Google Drive!';
                            },
                            error: 'Erro ao enviar para o Google Drive.'
                          }
                        );
                      } else {
                        setAgreementForm({
                          ...agreementForm, 
                          evidence: base64,
                          evidenceName: file.name,
                          thumbnailLink: ''
                        });
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }} 
              />
              <button
                type="button"
                onClick={() => document.getElementById('agreement-evidence')?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 transition-colors text-xs font-medium"
              >
                <Upload className="w-3.5 h-3.5" />
                Escolher Arquivo
              </button>
              {agreementForm.evidence && (
                <button
                  type="button"
                  onClick={() => setAgreementForm({...agreementForm, evidence: '', evidenceName: ''})}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                  title="Remover anexo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {agreementForm.evidence && (
              <div className="mt-1 p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                {agreementForm.evidence.startsWith('data:image') ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white">
                    <img src={agreementForm.evidence} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-slate-700 truncate">{agreementForm.evidenceName || 'Arquivo anexado'}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Pronto para salvar</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Localização do Comprovante (Opcional)</label>
            <input 
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-slate-400"
              placeholder="Ex: Pasta Física 2024, Google Drive, etc."
              value={agreementForm.evidenceLocation} 
              onChange={e => setAgreementForm({...agreementForm, evidenceLocation: e.target.value})} 
            />
          </div>

          <div className="pt-4 flex gap-2">
            <Button type="submit" className="flex-1 py-3" disabled={isSubmitting || (!!agreementForm.id && !agreementForm.justification)}>
              {isSubmitting ? 'Processando...' : agreementForm.id ? 'Salvar Alterações' : 'Gerar Acordo'}
            </Button>
            <Button variant="outline" onClick={() => setIsAgreementModalOpen(false)} className="py-3" disabled={isSubmitting}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isArchiveAgreementModalOpen} onClose={() => setIsArchiveAgreementModalOpen(false)} title="Arquivar / Excluir Acordo">
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-bold">Atenção!</p>
              <p>Ao arquivar ou excluir um acordo, todas as parcelas **pendentes** vinculadas a ele serão canceladas automaticamente.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Justificativa</label>
              <textarea 
                className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-slate-400"
                placeholder="Descreva o motivo do cancelamento/arquivamento..."
                value={archiveJustification}
                onChange={e => setArchiveJustification(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="py-3 bg-amber-600 hover:bg-amber-700" 
                disabled={!archiveJustification || isSubmitting}
                onClick={() => {
                  if (archivingAgreement) {
                    const description = `Ao confirmar, o acordo "${archivingAgreement.description}" será arquivado e as parcelas pendentes canceladas.`;
                    executeWithSecurity(() => archiveAgreement(archivingAgreement, archiveJustification, 'archived'), description);
                  }
                }}
              >
                {isSubmitting ? 'Processando...' : 'Arquivar Acordo'}
              </Button>
              <Button 
                variant="danger" 
                className="py-3" 
                disabled={!archiveJustification || isSubmitting}
                onClick={() => {
                  if (archivingAgreement) {
                    const description = `Ao confirmar, o acordo "${archivingAgreement.description}" será excluído permanentemente e as parcelas pendentes canceladas.`;
                    executeWithSecurity(() => archiveAgreement(archivingAgreement, archiveJustification, 'deleted'), description);
                  }
                }}
              >
                {isSubmitting ? 'Processando...' : 'Excluir Acordo'}
              </Button>
            </div>
            <Button variant="outline" className="w-full py-3" onClick={() => setIsArchiveAgreementModalOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isTenantDetailModalOpen} onClose={() => setIsTenantDetailModalOpen(false)} title="Perfil do Inquilino">
        {selectedTenantForDetail && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {selectedTenantForDetail.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedTenantForDetail.name}</h3>
                <p className="text-sm text-slate-500">CPF: {selectedTenantForDetail.cpf}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("w-3 h-3", i < (selectedTenantForDetail.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200")} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Contato Principal</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <p className="text-sm text-slate-700">{selectedTenantForDetail.contact}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Emergência</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-400" />
                  <p className="text-sm text-slate-700">{selectedTenantForDetail.secondaryContact || 'Não informado'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Imóvel Atual</p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Home className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">
                    {properties.find(p => p.id === selectedTenantForDetail.propertyId)?.name || 'Nenhum imóvel alocado'}
                  </p>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded text-[10px] uppercase font-bold",
                  selectedTenantForDetail.status === 'allocated' ? "bg-emerald-100 text-emerald-700" :
                  selectedTenantForDetail.status === 'waiting' ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-700"
                )}>
                  {selectedTenantForDetail.status === 'allocated' ? 'Alocado' : selectedTenantForDetail.status === 'waiting' ? 'Espera' : 'Arquivado'}
                </span>
              </div>
            </div>

            {selectedTenantForDetail.observations && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Observações</p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-600 italic leading-relaxed">"{selectedTenantForDetail.observations}"</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <DepositManager 
                tenant={selectedTenantForDetail} 
                payments={payments} 
                onUpdatePayment={updatePaymentRecord} 
              />
              
              <TenantTimeline 
                tenant={selectedTenantForDetail} 
                payments={payments} 
                property={properties.find(p => p.id === selectedTenantForDetail.propertyId)} 
                onConfirmPayment={redirectToReceivables}
                setPreviewReceipt={setPreviewReceipt}
              />
            </div>

            {selectedTenantForDetail.evidenceLocation && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Localização do Comprovante</p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-sm text-slate-700 truncate">{selectedTenantForDetail.evidenceLocation}</p>
                  </div>
                  {selectedTenantForDetail.evidenceLocation.startsWith('http') && (
                    <a href={selectedTenantForDetail.evidenceLocation} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="h-8 px-2">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 flex flex-col gap-3">
              {selectedTenantForDetail.contractFile && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Contrato / Documento</p>
                  {(selectedTenantForDetail.contractFile.startsWith('data:image') || selectedTenantForDetail.thumbnailLink || (selectedTenantForDetail.evidenceName && /\.(jpg|jpeg|png|webp)$/i.test(selectedTenantForDetail.evidenceName))) ? (
                    <div className="relative group overflow-hidden rounded-2xl border border-slate-200">
                      <img 
                        src={selectedTenantForDetail.thumbnailLink || selectedTenantForDetail.contractFile} 
                        alt="Contrato" 
                        className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          const isImage = selectedTenantForDetail.contractFile?.match(/\.(jpeg|jpg|gif|png)$/i) || selectedTenantForDetail.thumbnailLink || (selectedTenantForDetail.contractFile?.startsWith('data:image'));
                          setPreviewReceipt({ url: selectedTenantForDetail.contractFile!, name: `Contrato - ${selectedTenantForDetail.name}`, isImage: !!isImage });
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <div className="bg-white/90 text-slate-900 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                          <ExternalLink className="w-3 h-3" /> Ampliar Foto
                        </div>
                      </div>
                      {isGoogleDriveLink(selectedTenantForDetail.contractFile) && (
                        <div className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-xl shadow-sm">
                          <Cloud className="w-4 h-4 text-emerald-500" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{selectedTenantForDetail.evidenceName || 'Arquivo de Contrato'}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Documento PDF/Arquivo</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-3 gap-2"
                        onClick={() => {
                          const isImage = selectedTenantForDetail.contractFile?.match(/\.(jpeg|jpg|gif|png)$/i) || selectedTenantForDetail.thumbnailLink || (selectedTenantForDetail.contractFile?.startsWith('data:image'));
                          setPreviewReceipt({ url: selectedTenantForDetail.contractFile!, name: `Contrato - ${selectedTenantForDetail.name}`, isImage: !!isImage });
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button className="flex-1 py-3" onClick={() => {
                  setIsTenantDetailModalOpen(false);
                  setActiveTab('tenants');
                }}>
                  <Edit className="w-4 h-4 mr-2" /> Ir para Inquilinos
                </Button>
                {selectedTenantForDetail.contractFile && (
                  <a 
                    href={selectedTenantForDetail.contractFile} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full py-3">
                      <Download className="w-4 h-4 mr-2" /> Baixar
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
      <SecurityCheckModal 
        isOpen={isSecurityModalOpen} 
        onClose={() => setIsSecurityModalOpen(false)} 
        onSuccess={onSecuritySuccess || (() => {})} 
        correctPassword={securityPassword} 
        description={securityDescription}
      />
    </div>
  );
}
