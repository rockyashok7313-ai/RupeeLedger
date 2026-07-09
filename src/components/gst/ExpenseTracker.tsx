import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, Plus, Trash2 } from 'lucide-react';
import { Expense } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  expenses?: Expense[];
  setExpenses?: (e: Expense[]) => void;
}

export function ExpenseTracker({ expenses = [], setExpenses }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    cgst: 0,
    sgst: 0,
    igst: 0
  });

  const handleAddExpense = () => {
    if (!newExpense.vendorName || !newExpense.amount) return alert('Vendor name and amount are required');
    const exp: Expense = {
      id: uuidv4(),
      vendorName: newExpense.vendorName || '',
      gstin: newExpense.gstin || '',
      date: newExpense.date || Date.now(),
      amount: Number(newExpense.amount),
      cgst: Number(newExpense.cgst || 0),
      sgst: Number(newExpense.sgst || 0),
      igst: Number(newExpense.igst || 0),
      category: newExpense.category || 'General',
      createdAt: Date.now(),
    };
    if (setExpenses) {
      setExpenses([...expenses, exp]);
    }
    setNewExpense({ cgst: 0, sgst: 0, igst: 0 });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      if (setExpenses) {
        setExpenses(expenses.filter(e => e.id !== id));
      }
    }
  };

  const filteredExpenses = expenses.filter(e => 
    e.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="premium-heading flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" /> Expense & ITC Tracker
          </CardTitle>
          <CardDescription>Log business expenses to claim Input Tax Credit</CardDescription>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Log Expense
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input 
            placeholder="Search expenses by vendor or category..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md" 
          />
        </div>

        {isAdding && (
          <div className="bg-gray-50 p-4 rounded-lg border mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Vendor Name *</label>
                <Input value={newExpense.vendorName || ''} onChange={e => setNewExpense({...newExpense, vendorName: e.target.value})} placeholder="Office Supplies Co." />
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Vendor GSTIN</label>
                <Input value={newExpense.gstin || ''} onChange={e => setNewExpense({...newExpense, gstin: e.target.value})} placeholder="29ABCDE1234F1Z5" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Amount (₹) *</label>
                <Input type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">CGST (₹)</label>
                <Input type="number" value={newExpense.cgst || ''} onChange={e => setNewExpense({...newExpense, cgst: parseFloat(e.target.value)})} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">SGST (₹)</label>
                <Input type="number" value={newExpense.sgst || ''} onChange={e => setNewExpense({...newExpense, sgst: parseFloat(e.target.value)})} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">IGST (₹)</label>
                <Input type="number" value={newExpense.igst || ''} onChange={e => setNewExpense({...newExpense, igst: parseFloat(e.target.value)})} placeholder="0.00" />
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
                <Input value={newExpense.category || ''} onChange={e => setNewExpense({...newExpense, category: e.target.value})} placeholder="Office Supplies" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAddExpense}>Save Expense</Button>
            </div>
          </div>
        )}

        {filteredExpenses.length === 0 ? (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            No expenses logged yet.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 font-medium text-gray-500">Date</th>
                  <th className="p-3 font-medium text-gray-500">Vendor / Category</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Amount</th>
                  <th className="p-3 font-medium text-gray-500 text-right">ITC (GST)</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3 text-gray-600">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{exp.vendorName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{exp.category} {exp.gstin && `• GSTIN: ${exp.gstin}`}</div>
                    </td>
                    <td className="p-3 text-right font-medium">₹{exp.amount.toFixed(2)}</td>
                    <td className="p-3 text-right text-green-600 font-medium">
                      +₹{(exp.cgst + exp.sgst + exp.igst).toFixed(2)}
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
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
