import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash, FileText, CheckCircle2 } from 'lucide-react';
import { BusinessProfile, Client, InventoryItem, Invoice, InvoiceItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  businessProfile: BusinessProfile;
  clients: Client[];
  inventory: InventoryItem[];
  invoices: Invoice[];
  setInvoices: (i: Invoice[]) => void;
  setActiveTab: (t: 'preview' | string) => void;
}

export function InvoiceGenerator({ businessProfile, clients, inventory, invoices, setInvoices, setActiveTab }: Props) {
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [gstCalculationType, setGstCalculationType] = useState<'including' | 'excluding'>('excluding');
  const [gstType, setGstType] = useState<'CGST+SGST' | 'IGST'>('CGST+SGST');
  const [items, setItems] = useState<Partial<InvoiceItem>[]>([{ name: '', hsnCode: '', quantity: 1, rate: 0, taxPercent: 18 }]);
  
  const handleAddItem = () => {
    setItems([...items, { name: '', hsnCode: '', quantity: 1, rate: 0, taxPercent: 18 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setClientId(id);
    const client = clients.find(c => c.id === id);
    if (client) {
      setClientName(client.name);
      setCustomerAddress(client.address || '');
      setCustomerGstin(client.gstin || '');
    }
  };

  const handleInventorySelect = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const invItem = inventory.find(i => i.id === id);
    if (invItem) {
      handleItemChange(index, 'name', invItem.name);
      handleItemChange(index, 'hsnCode', invItem.hsnCode || '');
      handleItemChange(index, 'rate', invItem.basePrice);
      handleItemChange(index, 'taxPercent', invItem.taxRate);
      handleItemChange(index, 'inventoryId', invItem.id);
    }
  };

  const handleSaveInvoice = () => {
    if (!clientName) return alert('Please enter a client name.');
    
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const validatedItems: InvoiceItem[] = items.map(item => {
      const qty = item.quantity || 1;
      const rate = item.rate || 0;
      const taxPercent = item.taxPercent || 0;
      
      let itemAmt = qty * rate;
      let itemTax = 0;

      if (gstCalculationType === 'including') {
        const totalAmt = itemAmt;
        itemAmt = Math.round((totalAmt / (1 + taxPercent / 100)) * 100) / 100;
        itemTax = Math.round((totalAmt - itemAmt) * 100) / 100;
      } else {
        itemTax = Math.round((itemAmt * (taxPercent / 100)) * 100) / 100;
      }
      
      subtotal += itemAmt;

      if (gstType === 'CGST+SGST') {
        cgst += itemTax / 2;
        sgst += itemTax / 2;
      } else {
        igst += itemTax;
      }

      return {
        id: uuidv4(),
        inventoryId: item.inventoryId,
        name: item.name || 'Item',
        hsnCode: item.hsnCode || '',
        quantity: qty,
        rate: rate,
        taxPercent: taxPercent,
        amount: itemAmt
      };
    });
    
    cgst = Math.round(cgst * 100) / 100;
    sgst = Math.round(sgst * 100) / 100;
    igst = Math.round(igst * 100) / 100;


    const total = subtotal + cgst + sgst + igst;

    const newInvoice: Invoice = {
      id: uuidv4(),
      clientId: clientId || uuidv4(),
      clientName,
      customerAddress,
      customerGstin,
      vehicleNo,
      gstCalculationType,
      gstType,
      date: Date.now(),
      dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
      items: validatedItems,
      subtotal,
      cgst,
      sgst,
      igst,
      total,
      status: 'draft',
      createdAt: Date.now()
    };

    setInvoices([...invoices, newInvoice]);
    alert('Invoice saved to database successfully!');
    setActiveTab('preview');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="premium-heading">Create New Invoice</CardTitle>
        <CardDescription>Generate a B2B or B2C GST Invoice and save to your ledger</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <div className="flex gap-2">
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                value={clientId}
                onChange={handleClientSelect}
              >
                <option value="">-- Select Existing Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input 
              placeholder="Enter Client Name" 
              value={clientName}
              onChange={e => {
                setClientName(e.target.value);
                setClientId('');
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Customer GSTIN</Label>
            <Input 
              placeholder="GSTIN (Optional)" 
              value={customerGstin}
              onChange={e => setCustomerGstin(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label>Customer Full Address</Label>
            <Input 
              placeholder="Address" 
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Vehicle No. / Transport</Label>
            <Input 
              placeholder="Vehicle No. (Optional)" 
              value={vehicleNo}
              onChange={e => setVehicleNo(e.target.value.toUpperCase())}
            />
          </div>
          
          <div className="space-y-2 col-span-2 md:col-span-1 pt-4">
            <Label>GST Calculation</Label>
            <div className="flex gap-4 items-center">
               <label className="flex items-center gap-2 text-sm">
                 <input type="radio" name="gstCalc" checked={gstCalculationType === 'excluding'} onChange={() => setGstCalculationType('excluding')} />
                 Excluding GST
               </label>
               <label className="flex items-center gap-2 text-sm">
                 <input type="radio" name="gstCalc" checked={gstCalculationType === 'including'} onChange={() => setGstCalculationType('including')} />
                 Including GST
               </label>
            </div>
          </div>
          <div className="space-y-2 col-span-2 md:col-span-1 pt-4">
            <Label>GST Type</Label>
            <div className="flex gap-4 items-center">
               <label className="flex items-center gap-2 text-sm">
                 <input type="radio" name="gstType" checked={gstType === 'CGST+SGST'} onChange={() => setGstType('CGST+SGST')} />
                 CGST + SGST (Intra-state)
               </label>
               <label className="flex items-center gap-2 text-sm">
                 <input type="radio" name="gstType" checked={gstType === 'IGST'} onChange={() => setGstType('IGST')} />
                 IGST (Inter-state)
               </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold border-b pb-2">Line Items</h3>
          {items.map((item, index) => (
            <div key={index} className="flex gap-3 items-end bg-gray-50 p-3 rounded-lg border">
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Product/Service</Label>
                <div className="flex gap-2">
                  <select 
                    className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    onChange={(e) => handleInventorySelect(index, e)}
                    value={item.inventoryId || ''}
                  >
                    <option value="">Catalog...</option>
                    {inventory.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.name}</option>
                    ))}
                  </select>
                  <Input 
                    className="flex-1"
                    placeholder="Item Name" 
                    value={item.name || ''}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  />
                </div>
              </div>
              <div className="w-24 space-y-2">
                <Label className="text-xs">HSN Code</Label>
                <Input placeholder="HSN" value={item.hsnCode || ''} onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)} />
              </div>
              <div className="w-20 space-y-2">
                <Label className="text-xs">Qty</Label>
                <Input type="number" value={item.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))} />
              </div>
              <div className="w-24 space-y-2">
                <Label className="text-xs">Rate (₹)</Label>
                <Input type="number" value={item.rate || ''} onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value))} />
              </div>
              <div className="w-20 space-y-2">
                <Label className="text-xs">GST %</Label>
                <Input type="number" value={item.taxPercent || ''} onChange={(e) => handleItemChange(index, 'taxPercent', parseFloat(e.target.value))} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-10 w-10">
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleAddItem} className="mt-2">
            <Plus className="h-4 w-4 mr-2" /> Add Another Item
          </Button>
        </div>

        <div className="pt-4 border-t flex justify-end gap-3">
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveInvoice}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Save Invoice & Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
