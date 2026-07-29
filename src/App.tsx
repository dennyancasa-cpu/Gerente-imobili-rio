/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
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
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  Property,
  Tenant,
  Expense,
  Payment,
  Agreement,
  Contract,
  StagingRecord,
  OperationType,
  PropertyStatus,
  TenantStatus,
  ExpenseType,
  PaymentStatus,
  PropertyDocument,
  Ticket,
  PropertyInspection,
  PropertyInspectionImage,
  AlertSettings,
  CustomAlert,
  StorageSpace,
  StorageItem,
} from "./types";
import { handleFirestoreError } from "./utils/firestoreError";
import { Auth } from "./components/Auth";
import {
  LayoutDashboard,
  Home,
  Users,
  User as UserIcon,
  DollarSign,
  Plus,
  Box,
  Search,
  MoreVertical,
  Trash2,
  Check,
  Maximize2,
  Minimize2,
  FolderCheck,
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
  PlusCircle,
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
  WifiOff,
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
  ChevronUp,
  QrCode,
  Monitor,
  Bell,
  FileWarning,
  BadgeAlert,
  FolderDown,
  ArrowDownToLine,
  FileQuestion,
  FileSearch,
  Scale,
  MessageSquare,
  Bot,
  DatabaseBackup,
  BookText,
  Heart,
  Warehouse,
  Car, BarChart2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";

import {
  format,
  addDays,
  addMonths,
  setDate,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  isSameMonth,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { adjustDateToNextBusinessDay } from "./utils/dateHelpers";
import Markdown from "react-markdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { HelpView } from "./components/HelpView";
import { TicketsView } from "./components/TicketsView";
import { ContractsView } from "./components/ContractsView";
import { StoragesView } from "./components/StoragesView";
import { IntelligenceHubView } from "./components/IntelligenceHubView";
import { CustomRobotAssistant } from "./components/CustomRobotAssistant";
import { ImportDataView } from "./components/ImportDataView";
import { FinancialIAView } from "./components/FinancialIAView";
import { FinancialOverviewView } from "./components/FinancialOverviewView";
import { CalendarSync } from "./components/CalendarSync";
import { LegalDocsView } from "./components/LegalDocsView";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const cleanObject = (val: any): any => {
  if (val === null || val === undefined) {
    return null;
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => cleanObject(item))
      .filter((item) => item !== undefined && item !== null);
  }
  if (typeof val === "object") {
    const proto = Object.getPrototypeOf(val);
    if (proto !== null && proto !== Object.prototype) {
      return val;
    }
    const result: any = {};
    Object.keys(val).forEach((key) => {
      const cleaned = cleanObject(val[key]);
      if (cleaned !== undefined && cleaned !== null && cleaned !== "") {
        result[key] = cleaned;
      }
    });
    return result;
  }
  return val;
};

const compressImage = (
  base64: string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.6,
): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64.startsWith("data:image/")) {
      resolve(base64);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(base64);
  });
};

const getWhatsAppLink = (phone: string | undefined, message: string) => {
  if (!phone) return "#";
  const cleanPhone = phone.replace(/\D/g, "");
  const number = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
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

const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
const Tooltip = ({ children }: { children: React.ReactNode }) => (
  <div className="group relative inline-block">{children}</div>
);
const TooltipTrigger = ({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) => <>{children}</>;
const TooltipContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block transition-all z-[100] pointer-events-none",
      className,
    )}
  >
    {children}
    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white dark:border-t-slate-800" />
  </div>
);

// --- Components ---

export const LogoSVG = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 200 240"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
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
    <path
      d="M 0 90 C 0 -10, 200 -10, 200 90 C 200 160, 100 210, 100 210 C 100 210, 0 160, 0 90 Z"
      fill="url(#pinGrad)"
    />

    {/* Inner White Cutout Area */}
    <path
      d="M 15 90 C 15 10, 185 10, 185 90 C 185 150, 100 195, 100 195 C 100 195, 15 150, 15 90 Z"
      fill="#ffffff"
    />

    {/* Roof overlap */}
    <path
      d="M 100 10 L 190 70 L 160 80 L 100 35 L 40 80 L 10 70 Z"
      fill="#146d36"
    />
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
  return url?.includes("drive.google.com") || url?.includes("googleapis.com");
};

const getGoogleDrivePreviewUrl = (url?: string) => {
  if (!url) return "";
  if (url.includes("drive.google.com") && url.includes("/view")) {
    return url.replace("/view", "/preview");
  }
  return url;
};

const TenantTimeline = ({
  tenant,
  payments,
  property,
  onConfirmPayment,
  setPreviewReceipt,
}: {
  tenant: Tenant;
  payments: Payment[];
  property?: Property;
  onConfirmPayment?: (id: string) => void;
  setPreviewReceipt: (
    p: { url: string; name: string; isImage: boolean } | null,
  ) => void;
}) => {
  const today = new Date();

  // 1. History (Past)
  const history = useMemo(() => {
    return payments
      .filter(
        (p) =>
          p.tenantId === tenant.id &&
          (p.status === "paid" || p.status === "partial"),
      )
      .sort(
        (a, b) => parseISO(b.dueDate).getTime() - parseISO(a.dueDate).getTime(),
      );
  }, [payments, tenant.id]);

  // 2. Pending (Now)
  const pending = useMemo(() => {
    return payments
      .filter(
        (p) =>
          p.tenantId === tenant.id &&
          (p.status === "pending" || p.status === "late"),
      )
      .sort(
        (a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(),
      );
  }, [payments, tenant.id]);

  // 3. Projections (Future)
  const projections = useMemo(() => {
    if (!property || tenant.status !== "allocated") return [];

    const lastPending = pending[pending.length - 1];
    const startDate = lastPending
      ? addMonths(parseISO(lastPending.dueDate), 1)
      : addMonths(today, 1);

    return Array.from({ length: 3 }).map((_, i) => {
      const dueDate = addMonths(startDate, i);
      return {
        id: `proj-${i}`,
        dueDate: format(dueDate, "yyyy-MM-dd"),
        amount: property.rentValue,
        description: "Aluguel (Projeção)",
        status: "projected" as const,
      };
    });
  }, [property, tenant.status, pending, today]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Linha do Tempo Financeira
        </h4>
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
          const isRemainder =
            p.description?.startsWith("Restante:") ||
            p.description?.includes("parte");
          return (
            <div key={p.id} className="relative flex items-center gap-4 group">
              <div
                className={cn(
                  "absolute left-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110",
                  p.status === "late"
                    ? "bg-red-500 text-white"
                    : isRemainder
                      ? "bg-indigo-500 text-white"
                      : "bg-amber-500 text-white",
                )}
              >
                {p.status === "late" ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <div
                className={cn(
                  "ml-10 flex-1 p-3 rounded-2xl border transition-all",
                  p.status === "late"
                    ? "bg-red-50 border-red-100"
                    : isRemainder
                      ? "bg-indigo-50 border-indigo-100"
                      : "bg-amber-50 border-amber-100",
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p
                      className={cn(
                        "text-xs font-bold",
                        isRemainder ? "text-indigo-900" : "text-slate-900",
                      )}
                    >
                      {p.description || "Aluguel"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Vencimento: {format(parseISO(p.dueDate), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="sm:text-sm text-xs font-black text-slate-900">
                      R$ {p.amount.toLocaleString()}
                    </p>
                    {isRemainder && (
                      <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-tighter">
                        Saldo Pendente
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[9px] font-bold text-primary hover:bg-primary/10 px-2 rounded-lg"
                      onClick={() => {
                        if (onConfirmPayment) {
                          onConfirmPayment(p.id);
                        } else {
                          const element = document.getElementById(
                            `payment-${p.id}`,
                          );
                          if (element) {
                            element.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
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
          <div
            key={p.id}
            className="relative flex items-center gap-4 group opacity-60 hover:opacity-100 transition-opacity"
          >
            <div className="absolute left-0 w-8 h-8 rounded-full border-4 border-white bg-slate-200 text-slate-500 flex items-center justify-center z-10 shadow-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="ml-10 flex-1 p-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    {p.description}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Previsão: {format(parseISO(p.dueDate), "dd/MM/yyyy")}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-400">
                  R$ {p.amount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* History */}
        {history.slice(0, 5).map((p) => (
          <div key={p.id} className="relative flex items-center gap-4 group">
            <div
              className={cn(
                "absolute left-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110",
                p.status === "paid"
                  ? "bg-emerald-500 text-white"
                  : "bg-indigo-500 text-white",
              )}
            >
              {p.status === "paid" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
            </div>
            <div
              className={cn(
                "ml-10 flex-1 p-3 rounded-2xl border transition-all",
                p.status === "paid"
                  ? "bg-emerald-50/30 border-emerald-100"
                  : "bg-indigo-50/30 border-indigo-100",
              )}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-bold text-slate-700">
                      {p.description || "Aluguel"}
                    </p>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shadow-sm shrink-0",
                        p.type === "agreement"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : p.type === "deposit"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200",
                      )}
                    >
                      {p.type === "agreement"
                        ? "Acordo"
                        : p.type === "deposit"
                          ? "Caução"
                          : "Aluguel"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> Vencimento:{" "}
                      {p.dueDate
                        ? format(parseISO(p.dueDate), "dd/MM/yyyy")
                        : "N/A"}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Pago em:{" "}
                      {p.paidDate
                        ? format(parseISO(p.paidDate), "dd/MM/yyyy")
                        : "-"}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    R${" "}
                    {p.paidAmount?.toLocaleString() ||
                      p.amount.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    {p.receiptUrl && (
                      <button
                        onClick={() => {
                          const isImage =
                            p.receiptUrl?.match(/\.(jpeg|jpg|gif|png)$/i) ||
                            p.thumbnailLink ||
                            p.receiptUrl?.startsWith("data:image");
                          setPreviewReceipt({
                            url: p.receiptUrl!,
                            name: p.description || "Recibo",
                            isImage: !!isImage,
                          });
                        }}
                        className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1"
                        title="Ver Recibo"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        {isGoogleDriveLink(p.receiptUrl) && (
                          <Cloud className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                      Liquidado
                    </p>
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

const UserGuide = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const steps = [
    {
      title: "1. Cadastro de Imóveis",
      description:
        "Comece cadastrando seus imóveis na aba 'Imóveis'. Defina o valor do aluguel e o dia de vencimento padrão.",
      icon: <Home className="w-5 h-5 text-emerald-500" />,
    },
    {
      title: "2. Alocação de Inquilinos",
      description:
        "Ao alocar um inquilino em um imóvel, o sistema gera automaticamente a primeira cobrança (Aluguel ou Caução).",
      icon: <Users className="w-5 h-5 text-blue-500" />,
    },
    {
      title: "3. Confirmação de Pagamentos",
      description:
        "Na Dashboard ou aba 'Financeiro', clique em 'Confirmar' quando receber um valor. Se o valor for menor que o total, o sistema cria automaticamente um 'Saldo Pendente' para o restante.",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    },
    {
      title: "4. Acordos e Parcelamentos",
      description:
        "Para dívidas antigas, use a função 'Acordo'. Isso criará parcelas mensais que aparecem separadamente no seu panorama financeiro.",
      icon: <ArrowRightLeft className="w-5 h-5 text-indigo-500" />,
    },
    {
      title: "5. Panorama Financeiro",
      description:
        "Acompanhe o que já foi recebido e o que ainda falta cair no mês através dos gráficos e cards de resumo.",
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
    },
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
                  <p className="text-xs text-muted-foreground">
                    Aprenda a gerenciar suas cobranças com eficiência
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              <div className="grid gap-4">
                {steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
                  >
                    <div className="shrink-0">{step.icon}</div>
                    <div>
                      <h3 className="font-bold text-sm mb-1">{step.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Dica de Previsibilidade:</strong> O sistema sempre
                  prioriza mostrar o próximo pagamento mais próximo. Se houver
                  um saldo pendente (pagamento parcial), ele aparecerá com
                  destaque em Indigo.
                </p>
              </div>
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end">
              <Button
                onClick={onClose}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
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
  onOpenAlerts: () => void;
  globalAlertsCount?: number | null;
  globalAlertsPriority?: "high" | "medium" | "low";
  receivablesProps?: any;
  storages?: StorageSpace[];
  onNavigateToStorage?: (storageId: string) => void;
}

const HomeView = ({
  properties,
  tenants,
  payments,
  expenses,
  agreements,
  onConfirmPayment,
  onOpenTenantDetail,
  onOpenAlerts,
  globalAlertsCount,
  globalAlertsPriority,
  receivablesProps,
  storages,
  onNavigateToStorage,
}: HomeViewProps) => {
  const today = new Date();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const tenantStatus = useMemo(() => {
    return tenants.map((tenant) => {
      const property = properties.find((p) => p.id === tenant.propertyId);
      const tenantPayments = payments.filter((p) => p.tenantId === tenant.id);

      const todayStr = format(today, "yyyy-MM-dd");
      const latePayments = tenantPayments.filter(
        (p) =>
          p.status === "late" ||
          (p.status === "pending" && p.dueDate < todayStr),
      );
      const isUpToDate = latePayments.length === 0;

      // Find next payment (any type)
      const upcomingPayments = tenantPayments
        .filter((p) => p.status === "pending" && p.dueDate >= todayStr)
        .sort(
          (a, b) =>
            parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(),
        );

      const nextPayment = upcomingPayments[0] || null;

      // Find last paid payment
      const lastPaid = tenantPayments
        .filter(
          (p) => (p.status === "paid" || p.status === "partial") && p.paidDate,
        )
        .sort(
          (a, b) =>
            parseISO(b.paidDate!).getTime() - parseISO(a.paidDate!).getTime(),
        )[0];

      // Find active agreement
      const activeAgreement = agreements.find((a) => a.tenantId === tenant.id);
      const nextAgreementInstallment = tenantPayments
        .filter(
          (p) =>
            p.agreementId === activeAgreement?.id && p.status === "pending",
        )
        .sort(
          (a, b) =>
            parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(),
        )[0];

      const hasPendingRemainder = tenantPayments.some(
        (p) => p.status === "pending" && p.description?.startsWith("Restante:"),
      );

      return {
        tenant,
        property,
        isUpToDate,
        hasPendingRemainder,
        latePaymentsCount: latePayments.length,
        nextPayment,
        lastPaid,
        activeAgreement,
        nextAgreementInstallment,
      };
    });
  }, [tenants, properties, payments, agreements, today]);

  const projectionData = useMemo(() => {
    const data: any[] = [];

    for (let i = -3; i <= 3; i++) {
      const monthDate = addMonths(today, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, "MMM/yy", { locale: ptBR });

      const monthPayments = payments.filter((p) => {
        const d = parseISO(p.dueDate);
        return (
          d >= mStart &&
          d <= mEnd &&
          p.status !== "cancelled" &&
          p.type !== "deposit" &&
          p.tenantId !== "proprietario"
        );
      });

      const storagePaidExpenses = payments.filter((p) => {
        const d = parseISO(p.dueDate);
        return (
          p.tenantId === "proprietario" &&
          (p.status === "paid" || p.status === "partial") &&
          p.paidDate &&
          parseISO(p.paidDate) >= mStart &&
          parseISO(p.paidDate) <= mEnd
        );
      }).reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);

      const received = monthPayments
        .filter((p) => p.status === "paid" || p.status === "partial")
        .reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);

      const pending = monthPayments
        .filter((p) => p.status === "pending" || p.status === "late")
        .reduce((acc, p) => acc + p.amount + (p.interestAmount || 0), 0);

      const monthExpenses = expenses
        .filter((e) => parseISO(e.date) >= mStart && parseISO(e.date) <= mEnd)
        .reduce((acc, e) => acc + e.amount, 0) + storagePaidExpenses;

      let projectedRent = 0;
      if (i > 0) {
        tenants.forEach((t) => {
          if (t.propertyId && t.status === "allocated") {
            const prop = properties.find((p) => p.id === t.propertyId);
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
        isCurrent: i === 0,
      });
    }
    return data;
  }, [payments, expenses, tenants, today]);

  const totalLateCount = useMemo(() => {
    return tenantStatus.reduce((acc, ts) => acc + ts.latePaymentsCount, 0);
  }, [tenantStatus]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá,{" "}
            {auth.currentUser?.displayName?.split(" ")[0] || "Proprietário"}!
          </h1>
          <p className="text-muted-foreground">
            Aqui está o resumo do seu sistema hoje.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsGuideOpen(true)}
          className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
        >
          <HelpCircle className="w-4 h-4" /> Guia
        </Button>
      </header>

      <UserGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      <div className="flex items-center pt-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-indigo-500" />
          Visão Rápida dos Inquilinos
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {tenantStatus.map(
          (
            {
              tenant,
              property,
              isUpToDate,
              hasPendingRemainder,
              latePaymentsCount,
              nextPayment,
              lastPaid,
            },
            i,
          ) => (
            <motion.div
              key={tenant.id}
              className="group relative cursor-pointer"
              onClick={() => onOpenTenantDetail(tenant)}
              whileHover={{ y: -2, scale: 1.02 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="p-3 flex flex-col justify-between h-full border border-slate-100 bg-white/90 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-1 mb-2 relative z-10">
                  <div className="flex items-start justify-between gap-1">
                    <h3
                      className="font-bold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors truncate"
                      title={tenant.name}
                    >
                      {tenant.name}
                    </h3>
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0 shadow-sm mt-0.5",
                        !isUpToDate
                          ? "bg-red-500"
                          : hasPendingRemainder
                            ? "bg-amber-400"
                            : "bg-emerald-500",
                      )}
                    />
                  </div>

                  <p
                    className="text-[9px] text-slate-500 flex items-center gap-1 font-medium truncate"
                    title={property?.name || "Vazio"}
                  >
                    <Home className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">
                      {property?.name || "Sem imóvel"}
                    </span>
                  </p>
                </div>

                <div className="mt-auto relative z-10">
                  {nextPayment ? (
                    <div className="bg-slate-50 rounded p-1.5 border border-slate-100">
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        Pendência
                      </p>
                      <p
                        className={cn(
                          "text-[10px] font-bold truncate",
                          nextPayment.description?.startsWith("Restante:")
                            ? "text-indigo-600"
                            : "text-emerald-600",
                        )}
                      >
                        R$ {nextPayment.amount.toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded p-1.5 border border-slate-100">
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        Último Pago
                      </p>
                      <p className="text-[9px] font-bold text-emerald-600 truncate">
                        {lastPaid
                          ? `R$ ${lastPaid.paidAmount?.toLocaleString() || lastPaid.amount.toLocaleString()}`
                          : "-"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ),
        )}
        {tenants.length === 0 && (
          <div className="col-span-full text-center py-6 text-muted-foreground italic border border-dashed rounded-xl text-sm">
            Nenhum inquilino cadastrado.
          </div>
        )}
      </div>

      {/* Locações de Espaços e Depósitos Overview Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Archive className="w-5 h-5 text-emerald-500" />
            Visão Rápida dos Espaços
          </h2>
          {storages && storages.length > 0 && (
            <Button
              variant="outline"
              onClick={() => onNavigateToStorage?.("")}
              className="text-xs h-7 px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1 font-semibold"
            >
              Gerenciar
            </Button>
          )}
        </div>

        {storages && storages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {storages.map((space) => {
              const spaceTypeLabels: Record<string, string> = {
                garage: "Garagem",
                storage_room: "Depósito / Box",
                warehouse: "Galpão / Barracão",
                other: "Espaço Outros",
              };
              
              // Calculate next billing / status
              const sortedBillings = space.billings 
                ? [...space.billings].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                : [];
              
              const nextUnpaidBilling = sortedBillings.find(b => b.status !== "paid");
              const isLate = nextUnpaidBilling && nextUnpaidBilling.dueDate < format(today, "yyyy-MM-dd");

              const SpaceIcon = space.spaceType === "garage" 
                ? Car 
                : space.spaceType === "warehouse" 
                  ? Warehouse 
                  : space.spaceType === "storage_room"
                    ? Box
                    : Archive;

              return (
                <motion.div
                  key={space.id}
                  className="group relative cursor-pointer"
                  onClick={() => space.id && onNavigateToStorage?.(space.id)}
                  whileHover={{ y: -2, scale: 1.02 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                  <div className="p-3 flex flex-col justify-between h-full border border-slate-100 bg-white/90 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="space-y-1 mb-2 relative z-10">
                      <div className="flex items-start justify-between gap-1">
                        <h3
                          className="font-bold text-xs text-slate-800 group-hover:text-emerald-600 transition-colors truncate"
                          title={space.name}
                        >
                          {space.name}
                        </h3>
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0 shadow-sm mt-0.5",
                            nextUnpaidBilling 
                              ? (isLate ? "bg-red-500" : "bg-amber-400")
                              : "bg-emerald-500"
                          )}
                        />
                      </div>

                      <p
                        className="text-[9px] text-slate-500 flex items-center gap-1 font-medium truncate"
                        title={`${spaceTypeLabels[space.spaceType || "other"]} • ${space.address || "Sem endereço"}`}
                      >
                        <SpaceIcon className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {space.address || spaceTypeLabels[space.spaceType || "other"]}
                        </span>
                      </p>
                    </div>

                    <div className="mt-auto relative z-10">
                      {nextUnpaidBilling ? (
                        <div className="bg-slate-50 rounded p-1.5 border border-slate-100">
                          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            {isLate ? "Atrasado" : `Vence ${format(parseISO(nextUnpaidBilling.dueDate), "dd/MM")}`}
                          </p>
                          <p
                            className={cn(
                              "text-[10px] font-bold truncate",
                              isLate ? "text-red-600" : "text-amber-600"
                            )}
                          >
                            R$ {nextUnpaidBilling.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded p-1.5 border border-slate-100">
                          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            Custo Mensal
                          </p>
                          <p className="text-[9px] font-bold text-emerald-600 truncate">
                            R$ {space.monthlyCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground italic border border-dashed border-slate-200 rounded-2xl text-sm bg-slate-50/50 flex flex-col items-center justify-center gap-3">
            <Archive className="w-8 h-8 text-slate-300" />
            <div className="space-y-1">
              <p className="font-medium text-slate-600">Nenhum espaço ou depósito locado cadastrado.</p>
              <p className="text-xs text-slate-400">Gerencie e controle custos de garagens, galpões e depósitos extras em um só lugar.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigateToStorage?.("")}
              className="mt-2 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              Começar a Organizar Espaços
            </Button>
          </div>
        )}
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Projeção Financeira (7 Meses)
            </h2>
            <p className="text-sm text-muted-foreground">
              Visão rápida do fluxo de caixa e projeções.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-emerald-500" /> Recebido
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-amber-500" /> Pendente
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-indigo-400" /> Projetado
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-red-400" /> Despesas
            </div>
          </div>
        </div>

        <div className="h-[250px] w-full min-h-[250px] min-w-0">
          <ResponsiveContainer
            minWidth={0}
            minHeight={0}
            width="100%"
            height="100%"
          >
            <BarChart
              data={projectionData}
              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 9, fontWeight: 600 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 9, fontWeight: 600 }}
                tickFormatter={(value) =>
                  `R$ ${value >= 1000 ? (value / 1000).toFixed(1) + "k" : value}`
                }
              />
              <RechartsTooltip
                cursor={{ fill: "#f8fafc" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xl min-w-[150px]">
                        <p className="text-xs font-black text-slate-800 mb-2 border-b pb-1">
                          {label}
                        </p>
                        <div className="space-y-1.5">
                          {payload.map((entry: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                  {entry.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-black text-slate-700">
                                R$ {entry.value.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="recebido"
                name="Recebido"
                stackId="a"
                radius={[0, 0, 0, 0]}
              >
                {projectionData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isCurrent ? "#10b981" : "#34d399"}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="pendente"
                name="Pendente"
                stackId="a"
                radius={[2, 2, 0, 0]}
              >
                {projectionData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isCurrent ? "#f59e0b" : "#fbbf24"}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="projetado"
                name="Projetado"
                stackId="a"
                radius={[2, 2, 0, 0]}
              >
                {projectionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#818cf8" />
                ))}
              </Bar>
              <Bar dataKey="despesas" name="Despesas" radius={[2, 2, 2, 2]}>
                {projectionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#f87171" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

interface PaymentAlertsProps {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  onConfirmPayment: (paymentId: string) => void;
  onOpenTenantDetail: (t: Tenant) => void;
  storages?: StorageSpace[];
}

const PaymentAlerts = ({
  properties,
  tenants,
  payments,
  onConfirmPayment,
  onOpenTenantDetail,
  storages,
}: PaymentAlertsProps) => {
  const today = new Date();

  const alerts = useMemo(() => {
    const list: any[] = [];

    payments.forEach((p) => {
      const dueDate = parseISO(p.dueDate);
      const diff = differenceInDays(dueDate, today);

      if (p.status === "pending" || p.status === "late") {
        let paymentTypeLabel = "Aluguel";
        if (p.type === "deposit") paymentTypeLabel = "Caução";
        if (p.type === "agreement") paymentTypeLabel = "Acordo";

        if (diff <= 5 && diff >= 0) {
          list.push({
            ...p,
            alertType: "warning",
            alertMessage: `Vence em ${diff} dias (${paymentTypeLabel})`,
          });
        } else if (diff < 0) {
          list.push({
            ...p,
            alertType: "danger",
            alertMessage: `Atrasado há ${Math.abs(diff)} dias (${paymentTypeLabel})`,
          });
        }
      }
    });

    return list.sort(
      (a, b) =>
        differenceInDays(parseISO(a.dueDate), today) -
        differenceInDays(parseISO(b.dueDate), today),
    );
  }, [payments, today]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Alertas de Pagamento
        </h2>
        <CalendarSync
          payments={payments}
          properties={properties}
          tenants={tenants}
        />
      </div>
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {alerts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground italic border-2 border-dashed rounded-2xl">
            Nenhum alerta pendente no momento.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "p-4 rounded-2xl border flex items-center justify-between transition-all",
                alert.alertType === "danger"
                  ? "bg-red-50 border-red-100"
                  : "bg-amber-50 border-amber-100",
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "p-2 rounded-xl",
                    alert.alertType === "danger"
                      ? "bg-red-500 text-white"
                      : "bg-amber-500 text-white",
                  )}
                >
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p
                      className="font-bold text-sm truncate max-w-[120px] cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => {
                        const tenant = tenants.find(
                          (t) => t.propertyId === alert.propertyId,
                        );
                        if (tenant) onOpenTenantDetail(tenant);
                      }}
                    >
                      {(() => {
                        if (alert.tenantId === "proprietario") return "Despesa (Proprietário)";
                        const pName = properties.find((p) => p.id === alert.propertyId)?.name;
                        if (pName) return pName;
                        if (alert.propertyId?.startsWith("storage-")) {
                          return storages?.find((s) => s.id === alert.propertyId.replace("storage-", ""))?.name || "Depósito/Garagem";
                        }
                        return alert.propertyNameSnapshot || "Desconhecido";
                      })()}
                    </p>
                    {alert.revertReason && (
                      <button
                        title={`Revertido: ${alert.revertReason}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info(
                            `Justificativa da Reversão: ${alert.revertReason}`,
                            {
                              duration: 5000,
                            },
                          );
                        }}
                        className="text-amber-500 hover:text-amber-600 transition-colors"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      alert.alertType === "danger"
                        ? "text-destructive"
                        : alert.alertType === "warning"
                          ? "text-amber-600"
                          : "text-emerald-600",
                    )}
                  >
                    {alert.alertMessage}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="font-bold text-sm">
                  R${" "}
                  {(
                    alert.amount + (alert.interestAmount || 0)
                  ).toLocaleString()}
                </p>
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
  storages?: StorageSpace[];
  onNavigateToStorage?: (storageId: string) => void;
}

const FinancialSummary = ({
  properties,
  tenants,
  payments,
  expenses,
  agreements,
  onConfirmPayment,
  onOpenTenantDetail,
  storages,
  onNavigateToStorage,
}: FinancialSummaryProps) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const today = new Date();

  const alerts = useMemo(() => {
    const list: any[] = [];

    payments.forEach((p) => {
      const dueDate = parseISO(p.dueDate);
      const diff = differenceInDays(dueDate, today);

      if (p.status === "pending" || p.status === "late") {
        let paymentTypeLabel = "Aluguel";
        if (p.type === "deposit") paymentTypeLabel = "Caução";
        if (p.type === "agreement") paymentTypeLabel = "Acordo";

        if (diff <= 5 && diff >= 0) {
          list.push({
            ...p,
            alertType: "warning",
            alertMessage: `Vence em ${diff} dias (${paymentTypeLabel})`,
          });
        } else if (diff < 0) {
          list.push({
            ...p,
            alertType: "danger",
            alertMessage: `Atrasado há ${Math.abs(diff)} dias (${paymentTypeLabel})`,
          });
        }
      }
    });

    return list.sort(
      (a, b) =>
        differenceInDays(parseISO(a.dueDate), today) -
        differenceInDays(parseISO(b.dueDate), today),
    );
  }, [payments, today]);

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const incomePayments = payments.filter((p) => p.tenantId !== 'proprietario');
  const storagePayments = payments.filter((p) => p.tenantId === 'proprietario');

  const rentPayments = incomePayments.filter((p) => !p.type || p.type === "rent");
  const agreementPayments = incomePayments.filter((p) => p.type === "agreement");

  const rentExpected = rentPayments
    .filter((p) => {
      const date = parseISO(p.dueDate);
      return p.status !== "cancelled" && date >= monthStart && date <= monthEnd;
    })
    .reduce((acc, p) => acc + p.amount + (p.interestAmount || 0), 0);

  const rentReceived = rentPayments
    .filter(
      (p) =>
        (p.status === "paid" || p.status === "partial") &&
        p.paidDate &&
        parseISO(p.paidDate) >= monthStart,
    )
    .reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);

  const rentPending = rentPayments
    .filter(
      (p) =>
        (p.status === "pending" || p.status === "late") &&
        parseISO(p.dueDate) >= monthStart &&
        parseISO(p.dueDate) <= monthEnd,
    )
    .reduce((acc, p) => acc + p.amount + (p.interestAmount || 0), 0);

  const rentPartialPending = rentPayments
    .filter(
      (p) =>
        (p.status === "pending" || p.status === "late") &&
        p.description?.includes("parte"),
    )
    .reduce((acc, p) => acc + p.amount + (p.interestAmount || 0), 0);

  const agreementTotal = agreements
    .filter((a) => a.status === "active")
    .reduce((acc, a) => acc + a.totalAmount, 0);

  const agreementMonthExpected = agreementPayments
    .filter((p) => {
      const date = parseISO(p.dueDate);
      return p.status !== "cancelled" && date >= monthStart && date <= monthEnd;
    })
    .reduce((acc, p) => acc + p.amount + (p.interestAmount || 0), 0);

  const agreementMonthReceived = agreementPayments
    .filter(
      (p) =>
        (p.status === "paid" || p.status === "partial") &&
        p.paidDate &&
        parseISO(p.paidDate) >= monthStart,
    )
    .reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);

  const agreementTotalReceived = agreementPayments
    .filter((p) => p.status === "paid" || p.status === "partial")
    .reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);

  const storagePaidExpenses = storagePayments
    .filter(
      (p) =>
        (p.status === "paid" || p.status === "partial") &&
        p.paidDate &&
        parseISO(p.paidDate) >= monthStart,
    )
    .reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);

  const totalExpenses = expenses
    .filter((e) => parseISO(e.date) >= monthStart)
    .reduce((acc, e) => acc + e.amount, 0) + storagePaidExpenses;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Panorama Financeiro
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho e as projeções da sua carteira.
          </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Panorama Financeiro (Mês)
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Receita Prevista (Aluguéis)
              </span>
              <span className="font-semibold">
                R$ {rentExpected.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Receita Recebida (Aluguéis)
              </span>
              <span className="font-semibold text-emerald-600">
                R$ {rentReceived.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Saldo a Receber (Mês)
              </span>
              <span className="font-semibold text-amber-600">
                R$ {rentPending.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Saldos Pendentes (Parciais)
              </span>
              <span className="font-semibold text-indigo-600">
                R$ {rentPartialPending.toLocaleString()}
              </span>
            </div>
            {storagePaidExpenses > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Aluguel de Depósitos / Garagens
                </span>
                <span className="font-semibold text-destructive">
                  R$ {storagePaidExpenses.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Despesas Totais
              </span>
              <span className="font-semibold text-destructive">
                R$ {totalExpenses.toLocaleString()}
              </span>
            </div>
            <div className="pt-4 border-t flex items-center justify-between">
              <span className="font-bold">Saldo Líquido</span>
              <span className="text-xl font-bold">
                R${" "}
                {(
                  rentReceived +
                  agreementMonthReceived -
                  totalExpenses
                ).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-500" />
            Panorama de Acordos
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total dos Acordos
              </span>
              <span className="font-semibold">
                R$ {agreementTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                A Receber no Mês
              </span>
              <span className="font-semibold text-amber-600">
                R$ {agreementMonthExpected.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Arrecadado no Mês
              </span>
              <span className="font-semibold text-emerald-600">
                R$ {agreementMonthReceived.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Arrecadado
              </span>
              <span className="font-semibold text-blue-600">
                R$ {agreementTotalReceived.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Restante a Receber
              </span>
              <span className="font-semibold text-indigo-600">
                R$ {(agreementTotal - agreementTotalReceived).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

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
            properties.map((property) => {
              const propPayments = payments.filter(
                (p) =>
                  p.propertyId === property.id &&
                  (p.status === "paid" || p.status === "partial") &&
                  p.type !== "deposit",
              );
              const propPending = payments.filter(
                (p) =>
                  p.propertyId === property.id &&
                  (p.status === "pending" || p.status === "late") &&
                  p.type !== "deposit",
              );
              const propExpenses = expenses.filter(
                (e) => e.propertyId === property.id,
              );

              const totalRent = propPayments.reduce(
                (acc, p) => acc + (p.paidAmount || p.amount),
                0,
              );
              const totalPending = propPending.reduce(
                (acc, p) => acc + p.amount,
                0,
              );
              const totalRenovation = propExpenses
                .filter((e) => e.type === "renovation")
                .reduce((acc, e) => acc + e.amount, 0);
              const totalRepair = propExpenses
                .filter((e) => e.type === "repair")
                .reduce((acc, e) => acc + e.amount, 0);
              const totalTax = propExpenses
                .filter((e) => e.type === "tax")
                .reduce((acc, e) => acc + e.amount, 0);
              const totalFine = propExpenses
                .filter((e) => e.type === "fine")
                .reduce((acc, e) => acc + e.amount, 0);
              const totalOther = propExpenses
                .filter((e) => e.type === "other")
                .reduce((acc, e) => acc + e.amount, 0);

              const propStorages = storages ? storages.filter((s) => s.propertyId === property.id) : [];
              const totalStorageCost = propStorages.reduce((sum, s) => sum + (s.monthlyCost || 0), 0);

              const totalInvested = totalRenovation + totalRepair;
              const balance =
                totalRent - totalInvested - totalTax - totalFine - totalOther - totalStorageCost;

              return (
                <Card
                  id={`property-${property.id}`}
                  key={property.id}
                  className="p-5 flex flex-col gap-4 hover:shadow-md transition-shadow border-slate-200 bg-white/50 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">
                        {property.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 truncate">
                        {property.address}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ml-2",
                        property.status === "rented"
                          ? "bg-emerald-100 text-emerald-700"
                          : property.status === "vacant"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700",
                      )}
                    >
                      {property.status === "rented"
                        ? "Alugado"
                        : property.status === "vacant"
                          ? "Livre"
                          : "Reforma"}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs text-slate-500">
                          Total Aluguéis
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">
                        R$ {totalRent.toLocaleString()}
                      </span>
                    </div>

                    {totalPending > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className="text-xs text-slate-500">
                            Saldo Pendente
                          </span>
                        </div>
                        <span className="text-xs font-bold text-indigo-600">
                          R$ {totalPending.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-xs text-slate-500">
                          Invest. Reforma
                        </span>
                      </div>
                      <span className="text-xs font-bold text-amber-600">
                        R$ {totalInvested.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="text-xs text-slate-500">
                          Total Impostos
                        </span>
                      </div>
                      <span className="text-xs font-bold text-rose-600">
                        R$ {totalTax.toLocaleString()}
                      </span>
                    </div>

                    {totalFine > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                          <span className="text-xs text-slate-500">
                            Total Multas
                          </span>
                        </div>
                        <span className="text-xs font-bold text-red-600">
                          R$ {totalFine.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {totalOther > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span className="text-xs text-slate-500">
                            Outros Gastos
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-600">
                          R$ {totalOther.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {totalStorageCost > 0 && (
                      <div className="flex justify-between items-center cursor-pointer hover:bg-slate-100/50 p-1 rounded transition" onClick={() => onNavigateToStorage && onNavigateToStorage(propStorages[0]?.id)}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          <span className="text-xs text-slate-500 font-medium">
                            Aluguel Depósito
                          </span>
                        </div>
                        <span className="text-xs font-bold text-purple-600">
                          R$ {totalStorageCost.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                        Saldo Líquido
                      </span>
                      <span
                        className={cn(
                          "font-black text-xl leading-none mt-1",
                          balance >= 0 ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        R$ {balance.toLocaleString()}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "p-2 rounded-xl",
                        balance >= 0
                          ? "bg-emerald-50 text-emerald-500"
                          : "bg-rose-50 text-rose-500",
                      )}
                    >
                      {balance >= 0 ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
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
  expenses: Expense[];
  contracts?: Contract[];
  addProperty: (p: any) => Promise<any>;
  updateProperty: (id: string, p: any) => Promise<any>;
  deleteProperty: (id: string) => Promise<void>;
  removeTenantFromProperty: (
    pId: string,
    tId: string,
    action: "waiting" | "archived" | "delete",
  ) => Promise<void>;
  onSecurityCheck: (onSuccess: () => void, description?: string) => void;
  onOpenLegal: () => void;
  addExpense?: (e: any) => Promise<void>;
  deleteExpense?: (id: string) => Promise<void>;
  uploadToDrive?: (
    fileName: string,
    fileData: string,
    mimeType: string,
    folderName?: string,
  ) => Promise<any>;
  onNavigateToCreateTenant?: (propertyId: string) => void;
  onNavigateToEditTenant?: (tenantId: string) => void;
  storages?: StorageSpace[];
  onNavigateToStorage?: (storageId: string) => void;
}

const PropertiesView = ({
  properties,
  tenants,
  payments,
  expenses,
  contracts = [],
  addProperty,
  updateProperty,
  deleteProperty,
  removeTenantFromProperty,
  onSecurityCheck,
  onOpenLegal,
  addExpense,
  deleteExpense,
  uploadToDrive,
  onNavigateToCreateTenant,
  onNavigateToEditTenant,
  storages,
  onNavigateToStorage,
}: PropertiesViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [subItemDesc, setSubItemDesc] = useState("");
  const [subItemAmount, setSubItemAmount] = useState<number>(0);
  const [expenseForm, setExpenseForm] = useState({
    propertyId: "",
    description: "",
    amount: 0,
    date: format(new Date(), "yyyy-MM-dd"),
    type: "repair" as ExpenseType,
    evidence: "",
    evidenceName: "",
    evidenceLocation: "",
    thumbnailLink: "",
    attachments: [] as { url: string; name: string; thumbnailLink?: string }[],
    items: [] as { description: string; amount: number }[],
  });

  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [inspectionForm, setInspectionForm] = useState<{
    date: string;
    type: "move_in" | "move_out" | "routine";
    notes: string;
    images: { url: string; name: string }[];
  }>({
    date: format(new Date(), "yyyy-MM-dd"),
    type: "move_in",
    notes: "",
    images: [],
  });

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addExpense) return;
    setIsSubmitting(true);
    try {
      await addExpense(expenseForm);
      toast.success("Despesa adicionada com sucesso!");
      setIsExpenseModalOpen(false);
      setSubItemDesc("");
      setSubItemAmount(0);
      setExpenseForm({
        propertyId: "",
        description: "",
        amount: 0,
        date: format(new Date(), "yyyy-MM-dd"),
        type: "repair" as ExpenseType,
        evidence: "",
        evidenceName: "",
        evidenceLocation: "",
        thumbnailLink: "",
        attachments: [],
        items: [],
      });
    } catch (error: any) {
      console.error("Erro ao adicionar despesa:", error);
      toast.error(
        `Erro ao salvar a despesa: ${error?.message || String(error)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveInspection = async () => {
    if (!selectedProperty) return;
    setIsSubmitting(true);
    try {
      const newInspection: PropertyInspection = {
        id: crypto.randomUUID(),
        ...inspectionForm,
        status: "completed",
      };
      const inspections = [
        ...(selectedProperty.inspections || []),
        newInspection,
      ];
      await updateProperty(selectedProperty.id!, { inspections });
      setSelectedProperty({ ...selectedProperty, inspections });
      toast.success("Vistoria salva com sucesso!");
      setIsInspectionModalOpen(false);
      setInspectionForm({
        date: format(new Date(), "yyyy-MM-dd"),
        type: "move_in",
        notes: "",
        images: [],
      });
    } catch (error) {
      console.error("Erro ao salvar vistoria:", error);
      toast.error("Erro ao salvar a vistoria. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [formData, setFormData] = useState<Partial<Property>>({
    name: "",
    address: "",
    status: "vacant" as PropertyStatus,
    rentValue: 0,
    paymentDay: 5,
    currentTenantId: "",
    chargeLateFees: false,
    lateFeePenalty: 10,
    lateFeeDaily: 0.33,
    lateFeeType: "percentage" as "percentage" | "fixed",
    documents: [] as PropertyDocument[],
    renovationEstimatedTime: "",
    renovationDescription: "",
    renovationImages: [] as PropertyInspectionImage[],
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
        currentTenantId: p.currentTenantId || "",
        chargeLateFees: !!p.chargeLateFees,
        lateFeePenalty: p.lateFeePenalty ?? 10,
        lateFeeDaily: p.lateFeeDaily ?? 0.33,
        lateFeeType: p.lateFeeType || "percentage",
        documents: p.documents || [],
        renovationEstimatedTime: p.renovationEstimatedTime || "",
        renovationDescription: p.renovationDescription || "",
        renovationImages: p.renovationImages || [],
        allowPets: p.allowPets === undefined ? true : p.allowPets,
        allowSmoking: p.allowSmoking || false,
        maxResidents: p.maxResidents,
        parkingSpaces: p.parkingSpaces,
        rules: p.rules || "",
        alerts: p.alerts || "",
      });
    } else {
      setEditingProperty(null);
      setFormData({
        name: "",
        address: "",
        status: "vacant",
        rentValue: 0,
        paymentDay: 5,
        currentTenantId: "",
        chargeLateFees: false,
        lateFeePenalty: 10,
        lateFeeDaily: 0.33,
        lateFeeType: "percentage",
        allowPets: true,
        allowSmoking: false,
        maxResidents: undefined,
        parkingSpaces: undefined,
        rules: "",
        alerts: "",
        documents: [
          {
            id: crypto.randomUUID(),
            name: "Matrícula Atualizada",
            status: "pending",
            isRequired: false,
          },
          {
            id: crypto.randomUUID(),
            name: "Carnê do IPTU",
            status: "pending",
            isRequired: false,
          },
          {
            id: crypto.randomUUID(),
            name: "Contas de Consumo (Água/Luz)",
            status: "pending",
            isRequired: false,
          },
          {
            id: crypto.randomUUID(),
            name: "Laudo de Vistoria Inicial",
            status: "pending",
            isRequired: false,
          },
          {
            id: crypto.randomUUID(),
            name: "Seguro Incêndio",
            status: "pending",
            isRequired: false,
          },
          {
            id: crypto.randomUUID(),
            name: "Aprovação de Bombeiros (AVCB)",
            status: "pending",
            isRequired: false,
          },
          {
            id: crypto.randomUUID(),
            name: "Convenção de Condomínio",
            status: "pending",
            isRequired: false,
          },
          {
            id: crypto.randomUUID(),
            name: "Habite-se",
            status: "pending",
            isRequired: false,
          },
        ],
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetail = (p: Property) => {
    setSelectedProperty(p);
    setIsDetailModalOpen(true);
  };

  const currentProperty = useMemo(() => {
    if (!selectedProperty) return null;
    return (
      properties.find((p) => p.id === selectedProperty.id) || selectedProperty
    );
  }, [selectedProperty, properties]);

  const propertyPayments = useMemo(() => {
    if (!currentProperty) return [];
    return payments.filter((p) => p.propertyId === currentProperty.id);
  }, [currentProperty, payments]);

  const latePayments = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return propertyPayments
      .filter(
        (p) =>
          p.status === "late" ||
          (p.status === "pending" && p.dueDate < todayStr),
      )
      .sort(
        (a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(),
      );
  }, [propertyPayments]);

  const pendingPayments = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return propertyPayments
      .filter((p) => p.status === "pending" && p.dueDate >= todayStr)
      .sort(
        (a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(),
      );
  }, [propertyPayments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProperty) {
      onSecurityCheck(async () => {
        setIsSubmitting(true);
        try {
          const payload = { ...formData };
          const isNewTenant = payload.currentTenantId === "new_tenant";
          if (isNewTenant) {
            payload.currentTenantId = "";
          }
          await updateProperty(editingProperty.id, payload);
          setIsModalOpen(false);
          if (isNewTenant) {
            onNavigateToCreateTenant?.(editingProperty.id);
          } else if (
            payload.currentTenantId &&
            payload.currentTenantId !== editingProperty.currentTenantId
          ) {
            onNavigateToEditTenant?.(payload.currentTenantId);
          }
        } catch (error) {
          console.error("Erro ao salvar imóvel:", error);
        } finally {
          setIsSubmitting(false);
        }
      }, `Ao confirmar, você alterará os dados do imóvel ${editingProperty.name}.`);
    } else {
      setIsSubmitting(true);
      try {
        const payload = { ...formData };
        const isNewTenant = payload.currentTenantId === "new_tenant";
        if (isNewTenant) {
          payload.currentTenantId = "";
        }
        const createdId = await addProperty(payload);
        setIsModalOpen(false);
        if (isNewTenant && createdId) {
          onNavigateToCreateTenant?.(createdId);
        } else if (payload.currentTenantId) {
          onNavigateToEditTenant?.(payload.currentTenantId);
        }
      } catch (error) {
        console.error("Erro ao salvar imóvel:", error);
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
          <p className="text-muted-foreground">
            Gerencie suas casas e apartamentos.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Imóvel
        </Button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {properties.map((p) => {
          const tenant = tenants.find((t) => t.id === p.currentTenantId);
          return (
            <Card
              key={p.id}
              className="group hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
              onClick={() => handleOpenDetail(p)}
            >
              <div className="p-3 md:p-4 flex flex-col flex-1">
                <div className="flex flex-col mb-auto gap-1.5">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm md:text-base leading-tight group-hover:text-primary transition-colors line-clamp-2 pr-1">
                      {p.name}
                    </h3>
                    <div
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] uppercase font-bold shrink-0",
                        p.status === "rented"
                          ? "bg-emerald-100 text-emerald-700"
                          : p.status === "vacant"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700",
                      )}
                    >
                      {p.status === "rented"
                        ? "Alugada"
                        : p.status === "vacant"
                          ? "Livre"
                          : "Reforma"}
                    </div>
                  </div>
                  {p.address && (
                    <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2 leading-tight flex items-start gap-1">
                      <Calendar className="w-3 h-3 shrink-0 mt-0.5" />{" "}
                      <span>{p.address}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 mt-2 border-t flex items-center justify-between">
                  <div className="flex flex-col text-xs text-muted-foreground gap-0.5">
                    <span className="font-semibold text-slate-800">
                      R$ {p.rentValue.toLocaleString()}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-400">
                      Aluguel
                    </span>
                  </div>
                  <div className="flex flex-col items-end text-xs gap-0.5 text-right w-1/2">
                    <span className="font-medium text-primary text-[11px] truncate w-full">
                      {tenant ? (
                        tenant.name.split(" ")[0]
                      ) : (
                        <span className="text-muted-foreground italic">
                          Livre
                        </span>
                      )}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-400">
                      Inquilino
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detalhes do Imóvel"
      >
        {currentProperty && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Status
                </p>
                <p
                  className={cn(
                    "text-sm font-bold",
                    currentProperty.status === "rented"
                      ? "text-emerald-600"
                      : currentProperty.status === "vacant"
                        ? "text-amber-600"
                        : "text-blue-600",
                  )}
                >
                  {currentProperty.status === "rented"
                    ? "Alugada"
                    : currentProperty.status === "vacant"
                      ? "Livre"
                      : "Reforma"}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Valor do Aluguel
                </p>
                <p className="text-sm font-bold text-slate-900">
                  R$ {currentProperty.rentValue.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Endereço Completo
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                <p className="text-sm text-slate-700">
                  {currentProperty.address}
                </p>
              </div>
            </div>

            {/* Intelligent Memory Integration */}
            {(currentProperty.allowPets === false ||
              currentProperty.allowSmoking === false ||
              currentProperty.parkingSpaces !== undefined ||
              currentProperty.alerts ||
              currentProperty.maxResidents) && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold flex items-center gap-1.5 text-indigo-500 uppercase tracking-wider ml-1">
                  <Sparkles className="w-3.5 h-3.5" /> Controle Inteligente de
                  Ocupação & Regras
                </p>
                <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/50 p-4 rounded-2xl space-y-3 shadow-sm">
                  {currentProperty.maxResidents && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        Ocupação máxima permitida:{" "}
                        {currentProperty.maxResidents}{" "}
                        {currentProperty.maxResidents === 1
                          ? "morador"
                          : "moradores"}
                        .
                      </span>
                    </div>
                  )}
                  {currentProperty.allowPets === false && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        O imóvel proíbe animais de estimação.
                      </span>
                    </div>
                  )}
                  {currentProperty.allowSmoking === false && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        O imóvel proíbe fumar nas dependências.
                      </span>
                    </div>
                  )}
                  {currentProperty.parkingSpaces !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {currentProperty.parkingSpaces === 0
                          ? "Não possui vagas de garagem."
                          : `Possui ${currentProperty.parkingSpaces} ${currentProperty.parkingSpaces === 1 ? "vaga" : "vagas"} de garagem.`}
                      </span>
                    </div>
                  )}
                  {currentProperty.alerts && (
                    <div className="flex gap-2 text-sm text-slate-700 pt-2 border-t border-indigo-100/55 mt-2">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold block mb-0.5 text-slate-900">
                          Avisos Importantes:
                        </span>
                        <p className="leading-relaxed whitespace-pre-wrap text-sm">
                          {currentProperty.alerts}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Inquilino Atual
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">
                    {tenants.find(
                      (t) => t.id === currentProperty.currentTenantId,
                    )?.name || "Nenhum inquilino alocado"}
                  </p>
                </div>
                {currentProperty.paymentDay && (
                  <p className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded-lg">
                    Vencimento: Dia {currentProperty.paymentDay}
                  </p>
                )}
              </div>
            </div>

            {currentProperty.status === "renovation" && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Hammer className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-indigo-900">
                    Andamento da Reforma
                  </h4>
                </div>
                {currentProperty.renovationEstimatedTime && (
                  <p className="text-xs font-semibold text-indigo-800 bg-indigo-100/50 px-2 py-1.5 rounded-lg w-fit">
                    Tempo Estimado: {currentProperty.renovationEstimatedTime}
                  </p>
                )}
                <div className="space-y-1.5 pt-2">
                  {(currentProperty.renovationDescription || "")
                    .split("\n")
                    .filter((l) => l.trim().length > 0)
                    .map((line, idx) => {
                      const isChecked = line.startsWith("- [x]");
                      const text = line
                        .replace(/^- \[(x| )\] /, "")
                        .replace(/^- /, "")
                        .trim();
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0 border",
                              isChecked
                                ? "bg-emerald-500 border-emerald-600 text-white"
                                : "border-indigo-200 bg-indigo-50",
                            )}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span
                            className={cn(
                              "text-xs",
                              isChecked
                                ? "text-indigo-400 line-through"
                                : "text-indigo-900 font-medium",
                            )}
                          >
                            {text}
                          </span>
                        </div>
                      );
                    })}
                  {(!currentProperty.renovationDescription ||
                    currentProperty.renovationDescription.trim().length ===
                      0) && (
                    <p className="text-xs text-indigo-400 italic">
                      Nenhum item no checklist.
                    </p>
                  )}
                </div>
                {
                  /* Launch Expenses Button inside detail */
                  addExpense && (
                    <div className="pt-3 border-t border-indigo-100/50 mt-3">
                      <button
                        onClick={() => {
                          setExpenseForm((prev) => ({
                            ...prev,
                            propertyId: currentProperty.id,
                            type: "renovation",
                          }));
                          setIsDetailModalOpen(false);
                          setIsExpenseModalOpen(true);
                        }}
                        className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 w-full justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" /> Lançar Despesa da
                        Reforma
                      </button>
                    </div>
                  )
                }
              </div>
            )}

            {/* Document Alerts Pipeline */}
            {currentProperty.documents &&
              currentProperty.documents.filter((d) => d.status !== "valid")
                .length > 0 && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-indigo-900 mb-1">
                      Dica do Hub Estratégico
                    </h4>
                    <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
                      Manter a papelada do imóvel organizada valoriza seu espaço
                      e evita dores de cabeça futuras. Há documentos pendentes
                      na auditoria.
                    </p>
                    <button
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        onOpenLegal();
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-all shadow-sm shadow-indigo-200 w-fit"
                    >
                      <FolderCheck className="w-3.5 h-3.5" /> Abrir Auditoria de
                      Documentos
                    </button>
                  </div>
                </div>
              )}

            {/* Depósitos ou Garagens Vinculados */}
            {storages && storages.filter((s) => s.propertyId === currentProperty.id).length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Depósitos & Garagens Vinculados
                </p>
                <div className="space-y-2">
                  {storages
                    .filter((s) => s.propertyId === currentProperty.id)
                    .map((s) => {
                      const itemsVal = s.items?.reduce((sum, i) => sum + (i.cost * i.quantity), 0) || 0;
                      return (
                        <div
                          key={s.id}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2 cursor-pointer hover:bg-slate-100/80 transition-colors"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            onNavigateToStorage && onNavigateToStorage(s.id!);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                <Box className="w-3.5 h-3.5 text-emerald-500" />
                                {s.name}
                              </p>
                              {s.address && (
                                <p className="text-[10px] text-slate-400 mt-0.5">{s.address}</p>
                              )}
                            </div>
                            <span className="text-xs font-bold text-red-600 shrink-0">
                              R$ {s.monthlyCost?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 font-mono">
                            <span>Vence dia {s.dueDay}</span>
                            <span className="font-sans text-slate-600 font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                              {s.items?.length || 0} itens guardados (R$ {itemsVal.toLocaleString("pt-BR")})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Pagamentos Pendentes e em Atraso */}
            {(pendingPayments.length > 0 || latePayments.length > 0) && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Pagamentos do Imóvel
                </p>
                <div className="space-y-2">
                  {latePayments.map((p) => {
                    const daysLate = differenceInDays(
                      new Date(),
                      parseISO(p.dueDate),
                    );
                    return (
                      <div
                        key={p.id}
                        className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-red-900">
                                {p.description || "Aluguel"}
                              </p>
                              {p.revertReason && (
                                <button
                                  title={`Revertido: ${p.revertReason}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.info(
                                      `Justificativa da Reversão: ${p.revertReason}`,
                                      {
                                        duration: 5000,
                                      },
                                    );
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
                            <p className="text-[10px] text-red-700 flex items-center gap-1 flex-wrap">
                              Vencimento:{" "}
                              {format(parseISO(p.dueDate), "dd/MM/yyyy")}
                              {p.originalDueDate && (
                                <span
                                  className="inline-block text-amber-600 font-semibold"
                                  title={`Vencimento original coincidia com fim de semana ou feriado (vencimento original: ${format(parseISO(p.originalDueDate), "dd/MM/yyyy")})`}
                                >
                                  • Útil Posterior
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-red-900">
                          R${" "}
                          {(
                            p.amount + (p.interestAmount || 0)
                          ).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                  {pendingPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-blue-900">
                              {p.description || "Aluguel"}
                            </p>
                            {p.revertReason && (
                              <button
                                title={`Revertido: ${p.revertReason}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.info(
                                    `Justificativa da Reversão: ${p.revertReason}`,
                                    {
                                      duration: 5000,
                                    },
                                  );
                                }}
                                className="text-amber-500 hover:text-amber-600 transition-colors"
                              >
                                <AlertCircle className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-blue-700 flex items-center gap-1 flex-wrap">
                            Vencimento:{" "}
                            {format(parseISO(p.dueDate), "dd/MM/yyyy")}
                            {p.originalDueDate && (
                              <span
                                className="inline-block text-amber-600 font-semibold"
                                title={`Vencimento original coincidia com fim de semana ou feriado (vencimento original: ${format(parseISO(p.originalDueDate), "dd/MM/yyyy")})`}
                              >
                                • Útil Posterior
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-blue-900">
                        R$ {p.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Despesas do Imóvel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Despesas do Imóvel
                </p>
                {addExpense && (
                  <button
                    onClick={() => {
                      setExpenseForm((prev) => ({
                        ...prev,
                        propertyId: currentProperty.id!,
                      }));
                      setIsExpenseModalOpen(true);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Despesa
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {expenses.filter((e) => e.propertyId === currentProperty.id)
                  .length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-1">
                    Nenhuma despesa registrada para este imóvel.
                  </p>
                ) : (
                  expenses
                    .filter((e) => e.propertyId === currentProperty.id)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 5)
                    .map((e) => (
                      <div
                        key={e.id}
                        className="p-3 bg-red-50/30 border border-slate-100 rounded-xl flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <TrendingDown className="w-4 h-4 text-red-400" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {e.description}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {format(parseISO(e.date), "dd/MM/yyyy")} •{" "}
                              {e.type === "repair"
                                ? "Manutenção"
                                : e.type === "renovation"
                                  ? "Reforma"
                                  : e.type === "tax"
                                    ? "Imposto"
                                    : e.type === "fine"
                                      ? "Multa"
                                      : "Outro"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {e.evidenceLocation && (
                            <a
                              href={
                                e.evidenceLocation.startsWith("http")
                                  ? e.evidenceLocation
                                  : "#"
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100"
                              title="Ver Comprovante"
                            >
                              <Paperclip className="w-3 h-3" />
                            </a>
                          )}
                          <p className="text-sm font-bold text-red-600">
                            R$ {e.amount.toLocaleString()}
                          </p>
                          {deleteExpense && (
                            <button
                              onClick={() => deleteExpense(e.id!)}
                              className="w-6 h-6 rounded bg-red-50 text-red-600 items-center justify-center hover:bg-red-100 hidden group-hover:flex"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {currentProperty.documents &&
              currentProperty.documents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase px-1">
                    Organizador de Papelada
                  </h3>
                  <div className="grid gap-2">
                    {currentProperty.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors rounded-xl flex items-center justify-between group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900">
                              {doc.name}
                            </p>
                            {doc.isRequired && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600">
                                Obrigatório
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 flex flex-wrap items-center gap-1">
                            {doc.status === "valid" && (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Válido
                              </span>
                            )}
                            {doc.status === "missing" && (
                              <span className="text-amber-600 flex items-center gap-1">
                                <FileQuestion className="w-3 h-3" /> PENDENTE
                              </span>
                            )}
                            {doc.status === "expired" && (
                              <span className="text-rose-600 flex items-center gap-1">
                                <FileWarning className="w-3 h-3" /> Expirado
                              </span>
                            )}
                            {doc.status === "pending" && (
                              <span className="text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pendente
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {doc.status !== "valid" && (
                            <button
                              onClick={onOpenLegal}
                              className="w-7 h-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Perguntar ao Chat como resolver"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                const updatedDocs =
                                  currentProperty.documents!.map((d) =>
                                    d.id === doc.id
                                      ? { ...d, status: "valid" as const }
                                      : d,
                                  );
                                updateProperty(currentProperty.id!, {
                                  documents: updatedDocs,
                                });
                                toast.success(
                                  `Documento ${doc.name} marcado como válido.`,
                                );
                              }}
                              className="w-7 h-7 rounded bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200"
                              title="Marcar como Válido"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const updatedDocs =
                                  currentProperty.documents!.map((d) =>
                                    d.id === doc.id
                                      ? { ...d, status: "missing" as const }
                                      : d,
                                  );
                                updateProperty(currentProperty.id!, {
                                  documents: updatedDocs,
                                });
                              }}
                              className="w-7 h-7 rounded bg-red-100 text-red-700 flex items-center justify-center hover:bg-red-200"
                              title="Informar Pendência"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Vistorias / Inspeções */}
            <div className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Vistorias Digitais
                </p>
                <button
                  onClick={() => setIsInspectionModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nova Vistoria
                </button>
              </div>

              <div className="space-y-2">
                {!currentProperty.inspections ||
                currentProperty.inspections.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-1">
                    Nenhuma vistoria registrada.
                  </p>
                ) : (
                  currentProperty.inspections
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((insp) => (
                      <div
                        key={insp.id}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group"
                      >
                        <div className="flex flex-col">
                          <p className="text-xs font-bold text-slate-800">
                            {insp.type === "move_in"
                              ? "Vistoria de Entrada"
                              : insp.type === "move_out"
                                ? "Vistoria de Saída"
                                : "Vistoria de Rotina"}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {format(parseISO(insp.date), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {insp.images?.length > 0 && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <Camera className="w-3 h-3" />{" "}
                              {insp.images.length} fotos
                            </span>
                          )}
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest",
                              insp.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700",
                            )}
                          >
                            {insp.status === "completed"
                              ? "Concluída"
                              : "Rascunho"}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="pt-4 grid grid-cols-2 lg:flex gap-3 mt-4 border-t border-slate-100">
              <Button
                className="w-full lg:flex-1 py-2 sm:py-3"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenModal(selectedProperty);
                }}
              >
                <Edit className="w-4 h-4 mr-1 sm:mr-2" />{" "}
                <span className="text-xs sm:text-sm">Editar</span>
              </Button>
              {currentProperty.currentTenantId && (
                <Button
                  variant="outline"
                  className="w-full lg:flex-1 py-2 sm:py-3 text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 whitespace-nowrap"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    removeTenantFromProperty(
                      currentProperty.id!,
                      currentProperty.currentTenantId!,
                      "archived",
                    );
                  }}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-1 sm:mr-2" />{" "}
                  <span className="text-xs sm:text-sm">Desocupar</span>
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full lg:flex-1 py-2 sm:py-3"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Fechar
              </Button>
              <Button
                variant="danger"
                className="py-2 sm:py-3"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  const linkedContracts = contracts.filter(
                    (c) => c.propertyId === currentProperty.id && c.status !== "archived"
                  );
                  let warningMsg = `Ao confirmar, você excluirá permanentemente o imóvel ${currentProperty.name}.`;
                  if (linkedContracts.length > 0) {
                    warningMsg = `Atenção: O imóvel "${currentProperty.name}" possui ${linkedContracts.length} contrato(s) de locação vinculado(s). Ao confirmar a exclusão, este imóvel será removido e o contrato vinculado será automaticamente ARQUIVADO por segurança para o seu histórico. Você poderá encontrar o contrato arquivado a qualquer momento na seção de Contratos, utilizando o filtro 'Arquivados'.`;
                  }
                  onSecurityCheck(
                    () => deleteProperty(currentProperty.id!),
                    warningMsg,
                  );
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isInspectionModalOpen}
        onClose={() => setIsInspectionModalOpen(false)}
        title="Nova Vistoria Digital"
      >
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Tipo de Vistoria
              </label>
              <Select
                id="insp-type"
                value={inspectionForm.type}
                onChange={(e) =>
                  setInspectionForm({
                    ...inspectionForm,
                    type: e.target.value as any,
                  })
                }
                options={[
                  { label: "Entrada (Início de Contrato)", value: "move_in" },
                  { label: "Saída (Término de Contrato)", value: "move_out" },
                  { label: "Rotina (Manutenção)", value: "routine" },
                ]}
              />
            </div>
            <div className="flex-1">
              <Input
                id="insp-date"
                type="date"
                label="Data"
                value={inspectionForm.date}
                onChange={(e) =>
                  setInspectionForm({ ...inspectionForm, date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
              Checklist & Observações do Imóvel
            </label>
            <textarea
              className="w-full min-h-[120px] p-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-all placeholder:text-slate-400"
              placeholder="Descreva as condições reais da pintura, piso, portas, fechaduras e armários..."
              value={inspectionForm.notes}
              onChange={(e) =>
                setInspectionForm({ ...inspectionForm, notes: e.target.value })
              }
            />
          </div>

          <div className="flex flex-col gap-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
              Fotos / Evidências
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center gap-3">
              <input
                type="file"
                id="insp-photos"
                multiple
                accept="image/*"
                className="hidden"
                disabled={!uploadToDrive}
                onChange={async (e) => {
                  if (e.target.files && uploadToDrive) {
                    const files = Array.from(e.target.files);
                    toast.promise(
                      Promise.all(
                        files.map(async (file) => {
                          return new Promise<{ url: string; name: string }>(
                            (resolve, reject) => {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                try {
                                  const base64 = reader.result as string;
                                  const compressed = await compressImage(
                                    base64,
                                    1200,
                                    1200,
                                    0.7,
                                  );
                                  const res = await uploadToDrive(
                                    file.name,
                                    compressed,
                                    file.type,
                                    `Vistoria-${selectedProperty?.name}`,
                                  );
                                  resolve({
                                    url: res.webViewLink,
                                    name: file.name,
                                  });
                                } catch (err) {
                                  reject(err);
                                }
                              };
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            },
                          );
                        }),
                      ),
                      {
                        loading: `Fazendo upload seguro de ${files.length} foto(s)...`,
                        success: (uploadedPhotos) => {
                          setInspectionForm((prev) => ({
                            ...prev,
                            images: [...prev.images, ...uploadedPhotos],
                          }));
                          return "Fotos adicionadas ao álbum.";
                        },
                        error: "Falha ao processar imagens.",
                      },
                    );
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 justify-center w-full">
                {inspectionForm.images.map((img, i) => (
                  <div key={i} className="relative group">
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-16 h-16 rounded-lg bg-indigo-50 border border-indigo-100 overflow-hidden relative shadow-sm"
                    >
                      <div className="absolute inset-0 flex items-center justify-center bg-indigo-100/50">
                        <Camera className="w-6 h-6 text-indigo-400" />
                      </div>
                    </a>
                    <button
                      onClick={() =>
                        setInspectionForm((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("insp-photos")?.click()}
                disabled={!uploadToDrive}
                className="gap-2 bg-white mt-1 border-dashed"
              >
                <Camera className="w-4 h-4" /> Anexar Fotos
              </Button>
              {!uploadToDrive && (
                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">
                  Drive não conectado! Acesse "Arquivos" para configurar o
                  backup.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            <Button
              onClick={handleSaveInspection}
              className="flex-1"
              disabled={isSubmitting || !inspectionForm.notes}
            >
              {isSubmitting ? "Finalizando..." : "Gerar Laudo de Vistoria"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsInspectionModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Nova Despesa (Este Imóvel)"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <Input
            id="expense-desc"
            label="Descrição da Despesa"
            value={expenseForm.description}
            onChange={(e) =>
              setExpenseForm({ ...expenseForm, description: e.target.value })
            }
            required
            placeholder="Ex: Conserto do telhado"
          />
          <div className="grid grid-cols-2 gap-4">
            <CurrencyInput
              id="expense-amount"
              label="Valor (R$)"
              value={expenseForm.amount}
              onChange={(val) =>
                setExpenseForm({ ...expenseForm, amount: val })
              }
              required
            />
            <Input
              id="expense-date"
              type="date"
              label="Data da Despesa"
              value={expenseForm.date}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, date: e.target.value })
              }
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
              Tipo de Despesa
            </label>
            <select
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              value={expenseForm.type}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, type: e.target.value as any })
              }
              required
            >
              <option value="repair">Manutenção / Conserto</option>
              <option value="renovation">Reforma / Melhoria</option>
              <option value="tax">Imposto / Taxa</option>
              <option value="fine">Multa</option>
              <option value="other">Outros</option>
            </select>
          </div>

          <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              Gastos Detalhados (Opcional - Soma Automática)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                id="prop-subitem-desc"
                label="Identificação do Gasto (Ex: Cano)"
                placeholder="Ex: Cano, Massa, Tinta"
                value={subItemDesc}
                onChange={(e) => setSubItemDesc(e.target.value)}
              />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <CurrencyInput
                    id="prop-subitem-amount"
                    label="Valor do Gasto (R$)"
                    value={subItemAmount}
                    onChange={(val) => setSubItemAmount(val)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (!subItemDesc.trim()) {
                      toast.error("Por favor, preencha a descrição do item.");
                      return;
                    }
                    if (subItemAmount <= 0) {
                      toast.error("O valor do item deve ser maior que zero.");
                      return;
                    }

                    const newItem = {
                      description: subItemDesc.trim(),
                      amount: subItemAmount,
                    };
                    const updatedItems = [
                      ...(expenseForm.items || []),
                      newItem,
                    ];
                    const totalSum = updatedItems.reduce(
                      (acc, item) => acc + item.amount,
                      0,
                    );

                    // Automatically compile descriptions nicely
                    let newDesc = expenseForm.description;
                    if (
                      !expenseForm.description ||
                      expenseForm.description === "Despesa com vários itens"
                    ) {
                      newDesc = updatedItems
                        .map(
                          (item) => `${item.description} (R$ ${item.amount})`,
                        )
                        .join(" + ");
                    } else {
                      // Append it if not already containing it
                      if (
                        !expenseForm.description.includes(newItem.description)
                      ) {
                        newDesc = `${expenseForm.description} + ${newItem.description} (R$ ${newItem.amount})`;
                      }
                    }

                    setExpenseForm({
                      ...expenseForm,
                      items: updatedItems,
                      amount: totalSum,
                      description: newDesc,
                    });

                    setSubItemDesc("");
                    setSubItemAmount(0);
                    toast.success("Item adicionado!");
                  }}
                  className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 font-bold flex items-center justify-center text-xs"
                >
                  Adicionar
                </Button>
              </div>
            </div>

            {expenseForm.items && expenseForm.items.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Itens Lançados:
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {expenseForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-white px-3 py-1.5 rounded-xl border border-slate-100 text-xs shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600">
                          Gasto {idx + 1}:
                        </span>
                        <span className="text-slate-600 font-medium">
                          {item.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          R${" "}
                          {item.amount.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = [...expenseForm.items];
                            newItems.splice(idx, 1);
                            const totalSum = newItems.reduce(
                              (acc, it) => acc + it.amount,
                              0,
                            );

                            // Recalculate description nicely
                            let newDesc = "";
                            if (newItems.length > 0) {
                              newDesc = newItems
                                .map(
                                  (it) => `${it.description} (R$ ${it.amount})`,
                                )
                                .join(" + ");
                            }

                            setExpenseForm({
                              ...expenseForm,
                              items: newItems,
                              amount: totalSum,
                              description: newDesc,
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
              Anexar Comprovante(s) (Opcional)
            </label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="prop-expense-evidence"
                  className="hidden"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;

                    const tenantName =
                      tenants.find(
                        (t) => t.propertyId === expenseForm.propertyId,
                      )?.name || "Geral";
                    for (const file of files) {
                      // Check for duplicates
                      const duplicateExp = Array.isArray(expenses)
                        ? expenses.find((exp) =>
                            exp.attachments?.some((a) => a.name === file.name),
                          )
                        : null;
                      if (duplicateExp) {
                        const confirmReuse = window.confirm(
                          `Atenção: O comprovante "${file.name}" já foi utilizado na despesa "${duplicateExp.description || "Desconhecida"}". Deseja realmente utilizá-lo de novo nesta nova despesa?`,
                        );
                        if (!confirmReuse) {
                          continue;
                        }
                      }

                      const reader = new FileReader();
                      const filePromise = new Promise<string>((resolve) => {
                        reader.onloadend = () =>
                          resolve(reader.result as string);
                        reader.readAsDataURL(file);
                      });
                      const base64 = await filePromise;

                      // Analyze with AI agent
                      toast.promise(scanInvoice(base64), {
                        loading: `Analisando valores de ${file.name}...`,
                        success: (extractedData) => {
                          if (extractedData && extractedData.amount) {
                            setExpenseForm((prev) => ({
                              ...prev,
                              amount:
                                (Number(prev.amount) || 0) +
                                Number(extractedData.amount),
                              description: prev.description
                                ? `${prev.description} + ${extractedData.description || file.name}`
                                : extractedData.description ||
                                  "Despesa com vários itens",
                            }));
                            return `Extraído: R$ ${extractedData.amount}`;
                          }
                          return `Análise de ${file.name} concluída.`;
                        },
                        error: `Falha ao analisar ${file.name}`,
                      });

                      if (uploadToDrive) {
                        toast.promise(
                          uploadToDrive(
                            file.name,
                            base64,
                            file.type,
                            tenantName,
                          ),
                          {
                            loading: `Enviando ${file.name}...`,
                            success: (data) => {
                              setExpenseForm((prev) => ({
                                ...prev,
                                attachments: [
                                  ...(prev.attachments || []),
                                  {
                                    url: data.webViewLink,
                                    name: file.name,
                                    thumbnailLink: data.thumbnailLink,
                                  },
                                ],
                              }));
                              return `${file.name} salvo numeração automática.`;
                            },
                            error: `Erro ao enviar ${file.name}`,
                          },
                        );
                      } else {
                        // Fallback processing for no drive
                        setExpenseForm((prev) => ({
                          ...prev,
                          attachments: [
                            ...(prev.attachments || []),
                            { url: base64, name: file.name },
                          ],
                        }));
                      }
                    }
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    document.getElementById("prop-expense-evidence")?.click()
                  }
                  className="w-full gap-2 border-dashed bg-slate-50/50 hover:bg-slate-100"
                >
                  <Paperclip className="w-4 h-4" />
                  Adicionar Arquivos
                </Button>
              </div>

              {((expenseForm.attachments &&
                expenseForm.attachments.length > 0) ||
                expenseForm.evidenceLocation) && (
                <div className="flex flex-col gap-2 mt-1">
                  {(expenseForm.attachments || []).map((att, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100"
                    >
                      <p className="text-[10px] text-emerald-700 flex items-center gap-1.5 font-medium truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">
                          Evidência {i + 1}: {att.name}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const newAtts = [...(expenseForm.attachments || [])];
                          newAtts.splice(i, 1);
                          setExpenseForm((prev) => ({
                            ...prev,
                            attachments: newAtts,
                          }));
                        }}
                        className="text-emerald-600 hover:text-emerald-800 p-1 rounded-md hover:bg-emerald-100/50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {/* Keep legacy evidenceLocation display for fallback */}
                  {expenseForm.evidenceLocation &&
                    (!expenseForm.attachments ||
                      expenseForm.attachments.length === 0) && (
                      <div className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                        <p className="text-[10px] text-emerald-700 flex items-center gap-1.5 font-medium truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {expenseForm.evidenceName || "Arquivo anexado"}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setExpenseForm((prev) => ({
                              ...prev,
                              evidenceLocation: "",
                              evidenceName: "",
                            }))
                          }
                          className="text-emerald-600 hover:text-emerald-800 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Despesa"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExpenseModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProperty ? "Editar Imóvel" : "Novo Imóvel"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              Informações Principais
            </h3>
            <Input
              id="name"
              label="Nome do Imóvel"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="Ex: Apartamento 101"
            />
            <Input
              id="address"
              label="Endereço"
              value={formData.address || ""}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              required
              placeholder="Rua, Número, Bairro, Cidade"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              Detalhes e Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Status
                  <InfoTooltip text="Livre: Disponível para alugar. Alugada: Já possui inquilino. Reforma: Indisponível temporariamente." />
                </label>
                <Select
                  id="status"
                  value={formData.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as PropertyStatus;
                    if (newStatus === "vacant" || newStatus === "renovation") {
                      setFormData({
                        ...formData,
                        status: newStatus,
                        currentTenantId: "",
                      });
                    } else {
                      setFormData({ ...formData, status: newStatus });
                    }
                  }}
                  options={[
                    { label: "Livre", value: "vacant" },
                    { label: "Alugada", value: "rented" },
                    { label: "Reforma", value: "renovation" },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Limite de Moradores
                </label>
                <Input
                  id="maxResidents"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  placeholder="Ilimitado"
                  value={formData.maxResidents || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxResidents: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Aceita Animais?
                </label>
                <Select
                  id="allowPets"
                  value={formData.allowPets ? "yes" : "no"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allowPets: e.target.value === "yes",
                    })
                  }
                  options={[
                    { label: "Sim", value: "yes" },
                    { label: "Não", value: "no" },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Aceita Fumantes?
                </label>
                <Select
                  id="allowSmoking"
                  value={formData.allowSmoking ? "yes" : "no"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allowSmoking: e.target.value === "yes",
                    })
                  }
                  options={[
                    { label: "Sim", value: "yes" },
                    { label: "Não", value: "no" },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Vagas de Garagem (Carros/Motos)
                </label>
                <Input
                  id="parkingSpaces"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  placeholder="Ex: 1"
                  value={
                    formData.parkingSpaces === undefined
                      ? ""
                      : formData.parkingSpaces
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      parkingSpaces: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              Informações Financeiras
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Valor de Mercado Estimado (R$)
                </label>
                <Input
                  id="marketValue"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 350000"
                  value={formData.marketValue || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, marketValue: Number(e.target.value) })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Chave PIX (Para Recebimento)
                </label>
                <Input
                  id="pixKey"
                  type="text"
                  placeholder="CPF, E-mail, Celular ou Aleatória"
                  value={formData.pixKey || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, pixKey: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {formData.status !== "renovation" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Inquilino Atual
              </label>
              <Select
                id="tenant"
                value={formData.currentTenantId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const nextStatus = val ? "rented" : "vacant";
                  setFormData({
                    ...formData,
                    currentTenantId: val,
                    status: nextStatus,
                  });
                }}
                options={[
                  { label: "Nenhum", value: "" },
                  {
                    label: "+ Novo Inquilino (Criar após salvar)",
                    value: "new_tenant",
                  },
                  ...tenants
                    .filter(
                      (t) =>
                        t.status !== "archived" &&
                        (!t.propertyId || t.propertyId === editingProperty?.id),
                    )
                    .map((t) => ({ label: t.name, value: t.id })),
                ]}
              />
              <p className="text-[10px] text-slate-500 ml-1 mt-1">
                Acesse a aba <strong>Inquilinos</strong> ou{" "}
                <strong>Contratos</strong> depois para gerar ou assinar o
                contrato.
              </p>
            </div>
          )}

          {formData.status === "renovation" && (
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
              <h4 className="text-sm font-bold text-indigo-900">
                Detalhes da Reforma
              </h4>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Tempo Estimado
                </label>
                <div className="flex gap-2">
                  <Input
                    id="renovationTime"
                    className="flex-grow"
                    placeholder="Tempo"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={
                      formData.renovationEstimatedTime?.split(" ")[0] || ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        renovationEstimatedTime: `${e.target.value} ${formData.renovationEstimatedTime?.split(" ")[1] || "meses"}`,
                      })
                    }
                  />
                  <select
                    className="rounded-xl border border-indigo-200 bg-white px-3 text-sm focus:border-indigo-500 outline-none"
                    value={
                      formData.renovationEstimatedTime?.split(" ")[1] || "meses"
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        renovationEstimatedTime: `${formData.renovationEstimatedTime?.split(" ")[0] || ""} ${e.target.value}`,
                      })
                    }
                  >
                    <option value="dias">dias</option>
                    <option value="semanas">semanas</option>
                    <option value="meses">meses</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                    Checklist da Reforma
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingProperty?.id) {
                        setExpenseForm((prev) => ({
                          ...prev,
                          propertyId: editingProperty.id,
                          type: "renovation",
                        }));
                        setIsExpenseModalOpen(true);
                      } else {
                        toast.error(
                          "Salve o imóvel primeiro para adicionar despesas.",
                        );
                      }
                    }}
                    className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Lançar Despesa
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {(formData.renovationDescription || "")
                    .split("\n")
                    .filter((l) => l.trim().length > 0)
                    .map((line, idx, arr) => {
                      const isChecked = line.startsWith("- [x]");
                      const text = line
                        .replace(/^- \[(x| )\] /, "")
                        .replace(/^- /, "")
                        .trim();
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-white border border-indigo-100/60 rounded-lg group transition-all hover:border-indigo-300"
                        >
                          <div
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                            onClick={() => {
                              const newArr = [...arr];
                              newArr[idx] = isChecked
                                ? `- [ ] ${text}`
                                : `- [x] ${text}`;
                              setFormData({
                                ...formData,
                                renovationDescription: newArr.join("\n"),
                              });
                            }}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-sm flex items-center justify-center shrink-0 border transition-all",
                                isChecked
                                  ? "bg-emerald-500 border-emerald-600 text-white"
                                  : "border-slate-300 bg-slate-50",
                              )}
                            >
                              {isChecked && <Check className="w-3 h-3" />}
                            </div>
                            <span
                              className={cn(
                                "text-sm transition-all",
                                isChecked
                                  ? "text-slate-400 line-through"
                                  : "text-slate-700 font-medium",
                              )}
                            >
                              {text}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newArr = arr.filter((_, i) => i !== idx);
                              setFormData({
                                ...formData,
                                renovationDescription: newArr.join("\n"),
                              });
                            }}
                            className="text-slate-300 md:opacity-0 md:group-hover:opacity-100 hover:text-red-500 transition-all p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  {(!formData.renovationDescription ||
                    formData.renovationDescription.trim().length === 0) && (
                    <p className="text-xs text-slate-400 italic px-1 py-2">
                      Nenhum item adicionado ao checklist.
                    </p>
                  )}
                </div>

                <textarea
                  className="w-full min-h-[40px] rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 outline-none mt-2 placeholder:text-slate-400"
                  placeholder="Digite um novo item e pressione Enter..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        const current = formData.renovationDescription
                          ? formData.renovationDescription.trim() + "\n"
                          : "";
                        setFormData({
                          ...formData,
                          renovationDescription: current + `- [ ] ${val}`,
                        });
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />

                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    "Pintura completa",
                    "Troca de fiação",
                    "Limpeza pós-obra",
                    "Troca de piso",
                    "Revisão hidráulica",
                    "Impermeabilização",
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          renovationDescription: formData.renovationDescription
                            ? `${formData.renovationDescription.trim()}\n- [ ] ${s}`
                            : `- [ ] ${s}`,
                        })
                      }
                      className="px-2 py-1 bg-white border border-indigo-200 rounded text-[10px] text-indigo-700 hover:border-indigo-400"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Fotos da Reforma
                </label>
                <input
                  type="file"
                  id="renovation-photos"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setFormData({
                          ...formData,
                          renovationImages: [
                            ...(formData.renovationImages || []),
                            {
                              url: ev.target?.result as string,
                              name: file.name,
                            },
                          ],
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    document.getElementById("renovation-photos")?.click()
                  }
                  className="w-full gap-2 border-dashed"
                >
                  <Paperclip className="w-4 h-4" /> Adicionar Foto
                </Button>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.renovationImages?.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative w-16 h-16 rounded overflow-hidden"
                    >
                      <img
                        src={img.url}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            renovationImages: formData.renovationImages?.filter(
                              (_, i) => i !== idx,
                            ),
                          })
                        }
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Alertas sobre o Imóvel
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none placeholder:text-slate-400"
                placeholder="Ex: Vazamento no teto necessita atenção no inverno..."
                value={formData.alerts || ""}
                onChange={(e) =>
                  setFormData({ ...formData, alerts: e.target.value })
                }
              />
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
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
  contracts: Contract[];
  tickets: Ticket[];
  user: any;
  handleNavigate: (tab: any, highlightId?: string) => void;
  addTenant: (t: any) => Promise<any>;
  updateTenant: (id: string, t: any) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  onOpenDetail: (t: Tenant) => void;
  onSecurityCheck: (onSuccess: () => void, description?: string) => void;
  isDriveConnected: boolean;
  uploadToDrive: (
    fileName: string,
    fileData: string,
    mimeType: string,
    folderName?: string,
  ) => Promise<any>;
  setPreviewReceipt: (
    preview: { url: string; name: string; isImage: boolean } | null,
  ) => void;
  initialPropertyId?: string | null;
  onClearInitialPropertyId?: () => void;
  initialTenantIdToEdit?: string | null;
  onClearInitialTenantIdToEdit?: () => void;
  onNavigateToGenerateContract?: (contractData: any) => void;
}

const TenantsView = ({
  tenants,
  properties,
  payments,
  contracts,
  tickets,
  user,
  handleNavigate,
  addTenant,
  updateTenant,
  deleteTenant,
  onOpenDetail,
  onSecurityCheck,
  isDriveConnected,
  uploadToDrive,
  setPreviewReceipt,
  initialPropertyId,
  onClearInitialPropertyId,
  initialTenantIdToEdit,
  onClearInitialTenantIdToEdit,
  onNavigateToGenerateContract,
}: TenantsViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTicketsModalOpen, setIsTicketsModalOpen] = useState(false);
  const [isNoPropertiesPromptOpen, setIsNoPropertiesPromptOpen] =
    useState(false);
  const [isContractRedirectModalOpen, setIsContractRedirectModalOpen] =
    useState(false);
  const [justCreatedTenant, setJustCreatedTenant] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<Partial<Tenant>>({
    name: "",
    cpf: "",
    contact: "",
    secondaryContact: "",
    accessPassword: "",
    additionalResidents: [],
    status: "waiting" as TenantStatus,
    rating: 5,
    observations: "",
    leaseDurationMonths: 12,
    firstRentDueDate: "",
  });

  useEffect(() => {
    if (initialTenantIdToEdit) {
      const tenantToEdit = tenants.find((t) => t.id === initialTenantIdToEdit);
      if (tenantToEdit) {
        setEditingTenant(tenantToEdit);
        setFormData({
          ...tenantToEdit,
          cpf: tenantToEdit.cpf || "",
          contact: tenantToEdit.contact || "",
          secondaryContact: tenantToEdit.secondaryContact || "",
          accessPassword: tenantToEdit.accessPassword || "",
          observations: tenantToEdit.observations || "",
          evidenceLocation: tenantToEdit.evidenceLocation || "",
          additionalResidents: tenantToEdit.additionalResidents || [],
          leaseDurationMonths: tenantToEdit.leaseDurationMonths || 12,
          firstRentDueDate: tenantToEdit.firstRentDueDate || "",
          hasPets:
            tenantToEdit.hasPets ??
            (tenantToEdit.pets && tenantToEdit.pets.trim() !== ""
              ? true
              : undefined),
          hasVehicles:
            tenantToEdit.hasVehicles ??
            (tenantToEdit.vehicleDetails &&
            tenantToEdit.vehicleDetails.trim() !== ""
              ? true
              : undefined),
        });
        setIsModalOpen(true);
      }
      onClearInitialTenantIdToEdit?.();
    } else if (initialPropertyId) {
      setEditingTenant(null);
      setFormData({
        name: "",
        cpf: "",
        contact: "",
        secondaryContact: "",
        status: "allocated",
        propertyId: initialPropertyId,
        rating: 5,
        observations: "",
        leaseDurationMonths: 12,
        firstRentDueDate: "",
      });
      setIsModalOpen(true);
      onClearInitialPropertyId?.();
    }
  }, [
    initialPropertyId,
    initialTenantIdToEdit,
    tenants,
    onClearInitialPropertyId,
    onClearInitialTenantIdToEdit,
  ]);

  const handleOpenModal = (t?: Tenant) => {
    if (t) {
      setEditingTenant(t);
      setFormData({
        name: t.name,
        cpf: t.cpf,
        contact: t.contact,
        secondaryContact: t.secondaryContact || "",
        accessPassword: t.accessPassword || "",
        additionalResidents: t.additionalResidents || [],
        status: t.status,
        propertyId: t.propertyId || "",
        initialPaymentType: t.initialPaymentType || "rent",
        depositValue: t.depositValue || 0,
        depositInstallments: t.depositInstallments || 1,
        depositDueDate: t.depositDueDate || "",
        rating: t.rating || 5,
        observations: t.observations || "",
        leaseDurationMonths: t.leaseDurationMonths || 12,
        firstRentDueDate: t.firstRentDueDate || "",
      });
      setIsModalOpen(true);
    } else {
      const hasAvailableProperties = properties.some(
        (p) => p.status === "vacant",
      );
      if (!hasAvailableProperties) {
        setIsNoPropertiesPromptOpen(true);
        return;
      }
      proceedToCreateTenant();
    }
  };

  const proceedToCreateTenant = () => {
    setIsNoPropertiesPromptOpen(false);
    setEditingTenant(null);
    setFormData({
      name: "",
      cpf: "",
      contact: "",
      secondaryContact: "",
      accessPassword: "",
      additionalResidents: [],
      status: "waiting",
      propertyId: "",
      initialPaymentType: "rent",
      depositValue: 0,
      depositInstallments: 1,
      depositDueDate: "",
      rating: 5,
      observations: "",
      leaseDurationMonths: 12,
      firstRentDueDate: "",
    });
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
          console.error("Erro ao salvar inquilino:", error);
        } finally {
          setIsSubmitting(false);
        }
      }, `Ao confirmar, você alterará os dados cadastrais de ${editingTenant.name}.`);
    } else {
      setIsSubmitting(true);
      try {
        const newTenantId = await addTenant(formData);
        setIsModalOpen(false);
        if (newTenantId) {
          setJustCreatedTenant({
            id: newTenantId,
            name: formData.name || "Inquilino",
            propertyId: formData.propertyId || "",
            rentValue: formData.rentValue || 0,
            paymentDay: formData.paymentDay || 5,
            leaseDurationMonths: formData.leaseDurationMonths || 12,
            startDate: formData.startDate || "",
          });
          setIsContractRedirectModalOpen(true);
        }
      } catch (error) {
        console.error("Erro ao salvar inquilino:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inquilinos</h1>
          <p className="text-muted-foreground">
            Gerencie seus contatos e contratos.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
          <Button
            onClick={() => handleOpenModal()}
            className="gap-2 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Novo Inquilino
          </Button>

          <button
            onClick={() => setIsTicketsModalOpen(true)}
            className="group flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white hover:border-indigo-200 hover:text-indigo-600 hover:shadow-sm transition-all w-full sm:w-auto"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
            Chamados dos Inquilinos
            {tickets.filter(
              (t) => t.status === "open" || t.status === "in_progress",
            ).length > 0 && (
              <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                {
                  tickets.filter(
                    (t) => t.status === "open" || t.status === "in_progress",
                  ).length
                }{" "}
                pendentes
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {tenants.map((t) => {
          const linkedContract = contracts.find(
            (c) => c.tenantId === t.id && c.status === "active",
          );
          const linkedPropId = linkedContract
            ? linkedContract.propertyId
            : t.propertyId;
          const linkedProperty = properties.find((p) => p.id === linkedPropId);

          const tenantRentPayments = payments.filter(
            (p) =>
              p.tenantId === t.id &&
              p.type !== "deposit" &&
              p.status !== "cancelled",
          );
          const nextPayment = tenantRentPayments
            .filter((p) => p.status === "pending" || p.status === "late")
            .sort(
              (a, b) =>
                new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
            )[0];
          const lastPaid = tenantRentPayments
            .filter((p) => p.status === "paid" || p.status === "partial")
            .sort(
              (a, b) =>
                new Date(b.paidDate || b.dueDate).getTime() -
                new Date(a.paidDate || a.dueDate).getTime(),
            )[0];

          return (
            <Card
              id={`tenant-${t.id}`}
              key={t.id}
              className="p-3 md:p-4 flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onOpenDetail(t)}
            >
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div className="flex flex-col w-[calc(100%-40px)]">
                      <div className="flex justify-between w-full">
                        <h3 className="font-bold text-sm md:text-base leading-tight group-hover:text-primary transition-colors line-clamp-1">
                          {t.name.split(" ")[0]}{" "}
                          {t.name.split(" ")[1]
                            ? t.name.split(" ")[1].charAt(0) + "."
                            : ""}
                        </h3>
                        <div
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] uppercase font-bold shrink-0 ml-1 cursor-help self-start",
                            t.status === "allocated"
                              ? "bg-emerald-100 text-emerald-700"
                              : t.status === "waiting"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700",
                          )}
                          title={
                            t.status === "allocated"
                              ? "Alocado"
                              : t.status === "waiting"
                                ? "Lista de Espera"
                                : "Arquivado"
                          }
                        >
                          {t.status === "allocated"
                            ? "Alo"
                            : t.status === "waiting"
                              ? "Esp"
                              : "Arq"}
                        </div>
                      </div>
                      {t.cpf && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t.cpf}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t space-y-1.5 flex-1 flex flex-col">
                {linkedProperty && (
                  <p className="text-[10px] md:text-xs flex items-center gap-1.5 text-slate-700 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 truncate line-clamp-1">
                    <Home className="w-3 h-3 text-indigo-400 shrink-0" />{" "}
                    <span className="font-medium truncate">
                      {linkedProperty.name}
                    </span>
                  </p>
                )}
                <p className="text-[11px] md:text-xs flex items-center gap-1.5 text-slate-600 truncate mb-1">
                  <Users className="w-3 h-3 text-slate-400 shrink-0" />{" "}
                  {t.contact}
                </p>

                <div className="mt-auto pt-2 grid grid-cols-1 gap-1.5">
                  {nextPayment ? (
                    <div className="bg-slate-50 rounded p-1.5 border border-slate-100 flex justify-between items-center">
                      <div className="flex flex-col">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                          Próx. Pagamento
                        </p>
                        <p className="text-[10px] font-bold text-slate-700">
                          {format(parseISO(nextPayment.dueDate), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "text-xs font-bold truncate",
                          nextPayment.status === "late"
                            ? "text-red-600"
                            : nextPayment.description?.startsWith("Restante:")
                              ? "text-indigo-600"
                              : "text-emerald-600",
                        )}
                      >
                        R$ {nextPayment.amount.toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded p-1.5 border border-slate-100 flex justify-between items-center">
                      <div className="flex flex-col">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                          Último Pago
                        </p>
                        <p className="text-[10px] font-bold text-slate-700">
                          {lastPaid
                            ? format(
                                parseISO(lastPaid.paidDate || lastPaid.dueDate),
                                "dd/MM/yyyy",
                              )
                            : "-"}
                        </p>
                      </div>
                      <p className="text-xs font-bold text-emerald-600 truncate">
                        {lastPaid
                          ? `R$ ${(lastPaid.paidAmount || lastPaid.amount).toLocaleString()}`
                          : "-"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Deposit Warning */}
                {payments.some(
                  (p) =>
                    p.tenantId === t.id &&
                    p.type === "deposit" &&
                    (p.status === "pending" || p.status === "late"),
                ) && (
                  <div className="flex items-center gap-1.5 px-1.5 py-1 bg-amber-50 rounded border border-amber-100 mt-1">
                    <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-tighter truncate">
                      Caução Pendente
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTenant ? "Editar Perfil" : "Novo Inquilino"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              Informações Pessoais
            </h3>
            <Input
              label="Nome Completo"
              id="name"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  CPF
                  <InfoTooltip text="Documento de identificação obrigatório para o contrato." />
                </label>
                <Input
                  id="cpf"
                  value={formData.cpf || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, cpf: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Celular do Inquilino
                  <InfoTooltip text="Número de contato principal (WhatsApp)." />
                </label>
                <Input
                  id="contact"
                  value={formData.contact || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Contato de Emergência (Outra Pessoa)
                <InfoTooltip text="Nome e telefone de um parente ou amigo para casos de emergência." />
              </label>
              <Input
                id="sec"
                value={formData.secondaryContact || ""}
                onChange={(e) =>
                  setFormData({ ...formData, secondaryContact: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Senha de Acesso do Inquilino
                <InfoTooltip text="Senha para o inquilino fazer login e visualizar seus débitos e pagamentos." />
              </label>
              <Input
                id="accessPassword"
                type="text"
                placeholder="Ex: 123456 (Deixe em branco para nenhum)"
                value={formData.accessPassword || ""}
                onChange={(e) =>
                  setFormData({ ...formData, accessPassword: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 flex-1 relative group">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Possui Animais?
                </label>
                {(() => {
                  const selectedPropForForm = formData.propertyId
                    ? properties.find((p) => p.id === formData.propertyId)
                    : null;
                  const isBlocked = selectedPropForForm?.allowPets === false;
                  return (
                    <div className="flex flex-col gap-2 relative">
                      <Select
                        id="hasPets"
                        value={
                          isBlocked
                            ? "no"
                            : formData.hasPets === undefined
                              ? ""
                              : formData.hasPets
                                ? "yes"
                                : "no"
                        }
                        onChange={(e) => {
                          if (!isBlocked) {
                            const hasPets = e.target.value === "yes";
                            setFormData({
                              ...formData,
                              hasPets:
                                e.target.value === "" ? undefined : hasPets,
                              pets: hasPets ? formData.pets : "",
                            });
                          }
                        }}
                        options={
                          isBlocked
                            ? [
                                {
                                  label: "Bloqueado (Imóvel não permite)",
                                  value: "no",
                                },
                              ]
                            : [
                                { label: "Não informado", value: "" },
                                { label: "Sim", value: "yes" },
                                { label: "Não", value: "no" },
                              ]
                        }
                        disabled={isBlocked}
                      />
                      {!isBlocked && formData.hasPets && (
                        <Input
                          id="pets"
                          value={formData.pets || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, pets: e.target.value })
                          }
                          placeholder="Quantos e quais?"
                        />
                      )}
                      {isBlocked && (
                        <div className="absolute -top-10 left-0 hidden group-hover:block z-10 w-64 bg-slate-800 text-white text-xs p-2 rounded-lg shadow-xl shadow-slate-900/20 border border-slate-700 pointer-events-none fade-in">
                          <p className="font-semibold text-amber-400 mb-0.5">
                            Ação Bloqueada
                          </p>
                          <p className="text-slate-200">
                            O proprietário deste imóvel sinalizou que não aceita
                            animais de estimação nas dependências.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Outros Moradores (Cônjuge, Filhos, etc)
                </label>
                {(() => {
                  const selectedPropForForm = formData.propertyId
                    ? properties.find((p) => p.id === formData.propertyId)
                    : null;
                  const maxResidents = selectedPropForForm?.maxResidents;
                  const currentTotal =
                    1 + (formData.additionalResidents?.length || 0); // 1 (tenant) + others
                  const isBlocked =
                    maxResidents !== undefined && currentTotal >= maxResidents;
                  return (
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isBlocked) {
                            setFormData({
                              ...formData,
                              additionalResidents: [
                                ...(formData.additionalResidents || []),
                                { name: "", relation: "", cpf: "", age: "" },
                              ],
                            });
                          }
                        }}
                        disabled={isBlocked}
                        className={`text-xs font-bold flex items-center gap-1 ${isBlocked ? "text-slate-400 cursor-not-allowed opacity-60" : "text-indigo-600 hover:text-indigo-800"}`}
                      >
                        <Plus className="w-3 h-3" /> Adicionar Morador
                      </button>
                      {isBlocked && (
                        <div className="absolute right-0 -top-10 hidden group-hover:block z-10 w-64 bg-slate-800 text-white text-xs p-2 rounded-lg shadow-xl shadow-slate-900/20 border border-slate-700 pointer-events-none fade-in">
                          <p className="font-semibold text-rose-400 mb-0.5">
                            Limite Atingido
                          </p>
                          <p className="text-slate-200">
                            O imóvel permite no máximo {maxResidents} moradores
                            no total.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                {formData.additionalResidents?.map((res, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-end gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <Input
                        id={`res-name-${idx}`}
                        placeholder="Nome"
                        value={res.name || ""}
                        onChange={(e) => {
                          const newResidents = [
                            ...(formData.additionalResidents || []),
                          ];
                          newResidents[idx].name = e.target.value;
                          setFormData({
                            ...formData,
                            additionalResidents: newResidents,
                          });
                        }}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        id={`res-rel-${idx}`}
                        placeholder="Vínculo"
                        value={res.relation || ""}
                        onChange={(e) => {
                          const newResidents = [
                            ...(formData.additionalResidents || []),
                          ];
                          newResidents[idx].relation = e.target.value;
                          setFormData({
                            ...formData,
                            additionalResidents: newResidents,
                          });
                        }}
                      />
                    </div>
                    <div className="w-32 hidden sm:block">
                      <Input
                        id={`res-cpf-${idx}`}
                        placeholder="CPF (Opç)"
                        value={res.cpf || ""}
                        onChange={(e) => {
                          const newResidents = [
                            ...(formData.additionalResidents || []),
                          ];
                          newResidents[idx].cpf = e.target.value;
                          setFormData({
                            ...formData,
                            additionalResidents: newResidents,
                          });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newResidents = [
                          ...(formData.additionalResidents || []),
                        ];
                        newResidents.splice(idx, 1);
                        setFormData({
                          ...formData,
                          additionalResidents: newResidents,
                        });
                      }}
                      className="p-2.5 text-slate-400 hover:text-rose-600 bg-white rounded-lg border border-slate-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!formData.additionalResidents ||
                  formData.additionalResidents.length === 0) && (
                  <p className="text-xs text-slate-400 italic ml-1">
                    Nenhum outro morador adicionado.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              Configurações Rápidas & Perfil
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Total de Moradores
                </label>
                <div className="h-10 flex items-center px-3 border border-slate-200 rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                  {1 + (formData.additionalResidents?.length || 0)} (automático)
                </div>
              </div>
              <div className="flex flex-col gap-1.5 relative group">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  É Fumante?
                </label>
                {(() => {
                  const selectedPropForForm = formData.propertyId
                    ? properties.find((p) => p.id === formData.propertyId)
                    : null;
                  const isBlocked = selectedPropForForm?.allowSmoking === false;
                  return (
                    <>
                      <Select
                        id="isSmoker"
                        value={
                          isBlocked
                            ? "no"
                            : formData.isSmoker === undefined
                              ? ""
                              : formData.isSmoker
                                ? "yes"
                                : "no"
                        }
                        onChange={(e) => {
                          if (!isBlocked) {
                            setFormData({
                              ...formData,
                              isSmoker:
                                e.target.value === ""
                                  ? undefined
                                  : e.target.value === "yes",
                            });
                          }
                        }}
                        options={
                          isBlocked
                            ? [
                                {
                                  label: "Bloqueado (Imóvel não permite)",
                                  value: "no",
                                },
                              ]
                            : [
                                { label: "Não informado", value: "" },
                                { label: "Sim", value: "yes" },
                                { label: "Não", value: "no" },
                              ]
                        }
                        disabled={isBlocked}
                      />
                      {isBlocked && (
                        <div className="absolute -top-10 left-0 hidden group-hover:block z-10 w-64 bg-slate-800 text-white text-xs p-2 rounded-lg shadow-xl shadow-slate-900/20 border border-slate-700 pointer-events-none fade-in">
                          <p className="font-semibold text-rose-400 mb-0.5">
                            Ação Bloqueada
                          </p>
                          <p className="text-slate-200">
                            O proprietário não permite fumantes neste imóvel.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="flex flex-col gap-1.5 relative group">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Possui Veículos?
                </label>
                {(() => {
                  const selectedPropForForm = formData.propertyId
                    ? properties.find((p) => p.id === formData.propertyId)
                    : null;
                  const isBlocked = selectedPropForForm?.parkingSpaces === 0;
                  return (
                    <div className="flex flex-col gap-2 relative">
                      <Select
                        id="hasVehicles"
                        value={
                          isBlocked
                            ? "no"
                            : formData.hasVehicles === undefined
                              ? ""
                              : formData.hasVehicles
                                ? "yes"
                                : "no"
                        }
                        onChange={(e) => {
                          if (!isBlocked) {
                            const hasVehicles = e.target.value === "yes";
                            setFormData({
                              ...formData,
                              hasVehicles:
                                e.target.value === "" ? undefined : hasVehicles,
                              vehicleDetails: hasVehicles
                                ? formData.vehicleDetails
                                : "",
                            });
                          }
                        }}
                        options={
                          isBlocked
                            ? [
                                {
                                  label: "Bloqueado (Sem Garagem)",
                                  value: "no",
                                },
                              ]
                            : [
                                { label: "Não informado", value: "" },
                                { label: "Sim", value: "yes" },
                                { label: "Não", value: "no" },
                              ]
                        }
                        disabled={isBlocked}
                      />
                      {!isBlocked && formData.hasVehicles && (
                        <Input
                          id="vehicleDetails"
                          value={formData.vehicleDetails || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vehicleDetails: e.target.value,
                            })
                          }
                          placeholder="Ex: 1 Carro, 1 Moto"
                        />
                      )}
                      {isBlocked && (
                        <div className="absolute -top-10 left-0 hidden group-hover:block z-10 w-64 bg-slate-800 text-white text-xs p-2 rounded-lg shadow-xl shadow-slate-900/20 border border-slate-700 pointer-events-none fade-in">
                          <p className="font-semibold text-emerald-400 mb-0.5">
                            Sem Garagem
                          </p>
                          <p className="text-slate-200">
                            Este imóvel não possui vagas de garagem cadastradas
                            no sistema.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Localização do Comprovante de Cadastro
                <InfoTooltip text="Onde os documentos físicos estão guardados ou link para pasta digital." />
              </label>
              <Input
                id="evidence"
                value={formData.evidenceLocation || ""}
                onChange={(e) =>
                  setFormData({ ...formData, evidenceLocation: e.target.value })
                }
                placeholder="Ex: Pasta 5, Gaveta 2 ou Link"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              Status e Alocação
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Status
                  <InfoTooltip text="Alocado: Atualmente em um imóvel. Espera: Aguardando vaga. Arquivado: Contrato encerrado." />
                </label>
                <Select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as TenantStatus,
                    })
                  }
                  options={[
                    { label: "Em Espera", value: "waiting" },
                    { label: "Alocado", value: "allocated" },
                    { label: "Arquivado", value: "archived" },
                  ]}
                />
              </div>
              {formData.status === "allocated" && (
                <>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                      Vincular a Imóvel
                    </label>
                    <Select
                      id="propertyId"
                      value={formData.propertyId}
                      onChange={(e) =>
                        setFormData({ ...formData, propertyId: e.target.value })
                      }
                      options={[
                        { label: "Selecione um Imóvel...", value: "" },
                        ...properties
                          .filter(
                            (p) =>
                              !p.currentTenantId ||
                              p.currentTenantId === editingTenant?.id,
                          )
                          .map((p) => ({ label: p.name, value: p.id })),
                      ]}
                    />

                    {/* Intelligent Warning Check */}
                    {(() => {
                      if (!formData.propertyId) return null;
                      const selectedProp = properties.find(
                        (p) => p.id === formData.propertyId,
                      );
                      if (!selectedProp) return null;

                      const hasPetConflict =
                        selectedProp.allowPets === false &&
                        (formData.hasPets || !!formData.pets);
                      const hasSmokeConflict =
                        !!formData.isSmoker &&
                        selectedProp.allowSmoking === false;
                      const hasVehicleConflict =
                        (!!formData.vehicleDetails || !!formData.hasVehicles) &&
                        selectedProp.parkingSpaces === 0;

                      const calculatedResidentCount =
                        1 + (formData.additionalResidents?.length || 0);
                      const hasResidentConflict = selectedProp.maxResidents
                        ? calculatedResidentCount > selectedProp.maxResidents
                        : false;

                      const hasPropertyAlert = !!selectedProp.alerts;

                      if (
                        !hasPetConflict &&
                        !hasSmokeConflict &&
                        !hasVehicleConflict &&
                        !hasResidentConflict &&
                        !hasPropertyAlert
                      )
                        return null;

                      return (
                        <div className="mt-2 flex flex-col gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                          <div className="flex items-center gap-1.5 text-amber-800 border-b border-amber-200/60 pb-1 mb-1">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-tight">
                              Análise do Assistente
                            </span>
                          </div>
                          {hasPetConflict && (
                            <div className="flex items-start gap-1.5 text-xs text-red-700 bg-white/50 p-1.5 rounded">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                              <span>
                                <strong className="block text-red-800">
                                  Conflito Grave:
                                </strong>{" "}
                                O imóvel não aceita animais, mas o inquilino
                                possui pets cadastrados.
                              </span>
                            </div>
                          )}
                          {hasSmokeConflict && (
                            <div className="flex items-start gap-1.5 text-xs text-rose-700 bg-white/50 p-1.5 rounded">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                              <span>
                                <strong className="block text-rose-800">
                                  Aviso sobre Fumo:
                                </strong>{" "}
                                O proprietário proíbe fumar residência, mas o
                                inquilino foi marcado como fumante.
                              </span>
                            </div>
                          )}
                          {hasVehicleConflict && (
                            <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-white/50 p-1.5 rounded">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                              <span>
                                <strong className="block text-amber-900">
                                  Conferir Garagem:
                                </strong>{" "}
                                O imóvel não possui vagas de garagem, mas o
                                inquilino possui veículo informado.
                              </span>
                            </div>
                          )}
                          {hasResidentConflict && (
                            <div className="flex items-start gap-1.5 text-xs text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                              <span>
                                <strong className="block text-rose-900">
                                  Alerta de Ocupação:
                                </strong>{" "}
                                O imóvel ultrapassou o limite de ocupação
                                permitido. Moradores cadastrados:{" "}
                                {1 +
                                  (formData.additionalResidents?.length ||
                                    0)}{" "}
                                de {selectedProp.maxResidents} permitidos.
                              </span>
                            </div>
                          )}
                          {hasPropertyAlert && (
                            <div className="flex items-start gap-1.5 text-xs text-slate-800 bg-white/50 p-1.5 rounded border border-slate-100">
                              <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                              <span>
                                <strong className="block text-slate-600">
                                  Alerta do Imóvel:
                                </strong>{" "}
                                {selectedProp.alerts}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                      Duração da Locação
                      <InfoTooltip text="Tempo de validade do contrato de locação (será usado para calcular e registrar o vencimento automático)." />
                    </label>
                    <Select
                      id="leaseDurationMonths"
                      value={
                        formData.leaseDurationMonths === 12
                          ? "12"
                          : formData.leaseDurationMonths === 24
                            ? "24"
                            : formData.leaseDurationMonths === 30
                              ? "30"
                              : formData.leaseDurationMonths === 6
                                ? "6"
                                : formData.leaseDurationMonths === 3
                                  ? "3"
                                  : formData.leaseDurationMonths
                                    ? "custom"
                                    : "12"
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "12") {
                          setFormData({ ...formData, leaseDurationMonths: 12 });
                        } else if (val === "24") {
                          setFormData({ ...formData, leaseDurationMonths: 24 });
                        } else if (val === "30") {
                          setFormData({ ...formData, leaseDurationMonths: 30 });
                        } else if (val === "6") {
                          setFormData({ ...formData, leaseDurationMonths: 6 });
                        } else if (val === "3") {
                          setFormData({ ...formData, leaseDurationMonths: 3 });
                        } else {
                          setFormData({
                            ...formData,
                            leaseDurationMonths:
                              formData.leaseDurationMonths || 12,
                          });
                        }
                      }}
                      options={[
                        { label: "1 Ano (12 meses)", value: "12" },
                        { label: "2 Anos (24 meses)", value: "24" },
                        { label: "30 meses", value: "30" },
                        { label: "6 meses", value: "6" },
                        { label: "3 meses", value: "3" },
                        {
                          label: "Outro período (em meses)...",
                          value: "custom",
                        },
                      ]}
                    />
                  </div>

                  {formData.leaseDurationMonths !== 12 &&
                    formData.leaseDurationMonths !== 24 &&
                    formData.leaseDurationMonths !== 30 &&
                    formData.leaseDurationMonths !== 6 &&
                    formData.leaseDurationMonths !== 3 && (
                      <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                          Especificar Meses
                          <InfoTooltip text="Digite a quantidade exata de meses de validade da locação." />
                        </label>
                        <Input
                          id="customLeaseDuration"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="1"
                          value={formData.leaseDurationMonths || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              leaseDurationMonths:
                                Number(e.target.value) || undefined,
                            })
                          }
                          placeholder="Ex: 18"
                        />
                      </div>
                    )}
                </>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Avaliação (1-5)
                  <InfoTooltip text="Nota para o comportamento e pontualidade do inquilino." />
                </label>
                <Input
                  id="rating"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.rating || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, rating: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>

          {formData.status === "archived" &&
            (editingTenant?.depositBalance || 0) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-800">
                    Atenção ao Caução!
                  </h4>
                  <p className="text-xs text-amber-700 mt-1">
                    O inquilino possui um saldo de{" "}
                    <b>
                      R${" "}
                      {(editingTenant.depositBalance || 0).toLocaleString(
                        "pt-BR",
                        { minimumFractionDigits: 2 },
                      )}
                    </b>{" "}
                    em garantias pagas. Lembre-se de combinar a devolução com
                    ele antes de arquivar o contrato.
                  </p>
                  <div className="mt-2 text-xs text-amber-600 bg-amber-100 p-2 rounded inline-block">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            _createRefundReminder: e.target.checked,
                          })
                        }
                      />
                      <b>
                        Criar lembrete de devolução / registrar como Despesa
                        pendente
                      </b>
                    </label>
                  </div>
                </div>
              </div>
            )}

          {formData.status === "allocated" && (
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                  Cobrança de Aluguel e Caução
                </label>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Valor do Aluguel Combinado
                </label>
                <CurrencyInput
                  id="rentValue"
                  value={formData.rentValue || 0}
                  onChange={(val) =>
                    setFormData({ ...formData, rentValue: val })
                  }
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Dia de Pagamento
                </label>
                <Input
                  id="paymentDay"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.paymentDay || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentDay: Number(e.target.value),
                    })
                  }
                  required
                  placeholder="Ex: 5"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  Data do Primeiro Vencimento do Aluguel
                  <InfoTooltip text="Selecione a data exata de vencimento do primeiro aluguel." />
                </label>
                <Input
                  id="firstRentDueDate"
                  type="date"
                  value={formData.firstRentDueDate || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      firstRentDueDate: e.target.value,
                    })
                  }
                />
                <p className="text-[10px] text-slate-400 italic ml-1">
                  Se não informado, o vencimento do primeiro aluguel será
                  calculado automaticamente no próximo dia de pagamento.
                </p>
              </div>

              <div className="md:col-span-2 mt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={formData.chargeLateFees}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        chargeLateFees: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    Cobrar juros e multas por atraso
                  </span>
                </label>
              </div>

              {formData.chargeLateFees && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <CurrencyInput
                      id="lateFeePenalty"
                      label="Multa Fixa"
                      value={formData.lateFeePenalty || 0}
                      onChange={(val) =>
                        setFormData({
                          ...formData,
                          lateFeePenalty: val,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                      Mora Diária (%)
                    </label>
                    <Input
                      id="lateFeeDaily"
                      type="text"
                      inputMode="decimal"
                      value={formData.lateFeeDaily || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(",", ".");
                        setFormData({
                          ...formData,
                          lateFeeDaily: val === "" ? 0 : Number(val),
                        });
                      }}
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2 border-t border-slate-200 mt-2 mb-2"></div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Select
                  id="initialPaymentType"
                  value={formData.initialPaymentType || "rent"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      initialPaymentType: e.target.value as any,
                    })
                  }
                  options={[
                    {
                      label: "Sem Caução (Apenas primeiro aluguel)",
                      value: "rent",
                    },
                    { label: "Exigir Caução / Garantia", value: "deposit" },
                  ]}
                />
              </div>

              {formData.initialPaymentType === "deposit" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <CurrencyInput
                      id="depositValue"
                      label="Valor do Caução Total"
                      value={formData.depositValue || 0}
                      onChange={(val) =>
                        setFormData({ ...formData, depositValue: val })
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                      Parcelamento do Caução
                    </label>
                    <Select
                      id="depositInstallments"
                      value={String(formData.depositInstallments || 1)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          depositInstallments: Number(e.target.value),
                        })
                      }
                      options={[
                        { label: "À Vista (1x)", value: "1" },
                        { label: "2x", value: "2" },
                        { label: "3x", value: "3" },
                        { label: "4x", value: "4" },
                        { label: "5x", value: "5" },
                        { label: "6x", value: "6" },
                      ]}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                      Data do Primeiro Pagamento do Caução
                    </label>
                    <Input
                      id="depositDueDate"
                      type="date"
                      value={formData.depositDueDate || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          depositDueDate: e.target.value,
                        })
                      }
                    />
                    <p className="text-[10px] text-slate-400 italic ml-1">
                      Se não informado, usará a data de entrada.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
              Observações
            </label>
            <textarea
              className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-slate-400"
              placeholder="Alguma observação importante sobre o inquilino..."
              value={formData.observations || ""}
              onChange={(e) =>
                setFormData({ ...formData, observations: e.target.value })
              }
            />
          </div>
          <div className="pt-4 flex gap-3">
            <Button
              type="submit"
              className="flex-1 py-3"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Salvar Inquilino"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="py-3"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isNoPropertiesPromptOpen}
        onClose={() => setIsNoPropertiesPromptOpen(false)}
        title="Nenhum Imóvel Disponível"
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-bold">Aviso</p>
              <p>Não há imóveis disponíveis ("Vagos") no momento.</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 px-1">
            Você quer prosseguir criando o inquilino com o status de{" "}
            <strong>Em Espera</strong> ou quer cancelar e disponibilizar um
            imóvel primeiro?
          </p>
          <div className="pt-4 flex gap-3">
            <Button className="flex-1 py-3" onClick={proceedToCreateTenant}>
              Prosseguir (Em Espera)
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsNoPropertiesPromptOpen(false)}
              className="py-3 text-slate-600"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {isTicketsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsTicketsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-slate-50/95 backdrop-blur-3xl rounded-[2rem] border border-white/50 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] w-full max-w-6xl h-[90vh] flex flex-col relative z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 bg-white shrink-0 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition shadow-sm border border-indigo-100">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800">
                      Chamados dos Inquilinos
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setIsTicketsModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border border-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <TicketsView
                  tickets={tickets}
                  properties={properties}
                  tenants={tenants}
                  user={user}
                  handleNavigate={handleNavigate}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={isContractRedirectModalOpen}
        onClose={() => setIsContractRedirectModalOpen(false)}
        title="📝 Gerar Contrato via IA"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 text-3xl shadow-sm animate-bounce">
              🎉
            </div>
            <h3 className="text-lg font-black text-slate-800">
              Inquilino Cadastrado!
            </h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">
              O inquilino <strong>{justCreatedTenant?.name}</strong> foi cadastrado com sucesso. Deseja ir para o gerador de contratos por Inteligência Artificial para este inquilino agora?
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Vantagens do Fluxo Inteligente:
            </h4>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                <span>Preenche automaticamente os dados do inquilino e imóvel</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                <span>IA redige o contrato completo personalizado com multas e caução</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                <span>Envio direto para assinatura ou download em PDF</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              className="flex-1 gap-2"
              onClick={() => {
                if (justCreatedTenant && onNavigateToGenerateContract) {
                  onNavigateToGenerateContract({
                    tenantId: justCreatedTenant.id,
                    propertyId: justCreatedTenant.propertyId,
                    rentValue: justCreatedTenant.rentValue,
                    paymentDay: justCreatedTenant.paymentDay,
                    leaseDurationMonths: justCreatedTenant.leaseDurationMonths,
                    startDate: justCreatedTenant.startDate || format(new Date(), "yyyy-MM-dd"),
                  });
                }
                setIsContractRedirectModalOpen(false);
              }}
            >
              Sim, Gerar Contrato <FileText className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsContractRedirectModalOpen(false)}
            >
              Agora Não
            </Button>
          </div>
        </div>
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
  markPaymentAsPaid: (
    paymentId: string,
    paidAmount?: number,
    receiptUrl?: string,
    evidenceName?: string,
    evidenceLocation?: string,
    remainderDueDate?: string,
    remainderObservations?: string,
  ) => Promise<void>;
  setIsAgreementModalOpen: (open: boolean) => void;
  onConfirmPayment: (paymentId: string) => void;
  setArchivingAgreement: (a: Agreement) => void;
  setIsArchiveAgreementModalOpen: (open: boolean) => void;
  setIsRevertModalOpen: (open: boolean) => void;
  setRevertingPayment: (p: Payment | null) => void;
  onOpenTenantDetail: (t: Tenant) => void;
  isDriveConnected: boolean;
  uploadToDrive: (
    fileName: string,
    fileData: string,
    mimeType: string,
    folderName?: string,
  ) => Promise<any>;
  setPreviewReceipt: (
    preview: { url: string; name: string; isImage: boolean } | null,
  ) => void;
  storages?: StorageSpace[];
  onNavigateToStorage?: (storageId: string) => void;
  highlightedPaymentId?: string | null;
  setHighlightedPaymentId?: (id: string | null) => void;
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
  setPreviewReceipt,
  storages,
  onNavigateToStorage,
  highlightedPaymentId,
  setHighlightedPaymentId,
}: FinancialViewProps) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentDetailModalOpen, setIsPaymentDetailModalOpen] =
    useState(false);
  const [isExpenseDetailModalOpen, setIsExpenseDetailModalOpen] =
    useState(false);
  const [isAllExpensesModalOpen, setIsAllExpensesModalOpen] = useState(false);
  const [isDeleteExpenseModalOpen, setIsDeleteExpenseModalOpen] =
    useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [subItemDesc, setSubItemDesc] = useState("");
  const [subItemAmount, setSubItemAmount] = useState<number>(0);

  const [expenseForm, setExpenseForm] = useState({
    propertyId: "",
    description: "",
    amount: 0,
    date: format(new Date(), "yyyy-MM-dd"),
    type: "repair" as ExpenseType,
    evidence: "",
    evidenceName: "",
    evidenceLocation: "",
    thumbnailLink: "",
    attachments: [] as { url: string; name: string; thumbnailLink?: string }[],
    items: [] as { description: string; amount: number }[],
  });

  const [paymentForm, setPaymentForm] = useState({
    propertyId: "",
    tenantId: "",
    amount: 0,
    dueDate: format(new Date(), "yyyy-MM-dd"),
    type: "rent" as "rent" | "deposit" | "agreement",
    description: "Aluguel Mensal",
  });

  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(
    null,
  );

  const [filterPropertyId, setFilterPropertyId] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [filterExpensePropertyId, setFilterExpensePropertyId] = useState("");
  const [filterExpenseType, setFilterExpenseType] = useState("all");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");

  useEffect(() => {
    if (highlightedPaymentId) {
      setSearchQuery("");
      setFilterType("all");
      const timer = setTimeout(() => {
        const element = document.getElementById(
          `fin-payment-${highlightedPaymentId}`,
        );
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);

      const clearTimer = setTimeout(() => {
        if (setHighlightedPaymentId) setHighlightedPaymentId(null);
      }, 4000);

      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [highlightedPaymentId, setHighlightedPaymentId]);

  const displayItems = useMemo(() => {
    const items: any[] = [];
    const agreementMap: { [key: string]: Payment[] } = {};

    // Filter payments
    const filteredPayments = payments.filter((p) => {
      const matchesProperty =
        !filterPropertyId || p.propertyId === filterPropertyId;
      const matchesType =
        filterType === "all" ||
        filterType === "payment" ||
        (filterType === "agreement" && p.agreementId);
      const tenant = tenants.find((t) => t.id === p.tenantId);
      const prop = properties.find((pr) => pr.id === p.propertyId);
      const matchesSearch =
        !searchQuery ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop?.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesProperty && matchesType && matchesSearch;
    });

    // Separate standalone payments and group agreement payments
    filteredPayments.forEach((p) => {
      if (p.agreementId) {
        if (!agreementMap[p.agreementId]) agreementMap[p.agreementId] = [];
        agreementMap[p.agreementId].push(p);
      } else {
        items.push({
          type: "payment",
          id: p.id,
          data: p,
          date: parseISO(p.dueDate),
        });
      }
    });

    // Process agreement groups
    Object.entries(agreementMap).forEach(([id, groupPayments]) => {
      groupPayments.sort(
        (a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(),
      );

      const agreement = agreements.find((a) => a.id === id);
      const hasLate = groupPayments.some((p) => p.status === "late");
      const allPaid = groupPayments.every(
        (p) => p.status === "paid" || p.status === "partial",
      );
      const status = hasLate ? "late" : allPaid ? "paid" : "pending";
      const paidCount = groupPayments.filter(
        (p) => p.status === "paid" || p.status === "partial",
      ).length;
      const totalCount = groupPayments.length;

      // Find the "most relevant" date for sorting (the next pending or the latest)
      const nextPayment =
        groupPayments.find((p) => p.status !== "paid") ||
        groupPayments[groupPayments.length - 1];

      items.push({
        type: "agreement_group",
        id,
        agreement,
        payments: groupPayments,
        date: parseISO(nextPayment.dueDate),
        status,
        paidCount,
        totalCount,
      });
    });

    // Sort all items based on priority: 1. Late, 2. Pending, 3. Partial, 4. Paid/Cancelled
    return items.sort((a, b) => {
      const getPriority = (status: string) => {
        if (status === "late") return 1;
        if (status === "pending") return 2;
        if (status === "partial") return 3;
        return 4; // paid, cancelled
      };

      const statusA = a.type === "payment" ? a.data.status : a.status;
      const statusB = b.type === "payment" ? b.data.status : b.status;

      const priorityA = getPriority(statusA);
      const priorityB = getPriority(statusB);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Within the same priority:
      if (priorityA === 1 || priorityA === 2 || priorityA === 3) {
        // For late, pending, and partial: show the closest due date first
        return a.date.getTime() - b.date.getTime();
      } else {
        // For paid and others: show most recently created/paid (newest first)
        return b.date.getTime() - a.date.getTime();
      }
    });
  }, [
    payments,
    agreements,
    filterPropertyId,
    filterType,
    searchQuery,
    tenants,
    properties,
  ]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addExpense(expenseForm);
      toast.success("Despesa adicionada com sucesso!");
      setIsExpenseModalOpen(false);
      setSubItemDesc("");
      setSubItemAmount(0);
      setExpenseForm({
        propertyId: "",
        description: "",
        amount: 0,
        date: format(new Date(), "yyyy-MM-dd"),
        type: "repair" as ExpenseType,
        evidence: "",
        evidenceName: "",
        evidenceLocation: "",
        thumbnailLink: "",
        attachments: [],
        items: [],
      });
    } catch (error: any) {
      console.error("Erro ao adicionar despesa:", error);
      toast.error(
        `Erro ao salvar a despesa: ${error?.message || String(error)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanInvoice = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isExpense: boolean,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    toast.loading("Lendo documento com IA...", { id: "scan-invoice" });

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const extractedData = await scanInvoice(base64);
      if (extractedData) {
        if (isExpense) {
          setExpenseForm((prev) => ({
            ...prev,
            amount: extractedData.amount || prev.amount,
            description: extractedData.description || prev.description,
            date: extractedData.date || prev.date,
          }));
        } else {
          setPaymentForm((prev) => ({
            ...prev,
            amount: extractedData.amount || prev.amount,
            description: extractedData.description || prev.description,
            dueDate: extractedData.date || prev.dueDate,
          }));
        }
        toast.success("Dados preenchidos pela IA!", { id: "scan-invoice" });
      } else {
        toast.error("Não foi possível extrair dados da imagem.", {
          id: "scan-invoice",
        });
      }
    } catch (error: any) {
      console.error("Scan Error:", error);
      toast.error(error.message || "Erro ao processar imagem.", {
        id: "scan-invoice",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addPayment({
        ...paymentForm,
        status: "pending",
      });
      setIsNewPaymentModalOpen(false);
      setPaymentForm({
        propertyId: "",
        tenantId: "",
        amount: 0,
        dueDate: format(new Date(), "yyyy-MM-dd"),
        type: "rent" as "rent" | "deposit" | "agreement",
        description: "Aluguel Mensal",
      });
    } catch (error) {
      console.error("Erro ao adicionar pagamento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Financeiro</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Controle de entradas e saídas.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => {
              document
                .getElementById("financial-summary-section")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Resumo por Imóvel
          </Button>
          <Button
            onClick={() => setIsAgreementModalOpen(true)}
            variant="outline"
            className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <FileText className="w-4 h-4" /> Acordo
          </Button>
          <Button
            onClick={() => setIsNewPaymentModalOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Receber
          </Button>
          <Button onClick={() => setIsExpenseModalOpen(true)} className="gap-2">
            <TrendingDown className="w-4 h-4" /> Despesa
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1 space-y-6">
          <PaymentAlerts
            properties={properties}
            tenants={tenants}
            payments={payments}
            onConfirmPayment={onConfirmPayment}
            onOpenTenantDetail={onOpenTenantDetail}
            storages={storages}
          />

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Despesas Recentes</h2>
              <div className="flex gap-2">
                <select
                  className="text-[10px] h-7 px-1 bg-slate-50 border border-slate-200 rounded font-bold text-slate-500 outline-none focus:ring-1 focus:ring-primary/20"
                  value={filterExpensePropertyId}
                  onChange={(e) => setFilterExpensePropertyId(e.target.value)}
                >
                  <option value="">Todas</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
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
                .filter(
                  (e) =>
                    !filterExpensePropertyId ||
                    e.propertyId === filterExpensePropertyId,
                )
                .sort(
                  (a, b) =>
                    parseISO(b.date).getTime() - parseISO(a.date).getTime(),
                )
                .slice(0, 10)
                .map((e) => {
                  const prop = properties.find((pr) => pr.id === e.propertyId);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-accent/20 hover:bg-accent/30 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedExpense(e);
                        setIsExpenseDetailModalOpen(true);
                      }}
                    >
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold">
                          {e.type === "repair"
                            ? "Manutenção"
                            : e.type === "renovation"
                              ? "Reforma"
                              : e.type === "tax"
                                ? "Imposto"
                                : e.type === "fine"
                                  ? "Multa"
                                  : "Outro"}
                        </p>
                        <p className="font-medium group-hover:text-primary transition-colors flex items-center gap-2">
                          {e.description}
                          {(e.evidence || e.evidenceLocation) && (
                            <Paperclip className="w-3 h-3 text-slate-400" />
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {prop?.name} •{" "}
                          {format(parseISO(e.date), "dd/MM/yyyy")}
                        </p>
                        {(e.evidence || e.evidenceLocation) && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {e.evidence && (
                              <a
                                href={e.evidence}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-primary flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ImageIcon className="w-3 h-3" /> Ver Anexo
                              </a>
                            )}
                            {e.evidenceLocation &&
                              (e.evidenceLocation.startsWith("http") ? (
                                <a
                                  href={e.evidenceLocation}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-primary flex items-center gap-1 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MapPin className="w-3 h-3" /> Link Externo
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />{" "}
                                  {e.evidenceLocation}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-destructive">
                          - R$ {e.amount.toLocaleString()}
                        </p>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={filterPropertyId}
                  onChange={(e) => setFilterPropertyId(e.target.value)}
                >
                  <option value="">Todos os Imóveis</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
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
              {displayItems.map((item) => {
                if (item.type === "payment") {
                  const p = item.data as Payment;
                  
                  let propName = p.propertyNameSnapshot || "Desconhecido";
                  if (p.propertyId?.startsWith("storage-")) {
                    const storageId = p.propertyId.replace("storage-", "");
                    const storage = storages?.find((s) => s.id === storageId);
                    if (storage) propName = storage.name;
                  } else {
                    const prop = properties.find((pr) => pr.id === p.propertyId);
                    if (prop) propName = prop.name;
                  }

                  let tenantName = p.tenantNameSnapshot || "Desconhecido";
                  if (p.tenantId === "proprietario") {
                    tenantName = "Eu mesmo (Proprietário - Pagamento)";
                  } else {
                    const tenant = tenants.find((t) => t.id === p.tenantId);
                    if (tenant) tenantName = tenant.name;
                  }
                  
                  const isExpense = p.tenantId === "proprietario";
                  const isExpanded = expandedPaymentId === p.id;

                  return (
                    <div
                      key={p.id}
                      id={`fin-payment-${p.id}`}
                      className={cn(
                        "group border rounded-2xl transition-all duration-300 overflow-hidden",
                        isExpanded
                          ? "ring-2 ring-primary/20 border-primary/30 bg-primary/5 shadow-sm"
                          : "hover:border-slate-300 hover:bg-slate-50/50",
                        highlightedPaymentId === p.id && "ring-4 ring-amber-500 ring-offset-2 bg-amber-50 shadow-xl z-10"
                      )}
                    >
                      {/* Header / Bar */}
                      <div
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                        onClick={() =>
                          setExpandedPaymentId(isExpanded ? null : p.id!)
                        }
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                              p.status === "paid"
                                ? "bg-emerald-100 text-emerald-600"
                                : p.status === "partial"
                                  ? "bg-indigo-100 text-indigo-600"
                                  : p.status === "late"
                                    ? "bg-red-100 text-red-600"
                                    : p.status === "cancelled"
                                      ? "bg-slate-100 text-slate-500"
                                      : "bg-amber-100 text-amber-600",
                            )}
                          >
                            {p.status === "paid" ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : p.status === "partial" ? (
                              <TrendingUp className="w-5 h-5" />
                            ) : p.status === "late" ? (
                              <ShieldAlert className="w-5 h-5" />
                            ) : p.status === "cancelled" ? (
                              <XCircle className="w-5 h-5" />
                            ) : (
                              <Clock className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-bold text-slate-900 truncate">
                                {propName}
                              </h3>
                              {p.revertReason && (
                                <button
                                  title={`Revertido: ${p.revertReason}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.info(
                                      `Justificativa da Reversão: ${p.revertReason}`,
                                      {
                                        duration: 5000,
                                      },
                                    );
                                  }}
                                  className="text-amber-500 hover:text-amber-600 transition-colors"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-tight shrink-0">
                                {isExpense 
                                  ? "Despesa de Depósito/Garagem"
                                  : p.type === "rent"
                                  ? "Aluguel"
                                  : p.type === "deposit"
                                    ? "Caução"
                                    : "Acordo"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <UserIcon className="w-3 h-3" /> {tenantName}
                              <span className="mx-1 text-slate-300">•</span>
                              <span className="truncate italic">
                                {(p.description || (isExpense ? "Custo Mensal" : "Aluguel Mensal")).replace(
                                  /^Restante:\s*Restante:\s*/,
                                  "Restante: ",
                                )}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12">
                          <div className="text-right flex flex-col items-end">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Vencimento
                            </p>
                            <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
                              {format(parseISO(p.dueDate), "dd/MM/yyyy")}
                              {p.originalDueDate && (
                                <span
                                  className="inline-flex items-center text-amber-500 cursor-help"
                                  title={`Data de vencimento original (${format(parseISO(p.originalDueDate), "dd/MM/yyyy")}) coincidia com fim de semana ou feriado e foi ajustada para o próximo dia útil.`}
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </p>
                            {p.originalDueDate && (
                              <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded leading-none mt-0.5">
                                Útil Posterior
                              </span>
                            )}
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Valor
                            </p>
                            <p className={cn("text-sm font-bold", isExpense ? "text-rose-600" : "text-slate-900")}>
                              {isExpense ? "-" : ""}R$ {p.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "hidden sm:inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight",
                                p.status === "paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : p.status === "partial"
                                    ? "bg-indigo-100 text-indigo-700 font-black ring-2 ring-indigo-500/20"
                                    : p.status === "pending" &&
                                        p.description?.startsWith("Restante:")
                                      ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-500/10"
                                      : p.status === "late"
                                        ? "bg-red-100 text-red-700"
                                        : p.status === "cancelled"
                                          ? "bg-slate-100 text-slate-500"
                                          : "bg-amber-100 text-amber-700",
                              )}
                            >
                              {p.status === "paid"
                                ? "Pago"
                                : p.status === "partial"
                                  ? "Parcial"
                                  : p.status === "pending" &&
                                      p.description?.startsWith("Restante:")
                                    ? "Saldo Pendente"
                                    : p.status === "late"
                                      ? "Atrasado"
                                      : p.status === "cancelled"
                                        ? "Cancelado"
                                        : "Pendente"}
                            </span>
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300",
                                isExpanded
                                  ? "rotate-180 bg-primary/10 text-primary"
                                  : "text-slate-400 group-hover:bg-slate-200",
                              )}
                            >
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
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                      Descrição do Pagamento
                                    </p>
                                    <p className="text-sm text-slate-700 font-medium">
                                      {(
                                        p.description || "Aluguel Mensal"
                                      ).replace(
                                        /^Restante:\s*Restante:\s*/,
                                        "Restante: ",
                                      )}
                                    </p>
                                  </div>
                                  {p.observations && (
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Observações
                                      </p>
                                      <p className="text-sm text-slate-600 italic">
                                        {p.observations}
                                      </p>
                                    </div>
                                  )}
                                  {p.paidDate && (
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Data de Recebimento
                                      </p>
                                      <p className="text-sm text-emerald-600 font-bold">
                                        {format(
                                          parseISO(p.paidDate),
                                          "dd/MM/yyyy",
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {p.interestAmount && p.interestAmount > 0 && (
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Juros/Multa Aplicados
                                      </p>
                                      <p className="text-sm text-red-600 font-bold">
                                        R$ {p.interestAmount.toLocaleString()}
                                      </p>
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
                                      <Search className="w-4 h-4" /> Detalhes
                                      Completos
                                    </Button>

                                    {(p.status === "paid" ||
                                      p.status === "partial") && (
                                      <Button
                                        variant="outline"
                                        className="flex-1 h-10 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl flex items-center justify-center text-sm font-medium transition-colors"
                                        onClick={() => {
                                          setRevertingPayment(p);
                                          setIsRevertModalOpen(true);
                                        }}
                                      >
                                        <RotateCcw className="w-4 h-4" />{" "}
                                        Reverter
                                      </Button>
                                    )}

                                    {(p.status === "paid" ||
                                      p.status === "partial") &&
                                      p.receiptUrl && (
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
                                                  const isImage =
                                                    p.receiptUrl?.match(
                                                      /\.(jpeg|jpg|gif|png)$/i,
                                                    ) ||
                                                    p.thumbnailLink ||
                                                    p.receiptUrl?.startsWith(
                                                      "data:image",
                                                    );
                                                  setPreviewReceipt({
                                                    url: p.receiptUrl!,
                                                    name:
                                                      p.evidenceName ||
                                                      "Recibo",
                                                    isImage: !!isImage,
                                                  });
                                                }}
                                              />
                                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <ExternalLink className="w-5 h-5 text-white" />
                                              </div>
                                              {isGoogleDriveLink(
                                                p.receiptUrl,
                                              ) && (
                                                <div className="absolute top-2 right-2 bg-white/90 p-1 rounded-lg shadow-sm">
                                                  <Cloud className="w-3 h-3 text-emerald-500" />
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="w-full h-24 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center relative">
                                              <ImageIcon className="w-6 h-6 text-slate-300" />
                                              {isGoogleDriveLink(
                                                p.receiptUrl,
                                              ) && (
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
                                              const isImage =
                                                p.receiptUrl?.match(
                                                  /\.(jpeg|jpg|gif|png)$/i,
                                                ) ||
                                                p.thumbnailLink ||
                                                p.receiptUrl?.startsWith(
                                                  "data:image",
                                                );
                                              setPreviewReceipt({
                                                url: p.receiptUrl!,
                                                name:
                                                  p.evidenceName || "Recibo",
                                                isImage: !!isImage,
                                              });
                                            }}
                                            className="h-10 gap-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl flex items-center justify-center text-sm font-medium transition-colors"
                                          >
                                            <ImageIcon className="w-4 h-4" />{" "}
                                            Ver Recibo
                                            {isGoogleDriveLink(
                                              p.receiptUrl,
                                            ) && (
                                              <Cloud className="w-3 h-3 ml-1 opacity-50" />
                                            )}
                                          </Button>
                                        </div>
                                      )}

                                    {(p.status === "paid" ||
                                      p.status === "partial") &&
                                      p.evidenceLocation && (
                                        <div className="flex-1 h-10 gap-2 border border-slate-200 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-600 font-medium px-3 truncate">
                                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                                          {p.evidenceLocation.startsWith(
                                            "http",
                                          ) ? (
                                            <a
                                              href={p.evidenceLocation}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="hover:underline truncate"
                                            >
                                              Link Externo
                                            </a>
                                          ) : (
                                            <span className="truncate">
                                              {p.evidenceLocation}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                  </div>

                                  {p.status !== "paid" &&
                                    p.status !== "cancelled" &&
                                    p.status !== "partial" && (
                                      <Button
                                        className="w-full h-10 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-md font-bold"
                                        onClick={() => onConfirmPayment(p.id)}
                                      >
                                        <CheckCircle2 className="w-4 h-4" />{" "}
                                        Confirmar Recebimento
                                      </Button>
                                    )}

                                  {p.status === "cancelled" && (
                                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center">
                                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Pagamento Cancelado
                                      </p>
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
                  const prop = properties.find(
                    (pr) => pr.id === firstPayment.propertyId,
                  );
                  const tenant = tenants.find(
                    (t) => t.id === firstPayment.tenantId,
                  );

                  return (
                    <div
                      key={group.id}
                      className={cn(
                        "group border rounded-2xl transition-all duration-300 overflow-hidden",
                        isExpanded
                          ? "ring-2 ring-blue-500/20 border-blue-500/30 bg-blue-50/30 shadow-sm"
                          : "hover:border-blue-300 hover:bg-blue-50/10",
                      )}
                    >
                      {/* Header / Bar */}
                      <div
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                        onClick={() =>
                          setExpandedPaymentId(isExpanded ? null : group.id)
                        }
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                              group.status === "paid" ||
                                group.status === "partial"
                                ? "bg-emerald-100 text-emerald-600"
                                : group.status === "late"
                                  ? "bg-red-100 text-red-600"
                                  : "bg-blue-100 text-blue-600",
                            )}
                          >
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-bold text-slate-900 truncate">
                                {prop?.name}
                              </h3>
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[9px] font-bold text-blue-600 uppercase tracking-tight shrink-0">
                                Acordo • {group.paidCount}/{group.totalCount}{" "}
                                Pagas
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <UserIcon className="w-3 h-3" /> {tenant?.name}
                              <span className="mx-1 text-slate-300">•</span>
                              <span className="truncate italic">
                                {group.agreement?.description ||
                                  "Acordo de Débito"}
                              </span>
                            </p>
                            {group.agreement?.evidence && (
                              <a
                                href={group.agreement.evidence}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tight"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ImageIcon className="w-2.5 h-2.5" /> Ver
                                Evidência do Acordo
                              </a>
                            )}
                            {group.agreement?.evidenceLocation && (
                              <div className="inline-flex items-center gap-1 mt-1 ml-2 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                <MapPin className="w-2.5 h-2.5" />
                                {group.agreement.evidenceLocation.startsWith(
                                  "http",
                                ) ? (
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
                                  <span>
                                    {group.agreement.evidenceLocation}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Próximo Venc.
                            </p>
                            <p className="text-sm font-medium text-slate-700">
                              {format(item.date, "dd/MM/yyyy")}
                            </p>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Total Acordo
                            </p>
                            <p className="text-sm font-bold text-slate-900">
                              R$ {group.agreement?.totalAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300",
                                isExpanded
                                  ? "rotate-180 bg-blue-500/10 text-blue-500"
                                  : "text-slate-400 group-hover:bg-slate-200",
                              )}
                            >
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
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <div className="px-4 pb-4 pt-2 border-t border-blue-100 bg-blue-50/20">
                              <div className="space-y-2 mt-2">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider ml-1 mb-2">
                                  Parcelas do Acordo
                                </p>
                                {group.payments.map((p: Payment) => (
                                  <div
                                    key={p.id}
                                    className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between hover:border-blue-200 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={cn(
                                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                          p.status === "paid" ||
                                            p.status === "partial"
                                            ? "bg-emerald-50 text-emerald-500"
                                            : p.status === "late"
                                              ? "bg-red-50 text-red-500"
                                              : "bg-slate-50 text-slate-400",
                                        )}
                                      >
                                        {p.status === "paid" ||
                                        p.status === "partial" ? (
                                          <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                          <Clock className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs font-bold text-slate-700">
                                            {p.description}
                                          </p>
                                          {p.revertReason && (
                                            <button
                                              title={`Revertido: ${p.revertReason}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toast.info(
                                                  `Justificativa da Reversão: ${p.revertReason}`,
                                                  {
                                                    duration: 5000,
                                                  },
                                                );
                                              }}
                                              className="text-amber-500 hover:text-amber-600 transition-colors"
                                            >
                                              <AlertCircle className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-500">
                                          Vencimento:{" "}
                                          {format(
                                            parseISO(p.dueDate),
                                            "dd/MM/yyyy",
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                      <p className="text-sm font-bold text-slate-900">
                                        R$ {p.amount.toLocaleString()}
                                      </p>
                                      <div className="flex gap-1">
                                        {p.status !== "paid" &&
                                        p.status !== "cancelled" &&
                                        p.status !== "partial" ? (
                                          <Button
                                            size="sm"
                                            className="h-8 px-3 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm font-bold"
                                            onClick={() =>
                                              onConfirmPayment(p.id)
                                            }
                                          >
                                            Confirmar
                                          </Button>
                                        ) : (
                                          <div className="flex gap-1 items-center">
                                            {(p.status === "paid" ||
                                              p.status === "partial") && (
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
                                            {(p.status === "paid" ||
                                              p.status === "partial") &&
                                            p.receiptUrl ? (
                                              <a
                                                href={p.receiptUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="h-8 px-3 rounded-lg border border-emerald-100 text-emerald-600 hover:bg-emerald-50 flex items-center text-[10px] font-bold"
                                              >
                                                Recibo
                                              </a>
                                            ) : null}
                                            {p.status === "paid" &&
                                              p.evidenceLocation && (
                                                <div className="h-8 px-2 rounded-lg border border-slate-100 bg-slate-50 flex items-center gap-1 text-[9px] font-bold text-slate-500 max-w-[100px] truncate">
                                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                  {p.evidenceLocation.startsWith(
                                                    "http",
                                                  ) ? (
                                                    <a
                                                      href={p.evidenceLocation}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      onClick={(e) =>
                                                        e.stopPropagation()
                                                      }
                                                      className="hover:underline truncate"
                                                    >
                                                      Link
                                                    </a>
                                                  ) : (
                                                    <span className="truncate">
                                                      {p.evidenceLocation}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            {p.status !== "paid" && (
                                              <span className="text-[10px] font-bold text-slate-400 uppercase px-2">
                                                {p.status === "cancelled"
                                                  ? "Cancelado"
                                                  : ""}
                                              </span>
                                            )}
                                            {(p.status === "paid" ||
                                              p.status === "partial") &&
                                              !p.receiptUrl &&
                                              !p.evidenceLocation && (
                                                <span className="text-[10px] font-bold text-slate-400 uppercase px-2">
                                                  Pago
                                                </span>
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
                  <p className="text-slate-500 font-medium">
                    Nenhum pagamento registrado.
                  </p>
                  <p className="text-xs text-slate-400">
                    Clique em "Receber" para adicionar um novo pagamento.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-6">Acordos Ativos</h2>
            <div className="space-y-8">
              {properties
                .filter((p) =>
                  agreements.some(
                    (a) => a.propertyId === p.id && a.status === "active",
                  ),
                )
                .map((prop) => (
                  <div key={prop.id} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Home className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                        {prop.name}
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {agreements
                        .filter(
                          (a) =>
                            a.propertyId === prop.id && a.status === "active",
                        )
                        .map((a) => {
                          const tenant = tenants.find(
                            (t) => t.id === a.tenantId,
                          );
                          const paidInstallments = payments.filter(
                            (p) =>
                              p.agreementId === a.id &&
                              (p.status === "paid" || p.status === "partial"),
                          ).length;

                          return (
                            <div
                              key={a.id}
                              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    {a.description}
                                    {(a.evidence || a.evidenceLocation) && (
                                      <Paperclip className="w-3 h-3 text-slate-400" />
                                    )}
                                  </h3>
                                  <p className="text-xs text-slate-500">
                                    {tenant?.name}
                                  </p>
                                  {(a.evidence || a.evidenceLocation) && (
                                    <div className="flex items-center gap-3 mt-1">
                                      {a.thumbnailLink && (
                                        <img
                                          src={a.thumbnailLink}
                                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                                          alt="Preview"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const isImage =
                                              a.evidenceLocation?.match(
                                                /\.(jpeg|jpg|gif|png)$/i,
                                              ) || a.thumbnailLink;
                                            setPreviewReceipt({
                                              url: a.evidenceLocation!,
                                              name: `Evidência - ${a.description}`,
                                              isImage: !!isImage,
                                            });
                                          }}
                                        />
                                      )}
                                      {a.evidence && (
                                        <a
                                          href={a.evidence}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] text-primary flex items-center gap-1"
                                        >
                                          <ImageIcon className="w-3 h-3" /> Ver
                                          Anexo
                                        </a>
                                      )}
                                      {a.evidenceLocation &&
                                        (a.evidenceLocation.startsWith(
                                          "http",
                                        ) ? (
                                          <a
                                            href={a.evidenceLocation}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[10px] text-primary flex items-center gap-1 hover:underline"
                                          >
                                            <MapPin className="w-3 h-3" /> Link
                                            Externo
                                          </a>
                                        ) : (
                                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />{" "}
                                            {a.evidenceLocation}
                                          </span>
                                        ))}
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
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                                    Total
                                  </p>
                                  <p className="text-sm font-bold text-slate-900">
                                    R$ {a.totalAmount.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                                    Parcela
                                  </p>
                                  <p className="text-sm font-bold text-emerald-600">
                                    R$ {a.installmentAmount.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                                    Progresso
                                  </p>
                                  <p className="text-sm font-bold text-slate-900">
                                    {paidInstallments} de {a.durationMonths}
                                  </p>
                                </div>
                              </div>

                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full transition-all duration-500"
                                  style={{
                                    width: `${(paidInstallments / a.durationMonths) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              {agreements.filter((a) => a.status === "active").length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm italic">
                  Nenhum acordo ativo no momento.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <FinancialSummary
        properties={properties}
        tenants={tenants}
        payments={payments}
        expenses={expenses}
        agreements={agreements}
        onConfirmPayment={onConfirmPayment}
        onOpenTenantDetail={onOpenTenantDetail}
        storages={storages}
        onNavigateToStorage={onNavigateToStorage}
      />

      <Modal
        isOpen={isPaymentDetailModalOpen}
        onClose={() => setIsPaymentDetailModalOpen(false)}
        title="Detalhes do Pagamento"
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Status
                </p>
                <p
                  className={cn(
                    "text-sm font-bold",
                    selectedPayment.status === "paid" ||
                      selectedPayment.status === "partial"
                      ? "text-emerald-600"
                      : selectedPayment.status === "late"
                        ? "text-destructive"
                        : selectedPayment.status === "cancelled"
                          ? "text-slate-500"
                          : "text-amber-600",
                  )}
                >
                  {selectedPayment.status === "paid"
                    ? "Pago"
                    : selectedPayment.status === "partial"
                      ? "Parcial"
                      : selectedPayment.status === "late"
                        ? "Atrasado"
                        : selectedPayment.status === "cancelled"
                          ? "Cancelado"
                          : "Pendente"}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Valor
                </p>
                <p className="text-sm font-bold text-slate-900">
                  R$ {selectedPayment.amount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">
                    {
                      properties.find(
                        (p) => p.id === selectedPayment.propertyId,
                      )?.name
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">
                    {
                      tenants.find((t) => t.id === selectedPayment.tenantId)
                        ?.name
                    }
                  </span>
                </div>
              </div>

              {selectedPayment.originalDueDate && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-amber-900">
                      Vencimento Ajustado Automaticamente
                    </p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      Este vencimento estava originalmente previsto para o dia{" "}
                      <strong>
                        {format(
                          parseISO(selectedPayment.originalDueDate),
                          "dd/MM/yyyy",
                        )}
                      </strong>
                      . Como esta data caiu em um fim de semana ou feriado
                      nacional brasileiro, o prazo foi postergado
                      automaticamente para o próximo dia útil subsequente (
                      <strong>
                        {format(
                          parseISO(selectedPayment.dueDate),
                          "dd/MM/yyyy",
                        )}
                      </strong>
                      ), garantindo que o inquilino possa pagar sem qualquer
                      tipo de multa ou atraso.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Vencimento
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <p className="text-sm">
                      {format(parseISO(selectedPayment.dueDate), "dd/MM/yyyy")}
                      {selectedPayment.originalDueDate && " (Ajustado)"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Data de Pagamento
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    <p className="text-sm">
                      {selectedPayment.paidDate
                        ? format(
                            parseISO(selectedPayment.paidDate),
                            "dd/MM/yyyy",
                          )
                        : "Pendente"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Descrição / Tipo
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm font-medium uppercase text-slate-500 text-[10px] mb-1">
                    {selectedPayment.type}
                  </p>
                  <p className="text-sm text-slate-700">
                    {selectedPayment.description}
                  </p>
                </div>
              </div>

              {selectedPayment.evidenceLocation && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Localização do Comprovante
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {selectedPayment.evidenceLocation.startsWith("http") ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const isImage =
                            selectedPayment.evidenceLocation?.match(
                              /\.(jpeg|jpg|gif|png)$/i,
                            ) || selectedPayment.thumbnailLink;
                          setPreviewReceipt({
                            url: selectedPayment.evidenceLocation!,
                            name: `Evidência`,
                            isImage: !!isImage,
                          });
                        }}
                        className="text-sm text-primary hover:underline break-all text-left"
                      >
                        {selectedPayment.evidenceLocation}
                      </button>
                    ) : (
                      <p className="text-sm">
                        {selectedPayment.evidenceLocation}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedPayment.revertReason && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider ml-1">
                    Justificativa da Reversão
                  </p>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 italic">
                      "{selectedPayment.revertReason}"
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-3">
              {selectedPayment.status !== "paid" &&
                selectedPayment.status !== "cancelled" && (
                  <Button
                    className="flex-1 py-3"
                    onClick={() => {
                      setIsPaymentDetailModalOpen(false);
                      onConfirmPayment(selectedPayment.id);
                    }}
                  >
                    Confirmar Pagamento
                  </Button>
                )}
              {selectedPayment.receiptUrl && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Comprovante
                  </p>
                  {selectedPayment.thumbnailLink ? (
                    <div className="relative group overflow-hidden rounded-2xl border border-slate-200">
                      <img
                        src={selectedPayment.thumbnailLink}
                        alt="Recibo"
                        className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                        onClick={() => {
                          const isImage =
                            selectedPayment.receiptUrl?.match(
                              /\.(jpeg|jpg|gif|png)$/i,
                            ) || selectedPayment.thumbnailLink;
                          if (isImage) {
                            setPreviewReceipt({
                              url: selectedPayment.receiptUrl!,
                              name: selectedPayment.evidenceName || "Recibo",
                              isImage: true,
                            });
                          } else {
                            window.open(selectedPayment.receiptUrl, "_blank");
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
                          <p className="text-sm font-medium text-slate-700">
                            Comprovante de Pagamento
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">
                            Arquivo Anexado
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 gap-2"
                          onClick={() => {
                            const isImage =
                              selectedPayment.receiptUrl?.match(
                                /\.(jpeg|jpg|gif|png)$/i,
                              ) || selectedPayment.thumbnailLink;
                            if (isImage) {
                              setPreviewReceipt({
                                url: selectedPayment.receiptUrl!,
                                name: selectedPayment.evidenceName || "Recibo",
                                isImage: true,
                              });
                            } else {
                              window.open(selectedPayment.receiptUrl, "_blank");
                            }
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Abrir
                        </Button>
                        {selectedPayment.evidenceLocation ===
                          "Google Drive" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 gap-2"
                            onClick={() => {
                              // Force download by using webContentLink if we had it,
                              // but we only stored webViewLink in receiptUrl.
                              // We can try to append &export=download to webViewLink or just open it.
                              window.open(
                                selectedPayment.receiptUrl?.replace(
                                  "/view",
                                  "/view?usp=sharing",
                                ),
                                "_blank",
                              );
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
              <Button
                variant="outline"
                className="py-3"
                onClick={() => setIsPaymentDetailModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isExpenseDetailModalOpen}
        onClose={() => setIsExpenseDetailModalOpen(false)}
        title="Detalhes da Despesa"
      >
        {selectedExpense && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Tipo
                </p>
                <p className="text-sm font-bold text-slate-900 uppercase">
                  {selectedExpense.type}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Valor
                </p>
                <p className="text-sm font-bold text-destructive">
                  R$ {selectedExpense.amount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Imóvel
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <Home className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-medium">
                    {
                      properties.find(
                        (p) => p.id === selectedExpense.propertyId,
                      )?.name
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Data
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <p className="text-sm">
                    {format(parseISO(selectedExpense.date), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Descrição
                </p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {selectedExpense.description}
                  </p>
                </div>
              </div>

              {selectedExpense.items && selectedExpense.items.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Itens Detalhados da Despesa
                  </p>
                  <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-2xl space-y-2">
                    {selectedExpense.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-xs py-1 border-b border-indigo-100/50 last:border-0 last:pb-0"
                      >
                        <span className="text-slate-600 font-medium flex gap-1.5">
                          <span className="text-indigo-600 font-bold">
                            Item {idx + 1}:
                          </span>
                          {item.description}
                        </span>
                        <span className="font-mono font-bold text-slate-950">
                          R${" "}
                          {item.amount.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-indigo-200 font-bold text-slate-900">
                      <span>Total Calculado:</span>
                      <span className="text-indigo-700 font-mono text-sm">
                        R${" "}
                        {selectedExpense.amount.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedExpense.evidenceLocation &&
                !selectedExpense.evidenceLocation.startsWith("http") && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                      Localização do Comprovante
                    </p>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <p className="text-sm">
                        {selectedExpense.evidenceLocation}
                      </p>
                    </div>
                  </div>
                )}
            </div>

            <div className="pt-4 flex flex-col gap-3">
              {selectedExpense.attachments &&
              selectedExpense.attachments.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Comprovantes Anexados
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedExpense.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full py-3 h-auto min-h-[44px]"
                        >
                          <ImageIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {att.name || `Anexo ${i + 1}`}
                          </span>
                        </Button>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                (selectedExpense.evidence ||
                  (selectedExpense.evidenceLocation &&
                    selectedExpense.evidenceLocation.startsWith("http"))) && (
                  <a
                    href={
                      selectedExpense.evidence ||
                      selectedExpense.evidenceLocation
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full py-3">
                      <ImageIcon className="w-4 h-4 mr-2" /> Ver Comprovante
                    </Button>
                  </a>
                )
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 py-3"
                  onClick={() => setIsExpenseDetailModalOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Nova Despesa"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-indigo-50/50 border border-dashed border-indigo-200 rounded-xl">
            <div className="flex-1">
              <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> Escanear Comprovante (IA)
              </label>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Envie a foto da conta e a IA preencherá os dados.
              </p>
            </div>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleScanInvoice(e, true)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isScanning}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-100 pointer-events-none"
                disabled={isScanning}
              >
                {isScanning ? "Lendo..." : "Anexar Foto"}
              </Button>
            </div>
          </div>

          <Select
            label="Imóvel"
            id="prop"
            value={expenseForm.propertyId}
            onChange={(e) =>
              setExpenseForm({ ...expenseForm, propertyId: e.target.value })
            }
            options={[
              { label: "Selecione um imóvel", value: "" },
              ...properties.map((p) => ({ label: p.name, value: p.id })),
            ]}
            required
          />
          <Input
            label="Descrição"
            id="desc"
            value={expenseForm.description || ""}
            onChange={(e) =>
              setExpenseForm({ ...expenseForm, description: e.target.value })
            }
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <CurrencyInput
              label="Valor"
              id="val"
              value={expenseForm.amount}
              onChange={(val) =>
                setExpenseForm({ ...expenseForm, amount: val })
              }
              required
            />
            <Input
              label="Data"
              id="date"
              type="date"
              value={expenseForm.date || ""}
              onChange={(e) =>
                setExpenseForm({ ...expenseForm, date: e.target.value })
              }
              required
            />
          </div>
          <Select
            label="Tipo"
            id="type"
            value={expenseForm.type}
            onChange={(e) =>
              setExpenseForm({
                ...expenseForm,
                type: e.target.value as ExpenseType,
              })
            }
            options={[
              { label: "Reforma", value: "renovation" },
              { label: "Reparo", value: "repair" },
              { label: "Imposto", value: "tax" },
              { label: "Multa", value: "fine" },
              { label: "Outro", value: "other" },
            ]}
          />

          <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              Gastos Detalhados (Opcional - Soma Automática)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                id="fin-subitem-desc"
                label="Identificação do Gasto (Ex: Cano)"
                placeholder="Ex: Cano, Massa, Tinta"
                value={subItemDesc}
                onChange={(e) => setSubItemDesc(e.target.value)}
              />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <CurrencyInput
                    id="fin-subitem-amount"
                    label="Valor do Gasto (R$)"
                    value={subItemAmount}
                    onChange={(val) => setSubItemAmount(val)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (!subItemDesc.trim()) {
                      toast.error("Por favor, preencha a descrição do item.");
                      return;
                    }
                    if (subItemAmount <= 0) {
                      toast.error("O valor do item deve ser maior que zero.");
                      return;
                    }

                    const newItem = {
                      description: subItemDesc.trim(),
                      amount: subItemAmount,
                    };
                    const updatedItems = [
                      ...(expenseForm.items || []),
                      newItem,
                    ];
                    const totalSum = updatedItems.reduce(
                      (acc, item) => acc + item.amount,
                      0,
                    );

                    // Automatically compile descriptions nicely
                    let newDesc = expenseForm.description;
                    if (
                      !expenseForm.description ||
                      expenseForm.description === "Despesa com vários itens"
                    ) {
                      newDesc = updatedItems
                        .map(
                          (item) => `${item.description} (R$ ${item.amount})`,
                        )
                        .join(" + ");
                    } else {
                      // Append it if not already containing it
                      if (
                        !expenseForm.description.includes(newItem.description)
                      ) {
                        newDesc = `${expenseForm.description} + ${newItem.description} (R$ ${newItem.amount})`;
                      }
                    }

                    setExpenseForm({
                      ...expenseForm,
                      items: updatedItems,
                      amount: totalSum,
                      description: newDesc,
                    });

                    setSubItemDesc("");
                    setSubItemAmount(0);
                    toast.success("Item adicionado!");
                  }}
                  className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 font-bold flex items-center justify-center text-xs"
                >
                  Adicionar
                </Button>
              </div>
            </div>

            {expenseForm.items && expenseForm.items.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Itens Lançados:
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {expenseForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-white px-3 py-1.5 rounded-xl border border-slate-100 text-xs shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600">
                          Gasto {idx + 1}:
                        </span>
                        <span className="text-slate-600 font-medium">
                          {item.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          R${" "}
                          {item.amount.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = [...expenseForm.items];
                            newItems.splice(idx, 1);
                            const totalSum = newItems.reduce(
                              (acc, it) => acc + it.amount,
                              0,
                            );

                            // Recalculate description nicely
                            let newDesc = "";
                            if (newItems.length > 0) {
                              newDesc = newItems
                                .map(
                                  (it) => `${it.description} (R$ ${it.amount})`,
                                )
                                .join(" + ");
                            }

                            setExpenseForm({
                              ...expenseForm,
                              items: newItems,
                              amount: totalSum,
                              description: newDesc,
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">
              Anexar Evidência (Fotos/PDFs)
            </label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="expense-evidence"
                  className="hidden"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;

                    const tenantName =
                      tenants.find(
                        (t) => t.propertyId === expenseForm.propertyId,
                      )?.name || "Geral";

                    for (const file of files) {
                      // Check for duplicates
                      const duplicateExp = expenses.find((exp) =>
                        exp.attachments?.some((a) => a.name === file.name),
                      );
                      if (duplicateExp) {
                        const confirmReuse = window.confirm(
                          `Atenção: O comprovante "${file.name}" já foi utilizado na despesa "${duplicateExp.description || "Desconhecida"}". Deseja realmente utilizá-lo de novo nesta nova despesa?`,
                        );
                        if (!confirmReuse) {
                          continue;
                        }
                      }

                      const reader = new FileReader();
                      const filePromise = new Promise<string>((resolve) => {
                        reader.onloadend = () =>
                          resolve(reader.result as string);
                        reader.readAsDataURL(file);
                      });
                      const base64 = await filePromise;

                      // Analyze with AI agent
                      toast.promise(scanInvoice(base64), {
                        loading: `Analisando valores de ${file.name}...`,
                        success: (extractedData) => {
                          if (extractedData && extractedData.amount) {
                            setExpenseForm((prev) => ({
                              ...prev,
                              amount:
                                (Number(prev.amount) || 0) +
                                Number(extractedData.amount),
                              description: prev.description
                                ? `${prev.description} + ${extractedData.description || file.name}`
                                : extractedData.description ||
                                  "Despesa com vários itens",
                            }));
                            return `Extraído: R$ ${extractedData.amount}`;
                          }
                          return `Análise de ${file.name} concluída.`;
                        },
                        error: `Falha ao analisar ${file.name}`,
                      });

                      if (isDriveConnected) {
                        toast.promise(
                          uploadToDrive(
                            file.name,
                            base64,
                            file.type,
                            tenantName,
                          ),
                          {
                            loading: `Enviando ${file.name}...`,
                            success: (data) => {
                              setExpenseForm((prev) => ({
                                ...prev,
                                attachments: [
                                  ...(prev.attachments || []),
                                  {
                                    url: data.webViewLink,
                                    name: file.name,
                                    thumbnailLink: data.thumbnailLink,
                                  },
                                ],
                              }));
                              return `${file.name} salvo numeração automática.`;
                            },
                            error: `Erro ao enviar ${file.name}`,
                          },
                        );
                      } else {
                        if (file.type.startsWith("image/")) {
                          compressImage(base64).then((compressed) => {
                            setExpenseForm((prev) => ({
                              ...prev,
                              attachments: [
                                ...(prev.attachments || []),
                                { url: compressed, name: file.name },
                              ],
                            }));
                          });
                        } else {
                          setExpenseForm((prev) => ({
                            ...prev,
                            attachments: [
                              ...(prev.attachments || []),
                              { url: base64, name: file.name },
                            ],
                          }));
                        }
                      }
                    }

                    // Reset input so the same files can be selected again if needed
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("expense-evidence")?.click()
                  }
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl border border-slate-200 transition-colors text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Adicionar Arquivos
                </button>
              </div>

              {((expenseForm.attachments &&
                expenseForm.attachments.length > 0) ||
                expenseForm.evidence) && (
                <div className="flex flex-col gap-2 mt-2">
                  {/* Keep legacy evidence for fallback rendering if needed, though mostly using attachments now */}
                  {(expenseForm.attachments || []).map((att, i) => (
                    <div
                      key={i}
                      className="p-2 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {att.url.startsWith("data:image") ||
                        att.thumbnailLink ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm flex-shrink-0">
                            <img
                              src={att.thumbnailLink || att.url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            Evidência {i + 1}: {att.name}
                          </p>
                          <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-tight">
                            Anexado
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newAtts = [...(expenseForm.attachments || [])];
                          newAtts.splice(i, 1);
                          setExpenseForm((prev) => ({
                            ...prev,
                            attachments: newAtts,
                          }));
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                        title="Remover anexo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {expenseForm.evidence &&
                    (!expenseForm.attachments ||
                      expenseForm.attachments.length === 0) && (
                      <div className="p-2 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">
                              {expenseForm.evidenceName || "Arquivo anexado"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpenseForm({
                              ...expenseForm,
                              evidence: "",
                              evidenceName: "",
                            })
                          }
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
          <Input
            label="Localização do Comprovante (Opcional)"
            id="evidence-location"
            placeholder="Ex: Pasta Física 2024, Google Drive, etc."
            value={expenseForm.evidenceLocation}
            onChange={(e) =>
              setExpenseForm({
                ...expenseForm,
                evidenceLocation: e.target.value,
              })
            }
          />
          <div className="pt-4 flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Despesa"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsExpenseModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAllExpensesModalOpen}
        onClose={() => setIsAllExpensesModalOpen(false)}
        title="Todas as Despesas"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar despesas (descrição)..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={expenseSearchQuery}
                onChange={(e) => setExpenseSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={filterExpensePropertyId}
                onChange={(e) => setFilterExpensePropertyId(e.target.value)}
              >
                <option value="">Todos os Imóveis</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={filterExpenseType}
                onChange={(e) => setFilterExpenseType(e.target.value)}
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
              .filter((e) => {
                const matchesProperty =
                  !filterExpensePropertyId ||
                  e.propertyId === filterExpensePropertyId;
                const matchesType =
                  filterExpenseType === "all" || e.type === filterExpenseType;
                const typeLabel =
                  e.type === "repair"
                    ? "manutenção"
                    : e.type === "renovation"
                      ? "reforma"
                      : e.type === "tax"
                        ? "imposto"
                        : e.type === "fine"
                          ? "multa"
                          : "outro";
                const matchesSearch =
                  !expenseSearchQuery ||
                  e.description
                    .toLowerCase()
                    .includes(expenseSearchQuery.toLowerCase()) ||
                  typeLabel.includes(expenseSearchQuery.toLowerCase());
                return matchesProperty && matchesType && matchesSearch;
              })
              .sort(
                (a, b) =>
                  parseISO(b.date).getTime() - parseISO(a.date).getTime(),
              )
              .map((e) => {
                const prop = properties.find((pr) => pr.id === e.propertyId);
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedExpense(e);
                      setIsExpenseDetailModalOpen(true);
                    }}
                  >
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        {e.type === "repair"
                          ? "Manutenção"
                          : e.type === "renovation"
                            ? "Reforma"
                            : e.type === "tax"
                              ? "Imposto"
                              : e.type === "fine"
                                ? "Multa"
                                : "Outro"}
                      </p>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {e.description}
                        {(e.evidence || e.evidenceLocation) && (
                          <Paperclip className="w-3 h-3 text-slate-400" />
                        )}
                        {e.thumbnailLink && (
                          <img
                            src={e.thumbnailLink}
                            className="w-6 h-6 rounded object-cover border border-slate-200"
                            alt="Preview"
                          />
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {prop?.name} • {format(parseISO(e.date), "dd/MM/yyyy")}
                      </p>
                      {e.evidenceLocation &&
                        (e.evidenceLocation.startsWith("http") ? (
                          <a
                            href={e.evidenceLocation}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] text-primary mt-0.5 flex items-center gap-1 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPin className="w-2.5 h-2.5" /> Link Externo
                          </a>
                        ) : (
                          <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />{" "}
                            {e.evidenceLocation}
                          </p>
                        ))}
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-rose-600">
                        - R$ {e.amount.toLocaleString()}
                      </p>
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
            {expenses.filter((e) => {
              const matchesProperty =
                !filterExpensePropertyId ||
                e.propertyId === filterExpensePropertyId;
              const matchesType =
                filterExpenseType === "all" || e.type === filterExpenseType;
              const typeLabel =
                e.type === "repair"
                  ? "manutenção"
                  : e.type === "renovation"
                    ? "reforma"
                    : e.type === "tax"
                      ? "imposto"
                      : e.type === "fine"
                        ? "multa"
                        : "outro";
              const matchesSearch =
                !expenseSearchQuery ||
                e.description
                  .toLowerCase()
                  .includes(expenseSearchQuery.toLowerCase()) ||
                typeLabel.includes(expenseSearchQuery.toLowerCase());
              return matchesProperty && matchesType && matchesSearch;
            }).length === 0 && (
              <p className="text-center py-8 text-slate-400 italic">
                Nenhuma despesa encontrada com estes filtros.
              </p>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isNewPaymentModalOpen}
        onClose={() => setIsNewPaymentModalOpen(false)}
        title="Novo Recebimento"
      >
        <form onSubmit={handleAddPayment} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-indigo-50/50 border border-dashed border-indigo-200 rounded-xl">
            <div className="flex-1">
              <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> Escanear Fatura/Boleto (IA)
              </label>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Envie a foto e a IA extrai valor, descrição e data.
              </p>
            </div>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleScanInvoice(e, false)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isScanning}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-100 pointer-events-none"
                disabled={isScanning}
              >
                {isScanning ? "Lendo..." : "Anexar Foto"}
              </Button>
            </div>
          </div>

          <Select
            label="Inquilino"
            id="tenant"
            value={paymentForm.tenantId}
            onChange={(e) => {
              const tId = e.target.value;
              const tenant = tenants.find((t) => t.id === tId);
              const property = properties.find(
                (p) => p.id === tenant?.propertyId,
              );
              setPaymentForm({
                ...paymentForm,
                tenantId: tId,
                propertyId: tenant?.propertyId || "",
                amount: property?.rentValue || 0,
              });
            }}
            options={[
              { label: "Selecione um inquilino", value: "" },
              ...tenants
                .filter((t) => t.status === "allocated")
                .map((t) => ({ label: t.name, value: t.id })),
            ]}
            required
          />
          <Input
            label="Descrição"
            id="pdesc"
            value={paymentForm.description || ""}
            onChange={(e) =>
              setPaymentForm({ ...paymentForm, description: e.target.value })
            }
            required
          />
          <CurrencyInput
            label="Valor"
            id="pamt"
            value={paymentForm.amount}
            onChange={(val) => setPaymentForm({ ...paymentForm, amount: val })}
            required
          />
          <Input
            label="Data de Vencimento"
            id="pdate"
            type="date"
            value={paymentForm.dueDate || ""}
            onChange={(e) =>
              setPaymentForm({ ...paymentForm, dueDate: e.target.value })
            }
            required
          />
          <Select
            label="Tipo"
            id="ptype"
            value={paymentForm.type}
            onChange={(e) =>
              setPaymentForm({ ...paymentForm, type: e.target.value as any })
            }
            options={[
              { label: "Aluguel", value: "rent" },
              { label: "Caução", value: "deposit" },
              { label: "Acordo/Extra", value: "agreement" },
            ]}
          />

          <div className="pt-4 flex gap-3">
            <Button
              type="submit"
              className="flex-1 py-3"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Salvar Recebimento"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsNewPaymentModalOpen(false)}
              className="py-3"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteExpenseModalOpen}
        onClose={() => setIsDeleteExpenseModalOpen(false)}
        title="Excluir Despesa"
      >
        <div className="space-y-6">
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4">
            <div className="p-2 bg-red-500 text-white rounded-xl">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-900">
                Confirmar Exclusão
              </p>
              <p className="text-xs text-red-700">
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>

          {expenseToDelete && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Despesa selecionada
              </p>
              <p className="text-sm font-bold text-slate-900">
                {expenseToDelete.description}
              </p>
              <p className="text-xs text-slate-500">
                Valor: R$ {expenseToDelete.amount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">
                Data: {format(parseISO(expenseToDelete.date), "dd/MM/yyyy")}
              </p>
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
              {isSubmitting ? "Excluindo..." : "Sim, Excluir"}
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
  setIsRevertModalOpen?: (open: boolean) => void;
  setRevertingPayment?: (p: Payment | null) => void;
  onOpenTenantDetail: (t: Tenant) => void;
  highlightedPaymentId: string | null;
  setHighlightedPaymentId: (id: string | null) => void;
  isDriveConnected: boolean;
  uploadToDrive: (
    fileName: string,
    fileData: string,
    mimeType: string,
    folderName?: string,
  ) => Promise<any>;
}

const ReceivablesView = ({
  properties,
  tenants,
  payments,
  agreements,
  setConfirmingPayment,
  setIsPaymentModalOpen,
  setIsRevertModalOpen,
  setRevertingPayment,
  onOpenTenantDetail,
  highlightedPaymentId,
  setHighlightedPaymentId,
  isDriveConnected,
  uploadToDrive,
}: ReceivablesViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "rent" | "agreement" | "deposit">(
    "all",
  );
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "late">(
    "all",
  );
  const [activeTab, setActiveTab] = useState<"pending" | "receipts">("pending");
  const [expandedPaymentGroups, setExpandedPaymentGroups] = useState<
    Record<string, boolean>
  >({});

  const [receiptModalPayment, setReceiptModalPayment] =
    useState<Payment | null>(null);
  const [receiptType, setReceiptType] = useState<"simple" | "detailed">(
    "simple",
  );
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    const input = document.getElementById("receipt-content");
    if (!input || !receiptModalPayment) return;

    setIsGeneratingPDF(true);
    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`recibo_${receiptModalPayment.id?.substring(0, 8)}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  useEffect(() => {
    if (highlightedPaymentId) {
      // Clear filters to ensure the item is visible
      setSearchQuery("");
      setFilterType("all");
      setFilterStatus("all");

      // Small delay to ensure the list is rendered and filtered
      const timer = setTimeout(() => {
        const element = document.getElementById(
          `payment-${highlightedPaymentId}`,
        );
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
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
      .filter((p) => (p.status === "pending" || p.status === "late") && p.tenantId !== "proprietario")
      .sort(
        (a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(),
      );
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return pendingPayments.filter((p) => {
      const tenant = tenants.find((t) => t.id === p.tenantId);
      const property = properties.find((pr) => pr.id === p.propertyId);
      const tenantName =
        tenant?.name || p.tenantNameSnapshot || "Inquilino Excluído";
      const propertyName =
        property?.name || p.propertyNameSnapshot || "Imóvel Excluído";
      const matchesSearch =
        !searchQuery ||
        tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        filterType === "all" ||
        (filterType === "rent" && (!p.type || p.type === "rent")) ||
        (filterType === "agreement" && p.type === "agreement") ||
        (filterType === "deposit" && p.type === "deposit");

      const matchesStatus = filterStatus === "all" || p.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [
    pendingPayments,
    tenants,
    properties,
    searchQuery,
    filterType,
    filterStatus,
  ]);

  const paidPayments = useMemo(() => {
    return payments
      .filter((p) => p.status === "paid" && p.tenantId !== "proprietario")
      .sort((a, b) => {
        const dateA = a.paidDate
          ? parseISO(a.paidDate).getTime()
          : parseISO(a.dueDate).getTime();
        const dateB = b.paidDate
          ? parseISO(b.paidDate).getTime()
          : parseISO(b.dueDate).getTime();
        return dateB - dateA;
      });
  }, [payments]);

  const filteredPaidPayments = useMemo(() => {
    return paidPayments.filter((p) => {
      const tenant = tenants.find((t) => t.id === p.tenantId);
      const property = properties.find((pr) => pr.id === p.propertyId);
      const tenantName =
        tenant?.name || p.tenantNameSnapshot || "Inquilino Excluído";
      const propertyName =
        property?.name || p.propertyNameSnapshot || "Imóvel Excluído";
      return (
        !searchQuery ||
        tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [paidPayments, tenants, properties, searchQuery]);

  const groupedPaidPayments = useMemo(() => {
    const groups: Record<string, typeof filteredPaidPayments> = {};
    filteredPaidPayments.forEach((p) => {
      const date = p.paidDate || p.dueDate;
      const monthYear = format(parseISO(date), "MMMM yyyy", { locale: ptBR });
      const header = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      if (!groups[header]) groups[header] = [];
      groups[header].push(p);
    });
    return Object.entries(groups).map(([month, payments]) => ({
      month,
      payments,
    }));
  }, [filteredPaidPayments]);

  const stats = useMemo(() => {
    const today = new Date();
    const includedPayments = pendingPayments;
    const late = includedPayments.filter((p) => p.status === "late");
    const todayPending = includedPayments.filter(
      (p) =>
        format(parseISO(p.dueDate), "yyyy-MM-dd") ===
        format(today, "yyyy-MM-dd"),
    );

    return {
      total: includedPayments.reduce(
        (acc, p) => acc + p.amount + (p.interestAmount || 0),
        0,
      ),
      count: includedPayments.length,
      lateTotal: late.reduce(
        (acc, p) => acc + p.amount + (p.interestAmount || 0),
        0,
      ),
      lateCount: late.length,
      todayTotal: todayPending.reduce(
        (acc, p) => acc + p.amount + (p.interestAmount || 0),
        0,
      ),
      todayCount: todayPending.length,
    };
  }, [pendingPayments]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Central de Recebimentos
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Confirme pagamentos de aluguéis e acordos em um só lugar.
        </p>
      </header>

      <div className="relative flex p-2 bg-slate-100/80 backdrop-blur-md rounded-2xl mb-8 w-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-slate-200/50 items-center justify-between gap-2 sm:gap-3 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab("pending")}
          className={cn(
            "relative px-4 sm:px-10 py-3 sm:py-4 rounded-xl text-sm font-black transition-all duration-500 flex items-center gap-2 sm:gap-3 whitespace-nowrap flex-1 justify-center z-10",
            activeTab === "pending"
              ? "bg-white text-emerald-600 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/20 transform scale-[1.01]"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50",
          )}
        >
          <div
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              activeTab === "pending"
                ? "bg-emerald-500 text-white"
                : "bg-slate-200 text-slate-500",
            )}
          >
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="tracking-tight uppercase text-[10px] sm:text-[12px] font-black">
            A Receber
          </span>
          <div
            className={cn(
              "ml-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black transition-all duration-300",
              activeTab === "pending"
                ? "bg-emerald-100 text-emerald-700 animate-pulse"
                : "bg-slate-200 text-slate-500",
            )}
          >
            {pendingPayments.length}
          </div>
        </button>

        <button
          onClick={() => setActiveTab("receipts")}
          className={cn(
            "relative px-4 sm:px-10 py-3 sm:py-4 rounded-xl text-sm font-black transition-all duration-500 flex items-center gap-2 sm:gap-3 whitespace-nowrap flex-1 justify-center z-10",
            activeTab === "receipts"
              ? "bg-white text-indigo-600 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/20 transform scale-[1.01]"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50",
          )}
        >
          <div
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              activeTab === "receipts"
                ? "bg-indigo-500 text-white"
                : "bg-slate-200 text-slate-500",
            )}
          >
            <Receipt className="w-4 h-4" />
          </div>
          <span className="tracking-tight uppercase text-[10px] sm:text-[12px] font-black">
            Histórico e Recibos
          </span>
        </button>
      </div>

      <Card className="p-3 sm:p-6 shadow-sm border-slate-100/80">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por inquilino, imóvel ou descrição..."
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === "pending" && (
            <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
              <select
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-slate-700"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="all">Todos os Tipos</option>
                <option value="rent">Aluguéis</option>
                <option value="deposit">Caução (Garantia)</option>
                <option value="agreement">Acordos</option>
              </select>
              <select
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-slate-700"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendentes</option>
                <option value="late">Atrasados</option>
              </select>
            </div>
          )}
        </div>

        {activeTab === "pending" && (
          <div className="space-y-6">
            {filteredPayments.length > 0 ? (
              Object.values(
                filteredPayments.reduce(
                  (acc, p) => {
                    const key = p.propertyId || "other";
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(p);
                    return acc;
                  },
                  {} as Record<string, typeof filteredPayments>,
                ),
              ).map((group) => {
                group.sort(
                  (a, b) =>
                    new Date(a.dueDate).getTime() -
                    new Date(b.dueDate).getTime(),
                );
                const p = group[0];
                const restPayments = group.slice(1);
                const hasMore = restPayments.length > 0;
                const isExpanded = expandedPaymentGroups[p.propertyId] || false;

                const toggleGroup = () => {
                  setExpandedPaymentGroups((prev) => ({
                    ...prev,
                    [p.propertyId]: !prev[p.propertyId],
                  }));
                };

                const renderPayment = (payment: typeof p, isSub: boolean) => {
                  const tenant = tenants.find((t) => t.id === payment.tenantId);
                  const property = properties.find(
                    (pr) => pr.id === payment.propertyId,
                  );
                  const tenantName =
                    tenant?.name ||
                    payment.tenantNameSnapshot ||
                    "Inquilino Excluído";
                  const propertyName =
                    property?.name ||
                    payment.propertyNameSnapshot ||
                    "Imóvel Excluído";
                  const isLate = payment.status === "late";

                  return (
                    <div
                      id={`payment-${payment.id}`}
                      key={payment.id}
                      className={cn(
                        "p-3.5 sm:p-5 border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 relative group bg-white overflow-hidden",
                        isSub
                          ? "rounded-b-2xl border-x border-b border-t-0"
                          : "rounded-[22px] sm:rounded-3xl",
                        isLate
                          ? isSub
                            ? "bg-rose-50/30 border-rose-100"
                            : "bg-gradient-to-br from-rose-50/50 to-white border-rose-100 hover:border-rose-300 shadow-sm"
                          : isSub
                            ? "border-slate-100"
                            : "border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5",
                        highlightedPaymentId === payment.id &&
                          "ring-4 ring-indigo-500 ring-offset-2 scale-[1.02] shadow-2xl z-10 bg-indigo-50/50 border-indigo-200",
                      )}
                    >
                      {isLate && (
                        <div
                          className={cn(
                            "absolute top-0 left-0 h-full bg-rose-500",
                            isSub ? "w-1" : "w-1.5",
                          )}
                        />
                      )}
                      <div className="flex items-center gap-3 sm:gap-5">
                        <div className="flex items-center justify-center min-w-0">
                          <div
                            className={cn(
                              "rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110",
                              isSub ? "w-8 h-8" : "w-11 h-11 sm:w-14 sm:h-14",
                              payment.type === "agreement"
                                ? "bg-blue-50 text-blue-600 border border-blue-100"
                                : payment.type === "deposit"
                                  ? "bg-amber-50 text-amber-600 border border-amber-100"
                                  : "bg-indigo-50 text-indigo-600 border border-indigo-100",
                            )}
                          >
                            {payment.type === "agreement" ? (
                              <FileText
                                className={isSub ? "w-4 h-4" : "w-5 h-5 sm:w-7 sm:h-7"}
                              />
                            ) : payment.type === "deposit" ? (
                              <ShieldCheck
                                className={isSub ? "w-4 h-4" : "w-5 h-5 sm:w-7 sm:h-7"}
                              />
                            ) : (
                              <Home className={isSub ? "w-4 h-4" : "w-5 h-5 sm:w-7 sm:h-7"} />
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-1">
                            {!isSub && (
                              <h3 className="font-black text-slate-900 tracking-tight text-sm sm:text-base truncate">
                                {propertyName}
                              </h3>
                            )}
                            {isSub && (
                              <h3 className="font-bold text-slate-700 tracking-tight text-xs sm:text-sm">
                                Parcela Subsequente
                              </h3>
                            )}
                            <span
                              className={cn(
                                "px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border shadow-sm shrink-0",
                                payment.type === "agreement"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : payment.type === "deposit"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-indigo-50 text-indigo-700 border-indigo-200",
                              )}
                            >
                              {payment.type === "agreement"
                                ? "Acordo"
                                : payment.type === "deposit"
                                  ? "Caução"
                                  : "Aluguel"}
                            </span>
                            {isLate && (
                              <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-rose-500 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-md shadow-rose-200 animate-pulse shrink-0">
                                Atrasado
                              </span>
                            )}
                          </div>

                          {!isSub && (
                            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold mb-1">
                              Inquilino: <span className="text-indigo-600 font-extrabold">{tenantName}</span>
                            </p>
                          )}

                          <div className="flex items-center gap-2 sm:gap-4 text-[9px] sm:text-[10px] text-slate-500">
                            <span className="flex items-center gap-1 font-bold whitespace-nowrap">
                              <Calendar className="w-3 h-3 text-slate-400" /> Vence em{" "}
                              {format(parseISO(payment.dueDate), "dd/MM/yyyy")}
                            </span>
                            {payment.description && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span className="truncate max-w-[120px] sm:max-w-[180px] italic">
                                  {payment.description}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row sm:flex-row items-center justify-between sm:justify-end gap-3 sm:gap-6 border-t border-slate-100 sm:border-none pt-3 sm:pt-0">
                        <div className="text-left sm:text-right min-w-fit">
                          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap leading-none mb-1">
                            Valor a Receber
                          </p>
                          <p className="text-base sm:text-lg font-extrabold text-slate-900 font-mono whitespace-nowrap">
                            R$ {payment.amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1.5 sm:gap-2 shrink-0">
                          {tenant && tenant.contact && (
                            <a
                              href={getWhatsAppLink(
                                tenant.contact,
                                `Olá ${tenant.name.split(" ")[0]}, ${isLate ? "identificamos que o" : "lembramos que o"} pagamento de R$ ${payment.amount.toLocaleString()} referente a ${property?.name || "aluguel"} ${isLate ? "está em atraso." : `vence no dia ${format(parseISO(payment.dueDate), "dd/MM/yyyy")}.`} Por favor, em caso de dúvida entre em contato.`,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-9 w-9 sm:h-10 sm:w-10 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 hover:border-emerald-500 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0"
                              title="Enviar cobrança via WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4 sm:w-4 sm:h-4" />
                            </a>
                          )}
                          <Button
                            size={isSub ? "sm" : "md"}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-lg shadow-emerald-200/50 font-bold px-4 sm:px-6 h-9 sm:h-10 text-xs sm:text-sm shrink-0"
                            onClick={() => {
                              setConfirmingPayment(payment);
                              setIsPaymentModalOpen(true);
                            }}
                          >
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div
                    key={`group-${p.propertyId}`}
                    className="relative border border-slate-100 rounded-[24px] sm:rounded-3xl bg-slate-50/50 shadow-sm p-1 flex flex-col"
                  >
                    {renderPayment(p, false)}

                    {hasMore && (
                      <div className="px-2 pt-2 pb-1 bg-transparent flex justify-center">
                        <button
                          onClick={toggleGroup}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors p-2 bg-indigo-50/50 hover:bg-indigo-100 rounded-full"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          {isExpanded
                            ? "Ocultar Parcelas"
                            : `Ver Mais ${restPayments.length} Parcela${restPayments.length > 1 ? "s" : ""}`}
                        </button>
                      </div>
                    )}

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-6 sm:pl-12 pr-2 pb-2 space-y-2 mt-2">
                            <div className="w-px h-full absolute left-6 sm:left-12 top-20 bg-indigo-100 -z-10" />
                            {restPayments.map((rp) => renderPayment(rp, true))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Tudo em dia!
                </h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  Nenhum recebimento pendente encontrado para os filtros
                  selecionados.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "receipts" && (
          <div className="space-y-8">
            {groupedPaidPayments.length > 0 ? (
              groupedPaidPayments.map((group) => (
                <div key={group.month} className="space-y-4">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    {group.month}
                    <span className="ml-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                      {group.payments.length} recebimentos
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {group.payments.map((p) => {
                      const tenant = tenants.find((t) => t.id === p.tenantId);
                      const property = properties.find(
                        (pr) => pr.id === p.propertyId,
                      );
                      const tenantName =
                        tenant?.name ||
                        p.tenantNameSnapshot ||
                        "Inquilino Excluído";
                      const propertyName =
                        property?.name ||
                        p.propertyNameSnapshot ||
                        "Imóvel Excluído";

                      return (
                        <div
                          key={p.id}
                          className="p-4 rounded-2xl border bg-white border-slate-200 transition-all hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 group flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                              {p.type === "agreement" ? (
                                <FileText className="w-6 h-6" />
                              ) : (
                                <Home className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-bold text-slate-900 group-hover:text-indigo-900 transition-colors text-sm sm:text-base">
                                  {propertyName}
                                </h3>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                                    Recebido
                                  </span>
                                  <span
                                    className={cn(
                                      "px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-widest border shadow-sm shrink-0",
                                      p.type === "agreement"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : p.type === "deposit"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-indigo-50 text-indigo-700 border-indigo-200",
                                    )}
                                  >
                                    {p.type === "agreement"
                                      ? "Acordo"
                                      : p.type === "deposit"
                                        ? "Caução"
                                        : "Aluguel"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                  <UserIcon className="w-3 h-3" /> {tenantName}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" /> Vencimento:{" "}
                                  {p.dueDate
                                    ? format(parseISO(p.dueDate), "dd/MM/yyyy")
                                    : "N/A"}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Pago em:{" "}
                                  {p.paidDate
                                    ? format(parseISO(p.paidDate), "dd/MM/yyyy")
                                    : "N/A"}
                                </span>
                              </div>
                              {p.description && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {p.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-none pt-3 sm:pt-0">
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Valor Recebido
                              </p>
                              <p className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                                R$ {p.amount.toLocaleString()}
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-2">
                              {setIsRevertModalOpen && setRevertingPayment && (
                                <Button
                                  variant="outline"
                                  className="gap-2 font-bold px-4 border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => {
                                    setRevertingPayment(p);
                                    setIsRevertModalOpen(true);
                                  }}
                                >
                                  <RotateCcw className="w-4 h-4" /> Reverter
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                className="gap-2 font-bold px-6 border-slate-200 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200"
                                onClick={() => setReceiptModalPayment(p)}
                              >
                                <Receipt className="w-4 h-4" /> Recibo
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Receipt className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Página de Recibos Vazia
                </h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  Nenhum pagamento concluído encontrado.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <Card className="p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                Total Pendente
              </p>
              <p className="text-2xl font-bold text-emerald-900">
                R$ {stats.total.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">
                {stats.count} recebimentos aguardando
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-rose-50 border-rose-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                Total Atrasado
              </p>
              <p className="text-2xl font-bold text-rose-900">
                R$ {stats.lateTotal.toLocaleString()}
              </p>
              <p className="text-[10px] text-rose-600 font-medium">
                {stats.lateCount} pagamentos em atraso
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-amber-50 border-amber-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Vencendo Hoje
              </p>
              <p className="text-2xl font-bold text-amber-900">
                R$ {stats.todayTotal.toLocaleString()}
              </p>
              <p className="text-[10px] text-amber-600 font-medium">
                {stats.todayCount} para hoje
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal de Recibo */}
      <Modal
        isOpen={!!receiptModalPayment}
        onClose={() => {
          setReceiptModalPayment(null);
          setReceiptType("simple");
        }}
        title="Recibo de Pagamento"
      >
        {receiptModalPayment &&
          (() => {
            const property = properties.find(
              (p) => p.id === receiptModalPayment.propertyId,
            );
            const tenant = tenants.find(
              (t) => t.id === receiptModalPayment.tenantId,
            );
            const paymentDate = receiptModalPayment.paidDate
              ? format(parseISO(receiptModalPayment.paidDate), "dd/MM/yyyy")
              : "-";

            return (
              <div className="space-y-6 print:space-y-4 print:text-black">
                <div className="flex gap-2 print:hidden mb-4 border-b border-slate-100 pb-4">
                  <button
                    onClick={() => setReceiptType("simple")}
                    className={cn(
                      "px-4 py-2 text-sm font-bold rounded-xl transition-all",
                      receiptType === "simple"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100",
                    )}
                  >
                    Recibo Simples
                  </button>
                  <button
                    onClick={() => setReceiptType("detailed")}
                    className={cn(
                      "px-4 py-2 text-sm font-bold rounded-xl transition-all",
                      receiptType === "detailed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100",
                    )}
                  >
                    Recibo Detalhado
                  </button>
                </div>

                <div
                  id="receipt-content"
                  className="p-8 bg-white border-2 border-slate-100 rounded-[2rem] shadow-sm print:border-none print:p-0"
                >
                  {receiptType === "simple" ? (
                    <>
                      <div className="text-center space-y-2 border-b-2 border-dashed border-slate-100 pb-8 print:pb-6 mb-8 print:mb-6">
                        <div className="flex justify-between items-start mb-6">
                          <LogoSVG className="w-12 h-12 print:hidden" />
                          <div className="text-right">
                            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                              Recibo de Quitação
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                              Ref:{" "}
                              {receiptModalPayment.id
                                ?.substring(0, 8)
                                .toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="bg-emerald-50 rounded-2xl py-4 px-6 inline-block mb-2">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                            Valor Recebido
                          </p>
                          <p className="text-3xl font-black text-emerald-700">
                            R${" "}
                            {receiptModalPayment.amount.toLocaleString(
                              "pt-BR",
                              { minimumFractionDigits: 2 },
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6 text-sm text-slate-700">
                        <div className="space-y-4 leading-relaxed">
                          <p>
                            Recebemos de{" "}
                            <strong className="text-slate-900 uppercase">
                              {tenant?.name}
                            </strong>
                            , inscrito sob o CPF/CNPJ{" "}
                            <strong className="text-slate-900">
                              {tenant?.cpf || "___.___.___-__"}
                            </strong>
                            , a importância de{" "}
                            <strong className="text-slate-900">
                              R${" "}
                              {receiptModalPayment.amount.toLocaleString(
                                "pt-BR",
                                { minimumFractionDigits: 2 },
                              )}
                            </strong>
                            .
                          </p>

                          <p>
                            Referente a{" "}
                            <strong className="text-slate-900 uppercase font-black">
                              {receiptModalPayment.description ||
                                (receiptModalPayment.type === "rent"
                                  ? "Aluguel Mensal"
                                  : "Acordo Financeiro")}
                            </strong>
                            do imóvel localizado em:{" "}
                            <strong className="text-slate-900">
                              {property?.name}{" "}
                              {property?.address ? `(${property.address})` : ""}
                            </strong>
                            .
                          </p>

                          <p>
                            Damos, por meio deste, plena e total quitação pelo
                            valor acima mencionado.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Locador Responsável
                            </p>
                            <p className="font-bold text-slate-800">
                              {auth.currentUser?.displayName ||
                                "Gerente de Imóveis"}
                            </p>
                          </div>
                          <div className="space-y-1 text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Data do Pagamento
                            </p>
                            <p className="font-bold text-slate-800">
                              {paymentDate}
                            </p>
                          </div>
                        </div>

                        {/* Digital Signature Block */}
                        <div className="mt-12 pt-8 border-t-2 border-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <QrCode className="w-10 h-10 text-slate-300" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                                Assinatura Digital Ativa
                              </p>
                              <p className="text-[10px] font-mono text-slate-400">
                                HASH:{" "}
                                {receiptModalPayment.id
                                  ?.substring(0, 12)
                                  .toUpperCase()}
                                -{new Date().getTime().toString().substring(8)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <ShieldCheck className="w-8 h-8 text-emerald-500 opacity-20 ml-auto" />
                            <p className="text-[8px] text-slate-400 uppercase font-medium mt-1">
                              Validado pelo Sistema
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-800 space-y-6">
                      <div className="text-center space-y-1 mb-8 border-b pb-6 print:pb-4">
                        <LogoSVG className="w-16 h-16 mx-auto mb-4 print:hidden" />
                        <h2 className="text-2xl font-black text-indigo-900 tracking-tighter leading-none">
                          RECIBO DETALHADO
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                          Gestão Profissional de Aluguéis
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="bg-indigo-900 text-white px-4 py-2 rounded-xl inline-block mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                            Número do Título
                          </p>
                          <p className="text-lg font-black">
                            {receiptModalPayment.id
                              ?.substring(0, 10)
                              .toUpperCase()}
                          </p>
                        </div>
                        <p className="text-xs font-bold text-slate-500">
                          Emitido em: {format(new Date(), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-4 text-left">
                        <p className="font-medium">
                          <strong>Nº do Recibo:</strong>{" "}
                          {receiptModalPayment.id
                            ?.substring(0, 8)
                            .toUpperCase() || "________________"}
                        </p>
                        <p className="font-medium flex items-center gap-1">
                          <strong>Data:</strong>{" "}
                          <input
                            type="text"
                            defaultValue={paymentDate}
                            className="w-24 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0"
                          />
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2 bg-slate-50 p-4 rounded-xl print:p-0 print:bg-transparent">
                          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <UserIcon className="w-4 h-4 text-indigo-600" />
                              <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                                DADOS DO LOCADOR
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <strong className="shrink-0">Nome:</strong>
                              <input
                                type="text"
                                defaultValue={
                                  auth.currentUser?.displayName || ""
                                }
                                className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <strong className="shrink-0">CPF/CNPJ:</strong>
                              <input
                                type="text"
                                className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 bg-slate-50 p-4 rounded-xl print:p-0 print:bg-transparent">
                          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <UserIcon className="w-4 h-4 text-emerald-600" />
                              <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">
                                DADOS DO LOCATÁRIO
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <strong className="shrink-0">Nome:</strong>
                              <input
                                type="text"
                                defaultValue={tenant?.name}
                                className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <strong className="shrink-0">CPF/CNPJ:</strong>
                              <input
                                type="text"
                                defaultValue={tenant?.cpf || ""}
                                className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0"
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <strong className="shrink-0">
                                Status Atual:
                              </strong>
                              <input
                                type="text"
                                defaultValue={
                                  tenant?.status === "waiting"
                                    ? "Em Espera"
                                    : tenant?.status === "allocated"
                                      ? "Locado"
                                      : tenant?.status === "archived"
                                        ? "Arquivado"
                                        : ""
                                }
                                className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 bg-slate-50 p-4 rounded-xl print:p-0 print:bg-transparent">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                          IMÓVEL
                        </p>
                        <div className="flex items-start gap-2">
                          <strong className="shrink-0">Endereço:</strong>
                          <input
                            type="text"
                            defaultValue={`${property?.name || ""} ${property?.address ? `- ${property.address}` : ""}`}
                            className="flex-1 w-full bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="font-bold border-b pb-2 uppercase text-slate-500 text-xs tracking-widest">
                          DECLARAÇÃO
                        </p>
                        <p className="leading-relaxed">
                          Declaro, para os devidos fins, que recebi do(a)
                          LOCATÁRIO(a) acima identificado(a) a quantia de:
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                          <p className="text-lg font-bold shrink-0 flex items-center gap-1">
                            R${" "}
                            <input
                              type="text"
                              defaultValue={(
                                receiptModalPayment.paidAmount ||
                                receiptModalPayment.amount
                              ).toLocaleString()}
                              className="w-24 bg-transparent text-lg font-bold border-b border-slate-300 outline-none focus:border-emerald-500 print:border-none print:p-0"
                            />
                          </p>
                          <input
                            type="text"
                            placeholder="Ex: Mil e quinhentos reais e cinquenta centavos"
                            className="flex-1 font-normal text-sm text-slate-600 border-b border-dashed border-slate-300 outline-none focus:border-emerald-500 bg-transparent px-1 print:border-none print:p-0"
                          />
                        </div>
                        <p className="leading-relaxed mt-2">
                          Referente ao pagamento de '
                          {receiptModalPayment.description ||
                            (receiptModalPayment.type === "rent"
                              ? "Aluguel"
                              : "Acordo")}
                          ' do imóvel descrito acima, correspondente ao período
                          com vencimento em:
                        </p>
                        <p className="font-medium">
                          <strong>
                            {format(
                              parseISO(receiptModalPayment.dueDate),
                              "dd/MM/yyyy",
                            )}
                          </strong>
                          {receiptModalPayment.originalDueDate && (
                            <span className="block text-[10px] mt-1 bg-amber-50 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 font-semibold print:bg-transparent print:border-amber-500">
                              (Vencimento original:{" "}
                              {format(
                                parseISO(receiptModalPayment.originalDueDate),
                                "dd/MM/yyyy",
                              )}{" "}
                              coincidia com fim de semana ou feriado e foi
                              alterado para o próximo dia útil)
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <p className="font-bold border-b pb-2 uppercase text-slate-500 text-xs tracking-widest">
                          DETALHAMENTO DO PAGAMENTO
                        </p>
                        <ul className="space-y-2">
                          <li className="flex gap-2 justify-between items-center">
                            <span>Valor do Aluguel:</span>
                            <span className="flex items-center gap-1 font-medium">
                              R${" "}
                              <input
                                type="text"
                                defaultValue={receiptModalPayment.amount.toLocaleString()}
                                className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0"
                              />
                            </span>
                          </li>
                          <li className="flex gap-2 justify-between items-center">
                            <span>Multa (se houver):</span>
                            <span className="flex items-center gap-1 font-medium">
                              R${" "}
                              <input
                                type="text"
                                defaultValue="0,00"
                                className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0"
                              />
                            </span>
                          </li>
                          <li className="flex gap-2 justify-between items-center">
                            <span>Juros (se houver):</span>
                            <span className="flex items-center gap-1 font-medium">
                              R${" "}
                              <input
                                type="text"
                                defaultValue="0,00"
                                className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0"
                              />
                            </span>
                          </li>
                          <li className="flex gap-2 justify-between items-center border-b pb-2">
                            <span>Outros (ex: IPTU):</span>
                            <span className="flex items-center gap-1 font-medium">
                              R${" "}
                              <input
                                type="text"
                                defaultValue="0,00"
                                className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0"
                              />
                            </span>
                          </li>
                          <li className="flex gap-2 justify-between items-center font-bold text-base pt-1">
                            <span>Valor Total Pago:</span>
                            <span className="flex items-center gap-1">
                              R${" "}
                              <input
                                type="text"
                                defaultValue={(
                                  receiptModalPayment.paidAmount ||
                                  receiptModalPayment.amount
                                ).toLocaleString()}
                                className="w-24 text-right bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 print:border-b-0 print:p-0"
                              />
                            </span>
                          </li>
                        </ul>
                      </div>

                      {(receiptModalPayment.status === "partial" ||
                        (receiptModalPayment.paidAmount &&
                          receiptModalPayment.paidAmount <
                            receiptModalPayment.amount)) && (
                        <div className="space-y-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100 print:bg-transparent print:border-none print:p-0 mb-4 mt-4">
                          <p className="font-bold border-b border-orange-200 print:border-slate-300 pb-2 uppercase text-orange-800 print:text-slate-500 text-xs tracking-widest">
                            PAGAMENTO PARCIAL / RESTANTE (PREENCHA SE APLICÁVEL)
                          </p>
                          <ul className="space-y-3">
                            <li className="flex gap-2 justify-between items-center text-orange-900 print:text-slate-900 font-medium pt-1">
                              <span>Faltante a receber:</span>
                              <span className="flex items-center gap-1">
                                R${" "}
                                <input
                                  type="text"
                                  defaultValue={(receiptModalPayment.status ===
                                    "partial" ||
                                  (receiptModalPayment.paidAmount &&
                                    receiptModalPayment.paidAmount <
                                      receiptModalPayment.amount)
                                    ? receiptModalPayment.amount -
                                      (receiptModalPayment.paidAmount || 0)
                                    : 0
                                  ).toLocaleString()}
                                  className="w-24 text-right bg-transparent border-b border-orange-300 print:border-slate-300 outline-none focus:border-orange-500 print:border-b-0 print:p-0"
                                />
                              </span>
                            </li>
                            <li className="flex flex-col gap-1">
                              <span className="text-orange-900 print:text-slate-900 font-medium">
                                Motivo declarado (Inquilino):
                              </span>
                              <input
                                type="text"
                                placeholder="Ex: Atraso no salário, problemas médicos, etc."
                                className="w-full bg-transparent border-b border-orange-300 print:border-slate-300 outline-none focus:border-orange-500 print:border-b-0 print:p-0 placeholder:text-orange-300/70 py-1"
                              />
                            </li>
                            <li className="flex gap-2 justify-between items-center pt-2">
                              <span className="text-orange-900 print:text-slate-900 font-medium">
                                Cobrança da próxima / Prazo:
                              </span>
                              <input
                                type="text"
                                placeholder="DD/MM/AAAA"
                                className="w-32 text-right bg-transparent border-b border-orange-300 print:border-slate-300 outline-none focus:border-orange-500 print:border-b-0 print:p-0 py-1"
                              />
                            </li>
                          </ul>
                        </div>
                      )}

                      <div className="space-y-4">
                        <p className="font-bold border-b pb-2 uppercase text-slate-500 text-xs tracking-widest">
                          FORMA DE PAGAMENTO
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <label className="flex items-center gap-2 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="payment_method"
                              className="w-4 h-4 text-emerald-600 accent-emerald-600"
                            />{" "}
                            Dinheiro
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="payment_method"
                              className="w-4 h-4 text-emerald-600 accent-emerald-600"
                            />{" "}
                            Transferência
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="payment_method"
                              className="w-4 h-4 text-emerald-600 accent-emerald-600"
                              defaultChecked
                            />{" "}
                            PIX
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="payment_method"
                              className="w-4 h-4 text-emerald-600 accent-emerald-600"
                            />{" "}
                            Depósito
                          </label>

                          <div className="col-span-2 sm:col-span-4 mt-2 flex items-start flex-col gap-2">
                            <div className="flex w-full items-center gap-2">
                              <strong className="shrink-0">
                                Comprovante (opcional):
                              </strong>
                              <input
                                type="text"
                                defaultValue={
                                  receiptModalPayment.evidenceName ||
                                  receiptModalPayment.evidenceLocation ||
                                  ""
                                }
                                className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0"
                              />
                            </div>
                            {receiptModalPayment.thumbnailLink ? (
                              <img
                                src={receiptModalPayment.thumbnailLink}
                                alt="Miniatura do comprovante"
                                className="w-32 h-32 object-cover rounded-lg border border-slate-200 mt-2 print:block border-slate-300 print:w-48 print:h-48"
                              />
                            ) : receiptModalPayment.receiptUrl?.match(
                                /\.(jpeg|jpg|gif|png|webp)$/i,
                              ) ? (
                              <img
                                src={receiptModalPayment.receiptUrl}
                                alt="Comprovante"
                                className="w-32 h-32 object-cover rounded-lg border border-slate-200 mt-2 print:block border-slate-300 print:w-48 print:h-48"
                              />
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <p className="leading-relaxed">
                          Declaro que o valor acima foi recebido integralmente,
                          dando plena quitação referente ao período mencionado.
                        </p>
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
                          <input
                            type="text"
                            className="flex-1 min-w-0 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <strong className="shrink-0">Data:</strong>
                          <input
                            type="text"
                            defaultValue={paymentDate}
                            className="w-28 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none px-1 print:border-b-0 print:p-0"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-3 print:hidden">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReceiptModalPayment(null);
                      setReceiptType("simple");
                    }}
                  >
                    Fechar
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-300 text-slate-700"
                    onClick={() => window.print()}
                  >
                    {" "}
                    <Receipt className="w-4 h-4 mr-2" /> Imprimir
                  </Button>
                  <Button
                    className="bg-slate-900 text-white"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <div className="w-4 h-4 mr-2 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {isGeneratingPDF ? "Gerando..." : "Baixar PDF"}
                  </Button>
                </div>
              </div>
            );
          })()}
      </Modal>
    </div>
  );
};

interface AlertsViewProps {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  agreements: Agreement[];
  tickets: Ticket[];
  contracts: Contract[];
  isAlertSnoozed: (id: string) => boolean;
  handleSnoozeAlert: (id: string) => void;
  handleNavigate: (tab: any, highlightId?: string) => void;
  openJustifyRenovation: (p: Property) => void;
  alertSettings: AlertSettings;
  setAlertSettings: React.Dispatch<React.SetStateAction<AlertSettings>>;
  customAlerts?: CustomAlert[];
  onCreateCustomAlert?: (alertData: Omit<CustomAlert, "ownerId" | "createdAt">) => Promise<void>;
  onDeleteCustomAlert?: (alertId: string) => Promise<void>;
  storages?: StorageSpace[];
}

const AlertsView = ({
  properties,
  tenants,
  payments,
  agreements,
  tickets,
  contracts,
  isAlertSnoozed,
  handleSnoozeAlert,
  handleNavigate,
  openJustifyRenovation,
  alertSettings,
  setAlertSettings,
  customAlerts = [],
  onCreateCustomAlert,
  onDeleteCustomAlert,
  storages = [],
}: AlertsViewProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const alerts = useMemo(() => {
    const list: {
      id: string;
      priority: "high" | "medium" | "low";
      type: "critical" | "warning" | "info";
      category: string;
      title: string;
      description: React.ReactNode;
      icon: any;
      action?: {
        label: string;
        tab?: string;
        highlightId?: string;
        onClick?: () => void;
      };
      isCustom?: boolean;
      rawId?: string;
    }[] = [];
    const today = new Date();

    // 0.5 Contracts Expiration Alerts
    if (alertSettings.notifyContractsExpiring) {
      contracts.forEach((contract) => {
        if (contract.status === "active" && contract.endDate) {
          const endDate = parseISO(contract.endDate);
          const diffDays = differenceInDays(endDate, startOfDay(today));
          const tenant = tenants.find((t) => t.id === contract.tenantId);
          const property = properties.find((p) => p.id === contract.propertyId);

          if (
            diffDays >= 0 &&
            diffDays <= alertSettings.contractsExpiringDays
          ) {
            list.push({
              id: `contract-exp-${contract.id}`,
              priority: diffDays <= 5 ? "high" : "medium",
              type: diffDays <= 5 ? "critical" : "warning",
              category: "Vencimento de Contrato",
              title: tenant?.name || "Contrato",
              description: (
                <span>
                  {diffDays === 0
                    ? "Atenção: O contrato de aluguel do imóvel "
                    : `Faltam ${diffDays} dias para o vencimento do contrato de locação do imóvel `}
                  <strong className="font-bold">{property?.name || ""}</strong>.
                  (Vence em {format(endDate, "dd/MM/yyyy")}).
                </span>
              ),
              icon: FileWarning,
              action: {
                label: "Ver Contratos",
                tab: "contracts",
                highlightId: contract.id,
              },
            });
          } else if (diffDays < 0) {
            list.push({
              id: `contract-expired-${contract.id}`,
              priority: "high",
              type: "critical",
              category: "Contrato Vencido",
              title: tenant?.name || "Contrato",
              description: (
                <span>
                  O contrato de aluguel do imóvel{" "}
                  <strong className="font-bold">{property?.name || ""}</strong>{" "}
                  está expirado desde {format(endDate, "dd/MM/yyyy")} (
                  <strong className="text-rose-600">
                    {Math.abs(diffDays)} dias vencido
                  </strong>
                  ).
                </span>
              ),
              icon: AlertTriangle,
              action: {
                label: "Ver Contratos",
                tab: "contracts",
                highlightId: contract.id,
              },
            });
          }
        }
      });

      // Storage Billing/Rent Alerts
      storages.forEach((storage) => {
        if (storage.billings && storage.billings.length > 0) {
          storage.billings.forEach((billing) => {
            if (billing.status !== "paid") {
              const dueDate = parseISO(billing.dueDate);
              const diffDays = differenceInDays(dueDate, startOfDay(today));

              const getSpaceTypeLabel = (type?: string) => {
                switch(type) {
                  case 'garage': return 'da garagem';
                  case 'storage_room': return 'do depósito';
                  case 'warehouse': return 'do galpão';
                  default: return 'do espaço';
                }
              };
              const spaceTypeLabel = getSpaceTypeLabel(storage.spaceType);

              if (diffDays < 0) {
                // Late payment alert
                list.push({
                  id: `storage-billing-late-${storage.id}-${billing.id}`,
                  priority: "high",
                  type: "critical",
                  category: "Cobrança de Espaço Atrasada",
                  title: `Aluguel Atrasado: ${storage.name}`,
                  description: (
                    <span>
                      O pagamento do aluguel {spaceTypeLabel} <strong className="font-bold">{storage.name}</strong> no valor de <strong className="font-semibold text-rose-600">R$ {billing.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> está em atraso desde {format(dueDate, "dd/MM/yyyy")} (
                      <strong className="text-rose-600 font-bold">{Math.abs(diffDays)} dias de atraso</strong>
                      ). Locador: {storage.landlordName || "não informado"}.
                    </span>
                  ),
                  icon: AlertTriangle,
                  action: {
                    label: "Ir para Espaços",
                    tab: "storages",
                    highlightId: storage.id,
                  },
                });
              } else if (diffDays <= 5) {
                // Upcoming payment alert
                list.push({
                  id: `storage-billing-near-${storage.id}-${billing.id}`,
                  priority: diffDays <= 1 ? "high" : "medium",
                  type: diffDays <= 1 ? "critical" : "warning",
                  category: "Cobrança de Espaço a Vencer",
                  title: `Próximo Vencimento: ${storage.name}`,
                  description: (
                    <span>
                      {diffDays === 0
                        ? `Atenção: O pagamento do aluguel ${spaceTypeLabel} "${storage.name}" vence hoje no valor de `
                        : `Faltam ${diffDays} dias para o vencimento do aluguel ${spaceTypeLabel} "${storage.name}" no valor de `}
                      <strong className="font-semibold text-indigo-600">R$ {billing.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                      . (Vence em {format(dueDate, "dd/MM/yyyy")}).
                    </span>
                  ),
                  icon: DollarSign,
                  action: {
                    label: "Ir para Espaços",
                    tab: "storages",
                    highlightId: storage.id,
                  },
                });
              }
            }
          });
        }
      });

      // Storage Contract Alerts
      storages.forEach((storage) => {
        if (storage.contractEndDate) {
          const endDate = parseISO(storage.contractEndDate);
          const diffDays = differenceInDays(endDate, startOfDay(today));

          if (diffDays >= 0 && diffDays <= alertSettings.contractsExpiringDays) {
            list.push({
              id: `storage-contract-exp-${storage.id}`,
              priority: diffDays <= 5 ? "high" : "medium",
              type: diffDays <= 5 ? "critical" : "warning",
              category: "Vencimento de Contrato",
              title: `Depósito: ${storage.name}`,
              description: (
                <span>
                  {diffDays === 0
                    ? `Atenção: O contrato de locação do depósito/garagem "${storage.name}" vence hoje!`
                    : `Faltam ${diffDays} dias para o vencimento do contrato do depósito "${storage.name}"`}
                  . (Vence em {format(endDate, "dd/MM/yyyy")}).
                </span>
              ),
              icon: FileWarning,
              action: {
                label: "Ver Depósito",
                tab: "storages",
                highlightId: storage.id,
              },
            });
          } else if (diffDays < 0) {
            list.push({
              id: `storage-contract-expired-${storage.id}`,
              priority: "high",
              type: "critical",
              category: "Contrato Vencido",
              title: `Depósito: ${storage.name}`,
              description: (
                <span>
                  O contrato de locação do depósito/garagem <strong className="font-bold">{storage.name}</strong> está expirado desde {format(endDate, "dd/MM/yyyy")} (
                  <strong className="text-rose-600">
                    {Math.abs(diffDays)} dias vencido
                  </strong>
                  ).
                </span>
              ),
              icon: AlertTriangle,
              action: {
                label: "Ver Depósito",
                tab: "storages",
                highlightId: storage.id,
              },
            });
          }

          // Pending Security Deposit Refund Alert for closed contracts
          if (diffDays < 0 && storage.hasDeposit && storage.depositRefundStatus === "pending") {
            list.push({
              id: `storage-deposit-pending-${storage.id}`,
              priority: "medium",
              type: "warning",
              category: "Reembolso Pendente",
              title: `Caução: ${storage.name}`,
              description: (
                <span>
                  O contrato do depósito/garagem <strong className="font-bold">{storage.name}</strong> já encerrou, mas o reembolso da garantia de <strong className="text-indigo-600 font-semibold">R$ {storage.depositValue?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> continua registrado como pendente com o locador ({storage.landlordName || "não informado"}).
                </span>
              ),
              icon: AlertTriangle,
              action: {
                label: "Ver Depósito",
                tab: "storages",
                highlightId: storage.id,
              },
            });
          }
        }
      });
    }

    // 1. Documents (High/Medium)
    if (alertSettings.notifyExpiredDocuments) {
      properties.forEach((prop) => {
        if (prop.documents) {
          prop.documents.forEach((doc) => {
            if (doc.status === "expired") {
              list.push({
                id: `doc-exp-${prop.id}-${doc.id}`,
                priority: "high",
                type: "critical",
                category: "Documento Expirado",
                title: prop.name,
                description: (
                  <span>
                    O documento{" "}
                    <strong className="font-bold">{doc.name}</strong> está
                    expirado.{" "}
                    {doc.isRequired && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-[9px] font-black tracking-widest uppercase">
                        Obrigatório
                      </span>
                    )}
                  </span>
                ),
                icon: FileWarning,
                action: {
                  label: "Atualizar Imóvel",
                  tab: "properties",
                  highlightId: `property-${prop.id}`,
                },
              });
            } else if (doc.status === "missing") {
              list.push({
                id: `doc-mis-${prop.id}-${doc.id}`,
                priority: doc.isRequired ? "high" : "medium",
                type: "warning",
                category: "Documento Pendente",
                title: prop.name,
                description: (
                  <span>
                    Falta anexar o documento{" "}
                    <strong className="font-bold">{doc.name}</strong>.{" "}
                    {doc.isRequired && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[9px] font-black tracking-widest uppercase">
                        Obrigatório
                      </span>
                    )}
                  </span>
                ),
                icon: FileQuestion,
                action: {
                  label: "Editar Documentos",
                  tab: "properties",
                  highlightId: `property-${prop.id}`,
                },
              });
            }
          });
        }

        // Properties under renovation > 1 week without updates
        if (prop.status === "renovation" && prop.updatedAt) {
          const updateDate = parseISO(prop.updatedAt);
          const diffDays = differenceInDays(today, updateDate);
          if (diffDays > 7) {
            list.push({
              id: `prop-maint-${prop.id}`,
              priority: "medium",
              type: "warning",
              category: "Reforma Prolongada",
              title: prop.name,
              description: `O imóvel está em reforma há ${diffDays} dias sem nenhuma atualização registrada no sistema.`,
              icon: Home,
              action: {
                label: "Justificar Demora",
                onClick: () => openJustifyRenovation(prop),
              },
            });
          }
        }
      });
    }

    // 2. Tenants & Properties (Low/Info)
    if (alertSettings.notifyUnallocatedTenants !== false) {
      tenants.forEach((tenant) => {
        if (tenant.status === "waiting") {
          list.push({
            id: `tenant-prospect-${tenant.id}`,
            priority: "low",
            type: "info",
            category: "Inquilino Sem Alocação",
            title: tenant.name,
            description:
              "Este inquilino está cadastrado mas ainda não foi alocado em nenhum imóvel.",
            icon: Users,
            action: {
              label: "Alocar Inquilino",
              tab: "tenants",
              highlightId: `tenant-${tenant.id}`,
            },
          });
        }
      });
    }

    if (alertSettings.notifyVacantProperties !== false) {
      properties.forEach((prop) => {
        if (prop.status === "vacant") {
          const createdAt = prop.createdAt ? parseISO(prop.createdAt) : today;
          const diffDays = differenceInDays(today, createdAt);
          if (diffDays >= (alertSettings.vacantPropertiesDays || 15)) {
            list.push({
              id: `prop-vacant-${prop.id}`,
              priority: diffDays >= 30 ? "medium" : "low",
              type: diffDays >= 30 ? "warning" : "info",
              category: "Imóvel Ocioso",
              title: prop.name,
              description: `Este imóvel está desocupado há ${diffDays} dias sem gerar renda.`,
              icon: Home,
              action: {
                label: "Ver Imóvel",
                tab: "properties",
                highlightId: `property-${prop.id}`,
              },
            });
          }
        }
      });
    }

    if (alertSettings.notifyPendingInspections !== false) {
      properties.forEach((prop) => {
        if (prop.inspections) {
          prop.inspections.forEach((insp) => {
            if (insp.status === "draft") {
              list.push({
                id: `insp-draft-${prop.id}-${insp.id}`,
                priority: "medium",
                type: "warning",
                category: "Vistoria Pendente",
                title: prop.name,
                description: `Você possui uma vistoria (${insp.type === "move_in" ? "Entrada" : insp.type === "move_out" ? "Saída" : "Rotina"}) em rascunho que precisa ser concluída.`,
                icon: FileQuestion,
                action: {
                  label: "Continuar Vistoria",
                  tab: "properties",
                  highlightId: `property-${prop.id}`,
                },
              });
            }
          });
        }
      });
    }

    // 3. Late Payments (High/Critical)
    const todayStr = format(today, "yyyy-MM-dd");
    if (alertSettings.notifyLatePayments) {
      const latePayments = payments.filter(
        (p) =>
          p.status === "late" ||
          (p.status === "pending" && p.dueDate < todayStr),
      );
      latePayments.forEach((p) => {
        const tenant = tenants.find((t) => t.id === p.tenantId);
        const property = properties.find((pr) => pr.id === p.propertyId);
        const isExpense = p.tenantId === "proprietario";

        let categoryName = isExpense ? "Pagamento de Despesa Atrasado" : "Pagamento em Atraso";
        if (!isExpense) {
          if (p.type === "rent") categoryName = "Aluguel Atrasado";
          if (p.type === "agreement") categoryName = "Acordo Vencido";
          if (p.type === "deposit") categoryName = "Caução Atrasada";
        }

        list.push({
          id: `pay-late-${p.id}`,
          priority: "high",
          type: "critical",
          category: categoryName,
          title: isExpense ? "Despesa (Proprietário)" : tenant?.name || "Inquilino",
          description: (
            <span>
              Atraso do valor{" "}
              <strong className="font-bold text-rose-600">
                R${" "}
                {p.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </strong>{" "}
              referente a{" "}
              {isExpense
                ? "Depósito/Garagem"
                : p.type === "rent"
                ? "Aluguel"
                : p.type === "agreement"
                  ? "Acordo"
                  : "Caução"}{" "}
              do imóvel {property?.name || p.propertyNameSnapshot || ""}.
            </span>
          ),
          icon: AlertTriangle,
          action: {
            label: isExpense ? "Ver Pagamento" : "Ver Cobrança",
            tab: isExpense ? "financial" : "receivables",
            highlightId: p.id,
          },
        });
      });
    }

    // 4. Upcoming Agreement, Rent and Deposit Payments (Info)
    if (alertSettings.notifyUpcomingRents) {
      const nextPayments = payments.filter(
        (p) =>
          (p.type === "agreement" || p.type === "rent" || p.type === "deposit") &&
          p.status === "pending" &&
          p.dueDate >= todayStr,
      );
      nextPayments.forEach((p) => {
        const dueDate = parseISO(p.dueDate);
        const diffDays = differenceInDays(dueDate, startOfDay(today));
        const isExpense = p.tenantId === "proprietario";
        
        if (diffDays >= 0 && diffDays <= alertSettings.upcomingRentsDays) {
          const tenant = tenants.find((t) => t.id === p.tenantId);
          list.push({
            id: `pay-next-${p.id}`,
            priority: diffDays <= 1 ? "medium" : "low",
            type: "info",
            category: isExpense ? "Lembrete de Pagamento (Despesa)" : (p.type === "rent" ? "Lembrete de Aluguel" : p.type === "agreement" ? "Lembrete de Acordo" : "Lembrete de Caução"),
            title: isExpense ? "Despesa (Proprietário)" : tenant?.name || "Inquilino",
            description: (
              <span>
                A cobrança de {isExpense ? "depósito/garagem" : p.type === "rent" ? "aluguel" : p.type === "agreement" ? "acordo" : "caução"} no
                valor de{" "}
                <strong className="font-bold">
                  R${" "}
                  {p.amount.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </strong>{" "}
                vencerá em{" "}
                {diffDays === 0
                  ? "hoje"
                  : diffDays === 1
                    ? "amanhã"
                    : `${diffDays} dias`}
                .
              </span>
            ),
            icon: FileText,
            action: {
              label: isExpense ? "Ver Pagamento" : "Ver Parcela",
              tab: isExpense ? "financial" : "receivables",
              highlightId: p.id,
            },
          });
        }
      });
    }

    // 5. Tickets (Chamados / Manutenção) with SLA
    if (alertSettings.notifyTickets) {
      tickets.forEach((ticket) => {
        if (ticket.status === "open" || ticket.status === "in_progress") {
          const created = parseISO(
            ticket.createdAt || new Date().toISOString(),
          );
          const slaDate = addDays(created, ticket.slaDays);
          const daysToSla = differenceInDays(slaDate, today);

          let type: "critical" | "warning" | "info" = "info";
          let priority: "high" | "medium" | "low" = "low";

          if (daysToSla < 0) {
            type = "critical";
            priority = "high";
          } else if (daysToSla <= (alertSettings.ticketsSLADaysWarning || 2)) {
            type = "warning";
            priority = "medium";
          }

          const tenant = tenants.find((t) => t.id === ticket.tenantId);
          const property = properties.find((p) => p.id === ticket.propertyId);

          list.push({
            id: `ticket-${ticket.id}`,
            priority,
            type,
            category: "Chamado de Manutenção",
            title: `${ticket.title} - ${property?.name || ""}`,
            description:
              daysToSla < 0
                ? `SLA estourado há ${Math.abs(daysToSla)} dia(s)! Iniciado por ${tenant?.name || "Inquilino"}.`
                : `Faltam ${daysToSla} dia(s) para o limite da solução. Iniciado por ${tenant?.name || "Inquilino"}.`,
            icon: AlertTriangle,
            action: { label: "Acessar Chamados", tab: "tenants" },
          });
        }
      });
    }

    // 6. Dica Semanal (Info)
    const currentWeekTime = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const tips = [
      "Cadastre todos os documentos obrigatórios dos seus imóveis no Hub Estratégico (Documentos & Auditoria) para evitar problemas.",
      "Use o Consultor Jurídico IA no Hub Estratégico para esclarecer dúvidas sobre a Lei do Inquilinato antes de assinar contratos.",
      "Vai registrar dezenas de imóveis? Use a 'Importação em Lote' no Hub Estratégico colando os dados direto do Excel e poupe tempo.",
      "Anexe comprovantes nos pagamentos. Se o Google Drive estiver conectado (Configurações), eles serão salvos automaticamente na nuvem.",
      "Ao remover um inquilino, o sistema oferece a opção do Acerto Final onde você pode utilizar o saldo da caução e abater valores pendentes.",
      "Recebeu um contrato antigo PDF ou imagem? Use o Leitor de Contratos via IA do Hub para extrair os dados de locação num piscar de olhos.",
      "No módulo de Contratos Inteligentes, você pode gerar Modelos Padrão e até gerar cópias prontas em PDF de relatórios na Dashboard.",
    ];
    const weeklyTip = tips[currentWeekTime % tips.length];
    list.push({
      id: `weekly-tip-${currentWeekTime}`,
      priority: "low",
      type: "info",
      category: "Dica do Gerente Imobiliário",
      title: "Dica da Semana",
      description: weeklyTip,
      icon: Sparkles,
    });

    // Custom alerts created by the user
    customAlerts.forEach((ca) => {
      const associatedProp = ca.propertyId ? properties.find((p) => p.id === ca.propertyId) : null;
      const associatedTenant = ca.tenantId ? tenants.find((t) => t.id === ca.tenantId) : null;

      let iconType = Bell;
      if (ca.category === "Cobrança") {
        iconType = AlertTriangle;
      } else if (ca.category === "Documento") {
        iconType = FileWarning;
      } else if (ca.category === "Chamado") {
        iconType = FileQuestion;
      } else if (ca.category === "Contrato") {
        iconType = FileSearch;
      }

      list.push({
        id: `custom-alert-${ca.id}`,
        priority: ca.priority || "high",
        type: ca.type || "warning",
        category: `Alerta Personalizado: ${ca.category || "Geral"}`,
        title: ca.title,
        description: (
          <div className="space-y-1">
            <p>{ca.description}</p>
            {(associatedProp || associatedTenant) && (
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500 font-mono mt-1 pt-0.5 border-t border-dashed border-slate-100">
                {associatedProp && (
                  <span>
                    Imóvel: <span className="font-semibold text-slate-700">{associatedProp.name}</span>
                  </span>
                )}
                {associatedProp && associatedTenant && <span>•</span>}
                {associatedTenant && (
                  <span>
                    Inquilino: <span className="font-semibold text-slate-700">{associatedTenant.name}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        ),
        icon: iconType,
        action: (associatedProp || associatedTenant) ? {
          label: associatedProp ? "Ir para Imóvel" : "Ir para Inquilino",
          tab: associatedProp ? "properties" : "tenants",
          highlightId: associatedProp ? `property-${associatedProp.id}` : `tenant-${associatedTenant.id}`,
        } : undefined,
        // Custom fields to know we can delete/discard them
        isCustom: true,
        rawId: ca.id,
      });
    });

    return list.sort((a, b) => {
      const priorities = { high: 0, medium: 1, low: 2 };
      return priorities[a.priority] - priorities[b.priority];
    });
  }, [
    properties,
    tenants,
    payments,
    agreements,
    tickets,
    contracts,
    alertSettings,
    customAlerts,
  ]);

  const [isCreateAlertModalOpen, setIsCreateAlertModalOpen] = useState(false);
  const [newAlertTitle, setNewAlertTitle] = useState("");
  const [newAlertDescription, setNewAlertDescription] = useState("");
  const [newAlertCategory, setNewAlertCategory] = useState("Outro");
  const [newAlertPriority, setNewAlertPriority] = useState<"high" | "medium" | "low">("high");
  const [newAlertPropertyId, setNewAlertPropertyId] = useState("");
  const [newAlertTenantId, setNewAlertTenantId] = useState("");

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertTitle || !newAlertDescription) {
      toast.error("Por favor preencha todos os campos obrigatórios.");
      return;
    }

    if (onCreateCustomAlert) {
      const type: "critical" | "warning" | "info" = 
        newAlertPriority === "high" ? "critical" : 
        newAlertPriority === "medium" ? "warning" : "info";

      await onCreateCustomAlert({
        title: newAlertTitle,
        description: newAlertDescription,
        category: newAlertCategory,
        priority: newAlertPriority,
        type,
        propertyId: newAlertPropertyId || undefined,
        tenantId: newAlertTenantId || undefined,
      });

      // Reset
      setNewAlertTitle("");
      setNewAlertDescription("");
      setNewAlertCategory("Outro");
      setNewAlertPriority("high");
      setNewAlertPropertyId("");
      setNewAlertTenantId("");
      setIsCreateAlertModalOpen(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-8">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Bell className="w-8 h-8 text-amber-500" /> Inteligência e Alertas
          </h1>
          <p className="text-slate-500 mt-2">
            Visão geral inteligente de pendências, alertas e próximos passos da
            sua gestão.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateAlertModalOpen(true)}
            className="p-2.5 rounded-xl transition-all border shrink-0 flex items-center justify-center gap-2 outline-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md active:scale-95 border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 font-bold"
            title="Criar Alerta Personalizado"
          >
            <Plus className="w-5 h-5 text-white" />
            <span className="text-sm font-bold tracking-tight hidden sm:block text-white">
              Criar Alerta
            </span>
          </button>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={cn(
              "p-2.5 rounded-xl transition-all border shrink-0 flex items-center justify-center gap-2 group outline-none",
              isSettingsOpen
                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 shadow-sm focus:ring-2 focus:ring-indigo-500/20",
            )}
            title="Configurações de Alertas"
          >
            <Settings
              className={cn(
                "w-5 h-5 transition-transform duration-300",
                isSettingsOpen ? "rotate-45" : "group-hover:rotate-45",
              )}
            />
            <span className="text-sm font-bold tracking-tight hidden sm:block">
              Ajustar Alertas
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-6 mb-8 border border-slate-200 shadow-sm flex flex-col items-start w-full bg-slate-50/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0 border border-amber-100">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Personalize seus Alertas
                  </h3>
                  <p className="text-sm text-slate-500">
                    Escolha sobre o que e com que antecedência deseja ser
                    notificado.
                  </p>
                </div>
              </div>

              <div className="space-y-4 w-full text-left">
                <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-200/60 flex-wrap sm:flex-nowrap">
                  <div>
                    <strong className="text-sm font-semibold text-slate-800">
                      Aluguéis e Acordos Próximos
                    </strong>
                    <p className="text-[11px] text-slate-500">
                      Ser alertado sobre aluguéis e parcelas de acordos que vão
                      vencer em breve.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden h-8 bg-white">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-16 h-full text-center text-sm font-medium focus:outline-none"
                        value={alertSettings.upcomingRentsDays}
                        onChange={(e) =>
                          setAlertSettings((prev) => ({
                            ...prev,
                            upcomingRentsDays: parseInt(e.target.value) || 0,
                          }))
                        }
                        disabled={!alertSettings.notifyUpcomingRents}
                        min={1}
                      />
                      <span className="text-[10px] text-slate-500 font-bold px-2 bg-slate-50 h-full flex items-center border-l border-slate-300 uppercase tracking-tight">
                        dias antes
                      </span>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        alertSettings.notifyUpcomingRents
                          ? "bg-emerald-500"
                          : "bg-slate-300",
                      )}
                      role="switch"
                      aria-checked={alertSettings.notifyUpcomingRents}
                      onClick={() =>
                        setAlertSettings((prev) => ({
                          ...prev,
                          notifyUpcomingRents: !prev.notifyUpcomingRents,
                        }))
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          alertSettings.notifyUpcomingRents
                            ? "translate-x-5"
                            : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-200/60 flex-wrap sm:flex-nowrap">
                  <div>
                    <strong className="text-sm font-semibold text-slate-800">
                      Contratos Vencendo
                    </strong>
                    <p className="text-[11px] text-slate-500">
                      Ser alertado com antecedência sobre contratos de locação
                      perto do vencimento.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden h-8 bg-white">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-16 h-full text-center text-sm font-medium focus:outline-none"
                        value={alertSettings.contractsExpiringDays}
                        onChange={(e) =>
                          setAlertSettings((prev) => ({
                            ...prev,
                            contractsExpiringDays:
                              parseInt(e.target.value) || 0,
                          }))
                        }
                        disabled={!alertSettings.notifyContractsExpiring}
                        min={1}
                      />
                      <span className="text-[10px] text-slate-500 font-bold px-2 bg-slate-50 h-full flex items-center border-l border-slate-300 uppercase tracking-tight">
                        dias antes
                      </span>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        alertSettings.notifyContractsExpiring
                          ? "bg-emerald-500"
                          : "bg-slate-300",
                      )}
                      role="switch"
                      aria-checked={alertSettings.notifyContractsExpiring}
                      onClick={() =>
                        setAlertSettings((prev) => ({
                          ...prev,
                          notifyContractsExpiring:
                            !prev.notifyContractsExpiring,
                        }))
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          alertSettings.notifyContractsExpiring
                            ? "translate-x-5"
                            : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-200/60 flex-wrap sm:flex-nowrap">
                  <div>
                    <strong className="text-sm font-semibold text-slate-800">
                      Pagamentos e Acordos em Atraso
                    </strong>
                    <p className="text-[11px] text-slate-500">
                      Alertas urgentes para aluguéis, parcelas de acordos e
                      cobranças já atrasadas/vencidas.
                    </p>
                  </div>
                  <div className="flex w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        alertSettings.notifyLatePayments
                          ? "bg-emerald-500"
                          : "bg-slate-300",
                      )}
                      role="switch"
                      aria-checked={alertSettings.notifyLatePayments}
                      onClick={() =>
                        setAlertSettings((prev) => ({
                          ...prev,
                          notifyLatePayments: !prev.notifyLatePayments,
                        }))
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          alertSettings.notifyLatePayments
                            ? "translate-x-5"
                            : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-200/60 flex-wrap sm:flex-nowrap">
                  <div>
                    <strong className="text-sm font-semibold text-slate-800">
                      Documentos Expirados / Faltantes
                    </strong>
                    <p className="text-[11px] text-slate-500">
                      Alertas críticos para documentos vencidos.
                    </p>
                  </div>
                  <div className="flex w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        alertSettings.notifyExpiredDocuments
                          ? "bg-emerald-500"
                          : "bg-slate-300",
                      )}
                      role="switch"
                      aria-checked={alertSettings.notifyExpiredDocuments}
                      onClick={() =>
                        setAlertSettings((prev) => ({
                          ...prev,
                          notifyExpiredDocuments: !prev.notifyExpiredDocuments,
                        }))
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          alertSettings.notifyExpiredDocuments
                            ? "translate-x-5"
                            : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-200/60 flex-wrap sm:flex-nowrap">
                  <div>
                    <strong className="text-sm font-semibold text-slate-800">
                      Imóveis Ociosos (Desocupados)
                    </strong>
                    <p className="text-[11px] text-slate-500">
                      Aviso sobre imóveis vazios há muitos dias sem
                      rentabilidade.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden h-8 bg-white">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-16 h-full text-center text-sm font-medium focus:outline-none"
                        value={alertSettings.vacantPropertiesDays || 15}
                        onChange={(e) =>
                          setAlertSettings((prev) => ({
                            ...prev,
                            vacantPropertiesDays: parseInt(e.target.value) || 0,
                          }))
                        }
                        disabled={
                          alertSettings.notifyVacantProperties === false
                        }
                        min={1}
                      />
                      <span className="text-[10px] text-slate-500 font-bold px-2 bg-slate-50 h-full flex items-center border-l border-slate-300 uppercase tracking-tight">
                        dias atrás
                      </span>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        alertSettings.notifyVacantProperties !== false
                          ? "bg-emerald-500"
                          : "bg-slate-300",
                      )}
                      role="switch"
                      aria-checked={
                        alertSettings.notifyVacantProperties !== false
                      }
                      onClick={() =>
                        setAlertSettings((prev) => ({
                          ...prev,
                          notifyVacantProperties:
                            prev.notifyVacantProperties === false
                              ? true
                              : false,
                        }))
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          alertSettings.notifyVacantProperties !== false
                            ? "translate-x-5"
                            : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-200/60 flex-wrap sm:flex-nowrap">
                  <div>
                    <strong className="text-sm font-semibold text-slate-800">
                      Vistorias Pendentes
                    </strong>
                    <p className="text-[11px] text-slate-500">
                      Lembretes sobre vistorias que ficaram em status de
                      rascunho.
                    </p>
                  </div>
                  <div className="flex w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        alertSettings.notifyPendingInspections !== false
                          ? "bg-emerald-500"
                          : "bg-slate-300",
                      )}
                      role="switch"
                      aria-checked={
                        alertSettings.notifyPendingInspections !== false
                      }
                      onClick={() =>
                        setAlertSettings((prev) => ({
                          ...prev,
                          notifyPendingInspections:
                            prev.notifyPendingInspections === false
                              ? true
                              : false,
                        }))
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          alertSettings.notifyPendingInspections !== false
                            ? "translate-x-5"
                            : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-200/60 flex-wrap sm:flex-nowrap">
                  <div>
                    <strong className="text-sm font-semibold text-slate-800">
                      Inquilinos sem Alocação
                    </strong>
                    <p className="text-[11px] text-slate-500">
                      Lembretes sobre inquilinos aguardando alocação em um
                      imóvel.
                    </p>
                  </div>
                  <div className="flex w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        alertSettings.notifyUnallocatedTenants !== false
                          ? "bg-emerald-500"
                          : "bg-slate-300",
                      )}
                      role="switch"
                      aria-checked={
                        alertSettings.notifyUnallocatedTenants !== false
                      }
                      onClick={() =>
                        setAlertSettings((prev) => ({
                          ...prev,
                          notifyUnallocatedTenants:
                            prev.notifyUnallocatedTenants === false
                              ? true
                              : false,
                        }))
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          alertSettings.notifyUnallocatedTenants !== false
                            ? "translate-x-5"
                            : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-3 border-b flex-wrap sm:flex-nowrap bg-indigo-50/50 -mx-4 px-4 rounded-xl border-indigo-100 mb-2 mt-2">
                  <div>
                    <strong className="text-sm font-semibold text-indigo-900">
                      Mostrar até ser resolvido (Desativar modo soneca)
                    </strong>
                    <p className="text-[11px] text-indigo-700">
                      Se ativado, os alertas não poderão ser ocultados
                      temporariamente. Eles permanecerão na tela até que a
                      pendência seja solucionada.
                    </p>
                  </div>
                  <div className="flex w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        alertSettings.forceShowUntilResolved
                          ? "bg-indigo-600"
                          : "bg-slate-300",
                      )}
                      role="switch"
                      aria-checked={alertSettings.forceShowUntilResolved}
                      onClick={() =>
                        setAlertSettings((prev) => ({
                          ...prev,
                          forceShowUntilResolved: !prev.forceShowUntilResolved,
                        }))
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          alertSettings.forceShowUntilResolved
                            ? "translate-x-5"
                            : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-3 flex-wrap sm:flex-nowrap">
                  <div>
                    <strong className="text-sm font-semibold text-slate-800">
                      Chamados e Manutenção Estourada
                    </strong>
                    <p className="text-[11px] text-slate-500">
                      Aviso sobre prazos (SLA) esgotados em manutenções.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden h-8 bg-white">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-16 h-full text-center text-sm font-medium focus:outline-none"
                        value={alertSettings.ticketsSLADaysWarning || 2}
                        onChange={(e) =>
                          setAlertSettings((prev) => ({
                            ...prev,
                            ticketsSLADaysWarning:
                              parseInt(e.target.value) || 0,
                          }))
                        }
                        disabled={!alertSettings.notifyTickets}
                        min={1}
                      />
                      <span className="text-[10px] text-slate-500 font-bold px-2 bg-slate-50 h-full flex items-center border-l border-slate-300 uppercase tracking-tight">
                        dias antes
                      </span>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        alertSettings.notifyTickets
                          ? "bg-emerald-500"
                          : "bg-slate-300",
                      )}
                      role="switch"
                      aria-checked={alertSettings.notifyTickets}
                      onClick={() =>
                        setAlertSettings((prev) => ({
                          ...prev,
                          notifyTickets: !prev.notifyTickets,
                        }))
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          alertSettings.notifyTickets
                            ? "translate-x-5"
                            : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {alerts.filter((a) => !isAlertSnoozed(a.id)).length === 0 ? (
        <Card className="p-12 border-dashed flex flex-col items-center text-center bg-slate-50/50">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Tudo Regularizado!
          </h3>
          <p className="text-slate-500 mt-2">
            Sua gestão está impecável, não há nenhum alerta ou pendência no
            momento.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {alerts
            .filter((a) => !isAlertSnoozed(a.id))
            .map((alert) => (
              <Card
                key={alert.id}
                className={cn(
                  "p-5 border-l-4 transition-all hover:bg-slate-50 group relative cursor-pointer",
                  alert.type === "critical"
                    ? "border-l-rose-500"
                    : alert.type === "warning"
                      ? "border-l-amber-500"
                      : "border-l-blue-500",
                )}
                onClick={() => {
                  if (alert.action) {
                    if (alert.action.onClick) {
                      alert.action.onClick();
                    } else if (alert.action.tab) {
                      handleNavigate(
                        alert.action.tab,
                        alert.action.highlightId,
                      );
                    }
                  }
                }}
              >
                {/* Action/Info Label */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <span
                    className={cn(
                      "text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
                      alert.action
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {alert.action ? "Ação" : "Info"}
                  </span>
                  {!alertSettings.forceShowUntilResolved && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSnoozeAlert(alert.id);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Marcar como Visualizado (Lembrarei em 2 dias se não resolvido)"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  {alert.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteCustomAlert && alert.rawId) {
                          onDeleteCustomAlert(alert.rawId);
                        }
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Excluir Alerta Criado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex sm:items-center flex-col sm:flex-row gap-4 mb-2">
                  <div
                    className={cn(
                      "p-3 rounded-2xl shrink-0 self-start sm:self-auto",
                      alert.type === "critical"
                        ? "bg-rose-100 text-rose-600"
                        : alert.type === "warning"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-blue-100 text-blue-600",
                    )}
                  >
                    <alert.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 pr-24">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md",
                          alert.type === "critical"
                            ? "bg-rose-50 text-rose-500"
                            : alert.type === "warning"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-blue-50 text-blue-500",
                        )}
                      >
                        {alert.category}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                          alert.action
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                            : "bg-slate-50 text-slate-500 border border-slate-100",
                        )}
                      >
                        {alert.action ? "Requer Ação" : "Informativo"}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                      {alert.title}
                    </h3>
                    <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                </div>
                {alert.action && (
                  <div className="flex justify-start sm:justify-end mt-4">
                    <Button
                      variant={alert.type === "critical" ? "danger" : "primary"}
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!alertSettings.forceShowUntilResolved) {
                          handleSnoozeAlert(alert.id);
                        }
                        if (alert.action!.onClick) {
                          alert.action!.onClick();
                        } else if (alert.action!.tab) {
                          handleNavigate(
                            alert.action!.tab,
                            alert.action!.highlightId,
                          );
                        }
                      }}
                    >
                      {alert.action.label}{" "}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </Card>
            ))}
        </div>
      )}

      <Modal
        isOpen={isCreateAlertModalOpen}
        onClose={() => setIsCreateAlertModalOpen(false)}
        title="Criar Alerta Personalizado"
      >
        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Título do Alerta <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Ligar para Imobiliária do Sul"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              value={newAlertTitle}
              onChange={(e) => setNewAlertTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Descrição do Alerta <span className="text-rose-500">*</span>
            </label>
            <textarea
              placeholder="Ex: Cobrar sobre a vistoria prometida na última terça."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              value={newAlertDescription}
              onChange={(e) => setNewAlertDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Categoria / Tipo
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white"
                value={newAlertCategory}
                onChange={(e) => setNewAlertCategory(e.target.value)}
              >
                <option value="Outro">Outro</option>
                <option value="Cobrança">Cobrança (Financeiro)</option>
                <option value="Contrato">Contrato (Jurídico)</option>
                <option value="Chamado">Chamado (Manutenção)</option>
                <option value="Documento">Documento</option>
              </select>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Prioridade
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white"
                value={newAlertPriority}
                onChange={(e) => setNewAlertPriority(e.target.value as any)}
              >
                <option value="high">Alta (Urgente)</option>
                <option value="medium">Média (Atenção)</option>
                <option value="low">Baixa (Informativo)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Imóvel Associado (Opcional)
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white"
                value={newAlertPropertyId}
                onChange={(e) => setNewAlertPropertyId(e.target.value)}
              >
                <option value="">Nenhum</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Inquilino Associado (Opcional)
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white"
                value={newAlertTenantId}
                onChange={(e) => setNewAlertTenantId(e.target.value)}
              >
                <option value="">Nenhum</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateAlertModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold transition-all active:scale-95"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              variant="primary"
            >
              Salvar Alerta
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

interface SettingsViewProps {
  user: User | null;
  setIsResetModalOpen: (open: boolean) => void;
  setIsBackupModalOpen: (open: boolean) => void;
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
  setPreviewReceipt: (
    preview: { url: string; name: string; isImage: boolean } | null,
  ) => void;
  isInstallable: boolean;
  handleInstallClick: () => void;
}

const SettingsView = ({
  user,
  setIsResetModalOpen,
  setIsBackupModalOpen,
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
  setPreviewReceipt,
  isInstallable,
  handleInstallClick,
}: SettingsViewProps) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState(securityPassword);
  const [botLogs, setBotLogs] = useState<string[]>([]);
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
    useState(false);
  const [deleteAccountInput, setDeleteAccountInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountStep, setDeleteAccountStep] = useState<"confirm" | "pin">(
    "confirm",
  );
  const [generatedPin, setGeneratedPin] = useState<string>("");
  const [enteredPin, setEnteredPin] = useState("");

  const handleSendPin = () => {
    if (deleteAccountInput !== "EXCLUIR" || !user) return;
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedPin(pin);
    setDeleteAccountStep("pin");
    // Em uma aplicação real, aqui você chamaria uma API para enviar o email usando SendGrid, AWS SES, etc.
    toast.success(`PIN enviado para ${user.email}`, { duration: 5000 });
    // Por não termos um servidor SMTP configurado, vamos exibir o PIN apenas para demonstração:
    console.log(`SIMULAÇÃO DE EMAIL - O código PIN para exclusão é: ${pin}`);
    setTimeout(() => {
      toast("SIMULAÇÃO DE EMAIL: Seu PIN de exclusão é: " + pin, {
        icon: "📧",
        duration: 10000,
        style: {
          border: "1px solid #eab308",
          backgroundColor: "#fefce8",
          color: "#854d0e",
        },
      });
    }, 1500);
  };

  const handleDeleteAccount = async () => {
    if (enteredPin !== generatedPin || !user) {
      toast.error("O código PIN está incorreto.");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const collectionsToClear = [
        "properties",
        "tenants",
        "payments",
        "expenses",
        "agreements",
        "contracts",
        "tickets",
        "staging_records",
      ];

      for (const collName of collectionsToClear) {
        const q = query(
          collection(db, collName),
          where("ownerId", "==", user.uid),
        );
        const snap = await getDocs(q);
        const batches = [];
        let b = writeBatch(db);
        let count = 0;
        snap.forEach((docSnap) => {
          b.delete(docSnap.ref);
          count++;
          if (count === 500) {
            batches.push(b.commit());
            b = writeBatch(db);
            count = 0;
          }
        });
        if (count > 0) batches.push(b.commit());
        await Promise.all(batches);
      }

      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.delete();
      }
      toast.success("Conta e todos os dados foram excluídos permanentemente.");
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/requires-recent-login") {
        toast.error(
          "Por segurança, saia e faça login novamente antes de excluir a conta definitivamente.",
        );
        auth.signOut();
      } else {
        toast.error("Erro ao excluir conta. Verifique sua conexão.");
      }
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteAccountModalOpen(false);
    }
  };

  // Suprimir erro de WebSocket do Vite no console para não confundir o usuário
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("[vite] failed to connect to websocket")
      )
        return;
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  const startInstallBot = async () => {
    setIsBotRunning(true);
    setBotLogs([
      "🤖 Iniciando Diagnóstico Profundo...",
      "🔍 Verificando Kernels do Navegador...",
    ]);

    await new Promise((r) => setTimeout(r, 1000));

    const logs: string[] = [];

    // Check 1: Secure Context
    if (window.isSecureContext) {
      logs.push("✅ Conexão Segura (HTTPS) detectada.");
    } else {
      logs.push("❌ ERRO: Conexão não segura. PWA requer HTTPS.");
    }

    // Check 1.5: Manifest
    try {
      const resp = await fetch("/manifest.json");
      if (resp.ok) {
        logs.push("✅ Manifesto (manifest.json) localizado e ok.");
      } else {
        logs.push(`❌ ERRO: Manifesto inacessível (${resp.status}).`);
      }
    } catch (e) {
      logs.push("❌ ERRO: Falha ao validar manifesto via rede.");
    }

    // Check 1.6: Service Worker API
    if ("serviceWorker" in navigator) {
      logs.push("✅ Navegador suporta Service Workers.");
      const regs = await navigator.serviceWorker.getRegistrations();
      logs.push(`ℹ️ Protocolos SW ativos: ${regs.length}`);

      // Tentar re-registrar o SW se estiver zero
      if (regs.length === 0) {
        logs.push("⚙️ Tentando registrar Service Worker forçadamente...");
        try {
          await navigator.serviceWorker.register("/sw.js?v=6.6.0");
          logs.push("✅ SW registrado forçadamente!");
        } catch (e: any) {
          logs.push(`❌ Erro ao registrar SW: ${e.message}`);
        }
      }
    } else {
      logs.push("❌ ERRO: Navegador não suporta Service Workers.");
    }

    // Check 2: Iframe
    if (window !== window.parent) {
      logs.push("❌ BLOQUEIO: App rodando em Iframe (Editor).");
      logs.push(
        '💡 RESOLUÇÃO: Clique no ícone de "Abrir em nova aba" no topo direito do painel de desenvolvimento.',
      );
      setBotLogs((prev) => [...prev, ...logs]);
      setIsBotRunning(false);
      return;
    }

    // Check 3: Standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      logs.push("✨ SISTEMA: O App já está rodando como Nativo.");
      setBotLogs((prev) => [...prev, ...logs]);
      setIsBotRunning(false);
      return;
    }

    // Check 4: Install Signal
    if ((window as any).deferredPWA) {
      logs.push(
        "✅ SINAL VERDE: O navegador já enviou o convite de instalação.",
      );
    } else {
      logs.push(
        "⏳ AGUARDANDO: O navegador ainda não liberou o convite de instalação.",
      );
      logs.push(
        "💡 DICA: O navegador pode demorar alguns segundos após o SW estar ativo.",
      );
    }

    logs.push("🚀 Disparando gatilho de instalação nativa...");
    setBotLogs((prev) => [...prev, ...logs]);

    setTimeout(() => {
      try {
        if ((window as any).deferredPWA) {
          setBotLogs((prev) => [
            ...prev,
            "⚙️ Executando popup de instalação...",
          ]);
          handleInstallClick();
          setBotLogs((prev) => [...prev, "✅ Gatilho processado."]);
          setIsBotRunning(false);
        } else {
          setBotLogs((prev) => [
            ...prev,
            "⚠️ IMPEDIMENTO: O sinal da instalação não ocorreu.",
            "ℹ️ O Chrome exige que a página seja recarregada para liberar a instalação.",
            "🔄 Recarregando a página em 4 segundos...",
          ]);

          setTimeout(() => {
            window.location.href =
              window.location.origin +
              window.location.pathname +
              "?pwa_repair=v71&t=" +
              Date.now();
          }, 4000);
        }
      } catch (e: any) {
        setBotLogs((prev) => [...prev, `❌ Falha crítica: ${e.message}`]);
        setIsBotRunning(false);
      }
    }, 2000);
  };

  const copyLogsToClipboard = () => {
    const text = botLogs.join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Logs copiados!");
  };

  const openInNewTab = () => {
    const url = window.location.origin + window.location.pathname;
    window.open(url, "_blank");
  };

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.displayName || "");
  const [profilePhoto, setProfilePhoto] = useState(user?.photoURL || "");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileCompany, setProfileCompany] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      await updateProfile(user, {
        displayName: profileName,
        photoURL: profilePhoto,
      });
      toast.success("Perfil atualizado com sucesso!");
      setIsEditingProfile(false);
      setTimeout(() => window.location.reload(), 1500); // Reload to reflect changes
    } catch (error) {
      console.error("Update profile error", error);
      toast.error("Erro ao atualizar o perfil.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleActionClick = (
    type: "edit" | "archive" | "delete",
    agreement: Agreement,
  ) => {
    if (type === "edit") {
      setAgreementForm(agreement);
      setIsAgreementModalOpen(true);
    } else if (type === "archive" || type === "delete") {
      setArchivingAgreement(agreement);
      setIsArchiveAgreementModalOpen(true);
    }
  };

  const [isAgreementsOpen, setIsAgreementsOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Configurações
        </h1>
        <p className="text-slate-500">
          Gerencie sua conta, aplicativos e integrações do sistema.
        </p>
      </header>

      <div className="space-y-6">
        <Card className="overflow-hidden border-slate-200">
          <div className="p-6 bg-white flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* User Profile */}
            <div className="flex-1 flex items-center gap-4">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-16 h-16 rounded-full object-cover border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-2xl shadow-sm">
                  {user?.displayName?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900 text-lg leading-tight">
                  {user?.displayName || "Administrador"}
                </p>
                <p className="text-sm text-slate-500">{user?.email}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] font-bold"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    Editar Perfil
                  </Button>
                </div>
              </div>
            </div>

            <div className="w-full sm:w-auto h-px sm:h-auto sm:w-px bg-slate-100 self-stretch my-2 sm:my-0"></div>

            {/* Segurança */}
            <div className="flex-1 space-y-4 w-full sm:w-auto">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> Segurança da
                Conta
              </h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Senha de Confirmação
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Para ações sensíveis.
                    </p>
                  </div>
                  {isChangingPassword ? (
                    <div className="flex gap-2">
                      <Input
                        id="security-password-change"
                        type="password"
                        className="h-8 w-24 text-xs"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                      />
                      <Button
                        size="sm"
                        className="h-8 text-[10px]"
                        onClick={() => {
                          setSecurityPassword(newPasswordInput);
                          setIsChangingPassword(false);
                          toast.success("Senha atualizada!");
                        }}
                      >
                        Salvar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px]"
                      onClick={() => setIsChangingPassword(true)}
                    >
                      Alterar
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => auth.signOut()}
                  className="w-full font-bold h-9"
                >
                  Sair do Aplicativo
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border border-emerald-200 bg-emerald-50/50 flex flex-col items-start text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Download className="w-24 h-24 text-emerald-500" />
            </div>
            <h3 className="text-base font-black mb-2 flex items-center gap-2 text-emerald-900 z-10 uppercase tracking-tight">
              <Download className="w-5 h-5 text-emerald-600" /> Aplicativo
              Nativo (PWA)
            </h3>
            <p className="text-sm text-emerald-800/80 mb-6 flex-1 w-full text-left z-10 leading-relaxed font-medium">
              Transforme este sistema em um aplicativo real no seu celular ou
              computador. Rápido, seguro e sem ocupar espaço.
            </p>

            {isInstallable ? (
              <div className="w-full space-y-4 z-10">
                <Button
                  onClick={handleInstallClick}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 shadow-xl shadow-emerald-200 transition-all duration-300 rounded-2xl text-lg animate-pulse border-b-4 border-emerald-800"
                >
                  <Download className="w-6 h-6 mr-3" /> INSTALAR AGORA
                </Button>
                <div className="p-3 bg-emerald-100/50 rounded-xl border border-emerald-200 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                  <p className="text-[10px] text-emerald-800 font-black uppercase tracking-widest">
                    Sinal de Instalação Liberado
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 w-full z-10">
                <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-50 pb-3">
                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />{" "}
                      Compatibilidade
                    </h4>
                    {window.isSecureContext ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">
                        Seguro
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase">
                        Inseguro
                      </span>
                    )}
                  </div>

                  <ul className="text-[11px] text-slate-600 space-y-3 font-medium">
                    <li className="flex gap-3">
                      <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                        1
                      </div>
                      <span>
                        <strong>Abrir em Nova Guia:</strong> Se estiver no
                        editor, saia do Iframe para instalar.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                        2
                      </div>
                      <span>
                        <strong>Menu Lateral:</strong> Clique nos{" "}
                        <strong>3 pontos</strong> do Chrome e em{" "}
                        <strong>"Instalar aplicativo"</strong>.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                        3
                      </div>
                      <span>
                        <strong>iPhone (iOS):</strong> Use o botão{" "}
                        <strong>Compartilhar</strong> {">"}{" "}
                        <strong>Adicionar à Tela de Início</strong>.
                      </span>
                    </li>
                  </ul>

                  {!isInstallable &&
                    !window.matchMedia("(display-mode: standalone)")
                      .matches && (
                      <div className="pt-2">
                        <p className="text-[10px] text-slate-400 font-bold leading-tight italic">
                          Nota: Se as opções acima não aparecerem, seu navegador
                          pode não suportar IA-PWA nativo no momento.
                        </p>
                      </div>
                    )}
                </div>

                {!window.matchMedia("(display-mode: standalone)").matches && (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={openInNewTab}
                      className="w-full border-2 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 font-black h-12 transition-all duration-300 shadow-sm rounded-xl"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" /> ABRIR EM NOVA
                      ABA (ESSENCIAL)
                    </Button>

                    <Button
                      variant="outline"
                      disabled={isBotRunning}
                      onClick={startInstallBot}
                      className="w-full border-2 border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50 font-black h-12 transition-all duration-300 shadow-sm rounded-xl"
                    >
                      {isBotRunning ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          REVERSANDO KERNEL...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 fill-emerald-500" /> FORÇAR
                          REPARO DE INSTALAÇÃO
                        </div>
                      )}
                    </Button>

                    <p className="text-[9px] text-slate-400 text-center uppercase font-bold tracking-tighter">
                      O robô irá limpar caches travados e forçar o navegador a
                      liberar o download.
                    </p>
                  </div>
                )}

                {botLogs.length > 0 && (
                  <div className="w-full bg-slate-900 rounded-2xl p-4 max-h-48 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-2 shadow-2xl border border-slate-700 relative group">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase">
                          Console do Robô
                        </span>
                      </div>
                      <button
                        onClick={copyLogsToClipboard}
                        className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600 transition-colors"
                      >
                        COPIAR LOGS
                      </button>
                    </div>
                    {botLogs.map((log, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex gap-2",
                          log.includes("❌")
                            ? "text-red-400"
                            : log.includes("⚠️")
                              ? "text-amber-400"
                              : "text-emerald-400",
                        )}
                      >
                        <span className="opacity-40">{">"}</span>
                        <span className="select-text">{log}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6 border border-slate-200 flex flex-col items-start text-left">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-slate-900">
              <Cloud className="w-5 h-5 text-emerald-500" /> Sincronização
              Google Drive
            </h3>
            <p className="text-sm text-slate-500 mb-2 flex-1 w-full text-left">
              A sincronização com o Google Drive agora acontece automaticamente
              durante o login.
            </p>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  isDriveConnected
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"
                    : "bg-slate-300",
                )}
              />
              <p className="text-xs font-bold text-slate-700">
                {isDriveConnected
                  ? "Status: Conectado. Comprovantes e recibos são salvos automaticamente."
                  : "Status: Desconectado. Clique no botão abaixo para conectar seu Drive."}
              </p>
            </div>
            {!isDriveConnected && (
              <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg w-full text-left border border-amber-200">
                <strong>Desconectando com frequência?</strong> Se o seu acesso
                for revogado sozinho após 7 dias, é porque sua "Tela de
                Consentimento OAuth" no Google Cloud Console está no status
                "Testando". Altere para "Em Produção" e adicione seus usuários
                de teste para que a conexão não expire mais.
              </div>
            )}
            {driveError && (
              <p className="text-[10px] text-red-500 mt-2 font-medium bg-red-50 p-2 rounded-lg w-full text-left border border-red-100">
                {driveError}
              </p>
            )}
            {!isDriveConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={onConnectDrive}
                className="mt-4 gap-2 w-full sm:w-auto"
              >
                <Cloud className="w-4 h-4" /> Conectar Google Drive
              </Button>
            )}
            {isDriveConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnectDrive}
                className="mt-4 gap-2 w-full sm:w-auto text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300"
              >
                <CloudOff className="w-4 h-4" /> Desconectar Drive
              </Button>
            )}
          </Card>
        </div>

        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
          <button
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            onClick={() => setIsAgreementsOpen(!isAgreementsOpen)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Gerenciar Acordos</h3>
                <p className="text-xs text-slate-500">
                  {agreements.length} contrato(s) registrado(s)
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-slate-400 transition-transform",
                isAgreementsOpen && "rotate-180",
              )}
            />
          </button>
          <AnimatePresence>
            {isAgreementsOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50">
                  <div className="space-y-3 mt-4">
                    {agreements.length > 0 ? (
                      agreements.map((a) => {
                        const prop = properties.find(
                          (p) => p.id === a.propertyId,
                        );
                        const tenant = tenants.find((t) => t.id === a.tenantId);
                        const propertyName =
                          prop?.name ||
                          a.propertyNameSnapshot ||
                          "Imóvel Excluído";
                        const tenantName =
                          tenant?.name ||
                          a.tenantNameSnapshot ||
                          "Inquilino Excluído";
                        return (
                          <div
                            key={a.id}
                            className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">
                                {a.description}
                              </h4>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                                {propertyName} • {tenantName}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span
                                  className={cn(
                                    "inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight",
                                    a.status === "active"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-500",
                                  )}
                                >
                                  {a.status === "active"
                                    ? "Ativo"
                                    : "Arquivado"}
                                </span>
                                {a.thumbnailLink && (
                                  <img
                                    src={a.thumbnailLink}
                                    className="w-6 h-6 rounded object-cover border border-slate-200 cursor-pointer hover:scale-110 transition-transform"
                                    alt="Preview"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isImage =
                                        (
                                          a.evidence || a.evidenceLocation
                                        )?.match(/.(jpeg|jpg|gif|png)$/i) ||
                                        a.thumbnailLink;
                                      setPreviewReceipt({
                                        url: (a.evidence ||
                                          a.evidenceLocation)!,
                                        name: `Evidência - ${a.description}`,
                                        isImage: !!isImage,
                                      });
                                    }}
                                  />
                                )}
                                {a.evidence && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isImage =
                                        a.evidence?.match(
                                          /.(jpeg|jpg|gif|png)$/i,
                                        ) || a.thumbnailLink;
                                      setPreviewReceipt({
                                        url: a.evidence!,
                                        name: `Evidência - ${a.description}`,
                                        isImage: !!isImage,
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tight"
                                  >
                                    <ImageIcon className="w-3 h-3" /> Ver
                                    Evidência
                                  </button>
                                )}
                                {a.evidenceLocation && (
                                  <div className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                    <MapPin className="w-3 h-3" />
                                    {a.evidenceLocation.startsWith("http") ? (
                                      <a
                                        href={a.evidenceLocation}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="hover:underline"
                                      >
                                        Link Externo
                                      </a>
                                    ) : (
                                      <span>{a.evidenceLocation}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:w-10 sm:flex-none p-0 h-9"
                                onClick={() => handleActionClick("edit", a)}
                              >
                                <Edit className="w-4 h-4 mx-auto" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:w-10 sm:flex-none p-0 h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => handleActionClick("archive", a)}
                              >
                                <Archive className="w-4 h-4 mx-auto" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:w-10 sm:flex-none p-0 h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleActionClick("delete", a)}
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-6">
                        Nenhum acordo encontrado.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Card className="p-4 border border-indigo-200 bg-indigo-50 flex items-center justify-between sm:flex-row flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-4 w-full sm:w-auto text-left">
            <div className="p-2 bg-white text-indigo-600 rounded-lg border border-indigo-100 shrink-0">
              <DatabaseBackup className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-900">
                Manutenção do Sistema
              </h3>
              <p className="text-[10px] text-indigo-700/70 font-medium">
                Faça o backup seguro ou reinicie os dados (após backup).
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBackupModalOpen(true)}
              className="whitespace-nowrap w-full sm:w-auto font-bold shrink-0 shadow-sm h-9 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
            >
              <DatabaseBackup className="w-4 h-4 mr-1.5" /> Backup Inteligente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(true)}
              className="whitespace-nowrap w-full sm:w-auto font-bold shrink-0 shadow-sm h-9 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              <ShieldAlert className="w-4 h-4 mr-1.5 cursor-pointer" />{" "}
              Reinicialização
            </Button>
          </div>
        </Card>

        <LegalDocsView />

        <div className="pt-6 flex flex-col items-center justify-center text-center opacity-60">
          <div className="w-10 h-10 flex items-center justify-center mb-2">
            <LogoSVG className="w-8 h-8 opacity-75" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Gerente Imobiliário
          </p>
          <p className="text-[10px] font-medium text-slate-400 mt-1">
            Versão 6.6.0 <span className="mx-1.5 opacity-50">•</span> 27/07/2026
          </p>
        </div>
      </div>

      <Modal
        isOpen={isEditingProfile}
        onClose={() => setIsEditingProfile(false)}
        title="Editar Perfil"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome de Exibição</label>
              <Input
                id="profile-name"
                value={profileName || ""}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa/Imobiliária</label>
              <Input
                id="profile-company"
                value={profileCompany}
                onChange={(e) => setProfileCompany(e.target.value)}
                placeholder="Nome da sua empresa"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone de Contato</label>
              <Input
                id="profile-phone"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                URL da Foto de Perfil
              </label>
              <Input
                id="profile-photo"
                value={profilePhoto || ""}
                onChange={(e) => setProfilePhoto(e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Link público para atualizar sua foto.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6">
            <h4 className="text-sm font-bold text-slate-800 mb-2">
              Zona de Perigo
            </h4>
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100">
              <div>
                <p className="text-sm font-medium text-red-800">
                  Excluir Conta
                </p>
                <p className="text-[10px] text-red-600/80">
                  Apaga todos os dados e desvincula do aplicativo
                  permanentemente.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingProfile(false);
                  setIsDeleteAccountModalOpen(true);
                }}
                className="h-8 text-[11px] text-red-600 border-red-200 hover:bg-red-50"
              >
                Excluir
              </Button>
            </div>
          </div>

          <div className="pt-4 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsEditingProfile(false)}
              disabled={isUpdatingProfile}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
              {isUpdatingProfile ? (
                <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteAccountModalOpen && !isDeletingAccount}
        onClose={() => {
          if (!isDeletingAccount) {
            setIsDeleteAccountModalOpen(false);
            setDeleteAccountStep("confirm");
            setDeleteAccountInput("");
            setEnteredPin("");
          }
        }}
        title="Excluir Conta Permanentemente"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <h4 className="text-red-900 font-bold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Atenção: Ação Irreversível
            </h4>
            <p className="text-xs text-red-800 leading-relaxed">
              Você está prestes a excluir sua conta. Esta ação{" "}
              <strong>apagará permanentemente</strong> todos os seus imóveis,
              inquilinos, recibos, contratos e dados financeiros. Conformidade à
              Lei Geral de Proteção de Dados (LGPD): Nenhum dado ficará exposto
              ou retido em nossos servidores após esta exclusão.
            </p>
          </div>

          {deleteAccountStep === "confirm" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Para validar o seu desejo de que seus dados parem de ser
                  monitorados, digite <strong>EXCLUIR</strong> no campo abaixo:
                </label>
                <Input
                  id="confirm-delete"
                  value={deleteAccountInput}
                  onChange={(e) => setDeleteAccountInput(e.target.value)}
                  placeholder="EXCLUIR"
                  className="border-red-200 focus-visible:ring-red-500"
                />
              </div>
              <div className="pt-4 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteAccountModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  onClick={handleSendPin}
                  disabled={deleteAccountInput !== "EXCLUIR"}
                >
                  Continuar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium text-slate-700">
                  Digite o PIN de 6 dígitos que foi enviado para o seu email (
                  {user?.email}):
                </label>
                <Input
                  id="pin-delete"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="000000"
                  className="border-red-200 focus-visible:ring-red-500 font-mono tracking-widest text-center text-lg h-12"
                  maxLength={6}
                />
              </div>
              <div className="pt-4 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteAccountStep("confirm")}
                  disabled={isDeletingAccount}
                >
                  Voltar
                </Button>
                <Button
                  variant="danger"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || enteredPin.length !== 6}
                >
                  Excluir Minha Conta Agora
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <AnimatePresence>
        {isDeletingAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative mb-16 sm:mb-20">
              <img
                src="/robot_working.png"
                alt="Processando Exclusão"
                className="w-48 h-48 sm:w-80 sm:h-80 object-contain animate-bounce drop-shadow-2xl"
              />
              <div className="absolute top-0 sm:-right-24 -right-12 bg-white sm:p-5 p-3 rounded-2xl sm:rounded-3xl rounded-bl-none shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-red-200 max-w-[200px] sm:max-w-[280px]">
                <p className="text-sm sm:text-lg font-bold text-red-900 leading-tight">
                  O sistema está realizando a função... Adeus, conta! 👋
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 sm:gap-4 bg-red-50 px-6 sm:px-8 py-3 sm:py-4 rounded-full border border-red-200 shadow-inner">
              <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-red-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
              <p className="text-base sm:text-lg font-black text-red-900">
                Apagando todos os seus dados...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  addTenant,
  isAlertSnoozed,
  handleSnoozeAlert,
  handleNavigate,
  isOnline,
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
  addProperty: (p: any) => Promise<any>;
  addTenant: (t: any) => Promise<any>;
  isAlertSnoozed: (id: string) => boolean;
  handleSnoozeAlert: (id: string) => void;
  handleNavigate: (tab: any, highlightId?: string) => void;
  isOnline: boolean;
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "integration">("chat");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "success" | "error"
  >("all");
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const getProActiveMsg = () => {
    const today = startOfDay(new Date());
    const fiveDaysFromNow = addDays(today, 5);
    const todayStr = format(today, "yyyy-MM-dd");
    const fiveDaysStr = format(fiveDaysFromNow, "yyyy-MM-dd");
    const lateP = payments.filter(
      (p) =>
        p.status === "late" || (p.status === "pending" && p.dueDate < todayStr),
    );
    const upcomingP = payments.filter(
      (p) =>
        p.status === "pending" &&
        p.dueDate >= todayStr &&
        p.dueDate <= fiveDaysStr,
    );

    let findings = [];
    if (lateP.length > 0)
      findings.push(
        `${lateP.length} ${lateP.length === 1 ? "pagamento atrasado" : "pagamentos atrasados"}`,
      );
    if (upcomingP.length > 0)
      findings.push(
        `${upcomingP.length} ${upcomingP.length === 1 ? "pagamento vencendo" : "pagamentos vencendo"} nos próximos 5 dias`,
      );

    let proActiveMsg =
      "Olá! Sou seu Assistente do Gerente Imobiliário. Como posso te ajudar hoje? Posso responder suas dúvidas sobre os imóveis, inquilinos e contratos.";
    if (findings.length > 0) {
      proActiveMsg = `Olá! Fiz uma análise rápida e notei que os próximos 5 dias têm pendências. Encontrei:\n\n• ${findings.join("\n• ")}\n\nO que gostaria de fazer? Posso te ajudar a analisar ou enviar notificações de cobrança.`;
    }
    return proActiveMsg;
  };

  const [sessions, setSessions] = useState<
    { id: string; title: string; updatedAt: number; messages: any[] }[]
  >(() => {
    try {
      const saved = localStorage.getItem("intelligence_hub_chat_sessions");
      if (saved) return JSON.parse(saved);
      const old = localStorage.getItem("intelligence_hub_chat_history");
      if (old) {
        const parsed = JSON.parse(old);
        if (parsed.length > 1) {
          return [
            {
              id: Date.now().toString(),
              title: "Conversa Anterior",
              updatedAt: Date.now(),
              messages: parsed,
            },
          ];
        }
      }
    } catch (e) {}
    return [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        "intelligence_hub_chat_sessions",
        JSON.stringify(sessions),
      );
    } catch {}
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === currentSessionId);
  const chatHistory = activeSession
    ? activeSession.messages
    : [{ role: "assistant", content: getProActiveMsg() }];

  const setChatHistory = (updater: any) => {
    let nextMsgs: any[];
    if (typeof updater === "function") {
      nextMsgs = updater(chatHistory);
    } else {
      nextMsgs = updater;
    }

    if (!currentSessionId) {
      if (nextMsgs.length <= 1) return;
      const newId = Date.now().toString();
      const firstUserMsg =
        nextMsgs.find((m: any) => m.role === "user")?.content ||
        "Nova Conversa";
      const title =
        firstUserMsg.substring(0, 30) + (firstUserMsg.length > 30 ? "..." : "");
      const newSession = {
        id: newId,
        title,
        updatedAt: Date.now(),
        messages: nextMsgs,
      };
      setSessions((prev) => [newSession, ...prev].slice(0, 20));
      setCurrentSessionId(newId);
    } else {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            const firstUserMsg =
              nextMsgs.find((m: any) => m.role === "user")?.content ||
              "Nova Conversa";
            const title =
              (s.title === "Nova Conversa" ||
                s.title === "Conversa Anterior") &&
              firstUserMsg !== "Nova Conversa"
                ? firstUserMsg.substring(0, 30) +
                  (firstUserMsg.length > 30 ? "..." : "")
                : s.title;
            return { ...s, title, updatedAt: Date.now(), messages: nextMsgs };
          }
          return s;
        }),
      );
    }
  };

  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredLogs = syncLogs.filter(
    (log) => activeFilter === "all" || log.status === activeFilter,
  );
  const errorCount = syncLogs.filter((l) => l.status === "error").length;
  const pendingCount = syncLogs.filter((l) => l.status === "pending").length;
  const successCount = syncLogs.filter((l) => l.status === "success").length;

  const loadDiagnostics = async () => {
    try {
      const url = user
        ? `/api/auth/google/diagnostics?uid=${user.uid}`
        : "/api/auth/google/diagnostics";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      setDiagnostics(data);
    } catch (e) {
      console.log("Failed to load diagnostics");
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
      if (call.name === "create_property") {
        const { name, address, rentValue, status } = call.args;
        try {
          await addProperty({
            name,
            address: address || "",
            rentValue: Number(rentValue),
            status: (status as any) || "vacant",
            ownerId: user?.uid || "",
          });
          responses.push(`✅ Imóvel "${name}" criado com sucesso!`);
        } catch (e) {
          responses.push(
            `❌ Erro ao criar imóvel "${name}": ${e instanceof Error ? e.message : "Erro desconhecido"}`,
          );
        }
      } else if (call.name === "create_tenant") {
        const { name, contact, cpf } = call.args;
        try {
          await addTenant({
            name,
            contact,
            cpf: cpf || "",
            status: "waiting",
            ownerId: user?.uid || "",
          });
          responses.push(`✅ Inquilino "${name}" cadastrado com sucesso!`);
        } catch (e) {
          responses.push(
            `❌ Erro ao cadastrar inquilino "${name}": ${e instanceof Error ? e.message : "Erro desconhecido"}`,
          );
        }
      } else if (call.name === "generate_missing_info_report") {
        const missingTenants = tenants.filter((t) => !t.cpf || !t.contact);
        const report =
          missingTenants.length > 0
            ? `Relatório de Pendências:\n${missingTenants.map((t) => `- ${t.name}: Faltando ${(t.cpf ? "" : "CPF") + (t.contact ? "" : " Contato")}`).join("\n")}`
            : "Nenhuma pendência crítica de informação encontrada nos inquilinos.";
        responses.push(report);
      }
    }
    return responses.join("\n\n");
  };

  const sendMessage = async () => {
    if (!isOnline) {
      toast.error(
        "Você está sem conexão com a internet. O Assistente Inteligente necessita de conexão para funcionar.",
      );
      return;
    }
    if (!userInput.trim() || isLoading) return;

    const userMsg = userInput;
    setUserInput("");
    setChatHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    window.dispatchEvent(
      new CustomEvent("robot-state", {
        detail: { state: "working", message: "Pesquisando..." },
      }),
    );

    try {
      const response = await getManagerAgentResponse(
        {
          properties,
          tenants,
          payments,
          expenses,
          agreements,
          authDiagnostics: diagnostics,
        },
        userMsg,
        chatHistory,
      );

      if (
        typeof response === "object" &&
        (response as any).type === "tool_call"
      ) {
        const toolFeedback = await handleToolCall((response as any).calls);
        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: toolFeedback + "\n\nO que mais posso fazer por você?",
          },
        ]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: response as string },
        ]);
      }

      window.dispatchEvent(
        new CustomEvent("robot-state", {
          detail: {
            state: "idle",
            message: "Aqui está sua resposta!",
            duration: 4000,
          },
        }),
      );
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, tive um problema técnico. Pode repetir?",
        },
      ]);
      window.dispatchEvent(
        new CustomEvent("robot-state", {
          detail: {
            state: "thinking",
            message: "Oops! Tive um problema técnico.",
            duration: 5000,
          },
        }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "transition-all duration-300 w-full h-full",
        isFullScreen
          ? "fixed inset-0 z-[100] bg-[#F8FAFC]"
          : "flex flex-col relative bg-white",
      )}
    >
      {/* Main Container - Chat Focus */}
      <div
        className={cn(
          "flex flex-col h-full relative overflow-hidden flex-1",
          isFullScreen ? "" : "bg-white",
        )}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
        {/* Chat Header */}
        <div className="p-3 sm:px-4 sm:py-3 border-b border-slate-200 flex items-center justify-between bg-white relative z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 relative">
              <Sparkles className="w-5 h-5" />
              <span
                className={cn(
                  "absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full",
                  isOnline ? "bg-emerald-500" : "bg-rose-500 animate-pulse",
                )}
              ></span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 leading-tight">
                Assistente do Gerente
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  isOnline
                    ? "text-emerald-300 bg-emerald-50 px-2 py-0.5 rounded-full text-emerald-700 inline-block w-fit"
                    : "text-rose-600 animate-pulse bg-rose-50 px-2 py-0.5 rounded-full inline-block w-fit",
                )}
              >
                {isOnline ? "Online" : "Dispositivo Offline"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="hidden sm:flex px-3 py-1.5 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200 text-xs font-bold items-center gap-1.5 shadow-sm"
              title="Histórico"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Histórico
            </button>
            <button
              onClick={() => setCurrentSessionId(null)}
              className="hidden sm:flex px-3 py-1.5 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200 text-xs font-bold items-center gap-1.5 shadow-sm"
              title="Nova Conversa"
            >
              <Plus className="w-3.5 h-3.5" /> Nova
            </button>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 sm:p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-all"
              title={isFullScreen ? "Minimizar" : "Tela Cheia"}
            >
              {isFullScreen ? (
                <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
            <button
              onClick={() => handleNavigate("dashboard")}
              className="p-2 sm:p-2.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all"
              title="Fechar/Minimizar"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
        {!isOnline && (
          <div className="bg-rose-50 border-b border-rose-100 text-rose-900 px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 relative z-20 shadow-sm shrink-0">
            <WifiOff className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
            <span>
              Você está offline. O Assistente Inteligente precisa estar
              conectado à internet para analisar e responder suas perguntas.
            </span>
          </div>
        )}
        {/* Messages Area Container with Sidebar */}
        <div className="flex-1 flex overflow-hidden relative z-10 w-full">
          <AnimatePresence>
            {showSidebar && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden shrink-0 h-full shadow-[4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20"
              >
                <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Histórico (Sessões)
                  </h3>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 overflow-y-auto flex-1 space-y-1 custom-scrollbar">
                  <button
                    onClick={() => {
                      setCurrentSessionId(null);
                      setShowSidebar(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-2 transition-colors mb-2"
                  >
                    <Plus className="w-4 h-4" /> Começar Nova Conversa
                  </button>
                  {sessions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      Nenhum histórico
                    </p>
                  ) : (
                    sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setCurrentSessionId(s.id);
                          setShowSidebar(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-xs font-semibold rounded-lg truncate transition-all",
                          currentSessionId === s.id
                            ? "bg-white shadow-sm border border-slate-200 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-800",
                        )}
                      >
                        {currentSessionId === s.id && (
                          <ChevronRight className="inline-block w-3 h-3 text-indigo-500 mr-1" />
                        )}
                        {s.title || "Conversa"}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 sm:py-6 space-y-4 custom-scrollbar bg-[#efeae2] relative"
              style={{
                backgroundImage:
                  "radial-gradient(#d4cec5 1px, transparent 1px)",
                backgroundSize: "30px 30px",
              }}
            >
              {chatHistory.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col w-full",
                    msg.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "px-4 py-3 sm:px-5 sm:py-3 shadow-sm leading-relaxed transition-all relative max-w-[90%] sm:max-w-[75%]",
                      msg.role === "user"
                        ? "bg-[#d9fdd3] text-slate-800 rounded-[1.2rem] rounded-tr-sm"
                        : "bg-white text-slate-800 rounded-[1.2rem] rounded-tl-sm",
                    )}
                  >
                    <div
                      className={cn(
                        "whitespace-pre-wrap break-words",
                        msg.role === "assistant"
                          ? "markdown-body text-[14px] sm:text-[15px] font-medium text-slate-800"
                          : "text-[14px] sm:text-[15px] font-medium text-slate-800",
                      )}
                    >
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex flex-col items-start w-full">
                  <div className="bg-white text-slate-500 px-4 py-3 rounded-[1.2rem] rounded-tl-sm shadow-sm inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    <span
                      className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Pre-filled Suggestions */}
            {chatHistory.length === 0 && (
              <div className="px-4 pb-2 pt-2 relative z-10 bg-[#f0f2f5]">
                <div className="flex flex-wrap gap-2 max-w-7xl mx-auto">
                  {[
                    "Quais são os índices recentes do IGP-M para reajuste de aluguel?",
                    "De acordo com a Lei do Inquilinato, o inquilino pode quebrar o contrato antes do prazo?",
                    "Gere um relatório de pendências dos meus inquilinos.",
                  ].map((tip, i) => (
                    <button
                      key={i}
                      onClick={() => setUserInput(tip)}
                      className="text-[11px] font-medium bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full transition-all border border-slate-200 whitespace-nowrap"
                    >
                      {tip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 sm:px-4 sm:py-3 bg-[#f0f2f5] relative z-20 shrink-0">
              <div className="flex items-end gap-2 max-w-7xl mx-auto">
                <div className="flex-1 rounded-2xl bg-white flex items-center overflow-hidden min-h-[44px]">
                  <textarea
                    placeholder={
                      isOnline
                        ? "Digite uma mensagem..."
                        : "Aguardando conexão..."
                    }
                    value={userInput}
                    disabled={!isOnline}
                    onChange={(e) => {
                      setUserInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                    className="w-full bg-transparent text-slate-800 px-4 py-3 focus:outline-none resize-none placeholder:text-slate-400 text-[15px] leading-snug custom-scrollbar max-h-[120px] disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!isOnline || !userInput.trim() || isLoading}
                  className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </div>
              <div className="text-center mt-2 pb-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  IA Grounding & Local RAG
                </span>
              </div>
            </div>
          </div>
        </div>{" "}
        {/* End of row flex wrapper */}
      </div>
    </div>
  );
};

const Card = ({
  children,
  className,
  onClick,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  id?: string;
}) => (
  <div
    id={id}
    onClick={onClick}
    className={cn(
      "bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden",
      className,
    )}
  >
    {children}
  </div>
);

const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) => {
  const variants = {
    primary:
      "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    danger:
      "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
    ghost: "hover:bg-slate-100 text-slate-600",
    outline: "border border-slate-200 text-slate-600 hover:bg-slate-50",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
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
        className,
      )}
    >
      {children}
    </button>
  );
};

const Input = ({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  className,
  min,
  max,
  maxLength,
  step,
  disabled,
  onKeyDown,
  inputMode,
  pattern,
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
  maxLength?: number;
  step?: string | number;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  pattern?: string;
}) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && (
      <label
        htmlFor={id}
        className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1"
      >
        {label}
        {required && (
          <span className="text-rose-500 ml-1" title="Campo obrigatório">
            *
          </span>
        )}
      </label>
    )}
    <input
      id={id}
      type={type}
      inputMode={inputMode}
      pattern={pattern}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={(e) => e.target.select()}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      min={min}
      max={max}
      maxLength={maxLength}
      step={step}
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
  className,
}: {
  label?: string;
  id: string;
  value: number;
  onChange: (val: number) => void;
  required?: boolean;
  className?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(
    value ? value.toString().replace(".", ",") : ""
  );

  useEffect(() => {
    const currentNum = parseFloat(displayValue.replace(/\./g, "").replace(",", ".")) || 0;
    if (Math.abs(currentNum - value) > 0.001) {
      setDisplayValue(value ? value.toString().replace(".", ",") : "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // allow digits and commas
    val = val.replace(/[^0-9,]/g, "");
    
    // ensure only one comma
    const parts = val.split(",");
    if (parts.length > 2) {
      val = parts[0] + "," + parts.slice(1).join("");
    }

    setDisplayValue(val);

    const numericValue = parseFloat(val.replace(",", ".")) || 0;
    onChange(numericValue);
  };

  const handleBlur = () => {
    const numericValue = parseFloat(displayValue.replace(",", ".")) || 0;
    setDisplayValue(
      numericValue > 0 
        ? numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\./g, "") 
        : ""
    );
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1"
        >
          {label}
          {required && (
            <span className="text-rose-500 ml-1" title="Campo obrigatório">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
          R$
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={(e) => e.target.select()}
          required={required}
          className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 font-medium"
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
  required,
  disabled,
}: {
  label?: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { label: string; value: string; disabled?: boolean }[];
  className?: string;
  required?: boolean;
  disabled?: boolean;
}) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && (
      <label
        htmlFor={id}
        className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1"
      >
        {label}
        {required && (
          <span className="text-rose-500 ml-1" title="Campo obrigatório">
            *
          </span>
        )}
      </label>
    )}
    <select
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
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
              <h2 className="text-xl font-black tracking-tight text-slate-800">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
              >
                <XCircle className="w-6 h-6" />
              </button>
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
  description,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPassword: string;
  description?: string;
}) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input === correctPassword) {
      setError(false);
      setInput("");
      await onSuccess();
      onClose();
    } else {
      setError(true);
      toast.error("Senha de segurança incorreta!");
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
            {description ||
              "Esta ação requer sua senha de segurança para ser concluída."}
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
                error
                  ? "border-rose-500 bg-rose-50 animate-shake"
                  : "border-slate-200 focus:border-amber-500",
              )}
              value={input}
              onChange={(e) => {
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
                setInput("");
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

import {
  getDriveAgentResponse,
  getManagerAgentResponse,
  generateLeaseContract,
  scanInvoice,
  generateBackupSummary,
} from "./services/geminiService";

const DriveIntegrationModalPlaceholder = () => null;

const UnifiedFinancialHub = ({
  activeTab,
  setActiveTab,
  financialProps,
  receivablesProps,
  storagesProps,
}: any) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="w-full relative mb-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full border border-slate-200 shadow-inner gap-1 relative z-10 flex-col md:flex-row">
          <button
            className={cn(
              "flex-1 px-1.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-1.5 relative overflow-hidden",
              activeTab === "panorama"
                ? "bg-white shadow-sm text-indigo-700 ring-1 ring-indigo-500/20 scale-[1.01] z-10"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 z-0",
            )}
            onClick={() => setActiveTab("panorama")}
          >
            {activeTab === "panorama" && (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-indigo-50 opacity-50" />
            )}
            <div
              className={cn(
                "p-1 rounded-full transition-colors shrink-0",
                activeTab === "panorama"
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-slate-200/50 text-slate-400",
              )}
            >
              <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10" />
            </div>
            <span className="relative z-10 tracking-tight text-center leading-tight">
              Panorama Geral
            </span>
          </button>
          <button
            className={cn(
              "flex-1 px-1.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-1.5 relative overflow-hidden",
              activeTab === "receivables"
                ? "bg-white shadow-sm text-emerald-700 ring-1 ring-emerald-500/20 scale-[1.01] z-10"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 z-0",
            )}
            onClick={() => setActiveTab("receivables")}
          >
            {activeTab === "receivables" && (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 opacity-50" />
            )}
            <div
              className={cn(
                "p-1 rounded-full transition-colors shrink-0",
                activeTab === "receivables"
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-200/50 text-slate-400",
              )}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10" />
            </div>
            <span className="relative z-10 tracking-tight text-center leading-tight">
              Entradas / Recebimentos
            </span>
          </button>

          <button
            className={cn(
              "flex-1 px-1.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-1.5 relative overflow-hidden",
              activeTab === "financial"
                ? "bg-white shadow-sm text-rose-700 ring-1 ring-rose-500/20 scale-[1.01] z-10"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 z-0",
            )}
            onClick={() => setActiveTab("financial")}
          >
            {activeTab === "financial" && (
              <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-rose-50 opacity-50" />
            )}
            <div
              className={cn(
                "p-1 rounded-full transition-colors shrink-0",
                activeTab === "financial"
                  ? "bg-rose-100 text-rose-600"
                  : "bg-slate-200/50 text-slate-400",
              )}
            >
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10" />
            </div>
            <span className="relative z-10 tracking-tight text-center leading-tight">
              Saídas / Despesas
            </span>
          </button>

          <button
            className={cn(
              "flex-1 px-1.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-1.5 relative overflow-hidden",
              activeTab === "storages"
                ? "bg-white shadow-sm text-amber-700 ring-1 ring-amber-500/20 scale-[1.01] z-10"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 z-0",
            )}
            onClick={() => setActiveTab("storages")}
          >
            {activeTab === "storages" && (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-50 opacity-50" />
            )}
            <div
              className={cn(
                "p-1 rounded-full transition-colors shrink-0",
                activeTab === "storages"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-slate-200/50 text-slate-400",
              )}
            >
              <Warehouse className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10" />
            </div>
            <span className="relative z-10 tracking-tight text-center leading-tight">
              Espaço & Ativos
            </span>
          </button>
        </div>
      </div>
      {activeTab === "receivables" ? (
        <ReceivablesView {...receivablesProps} />
      ) : activeTab === "panorama" ? (
        <FinancialOverviewView 
          properties={financialProps.properties}
          payments={financialProps.payments}
          expenses={financialProps.expenses}
          agreements={financialProps.agreements}
          storages={storagesProps.storages}
          tenants={financialProps.tenants}
        />
      ) : activeTab === "financial" ? (
        <FinancialView {...financialProps} />
      ) : activeTab === "storages" ? (
        <StoragesView {...storagesProps} />
      ) : (
        <FinancialIAView
          properties={financialProps.properties}
          tenants={financialProps.tenants}
          payments={financialProps.payments}
          expenses={financialProps.expenses}
          agreements={financialProps.agreements}
        />
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success(
        "Sua conexão foi restaurada! Os recursos de Inteligência Artificial e sincronização de dados estão ativos.",
        {
          icon: "⚡",
          duration: 5000,
        },
      );
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error(
        "Você está offline! O aplicativo ainda funciona offline, mas as funcionalidades de Inteligência Artificial e integrações na nuvem estão temporariamente indisponíveis.",
        {
          icon: "🔌",
          duration: 6000,
        },
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleSWUpdate = () => {
      toast.info("Uma nova versão do Gerente Imobiliário (v6.6.0) está disponível!", {
        description: "Recomendamos atualizar para carregar as melhorias mais recentes e evitar erros. Clique no botão abaixo para carregar agora.",
        duration: Infinity, // Mantém ativo até interação do usuário
        action: {
          label: "Atualizar Agora",
          onClick: () => {
            window.location.reload();
          },
        },
      });
    };

    window.addEventListener("sw-update-available", handleSWUpdate);
    return () => {
      window.removeEventListener("sw-update-available", handleSWUpdate);
    };
  }, []);

  const defaultAlertSettings: AlertSettings = useMemo(
    () => ({
      notifyUpcomingRents: true,
      upcomingRentsDays: 5,
      notifyContractsExpiring: true,
      contractsExpiringDays: 30,
      notifyLatePayments: true,
      notifyExpiredDocuments: true,
      notifyTickets: true,
      notifyVacantProperties: true,
      vacantPropertiesDays: 15,
      notifyPendingInspections: true,
      notifyUnallocatedTenants: true,
      forceShowUntilResolved: false,
    }),
    [],
  );

  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => {
    try {
      const saved = localStorage.getItem("robo_alert_settings");
      if (saved) {
        return {
          notifyUpcomingRents: true,
          upcomingRentsDays: 5,
          notifyContractsExpiring: true,
          contractsExpiringDays: 30,
          notifyLatePayments: true,
          notifyExpiredDocuments: true,
          notifyTickets: true,
          ...JSON.parse(saved),
        };
      }
    } catch (e) {
      console.warn("Failed to read alert settings from localStorage:", e);
    }
    return {
      notifyUpcomingRents: true,
      upcomingRentsDays: 5,
      notifyContractsExpiring: true,
      contractsExpiringDays: 30,
      notifyLatePayments: true,
      notifyExpiredDocuments: true,
      notifyTickets: true,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem("robo_alert_settings", JSON.stringify(alertSettings));
    } catch (e) {
      console.warn("Failed to save alert settings to localStorage:", e);
    }
  }, [alertSettings]);

  const [userRole, setUserRole] = useState<"admin" | "tenant" | null>(null);
  const [tenantUser, setTenantUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem("tenant_session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "intelligence_hub"
    | "properties"
    | "tenants"
    | "contracts"
    | "financial"
    | "financial_ia"
    | "settings"
    | "receivables"
    | "cloud"
    | "help"
    | "alerts"
    | "import"
    | "storages"
  >("dashboard");
  const [initialContractTemplate, setInitialContractTemplate] = useState<
    string | null
  >(null);
  const [initialContractData, setInitialContractData] = useState<any>(null);
  const [initialPropertyIdForTenant, setInitialPropertyIdForTenant] = useState<
    string | null
  >(null);
  const [initialTenantIdToEdit, setInitialTenantIdToEdit] = useState<
    string | null
  >(null);
  const [highlightedPaymentId, setHighlightedPaymentId] = useState<
    string | null
  >(null);
  const [expandedPaymentGroups, setExpandedPaymentGroups] = useState<
    Record<string, boolean>
  >({});
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [pwaLogs, setPwaLogs] = useState<string[]>([]);
  const [isFixingPwa, setIsFixingPwa] = useState(false);
  const lastSyncHashRef = useRef<string>("");

  const [isJustifyRenovationModalOpen, setIsJustifyRenovationModalOpen] =
    useState(false);
  const [justifyingProperty, setJustifyingProperty] = useState<Property | null>(
    null,
  );
  const [renovationJustifyText, setRenovationJustifyText] = useState("");

  // Logic to simulate robot interactions
  useEffect(() => {
    if (activeTab === "financial" || activeTab === "receivables") {
      const event = new CustomEvent("robot-state", {
        detail: {
          state: "success",
          duration: 3000,
        },
      });
      window.dispatchEvent(event);
    } else if (activeTab === "alerts") {
      const event = new CustomEvent("robot-state", {
        detail: {
          state: "greeting",
          message:
            "Aqui estão seus alertas inteligentes, focados no que precisa da sua atenção!",
          autoRevert: false,
        },
      });
      window.dispatchEvent(event);
    } else if (activeTab === "intelligence_hub") {
      const event = new CustomEvent("robot-state", {
        detail: {
          state: "juridico",
          autoRevert: false,
        },
      });
      window.dispatchEvent(event);
    } else if (activeTab === "cloud") {
      const event = new CustomEvent("robot-state", {
        detail: {
          state: "thinking",
          duration: 3000,
        },
      });
      window.dispatchEvent(event);
    } else {
      const event = new CustomEvent("robot-state", {
        detail: {
          state: "idle",
          autoRevert: false,
        },
      });
      window.dispatchEvent(event);
    }
  }, [activeTab]);

  const [snoozedAlerts, setSnoozedAlerts] = useState<
    Record<string, { timestamp: number; duration: number }>
  >(() => {
    try {
      const saved = localStorage.getItem("imob_snoozed_alerts");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleSnoozeAlert = (
    alertId: string,
    durationMs: number = 172800000,
  ) => {
    setSnoozedAlerts((prev) => {
      const updated = {
        ...prev,
        [alertId]: { timestamp: Date.now(), duration: durationMs },
      };
      localStorage.setItem("imob_snoozed_alerts", JSON.stringify(updated));
      return updated;
    });
  };

  const isAlertSnoozed = (alertId: string) => {
    if (alertSettings.forceShowUntilResolved) return false;
    if (alertId.startsWith("contract-expired-")) return false; // Force show expired contracts until resolved
    const record = snoozedAlerts[alertId];
    if (!record) return false;
    return Date.now() - record.timestamp < (record.duration || 172800000);
  };

  const handleSaveRenovationJustification = async () => {
    if (!justifyingProperty || !user) return;
    try {
      await updateDoc(doc(db, "properties", justifyingProperty.id!), {
        renovationJustification: renovationJustifyText,
        updatedAt: new Date().toISOString(),
      });
      setIsJustifyRenovationModalOpen(false);
      setJustifyingProperty(null);
      setRenovationJustifyText("");
      // also clear any active local snooze so it disappears naturally if handled
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `properties/${justifyingProperty.id}`,
      );
    }
  };

  const handleNavigate = (tab: any, highlightId?: string) => {
    setActiveTab(tab);
    if (tab === "storages" && highlightId) {
      setSelectedStorageId(highlightId);
    }
    if (highlightId) {
      setHighlightedPaymentId(highlightId);
      // Wait for tab transition before highlighting
      setTimeout(() => {
        const el = document.getElementById(highlightId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("bg-amber-100", "transition-colors", "duration-500");
          setTimeout(() => el.classList.remove("bg-amber-100"), 3000);
        }
      }, 300);
    }
  };

  useEffect(() => {
    // Check if we just completed a repair
    const urlParams = new URLSearchParams(window.location.search);
    const justRepairedInSession =
      sessionStorage.getItem("just_repaired") === "true";

    if (urlParams.get("repair_done") === "true" || justRepairedInSession) {
      const runDetailedDiagnostics = async () => {
        let swStatus = "Não encontrado";
        try {
          if ("serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              swStatus = reg.active
                ? "✅ Ativo"
                : reg.waiting
                  ? "⏳ Aguardando"
                  : "🔧 Instalando";
            }
          }
        } catch (e) {
          swStatus = "❌ Erro ao verificar";
        }

        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          ("standalone" in navigator && (navigator as any).standalone);

        const diagnostics = [
          `🌐 Protocolo: ${window.location.protocol}`,
          `⚙️ Service Worker: ${swStatus}`,
          `📄 Manifest Header: ${!!document.querySelector('link[rel="manifest"]')}`,
          `🤖 Captura Global: ${!!(window as any).deferredPWA ? "✅ DISPONÍVEL" : "❌ NÃO DISPARADA"}`,
          `📱 Engine: ${navigator.userAgent.includes("Chrome") ? "Chrome/Blink (OK)" : navigator.userAgent.includes("Firefox") ? "Firefox" : "Outro/Safari"}`,
          `📏 Standalone: ${isStandalone ? "✅ Instalado (Rodando como App)" : "Navegador"}`,
        ];

        setPwaLogs(
          [
            "🛠️ DIAGNÓSTICO TÉCNICO V61 (ELITE)...",
            "ℹ️ Nova Identidade V61: Paths nativos do Manifesto corrigidos.",
            ...diagnostics,
            "--------------------------------",
            isStandalone
              ? "🎉 VOCÊ JÁ ESTÁ NO APP OFICIAL! Atualizações são automáticas V60."
              : "🔍 AGUARDANDO AUTORIZAÇÃO DO ANDROID...",
            !isStandalone
              ? '⚠️ Se "Captura Global" for "NÃO DISPARADA", o Chrome não autorizou a instalação nativa.'
              : "✅ Sistema Nativo rodando com sucesso.",
            !isStandalone
              ? '💡 DICA INFALÍVEL: Se o botão não funcionar, clique nos 3 pontos do navegador (canto superior direito) > "Instalar aplicativo" ou "Adicionar à tela inicial".'
              : "",
          ].filter(Boolean),
        );

        // RECOVER PROMPT IF IT FIRED TOO EARLY
        if ((window as any).deferredPWA && !deferredPrompt) {
          console.log("Restoring captured prompt from global window");
          setDeferredPrompt((window as any).deferredPWA);
          setIsInstallable(true);
          setPwaLogs((prev) => [
            ...prev,
            "⚡ SINAL RECUPERADO: Convite de instalação pronto!",
          ]);
        }
      };

      runDetailedDiagnostics();

      const customHandler = (e: any) => {
        if (e.detail && !deferredPrompt) {
          setDeferredPrompt(e.detail);
          setIsInstallable(true);
          setPwaLogs((prev) => [
            ...prev,
            "⚡ SINAL CAPTURADO (KERNEL): Convite pronto!",
          ]);
        }
      };
      window.addEventListener("pwa_signal_received", customHandler);

      sessionStorage.removeItem("just_repaired");
      if (urlParams.get("repair_done")) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
      return () =>
        window.removeEventListener("pwa_signal_received", customHandler);
    }

    const handler = (e: any) => {
      console.log("✅ Evento beforeinstallprompt disparado!");
      e.preventDefault();
      (window as any).deferredPWA = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
      setPwaLogs((prev) => [
        ...prev,
        "✅ SINAL VERDE: Navegador autorizou instalação nativa!",
      ]);

      // Se acabamos de vir de um reparo, não mostre modal mais
      let justRepaired = false;
      let guideShown = "false";
      try {
        justRepaired = !!sessionStorage.getItem("just_repaired");
        guideShown = localStorage.getItem("pwa_guide_shown_v5") || "false";
      } catch (e) {}
      if (!(window.location.search.includes("repair_done") || justRepaired)) {
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as any).standalone === true;
        if (!isStandalone && guideShown !== "true") {
          try {
            localStorage.setItem("pwa_guide_shown_v5", "true");
          } catch (e) {}
        }
      }
    };

    const installedHandler = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      (window as any).deferredPWA = null;
      try {
        localStorage.setItem("pwa_guide_shown_v5", "true");
      } catch (e) {}
    };

    const pwaCustomHandler = () => {
      if ((window as any).deferredPWA) {
        setDeferredPrompt((window as any).deferredPWA);
        setIsInstallable(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    window.addEventListener("pwa-installable", pwaCustomHandler);

    // Suporte para o sinal customizado vindo do index.html
    const signalHandler = (e: any) => {
      console.log("📡 Sinal PWA recebido do Kernel:", e.detail);
      setDeferredPrompt(e.detail);
      setIsInstallable(true);
    };
    window.addEventListener("pwa_signal_received", signalHandler);

    // Fallback: see if index.html already captured it
    setTimeout(() => {
      if ((window as any).deferredPWA) {
        setDeferredPrompt((window as any).deferredPWA);
        setIsInstallable(true);
      }
    }, 100);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      window.removeEventListener("pwa-installable", pwaCustomHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPWA;

    if (!promptEvent) {
      toast.error("A instalação não está disponível no momento.");
      return;
    }

    try {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;

      if (outcome === "accepted") {
        toast.success("Aplicativo sendo instalado!");
        setDeferredPrompt(null);
        (window as any).deferredPWA = null;
        setIsInstallable(false);
      }
    } catch (err: any) {
      console.error("PWA Error:", err);
      toast.error(`Erro ao instalar: ${err.message}`);
    }
  };

  const redirectToReceivables = (paymentId: string) => {
    setHighlightedPaymentId(paymentId);
    setActiveTab("receivables");
    setIsTenantDetailModalOpen(false); // Close tenant detail if open
  };
  const [securityPassword, setSecurityPassword] = useState("1234");

  useEffect(() => {
    if (!user) return;
    const loadConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", user.uid));
        if (configDoc.exists()) {
          const data = configDoc.data();
          setSecurityPassword(data.securityPassword || "1234");

          if (data.googleDriveTokens) {
            const storedTokens = localStorage.getItem("google_drive_tokens");
            if (!storedTokens || storedTokens !== data.googleDriveTokens) {
              console.log("[Drive] Restoring tokens from Firestore");
              localStorage.setItem(
                "google_drive_tokens",
                data.googleDriveTokens,
              );

              // Only call /save-tokens to sync the session, do NOT trigger another event
              // We dispatch the event anyway so that it rechecks Drive
              fetch("/api/auth/google/save-tokens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tokens: JSON.parse(data.googleDriveTokens),
                  uid: user.uid,
                }),
                credentials: "include",
              }).finally(() => {
                window.dispatchEvent(new Event("drive-connected"));
              });
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      }
    };
    loadConfig();
  }, [user]);

  const updateSecurityPassword = async (newPassword: string) => {
    if (!user) return;
    try {
      await setDoc(
        doc(db, "config", user.uid),
        cleanObject({
          securityPassword: newPassword,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true },
      );
      setSecurityPassword(newPassword);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "config");
    }
  };
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityDescription, setSecurityDescription] = useState("");
  const [onSecuritySuccess, setOnSecuritySuccess] = useState<
    (() => void) | null
  >(null);

  const executeWithSecurity = (
    action: () => void,
    description: string = "",
  ) => {
    setOnSecuritySuccess(() => action);
    setSecurityDescription(description);
    setIsSecurityModalOpen(true);
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [revertingPayment, setRevertingPayment] = useState<Payment | null>(
    null,
  );
  const [revertReason, setRevertReason] = useState("");
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoveTenantModalOpen, setIsRemoveTenantModalOpen] = useState(false);
  const [removeTenantData, setRemoveTenantData] = useState<{
    propertyId: string;
    tenantId: string;
    action: "waiting" | "archived" | "delete";
  } | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [settlementType, setSettlementType] = useState<"extra" | "discount">(
    "extra",
  );
  const [confirmingPayment, setConfirmingPayment] = useState<any | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [waiveLateFee, setWaiveLateFee] = useState<boolean>(false);
  const [waivedLateFeeReason, setWaivedLateFeeReason] = useState<string>("");
  const [paymentReceipt, setPaymentReceipt] = useState<string | null>(null);
  const [paymentReceiptLocation, setPaymentReceiptLocation] =
    useState<string>("");
  const [paymentReceiptName, setPaymentReceiptName] = useState<string>("");
  const [paymentReceiptThumbnail, setPaymentReceiptThumbnail] = useState<
    string | null
  >(null);
  const [paymentRemainderDueDate, setPaymentRemainderDueDate] =
    useState<string>(format(addMonths(new Date(), 1), "yyyy-MM-dd"));
  const [paymentRemainderObservations, setPaymentRemainderObservations] =
    useState<string>("");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetsRemaining, setResetsRemaining] = useState<number>(3);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [backupStepMsg, setBackupStepMsg] = useState("");
  const [agreementForm, setAgreementForm] = useState<Partial<Agreement>>({
    tenantId: "",
    description: "",
    totalAmount: 0,
    installmentAmount: 0,
    durationMonths: 1,
    startDate: format(new Date(), "yyyy-MM-dd"),
    justification: "",
    evidence: "",
    evidenceName: "",
    evidenceLocation: "",
    thumbnailLink: "",
    chargeLateFees: false,
    lateFeePenalty: 10,
    lateFeeDaily: 0.33,
    lateFeeType: "percentage",
  });

  const [isArchiveAgreementModalOpen, setIsArchiveAgreementModalOpen] =
    useState(false);
  const [archivingAgreement, setArchivingAgreement] =
    useState<Agreement | null>(null);
  const [archiveJustification, setArchiveJustification] = useState("");

  const [isTenantDetailModalOpen, setIsTenantDetailModalOpen] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<{
    url: string;
    name: string;
    isImage: boolean;
  } | null>(null);
  const [selectedTenantForDetail, setSelectedTenantForDetail] =
    useState<Tenant | null>(null);

  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [syncLogs, setSyncLogs] = useState<
    {
      id: string;
      fileName: string;
      status: "pending" | "success" | "error";
      timestamp: string;
      error?: string;
      url?: string;
      type: "receipt" | "contract" | "expense";
    }[]
  >([]);

  const addSyncLog = useCallback(
    (
      log: Omit<
        {
          id: string;
          fileName: string;
          status: "pending" | "success" | "error";
          timestamp: string;
          error?: string;
          url?: string;
          type: "receipt" | "contract" | "expense";
        },
        "id" | "timestamp"
      >,
    ) => {
      const newLog = {
        ...log,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
      };
      setSyncLogs((prev) => [newLog, ...prev].slice(0, 50));
    },
    [],
  );

  const checkDriveStatus = useCallback(
    async (retries = 5) => {
      if (!user) {
        setIsDriveConnected(false);
        return;
      }
      try {
        console.log(`[Drive] Checking status... Retries left: ${retries}`);
        const storedTokens = localStorage.getItem("google_drive_tokens");
        const url = user
          ? `/api/drive/test?uid=${user.uid}`
          : "/api/drive/test";

        const headers: Record<string, string> = {};
        if (storedTokens) {
          headers["X-Drive-Tokens"] = storedTokens;
        }

        const res = await fetch(url, {
          credentials: "include",
          headers,
        });
        const contentType = res.headers.get("content-type");

        if (!res.ok) {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            if (res.status === 401) {
              setDriveError(
                errorData.error || "Sessão expirada. Por favor, reconecte.",
              );
              setIsDriveConnected(false);
              localStorage.removeItem("google_drive_tokens");
              if (user) {
                try {
                  await setDoc(
                    doc(db, "config", user.uid),
                    {
                      googleDriveConnected: false,
                      updatedAt: new Date().toISOString(),
                    },
                    { merge: true },
                  );
                } catch (e) {
                  console.error("Failed to update config on 401:", e);
                }
              }
              return; // Do not retry on explicit 401 Auth error
            }
            throw new Error(errorData.error || `Erro HTTP ${res.status}`);
          }
          throw new Error(`Erro do Servidor: ${res.status}`);
        }

        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Resposta inválida do servidor (não é JSON).");
        }

        const data = await res.json();
        console.log("[Drive] Status response:", data);

        setIsDriveConnected(data.connected);
        setDriveError(null);

        // If we expected to be connected but aren't, and we have retries left
        if (!data.connected && retries > 0) {
          console.log("[Drive] Not connected yet, retrying in 2s...");
          setTimeout(() => checkDriveStatus(retries - 1), 2000);
        } else if (data.connected) {
          console.log("[Drive] Connected successfully!");
          if (data.tokens) {
            localStorage.setItem(
              "google_drive_tokens",
              JSON.stringify(data.tokens),
            );
          }
        }
      } catch (error) {
        console.error("[Drive] Error checking status:", error);
        if (retries > 0) {
          setTimeout(() => checkDriveStatus(retries - 1), 2000);
        } else {
          setDriveError(
            error instanceof Error ? error.message : "Erro desconhecido",
          );
          setIsDriveConnected(false);
        }
      }
    },
    [user],
  );

  useEffect(() => {
    checkDriveStatus();

    const handleDriveConnected = () => {
      console.log("drive-connected event received");
      checkDriveStatus(3);
    };

    window.addEventListener("drive-connected", handleDriveConnected);
    return () =>
      window.removeEventListener("drive-connected", handleDriveConnected);
  }, [checkDriveStatus]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log("[Drive] Message received:", event.data?.type);
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const tokens = event.data.tokens;
        console.log("[Drive] Tokens received from popup");

        // Clear any previous error immediately
        setDriveError(null);

        if (tokens) {
          console.log(
            "[Drive] Received tokens via postMessage, synchronizing session...",
          );
          localStorage.setItem("google_drive_tokens", JSON.stringify(tokens));
          try {
            const saveRes = await fetch("/api/auth/google/save-tokens", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tokens, uid: user?.uid }),
              credentials: "include",
            });

            if (!saveRes.ok) {
              const errData = await saveRes
                .json()
                .catch(() => ({ error: "Desconhecido" }));
              console.error(
                "[Drive] Failed to sync tokens to session:",
                errData.error,
              );
              toast.error("Falha ao sincronizar sessão: " + errData.error);
            } else {
              const result = await saveRes.json();
              console.log("[Drive] Session synchronized successfully.", result);

              if (user) {
                try {
                  await setDoc(
                    doc(db, "config", user.uid),
                    {
                      googleDriveTokens: JSON.stringify(tokens),
                      googleDriveConnected: true,
                      updatedAt: new Date().toISOString(),
                    },
                    { merge: true },
                  );
                  console.log(
                    "[Drive] Tokens saved to Firestore config via client",
                  );
                } catch (e) {
                  console.error(
                    "[Drive] Error saving tokens to Firestore config via client:",
                    e,
                  );
                }
              }

              // Immediate check after sync
              setTimeout(() => checkDriveStatus(3), 500);
            }
          } catch (err) {
            console.error("[Drive] Error syncing tokens:", err);
          }
        }

        // Wait a bit for session to propagate and check status
        setTimeout(() => {
          console.log("Post-auth check triggered");
          checkDriveStatus(3); // Fewer retries needed now with direct sync
          toast.success("Google Drive conectado com sucesso!");
        }, 1000);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [checkDriveStatus]);

  const handleConnectDrive = async () => {
    setDriveError(null); // Clear error when starting new attempt
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await fetch(
        `/api/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`,
        { credentials: "include" },
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao iniciar conexão com Google Drive.");
        return;
      }

      const { url } = data;

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        url,
        "google_oauth",
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`,
      );

      if (!authWindow) {
        toast.error(
          "O bloqueador de popups impediu a abertura da janela de conexão.",
        );
        return;
      }
    } catch (error) {
      console.error("Error connecting to Drive:", error);
      toast.error("Erro ao iniciar conexão com Google Drive.");
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      const res = await fetch("/api/auth/google/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user?.uid }),
      });
      if (res.ok) {
        localStorage.removeItem("google_drive_tokens");
        setIsDriveConnected(false);

        if (user) {
          try {
            await setDoc(
              doc(db, "config", user.uid),
              {
                googleDriveTokens: null,
                googleDriveConnected: false,
                updatedAt: new Date().toISOString(),
              },
              { merge: true },
            );
          } catch (e) {
            console.error("Failed to clear tokens from config via client", e);
          }
        }

        toast.success("Desconectado da conta Google com sucesso.");
      } else {
        throw new Error("Falha ao desconectar");
      }
    } catch (error) {
      console.error("Error disconnecting drive:", error);
      toast.error("Erro ao desconectar da conta Google.");
    }
  };

  const uploadToDrive = async (
    fileName: string,
    fileData: string,
    mimeType: string,
    folderName?: string,
    type: "receipt" | "contract" | "expense" = "receipt",
  ) => {
    addSyncLog({ fileName, status: "pending", type });
    try {
      const storedTokens = localStorage.getItem("google_drive_tokens");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (storedTokens) {
        headers["X-Drive-Tokens"] = storedTokens;
      }

      const res = await fetch("/api/drive/upload", {
        method: "POST",
        headers,
        body: JSON.stringify({
          fileName,
          fileData,
          mimeType,
          folderName,
          uid: user?.uid,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("google_drive_tokens");
          setIsDriveConnected(false);
          setDriveError(
            "Conexão Google Drive expirada. Reconecte em Configurações.",
          );

          if (user) {
            try {
              await setDoc(
                doc(db, "config", user.uid),
                {
                  googleDriveConnected: false,
                  updatedAt: new Date().toISOString(),
                },
                { merge: true },
              );
            } catch (fsErr) {
              console.error(
                "[Drive] Error auto-resetting config in Firestore:",
                fsErr,
              );
            }
          }
          throw new Error(
            "Sessão do Google Drive expirou ou as credenciais são inválidas. reconecte nas Configurações.",
          );
        }

        try {
          const errBody = await res.json();
          throw new Error(errBody.error || "Upload failed");
        } catch {
          throw new Error("Upload failed");
        }
      }
      const data = await res.json();
      addSyncLog({ fileName, status: "success", url: data.webViewLink, type });
      return data;
    } catch (error: any) {
      console.error("Drive upload error:", error);
      addSyncLog({ fileName, status: "error", error: error.message, type });
      toast.error(
        `Erro ao subir para o Google Drive: ${error.message || "Falha no upload"}`,
      );
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
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stagingRecords, setStagingRecords] = useState<StagingRecord[]>([]);
  const [customAlerts, setCustomAlerts] = useState<CustomAlert[]>([]);
  const [storages, setStorages] = useState<StorageSpace[]>([]);
  const [selectedStorageId, setSelectedStorageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generatingRef = useRef<Record<string, boolean>>({});

  // Synchronize tenant data to localStorage for local testing & development backup
  // and also write to firestore tenant_portal_data for live secure tenant login
  useEffect(() => {
    if (tenants.length > 0) {
      try {
        const backupData = tenants.map((t) => {
          const relatedPayments = payments.filter((p) => p.tenantId === t.id);
          const relatedProperty = properties.find((p) => p.id === t.propertyId);
          return {
            id: t.id,
            cpf: t.cpf || "",
            password: t.accessPassword || "",
            tenantName: t.name ? t.name.split(" ")[0] : "Inquilino",
            propertyName: relatedProperty ? relatedProperty.name : "Imóvel",
            propertyPixKey: relatedProperty?.pixKey || "",
            payments: relatedPayments.map((p) => ({
              id: p.id,
              amount: p.amount,
              paidAmount: p.paidAmount || 0,
              dueDate: p.dueDate,
              paidDate: p.paidDate || null,
              status: p.status,
              type: p.type || "rent",
              description: p.description || "",
              receiptUrl: p.receiptUrl || "",
            })),
          };
        });

        const dataStr = JSON.stringify(backupData);
        if (lastSyncHashRef.current === dataStr) {
          return;
        }
        lastSyncHashRef.current = dataStr;

        localStorage.setItem("local_tenants_backup", dataStr);

        // Sync to cloud Firestore tenant_portal_data (so tenants can log in from anywhere)
        const syncToCloud = async () => {
          const promises = backupData.map(async (item) => {
            const cleanCpf = item.cpf.replace(/\D/g, "");
            const password = item.password;
            if (cleanCpf && password) {
              const portalId = `${cleanCpf}_${password}`;
              try {
                await setDoc(doc(db, "tenant_portal_data", portalId), {
                  tenantId: item.id,
                  tenantName: item.tenantName,
                  propertyName: item.propertyName,
                  propertyPixKey: item.propertyPixKey,
                  payments: item.payments,
                  lastSynced: new Date().toISOString()
                }, { merge: true });
              } catch (cloudErr) {
                console.warn(`[Portal Sync] Cloud sync failed for CPF ${cleanCpf}:`, cloudErr);
              }
            }
          });
          await Promise.all(promises);
        };
        syncToCloud();
      } catch (err) {
        console.warn("Could not save tenants backup:", err);
      }
    }
  }, [tenants, payments, properties]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthReady(true);

      if (u) {
        // Ensure user document exists in Firestore for RBAC
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          let role: "admin" | "tenant" =
            u.email === "dennyancasa@gmail.com" ||
            u.email === "dennayncasa@gmail.com"
              ? "admin"
              : "tenant";

          if (!userDoc.exists()) {
            await setDoc(
              doc(db, "users", u.uid),
              cleanObject({
                email: u.email,
                role: role,
                resetsRemaining: 3,
                createdAt: serverTimestamp(),
              }),
            );
            setUserRole(role);
            setResetsRemaining(3);
          } else {
            const data = userDoc.data();
            let currentResets = data?.resetsRemaining;
            if (currentResets === undefined || currentResets === null) {
              currentResets = 3;
              await setDoc(
                doc(db, "users", u.uid),
                { resetsRemaining: 3 },
                { merge: true }
              );
            }
            setResetsRemaining(currentResets);
            // If the email is in the admin list but the doc says tenant, update it
            if (role === "admin" && data.role !== "admin") {
              await setDoc(
                doc(db, "users", u.uid),
                cleanObject({ role: "admin" }),
                { merge: true },
              );
              setUserRole("admin");
            } else {
              setUserRole(data.role);
            }
          }
        } catch (err) {
          console.error("Error ensuring user document:", err);
          // Fallback context based user role determination for offline/disconnected clients
          let role: "admin" | "tenant" =
            u.email === "dennyancasa@gmail.com" ||
            u.email === "dennayncasa@gmail.com"
              ? "admin"
              : "tenant";
          setUserRole(role);
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
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("the client is offline")
        ) {
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

    const handleListError = (err: any, op: OperationType, path: string) => {
      setLoading(false);
      handleFirestoreError(err, op, path);
    };

    // Fetch all data for the user
    const qProps = query(
      collection(db, "properties"),
      where("ownerId", "==", user.uid),
    );
    const qTenants = query(
      collection(db, "tenants"),
      where("ownerId", "==", user.uid),
    );
    const qExpenses = query(
      collection(db, "expenses"),
      where("ownerId", "==", user.uid),
    );
    const qPayments = query(
      collection(db, "payments"),
      where("ownerId", "==", user.uid),
    );
    const qAgreements = query(
      collection(db, "agreements"),
      where("ownerId", "==", user.uid),
    );
    const qContracts = query(
      collection(db, "contracts"),
      where("ownerId", "==", user.uid),
    );
    const qTickets = query(
      collection(db, "tickets"),
      where("ownerId", "==", user.uid),
    );
    const qStaging = query(
      collection(db, "staging_records"),
      where("ownerId", "==", user.uid),
    );
    const qCustomAlerts = query(
      collection(db, "custom_alerts"),
      where("ownerId", "==", user.uid),
    );
    const qStorages = query(
      collection(db, "storages"),
      where("ownerId", "==", user.uid),
    );

    const unsubProps = onSnapshot(
      qProps,
      (snap) => {
        setProperties(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Property),
        );
      },
      (err) => handleListError(err, OperationType.LIST, "properties"),
    );

    const unsubTenants = onSnapshot(
      qTenants,
      (snap) => {
        setTenants(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tenant));
      },
      (err) => handleListError(err, OperationType.LIST, "tenants"),
    );

    const unsubExpenses = onSnapshot(
      qExpenses,
      (snap) => {
        setExpenses(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense),
        );
      },
      (err) => handleListError(err, OperationType.LIST, "expenses"),
    );

    const unsubPayments = onSnapshot(
      qPayments,
      (snap) => {
        setPayments(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Payment),
        );
        setLoading(false);
      },
      (err) => handleListError(err, OperationType.LIST, "payments"),
    );

    const unsubAgreements = onSnapshot(
      qAgreements,
      (snap) => {
        setAgreements(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Agreement),
        );
      },
      (err) => handleListError(err, OperationType.LIST, "agreements"),
    );

    const unsubContracts = onSnapshot(
      qContracts,
      (snap) => {
        setContracts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Contract),
        );
      },
      (err) => handleListError(err, OperationType.LIST, "contracts"),
    );

    const unsubTickets = onSnapshot(
      qTickets,
      (snap) => {
        setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ticket));
      },
      (err) => handleListError(err, OperationType.LIST, "tickets"),
    );

    const unsubStaging = onSnapshot(
      qStaging,
      (snap) => {
        setStagingRecords(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StagingRecord),
        );
      },
      (err) => handleListError(err, OperationType.LIST, "staging_records"),
    );

    const unsubCustomAlerts = onSnapshot(
      qCustomAlerts,
      (snap) => {
        setCustomAlerts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomAlert),
        );
      },
      (err) => handleListError(err, OperationType.LIST, "custom_alerts"),
    );

    const unsubStorages = onSnapshot(
      qStorages,
      (snap) => {
        setStorages(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StorageSpace),
        );
      },
      (err) => handleListError(err, OperationType.LIST, "storages"),
    );

    return () => {
      unsubProps();
      unsubTenants();
      unsubExpenses();
      unsubPayments();
      unsubAgreements();
      unsubContracts();
      unsubTickets();
      unsubStaging();
      unsubCustomAlerts();
      unsubStorages();
    };
  }, [isAuthReady, user, userRole]);

  
  const backgroundTasksRunUser = useRef<string | null>(null);

  // --- Background Data Tasks (Deduplicate, Generate, Clean, Late Checks) ---
  useEffect(() => {
    if (!user || payments.length === 0 || contracts.length === 0 || properties.length === 0) return;
    if (backgroundTasksRunUser.current === user.uid) return;
    
    // Set to true immediately so we don't double trigger
    backgroundTasksRunUser.current = user.uid;

    const runAllBackgroundTasks = async () => {
      try {
        console.log("Starting background tasks...");
        
        // 1. Deduplicate Primeiro Aluguel
        const groupedFirstRent: Record<string, Payment[]> = {};
        for (const p of payments) {
          if (p.type === "rent" && p.description === "Primeiro Aluguel") {
            const key = `${p.propertyId}_${p.tenantId}`;
            if (!groupedFirstRent[key]) groupedFirstRent[key] = [];
            groupedFirstRent[key].push(p);
          }
        }
        for (const key in groupedFirstRent) {
          if (groupedFirstRent[key].length > 1) {
            const sorted = groupedFirstRent[key].sort((a, b) => {
              if (a.status !== "pending" && b.status === "pending") return -1;
              if (b.status !== "pending" && a.status === "pending") return 1;
              return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            });
            for (let i = 1; i < sorted.length; i++) {
              if (sorted[i].status === "pending") {
                await deleteDoc(doc(db, "payments", sorted[i].id!)).catch(console.error);
              }
            }
          }
        }

        // 2. Generate Monthly Payments
        const activeContracts = contracts.filter((c) => c.status === "active");
        const today = new Date();
        const nextMonthLimit = addMonths(today, 1);

        for (const contract of activeContracts) {
          if (!contract.startDate || !contract.rentValue) continue;

          let currentPeriod = parseISO(contract.startDate);
          const endPeriod = contract.endDate ? parseISO(contract.endDate) : nextMonthLimit;
          const targetEnd = isBefore(endPeriod, nextMonthLimit) ? endPeriod : nextMonthLimit;

          while (
            currentPeriod.getFullYear() < targetEnd.getFullYear() ||
            (currentPeriod.getFullYear() === targetEnd.getFullYear() &&
              currentPeriod.getMonth() <= targetEnd.getMonth())
          ) {
            const year = currentPeriod.getFullYear();
            const month = currentPeriod.getMonth();

            const paymentExists = payments.some((p) => {
              if (
                p.tenantId !== contract.tenantId ||
                p.propertyId !== contract.propertyId ||
                !(p.type === "rent" ||
                  !p.type ||
                  (p.type !== "deposit" && p.type !== "agreement") ||
                  p.description?.toLowerCase().includes("aluguel"))
              ) return false;

              const checkDateStr = (dateStr?: string) => {
                if (!dateStr) return false;
                const parts = dateStr.split('T')[0].split('-');
                if (parts.length >= 2) {
                  return parseInt(parts[0], 10) === year && (parseInt(parts[1], 10) - 1) === month;
                }
                return false;
              };
              return checkDateStr(p.dueDate) || checkDateStr(p.originalDueDate);
            });

            if (!paymentExists) {
              const paymentDay = contract.paymentDay || 5;
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const actualDay = Math.min(paymentDay, daysInMonth);
              const baseDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
              const rentAdj = adjustDateToNextBusinessDay(baseDateStr);

              try {
                await addDoc(collection(db, "payments"), cleanObject({
                  propertyId: contract.propertyId,
                  tenantId: contract.tenantId,
                  amount: contract.rentValue,
                  dueDate: rentAdj.adjustedDate,
                  originalDueDate: rentAdj.wasAdjusted ? rentAdj.originalDate : undefined,
                  status: "pending",
                  ownerId: user.uid,
                  type: "rent",
                  description: "Aluguel Mensal",
                  observations: rentAdj.wasAdjusted ? rentAdj.adjustmentReason : "",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }));
              } catch (err) {
                console.error("Error generating recurring payment:", err);
              }
            }
            currentPeriod = addMonths(currentPeriod, 1);
          }
        }

        // 3. Cleanup Duplicates
        const groupedMonthly: Record<string, Payment[]> = {};
        for (const p of payments) {
          const isRentLike = p.type === "rent" || !p.type || (p.type !== "deposit" && p.type !== "agreement") || p.description?.toLowerCase().includes("aluguel");
          if (isRentLike && p.dueDate) {
            try {
              const parts = p.dueDate.split('T')[0].split('-');
              if (parts.length >= 2) {
                const key = `${p.propertyId}_${p.tenantId}_${parts[0]}_${parseInt(parts[1], 10) - 1}`;
                if (!groupedMonthly[key]) groupedMonthly[key] = [];
                groupedMonthly[key].push(p);
              }
            } catch (e) { }
          }
        }
        for (const key in groupedMonthly) {
          const list = groupedMonthly[key];
          if (list.length > 1) {
            const hasSettled = list.some((p) => p.status === "paid" || p.status === "partial");
            if (hasSettled) {
              const pendings = list.filter((p) => p.status === "pending" || p.status === "late");
              for (const p of pendings) {
                if (p.id) await deleteDoc(doc(db, "payments", p.id)).catch(console.error);
              }
            } else {
              const pendings = list
                .filter((p) => p.status === "pending" || p.status === "late")
                .sort((a, b) => (new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime()));
              for (let i = 1; i < pendings.length; i++) {
                if (pendings[i].id) await deleteDoc(doc(db, "payments", pendings[i].id!)).catch(console.error);
              }
            }
          }
        }

        // 4. Check Late Payments
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const todayDate = parseISO(todayStr);
        for (const p of payments) {
          if (p.status === "pending" || p.status === "late") {
            if (p.dueDate < todayStr) {
              const property = properties.find((pr) => pr.id === p.propertyId);
              const agreement = p.type === "agreement" ? agreements.find((a) => a.id === p.agreementId) : null;
              const contract = contracts.find((c) => c.tenantId === p.tenantId && c.propertyId === p.propertyId && c.status === "active");
              const tenant = tenants.find((t) => t.id === p.tenantId);
              const configSource = agreement || contract || tenant || property;

              let interest = 0;
              if (configSource && configSource.chargeLateFees) {
                const daysLate = differenceInDays(todayDate, parseISO(p.dueDate));
                if (daysLate > 0) {
                  interest = (configSource.lateFeePenalty || 0) + (p.amount * ((configSource.lateFeeDaily || 0) / 100) * daysLate);
                }
              }

              const calculatedInterest = Number(interest.toFixed(2));
              if (p.status === "pending" || p.interestAmount !== calculatedInterest) {
                try {
                  await updateDoc(doc(db, "payments", p.id!), {
                    status: "late",
                    interestAmount: calculatedInterest,
                    updatedAt: new Date().toISOString(),
                  });
                } catch (err) {
                  console.error("Error updating late payment:", err);
                }
              }
            }
          }
        }
        
        console.log("Background tasks complete.");
      } catch (err) {
        console.error("Background tasks failed:", err);
      }
    };

    runAllBackgroundTasks();
  }, [
    user, 
    payments.length > 0, 
    contracts.length > 0, 
    properties.length > 0,
    payments,
    contracts,
    properties,
    agreements,
    tenants
  ]);


  const sidebarItems = useMemo(() => {
    const pendingCount = payments.filter(
      (p) => p.status === "pending" || p.status === "late",
    ).length;
    let alertsCount = 0;
    let alertsHighestPriority: "high" | "medium" | "low" = "low";
    const today = new Date();

    const isSnoozed = (alertId: string) => {
      if (alertSettings.forceShowUntilResolved) return false;
      if (alertId.startsWith("contract-expired-")) return false; // Force show expired contracts until resolved
      const record = snoozedAlerts[alertId];
      if (!record) return false;
      return Date.now() - record.timestamp < (record.duration || 172800000);
    };

    const addAlert = (id: string, priority: "high" | "medium" | "low") => {
      if (isSnoozed(id)) return;
      alertsCount++;
      if (priority === "high") alertsHighestPriority = "high";
      else if (priority === "medium" && alertsHighestPriority !== "high")
        alertsHighestPriority = "medium";
    };

    // 1. Documents and Property Maintenance
    properties.forEach((prop) => {
      if (prop.documents) {
        prop.documents.forEach((doc) => {
          if (doc.status === "expired") {
            addAlert(`doc-exp-${prop.id}-${doc.id}`, "high");
          } else if (doc.status === "missing") {
            addAlert(
              `doc-mis-${prop.id}-${doc.id}`,
              doc.isRequired ? "high" : "medium",
            );
          }
        });
      }
      if (prop.status === "renovation" && prop.updatedAt) {
        const updateDate = parseISO(prop.updatedAt);
        const diffDays = differenceInDays(today, updateDate);
        if (diffDays > 7) {
          addAlert(`prop-maint-${prop.id}`, "medium");
        }
      }
    });

    // 2. Tenants prospect
    const waitingTenants = tenants.filter((t) => t.status === "waiting");
    waitingTenants.forEach((t) => addAlert(`tenant-prospect-${t.id}`, "low"));

    // 3. Late payments
    const todayStr = format(today, "yyyy-MM-dd");
    const latePayments = payments.filter(
      (p) =>
        p.status === "late" || (p.status === "pending" && p.dueDate < todayStr),
    );
    latePayments.forEach((p) => addAlert(`pay-late-${p.id}`, "high"));

    // 4. Upcoming payments (Rent, Deposit, Agreement)
    const nextPayments = payments.filter(
      (p) =>
        (p.type === "agreement" || p.type === "rent" || p.type === "deposit") &&
        p.status === "pending",
    );
    nextPayments.forEach((p) => {
      const dueDate = parseISO(p.dueDate);
      const diffDays = differenceInDays(dueDate, startOfDay(today));
      if (diffDays >= 0 && diffDays <= alertSettings.upcomingRentsDays) {
        // use same exact alert IDs as AlertsView so snoozing works properly
        addAlert(`pay-next-${p.id}`, diffDays <= 1 ? "medium" : "low");
      }
    });

    // 5. Open tickets
    tickets.forEach((ticket) => {
      if (ticket.status === "open" || ticket.status === "in_progress") {
        const created = parseISO(ticket.createdAt || new Date().toISOString());
        const slaDate = addDays(created, ticket.slaDays || 7);
        const daysToSla = differenceInDays(slaDate, today);

        let priority: "high" | "medium" | "low" = "low";
        if (daysToSla < 0) priority = "high";
        else if (daysToSla <= 2) priority = "medium";

        addAlert(`ticket-${ticket.id}`, priority);
      }
    });

    // 5.5 Contract expiration alerts
    contracts.forEach((contract) => {
      if (contract.status === "active" && contract.endDate) {
        const endDate = parseISO(contract.endDate);
        const diffDays = differenceInDays(endDate, startOfDay(today));
        if (diffDays >= 0 && diffDays <= alertSettings.contractsExpiringDays) {
          addAlert(`contract-exp-${contract.id}`, diffDays <= 5 ? "high" : "medium");
        } else if (diffDays < 0) {
          addAlert(`contract-expired-${contract.id}`, "high");
        }
      }
    });

    // 5.6 Storage contract and deposit alerts
    storages.forEach((storage) => {
      if (storage.contractEndDate) {
        const endDate = parseISO(storage.contractEndDate);
        const diffDays = differenceInDays(endDate, startOfDay(today));
        if (diffDays >= 0 && diffDays <= alertSettings.contractsExpiringDays) {
          addAlert(`storage-contract-exp-${storage.id}`, diffDays <= 5 ? "high" : "medium");
        } else if (diffDays < 0) {
          addAlert(`storage-contract-expired-${storage.id}`, "high");
        }

        if (diffDays < 0 && storage.hasDeposit && storage.depositRefundStatus === "pending") {
          addAlert(`storage-deposit-pending-${storage.id}`, "medium");
        }
      }

      // Storage billing alerts
      if (storage.billings && storage.billings.length > 0) {
        storage.billings.forEach((billing) => {
          if (billing.status !== "paid") {
            const dueDate = parseISO(billing.dueDate);
            const diffDays = differenceInDays(dueDate, startOfDay(today));
            if (diffDays < 0) {
              addAlert(`storage-billing-late-${storage.id}-${billing.id}`, "high");
            } else if (diffDays <= 5) {
              addAlert(`storage-billing-near-${storage.id}-${billing.id}`, diffDays <= 1 ? "high" : "medium");
            }
          }
        });
      }
    });

    const items = [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      {
        id: "intelligence_hub",
        label: "Hub Estratégico & Jurídico",
        icon: Sparkles,
      },
      {
        id: "alerts",
        label: "Alertas",
        icon: Bell,
        badge: alertsCount > 0 ? alertsCount : null,
        badgeColor: alertsHighestPriority,
      },
      { id: "properties", label: "Imóveis", icon: Home },
      { id: "tenants", label: "Inquilinos", icon: Users },
      { id: "contracts", label: "Contratos", icon: FileText },
      { id: "receivables", label: "Financeiro", icon: DollarSign },
      { id: "storages", label: "Espaço & Ativos", icon: Warehouse },
      { id: "settings", label: "Configurações", icon: Settings },
    ];

    return items;
  }, [
    payments,
    syncLogs,
    properties,
    tickets,
    tenants,
    snoozedAlerts,
    contracts,
    alertSettings,
    storages,
  ]);

  // --- Actions ---

  useEffect(() => {
    if (confirmingPayment) {
      if (waiveLateFee) {
        setPaymentAmountInput(confirmingPayment.amount);
      } else {
        const property = properties.find(
          (p) => p.id === confirmingPayment.propertyId,
        );
        const agreement =
          confirmingPayment.type === "agreement"
            ? agreements.find((a) => a.id === confirmingPayment.agreementId)
            : null;
        const contract = contracts.find(
          (c) =>
            c.tenantId === confirmingPayment.tenantId &&
            c.propertyId === confirmingPayment.propertyId &&
            c.status === "active",
        );

        const tenant = tenants.find((t) => t.id === confirmingPayment.tenantId);
        // Prioritize agreement, then contract, then tenant, then fallback to property (for older entries)
        const configSource = agreement || contract || tenant || property;

        const today = new Date();
        const dueDate = parseISO(confirmingPayment.dueDate);
        const isLate =
          differenceInDays(startOfDay(today), startOfDay(dueDate)) > 0;

        if (configSource && configSource.chargeLateFees && isLate) {
          const daysLate = differenceInDays(
            startOfDay(today),
            startOfDay(dueDate),
          );
          let interest = 0;
          if (daysLate > 0) {
            interest =
              (configSource.lateFeePenalty || 0) +
              confirmingPayment.amount *
                ((configSource.lateFeeDaily || 0) / 100) *
                daysLate;
          }
          setPaymentAmountInput(
            Number((confirmingPayment.amount + interest).toFixed(2)),
          );
        } else {
          setPaymentAmountInput(confirmingPayment.amount);
        }
      }
    } else {
      setPaymentAmountInput(0);
    }
  }, [confirmingPayment, properties, agreements, waiveLateFee]);

  const getNextDueDate = (day: number) => {
    const today = startOfDay(new Date());
    let dueDate = setDate(today, day);
    if (isBefore(dueDate, today)) {
      dueDate = addMonths(dueDate, 1);
    }
    return format(dueDate, "yyyy-MM-dd");
  };

  const getDepositDueDate = (day: number, monthOffset: number = 0) => {
    const today = startOfDay(new Date());
    let dueDate = setDate(today, day);
    if (monthOffset > 0 || isBefore(dueDate, today)) {
      dueDate = addMonths(
        dueDate,
        monthOffset + (isBefore(dueDate, today) && monthOffset === 0 ? 1 : 0),
      );
    }
    return format(dueDate, "yyyy-MM-dd");
  };

  const addProperty = async (data: Partial<Property>) => {
    if (!user) return;
    try {
      const docRef = await addDoc(
        collection(db, "properties"),
        cleanObject({
          ...data,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );

      // If created as rented with a tenant, update the tenant
      if (data.status === "rented" && data.currentTenantId) {
        await updateDoc(
          doc(db, "tenants", data.currentTenantId),
          cleanObject({
            status: "allocated",
            propertyId: docRef.id,
            updatedAt: new Date().toISOString(),
          }),
        );
      }
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "properties");
    }
  };

  const updateProperty = async (id: string, data: Partial<Property>) => {
    try {
      const oldProp = properties.find((p) => p.id === id);
      await updateDoc(
        doc(db, "properties", id),
        cleanObject({
          ...data,
          updatedAt: new Date().toISOString(),
        }),
      );

      // Handle tenant status change if property status changed to rented
      if (data.status === "rented" && data.currentTenantId) {
        if (
          oldProp?.currentTenantId !== data.currentTenantId ||
          oldProp?.status !== "rented"
        ) {
          // Update new tenant
          await updateDoc(
            doc(db, "tenants", data.currentTenantId),
            cleanObject({
              status: "allocated",
              propertyId: id,
              updatedAt: new Date().toISOString(),
            }),
          );

          // If there was a previous tenant, update them to waiting
          if (
            oldProp?.currentTenantId &&
            oldProp.currentTenantId !== data.currentTenantId
          ) {
            await updateDoc(doc(db, "tenants", oldProp.currentTenantId), {
              status: "waiting",
              propertyId: "",
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } else if (
        data.status !== "rented" &&
        oldProp?.status === "rented" &&
        oldProp?.currentTenantId
      ) {
        // Property was rented but now is not, update tenant to waiting
        await updateDoc(doc(db, "tenants", oldProp.currentTenantId), {
          status: "waiting",
          propertyId: "",
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `properties/${id}`);
    }
  };

  const deleteProperty = async (id: string) => {
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const property = properties.find((p) => p.id === id);

      // Update the current tenant if linked
      if (property?.currentTenantId) {
        batch.update(doc(db, "tenants", property.currentTenantId), {
          status: "waiting",
          propertyId: "",
          updatedAt: new Date().toISOString(),
        });
      }

      // Archive any linked contracts
      contracts
        .filter((c) => c.propertyId === id && c.status !== "archived")
        .forEach((c) => {
          batch.update(doc(db, "contracts", c.id!), {
            status: "archived",
            updatedAt: new Date().toISOString(),
          });
        });

      // Save property name snapshots on financials
      if (property?.name) {
        expenses
          .filter((e) => e.propertyId === id)
          .forEach((e) =>
            batch.update(doc(db, "expenses", e.id!), {
              propertyNameSnapshot: property.name,
            }),
          );
        payments
          .filter((p) => p.propertyId === id)
          .forEach((p) =>
            batch.update(doc(db, "payments", p.id!), {
              propertyNameSnapshot: property.name,
            }),
          );
        agreements
          .filter((a) => a.propertyId === id)
          .forEach((a) =>
            batch.update(doc(db, "agreements", a.id!), {
              propertyNameSnapshot: property.name,
            }),
          );
      }

      // Cancelar todos os pagamentos PENDENTES deste imóvel (opcional, mas seguro)
      payments
        .filter(
          (p) =>
            p.propertyId === id && p.status === "pending" && p.type === "rent",
        )
        .forEach((p) => {
          batch.update(doc(db, "payments", p.id!), {
            status: "cancelled",
            updatedAt: new Date().toISOString(),
          });
        });

      // Delete the property itself
      batch.delete(doc(db, "properties", id));

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `properties/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpense = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "expenses", id));
      toast.success("Despesa excluída com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addStagingRecord = async (data: Partial<StagingRecord>) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "staging_records"), {
        ...data,
        ownerId: user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Backup adicionado ao arquivo morto!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "staging_records");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteStagingRecord = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "staging_records", id));
      toast.success("Registro excluído do arquivo morto!");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `staging_records/${id}`);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const activateStagingRecord = async (record: StagingRecord) => {
    if (!user || !record.id) return;
    setIsSubmitting(true);
    try {
      const parsed =
        typeof record.parsedData === "string"
          ? JSON.parse(record.parsedData)
          : record.parsedData;
      if (!Array.isArray(parsed) || parsed.length < 2) {
        toast.error("Formato de dados inválido ou vazio para ativação.");
        return;
      }

      let batch = writeBatch(db);
      let importedCount = 0;
      let operations = 0;

      for (let i = 1; i < parsed.length; i++) {
        const row = parsed[i];
        if (!row || !row[0]) continue;

        const tenantName = row[0];
        const propertyName = row[1];
        let rentValue = 0;
        if (row[2] && row[2] !== "-") {
          const numStr = String(row[2])
            .replace(/[^\d.,]/g, "")
            .replace(",", ".");
          rentValue = parseFloat(numStr) || 0;
        }
        const address = row[3] !== "-" ? String(row[3]).trim() : "";
        const occupancyDate = row[4] !== "-" ? String(row[4]).trim() : "";
        const paymentsInfo =
          row[5] && row[5] !== "-" ? String(row[5]).trim() : "";
        const expenses = row[6] && row[6] !== "-" ? String(row[6]).trim() : "";

        const propRef = doc(collection(db, "properties"));
        const tenantRef = doc(collection(db, "tenants"));

        const hasValidProp = propertyName && propertyName !== "-";
        const hasValidTenant = tenantName && tenantName !== "-";

        if (!hasValidProp && !hasValidTenant) continue;

        if (hasValidProp) {
          const propertyData = cleanObject({
            name: hasValidProp
              ? String(propertyName).trim() || `Imóvel Importado ${i}`
              : `Imóvel Importado ${i}`,
            address: address,
            rentValue: rentValue,
            status: hasValidTenant ? "rented" : "vacant",
            paymentDay: 10,
            currentTenantId: hasValidTenant ? tenantRef.id : "",
            ownerId: user.uid,
            renovationJustification: expenses
              ? `Gastos e Manutenções: ${expenses}`
              : "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          batch.set(propRef, propertyData);
          operations++;
        }

        if (hasValidTenant) {
          const tenantData = cleanObject({
            name: hasValidTenant
              ? String(tenantName).trim() || `Inquilino Importado ${i}`
              : `Inquilino Importado ${i}`,
            status: hasValidProp ? "allocated" : "waiting",
            propertyId: hasValidProp ? propRef.id : "",
            contact: occupancyDate
              ? `Histórico de ocupação: ${occupancyDate}`
              : "",
            observations: paymentsInfo
              ? `Pagamentos e Histórico: ${paymentsInfo}`
              : "",
            ownerId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          batch.set(tenantRef, tenantData);
          operations++;
        }

        importedCount++;

        if (operations > 450) {
          await batch.commit();
          batch = writeBatch(db);
          operations = 0;
        }
      }

      const recordRef = doc(db, "staging_records", record.id);
      batch.update(recordRef, {
        status: "imported",
        updatedAt: new Date().toISOString(),
      });

      await batch.commit();
      toast.success(
        `${importedCount} registros ativados no sistema com sucesso!`,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "bulk_import");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTenant = async (data: Partial<Tenant>) => {
    if (!user) return;

    // Check if property is in renovation
    if (data.status === "allocated" && data.propertyId) {
      const property = properties.find((p) => p.id === data.propertyId);
      if (property?.status === "renovation") {
        const confirm = window.confirm(
          "Este imóvel está em reforma. Tem certeza que deseja alugá-lo?",
        );
        if (!confirm) return;
      }
    }

    try {
      const docRef = await addDoc(
        collection(db, "tenants"),
        cleanObject({
          ...data,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );

      // If created as allocated with a property, update the property
      if (data.status === "allocated" && data.propertyId) {
        await updateDoc(
          doc(db, "properties", data.propertyId),
          cleanObject({
            status: "rented",
            currentTenantId: docRef.id,
            rentValue: data.rentValue,
            paymentDay: data.paymentDay,
            chargeLateFees: data.chargeLateFees,
            lateFeePenalty: data.lateFeePenalty,
            lateFeeDaily: data.lateFeeDaily,
            lateFeeType: data.lateFeeType,
            updatedAt: new Date().toISOString(),
          }),
        );

        const dueDate = data.firstRentDueDate
          ? data.firstRentDueDate
          : data.paymentDay
            ? getNextDueDate(data.paymentDay)
            : format(addDays(new Date(), 30), "yyyy-MM-dd");

        // Automatically create a Contract document
        const startDateStr = data.startDate || format(new Date(), "yyyy-MM-dd");
        const months = data.leaseDurationMonths || 12;
        const endDateStr =
          data.endDate ||
          format(addMonths(parseISO(startDateStr), months), "yyyy-MM-dd");

        const contractData = {
          tenantId: docRef.id,
          propertyId: data.propertyId,
          startDate: startDateStr,
          endDate: endDateStr,
          leaseDurationMonths: months,
          rentValue: data.rentValue || 0,
          paymentDay: data.paymentDay || 1,
          chargeLateFees: !!data.chargeLateFees,
          lateFeePenalty: data.chargeLateFees ? data.lateFeePenalty : undefined,
          lateFeeDaily: data.chargeLateFees ? data.lateFeeDaily : undefined,
          lateFeeType: data.chargeLateFees
            ? data.lateFeeType || "percentage"
            : undefined,
          depositValue:
            data.initialPaymentType === "deposit"
              ? data.depositValue
              : undefined,
          depositInstallments:
            data.initialPaymentType === "deposit"
              ? data.depositInstallments
              : undefined,
          depositDay:
            data.initialPaymentType === "deposit"
              ? data.depositDueDate
                ? Number(data.depositDueDate.split("-")[2])
                : data.paymentDay
              : undefined,
          observations: data.observations,
          status: "active",
          contractFile: (data as any).contractFile,
          evidenceName: (data as any).evidenceName,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addDoc(collection(db, "contracts"), cleanObject(contractData));

        // 1. Rent entry (Revenue)
        const rentAdj = adjustDateToNextBusinessDay(dueDate);
        await addDoc(
          collection(db, "payments"),
          cleanObject({
            propertyId: data.propertyId,
            tenantId: docRef.id,
            amount: data.rentValue || 0,
            dueDate: rentAdj.adjustedDate,
            originalDueDate: rentAdj.wasAdjusted
              ? rentAdj.originalDate
              : undefined,
            status: "pending",
            ownerId: user.uid,
            type: "rent",
            description: "Primeiro Aluguel",
            observations: rentAdj.wasAdjusted ? rentAdj.adjustmentReason : "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        );

        // 2. Deposit Entry if configured
        if (
          data.initialPaymentType === "deposit" &&
          data.depositValue &&
          data.depositValue > 0
        ) {
          const installments = data.depositInstallments || 1;
          const installmentValue = data.depositValue / installments;

          let depositStartDate = data.depositDueDate;
          if (!depositStartDate) {
            depositStartDate = dueDate;
          }

          for (let i = 0; i < installments; i++) {
            const currentObjDate = parseISO(depositStartDate);
            currentObjDate.setMonth(currentObjDate.getMonth() + i);
            const installmentDueDate = format(currentObjDate, "yyyy-MM-dd");
            const depAdj = adjustDateToNextBusinessDay(installmentDueDate);

            await addDoc(
              collection(db, "payments"),
              cleanObject({
                propertyId: data.propertyId,
                tenantId: docRef.id,
                amount: installmentValue,
                dueDate: depAdj.adjustedDate,
                originalDueDate: depAdj.wasAdjusted
                  ? depAdj.originalDate
                  : undefined,
                status: "pending",
                depositStatus: "pending",
                ownerId: user.uid,
                type: "deposit",
                installmentNumber: i + 1,
                totalInstallments: installments,
                description:
                  installments > 1
                    ? `Caução (Parcela ${i + 1}/${installments})`
                    : "Depósito Caução (Garantia)",
                observations: depAdj.wasAdjusted ? depAdj.adjustmentReason : "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }),
            );
          }
        }
      }
      toast.success("Inquilino cadastrado com sucesso!");
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "tenants");
    }
  };

  const updateTenant = async (id: string, data: Partial<Tenant>) => {
    try {
      const oldTenant = tenants.find((t) => t.id === id);
      await updateDoc(
        doc(db, "tenants", id),
        cleanObject({
          ...data,
          updatedAt: new Date().toISOString(),
        }),
      );

      // Handle property status change if tenant status changed to allocated
      if (data.status === "allocated" && data.propertyId) {
        if (
          oldTenant?.propertyId !== data.propertyId ||
          oldTenant?.status !== "allocated"
        ) {
          const property = properties.find((p) => p.id === data.propertyId);
          // Update new property
          await updateDoc(
            doc(db, "properties", data.propertyId),
            cleanObject({
              status: "rented",
              currentTenantId: id,
              rentValue:
                data.rentValue !== undefined
                  ? data.rentValue
                  : oldTenant?.rentValue,
              paymentDay:
                data.paymentDay !== undefined
                  ? data.paymentDay
                  : oldTenant?.paymentDay,
              chargeLateFees:
                data.chargeLateFees !== undefined
                  ? data.chargeLateFees
                  : oldTenant?.chargeLateFees,
              lateFeePenalty:
                data.lateFeePenalty !== undefined
                  ? data.lateFeePenalty
                  : oldTenant?.lateFeePenalty,
              lateFeeDaily:
                data.lateFeeDaily !== undefined
                  ? data.lateFeeDaily
                  : oldTenant?.lateFeeDaily,
              lateFeeType:
                data.lateFeeType !== undefined
                  ? data.lateFeeType
                  : oldTenant?.lateFeeType,
              updatedAt: new Date().toISOString(),
            }),
          );

          // If there was a previous property, update it to vacant
          if (
            oldTenant?.propertyId &&
            oldTenant.propertyId !== data.propertyId
          ) {
            await updateDoc(
              doc(db, "properties", oldTenant.propertyId),
              cleanObject({
                status: "vacant",
                currentTenantId: "",
                updatedAt: new Date().toISOString(),
              }),
            );
          }

          // Create initial payment if status changed to allocated
          if (oldTenant?.status !== "allocated") {
            const dueDate = data.firstRentDueDate
              ? data.firstRentDueDate
              : data.paymentDay
                ? getNextDueDate(data.paymentDay)
                : format(addDays(new Date(), 30), "yyyy-MM-dd");

            // Automatically create a Contract document
            const startDateStr = format(new Date(), "yyyy-MM-dd");
            const months =
              data.leaseDurationMonths !== undefined
                ? data.leaseDurationMonths
                : oldTenant?.leaseDurationMonths || 12;
            const endDateStr = format(
              addMonths(parseISO(startDateStr), months),
              "yyyy-MM-dd",
            );

            const contractData = {
              tenantId: id,
              propertyId: data.propertyId,
              startDate: startDateStr,
              endDate: endDateStr,
              leaseDurationMonths: months,
              rentValue: data.rentValue || 0,
              paymentDay: data.paymentDay || 1,
              chargeLateFees: !!data.chargeLateFees,
              lateFeePenalty: data.chargeLateFees
                ? data.lateFeePenalty
                : undefined,
              lateFeeDaily: data.chargeLateFees ? data.lateFeeDaily : undefined,
              lateFeeType: data.chargeLateFees
                ? data.lateFeeType || "percentage"
                : undefined,
              depositValue:
                data.initialPaymentType === "deposit"
                  ? data.depositValue
                  : undefined,
              depositInstallments:
                data.initialPaymentType === "deposit"
                  ? data.depositInstallments
                  : undefined,
              depositDay:
                data.initialPaymentType === "deposit"
                  ? data.depositDueDate
                    ? Number(data.depositDueDate.split("-")[2])
                    : data.paymentDay
                  : undefined,
              observations: data.observations,
              status: "active",
              ownerId: user?.uid,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            if (user?.uid) {
              await addDoc(
                collection(db, "contracts"),
                cleanObject(contractData),
              );
            }

            // 1. Rent entry
            const rentAdj = adjustDateToNextBusinessDay(dueDate);
            await addDoc(
              collection(db, "payments"),
              cleanObject({
                propertyId: data.propertyId,
                tenantId: id,
                amount: data.rentValue || 0,
                dueDate: rentAdj.adjustedDate,
                originalDueDate: rentAdj.wasAdjusted
                  ? rentAdj.originalDate
                  : undefined,
                status: "pending",
                ownerId: user?.uid,
                type: "rent",
                description: "Primeiro Aluguel",
                observations: rentAdj.wasAdjusted
                  ? rentAdj.adjustmentReason
                  : "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }),
            );

            // 2. Deposit entry if exists
            if (
              data.initialPaymentType === "deposit" &&
              data.depositValue &&
              data.depositValue > 0
            ) {
              const installments = data.depositInstallments || 1;
              const installmentValue = data.depositValue / installments;

              let depositStartDate = data.depositDueDate;
              if (!depositStartDate) {
                depositStartDate = dueDate;
              }

              for (let i = 0; i < installments; i++) {
                const currentObjDate = parseISO(depositStartDate);
                currentObjDate.setMonth(currentObjDate.getMonth() + i);
                const installmentDueDate = format(currentObjDate, "yyyy-MM-dd");
                const depAdj = adjustDateToNextBusinessDay(installmentDueDate);

                await addDoc(
                  collection(db, "payments"),
                  cleanObject({
                    propertyId: data.propertyId,
                    tenantId: id,
                    amount: installmentValue,
                    dueDate: depAdj.adjustedDate,
                    originalDueDate: depAdj.wasAdjusted
                      ? depAdj.originalDate
                      : undefined,
                    status: "pending",
                    depositStatus: "pending",
                    ownerId: user?.uid,
                    type: "deposit",
                    installmentNumber: i + 1,
                    totalInstallments: installments,
                    description:
                      installments > 1
                        ? `Caução (Parcela ${i + 1}/${installments})`
                        : "Depósito Caução (Garantia)",
                    observations: depAdj.wasAdjusted
                      ? depAdj.adjustmentReason
                      : "",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }),
                );
              }
            }
          }
        }
      } else if (
        data.status !== "allocated" &&
        oldTenant?.status === "allocated" &&
        oldTenant?.propertyId
      ) {
        // Tenant was allocated but now is not, update property to vacant
        await updateDoc(
          doc(db, "properties", oldTenant.propertyId),
          cleanObject({
            status: "vacant",
            currentTenantId: "",
            updatedAt: new Date().toISOString(),
          }),
        );
      }
      
      if (data.status === "archived" && oldTenant?.status !== "archived") {
        const activeContracts = contracts.filter(c => c.tenantId === id && c.status === "active");
        for (const c of activeContracts) {
          if (c.id) {
            await updateDoc(doc(db, "contracts", c.id), {
              status: "archived",
              updatedAt: new Date().toISOString()
            });
          }
        }
        
        const pendingRents = payments.filter(p => p.tenantId === id && p.status === "pending" && p.type === "rent");
        for (const p of pendingRents) {
          if (p.id) {
            await updateDoc(doc(db, "payments", p.id), {
              status: "cancelled",
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      if (
        data.status === "archived" &&
        data._createRefundReminder &&
        (oldTenant?.depositBalance || 0) > 0
      ) {
        await addDoc(
          collection(db, "expenses"),
          cleanObject({
            propertyId: oldTenant?.propertyId || "",
            description: `Devolução de Caução - Inquilino ${oldTenant?.name}`,
            amount: oldTenant?.depositBalance,
            date: format(new Date(), "yyyy-MM-dd"),
            type: "other",
            status: "pending",
            ownerId: user?.uid,
            createdAt: new Date().toISOString(),
          }),
        );
        toast.success(
          `Uma despesa de devolução foi criada no valor de R$ ${(oldTenant?.depositBalance || 0).toFixed(2)}`,
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tenants/${id}`);
    }
  };

  const handleAddAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !agreementForm.tenantId) return;
    setIsSubmitting(true);

    try {
      const tenant = tenants.find((t) => t.id === agreementForm.tenantId);
      if (!tenant) return;

      const duration = agreementForm.durationMonths || 1;
      const totalAmount = agreementForm.totalAmount || 0;
      const installmentAmount = totalAmount / duration;
      const batch = writeBatch(db);

      if (agreementForm.id) {
        // Update existing agreement
        const agreementRef = doc(db, "agreements", agreementForm.id);
        batch.update(
          agreementRef,
          cleanObject({
            tenantId: agreementForm.tenantId,
            propertyId: tenant.propertyId || "",
            description: agreementForm.description,
            totalAmount,
            installmentAmount,
            durationMonths: duration,
            startDate: agreementForm.startDate,
            justification: agreementForm.justification,
            evidence: agreementForm.evidence,
            evidenceName: agreementForm.evidenceName,
            evidenceLocation: agreementForm.evidenceLocation,
            chargeLateFees: agreementForm.chargeLateFees,
            lateFeePenalty: agreementForm.lateFeePenalty,
            lateFeeDaily: agreementForm.lateFeeDaily,
            lateFeeType: agreementForm.lateFeeType,
            updatedAt: new Date().toISOString(),
          }),
        );

        // Handle payments: delete non-paid and recreate them based on new duration/start date
        const paidPayments = payments.filter(
          (p) =>
            p.agreementId === agreementForm.id &&
            (p.status === "paid" || p.status === "partial"),
        );
        const paidCount = paidPayments.length;
        const toDeletePayments = payments.filter(
          (p) =>
            p.agreementId === agreementForm.id &&
            (p.status === "pending" || p.status === "late"),
        );

        // Update descriptions of PAID payments to keep consistency
        for (const p of paidPayments) {
          if (p.id) {
            const pRef = doc(db, "payments", p.id);
            const installmentIndex =
              p.description?.match(/\((\d+)\//)?.[1] || "1";
            batch.update(pRef, {
              description: `${agreementForm.description} (${installmentIndex}/${duration})`,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // Delete old pending/late payments
        for (const p of toDeletePayments) {
          if (p.id) {
            const pRef = doc(db, "payments", p.id);
            batch.delete(pRef);
          }
        }

        // Create new pending payments
        const startDate = parseISO(
          agreementForm.startDate || format(new Date(), "yyyy-MM-dd"),
        );
        const newPaymentDay = startDate.getDate();

        // Sync with property if it's a rent-related agreement or if requested
        if (tenant.propertyId) {
          const propRef = doc(db, "properties", tenant.propertyId);
          const isRentRelated = agreementForm.description
            ?.toLowerCase()
            .includes("aluguel");

          if (isRentRelated) {
            batch.update(propRef, {
              paymentDay: newPaymentDay,
              rentValue: installmentAmount,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        for (let i = paidCount; i < duration; i++) {
          const dueDate = addMonths(startDate, i);
          const newPaymentRef = doc(collection(db, "payments"));
          batch.set(newPaymentRef, {
            propertyId: tenant.propertyId || "",
            tenantId: agreementForm.tenantId,
            amount: installmentAmount,
            dueDate: format(dueDate, "yyyy-MM-dd"),
            status: "pending",
            ownerId: user.uid,
            type: "agreement",
            description: `${agreementForm.description} (${i + 1}/${duration})`,
            agreementId: agreementForm.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        await batch.commit();
        toast.success("Acordo atualizado com sucesso!");
      } else {
        // 1. Create the agreement document
        const agreementRef = doc(collection(db, "agreements"));
        batch.set(
          agreementRef,
          cleanObject({
            tenantId: agreementForm.tenantId,
            propertyId: tenant.propertyId || "",
            description: agreementForm.description,
            totalAmount,
            installmentAmount,
            durationMonths: duration,
            startDate: agreementForm.startDate,
            status: "active",
            evidence: agreementForm.evidence,
            evidenceName: agreementForm.evidenceName,
            evidenceLocation: agreementForm.evidenceLocation,
            chargeLateFees: agreementForm.chargeLateFees,
            lateFeePenalty: agreementForm.lateFeePenalty,
            lateFeeDaily: agreementForm.lateFeeDaily,
            lateFeeType: agreementForm.lateFeeType,
            ownerId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        );

        // 2. Generate recurring payments
        const startDate = parseISO(
          agreementForm.startDate || format(new Date(), "yyyy-MM-dd"),
        );
        const newPaymentDay = startDate.getDate();

        // Sync with property if it's a rent-related agreement
        if (tenant.propertyId) {
          const propRef = doc(db, "properties", tenant.propertyId);
          const isRentRelated = agreementForm.description
            ?.toLowerCase()
            .includes("aluguel");

          if (isRentRelated) {
            batch.update(
              propRef,
              cleanObject({
                paymentDay: newPaymentDay,
                rentValue: installmentAmount,
                updatedAt: new Date().toISOString(),
              }),
            );
          }
        }

        for (let i = 0; i < duration; i++) {
          const dueDate = addMonths(startDate, i);
          const newPaymentRef = doc(collection(db, "payments"));
          batch.set(
            newPaymentRef,
            cleanObject({
              propertyId: tenant.propertyId || "",
              tenantId: agreementForm.tenantId,
              amount: installmentAmount,
              dueDate: format(dueDate, "yyyy-MM-dd"),
              status: "pending",
              ownerId: user.uid,
              type: "agreement",
              description: `${agreementForm.description} (${i + 1}/${duration})`,
              agreementId: agreementRef.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          );
        }

        await batch.commit();
        toast.success("Acordo criado com sucesso!");
      }

      setIsAgreementModalOpen(false);
      setAgreementForm({
        tenantId: "",
        description: "",
        totalAmount: 0,
        installmentAmount: 0,
        durationMonths: 1,
        startDate: format(new Date(), "yyyy-MM-dd"),
        justification: "",
        evidence: "",
        evidenceName: "",
        evidenceLocation: "",
        thumbnailLink: "",
        chargeLateFees: false,
        lateFeePenalty: 10,
        lateFeeDaily: 0.33,
        lateFeeType: "percentage",
      });
    } catch (err) {
      handleFirestoreError(
        err,
        agreementForm.id ? OperationType.UPDATE : OperationType.CREATE,
        "agreements",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const archiveAgreement = async (
    agreement: Agreement,
    justification: string,
    action: "archived" | "deleted",
  ) => {
    if (!user || !agreement.id) return;
    setIsSubmitting(true);

    try {
      // 1. Update agreement status
      await updateDoc(
        doc(db, "agreements", agreement.id),
        cleanObject({
          status: action,
          justification,
          updatedAt: new Date().toISOString(),
        }),
      );

      // 2. Cancel pending payments linked to this agreement
      const pendingPayments = payments.filter(
        (p) => p.agreementId === agreement.id && p.status === "pending",
      );
      for (const p of pendingPayments) {
        if (p.id) {
          await updateDoc(
            doc(db, "payments", p.id),
            cleanObject({
              status: "cancelled",
              observations: `Acordo ${action === "archived" ? "arquivado" : "excluído"}: ${justification}`,
              updatedAt: new Date().toISOString(),
            }),
          );
        }
      }

      setIsArchiveAgreementModalOpen(false);
      setArchivingAgreement(null);
      setArchiveJustification("");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `agreements/${agreement.id}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackupSystem = async () => {
    if (!user) return;

    if (resetConfirmText.trim().toLowerCase() !== user.email?.toLowerCase()) {
      toast.error(
        "Para confirmar o backup, digite seu e-mail exatamente como aparece no sistema.",
      );
      return;
    }

    if (!resetReason || resetReason.length < 10) {
      toast.error(
        "Por favor, informe um motivo válido longo e detalhado (mínimo 10 caracteres).",
      );
      return;
    }

    setLoading(true);
    try {
      const collections = [
        "properties",
        "tenants",
        "expenses",
        "payments",
        "agreements",
        "contracts",
        "tickets",
      ];

      setBackupStepMsg("Organizando dados para backup...");

      const systemData: any = {};
      const allDocsToProcess: { coll: string; id: string; data: any }[] = [];

      for (const collName of collections) {
        let q = query(
          collection(db, collName),
          where("ownerId", "==", user.uid),
        );
        const snap = await getDocs(q);
        systemData[collName] = snap.docs.length;
        snap.docs.forEach((d) => {
          allDocsToProcess.push({ coll: collName, id: d.id, data: d.data() });
        });
      }

      systemData.payments = { count: systemData.payments || 0 };

      // Generating Gemini Report
      setBackupStepMsg("Gerando relatório com Inteligência Artificial...");
      const summaryText = await generateBackupSummary(systemData, resetReason);

      // Generating JSON Payload
      setBackupStepMsg("Gerando pacote compactado (JSON)...");
      const backupPayload = JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          reason: resetReason,
          summary: summaryText,
          data: allDocsToProcess,
        },
        null,
        2,
      );

      // Generating PDF
      setBackupStepMsg("Montando Relatório de Dados (PDF)...");
      const docPdf = new jsPDF();
      docPdf.setFontSize(16);
      docPdf.text("Relatório de Backup", 20, 20);
      docPdf.setFontSize(10);
      docPdf.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, 30);
      docPdf.text(`Motivo: ${resetReason}`, 20, 40);

      const splitText = docPdf.splitTextToSize(summaryText, 170);
      docPdf.text(splitText, 20, 50);

      const pdfBlob = docPdf.output("blob");
      const pdfBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(pdfBlob);
      });

      const jsonBlob = new Blob([backupPayload], { type: "application/json" });
      const jsonBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(jsonBlob);
      });

      if (isDriveConnected && uploadToDrive) {
        try {
          setBackupStepMsg("Enviando arquivos para o Google Drive...");
          await uploadToDrive(
            `Backup_Relatorio_${Date.now()}.pdf`,
            pdfBase64,
            "application/pdf",
            "Gerente imobiliário Backups",
            "receipt",
          );
          await uploadToDrive(
            `Backup_Dados_${Date.now()}.json`,
            jsonBase64,
            "application/json",
            "Gerente imobiliário Backups",
            "receipt",
          );
        } catch (driveErr) {
          console.error(
            "[Backup] Google Drive backup failed. Falling back to browser downloads.",
            driveErr,
          );
          toast.error("Upload falhou. Iniciando download local.");

          const urlJSON = URL.createObjectURL(jsonBlob);
          const aJSON = document.createElement("a");
          aJSON.href = urlJSON;
          aJSON.download = `Backup_Dados_${Date.now()}.json`;
          aJSON.click();

          const urlPDF = URL.createObjectURL(pdfBlob);
          const aPDF = document.createElement("a");
          aPDF.href = urlPDF;
          aPDF.download = `Backup_Relatorio_${Date.now()}.pdf`;
          aPDF.click();
        }
      } else {
        const urlJSON = URL.createObjectURL(jsonBlob);
        const aJSON = document.createElement("a");
        aJSON.href = urlJSON;
        aJSON.download = `Backup_Dados_${Date.now()}.json`;
        aJSON.click();

        const urlPDF = URL.createObjectURL(pdfBlob);
        const aPDF = document.createElement("a");
        aPDF.href = urlPDF;
        aPDF.download = `Backup_Relatorio_${Date.now()}.pdf`;
        aPDF.click();
      }

      toast.success("Backup Inteligente gerado e salvo com sucesso!");
      setIsBackupModalOpen(false);
      setBackupStepMsg("");
      setResetReason("");
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "system-backup");
    } finally {
      setLoading(false);
      setBackupStepMsg("");
    }
  };

  const resetSystemData = async () => {
    if (!user) return;

    if (resetConfirmText.trim().toLowerCase() !== user.email?.toLowerCase()) {
      toast.error(
        "Para confirmar o reset, digite seu e-mail exatamente como aparece no sistema.",
      );
      return;
    }

    if (!resetReason || resetReason.length < 10) {
      toast.error(
        "Por favor, informe um motivo válido longo e detalhado (mínimo 10 caracteres).",
      );
      return;
    }

    setLoading(true);
    try {
      const collections = [
        "properties",
        "tenants",
        "expenses",
        "payments",
        "agreements",
        "contracts",
        "tickets",
        "custom_alerts",
        "storages",
        "staging_records",
      ];

      setBackupStepMsg("Organizando dados históricos...");

      // Gathering current snapshot data
      const systemData: any = {};
      const allDocsToProcess: { coll: string; id: string; data: any }[] = [];
      const batchLimit = 500;

      for (const collName of collections) {
        let q = query(
          collection(db, collName),
          where("ownerId", "==", user.uid),
        );
        const snap = await getDocs(q);
        systemData[collName] = snap.docs.length;
        snap.docs.forEach((d) => {
          allDocsToProcess.push({ coll: collName, id: d.id, data: d.data() });
        });
      }

      systemData.payments = { count: systemData.payments || 0 };

      // Generating Gemini Report
      setBackupStepMsg(
        "Gerando relatório final com Inteligência Artificial...",
      );
      const summaryText = await generateBackupSummary(systemData, resetReason);

      // Generating JSON Payload
      setBackupStepMsg("Gerando pacote compactado (JSON)...");
      const backupPayload = JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          reason: resetReason,
          summary: summaryText,
          data: allDocsToProcess,
        },
        null,
        2,
      );

      // Generating PDF
      setBackupStepMsg("Montando Ata de Encerramento (PDF)...");
      const docPdf = new jsPDF();
      docPdf.setFontSize(16);
      docPdf.text("Ata de Encerramento e Backup", 20, 20);
      docPdf.setFontSize(10);
      docPdf.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, 30);
      docPdf.text(`Motivo: ${resetReason}`, 20, 40);

      const splitText = docPdf.splitTextToSize(summaryText, 170);
      docPdf.text(splitText, 20, 50);

      const pdfBlob = docPdf.output("blob");
      const pdfBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(pdfBlob);
      });

      const jsonBlob = new Blob([backupPayload], { type: "application/json" });
      const jsonBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(jsonBlob);
      });

      if (isDriveConnected && uploadToDrive) {
        try {
          setBackupStepMsg("Enviando arquivos para o Google Drive...");
          await uploadToDrive(
            `Backup_Relatorio_${Date.now()}.pdf`,
            pdfBase64,
            "application/pdf",
            "Gerente imobiliário Backups",
            "receipt",
          );
          await uploadToDrive(
            `Backup_Dados_${Date.now()}.json`,
            jsonBase64,
            "application/json",
            "Gerente imobiliário Backups",
            "receipt",
          );
        } catch (driveErr) {
          console.error(
            "[Reset] Google Drive backup failed. Falling back to browser downloads.",
            driveErr,
          );
          toast.error(
            "O upload de backup no Google Drive falhou. Iniciando download dos arquivos localmente no navegador por segurança.",
          );

          // Fallback: browser download
          const urlJSON = URL.createObjectURL(jsonBlob);
          const aJSON = document.createElement("a");
          aJSON.href = urlJSON;
          aJSON.download = `Backup_Dados_${Date.now()}.json`;
          aJSON.click();

          const urlPDF = URL.createObjectURL(pdfBlob);
          const aPDF = document.createElement("a");
          aPDF.href = urlPDF;
          aPDF.download = `Backup_Relatorio_${Date.now()}.pdf`;
          aPDF.click();
        }
      } else {
        // Fallback: browser download
        const urlJSON = URL.createObjectURL(jsonBlob);
        const aJSON = document.createElement("a");
        aJSON.href = urlJSON;
        aJSON.download = `Backup_Dados_${Date.now()}.json`;
        aJSON.click();

        const urlPDF = URL.createObjectURL(pdfBlob);
        const aPDF = document.createElement("a");
        aPDF.href = urlPDF;
        aPDF.download = `Backup_Relatorio_${Date.now()}.pdf`;
        aPDF.click();
      }

      // We use chunks here to bypass firestore limits, but wait, copying all to archives
      setBackupStepMsg("Movendo dados para o Arquivo Perpétuo...");

      for (const collName of collections) {
        let q = query(
          collection(db, collName),
          where("ownerId", "==", user.uid),
        );

        const snap = await getDocs(q);

        const deletePromises = snap.docs.map(async (d) => {
          // write to archives
          await setDoc(doc(db, `archived_${collName}`, d.id), {
            ...(d.data() as object),
            __archivedAt: new Date().toISOString(),
            __archiveReason: resetReason,
          });
          // delete from active
          await deleteDoc(doc(db, collName, d.id));
        });
        await Promise.all(deletePromises);
      }

      // Decrement or loop the remaining resets (3 -> 2 -> 1 -> 3)
      let nextResets = resetsRemaining - 1;
      if (nextResets < 1) {
        nextResets = 3;
      }
      await setDoc(
        doc(db, "users", user.uid),
        { resetsRemaining: nextResets },
        { merge: true }
      );
      setResetsRemaining(nextResets);

      toast.success(
        "Ciclo concluído com sucesso! Todos os dados foram arquivados e seu backup foi salvo.",
        { duration: 5000 },
      );
      setIsResetModalOpen(false);
      setResetConfirmText("");
      setResetReason("");
      setBackupStepMsg("");
      setActiveTab("dashboard");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "system-reset");
    } finally {
      setLoading(false);
      setBackupStepMsg("");
    }
  };

  const deleteTenant = async (id: string) => {
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const property = properties.find((p) => p.currentTenantId === id);

      // Update property to vacant if tenant currently occupies it
      if (property) {
        batch.update(doc(db, "properties", property.id!), {
          status: "vacant",
          currentTenantId: "",
          updatedAt: new Date().toISOString(),
        });
      }

      // Archive any linked contracts
      contracts
        .filter((c) => c.tenantId === id && c.status !== "archived")
        .forEach((c) => {
          batch.update(doc(db, "contracts", c.id!), {
            status: "archived",
            updatedAt: new Date().toISOString(),
          });
        });

      // Save tenant name snapshots on financials
      const tenant = tenants.find((t) => t.id === id);
      if (tenant?.name) {
        payments
          .filter((p) => p.tenantId === id)
          .forEach((p) =>
            batch.update(doc(db, "payments", p.id!), {
              tenantNameSnapshot: tenant.name,
            }),
          );
        agreements
          .filter((a) => a.tenantId === id)
          .forEach((a) =>
            batch.update(doc(db, "agreements", a.id!), {
              tenantNameSnapshot: tenant.name,
            }),
          );
      }

      // Cancelar todos os pagamentos PENDENTES deste inquilino
      payments
        .filter(
          (p) =>
            p.tenantId === id && p.status === "pending" && p.type === "rent",
        )
        .forEach((p) => {
          batch.update(doc(db, "payments", p.id!), {
            status: "cancelled",
            updatedAt: new Date().toISOString(),
          });
        });

      // Finally delete the tenant
      batch.delete(doc(db, "tenants", id));

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tenants/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addExpense = async (data: Partial<Expense>) => {
    if (!user) return;
    try {
      await addDoc(
        collection(db, "expenses"),
        cleanObject({
          ...data,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
        }),
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "expenses");
    }
  };

  const addPayment = async (data: Partial<Payment>) => {
    if (!user) return;
    try {
      let finalData = { ...data };
      if (data.dueDate) {
        const adj = adjustDateToNextBusinessDay(data.dueDate);
        if (adj.wasAdjusted) {
          finalData.dueDate = adj.adjustedDate;
          finalData.originalDueDate = adj.originalDate;
          finalData.observations =
            adj.adjustmentReason +
            (data.observations ? " " + data.observations : "");
        }
      }
      await addDoc(
        collection(db, "payments"),
        cleanObject({
          ...finalData,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "payments");
    }
  };

  const markPaymentAsPaid = async (
    paymentId: string,
    paidAmount?: number,
    receiptUrl?: string,
    evidenceName?: string,
    evidenceLocation?: string,
    remainderDueDate?: string,
    remainderObservations?: string,
    thumbnailLink?: string,
    waivedLateFee?: boolean,
    waivedLateFeeReason?: string,
  ) => {
    try {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment) return;

      const totalDue = payment.amount + (!waivedLateFee ? (payment.interestAmount || 0) : 0);
      const amountToPay = paidAmount !== undefined ? paidAmount : totalDue;
      const isPartial = paidAmount !== undefined && paidAmount < totalDue;

      const principalToRegister = isPartial ? amountToPay : payment.amount;

      // Update current payment as paid (or partial)
      await updateDoc(
        doc(db, "payments", paymentId),
        cleanObject({
          status: isPartial ? "partial" : "paid",
          amount: principalToRegister,
          paidAmount: amountToPay,
          interestAmount: (!isPartial && !waivedLateFee) ? (payment.interestAmount || 0) : 0,
          paidDate: new Date().toISOString(),
          receiptUrl: receiptUrl || null,
          evidenceName: evidenceName || null,
          evidenceLocation: evidenceLocation || null,
          thumbnailLink: thumbnailLink || null,
          waivedLateFee: waivedLateFee || null,
          waivedLateFeeReason: waivedLateFeeReason || null,
          updatedAt: new Date().toISOString(),
        }),
      );

      // If partial, create a new pending payment for the remainder
      if (isPartial) {
        const remainder = totalDue - amountToPay;
        const originalAmountForRemainder = totalDue;

        // Extract part number if exists to increment it
        const partMatch = payment.description?.match(/(\d+)ª parte/);
        const nextPart = partMatch ? parseInt(partMatch[1]) + 1 : 2;

        // Clean up base description
        const baseDescription =
          payment.description
            ?.replace(/^Restante:\s*/, "")
            ?.replace(/\s*\(\d+ª parte de R\$.*?\)/, "") || "Aluguel";

        const newDescription = `Restante: ${baseDescription} (${nextPart}ª parte de R$ ${originalAmountForRemainder.toLocaleString()})`;

        const inputRemainderDueDate = remainderDueDate || payment.dueDate;
        const remainderAdj = adjustDateToNextBusinessDay(inputRemainderDueDate);

        await addDoc(
          collection(db, "payments"),
          cleanObject({
            propertyId: payment.propertyId,
            tenantId: payment.tenantId,
            amount: remainder,
            dueDate: remainderAdj.adjustedDate,
            originalDueDate: remainderAdj.wasAdjusted
              ? remainderAdj.originalDate
              : undefined,
            status: "pending",
            ownerId: payment.ownerId,
            type: payment.type || "rent",
            description: newDescription,
            observations: `Pagamento parcial de R$ ${amountToPay.toLocaleString()} realizado em ${format(new Date(), "dd/MM/yyyy")}.${remainderObservations ? " Obs: " + remainderObservations : ""}${remainderAdj.wasAdjusted ? " / " + remainderAdj.adjustmentReason : ""}`,
            agreementId: payment.agreementId || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        );
        toast.success(
          `Pagamento parcial de R$ ${amountToPay.toLocaleString()} confirmado! O restante de R$ ${remainder.toLocaleString()} foi gerado como ${nextPart}ª parte.`,
        );
      } else {
        toast.success("Pagamento confirmado com sucesso!");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payments/${paymentId}`);
      toast.error("Erro ao confirmar pagamento.");
    }
  };

  const revertPayment = async (paymentId: string, reason: string) => {
    if (!user) return;
    try {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment) return;

      const newStatus =
        payment.dueDate < format(new Date(), "yyyy-MM-dd") ? "late" : "pending";

      await updateDoc(
        doc(db, "payments", paymentId),
        cleanObject({
          status: newStatus,
          paidDate: null,
          paidAmount: 0,
          receiptUrl: null,
          evidenceName: null,
          evidenceLocation: null,
          thumbnailLink: null,
          waivedLateFee: false,
          waivedLateFeeReason: null,
          revertReason: reason,
          updatedAt: new Date().toISOString(),
        }),
      );
      toast.success("Pagamento revertido com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payments/${paymentId}`);
      toast.error("Erro ao reverter pagamento.");
    }
  };

  const removeTenantFromProperty = async (
    propertyId: string,
    tenantId: string,
    action: "waiting" | "archived" | "delete",
  ) => {
    setRemoveTenantData({ propertyId, tenantId, action });
    setSettlementAmount(0);
    setSettlementType("extra");
    setIsRemoveTenantModalOpen(true);
  };

  const confirmRemoveTenant = async () => {
    if (!removeTenantData || !user) return;

    const { propertyId, tenantId, action } = removeTenantData;

    try {
      const batch = writeBatch(db);

      // 1. Update Property to vacant
      batch.update(doc(db, "properties", propertyId), {
        status: "vacant",
        currentTenantId: "",
        updatedAt: new Date().toISOString(),
      });

      // 2. Update or Delete Tenant
      if (action === "delete") {
        const tenant = tenants.find((t) => t.id === tenantId);
        if (tenant?.name) {
          payments
            .filter((p) => p.tenantId === tenantId)
            .forEach((p) => {
              if (p.id)
                batch.update(doc(db, "payments", p.id), {
                  tenantNameSnapshot: tenant.name,
                });
            });
          agreements
            .filter((a) => a.tenantId === tenantId)
            .forEach((a) => {
              if (a.id)
                batch.update(doc(db, "agreements", a.id), {
                  tenantNameSnapshot: tenant.name,
                });
            });
        }
        batch.delete(doc(db, "tenants", tenantId));
      } else {
        batch.update(doc(db, "tenants", tenantId), {
          status: action,
          propertyId: "",
          updatedAt: new Date().toISOString(),
        });
      }

      // 3. Cancel ONLY pending rents for this tenant and property (keep agreements and late payments)
      const pendingPayments = payments.filter(
        (p) =>
          p.tenantId === tenantId &&
          p.propertyId === propertyId &&
          p.status === "pending" &&
          p.type === "rent",
      );

      for (const p of pendingPayments) {
        if (p.id) {
          batch.update(doc(db, "payments", p.id), {
            status: "cancelled",
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3.5 End active contracts
      const activeContracts = contracts.filter(
        (c) =>
          c.tenantId === tenantId &&
          c.propertyId === propertyId &&
          c.status === "active",
      );
      for (const contract of activeContracts) {
        if (contract.id) {
          batch.update(doc(db, "contracts", contract.id), {
            status: action === "delete" || action === "archived" ? "archived" : "ended",
            endDate: format(new Date(), "yyyy-MM-dd"),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 4. Handle settlement payment if any
      if (settlementAmount > 0) {
        const finalAmount =
          settlementType === "extra" ? settlementAmount : -settlementAmount;
        const newPaymentRef = doc(collection(db, "payments"));
        batch.set(newPaymentRef, {
          propertyId,
          tenantId,
          amount: finalAmount,
          dueDate: format(new Date(), "yyyy-MM-dd"),
          paidDate: new Date().toISOString(),
          status: "paid",
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          observations: `Acerto final: ${settlementType === "extra" ? "Pagamento extra" : "Desconto/Devolução"}`,
        });
      }

      await batch.commit();

      setIsRemoveTenantModalOpen(false);
      setRemoveTenantData(null);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `properties/${propertyId}`,
      );
    }
  };

  const handleCreateCustomAlert = async (alertData: Omit<CustomAlert, "ownerId" | "createdAt">) => {
    try {
      if (!user) return;
      const newAlert: CustomAlert = {
        ...alertData,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        status: "active",
      };
      await addDoc(collection(db, "custom_alerts"), cleanObject(newAlert));
      toast.success("Alerta criado com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "custom_alerts");
    }
  };

  const handleDeleteCustomAlert = async (alertId: string) => {
    try {
      await deleteDoc(doc(db, "custom_alerts", alertId));
      toast.success("Alerta removido!");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `custom_alerts/${alertId}`);
    }
  };

  const DepositManager = ({
    tenant,
    payments,
    onUpdatePayment,
  }: {
    tenant: Tenant;
    payments: Payment[];
    onUpdatePayment: (id: string, data: Partial<Payment>) => Promise<void>;
  }) => {
    const depositPayments = payments.filter(
      (p) =>
        p.tenantId === tenant.id &&
        p.type === "deposit" &&
        p.status !== "cancelled",
    );

    const [isAbating, setIsAbating] = useState(false);
    const [abatementForm, setAbatementForm] = useState({
      amount: 0,
      reason: "",
    });

    if (depositPayments.length === 0) return null;

    const totalAgreed = depositPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalReceived = depositPayments
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);

    // Usage is usually stored in one of the payments (the first one by convention now)
    // but let's look for usage in all of them to be safe
    const allUsages = depositPayments.flatMap((p) => p.depositUsage || []);
    const usedAmount = allUsages.reduce((acc, u) => acc + u.amount, 0);

    const currentBalance = totalReceived - usedAmount;
    const pendingAmount = totalAgreed - totalReceived;

    const masterDeposit = depositPayments[0]; // Master for status tracking

    const handleAbate = async () => {
      if (!abatementForm.reason || abatementForm.amount <= 0) {
        toast.error("Informe o motivo e um valor válido.");
        return;
      }
      if (abatementForm.amount > currentBalance) {
        toast.error("Valor superior ao saldo atualmente recebido.");
        return;
      }

      const newUsage = {
        id: crypto.randomUUID(),
        amount: abatementForm.amount,
        reason: abatementForm.reason,
        date: new Date().toISOString(),
        userName: user?.email || "Sistema",
        timestamp: new Date(),
      };

      // We'll add the usage to the first paid payment found
      const firstPaid = depositPayments.find((p) => p.status === "paid" || p.status === "partial");
      if (!firstPaid) return;

      const updatedUsage = [...(firstPaid.depositUsage || []), newUsage];

      try {
        await onUpdatePayment(firstPaid.id!, {
          depositUsage: updatedUsage,
          depositStatus: "partially_used",
          updatedAt: new Date().toISOString(),
        });
        toast.success("Abatimento registrado com sucesso!");
        setIsAbating(false);
        setAbatementForm({ amount: 0, reason: "" });
      } catch (err) {
        console.error(err);
      }
    };

    const handleRefund = async () => {
      if (
        !window.confirm(
          `Deseja devolver o saldo de R$ ${currentBalance.toLocaleString()}?`,
        )
      )
        return;
      try {
        // Mark all paid deposit payments as refunded
        for (const p of depositPayments.filter((p) => p.status === "paid" || p.status === "partial")) {
          await onUpdatePayment(p.id!, {
            depositStatus: "refunded",
            updatedAt: new Date().toISOString(),
          });
        }
        toast.success("Caução marcado como devolvido!");
      } catch (err) {
        console.error(err);
      }
    };

    const allRefunded = depositPayments.every(
      (p) => p.depositStatus === "refunded",
    );

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
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">
                  Acordo de Caução (Garantia)
                </h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">
                  Valores retidos conforme Lei 8.245/91
                </p>
              </div>
            </div>
            <div
              className={cn(
                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest",
                allRefunded
                  ? "bg-slate-100 text-slate-500"
                  : totalReceived === totalAgreed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700",
              )}
            >
              {allRefunded
                ? "DEVOLVIDO"
                : totalReceived === totalAgreed
                  ? "TOTALMENTE PAGO"
                  : "PAGAMENTO EM CURSO"}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100/50 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Total Acordado
              </p>
              <p className="text-lg font-black text-slate-700">
                R$ {totalAgreed.toLocaleString()}
              </p>
            </div>
            <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100/50 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">
                Já Recebido
              </p>
              <p className="text-lg font-black text-emerald-700">
                R$ {totalReceived.toLocaleString()}
              </p>
            </div>
            <div
              className={cn(
                "p-5 rounded-3xl border flex flex-col items-center justify-center text-center transition-all",
                currentBalance > 0
                  ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-100"
                  : "bg-slate-100 border-slate-200 text-slate-400",
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest mb-1",
                  currentBalance > 0 ? "text-indigo-100" : "text-slate-400",
                )}
              >
                Saldo Disponível
              </p>
              <p className="text-lg font-black">
                R$ {currentBalance.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Installments List */}
          <div className="space-y-3 mb-8">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
              Cronograma de Pagamento
            </h5>
            <div className="space-y-2">
              {depositPayments
                .sort((a, b) => a.installmentNumber! - b.installmentNumber!)
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black",
                          p.status === "paid"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-200 text-slate-600",
                        )}
                      >
                        {p.installmentNumber || 1}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          Parcela {p.installmentNumber}/
                          {p.totalInstallments || 1}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">
                          Vencimento:{" "}
                          {format(parseISO(p.dueDate), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-black text-slate-800">
                        R$ {p.amount.toLocaleString()}
                      </p>
                      <div
                        className={cn(
                          "px-2 py-1 rounded-lg text-[8px] font-black uppercase",
                          p.status === "paid"
                            ? "bg-emerald-100 text-emerald-600"
                            : p.status === "late"
                              ? "bg-rose-100 text-rose-600"
                              : "bg-amber-100 text-amber-600",
                        )}
                      >
                        {p.status === "paid"
                          ? "PAGO"
                          : p.status === "late"
                            ? "ATRASADO"
                            : "PENDENTE"}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {pendingAmount > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                  Atenção: Restam R$ {pendingAmount.toLocaleString()} para
                  quitação total da caução.
                  <span className="block italic font-normal normal-case opacity-70">
                    O saldo disponível para abatimentos é composto apenas por
                    valores já recebidos.
                  </span>
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
                    <MinusCircle className="w-4 h-4 mr-2 text-rose-500" />{" "}
                    Abater Saldo
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
                <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                  Utilizar Saldo da Caução
                </h5>
                <X
                  className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600"
                  onClick={() => setIsAbating(false)}
                />
              </div>
              <div className="space-y-4">
                <CurrencyInput
                  label="Valor a Abater"
                  id="abateAmount"
                  value={abatementForm.amount}
                  onChange={(v) =>
                    setAbatementForm({ ...abatementForm, amount: v })
                  }
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Motivo
                  </label>
                  <select
                    value={abatementForm.reason}
                    onChange={(e) =>
                      setAbatementForm({
                        ...abatementForm,
                        reason: e.target.value,
                      })
                    }
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
                  >
                    <option value="">SELECIONE O MOTIVO...</option>
                    <option value="Danos ao imóvel">DANOS AO IMÓVEL</option>
                    <option value="Reparos pendentes">REPAROS PENDENTES</option>
                    <option value="Pendência Financeira">
                      PENDÊNCIA FINANCEIRA
                    </option>
                    <option value="Quebra de contrato">
                      QUEBRA DE CONTRATO
                    </option>
                    <option value="Outros">OUTROS</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => setIsAbating(false)}
                  variant="outline"
                  className="flex-1 h-11 rounded-xl text-[10px] font-bold"
                >
                  CANCELAR
                </Button>
                <Button
                  onClick={handleAbate}
                  className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase shadow-lg shadow-indigo-600/20"
                >
                  CONFIRMAR ABATIMENTO
                </Button>
              </div>
            </div>
          )}
        </div>

        {allUsages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Histórico de Movimentação
              </h5>
              <div className="h-[1px] flex-1 bg-slate-100 mx-4" />
            </div>
            <div className="space-y-2">
              {allUsages
                .slice()
                .sort(
                  (a, b) =>
                    parseISO(b.date).getTime() - parseISO(a.date).getTime(),
                )
                .map((usage) => (
                  <div
                    key={entry_usage_id(usage)}
                    className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-rose-100 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-rose-50 text-rose-500 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-all">
                        <ArrowDownLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                          {usage.reason}
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">
                          {format(parseISO(usage.date), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-rose-600">
                        - R$ {usage.amount.toLocaleString()}
                      </p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                        {usage.userName}
                      </p>
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
      await updateDoc(doc(db, "payments", id), cleanObject({
        ...data,
        updatedAt: new Date().toISOString(),
      }));
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
      case "intelligence_hub":
        return (
          <IntelligenceHubView
            properties={properties}
            updateProperty={updateProperty}
            addProperty={addProperty}
            addTenant={addTenant}
            onNavigateToCreated={() => setActiveTab("properties")}
            onOpenContractTemplate={(type) => {
              setInitialContractTemplate(type);
              setActiveTab("contracts");
            }}
            stagingRecords={stagingRecords}
            onSaveStagingRecord={addStagingRecord}
            onDeleteStagingRecord={deleteStagingRecord}
            onActivateStagingRecord={activateStagingRecord}
            isOnline={isOnline}
          />
        );
      case "dashboard":
        return (() => {
          const alertsItem = sidebarItems.find((i) => i.id === "alerts") as any;
          return (
            <HomeView
              properties={properties}
              tenants={tenants}
              payments={payments}
              expenses={expenses}
              agreements={agreements}
              onConfirmPayment={redirectToReceivables}
              onOpenTenantDetail={handleOpenTenantDetail}
              onOpenAlerts={() => setActiveTab("alerts")}
              globalAlertsCount={alertsItem?.badge}
              globalAlertsPriority={alertsItem?.badgeColor || "low"}
              storages={storages}
              onNavigateToStorage={(storageId) => {
                setSelectedStorageId(storageId);
                setActiveTab("storages");
              }}
            />
          );
        })();
      case "properties":
        return (
          <PropertiesView
            properties={properties}
            tenants={tenants}
            payments={payments}
            expenses={expenses}
            contracts={contracts}
            addProperty={addProperty}
            updateProperty={updateProperty}
            deleteProperty={deleteProperty}
            removeTenantFromProperty={removeTenantFromProperty}
            onSecurityCheck={executeWithSecurity}
            onOpenLegal={() => setActiveTab("intelligence_hub")}
            addExpense={addExpense}
            deleteExpense={deleteExpense}
            uploadToDrive={uploadToDrive}
            onNavigateToCreateTenant={(propertyId) => {
              setInitialPropertyIdForTenant(propertyId);
              setActiveTab("tenants");
            }}
            onNavigateToEditTenant={(tenantId) => {
              setInitialTenantIdToEdit(tenantId);
              setActiveTab("tenants");
            }}
            storages={storages}
            onNavigateToStorage={(storageId) => {
              setSelectedStorageId(storageId);
              setActiveTab("storages");
            }}
          />
        );
      case "contracts":
        return (
          <ContractsView
            contracts={contracts}
            properties={properties}
            tenants={tenants}
            storages={storages}
            onSecurityCheck={executeWithSecurity}
            isDriveConnected={isDriveConnected}
            uploadToDrive={uploadToDrive}
            initialOpenTemplate={initialContractTemplate}
            initialContractData={initialContractData}
            onClearInitialContractData={() => {
              setInitialContractData(null);
              setInitialContractTemplate(null);
            }}
          />
        );
      case "tenants":
        return (
          <TenantsView
            tenants={tenants}
            properties={properties}
            payments={payments}
            contracts={contracts}
            tickets={tickets}
            user={user}
            handleNavigate={handleNavigate}
            addTenant={addTenant}
            updateTenant={updateTenant}
            deleteTenant={deleteTenant}
            onOpenDetail={handleOpenTenantDetail}
            onSecurityCheck={executeWithSecurity}
            isDriveConnected={isDriveConnected}
            uploadToDrive={uploadToDrive}
            setPreviewReceipt={setPreviewReceipt}
            initialPropertyId={initialPropertyIdForTenant}
            onClearInitialPropertyId={() => setInitialPropertyIdForTenant(null)}
            initialTenantIdToEdit={initialTenantIdToEdit}
            onClearInitialTenantIdToEdit={() => setInitialTenantIdToEdit(null)}
            onNavigateToGenerateContract={(contractData) => {
              setInitialContractData(contractData);
              setActiveTab("contracts");
            }}
          />
        );
      case "receivables":
      case "financial":
      case "financial_ia":
      case "storages":
        return (
          <UnifiedFinancialHub
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            receivablesProps={{
              properties,
              tenants,
              payments,
              agreements,
              setConfirmingPayment,
              setIsPaymentModalOpen,
              setIsRevertModalOpen,
              setRevertingPayment,
              onOpenTenantDetail: handleOpenTenantDetail,
              highlightedPaymentId,
              setHighlightedPaymentId,
              isDriveConnected,
              uploadToDrive,
            }}
            financialProps={{
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
              onConfirmPayment: redirectToReceivables,
              setArchivingAgreement,
              setIsArchiveAgreementModalOpen,
              setIsRevertModalOpen,
              setRevertingPayment,
              onOpenTenantDetail: handleOpenTenantDetail,
              isDriveConnected,
              uploadToDrive,
              setPreviewReceipt,
              storages,
              highlightedPaymentId,
              setHighlightedPaymentId,
              onNavigateToStorage: (storageId) => {
                setSelectedStorageId(storageId);
                setActiveTab("storages");
              },
            }}
            storagesProps={{
              storages,
              properties,
              tenants,
              contracts,
              onSecurityCheck: executeWithSecurity,
              initialSelectedId: selectedStorageId,
              onClearInitialSelectedId: () => setSelectedStorageId(null),
              onNavigateToCreateContract: (contractData) => {
                setInitialContractData(contractData);
                setActiveTab("contracts");
              },
            }}
          />
        );
      case "alerts":
        return (
          <AlertsView
            properties={properties}
            tenants={tenants}
            payments={payments}
            agreements={agreements}
            tickets={tickets}
            contracts={contracts}
            isAlertSnoozed={isAlertSnoozed}
            handleSnoozeAlert={handleSnoozeAlert}
            handleNavigate={handleNavigate}
            openJustifyRenovation={(p: Property) => {
              setJustifyingProperty(p);
              setIsJustifyRenovationModalOpen(true);
            }}
            alertSettings={alertSettings}
            setAlertSettings={setAlertSettings}
            customAlerts={customAlerts}
            onCreateCustomAlert={handleCreateCustomAlert}
            onDeleteCustomAlert={handleDeleteCustomAlert}
            storages={storages}
          />
        );
      case "settings":
        return (
          <SettingsView
            user={user}
            setIsResetModalOpen={setIsResetModalOpen}
            setIsBackupModalOpen={setIsBackupModalOpen}
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
            isInstallable={isInstallable}
            handleInstallClick={handleInstallClick}
          />
        );
      case "cloud":
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
            isAlertSnoozed={isAlertSnoozed}
            handleSnoozeAlert={handleSnoozeAlert}
            handleNavigate={handleNavigate}
            isOnline={isOnline}
          />
        );
      case "help":
        return <HelpView />;
      default:
        return (() => {
          const alertsItem = sidebarItems.find((i) => i.id === "alerts") as any;
          return (
            <HomeView
              properties={properties}
              tenants={tenants}
              payments={payments}
              expenses={expenses}
              agreements={agreements}
              onConfirmPayment={redirectToReceivables}
              onOpenTenantDetail={handleOpenTenantDetail}
              onOpenAlerts={() => setActiveTab("alerts")}
              globalAlertsCount={alertsItem?.badge}
              globalAlertsPriority={alertsItem?.badgeColor || "low"}
              storages={storages}
              onNavigateToStorage={(storageId) => {
                setSelectedStorageId(storageId);
                setActiveTab("storages");
              }}
            />
          );
        })();
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex flex-col items-center gap-8 z-10"
        >
          <motion.img
            src="/robot_loading.png"
            alt="Robô Assistente"
            className="w-[85vw] max-w-[400px] h-auto aspect-square object-contain mx-auto drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.5,
              ease: "easeInOut",
            }}
          />
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Olá! Preparando seu ambiente...
            </h1>
            <div className="flex gap-2.5 mt-2">
              <motion.div
                className="w-2.5 h-2.5 bg-emerald-500 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
              />
              <motion.div
                className="w-2.5 h-2.5 bg-emerald-500 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
              />
              <motion.div
                className="w-2.5 h-2.5 bg-emerald-500 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user && !tenantUser) {
    return (
      <div className="h-screen w-full bg-[#0a0f18] flex items-center justify-center p-4 lg:p-8 relative overflow-hidden font-sans">
        {/* Decorative Background Elements */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none"
          style={{ backgroundImage: `url('/plano_de_fundo_inicial.png')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f18] via-transparent to-[#0a0f18]/80 pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#2dbf64]/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-[#818cf8]/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

        <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center justify-items-center h-full max-h-[850px]">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-[420px] bg-[#161b22]/80 backdrop-blur-3xl p-8 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/5 relative"
          >
            <Auth 
              key="login-form" 
              user={user} 
              onTenantLogin={(tenantData) => {
                setTenantUser(tenantData);
                localStorage.setItem("tenant_session", JSON.stringify(tenantData));
              }}
            />
          </motion.div>

          <div className="hidden lg:flex flex-col items-center justify-center relative w-full h-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.2,
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
              className="relative w-full flex items-center justify-center"
            >
              <motion.div
                animate={{ y: [-15, 15, -15] }}
                transition={{
                  repeat: Infinity,
                  duration: 6,
                  ease: "easeInOut",
                }}
                className="relative z-10 flex flex-col items-center"
              >
                {/* Chat bubble */}
                <div className="absolute -top-12 sm:-top-20 -left-12 sm:-left-32 bg-[#1e232b]/95 backdrop-blur-xl p-5 rounded-3xl rounded-br-none border border-white/10 shadow-2xl max-w-[280px] z-20">
                  <div className="flex items-start gap-3">
                    <div className="text-[#818cf8] mt-1 drop-shadow">
                      <Heart className="fill-current w-6 h-6" />
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed font-medium">
                      Olá! Que bom te ver por aqui. Vamos juntos tornar a gestão
                      dos seus imóveis mais fácil e inteligente!
                    </p>
                  </div>
                  {/* Speech bubble tail */}
                  <div className="absolute -bottom-4 right-0 w-8 h-8 bg-[#1e232b]/95 border-r border-b border-white/10 transform rotate-45 translate-x-3 -translate-y-4 rounded-sm border-t-0 border-l-0 z-[-1]" />
                </div>

                {/* Robot Image */}
                <img
                  src="/robot_greeting.png"
                  alt="Robot"
                  className="w-[85%] max-w-[500px] h-auto drop-shadow-2xl object-contain object-center z-10 relative"
                />
              </motion.div>

              {/* Shadow on the floor */}
              <motion.div
                animate={{ scale: [1, 0.8, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{
                  repeat: Infinity,
                  duration: 6,
                  ease: "easeInOut",
                }}
                className="w-64 h-8 bg-black/60 blur-xl rounded-full absolute -bottom-4 left-1/2 -translate-x-1/2 z-0"
              />
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (tenantUser) {
    const payments = tenantUser.payments || [];
    
    const totalPending = payments
      .filter((p: any) => p.status === "pending" || p.status === "late")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const paidPayments = [...payments]
      .filter((p: any) => p.status === "paid" && p.paidDate)
      .sort((a: any, b: any) => b.paidDate.localeCompare(a.paidDate));
    const lastPaid = paidPayments[0] || null;

    const nextDuePayments = [...payments]
      .filter((p: any) => (p.status === "pending" || p.status === "late") && p.dueDate)
      .sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate));
    const nextDue = nextDuePayments[0] || null;

    const formatBRL = (val: number) => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(val);
    };

    const formatDateString = (dateStr: string) => {
      if (!dateStr) return "—";
      try {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      } catch {
        return dateStr;
      }
    };

    const handleTenantLogout = () => {
      setTenantUser(null);
      localStorage.removeItem("tenant_session");
    };

    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#818cf8]/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8 flex-1 flex flex-col gap-8 justify-start">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111622]/80 border border-white/5 p-6 rounded-3xl backdrop-blur-md">
            <div>
              <span className="text-xs font-bold text-[#818cf8] uppercase tracking-widest bg-[#818cf8]/10 px-3 py-1 rounded-full">
                Área do Inquilino
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white mt-3">
                Olá, {tenantUser.tenantName}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Acompanhe o extrato do seu imóvel:{" "}
                <strong className="text-emerald-400">
                  {tenantUser.propertyName}
                </strong>
              </p>
            </div>

            <button
              onClick={handleTenantLogout}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-white/5 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Sair do Extrato
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111622]/60 border border-white/5 p-6 rounded-3xl flex flex-col justify-between hover:border-slate-700/50 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Próximo Vencimento
                </span>
                <div className="text-2xl font-black text-rose-400 mt-2">
                  {nextDue ? formatBRL(nextDue.amount) : "Nenhum"}
                </div>
              </div>
              <div className="text-slate-400 text-xs mt-4 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#818cf8]" />
                {nextDue
                  ? `Vence em ${formatDateString(nextDue.dueDate)}`
                  : "Tudo em dia!"}
              </div>
            </div>

            <div className="bg-[#111622]/60 border border-white/5 p-6 rounded-3xl flex flex-col justify-between hover:border-slate-700/50 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Aberto / Atrasado
                </span>
                <div className="text-2xl font-black text-amber-400 mt-2">
                  {formatBRL(totalPending)}
                </div>
              </div>
              <div className="text-slate-400 text-xs mt-4 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                {totalPending > 0
                  ? "Aguardando pagamento"
                  : "Sem pendências em aberto"}
              </div>
            </div>

            <div className="bg-[#111622]/60 border border-white/5 p-6 rounded-3xl flex flex-col justify-between hover:border-slate-700/50 transition-colors">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Último Pago
                </span>
                <div className="text-2xl font-black text-emerald-400 mt-2">
                  {lastPaid
                    ? formatBRL(lastPaid.paidAmount || lastPaid.amount)
                    : "Nenhum"}
                </div>
              </div>
              <div className="text-slate-400 text-xs mt-4 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {lastPaid
                  ? `Pago em ${formatDateString(lastPaid.paidDate)}`
                  : "Nenhum registro"}
              </div>
            </div>
          </div>

          <div className="bg-[#111622]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
            <h2 className="text-lg font-bold tracking-tight text-white mb-5 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#818cf8]" />
              Lista de Cobranças
            </h2>

            {payments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Nenhuma cobrança encontrada para este inquilino.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {[...payments]
                  .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
                  .map((p: any) => {
                    const isPaid = p.status === "paid";
                    const isLate = p.status === "late";

                    return (
                      <div
                        key={p.id}
                        className="bg-[#161b26]/50 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-white/10 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 ${
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-400"
                                : isLate
                                  ? "bg-rose-500/10 text-rose-400"
                                  : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-slate-200">
                              {p.description ||
                                (p.type === "rent"
                                  ? "Aluguel Mensal"
                                  : p.type === "deposit"
                                    ? "Caução / Depósito"
                                    : "Taxa Adicional")}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 flex gap-2">
                              <span>
                                Vencimento: {formatDateString(p.dueDate)}
                              </span>
                              {p.paidDate && (
                                <span>
                                  • Pago em: {formatDateString(p.paidDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end sm:items-end w-full sm:w-auto gap-3">
                          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                            <div className="font-extrabold text-sm text-white">
                              {formatBRL(p.amount)}
                            </div>
                            <span
                              className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                isPaid
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : isLate
                                    ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              }`}
                            >
                              {isPaid
                                ? "Pago"
                                : isLate
                                  ? "Atrasado"
                                  : "Em Aberto"}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 justify-end w-full">
                            {!isPaid && (
                                <button
                                  onClick={() => {
                                    if (tenantUser.propertyPixKey) {
                                      navigator.clipboard.writeText(tenantUser.propertyPixKey);
                                      toast.success("Chave PIX copiada! " + tenantUser.propertyPixKey);
                                    } else {
                                      toast.error("O proprietário ainda não cadastrou uma chave PIX.");
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-[#818cf8]/20 hover:bg-[#818cf8]/30 text-[#818cf8] border border-[#818cf8]/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                >
                                  <QrCode className="w-3.5 h-3.5" /> Pagar com PIX
                                </button>
                            )}
                            
                            {isPaid && p.receiptUrl && (
                                <a
                                  href={p.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                >
                                  <Download className="w-3.5 h-3.5" /> Recibo
                                </a>
                            )}
                            
                            {!isPaid && p.receiptUrl && (
                                <a
                                  href={p.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                >
                                  <Download className="w-3.5 h-3.5" /> 2ª Via / Boleto
                                </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="bg-[#111622]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <Hammer className="w-5 h-5 text-amber-500" />
                Chamados de Manutenção
              </h2>
              <button
                onClick={() => {
                  const title = window.prompt("Qual o problema?");
                  if (!title) return;
                  const description = window.prompt("Descreva o problema com mais detalhes:");
                  if (!description) return;
                  
                  const newTicket = {
                    title,
                    description,
                    tenantId: tenantUser.tenantId,
                    propertyId: tenantUser.propertyId || '', // we need propertyId, but tenantUser might not have it directly if we didn't add it. We can find it from the global `tenants` if available.
                    status: "open",
                    priority: "medium",
                    createdAt: new Date().toISOString()
                  };
                  
                  const relatedTenant = tenants.find(t => t.id === tenantUser.tenantId);
                  if (relatedTenant && relatedTenant.propertyId) {
                      newTicket.propertyId = relatedTenant.propertyId;
                  }
                  
                  addDoc(collection(db, "tickets"), newTicket)
                    .then(() => toast.success("Chamado aberto com sucesso!"))
                    .catch(err => toast.error("Erro ao abrir chamado."));
                }}
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Chamado
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {tickets.filter(t => t.tenantId === tenantUser.tenantId).length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Você não tem nenhum chamado aberto.
                </div>
              ) : (
                tickets
                  .filter(t => t.tenantId === tenantUser.tenantId)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(t => (
                    <div key={t.id} className="bg-[#161b26]/50 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="font-semibold text-sm text-slate-200">{t.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{t.description}</div>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${
                        t.status === 'open' ? 'bg-rose-500/10 text-rose-500' :
                        t.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {t.status === 'open' ? 'Aberto' : t.status === 'in_progress' ? 'Em Andamento' : 'Resolvido'}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Receipt Preview Modal */}
      <Modal
        isOpen={!!previewReceipt}
        onClose={() => setPreviewReceipt(null)}
        title={previewReceipt?.name || "Visualização de Recibo"}
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
              {isGoogleDriveLink(previewReceipt?.url) && (
                <Cloud className="w-4 h-4 ml-1 text-emerald-500" />
              )}
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
              <span className="font-black text-base tracking-tight text-[#0f4a34] leading-none">
                GERENTE
              </span>
              <span className="text-[7px] font-bold text-[#64a51e] uppercase tracking-widest">
                IMOBILIÁRIO
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const alertsItem = sidebarItems.find(
              (i) => i.id === "alerts",
            ) as any;
            const alertsBadge = alertsItem?.badge;
            const alertsColor = alertsItem?.badgeColor || "low";
            return (
              <button
                onClick={() => setActiveTab("alerts")}
                className={cn(
                  "relative p-2 rounded-xl transition-all active:scale-95 text-slate-400 bg-slate-800/50 hover:bg-slate-800",
                  activeTab === "alerts" && "text-amber-400 bg-amber-500/10",
                )}
                title="Central de Alertas"
              >
                <Bell className="w-5 h-5" />
                {alertsBadge && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full text-[9px] font-black shadow-[0_0_0_2px_#0f172a]",
                      alertsColor === "high"
                        ? "bg-rose-500 text-white"
                        : alertsColor === "medium"
                          ? "bg-amber-500 text-amber-950"
                          : "bg-blue-500 text-white",
                    )}
                  >
                    {alertsBadge}
                  </span>
                )}
              </button>
            );
          })()}
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
          isMobileMenuOpen
            ? "left-4 translate-x-0"
            : "-left-4 -translate-x-[110%] md:translate-x-0 md:left-4",
          // Width: 75vw on mobile (approx 70% screen shown), 20 space on desktop
          "w-[75vw] max-w-[280px] md:w-20 md:hover:w-64 overflow-hidden",
        )}
      >
        <div className="w-full px-4 md:px-5 flex flex-col gap-6 h-full">
          {/* Logo / Header Section */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex shrink-0 w-8 h-8 drop-shadow-md">
              <LogoSVG className="w-full h-full" />
            </div>
            <div className="flex flex-col md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap">
              <span className="font-black text-xl tracking-tight text-[#0f4a34] leading-none">
                GERENTE
              </span>
              <span className="text-[10px] font-bold text-[#64a51e] uppercase tracking-[0.2em]">
                IMOBILIÁRIO
              </span>
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
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      }}
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
                        : "text-slate-500 hover:bg-slate-100/60 hover:text-slate-800",
                    )}
                  >
                    <div className="flex w-full md:w-auto md:group-hover:w-full items-center gap-4 transition-all duration-300 md:justify-start">
                      <div className="flex justify-center items-center shrink-0 w-8 md:w-10">
                        <item.icon
                          className={cn(
                            "w-5 h-5 md:w-[22px] md:h-[22px] transition-colors",
                            isActive
                              ? "text-white"
                              : "group-hover/btn:text-emerald-500",
                          )}
                        />
                      </div>

                      <span
                        className={cn(
                          "text-sm font-bold whitespace-nowrap transition-all duration-300 flex-1 text-left",
                          "md:opacity-0 md:-translate-x-4 md:absolute md:left-14 md:group-hover:opacity-100 md:group-hover:translate-x-0 md:group-hover:relative md:group-hover:left-0",
                          !isActive && "group-hover/btn:text-slate-800",
                        )}
                      >
                        {item.label}
                      </span>

                      {(item as any).badge && (
                        <span
                          className={cn(
                            "shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shadow-sm transition-all duration-300",
                            "md:opacity-0 md:-translate-x-2 md:absolute md:right-0 md:group-hover:opacity-100 md:group-hover:translate-x-0 md:group-hover:relative md:group-hover:left-0",
                            isActive
                              ? item.id === "alerts" &&
                                (item as any).badgeColor === "high"
                                ? "bg-white text-rose-600"
                                : item.id === "alerts" &&
                                    (item as any).badgeColor === "medium"
                                  ? "bg-white text-amber-600"
                                  : item.id === "alerts" &&
                                      (item as any).badgeColor === "low"
                                    ? "bg-white text-blue-600"
                                    : "bg-white text-emerald-600"
                              : item.id === "alerts" &&
                                  (item as any).badgeColor === "high"
                                ? "bg-rose-100 text-rose-600"
                                : item.id === "alerts" &&
                                    (item as any).badgeColor === "medium"
                                  ? "bg-amber-100 text-amber-600"
                                  : item.id === "alerts" &&
                                      (item as any).badgeColor === "low"
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-emerald-100 text-emerald-600",
                          )}
                        >
                          {(item as any).badge}
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
                    src={
                      user?.photoURL ||
                      "https://ui-avatars.com/api/?name=" +
                        user?.email +
                        "&background=10b981&color=fff"
                    }
                    alt="User"
                    className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-slate-200 border-2 border-white shadow-sm object-cover"
                  />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-2 h-2 text-white" />
                  </div>
                </div>

                <div className="flex flex-col md:opacity-0 md:hidden md:group-hover:flex md:group-hover:opacity-100 transition-all duration-300 overflow-hidden whitespace-nowrap">
                  <p className="text-xs font-bold text-slate-800 truncate w-32">
                    {user?.displayName || "Usuário"}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 truncate w-32">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab("help");
                setIsMobileMenuOpen(false);
              }}
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

        <CustomRobotAssistant
          alertsCount={(() => {
            const alertsItem = sidebarItems.find(
              (i) => i.id === "alerts",
            ) as any;
            return alertsItem?.badge || 0;
          })()}
          onOpenAssistant={() => setActiveTab("cloud")}
        />
      </main>

      {/* Global Modals */}
      <Modal
        isOpen={isBackupModalOpen && !loading}
        onClose={() => setIsBackupModalOpen(false)}
        title="Backup Inteligente do Sistema"
      >
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex gap-3">
            <DatabaseBackup className="w-5 h-5 text-indigo-500 shrink-0" />
            <div className="text-sm text-indigo-900">
              <p className="font-bold uppercase tracking-tight">
                Salvar Ciclo de Dados
              </p>
              <p>
                Os seus dados atuais serão compilados. Um relatório inteligente
                (PDF) e todos os dados brutos (JSON) serão gerados e copiados
                para segurança.
                <br />
                Nenhum dado ativo será removido.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Motivo Funcional para o Relatório (Obrigatório):
              </label>
              <textarea
                className="w-full min-h-[80px] p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 resize-none font-medium text-slate-800"
                placeholder="Exemplo: Cópia de segurança trimestral. A carteira de clientes está ativa..."
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Confirme seu E-mail para autorização:
              </label>
              <Input
                id="backup-email-confirm"
                placeholder={user?.email || ""}
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 py-3 text-indigo-700 font-black border-indigo-200 hover:bg-indigo-50 bg-white"
                onClick={() =>
                  executeWithSecurity(
                    handleBackupSystem,
                    "Autorizar backup de dados locais e criação do relatório de inteligência.",
                  )
                }
                disabled={resetReason.length < 10 || !resetConfirmText}
              >
                Gerar Backup Localmente / Nuvem
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsBackupModalOpen(false)}
                className="py-3"
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isResetModalOpen && !loading}
        onClose={() => setIsResetModalOpen(false)}
        title="Reinicialização Total do Sistema"
      >
        <div className="space-y-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
            <div className="text-sm text-red-900">
              <p className="font-black uppercase tracking-tight">
                Atenção: Ação Definitiva
              </p>
              <p className="mt-1">
                Você irá{" "}
                <strong>remover e limpar todos os dados lançados</strong>. Sua
                tela atual será zerada em preparação para um novo ciclo.
                Recomendamos fazer um Backup Inteligente primeiro e manter o
                mesmo sistema de autorização existente.
              </p>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
            <div className="text-sm text-amber-900">
              <p className="font-black uppercase tracking-tight text-amber-800">
                Limite de Reinicializações Ativo (Vínculo de Segurança)
              </p>
              <p className="mt-1">
                Sua conta possui apenas <span className="font-extrabold text-red-600 text-lg underline">{resetsRemaining}</span> {resetsRemaining === 1 ? "reinicialização restante" : "reinicializações restantes"} vinculadas ao seu e-mail do Google.
              </p>
              <p className="mt-1 text-xs text-amber-700 font-medium">
                Por questões de segurança e integridade com o Google Drive, o sistema possui um limite dinâmico de segurança contra redefinições abusivas. Certifique-se de que realmente deseja prosseguir com este ciclo.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Motivo da Reinicialização (Histórico Seguro):
              </label>
              <textarea
                className="w-full min-h-[80px] p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 hover:border-slate-300 resize-none font-medium text-slate-800 focus:bg-red-50"
                placeholder="Ex: Fim de Gestão e início de novo dono..."
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-red-600 uppercase">
                Confirme seu E-mail da Conta:
              </label>
              <Input
                id="reset-email-confirm-2"
                placeholder={user?.email || ""}
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                disabled={loading}
                className="border-red-200 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                variant="danger"
                className="flex-1 py-3 bg-red-600 font-black text-white hover:bg-red-700"
                onClick={() =>
                  executeWithSecurity(
                    resetSystemData,
                    "Ação destrutiva: Confirme a Senha para apagar todos os dados e Reiniciar o sistema.",
                  )
                }
                disabled={resetReason.length < 10 || !resetConfirmText}
              >
                Limpar Dados e Reiniciar
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsResetModalOpen(false)}
                className="py-3 bg-white"
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {isBackupModalOpen && loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative mb-16 sm:mb-20">
              <img
                src="/robot_working.png"
                alt="Processando Backup"
                className="w-48 h-48 sm:w-80 sm:h-80 object-contain animate-bounce drop-shadow-2xl"
              />
              <div className="absolute top-0 sm:-right-24 -right-12 bg-white sm:p-5 p-3 rounded-2xl sm:rounded-3xl rounded-bl-none shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-indigo-100 max-w-[200px] sm:max-w-[280px]">
                <p className="text-sm sm:text-lg font-bold text-indigo-900 leading-tight">
                  O sistema está realizando a função... Trabalhando nos dados!
                  🚀
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 sm:gap-4 bg-indigo-50 px-6 sm:px-8 py-3 sm:py-4 rounded-full border border-indigo-200 shadow-inner">
              <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
              <p className="text-base sm:text-lg font-black text-indigo-900">
                {backupStepMsg || "Compilando seus dados..."}
              </p>
            </div>
          </motion.div>
        )}

        {isResetModalOpen && loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative mb-16 sm:mb-20">
              <img
                src="/robot_working.png"
                alt="Processando Limpeza"
                className="w-48 h-48 sm:w-80 sm:h-80 object-contain animate-bounce drop-shadow-2xl"
              />
              <div className="absolute top-0 sm:-right-24 -right-12 bg-white sm:p-5 p-3 rounded-2xl sm:rounded-3xl rounded-bl-none shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-red-200 max-w-[200px] sm:max-w-[280px]">
                <p className="text-sm sm:text-lg font-bold text-red-900 leading-tight">
                  O sistema está realizando a função... Limpando e reinstalando!
                  🧹
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 sm:gap-4 bg-red-50 px-6 sm:px-8 py-3 sm:py-4 rounded-full border border-red-200 shadow-inner">
              <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-red-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
              <p className="text-base sm:text-lg font-black text-red-900">
                {backupStepMsg || "Removendo tabelas e instâncias..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Confirmar Pagamento"
      >
        <div className="space-y-4">
          <div className="p-4 bg-accent/20 rounded-xl border">
            <p className="text-sm text-muted-foreground uppercase font-bold">
              Resumo do Pagamento
            </p>
            <p className="text-lg font-bold">
              R$ {confirmingPayment?.amount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Vencimento:{" "}
              {confirmingPayment &&
                format(parseISO(confirmingPayment.dueDate), "dd/MM/yyyy")}
            </p>
          </div>

          {(() => {
            if (!confirmingPayment) return null;
            const property = properties.find(
              (p) => p.id === confirmingPayment.propertyId,
            );
            const agreement =
              confirmingPayment.type === "agreement"
                ? agreements.find((a) => a.id === confirmingPayment.agreementId)
                : null;
            const contract = contracts.find(
              (c) =>
                c.tenantId === confirmingPayment.tenantId &&
                c.propertyId === confirmingPayment.propertyId &&
                c.status === "active",
            );
            const tenant = tenants.find(
              (t) => t.id === confirmingPayment.tenantId,
            );
            const configSource = agreement || contract || tenant || property;

            if (!configSource || !configSource.chargeLateFees) return null;

            const today = new Date();
            const dueDate = parseISO(confirmingPayment.dueDate);
            const isLate =
              differenceInDays(startOfDay(today), startOfDay(dueDate)) > 0;
            if (!isLate) return null;

            return (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-orange-900 leading-tight">
                      Pagamento em Atraso
                    </p>
                    <p className="text-xs text-orange-700 leading-tight">
                      Multa e juros calculados pelo sistema.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-orange-200 shadow-sm shrink-0">
                    <input
                      type="checkbox"
                      checked={waiveLateFee}
                      onChange={(e) => setWaiveLateFee(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded border-orange-300 focus:ring-orange-500"
                    />
                    <span className="text-xs font-bold text-orange-900">
                      Isentar
                    </span>
                  </label>
                </div>
                <AnimatePresence>
                  {waiveLateFee && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="pt-1 overflow-hidden"
                    >
                      <Input
                        id="waiveReason"
                        placeholder="Motivo da isenção (Opcional)"
                        value={waivedLateFeeReason}
                        onChange={(e) => setWaivedLateFeeReason(e.target.value)}
                        className="bg-white border-orange-200 text-sm placeholder:text-orange-300"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })()}

          <div className="flex flex-col gap-1.5">
            <CurrencyInput
              id="payment-amount-input"
              label="Valor Pago"
              value={paymentAmountInput}
              onChange={(val) => setPaymentAmountInput(val)}
              className="font-bold text-emerald-600"
            />
            {confirmingPayment &&
              paymentAmountInput < confirmingPayment.amount && (
                <div className="space-y-4">
                  <p className="text-[10px] text-amber-600 font-medium bg-amber-50 p-2 rounded-lg border border-amber-100">
                    Atenção: Você está registrando um pagamento parcial. O
                    sistema gerará automaticamente uma nova cobrança de R${" "}
                    {(
                      confirmingPayment.amount - paymentAmountInput
                    ).toLocaleString()}{" "}
                    para o restante.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">
                      Data para pagar o restante
                    </label>
                    <Input
                      id="payment-remainder-due-date"
                      type="date"
                      value={paymentRemainderDueDate}
                      onChange={(e) =>
                        setPaymentRemainderDueDate(e.target.value)
                      }
                      className="font-bold text-amber-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">
                      Observação do Restante
                    </label>
                    <Input
                      id="payment-remainder-observations"
                      placeholder="Ex: Prometeu pagar na sexta-feira..."
                      value={paymentRemainderObservations}
                      onChange={(e) =>
                        setPaymentRemainderObservations(e.target.value)
                      }
                      className="text-amber-700"
                    />
                  </div>
                </div>
              )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Anexar Comprovante (Opcional)
            </label>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPaymentReceiptName(file.name);
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    if (isDriveConnected) {
                      const tenantName =
                        tenants.find((t) => t.id === confirmingPayment.tenantId)
                          ?.name || "Geral";
                      toast.promise(
                        uploadToDrive(file.name, base64, file.type, tenantName),
                        {
                          loading:
                            "Enviando comprovante para o Google Drive...",
                          success: (data) => {
                            setPaymentReceipt(data.webViewLink);
                            setPaymentReceiptLocation("Google Drive");
                            setPaymentReceiptThumbnail(data.thumbnailLink);
                            return "Comprovante salvo no Google Drive!";
                          },
                          error: "Erro ao enviar para o Google Drive.",
                        },
                      );
                    } else {
                      if (file.type.startsWith("image/")) {
                        compressImage(base64).then((compressed) => {
                          setPaymentReceipt(compressed);
                        });
                      } else {
                        setPaymentReceipt(base64);
                      }
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Localização do Comprovante (Opcional)
            </label>
            <Input
              id="payment-evidence-location"
              placeholder="Ex: Pasta Drive, Gaveta 2, etc..."
              value={paymentReceiptLocation}
              onChange={(e) => setPaymentReceiptLocation(e.target.value)}
            />
          </div>

          <div className="pt-4 flex gap-2">
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-md font-bold"
              disabled={
                isSubmitting ||
                paymentAmountInput <= 0
              }
              onClick={() => {
                if (confirmingPayment) {
                  const tenantName =
                    tenants.find((t) => t.id === confirmingPayment.tenantId)
                      ?.name || "Inquilino";

                  // Early payment check
                  const dueDate = parseISO(confirmingPayment.dueDate);
                  const today = startOfDay(new Date());
                  const daysUntilDue = differenceInDays(dueDate, today);

                  if (daysUntilDue > 0) {
                    const confirmed = window.confirm(
                      `Atenção: Esta parcela vence daqui a ${daysUntilDue} dias. ` +
                        `Tem certeza que o usuário pagou antecipado? Não haverá nenhuma vantagem financeira para ele ao realizar este pagamento agora.`,
                    );
                    if (!confirmed) return;
                  }

                  const description = `Ao confirmar, você registrará o recebimento de R$ ${paymentAmountInput.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de ${tenantName}.`;

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
                        paymentReceiptThumbnail || undefined,
                        waiveLateFee,
                        waiveLateFee ? waivedLateFeeReason : undefined,
                      );
                      setIsPaymentModalOpen(false);
                      setConfirmingPayment(null);
                      setWaiveLateFee(false);
                      setWaivedLateFeeReason("");
                      setPaymentReceipt(null);
                      setPaymentReceiptName("");
                      setPaymentReceiptLocation("");
                      setPaymentReceiptThumbnail(null);
                      setPaymentRemainderDueDate(
                        format(addMonths(new Date(), 1), "yyyy-MM-dd"),
                      );
                      setPaymentRemainderObservations("");
                    } catch (error) {
                      console.error("Erro ao confirmar pagamento:", error);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }, description);
                }
              }}
            >
              {isSubmitting ? "Processando..." : "Confirmar Recebimento"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRevertModalOpen}
        onClose={() => setIsRevertModalOpen(false)}
        title="Reverter Pagamento"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-sm text-red-800 uppercase font-bold">Atenção</p>
            <p className="text-xs text-red-600">
              Você está prestes a reverter um pagamento já confirmado. O status
              voltará para pendente ou atrasado.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo da Reversão</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none placeholder:text-slate-400"
              placeholder="Ex: Erro de digitação, pagamento não realizado, etc..."
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
            />
          </div>

          <div className="pt-4 flex gap-2">
            <Button
              className="flex-1 bg-red-500 hover:bg-red-600 text-white border-none shadow-md font-bold"
              disabled={isSubmitting || !revertReason.trim()}
              onClick={() => {
                if (revertingPayment) {
                  const description = `Ao confirmar, você reverterá o pagamento de R$ ${revertingPayment.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, tornando-o pendente novamente.`;

                  executeWithSecurity(async () => {
                    setIsSubmitting(true);
                    try {
                      await revertPayment(revertingPayment.id, revertReason);
                      setIsRevertModalOpen(false);
                      setRevertingPayment(null);
                      setRevertReason("");
                    } catch (error) {
                      console.error("Erro ao reverter pagamento:", error);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }, description);
                }
              }}
            >
              {isSubmitting ? "Processando..." : "Confirmar Reversão"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsRevertModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isJustifyRenovationModalOpen}
        onClose={() => {
          setIsJustifyRenovationModalOpen(false);
          setJustifyingProperty(null);
          setRenovationJustifyText("");
        }}
        title="Justificar Atraso na Reforma"
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 rounded-xl text-sm text-balance text-amber-800">
            Você está informando o motivo da obra em{" "}
            <strong>{justifyingProperty?.name}</strong> estar demorando. Isso
            suspenderá este alerta por mais 7 dias.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Opções Rápidas:
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                "Atraso de material",
                "Atraso do empreiteiro",
                "Problema estrutural imprevisto",
                "Aguardando aprovação de orçamento",
                "Pausada temporariamente",
              ].map((opt) => (
                <button
                  key={opt}
                  onClick={() =>
                    setRenovationJustifyText((prev) =>
                      prev ? prev + " - " + opt : opt,
                    )
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-xs font-semibold rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motivo / Situação Atual
            </label>
            <textarea
              value={renovationJustifyText}
              onChange={(e) => setRenovationJustifyText(e.target.value)}
              placeholder="Descreva o motivo ou selecione uma opção acima..."
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium h-32 resize-none"
            />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleSaveRenovationJustification}
              disabled={!renovationJustifyText.trim()}
            >
              Salvar e Adiar Alerta
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsJustifyRenovationModalOpen(false);
                setJustifyingProperty(null);
                setRenovationJustifyText("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRemoveTenantModalOpen}
        onClose={() => setIsRemoveTenantModalOpen(false)}
        title="Desocupar Imóvel"
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-bold">Atenção!</p>
              <p>
                Ao desocupar o imóvel, as cobranças de aluguel pendentes serão
                canceladas e o contrato se tornará inativo automaticamente.
              </p>
              {removeTenantData &&
                (() => {
                  const tenant = tenants.find(
                    (t) => t.id === removeTenantData.tenantId,
                  );
                  const propertyPayments = payments.filter(
                    (p) =>
                      p.tenantId === removeTenantData.tenantId &&
                      p.propertyId === removeTenantData.propertyId,
                  );
                  const depositPayments = propertyPayments.filter(
                    (p) => p.type === "deposit" && p.status !== "cancelled",
                  );

                  if (!tenant) return null;

                  const totalReceived = depositPayments
                    .filter((p) => p.status === "paid" || p.status === "partial")
                    .reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);

                  const allUsages = depositPayments.flatMap(
                    (p) => p.depositUsage || [],
                  );
                  const usedAmount = allUsages.reduce(
                    (acc, u) => acc + u.amount,
                    0,
                  );

                  const currentDepositBalance = totalReceived - usedAmount;

                  const todayStr = format(new Date(), "yyyy-MM-dd");
                  const pendingDebts = propertyPayments
                    .filter(
                      (p) =>
                        p.status === "late" ||
                        (p.status === "pending" && p.dueDate < todayStr),
                    )
                    .reduce(
                      (acc, p) => acc + (p.amount - (p.paidAmount || 0)),
                      0,
                    );

                  const finalBalance = currentDepositBalance - pendingDebts;

                  return (
                    <div className="mt-4 space-y-2 bg-white/60 p-3 rounded-lg border border-amber-200/50">
                      <p className="text-xs font-semibold text-slate-700 flex justify-between">
                        <span>Caução Retido Disponível:</span>
                        <span className="text-indigo-600 font-bold">
                          R${" "}
                          {currentDepositBalance.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </p>
                      <p className="text-xs font-semibold text-slate-700 flex justify-between">
                        <span>Pendências do Inquilino (até hoje):</span>
                        <span className="text-red-500 font-bold">
                          - R${" "}
                          {pendingDebts.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </p>
                      <div className="pt-2 border-t border-amber-200/60 mt-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">
                            Saldo Sugerido:
                          </span>
                          <span
                            className={cn(
                              "text-base font-black",
                              finalBalance >= 0
                                ? "text-emerald-600"
                                : "text-amber-700",
                            )}
                          >
                            {finalBalance >= 0
                              ? "Devolver: "
                              : "Inquilino deve: "}
                            R${" "}
                            {Math.abs(finalBalance).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7 w-full bg-white font-bold"
                          onClick={() => {
                            setSettlementType(
                              finalBalance >= 0 ? "discount" : "extra",
                            );
                            setSettlementAmount(Math.abs(finalBalance));
                          }}
                        >
                          Usar saldo sugerido
                        </Button>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">
              O que fazer com o cadastro do Inquilino?
            </p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="tenantStatus"
                  checked={removeTenantData?.action === "archived"}
                  onChange={() =>
                    removeTenantData &&
                    setRemoveTenantData({
                      ...removeTenantData,
                      action: "archived",
                    })
                  }
                  className="w-4 h-4 text-primary focus:ring-primary/20 accent-primary"
                />
                <div>
                  <p className="font-semibold text-sm text-slate-700">
                    Arquivar Histórico
                  </p>
                  <p className="text-xs text-slate-500">
                    Mantém os dados para consultas futuras. (Recomendado)
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="tenantStatus"
                  checked={removeTenantData?.action === "waiting"}
                  onChange={() =>
                    removeTenantData &&
                    setRemoveTenantData({
                      ...removeTenantData,
                      action: "waiting",
                    })
                  }
                  className="w-4 h-4 text-primary focus:ring-primary/20 accent-primary"
                />
                <div>
                  <p className="font-semibold text-sm text-slate-700">
                    Fila de Espera
                  </p>
                  <p className="text-xs text-slate-500">
                    O inquilino continuará ativo e aguardando outro imóvel.
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-red-100 cursor-pointer hover:bg-red-50 transition-colors">
                <input
                  type="radio"
                  name="tenantStatus"
                  checked={removeTenantData?.action === "delete"}
                  onChange={() =>
                    removeTenantData &&
                    setRemoveTenantData({
                      ...removeTenantData,
                      action: "delete",
                    })
                  }
                  className="w-4 h-4 text-red-600 focus:ring-red-200 accent-red-600"
                />
                <div>
                  <p className="font-semibold text-sm text-red-700">
                    Excluir Permanentemente
                  </p>
                  <p className="text-xs text-red-500/80">
                    Apaga completamente o inquilino.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">
              Houve algum acerto final (pagamento extra ou devolução/desconto)?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSettlementType("extra")}
                className={cn(
                  "p-3 rounded-xl border text-sm font-medium transition-all",
                  settlementType === "extra"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                    : "bg-white border-slate-200 text-slate-600",
                )}
              >
                Inquilino deve pagar
              </button>
              <button
                onClick={() => setSettlementType("discount")}
                className={cn(
                  "p-3 rounded-xl border text-sm font-medium transition-all",
                  settlementType === "discount"
                    ? "bg-red-50 border-red-500 text-red-700"
                    : "bg-white border-slate-200 text-slate-600",
                )}
              >
                Devolver ao Inquilino
              </button>
            </div>

            <CurrencyInput
              id="settlementAmount"
              label="Valor do Acerto"
              value={settlementAmount}
              onChange={(val) => setSettlementAmount(val)}
            />
            <p className="text-[10px] text-slate-400 italic">
              Deixe R$ 0,00 se não houver transferência a ser feita.
            </p>
          </div>

          <div className="pt-4 flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                const tenantName = removeTenantData
                  ? tenants.find((t) => t.id === removeTenantData.tenantId)
                      ?.name
                  : "Inquilino";
                const description = `Ao confirmar, ${tenantName} vai desocupar o imóvel. Contratos e parcelas ativas serão ajustadas.`;
                executeWithSecurity(confirmRemoveTenant, description);
              }}
            >
              Confirmar Desocupação
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsRemoveTenantModalOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAgreementModalOpen}
        onClose={() => {
          setIsAgreementModalOpen(false);
          setAgreementForm({
            tenantId: "",
            description: "",
            totalAmount: 0,
            installmentAmount: 0,
            durationMonths: 1,
            startDate: format(new Date(), "yyyy-MM-dd"),
            justification: "",
            chargeLateFees: false,
            lateFeePenalty: 10,
            lateFeeDaily: 0.33,
            lateFeeType: "percentage",
          });
        }}
        title={
          agreementForm.id ? "Editar Acordo" : "Novo Acordo / Parcelamento"
        }
      >
        <form onSubmit={handleAddAgreement} className="space-y-4">
          <Select
            label="Inquilino"
            id="agreement-tenant"
            value={agreementForm.tenantId}
            onChange={(e) =>
              setAgreementForm({ ...agreementForm, tenantId: e.target.value })
            }
            options={[
              { label: "Selecione um inquilino", value: "" },
              ...tenants
                .filter((t) => t.status === "allocated")
                .map((t) => ({ label: t.name, value: t.id })),
            ]}
            required
          />
          <Input
            label="Descrição do Acordo"
            id="agreement-desc"
            placeholder="Ex: Pintura, Reparo de Infiltração, etc."
            value={agreementForm.description}
            onChange={(e) =>
              setAgreementForm({
                ...agreementForm,
                description: e.target.value,
              })
            }
            required
          />
          <CurrencyInput
            label="Valor Total do Acordo"
            id="agreement-amt"
            value={agreementForm.totalAmount}
            onChange={(val) =>
              setAgreementForm({ ...agreementForm, totalAmount: val })
            }
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nº de Parcelas"
              id="agreement-duration"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              min="1"
              value={agreementForm.durationMonths}
              onChange={(e) =>
                setAgreementForm({
                  ...agreementForm,
                  durationMonths: parseInt(e.target.value),
                })
              }
              required
            />
            <Input
              label="Data de Início"
              id="agreement-start"
              type="date"
              value={agreementForm.startDate}
              onChange={(e) =>
                setAgreementForm({
                  ...agreementForm,
                  startDate: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={agreementForm.chargeLateFees}
                onChange={(e) =>
                  setAgreementForm({
                    ...agreementForm,
                    chargeLateFees: e.target.checked,
                  })
                }
              />
              <span className="text-sm font-semibold text-slate-800">
                Cobrar juros e multas por atraso
              </span>
            </label>

            {agreementForm.chargeLateFees && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div className="flex flex-col gap-1.5">
                  <CurrencyInput
                    id="agreement-lateFeePenalty"
                    label="Multa Fixa"
                    value={agreementForm.lateFeePenalty}
                    onChange={(val) =>
                      setAgreementForm({
                        ...agreementForm,
                        lateFeePenalty: val,
                      })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                    Mora Diária (%)
                    <InfoTooltip text="Percentual cobrado por cada dia de atraso." />
                  </label>
                  <Input
                    id="agreement-lateFeeDaily"
                    type="text"
                    inputMode="decimal"
                    value={agreementForm.lateFeeDaily}
                    onChange={(e) => {
                      const val = e.target.value.replace(",", ".");
                      setAgreementForm({
                        ...agreementForm,
                        lateFeeDaily: val === "" ? 0 : Number(val),
                      });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {agreementForm.id && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Justificativa da Edição
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-slate-400"
                placeholder="Descreva o motivo da alteração..."
                value={agreementForm.justification}
                onChange={(e) =>
                  setAgreementForm({
                    ...agreementForm,
                    justification: e.target.value,
                  })
                }
                required
              />
            </div>
          )}

          {agreementForm.totalAmount! > 0 &&
            agreementForm.durationMonths! > 0 && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">
                  Cálculo das Parcelas
                </p>
                <p className="text-lg font-bold text-emerald-700">
                  {agreementForm.durationMonths}x de R${" "}
                  {(
                    (agreementForm.totalAmount || 0) /
                    (agreementForm.durationMonths || 1)
                  ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-emerald-600/70 mt-1 italic">
                  As cobranças serão geradas automaticamente no financeiro.
                </p>
              </div>
            )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
              Anexar Evidência (Foto/PDF)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="agreement-evidence"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      const base64 = reader.result as string;
                      if (isDriveConnected) {
                        const tenantName =
                          tenants.find((t) => t.id === agreementForm.tenantId)
                            ?.name || "Geral";
                        toast.promise(
                          uploadToDrive(
                            file.name,
                            base64,
                            file.type,
                            tenantName,
                          ),
                          {
                            loading:
                              "Enviando evidência para o Google Drive...",
                            success: (data) => {
                              setAgreementForm({
                                ...agreementForm,
                                evidence: data.webViewLink,
                                evidenceName: file.name,
                                thumbnailLink: data.thumbnailLink,
                              });
                              return "Evidência salva no Google Drive!";
                            },
                            error: "Erro ao enviar para o Google Drive.",
                          },
                        );
                      } else {
                        if (file.type.startsWith("image/")) {
                          compressImage(base64).then((compressed) => {
                            setAgreementForm({
                              ...agreementForm,
                              evidence: compressed,
                              evidenceName: file.name,
                              thumbnailLink: "",
                            });
                          });
                        } else {
                          setAgreementForm({
                            ...agreementForm,
                            evidence: base64,
                            evidenceName: file.name,
                            thumbnailLink: "",
                          });
                        }
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <button
                type="button"
                onClick={() =>
                  document.getElementById("agreement-evidence")?.click()
                }
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 transition-colors text-xs font-medium"
              >
                <Upload className="w-3.5 h-3.5" />
                Escolher Arquivo
              </button>
              {agreementForm.evidence && (
                <button
                  type="button"
                  onClick={() =>
                    setAgreementForm({
                      ...agreementForm,
                      evidence: "",
                      evidenceName: "",
                    })
                  }
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                  title="Remover anexo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {agreementForm.evidence && (
              <div className="mt-1 p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                {agreementForm.evidence.startsWith("data:image") ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white">
                    <img
                      src={agreementForm.evidence}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-slate-700 truncate">
                    {agreementForm.evidenceName || "Arquivo anexado"}
                  </p>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">
                    Pronto para salvar
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
              Localização do Comprovante (Opcional)
            </label>
            <input
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-slate-400"
              placeholder="Ex: Pasta Física 2024, Google Drive, etc."
              value={agreementForm.evidenceLocation}
              onChange={(e) =>
                setAgreementForm({
                  ...agreementForm,
                  evidenceLocation: e.target.value,
                })
              }
            />
          </div>

          <div className="pt-4 flex gap-2">
            <Button
              type="submit"
              className="flex-1 py-3"
              disabled={
                isSubmitting ||
                (!!agreementForm.id && !agreementForm.justification)
              }
            >
              {isSubmitting
                ? "Processando..."
                : agreementForm.id
                  ? "Salvar Alterações"
                  : "Gerar Acordo"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsAgreementModalOpen(false)}
              className="py-3"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isArchiveAgreementModalOpen}
        onClose={() => setIsArchiveAgreementModalOpen(false)}
        title="Arquivar / Excluir Acordo"
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-bold">Atenção!</p>
              <p>
                Ao arquivar ou excluir um acordo, todas as parcelas
                **pendentes** vinculadas a ele serão canceladas automaticamente.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Justificativa
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-slate-400"
                placeholder="Descreva o motivo do cancelamento/arquivamento..."
                value={archiveJustification}
                onChange={(e) => setArchiveJustification(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                className="py-3 bg-amber-600 hover:bg-amber-700"
                disabled={!archiveJustification || isSubmitting}
                onClick={() => {
                  if (archivingAgreement) {
                    const description = `Ao confirmar, o acordo "${archivingAgreement.description}" será arquivado e as parcelas pendentes canceladas.`;
                    executeWithSecurity(
                      () =>
                        archiveAgreement(
                          archivingAgreement,
                          archiveJustification,
                          "archived",
                        ),
                      description,
                    );
                  }
                }}
              >
                {isSubmitting ? "Processando..." : "Arquivar Acordo"}
              </Button>
              <Button
                variant="danger"
                className="py-3"
                disabled={!archiveJustification || isSubmitting}
                onClick={() => {
                  if (archivingAgreement) {
                    const description = `Ao confirmar, o acordo "${archivingAgreement.description}" será excluído permanentemente e as parcelas pendentes canceladas.`;
                    executeWithSecurity(
                      () =>
                        archiveAgreement(
                          archivingAgreement,
                          archiveJustification,
                          "deleted",
                        ),
                      description,
                    );
                  }
                }}
              >
                {isSubmitting ? "Processando..." : "Excluir Acordo"}
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full py-3"
              onClick={() => setIsArchiveAgreementModalOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isTenantDetailModalOpen}
        onClose={() => setIsTenantDetailModalOpen(false)}
        title="Perfil do Inquilino"
      >
        {selectedTenantForDetail && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {selectedTenantForDetail.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedTenantForDetail.name}
                </h3>
                <p className="text-sm text-slate-500">
                  CPF: {selectedTenantForDetail.cpf}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-3 h-3",
                        i < (selectedTenantForDetail.rating || 0)
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-200",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Contato Principal
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-700">
                      {selectedTenantForDetail.contact}
                    </p>
                  </div>
                  {selectedTenantForDetail.contact && (
                    <a
                      href={getWhatsAppLink(
                        selectedTenantForDetail.contact,
                        `Olá ${selectedTenantForDetail.name.split(" ")[0]}, tudo bem?`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors"
                      title="Enviar mensagem no WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Emergência
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-400" />
                  <p className="text-sm text-slate-700">
                    {selectedTenantForDetail.secondaryContact ||
                      "Não informado"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Imóvel Atual
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Home className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">
                    {properties.find(
                      (p) => p.id === selectedTenantForDetail.propertyId,
                    )?.name || "Nenhum imóvel alocado"}
                  </p>
                </div>
                <span
                  className={cn(
                    "px-2 py-1 rounded text-[10px] uppercase font-bold",
                    selectedTenantForDetail.status === "allocated"
                      ? "bg-emerald-100 text-emerald-700"
                      : selectedTenantForDetail.status === "waiting"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700",
                  )}
                >
                  {selectedTenantForDetail.status === "allocated"
                    ? "Alocado"
                    : selectedTenantForDetail.status === "waiting"
                      ? "Espera"
                      : "Arquivado"}
                </span>
              </div>
            </div>

            {/* Intelligent Memory Integration for Tenant */}
            {(() => {
              const activeContract = contracts.find(
                (c) =>
                  c.tenantId === selectedTenantForDetail.id &&
                  c.status === "active",
              );
              const propId = activeContract
                ? activeContract.propertyId
                : selectedTenantForDetail.propertyId;
              const linkedProperty = properties.find((p) => p.id === propId);

              const hasPetConflict =
                linkedProperty &&
                linkedProperty.allowPets === false &&
                (selectedTenantForDetail.hasPets ||
                  (selectedTenantForDetail.pets &&
                    selectedTenantForDetail.pets.trim() !== ""));
              const hasSmokeConflict =
                !!selectedTenantForDetail.isSmoker &&
                linkedProperty?.allowSmoking === false;
              const hasVehicleConflict =
                (!!selectedTenantForDetail.vehicleDetails ||
                  !!selectedTenantForDetail.hasVehicles) &&
                linkedProperty?.parkingSpaces === 0;

              const detailResidentCount =
                1 + (selectedTenantForDetail.additionalResidents?.length || 0);
              const hasResidentConflict = linkedProperty?.maxResidents
                ? detailResidentCount > linkedProperty.maxResidents
                : false;

              const hasAlerts = !!linkedProperty?.alerts;

              if (
                !hasPetConflict &&
                !hasSmokeConflict &&
                !hasVehicleConflict &&
                !hasResidentConflict &&
                !hasAlerts
              )
                return null;

              return (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold flex items-center gap-1.5 text-indigo-500 uppercase tracking-wider ml-1">
                    <Sparkles className="w-3.5 h-3.5" /> Controle Inteligente de
                    Vínculo
                  </p>
                  <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/50 p-4 rounded-2xl space-y-3 shadow-sm">
                    {hasPetConflict && (
                      <div className="flex items-center gap-2 text-red-700 bg-red-50 p-2 rounded">
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-semibold">
                          Conflito Grave: Inquilino possui pet, mas o Imóvel não
                          permite!
                        </span>
                      </div>
                    )}
                    {hasSmokeConflict && (
                      <div className="flex items-center gap-2 text-amber-800 bg-amber-50 p-2 rounded">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-semibold">
                          Atenção: Inquilino é fumante e o Imóvel tem regras
                          sobre fumo.
                        </span>
                      </div>
                    )}
                    {hasVehicleConflict && (
                      <div className="flex items-center gap-2 text-amber-800 bg-amber-50 p-2 rounded">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-semibold">
                          Garagem: Verificar veículos (
                          {selectedTenantForDetail.vehicleDetails}).
                        </span>
                      </div>
                    )}
                    {hasResidentConflict && (
                      <div className="flex items-center gap-2 text-rose-800 bg-rose-50 p-2 rounded border border-rose-200">
                        <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-semibold">
                          Alerta de Ocupação: O imóvel ultrapassou o limite
                          permitido. Moradores cadastrados:{" "}
                          {1 +
                            (selectedTenantForDetail.additionalResidents
                              ?.length || 0)}{" "}
                          de {linkedProperty?.maxResidents} permitidos.
                        </span>
                      </div>
                    )}

                    {hasAlerts && (
                      <div className="flex gap-2 text-sm text-slate-700">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                          <Info className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-semibold block mb-0.5 text-slate-900">
                            Avisos Importantes do Imóvel:
                          </span>
                          <p className="leading-relaxed whitespace-pre-wrap text-sm">
                            {linkedProperty.alerts}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {selectedTenantForDetail.observations && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Observações
                </p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-600 italic leading-relaxed">
                    "{selectedTenantForDetail.observations}"
                  </p>
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
                property={properties.find(
                  (p) => p.id === selectedTenantForDetail.propertyId,
                )}
                onConfirmPayment={redirectToReceivables}
                setPreviewReceipt={setPreviewReceipt}
              />
            </div>

            {selectedTenantForDetail.evidenceLocation && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Localização do Comprovante
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-sm text-slate-700 truncate">
                      {selectedTenantForDetail.evidenceLocation}
                    </p>
                  </div>
                  {selectedTenantForDetail.evidenceLocation.startsWith(
                    "http",
                  ) && (
                    <a
                      href={selectedTenantForDetail.evidenceLocation}
                      target="_blank"
                      rel="noreferrer"
                    >
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Contrato / Documento
                  </p>
                  {selectedTenantForDetail.contractFile.startsWith(
                    "data:image",
                  ) ||
                  selectedTenantForDetail.thumbnailLink ||
                  (selectedTenantForDetail.evidenceName &&
                    /\.(jpg|jpeg|png|webp)$/i.test(
                      selectedTenantForDetail.evidenceName,
                    )) ? (
                    <div className="relative group overflow-hidden rounded-2xl border border-slate-200">
                      <img
                        src={
                          selectedTenantForDetail.thumbnailLink ||
                          selectedTenantForDetail.contractFile
                        }
                        alt="Contrato"
                        className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          const isImage =
                            selectedTenantForDetail.contractFile?.match(
                              /\.(jpeg|jpg|gif|png)$/i,
                            ) ||
                            selectedTenantForDetail.thumbnailLink ||
                            selectedTenantForDetail.contractFile?.startsWith(
                              "data:image",
                            );
                          setPreviewReceipt({
                            url: selectedTenantForDetail.contractFile!,
                            name: `Contrato - ${selectedTenantForDetail.name}`,
                            isImage: !!isImage,
                          });
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <div className="bg-white/90 text-slate-900 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                          <ExternalLink className="w-3 h-3" /> Ampliar Foto
                        </div>
                      </div>
                      {isGoogleDriveLink(
                        selectedTenantForDetail.contractFile,
                      ) && (
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
                          <p className="text-sm font-medium text-slate-700">
                            {selectedTenantForDetail.evidenceName ||
                              "Arquivo de Contrato"}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">
                            Documento PDF/Arquivo
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 gap-2"
                        onClick={() => {
                          const isImage =
                            selectedTenantForDetail.contractFile?.match(
                              /\.(jpeg|jpg|gif|png)$/i,
                            ) ||
                            selectedTenantForDetail.thumbnailLink ||
                            selectedTenantForDetail.contractFile?.startsWith(
                              "data:image",
                            );
                          setPreviewReceipt({
                            url: selectedTenantForDetail.contractFile!,
                            name: `Contrato - ${selectedTenantForDetail.name}`,
                            isImage: !!isImage,
                          });
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setIsTenantDetailModalOpen(false);
                    setActiveTab("tenants");
                    setInitialTenantIdToEdit(selectedTenantForDetail.id);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </Button>
                
                {selectedTenantForDetail.status !== "archived" && (
                  <Button
                    variant="outline"
                    className="flex-1 hover:bg-slate-100"
                    onClick={() => {
                      setIsTenantDetailModalOpen(false);
                      const linkedContracts = contracts.filter(
                        (c) => c.tenantId === selectedTenantForDetail.id && c.status === "active"
                      );
                      let warningMsg = `Ao confirmar, você arquivará o registro de ${selectedTenantForDetail.name}.`;
                      if (linkedContracts.length > 0) {
                        warningMsg = `Atenção: O inquilino "${selectedTenantForDetail.name}" possui ${linkedContracts.length} contrato(s) ativo(s). Ao arquivar o inquilino, o contrato e as parcelas pendentes também serão arquivados ou cancelados. Você poderá consultar no histórico.`;
                      }
                      executeWithSecurity(
                        () => updateTenant(selectedTenantForDetail.id, { status: "archived" }),
                        warningMsg,
                      );
                    }}
                  >
                    <Archive className="w-4 h-4 mr-2" /> Arquivar
                  </Button>
                )}
                {selectedTenantForDetail.contractFile && (
                  <a
                    href={selectedTenantForDetail.contractFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" /> Baixar
                    </Button>
                  </a>
                )}
                <Button
                  variant="danger"
                  onClick={() => {
                    setIsTenantDetailModalOpen(false);
                    const linkedContracts = contracts.filter(
                      (c) => c.tenantId === selectedTenantForDetail.id && c.status !== "archived"
                    );
                    let warningMsg = `Ao confirmar, você excluirá permanentemente o registro de ${selectedTenantForDetail.name}.`;
                    if (linkedContracts.length > 0) {
                      warningMsg = `Atenção: O inquilino "${selectedTenantForDetail.name}" possui ${linkedContracts.length} contrato(s) de locação vinculado(s). Ao confirmar a exclusão, este inquilino será removido e o contrato vinculado será automaticamente ARQUIVADO por segurança para o seu histórico. Você poderá encontrar o contrato arquivado a qualquer momento na seção de Contratos, utilizando o filtro 'Arquivados'.`;
                    }
                    executeWithSecurity(
                      () => deleteTenant(selectedTenantForDetail.id),
                      warningMsg,
                    );
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
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
