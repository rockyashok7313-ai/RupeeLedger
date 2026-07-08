"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export type OrderType = 'purchase_orders' | 'purchase_invoices' | 'sales_orders' | 'sale_invoices' | 'quotations' | 'delivery_challans' | 'credit_notes' | 'debit_notes';

interface OrderFormProps {
  type: OrderType;
  token: string;
  initialData?: any;
  onClose: () => void;
  onSaved: () => void;
}

export function OrderForm({ type, token, initialData, onClose, onSaved }: OrderFormProps) {
  const isSale = type.startsWith('sale');
  const isInvoice = type.includes('invoice');

  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<any[]>([]); // Vendors or Customers
  const [products, setProducts] = useState<any[]>([]);
  
  // Form Header State
  const [partyId, setPartyId] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [supplyType, setSupplyType] = useState<"B2B" | "B2C">("B2B");
  const [taxType, setTaxType] = useState<"intra" | "inter">("intra");
  const [transporterId, setTransporterId] = useState("");
  const [vehicleType, setVehicleType] = useState<"Regular" | "ODC">("Regular");
  const [distance, setDistance] = useState("");
  
  // Line Items State
  const [lines, setLines] = useState<any[]>([
    { id: Date.now(), product_id: "", quantity: 1, unit_price: 0, tax_rate: 0 }
  ]);

  // Totals
  const [totals, setTotals] = useState({
    beforeTax: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    grandTotal: 0
  });

  useEffect(() => {
    fetchMasterData();
  }, [type]);

  useEffect(() => {
    calculateTotals();
  }, [lines]);

  const fetchMasterData = async () => {
    try {
      // Fetch products
      const pRes = await fetch(`/api/erp/master?type=products&t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
      if (pRes.ok) {
        const pJson = await pRes.json();
        setProducts(pJson.data || []);
      }

      // Fetch parties
      const partyType = isSale ? 'customers' : 'vendors';
      const rRes = await fetch(`/api/erp/master?type=${partyType}&t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
      if (rRes.ok) {
        const rJson = await rRes.json();
        setParties(rJson.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const calculateTotals = () => {
    let beforeTax = 0, cgst = 0, sgst = 0, igst = 0;
    
    lines.forEach(l => {
      const rowTotal = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
      beforeTax += rowTotal;
      
      const taxRate = Number(l.tax_rate) || 0;
      const taxAmt = (rowTotal * taxRate) / 100;
      
      // Simplifying: Assumes Intra-state (CGST + SGST split) for this form
      cgst += taxAmt / 2;
      sgst += taxAmt / 2;
    });

    setTotals({
      beforeTax,
      cgst,
      sgst,
      igst,
      grandTotal: beforeTax + cgst + sgst + igst
    });
  };

  const addLine = () => {
    setLines([...lines, { id: Date.now(), product_id: "", quantity: 1, unit_price: 0, tax_rate: 0 }]);
  };

  const removeLine = (id: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: number, field: string, value: any) => {
    setLines(lines.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      
      // Auto-fill price and tax when product selected
      if (field === 'product_id' && value) {
        const prod = products.find(p => p.product_id === value);
        if (prod) {
          updated.unit_price = isSale ? prod.selling_price : prod.purchase_price;
          updated.tax_rate = prod.hsn_gst_rate;
        }
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    if (!partyId) {
      toast({ title: "Validation Error", description: `Please select a ${isSale ? 'customer' : 'vendor'}.`, variant: "destructive" });
      return;
    }

    // Filter empty lines
    const validLines = lines.filter(l => !!l.product_id);
    if (validLines.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one product.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const idPrefix = isSale 
        ? (isInvoice ? 'SINV' : 'SO') 
        : (isInvoice ? 'PINV' : 'PO');
        
      const payloadId = `${idPrefix}-${Date.now()}`;

      const payload = {
        [isSale ? 'so_id' : 'po_id']: payloadId,
        ...(isInvoice && { [isSale ? 'sale_inv_id' : 'purchase_inv_id']: payloadId }),
        date: new Date(date).getTime(),
        [isSale ? 'customer_id' : 'vendor_id']: partyId,
        status: 'Draft',
        notes,
        vehicle_no: vehicleNo,
        supply_type: supplyType,
        tax_type: taxType,
        transporter_id: transporterId,
        vehicle_type: vehicleType,
        distance: distance,
        lines: validLines.map((l, i) => {
          const rowTotal = l.quantity * l.unit_price;
          const taxAmt = (rowTotal * l.tax_rate) / 100;
          return {
            line_no: i + 1,
            product_id: l.product_id,
            quantity: l.quantity,
            unit_price: l.unit_price,
            tax_rate: l.tax_rate,
            cgst_amount: taxType === "intra" ? taxAmt / 2 : 0,
            sgst_amount: taxType === "intra" ? taxAmt / 2 : 0,
            igst_amount: taxType === "inter" ? taxAmt : 0,
            total_amount: rowTotal + taxAmt
          };
        }),
        total_before_tax: totals.beforeTax,
        cgst_total: totals.cgst,
        sgst_total: totals.sgst,
        grand_total: totals.grandTotal
      };

      let res;
      if (initialData) {
        // Find correct ID field
        const idField = type === 'sale_invoices' ? 'sale_inv_id' : 
                        type === 'sales_orders' ? 'so_id' : 
                        type === 'purchase_invoices' ? 'purchase_inv_id' : 
                        type === 'purchase_orders' ? 'po_id' : 
                        type === 'quotations' ? 'quote_id' : 
                        type === 'delivery_challans' ? 'dc_id' : 
                        type === 'credit_notes' ? 'cn_id' : 
                        type === 'debit_notes' ? 'dn_id' : 'id';
        
        // Preserve original ID in payload
        payload[idField] = initialData[idField];
        
        res = await fetch(`/api/erp/transactions`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ type, id: initialData[idField], idField, data: payload })
        });
      } else {
        res = await fetch(`/api/erp/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ type, data: payload })
        });
      }

      if (!res.ok) throw new Error(await res.text());

      toast({ title: "Success", description: "Transaction saved successfully!" });
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        onSaved();
      }, 100);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">
          {initialData ? 'Edit' : 'New'} {isSale ? 'Sale' : 'Purchase'} {isInvoice ? 'Invoice' : 'Order'}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
      </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="space-y-2">
          <Label>Supply Type</Label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={supplyType}
            onChange={(e) => setSupplyType(e.target.value as any)}
          >
            <option value="B2B">B2B (Registered)</option>
            <option value="B2C">B2C (Unregistered)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Tax Type</Label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={taxType}
            onChange={(e) => setTaxType(e.target.value as any)}
          >
            <option value="intra">Intra-State (CGST+SGST)</option>
            <option value="inter">Inter-State (IGST)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Transporter ID (Optional)</Label>
          <Input placeholder="e.g. 27ABCDE1234F1Z5" value={transporterId} onChange={(e) => setTransporterId(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Distance (km)</Label>
          <Input type="number" placeholder="Distance for E-Way Bill" value={distance} onChange={(e) => setDistance(e.target.value)} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="space-y-2">
          <Label>{isSale ? 'Customer' : 'Vendor'} *</Label>
          <select 
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
          >
            <option value="">Select...</option>
            {parties.map(p => (
              <option key={p[isSale ? 'customer_id' : 'vendor_id']} value={p[isSale ? 'customer_id' : 'vendor_id']}>
                {p[isSale ? 'customer_name' : 'vendor_name']}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Vehicle No.</Label>
          <Input placeholder="e.g. MH01AB1234" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Reference Notes</Label>
          <Input placeholder="e.g. Terms, delivery info" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden mb-6">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Product *</TableHead>
              <TableHead className="w-24">Qty</TableHead>
              <TableHead className="w-32">Rate (₹)</TableHead>
              <TableHead className="w-24">GST %</TableHead>
              <TableHead className="w-32 text-right">Total (₹)</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l, index) => {
              const rowTotal = l.quantity * l.unit_price;
              const rowGrand = rowTotal + ((rowTotal * l.tax_rate) / 100);
              return (
                <TableRow key={l.id}>
                  <TableCell>
                    <select 
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={l.product_id}
                      onChange={(e) => updateLine(l.id, 'product_id', e.target.value)}
                    >
                      <option value="">Select Product...</option>
                      {products.map(p => (
                        <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="1" value={l.quantity} onChange={(e) => updateLine(l.id, 'quantity', Number(e.target.value))} className="h-9" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="0" value={l.unit_price} onChange={(e) => updateLine(l.id, 'unit_price', Number(e.target.value))} className="h-9" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="0" value={l.tax_rate} onChange={(e) => updateLine(l.id, 'tax_rate', Number(e.target.value))} className="h-9" />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {rowGrand.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeLine(l.id)} disabled={lines.length === 1} className="h-8 w-8 text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="p-3 bg-slate-50 border-t">
          <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-2"/> Add Row</Button>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600"><span>Taxable Amount:</span> <span>₹{totals.beforeTax.toFixed(2)}</span></div>
          <div className="flex justify-between text-slate-600"><span>CGST:</span> <span>₹{totals.cgst.toFixed(2)}</span></div>
          <div className="flex justify-between text-slate-600"><span>SGST:</span> <span>₹{totals.sgst.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-lg text-slate-800 pt-2 border-t"><span>Grand Total:</span> <span>₹{totals.grandTotal.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={loading} className="bg-primary text-white">
          <Save className="h-4 w-4 mr-2" /> Save Document
        </Button>
      </div>
    </div>
  );
}
