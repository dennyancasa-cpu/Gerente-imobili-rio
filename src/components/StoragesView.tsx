import React, { useState } from "react";
import { StorageSpace, StorageItem, Property, StorageBilling, Tenant, Contract } from "../types";
import {
  Box,
  Warehouse,
  Plus,
  Search,
  Trash2,
  Edit,
  FileText,
  Upload,
  ExternalLink,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  X,
  CheckCircle2,
  DollarSign,
  Hammer,
  MapPin,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Home,
  MoreVertical,
  Eye,
  Camera,
  AlertCircle,
  Calendar,
  Tag,
  Image as ImageIcon
} from "lucide-react";
import { db, auth } from "../firebase";
import { addDoc, collection, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { toast } from "sonner";
import { CurrencyInput } from "./CurrencyInput";

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

const getItemConditionBadge = (condition?: string) => {
  switch (condition) {
    case "new":
      return { label: "Novo / Excelente", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "good":
      return { label: "Bom Estado", bg: "bg-blue-50 text-blue-700 border-blue-200" };
    case "fair":
      return { label: "Estado Regular", bg: "bg-slate-100 text-slate-700 border-slate-200" };
    case "poor":
      return { label: "Ruim / Danificado", bg: "bg-red-50 text-red-700 border-red-200" };
    case "expiring_soon":
      return { label: "A Vencer Próximo", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    case "expired":
      return { label: "Vencido / Expirado", bg: "bg-purple-50 text-purple-700 border-purple-200" };
    default:
      return { label: "Bom Estado", bg: "bg-blue-50 text-blue-700 border-blue-200" };
  }
};

const getItemExpirationStatus = (expirationDate?: string) => {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parts = expirationDate.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const d = parseInt(parts[2]);
  if (!y || !m || !d) return null;
  const exp = new Date(y, m - 1, d);
  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { isExpired: true, days: Math.abs(diffDays), label: `VENCEU há ${Math.abs(diffDays)}d (${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y})` };
  } else if (diffDays <= 30) {
    return { isExpiringSoon: true, days: diffDays, label: `Vence em ${diffDays}d (${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y})` };
  }
  return { isOk: true, days: diffDays, label: `Validade: ${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y}` };
};

interface StoragesViewProps {
  storages: StorageSpace[];
  properties: Property[];
  tenants?: Tenant[];
  contracts?: Contract[];
  onSecurityCheck: (onSuccess: () => void, description?: string) => void;
  initialSelectedId?: string | null;
  onClearInitialSelectedId?: () => void;
  onNavigateToCreateContract?: (contractData: any) => void;
}

export const StoragesView = ({
  storages,
  properties,
  tenants = [],
  contracts = [],
  onSecurityCheck,
  initialSelectedId,
  onClearInitialSelectedId,
  onNavigateToCreateContract
}: StoragesViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived">("active");
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  // State for Storage Modal (Create/Edit)
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isSubmittingStorage, setIsSubmittingStorage] = useState(false);
  const [editingStorage, setEditingStorage] = useState<StorageSpace | null>(null);
  const [storageFormData, setStorageFormData] = useState({
    name: "",
    spaceType: "warehouse" as "warehouse" | "room" | "cabinet" | "drawer" | "space" | "garage" | "storage_room" | "other",
    address: "",
    monthlyCost: 0,
    dueDay: 5,
    propertyId: "",
    evidenceName: "",
    evidenceLocation: "",
    contractFile: "",
    contractStartDate: "",
    contractEndDate: "",
    landlordName: "",
    landlordContact: "",
    hasDeposit: false,
    depositValue: 0,
    depositRefundStatus: "pending" as "pending" | "refunded" | "partially_used" | "lost",
    depositPaymentType: "cash" as "cash" | "installments",
    depositInstallments: 1,
    depositIsPaid: false,
    depositPaymentFile: "",
    depositPaymentFileName: "",
    rescissionFine: 0,
    readjustmentIndex: "",
    paymentMethod: ""
  });

  // State for Item Modal (Add/Edit stored item)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [activeStorageForItem, setActiveStorageForItem] = useState<StorageSpace | null>(null);
  const [editingItem, setEditingItem] = useState<StorageItem | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemConditionFilter, setItemConditionFilter] = useState<string>("all");
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<StorageItem | null>(null);

  const [itemFormData, setItemFormData] = useState({
    name: "",
    description: "",
    location: "",
    quantity: 1,
    cost: 0,
    garageSpots: 0,
    garageSpotNumbers: "",
    storedVehicle: "",
    sector: "",
    palletOrShelf: "",
    boxOrContainer: "",
    volumeM3: 0,
    status: "in_stock" as "in_stock" | "out" | "sold" | "returned",
    condition: "good" as "new" | "good" | "fair" | "poor" | "expiring_soon" | "expired",
    category: "",
    expirationDate: "",
    photoUrl: "",
    takenBy: "",
    movementDate: "",
    expectedReturnDate: "",
    soldPrice: 0
  });

  // Selected Storage for detailed view
  const [selectedStorageId, setSelectedStorageId] = useState<string | null>(null);
  const [isContractDetailsOpen, setIsContractDetailsOpen] = useState(false);

  // Billing tracking state
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isConfirmPaymentModalOpen, setIsConfirmPaymentModalOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<StorageBilling | null>(null);
  const [activeStorageForBilling, setActiveStorageForBilling] = useState<StorageSpace | null>(null);
  const [showAllBillings, setShowAllBillings] = useState(false);
  const [itemTab, setItemTab] = useState<"active" | "archived">("active");
  
  const [billingFormData, setBillingFormData] = useState({
    id: "",
    dueDate: "",
    amount: 0,
    paidAmount: 0,
    status: "unpaid" as "paid" | "unpaid" | "partial",
    paymentDate: "",
    notes: "",
    fineAmount: 0
  });

  const [paymentConfirmFormData, setPaymentConfirmFormData] = useState({
    amountToConfirm: 0,
    fineAmount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  React.useEffect(() => {
    if (initialSelectedId) {
      setSelectedStorageId(initialSelectedId);
      if (onClearInitialSelectedId) {
        onClearInitialSelectedId();
      }
    }
  }, [initialSelectedId, onClearInitialSelectedId]);

  const getPropertyName = (propertyId?: string) => {
    if (!propertyId) return "Gasto Geral (Sem Imóvel)";
    const prop = properties.find((p) => p.id === propertyId);
    return prop ? prop.name : "Imóvel Desconhecido";
  };

  const getSpaceTypeBadge = (spaceType?: string) => {
    switch (spaceType) {
      case "warehouse":
        return {
          label: "Galpão / Armazém",
          className: "bg-red-50 text-red-700 border-red-200",
          scale: "Escala Grande (Macro)"
        };
      case "room":
        return {
          label: "Sala / Escritório",
          className: "bg-indigo-50 text-indigo-700 border-indigo-200",
          scale: "Escala Média"
        };
      case "cabinet":
        return {
          label: "Armário / Locker",
          className: "bg-amber-50 text-amber-700 border-amber-200",
          scale: "Escala Compacta"
        };
      case "drawer":
        return {
          label: "Gaveta",
          className: "bg-rose-50 text-rose-700 border-rose-200",
          scale: "Escala Micro"
        };
      case "space":
        return {
          label: "Espaço",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
          scale: "Escala Livre"
        };
      case "garage":
        return {
          label: "Garagem / Estacionamento",
          className: "bg-slate-100 text-slate-700 border-slate-200",
          scale: "Estacionamento"
        };
      case "storage_room":
        return {
          label: "Depósito / Box",
          className: "bg-cyan-50 text-cyan-700 border-cyan-200",
          scale: "Armazenamento"
        };
      default:
        return {
          label: "Outro Tipo",
          className: "bg-slate-100 text-slate-600 border-slate-200",
          scale: "Geral"
        };
    }
  };

  // Filter storages
  const filteredStorages = storages.filter((storage) => {
    const matchesStatus = statusFilter === "active" ? (storage.status !== "archived") : (storage.status === "archived");

    const matchesItems = storage.items?.some((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || false;

    const matchesSearch =
      storage.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (storage.address && storage.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      matchesItems;

    const matchesProperty =
      selectedPropertyFilter === "all" ||
      (selectedPropertyFilter === "none" && !storage.propertyId) ||
      storage.propertyId === selectedPropertyFilter;

    return matchesStatus && matchesSearch && matchesProperty;
  });

  // Financial statistics
  const totalMonthlyRent = storages.reduce((sum, s) => sum + (s.monthlyCost || 0), 0);
  
  const totalItemsValue = storages.reduce((sum, s) => {
    const itemsSum = s.items?.reduce((iSum, item) => iSum + (item.cost * item.quantity), 0) || 0;
    return sum + itemsSum;
  }, 0);

  const handleCreateContractFromStorage = (storage: StorageSpace) => {
    if (!onNavigateToCreateContract) return;

    const observations = [
      `Contrato de Locação para Depósito/Garagem: ${storage.name}.`,
      storage.landlordName ? `Locador: ${storage.landlordName}.` : "",
      storage.landlordContact ? `Contato Locador: ${storage.landlordContact}.` : "",
      storage.readjustmentIndex ? `Índice de Reajuste: ${storage.readjustmentIndex}.` : "",
      storage.rescissionFine ? `Multa Rescisória: R$ ${storage.rescissionFine.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.` : "",
      storage.paymentMethod ? `Forma de Pagamento: ${storage.paymentMethod}.` : "",
      storage.evidenceLocation ? `Guarda Física do Contrato: ${storage.evidenceLocation}.` : ""
    ].filter(Boolean).join(" ");

    const contractData = {
      propertyId: `storage-${storage.id}`,
      tenantId: "proprietario",
      rentValue: storage.monthlyCost || 0,
      paymentDay: storage.dueDay || 5,
      startDate: storage.contractStartDate || "",
      endDate: storage.contractEndDate || "",
      depositValue: storage.hasDeposit ? (storage.depositValue || 0) : 0,
      observations: observations,
      aiDocumentType: "Contrato de Locação",
    };

    onNavigateToCreateContract(contractData);
  };

  // Helper to compress images dynamically on the client side using canvas
  const compressImage = (file: File, maxWidth = 900, maxHeight = 900, quality = 0.65): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Generate low-quality JPEG base64 to keep file sizes very small (typically 30KB - 80KB)
          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // File upload reader
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    if (isImage) {
      try {
        toast.info("Processando e otimizando imagem...");
        const compressedBase64 = await compressImage(file);
        setStorageFormData((prev) => ({
          ...prev,
          contractFile: compressedBase64,
          evidenceName: file.name
        }));
        toast.success(`Imagem "${file.name}" carregada e otimizada com sucesso!`);
      } catch (err) {
        console.error("Erro ao processar imagem:", err);
        toast.error("Erro ao processar a imagem.");
      }
    } else {
      // PDF or other documents
      if (file.size > 350 * 1024) {
        toast.error("Para PDFs e outros documentos, o limite é de 350KB para garantir o sincronismo do banco de dados.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setStorageFormData((prev) => ({
          ...prev,
          contractFile: base64,
          evidenceName: file.name
        }));
        toast.success(`Documento "${file.name}" carregado com sucesso!`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDepositReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    if (isImage) {
      try {
        toast.info("Processando e otimizando comprovante...");
        const compressedBase64 = await compressImage(file);
        setStorageFormData((prev) => ({
          ...prev,
          depositPaymentFile: compressedBase64,
          depositPaymentFileName: file.name
        }));
        toast.success(`Comprovante "${file.name}" carregado e otimizado com sucesso!`);
      } catch (err) {
        console.error("Erro ao processar comprovante:", err);
        toast.error("Erro ao processar a imagem.");
      }
    } else {
      // PDF or other documents
      if (file.size > 350 * 1024) {
        toast.error("Para PDFs e outros documentos, o limite é de 350KB para garantir o sincronismo do banco de dados.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setStorageFormData((prev) => ({
          ...prev,
          depositPaymentFile: base64,
          depositPaymentFileName: file.name
        }));
        toast.success(`Comprovante "${file.name}" carregado com sucesso!`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Open storage edit/create modal
  const handleOpenStorageModal = (storage?: StorageSpace) => {
    if (storage) {
      setEditingStorage(storage);
      setStorageFormData({
        name: storage.name || "",
        spaceType: storage.spaceType || "warehouse",
        address: storage.address || "",
        monthlyCost: storage.monthlyCost || 0,
        dueDay: storage.dueDay || 5,
        propertyId: storage.propertyId || "",
        evidenceName: storage.evidenceName || "",
        evidenceLocation: storage.evidenceLocation || "",
        contractFile: storage.contractFile || "",
        contractStartDate: storage.contractStartDate || "",
        contractEndDate: storage.contractEndDate || "",
        landlordName: storage.landlordName || "",
        landlordContact: storage.landlordContact || "",
        hasDeposit: storage.hasDeposit || false,
        depositValue: storage.depositValue || 0,
        depositRefundStatus: storage.depositRefundStatus || "pending",
        depositPaymentType: storage.depositPaymentType || "cash",
        depositInstallments: storage.depositInstallments || 1,
        depositIsPaid: storage.depositIsPaid || false,
        depositPaymentFile: storage.depositPaymentFile || "",
        depositPaymentFileName: storage.depositPaymentFileName || "",
        rescissionFine: storage.rescissionFine || 0,
        readjustmentIndex: storage.readjustmentIndex || "",
        paymentMethod: storage.paymentMethod || ""
      });
    } else {
      setEditingStorage(null);
      setStorageFormData({
        name: "",
        spaceType: "warehouse",
        address: "",
        monthlyCost: 0,
        dueDay: 10,
        propertyId: "",
        evidenceName: "",
        evidenceLocation: "",
        contractFile: "",
        contractStartDate: "",
        contractEndDate: "",
        landlordName: "",
        landlordContact: "",
        hasDeposit: false,
        depositValue: 0,
        depositRefundStatus: "pending",
        depositPaymentType: "cash",
        depositInstallments: 1,
        depositIsPaid: false,
        depositPaymentFile: "",
        depositPaymentFileName: "",
        rescissionFine: 0,
        readjustmentIndex: "",
        paymentMethod: ""
      });
    }
    setIsStorageModalOpen(true);
  };

  // Submit storage save
  const handleSaveStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storageFormData.name || storageFormData.monthlyCost < 0) {
      toast.error("Por favor, insira um nome e um valor válido.");
      return;
    }

    const contractFileLength = storageFormData.contractFile ? storageFormData.contractFile.length : 0;
    const depositFileLength = storageFormData.depositPaymentFile ? storageFormData.depositPaymentFile.length : 0;
    if (contractFileLength + depositFileLength > 850000) {
      toast.error("O tamanho total dos arquivos anexados é muito grande para o banco de dados. Envie PDFs de até 350KB ou use imagens, que são comprimidas automaticamente.");
      return;
    }

    setIsSubmittingStorage(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");

      const storagePayload: Partial<StorageSpace> = {
        name: storageFormData.name,
        spaceType: storageFormData.spaceType,
        address: storageFormData.address || "",
        monthlyCost: Number(storageFormData.monthlyCost),
        dueDay: Number(storageFormData.dueDay),
        propertyId: storageFormData.propertyId || "",
        evidenceName: storageFormData.evidenceName || "",
        evidenceLocation: storageFormData.evidenceLocation || "",
        contractFile: storageFormData.contractFile || "",
        ownerId: user.uid,
        updatedAt: new Date().toISOString(),
        contractStartDate: storageFormData.contractStartDate || "",
        contractEndDate: storageFormData.contractEndDate || "",
        landlordName: storageFormData.landlordName || "",
        landlordContact: storageFormData.landlordContact || "",
        hasDeposit: storageFormData.hasDeposit || false,
        depositValue: Number(storageFormData.depositValue) || 0,
        depositRefundStatus: storageFormData.depositRefundStatus || "pending",
        depositPaymentType: storageFormData.depositPaymentType || "cash",
        depositInstallments: Number(storageFormData.depositInstallments) || 1,
        depositIsPaid: storageFormData.depositIsPaid || false,
        depositPaymentFile: storageFormData.depositPaymentFile || "",
        depositPaymentFileName: storageFormData.depositPaymentFileName || "",
        rescissionFine: Number(storageFormData.rescissionFine) || 0,
        readjustmentIndex: storageFormData.readjustmentIndex || "",
        paymentMethod: storageFormData.paymentMethod || ""
      };

      if (editingStorage?.id) {
        // Update existing
        await updateDoc(doc(db, "storages", editingStorage.id), cleanObject(storagePayload));
        toast.success("Espaço locado atualizado com sucesso!");
      } else {
        // Create new
        storagePayload.createdAt = new Date().toISOString();
        storagePayload.items = []; // start with empty items

        // Auto-generate recurring billing list automatically
        const billings: any[] = [];
        const cost = storagePayload.monthlyCost || 0;
        const dueDay = storagePayload.dueDay || 10;
        
        let startDateStr = storagePayload.contractStartDate;
        if (!startDateStr) {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
          startDateStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;
        }
        
        const startParts = startDateStr.split("-");
        const startYear = parseInt(startParts[0]);
        const startMonth = parseInt(startParts[1]) - 1; // 0-indexed
        
        const startDate = new Date(startYear, startMonth, 1);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // Up to next month
        
        let cur = new Date(startDate);
        while (cur <= endDate) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, "0");
          const d = String(dueDay).padStart(2, "0");
          const dueDate = `${y}-${m}-${d}`;
          
          billings.push({
            id: `billing-${Math.random().toString(36).substring(2, 11)}`,
            dueDate,
            amount: cost,
            paidAmount: 0,
            status: "unpaid"
          });
          
          cur.setMonth(cur.getMonth() + 1);
        }
        
        billings.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
        storagePayload.billings = billings;

        const docRef = await addDoc(collection(db, "storages"), cleanObject(storagePayload));
        setSelectedStorageId(docRef.id);
        toast.success("Novo espaço cadastrado com sucesso! Direcionado para os materiais guardados.");
      }
      setIsStorageModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar espaço locado:", error);
      toast.error("Ocorreu um erro ao salvar o espaço locado.");
    } finally {
      setIsSubmittingStorage(false);
    }
  };

  const handleArchiveStorage = (storageId: string) => {
    const storageObj = storages.find(s => s.id === storageId);
    const storageName = storageObj?.name || "Espaço";
    const linkedContracts = (contracts || []).filter(c => c.propertyId === `storage-${storageId}` && c.status !== "archived");
    
    let warningMsg = `Ao confirmar, você arquivará o espaço "${storageName}". Ele não aparecerá na lista principal, mas você poderá restaurá-lo depois.`;
    if (linkedContracts.length > 0) {
      warningMsg = `Atenção: O espaço "${storageName}" possui ${linkedContracts.length} contrato(s) de locação vinculado(s). Ao arquivar o espaço, o(s) contrato(s) continuarão ativos. Deseja prosseguir com o arquivamento?`;
    }

    onSecurityCheck(async () => {
      try {
        await updateDoc(doc(db, "storages", storageId), {
          status: "archived",
          updatedAt: new Date().toISOString()
        });
        toast.success("Espaço arquivado com sucesso!");
        if (selectedStorageId === storageId) {
          setSelectedStorageId(null);
        }
      } catch (error) {
        console.error("Erro ao arquivar espaço:", error);
        toast.error("Erro ao arquivar o espaço.");
      }
    }, warningMsg);
  };

  const handleRestoreStorage = async (storageId: string) => {
    try {
      await updateDoc(doc(db, "storages", storageId), {
        status: "active",
        updatedAt: new Date().toISOString()
      });
      toast.success("Espaço restaurado com sucesso!");
    } catch (error) {
      console.error("Erro ao restaurar espaço:", error);
      toast.error("Erro ao restaurar o espaço.");
    }
  };

  // Delete storage
  const handleDeleteStorage = (storageId: string) => {
    const storageObj = storages.find(s => s.id === storageId);
    const storageName = storageObj?.name || "Espaço";
    const linkedContracts = (contracts || []).filter(c => c.propertyId === `storage-${storageId}` && c.status !== "archived");
    
    let warningMsg = `Ao confirmar, você excluirá permanentemente o espaço "${storageName}".`;
    if (linkedContracts.length > 0) {
      warningMsg = `Atenção: O espaço "${storageName}" possui ${linkedContracts.length} contrato(s) de locação vinculado(s). Ao confirmar a exclusão, este espaço será removido e o contrato vinculado será automaticamente ARQUIVADO por segurança para o seu histórico. Você poderá encontrar o contrato arquivado a qualquer momento na aba de Contratos, utilizando o filtro 'Arquivados'.`;
    }

    onSecurityCheck(async () => {
      try {
        const batch = writeBatch(db);
        
        // Archive linked contracts
        linkedContracts.forEach(c => {
          batch.update(doc(db, "contracts", c.id!), {
            status: "archived",
            updatedAt: new Date().toISOString()
          });
        });

        // Delete the storage space itself
        batch.delete(doc(db, "storages", storageId));

        await batch.commit();

        toast.success("Espaço locado removido e contrato(s) vinculado(s) arquivado(s) com sucesso!");
        if (selectedStorageId === storageId) {
          setSelectedStorageId(null);
        }
      } catch (error) {
        console.error("Erro ao deletar espaço locado:", error);
        toast.error("Erro ao deletar o espaço locado.");
      }
    }, warningMsg);
  };

  // Open item modal
  const handleOpenItemModal = (storage: StorageSpace, item?: StorageItem) => {
    setActiveStorageForItem(storage);
    if (item) {
      setEditingItem(item);
      setItemFormData({
        name: item.name || "",
        description: item.description || "",
        location: item.location || "",
        quantity: item.quantity || 1,
        cost: item.cost || 0,
        garageSpots: item.garageSpots || 0,
        garageSpotNumbers: item.garageSpotNumbers || "",
        storedVehicle: item.storedVehicle || "",
        sector: item.sector || "",
        palletOrShelf: item.palletOrShelf || "",
        boxOrContainer: item.boxOrContainer || "",
        volumeM3: item.volumeM3 || 0,
        status: item.status || "in_stock",
        condition: item.condition || "good",
        category: item.category || "",
        expirationDate: item.expirationDate || "",
        photoUrl: item.photoUrl || "",
        takenBy: item.takenBy || "",
        movementDate: item.movementDate || "",
        expectedReturnDate: item.expectedReturnDate || "",
        soldPrice: item.soldPrice || 0
      });
    } else {
      setEditingItem(null);
      setItemFormData({
        name: "",
        description: "",
        location: "",
        quantity: 1,
        cost: 0,
        garageSpots: 0,
        garageSpotNumbers: "",
        storedVehicle: "",
        sector: "",
        palletOrShelf: "",
        boxOrContainer: "",
        volumeM3: 0,
        status: "in_stock",
        condition: "good",
        category: "",
        expirationDate: "",
        photoUrl: "",
        takenBy: "",
        movementDate: "",
        expectedReturnDate: "",
        soldPrice: 0
      });
    }
    setIsItemModalOpen(true);
  };

  // Smart helper for quick location building
  const handleQuickLocationSelect = (type: 'space' | 'position', value: string) => {
    let current = itemFormData.location || "";
    if (type === 'space') {
      const spacePattern = /(Espaço \d|Geral)/i;
      if (spacePattern.test(current)) {
        current = current.replace(spacePattern, value);
      } else {
        current = current ? `${value} - ${current}` : value;
      }
    } else {
      const positionPattern = /(Cima|Meio|Em baixo|Chão|Prateleira)/i;
      if (positionPattern.test(current)) {
        current = current.replace(positionPattern, value);
      } else {
        current = current ? `${current} - ${value}` : value;
      }
    }
    
    current = current
      .replace(/\s*-\s*/g, " - ")
      .replace(/^\s*-\s*|\s*-\s*$/g, "")
      .trim();

    setItemFormData(prev => ({ ...prev, location: current }));
  };

  // Image compressor for item photo upload
  const handleItemPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 400;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setItemFormData(prev => ({ ...prev, photoUrl: dataUrl }));
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit item save
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStorageForItem?.id) return;
    if (!itemFormData.name || itemFormData.quantity <= 0 || itemFormData.cost < 0) {
      toast.error("Preencha o nome do material, quantidade e custo válidos.");
      return;
    }

    try {
      const currentItems = activeStorageForItem.items || [];
      let updatedItems: StorageItem[] = [];

      if (editingItem) {
        // Edit existing item
        updatedItems = currentItems.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                name: itemFormData.name,
                description: itemFormData.description,
                location: itemFormData.location,
                quantity: Number(itemFormData.quantity),
                cost: Number(itemFormData.cost),
                garageSpots: Number(itemFormData.garageSpots) || 0,
                garageSpotNumbers: itemFormData.garageSpotNumbers || "",
                storedVehicle: itemFormData.storedVehicle || "",
                sector: itemFormData.sector || "",
                palletOrShelf: itemFormData.palletOrShelf || "",
                boxOrContainer: itemFormData.boxOrContainer || "",
                volumeM3: Number(itemFormData.volumeM3) || 0,
                status: itemFormData.status,
                condition: itemFormData.condition,
                category: itemFormData.category,
                expirationDate: itemFormData.expirationDate,
                photoUrl: itemFormData.photoUrl,
                takenBy: itemFormData.takenBy,
                movementDate: itemFormData.movementDate,
                expectedReturnDate: itemFormData.expectedReturnDate,
                soldPrice: Number(itemFormData.soldPrice) || 0
              }
            : item
        );
      } else {
        // Add new item
        const newItem: StorageItem = {
          id: Math.random().toString(36).substring(2, 9),
          name: itemFormData.name,
          description: itemFormData.description,
          location: itemFormData.location,
          quantity: Number(itemFormData.quantity),
          cost: Number(itemFormData.cost),
          dateAdded: new Date().toISOString().split("T")[0],
          garageSpots: Number(itemFormData.garageSpots) || 0,
          garageSpotNumbers: itemFormData.garageSpotNumbers || "",
          storedVehicle: itemFormData.storedVehicle || "",
          sector: itemFormData.sector || "",
          palletOrShelf: itemFormData.palletOrShelf || "",
          boxOrContainer: itemFormData.boxOrContainer || "",
          volumeM3: Number(itemFormData.volumeM3) || 0,
          status: itemFormData.status,
          condition: itemFormData.condition,
          category: itemFormData.category,
          expirationDate: itemFormData.expirationDate,
          photoUrl: itemFormData.photoUrl,
          takenBy: itemFormData.takenBy,
          movementDate: itemFormData.movementDate,
          expectedReturnDate: itemFormData.expectedReturnDate,
          soldPrice: Number(itemFormData.soldPrice) || 0
        };
        updatedItems = [...currentItems, newItem];
      }

      await updateDoc(doc(db, "storages", activeStorageForItem.id), cleanObject({
        items: updatedItems,
        updatedAt: new Date().toISOString()
      }));

      // Update local state if needed (onSnapshot handles it automatically normally)
      toast.success(editingItem ? "Material atualizado!" : "Material adicionado ao depósito!");
      setIsItemModalOpen(false);
      
      // Update details view reference
      const updatedStorage = { ...activeStorageForItem, items: updatedItems };
      setActiveStorageForItem(updatedStorage);
    } catch (error) {
      console.error("Erro ao salvar material:", error);
      toast.error("Erro ao atualizar o inventário do depósito.");
    }
  };

  // Delete item from storage
  const handleDeleteItem = async (storage: StorageSpace, itemId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este item permanentemente? Esta ação não pode ser desfeita e deve ser usada apenas em último caso.")) return;
    try {
      const currentItems = storage.items || [];
      const updatedItems = currentItems.filter((item) => item.id !== itemId);

      await updateDoc(doc(db, "storages", storage.id!), cleanObject({
        items: updatedItems,
        updatedAt: new Date().toISOString()
      }));

      toast.success("Material removido do depósito!");
      
      // Update details view reference
      const updatedStorage = { ...storage, items: updatedItems };
      if (activeStorageForItem?.id === storage.id) {
        setActiveStorageForItem(updatedStorage);
      }
    } catch (error) {
      console.error("Erro ao remover material:", error);
      toast.error("Erro ao remover o material.");
    }
  };

  // --- BILLING / COBRANÇA FUNCTIONS ---

  // Auto-generate recurring billing list
  const handleAutoGenerateBillings = async (storage: StorageSpace) => {
    try {
      const billings: any[] = [];
      const cost = storage.monthlyCost || 0;
      const dueDay = storage.dueDay || 10;
      
      // Determine starting month (defaulting to 6 months ago)
      let startDateStr = storage.contractStartDate;
      if (!startDateStr) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        startDateStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;
      }
      
      const startParts = startDateStr.split("-");
      const startYear = parseInt(startParts[0]);
      const startMonth = parseInt(startParts[1]) - 1; // 0-indexed
      
      const startDate = new Date(startYear, startMonth, 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // Up to next month
      
      let cur = new Date(startDate);
      while (cur <= endDate) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(dueDay).padStart(2, "0");
        const dueDate = `${y}-${m}-${d}`;
        
        billings.push({
          id: `billing-${Math.random().toString(36).substr(2, 9)}`,
          dueDate,
          amount: cost,
          paidAmount: 0,
          status: "unpaid"
        });
        
        cur.setMonth(cur.getMonth() + 1);
      }
      
      // Sort descending (newest first)
      billings.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
      
      await updateDoc(doc(db, "storages", storage.id!), cleanObject({
        billings: billings,
        updatedAt: new Date().toISOString()
      }));
      
      toast.success("Parcelas de cobrança geradas com sucesso!");
    } catch (error) {
      console.error("Erro ao auto-gerar parcelas:", error);
      toast.error("Erro ao gerar parcelas de cobrança.");
    }
  };

  // Open billing modal for creating/editing
  const handleOpenBillingModal = (storage: StorageSpace, billing?: any) => {
    setActiveStorageForBilling(storage);
    if (billing) {
      setSelectedBilling(billing);
      setBillingFormData({
        id: billing.id,
        dueDate: billing.dueDate || "",
        amount: billing.amount || 0,
        paidAmount: billing.paidAmount || 0,
        status: billing.status || "unpaid",
        paymentDate: billing.paymentDate || "",
        notes: billing.notes || "",
        fineAmount: billing.fineAmount || 0
      });
    } else {
      setSelectedBilling(null);
      // Pre-fill next month's billing
      const today = new Date();
      const nextMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(storage.dueDay || 10).padStart(2, "0")}`;
      setBillingFormData({
        id: "",
        dueDate: nextMonthStr,
        amount: storage.monthlyCost || 0,
        paidAmount: 0,
        status: "unpaid",
        paymentDate: "",
        notes: "",
        fineAmount: 0
      });
    }
    setIsBillingModalOpen(true);
  };

  // Save custom/edited billing installment
  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStorageForBilling) return;
    
    try {
      const currentBillings = activeStorageForBilling.billings || [];
      let updatedBillings = [...currentBillings];
      
      const billingPayload: any = {
        id: billingFormData.id || `billing-${Math.random().toString(36).substr(2, 9)}`,
        dueDate: billingFormData.dueDate,
        amount: Number(billingFormData.amount),
        paidAmount: Number(billingFormData.paidAmount),
        status: billingFormData.status,
        paymentDate: billingFormData.paymentDate || undefined,
        notes: billingFormData.notes || undefined,
        fineAmount: Number(billingFormData.fineAmount) || undefined,
        confirmedAt: billingFormData.status === "paid" ? new Date().toISOString() : undefined
      };
      
      Object.keys(billingPayload).forEach(key => {
        if (billingPayload[key] === undefined) {
          delete billingPayload[key];
        }
      });
      
      if (selectedBilling) {
        // Edit existing
        updatedBillings = updatedBillings.map((b) => b.id === selectedBilling.id ? billingPayload : b);
      } else {
        // Add new
        updatedBillings.push(billingPayload);
      }
      
      // Sort newest first
      updatedBillings.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
      
      await updateDoc(doc(db, "storages", activeStorageForBilling.id!), cleanObject({
        billings: updatedBillings,
        updatedAt: new Date().toISOString()
      }));
      
      toast.success(selectedBilling ? "Cobrança atualizada!" : "Nova cobrança lançada!");
      setIsBillingModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar cobrança:", error);
      toast.error("Erro ao registrar cobrança.");
    }
  };

  // Delete billing installment
  const handleDeleteBilling = async (storage: StorageSpace, billingId: string) => {
    onSecurityCheck(async () => {
      try {
        const currentBillings = storage.billings || [];
        const updatedBillings = currentBillings.filter((b) => b.id !== billingId);
        
        await updateDoc(doc(db, "storages", storage.id!), cleanObject({
          billings: updatedBillings,
          updatedAt: new Date().toISOString()
        }));
        
        toast.success("Lançamento de cobrança excluído.");
      } catch (error) {
        console.error("Erro ao excluir cobrança:", error);
        toast.error("Erro ao excluir lançamento.");
      }
    }, "excluir uma cobrança financeira registrada");
  };

  // Open confirm payment modal
  const handleOpenConfirmPaymentModal = (storage: StorageSpace, billing: any) => {
    setActiveStorageForBilling(storage);
    setSelectedBilling(billing);
    
    const remaining = Math.max(0, (billing.amount + (billing.fineAmount || 0)) - (billing.paidAmount || 0));
    setPaymentConfirmFormData({
      amountToConfirm: remaining,
      fineAmount: billing.fineAmount || 0,
      paymentDate: new Date().toISOString().split("T")[0],
      notes: ""
    });
    setIsConfirmPaymentModalOpen(true);
  };

  // Submit payment confirmation
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStorageForBilling || !selectedBilling) return;
    
    try {
      const currentBillings = activeStorageForBilling.billings || [];
      const paymentAmount = Number(paymentConfirmFormData.amountToConfirm);
      
      if (paymentAmount <= 0) {
        toast.error("O valor pago deve ser maior que zero.");
        return;
      }
      
      const updatedBillings = currentBillings.map((b) => {
        if (b.id === selectedBilling.id) {
          const newPaidAmount = (b.paidAmount || 0) + paymentAmount;
          const totalExpected = b.amount + (Number(paymentConfirmFormData.fineAmount) || 0);
          const isFullyPaid = newPaidAmount >= totalExpected;
          
          const updatedB = {
            ...b,
            paidAmount: newPaidAmount,
            fineAmount: Number(paymentConfirmFormData.fineAmount) || 0,
            status: isFullyPaid ? "paid" : "partial",
            paymentDate: paymentConfirmFormData.paymentDate,
            notes: paymentConfirmFormData.notes ? `${b.notes ? b.notes + " | " : ""}${paymentConfirmFormData.notes}` : b.notes,
            confirmedAt: new Date().toISOString()
          };
          
          Object.keys(updatedB).forEach(key => {
            if ((updatedB as any)[key] === undefined) {
              delete (updatedB as any)[key];
            }
          });
          
          return updatedB;
        }
        return b;
      });
      
      await updateDoc(doc(db, "storages", activeStorageForBilling.id!), cleanObject({
        billings: updatedBillings,
        updatedAt: new Date().toISOString()
      }));
      
      toast.success("Confirmação de pagamento efetuada!");
      setIsConfirmPaymentModalOpen(false);
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      toast.error("Erro ao processar confirmação.");
    }
  };

  // Revert/Undo payment
  const handleUndoPayment = async (storage: StorageSpace, billing: any) => {
    try {
      const currentBillings = storage.billings || [];
      const updatedBillings = currentBillings.map((b) => {
        if (b.id === billing.id) {
          const revertedB = {
            ...b,
            paidAmount: 0,
            status: "unpaid" as const
          };
          delete revertedB.paymentDate;
          delete revertedB.confirmedAt;
          return revertedB;
        }
        return b;
      });
      
      await updateDoc(doc(db, "storages", storage.id!), cleanObject({
        billings: updatedBillings,
        updatedAt: new Date().toISOString()
      }));
      
      toast.success("Pagamento estornado para Pendente.");
    } catch (error) {
      console.error("Erro ao estornar pagamento:", error);
      toast.error("Erro ao estornar pagamento.");
    }
  };

  // Calculate Breakeven Months for a single storage
  const getStorageAnalysis = (storage: StorageSpace) => {
    const itemsVal = storage.items?.reduce((sum, item) => sum + (item.cost * item.quantity), 0) || 0;
    const monthlyCost = storage.monthlyCost || 0;

    if (monthlyCost === 0) {
      return {
        itemsVal,
        ratio: 100,
        breakevenMonths: 999,
        verdict: "Excelente custo-benefício (custo zero)",
        verdictType: "good" as const,
        advice: "Você não possui custo mensal recorrente para este espaço. É uma ótima opção para manter pertences com tranquilidade."
      };
    }

    const breakevenMonths = itemsVal / monthlyCost;

    let verdict = "";
    let verdictType: "good" | "warning" | "danger" = "warning";
    let advice = "";

    if (itemsVal === 0) {
      verdict = "Lembrete de Desapego (Espaço Vazio)";
      verdictType = "warning";
      advice = `Este espaço custa R$ ${monthlyCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês e está sem itens cadastrados. Se não estiver utilizando, considere avaliar o encerramento do contrato.`;
    } else if (breakevenMonths < 3) {
      verdict = "Alerta de Desapego";
      verdictType = "warning";
      advice = `O custo do aluguel (R$ ${monthlyCost}/mês) se aproxima do valor estimado dos itens (R$ ${itemsVal.toLocaleString("pt-BR")}). Vale refletir se os objetos possuem valor sentimental ou se vale a pena desapegar e economizar.`;
    } else if (breakevenMonths < 12) {
      verdict = "Atenção ao Custo-Benefício";
      verdictType = "warning";
      advice = `Em cerca de ${Math.round(breakevenMonths)} meses, o valor pago em aluguel atingirá o valor dos pertences. Uma boa oportunidade para organizar seus itens e avaliar o que manter.`;
    } else {
      verdict = "Bom Custo-Benefício";
      verdictType = "good";
      advice = `O valor dos pertences (R$ ${itemsVal.toLocaleString("pt-BR")}) justifica o custo mensal de R$ ${monthlyCost} (${Math.round(breakevenMonths)} meses de margem).`;
    }

    return {
      itemsVal,
      breakevenMonths,
      verdict,
      verdictType,
      advice
    };
  };

  return (
    <div id="storages-view-container" className="space-y-6">
      {/* Header and Add Button */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-emerald-600" />
            Espaço & Ativos
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Administre seus espaços locados (garagens, depósitos, quartos ou contêineres), controle o inventário e acompanhe cobranças.
          </p>
        </div>
        <button
          onClick={() => handleOpenStorageModal()}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition font-bold text-sm shadow-md hover:shadow-emerald-200 shrink-0 flex items-center justify-center active:scale-95"
          title="Cadastrar Novo Espaço Locado"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </header>

      {/* Main Container: Storage List Grid */}
      <div className="space-y-4">
        {/* Compact Tactical Filters & Search Bar */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-2">
          {/* Lupa Search */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 rounded-xl pl-9 pr-3 py-1.5 text-xs border border-slate-200/80 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "active" | "archived")}
              className="bg-slate-50 text-slate-700 rounded-xl px-3 py-2 text-xs border border-slate-200/80 focus:outline-none focus:bg-white transition-colors font-medium cursor-pointer"
            >
              <option value="active">Ativos</option>
              <option value="archived">Arquivados</option>
            </select>
            <select
              value={selectedPropertyFilter}
              onChange={(e) => setSelectedPropertyFilter(e.target.value)}
              className="bg-slate-50 text-slate-700 rounded-xl px-3 py-2 text-xs border border-slate-200/80 focus:outline-none focus:bg-white transition-colors font-medium max-w-[160px] truncate cursor-pointer"
            >
              <option value="all">Todos Imóveis</option>
              <option value="none">Fora do Projeto</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards Grid of Storage Spaces */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStorages.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Warehouse className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-semibold">Nenhum espaço locado encontrado.</p>
              <p className="text-slate-400 text-xs mt-1">Clique no botão "+" acima para cadastrar um novo espaço.</p>
            </div>
          ) : (
            filteredStorages.map((storage) => {
              const analysis = getStorageAnalysis(storage);
              const itemsCount = storage.items?.length || 0;
              const badge = getSpaceTypeBadge(storage.spaceType);

              return (
                <div
                  key={storage.id}
                  id={storage.id}
                  onClick={() => setSelectedStorageId(storage.id || null)}
                  className="p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Title, Space Badge & Price */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${badge.className}`}>
                            {badge.label}
                          </span>
                          {storage.propertyId ? (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[9px] border border-indigo-100 font-bold uppercase tracking-wide">
                              Vinculado
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] border border-slate-200 font-bold uppercase tracking-wide">
                              Fora do Projeto
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors mt-2 truncate">
                          {storage.name}
                        </h3>
                        {storage.address && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 line-clamp-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {storage.address}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-red-600 block font-mono">
                          R$ {storage.monthlyCost?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-medium">Venc. dia {storage.dueDay}</span>
                      </div>
                    </div>

                    {/* Search match highlight if searching */}
                    {searchQuery && (
                      (() => {
                        const matchingItems = storage.items?.filter((item) =>
                          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
                        ) || [];
                        if (matchingItems.length > 0) {
                          return (
                            <div className="mt-2.5 p-2 bg-amber-50/70 border border-amber-100 rounded-xl text-[10px] text-amber-900">
                              <div className="font-bold flex items-center gap-1 mb-1">
                                <Box className="w-3 h-3 text-amber-600 shrink-0" />
                                Materiais encontrados ({matchingItems.length}):
                              </div>
                              <div className="space-y-1 max-h-24 overflow-y-auto">
                                {matchingItems.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white/60 px-2 py-0.5 rounded">
                                    <span className="truncate">{item.name}</span>
                                    <span className="font-mono font-bold text-amber-700 whitespace-nowrap">{item.quantity} un</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()
                    )}
                  </div>

                  {/* Footer Row: Metrics & Viability Pill */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
                      <Box className="w-4 h-4 text-emerald-600" />
                      <span><strong>{itemsCount}</strong> pertences (R$ {analysis.itemsVal.toLocaleString("pt-BR")})</span>
                    </div>
                    
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                        analysis.verdictType === "good"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : analysis.verdictType === "warning"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-red-50 text-red-700 border border-red-100"
                      }`}
                    >
                      {analysis.verdict}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

        {/* Storage Details Floating Modal & Sub-modal */}
        {selectedStorageId && (
            (() => {
              const storage = storages.find((s) => s.id === selectedStorageId);
              if (!storage) return null;

              const analysis = getStorageAnalysis(storage);

              return (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
                  <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-4xl my-auto overflow-hidden relative flex flex-col max-h-[90vh]">
                    {/* Detail Header with 3-dots option menu & close button */}
                    <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-200/80 flex justify-between items-start gap-3 relative shrink-0">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900">{storage.name}</h2>
                        {storage.propertyId ? (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold border border-indigo-100 flex items-center gap-1">
                            <Home className="w-3 h-3 text-indigo-600" />
                            {getPropertyName(storage.propertyId)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-bold border border-slate-200 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-slate-500" />
                            Fora do Projeto
                          </span>
                        )}
                        {(() => {
                          const badge = getSpaceTypeBadge(storage.spaceType);
                          return (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1 ${badge.className}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                      {storage.address && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {storage.address}
                        </p>
                      )}
                    </div>

                    {/* Header Actions: 3-Dots Menu & Close Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                      <button
                        onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                        className="p-2 hover:bg-slate-200/80 text-slate-600 rounded-xl transition border border-slate-200/80 bg-white shadow-sm flex items-center justify-center"
                        title="Opções do Espaço"
                      >
                        <MoreVertical className="w-5 h-5 text-slate-700" />
                      </button>

                      {isActionMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsActionMenuOpen(false)}
                          />
                          <div className="absolute right-0 top-full mt-8 sm:mt-2 w-60 sm:w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-sm sm:text-xs divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setIsActionMenuOpen(false);
                                  setIsContractDetailsOpen(true);
                                }}
                                className="w-full text-left px-4 sm:px-3.5 py-2.5 sm:py-2 text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5 font-bold transition active:bg-indigo-100"
                              >
                                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                                Contrato de Locação
                              </button>

                              <button
                                onClick={() => {
                                  setIsActionMenuOpen(false);
                                  handleOpenStorageModal(storage);
                                }}
                                className="w-full text-left px-4 sm:px-3.5 py-2.5 sm:py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-semibold transition active:bg-slate-100"
                              >
                                <Edit className="w-4 h-4 text-slate-500 shrink-0" />
                                Editar Espaço
                              </button>
                            </div>

                            <div className="py-1">
                              {storage.status === "archived" ? (
                                <button
                                  onClick={() => {
                                    setIsActionMenuOpen(false);
                                    handleRestoreStorage(storage.id!);
                                  }}
                                  className="w-full text-left px-4 sm:px-3.5 py-2.5 sm:py-2 text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5 font-semibold transition active:bg-indigo-100"
                                >
                                  <ArchiveRestore className="w-4 h-4 text-indigo-600 shrink-0" />
                                  Restaurar Espaço
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setIsActionMenuOpen(false);
                                    handleArchiveStorage(storage.id!);
                                  }}
                                  className="w-full text-left px-4 sm:px-3.5 py-2.5 sm:py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-semibold transition active:bg-slate-100"
                                >
                                  <Archive className="w-4 h-4 text-slate-500 shrink-0" />
                                  Arquivar Espaço
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setIsActionMenuOpen(false);
                                  handleDeleteStorage(storage.id!);
                                }}
                                className="w-full text-left px-4 sm:px-3.5 py-2.5 sm:py-2 text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-semibold transition active:bg-red-100"
                              >
                                <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                                Excluir Espaço
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                      </div>

                      <button
                        onClick={() => setSelectedStorageId(null)}
                        className="p-2 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 rounded-xl transition border border-slate-200/80 bg-white shadow-sm flex items-center justify-center"
                        title="Fechar Janela"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Scrollable Body */}
                  <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">

                  {/* Materials list */}
                  <div className="p-4 sm:p-6 border-b border-slate-100 space-y-4">
                    <div className="flex justify-between items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Hammer className="w-5 h-5 text-emerald-600 shrink-0" />
                        Materiais
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsItemSearchOpen(!isItemSearchOpen)}
                          className={`p-2 rounded-xl border transition flex items-center justify-center ${
                            isItemSearchOpen || itemSearchQuery || itemConditionFilter !== "all"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200/80"
                          }`}
                          title="Buscar Material"
                        >
                          <Search className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenItemModal(storage)}
                          className="flex items-center gap-1.5 text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-xl transition shadow-xs active:bg-emerald-800"
                          title="Adicionar Material"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="hidden sm:inline">Adicionar Material</span>
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const allItems = storage.items || [];
                      const activeItems = allItems.filter(item => item.status === "in_stock" || !item.status);
                      const archivedItems = allItems.filter(item => item.status && item.status !== "in_stock");
                      const baseItems = itemTab === "active" ? activeItems : archivedItems;

                      const filteredItems = baseItems.filter((item) => {
                        const q = itemSearchQuery.toLowerCase().trim();
                        if (q) {
                          const matchesName = (item.name || "").toLowerCase().includes(q);
                          const matchesCategory = (item.category || "").toLowerCase().includes(q);
                          const matchesLoc = (item.location || "").toLowerCase().includes(q);
                          const matchesTakenBy = (item.takenBy || "").toLowerCase().includes(q);
                          const matchesDesc = (item.description || "").toLowerCase().includes(q);
                          if (!matchesName && !matchesCategory && !matchesLoc && !matchesTakenBy && !matchesDesc) return false;
                        }

                        if (itemConditionFilter !== "all") {
                          const cond = item.condition || "good";
                          if (itemConditionFilter === "expiring_or_expired") {
                            const expStatus = getItemExpirationStatus(item.expirationDate);
                            if (!expStatus || (!expStatus.isExpired && !expStatus.isExpiringSoon && cond !== "expiring_soon" && cond !== "expired")) return false;
                          } else if (cond !== itemConditionFilter) {
                            return false;
                          }
                        }

                        return true;
                      });

                      return (
                        <div className="space-y-3">
                          {/* Tabs + Filter Options */}
                          <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/80 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex gap-4">
                                <button
                                  onClick={() => setItemTab("active")}
                                  className={`pb-1 text-xs font-bold transition flex items-center gap-1.5 ${itemTab === "active" ? "text-emerald-700 border-b-2 border-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                                >
                                  Em Estoque
                                  <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-mono">{activeItems.length}</span>
                                </button>
                                <button
                                  onClick={() => setItemTab("archived")}
                                  className={`pb-1 text-xs font-bold transition flex items-center gap-1.5 ${itemTab === "archived" ? "text-indigo-700 border-b-2 border-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                                >
                                  Arquivo / Movimentados
                                  <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[10px] font-mono">{archivedItems.length}</span>
                                </button>
                              </div>

                              <div className="text-[11px] font-mono text-slate-500 font-semibold">
                                Total: <span className="text-slate-900 font-bold">{filteredItems.length} {filteredItems.length === 1 ? "item" : "itens"}</span>
                              </div>
                            </div>

                            {/* Search & Filters Bar */}
                            {(isItemSearchOpen || itemSearchQuery || itemConditionFilter !== "all") && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 animate-in fade-in duration-150">
                                <div className="sm:col-span-2 relative">
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Buscar por nome, categoria, localização..."
                                    value={itemSearchQuery}
                                    onChange={(e) => setItemSearchQuery(e.target.value)}
                                    className="w-full bg-white text-slate-900 rounded-xl pl-8 pr-8 py-1.5 text-xs border border-slate-200 focus:outline-none focus:border-emerald-500 shadow-xs"
                                  />
                                  {itemSearchQuery && (
                                    <button
                                      onClick={() => setItemSearchQuery("")}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                <div>
                                  <select
                                    value={itemConditionFilter}
                                    onChange={(e) => setItemConditionFilter(e.target.value)}
                                    className="w-full bg-white text-slate-900 rounded-xl px-2.5 py-1.5 text-xs border border-slate-200 focus:outline-none focus:border-emerald-500 font-medium shadow-xs"
                                  >
                                    <option value="all">Todas as Condições</option>
                                    <option value="new">🟢 Novo / Excelente</option>
                                    <option value="good">🔵 Bom Estado</option>
                                    <option value="fair">⚪ Estado Regular</option>
                                    <option value="poor">🔴 Ruim / Com Defeito</option>
                                    <option value="expiring_or_expired">⚠️ A Vencer / Vencido</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          {filteredItems.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                              <Box className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-slate-500 text-xs font-medium">
                                {itemSearchQuery || itemConditionFilter !== "all" 
                                  ? "Nenhum material encontrado para estes filtros." 
                                  : itemTab === "active" ? "Nenhum material em estoque no momento." : "Nenhum material arquivado."}
                              </p>
                              <p className="text-slate-400 text-[10px] mt-0.5">
                                {itemTab === "active" ? "Cadastre os materiais para gerenciar estoque, estado e localização." : "Materiais vendidos, devolvidos ou em uso aparecerão aqui."}
                              </p>
                            </div>
                          ) : (
                            <div className="w-full rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs divide-y divide-slate-100">
                              {/* List Column Headers */}
                              <div className="grid grid-cols-12 gap-2 px-3.5 py-2.5 bg-slate-50/90 text-[11px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                <div className="col-span-6 sm:col-span-7 font-mono">Objeto / Material</div>
                                <div className="col-span-3 sm:col-span-2 text-center font-mono">Quantidade</div>
                                <div className="col-span-3 text-right font-mono">Valor</div>
                              </div>

                              {/* List Rows */}
                              {filteredItems.map((item) => {
                                const totalVal = item.status === "sold" && item.soldPrice
                                  ? item.soldPrice
                                  : (item.cost || 0) * (item.quantity || 1);

                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => setSelectedItemForDetail(item)}
                                    className="grid grid-cols-12 gap-2 px-3.5 py-3 items-center hover:bg-emerald-50/60 cursor-pointer transition active:bg-emerald-100/50 group"
                                  >
                                    {/* Objeto / Material */}
                                    <div className="col-span-6 sm:col-span-7 flex items-center gap-3 min-w-0">
                                      {item.photoUrl ? (
                                        <img
                                          src={item.photoUrl}
                                          alt={item.name}
                                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-400">
                                          <Box className="w-5 h-5 text-slate-400" />
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <div className="font-extrabold text-slate-900 text-sm truncate leading-tight group-hover:text-emerald-800 transition">
                                          {item.name}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                          {item.category && (
                                            <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-slate-100 text-slate-600 rounded border border-slate-200">
                                              {item.category}
                                            </span>
                                          )}
                                          {item.location && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 font-mono">
                                              <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                              {item.location}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Quantidade */}
                                    <div className="col-span-3 sm:col-span-2 text-center">
                                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-slate-100 text-slate-800 border border-slate-200/80">
                                        {item.quantity} un
                                      </span>
                                    </div>

                                    {/* Valor */}
                                    <div className="col-span-3 text-right">
                                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono block">
                                        R$ {totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      {item.cost > 0 && item.quantity > 1 && (
                                        <span className="text-[10px] text-slate-400 font-mono block">
                                          Un: R$ {(item.cost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* ACOMPANHAMENTO DE COBRANÇA */}
                  <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-indigo-600" />
                          Acompanhamento de Cobranças
                        </h3>
                        <p className="text-slate-400 text-[10px] sm:text-xs">
                          Gerencie os pagamentos mensais deste espaço locado.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {storage.billings && storage.billings.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenBillingModal(storage)}
                            className="flex items-center gap-1 text-[11px] text-indigo-700 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Lançar Cobrança Manual
                          </button>
                        )}
                        {(!storage.billings || storage.billings.length === 0) && (
                          <button
                            type="button"
                            onClick={() => handleAutoGenerateBillings(storage)}
                            className="flex items-center gap-1.5 text-[11px] text-indigo-700 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition shadow-sm"
                          >
                            Auto-Gerar Parcelas Recorrentes
                          </button>
                        )}
                      </div>
                    </div>

                    {storage.billings && storage.billings.length > 0 ? (
                      (() => {
                        const paidTotal = storage.billings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
                        const pendingTotal = storage.billings.reduce((sum, b) => {
                          if (b.status !== "paid") {
                            return sum + (b.amount + (b.fineAmount || 0) - (b.paidAmount || 0));
                          }
                          return sum;
                        }, 0);
                        
                        // Find next due date
                        const unpaidSorted = [...storage.billings]
                          .filter((b) => b.status !== "paid")
                          .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
                        const nextDue = unpaidSorted.length > 0 ? unpaidSorted[0].dueDate : null;
                        
                        // Show limited or all
                        const displayedBillings = showAllBillings 
                          ? storage.billings 
                          : storage.billings.slice(0, 4);

                        return (
                          <div className="space-y-4">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-black uppercase text-indigo-800 tracking-wider block">Total Pago</span>
                                <span className="text-sm font-extrabold text-indigo-900 font-mono block mt-0.5">
                                  R$ {paidTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl text-center">
                                <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider block">Em Aberto</span>
                                <span className="text-sm font-extrabold text-amber-900 font-mono block mt-0.5">
                                  R$ {pendingTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center flex flex-col justify-center">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Próximo Venc.</span>
                                <span className="text-xs font-bold text-slate-800 block mt-0.5 font-mono">
                                  {nextDue ? (
                                    (() => {
                                      const parts = nextDue.split("-");
                                      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : nextDue;
                                    })()
                                  ) : "Em dia!"}
                                </span>
                              </div>
                            </div>

                            {/* Billing List */}
                            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white">
                              {displayedBillings.map((b) => {
                                const isUnpaid = b.status === "unpaid";
                                const isPartial = b.status === "partial";
                                const isPaid = b.status === "paid";
                                const remaining = b.amount - (b.paidAmount || 0);

                                return (
                                  <div key={b.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/30 transition text-xs">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`p-1.5 rounded-lg shrink-0 ${
                                        isPaid 
                                          ? "bg-indigo-50 text-indigo-600" 
                                          : isPartial 
                                          ? "bg-amber-50 text-amber-600" 
                                          : "bg-slate-50 text-slate-400"
                                      }`}>
                                        <Info className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                          <span>
                                            {(() => {
                                              const dateParts = b.dueDate.split("-");
                                              if (dateParts.length !== 3) return b.dueDate;
                                              const months = [
                                                "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                                                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                                              ];
                                              const monthIdx = parseInt(dateParts[1]) - 1;
                                              return `${months[monthIdx]} / ${dateParts[0]}`;
                                            })()}
                                          </span>
                                          <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold uppercase tracking-wider ${
                                            isPaid
                                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                              : isPartial
                                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                                              : "bg-red-50 text-red-700 border border-red-100"
                                          }`}>
                                            {isPaid ? "Pago" : isPartial ? "Parcial" : "Pendente"}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                          Vencimento: {(() => {
                                            const p = b.dueDate.split("-");
                                            return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : b.dueDate;
                                          })()}
                                          {b.paymentDate && ` • Pago em: ${(() => {
                                            const p = b.paymentDate.split("-");
                                            return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : b.paymentDate;
                                          })()}`}
                                        </p>
                                        {b.notes && (
                                          <p className="text-[10px] text-indigo-600 font-semibold italic mt-1 bg-indigo-50/40 px-1.5 py-0.5 rounded border border-indigo-50/60 w-fit">
                                            Obs: {b.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t border-slate-50 sm:border-none pt-2 sm:pt-0">
                                      <div className="text-left sm:text-right">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase">Valores</div>
                                        <div className="font-semibold text-slate-900 font-mono">
                                          R$ {(b.amount + (b.fineAmount || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                        </div>
                                        {b.fineAmount > 0 && (
                                          <div className="text-[10px] text-red-600 font-bold font-mono">
                                            Multa: R$ {b.fineAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                          </div>
                                        )}
                                        {b.paidAmount > 0 && (
                                          <div className="text-[10px] text-indigo-600 font-bold font-mono">
                                            Pago: R$ {b.paidAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex gap-1">
                                        {!isPaid && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenConfirmPaymentModal(storage, b)}
                                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-bold text-[10px] flex items-center gap-1 shadow-sm"
                                          >
                                            Confirmar
                                          </button>
                                        )}
                                        {b.paidAmount > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => handleUndoPayment(storage, b)}
                                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition"
                                            title="Estornar/Desfazer Pagamento"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenBillingModal(storage, b)}
                                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition"
                                          title="Editar lançamento"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteBilling(storage, b.id)}
                                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-100 transition"
                                          title="Excluir lançamento"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {storage.billings.length > 4 && (
                              <button
                                type="button"
                                onClick={() => setShowAllBillings(!showAllBillings)}
                                className="w-full text-center py-1.5 text-[11px] text-emerald-700 hover:text-emerald-800 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold border border-slate-200 transition"
                              >
                                {showAllBillings ? "Ocultar parcelas antigas" : `Ver mais ${storage.billings.length - 4} parcelas`}
                              </button>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
                        <DollarSign className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-slate-500 text-xs font-semibold">Nenhuma cobrança registrada neste espaço.</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 mb-3.5">Comece gerando parcelas automáticas de forma rápida ou lance manualmente.</p>
                        <button
                          type="button"
                          onClick={() => handleAutoGenerateBillings(storage)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          Auto-Gerar Parcelas Recorrentes
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. ANÁLISE DE VIABILIDADE FINANCEIRA: ALERTA DE DESAPEGO (BELOW BILLING) */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-sm">
                    <div className={`p-4 rounded-2xl border ${
                      analysis.verdictType === "good"
                        ? "bg-emerald-50/60 border-emerald-100"
                        : analysis.verdictType === "warning"
                        ? "bg-amber-50/60 border-amber-100"
                        : "bg-red-50/60 border-red-100"
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${
                          analysis.verdictType === "good"
                            ? "text-emerald-600"
                            : analysis.verdictType === "warning"
                            ? "text-amber-600"
                            : "text-red-600"
                        }`} />
                        <div className="space-y-1">
                          <h5 className={`text-xs font-extrabold tracking-wide uppercase ${
                            analysis.verdictType === "good"
                              ? "text-emerald-800"
                              : analysis.verdictType === "warning"
                              ? "text-amber-800"
                              : "text-red-800"
                          }`}>
                            ANÁLISE DE VIABILIDADE FINANCEIRA: {analysis.verdict.toUpperCase()}
                          </h5>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {analysis.advice}
                          </p>
                          {analysis.breakevenMonths > 0 && analysis.breakevenMonths < 999 && (
                            <div className="text-[11px] text-slate-500 pt-1 font-mono">
                              Ponto de Equilíbrio (Breakeven): <strong className="text-slate-900">{analysis.breakevenMonths.toFixed(1)} meses</strong> de aluguel cobrem o valor dos materiais.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Sub-Modal: Contrato de Locação */}
      {isContractDetailsOpen && selectedStorageId && (
        (() => {
          const storage = storages.find((s) => s.id === selectedStorageId);
          if (!storage) return null;

          return (
            <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-auto overflow-hidden relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-200 flex justify-between items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Contrato de Locação</h3>
                      <p className="text-xs text-slate-500">{storage.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsContractDetailsOpen(false)}
                    className="p-1.5 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 rounded-xl transition border border-slate-200 bg-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
                  {/* Financial & Contract terms */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">TERMOS DO CONTRATO DE LOCAÇÃO</h4>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 divide-y divide-slate-200/60">
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 font-medium">Valor do Aluguel:</span>
                        <span className="font-extrabold text-red-600 font-mono text-sm">
                          R$ {storage.monthlyCost?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 font-medium">Dia de Vencimento:</span>
                        <span className="font-semibold text-slate-800">Todo dia {storage.dueDay}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 font-medium">Início do Contrato:</span>
                        <span className="font-medium text-slate-800">
                          {(() => {
                            if (!storage.contractStartDate) return "-";
                            const parts = storage.contractStartDate.split("-");
                            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : storage.contractStartDate;
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 font-medium">Término do Contrato:</span>
                        <span className="font-medium text-slate-800">
                          {(() => {
                            if (!storage.contractEndDate) return "Indeterminado";
                            const parts = storage.contractEndDate.split("-");
                            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : storage.contractEndDate;
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 font-medium">Índice de Reajuste:</span>
                        <span className="font-medium text-slate-800">{storage.readjustmentIndex || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 font-medium">Multa Rescisória:</span>
                        <span className="font-medium text-slate-800">
                          {storage.rescissionFine ? `R$ ${storage.rescissionFine.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 font-medium">Forma de Pagamento:</span>
                        <span className="font-medium text-slate-800">{storage.paymentMethod || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 font-medium">Local de Guarda Físico:</span>
                        <span className="text-slate-800 font-medium truncate max-w-[200px]" title={storage.evidenceLocation || "Não informado"}>
                          {storage.evidenceLocation || "Não informado"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Landlord details */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">LOCADOR (PROPRIETÁRIO DO ESPAÇO)</h4>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                      <p className="font-bold text-slate-900">{storage.landlordName || "Não Informado"}</p>
                      {storage.landlordContact && (
                        <p className="text-slate-500 font-mono text-[11px]">{storage.landlordContact}</p>
                      )}
                    </div>
                  </div>

                  {/* Deposit / Guarantee */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">GARANTIA / DEPOSITO CAUÇÃO</h4>
                    {storage.hasDeposit ? (
                      <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-indigo-700 font-medium">Valor do Depósito:</span>
                          <span className="font-extrabold text-indigo-900 font-mono">
                            R$ {storage.depositValue?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-indigo-100/60">
                          <span className="text-indigo-700 font-medium">Forma de Pagamento:</span>
                          <span className="font-semibold text-indigo-900 uppercase text-[10px]">
                            {storage.depositPaymentType === "installments" 
                              ? `Parcelado (${storage.depositInstallments || 1}x)` 
                              : "À Vista"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-indigo-100/60">
                          <span className="text-indigo-700 font-medium">Status de Pagamento:</span>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                            storage.depositIsPaid 
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}>
                            {storage.depositIsPaid ? "Pago" : "Pendente"}
                          </span>
                        </div>
                        {storage.depositIsPaid && storage.depositPaymentFile && (
                          <div className="pt-2 border-t border-indigo-100/60 flex justify-between items-center">
                            <span className="text-indigo-700 font-semibold">Comprovante de Pagamento:</span>
                            <a
                              href={storage.depositPaymentFile}
                              download={storage.depositPaymentFileName || "comprovante_caucao"}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-bold text-[10px] flex items-center gap-1 shadow-sm"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Baixar Comprovante
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400 font-medium">
                        Nenhum depósito de caução registrado.
                      </div>
                    )}
                  </div>

                  {/* Contract file attachment */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">DOCUMENTO DO CONTRATO DIGITAL</h4>
                    {storage.contractFile ? (
                      <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-900 truncate">
                              {storage.evidenceName || "contrato_deposito.pdf"}
                            </p>
                            <span className="text-[10px] text-emerald-600 font-mono font-bold block">DOCUMENTO ARMAZENADO</span>
                          </div>
                        </div>
                        <a
                          href={storage.contractFile}
                          download={storage.evidenceName || "contrato_deposito"}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition text-xs font-bold flex items-center gap-1 shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Baixar
                        </a>
                      </div>
                    ) : (
                      <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                        <Upload className="w-6 h-6 text-slate-300 mx-auto" />
                        <p className="text-slate-500 font-medium">Nenhum documento de contrato anexado.</p>
                        {onNavigateToCreateContract && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsContractDetailsOpen(false);
                              handleCreateContractFromStorage(storage);
                            }}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Gerar Contrato com IA
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-150 pt-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block font-mono">GASTO RECORRENTE TOTAL</span>
            <span className="text-2xl font-bold text-slate-900 block mt-0.5">
              R$ {totalMonthlyRent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              <span className="text-xs text-slate-500 font-normal"> /mês</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block font-mono">VALOR TOTAL EM MATERIAIS</span>
            <span className="text-2xl font-bold text-slate-900 block mt-0.5">
              R$ {totalItemsValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block font-mono">CUSTO-BENEFÍCIO MÉDIO</span>
            <span className="text-base font-semibold text-slate-700 block mt-1">
              {storages.length === 0
                ? "Nenhum espaço cadastrado"
                : `${storages.length} espaço(s) locado(s) monitorado(s)`}
            </span>
          </div>
        </div>
      </div>

      {/* STORAGE MODAL (Create / Edit Storage Space) */}
      {isStorageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                {editingStorage ? "Editar Espaço & Contrato" : "Cadastrar Espaço & Contrato"}
              </h3>
              <button
                onClick={() => setIsStorageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStorage} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-6 overflow-y-auto scrollbar-thin">
                
                {/* Warning for excessively large attachments */}
                {(() => {
                  const contractFileLength = storageFormData.contractFile ? storageFormData.contractFile.length : 0;
                  const depositFileLength = storageFormData.depositPaymentFile ? storageFormData.depositPaymentFile.length : 0;
                  const totalLength = contractFileLength + depositFileLength;
                  const isTooLarge = totalLength > 850000;

                  if (!isTooLarge) return null;

                  return (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                      <div className="flex gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-900">Anexos Grandes Detectados ({(totalLength / 1024).toFixed(0)}KB)</p>
                          <p className="text-[11px] text-amber-700 mt-1">
                            Este espaço de armazenamento contém anexos pesados (PDFs ou imagens de alta resolução). Isso excede o limite recomendado do banco de dados (1MB) e impedirá o salvamento de qualquer alteração ou adição de materiais.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setStorageFormData(prev => ({
                              ...prev,
                              contractFile: "",
                              evidenceName: "",
                              depositPaymentFile: "",
                              depositPaymentFileName: ""
                            }));
                            toast.success("Anexos limpos! Agora você pode salvar as alterações normalmente.");
                          }}
                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px] rounded-lg transition-all shadow-sm"
                        >
                          Remover Anexos Pesados para Liberar Salvamento
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* DADOS BÁSICOS */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 border-l-2 border-emerald-500 pl-2 uppercase tracking-wider">
                    Dados Básicos do Espaço
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">NOME DO ESPAÇO *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Aluguel de Garagem, Depósito"
                        value={storageFormData.name}
                        onChange={(e) => setStorageFormData({ ...storageFormData, name: e.target.value })}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">TIPO DE ESPAÇO</label>
                      <select
                        value={storageFormData.spaceType}
                        onChange={(e) => setStorageFormData({ ...storageFormData, spaceType: e.target.value as any })}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      >
                        <option value="warehouse">🏢 Galpão / Armazém (Escala Grande)</option>
                        <option value="room">🚪 Sala / Escritório / Box (Escala Média)</option>
                        <option value="cabinet">🗄️ Armário / Locker (Escala Compacta)</option>
                        <option value="drawer">📥 Gaveta (Escala Micro)</option>
                        <option value="space">📦 Espaço / Container (Escala Livre)</option>
                        <option value="garage">🚗 Garagem / Estacionamento</option>
                        <option value="storage_room">🧺 Depósito / Almoxarifado</option>
                        <option value="other">⚙️ Outro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">ENDEREÇO / LOCALIZAÇÃO</label>
                    <input
                      type="text"
                      placeholder="Ex: Av. Principal, 1200 - Fundos"
                      value={storageFormData.address}
                      onChange={(e) => setStorageFormData({ ...storageFormData, address: e.target.value })}
                      className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <CurrencyInput
                        label="VALOR DO ALUGUEL *"
                        id="monthlyCost"
                        required
                        value={storageFormData.monthlyCost}
                        onChange={(val) => setStorageFormData({ ...storageFormData, monthlyCost: val })}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">DIA DO VENCIMENTO *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        min="1"
                        max="31"
                        placeholder="Ex: 5"
                        value={storageFormData.dueDay === 0 ? "" : storageFormData.dueDay}
                        onChange={(e) => setStorageFormData({ ...storageFormData, dueDay: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">VINCULAR A UM IMÓVEL</label>
                    <select
                      value={storageFormData.propertyId}
                      onChange={(e) => setStorageFormData({ ...storageFormData, propertyId: e.target.value })}
                      className="w-full bg-slate-50 text-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    >
                      <option value="">Gasto Independente do Proprietário (Fora de Imóveis)</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Se vinculado a um imóvel, a despesa mensal deste depósito será contabilizada nas finanças daquele imóvel específico automaticamente.
                    </p>
                  </div>
                </div>

                {/* DADOS DO CONTRATO (Como inquilino) */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 border-l-2 border-amber-500 pl-2 uppercase tracking-wider">
                    Informações do Contrato (Você como Inquilino)
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">NOME DO LOCADOR (PROPRIETÁRIO)</label>
                      <input
                        type="text"
                        list="tenant-names"
                        placeholder="Ex: João da Silva"
                        value={storageFormData.landlordName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStorageFormData(prev => {
                            const selectedTenant = tenants.find(t => t.name === val);
                            return {
                              ...prev,
                              landlordName: val,
                              landlordContact: selectedTenant ? selectedTenant.contact : prev.landlordContact
                            };
                          });
                        }}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                      />
                      <datalist id="tenant-names">
                        {tenants.map(t => (
                          <option key={t.id} value={t.name} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">CONTATO DO LOCADOR</label>
                      <input
                        type="text"
                        placeholder="Ex: (11) 98765-4321"
                        value={storageFormData.landlordContact}
                        onChange={(e) => setStorageFormData({ ...storageFormData, landlordContact: e.target.value })}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">DATA DE INÍCIO</label>
                      <input
                        type="date"
                        value={storageFormData.contractStartDate}
                        onChange={(e) => setStorageFormData({ ...storageFormData, contractStartDate: e.target.value })}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">DATA DE TÉRMINO</label>
                      <input
                        type="date"
                        value={storageFormData.contractEndDate}
                        onChange={(e) => setStorageFormData({ ...storageFormData, contractEndDate: e.target.value })}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">ÍNDICE REAJUSTE</label>
                      <input
                        type="text"
                        placeholder="Ex: IPCA, IGP-M"
                        value={storageFormData.readjustmentIndex}
                        onChange={(e) => setStorageFormData({ ...storageFormData, readjustmentIndex: e.target.value })}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="col-span-1">
                      <CurrencyInput
                        label="MULTA RESCISÓRIA"
                        id="rescissionFine"
                        value={storageFormData.rescissionFine || 0}
                        onChange={(val) => setStorageFormData({ ...storageFormData, rescissionFine: val })}
                      />
                    </div>

                    <div className="col-span-1 font-mono">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">MÉTODO PGTO.</label>
                      <input
                        type="text"
                        placeholder="Ex: Pix, Boleto"
                        value={storageFormData.paymentMethod}
                        onChange={(e) => setStorageFormData({ ...storageFormData, paymentMethod: e.target.value })}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* DADOS DO DEPÓSITO / CAUÇÃO */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 border-l-2 border-indigo-500 pl-2 uppercase tracking-wider">
                      Depósito de Garantia (Caução)
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={storageFormData.hasDeposit}
                        onChange={(e) => setStorageFormData({ ...storageFormData, hasDeposit: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-2 text-xs font-semibold text-slate-600">Teve depósito?</span>
                    </label>
                  </div>

                  {storageFormData.hasDeposit && (
                    <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <CurrencyInput
                            label="VALOR DO DEPÓSITO"
                            id="depositValue"
                            value={storageFormData.depositValue || 0}
                            onChange={(val) => setStorageFormData({ ...storageFormData, depositValue: val })}
                            inputClassName="bg-white border-indigo-200 focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1 font-mono">STATUS DO REEMBOLSO</label>
                          <select
                            value={storageFormData.depositRefundStatus}
                            onChange={(e) => setStorageFormData({ ...storageFormData, depositRefundStatus: e.target.value as any })}
                            className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-sm border border-indigo-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                          >
                            <option value="pending">Pendente (Com o Locador)</option>
                            <option value="refunded">Reembolsado Integralmente</option>
                            <option value="partially_used">Usado Parcialmente (Descontos)</option>
                            <option value="lost">Retido pelo Locador (Perdido)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-indigo-100/40">
                        <div>
                          <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1 font-mono">FORMA DE PAGAMENTO DO CAUÇÃO</label>
                          <select
                            value={storageFormData.depositPaymentType || "cash"}
                            onChange={(e) => setStorageFormData({ ...storageFormData, depositPaymentType: e.target.value as any })}
                            className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-sm border border-indigo-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                          >
                            <option value="cash">À vista</option>
                            <option value="installments">Parcelado</option>
                          </select>
                        </div>

                        {storageFormData.depositPaymentType === "installments" ? (
                          <div>
                            <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1 font-mono">NÚMERO DE PARCELAS</label>
                            <input
                              type="number"
                              min="1"
                              max="36"
                              value={storageFormData.depositInstallments || 1}
                              onChange={(e) => setStorageFormData({ ...storageFormData, depositInstallments: Number(e.target.value) })}
                              className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-sm border border-indigo-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                            />
                          </div>
                        ) : (
                          <div className="flex items-end h-full pb-2">
                            <span className="text-xs text-indigo-600/70 italic">Pagamento único à vista.</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-indigo-100/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">O depósito caução já foi pago?</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={storageFormData.depositIsPaid}
                              onChange={(e) => setStorageFormData({ ...storageFormData, depositIsPaid: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                            <span className="ml-2 text-xs font-semibold text-slate-600">
                              {storageFormData.depositIsPaid ? "Sim, Pago" : "Não, Pendente"}
                            </span>
                          </label>
                        </div>

                        {storageFormData.depositIsPaid && (
                          <div className="space-y-2 animate-in fade-in duration-150">
                            <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block font-mono">COMPROVANTE DE PAGAMENTO DO CAUÇÃO</label>
                            
                            {storageFormData.depositPaymentFile ? (
                              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-8 h-8 text-emerald-500 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-emerald-800 truncate max-w-[200px]">
                                      {storageFormData.depositPaymentFileName || "comprovante_caucao.pdf"}
                                    </p>
                                    <span className="text-[9px] text-emerald-600 font-bold block">COMPROVANTE ANEXADO</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setStorageFormData({ ...storageFormData, depositPaymentFile: "", depositPaymentFileName: "" })}
                                  className="p-1.5 hover:bg-emerald-100 text-red-600 hover:text-red-700 rounded-lg transition"
                                  title="Remover Comprovante"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-indigo-200 rounded-xl p-4 bg-white/70 hover:bg-white transition-all text-center">
                                <label className="cursor-pointer flex flex-col items-center gap-1">
                                  <Upload className="w-6 h-6 text-indigo-500 mb-1" />
                                  <span className="text-xs font-bold text-indigo-900">Carregar Comprovante da Caução</span>
                                  <span className="text-[10px] text-slate-500">PDF (até 350KB) ou Imagem (comprimida automaticamente)</span>
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleDepositReceiptUpload}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* COMPROVANTE / ARQUIVOS */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 border-l-2 border-slate-400 pl-2 uppercase tracking-wider">
                    Anexos e Arquivos
                  </h4>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">LOCALIZAÇÃO FÍSICA DO CONTRATO / OBSERVAÇÕES</label>
                    <input
                      type="text"
                      placeholder="Ex: Pasta Azul no armário, Arquivo Digital, etc."
                      value={storageFormData.evidenceLocation}
                      onChange={(e) => setStorageFormData({ ...storageFormData, evidenceLocation: e.target.value })}
                      className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">CONTRATO DIGITAL OU COMPROVANTE (PDF/IMAGEM)</label>
                    <div className="flex gap-2 items-center">
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg border border-slate-200 transition text-xs flex items-center gap-1.5 font-semibold shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        Upload Arquivo
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-slate-500 truncate font-mono">
                        {storageFormData.evidenceName || "Nenhum arquivo (PDF até 350KB ou Imagem comprimida)"}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 p-5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsStorageModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStorage}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmittingStorage ? "Salvando..." : editingStorage ? "Salvar Alterações" : "Cadastrar Depósito"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ITEM MODAL (Add / Edit Material Item) */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-600" />
                {editingItem ? "Editar Material" : "Adicionar Material ao Depósito"}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-6 overflow-y-auto scrollbar-thin">
                
                {/* Alert if the active storage has too large attachments */}
                {(() => {
                  const activeContractLen = activeStorageForItem?.contractFile ? activeStorageForItem.contractFile.length : 0;
                  const activeDepositLen = activeStorageForItem?.depositPaymentFile ? activeStorageForItem.depositPaymentFile.length : 0;
                  const isActiveTooLarge = (activeContractLen + activeDepositLen) > 850000;

                  if (!isActiveTooLarge) return null;

                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-900">Armazenamento Quase Cheio (Anexos)</p>
                          <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">
                            Este espaço possui anexos muito grandes salvos. Deseja liberar espaço limpando esses anexos grandes?
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!activeStorageForItem?.id) return;
                          try {
                            await updateDoc(doc(db, "storages", activeStorageForItem.id), {
                              contractFile: "",
                              evidenceName: "",
                              depositPaymentFile: "",
                              depositPaymentFileName: "",
                              updatedAt: new Date().toISOString()
                            });
                            toast.success("Anexos liberados!");
                            activeStorageForItem.contractFile = "";
                            activeStorageForItem.depositPaymentFile = "";
                          } catch (err) {
                            toast.error("Erro ao liberar anexos.");
                          }
                        }}
                        className="w-full py-1 bg-amber-600 text-white font-bold text-[9px] rounded-lg"
                      >
                        Limpar Anexos do Depósito e Liberar Gravação
                      </button>
                    </div>
                  );
                })()}

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">NOME DO MATERIAL / OBJETO *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Porcelanato Portobello, Janela Blindex, Furadeira"
                        value={itemFormData.name}
                        onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">CATEGORIA</label>
                      <input
                        type="text"
                        list="item-categories"
                        placeholder="Ex: Material de Construção, Ferramentas"
                        value={itemFormData.category}
                        onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      />
                      <datalist id="item-categories">
                        <option value="Material de Construção" />
                        <option value="Ferramentas & Equipamentos" />
                        <option value="Móveis & Decoração" />
                        <option value="Eletrônicos & Mídia" />
                        <option value="Peças & Componentes" />
                        <option value="Caixas & Armazenamento" />
                        <option value="Documentos & Arquivo" />
                        <option value="Outros" />
                      </datalist>
                    </div>
                  </div>

                  {/* ESTADO DO OBJETO & VALIDADE */}
                  <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
                    <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      Estado do Objeto & Validade
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1 font-mono">ESTADO / CONDIÇÃO</label>
                        <select
                          value={itemFormData.condition || "good"}
                          onChange={(e) => setItemFormData({ ...itemFormData, condition: e.target.value as any })}
                          className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-xs border border-amber-200 focus:outline-none focus:border-amber-500 font-semibold"
                        >
                          <option value="new">🟢 Novo / Excelente estado</option>
                          <option value="good">🔵 Bom estado</option>
                          <option value="fair">⚪ Estado Regular</option>
                          <option value="poor">🔴 Ruim / Com defeito ou danificado</option>
                          <option value="expiring_soon">🟡 A Vencer Próximo (Atenção)</option>
                          <option value="expired">🟣 Vencido / Expirado</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1 font-mono">DATA DE VALIDADE (OPCIONAL)</label>
                        <input
                          type="date"
                          value={itemFormData.expirationDate}
                          onChange={(e) => setItemFormData({ ...itemFormData, expirationDate: e.target.value })}
                          className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-xs border border-amber-200 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FOTO DO OBJETO */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">FOTO DO OBJETO / MATERIAL</label>
                    {itemFormData.photoUrl ? (
                      <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-sm group">
                        <img src={itemFormData.photoUrl} alt="Foto do Objeto" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setItemFormData({ ...itemFormData, photoUrl: "" })}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700 transition"
                          title="Remover Foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl cursor-pointer text-slate-600 hover:text-emerald-700 transition text-xs font-semibold">
                        <Camera className="w-4 h-4 text-slate-400" />
                        Anexar / Tirar Foto do Objeto
                        <input type="file" accept="image/*" capture="environment" onChange={handleItemPhotoUpload} className="hidden" />
                      </label>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">DESCRIÇÃO / OBSERVAÇÕES</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Sobras da reforma da sala, 5 caixas fechadas"
                      value={itemFormData.description}
                      onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                      className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  {/* RASTREIO E MOVIMENTAÇÃO */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-4">
                    <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Rastreio e Movimentação
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1 font-mono">STATUS ATUAL</label>
                        <select
                          value={itemFormData.status}
                          onChange={(e) => setItemFormData({ ...itemFormData, status: e.target.value as any })}
                          className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-sm border border-indigo-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                        >
                          <option value="in_stock">Em Estoque</option>
                          <option value="out">Saiu / Em Uso</option>
                          <option value="sold">Vendido</option>
                          <option value="returned">Devolvido</option>
                        </select>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1 font-mono">QUEM PEGOU / RESPONSÁVEL</label>
                        <input
                          type="text"
                          placeholder="Ex: Pedro Pedreiro"
                          value={itemFormData.takenBy}
                          onChange={(e) => setItemFormData({ ...itemFormData, takenBy: e.target.value })}
                          className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-sm border border-indigo-200 focus:outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1 font-mono">DATA MOVIMENTAÇÃO</label>
                        <input
                          type="date"
                          value={itemFormData.movementDate}
                          onChange={(e) => setItemFormData({ ...itemFormData, movementDate: e.target.value })}
                          className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-sm border border-indigo-200 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1 font-mono">PREVISÃO VOLTA</label>
                        <input
                          type="date"
                          value={itemFormData.expectedReturnDate}
                          onChange={(e) => setItemFormData({ ...itemFormData, expectedReturnDate: e.target.value })}
                          className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-sm border border-indigo-200 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {itemFormData.status === "sold" && (
                      <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <CurrencyInput
                          label="VALOR DA VENDA (R$)"
                          id="soldPrice"
                          value={itemFormData.soldPrice || 0}
                          onChange={(val) => setItemFormData({ ...itemFormData, soldPrice: val })}
                          inputClassName="bg-white border-indigo-200 focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Dynamic Specific Fields Based on Storage Type */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                        <span>📋 Organização no Espaço</span>
                      </div>
                      {(() => {
                        const badge = getSpaceTypeBadge(activeStorageForItem?.spaceType);
                        return (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wide ${badge.className}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>

                    {activeStorageForItem?.spaceType === "garage" && (
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-150">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-mono">Vagas Ocupadas</label>
                          <input
                            type="number"
                            min="1"
                            value={itemFormData.garageSpots || ""}
                            onChange={(e) => setItemFormData({ ...itemFormData, garageSpots: parseInt(e.target.value) || 0, quantity: parseInt(e.target.value) || 1 })}
                            className="w-full bg-white text-slate-900 rounded-lg px-3 py-1.5 text-xs border border-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-mono">Nº da Vaga</label>
                          <input
                            type="text"
                            value={itemFormData.garageSpotNumbers || ""}
                            onChange={(e) => setItemFormData({ ...itemFormData, garageSpotNumbers: e.target.value, location: e.target.value ? `Vaga ${e.target.value}` : "" })}
                            className="w-full bg-white text-slate-900 rounded-lg px-3 py-1.5 text-xs border border-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                          />
                        </div>
                      </div>
                    )}

                    {/* Quick Location Section */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block font-mono">Localização Livre</label>
                      <input
                        type="text"
                        placeholder="Ex: Prateleira 2, Fundo, Corredor B"
                        value={itemFormData.location}
                        onChange={(e) => setItemFormData({ ...itemFormData, location: e.target.value })}
                        className="w-full bg-white text-slate-900 rounded-lg px-3 py-1.5 text-xs border border-slate-200 focus:outline-none focus:border-emerald-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">QUANTIDADE *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={itemFormData.quantity}
                        onChange={(e) => setItemFormData({ ...itemFormData, quantity: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-mono"
                      />
                    </div>

                    <div>
                      <CurrencyInput
                        label="CUSTO UNITÁRIO *"
                        id="itemCost"
                        required
                        value={itemFormData.cost}
                        onChange={(val) => setItemFormData({ ...itemFormData, cost: val })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 p-5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-sm font-semibold transition shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-sm"
                >
                  {editingItem ? "Atualizar Material" : "Adicionar Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BILLING MODAL (Add / Edit Billing) */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                {selectedBilling ? "Editar Cobrança" : "Lançar Cobrança Manual"}
              </h3>
              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBilling} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">Data de Vencimento *</label>
                <input
                  type="date"
                  required
                  value={billingFormData.dueDate}
                  onChange={(e) => setBillingFormData({ ...billingFormData, dueDate: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <CurrencyInput
                    label="Valor da Parcela *"
                    id="billingAmount"
                    required
                    value={billingFormData.amount}
                    onChange={(val) => setBillingFormData({ ...billingFormData, amount: val })}
                  />
                </div>

                <div>
                  <CurrencyInput
                    label="Juros / Multa"
                    id="billingFine"
                    value={billingFormData.fineAmount}
                    onChange={(val) => setBillingFormData({ ...billingFormData, fineAmount: val })}
                  />
                </div>

                <div>
                  <CurrencyInput
                    label="Valor Já Pago"
                    id="billingPaid"
                    value={billingFormData.paidAmount}
                    onChange={(val) => {
                      let status: "paid" | "unpaid" | "partial" = "unpaid";
                      if (val >= (billingFormData.amount + (billingFormData.fineAmount || 0))) status = "paid";
                      else if (val > 0) status = "partial";
                      setBillingFormData({
                        ...billingFormData,
                        paidAmount: val,
                        status
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">Status do Pagamento *</label>
                  <select
                    value={billingFormData.status}
                    onChange={(e) => setBillingFormData({ ...billingFormData, status: e.target.value as any })}
                    className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                  >
                    <option value="unpaid">Pendente</option>
                    <option value="partial">Pago Parcial</option>
                    <option value="paid">Pago Integral</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">Data do Pagamento</label>
                  <input
                    type="date"
                    value={billingFormData.paymentDate}
                    onChange={(e) => setBillingFormData({ ...billingFormData, paymentDate: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">Observações / Comprovante</label>
                <input
                  type="text"
                  placeholder="Ex: Pago via PIX, Ref. mês de Junho"
                  value={billingFormData.notes}
                  onChange={(e) => setBillingFormData({ ...billingFormData, notes: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 p-5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBillingModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
                >
                  {selectedBilling ? "Salvar Alterações" : "Lançar Cobrança"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM PAYMENT MODAL (Confirmation Dialog) */}
      {isConfirmPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                Confirmar Pagamento
              </h3>
              <button
                onClick={() => setIsConfirmPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-indigo-800 space-y-1">
                <p className="font-semibold">Confirmando recebimento/pagamento do espaço:</p>
                <p className="font-extrabold text-indigo-950">{activeStorageForBilling?.name}</p>
                <p className="font-mono">Vencimento: {selectedBilling?.dueDate && (() => {
                  const p = selectedBilling.dueDate.split("-");
                  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : selectedBilling.dueDate;
                })()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <CurrencyInput
                    label="Valor Pago *"
                    id="paymentConfirmAmount"
                    required
                    value={paymentConfirmFormData.amountToConfirm}
                    onChange={(val) => setPaymentConfirmFormData({ ...paymentConfirmFormData, amountToConfirm: val })}
                  />
                </div>

                <div>
                  <CurrencyInput
                    label="Juros / Multa"
                    id="paymentConfirmFine"
                    value={paymentConfirmFormData.fineAmount}
                    onChange={(val) => setPaymentConfirmFormData({ ...paymentConfirmFormData, fineAmount: val })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">Data do Recebimento/Pagamento *</label>
                <input
                  type="date"
                  required
                  value={paymentConfirmFormData.paymentDate}
                  onChange={(e) => setPaymentConfirmFormData({ ...paymentConfirmFormData, paymentDate: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">Observações (Ex: Meio de pagamento, PIX, etc)</label>
                <input
                  type="text"
                  placeholder="Ex: Recebido via PIX Banco Inter"
                  value={paymentConfirmFormData.notes}
                  onChange={(e) => setPaymentConfirmFormData({ ...paymentConfirmFormData, notes: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 p-5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsConfirmPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK DETAIL VIEW MODAL FOR STORED ITEM */}
      {selectedItemForDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wide">
                  Detalhes do Objeto
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemForDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Photo Banner if available */}
              {selectedItemForDetail.photoUrl ? (
                <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner">
                  <img
                    src={selectedItemForDetail.photoUrl}
                    alt={selectedItemForDetail.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full py-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <Box className="w-10 h-10 mb-1 opacity-50" />
                  <span className="text-xs font-medium">Sem foto cadastrada</span>
                </div>
              )}

              {/* Title & Badges */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-black text-slate-900 leading-tight">
                    {selectedItemForDetail.name}
                  </h2>
                  {selectedItemForDetail.category && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      {selectedItemForDetail.category}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-2.5">
                  {/* Status Badge */}
                  {(() => {
                    const status = selectedItemForDetail.status || "in_stock";
                    switch(status) {
                      case "in_stock":
                        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">🟢 Em Estoque</span>;
                      case "out":
                        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">🟡 Saiu / Em Uso</span>;
                      case "sold":
                        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">🔵 Vendido</span>;
                      case "returned":
                        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">⚪ Devolvido</span>;
                      default:
                        return null;
                    }
                  })()}

                  {/* Condition Badge */}
                  {(() => {
                    const badge = getItemConditionBadge(selectedItemForDetail.condition);
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Expiration Alert */}
              {selectedItemForDetail.expirationDate && (() => {
                const expStatus = getItemExpirationStatus(selectedItemForDetail.expirationDate);
                if (!expStatus) return null;
                return (
                  <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                    expStatus.isExpired 
                      ? "bg-red-50 text-red-800 border-red-200" 
                      : expStatus.isExpiringSoon 
                      ? "bg-amber-50 text-amber-800 border-amber-200" 
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{expStatus.label}</span>
                  </div>
                );
              })()}

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Quantidade</span>
                  <span className="font-extrabold text-slate-900 text-sm font-mono">{selectedItemForDetail.quantity} un</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Custo Unitário</span>
                  <span className="font-extrabold text-slate-900 text-sm font-mono">
                    R$ {(selectedItemForDetail.cost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Valor Total</span>
                  <span className="font-extrabold text-emerald-700 text-sm font-mono">
                    R$ {((selectedItemForDetail.cost || 0) * (selectedItemForDetail.quantity || 1)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Localização</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    {selectedItemForDetail.location || "Não informada"}
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedItemForDetail.description && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Descrição / Observações</span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedItemForDetail.description}
                  </p>
                </div>
              )}

              {/* Tracking Details */}
              {(selectedItemForDetail.takenBy || selectedItemForDetail.movementDate || selectedItemForDetail.expectedReturnDate) && (
                <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-2xl space-y-1.5 text-xs text-indigo-900">
                  <span className="text-[10px] font-black uppercase text-indigo-700 font-mono block">Rastreio de Movimentação</span>
                  {selectedItemForDetail.takenBy && (
                    <div>Responsável: <strong className="text-indigo-950">{selectedItemForDetail.takenBy}</strong></div>
                  )}
                  {selectedItemForDetail.movementDate && (
                    <div>Data da Saída: <span className="font-mono">{selectedItemForDetail.movementDate}</span></div>
                  )}
                  {selectedItemForDetail.expectedReturnDate && (
                    <div>Previsão de Retorno: <span className="font-mono">{selectedItemForDetail.expectedReturnDate}</span></div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {(() => {
                  const currentStorage = storages.find(s => s.items?.some(i => i.id === selectedItemForDetail.id)) || (selectedStorageId ? storages.find(s => s.id === selectedStorageId) : null);
                  if (!currentStorage) return null;
                  return (
                    <>
                      <button
                        onClick={() => {
                          const itemToEdit = selectedItemForDetail;
                          setSelectedItemForDetail(null);
                          handleOpenItemModal(currentStorage, itemToEdit);
                        }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 active:bg-slate-300"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-600" />
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          const idToDelete = selectedItemForDetail.id;
                          setSelectedItemForDetail(null);
                          handleDeleteItem(currentStorage, idToDelete);
                        }}
                        className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-red-200/80 active:bg-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        Excluir
                      </button>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={() => setSelectedItemForDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
