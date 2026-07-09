import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, Plus, Trash2 } from 'lucide-react';
import { Receipt } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  receipts?: Receipt[];
  setReceipts?: (r: Receipt[]) => void;
}

export function ReceiptVoucher({ receipts = [], setReceipts }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newReceipt, setNewReceipt] = useState<Partial<Receipt>>({
    paymentMethod: 'Bank Transfer'
  });

  const handleAddReceipt = () => {
    if (!newReceipt.invoiceId || !newReceipt.amount) return alert('Invoice ID and Amount are required');
    const rec: Receipt = {
      id: uuidv4(),
      invoiceId: newReceipt.invoiceId || '',
      amount: Number(newReceipt.amount),
      date: newReceipt.date || Date.now(),
      paymentMethod: newReceipt.paymentMethod || 'Bank Transfer',
      createdAt: Date.now(),
    };
    if (setReceipts) {
      setReceipts([...receipts, rec]);
    }
    setNewReceipt({ paymentMethod: 'Bank Transfer' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this receipt?')) {
      if (setReceipts) {
        setReceipts(receipts.filter(r => r.id !== id));
      }
    }
  };

  const filteredReceipts = receipts.filter(r => 
    r.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="premium-heading flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" /> Payment Receipts
          </CardTitle>
          <CardDescription>Generate and track payment receipts for your invoices</CardDescription>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Record Payment
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input 
            placeholder="Search by Invoice ID or payment method..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md" 
          />
        </div>

        {isAdding && (
          <div className="bg-gray-50 p-4 rounded-lg border mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Invoice ID *</label>
                <Input value={newReceipt.invoiceId || ''} onChange={e => setNewReceipt({...newReceipt, invoiceId: e.target.value})} placeholder="INV-2024-001" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Amount Received (₹) *</label>
                <Input type="number" value={newReceipt.amount || ''} onChange={e => setNewReceipt({...newReceipt, amount: parseFloat(e.target.value)})} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Payment Method</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newReceipt.paymentMethod}
                  onChange={e => setNewReceipt({...newReceipt, paymentMethod: e.target.value})}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAddReceipt}>Save Receipt</Button>
            </div>
          </div>
        )}

        {filteredReceipts.length === 0 ? (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            No receipts found.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 font-medium text-gray-500">Date</th>
                  <th className="p-3 font-medium text-gray-500">Invoice ID</th>
                  <th className="p-3 font-medium text-gray-500">Method</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Amount</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredReceipts.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3 text-gray-600">{new Date(rec.date).toLocaleDateString()}</td>
                    <td className="p-3 font-medium">{rec.invoiceId}</td>
                    <td className="p-3 text-gray-600">{rec.paymentMethod}</td>
                    <td className="p-3 text-right font-medium text-green-600">₹{rec.amount.toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(rec.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
