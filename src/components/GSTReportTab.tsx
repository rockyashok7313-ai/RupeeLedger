"use client";

import React, { useState, useMemo } from 'react';
import { Transaction, Account, BusinessProfile } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format } from 'date-fns';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Download, FileText, MessageCircle, Info, Landmark, Layers, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface GSTReportTabProps {
  transactions: Transaction[];
  accounts: Account[];
  businessProfile: BusinessProfile;
  onViewInvoice: (transaction: Transaction, account: Account) => void;
  onCreateInvoice: () => void;
}

export function GSTReportTab({ transactions, accounts, businessProfile, onViewInvoice, onCreateInvoice }: GSTReportTabProps) {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filter only transactions with GST enabled
  const gstTransactions = useMemo(() => {
    let filtered = transactions.filter(t => t.gstEnabled === true);

    if (search.trim() !== "") {
      const query = search.toLowerCase();
      filtered = filtered.filter(t => 
        (t.invoiceNumber || '').toLowerCase().includes(query) ||
        (t.customerName || '').toLowerCase().includes(query) ||
        (t.customerGstin || '').toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }

    if (startDate !== "") {
      const startMs = new Date(startDate).setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => t.date >= startMs);
    }

    if (endDate !== "") {
      const endMs = new Date(endDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => t.date <= endMs);
    }

    return filtered.sort((a, b) => b.date - a.date);
  }, [transactions, search, startDate, endDate]);

  // Calculations for summary metrics
  const summary = useMemo(() => {
    return gstTransactions.reduce((acc, t) => {
      const taxable = t.taxableAmount || t.amount;
      acc.totalTaxable += taxable;
      acc.totalCGST += t.cgst || 0;
      acc.totalSGST += t.sgst || 0;
      acc.totalIGST += t.igst || 0;
      acc.totalAmount += t.amount;
      return acc;
    }, {
      totalTaxable: 0,
      totalCGST: 0,
      totalSGST: 0,
      totalIGST: 0,
      totalAmount: 0
    });
  }, [gstTransactions]);

  const totalTaxLiability = summary.totalCGST + summary.totalSGST + summary.totalIGST;

  const handleExportCSV = () => {
    if (gstTransactions.length === 0) {
      toast({ title: "No records to export", variant: "destructive" });
      return;
    }

    const headers = [
      "Invoice No",
      "Invoice Date",
      "Customer Name",
      "Customer GSTIN",
      "Account Name",
      "Particulars",
      "Taxable Value (INR)",
      "GST Rate (%)",
      "CGST (INR)",
      "SGST (INR)",
      "IGST (INR)",
      "Grand Total (INR)"
    ];

    const rows = gstTransactions.map(t => {
      const acc = accounts.find(a => a.id === t.accountId);
      return [
        t.invoiceNumber || `INV-${t.id.slice(0, 6).toUpperCase()}`,
        format(t.date, "yyyy-MM-dd"),
        `"${(t.customerName || 'Valued Customer').replace(/"/g, '""')}"`,
        t.customerGstin || "N/A",
        `"${(acc?.name || 'Unknown Account').replace(/"/g, '""')}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        t.taxableAmount || t.amount,
        t.gstRate || 0,
        t.cgst || 0,
        t.sgst || 0,
        t.igst || 0,
        t.amount
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gst-tax-ledger-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast({ 
      title: "GST Ledger Exported", 
      description: "Excel-compatible CSV spreadsheet downloaded successfully." 
    });
  };

  const shareRowToWhatsApp = (t: Transaction) => {
    const acc = accounts.find(a => a.id === t.accountId);
    const totalAmountStr = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(t.amount);

    const company = businessProfile.companyName || "RupeeLedger";
    const invoiceNo = t.invoiceNumber || `INV-${t.id.slice(0, 6).toUpperCase()}`;
    const dateStr = format(t.date, 'dd MMM yyyy');

    const text = `*Invoice ${invoiceNo} Shared*%0A--------------------------%0A*Supplier:* ${company}%0A*Customer:* ${t.customerName || 'Customer'}%0A*Date:* ${dateStr}%0A*Total Amount:* ${totalAmountStr}%0A*Narration:* ${t.description}%0A--------------------------%0A_Powered by RupeeLedger_`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-8">
      {/* Tab Header Layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary">GST Reports & Invoices</h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Generate compliant Tax Invoices and audit your accumulated tax liabilities.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start md:self-auto">
          <Button onClick={onCreateInvoice} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md font-bold h-11 px-5">
            <Plus className="mr-2 h-4.5 w-4.5" /> Create Invoice
          </Button>
          <Button onClick={handleExportCSV} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md font-bold h-11 px-5">
            <Download className="mr-2 h-4.5 w-4.5" /> Export GST Ledger (Excel)
          </Button>
        </div>
      </div>

      {/* Metrics Dashboard Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm border-slate-200 bg-white hover:shadow-md transition-all duration-200">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Taxable Value</p>
            <div className="text-2xl font-black mt-1.5 text-slate-800">
              <CurrencyDisplay amount={summary.totalTaxable} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white hover:shadow-md transition-all duration-200">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Accumulated CGST</p>
            <div className="text-2xl font-black mt-1.5 text-slate-700">
              <CurrencyDisplay amount={summary.totalCGST} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white hover:shadow-md transition-all duration-200">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Accumulated SGST</p>
            <div className="text-2xl font-black mt-1.5 text-slate-700">
              <CurrencyDisplay amount={summary.totalSGST} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white hover:shadow-md transition-all duration-200">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Accumulated IGST</p>
            <div className="text-2xl font-black mt-1.5 text-slate-700">
              <CurrencyDisplay amount={summary.totalIGST} />
            </div>
          </CardContent>
        </Card>

        <Card className="ring-1 ring-secondary/35 border-secondary shadow-md bg-secondary/5 hover:shadow-lg transition-all duration-200">
          <CardContent className="pt-6">
            <p className="text-xs text-secondary uppercase font-extrabold tracking-wider">Net Tax Liability</p>
            <div className="text-2xl font-black mt-1.5 text-secondary">
              <CurrencyDisplay amount={totalTaxLiability} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and search parameters */}
      <div className="bg-card p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between gap-4">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search by Invoice ID, Customer Name, GSTIN, Narration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-3 pr-12 text-sm bg-white"
          />
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">From</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 text-xs w-[150px] bg-white font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">To</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 text-xs w-[150px] bg-white font-medium"
            />
          </div>
          {(startDate || endDate || search) && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSearch("");
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs h-11 hover:bg-slate-100 font-bold px-4 shrink-0"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-card rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b">
                <TableHead className="font-bold text-slate-700 py-3.5 pl-5">Date</TableHead>
                <TableHead className="font-bold text-slate-700">Invoice No</TableHead>
                <TableHead className="font-bold text-slate-700">Customer Name</TableHead>
                <TableHead className="font-bold text-slate-700">Customer GSTIN</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Taxable Value</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Rate</TableHead>
                <TableHead className="text-right font-bold text-slate-700">CGST + SGST / IGST</TableHead>
                <TableHead className="text-right font-bold text-slate-700 pr-5">Total Amount</TableHead>
                <TableHead className="text-right font-bold text-slate-700 no-print pr-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gstTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground italic">
                    No GST tax transactions found matching active filters.
                  </TableCell>
                </TableRow>
              ) : (
                gstTransactions.map((t) => {
                  const acc = accounts.find(a => a.id === t.accountId);
                  return (
                    <TableRow key={t.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0">
                      <TableCell className="whitespace-nowrap font-medium py-4 pl-5">
                        {format(t.date, "dd-MM-yyyy")}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs inline-block mt-3.5 ml-2">
                        {t.invoiceNumber || `INV-${t.id.slice(0, 6).toUpperCase()}`}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">
                        {t.customerName || "Valued Customer"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500 uppercase">
                        {t.customerGstin || "N/A"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        <CurrencyDisplay amount={t.taxableAmount || t.amount} />
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-700">
                        {t.gstRate || 0}%
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {t.gstType === 'CGST+SGST' ? (
                          <span className="text-slate-600 font-semibold">
                            C:<CurrencyDisplay amount={t.cgst || 0} /> + S:<CurrencyDisplay amount={t.sgst || 0} />
                          </span>
                        ) : (
                          <span className="text-secondary font-bold">
                            I:<CurrencyDisplay amount={t.igst || 0} />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-900 pr-5">
                        <CurrencyDisplay amount={t.amount} />
                      </TableCell>
                      <TableCell className="text-right no-print pr-5">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => acc && onViewInvoice(t, acc)}
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            title="View Tax Invoice"
                          >
                            <FileText className="h-4.5 w-4.5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => shareRowToWhatsApp(t)}
                            className="h-8 w-8 text-[#25D366] hover:bg-green-50"
                            title="Share to WhatsApp"
                          >
                            <MessageCircle className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
