"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Transaction, Account, BusinessProfile } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format, isSameDay, startOfDay, addDays } from 'date-fns';
import { Printer, Download, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { toast } from '@/hooks/use-toast';
import { fetchReportHTML, downloadReportPDF } from '@/lib/pdfExport';

export function DailyReport({ 
  transactions, 
  accounts,
  dateInput,
  setDateInput,
  date,
  reportMode,
  setReportMode,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  businessProfile,
  onClose
}: { 
  transactions: Transaction[]; 
  accounts: Account[];
  dateInput: string;
  setDateInput: (val: string) => void;
  date: Date;
  reportMode: "daily" | "monthly";
  setReportMode: (mode: "daily" | "monthly") => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  businessProfile: BusinessProfile;
  onClose?: () => void;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedReportAccountId, setSelectedReportAccountId] = useState<string>("all");
  const reportRef = useRef<HTMLDivElement>(null);

  const [monthView, setMonthView] = useState<Date>(date);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [htmlContent, setHtmlContent] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setMonthView(date);
  }, [date]);

  const startOfMonthDate = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1);
  }, [selectedYear, selectedMonth]);

  const endOfMonthDate = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
  }, [selectedYear, selectedMonth]);

  const dailyTransactions = useMemo(() => {
    let list = transactions.filter(t => isSameDay(new Date(t.date), date));
    if (selectedReportAccountId !== "all") {
      list = list.filter(t => t.accountId === selectedReportAccountId);
    }
    return list.sort((a, b) => a.date - b.date);
  }, [transactions, date, selectedReportAccountId]);

  const dailyStats = useMemo(() => {
    return dailyTransactions.reduce((acc, t) => {
      if (t.type === 'Credit') acc.credit += t.amount;
      else acc.debit += t.amount;
      return acc;
    }, { credit: 0, debit: 0 });
  }, [dailyTransactions]);

  const closingBalanceForDay = useMemo(() => {
    const endOfSelectedDay = startOfDay(addDays(date, 1)).getTime();
    const targetAccounts = selectedReportAccountId === "all" 
      ? accounts 
      : accounts.filter(a => a.id === selectedReportAccountId);
    const initialTotal = targetAccounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
    const netChange = transactions
      .filter(t => {
        const matchesDate = t.date < endOfSelectedDay;
        const matchesAccount = selectedReportAccountId === "all" || t.accountId === selectedReportAccountId;
        return matchesDate && matchesAccount;
      })
      .reduce((sum, t) => {
        return t.type === 'Credit' ? sum + t.amount : sum - t.amount;
      }, 0);
    return initialTotal + netChange;
  }, [accounts, transactions, date, selectedReportAccountId]);

  const monthlyTransactions = useMemo(() => {
    const start = startOfMonthDate.getTime();
    const end = endOfMonthDate.getTime();
    let list = transactions.filter(t => t.date >= start && t.date <= end);
    if (selectedReportAccountId !== "all") {
      list = list.filter(t => t.accountId === selectedReportAccountId);
    }
    return list.sort((a, b) => a.date - b.date);
  }, [transactions, startOfMonthDate, endOfMonthDate, selectedReportAccountId]);

  const monthlyStats = useMemo(() => {
    return monthlyTransactions.reduce((acc, t) => {
      if (t.type === 'Credit') acc.credit += t.amount;
      else acc.debit += t.amount;
      return acc;
    }, { credit: 0, debit: 0 });
  }, [monthlyTransactions]);

  const openingBalanceForMonth = useMemo(() => {
    const start = startOfMonthDate.getTime();
    const targetAccounts = selectedReportAccountId === "all" 
      ? accounts 
      : accounts.filter(a => a.id === selectedReportAccountId);
    const initialTotal = targetAccounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
    const netChange = transactions
      .filter(t => {
        const matchesDate = t.date < start;
        const matchesAccount = selectedReportAccountId === "all" || t.accountId === selectedReportAccountId;
        return matchesDate && matchesAccount;
      })
      .reduce((sum, t) => {
        return t.type === 'Credit' ? sum + t.amount : sum - t.amount;
      }, 0);
    return initialTotal + netChange;
  }, [accounts, transactions, startOfMonthDate, selectedReportAccountId]);

  const closingBalanceForMonth = useMemo(() => {
    return openingBalanceForMonth + monthlyStats.credit - monthlyStats.debit;
  }, [openingBalanceForMonth, monthlyStats]);

  const currentTransactions = reportMode === 'daily' ? dailyTransactions : monthlyTransactions;
  const currentStats = reportMode === 'daily' ? dailyStats : monthlyStats;
  const currentOpeningBalance = reportMode === 'daily' ? (closingBalanceForDay - (dailyStats.credit - dailyStats.debit)) : openingBalanceForMonth;
  const currentClosingBalance = reportMode === 'daily' ? closingBalanceForDay : closingBalanceForMonth;

  const transactionsWithRunningBalance = useMemo(() => {
    let runningBalance = currentOpeningBalance;
    return currentTransactions.map(t => {
      if (t.type === 'Credit') {
        runningBalance += t.amount;
      } else {
        runningBalance -= t.amount;
      }
      return { ...t, runningBalance };
    });
  }, [currentTransactions, currentOpeningBalance]);

  const reportData = useMemo(() => {
    const reportHeading = reportMode === 'daily' 
      ? `Daily Ledger Report - ${format(date, 'PPP')}` 
      : `Monthly Ledger Report - ${format(startOfMonthDate, 'MMMM yyyy')}`;

    const ledgerDetail = selectedReportAccountId === 'all' 
      ? 'All Accounts' 
      : accounts.find(a => a.id === selectedReportAccountId)?.name || 'Unknown Account';

    const datePeriod = reportMode === 'daily' 
      ? format(date, 'dd-MM-yyyy')
      : `${format(startOfMonthDate, 'dd-MM-yyyy')} to ${format(endOfMonthDate, 'dd-MM-yyyy')}`;

    return {
      reportHeading,
      ledgerDetail,
      datePeriod,
      transactions: transactionsWithRunningBalance,
      currentStats,
      currentOpeningBalance,
      currentClosingBalance,
      businessProfile
    };
  }, [reportMode, date, startOfMonthDate, endOfMonthDate, selectedReportAccountId, accounts, transactionsWithRunningBalance, currentStats, currentOpeningBalance, currentClosingBalance, businessProfile]);

  useEffect(() => {
    async function loadPreview() {
      setIsExporting(true);
      try {
        const html = await fetchReportHTML('ledger', reportData);
        setHtmlContent(html);
      } catch (err: any) {
        console.error(err);
        setHtmlContent(`<html><body><h2 style="color:red; font-family:sans-serif; padding: 20px;">Preview Error</h2><pre style="padding: 20px;">${err.message}</pre></body></html>`);
      } finally {
        setIsExporting(false);
      }
    }
    loadPreview();
  }, [reportData]);

  const handlePrint = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    iframeRef.current.contentWindow.print();
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  return (
    <div className="flex flex-col h-[78vh] max-h-[78vh] -mx-6 -my-6 bg-background rounded-lg overflow-hidden">
      <div className="flex-none p-6 pb-4 border-b no-print">
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-slate-500">Report Scope</Label>
              <div className="flex items-center border rounded-md p-0.5 bg-slate-50 border-slate-200 h-9.5">
                <Button
                  type="button"
                  variant={reportMode === 'daily' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold"
                  onClick={() => setReportMode('daily')}
                >
                  Daily Ledger
                </Button>
                <Button
                  type="button"
                  variant={reportMode === 'monthly' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold"
                  onClick={() => setReportMode('monthly')}
                >
                  Month Wise
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-slate-500">Select Ledger</Label>
              <Select 
                value={selectedReportAccountId} 
                onValueChange={setSelectedReportAccountId}
              >
                <SelectTrigger className="w-[180px] bg-background border-slate-200 h-9">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reportMode === 'daily' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="report-date" className="text-xs font-semibold text-slate-500">Report Date (DD-MM-YYYY)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex items-center">
                    <Input
                      id="report-date"
                      type="text"
                      placeholder="e.g. 16-06-2026"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-[180px] bg-background border-slate-200 pr-10 h-9"
                    />
                    <div className="absolute right-0">
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900">
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => {
                              if (d) {
                                setDateInput(format(d, "dd-MM-yyyy"));
                                setIsCalendarOpen(false);
                              }
                            }}
                            month={monthView}
                            onMonthChange={setMonthView}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 border rounded-md p-0.5 bg-slate-50 border-slate-200">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs flex items-center gap-1"
                      onClick={() => setDateInput(format(addDays(date, -1), "dd-MM-yyyy"))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </Button>
                    <div className="h-4 w-[1px] bg-slate-200" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => setDateInput(format(new Date(), "dd-MM-yyyy"))}
                    >
                      Today
                    </Button>
                    <div className="h-4 w-[1px] bg-slate-200" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs flex items-center gap-1"
                      onClick={() => setDateInput(format(addDays(date, 1), "dd-MM-yyyy"))}
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Select Month</Label>
                  <Select 
                    value={selectedMonth.toString()} 
                    onValueChange={(val) => setSelectedMonth(parseInt(val))}
                  >
                    <SelectTrigger className="w-[140px] bg-background border-slate-200 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {format(new Date(2026, i, 1), "MMMM")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Year</Label>
                  <Select 
                    value={selectedYear.toString()} 
                    onValueChange={(val) => setSelectedYear(parseInt(val))}
                  >
                    <SelectTrigger className="w-[100px] bg-background border-slate-200 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }).map((_, i) => {
                        const y = new Date().getFullYear() - 5 + i;
                        return (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto self-end">
            <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting} className="flex-1 sm:flex-none h-9">
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Save as PDF
            </Button>
            <Button onClick={handlePrint} className="flex-1 sm:flex-none h-9">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pt-2 bg-slate-100">
        {isExporting ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Generating report...
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            className="w-full h-full bg-white border border-slate-200 rounded shadow-sm"
            title="Ledger Report Preview"
            sandbox="allow-same-origin allow-scripts"
          />
        )}
      </div>
      
      <div className="flex-none p-4 border-t mt-auto flex justify-end no-print bg-slate-50 border-slate-200/80 rounded-b-lg">
        <Button onClick={onClose} variant="outline" className="h-9 px-6 font-semibold bg-white text-slate-700 hover:bg-slate-50">
          Close Report
        </Button>
      </div>
    </div>
  );
}
