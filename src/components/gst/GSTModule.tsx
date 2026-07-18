import React, { useState } from 'react';
import { BusinessProfile, Client, InventoryItem, Invoice, Expense, RecurringTemplate, Receipt } from '@/lib/types';
import { InvoiceGenerator } from './InvoiceGenerator';
import { InvoicePreview } from './InvoicePreview';
import { ClientsView } from './ClientsView';
import { InventoryView } from './InventoryView';
import { ExpenseTracker } from './ExpenseTracker';
import { RecurringInvoices } from './RecurringInvoices';
import { ReceiptVoucher } from './ReceiptVoucher';
import { ReportsView } from './ReportsView';
import { GSTReturns } from './GSTReturns';
import { SettingsView } from './SettingsView';
import { VendorPayments } from './VendorPayments';
import { FileText, Users, PackageSearch, Receipt as ReceiptIcon, CalendarClock, FileDown, LineChart, Settings } from 'lucide-react';

interface Props {
  businessProfile: BusinessProfile;
  setBusinessProfile?: (p: BusinessProfile) => void;
  clients: Client[]; setClients: (c: Client[]) => void;
  inventory: InventoryItem[]; setInventory: (i: InventoryItem[]) => void;
  invoices: Invoice[]; setInvoices: (i: Invoice[]) => void;
  expenses: Expense[]; setExpenses: (e: Expense[]) => void;
  recurringTemplates: RecurringTemplate[]; setRecurringTemplates: (r: RecurringTemplate[]) => void;
  receipts: Receipt[]; setReceipts: (r: Receipt[]) => void;
  accounts?: import('@/lib/types').Account[];
  transactions?: import('@/lib/types').Transaction[];
  setTransactions?: (t: import('@/lib/types').Transaction[]) => void;
}

export function GSTModule({ 
  businessProfile, setBusinessProfile,
  clients, setClients,
  inventory, setInventory,
  invoices, setInvoices,
  expenses, setExpenses,
  recurringTemplates, setRecurringTemplates,
  receipts, setReceipts,
  accounts = [],
  transactions = [],
  setTransactions
}: Props) {
  const [activeTab, setActiveTab] = useState<
    'generator' | 'preview' | 'clients' | 'inventory' | 'expenses' | 'vendor_payments' | 'recurring' | 'receipts' | 'reports' | 'returns' | 'settings'
  >('generator');

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const handleEditInvoice = (id: string) => {
    setEditingInvoiceId(id);
    setActiveTab('generator');
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      setInvoices(invoices.filter(i => i.id !== id));
    }
  };

  const tabs = [
    { id: 'generator', label: 'Sale Invoice', icon: FileText },
    { id: 'clients', label: 'Clients & Vendors', icon: Users },
    { id: 'inventory', label: 'Inventory', icon: PackageSearch },
    { id: 'expenses', label: 'Expenses', icon: ReceiptIcon },
    { id: 'vendor_payments', label: 'Payment to Vendor', icon: ReceiptIcon },
    { id: 'recurring', label: 'Recurring', icon: CalendarClock },
    { id: 'receipts', label: 'Receipts', icon: FileDown },
    { id: 'reports', label: 'Reports', icon: LineChart },
    { id: 'returns', label: 'GST Returns', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Bar */}
      <div className="bg-white/50 backdrop-blur-sm border rounded-xl p-2 flex gap-1 overflow-x-auto print:hidden shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (activeTab === 'preview' && tab.id === 'generator');
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'generator') setEditingInvoiceId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'generator' && <InvoiceGenerator businessProfile={businessProfile} invoices={invoices} setInvoices={setInvoices} clients={clients} setClients={setClients} inventory={inventory} setInventory={setInventory} setActiveTab={(t) => setActiveTab(t as any)} editingInvoiceId={editingInvoiceId} setEditingInvoiceId={setEditingInvoiceId} recurringTemplates={recurringTemplates} setRecurringTemplates={setRecurringTemplates} />}
        {activeTab === 'preview' && <InvoicePreview businessProfile={businessProfile} invoices={invoices} />}
        {activeTab === 'clients' && <ClientsView clients={clients} setClients={setClients} />}
        {activeTab === 'inventory' && <InventoryView inventory={inventory} setInventory={setInventory} />}
        {activeTab === 'expenses' && <ExpenseTracker expenses={expenses} setExpenses={setExpenses} />}
        {activeTab === 'vendor_payments' && <VendorPayments accounts={accounts} transactions={transactions} setTransactions={setTransactions} clients={clients} />}
        {activeTab === 'recurring' && <RecurringInvoices recurringTemplates={recurringTemplates} setRecurringTemplates={setRecurringTemplates} />}
        {activeTab === 'receipts' && <ReceiptVoucher receipts={receipts} setReceipts={setReceipts} clients={clients} invoices={invoices} />}
        {activeTab === 'reports' && <ReportsView invoices={invoices} expenses={expenses} clients={clients} transactions={transactions} onEditInvoice={handleEditInvoice} onDeleteInvoice={handleDeleteInvoice} />}
        {activeTab === 'returns' && <GSTReturns invoices={invoices} expenses={expenses} businessProfile={businessProfile} />}
        {activeTab === 'settings' && <SettingsView businessProfile={businessProfile} setBusinessProfile={setBusinessProfile} />}
      </div>
    </div>
  );
}
