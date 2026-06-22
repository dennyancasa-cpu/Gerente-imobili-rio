import React, { useState } from 'react';
import { Contract, Property, Tenant, OperationType } from '../types';
import { 
  FileText, Plus, Search, CheckCircle2, XCircle, Clock, 
  Trash2, AlertTriangle, Upload, Eye, FileSignature, Sparkles,
  ChevronDown, ChevronUp, Maximize
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
import { db, auth } from '../firebase';
import { handleFirestoreError } from '../utils/firestoreError';
import { toast } from 'sonner';
import { generateLeaseContract } from '../services/geminiService';

interface ContractsViewProps {
  contracts: Contract[];
  properties: Property[];
  tenants: Tenant[];
  onSecurityCheck: (onSuccess: () => void, description?: string) => void;
  isDriveConnected: boolean;
  uploadToDrive?: (fileName: string, fileData: string, mimeType: string, folderName?: string) => Promise<any>;
  initialOpenTemplate?: string | null;
}

export const ContractsView = ({ contracts, properties, tenants, onSecurityCheck, isDriveConnected, uploadToDrive, initialOpenTemplate }: ContractsViewProps) => {
  const [filterStatus, setFilterStatus] = useState<Contract['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  
  const [aiDocumentType, setAiDocumentType] = useState(initialOpenTemplate || 'Contrato de Locação');
  const [isModelsExpanded, setIsModelsExpanded] = useState(false);
  const [isFullscreenAiEditor, setIsFullscreenAiEditor] = useState(false);

  React.useEffect(() => {
    if (initialOpenTemplate) {
      setAiDocumentType(initialOpenTemplate);
      setIsModalOpen(true);
    }
  }, [initialOpenTemplate]);
  
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

  const getTenantName = (id: string) => tenants.find(t => t.id === id)?.name || 'Desconhecido';
  const getPropertyName = (id: string) => properties.find(p => p.id === id)?.name || 'Desconhecido';

  const filteredContracts = contracts.filter(c => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesSearch = 
      getTenantName(c.tenantId).toLowerCase().includes(searchQuery.toLowerCase()) || 
      getPropertyName(c.propertyId).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      setFormData(prev => ({
        ...prev,
        propertyId,
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
    const tenant = tenants.find(t => t.id === formData.tenantId);
    const prop = properties.find(p => p.id === formData.propertyId);
    
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
        await updateDoc(doc(db, 'contracts', editingContract.id), contractData);
        toast.success('Contrato atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'contracts'), contractData);
        
        // Also update Property to set currentTenantId
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
        
        await updateDoc(propertyRef, propertyUpdateData);

        // Also update Tenant default allocations
        const tenantRef = doc(db, 'tenants', contractData.tenantId);
        await updateDoc(tenantRef, {
            propertyId: contractData.propertyId,
            status: 'allocated'
        });

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
        
        await addDoc(collection(db, 'payments'), {
          propertyId: contractData.propertyId,
          tenantId: contractData.tenantId,
          amount: contractData.rentValue || 0,
          dueDate: firstRentAdjustment.adjustedDate,
          originalDueDate: firstRentAdjustment.wasAdjusted ? firstRentAdjustment.originalDate : undefined,
          status: 'pending',
          ownerId: ownerId,
          type: 'rent',
          description: 'Primeiro Aluguel',
          observations: firstRentAdjustment.wasAdjusted ? firstRentAdjustment.adjustmentReason : '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

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
             
             await addDoc(collection(db, 'payments'), {
               propertyId: contractData.propertyId,
               tenantId: contractData.tenantId,
               amount: installmentValue,
               dueDate: depositAdj.adjustedDate,
               originalDueDate: depositAdj.wasAdjusted ? depositAdj.originalDate : undefined,
               status: 'pending',
               ownerId: ownerId,
               type: 'deposit',
               description: installments > 1 ? `Caução (${i + 1}/${installments})` : 'Caução Integral',
               observations: depositAdj.wasAdjusted ? depositAdj.adjustmentReason : '',
               createdAt: new Date().toISOString(),
               updatedAt: new Date().toISOString()
             });
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

  const handleDelete = async (id: string) => {
    onSecurityCheck(async () => {
      try {
        await deleteDoc(doc(db, 'contracts', id));
        toast.success('Contrato excluído!');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'contracts');
        toast.error('Erro ao excluir contrato.');
      }
    }, 'Excluir definitivamente este contrato.');
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

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por inquilino ou móvel..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 font-medium text-slate-700 placeholder:text-slate-400"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto shrink-0 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {(['all', 'active', 'ended', 'broken'] as const).map(status => (
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
               status === 'ended' ? 'Encerrados' : 'Quebrados'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filteredContracts.map(contract => (
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
                  contract.status === 'active' ? "bg-emerald-100 text-emerald-800" :
                  contract.status === 'ended' ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-800"
               )}>
                  {contract.status === 'active' ? 'Ativo' : contract.status === 'ended' ? 'Encerrado' : 'Quebrado'}
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
        ))}

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
                <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="font-semibold text-slate-700">Inquilino <span className="text-red-500">*</span></label>
                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.tenantId || ''} onChange={e => setFormData({...formData, tenantId: e.target.value})}>
                           <option value="">Selecione...</option>
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
                      <input type="number" min="1" max="31" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
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
                            type="number"
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
                            type="number"
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
                            type="number"
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
                                    <input type="number" step="0.01" className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                           value={formData.lateFeePenalty || 0} onFocus={e => e.target.select()} onChange={e => setFormData({...formData, lateFeePenalty: Number(e.target.value)})} />
                                    <div className="px-3 py-2 border rounded-lg bg-slate-50 text-slate-500 font-bold shadow-sm font-mono flex items-center justify-center">
                                       R$
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Juros ao dia (%)</label>
                                <input type="number" step="0.001" className="w-full mt-1.5 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                       value={formData.lateFeeDaily || 0} onFocus={e => e.target.select()} onChange={e => setFormData({...formData, lateFeeDaily: Number(e.target.value)})} />
                            </div>
                        </div>
                    )}
                </div>


                <div className="space-y-2">
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
    </div>
  );
}
