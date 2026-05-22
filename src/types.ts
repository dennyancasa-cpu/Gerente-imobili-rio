export type PropertyStatus = 'vacant' | 'rented' | 'renovation';
export type TenantStatus = 'waiting' | 'allocated' | 'archived';
export type ExpenseType = 'renovation' | 'repair' | 'tax' | 'fine' | 'other';
export type PaymentStatus = 'pending' | 'paid' | 'late' | 'cancelled' | 'partial';
export type DepositStatus = 'pending' | 'received' | 'partially_used' | 'refunded';

export interface DepositUsage {
  id: string;
  amount: number;
  date: string;
  reason: string;
  userName: string;
  timestamp: any;
}

export interface PropertyDocument {
  id: string;
  name: string;
  status: 'valid' | 'missing' | 'expired' | 'pending';
  url?: string;
  expirationDate?: string;
  isRequired?: boolean;
}

export interface PropertyInspectionImage {
  url: string;
  name: string;
}

export interface PropertyInspection {
  id: string;
  date: string;
  type: 'move_in' | 'move_out' | 'routine';
  status: 'draft' | 'completed';
  notes: string;
  images: PropertyInspectionImage[];
}

export interface Property {
  id?: string;
  name: string;
  address: string;
  status: PropertyStatus;
  rentValue: number; // Keeping for backward compatibility temporarily
  paymentDay?: number; // Keeping for backward compatibility temporarily
  currentTenantId?: string;
  ownerId: string;
  chargeLateFees?: boolean;
  lateFeePenalty?: number;
  lateFeeDaily?: number;
  lateFeeType?: 'percentage' | 'fixed';
  documents?: PropertyDocument[];
  createdAt?: any;
  updatedAt?: any;
  renovationJustification?: string;
  renovationEstimatedTime?: string;
  renovationDescription?: string;
  renovationImages?: PropertyInspectionImage[];
  inspections?: PropertyInspection[];
  allowPets?: boolean;
  allowSmoking?: boolean;
  maxResidents?: number;
  rules?: string;
  alerts?: string;
}

export interface StagingRecord {
  id?: string;
  rawData: string;
  parsedData?: any;
  status: 'pending' | 'imported' | 'archived';
  dataType: 'property_tenant' | 'financial' | 'other';
  originalSource: string;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Tenant {
  id?: string;
  name: string;
  cpf: string;
  contact: string;
  secondaryContact?: string;
  additionalResidents?: { name: string; relation: string; cpf?: string; age?: string }[];
  status: TenantStatus;
  rating?: number;
  observations?: string;
  contractFile?: string;
  aiContractText?: string;
  propertyId?: string;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
  initialPaymentType?: 'deposit' | 'rent';
  depositValue?: number;
  depositInstallments?: number;
  depositDueDate?: string;
  depositBalance?: number;
  depositDeductions?: { id: string; amount: number; reason: string; date: string }[];
  depositReturnedAmount?: number;
  depositDay?: number;
  evidenceLocation?: string;
  evidenceName?: string;
  thumbnailLink?: string;
  _createRefundReminder?: boolean;
  spouse?: string;
  children?: string;
  pets?: string;
  hasVehicles?: boolean;
  vehicleDetails?: string;
  isSmoker?: boolean;
  residentCount?: number;
  rentValue?: number;
  paymentDay?: number;
  chargeLateFees?: boolean;
  lateFeePenalty?: number;
  lateFeeDaily?: number;
  lateFeeType?: 'percentage' | 'fixed';
  leaseDurationMonths?: number;
  firstRentDueDate?: string;
}

export interface Contract {
  id?: string;
  tenantId: string;
  propertyId: string;
  startDate: string;
  endDate?: string;
  leaseDurationMonths?: number;
  rentValue: number;
  paymentDay: number;
  depositValue?: number;
  depositInstallments?: number;
  depositDay?: number;
  chargeLateFees: boolean;
  lateFeePenalty?: number;
  lateFeeDaily?: number;
  lateFeeType?: 'percentage' | 'fixed';
  observations?: string;
  contractFile?: string;
  evidenceName?: string;
  evidenceLocation?: string;
  thumbnailLink?: string;
  aiContractText?: string;
  status: 'active' | 'ended' | 'broken';
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Agreement {
  id?: string;
  tenantId: string;
  propertyId: string;
  description: string;
  totalAmount: number;
  installmentAmount: number;
  durationMonths: number;
  startDate: string;
  status: 'active' | 'archived' | 'deleted';
  justification?: string;
  evidence?: string;
  evidenceName?: string;
  evidenceLocation?: string;
  thumbnailLink?: string;
  chargeLateFees?: boolean;
  lateFeePenalty?: number;
  lateFeeDaily?: number;
  lateFeeType?: 'percentage' | 'fixed';
  ownerId: string;
  propertyNameSnapshot?: string;
  tenantNameSnapshot?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Expense {
  id?: string;
  propertyId: string;
  description: string;
  amount: number;
  date: string;
  type: ExpenseType;
  evidence?: string;
  evidenceName?: string;
  evidenceLocation?: string;
  thumbnailLink?: string;
  ownerId: string;
  propertyNameSnapshot?: string;
  createdAt?: any;
}

export interface Payment {
  id?: string;
  propertyId: string;
  tenantId: string;
  amount: number;
  paidAmount?: number;
  dueDate: string;
  originalDueDate?: string;
  paidDate?: string;
  status: PaymentStatus;
  interestAmount?: number;
  waivedLateFee?: boolean;
  waivedLateFeeReason?: string;
  receiptUrl?: string;
  evidenceName?: string;
  evidenceLocation?: string;
  thumbnailLink?: string;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
  type?: 'rent' | 'deposit' | 'agreement';
  installmentNumber?: number;
  totalInstallments?: number;
  depositStatus?: DepositStatus;
  depositUsage?: DepositUsage[];
  originalDepositAmount?: number;
  description?: string;
  observations?: string;
  revertReason?: string;
  agreementId?: string;
  propertyNameSnapshot?: string;
  tenantNameSnapshot?: string;
}

export interface Ticket {
  id?: string;
  propertyId: string;
  tenantId: string;
  categoryId?: string;
  category?: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: any;
  updatedAt: any;
  slaDays: number;
  ownerId: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
