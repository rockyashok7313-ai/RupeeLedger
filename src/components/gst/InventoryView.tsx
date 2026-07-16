import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PackageSearch, Plus, Trash2 } from 'lucide-react';
import { InventoryItem } from '@/lib/types';
import { UQC_LIST } from '@/lib/invoiceUtils';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  inventory?: InventoryItem[];
  setInventory?: (inventory: InventoryItem[]) => void;
}

export function InventoryView({ inventory = [], setInventory }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    taxRate: 18,
    currentStock: 0,
    unit: 'NOS-NUMBERS'
  });

  const handleAddItem = () => {
    if (!newItem.name || !newItem.basePrice) return alert('Name and Price are required');
    const item: InventoryItem = {
      id: uuidv4(),
      name: newItem.name || '',
      hsnCode: newItem.hsnCode || '',
      basePrice: Number(newItem.basePrice),
      taxRate: Number(newItem.taxRate || 0),
      currentStock: Number(newItem.currentStock || 0),
      unit: newItem.unit || 'NOS-NUMBERS',
      createdAt: Date.now(),
    };
    if (setInventory) {
      setInventory([...inventory, item]);
    }
    setNewItem({ taxRate: 18, currentStock: 0, unit: 'NOS-NUMBERS' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      if (setInventory) {
        setInventory(inventory.filter(i => i.id !== id));
      }
    }
  };

  const filteredItems = inventory.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.hsnCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="premium-heading flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-primary" /> Product & Inventory
          </CardTitle>
          <CardDescription>Manage your stock, HSN codes, and pricing</CardDescription>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input 
            placeholder="Search items by name or HSN..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md" 
          />
        </div>

        {isAdding && (
          <div className="bg-gray-50 p-4 rounded-lg border mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Item Name / Description *</label>
                <Input value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Laptop Pro 15-inch" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">HSN/SAC Code</label>
                <Input value={newItem.hsnCode || ''} onChange={e => setNewItem({...newItem, hsnCode: e.target.value})} placeholder="8471" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Unit (UQC) *</label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={newItem.unit || 'NOS-NUMBERS'}
                  onChange={e => setNewItem({...newItem, unit: e.target.value})}
                >
                  {UQC_LIST.map(uqc => (
                    <option key={uqc} value={uqc}>{uqc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Base Price (₹) *</label>
                <Input type="number" value={newItem.basePrice || ''} onChange={e => setNewItem({...newItem, basePrice: parseFloat(e.target.value)})} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">GST Rate (%)</label>
                <Input type="number" value={newItem.taxRate || ''} onChange={e => setNewItem({...newItem, taxRate: parseFloat(e.target.value)})} placeholder="18" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Initial Stock</label>
                <Input type="number" value={newItem.currentStock || ''} onChange={e => setNewItem({...newItem, currentStock: parseInt(e.target.value)})} placeholder="0" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAddItem}>Save Item</Button>
            </div>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            No items in inventory.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 font-medium text-gray-500">Item Details</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Stock</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Base Price</th>
                  <th className="p-3 font-medium text-gray-500 text-right">GST Rate</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">HSN: {item.hsnCode || 'N/A'} • {item.unit || 'NOS'}</div>
                    </td>
                    <td className="p-3 text-right font-medium">{item.currentStock} {item.unit ? item.unit.split('-')[0] : ''}</td>
                    <td className="p-3 text-right">₹{item.basePrice.toFixed(2)}</td>
                    <td className="p-3 text-right text-gray-500">{item.taxRate}%</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
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
