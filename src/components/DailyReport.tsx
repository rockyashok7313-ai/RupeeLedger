
"use client";

import React, { useMemo, useState, useRef } from 'react';
import { Transaction, Account } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format, isSameDay, startOfDay, addDays } from 'date-fns';
import { Printer, Calendar as CalendarIcon, Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
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

export function DailyReport({ transactions, accounts }: { transactions: Transaction[]; accounts: Account[] }) {
  const [date, setDate] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const dailyTransactions = useMemo(() => 
    transactions.filter(t => isSameDay(new Date(t.date), date)),
    [transactions, date]
  );

  const stats = useMemo(() => {
    return dailyTransactions.reduce((acc, t) => {
      if (t.type === 'Credit') acc.credit += t.amount;
      else acc.debit += t.amount;
      return acc;
    }, { credit: 0, debit: 0 });
  }, [dailyTransactions]);

  const closingBalanceForDay = useMemo(() => {
    const endOfSelectedDay = startOfDay(addDays(date, 1)).getTime();
    const initialTotal = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
    const netChange = transactions
      .filter(t => t.date < endOfSelectedDay)
      .reduce((sum, t) => {
        return t.type === 'Credit' ? sum + t.amount : sum - t.amount;
      }, 0);
    return initialTotal + netChange;
  }, [accounts, transactions, date]);

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
      pdf.save(`Daily_Report_${format(date, 'yyyy-MM-dd')}.pdf`);
      toast({ title: "PDF downloaded successfully" });
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 no-print items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting} className="flex-1 sm:flex-none">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Save as PDF
          </Button>
          <Button onClick={handlePrint} className="flex-1 sm:flex-none">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="p-8 bg-white border rounded-lg text-slate-950">
        <div className="text-center border-b pb-6 mb-8">
          <h1 className="text-3xl font-bold text-primary">RupeeLedger</h1>
          <h2 className="text-xl font-semibold mt-2 text-slate-800">Daily Transaction Summary</h2>
          <p className="text-muted-foreground">{format(date, "EEEE, MMMM do, yyyy")}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-[10px] uppercase font-bold text-green-600 mb-1">Incoming (Credit)</p>
            <div className="text-xl font-bold text-green-700">
              <CurrencyDisplay amount={stats.credit} />
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-[10px] uppercase font-bold text-red-600 mb-1">Outgoing (Debit)</p>
            <div className="text-xl font-bold text-destructive">
              <CurrencyDisplay amount={stats.debit} />
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-[10px] uppercase font-bold text-slate-600 mb-1">Closing Net Worth</p>
            <div className="text-xl font-bold text-slate-900">
              <CurrencyDisplay amount={closingBalanceForDay} />
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-slate-900">Account</TableHead>
                <TableHead className="text-slate-900">Description / Narration</TableHead>
                <TableHead className="text-right text-slate-900">Credit (In)</TableHead>
                <TableHead className="text-right text-slate-900">Debit (Out)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-400 italic">
                    No transactions recorded for this date.
                  </TableCell>
                </TableRow>
              ) : (
                dailyTransactions.map((t) => {
                  const account = accounts.find(a => a.id === t.accountId);
                  return (
                    <TableRow key={t.id} className="border-b border-slate-100">
                      <TableCell className="font-medium text-slate-800">{account?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-xs text-slate-600">{t.description}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        {t.type === 'Credit' ? <CurrencyDisplay amount={t.amount} /> : '-'}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-semibold">
                        {t.type === 'Debit' ? <CurrencyDisplay amount={t.amount} /> : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-slate-50 font-bold">
                <TableCell colSpan={2} className="text-right text-slate-700">DAY TOTALS:</TableCell>
                <TableCell className="text-right text-green-700">
                  <CurrencyDisplay amount={stats.credit} />
                </TableCell>
                <TableCell className="text-right text-destructive">
                  <CurrencyDisplay amount={stats.debit} />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <div className="mt-8 flex flex-col items-end space-y-2">
          <div className="flex justify-between w-64 border-t border-slate-200 pt-2">
            <span className="font-medium text-slate-500">Daily Net Change:</span>
            <CurrencyDisplay amount={stats.credit - stats.debit} showSign />
          </div>
          <div className="flex justify-between w-64 border-t-2 border-primary pt-2 font-bold text-primary text-lg">
            <span>Closing Balance:</span>
            <CurrencyDisplay amount={closingBalanceForDay} />
          </div>
        </div>

        <div className="mt-12 text-center text-[10px] text-slate-400 italic pt-4 border-t border-dashed border-slate-200">
          Daily summary generated by RupeeLedger on {format(new Date(), 'PPP p')}.
        </div>
      </div>
    </div>
  );
}
