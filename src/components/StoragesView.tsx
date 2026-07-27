import React, { useState } from "react";
import { StorageSpace, StorageItem, Property, StorageBilling, Tenant, Contract } from "../types";
import {
  Box,
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
  Home
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
    takenBy: "",
    movementDate: "",
    expectedReturnDate: "",
    soldPrice: 0
  });

  // Selected Storage for detailed view
  const [selectedStorageId, setSelectedStorageId] = useState<string | null>(null);

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

        await addDoc(collection(db, "storages"), cleanObject(storagePayload));
        toast.success("Novo espaço locado cadastrado com sucesso com faturamento automático iniciado!");
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
        verdict: "Excelente custo-benefício (custo zero!)",
        verdictType: "good" as const,
        advice: "Você não tem custos recorrentes para este espaço de armazenamento. Vale muito a pena manter."
      };
    }

    const breakevenMonths = itemsVal / monthlyCost;

    let verdict = "";
    let verdictType: "good" | "warning" | "danger" = "warning";
    let advice = "";

    if (itemsVal === 0) {
      verdict = "Desocupar urgente (Vazio / Sem materiais)";
      verdictType = "danger";
      advice = `Você está pagando R$ ${monthlyCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} por mês por um depósito vazio! Cancele o aluguel ou venda/remova os itens o quanto antes.`;
    } else if (breakevenMonths < 3) {
      verdict = "Custo muito alto / Não vale a pena";
      verdictType = "danger";
      advice = `O custo de armazenamento (R$ ${monthlyCost}/mês) vai ultrapassar o valor total de todos os materiais guardados (R$ ${itemsVal}) em apenas ${Math.round(breakevenMonths)} meses! Recomendamos desocupar o depósito, usar ou vender essas coisas imediatamente.`;
    } else if (breakevenMonths < 12) {
      verdict = "Custo moderado / Recomenda-se atenção";
      verdictType = "warning";
      advice = `Em menos de 1 ano (${Math.round(breakevenMonths)} meses), o custo do aluguel superará o valor dos itens guardados. Planeje usar esses materiais em breve ou repense o armazenamento.`;
    } else {
      verdict = "Bom custo-benefício";
      verdictType = "good";
      advice = `O valor dos materiais (R$ ${itemsVal}) é expressivo em relação ao aluguel mensal de R$ ${monthlyCost} (${Math.round(breakevenMonths)} meses de margem). É economicamente razoável manter o depósito a curto/médio prazo.`;
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
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Box className="w-5 h-5 text-emerald-600" />
            Aluguel de Espaço
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Administre os espaços alugados (como garagens, depósitos, escritórios ou espaços adicionais), controle o inventário de materiais e analise o custo-benefício de manter o espaço.
          </p>
        </div>
        <button
          onClick={() => handleOpenStorageModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition font-semibold text-sm shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Espaço Locado
        </button>
      </header>

      {/* Main Grid: Storage List and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Storage List Section */}
        <div className="lg:col-span-5 space-y-4">
          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Pesquisar espaço, endereço ou materiais guardados..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 rounded-lg pl-9 pr-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">STATUS DO ESPAÇO</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "active" | "archived")}
                className="w-full bg-slate-50 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs border border-slate-200 focus:outline-none focus:bg-white transition-colors"
              >
                <option value="active">Ativos</option>
                <option value="archived">Arquivados</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">FILTRAR POR IMÓVEL</label>
              <select
                value={selectedPropertyFilter}
                onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                className="w-full bg-slate-50 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs border border-slate-200 focus:outline-none focus:bg-white transition-colors"
              >
                <option value="all">Todos os Imóveis / Fora do Projeto</option>
                <option value="none">Apenas Gastos Fora do Projeto</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List of storage items */}
          <div className="space-y-3">
            {filteredStorages.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Box className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-semibold">Nenhum espaço locado localizado.</p>
                <p className="text-slate-400 text-xs mt-1">Clique em "Cadastrar Novo Espaço Locado" para começar.</p>
              </div>
            ) : (
              filteredStorages.map((storage) => {
                const analysis = getStorageAnalysis(storage);
                const isSelected = selectedStorageId === storage.id;
                const itemsCount = storage.items?.length || 0;

                return (
                  <div
                    key={storage.id}
                    id={storage.id}
                    onClick={() => setSelectedStorageId(storage.id || null)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-emerald-50/55 border-emerald-500 shadow-sm text-slate-900"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40 text-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm text-slate-900">{storage.name}</h3>
                          {storage.propertyId ? (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] border border-indigo-100 font-bold uppercase tracking-wide">
                              Vinculado
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] border border-slate-200 font-bold uppercase tracking-wide">
                              Fora do Projeto
                            </span>
                          )}
                          {(() => {
                            const badge = getSpaceTypeBadge(storage.spaceType);
                            return (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wide ${badge.className}`}>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                        {storage.address && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{storage.address}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-red-600 font-bold block">
                          R$ {storage.monthlyCost?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">Venc. Dia {storage.dueDay}</span>
                      </div>
                    </div>

                    {searchQuery && (
                      (() => {
                        const matchingItems = storage.items?.filter((item) =>
                          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
                        ) || [];
                        if (matchingItems.length > 0) {
                          return (
                            <div className="mt-2.5 p-2 bg-amber-50/70 border border-amber-100 rounded-lg text-[10px] text-amber-900">
                              <div className="font-bold flex items-center gap-1 mb-1">
                                <Box className="w-3 h-3 text-amber-600 shrink-0" />
                                Materiais encontrados ({matchingItems.length}):
                              </div>
                              <div className="space-y-1 max-h-24 overflow-y-auto">
                                {matchingItems.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white/50 px-1.5 py-0.5 rounded">
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

                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="text-slate-500">
                        {itemsCount} material(is) • R$ {analysis.itemsVal.toLocaleString("pt-BR")}
                      </span>
                      
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-sans ${
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

        {/* Storage Details Section */}
        <div className="lg:col-span-7">
          {selectedStorageId ? (
            (() => {
              const storage = storages.find((s) => s.id === selectedStorageId);
              if (!storage) return null;

              const analysis = getStorageAnalysis(storage);

              return (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Detail Header */}
                  <div className="p-4 sm:p-6 bg-slate-50/55 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-slate-900">{storage.name}</h2>
                        {storage.propertyId ? (
                          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100 flex items-center gap-1">
                            <Home className="w-3 h-3" />
                            {getPropertyName(storage.propertyId)}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold border border-slate-200 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            Despesa Geral Proprietário
                          </span>
                        )}
                        {(() => {
                          const badge = getSpaceTypeBadge(storage.spaceType);
                          return (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${badge.className}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                              {badge.label} <span className="opacity-50">•</span> <span className="text-[10px] font-medium font-sans lowercase">{badge.scale}</span>
                            </span>
                          );
                        })()}
                      </div>
                      {storage.address && (
                        <p className="text-xs text-slate-500 mt-2">{storage.address}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 items-center flex-wrap sm:flex-nowrap w-full sm:w-auto justify-start sm:justify-end">
                      {onNavigateToCreateContract && storage.status !== "archived" && (
                        <button
                          onClick={() => handleCreateContractFromStorage(storage)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition text-xs font-semibold flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                          title="Gerar contrato na ferramenta de contratos"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Gerar Contrato</span>
                        </button>
                      )}
                      
                      {storage.status === "archived" ? (
                        <button
                          onClick={() => handleRestoreStorage(storage.id!)}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-100 transition"
                          title="Restaurar espaço"
                        >
                          <ArchiveRestore className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchiveStorage(storage.id!)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 transition"
                          title="Arquivar espaço"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleOpenStorageModal(storage)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        title="Editar depósito"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStorage(storage.id!)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 transition"
                        title="Excluir depósito"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Rental details & contract */}
                  <div className="p-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/20">
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">CONTRATO DE LOCAÇÃO</h4>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Valor Aluguel:</span>
                          <span className="font-bold text-red-600">
                            R$ {storage.monthlyCost?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Dia Vencimento:</span>
                          <span className="font-semibold text-slate-800">Todo dia {storage.dueDay}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Início do Contrato:</span>
                          <span className="font-medium text-slate-800">
                            {(() => {
                              if (!storage.contractStartDate) return "-";
                              const parts = storage.contractStartDate.split("-");
                              return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : storage.contractStartDate;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Término do Contrato:</span>
                          <span className="font-medium text-slate-800">
                            {(() => {
                              if (!storage.contractEndDate) return "Indeterminado";
                              const parts = storage.contractEndDate.split("-");
                              return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : storage.contractEndDate;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Índice Reajuste:</span>
                          <span className="font-medium text-slate-800">{storage.readjustmentIndex || "-"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Multa Rescisória:</span>
                          <span className="font-medium text-slate-800">
                            {storage.rescissionFine ? `R$ ${storage.rescissionFine.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Forma de Pagamento:</span>
                          <span className="font-medium text-slate-800">{storage.paymentMethod || "-"}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Local de Guarda Físico:</span>
                          <span className="text-slate-800 font-medium truncate max-w-[180px]" title={storage.evidenceLocation || "Não informado"}>
                            {storage.evidenceLocation || "Não informado"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Locador */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">LOCADOR (PROPRIETÁRIO DO ESPAÇO)</h4>
                        <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm space-y-1.5 text-xs">
                          <p className="font-semibold text-slate-800 flex items-center justify-between">
                            <span>{storage.landlordName || "Não Informado"}</span>
                          </p>
                          {storage.landlordContact && (
                            <p className="text-slate-500 font-mono text-[11px]">{storage.landlordContact}</p>
                          )}
                        </div>
                      </div>

                      {/* Garantia / Depósito */}
                      <div className="space-y-2 pt-1">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">GARANTIA / CAUÇÃO</h4>
                        {storage.hasDeposit ? (
                          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-indigo-700 font-medium">Valor do Depósito:</span>
                              <span className="font-bold text-indigo-900">
                                R$ {storage.depositValue?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center pt-1 border-t border-indigo-100/40">
                              <span className="text-indigo-700 font-medium">Forma de Pagamento:</span>
                              <span className="font-semibold text-indigo-900 uppercase text-[10px]">
                                {storage.depositPaymentType === "installments" 
                                  ? `Parcelado (${storage.depositInstallments || 1}x)` 
                                  : "À Vista"}
                              </span>
                            </div>

                            <div className="flex justify-between items-center pt-1 border-t border-indigo-100/40">
                              <span className="text-indigo-700 font-medium">Status de Pagamento:</span>
                              <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                                storage.depositIsPaid 
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}>
                                {storage.depositIsPaid ? "Pago" : "Pendente"}
                              </span>
                            </div>

                            <div className="flex justify-between items-center pt-1 border-t border-indigo-100/40">
                              <span className="text-indigo-700 font-medium">Status Reembolso:</span>
                              <span className="px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider bg-white text-indigo-700 border border-indigo-100">
                                {storage.depositRefundStatus === "refunded"
                                  ? "Reembolsado"
                                  : storage.depositRefundStatus === "partially_used"
                                  ? "Uso Parcial"
                                  : storage.depositRefundStatus === "lost"
                                  ? "Retido/Perdido"
                                  : "Pendente"}
                              </span>
                            </div>

                            {storage.depositIsPaid && storage.depositPaymentFile && (
                              <div className="pt-2 border-t border-indigo-100/40 space-y-1.5">
                                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block font-mono">Comprovante de Pagamento</span>
                                <div className="p-2 bg-white/75 border border-indigo-100 rounded-lg flex justify-between items-center text-[11px]">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span className="font-medium text-slate-700 truncate max-w-[140px]">
                                      {storage.depositPaymentFileName || "comprovante_caucao.pdf"}
                                    </span>
                                  </div>
                                  <a
                                    href={storage.depositPaymentFile}
                                    download={storage.depositPaymentFileName || "comprovante_caucao"}
                                    className="p-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded transition"
                                    title="Baixar Comprovante"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                            <span className="text-slate-400 font-medium text-[11px]">Nenhum depósito de caução registrado.</span>
                          </div>
                        )}
                      </div>

                      {/* Contrato Físico / Digital */}
                      <div className="space-y-2 pt-1">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">CONTRATO / COMPROVANTE</h4>
                        {storage.contractFile ? (
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <FileText className="w-8 h-8 text-emerald-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-emerald-800 truncate max-w-[150px]">
                                  {storage.evidenceName || "contrato_deposito.pdf"}
                                </p>
                                <span className="text-[10px] text-emerald-600 font-mono font-bold block">CONTRATO ARMAZENADO</span>
                              </div>
                            </div>
                            <a
                              href={storage.contractFile}
                              download={storage.evidenceName || "contrato_deposito"}
                              className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition"
                              title="Baixar Contrato"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                            <Upload className="w-4 h-4 text-slate-400 mb-1" />
                            <p className="text-[11px] text-slate-500 font-medium">Nenhum contrato digital anexado.</p>
                            <div className="flex gap-2 justify-center mt-2.5 w-full">
                              <button
                                onClick={() => handleOpenStorageModal(storage)}
                                className="text-[11px] text-emerald-600 hover:text-emerald-700 hover:underline font-semibold bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm transition"
                              >
                                Importar agora
                              </button>
                              {onNavigateToCreateContract && (
                                <button
                                  type="button"
                                  onClick={() => handleCreateContractFromStorage(storage)}
                                  className="text-[11px] text-indigo-600 hover:text-indigo-700 hover:underline font-semibold bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm transition flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  Gerar com IA
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Custo Benefício Insight Analysis */}
                  <div className="p-5 border-b border-slate-100">
                    <div className={`p-4 rounded-xl border ${
                      analysis.verdictType === "good"
                        ? "bg-emerald-50/50 border-emerald-100/60"
                        : analysis.verdictType === "warning"
                        ? "bg-amber-50/50 border-amber-100/60"
                        : "bg-red-50/50 border-red-100/60"
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
                          <h5 className={`text-xs font-bold font-sans ${
                            analysis.verdictType === "good"
                              ? "text-emerald-700"
                              : analysis.verdictType === "warning"
                              ? "text-amber-700"
                              : "text-red-700"
                          }`}>
                            ANÁLISE DE VIABILIDADE FINANCEIRA: {analysis.verdict.toUpperCase()}
                          </h5>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {analysis.advice}
                          </p>
                          {analysis.breakevenMonths > 0 && analysis.breakevenMonths < 999 && (
                            <div className="text-[11px] text-slate-500 pt-1 font-mono">
                              Ponto de Equilíbrio (Breakeven): <strong className="text-slate-800">{analysis.breakevenMonths.toFixed(1)} meses</strong> de aluguel cobrem o valor dos materiais.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ACOMPANHAMENTO DE COBRANÇA */}
                  <div className="p-6 border-b border-slate-100 space-y-4">
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

                  {/* Materials list */}
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Hammer className="w-4 h-4 text-emerald-600" />
                        Materiais Guardados no Depósito
                      </h3>
                      <button
                        onClick={() => handleOpenItemModal(storage)}
                        className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-100 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Material
                      </button>
                    </div>

                    {(() => {
                      const activeItems = (storage.items || []).filter(item => item.status === "in_stock" || !item.status);
                      const archivedItems = (storage.items || []).filter(item => item.status && item.status !== "in_stock");
                      const displayItems = itemTab === "active" ? activeItems : archivedItems;

                      return (
                        <div className="space-y-4">
                          <div className="flex border-b border-slate-200 gap-4 mb-2 px-1">
                            <button
                              onClick={() => setItemTab("active")}
                              className={`pb-2 text-xs font-bold transition flex items-center gap-1.5 ${itemTab === "active" ? "text-emerald-700 border-b-2 border-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                            >
                              Em Estoque
                              <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">{activeItems.length}</span>
                            </button>
                            <button
                              onClick={() => setItemTab("archived")}
                              className={`pb-2 text-xs font-bold transition flex items-center gap-1.5 ${itemTab === "archived" ? "text-indigo-700 border-b-2 border-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                            >
                              Arquivo / Movimentados
                              <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">{archivedItems.length}</span>
                            </button>
                          </div>

                          {displayItems.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              <Box className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-slate-500 text-xs font-medium">
                                {itemTab === "active" ? "Nenhum material em estoque no momento." : "Nenhum material arquivado."}
                              </p>
                              <p className="text-slate-400 text-[10px] mt-0.5">
                                {itemTab === "active" ? "Cadastre os materiais para ver o cálculo do custo de manutenção." : "Materiais vendidos, devolvidos ou em uso aparecerão aqui."}
                              </p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                                    <th className="py-2.5 px-3">Material</th>
                                    <th className="py-2.5 px-3">Status / Qtd</th>
                                    <th className="py-2.5 px-3 text-right">Valor Unitário</th>
                                    <th className="py-2.5 px-3 text-right">{itemTab === "archived" ? "Venda/Total" : "Valor Total"}</th>
                                    <th className="py-2.5 px-3 text-center">Ações</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                  {displayItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/40">
                                      <td className="py-2.5 px-3">
                                        <div className="font-semibold text-slate-800">{item.name}</div>
                                        <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                                          {item.location && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase tracking-wider font-mono">
                                              <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                              {item.location}
                                            </span>
                                          )}
                                          {item.dateAdded && (
                                            <span className="text-[9px] text-slate-400">Adicionado: {item.dateAdded}</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <div className="flex items-center gap-2 mb-1">
                                          {(() => {
                                            const status = item.status || "in_stock";
                                            switch(status) {
                                              case "in_stock":
                                                return <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">Em Estoque</span>;
                                              case "out":
                                                return <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-200">Saiu / Em Uso</span>;
                                              case "sold":
                                                return <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">Vendido</span>;
                                              case "returned":
                                                return <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">Devolvido</span>;
                                              default:
                                                return null;
                                            }
                                          })()}
                                          <div className="text-[10px] text-emerald-600 font-bold font-mono">Qtd: {item.quantity}</div>
                                        </div>
                                        {item.takenBy && (
                                          <div className="text-[10px] text-slate-500 italic">
                                            Por: <span className="font-semibold text-slate-700">{item.takenBy}</span>
                                          </div>
                                        )}
                                        {item.movementDate && (
                                          <div className="text-[9px] text-slate-400 mt-0.5">
                                            Movimentação: {item.movementDate}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                        R$ {item.cost?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                                        {item.status === "sold" && item.soldPrice ? (
                                          <span className="text-indigo-600">R$ {item.soldPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                        ) : (
                                          <span>R$ {(item.cost * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <div className="flex justify-center gap-1.5">
                                          <button
                                            onClick={() => handleOpenItemModal(storage, item)}
                                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                                            title="Editar material"
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>
                                          {itemTab === "archived" && (
                                            <button
                                              onClick={() => handleDeleteItem(storage, item.id)}
                                              className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition"
                                              title="Remover material"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-slate-50 p-12 text-center rounded-2xl border border-slate-200/60 flex flex-col items-center justify-center min-h-[300px]">
              <Box className="w-12 h-12 text-slate-300 mb-3 animate-pulse" />
              <p className="text-slate-500 font-semibold">Selecione um depósito ou garagem</p>
              <p className="text-slate-400 text-xs mt-1">Veja e administre materiais guardados, anexos de contratos e relatórios de custo-benefício.</p>
            </div>
          )}
        </div>
      </div>

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
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">NOME DO MATERIAL *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Porcelanato Portobello, Janela Blindex"
                      value={itemFormData.name}
                      onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                      className="w-full bg-slate-50 text-slate-900 rounded-lg px-3 py-2 text-sm border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
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
    </div>
  );
};
