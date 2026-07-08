"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Loader2, Printer, Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { OrderForm, OrderType } from "./OrderForm";
import { InvoicePrintout } from "./print/InvoicePrintout";

interface TransactionModuleProps {
  title: string;
  type: OrderType;
  token: string | null;
}

export function TransactionModule({ title, type, token }: TransactionModuleProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Master Data for Printing
  const [company, setCompany] = useState<any>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // Printing State
  const [printingInvoice, setPrintingInvoice] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const isSale = ['sale_invoices', 'sales_orders', 'quotations', 'delivery_challans', 'credit_notes'].includes(type);
  const partyIdField = isSale ? 'customer_id' : 'vendor_id';
  let idField = 'id';
  if (type === 'sale_invoices') idField = 'sale_inv_id';
  else if (type === 'sales_orders') idField = 'so_id';
  else if (type === 'purchase_invoices') idField = 'purchase_inv_id';
  else if (type === 'purchase_orders') idField = 'po_id';
  else if (type === 'quotations') idField = 'quote_id';
  else if (type === 'delivery_challans') idField = 'dc_id';
  else if (type === 'credit_notes') idField = 'cn_id';
  else if (type === 'debit_notes') idField = 'dn_id';

  useEffect(() => {
    if (token) {
      if (!isCreating) fetchData();
      fetchMasterData();
    }
  }, [token, type, isCreating]);


  const handleEwayBill = (item: any) => {
    const party = parties.find(p => p[partyIdField] === item[partyIdField]);
    const ewayJson = {
      version: "1.0.0121",
      billLists: [
        {
          supplyType: item.supply_type === "B2B" ? "O" : "O",
          subSupplyType: "1",
          docType: type === "delivery_challans" ? "CHL" : "INV",
          docNo: item[idField],
          docDate: format(new Date(item.date), 'dd/MM/yyyy'),
          fromGstin: company?.gstin || "URP",
          fromTrdName: company?.companyName || "",
          fromStateCode: 27, // Defaulting to MH
          toGstin: party?.gstin || "URP",
          toTrdName: party?.customer_name || party?.vendor_name || "",
          toStateCode: party?.state_code || 27,
          totalValue: item.total_before_tax,
          cgstValue: item.cgst_total,
          sgstValue: item.sgst_total,
          igstValue: item.igst_total || 0,
          cessValue: 0,
          transporterId: item.transporter_id || "",
          transDistance: item.distance || "0",
          vehicleType: item.vehicle_type === "ODC" ? "O" : "R",
          itemList: (item.lines || []).map((l: any) => ({
            productName: products.find(p => p.product_id === l.product_id)?.product_name || "Item",
            hsnCode: products.find(p => p.product_id === l.product_id)?.hsn_code || "0000",
            quantity: l.quantity,
            qtyUnit: "NOS",
            taxableAmount: l.quantity * l.unit_price,
            cgstRate: l.tax_rate / 2,
            sgstRate: l.tax_rate / 2,
            igstRate: item.tax_type === "inter" ? l.tax_rate : 0,
          }))
        }
      ]
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ewayJson, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `eway_bill_${item[idField]}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast({ title: "JSON Exported", description: "E-Way bill JSON generated successfully." });
  };

  // Listen for print completion to clear the invoice
  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintingInvoice(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Handle printing
  useEffect(() => {
    if (printingInvoice) {
      setTimeout(() => {
        window.print();
      }, 500); // Give React time to render the hidden print component
    }
  }, [printingInvoice]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/erp/transactions?type=${type}&t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const json = await res.json();
      if (res.ok) setData(json.data || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const cRes = await fetch(`/api/erp/master?type=company&t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
      if (cRes.ok) setCompany((await cRes.json()).data?.[0] || null);

      const partyType = isSale ? 'customers' : 'vendors';
      const rRes = await fetch(`/api/erp/master?type=${partyType}&t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
      if (rRes.ok) setParties((await rRes.json()).data || []);

      const pRes = await fetch(`/api/erp/master?type=products&t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
      if (pRes.ok) setProducts((await pRes.json()).data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredData = data.filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = async (item: any) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const res = await fetch('/api/erp/transactions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type, id: item[idField], idField })
      });
      if (res.ok) {
        toast({ title: "Deleted", description: "Transaction deleted successfully." });
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete transaction", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  };

  const handlePrint = (invoice: any) => {
    setPrintingInvoice(invoice);
  };

  if ((isCreating || editingItem) && token) {
    return <OrderForm type={type} token={token} initialData={editingItem} onClose={() => { setIsCreating(false); setEditingItem(null); }} onSaved={() => { setIsCreating(false); setEditingItem(null); fetchData(); }} />;
  }

  return (
    <>
      <Card className="glass-card no-print">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Manage {title.toLowerCase()} documents</p>
          </div>
          <Button onClick={() => setIsCreating(true)} className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="mr-2 h-4 w-4" /> Create New
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex mb-4 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={`Search ${title}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/50"
              />
            </div>
          </div>

          <div className="border rounded-md bg-white/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead>Doc No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>{isSale ? 'Customer' : 'Vendor'}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, idx) => {
                    const party = parties.find(p => p[partyIdField] === item[partyIdField]);
                    const partyName = party ? (party.customer_name || party.vendor_name) : item[partyIdField];

                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-blue-600">{item[idField]}</TableCell>
                        <TableCell>{format(new Date(item.date), 'dd-MMM-yyyy')}</TableCell>
                        <TableCell>{partyName}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {item.status || 'Draft'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">₹{(item.grand_total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditingItem(item)}>
                            <Pencil className="h-4 w-4 text-slate-600" />
                          </Button>
                          {(type === 'sale_invoices' || type === 'delivery_challans') && (
                            <Button variant="ghost" size="icon" title="Download Sale Invoice" onClick={() => handlePrint(item)}>
                              <Download className="h-4 w-4 text-slate-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" title="Print" onClick={() => handlePrint(item)}>
                            <Printer className="h-4 w-4 text-slate-600" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(item)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Hidden Print Container rendering 3 copies as requested */}
      {printingInvoice && typeof window !== 'undefined' && createPortal(
        <div className="print-only w-full" ref={printRef}>
          <InvoicePrintout 
            invoice={printingInvoice} 
            copyType="Original" 
            company={company} 
            party={parties.find(p => p[partyIdField] === printingInvoice[partyIdField])} 
            products={products}
          />
          <div style={{ pageBreakBefore: 'always' }} />
          <InvoicePrintout 
            invoice={printingInvoice} 
            copyType="Duplicate" 
            company={company} 
            party={parties.find(p => p[partyIdField] === printingInvoice[partyIdField])} 
            products={products}
          />
          <div style={{ pageBreakBefore: 'always' }} />
          <InvoicePrintout 
            invoice={printingInvoice} 
            copyType="Triplicate" 
            company={company} 
            party={parties.find(p => p[partyIdField] === printingInvoice[partyIdField])} 
            products={products}
          />
        </div>,
        document.body
      )}
    </>
  );
}
