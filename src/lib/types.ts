export type AccountType = 'Cash' | 'Bank' | 'Savings' | 'Business' | 'Other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  createdAt: number;
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
}
