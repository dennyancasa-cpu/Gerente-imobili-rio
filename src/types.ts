export type PropertyStatus = "vacant" | "rented" | "renovation";
export type TenantStatus = "waiting" | "allocated" | "archived";
export type ExpenseType = "renovation" | "repair" | "tax" | "fine" | "other";
export type PaymentStatus =
  | "pending"
  | "paid"
  | "late"
  | "cancelled"
  | "partial";
export type DepositStatus =
  | "pending"
  | "received"
  | "partially_used"
  | "refunded";

export interface AlertSettings {
  notifyUpcomingRents: boolean;
  upcomingRentsDays: number;
  notifyContractsExpiring: boolean;
  contractsExpiringDays: number;
  notifyLatePayments: boolean;
  notifyExpiredDocuments: boolean;
  notifyTickets: boolean;
  ticketsSLADaysWarning?: number;
  notifyVacantProperties?: boolean;

  vacantPropertiesDays?: number;
  notifyPendingInspections?: boolean;
  notifyUnallocatedTenants?: boolean;
  forceShowUntilResolved?: boolean;
}

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
  status: "valid" | "missing" | "expired" | "pending";
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
  type: "move_in" | "move_out" | "routine";
  status: "draft" | "completed";
  notes: string;
  images: PropertyInspectionImage[];
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
  marketValue?: number;
  condoFee?: number;
  iptuValue?: number;
  pixKey?: string;
  chargeLateFees?: boolean;
  lateFeePenalty?: number;
  lateFeeDaily?: number;
  lateFeeType?: "percentage" | "fixed";
  
  // Location fields
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;

  // Physical characteristics
  propertyType?: string;
  usableArea?: number;
  totalArea?: number;
  bedrooms?: number;
  suites?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  kitchenSize?: string;
  hasLivingRoom?: boolean;
  livingRoomSize?: string;
  laundryType?: "interna" | "externa" | "none";
  hasClotheslineArea?: boolean;
  description?: string;

  // Amenities
  isFurnished?: boolean;
  allowPets?: boolean;
  allowSmoking?: boolean;
  maxResidents?: number;
  condoAmenities?: string[];

  // Control & Metadata
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;

  // Documents & Renovation
  documents?: PropertyDocument[];
  renovationJustification?: string;
  renovationEstimatedTime?: string;
  renovationEndDate?: string;
  renovationDescription?: string;
  renovationImages?: PropertyInspectionImage[];
  inspections?: PropertyInspection[];
  rules?: string;
  alerts?: string;
  secondOwner?: SecondOwner;
  hasSecondOwner?: boolean;
}

export interface StagingRecord {
  id?: string;
  rawData: string;
  parsedData?: any;
  status: "pending" | "imported" | "archived";
  dataType: "property_tenant" | "financial" | "other";
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
  accessPassword?: string;
  additionalResidents?: {
    name: string;
    relation: string;
    cpf?: string;
    age?: string;
  }[];
  status: TenantStatus;
  rating?: number;
  observations?: string;
  contractFile?: string;
  aiContractText?: string;
  propertyId?: string;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
  initialPaymentType?: "deposit" | "rent";
  depositValue?: number;
  depositInstallments?: number;
  depositDueDate?: string;
  depositBalance?: number;
  depositDeductions?: {
    id: string;
    amount: number;
    reason: string;
    date: string;
  }[];
  depositReturnedAmount?: number;
  depositDay?: number;
  evidenceLocation?: string;
  evidenceName?: string;
  thumbnailLink?: string;
  _createRefundReminder?: boolean;
  spouse?: string;
  children?: string;
  hasPets?: boolean;
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
  lateFeeType?: "percentage" | "fixed";
  leaseDurationMonths?: number;
  firstRentDueDate?: string;
  startDate?: string;
  endDate?: string;
  secondOwner?: SecondOwner;
  hasSecondOwner?: boolean;
  specialClauses?: string[];
}

export interface SecondOwner {
  name: string;
  cpfCnpj?: string;
  rg?: string;
  qualification?: string;
  address?: string;
  phone?: string;
  email?: string;
  pixKey?: string;
  sharePercentage?: number;
}

export interface LandlordProfile {
  name: string;
  cpfCnpj: string;
  rg?: string;
  qualification?: string;
  address?: string;
  phone?: string;
  email?: string;
  pixKey?: string;
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
  lateFeeType?: "percentage" | "fixed";
  readjustmentIndex?: "IPCA" | "IGPM" | "none";
  lastReadjustmentDate?: string;
  observations?: string;
  contractFile?: string;
  evidenceName?: string;
  evidenceLocation?: string;
  thumbnailLink?: string;
  aiContractText?: string;
  status: "active" | "ended" | "broken" | "archived";
  ownerId: string;
  landlordName?: string;
  landlordCpf?: string;
  landlordRg?: string;
  landlordQualification?: string;
  landlordAddress?: string;
  landlordPhone?: string;
  landlordEmail?: string;
  secondOwner?: SecondOwner;
  hasSecondOwner?: boolean;
  specialClauses?: string[];
  historyStatus?: 'all_paid' | 'has_pending' | 'unconfirmed';
  priorMonthsCount?: number;
  priorMonthsTotalPaid?: number;
  priorMonthsTotalPending?: number;
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
  status: "active" | "archived" | "deleted";
  justification?: string;
  evidence?: string;
  evidenceName?: string;
  evidenceLocation?: string;
  thumbnailLink?: string;
  chargeLateFees?: boolean;
  lateFeePenalty?: number;
  lateFeeDaily?: number;
  lateFeeType?: "percentage" | "fixed";
  ownerId: string;
  propertyNameSnapshot?: string;
  tenantNameSnapshot?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ExpenseAttachment {
  url: string;
  name: string;
  thumbnailLink?: string;
}

export interface SubExpenseItem {
  description: string;
  amount: number;
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
  attachments?: ExpenseAttachment[]; // Support for multiple attachments
  items?: SubExpenseItem[]; // Support for breakdown of sub-expenses
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
  type?: "rent" | "deposit" | "agreement";
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
  status: "open" | "in_progress" | "resolved" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: any;
  updatedAt: any;
  slaDays: number;
  ownerId: string;
}

export interface CustomAlert {
  id?: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  type: "critical" | "warning" | "info";
  propertyId?: string;
  tenantId?: string;
  ownerId: string;
  createdAt: any;
  status?: "active" | "resolved";
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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
  };
}

export interface StorageItem {
  id: string;
  name: string;
  description?: string;
  location?: string;
  quantity: number;
  cost: number;
  dateAdded?: string;
  // Space-specific structured metadata
  garageSpots?: number;
  garageSpotNumbers?: string;
  storedVehicle?: string;
  sector?: string;
  palletOrShelf?: string;
  boxOrContainer?: string;
  volumeM3?: number;
  // Movement & Inventory Attributes
  status?: "in_stock" | "out" | "sold" | "returned";
  condition?: "new" | "good" | "fair" | "poor" | "expiring_soon" | "expired";
  category?: string;
  expirationDate?: string;
  photoUrl?: string;
  takenBy?: string;
  movementDate?: string;
  expectedReturnDate?: string;
  soldPrice?: number;
}

export interface StorageSpace {
  id?: string;
  name: string;
  spaceType?: "warehouse" | "room" | "cabinet" | "drawer" | "space" | "garage" | "storage_room" | "other";
  address?: string;
  monthlyCost: number;
  dueDay: number;
  propertyId?: string;
  ownerId: string;
  contractFile?: string;
  evidenceName?: string;
  evidenceLocation?: string;
  items?: StorageItem[];
  createdAt?: any;
  updatedAt?: any;
  // Tenant contract properties for Storage Space (as requested by user)
  contractStartDate?: string;
  contractEndDate?: string;
  landlordName?: string;
  landlordContact?: string;
  hasDeposit?: boolean;
  depositValue?: number;
  depositRefundStatus?: "pending" | "refunded" | "partially_used" | "lost";
  depositPaymentType?: "cash" | "installments";
  depositInstallments?: number;
  depositIsPaid?: boolean;
  depositPaymentFile?: string;
  depositPaymentFileName?: string;
  rescissionFine?: number;
  readjustmentIndex?: string;
  paymentMethod?: string;
  billings?: StorageBilling[];
  status?: "active" | "archived";
}

export interface StorageBilling {
  id: string;
  dueDate: string; // ISO date string yyyy-MM-dd
  amount: number;
  paidAmount: number;
  status: "paid" | "unpaid" | "partial";
  paymentDate?: string;
  notes?: string;
  confirmedAt?: string;
  fineAmount?: number; // Multa ou juros
}
