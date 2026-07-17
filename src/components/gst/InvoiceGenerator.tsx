import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash, FileText, CheckCircle2 } from 'lucide-react';
import { BusinessProfile, Client, InventoryItem, Invoice, InvoiceItem, InvoiceType } from '@/lib/types';
import { currencies } from '@/lib/currency';
import { UQC_LIST, generateInvoiceNumber, getCurrentFinancialYear } from '@/lib/invoiceUtils';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';

interface Props {
  businessProfile: BusinessProfile;
  clients: Client[];
  inventory: InventoryItem[];
  invoices: Invoice[];
  setInvoices: (i: Invoice[]) => void;
  setActiveTab: (t: 'preview' | string) => void;
  editingInvoiceId?: string | null;
  setEditingInvoiceId?: (id: string | null) => void;
}

export function InvoiceGenerator({ businessProfile, clients, inventory, invoices, setInvoices, setActiveTab, editingInvoiceId, setEditingInvoiceId }: Props) {
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [gstCalculationType, setGstCalculationType] = useState<'including' | 'excluding'>('excluding');
  const [gstType, setGstType] = useState<'CGST+SGST' | 'IGST'>('CGST+SGST');
  const [items, setItems] = useState<Partial<InvoiceItem>[]>([{ name: '', hsnCode: '', pieceNo: '', quantity: 1, rate: 0, taxPercent: 18, unit: 'NOS-NUMBERS' }]);
  const [autoRoundoff, setAutoRoundoff] = useState<boolean>(true);

  const termsTemplates = {
    'general': '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed by more than 30 days.',
    'it_services': '1. Payment terms: Net 15 days.\n2. Intellectual property transfers upon full payment.\n3. Late fees: 1.5% per month on overdue balances.',
    'ecommerce': '1. Returns accepted within 7 days of delivery.\n2. Subject to local jurisdiction.\n3. Warranty applies as per manufacturer terms.',
    'consulting': '1. Invoice payable upon receipt.\n2. Retainer fees are non-refundable.\n3. Subject to NDA terms signed.'
  };
  const [terms, setTerms] = useState<string>(businessProfile.invoiceSettings?.defaultTerms || businessProfile.printFooter || termsTemplates.general);

  const [invoiceType, setInvoiceType] = useState<InvoiceType>('Tax Invoice');
  const [currency, setCurrency] = useState('INR');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [customPrefix, setCustomPrefix] = useState(businessProfile.invoiceSettings?.defaultPrefix || 'INV-');
  const [customSequence, setCustomSequence] = useState<number | ''>(invoices.filter(i => i.type === 'Tax Invoice' || !i.type).length + 1);
  const [deliveryChallanNo, setDeliveryChallanNo] = useState('');
  const [agentId, setAgentId] = useState('');
  const [agentCommissionPercent, setAgentCommissionPercent] = useState<number>(0);

  React.useEffect(() => {
    if (editingInvoiceId) {
      const editingInvoice = invoices.find(i => i.id === editingInvoiceId);
      if (editingInvoice) {
        setClientId(editingInvoice.clientId || '');
        setClientName(editingInvoice.clientName || '');
        setCustomerAddress(editingInvoice.customerAddress || '');
        setCustomerGstin(editingInvoice.customerGstin || '');
        setVehicleNo(editingInvoice.vehicleNo || '');
        setOrderNo(editingInvoice.orderNo || '');
        if (editingInvoice.orderDate) {
          setOrderDate(new Date(editingInvoice.orderDate).toISOString().split('T')[0]);
        }
        setGstCalculationType(editingInvoice.gstCalculationType || 'excluding');
        setGstType(editingInvoice.gstType || 'CGST+SGST');
        setItems(editingInvoice.items || []);
        setTerms(editingInvoice.terms || '');
        setInvoiceType(editingInvoice.type || 'Tax Invoice');
        setCurrency(editingInvoice.currency || 'INR');
        setExchangeRate(editingInvoice.exchangeRate || 1);
        setCustomPrefix(editingInvoice.prefix || '');
        
        // Try to extract sequence from invoice number
        const match = editingInvoice.invoiceNumber?.match(/\d+$/);
        if (match) {
          setCustomSequence(parseInt(match[0], 10));
        } else {
          setCustomSequence('');
        }
        
        setDeliveryChallanNo(editingInvoice.deliveryChallanNo || '');
        setAgentId(editingInvoice.agentId || '');
        setAgentCommissionPercent(editingInvoice.agentCommissionPercent || 0);
      }
    }
  }, [editingInvoiceId, invoices]);
  
  const handleAddItem = () => {
    setItems([...items, { name: '', hsnCode: '', quantity: 1, rate: 0, taxPercent: 18, unit: 'NOS-NUMBERS' }]);
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

  const calculatedTotals = React.useMemo(() => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    items.forEach(item => {
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
    });
    
    cgst = Math.round(cgst * 100) / 100;
    sgst = Math.round(sgst * 100) / 100;
    igst = Math.round(igst * 100) / 100;

    let baseTotal = subtotal + cgst + sgst + igst;
    
    let tcsAmount = 0;
    if (clientId) {
      const clientInvoices = invoices.filter(i => i.clientId === clientId && i.type === 'Tax Invoice');
      const totalTurnover = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const newTotalWithThis = totalTurnover + baseTotal;
      
      if (newTotalWithThis > 5000000) {
        const taxableForTcs = Math.max(0, newTotalWithThis - Math.max(5000000, totalTurnover));
        tcsAmount = Math.round(taxableForTcs * 0.001 * 100) / 100; 
      }
    }

    const rawTotal = baseTotal + tcsAmount;
    const total = autoRoundoff ? Math.round(rawTotal) : rawTotal;
    const roundoff = autoRoundoff ? Math.round((total - rawTotal) * 100) / 100 : 0;

    return { subtotal, cgst, sgst, igst, tcsAmount, roundoff, total };
  }, [items, gstCalculationType, gstType, clientId, invoices, autoRoundoff]);

  const handleSaveInvoice = () => {
    if (!clientName) return alert('Please enter a client name.');
    if (gstType === 'IGST' && !customerAddress) return alert('Inter-state supply requires Customer Address to determine Place of Supply.');
    
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
        pieceNo: item.pieceNo || '',
        quantity: qty,
        rate: rate,
        taxPercent: taxPercent,
        amount: itemAmt
      };
    });
    
    cgst = Math.round(cgst * 100) / 100;
    sgst = Math.round(sgst * 100) / 100;
    igst = Math.round(igst * 100) / 100;


    let baseTotal = subtotal + cgst + sgst + igst;
    
    // Auto TCS Calculation (above 50L)
    let tcsAmount = 0;
    if (clientId) {
      const clientInvoices = invoices.filter(i => i.clientId === clientId && i.type === 'Tax Invoice');
      const totalTurnover = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const newTotalWithThis = totalTurnover + baseTotal;
      
      if (newTotalWithThis > 5000000) {
        const taxableForTcs = Math.max(0, newTotalWithThis - Math.max(5000000, totalTurnover));
        tcsAmount = Math.round(taxableForTcs * 0.001 * 100) / 100; // 0.1% TCS
      }
    }

    const rawTotal = baseTotal + tcsAmount;
    const total = autoRoundoff ? Math.round(rawTotal) : rawTotal;
    const roundoff = autoRoundoff ? Math.round((total - rawTotal) * 100) / 100 : 0;

    // Agent Commission calculation based on Taxable Amount (subtotal)
    let agentCommissionAmount = 0;
    if (agentId && agentCommissionPercent > 0) {
      agentCommissionAmount = Math.round(subtotal * (agentCommissionPercent / 100) * 100) / 100;
    }
    const selectedAgent = clients.find(c => c.id === agentId);

    let invoiceNum = '';
    const existingInvoice = editingInvoiceId ? invoices.find(i => i.id === editingInvoiceId) : null;
    
    if (existingInvoice) {
      invoiceNum = existingInvoice.invoiceNumber || '';
    } else if (invoiceType === 'Tax Invoice') {
      const seqToUse = customSequence !== '' ? Number(customSequence) : invoices.length + 1;
      invoiceNum = generateInvoiceNumber(seqToUse, customPrefix, getCurrentFinancialYear());
    } else {
      const prefixMap: Record<string, string> = {
        'Delivery Challan': 'DC',
        'Credit Note': 'CN',
        'Proforma': 'EST',
        'Bill of Supply': 'BOS'
      };
      invoiceNum = generateInvoiceNumber(invoices.length + 1, prefixMap[invoiceType] || 'INV', getCurrentFinancialYear());
    }

    const updatedInvoice: Invoice = {
      ...existingInvoice,
      terms,
      invoiceNumber: invoiceNum,
      prefix: invoiceType === 'Tax Invoice' ? customPrefix : undefined,
      type: invoiceType,
      currency,
      exchangeRate,
      financialYear: existingInvoice?.financialYear || getCurrentFinancialYear(),
      id: existingInvoice?.id || uuidv4(),
      clientId: clientId || existingInvoice?.clientId || uuidv4(),
      clientName,
      customerAddress,
      customerGstin,
      vehicleNo,
      orderNo: orderNo.trim() !== '' ? orderNo : undefined,
      orderDate: orderDate ? new Date(orderDate).getTime() : undefined,
      gstCalculationType,
      gstType,
      date: existingInvoice?.date || Date.now(),
      dueDate: existingInvoice?.dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000,
      items: validatedItems,
      subtotal,
      cgst,
      sgst,
      igst,
      tcsAmount,
      roundoff: roundoff,
      total,
      status: existingInvoice?.status || 'draft',
      createdAt: existingInvoice?.createdAt || Date.now(),
      deliveryChallanNo: deliveryChallanNo.trim() !== '' ? deliveryChallanNo : undefined,
      agentId: agentId || undefined,
      agentName: selectedAgent ? selectedAgent.name : undefined,
      agentCommissionPercent: agentId ? agentCommissionPercent : undefined,
      agentCommissionAmount: agentId ? agentCommissionAmount : undefined
    };

    if (editingInvoiceId) {
      setInvoices(invoices.map(i => i.id === editingInvoiceId ? updatedInvoice : i));
      alert('Invoice updated successfully!');
      if (setEditingInvoiceId) setEditingInvoiceId(null);
    } else {
      setInvoices([...invoices, updatedInvoice]);
      alert('Invoice saved to database successfully!');
    }
    setActiveTab('preview');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="premium-heading">Create New Invoice</CardTitle>
        <CardDescription>Generate a B2B or B2C GST Invoice and save to your ledger</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Invoice Type</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={invoiceType} onChange={e => setInvoiceType(e.target.value as InvoiceType)}>
              <option value="Tax Invoice">Tax Invoice</option>
              <option value="Proforma">Proforma / Estimate</option>
              <option value="Bill of Supply">Bill of Supply</option>
              <option value="Credit Note">Credit Note</option>
              <option value="Delivery Challan">Delivery Challan</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={currency} onChange={e => setCurrency(e.target.value)}>
              {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
            </select>
          </div>
        </div>

        {invoiceType === 'Tax Invoice' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border rounded-md bg-gray-50/50">
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input 
                value={customPrefix} 
                onChange={e => setCustomPrefix(e.target.value)} 
                placeholder="INV"
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Number (Sequence)</Label>
              <Input 
                type="number"
                value={customSequence === '' ? '' : customSequence} 
                onChange={e => setCustomSequence(e.target.value === '' ? '' : parseInt(e.target.value))} 
                placeholder="Auto-generated"
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Delivery Challan No (Optional)</Label>
            <Input 
              value={deliveryChallanNo} 
              onChange={e => setDeliveryChallanNo(e.target.value)} 
              placeholder="e.g. DC-101"
            />
          </div>
          <div className="space-y-2">
            <Label>Order No (Optional)</Label>
            <Input 
              value={orderNo} 
              onChange={e => setOrderNo(e.target.value)} 
              placeholder="e.g. PO-2023"
            />
          </div>
          <div className="space-y-2">
            <Label>Order Date</Label>
            <Input 
              type="date"
              value={orderDate} 
              onChange={e => setOrderDate(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Agent / Broker</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
            >
              <option value="">-- No Agent --</option>
              {clients.filter(c => c.type === 'agent' || c.type === 'both').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {agentId && (
            <div className="space-y-2">
              <Label>Agent Commission (%)</Label>
              <Input 
                type="number"
                value={agentCommissionPercent === 0 ? '' : agentCommissionPercent} 
                onChange={e => setAgentCommissionPercent(parseFloat(e.target.value) || 0)} 
                placeholder="e.g. 5"
              />
            </div>
          )}
        </div>

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
              <div className="w-24 space-y-2">
                <Label className="text-xs">Piece No</Label>
                <Input placeholder="Piece" value={item.pieceNo || ''} onChange={(e) => handleItemChange(index, 'pieceNo', e.target.value)} />
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

        
        <div className="space-y-4 pt-4 border-t">
          <div className="bg-gray-50 p-4 rounded-lg border w-full md:w-1/2 ml-auto">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <h3 className="font-semibold text-sm">Invoice Totals Summary</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-roundoff"
                  checked={autoRoundoff}
                  onCheckedChange={setAutoRoundoff}
                />
                <Label htmlFor="auto-roundoff" className="text-xs text-gray-500 cursor-pointer">Auto Round Off</Label>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Taxable Amount (Subtotal):</span> <span className="font-medium">₹{calculatedTotals.subtotal.toFixed(2)}</span></div>
              {gstType === 'CGST+SGST' && (
                <>
                  <div className="flex justify-between"><span>CGST:</span> <span>₹{calculatedTotals.cgst.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>SGST:</span> <span>₹{calculatedTotals.sgst.toFixed(2)}</span></div>
                </>
              )}
              {gstType === 'IGST' && (
                <div className="flex justify-between"><span>IGST:</span> <span>₹{calculatedTotals.igst.toFixed(2)}</span></div>
              )}
              {calculatedTotals.tcsAmount > 0 && (
                <div className="flex justify-between text-blue-600"><span>TCS:</span> <span>₹{calculatedTotals.tcsAmount.toFixed(2)}</span></div>
              )}
              {calculatedTotals.roundoff !== 0 && (
                <div className="flex justify-between"><span>Roundoff:</span> <span>₹{calculatedTotals.roundoff.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                <span>Net Amount (Total):</span> <span className="text-green-600">₹{calculatedTotals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold border-b pb-2">Terms & Conditions (Rich Text)</h3>
          <div className="flex gap-4">
            <div className="w-1/3 space-y-2">
              <Label>Starter Templates</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" onChange={e => setTerms(termsTemplates[e.target.value as keyof typeof termsTemplates] || '')}>
                <option value="">-- Select Template --</option>
                <option value="general">General Business</option>
                <option value="it_services">IT & Software Services</option>
                <option value="ecommerce">E-Commerce / Retail</option>
                <option value="consulting">Consulting Services</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">Select a preset to auto-fill your terms. You can then edit them in the text area.</p>
            </div>
            <div className="w-2/3 space-y-2">
              <Label>Custom Terms</Label>
              <textarea 
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                placeholder="Enter your terms and conditions here..."
                value={terms}
                onChange={e => setTerms(e.target.value)}
              />
            </div>
          </div>
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
