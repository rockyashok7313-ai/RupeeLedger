export type AccountType = 'Cash' | 'Bank' | 'Savings' | 'Business' | 'Other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  createdAt: number;
  address?: string;
  gstin?: string;
  phone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankAccountName?: string;
}

export type TransactionType = 'Credit' | 'Debit';

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: number;
  balanceAfter: number;
  gstEnabled?: boolean;
  gstRate?: number;
  gstType?: 'Intra-State' | 'Inter-State' | 'CGST+SGST' | 'IGST' | '';
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  invoiceNumber?: string;
  customerName?: string;
  customerGstin?: string;
  gstCalculationType?: 'excluding' | 'including';
  shippingAddress?: string;
  hsnCode?: string;
  customerAddress?: string;
  vendorId?: string;
  agentId?: string;
}

export interface InvoiceSettings {
  theme: 'Classic' | 'Modern' | 'Minimal';
  color: string;
  fontScale: number;
  showLogo: boolean;
  showHsn: boolean;
  showBankDetails: boolean;
  showAmountInWords: boolean;
  defaultPrefix?: string;
  defaultTerms?: string;
  labels: {
    title: string;
    billTo: string;
    itemDesc: string;
  };
}

export interface BusinessProfile {
  companyName: string;
  address: string;
  gstin: string;
  phone: string;
  printFooter: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
  invoiceSettings?: InvoiceSettings;
  logoBase64?: string;
}

export interface Subscription {
  status: 'active' | 'expired';
  plan: string;
  price: string;
  tier?: 'FREE' | 'MONTHLY' | 'YEARLY';
  renewalDate: string;
  licenseKey: string;
  /** Timestamp (ms) when plan was purchased — used for guest 7-day grace period. */
  purchasedAt?: number;
}

export interface SecuritySettings {
  pinEnabled: boolean;
  pinCode: string;
  hashedPinCode?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  authMethod: 'google' | 'phone' | 'email' | 'emailOtp' | 'guest' | 'whatsapp';
  createdAt: number;
}

export interface Client {
  id: string;
  name: string;
  gstin: string;
  address: string;
  phone: string;
  createdAt: number;
  type?: 'client' | 'vendor' | 'agent' | 'both';
}

export interface InventoryItem {
  id: string;
  name: string;
  hsnCode: string;
  basePrice: number;
  taxRate: number;
  currentStock: number;
  createdAt: number;
  unit?: string; // UQC (Unit Quantity Code)
}

export interface InvoiceItem {
  id: string;
  inventoryId?: string;
  name: string;
  quantity: number;
  rate: number;
  taxPercent: number;
  amount: number;
  hsnCode?: string;
  unit?: string; // e.g. kg, ltr, pcs
  pieceNo?: string;
}

export type InvoiceType = 'Tax Invoice' | 'Proforma' | 'Bill of Supply' | 'Credit Note' | 'Delivery Challan';

export interface Invoice {
  id: string;
  invoiceNumber?: string;
  type?: InvoiceType; // Default to Tax Invoice if missing
  prefix?: string;
  orderNo?: string;
  orderDate?: number;
  financialYear?: string;
  currency?: string; // e.g., 'INR', 'USD'
  exchangeRate?: number;
  clientId: string;
  clientName: string;
  date: number;
  dueDate: number;
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: number;
  customerAddress?: string;
  customerGstin?: string;
  vehicleNo?: string;
  gstCalculationType?: 'including' | 'excluding';
  gstType?: 'CGST+SGST' | 'IGST';
  terms?: string; // Rich-text terms
  tcsAmount?: number;
  deliveryChallanNo?: string;
  agentId?: string;
  agentName?: string;
  agentCommissionPercent?: number;
  agentCommissionAmount?: number;
  roundoff?: number;
}

export interface Expense {
  id: string;
  vendorName: string;
  vendorId?: string;
  gstin: string;
  date: number;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  category: string;
  createdAt: number;
}

export interface RecurringTemplate {
  id: string;
  clientId: string;
  interval: 'weekly' | 'monthly' | 'yearly';
  nextRun: number;
  items: InvoiceItem[];
  active: boolean;
  createdAt: number;
}

export interface Receipt {
  id: string;
  invoiceId: string;
  amount: number;
  date: number;
  paymentMethod: string;
  createdAt: number;
}
