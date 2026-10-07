import React, { useState, useMemo, useRef } from 'react';
import { Contract, Property, Tenant, Payment, OperationType, StorageSpace, DocumentVersion } from '../types';
import { 
  FileText, Plus, Search, CheckCircle2, XCircle, Clock, X,
  Trash2, AlertTriangle, Upload, Eye, FileSignature, Sparkles,
  ChevronDown, ChevronUp, Maximize, RotateCcw, Archive, TrendingUp,
  Building2, User, DollarSign, Calendar, ArrowRight, FileCheck, Check,
  Printer, Copy, Edit3, Receipt, RefreshCw, HelpCircle, History, Key, ShieldCheck
} from 'lucide-react';
import { ContractTerminationModal } from './ContractTerminationModal';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { adjustDateToNextBusinessDay } from '../utils/dateHelpers';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { addDoc, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { CreationProgressOverlay, ProgressStep } from './CreationProgressOverlay';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SimulatedInstallment {
  monthIndex: number;
  monthName: string;
  dueDate: string;
  status: 'paid' | 'pending';
  statusLabel: string;
  amount: number;
  isRetroactive: boolean;
}

export function generateContractInstallmentsList(
  startDateStr: string,
  rentValue: number,
  paymentDay: number,
  endDateStr?: string
): SimulatedInstallment[] {
  if (!startDateStr || !rentValue) return [];

  const [startYear, startMonth] = startDateStr.split('-').map(Number);
  if (!startYear || !startMonth) return [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 to 12

  const installments: SimulatedInstallment[] = [];
  let curY = startYear;
  let curM = startMonth;
  let monthIndex = 1;

  while (curY < currentYear || (curY === currentYear && curM <= currentMonth)) {
    const yearStr = curY.toString();
    const monthStr = curM.toString().padStart(2, '0');
    const dayStr = Math.min(paymentDay || 5, 28).toString().padStart(2, '0');
    const dueDate = `${yearStr}-${monthStr}-${dayStr}`;

    const isPastMonth = (curY < currentYear) || (curY === currentYear && curM < currentMonth);
    const status: 'paid' | 'pending' = isPastMonth ? 'paid' : 'pending';

    const dateObj = new Date(curY, curM - 1, 1);
    const monthNameFormatted = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalizedMonth = monthNameFormatted.charAt(0).toUpperCase() + monthNameFormatted.slice(1);

    installments.push({
      monthIndex,
      monthName: `Mês ${monthIndex} (${capitalizedMonth})`,
      dueDate,
      status,
      statusLabel: isPastMonth 
        ? `Mês ${monthIndex} - Quitado Retroativamente (Pago)` 
        : `Mês ${monthIndex} - A Vencer (Cobrança Atual/Pendente)`,
      amount: rentValue,
      isRetroactive: isPastMonth
    });

    monthIndex++;
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }

    if (monthIndex > 120) break;
  }

  if (installments.length === 0) {
    const dayStr = Math.min(paymentDay || 5, 28).toString().padStart(2, '0');
    const monthStr = startMonth.toString().padStart(2, '0');
    const dueDate = `${startYear}-${monthStr}-${dayStr}`;
    installments.push({
      monthIndex: 1,
      monthName: `Mês 1 (${startYear}-${monthStr})`,
      dueDate,
      status: 'pending',
      statusLabel: 'Mês 1 - A Vencer (1º Aluguel)',
      amount: rentValue,
      isRetroactive: false
    });
  }

  return installments;
}

const cleanObject = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanObject).filter(v => v !== undefined);
  if (typeof obj === 'object') {
    const proto = Object.getPrototypeOf(obj);
    if (proto !== null && proto !== Object.prototype) {
      return obj;
    }
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanObject(val);
      }
    });
    return cleaned;
  }
  return obj;
};

import { db, auth } from '../firebase';
import { handleFirestoreError } from '../utils/firestoreError';
import { toast } from 'sonner';
import { generateLeaseContract } from '../services/geminiService';
import { getAccumulatedIndex } from '../services/bcbService';
import { formatOfficialAddress } from '../utils/addressHelpers';

interface ContractsViewProps {
  contracts: Contract[];
  properties: Property[];
  tenants: Tenant[];
  payments?: Payment[];
  onSecurityCheck: (onSuccess: () => void, description?: string) => void;
  isDriveConnected: boolean;
  uploadToDrive?: (fileName: string, fileData: string, mimeType: string, folderName?: string) => Promise<any>;
  initialOpenTemplate?: string | null;
  initialContractData?: any;
  onClearInitialContractData?: () => void;
  storages?: StorageSpace[];
}

export const ContractsView = ({
  contracts,
  properties,
  tenants,
  payments = [],
  onSecurityCheck,
  isDriveConnected,
  uploadToDrive,
  initialOpenTemplate,
  initialContractData,
  onClearInitialContractData,
  storages = []
}: ContractsViewProps) => {
  const [filterStatus, setFilterStatus] = useState<Contract['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationSteps, setCreationSteps] = useState<ProgressStep[]>([]);
  const [showProgressOverlay, setShowProgressOverlay] = useState(false);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  
  const [aiDocumentType, setAiDocumentType] = useState(initialOpenTemplate || 'Contrato de Locação');
  const [isModelsExpanded, setIsModelsExpanded] = useState(false);
  const [isFullscreenAiEditor, setIsFullscreenAiEditor] = useState(false);
  const [isRenewArchiveModalOpen, setIsRenewArchiveModalOpen] = useState(false);
  const [renewArchiveMode, setRenewArchiveMode] = useState<'renew' | 'archive'>('renew');
  const [targetContract, setTargetContract] = useState<Contract | null>(null);
  const [raEndDate, setRaEndDate] = useState('');
  const [raObservations, setRaObservations] = useState('');
  const [terminatingContract, setTerminatingContract] = useState<Contract | null>(null);
  const [viewingTerminationContract, setViewingTerminationContract] = useState<Contract | null>(null);

  // Estados para o Gerador Rápido de Documentos Legais (Modelos Rápidos)
  const [isQuickDocModalOpen, setIsQuickDocModalOpen] = useState(false);
  const [quickDocType, setQuickDocType] = useState('Declaração de Residência e Vínculo Locatício');
  const [quickDocTenantId, setQuickDocTenantId] = useState('');
  const [quickDocPropertyId, setQuickDocPropertyId] = useState('');
  const [quickDocCustomTenantName, setQuickDocCustomTenantName] = useState('');
  const [quickDocCustomTenantCpf, setQuickDocCustomTenantCpf] = useState('');
  const [quickDocSpouse, setQuickDocSpouse] = useState('');
  const [quickDocChildren, setQuickDocChildren] = useState('');
  const [quickDocAdditionalResidentsText, setQuickDocAdditionalResidentsText] = useState('');
  const [quickDocCustomPropertyAddress, setQuickDocCustomPropertyAddress] = useState('');
  const [quickDocRentValue, setQuickDocRentValue] = useState<number>(0);
  const [quickDocStartDate, setQuickDocStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [quickDocText, setQuickDocText] = useState('');
  const [isGeneratingQuickDoc, setIsGeneratingQuickDoc] = useState(false);
  const [isEditingQuickDocText, setIsEditingQuickDocText] = useState(false);
  const quickDocRef = useRef<HTMLDivElement>(null);

  const cleanDocHtml = (html: string) => {
    if (!html) return '';
    return html
      .replace(/<mark[^>]*>/gi, '')
      .replace(/<\/mark>/gi, '')
      .replace(/style="[^"]*background-color:[^"]*"/gi, '');
  };

  const handleSelectQuickDocTenant = (tenantId: string) => {
    setQuickDocTenantId(tenantId);
    if (!tenantId) return;
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setQuickDocCustomTenantName(tenant.name || '');
      setQuickDocCustomTenantCpf(tenant.cpf || '');
      setQuickDocSpouse(tenant.spouse || '');
      setQuickDocChildren(tenant.children || '');

      // Formatar moradores e dependentes cadastrados no inquilino
      let residentsFormatted = '';
      if (tenant.additionalResidents && Array.isArray(tenant.additionalResidents) && tenant.additionalResidents.length > 0) {
        residentsFormatted = tenant.additionalResidents.map(r => 
          `- ${r.name || 'Morador'} (${r.relation || 'Dependente'}${r.cpf ? `, CPF: ${r.cpf}` : ''}${r.age ? `, Idade: ${r.age}` : ''})`
        ).join('\n');
      }
      setQuickDocAdditionalResidentsText(residentsFormatted);

      // Buscar contrato ativo para auto-preencher valores e datas reais
      const tenantContract = contracts.find(c => c.tenantId === tenant.id && c.status === 'active') || contracts.find(c => c.tenantId === tenant.id);
      if (tenantContract) {
        if (tenantContract.startDate) setQuickDocStartDate(tenantContract.startDate);
        if (tenantContract.rentValue) setQuickDocRentValue(tenantContract.rentValue);
      } else {
        if (tenant.rentValue) setQuickDocRentValue(tenant.rentValue);
        if (tenant.startDate) setQuickDocStartDate(tenant.startDate);
      }

      const targetPropId = tenant.propertyId || tenantContract?.propertyId;
      if (targetPropId) {
        setQuickDocPropertyId(targetPropId);
        const prop = properties.find(p => p.id === targetPropId);
        if (prop?.address) setQuickDocCustomPropertyAddress(prop.address);
        if (!quickDocRentValue && prop?.rentValue) setQuickDocRentValue(prop.rentValue);
      }
    }
  };

  const handleSelectQuickDocProperty = (propId: string) => {
    setQuickDocPropertyId(propId);
    if (!propId) return;
    const prop = properties.find(p => p.id === propId);
    if (prop) {
      if (prop.address) setQuickDocCustomPropertyAddress(prop.address);
      if (prop.rentValue) setQuickDocRentValue(prop.rentValue);

      // Se não houver inquilino selecionado, auto-seleciona o inquilino vinculado ao imóvel
      if (!quickDocTenantId) {
        const linkedTenant = tenants.find(t => t.propertyId === propId) || 
          tenants.find(t => t.id === prop.currentTenantId) ||
          tenants.find(t => contracts.some(c => c.propertyId === propId && c.tenantId === t.id && c.status === 'active'));
        if (linkedTenant && linkedTenant.id) {
          handleSelectQuickDocTenant(linkedTenant.id);
        }
      }
    }
  };

  const handleGenerateQuickDocument = async () => {
    setIsGeneratingQuickDoc(true);
    try {
      let selectedTenant: Partial<Tenant> | undefined;
      if (quickDocTenantId) {
        selectedTenant = tenants.find(t => t.id === quickDocTenantId);
      } else if (quickDocCustomTenantName) {
        selectedTenant = tenants.find(t => t.name?.toLowerCase().trim() === quickDocCustomTenantName.toLowerCase().trim() || (quickDocCustomTenantCpf && t.cpf === quickDocCustomTenantCpf));
      }
      
      const activeContract = contracts.find(c => (c.tenantId === quickDocTenantId || (selectedTenant && c.tenantId === selectedTenant.id)) && c.status === 'active') || 
        contracts.find(c => c.tenantId === quickDocTenantId || (selectedTenant && c.tenantId === selectedTenant.id));

      let selectedProperty: Partial<Property> | undefined;
      if (quickDocPropertyId) {
        selectedProperty = properties.find(p => p.id === quickDocPropertyId);
      } else if (selectedTenant?.propertyId || activeContract?.propertyId) {
        selectedProperty = properties.find(p => p.id === (selectedTenant?.propertyId || activeContract?.propertyId));
      }

      // Obter Perfil do Locador do localStorage ou Contrato
      let lp: any = {};
      try {
        const saved = localStorage.getItem("imob_landlord_profile");
        if (saved) lp = JSON.parse(saved);
      } catch (e) {}

      const tenantData: Partial<Tenant> & Record<string, any> = {
        ...(selectedTenant || {}),
        name: quickDocCustomTenantName || selectedTenant?.name || 'Inquilino / Locatário',
        cpf: quickDocCustomTenantCpf || selectedTenant?.cpf || '',
        contact: selectedTenant?.contact || selectedTenant?.secondaryContact || '',
        rentValue: quickDocRentValue || selectedTenant?.rentValue || activeContract?.rentValue || selectedProperty?.rentValue || 0,
        startDate: quickDocStartDate || activeContract?.startDate || selectedTenant?.startDate || format(new Date(), 'yyyy-MM-dd'),
        endDate: activeContract?.endDate || selectedTenant?.endDate || '',
        paymentDay: selectedTenant?.paymentDay || activeContract?.paymentDay || selectedProperty?.paymentDay || 5,
        spouse: quickDocSpouse || selectedTenant?.spouse || '',
        children: quickDocChildren || selectedTenant?.children || '',
        additionalOccupantsText: quickDocAdditionalResidentsText,
        additionalResidentsText: quickDocAdditionalResidentsText,
        additionalResidents: selectedTenant?.additionalResidents || [],
        leaseDurationMonths: activeContract?.leaseDurationMonths || selectedTenant?.leaseDurationMonths || 12,
        landlordName: activeContract?.landlordName || lp.name || auth.currentUser?.displayName || '',
        landlordCpf: activeContract?.landlordCpf || lp.cpfCnpj || '',
        landlordRg: activeContract?.landlordRg || lp.rg || '',
        landlordQualification: activeContract?.landlordQualification || lp.qualification || 'brasileiro(a), proprietário(a)',
        landlordAddress: activeContract?.landlordAddress || lp.address || '',
        landlordPhone: activeContract?.landlordPhone || lp.phone || '',
        landlordEmail: activeContract?.landlordEmail || lp.email || auth.currentUser?.email || '',
      };

      const officialAddress = formatOfficialAddress(selectedProperty) || selectedProperty?.officialAddress || selectedProperty?.address || '';
      const propertyData: Partial<Property> = {
        ...(selectedProperty || {}),
        name: selectedProperty?.name || (quickDocCustomPropertyAddress ? quickDocCustomPropertyAddress.split(',')[0] : 'Imóvel Residencial'),
        address: quickDocCustomPropertyAddress || officialAddress || selectedProperty?.address || '',
        officialAddress: officialAddress,
        cep: selectedProperty?.cep || '',
        rentValue: quickDocRentValue || selectedProperty?.rentValue || activeContract?.rentValue || 0,
        paymentDay: selectedProperty?.paymentDay || selectedTenant?.paymentDay || activeContract?.paymentDay || 5,
        rules: selectedProperty?.rules || '',
        alerts: selectedProperty?.alerts || '',
        allowPets: selectedProperty?.allowPets,
        allowSmoking: selectedProperty?.allowSmoking,
        maxResidents: selectedProperty?.maxResidents,
      };

      const docHtml = await generateLeaseContract(tenantData, propertyData, quickDocType);
      const cleanedHtml = cleanDocHtml(docHtml);
      setQuickDocText(cleanedHtml);
      if (quickDocRef.current) {
        quickDocRef.current.innerHTML = cleanedHtml;
      }
      toast.success(`${quickDocType} gerado com sucesso!`);
    } catch (err: any) {
      toast.error('Erro ao gerar documento. Tente novamente.');
    } finally {
      setIsGeneratingQuickDoc(false);
    }
  };

  const handleToggleQuickDocEdit = () => {
    if (isEditingQuickDocText) {
      if (quickDocRef.current) {
        const currentHtml = cleanDocHtml(quickDocRef.current.innerHTML);
        setQuickDocText(currentHtml);
      }
      setIsEditingQuickDocText(false);
      toast.success('Edição concluída!');
    } else {
      setIsEditingQuickDocText(true);
      setTimeout(() => {
        if (quickDocRef.current) {
          quickDocRef.current.focus();
        }
      }, 50);
    }
  };

  const handlePrintQuickDoc = () => {
    if (quickDocRef.current) {
      setQuickDocText(cleanDocHtml(quickDocRef.current.innerHTML));
    }
    window.print();
  };

  const [formData, setFormData] = useState<Partial<Contract>>({
    tenantId: '',
    propertyId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    rentValue: 0,
    paymentDay: 5,
    chargeLateFees: true,
    lateFeePenalty: 2,
    lateFeeDaily: 0.033,
    lateFeeType: 'percentage',
    status: 'active'
  });

  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [hasPriorDebt, setHasPriorDebt] = useState<boolean>(false);
  const [overriddenInstallmentStatuses, setOverriddenInstallmentStatuses] = useState<Record<number, 'paid' | 'pending'>>({});
  const [priorRentOption, setPriorRentOption] = useState<'all_paid' | 'has_pending' | 'unconfirmed'>('all_paid');

  // Confirmation modal state for existing contracts
  const [confirmingHistoryContract, setConfirmingHistoryContract] = useState<Contract | null>(null);
  const [confirmHistoryOption, setConfirmHistoryOption] = useState<'all_paid' | 'has_pending' | 'unconfirmed'>('all_paid');
  const [confirmHistoryOverrides, setConfirmHistoryOverrides] = useState<Record<number, 'paid' | 'pending'>>({});
  const [isConfirmHistorySubmitting, setIsConfirmHistorySubmitting] = useState(false);

  // Contract Document Versions states
  const [selectedContractForVersions, setSelectedContractForVersions] = useState<Contract | null>(null);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);

  const handleRestoreContractVersion = async (contract: Contract, version: DocumentVersion) => {
    if (!contract.id) return;
    try {
      const existingFile = contract.contractFile;
      const existingName = contract.evidenceName;

      // Keep current active file in versions list before swapping
      let updatedVersions = (contract.fileVersions || []).filter(v => v.id !== version.id);
      if (existingFile && existingFile !== version.url) {
        updatedVersions = [
          {
            id: `ver_${Date.now()}`,
            name: existingName || 'Versão Anterior.pdf',
            url: existingFile,
            uploadedAt: contract.updatedAt || new Date().toISOString(),
            notes: 'Substituído ao restaurar versão anterior'
          },
          ...updatedVersions
        ].slice(0, 10);
      }

      await updateDoc(doc(db, 'contracts', contract.id), cleanObject({
        contractFile: version.url,
        evidenceName: version.name,
        fileVersions: updatedVersions,
        updatedAt: new Date().toISOString()
      }));

      // If this contract is currently open in modal, update formData too
      if (editingContract?.id === contract.id) {
        setFormData(prev => ({
          ...prev,
          contractFile: version.url,
          evidenceName: version.name,
          fileVersions: updatedVersions
        }));
      }

      toast.success(`Versão "${version.name}" restaurada como documento ativo!`);
      setIsVersionsModalOpen(false);
      setSelectedContractForVersions(null);
    } catch (err: any) {
      console.error('Erro ao restaurar versão do contrato:', err);
      toast.error('Falha ao restaurar versão anterior.');
    }
  };

  const pastMonthsCount = useMemo(() => {
    if (!formData.startDate) return 0;
    const parts = formData.startDate.split('-').map(Number);
    if (parts.length < 2 || !parts[0] || !parts[1]) return 0;
    const [startYear, startMonth] = parts;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    const diff = (currentYear - startYear) * 12 + (currentMonth - startMonth);
    return diff > 0 ? diff : 0;
  }, [formData.startDate]);

  const detectedContractChanges = useMemo(() => {
    if (!editingContract) return [];
    const changes: string[] = [];
    if (editingContract.paymentDay !== Number(formData.paymentDay)) {
      changes.push(`Vencimento alterado do dia ${editingContract.paymentDay} para o dia ${formData.paymentDay}`);
    }
    if (editingContract.rentValue !== Number(formData.rentValue)) {
      changes.push(`Aluguel reajustado de R$ ${editingContract.rentValue?.toLocaleString('pt-BR', {minimumFractionDigits: 2})} para R$ ${Number(formData.rentValue).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    }
    if (editingContract.endDate !== formData.endDate) {
      changes.push(`Duração/término do contrato atualizado (Anterior: ${editingContract.endDate || 'Não informado'} ➔ Novo: ${formData.endDate || 'Não informado'})`);
    }
    return changes;
  }, [editingContract, formData.paymentDay, formData.rentValue, formData.endDate]);

  const simulatedInstallments = useMemo(() => {
    if (!formData.startDate || !formData.rentValue || !formData.paymentDay) return [];
    const baseList = generateContractInstallmentsList(
      formData.startDate,
      Number(formData.rentValue),
      Number(formData.paymentDay),
      formData.endDate
    );

    return baseList.map(inst => {
      if (inst.isRetroactive) {
        let st: 'paid' | 'pending' = 'paid';
        let label = `Mês ${inst.monthIndex} - Quitado Retroativamente`;

        if (priorRentOption === 'all_paid') {
          st = 'paid';
          label = `Mês ${inst.monthIndex} - Quitado (Histórico Inicial)`;
        } else if (priorRentOption === 'has_pending') {
          st = overriddenInstallmentStatuses[inst.monthIndex] || 'pending';
          label = st === 'paid'
            ? `Mês ${inst.monthIndex} - Quitado (Pago)`
            : `Mês ${inst.monthIndex} - Débito Anterior Pendente (Devendo)`;
        } else if (priorRentOption === 'unconfirmed') {
          st = 'paid';
          label = `Mês ${inst.monthIndex} - Pendente de Confirmação pelo Usuário`;
        }

        return {
          ...inst,
          status: st,
          statusLabel: label
        };
      }
      return inst;
    });
  }, [formData.startDate, formData.rentValue, formData.paymentDay, formData.endDate, priorRentOption, overriddenInstallmentStatuses]);

  const handleOpenSimulation = () => {
    if (!formData.tenantId || !formData.propertyId || !formData.startDate || !formData.rentValue || !formData.paymentDay) {
      toast.error('Preencha os campos obrigatórios para simular (Inquilino, Imóvel, Início, Valor e Dia).');
      return;
    }
    setIsSimulationModalOpen(true);
  };

  React.useEffect(() => {
    if (initialOpenTemplate) {
      setQuickDocType(initialOpenTemplate);
      setIsQuickDocModalOpen(true);
    }
  }, [initialOpenTemplate]);

  React.useEffect(() => {
    if (initialContractData) {
      setFormData(prev => ({
        ...prev,
        ...initialContractData,
        startDate: initialContractData.startDate || format(new Date(), 'yyyy-MM-dd'),
        rentValue: initialContractData.rentValue || 0,
        paymentDay: initialContractData.paymentDay || 5,
        status: initialContractData.status || 'active'
      }));
      if (initialContractData.aiDocumentType) {
        setAiDocumentType(initialContractData.aiDocumentType);
      }
      setIsModalOpen(true);
      if (onClearInitialContractData) {
        onClearInitialContractData();
      }
    }
  }, [initialContractData, onClearInitialContractData]);

  const getTenantName = (id: string) => {
    if (id === 'proprietario') return 'Próprio (Depósito/Garagem)';
    return tenants.find(t => t.id === id)?.name || 'Desconhecido';
  };

  const getPropertyName = (id: string) => {
    if (id?.startsWith('storage-')) {
      const storageId = id.replace('storage-', '');
      return storages?.find(s => s.id === storageId)?.name || 'Depósito/Garagem';
    }
    return properties.find(p => p.id === id)?.name || 'Desconhecido';
  };

  // Mapeamento para identificar se um inquilino possui mais de 1 contrato ativo (alerta de duplicidade/equívoco)
  const tenantContractsCountMap = useMemo(() => {
    const map: Record<string, { total: number; active: number }> = {};
    contracts.forEach(c => {
      if (!c.tenantId || c.tenantId === 'proprietario') return;
      if (!map[c.tenantId]) {
        map[c.tenantId] = { total: 0, active: 0 };
      }
      map[c.tenantId].total += 1;
      if (c.status === 'active') {
        map[c.tenantId].active += 1;
      }
    });
    return map;
  }, [contracts]);

  const tenantsWithMultipleActiveContracts = useMemo(() => {
    const list: { tenantId: string; tenantName: string; activeCount: number; totalCount: number }[] = [];
    Object.entries(tenantContractsCountMap).forEach(([tenantId, counts]) => {
      if (counts.active > 1) {
        list.push({
          tenantId,
          tenantName: getTenantName(tenantId),
          activeCount: counts.active,
          totalCount: counts.total
        });
      }
    });
    return list;
  }, [tenantContractsCountMap, tenants]);

  const warnings = useMemo(() => {
    const list: string[] = [];
    if (!formData.propertyId) return list;

    // 1. Property active contract check
    const activeContractForProperty = contracts.find(c => 
      c.status === 'active' && 
      c.propertyId === formData.propertyId && 
      c.id !== editingContract?.id
    );
    if (activeContractForProperty) {
      const propName = getPropertyName(formData.propertyId);
      list.push(`O imóvel/espaço "${propName}" já possui um contrato ativo com o inquilino "${getTenantName(activeContractForProperty.tenantId)}"! Criar outro contrato ativo para o mesmo imóvel pode causar conflitos de faturamento.`);
    }

    // 2. Tenant active contract check
    if (formData.tenantId && formData.tenantId !== 'proprietario') {
      const activeContractForTenant = contracts.find(c => 
        c.status === 'active' && 
        c.tenantId === formData.tenantId && 
        c.id !== editingContract?.id
      );
      if (activeContractForTenant) {
        list.push(`O inquilino "${getTenantName(formData.tenantId)}" já possui um contrato ATIVO registrado (Imóvel: "${getPropertyName(activeContractForTenant.propertyId)}"). Se você está cadastrando este novo contrato por equívoco/engano, cancele esta operação ou arquive/exclua o contrato excedente.`);
      }

      // Check for duplicate tenant (by CPF or Name) with active contract
      const selectedTenant = tenants.find(t => t.id === formData.tenantId);
      if (selectedTenant) {
        const cleanedCPF = selectedTenant.cpf ? selectedTenant.cpf.replace(/\D/g, '') : '';
        const sameCPFOrNameTenants = tenants.filter(t => 
          t.id !== selectedTenant.id && 
          (
            (cleanedCPF && t.cpf && t.cpf.replace(/\D/g, '') === cleanedCPF) ||
            t.name.trim().toLowerCase() === selectedTenant.name.trim().toLowerCase()
          )
        );
        
        const duplicateActiveContracts = contracts.filter(c => 
          c.status === 'active' && 
          sameCPFOrNameTenants.some(d => d.id === c.tenantId) && 
          c.id !== editingContract?.id
        );

        if (duplicateActiveContracts.length > 0) {
          duplicateActiveContracts.forEach(c => {
            list.push(`Atenção: Detectamos outro cadastro de inquilino ativo com o mesmo nome ou CPF (${selectedTenant.cpf || 'sem CPF'}) que já possui um contrato ativo para o imóvel "${getPropertyName(c.propertyId)}". Certifique-se de que não está duplicando o contrato por engano.`);
          });
        }
      }
    }

    return list;
  }, [formData.propertyId, formData.tenantId, contracts, tenants, editingContract]);

  const filteredContracts = contracts.filter(c => {
    const matchesStatus = filterStatus === 'all' ? c.status !== 'archived' : c.status === filterStatus;
    const matchesSearch = 
      getTenantName(c.tenantId).toLowerCase().includes(searchQuery.toLowerCase()) || 
      getPropertyName(c.propertyId).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleTenantChange = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setFormData(prev => ({
        ...prev,
        tenantId,
        depositValue: tenant.depositValue !== undefined ? tenant.depositValue : prev.depositValue,
        depositInstallments: tenant.depositInstallments !== undefined ? tenant.depositInstallments : prev.depositInstallments,
        depositDay: tenant.depositDay !== undefined ? tenant.depositDay : prev.depositDay,
        rentValue: tenant.rentValue !== undefined ? tenant.rentValue : prev.rentValue,
        paymentDay: tenant.paymentDay !== undefined ? tenant.paymentDay : prev.paymentDay,
        chargeLateFees: tenant.chargeLateFees !== undefined ? tenant.chargeLateFees : prev.chargeLateFees,
        lateFeePenalty: tenant.lateFeePenalty !== undefined ? tenant.lateFeePenalty : prev.lateFeePenalty,
        lateFeeDaily: tenant.lateFeeDaily !== undefined ? tenant.lateFeeDaily : prev.lateFeeDaily,
        lateFeeType: tenant.lateFeeType !== undefined ? tenant.lateFeeType : prev.lateFeeType,
        startDate: tenant.startDate || prev.startDate || format(new Date(), 'yyyy-MM-dd'),
        endDate: tenant.endDate || prev.endDate,
      }));
    } else {
      setFormData(prev => ({ ...prev, tenantId }));
    }
  };

  const handlePropertyChange = (propertyId: string) => {
    if (propertyId?.startsWith('storage-')) {
      const storageId = propertyId.replace('storage-', '');
      const storage = storages?.find(s => s.id === storageId);
      if (storage) {
        setFormData(prev => ({
          ...prev,
          propertyId,
          tenantId: 'proprietario',
          rentValue: storage.monthlyCost || prev.rentValue,
          paymentDay: storage.dueDay || prev.paymentDay,
          startDate: storage.contractStartDate || prev.startDate || format(new Date(), 'yyyy-MM-dd'),
          endDate: storage.contractEndDate || prev.endDate,
          depositValue: storage.hasDeposit ? (storage.depositValue || 0) : 0,
        }));
      }
    } else {
      const property = properties.find(p => p.id === propertyId);
      if (property) {
        setFormData(prev => ({
          ...prev,
          propertyId,
          tenantId: prev.tenantId === 'proprietario' ? '' : prev.tenantId,
          rentValue: property.rentValue || prev.rentValue,
          paymentDay: property.paymentDay || prev.paymentDay,
          chargeLateFees: property.chargeLateFees !== undefined ? property.chargeLateFees : prev.chargeLateFees,
          lateFeePenalty: property.lateFeePenalty || prev.lateFeePenalty,
          lateFeeDaily: property.lateFeeDaily || prev.lateFeeDaily,
          lateFeeType: property.lateFeeType || prev.lateFeeType
        }));
      } else {
        setFormData(prev => ({ ...prev, propertyId }));
      }
    }
  };

  const handleOpenModal = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setFormData({
        ...contract,
        tenantId: contract.tenantId || '',
        propertyId: contract.propertyId || '',
        startDate: contract.startDate || format(new Date(), 'yyyy-MM-dd'),
        rentValue: contract.rentValue || 0,
        paymentDay: contract.paymentDay || 5,
        status: contract.status || 'active',
        endDate: contract.endDate || '',
        observations: contract.observations || '',
        aiContractText: contract.aiContractText || '',
        depositValue: contract.depositValue || 0,
        depositInstallments: contract.depositInstallments || 1,
        depositDay: contract.depositDay || 0
      });
    } else {
      setEditingContract(null);
      setFormData({
        tenantId: '',
        propertyId: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        rentValue: 0,
        paymentDay: 5,
        chargeLateFees: true,
        lateFeePenalty: 2,
        lateFeeDaily: 0.033,
        lateFeeType: 'percentage',
        status: 'active'
      });
    }
    setHasPriorDebt(false);
    setPriorRentOption(contract?.historyStatus || 'all_paid');
    setOverriddenInstallmentStatuses({});
    setIsModalOpen(true);
  };

  const handleGenerateAIContract = async () => {
    if (!formData.tenantId || !formData.propertyId || !formData.rentValue) {
      toast.error('Preencha pelo menos Inquilino, Imóvel e Valor do Aluguel antes de gerar.');
      return;
    }
    
    let tenant = tenants.find(t => t.id === formData.tenantId) as any;
    if (formData.tenantId === 'proprietario') {
      tenant = {
        name: 'Eu mesmo (Proprietário)',
        type: 'individual',
        email: auth.currentUser?.email || '',
        phone: '',
        document: '',
        status: 'allocated',
        observations: 'Contrato de locação de depósito/garagem onde sou o inquilino.'
      };
    }

    let prop = properties.find(p => p.id === formData.propertyId) as any;
    if (formData.propertyId?.startsWith('storage-')) {
      const storageId = formData.propertyId.replace('storage-', '');
      const storage = storages?.find(s => s.id === storageId);
      if (storage) {
        prop = {
          name: storage.name,
          address: storage.address || 'Não informado',
          status: 'rented',
          rentValue: storage.monthlyCost,
          paymentDay: storage.dueDay,
        };
      }
    }
    
    // Landlord profile
    let lp: any = {};
    try {
      const saved = localStorage.getItem("imob_landlord_profile");
      if (saved) lp = JSON.parse(saved);
    } catch (e) {}

    // Build combined data
    const combinedData = {
      ...tenant,
      ...formData,
      landlordName: formData.landlordName || lp.name || auth.currentUser?.displayName || '',
      landlordCpf: formData.landlordCpf || lp.cpfCnpj || '',
      landlordRg: formData.landlordRg || lp.rg || '',
      landlordQualification: formData.landlordQualification || lp.qualification || 'brasileiro(a), proprietário(a)',
      landlordAddress: formData.landlordAddress || lp.address || '',
      landlordPhone: formData.landlordPhone || lp.phone || '',
      landlordEmail: formData.landlordEmail || lp.email || auth.currentUser?.email || '',
      tenantObservations: tenant?.observations || ''
    };

    setIsGeneratingContract(true);
    try {
      const text = await generateLeaseContract(combinedData, prop, aiDocumentType);
      setFormData(prev => ({ ...prev, aiContractText: text }));
      toast.success(`${aiDocumentType} gerado com sucesso!`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar documento');
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.tenantId || !formData.propertyId || !formData.startDate || !formData.rentValue || !formData.paymentDay) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const initialSteps: ProgressStep[] = [
      { id: '1', title: 'Validar Informações e Autenticação', description: 'Conferindo dados do imóvel, inquilino e credenciais', status: 'current' },
      { id: '2', title: editingContract ? 'Atualizar Contrato no Banco' : 'Registrar Contrato no Banco', description: 'Salvando contrato no Firestore', status: 'pending' },
      { id: '3', title: 'Atualizar Vínculo do Imóvel', description: 'Definindo status do imóvel e aluguel negociado', status: 'pending' },
      { id: '4', title: 'Atualizar Perfil do Inquilino', description: 'Definindo status do locatário como alocado', status: 'pending' },
      { id: '5', title: 'Gerar Cobrança do 1º Aluguel', description: 'Calculando vencimento com ajuste de dia útil', status: 'pending' },
      ...(formData.depositValue && Number(formData.depositValue) > 0 ? [
        { id: '6', title: 'Lançar Parcelas da Caução', description: `Gerando ${formData.depositInstallments || 1} parcela(s) de caução`, status: 'pending' as const }
      ] : []),
      { id: 'final', title: 'Sincronizar Lista e Finalizar', description: 'Concluindo operação com sucesso', status: 'pending' }
    ];

    setCreationSteps(initialSteps);
    setShowProgressOverlay(true);
    setIsSubmitting(true);

    try {
      await new Promise(r => setTimeout(r, 350));
      setCreationSteps(prev => prev.map((s, idx) => {
        if (idx === 0) return { ...s, status: 'completed', description: 'Formulário e credenciais verificados' };
        if (idx === 1) return { ...s, status: 'current' };
        return s;
      }));

      const ownerId = auth.currentUser?.uid;
      if (!ownerId) throw new Error("Not authenticated");

      let landlordProf: any = {};
      try {
        const savedLandlord = localStorage.getItem("imob_landlord_profile");
        if (savedLandlord) landlordProf = JSON.parse(savedLandlord);
      } catch (e) {}

      const contractData: any = {
        tenantId: formData.tenantId,
        propertyId: formData.propertyId,
        startDate: formData.startDate,
        rentValue: Number(formData.rentValue),
        paymentDay: Number(formData.paymentDay),
        chargeLateFees: formData.chargeLateFees || false,
        status: formData.status || 'active',
        ownerId,
        landlordName: formData.landlordName || landlordProf.name || auth.currentUser?.displayName || '',
        landlordCpf: formData.landlordCpf || landlordProf.cpfCnpj || '',
        landlordRg: formData.landlordRg || landlordProf.rg || '',
        landlordQualification: formData.landlordQualification || landlordProf.qualification || '',
        landlordAddress: formData.landlordAddress || landlordProf.address || '',
        landlordPhone: formData.landlordPhone || landlordProf.phone || '',
        landlordEmail: formData.landlordEmail || landlordProf.email || '',
        createdAt: editingContract ? editingContract.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (formData.endDate) contractData.endDate = formData.endDate;
      if (formData.observations) contractData.observations = formData.observations;
      if (formData.contractFile) contractData.contractFile = formData.contractFile;
      if (formData.evidenceName) contractData.evidenceName = formData.evidenceName;
      if (formData.thumbnailLink) contractData.thumbnailLink = formData.thumbnailLink;
      if (formData.aiContractText) contractData.aiContractText = formData.aiContractText;
      
      if (formData.chargeLateFees) {
        contractData.lateFeeType = formData.lateFeeType || 'percentage';
        contractData.lateFeePenalty = Number(formData.lateFeePenalty || 0);
        contractData.lateFeeDaily = Number(formData.lateFeeDaily || 0);
      }

      if (formData.depositValue && Number(formData.depositValue) > 0) {
        contractData.depositValue = Number(formData.depositValue);
        contractData.depositInstallments = Number(formData.depositInstallments || 1);
        contractData.depositDay = Number(formData.depositDay || formData.paymentDay);
      }

      if (pastMonthsCount > 0) {
        contractData.historyStatus = priorRentOption;
        contractData.priorMonthsCount = pastMonthsCount;
        const retroList = simulatedInstallments.filter(i => i.isRetroactive);
        const paidCount = retroList.filter(i => i.status === 'paid').length;
        const pendingCount = retroList.filter(i => i.status === 'pending').length;
        contractData.priorMonthsTotalPaid = paidCount * Number(formData.rentValue || 0);
        contractData.priorMonthsTotalPending = pendingCount * Number(formData.rentValue || 0);
      } else {
        contractData.historyStatus = 'all_paid';
        contractData.priorMonthsCount = 0;
        contractData.priorMonthsTotalPaid = 0;
        contractData.priorMonthsTotalPending = 0;
      }

      if (editingContract?.id) {
        // Track file versions when replaced
        const currentFile = editingContract.contractFile;
        const newFile = formData.contractFile;
        const currentVersions: DocumentVersion[] = editingContract.fileVersions || [];

        if (currentFile && newFile && currentFile !== newFile) {
          const archivedVersion: DocumentVersion = {
            id: `ver_${Date.now()}`,
            name: editingContract.evidenceName || 'Via Anterior.pdf',
            url: currentFile,
            uploadedAt: editingContract.updatedAt || editingContract.createdAt || new Date().toISOString(),
            notes: 'Arquivado automaticamente após envio de nova via'
          };
          contractData.fileVersions = [archivedVersion, ...currentVersions].slice(0, 10);
        } else if (formData.fileVersions) {
          contractData.fileVersions = formData.fileVersions;
        } else {
          contractData.fileVersions = currentVersions;
        }

        if (detectedContractChanges.length > 0) {
          const timeStamp = format(new Date(), 'dd/MM/yyyy HH:mm');
          const note = `[Aditivo/Atualização de Contrato em ${timeStamp}]: Contrato estendido/atualizado. Alterações detectadas: ${detectedContractChanges.join('; ')}.`;
          contractData.observations = contractData.observations
            ? `${contractData.observations}\n\n${note}`
            : note;
        }

        await updateDoc(doc(db, 'contracts', editingContract.id), cleanObject(contractData));

        setCreationSteps(prev => prev.map((s, idx) => {
          if (s.id === '2') return { ...s, status: 'completed', description: 'Contrato atualizado no banco de dados' };
          if (s.id === '3') return { ...s, status: 'current' };
          return s;
        }));

        await new Promise(r => setTimeout(r, 350));

        // 1. If property changed, free up the old property
        const propertyChanged = editingContract.propertyId !== contractData.propertyId;
        const tenantChanged = editingContract.tenantId !== contractData.tenantId;

        if (propertyChanged) {
          if (!editingContract.propertyId.startsWith('storage-')) {
            await updateDoc(doc(db, 'properties', editingContract.propertyId), {
              currentTenantId: null,
              status: 'vacant'
            });
          } else {
            const storageId = editingContract.propertyId.replace('storage-', '');
            await updateDoc(doc(db, 'storages', storageId), {
              contractStartDate: "",
              contractEndDate: "",
              monthlyCost: 0
            });
          }
        }

        // 2. If tenant changed, free up the old tenant
        if (tenantChanged && editingContract.tenantId !== 'proprietario') {
          await updateDoc(doc(db, 'tenants', editingContract.tenantId), {
            propertyId: null,
            status: 'waiting'
          });
        }

        // 3. Update the new/current property & tenant status based on new contract status
        if (contractData.status === 'active') {
          if (!contractData.propertyId.startsWith('storage-')) {
            await updateDoc(doc(db, 'properties', contractData.propertyId), cleanObject({
              currentTenantId: contractData.tenantId,
              status: 'rented',
              rentValue: contractData.rentValue,
              paymentDay: contractData.paymentDay,
              chargeLateFees: contractData.chargeLateFees,
              lateFeePenalty: contractData.lateFeePenalty,
              lateFeeDaily: contractData.lateFeeDaily,
              lateFeeType: contractData.lateFeeType
            }));
          } else {
            const storageId = contractData.propertyId.replace('storage-', '');
            await updateDoc(doc(db, 'storages', storageId), cleanObject({
              contractStartDate: contractData.startDate,
              contractEndDate: contractData.endDate || "",
              monthlyCost: contractData.rentValue,
              dueDay: contractData.paymentDay,
              contractFile: contractData.contractFile || ""
            }));
          }

          setCreationSteps(prev => prev.map((s) => {
            if (s.id === '3') return { ...s, status: 'completed', description: 'Imóvel vinculado com status alugado' };
            if (s.id === '4') return { ...s, status: 'current' };
            return s;
          }));

          await new Promise(r => setTimeout(r, 350));

          if (contractData.tenantId !== 'proprietario') {
            await updateDoc(doc(db, 'tenants', contractData.tenantId), {
              propertyId: contractData.propertyId,
              status: 'allocated'
            });
          }

          setCreationSteps(prev => prev.map((s) => {
            if (s.id === '4') return { ...s, status: 'completed', description: 'Inquilino marcado como alocado' };
            if (s.id === '5') return { ...s, status: 'current' };
            return s;
          }));
        }

        setCreationSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
        await new Promise(r => setTimeout(r, 400));
        toast.success('Contrato atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'contracts'), cleanObject(contractData));

        setCreationSteps(prev => prev.map((s) => {
          if (s.id === '2') return { ...s, status: 'completed', description: 'Contrato salvo no banco de dados' };
          if (s.id === '3') return { ...s, status: 'current' };
          return s;
        }));

        await new Promise(r => setTimeout(r, 350));
        
        if (!contractData.propertyId.startsWith('storage-')) {
          const propertyRef = doc(db, 'properties', contractData.propertyId);
          const propertyUpdateData: any = {
              currentTenantId: contractData.tenantId,
              status: 'rented',
              rentValue: contractData.rentValue,
              paymentDay: contractData.paymentDay,
              chargeLateFees: contractData.chargeLateFees,
          };
          if (contractData.lateFeePenalty !== undefined) propertyUpdateData.lateFeePenalty = contractData.lateFeePenalty;
          if (contractData.lateFeeDaily !== undefined) propertyUpdateData.lateFeeDaily = contractData.lateFeeDaily;
          if (contractData.lateFeeType !== undefined) propertyUpdateData.lateFeeType = contractData.lateFeeType;
          
          await updateDoc(propertyRef, cleanObject(propertyUpdateData));
        } else {
          const storageId = contractData.propertyId.replace('storage-', '');
          const storageRef = doc(db, 'storages', storageId);
          await updateDoc(storageRef, cleanObject({
            contractStartDate: contractData.startDate,
            contractEndDate: contractData.endDate || "",
            monthlyCost: contractData.rentValue,
            dueDay: contractData.paymentDay,
            contractFile: contractData.contractFile || ""
          }));
        }

        setCreationSteps(prev => prev.map((s) => {
          if (s.id === '3') return { ...s, status: 'completed', description: 'Imóvel atualizado para Alugado' };
          if (s.id === '4') return { ...s, status: 'current' };
          return s;
        }));

        await new Promise(r => setTimeout(r, 350));

        if (contractData.tenantId !== 'proprietario') {
          const tenantRef = doc(db, 'tenants', contractData.tenantId);
          await updateDoc(tenantRef, cleanObject({
              propertyId: contractData.propertyId,
              status: 'allocated'
          }));
        }

        setCreationSteps(prev => prev.map((s) => {
          if (s.id === '4') return { ...s, status: 'completed', description: 'Inquilino alocado com sucesso' };
          if (s.id === '5') return { ...s, status: 'current' };
          return s;
        }));

        await new Promise(r => setTimeout(r, 350));

        // Generate Rent Installments (Including past retroactive months if startDate is in the past)
        if (simulatedInstallments.length > 0) {
          const retroactivePaidCount = simulatedInstallments.filter(i => i.isRetroactive && i.status === 'paid').length;
          const retroactivePendingCount = simulatedInstallments.filter(i => i.isRetroactive && i.status === 'pending').length;

          for (const inst of simulatedInstallments) {
            const adjustment = adjustDateToNextBusinessDay(inst.dueDate);
            const isPaid = inst.status === 'paid';

            await addDoc(collection(db, 'payments'), cleanObject({
              propertyId: contractData.propertyId,
              tenantId: contractData.tenantId,
              amount: inst.amount || 0,
              dueDate: adjustment.adjustedDate,
              originalDueDate: adjustment.wasAdjusted ? adjustment.originalDate : null,
              status: isPaid ? 'paid' : 'pending',
              paidAt: isPaid ? adjustment.adjustedDate : null,
              ownerId: ownerId,
              type: 'rent',
              description: inst.isRetroactive 
                ? (isPaid ? `Aluguel ${inst.monthName} (Quitado Retroativo)` : `Aluguel ${inst.monthName} (Débito Anterior Pendente)`)
                : `Aluguel ${inst.monthName} (Cobrança Atual)`,
              observations: inst.isRetroactive
                ? (isPaid
                    ? `Sincronizado do histórico do contrato - quitado retroativamente (${retroactivePaidCount} mês(es))`
                    : `Débito histórico registrado na inclusão do contrato - ${retroactivePendingCount} mês(es) pendente(s)`)
                : (adjustment.wasAdjusted ? adjustment.adjustmentReason : ''),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }));
          }
        } else {
          // Fallback if no installments generated
          const dueDateObj = new Date();
          if (contractData.paymentDay) {
            dueDateObj.setDate(contractData.paymentDay);
            if (dueDateObj < new Date()) {
               dueDateObj.setMonth(dueDateObj.getMonth() + 1);
            }
          }
          const dueDateStr = format(dueDateObj, 'yyyy-MM-dd');
          const firstRentAdjustment = adjustDateToNextBusinessDay(dueDateStr);
          
          await addDoc(collection(db, 'payments'), cleanObject({
            propertyId: contractData.propertyId,
            tenantId: contractData.tenantId,
            amount: contractData.rentValue || 0,
            dueDate: firstRentAdjustment.adjustedDate,
            originalDueDate: firstRentAdjustment.wasAdjusted ? firstRentAdjustment.originalDate : null,
            status: 'pending',
            ownerId: ownerId,
            type: 'rent',
            description: 'Primeiro Aluguel',
            observations: firstRentAdjustment.wasAdjusted ? firstRentAdjustment.adjustmentReason : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
        }

        setCreationSteps(prev => prev.map((s) => {
          if (s.id === '5') return { ...s, status: 'completed', description: 'Lançamento do primeiro aluguel gerado' };
          if (s.id === '6') return { ...s, status: 'current' };
          if (s.id === 'final' && !prev.some(x => x.id === '6')) return { ...s, status: 'current' };
          return s;
        }));

        await new Promise(r => setTimeout(r, 350));

        // Generate Deposit Installments
        if (contractData.depositValue && contractData.depositValue > 0) {
          const installments = contractData.depositInstallments || 1;
          const installmentValue = contractData.depositValue / installments;
          
          const depositDueDateObj = new Date();
          if (contractData.depositDay) {
             depositDueDateObj.setDate(contractData.depositDay);
             if (depositDueDateObj < new Date()) {
                depositDueDateObj.setMonth(depositDueDateObj.getMonth() + 1);
             }
          }
          const depositStartDateStr = format(depositDueDateObj, 'yyyy-MM-dd');

          for (let i = 0; i < installments; i++) {
             const currentObjDate = parseISO(depositStartDateStr);
             currentObjDate.setMonth(currentObjDate.getMonth() + i);
             const installmentDueDate = format(currentObjDate, 'yyyy-MM-dd');
             const depositAdj = adjustDateToNextBusinessDay(installmentDueDate);
             
             await addDoc(collection(db, 'payments'), cleanObject({
               propertyId: contractData.propertyId,
               tenantId: contractData.tenantId,
               amount: installmentValue,
               dueDate: depositAdj.adjustedDate,
               originalDueDate: depositAdj.wasAdjusted ? depositAdj.originalDate : null,
               status: 'pending',
               ownerId: ownerId,
               type: 'deposit',
               description: installments > 1 ? `Caução (${i + 1}/${installments})` : 'Caução Integral',
               observations: depositAdj.wasAdjusted ? depositAdj.adjustmentReason : '',
               createdAt: new Date().toISOString(),
               updatedAt: new Date().toISOString()
             }));
          }

          setCreationSteps(prev => prev.map((s) => {
            if (s.id === '6') return { ...s, status: 'completed', description: `${installments} parcela(s) de caução gerada(s)` };
            if (s.id === 'final') return { ...s, status: 'current' };
            return s;
          }));

          await new Promise(r => setTimeout(r, 350));
        }

        setCreationSteps(prev => prev.map(s => ({ ...s, status: 'completed', description: 'Contrato e finanças sincronizados (100% feito)' })));
        await new Promise(r => setTimeout(r, 400));

        toast.success('Contrato criado com sucesso!');
      }
      setShowProgressOverlay(false);
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingContract ? OperationType.UPDATE : OperationType.CREATE, 'contracts');
      toast.error('Erro ao salvar contrato.');
      setShowProgressOverlay(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRenewArchive = (contract: Contract, mode: 'renew' | 'archive') => {
    setTargetContract(contract);
    setRenewArchiveMode(mode);
    setRaEndDate(contract.endDate || '');
    setRaObservations(contract.observations || '');
    setIsRenewArchiveModalOpen(true);
  };

  const handleRenewArchiveSubmit = async () => {
    if (!targetContract || !targetContract.id) return;
    setIsSubmitting(true);
    try {
      let updateData: Partial<Contract> = {};
      if (renewArchiveMode === 'renew') {
        updateData = {
          endDate: raEndDate,
          status: 'active',
          observations: raObservations,
          updatedAt: new Date().toISOString()
        };
      } else {
        updateData = {
          status: 'archived',
          observations: raObservations,
          updatedAt: new Date().toISOString()
        };
      }
      await updateDoc(doc(db, 'contracts', targetContract.id), updateData);
      toast.success(renewArchiveMode === 'renew' ? 'Contrato renovado/ajustado com sucesso!' : 'Contrato arquivado com sucesso!');
      setIsRenewArchiveModalOpen(false);
      setTargetContract(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar contrato');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    onSecurityCheck(async () => {
      try {
        const contractToDelete = contracts.find(c => c.id === id);
        await deleteDoc(doc(db, 'contracts', id));
        
        if (contractToDelete) {
          // Free up property/storage
          if (!contractToDelete.propertyId.startsWith('storage-')) {
            const propertyRef = doc(db, 'properties', contractToDelete.propertyId);
            await updateDoc(propertyRef, {
              currentTenantId: null,
              status: 'vacant'
            });
          } else {
            const storageId = contractToDelete.propertyId.replace('storage-', '');
            const storageRef = doc(db, 'storages', storageId);
            await updateDoc(storageRef, {
              contractStartDate: "",
              contractEndDate: "",
              monthlyCost: 0
            });
          }
          
          // Free up tenant
          if (contractToDelete.tenantId !== 'proprietario') {
            const tenantRef = doc(db, 'tenants', contractToDelete.tenantId);
            await updateDoc(tenantRef, {
              propertyId: null,
              status: 'waiting'
            });
          }
        }

        toast.success('Contrato excluído com sucesso!');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'contracts');
        toast.error('Erro ao excluir contrato.');
      }
    }, 'Excluir definitivamente este contrato.');
  };

  const [calculatingId, setCalculatingId] = useState<string | null>(null);

  const handleCalculateReadjustment = async (contract: Contract) => {
    if (!contract.id || !contract.readjustmentIndex || contract.readjustmentIndex === 'none') return;
    
    setCalculatingId(contract.id);
    try {
      const accumulatedIndex = await getAccumulatedIndex(contract.readjustmentIndex, 12);
      const newRentValue = contract.rentValue * (1 + (accumulatedIndex / 100));
      
      const confirmMessage = `Índice Acumulado 12 meses (${contract.readjustmentIndex}): ${accumulatedIndex.toFixed(2)}%\n\nValor Atual: R$ ${contract.rentValue.toFixed(2)}\nNovo Valor: R$ ${newRentValue.toFixed(2)}\n\nDeseja aplicar este reajuste e atualizar o contrato agora?`;
      
      if (window.confirm(confirmMessage)) {
        await updateDoc(doc(db, 'contracts', contract.id), {
          rentValue: newRentValue,
          lastReadjustmentDate: format(new Date(), 'yyyy-MM-dd'),
          updatedAt: new Date().toISOString()
        });
        
        // Update property too
        if (!contract.propertyId.startsWith('storage-')) {
            await updateDoc(doc(db, 'properties', contract.propertyId), {
                rentValue: newRentValue
            });
        } else {
            const storageId = contract.propertyId.replace('storage-', '');
            await updateDoc(doc(db, 'storages', storageId), {
                monthlyCost: newRentValue
            });
        }
        
        // We could also notify the tenant via email or SMS, but for now we just show a toast
        toast.success(`Aluguel reajustado para R$ ${newRentValue.toFixed(2)} com sucesso! O Inquilino será notificado em seu portal.`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao consultar a API do Banco Central. Tente novamente mais tarde.');
    } finally {
      setCalculatingId(null);
    }
  };

  const handleOpenConfirmHistoryModal = (contract: Contract) => {
    setConfirmingHistoryContract(contract);
    setConfirmHistoryOption(contract.historyStatus || 'all_paid');
    
    // Initialize overrides if past months exist
    if (contract.startDate) {
      const retroList = generateContractInstallmentsList(
        contract.startDate,
        contract.rentValue,
        contract.paymentDay,
        contract.endDate
      ).filter(i => i.isRetroactive);
      
      const newOverrides: Record<number, 'paid' | 'pending'> = {};
      retroList.forEach(i => {
        newOverrides[i.monthIndex] = 'pending';
      });
      setConfirmHistoryOverrides(newOverrides);
    } else {
      setConfirmHistoryOverrides({});
    }
  };

  const handleSaveHistoryConfirmation = async () => {
    if (!confirmingHistoryContract || !confirmingHistoryContract.id) return;
    setIsConfirmHistorySubmitting(true);
    try {
      const contract = confirmingHistoryContract;
      const retroList = generateContractInstallmentsList(
        contract.startDate,
        contract.rentValue,
        contract.paymentDay,
        contract.endDate
      ).filter(i => i.isRetroactive);

      const paidCount = confirmHistoryOption === 'all_paid'
        ? retroList.length
        : confirmHistoryOption === 'has_pending'
          ? retroList.filter(i => (confirmHistoryOverrides[i.monthIndex] || 'pending') === 'paid').length
          : retroList.length;

      const pendingCount = confirmHistoryOption === 'has_pending'
        ? retroList.filter(i => (confirmHistoryOverrides[i.monthIndex] || 'pending') === 'pending').length
        : 0;

      await updateDoc(doc(db, 'contracts', contract.id), {
        historyStatus: confirmHistoryOption,
        priorMonthsCount: retroList.length,
        priorMonthsTotalPaid: paidCount * contract.rentValue,
        priorMonthsTotalPending: pendingCount * contract.rentValue,
        updatedAt: new Date().toISOString()
      });

      toast.success('Histórico financeiro anterior verificado e atualizado com sucesso!');
      setConfirmingHistoryContract(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar histórico de aluguéis anteriores.');
    } finally {
      setIsConfirmHistorySubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contratos de Locação</h1>
          <p className="text-slate-500">Gerencie a união entre inquilinos, imóveis e regras financeiras.</p>
        </div>
        <div className="flex flex-row gap-2 sm:gap-3 w-full sm:w-auto relative z-20">
          <button 
            onClick={() => setIsModelsExpanded(!isModelsExpanded)}
            className="flex-1 sm:flex-none flex items-center justify-center sm:justify-between gap-1 sm:gap-2 bg-white text-indigo-700 border border-indigo-200 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl hover:bg-indigo-50 transition shadow-sm font-semibold whitespace-nowrap focus:outline-none text-sm sm:text-base"
          >
            <span className="flex items-center gap-1.5 sm:gap-2"><Upload className="w-4 h-4" /> <span className="hidden sm:inline">Modelos Rápidos</span><span className="sm:hidden">Modelos</span></span>
            {isModelsExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />}
          </button>

          {isModelsExpanded && (
            <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[480px] max-w-[480px] bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-fade-in origin-top-right left-0 sm:left-auto">
              <h3 className="text-sm font-bold text-slate-800 mb-3 ml-1">Selecione o modelo (Download)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { tag: 'Contrato Locação', type: 'Contrato de Locação', icon: FileText },
                  { tag: 'Renovar Aluguel', type: 'Termo de Renovação de Aluguel', icon: FileText },
                  { tag: 'Termo Vistoria', type: 'Termo Vistoria', icon: FileText },
                  { tag: 'Recibo Aluguel', type: 'Recibo de Aluguel', icon: FileText },
                  { tag: 'Recibo Caução', type: 'Recibo Caução', icon: FileText },
                  { tag: 'Declaração Residência', type: 'Declaração de Residência e Vínculo Locatício', icon: FileSignature },
                  { tag: 'Notificar Reajuste', type: 'Notificação de Reajuste', icon: AlertTriangle },
                  { tag: 'Aviso Desocupação', type: 'Aviso Desocupação', icon: XCircle },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setIsModelsExpanded(false);
                        setQuickDocType(item.type);
                        setIsQuickDocModalOpen(true);
                      }}
                      className="flex flex-col items-center justify-center p-2 sm:p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-300 hover:shadow-sm hover:bg-white transition-all group aspect-square text-center relative overflow-hidden"
                    >
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="w-3 h-3 text-indigo-400" />
                      </div>
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100/50 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors mb-1.5 sm:mb-2">
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 group-hover:text-indigo-700 line-clamp-2 leading-tight">
                        {item.tag}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <button 
            onClick={() => handleOpenModal()} 
            className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-1 sm:gap-2 bg-indigo-600 text-white px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-sm font-semibold whitespace-nowrap text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Novo Contrato</span><span className="sm:hidden">Novo</span>
          </button>
        </div>
      </header>

      {/* Banner de Contratos Vencidos */}
      {(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const expiredActiveCount = contracts.filter(c => c.status === 'active' && c.endDate && c.endDate < todayStr).length;
        if (expiredActiveCount > 0) {
          return (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3 text-rose-800 shadow-sm mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="font-bold text-sm">Contratos Vencidos Detectados!</h4>
                <p className="text-xs text-rose-600 mt-1 leading-relaxed">
                  Você possui {expiredActiveCount} {expiredActiveCount === 1 ? 'contrato vencido' : 'contratos vencidos'} que ainda {expiredActiveCount === 1 ? 'está configurado' : 'estão configurados'} como <strong className="font-bold">Ativo</strong>. Regularize a situação editando o contrato para renovar a data de término ou mudar o status de Ativo para <strong className="font-bold">Encerrado</strong> / <strong className="font-bold">Quebrado</strong>.
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Banner de Alerta para Inquilinos com Múltiplos Contratos Ativos (Aviso de Equívoco/Duplicidade) */}
      {tenantsWithMultipleActiveContracts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-sm mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-amber-950">Aviso de Equívoco / Duplicidade: Inquilino com mais de 1 Contrato Ativo</h4>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black rounded-md uppercase shrink-0">
                Atenção
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Identificamos que o(s) seguinte(s) inquilino(s) possui(em) mais de um contrato ativo registrado no sistema. Se for um cadastro duplicado feito por engano pelo usuário, você pode arquivar ou excluir o contrato sobressalente:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs font-semibold text-amber-950">
              {tenantsWithMultipleActiveContracts.map(item => (
                <li key={item.tenantId} className="flex flex-wrap items-center justify-between gap-2 bg-amber-100/70 p-2 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                    <span><strong>{item.tenantName}</strong> — possui {item.activeCount} contratos ativos no sistema.</span>
                  </div>
                  <button
                    onClick={() => setSearchQuery(item.tenantName)}
                    className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Filtrar e Resolver Duplicidade
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por inquilino ou imóvel..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 font-medium text-slate-700 placeholder:text-slate-400"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto shrink-0 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {(['all', 'active', 'ended', 'broken', 'archived'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all",
                filterStatus === status 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {status === 'all' ? 'Todos' : 
               status === 'active' ? 'Ativos' : 
               status === 'ended' ? 'Encerrados' : 
               status === 'broken' ? 'Quebrados' : 'Arquivados'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filteredContracts.map(contract => {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const isExpired = contract.status === 'active' && contract.endDate && contract.endDate < todayStr;
          const isDuplicateTenantActive = contract.tenantId !== 'proprietario' && (tenantContractsCountMap[contract.tenantId]?.active > 1);

          return (
            <div key={contract.id} className={cn(
              "bg-white rounded-2xl p-5 border shadow-sm flex flex-col hover:shadow-md transition-all group",
              isDuplicateTenantActive ? "border-amber-300 bg-amber-50/20 hover:border-amber-400" : "border-slate-200 hover:border-indigo-200"
            )}>
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="font-bold text-slate-900 truncate pr-4 flex items-center gap-2" title={getTenantName(contract.tenantId)}>
                       <span>{getTenantName(contract.tenantId)}</span>
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate" title={getPropertyName(contract.propertyId)}>
                       {getPropertyName(contract.propertyId)}
                    </p>
                 </div>
                 <span className={cn(
                    "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shrink-0",
                    isExpired ? "bg-rose-100 text-rose-700 border border-rose-200" :
                    contract.status === 'active' ? "bg-emerald-100 text-emerald-800" :
                    contract.status === 'ended' ? "bg-slate-100 text-slate-600" : 
                    contract.status === 'broken' ? "bg-red-100 text-red-800" : "bg-indigo-100 text-indigo-800"
                 )}>
                    {isExpired ? 'Vencido (Ativo)' :
                     contract.status === 'active' ? 'Ativo' : 
                     contract.status === 'ended' ? 'Encerrado' : 
                     contract.status === 'broken' ? 'Quebrado' : 'Arquivado'}
                 </span>
              </div>

              {isDuplicateTenantActive && (
                <div className="mb-4 p-2.5 bg-amber-100/80 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-extrabold text-[11px] text-amber-950 uppercase tracking-tight">Equívoco de Duplicidade Detectado</p>
                    <p className="text-[11px] text-amber-900 mt-0.5 leading-snug">
                      Este inquilino possui <strong>2 (ou mais) contratos ativos</strong> no sistema. Se for uma duplicata criada por engano pelo usuário, você pode <strong>excluir</strong> ou <strong>arquivar</strong> o contrato sobressalente.
                    </p>
                  </div>
                </div>
              )}

              {contract.historyStatus === 'unconfirmed' && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs animate-fade-in">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-[11px] text-amber-950">
                        Histórico Anterior Pendente de Confirmação ({contract.priorMonthsCount || 1} Mês/Meses)
                      </p>
                      <p className="text-[10px] text-amber-800 leading-snug">
                        Verifique se os aluguéis anteriores ao início do gerenciamento já foram pagos.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenConfirmHistoryModal(contract)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg shadow-xs whitespace-nowrap shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Histórico
                  </button>
                </div>
              )}

              <div className="space-y-3 mb-6 flex-1">
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Aluguel:</span>
                    <span className="font-bold text-slate-900">
                      R$ {contract.rentValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                 </div>
                 <div className="flex justify-between text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-500 font-medium">Vencimento:</span>
                    <span className="font-bold text-slate-900">Dia {contract.paymentDay}</span>
                 </div>
                 
                 <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Início:</span>
                    <span className="font-semibold text-slate-700">
                      {contract.startDate ? format(parseISO(contract.startDate), 'dd/MM/yyyy') : 'N/A'}
                    </span>
                 </div>
                 {contract.endDate && (
                    <div className="flex justify-between text-xs mt-1">
                       <span className="text-slate-500">Término:</span>
                       <span className={cn(
                          "font-semibold",
                          isExpired ? "text-rose-600 font-bold" : "text-slate-700"
                       )}>
                          {format(parseISO(contract.endDate), 'dd/MM/yyyy')}
                       </span>
                    </div>
                 )}
                 {contract.readjustmentIndex && contract.readjustmentIndex !== 'none' && (
                     <div className="flex justify-between text-xs mt-1">
                       <span className="text-slate-500">Reajuste:</span>
                       <span className="font-semibold text-emerald-600">{contract.readjustmentIndex}</span>
                    </div>
                 )}
                 {contract.status === 'active' && (
                    <div className={`flex flex-col gap-2 mt-4 pt-4 border-t ${isExpired ? 'border-rose-100' : 'border-slate-100'}`}>
                        {contract.readjustmentIndex && contract.readjustmentIndex !== 'none' && (
                           <button 
                              onClick={() => handleCalculateReadjustment(contract)} 
                              disabled={calculatingId === contract.id}
                              className="w-full px-3 py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                           >
                              <TrendingUp className="w-3.5 h-3.5" /> 
                              {calculatingId === contract.id ? 'Calculando...' : `Aplicar Reajuste (${contract.readjustmentIndex})`}
                           </button>
                        )}
                       {/* Botão de Finalização / Desocupação Destacado */}
                        <button
                           type="button"
                           onClick={() => setTerminatingContract(contract)}
                           className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex justify-center items-center gap-1.5 shadow-xs cursor-pointer ${
                             isExpired
                               ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white shadow-rose-200'
                               : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80'
                           }`}
                        >
                           <Key className="w-3.5 h-3.5" />
                           <span>{isExpired ? 'Finalizar Contrato & Desocupar Imóvel' : 'Finalizar Contrato / Desocupar'}</span>
                        </button>

                        <div className="flex gap-2">
                            <button onClick={() => handleOpenRenewArchive(contract, 'renew')} className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 cursor-pointer ${isExpired ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'}`}>
                               <RotateCcw className="w-3.5 h-3.5" /> Renovar
                            </button>
                            <button onClick={() => handleOpenRenewArchive(contract, 'archive')} className="flex-1 px-3 py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700">
                               <Archive className="w-3.5 h-3.5" /> Arquivar
                            </button>
                        </div>
                    </div>
                 )}
              </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {contract.contractFile ? (
                     <a href={contract.contractFile} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg">
                        <FileSignature className="w-3.5 h-3.5" /> Ver PDF
                     </a>
                  ) : contract.aiContractText ? (
                     <button onClick={() => handleOpenModal(contract)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg">
                        <Sparkles className="w-3.5 h-3.5" /> Texto IA
                     </button>
                  ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">Sem Anexo</span>
                  )}

                  {contract.fileVersions && contract.fileVersions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContractForVersions(contract);
                        setIsVersionsModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 px-2.5 py-1.5 rounded-lg transition"
                      title="Ver e restaurar versões anteriores deste contrato"
                    >
                      <History className="w-3.5 h-3.5 text-indigo-600" />
                      {contract.fileVersions.length} {contract.fileVersions.length === 1 ? 'ant.' : 'ant.'}
                    </button>
                  )}
                </div>

               <div className="flex gap-2">
                 <button onClick={() => handleOpenModal(contract)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Editar">
                   <Eye className="w-4 h-4" />
                 </button>
                 <button onClick={() => handleDelete(contract.id!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                 </button>
               </div>
            </div>
          </div>
        );
      })}

        {filteredContracts.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-slate-300" />
             </div>
             <h3 className="text-slate-500 font-medium">Nenhum contrato encontrado</h3>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
                {warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 animate-fade-in text-amber-800">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>Aviso de Procedimento / Duplicidade</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed">
                      {warnings.map((warning, idx) => (
                        <li key={idx} className="marker:text-amber-600">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="font-semibold text-slate-700">Inquilino <span className="text-red-500">*</span></label>
                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.tenantId || ''} onChange={e => handleTenantChange(e.target.value)}>
                           <option value="">Selecione...</option>
                           <option value="proprietario">Eu mesmo (Proprietário - Depósito/Garagem)</option>
                           {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="font-semibold text-slate-700">Imóvel <span className="text-red-500">*</span></label>
                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.propertyId || ''} onChange={e => handlePropertyChange(e.target.value)}>
                           <option value="">Selecione...</option>
                           {properties.map(p => (
                             <option key={p.id} value={p.id}>
                               {p.name} ({p.status === 'vacant' ? 'Livre' : p.status === 'rented' ? 'Alugado' : 'Reforma'}) - R$ {p.rentValue?.toLocaleString()}
                             </option>
                           ))}
                           {storages && storages.length > 0 && (
                             <optgroup label="Depósitos e Garagens">
                               {storages.map(s => (
                                 <option key={`storage-${s.id}`} value={`storage-${s.id}`}>
                                   {s.name} - R$ {s.monthlyCost?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                 </option>
                               ))}
                             </optgroup>
                           )}
                        </select>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                   <div className="space-y-2">
                      <label className="font-semibold text-slate-700">Valor do Aluguel <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                        <input 
                          type="text"
                          inputMode="decimal"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                          placeholder="0,00"
                                                     value={formData.rentValue === 0 || formData.rentValue === undefined ? '' : formData.rentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                           onFocus={e => e.target.select()}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            const num = Number(val) / 100;
                            setFormData({...formData, rentValue: num});
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 ml-1 italic">Digite o valor e os centavos. Ex: 150000 para R$ 1.500,00</p>
                   </div>
                   <div className="space-y-2">
                      <label className="font-semibold text-slate-700">Vencimento (Dia) <span className="text-red-500">*</span></label>
                      <input type="text" inputMode="numeric" pattern="[0-9]*" min="1" max="31" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                             value={formData.paymentDay} onFocus={e => e.target.select()} onChange={e => setFormData({...formData, paymentDay: Number(e.target.value)})} />
                   </div>
                   <div className="space-y-2">
                      <label className="font-semibold text-slate-700">Início do Contrato <span className="text-red-500">*</span></label>
                      <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                             value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="font-semibold text-slate-700">Fim do Contrato (Opcional)</label>
                      <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                             value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                   </div>
                </div>

                {/* Verificação de Aluguéis Anteriores (Período Retroativo) */}
                {simulatedInstallments.some(i => i.isRetroactive) && (
                  <div className="p-5 bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl space-y-4 sm:col-span-2 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                          Verificação de Aluguéis Anteriores
                        </span>
                        <h4 className="text-sm font-black text-slate-900 mt-1">
                          Identificamos que este contrato possui {simulatedInstallments.filter(i => i.isRetroactive).length} mês(es) de locação anteriores ao período atual.
                        </h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">
                          Esses {simulatedInstallments.filter(i => i.isRetroactive).length} aluguéis referentes a meses passados já foram pagos pelo inquilino?
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Opção 1: Sim, todos foram pagos */}
                      <button
                        type="button"
                        onClick={() => {
                          setPriorRentOption('all_paid');
                          const newStatuses: Record<number, 'paid' | 'pending'> = {};
                          simulatedInstallments.forEach(inst => {
                            if (inst.isRetroactive) newStatuses[inst.monthIndex] = 'paid';
                          });
                          setOverriddenInstallmentStatuses(newStatuses);
                        }}
                        className={cn(
                          "p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-2 cursor-pointer",
                          priorRentOption === 'all_paid'
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300"
                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 shrink-0" /> Sim, todos foram pagos
                          </span>
                          {priorRentOption === 'all_paid' && <Check className="w-4 h-4 shrink-0" />}
                        </div>
                        <p className={cn("text-[10px] leading-relaxed", priorRentOption === 'all_paid' ? "text-emerald-100 font-medium" : "text-slate-500")}>
                          Registra como histórico quitado. Não gerará cobranças em aberto.
                        </p>
                      </button>

                      {/* Opção 2: Não, existem aluguéis em aberto */}
                      <button
                        type="button"
                        onClick={() => {
                          setPriorRentOption('has_pending');
                        }}
                        className={cn(
                          "p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-2 cursor-pointer",
                          priorRentOption === 'has_pending'
                            ? "bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300"
                            : "bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> Não, existem pendências
                          </span>
                          {priorRentOption === 'has_pending' && <Check className="w-4 h-4 shrink-0" />}
                        </div>
                        <p className={cn("text-[10px] leading-relaxed", priorRentOption === 'has_pending' ? "text-rose-100 font-medium" : "text-slate-500")}>
                          Escolha quais meses foram pagos e quais estão em aberto (débitos).
                        </p>
                      </button>

                      {/* Opção 3: Não tenho essa informação / Decidir depois */}
                      <button
                        type="button"
                        onClick={() => {
                          setPriorRentOption('unconfirmed');
                        }}
                        className={cn(
                          "p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-2 cursor-pointer",
                          priorRentOption === 'unconfirmed'
                            ? "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300"
                            : "bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 shrink-0" /> Não tenho essa informação
                          </span>
                          {priorRentOption === 'unconfirmed' && <Check className="w-4 h-4 shrink-0" />}
                        </div>
                        <p className={cn("text-[10px] leading-relaxed", priorRentOption === 'unconfirmed' ? "text-amber-100 font-medium" : "text-slate-500")}>
                          Importa normalmente e sinaliza o contrato para confirmar depois.
                        </p>
                      </button>
                    </div>

                    {/* Tabela interativa mês a mês se houver pendências */}
                    {priorRentOption === 'has_pending' && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-rose-200 space-y-2 animate-fade-in">
                        <span className="text-xs font-bold text-slate-800 block">
                          Marque a situação financeira de cada mês anterior:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto p-1">
                          {simulatedInstallments.filter(i => i.isRetroactive).map(inst => {
                            const st = overriddenInstallmentStatuses[inst.monthIndex] || 'pending';
                            return (
                              <div key={inst.monthIndex} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                                <span className="font-bold text-slate-800">{inst.monthName} ({inst.dueDate})</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOverriddenInstallmentStatuses(prev => ({
                                      ...prev,
                                      [inst.monthIndex]: st === 'paid' ? 'pending' : 'paid'
                                    }));
                                  }}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-all shadow-xs cursor-pointer",
                                    st === 'paid' ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-rose-100 text-rose-800 border border-rose-300"
                                  )}
                                >
                                  {st === 'paid' ? '🟢 Pago' : '🔴 Em Aberto'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-4 border border-amber-100 bg-amber-50/50 p-5 rounded-2xl md:col-span-1">
                    <h3 className="font-bold text-amber-900 flex items-center gap-2"><Clock className="w-4 h-4" /> Caução / Garantia</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase">Valor Caução (R$)</label>
                          <input 
                            type="text"
                            inputMode="decimal"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                                         value={formData.depositValue || ''}
                             onFocus={e => e.target.select()}
                            onChange={e => setFormData({...formData, depositValue: Number(e.target.value)})}
                            placeholder="Ex: 3000"
                          />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase">Parcelas</label>
                          <input 
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="1"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                                         value={formData.depositInstallments || 1}
                             onFocus={e => e.target.select()}
                            onChange={e => setFormData({...formData, depositInstallments: Number(e.target.value)})}
                          />
                       </div>
                       <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Data/Dia Pagamento Caução</label>
                          <input 
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="1"
                            max="31"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                                         value={formData.depositDay || formData.paymentDay || ''}
                             onFocus={e => e.target.select()}
                            onChange={e => setFormData({...formData, depositDay: Number(e.target.value)})}
                            placeholder="Dia do mês (ex: 5)"
                          />
                       </div>
                    </div>
                </div>

                <div className="space-y-4 border border-indigo-100 bg-indigo-50/50 p-5 rounded-2xl md:col-span-2">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Penalidades e Atrasos</h3>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                               checked={formData.chargeLateFees} onChange={e => setFormData({...formData, chargeLateFees: e.target.checked})} />
                        <span className="font-medium text-slate-800">Cobrar juros e multas por atraso</span>
                    </label>

                    {formData.chargeLateFees && (
                        <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-indigo-100/50">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Multa Fixa (R$)</label>
                                <div className="flex gap-2 mt-1.5">
                                    <input type="text" inputMode="decimal" step="0.01" className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                           value={formData.lateFeePenalty || 0} onFocus={e => e.target.select()} onChange={e => setFormData({...formData, lateFeePenalty: Number(e.target.value)})} />
                                    <div className="px-3 py-2 border rounded-lg bg-slate-50 text-slate-500 font-bold shadow-sm font-mono flex items-center justify-center">
                                       R$
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Juros ao dia (%)</label>
                                <input type="text" inputMode="decimal" step="0.001" className="w-full mt-1.5 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                       value={formData.lateFeeDaily || 0} onFocus={e => e.target.select()} onChange={e => setFormData({...formData, lateFeeDaily: Number(e.target.value)})} />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="space-y-4 border border-emerald-100 bg-emerald-50/50 p-5 rounded-2xl md:col-span-2">
                    <h3 className="font-bold text-emerald-900 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Reajuste Anual</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase">Índice de Reajuste</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm outline-none"
                                value={formData.readjustmentIndex || 'none'}
                                onChange={e => setFormData({...formData, readjustmentIndex: e.target.value as any})}
                            >
                                <option value="none">Nenhum</option>
                                <option value="IPCA">IPCA</option>
                                <option value="IGPM">IGP-M</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                   <label className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                     <FileText className="w-4 h-4 text-indigo-600" />
                     Anexar Contrato Assinado (PDF ou Foto)
                   </label>

                   {(formData.evidenceName || formData.contractFile) ? (
                     <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
                       <div className="flex items-center gap-3 overflow-hidden">
                         <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs uppercase border border-emerald-200">
                           {formData.evidenceName?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOC'}
                         </div>
                         <div className="min-w-0">
                           <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                             Documento Anexado com Sucesso
                           </span>
                           <p className="text-sm font-bold text-slate-900 truncate">
                             {formData.evidenceName || 'Contrato Assinado.pdf'}
                           </p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                         {formData.contractFile && (
                           <a 
                             href={formData.contractFile} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                           >
                             <Eye className="w-3.5 h-3.5" /> Visualizar
                           </a>
                         )}
                         <button
                           type="button"
                           onClick={() => setFormData({...formData, contractFile: '', evidenceName: ''})}
                           className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-lg transition-colors"
                           title="Remover anexo"
                         >
                           <X className="w-4 h-4" />
                         </button>
                       </div>
                     </div>
                   ) : (
                     <div className="flex items-center gap-3 p-3.5 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl bg-slate-50/50 hover:bg-indigo-50/30 transition-all cursor-pointer">
                       <input type="file" accept="image/*,application/pdf" onChange={e => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.onloadend = async () => {
                             const base64 = reader.result as string;
                             if (isDriveConnected && uploadToDrive) {
                               toast.promise(
                                 uploadToDrive(file.name, base64, file.type, 'Contratos'),
                                 {
                                   loading: 'Enviando contrato...',
                                   success: (data) => {
                                     setFormData({...formData, contractFile: data.webViewLink, evidenceName: file.name, thumbnailLink: data.thumbnailLink});
                                     return 'Contrato salvo no Drive!';
                                   },
                                   error: 'Erro ao enviar.'
                                 }
                               );
                             } else {
                               setFormData({...formData, contractFile: base64, evidenceName: file.name});
                             }
                           };
                           reader.readAsDataURL(file);
                         }
                       }} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer" />
                     </div>
                   )}

                   {/* Previous Versions in Modal */}
                   {formData.fileVersions && formData.fileVersions.length > 0 && (
                     <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                       <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                         <span className="flex items-center gap-1.5">
                           <History className="w-3.5 h-3.5 text-indigo-600" />
                           Versões Anteriores Salvas ({formData.fileVersions.length})
                         </span>
                         <span className="text-[10px] text-slate-400 font-normal">Clique para restaurar</span>
                       </div>
                       <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                         {formData.fileVersions.map((ver, idx) => (
                           <div key={ver.id || idx} className="p-2 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                             <div className="min-w-0 flex-1">
                               <p className="font-bold text-slate-800 truncate">{ver.name}</p>
                               <p className="text-[10px] text-slate-400">
                                 {ver.uploadedAt ? format(parseISO(ver.uploadedAt), "dd/MM/yyyy 'às' HH:mm") : 'Data não registrada'}
                               </p>
                             </div>
                             <div className="flex items-center gap-1.5 shrink-0">
                               <a
                                 href={ver.url}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1"
                               >
                                 <Eye className="w-3 h-3" /> Ver
                               </a>
                               <button
                                 type="button"
                                 onClick={() => {
                                   const currFile = formData.contractFile;
                                   const currName = formData.evidenceName;
                                   let nextVersions = (formData.fileVersions || []).filter(v => v.id !== ver.id);
                                   if (currFile) {
                                     nextVersions = [
                                       {
                                         id: `ver_${Date.now()}`,
                                         name: currName || 'Versão Anterior.pdf',
                                         url: currFile,
                                         uploadedAt: new Date().toISOString(),
                                         notes: 'Trocado no formulário'
                                       },
                                       ...nextVersions
                                     ];
                                   }
                                   setFormData({
                                     ...formData,
                                     contractFile: ver.url,
                                     evidenceName: ver.name,
                                     fileVersions: nextVersions
                                   });
                                   toast.success(`Versão "${ver.name}" selecionada como documento ativo!`);
                                 }}
                                 className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-indigo-200/60"
                                >
                                 <RotateCcw className="w-3 h-3" /> Restaurar
                               </button>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                </div>

                <div className="flex flex-col gap-1.5 border border-indigo-100 bg-indigo-50/30 rounded-xl p-4">
                  <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-2">
                    <div>
                      <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wider ml-1 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" /> Assistente de Documentos (IA)
                      </label>
                      <p className="text-[10px] text-slate-500 ml-1">Gere contratos e termos preenchidos automaticamente pela inteligência artificial. (Opcional)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={aiDocumentType}
                        onChange={(e) => setAiDocumentType(e.target.value)}
                        className="text-xs px-2 py-2 font-medium rounded-lg bg-white border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[150px]"
                      >
                        <option value="Contrato de Locação">Contrato Locação</option>
                        <option value="Termo de Renovação de Aluguel">Renovação de Aluguel</option>
                        <option value="Contrato Simples">Contrato Simples</option>
                        <option value="Recibo Caução">Recibo Caução</option>
                        <option value="Termo Vistoria">Termo Vistoria</option>
                        <option value="Aviso Desocupação">Aviso Desocupação</option>
                        <option value="Notificação de Reajuste">Notificação de Reajuste</option>
                        <option value="Contrato Comercial">Contrato Comercial</option>
                        <option value="Recibo de Aluguel">Recibo de Aluguel</option>
                      </select>
                      <button 
                        type="button" 
                        className="text-xs px-4 py-2 font-semibold rounded-lg bg-white border text-indigo-600 border-indigo-200 hover:bg-indigo-50 transition-colors shrink-0"
                        onClick={handleGenerateAIContract}
                        disabled={isGeneratingContract}
                      >
                        {isGeneratingContract ? 'Gerando...' : (formData.aiContractText ? 'Refazer' : 'Gerar')}
                      </button>
                    </div>
                  </div>
                  {formData.aiContractText && (
                    <div className="mt-4 animate-fade-in flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">Documento Gerado (Clique para expandir)</span>
                            <button
                                type="button"
                                onClick={() => setIsFullscreenAiEditor(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                                <Maximize className="w-3.5 h-3.5" /> Tela Cheia e Edição
                            </button>
                        </div>
                        <div 
                            onClick={() => setIsFullscreenAiEditor(true)}
                            className="w-full h-48 border border-slate-200 rounded-xl p-4 text-xs font-serif overflow-y-hidden bg-white opacity-90 cursor-pointer shadow-inner relative hover:border-indigo-300 transition-colors"
                        >
                           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90 z-10 pointers-events-none flex items-end justify-center pb-4"><span className="bg-white/80 px-3 py-1 rounded-full text-indigo-600 font-bold text-xs shadow-sm backdrop-blur-sm shadow border border-indigo-100">Abrir Editor Mágico</span></div>
                           <div dangerouslySetInnerHTML={{ __html: formData.aiContractText }} className="prose prose-sm max-w-none text-slate-700 h-full overflow-hidden" />
                        </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                   <label className="font-semibold text-slate-700">Observações Extras</label>
                   <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                             value={formData.observations || ''} onChange={e => setFormData({...formData, observations: e.target.value})} rows={3} placeholder="Alguma observação sobre as regras..."></textarea>
                </div>

                <div className="space-y-2">
                   <label className="font-semibold text-slate-700">Status do Contrato</label>
                   <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                           value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                      <option value="active">🟢 Ativo</option>
                      <option value="ended">⚪ Encerrado (Fim natural)</option>
                      <option value="broken">🔴 Quebrado (Rescisão antecipada)</option>
                      <option value="archived">📁 Arquivado (Imóvel/Inquilino Excluído)</option>
                   </select>
                </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-end shrink-0 rounded-b-2xl">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleOpenSimulation} 
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-sm transition flex justify-center items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Simular & Validar
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition flex justify-center items-center gap-2"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Contrato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SIMULAÇÃO E VALIDAÇÃO DE REGRAS DO CONTRATO */}
      {isSimulationModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-auto relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      Simulação do Lançamento
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">
                      Prévia de Validação do Contrato
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setIsSimulationModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6 text-sm max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Card Imóvel & Inquilino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                    🏠 Imóvel a Ser Vinculado
                  </span>
                  <p className="font-bold text-slate-900 text-base">
                    {getPropertyName(formData.propertyId || '')}
                  </p>
                  <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200/80">
                    <p><strong>Aluguel:</strong> R$ {Number(formData.rentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p><strong>Dia Vencimento:</strong> Todo dia {formData.paymentDay}</p>
                    <p><strong>Status Atualização:</strong> <span className="text-emerald-600 font-bold">Livre ➔ Alugado</span></p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                    👤 Inquilino a Ser Alocado
                  </span>
                  <p className="font-bold text-slate-900 text-base">
                    {getTenantName(formData.tenantId || '')}
                  </p>
                  <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200/80">
                    <p><strong>CPF:</strong> {tenants.find(t => t.id === formData.tenantId)?.cpf || 'N/I'}</p>
                    <p><strong>Contato:</strong> {tenants.find(t => t.id === formData.tenantId)?.contact || 'N/I'}</p>
                    <p><strong>Status Atualização:</strong> <span className="text-emerald-600 font-bold">Em Espera ➔ Alocado</span></p>
                  </div>
                </div>
              </div>

              {/* Cronograma Financeiro e Meses Retroativos */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Cronograma Financeiro do Contrato (Do Mês 1 ao Mês Atual)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Entenda como a contabilidade tratará cada mês decorrido desde o início ({formData.startDate})
                    </p>
                  </div>
                  {simulatedInstallments.some(i => i.isRetroactive) && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full shrink-0 self-start sm:self-auto">
                      {simulatedInstallments.filter(i => i.isRetroactive).length} mês(es) retroativo(s)
                    </span>
                  )}
                </div>

                {/* Resumo das métricas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Quitados Retroativamente</span>
                    <span className="text-lg font-black text-emerald-700">
                      {simulatedInstallments.filter(i => i.status === 'paid').length} parcela(s)
                    </span>
                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                      R$ {(simulatedInstallments.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Cobrança Atual (A Vencer)</span>
                    <span className="text-lg font-black text-amber-700">
                      {simulatedInstallments.filter(i => i.status === 'pending').length} parcela(s)
                    </span>
                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                      R$ {(simulatedInstallments.filter(i => i.status === 'pending').reduce((acc, i) => acc + i.amount, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Lista Detalhada de Parcelas */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {simulatedInstallments.map((inst) => (
                    <div
                      key={inst.monthIndex}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between text-xs gap-3 transition-colors",
                        inst.status === 'paid' 
                          ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" 
                          : "bg-amber-50/80 border-amber-200 text-amber-900"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]",
                          inst.status === 'paid' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                        )}>
                          {inst.monthIndex}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate">{inst.monthName}</p>
                          <p className="text-[10px] opacity-80">Vencimento: {inst.dueDate}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-sm">
                          R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {inst.isRetroactive ? (
                          <button
                            type="button"
                            onClick={() => {
                              const nextStatus = inst.status === 'paid' ? 'pending' : 'paid';
                              setOverriddenInstallmentStatuses(prev => ({
                                ...prev,
                                [inst.monthIndex]: nextStatus
                              }));
                            }}
                            title="Clique para alternar entre Quitado e Pendente/Devendo"
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer hover:scale-105 transition-all shadow-sm",
                              inst.status === 'paid' 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200" 
                                : "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200"
                            )}
                          >
                            {inst.status === 'paid' ? '🟢 Quitado (Retroativo)' : '🔴 Devendo / Pendente'}
                            <span className="text-[8px] opacity-60">🔄</span>
                          </button>
                        ) : (
                          <span className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                            inst.status === 'paid' 
                              ? "bg-emerald-200 text-emerald-800 border-emerald-300" 
                              : "bg-amber-200 text-amber-800 border-amber-300 animate-pulse"
                          )}>
                            {inst.status === 'paid' ? 'Quitado' : 'Cobrar Agora (Mês Atual)'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Se for Edição do Contrato: Mostrar notas de aditivo/extensão */}
              {editingContract && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Histórico de Aditivo / Atualização de Contrato
                  </span>
                  <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                    Esta edição será registrada no histórico com a observação:
                  </p>
                  <div className="p-3 bg-white border border-indigo-200 rounded-xl text-xs font-mono text-indigo-900">
                    {detectedContractChanges.length > 0 ? (
                      <div>
                        <strong>[Aditivo em {format(new Date(), 'dd/MM/yyyy')}]:</strong> Contrato estendido/atualizado.
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          {detectedContractChanges.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <span>Nenhuma alteração de prazo, valor ou vencimento detectada. Contrato mantido com os parâmetros atuais.</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé da Simulação */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => setIsSimulationModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-200 transition-colors text-sm"
              >
                Voltar e Ajustar
              </button>
              <button
                onClick={() => {
                  setIsSimulationModalOpen(false);
                  handleSubmit();
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar e Gravar no Banco de Dados
              </button>
            </div>
          </div>
        </div>
      )}

      {isFullscreenAiEditor && (
         <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden animate-slide-up">
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0 gap-4">
                   <div className="flex items-center gap-3 w-full sm:w-auto">
                       <div className="w-10 h-10 bg-indigo-100/50 rounded-full flex items-center justify-center text-indigo-600 shrink-0">
                          <Sparkles className="w-5 h-5" />
                       </div>
                       <div>
                          <h3 className="font-bold text-slate-800">Editor de Contrato IA</h3>
                          <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-1">Edite, adicione ou remova textos diretamente</p>
                       </div>
                   </div>
                   
                   <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                       <div className="flex flex-row items-center gap-2 text-[10px] sm:text-xs bg-white px-3 py-2 rounded-lg border border-slate-200 w-full sm:w-auto justify-center">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#fef08a]"></span> Dados Importados</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#bbf7d0]"></span> Base Jurídica / IA</span>
                       </div>
                       <button onClick={() => setIsFullscreenAiEditor(false)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all focus:outline-none">
                          <CheckCircle2 className="w-4 h-4" /> Concluir Edição
                       </button>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-12 md:p-16 bg-slate-100">
                   <div className="max-w-3xl mx-auto bg-white p-6 sm:p-12 shadow-sm rounded-lg min-h-full border border-slate-200">
                      <div 
                          className="prose prose-sm font-serif focus:outline-none max-w-none text-slate-800"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => setFormData({...formData, aiContractText: e.currentTarget.innerHTML})}
                          dangerouslySetInnerHTML={{ __html: formData.aiContractText }}
                      />
                   </div>
                </div>
            </div>
         </div>
      )}

      {isRenewArchiveModalOpen && targetContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl flex flex-col overflow-hidden">
            <div className={`p-6 flex items-center gap-4 ${renewArchiveMode === 'renew' ? 'bg-emerald-600' : 'bg-slate-800'}`}>
              <div className="p-3 bg-white/20 rounded-2xl text-white">
                {renewArchiveMode === 'renew' ? <RotateCcw className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
              </div>
              <div className="text-white">
                <h2 className="text-xl font-bold tracking-tight">
                  {renewArchiveMode === 'renew' ? 'Renovar / Ajustar' : 'Arquivar Contrato'}
                </h2>
                <p className="text-sm opacity-90">
                  {getTenantName(targetContract.tenantId)}
                </p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {renewArchiveMode === 'renew' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nova Data de Término</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    value={raEndDate}
                    onChange={(e) => setRaEndDate(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    O contrato voltará para o status "Ativo". Deixe em branco se for indeterminado.
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Observações sobre o Acordo</label>
                <textarea
                  className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  rows={4}
                  placeholder={renewArchiveMode === 'renew' ? "Ex: Renovou por mais 12 meses com aluguel ajustado..." : "Ex: Contrato encerrado, chaves entregues..."}
                  value={raObservations}
                  onChange={(e) => setRaObservations(e.target.value)}
                ></textarea>
                <p className="text-xs text-slate-500">
                  Importante para lembrar o que foi combinado com o inquilino.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end shrink-0">
              <button
                onClick={() => setIsRenewArchiveModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleRenewArchiveSubmit}
                disabled={isSubmitting}
                className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-sm transition flex justify-center items-center gap-2 ${
                  renewArchiveMode === 'renew' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {isSubmitting ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERADOR RÁPIDO DE DOCUMENTOS E DECLARAÇÕES */}
      {isQuickDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:block print:w-full print:h-auto print:overflow-visible">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:shadow-none print:rounded-none print:w-full print:block print:overflow-visible">
            {/* Header */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <FileSignature className="w-6 h-6 text-indigo-300" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">Modelos Rápidos & Declarações Legais</h2>
                  <p className="text-xs text-indigo-200">Embasados na Lei do Inquilinato (Lei nº 8.245/91) e Código Civil (Lei nº 10.406/02)</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickDocModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 print:p-0">
              {/* Selector Bar */}
              <div className="print:hidden space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selecione o Modelo de Documento</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { tag: 'Declaração Residência', type: 'Declaração de Residência e Vínculo Locatício', icon: FileSignature },
                    { tag: 'Contrato Locação', type: 'Contrato de Locação', icon: FileText },
                    { tag: 'Renovar Aluguel', type: 'Termo de Renovação de Aluguel', icon: RotateCcw },
                    { tag: 'Termo Vistoria', type: 'Termo Vistoria', icon: FileCheck },
                    { tag: 'Recibo Aluguel', type: 'Recibo de Aluguel', icon: Receipt },
                    { tag: 'Recibo Caução', type: 'Recibo Caução', icon: DollarSign },
                    { tag: 'Notificar Reajuste', type: 'Notificação de Reajuste', icon: AlertTriangle },
                    { tag: 'Aviso Desocupação', type: 'Aviso Desocupação', icon: XCircle },
                  ].map((m) => {
                    const MIcon = m.icon;
                    return (
                      <button
                        key={m.type}
                        onClick={() => setQuickDocType(m.type)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all",
                          quickDocType === m.type
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200"
                        )}
                      >
                        <MIcon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{m.tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form inputs */}
              <div className="print:hidden bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600" /> Pré-preenchimento com Dados do Sistema (Opcional)
                  </h3>
                  <span className="text-[11px] text-slate-500">Selecione ou preencha avulso</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Inquilino (Locatário)</label>
                    <select
                      value={quickDocTenantId}
                      onChange={(e) => handleSelectQuickDocTenant(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-xl px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Digitar Manualmente ou Selecionar --</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.cpf || 'Sem CPF'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Imóvel</label>
                    <select
                      value={quickDocPropertyId}
                      onChange={(e) => handleSelectQuickDocProperty(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-xl px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Digitar Manualmente ou Selecionar --</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - {p.address}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Nome do Inquilino</label>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={quickDocCustomTenantName}
                      onChange={(e) => setQuickDocCustomTenantName(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-xl px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">CPF do Inquilino</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={quickDocCustomTenantCpf}
                      onChange={(e) => setQuickDocCustomTenantCpf(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-xl px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Endereço Completo do Imóvel</label>
                    <input
                      type="text"
                      placeholder="Rua, número, complemento, bairro, cidade - UF"
                      value={quickDocCustomPropertyAddress}
                      onChange={(e) => setQuickDocCustomPropertyAddress(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-xl px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Valor do Aluguel (R$)</label>
                    <input
                      type="number"
                      placeholder="1500"
                      value={quickDocRentValue || ''}
                      onChange={(e) => setQuickDocRentValue(Number(e.target.value))}
                      className="w-full bg-white text-slate-800 rounded-xl px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Data de Início / Referência</label>
                    <input
                      type="date"
                      value={quickDocStartDate}
                      onChange={(e) => setQuickDocStartDate(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-xl px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Cônjuge / Copartícipe</label>
                    <input
                      type="text"
                      placeholder="Ex: Maria da Silva (CPF: 000.000.000-00)"
                      value={quickDocSpouse}
                      onChange={(e) => setQuickDocSpouse(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-xl px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Filhos / Dependentes</label>
                    <input
                      type="text"
                      placeholder="Ex: Pedro (8 anos), Ana (5 anos)"
                      value={quickDocChildren}
                      onChange={(e) => setQuickDocChildren(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-xl px-3 py-2 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 block">Demais Moradores e Ocupantes do Imóvel</label>
                      <span className="text-[10px] text-indigo-600 font-semibold">Incluídos no documento oficial</span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Ex:&#10;- João Pedro Silva (Filho, CPF: 111.222.333-44)&#10;- Maria Clara Silva (Mãe, Idade: 68)"
                      value={quickDocAdditionalResidentsText}
                      onChange={(e) => setQuickDocAdditionalResidentsText(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-xl p-3 border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleGenerateQuickDocument}
                    disabled={isGeneratingQuickDoc}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isGeneratingQuickDoc ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Gerando Documento com Jurista IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" /> Gerar {quickDocType} (IA)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Document Result */}
              {quickDocText && (
                <div className="space-y-4">
                  <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-3 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Documento Oficial Gerado (Formato A4)
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleQuickDocEdit}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs border",
                          isEditingQuickDocText 
                            ? "bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-200" 
                            : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                        )}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                        {isEditingQuickDocText ? 'Concluir Edição' : 'Editar Texto'}
                      </button>

                      <button
                        onClick={() => {
                          const docHtmlToCopy = quickDocRef.current ? quickDocRef.current.innerHTML : quickDocText;
                          const plainText = docHtmlToCopy.replace(/<[^>]+>/g, '').trim();
                          navigator.clipboard.writeText(plainText);
                          toast.success('Texto copiado com sucesso!');
                        }}
                        className="px-3.5 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-600" /> Copiar
                      </button>

                      <button
                        onClick={handlePrintQuickDoc}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" /> Imprimir / PDF (A4)
                      </button>
                    </div>
                  </div>

                  {isEditingQuickDocText && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium flex items-center gap-2 print:hidden animate-fade-in">
                      <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                      <span><strong>Modo de Edição Direta Ativo:</strong> Clique em qualquer parte do texto no documento A4 abaixo para alterar, incluir ou remover informações. Os dados são salvos continuamente sem saltar o cursor.</span>
                    </div>
                  )}

                  {/* Visual A4 Sheet Container */}
                  <div className="w-full flex justify-center overflow-x-auto p-2 sm:p-4 bg-slate-200/60 rounded-2xl print:p-0 print:bg-transparent">
                    <div 
                      ref={quickDocRef}
                      id="quick-doc-printable-area" 
                      className={cn(
                        "w-full max-w-[210mm] min-h-[297mm] bg-white p-6 sm:p-[20mm] rounded-sm shadow-xl border border-slate-300 text-slate-900 font-serif leading-relaxed text-[11pt] transition-all print:max-w-none print:w-full print:p-0 print:border-none print:shadow-none print:text-black print:min-h-0 print:block print:overflow-visible",
                        isEditingQuickDocText && "border-2 border-dashed border-amber-400 ring-4 ring-amber-100/80 bg-amber-50/10 focus:outline-none"
                      )}
                      style={{ fontFamily: '"Times New Roman", Times, Georgia, serif', lineHeight: '1.6' }}
                      contentEditable={isEditingQuickDocText}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => {
                        setQuickDocText(cleanDocHtml(e.currentTarget.innerHTML));
                      }}
                      dangerouslySetInnerHTML={{ __html: cleanDocHtml(quickDocText) }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0 print:hidden">
              <button
                onClick={() => setIsQuickDocModalOpen(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Histórico Anterior do Contrato */}
      {confirmingHistoryContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmingHistoryContract(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Confirmar Histórico Anterior</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {getTenantName(confirmingHistoryContract.tenantId)} — {getPropertyName(confirmingHistoryContract.propertyId)}
                  </p>
                </div>
              </div>
              <button onClick={() => setConfirmingHistoryContract(null)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-slate-200 transition">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {(() => {
                const retroList = generateContractInstallmentsList(
                  confirmingHistoryContract.startDate,
                  confirmingHistoryContract.rentValue,
                  confirmingHistoryContract.paymentDay,
                  confirmingHistoryContract.endDate
                ).filter(i => i.isRetroactive);

                const pastCount = retroList.length || confirmingHistoryContract.priorMonthsCount || 1;

                return (
                  <>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium leading-relaxed space-y-2">
                      <p className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        Pergunta de Verificação
                      </p>
                      <p className="text-xs text-amber-900">
                        Identificamos que este contrato possui <strong>{pastCount} mês(es) de locação anteriores</strong> ao período atual (início: {confirmingHistoryContract.startDate ? format(parseISO(confirmingHistoryContract.startDate), 'dd/MM/yyyy') : 'N/A'}). Esses {pastCount} aluguéis já foram pagos pelo inquilino?
                      </p>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setConfirmHistoryOption('all_paid')}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer",
                          confirmHistoryOption === 'all_paid'
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-md"
                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                        )}
                      >
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-xs">Sim, todos foram pagos</p>
                          <p className={cn("text-[11px] mt-0.5", confirmHistoryOption === 'all_paid' ? "text-emerald-100" : "text-slate-500")}>
                            Registra os meses anteriores como quitados no histórico do sistema.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmHistoryOption('has_pending')}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer",
                          confirmHistoryOption === 'has_pending'
                            ? "bg-rose-600 text-white border-rose-700 shadow-md"
                            : "bg-white text-slate-700 border-slate-200 hover:border-rose-300"
                        )}
                      >
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-xs">Não, existem aluguéis em aberto</p>
                          <p className={cn("text-[11px] mt-0.5", confirmHistoryOption === 'has_pending' ? "text-rose-100" : "text-slate-500")}>
                            Permite especificar mês a mês quais foram pagos e quais estão devendo.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmHistoryOption('unconfirmed')}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer",
                          confirmHistoryOption === 'unconfirmed'
                            ? "bg-amber-500 text-white border-amber-600 shadow-md"
                            : "bg-white text-slate-700 border-slate-200 hover:border-amber-300"
                        )}
                      >
                        <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-xs">Não tenho essa informação / Decidir depois</p>
                          <p className={cn("text-[11px] mt-0.5", confirmHistoryOption === 'unconfirmed' ? "text-amber-100" : "text-slate-500")}>
                            Mantém o contrato com o aviso pendente para você confirmar no futuro.
                          </p>
                        </div>
                      </button>
                    </div>

                    {confirmHistoryOption === 'has_pending' && retroList.length > 0 && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-fade-in">
                        <span className="text-xs font-bold text-slate-800 block">
                          Situação financeira dos meses anteriores:
                        </span>
                        <div className="space-y-2 max-h-[180px] overflow-y-auto p-1">
                          {retroList.map(inst => {
                            const st = confirmHistoryOverrides[inst.monthIndex] || 'pending';
                            return (
                              <div key={inst.monthIndex} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs">
                                <span className="font-bold text-slate-800">{inst.monthName} ({inst.dueDate})</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmHistoryOverrides(prev => ({
                                      ...prev,
                                      [inst.monthIndex]: st === 'paid' ? 'pending' : 'paid'
                                    }));
                                  }}
                                  className={cn(
                                    "px-3 py-1 rounded-md text-[10px] font-extrabold uppercase transition-all shadow-xs cursor-pointer",
                                    st === 'paid' ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-rose-100 text-rose-800 border border-rose-300"
                                  )}
                                >
                                  {st === 'paid' ? '🟢 Pago' : '🔴 Em Aberto'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveHistoryConfirmation}
                disabled={isConfirmHistorySubmitting}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition"
              >
                {isConfirmHistorySubmitting ? 'Salvando...' : 'Salvar Confirmação'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingHistoryContract(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Versões do Contrato */}
      {isVersionsModalOpen && selectedContractForVersions && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Histórico de Versões do Contrato</h3>
                  <p className="text-xs text-slate-500">Recupere ou visualize vias e aditivos anteriores</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsVersionsModalOpen(false);
                  setSelectedContractForVersions(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Versão Atual */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-emerald-800 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Versão Atual em Vigor
                  </span>
                  <span className="bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full text-[10px]">
                    Ativa
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {selectedContractForVersions.evidenceName || 'Contrato Vigente.pdf'}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    Última atualização: {selectedContractForVersions.updatedAt ? format(parseISO(selectedContractForVersions.updatedAt), "dd/MM/yyyy 'às' HH:mm") : 'Data não informada'}
                  </span>
                  {selectedContractForVersions.contractFile && (
                    <a
                      href={selectedContractForVersions.contractFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> Abrir Arquivo
                    </a>
                  )}
                </div>
              </div>

              {/* Versões Anteriores */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Versões Anteriores Arquivadas ({selectedContractForVersions.fileVersions?.length || 0})
                </h4>

                {(!selectedContractForVersions.fileVersions || selectedContractForVersions.fileVersions.length === 0) ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    Nenhuma via anterior registrada para este contrato ainda. Quando uma nova via for enviada, a anterior será arquivada aqui automaticamente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedContractForVersions.fileVersions.map((version, idx) => (
                      <div
                        key={version.id || idx}
                        className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-indigo-200 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                              #{selectedContractForVersions.fileVersions!.length - idx}
                            </span>
                            <p className="font-bold text-sm text-slate-800 truncate">{version.name}</p>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Arquivado em: {version.uploadedAt ? format(parseISO(version.uploadedAt), "dd/MM/yyyy 'às' HH:mm") : 'Data não registrada'}
                            {version.notes && ` • ${version.notes}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={version.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRestoreContractVersion(selectedContractForVersions, version)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsVersionsModalOpen(false);
                  setSelectedContractForVersions(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assistente de Finalização de Contrato & Desocupação (Check-out) */}
      {terminatingContract && (
        <ContractTerminationModal
          isOpen={true}
          onClose={() => setTerminatingContract(null)}
          contract={terminatingContract}
          tenant={tenants.find(t => t.id === terminatingContract.tenantId)}
          property={properties.find(p => p.id === terminatingContract.propertyId)}
          payments={payments}
          onSecurityCheck={onSecurityCheck}
          onSuccess={() => {
            setTerminatingContract(null);
          }}
        />
      )}

      {/* Modal de Visualização de Rescisão Concluída */}
      {viewingTerminationContract && viewingTerminationContract.terminationDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setViewingTerminationContract(null)} />
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Histórico da Rescisão / Check-out</h3>
              </div>
              <button onClick={() => setViewingTerminationContract(null)} className="p-1 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Chaves Devolvidas</span>
                  <p className="font-bold text-slate-800">
                    {format(parseISO(viewingTerminationContract.terminationDetails.keysReturnDate), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Vistoria</span>
                  <p className="font-bold text-slate-800">
                    {viewingTerminationContract.terminationDetails.inspectionStatus === 'completed_ok' ? 'Aprovada OK' :
                     viewingTerminationContract.terminationDetails.inspectionStatus === 'completed_with_repairs' ? 'Com Reparos' :
                     viewingTerminationContract.terminationDetails.inspectionStatus === 'not_done_waived' ? 'Dispensada' : 'Pendente'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Reparos</span>
                  <p className="font-bold text-amber-700">
                    R$ {viewingTerminationContract.terminationDetails.totalRepairs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Saldo Final</span>
                  <p className={`font-black ${viewingTerminationContract.terminationDetails.balanceAction === 'refund_tenant' ? 'text-emerald-600' : viewingTerminationContract.terminationDetails.balanceAction === 'tenant_owes' ? 'text-rose-600' : 'text-slate-800'}`}>
                    {viewingTerminationContract.terminationDetails.balanceAction === 'refund_tenant' ? 'Devolvido: ' : viewingTerminationContract.terminationDetails.balanceAction === 'tenant_owes' ? 'A Receber: ' : 'Quitado: '}
                    R$ {Math.abs(viewingTerminationContract.terminationDetails.finalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {viewingTerminationContract.terminationDetails.repairItems && viewingTerminationContract.terminationDetails.repairItems.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-800 uppercase tracking-tight text-[11px]">Reparos Descontados da Caução:</span>
                  <div className="space-y-1">
                    {viewingTerminationContract.terminationDetails.repairItems.map(rep => (
                      <div key={rep.id} className="flex justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span>{rep.description}</span>
                        <span className="font-bold text-amber-700">R$ {rep.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingTerminationContract.terminationDetails.observations && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800 uppercase tracking-tight text-[10px] block mb-1">Observações do Gerente:</span>
                  <p className="italic text-slate-600 leading-relaxed">{viewingTerminationContract.terminationDetails.observations}</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingTerminationContract(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <CreationProgressOverlay isOpen={showProgressOverlay} steps={creationSteps} />
    </div>
  );
}
