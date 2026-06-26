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
  // GST & Invoice extensions
  gstEnabled?: boolean;
  gstRate?: number;
  gstType?: 'CGST+SGST' | 'IGST';
  cgst?: number;
  sgst?: number;
  igst?: number;
  taxableAmount?: number;
  invoiceNumber?: string;
  customerName?: string;
  customerGstin?: string;
  gstCalculationType?: 'including' | 'excluding';
  hsnCode?: string;
  customerAddress?: string;
}

export interface BusinessProfile {
  companyName: string;
  address: string;
  gstin: string;
  phone: string;
  printFooter: string;
}

export interface Subscription {
  status: 'active' | 'expired';
  plan: string;
  price: string;
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
