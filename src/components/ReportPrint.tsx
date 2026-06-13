
"use client";

import React, { useRef, useState } from 'react';
import { Transaction, Account } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format } from 'date-fns';
import { Printer, Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from '@/hooks/use-toast';

export function ReportPrint({ account, transactions }: { account: Account; transactions: Transaction[] }) {
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Account_Statement_${account.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast({ title: "PDF downloaded successfully" });
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // Sort ascending (chronological) for professional statements
  const sortedTransactions = [...transactions].sort((a, b) => a.date - b.date);

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'Credit') acc.credit += t.amount;
    else acc.debit += t.amount;
    return acc;
  }, { credit: 0, debit: 0 });

  return (
    <div className="space-y-6">
      <div className="flex gap-2 no-print">
        <Button onClick={handlePrint} className="flex-1 sm:flex-none">
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
        <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting} className="flex-1 sm:flex-none">
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Download PDF
        </Button>
      </div>

      <div ref={reportRef} className="p-8 bg-white border border-gray-200 rounded-lg text-slate-950">
        <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">RupeeLedger</h1>
            <p className="text-sm text-slate-500 mt-1">Transaction Statement</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase text-slate-800">{account.name}</h2>
            <p className="text-sm text-slate-600">Account Type: {account.type}</p>
            <p className="text-xs text-slate-400 mt-1">Generated: {format(new Date(), 'PPP p')}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[10px] uppercase font-bold text-slate-500">Opening Balance</p>
            <div className="text-lg font-bold text-slate-800">
              <CurrencyDisplay amount={account.initialBalance} />
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-[10px] uppercase font-bold text-green-600">Total Credit (+)</p>
            <div className="text-lg font-bold text-green-700">
              <CurrencyDisplay amount={totals.credit} />
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-[10px] uppercase font-bold text-red-600">Total Debit (-)</p>
            <div className="text-lg font-bold text-destructive">
              <CurrencyDisplay amount={totals.debit} />
            </div>
          </div>
          <div className="p-4 bg-primary text-primary-foreground rounded-lg">
            <p className="text-[10px] uppercase font-bold opacity-80">Closing Balance</p>
            <div className="text-lg font-bold">
              <CurrencyDisplay amount={account.currentBalance} />
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="font-bold text-slate-900">Date</TableHead>
                <TableHead className="font-bold text-slate-900">Description / Narration</TableHead>
                <TableHead className="text-right font-bold text-slate-900">Credit (In)</TableHead>
                <TableHead className="text-right font-bold text-slate-900">Debit (Out)</TableHead>
                <TableHead className="text-right font-bold text-slate-900">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    No transactions recorded.
                  </TableCell>
                </TableRow>
              ) : (
                sortedTransactions.map((t) => (
                  <TableRow key={t.id} className="border-b border-slate-100">
                    <TableCell className="whitespace-nowrap text-slate-700">
                      {format(t.date, "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-xs text-slate-600">
                      {t.description}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.type === "Credit" ? <span className="text-green-600 font-medium"><CurrencyDisplay amount={t.amount} /></span> : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.type === "Debit" ? <span className="text-destructive font-medium"><CurrencyDisplay amount={t.amount} /></span> : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      <CurrencyDisplay amount={t.balanceAfter} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-slate-50 font-bold border-t border-slate-200">
                <TableCell colSpan={2} className="text-right font-bold text-slate-700">TOTALS / CLOSING:</TableCell>
                <TableCell className="text-right text-green-700">
                  <CurrencyDisplay amount={totals.credit} />
                </TableCell>
                <TableCell className="text-right text-destructive">
                  <CurrencyDisplay amount={totals.debit} />
                </TableCell>
                <TableCell className="text-right text-primary text-lg">
                  <CurrencyDisplay amount={account.currentBalance} />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <div className="mt-12 text-center text-[10px] text-slate-400 italic border-t border-slate-100 pt-4">
          End of Statement - This is an electronically generated report from RupeeLedger.
        </div>
      </div>
    </div>
  );
}
