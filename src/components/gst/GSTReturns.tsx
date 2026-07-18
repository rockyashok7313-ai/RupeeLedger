import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calculator, Info } from 'lucide-react';
import { generateGSTR1JSON } from '@/lib/gstExport';
import { BusinessProfile } from '@/lib/types';
import { Invoice, Expense } from '@/lib/types';

interface Props {
  invoices?: Invoice[];
  expenses?: Expense[];
  businessProfile: BusinessProfile;
}

export function GSTReturns({ invoices = [], expenses = [], businessProfile }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const stats = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    
    // Filter for selected month
    const validInvoices = invoices.filter(inv => {
      const d = new Date(inv.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month && inv.status !== 'draft';
    });

    const validExpenses = expenses.filter(exp => {
      const d = new Date(exp.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    // Calculate Outward Supplies (GSTR-1)
    const sales = {
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0
    };

    validInvoices.forEach(inv => {
      sales.taxableAmount += inv.subtotal;
      sales.cgst += inv.cgst;
      sales.sgst += inv.sgst;
      sales.igst += inv.igst;
      sales.total += inv.total;
    });

    // Calculate Input Tax Credit (GSTR-3B Table 4)
    const itc = {
      cgst: 0,
      sgst: 0,
      igst: 0
    };

    validExpenses.forEach(exp => {
      itc.cgst += exp.cgst;
      itc.sgst += exp.sgst;
      itc.igst += exp.igst;
    });

    // Apply precision rounding to avoid floating-point errors
    const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

    sales.taxableAmount = round2(sales.taxableAmount);
    sales.cgst = round2(sales.cgst);
    sales.sgst = round2(sales.sgst);
    sales.igst = round2(sales.igst);
    sales.total = round2(sales.total);

    itc.cgst = round2(itc.cgst);
    itc.sgst = round2(itc.sgst);
    itc.igst = round2(itc.igst);

    // Net Payable
    const payable = {
      cgst: round2(Math.max(0, sales.cgst - itc.cgst)),
      sgst: round2(Math.max(0, sales.sgst - itc.sgst)),
      igst: round2(Math.max(0, sales.igst - itc.igst)),
    };

    return { sales, itc, payable };
  }, [invoices, expenses, selectedMonth]);


  const handleDownloadJSON = (type: string) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let data = {};
    if (type === 'GSTR-1') {
      data = generateGSTR1JSON(invoices, businessProfile, year, month);
    } else {
      data = {
        gstin: businessProfile.gstin,
        ret_period: `${String(month).padStart(2, '0')}${year}`,
        sup_details: {
          osup_det: { txval: stats.sales.taxableAmount, iamt: stats.sales.igst, camt: stats.sales.cgst, samt: stats.sales.sgst }
        },
        itc_elg: {
          itc_avl: { txval: 0, iamt: stats.itc.igst, camt: stats.itc.cgst, samt: stats.itc.sgst }
        }
      };
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${selectedMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 border p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="font-semibold text-gray-900">Return Filing Period</h2>
          <p className="text-sm text-gray-500">Select the month to calculate returns</p>
        </div>
        <input 
          type="month" 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Outward Supplies (Sales) */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center justify-between">
              Outward Supplies (Sales)
              <FileText className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{stats.sales.total.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              <div className="flex justify-between"><span>Taxable:</span> <span>₹{stats.sales.taxableAmount.toFixed(2)}</span></div>
              <div className="flex justify-between text-blue-700"><span>CGST Collected:</span> <span>₹{stats.sales.cgst.toFixed(2)}</span></div>
              <div className="flex justify-between text-blue-700"><span>SGST Collected:</span> <span>₹{stats.sales.sgst.toFixed(2)}</span></div>
              <div className="flex justify-between text-blue-700"><span>IGST Collected:</span> <span>₹{stats.sales.igst.toFixed(2)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Input Tax Credit */}
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900 flex items-center justify-between">
              Input Tax Credit (ITC)
              <Calculator className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{(stats.itc.cgst + stats.itc.sgst + stats.itc.igst).toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              <div className="flex justify-between text-emerald-700"><span>CGST Available:</span> <span>₹{stats.itc.cgst.toFixed(2)}</span></div>
              <div className="flex justify-between text-emerald-700"><span>SGST Available:</span> <span>₹{stats.itc.sgst.toFixed(2)}</span></div>
              <div className="flex justify-between text-emerald-700"><span>IGST Available:</span> <span>₹{stats.itc.igst.toFixed(2)}</span></div>
              <div className="flex justify-between pt-1 border-t text-gray-400"><span>Based on Expenses logged</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Net Payable */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-900 flex items-center justify-between">
              Net Tax Payable
              <Info className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">₹{(stats.payable.cgst + stats.payable.sgst + stats.payable.igst).toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              <div className="flex justify-between text-amber-700"><span>CGST Payable:</span> <span>₹{stats.payable.cgst.toFixed(2)}</span></div>
              <div className="flex justify-between text-amber-700"><span>SGST Payable:</span> <span>₹{stats.payable.sgst.toFixed(2)}</span></div>
              <div className="flex justify-between text-amber-700"><span>IGST Payable:</span> <span>₹{stats.payable.igst.toFixed(2)}</span></div>
              <div className="flex justify-between pt-1 border-t text-gray-400"><span>Formula: Collected - ITC</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              GSTR-1 Export
            </CardTitle>
            <CardDescription>Export outward supplies for the GST offline utility</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleDownloadJSON('GSTR-1')} variant="outline" className="w-full justify-start text-blue-700 border-blue-200 hover:bg-blue-50">
              <Download className="h-4 w-4 mr-2" /> Download GSTR-1 JSON
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              GSTR-3B Export
            </CardTitle>
            <CardDescription>Export monthly summary return data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleDownloadJSON('GSTR-3B')} variant="outline" className="w-full justify-start text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              <Download className="h-4 w-4 mr-2" /> Download GSTR-3B JSON
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
