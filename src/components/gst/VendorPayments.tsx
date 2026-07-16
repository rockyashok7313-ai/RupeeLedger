import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, Plus, Trash2 } from 'lucide-react';
import { Transaction, Account, Client } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  accounts: Account[];
  transactions: Transaction[];
  setTransactions?: (t: Transaction[]) => void;
  clients: Client[];
}

export function VendorPayments({ accounts, transactions, setTransactions, clients }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newPayment, setNewPayment] = useState<Partial<Transaction>>({
    type: 'Debit',
  });

  const vendorPayments = transactions.filter(t => t.vendorId != null);
  const vendors = clients.filter(c => c.type === 'vendor' || c.type === 'both');

  const handleAddPayment = () => {
    if (!newPayment.accountId || !newPayment.amount || !newPayment.vendorId) return alert('Account, Amount, and Vendor are required');
    const payment: Transaction = {
      id: uuidv4(),
      accountId: newPayment.accountId,
      type: 'Debit',
      amount: Number(newPayment.amount),
      description: newPayment.description || 'Payment to Vendor',
      date: newPayment.date || Date.now(),
      balanceAfter: 0, // Calculated correctly by App.tsx when syncing, or we just leave as 0 here temporarily
      vendorId: newPayment.vendorId,
    };

    if (setTransactions) {
      setTransactions([...transactions, payment]);
    }
    setNewPayment({ type: 'Debit' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      if (setTransactions) {
        setTransactions(transactions.filter(t => t.id !== id));
      }
    }
  };

  const filteredPayments = vendorPayments.filter(p => {
    const v = clients.find(c => c.id === p.vendorId);
    return v?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           p.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="premium-heading flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" /> Vendor Payments
          </CardTitle>
          <CardDescription>Record outgoing payments to your vendors</CardDescription>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Record Payment
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input 
            placeholder="Search payments by vendor or description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md" 
          />
        </div>

        {isAdding && (
          <div className="bg-gray-50 p-4 rounded-lg border mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Vendor *</label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={newPayment.vendorId || ''}
                  onChange={e => setNewPayment({...newPayment, vendorId: e.target.value})}
                >
                  <option value="">Select Vendor...</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Payment Account *</label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={newPayment.accountId || ''}
                  onChange={e => setNewPayment({...newPayment, accountId: e.target.value})}
                >
                  <option value="">Select Account...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Amount *</label>
                <Input type="number" value={newPayment.amount || ''} onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} placeholder="0.00" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                <Input value={newPayment.description || ''} onChange={e => setNewPayment({...newPayment, description: e.target.value})} placeholder="Payment for Inv #..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAddPayment}>Save Payment</Button>
            </div>
          </div>
        )}

        {filteredPayments.length === 0 ? (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            No vendor payments found.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 font-medium text-gray-500">Date</th>
                  <th className="p-3 font-medium text-gray-500">Vendor</th>
                  <th className="p-3 font-medium text-gray-500">Account</th>
                  <th className="p-3 font-medium text-gray-500">Description</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Amount</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPayments.map((payment) => {
                  const vendor = clients.find(c => c.id === payment.vendorId);
                  const account = accounts.find(a => a.id === payment.accountId);
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">{new Date(payment.date).toLocaleDateString()}</td>
                      <td className="p-3 font-medium">{vendor?.name || 'Unknown Vendor'}</td>
                      <td className="p-3">{account?.name || 'Unknown Account'}</td>
                      <td className="p-3 text-gray-500">{payment.description}</td>
                      <td className="p-3 text-right font-medium text-red-600">₹{payment.amount.toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(payment.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
