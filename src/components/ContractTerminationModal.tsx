import React, { useState, useMemo } from 'react';
import { 
  Contract, 
  Property, 
  Tenant, 
  Payment, 
  RepairItem, 
  ContractTerminationDetails, 
  OperationType 
} from '../types';
import { 
  Key, 
  FileCheck2, 
  AlertCircle, 
  CheckCircle2, 
  Calculator, 
  FileText, 
  X, 
  Plus, 
  Trash2, 
  Printer, 
  Copy, 
  ArrowRight, 
  ArrowLeft, 
  DollarSign, 
  Building2, 
  User, 
  Calendar, 
  ShieldCheck, 
  Wrench, 
  Sparkles, 
  Check, 
  Receipt,
  HelpCircle,
  Zap,
  Droplets,
  Flame,
  Home
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CurrencyInput } from './CurrencyInput';
import { db, auth } from '../firebase';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { handleFirestoreError } from '../utils/firestoreError';
import { toast } from 'sonner';

interface ContractTerminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  tenant?: Tenant;
  property?: Property;
  payments?: Payment[];
  onSuccess: () => void;
  onSecurityCheck: (onSuccess: () => void, description?: string) => void;
}

const COMMON_REPAIRS = [
  { description: 'Pintura geral e retoque de paredes', suggestedCost: 650 },
  { description: 'Troca de fechaduras e chaves novas', suggestedCost: 180 },
  { description: 'Limpeza pesada pós-desocupação', suggestedCost: 250 },
  { description: 'Reparo hidráulico / troca de torneira ou reparo de descarga', suggestedCost: 150 },
  { description: 'Substituição de lâmpadas queimadas ou espelhos de tomada', suggestedCost: 90 },
  { description: 'Reparo de vidros / persiana avariada', suggestedCost: 200 },
];

export const ContractTerminationModal: React.FC<ContractTerminationModalProps> = ({
  isOpen,
  onClose,
  contract,
  tenant,
  property,
  payments = [],
  onSuccess,
  onSecurityCheck,
}) => {
  if (!isOpen) return null;

  // Wizard Step: 1 = Desocupação & Chaves, 2 = Vistoria, 3 = Débitos, 4 = Caução x Reparos, 5 = Conclusão & Termo
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedTerm, setCopiedTerm] = useState(false);

  // --- PASSO 1: Desocupação & Chaves ---
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [keysReturnDate, setKeysReturnDate] = useState<string>(
    contract.endDate && contract.endDate <= todayStr ? contract.endDate : todayStr
  );
  const [reason, setReason] = useState<string>('term_ended');
  const [customReason, setCustomReason] = useState<string>('');
  const [keysReturnedCount, setKeysReturnedCount] = useState<number>(2);
  const [gateControlsReturned, setGateControlsReturned] = useState<boolean>(true);

  // --- PASSO 2: Vistoria de Saída ---
  const [inspectionStatus, setInspectionStatus] = useState<
    'completed_ok' | 'completed_with_repairs' | 'not_done_waived' | 'pending'
  >('completed_with_repairs');
  const [inspectionNotes, setInspectionNotes] = useState<string>('');
  const [inspectedBy, setInspectedBy] = useState<string>('Gerente Imobiliário');

  // --- PASSO 3: Débitos Pendentes ---
  // Obter pendências de aluguel já registradas no sistema até a data de entrega das chaves
  const relatedPayments = useMemo(() => {
    return payments.filter(
      p => p.propertyId === contract.propertyId && p.tenantId === contract.tenantId
    );
  }, [payments, contract]);

  const systemPendingRents = useMemo(() => {
    return relatedPayments.filter(
      p =>
        (p.type === 'rent' || !p.type) &&
        (p.status === 'late' || (p.status === 'pending' && p.dueDate <= keysReturnDate))
    );
  }, [relatedPayments, keysReturnDate]);

  // Total de aluguéis pendentes calculados
  const calculatedPendingRentTotal = useMemo(() => {
    return systemPendingRents.reduce(
      (acc, p) => acc + (p.amount - (p.paidAmount || 0)),
      0
    );
  }, [systemPendingRents]);

  const [includeSystemRents, setIncludeSystemRents] = useState<boolean>(true);
  const [manualRentDebt, setManualRentDebt] = useState<number>(0);

  // Contas de consumo e encargos
  const [electricityPaid, setElectricityPaid] = useState<boolean>(true);
  const [electricityDebt, setElectricityDebt] = useState<number>(0);

  const [waterPaid, setWaterPaid] = useState<boolean>(true);
  const [waterDebt, setWaterDebt] = useState<number>(0);

  const [gasPaid, setGasPaid] = useState<boolean>(true);
  const [gasDebt, setGasDebt] = useState<number>(0);

  const [iptuPaid, setIptuPaid] = useState<boolean>(true);
  const [iptuDebt, setIptuDebt] = useState<number>(0);

  const [condoPaid, setCondoPaid] = useState<boolean>(true);
  const [condoDebt, setCondoDebt] = useState<number>(0);

  const [otherDebtDesc, setOtherDebtDesc] = useState<string>('');
  const [otherDebtAmount, setOtherDebtAmount] = useState<number>(0);

  // Subtotal de débitos
  const totalDebts = useMemo(() => {
    const rentPart = includeSystemRents ? calculatedPendingRentTotal : manualRentDebt;
    const consPart =
      (electricityPaid ? 0 : electricityDebt) +
      (waterPaid ? 0 : waterDebt) +
      (gasPaid ? 0 : gasDebt) +
      (iptuPaid ? 0 : iptuDebt) +
      (condoPaid ? 0 : condoDebt) +
      (otherDebtAmount || 0);
    return Math.max(0, rentPart + consPart);
  }, [
    includeSystemRents,
    calculatedPendingRentTotal,
    manualRentDebt,
    electricityPaid,
    electricityDebt,
    waterPaid,
    waterDebt,
    gasPaid,
    gasDebt,
    iptuPaid,
    iptuDebt,
    condoPaid,
    condoDebt,
    otherDebtAmount,
  ]);

  // --- PASSO 4: Caução x Reparos ---
  // Caução original no contrato ou nos pagamentos recebidos
  const initialDepositEstimate = useMemo(() => {
    if (contract.depositValue && contract.depositValue > 0) {
      return contract.depositValue;
    }
    const depositPayments = relatedPayments.filter(
      p => p.type === 'deposit' && p.status !== 'cancelled'
    );
    const totalReceived = depositPayments
      .filter(p => p.status === 'paid' || p.status === 'partial')
      .reduce((acc, p) => acc + (p.paidAmount || p.amount), 0);
    const allUsages = depositPayments.flatMap(p => p.depositUsage || []);
    const usedAmount = allUsages.reduce((acc, u) => acc + u.amount, 0);
    return Math.max(0, totalReceived - usedAmount);
  }, [contract, relatedPayments]);

  const [depositBalance, setDepositBalance] = useState<number>(initialDepositEstimate);
  const [repairItems, setRepairItems] = useState<RepairItem[]>([]);
  const [newRepairDesc, setNewRepairDesc] = useState<string>('');
  const [newRepairCost, setNewRepairCost] = useState<number>(0);

  const totalRepairs = useMemo(() => {
    return repairItems.reduce((acc, item) => acc + (item.cost || 0), 0);
  }, [repairItems]);

  const handleAddRepair = (desc?: string, cost?: number) => {
    const finalDesc = desc || newRepairDesc;
    const finalCost = cost !== undefined ? cost : newRepairCost;
    if (!finalDesc.trim()) {
      toast.error('Informe a descrição do reparo');
      return;
    }
    if (finalCost <= 0) {
      toast.error('Informe um valor válido para o reparo');
      return;
    }
    const newItem: RepairItem = {
      id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      description: finalDesc.trim(),
      cost: finalCost,
    };
    setRepairItems(prev => [...prev, newItem]);
    if (!desc) {
      setNewRepairDesc('');
      setNewRepairCost(0);
    }
    toast.success('Reparo adicionado!');
  };

  const handleRemoveRepair = (id: string) => {
    setRepairItems(prev => prev.filter(r => r.id !== id));
  };

  // BALANÇO FINAL
  // Saldo = Caução - Reparos - Débitos
  // Positivo: Devolver ao inquilino
  // Negativo: Inquilino deve pagar a diferença
  const finalBalance = useMemo(() => {
    return depositBalance - totalRepairs - totalDebts;
  }, [depositBalance, totalRepairs, totalDebts]);

  const balanceAction: 'refund_tenant' | 'tenant_owes' | 'settled' = useMemo(() => {
    if (finalBalance > 0.01) return 'refund_tenant';
    if (finalBalance < -0.01) return 'tenant_owes';
    return 'settled';
  }, [finalBalance]);

  // --- PASSO 5: Conclusão & Destino ---
  const [tenantPixKey, setTenantPixKey] = useState<string>(tenant?.contact || '');
  const [observations, setObservations] = useState<string>('');
  const [propertyDestination, setPropertyDestination] = useState<'vacant' | 'renovation'>(
    totalRepairs > 0 ? 'renovation' : 'vacant'
  );
  const [tenantDestination, setTenantDestination] = useState<'archived' | 'waiting'>('archived');

  // Atualizar sugestão de destino do imóvel conforme reparos
  React.useEffect(() => {
    if (totalRepairs > 0) {
      setPropertyDestination('renovation');
    } else {
      setPropertyDestination('vacant');
    }
  }, [totalRepairs]);

  // GERAÇÃO DO TERMO DE QUITAÇÃO E DEVOLUÇÃO
  const landlordName = contract.landlordName || 'Locador / Administrador';
  const tenantName = tenant?.name || 'Locatário';
  const propertyName = property?.name || 'Imóvel';
  const propertyAddress = property?.address || 'Endereço não informado';

  const generatedTermText = useMemo(() => {
    const formattedKeysDate = keysReturnDate
      ? format(parseISO(keysReturnDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      : format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    const repairsListText =
      repairItems.length > 0
        ? repairItems
            .map(r => `  - ${r.description}: R$ ${r.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
            .join('\n')
        : '  - Nenhum reparo ou avaria constatado (imóvel em perfeito estado).';

    let balanceText = '';
    if (balanceAction === 'refund_tenant') {
      balanceText = `Após compensação dos reparos e encargos sobre o caução retido de R$ ${depositBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, resta o SALDO CREDOR de R$ ${Math.abs(finalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a ser DEVOLVIDO ao Locatário (Chave PIX/Dados: ${tenantPixKey || 'A indicar'}).`;
    } else if (balanceAction === 'tenant_owes') {
      balanceText = `Após aplicação integral da garantia caucionária de R$ ${depositBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, resta um SALDO DEVEDOR no valor de R$ ${Math.abs(finalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a ser PAGO pelo Locatário ao Locador.`;
    } else {
      balanceText = `Todas as obrigações locatícias, contas de consumo, reparos e garantias foram integralmente compensadas e quitadas, não restando nenhum saldo a pagar ou devolver.`;
    }

    return `TERMO DE RESCISÃO CONTRATUAL, ENTREGA DE CHAVES E QUITAÇÃO MÚTUA

1. PARTES:
   LOCADOR / ADMINISTRADOR: ${landlordName} ${contract.landlordCpf ? `(CPF: ${contract.landlordCpf})` : ''}
   LOCATÁRIO: ${tenantName} ${tenant?.cpf ? `(CPF: ${tenant?.cpf})` : ''}

2. IMÓVEL OBJETO DA LOCAÇÃO:
   Imóvel: ${propertyName}
   Endereço: ${propertyAddress}

3. DA ENTREGA EFETIVA DAS CHAVES:
   Na data de ${formattedKeysDate}, o Locatário realizou a devolução formal das chaves do imóvel acima citado, declarando a desocupação voluntária e definitiva, tendo sido devolvidas ${keysReturnedCount} cópias de chaves${gateControlsReturned ? ' e controles de portão de acesso' : ''}.

4. DA VISTORIA DE SAÍDA E REPAROS:
   Situação da Vistoria: ${
     inspectionStatus === 'completed_ok'
       ? 'Vistoria de saída aprovada sem avarias.'
       : inspectionStatus === 'completed_with_repairs'
       ? 'Vistoria de saída realizada com necessidade de reparos e reposição.'
       : inspectionStatus === 'not_done_waived'
       ? 'Vistoria dispensada de comum acordo entre as partes.'
       : 'Vistoria realizada.'
   }
   Reparos e Ajustes Acordados:
${repairsListText}
   Total de Reparos: R$ ${totalRepairs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

5. DO BALANÇO FINANCEIRO E CAUÇÃO:
   - Caução Disponível: R$ ${depositBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
   - Total de Reparos Abatidos: R$ ${totalRepairs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
   - Débitos de Aluguel e Encargos/Consumo: R$ ${totalDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
   
   ${balanceText}

6. OBSERVAÇÕES ADICIONAIS:
   ${observations || 'Sem observações adicionais.'}

7. DA QUITAÇÃO:
   Com a assinatura do presente termo e o cumprimento do balanço financeiro acima estipulado, as partes conferem entre si ampla, geral e irrestrita quitação com relação ao contrato de locação firmado, nada mais tendo a reclamar a qualquer título judicial ou extrajudicial.

Local e Data: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.

_______________________________________
${landlordName} (Locador / Adm.)

_______________________________________
${tenantName} (Locatário)
`;
  }, [
    keysReturnDate,
    landlordName,
    tenantName,
    propertyName,
    propertyAddress,
    contract,
    tenant,
    keysReturnedCount,
    gateControlsReturned,
    inspectionStatus,
    repairItems,
    totalRepairs,
    depositBalance,
    totalDebts,
    balanceAction,
    finalBalance,
    tenantPixKey,
    observations,
  ]);

  const handleCopyTerm = () => {
    navigator.clipboard.writeText(generatedTermText);
    setCopiedTerm(true);
    toast.success('Termo de Rescisão copiado para a área de transferência!');
    setTimeout(() => setCopiedTerm(false), 3000);
  };

  const handlePrintTerm = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Não foi possível abrir janela de impressão. Permita popups no navegador.');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Termo de Rescisão e Entrega de Chaves - ${propertyName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; font-size: 14px; }
            h1 { font-size: 18px; text-align: center; margin-bottom: 24px; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.6; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <pre>${generatedTermText}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // SUBMISSÃO FINAL
  const handleFinalSubmit = async () => {
    onSecurityCheck(async () => {
      setIsSubmitting(true);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Não autenticado');

        const batch = writeBatch(db);
        const nowIso = new Date().toISOString();

        // 1. Objeto de Rescisão Completo
        const terminationDetails: ContractTerminationDetails = {
          keysReturnDate,
          reason: reason === 'other' ? (customReason || 'Outro') : reason,
          inspectionDone: inspectionStatus !== 'not_done_waived',
          inspectionStatus,
          inspectionNotes: inspectionNotes || undefined,
          keysReturnedCount,
          gateControlsReturned,
          hasDebts: totalDebts > 0,
          pendingRentAmount: includeSystemRents ? calculatedPendingRentTotal : manualRentDebt,
          consumptionBillsAmount: Math.max(0, totalDebts - (includeSystemRents ? calculatedPendingRentTotal : manualRentDebt)),
          consumptionBillsDetails: {
            electricity: { paid: electricityPaid, debtAmount: electricityPaid ? 0 : electricityDebt },
            water: { paid: waterPaid, debtAmount: waterPaid ? 0 : waterDebt },
            gas: { paid: gasPaid, debtAmount: gasPaid ? 0 : gasDebt },
            iptu: { paid: iptuPaid, debtAmount: iptuPaid ? 0 : iptuDebt },
            condo: { paid: condoPaid, debtAmount: condoPaid ? 0 : condoDebt },
            others: otherDebtAmount > 0 ? { description: otherDebtDesc || 'Outro', debtAmount: otherDebtAmount } : undefined,
          },
          totalDebts,
          depositBalance,
          repairItems,
          totalRepairs,
          finalBalance,
          balanceAction,
          tenantPixKey: tenantPixKey || undefined,
          observations: observations || undefined,
          propertyDestination,
          tenantDestination,
          terminatedBy: currentUser.email || currentUser.uid,
          terminatedAt: nowIso,
        };

        // 2. Atualizar Contrato no Firestore
        if (contract.id) {
          const contractRef = doc(db, 'contracts', contract.id);
          batch.update(contractRef, {
            status: 'ended',
            endDate: keysReturnDate,
            terminationDetails,
            updatedAt: nowIso,
          });
        }

        // 3. Atualizar Imóvel (Desvincular e colocar em vacant ou renovation)
        if (contract.propertyId && !contract.propertyId.startsWith('storage-')) {
          const propertyRef = doc(db, 'properties', contract.propertyId);
          const propUpdate: any = {
            currentTenantId: null,
            status: propertyDestination,
            updatedAt: nowIso,
          };
          if (propertyDestination === 'renovation' && totalRepairs > 0) {
            propUpdate.renovationDescription = `Reparos de desocupação (${repairItems.map(r => r.description).join(', ')})`;
          }
          batch.update(propertyRef, propUpdate);
        } else if (contract.propertyId && contract.propertyId.startsWith('storage-')) {
          const storageId = contract.propertyId.replace('storage-', '');
          const storageRef = doc(db, 'storages', storageId);
          batch.update(storageRef, {
            contractStartDate: '',
            contractEndDate: '',
            monthlyCost: 0,
            updatedAt: nowIso,
          });
        }

        // 4. Atualizar Inquilino (Desvincular e arquivar ou mover para fila)
        if (contract.tenantId && contract.tenantId !== 'proprietario') {
          const tenantRef = doc(db, 'tenants', contract.tenantId);
          batch.update(tenantRef, {
            propertyId: null,
            status: tenantDestination,
            updatedAt: nowIso,
          });
        }

        // 5. Cancelar aluguéis pendentes futuros (após a entrega das chaves)
        const pendingFuturePayments = relatedPayments.filter(
          p =>
            p.type === 'rent' &&
            p.status === 'pending' &&
            p.dueDate > keysReturnDate
        );
        for (const p of pendingFuturePayments) {
          if (p.id) {
            batch.update(doc(db, 'payments', p.id), {
              status: 'cancelled',
              observations: 'Cancelado automaticamente pela finalização/desocupação do contrato.',
              updatedAt: nowIso,
            });
          }
        }

        // 6. Registrar Acerto Financeiro se houver saldo residual
        if (balanceAction === 'refund_tenant') {
          // Devolução de Caução ao Inquilino
          const refundRef = doc(collection(db, 'payments'));
          batch.set(refundRef, {
            propertyId: contract.propertyId,
            tenantId: contract.tenantId,
            amount: finalBalance, // Valor líquido devolvido
            paidAmount: finalBalance,
            dueDate: keysReturnDate,
            paidDate: nowIso,
            status: 'paid',
            type: 'deposit',
            depositStatus: 'refunded',
            ownerId: currentUser.uid,
            createdAt: nowIso,
            updatedAt: nowIso,
            observations: `Devolução final de caução na rescisão de contrato (PIX/Dados: ${tenantPixKey || 'N/A'}). Reparos descontados: R$ ${totalRepairs.toFixed(2)}.`,
          });
        } else if (balanceAction === 'tenant_owes') {
          // Cobrança residual que o inquilino deve pagar
          const oweRef = doc(collection(db, 'payments'));
          batch.set(oweRef, {
            propertyId: contract.propertyId,
            tenantId: contract.tenantId,
            amount: Math.abs(finalBalance),
            dueDate: keysReturnDate,
            status: 'pending',
            type: 'rent',
            ownerId: currentUser.uid,
            createdAt: nowIso,
            updatedAt: nowIso,
            observations: `Saldo devedor residual apurado na rescisão de contrato (Reparos R$ ${totalRepairs.toFixed(2)} + Débitos R$ ${totalDebts.toFixed(2)} excederam caução de R$ ${depositBalance.toFixed(2)}).`,
          });
        }

        await batch.commit();
        toast.success('Contrato finalizado e desocupação concluída com sucesso!');
        onSuccess();
        onClose();
      } catch (err) {
        console.error(err);
        handleFirestoreError(err, OperationType.UPDATE, `contracts/${contract.id}`);
        toast.error('Erro ao finalizar contrato.');
      } finally {
        setIsSubmitting(false);
      }
    }, `Confirmar o encerramento do contrato de ${tenantName} para o imóvel ${propertyName}.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Assistente de Finalização de Contrato
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Check-out
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {propertyName} • Inquilino: {tenantName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROGRESS STEPPER */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 shrink-0 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[560px] gap-2">
            {[
              { num: 1, label: '1. Desocupação', icon: Key },
              { num: 2, label: '2. Vistoria', icon: FileCheck2 },
              { num: 3, label: '3. Débitos', icon: DollarSign },
              { num: 4, label: '4. Caução & Reparos', icon: Calculator },
              { num: 5, label: '5. Termo & Saldo', icon: FileText },
            ].map(step => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setCurrentStep(step.num as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isPast
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isActive
                        ? 'bg-white text-indigo-700'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isPast ? <Check className="w-3 h-3 stroke-[3]" /> : step.num}
                  </div>
                  <span className="whitespace-nowrap">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-sm">

          {/* ================= PASSO 1: DESOCUPAÇÃO & CHAVES ================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-indigo-950">
                  <p className="font-bold text-sm text-indigo-900">
                    O contrato venceu ou o inquilino está desocupando o imóvel?
                  </p>
                  <p className="mt-1 text-indigo-800">
                    O encerramento formal ajusta o aluguel proporcional até o dia da entrega das chaves,
                    cancela cobranças futuras e libera o imóvel para novos locatários ou manutenção.
                  </p>
                </div>
              </div>

              {/* Informações Resumidas do Contrato Atual */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Início do Contrato</span>
                  <p className="font-bold text-slate-800">
                    {contract.startDate ? format(parseISO(contract.startDate), 'dd/MM/yyyy') : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Vencimento Original</span>
                  <p className="font-bold text-slate-800">
                    {contract.endDate ? format(parseISO(contract.endDate), 'dd/MM/yyyy') : 'Indeterminado'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Aluguel Atual</span>
                  <p className="font-bold text-emerald-700">
                    R$ {contract.rentValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Garantia Registrada</span>
                  <p className="font-bold text-indigo-700">
                    {contract.depositValue ? `R$ ${contract.depositValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sem caução'}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Data da Efetiva Devolução das Chaves <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={keysReturnDate}
                    onChange={e => setKeysReturnDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    O aluguel e despesas são calculados proporcionalmente até esta data.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Motivo da Rescisão / Encerramento
                  </label>
                  <select
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="term_ended">Término natural de prazo de vigência (não renovou)</option>
                    <option value="early_tenant">Rescisão antecipada a pedido do inquilino</option>
                    <option value="early_landlord">Retomada do imóvel pelo proprietário</option>
                    <option value="mutual_agreement">Acordo amigável mútuo (distrato)</option>
                    <option value="default_nonpayment">Inadimplência / Despejo consensual</option>
                    <option value="other">Outro motivo</option>
                  </select>
                </div>
              </div>

              {reason === 'other' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Descreva o motivo:</label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="Ex: Mudança de cidade a trabalho"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              )}

              {/* Chaves e Controles */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-500" />
                  Conferência de Acesso e Chaves
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Quantidade de Cópias de Chaves Devolvidas
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={keysReturnedCount}
                      onChange={e => setKeysReturnedCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Controles de Portão e Acessos
                    </label>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gateControlsReturned}
                        onChange={e => setGateControlsReturned(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                      />
                      <span className="text-xs text-slate-700">
                        Todos os controles eletrônicos foram devolvidos e testados
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PASSO 2: VISTORIA DO IMÓVEL ================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <FileCheck2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-amber-950">
                  <p className="font-bold text-sm text-amber-900">
                    A Vistoria de Saída do Imóvel foi realizada?
                  </p>
                  <p className="mt-1 text-amber-800">
                    A vistoria de saída compara o estado atual com a vistoria inicial de entrega das chaves.
                    Avarias, paredes sujas, fechaduras danificadas ou danos estruturais devem ser orçados para dedução da caução.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Status da Vistoria de Saída:
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'completed_ok',
                      title: 'Realizada e Aprovada (Sem Avarias)',
                      desc: 'O imóvel está perfeito, pintado e sem danos.',
                      color: 'border-emerald-500 bg-emerald-50/50 text-emerald-950',
                    },
                    {
                      id: 'completed_with_repairs',
                      title: 'Realizada com Reparos a Fazer',
                      desc: 'Foram constatadas avarias, danos ou necessidade de pintura/limpeza.',
                      color: 'border-amber-500 bg-amber-50/50 text-amber-950',
                    },
                    {
                      id: 'not_done_waived',
                      title: 'Dispensada em Comum Acordo',
                      desc: 'Proprietário e inquilino acordaram sem vistoria formal.',
                      color: 'border-slate-300 bg-slate-50 text-slate-700',
                    },
                    {
                      id: 'pending',
                      title: 'Pendente / Agendada',
                      desc: 'Vistoria ainda está sendo finalizada.',
                      color: 'border-blue-300 bg-blue-50 text-blue-900',
                    },
                  ].map(option => (
                    <label
                      key={option.id}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                        inspectionStatus === option.id ? option.color + ' ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="inspectionStatus"
                        value={option.id}
                        checked={inspectionStatus === option.id}
                        onChange={() => setInspectionStatus(option.id as any)}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <p className="font-bold text-xs">{option.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Responsável pela Vistoria / Vistoriador:
                </label>
                <input
                  type="text"
                  value={inspectedBy}
                  onChange={e => setInspectedBy(e.target.value)}
                  placeholder="Nome do gerente ou vistoriador"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Laudo / Observações Detalhadas da Vistoria</span>
                  <span className="text-[10px] text-slate-400 font-normal">Constará no termo de entrega</span>
                </label>
                <textarea
                  rows={4}
                  value={inspectionNotes}
                  onChange={e => setInspectionNotes(e.target.value)}
                  placeholder="Ex: Paredes da sala precisam de pintura completa; buracos de buchas em drywall no quarto; fechadura da porta da cozinha emperrada; pias e louças sanitárias intactas..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ================= PASSO 3: DÉBITOS PENDENTES ================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-rose-950">
                  <p className="font-bold text-sm text-rose-900">
                    O inquilino possui algum débito de aluguel ou contas de consumo?
                  </p>
                  <p className="mt-1 text-rose-800">
                    Confira se há aluguéis atrasados no sistema e exija os comprovantes de quitação de luz, água e IPTU.
                    Caso haja contas abertas, informe os valores para abater da caução ou cobrar do inquilino.
                  </p>
                </div>
              </div>

              {/* 1. Aluguéis do Sistema */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                      Aluguéis Pendentes / Atrasados no Sistema
                    </h4>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSystemRents}
                      onChange={e => setIncludeSystemRents(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>Importar cobranças do sistema</span>
                  </label>
                </div>

                {includeSystemRents ? (
                  systemPendingRents.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {systemPendingRents.map(rent => (
                        <div
                          key={rent.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800">
                              Vencimento: {format(parseISO(rent.dueDate), 'dd/MM/yyyy')}
                            </span>
                            <span className="ml-2 text-slate-500">
                              ({rent.status === 'late' ? 'Em Atraso' : 'Pendente'})
                            </span>
                          </div>
                          <span className="font-black text-rose-600">
                            R$ {(rent.amount - (rent.paidAmount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-bold text-xs">
                        <span>Total de Aluguéis em Aberto:</span>
                        <span className="text-rose-600 text-sm">
                          R$ {calculatedPendingRentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Nenhum aluguel em atraso registrado no sistema até {format(parseISO(keysReturnDate), 'dd/MM/yyyy')}!
                    </p>
                  )
                ) : (
                  <div className="pt-2">
                    <CurrencyInput
                      label="Valor de Aluguel Residual a Cobrar Manualmente"
                      value={manualRentDebt}
                      onChange={val => setManualRentDebt(val)}
                    />
                  </div>
                )}
              </div>

              {/* 2. Contas de Consumo Externas */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Contas de Consumo & Encargos do Imóvel
                </h4>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Energia Elétrica */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-slate-800">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> Energia Elétrica
                      </span>
                      <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={electricityPaid}
                          onChange={e => setElectricityPaid(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span className={electricityPaid ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {electricityPaid ? 'Quitado' : 'Débito em aberto'}
                        </span>
                      </label>
                    </div>
                    {!electricityPaid && (
                      <CurrencyInput
                        label="Valor em Aberto (Luz)"
                        value={electricityDebt}
                        onChange={val => setElectricityDebt(val)}
                      />
                    )}
                  </div>

                  {/* Água e Esgoto */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-slate-800">
                        <Droplets className="w-3.5 h-3.5 text-blue-500" /> Água / Esgoto
                      </span>
                      <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={waterPaid}
                          onChange={e => setWaterPaid(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span className={waterPaid ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {waterPaid ? 'Quitado' : 'Débito em aberto'}
                        </span>
                      </label>
                    </div>
                    {!waterPaid && (
                      <CurrencyInput
                        label="Valor em Aberto (Água)"
                        value={waterDebt}
                        onChange={val => setWaterDebt(val)}
                      />
                    )}
                  </div>

                  {/* Gás Encanado */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-slate-800">
                        <Flame className="w-3.5 h-3.5 text-rose-500" /> Gás Encanado
                      </span>
                      <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gasPaid}
                          onChange={e => setGasPaid(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span className={gasPaid ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {gasPaid ? 'Quitado' : 'Débito em aberto'}
                        </span>
                      </label>
                    </div>
                    {!gasPaid && (
                      <CurrencyInput
                        label="Valor em Aberto (Gás)"
                        value={gasDebt}
                        onChange={val => setGasDebt(val)}
                      />
                    )}
                  </div>

                  {/* IPTU Proporcional */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-slate-800">
                        <Home className="w-3.5 h-3.5 text-slate-500" /> IPTU Proporcional
                      </span>
                      <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={iptuPaid}
                          onChange={e => setIptuPaid(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span className={iptuPaid ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {iptuPaid ? 'Quitado' : 'Débito em aberto'}
                        </span>
                      </label>
                    </div>
                    {!iptuPaid && (
                      <CurrencyInput
                        label="Valor em Aberto (IPTU)"
                        value={iptuDebt}
                        onChange={val => setIptuDebt(val)}
                      />
                    )}
                  </div>
                </div>

                {/* Outro Débito Avulso */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">
                    Outro Débito / Multa Condominial Adicional:
                  </span>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Descrição (ex: Multa de barulho no condomínio)"
                      value={otherDebtDesc}
                      onChange={e => setOtherDebtDesc(e.target.value)}
                      className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-xs"
                    />
                    <CurrencyInput
                      value={otherDebtAmount}
                      onChange={val => setOtherDebtAmount(val)}
                    />
                  </div>
                </div>
              </div>

              {/* Subtotal de Débitos */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">
                    Total de Débitos Apurados
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Aluguéis pendentes + contas de consumo em aberto
                  </span>
                </div>
                <span className="text-xl font-black text-rose-400">
                  R$ {totalDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* ================= PASSO 4: CAUÇÃO X REPAROS ================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3">
                <Calculator className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-indigo-950">
                  <p className="font-bold text-sm text-indigo-900">
                    Tem caução para devolver ou reparos no imóvel para abater?
                  </p>
                  <p className="mt-1 text-indigo-800">
                    Conforme o Art. 38 da Lei do Inquilinato nº 8.245/91, a caução serve justamente para cobrir
                    danos causados ao imóvel e eventuais débitos deixados pelo inquilino.
                  </p>
                </div>
              </div>

              {/* Caução Disponível */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                        Caução Retido / Garantia Disponível
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Valor da garantia locatícia em posse da administração para abatimento.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="max-w-xs">
                  <CurrencyInput
                    label="Valor do Caução Disponível"
                    value={depositBalance}
                    onChange={val => setDepositBalance(val)}
                  />
                </div>
              </div>

              {/* Reparos no Imóvel */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                      Reparos Necessários no Imóvel (A Cobrar do Caução)
                    </h4>
                  </div>
                  <span className="text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg">
                    Total Reparos: R$ {totalRepairs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Sugestões Rápidas de Reparo */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                    Adicionar Reparo Frequente com 1 Clique:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_REPAIRS.map((rep, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddRepair(rep.description, rep.suggestedCost)}
                        className="text-[11px] font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-indigo-600" />
                        <span>{rep.description}</span>
                        <span className="text-slate-400 font-mono">
                          (R$ {rep.suggestedCost})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adicionar Reparo Personalizado */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Adicionar Outro Reparo:
                  </span>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Descrição do reparo ou orçamento..."
                      value={newRepairDesc}
                      onChange={e => setNewRepairDesc(e.target.value)}
                      className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-xs"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <CurrencyInput
                          value={newRepairCost}
                          onChange={val => setNewRepairCost(val)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddRepair()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de Reparos Cadastrados */}
                {repairItems.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Reparos que Serão Descontados ({repairItems.length}):
                    </span>
                    {repairItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{item.description}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-700">
                            R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRepair(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Remover reparo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Nenhum reparo cadastrado para dedução.
                  </p>
                )}
              </div>

              {/* CARD DE CÁLCULO E COMPENSAÇÃO */}
              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl space-y-3 shadow-lg">
                <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  Balanço Matemático de Compensação
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>(+) Caução Retido Disponível:</span>
                    <span className="font-bold text-emerald-400">
                      R$ {depositBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>(-) Total de Reparos no Imóvel:</span>
                    <span className="font-bold text-amber-300">
                      - R$ {totalRepairs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>(-) Débitos de Aluguel e Consumo:</span>
                    <span className="font-bold text-rose-400">
                      - R$ {totalDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">
                      Resultado Final do Acerto:
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {balanceAction === 'refund_tenant'
                        ? 'O caução é suficiente. Devolver saldo restante ao inquilino.'
                        : balanceAction === 'tenant_owes'
                        ? 'O caução não cobriu tudo. Inquilino deve pagar a diferença.'
                        : 'Contas integralmente quitadas sem saldo residual.'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-2xl font-black ${
                        balanceAction === 'refund_tenant'
                          ? 'text-emerald-400'
                          : balanceAction === 'tenant_owes'
                          ? 'text-rose-400'
                          : 'text-sky-400'
                      }`}
                    >
                      {balanceAction === 'refund_tenant' ? '+' : balanceAction === 'tenant_owes' ? '-' : ''} R${' '}
                      {Math.abs(finalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {balanceAction === 'refund_tenant'
                        ? 'Devolver ao Inquilino'
                        : balanceAction === 'tenant_owes'
                        ? 'Inquilino Deve Pagar'
                        : 'Saldo Quitado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PASSO 5: OBSERVAÇÕES FINAIS & TERMO ================= */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-emerald-950">
                  <p className="font-bold text-sm text-emerald-900">
                    Últimas observações, destino do imóvel e termo de quitação mútua
                  </p>
                  <p className="mt-1 text-emerald-800">
                    O sistema gera o Termo de Rescisão e Entrega de Chaves pronto para impressão e assinatura.
                    Revise as observações e confirme o encerramento do contrato.
                  </p>
                </div>
              </div>

              {/* Informação sobre Devolução / Cobrança */}
              {balanceAction === 'refund_tenant' && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-300 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-emerald-900 block flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Devolução de Saldo ao Inquilino: R$ {Math.abs(finalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Chave PIX ou Dados Bancários do Inquilino para Restituição:
                    </label>
                    <input
                      type="text"
                      placeholder="Chave PIX (CPF, Celular, Email ou Aleatória)"
                      value={tenantPixKey}
                      onChange={e => setTenantPixKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium"
                    />
                  </div>
                </div>
              )}

              {balanceAction === 'tenant_owes' && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-rose-900 block flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Inquilino Possui Saldo Devedor Residual: R$ {Math.abs(finalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[11px] text-rose-800">
                    Este valor será registrado como cobrança pendente (recebível) no sistema para acompanhamento financeiro.
                  </p>
                </div>
              )}

              {/* Mais Alguma Observação para Fazer? */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Tem mais alguma observação para fazer?</span>
                  <span className="text-[10px] text-slate-400">Histórico do encerramento</span>
                </label>
                <textarea
                  rows={3}
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  placeholder="Ex: Entregou 2 controles e 3 cópias de chaves. Acordo verbal cumprido. Inquilino desocupou sem intercorrências..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Destino do Imóvel e do Inquilino */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Destino do Imóvel no Sistema:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-indigo-400 text-xs">
                      <input
                        type="radio"
                        name="propDest"
                        value="vacant"
                        checked={propertyDestination === 'vacant'}
                        onChange={() => setPropertyDestination('vacant')}
                        className="text-indigo-600"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Disponível para Locação (Livre)</span>
                        <span className="text-[10px] text-slate-500">Pronto para receber novos inquilinos.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-indigo-400 text-xs">
                      <input
                        type="radio"
                        name="propDest"
                        value="renovation"
                        checked={propertyDestination === 'renovation'}
                        onChange={() => setPropertyDestination('renovation')}
                        className="text-indigo-600"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Em Reforma / Manutenção</span>
                        <span className="text-[10px] text-slate-500">Aguardando reparos ou pintura.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Destino do Inquilino:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-indigo-400 text-xs">
                      <input
                        type="radio"
                        name="tenantDest"
                        value="archived"
                        checked={tenantDestination === 'archived'}
                        onChange={() => setTenantDestination('archived')}
                        className="text-indigo-600"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Arquivar Histórico (Recomendado)</span>
                        <span className="text-[10px] text-slate-500">Mantém histórico preservado.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-indigo-400 text-xs">
                      <input
                        type="radio"
                        name="tenantDest"
                        value="waiting"
                        checked={tenantDestination === 'waiting'}
                        onChange={() => setTenantDestination('waiting')}
                        className="text-indigo-600"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Mover para Fila de Espera</span>
                        <span className="text-[10px] text-slate-500">Inquilino procura outro imóvel.</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* PRÉVIA DO TERMO DE QUITAÇÃO E ENTREGA */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                <div className="flex items-center justify-between p-3 bg-slate-100 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Termo de Rescisão, Entrega de Chaves e Quitação Mútua
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyTerm}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedTerm ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedTerm ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintTerm}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir / PDF</span>
                    </button>
                  </div>
                </div>
                <div className="p-4 max-h-56 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap bg-white">
                  {generatedTermText}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep - 1) as any)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-200/60 font-bold text-xs text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
              Cancelar
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep + 1) as any)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                Próximo Passo
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Confirmar Finalização de Contrato
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
