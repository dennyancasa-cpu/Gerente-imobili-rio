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

export interface Property {
  id?: string;
  name: string;
  address: string;
  status: PropertyStatus;
  rentValue: number;
  paymentDay?: number;
  currentTenantId?: string;
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
  status: TenantStatus;
  rating?: number;
  observations?: string;
  contractFile?: string;
  propertyId?: string;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
  initialPaymentType?: 'deposit' | 'rent';
  depositValue?: number;
  depositInstallments?: number;
  depositDay?: number;
  evidenceLocation?: string;
  evidenceName?: string;
  thumbnailLink?: string;
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
  ownerId: string;
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
  createdAt?: any;
}

export interface Payment {
  id?: string;
  propertyId: string;
  tenantId: string;
  amount: number;
  paidAmount?: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  interestAmount?: number;
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
