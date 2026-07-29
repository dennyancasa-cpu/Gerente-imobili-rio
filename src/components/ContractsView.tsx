import React, { useState, useMemo } from 'react';
import { Contract, Property, Tenant, OperationType, StorageSpace } from '../types';
import { 
  FileText, Plus, Search, CheckCircle2, XCircle, Clock, 
  Trash2, AlertTriangle, Upload, Eye, FileSignature, Sparkles,
  ChevronDown, ChevronUp, Maximize, RotateCcw, Archive, TrendingUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { adjustDateToNextBusinessDay } from '../utils/dateHelpers';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { addDoc, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

interface ContractsViewProps {
  contracts: Contract[];
  properties: Property[];
  tenants: Tenant[];
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

  React.useEffect(() => {
    if (initialOpenTemplate) {
      setAiDocumentType(initialOpenTemplate);
      setIsModalOpen(true);
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
        list.push(`O inquilino "${getTenantName(formData.tenantId)}" já possui um contrato ativo para o imóvel "${getPropertyName(activeContractForTenant.propertyId)}"!`);
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
            list.push(`Atenção: Detectamos outro cadastro de inquilino ativo com o mesmo nome ou CPF (${selectedTenant.cpf || 'sem CPF'}) que já possui um contrato ativo para o imóvel "${getPropertyName(c.propertyId)}". Certifique-se de que não está duplicando o contrato.`);
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
    
    // Build combined data
    const combinedData = {
      ...tenant,
      ...formData,
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

    setIsSubmitting(true);
    try {
      const ownerId = auth.currentUser?.uid;
      if (!ownerId) throw new Error("Not authenticated");

      const contractData: any = {
        tenantId: formData.tenantId,
        propertyId: formData.propertyId,
        startDate: formData.startDate,
        rentValue: Number(formData.rentValue),
        paymentDay: Number(formData.paymentDay),
        chargeLateFees: formData.chargeLateFees || false,
        status: formData.status || 'active',
        ownerId,
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

      if (editingContract?.id) {
        await updateDoc(doc(db, 'contracts', editingContract.id), cleanObject(contractData));

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
          // Bind/Update the current property
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

          // Bind/Update the current tenant
          if (contractData.tenantId !== 'proprietario') {
            await updateDoc(doc(db, 'tenants', contractData.tenantId), {
              propertyId: contractData.propertyId,
              status: 'allocated'
            });
          }
        } else {
          // Status is ended or broken: free up the current property and tenant
          if (!contractData.propertyId.startsWith('storage-')) {
            await updateDoc(doc(db, 'properties', contractData.propertyId), {
              currentTenantId: null,
              status: 'vacant'
            });
          } else {
            const storageId = contractData.propertyId.replace('storage-', '');
            await updateDoc(doc(db, 'storages', storageId), {
              contractStartDate: "",
              contractEndDate: "",
              monthlyCost: 0
            });
          }

          if (contractData.tenantId !== 'proprietario') {
            await updateDoc(doc(db, 'tenants', contractData.tenantId), {
              propertyId: null,
              status: 'waiting'
            });
          }
        }

        toast.success('Contrato atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'contracts'), cleanObject(contractData));
        
        // Also update Property to set currentTenantId (only if it's a real property)
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
          // It's a storage space, update the storage space contract details
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

        // Also update Tenant default allocations (only if it's a real tenant)
        if (contractData.tenantId !== 'proprietario') {
          const tenantRef = doc(db, 'tenants', contractData.tenantId);
          await updateDoc(tenantRef, cleanObject({
              propertyId: contractData.propertyId,
              status: 'allocated'
          }));
        }

        // Generate First Rent
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
        }

        toast.success('Contrato criado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingContract ? OperationType.UPDATE : OperationType.CREATE, 'contracts');
      toast.error('Erro ao salvar contrato.');
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
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                {[
                  { tag: 'Contrato Locação', type: 'Contrato de Locação', icon: FileText },
                  { tag: 'Renovar Aluguel', type: 'Termo de Renovação de Aluguel', icon: FileText },
                  { tag: 'Termo Vistoria', type: 'Termo Vistoria', icon: FileText },
                  { tag: 'Recibo Aluguel', type: 'Recibo de Aluguel', icon: FileText },
                  { tag: 'Recibo Caução', type: 'Recibo Caução', icon: FileText },
                  { tag: 'Notificar Reajuste', type: 'Notificação de Reajuste', icon: AlertTriangle },
                  { tag: 'Aviso Desocupação', type: 'Aviso Desocupação', icon: XCircle },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setIsModelsExpanded(false);
                        setAiDocumentType(item.type);
                        handleOpenModal();
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
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3 text-rose-800 shadow-sm mb-6">
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

          return (
            <div key={contract.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col hover:border-indigo-200 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="font-bold text-slate-900 truncate pr-4" title={getTenantName(contract.tenantId)}>
                       {getTenantName(contract.tenantId)}
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
                       <div className="flex gap-2">
                           <button onClick={() => handleOpenRenewArchive(contract, 'renew')} className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 ${isExpired ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'}`}>
                              <RotateCcw className="w-3.5 h-3.5" /> Renovar
                           </button>
                           <button onClick={() => handleOpenRenewArchive(contract, 'archive')} className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 ${isExpired ? 'bg-white border border-rose-200 hover:bg-rose-50 text-rose-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                              <Archive className="w-3.5 h-3.5" /> Arquivar
                           </button>
                       </div>
                    </div>
                 )}
              </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
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
                   <label className="font-semibold text-slate-700">Anexar Contrato Assinado (PDF/Foto)</label>
                   <div className="flex items-center gap-3 p-3 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                     <input type="file" onChange={e => {
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
                     }} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                     {formData.contractFile && (
                       <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                     )}
                   </div>
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

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end shrink-0 rounded-b-2xl">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                disabled={isSubmitting}
              >
                Cancelar
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

    </div>
  );
}
