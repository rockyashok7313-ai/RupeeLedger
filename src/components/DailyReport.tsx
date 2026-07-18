"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Transaction, Account, BusinessProfile } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format, isSameDay, startOfDay, addDays } from 'date-fns';
import { Printer, Download, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [reportMode, date, selectedReportAccountId, selectedMonth, selectedYear]);

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
      return {
        ...t,
        runningBalance
      };
    });
  }, [currentTransactions, currentOpeningBalance]);

  const paginatedTransactions = useMemo(() => {
    if (pageSize === "all") return transactionsWithRunningBalance;
    const startIndex = (currentPage - 1) * pageSize;
    return transactionsWithRunningBalance.slice(startIndex, startIndex + pageSize);
  }, [transactionsWithRunningBalance, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize === "all") return 1;
    return Math.ceil(currentTransactions.length / pageSize) || 1;
  }, [currentTransactions.length, pageSize]);

  const handlePrint = async () => {
    const prevPageSize = pageSize;
    setPageSize("all");
    await new Promise(r => setTimeout(r, 150));
    window.print();
    setPageSize(prevPageSize);
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    const prevPageSize = pageSize;
    const prevPage = currentPage;
    
    setIsExporting(true);
    setPageSize("all");
    
    // Wait for DOM to expand
    await new Promise(r => setTimeout(r, 150));
    
    try {
      // Dynamically import to avoid SSR errors
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a5');
      const imgProps = pdf.getImageProperties(imgData);
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 12.7;
      const maxWidth = pageWidth - (margin * 2);
      const maxHeightFirst = pageHeight - (margin * 2);
      const headerHeight = 40; // 40mm header space (to accommodate summary row, table headers, and 5mm empty space)
      const maxHeightSubsequent = pageHeight - (margin * 2) - headerHeight; // 237mm
      
      const ratio = imgProps.width / imgProps.height;
      const printWidth = maxWidth;
      const printHeight = maxWidth / ratio;

      const formatINR = (amount: number) => {
        const isNegative = amount < 0;
        const formatted = new Intl.NumberFormat('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(Math.abs(amount));
        return `${isNegative ? '-' : ''}Rs. ${formatted}`;
      };
      
      if (printHeight <= maxHeightFirst) {
        // Fits on a single page, center it vertically
        const xOffset = margin;
        const yOffset = margin + (maxHeightFirst - printHeight) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, printWidth, printHeight);
      } else {
        // Multi-page splitting logic
        let remainingHeight = printHeight;
        let canvasYOffset = 0;
        let pageNumber = 1;
        
        const companyName = businessProfile.companyName || "RupeeLedger Pro";
        const datePeriod = reportMode === 'daily' 
          ? format(date, "dd-MM-yyyy") 
          : format(new Date(selectedYear, selectedMonth, 1), "MMMM yyyy");
          
        while (remainingHeight > 0) {
          if (pageNumber > 1) {
            pdf.addPage();
          }
          
          const maxPageHeight = pageNumber === 1 ? maxHeightFirst : maxHeightSubsequent;
          const sliceHeight = Math.min(remainingHeight, maxPageHeight);
          
          // Calculate the yOffset to position the slice correctly on this page
          const yPositionOnPage = pageNumber === 1 ? margin : (margin + headerHeight);
          const yOffset = yPositionOnPage - canvasYOffset;
          
          // Draw the canvas slice first
          pdf.addImage(imgData, 'PNG', margin, yOffset, printWidth, printHeight);

          // Cover the bottom margin area (below y = pageHeight - margin) to hide any overflow
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, pageHeight - margin, pageWidth, margin, "F");
          
          // Add Page Number to bottom
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - (margin / 2), { align: "center" });

          // Draw Branded Header and Summary row on top of the canvas for Subsequent Pages
          if (pageNumber > 1) {
            // Draw solid white cover over the header area (up to y = 45mm) to clear any bleeding transaction content
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, margin + headerHeight - 5, "F");

            // Draw Branded Header for Subsequent Pages (Left side)
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(18);
            pdf.setTextColor(15, 23, 42); // Primary space navy
            pdf.text(companyName, margin, margin + 8);
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9.5);
            pdf.setTextColor(100, 116, 139); // Slate-500
            pdf.text(reportMode === 'daily' ? 'Daily Ledger Summary' : 'Monthly Ledger Summary', margin, margin + 14);
            
            // Right aligned info (Right side)
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12);
            pdf.setTextColor(15, 23, 42);
            const reportHeading = reportMode === 'daily' ? 'DAILY TRANSACTION SUMMARY' : 'MONTHLY TRANSACTION SUMMARY';
            pdf.text(reportHeading, pageWidth - margin, margin + 6, { align: "right" });
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            pdf.setTextColor(71, 85, 105); // Slate-600
            const ledgerDetail = selectedReportAccountId === 'all' 
              ? 'All Portfolios' 
              : `Ledger: ${accounts.find(acc => acc.id === selectedReportAccountId)?.name || ''}`;
            pdf.text(ledgerDetail, pageWidth - margin, margin + 11, { align: "right" });
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            pdf.setTextColor(148, 163, 184); // Slate-400
            pdf.text(`Period: ${datePeriod}`, pageWidth - margin, margin + 15, { align: "right" });
            
            // Divider line
            pdf.setDrawColor(226, 232, 240); // Slate-200 line
            pdf.setLineWidth(0.5);
            pdf.line(margin, margin + 18, pageWidth - margin, margin + 18);

            // Draw Ledger Summary Details Row at y = 31mm (margin + 21mm)
            pdf.setFontSize(8.5);
            
            // Total Credit
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(71, 85, 105);
            pdf.text("Total Credit: ", margin, margin + 21);
            const crText = formatINR(currentStats.credit);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(21, 128, 61); // Green
            const crLabelWidth = pdf.getTextWidth("Total Credit: ");
            pdf.text(crText, margin + crLabelWidth, margin + 21);
            
            // Total Debit
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(71, 85, 105);
            pdf.text("Total Debit: ", margin + 63.3, margin + 21);
            const dbText = formatINR(currentStats.debit);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(220, 38, 38); // Red
            const dbLabelWidth = pdf.getTextWidth("Total Debit: ");
            pdf.text(dbText, margin + 63.3 + dbLabelWidth, margin + 21);
            
            // Closing Balance / Net Worth
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(71, 85, 105);
            const clLabel = selectedReportAccountId === 'all' ? "Closing Net Worth: " : "Closing Bal: ";
            pdf.text(clLabel, margin + 126.6, margin + 21);
            const clText = formatINR(currentClosingBalance);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(15, 23, 42); // Navy
            const clLabelWidth = pdf.getTextWidth(clLabel);
            pdf.text(clText, margin + 126.6 + clLabelWidth, margin + 21);

            // Divider line separating summary row from table headers
            pdf.setDrawColor(226, 232, 240); // Slate-200 line
            pdf.setLineWidth(0.5);
            pdf.line(margin, margin + 24, pageWidth - margin, margin + 24); // y = 34mm
            
            // Draw Repeated Table Headers Bar
            pdf.setFillColor(248, 250, 252);
            pdf.rect(margin, margin + 27, maxWidth, 8, "F");
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.3);
            pdf.line(margin, margin + 27, pageWidth - margin, margin + 27);
            pdf.line(margin, margin + 35, pageWidth - margin, margin + 35);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8.5);
            pdf.setTextColor(15, 23, 42);
            
            if (reportMode === 'monthly') {
              pdf.text("Date", margin + 2, margin + 32.5);
              pdf.text("Account", margin + 22, margin + 32.5);
              pdf.text("Description / Narration", margin + 55, margin + 32.5);
            } else {
              pdf.text("Account", margin + 2, margin + 32.5);
              pdf.text("Description / Narration", margin + 35, margin + 32.5);
            }
            pdf.text("Credit (In)", 135, margin + 32.5, { align: "right" });
            pdf.text("Debit (Out)", 165, margin + 32.5, { align: "right" });
            pdf.text("Balance", 197, margin + 32.5, { align: "right" });
          }
          
          canvasYOffset += sliceHeight;
          remainingHeight -= sliceHeight;
          pageNumber++;
        }
      }
      
      const selectedAccName = selectedReportAccountId === 'all' 
        ? 'All_Accounts' 
        : (accounts.find(a => a.id === selectedReportAccountId)?.name || 'Account').replace(/\s+/g, '_');
        
      const filename = reportMode === 'daily' 
        ? `Daily_Report_${selectedAccName}_${format(date, 'dd-MM-yyyy')}.pdf`
        : `Monthly_Report_${selectedAccName}_${format(new Date(selectedYear, selectedMonth, 1), 'MM-yyyy')}.pdf`;
      pdf.save(filename);
      toast({ title: "PDF downloaded successfully" });
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setPageSize(prevPageSize);
      setCurrentPage(prevPage);
      setIsExporting(false);
    }
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

      <div className="flex-1 overflow-y-auto p-6 pt-2">
        <div ref={reportRef} className="p-8 bg-white border rounded-lg text-slate-950">
        <div className="text-center border-b pb-6 mb-8 space-y-1">
          <h1 className="text-3xl font-bold text-primary">
            {businessProfile.companyName || "RupeeLedger Pro"}
          </h1>
          {businessProfile.address && (
            <p className="text-xs text-muted-foreground font-medium">{businessProfile.address}</p>
          )}
          {businessProfile.gstin && (
            <p className="text-xs text-muted-foreground font-mono">GSTIN: {businessProfile.gstin}</p>
          )}
          <h2 className="text-lg font-semibold text-slate-800 pt-2">
            {reportMode === 'daily' ? 'Daily Transaction Summary' : 'Monthly Transaction Summary'}
            {selectedReportAccountId !== "all" && ` - ${accounts.find(a => a.id === selectedReportAccountId)?.name}`}
          </h2>
          <p className="text-muted-foreground text-xs font-semibold">
            Period: {reportMode === 'daily' 
              ? format(date, "dd-MM-yyyy") 
              : format(new Date(selectedYear, selectedMonth, 1), "MMMM yyyy")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-[10px] uppercase font-bold text-green-600 mb-1">Incoming (Credit)</p>
            <div className="text-xl font-bold text-green-700">
              <CurrencyDisplay amount={currentStats.credit} />
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-[10px] uppercase font-bold text-red-600 mb-1">Outgoing (Debit)</p>
            <div className="text-xl font-bold text-destructive">
              <CurrencyDisplay amount={currentStats.debit} />
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-[10px] uppercase font-bold text-slate-600 mb-1">Closing Net Worth</p>
            <div className="text-xl font-bold text-slate-900">
              <CurrencyDisplay amount={currentClosingBalance} />
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100 border-b-2 border-slate-200">
                {reportMode === 'monthly' && <TableHead className="text-slate-900 font-bold text-xs uppercase">Date</TableHead>}
                <TableHead className="text-slate-900 font-bold text-xs uppercase">Account</TableHead>
                <TableHead className="text-slate-900 font-bold text-xs uppercase">Description / Narration</TableHead>
                <TableHead className="text-right text-slate-900 font-bold text-xs uppercase">Credit (In)</TableHead>
                <TableHead className="text-right text-slate-900 font-bold text-xs uppercase">Debit (Out)</TableHead>
                <TableHead className="text-right text-slate-900 font-bold text-xs uppercase">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={reportMode === 'monthly' ? 6 : 5} className="text-center py-12 text-slate-400 italic">
                    No transactions recorded for this period.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((t) => {
                  const account = accounts.find(a => a.id === t.accountId);
                  return (
                     <TableRow key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                       {reportMode === 'monthly' && (
                         <TableCell className="whitespace-nowrap font-bold text-slate-700 text-xs">
                           {format(new Date(t.date), "dd-MM-yyyy")}
                         </TableCell>
                       )}
                       <TableCell className="font-extrabold text-slate-900">{account?.name || 'Unknown'}</TableCell>
                       <TableCell className="text-xs text-slate-900 font-bold">{t.description}</TableCell>
                       <TableCell className="text-right text-green-700 font-extrabold">
                         {t.type === 'Credit' ? <CurrencyDisplay amount={t.amount} /> : '-'}
                       </TableCell>
                       <TableCell className="text-right text-destructive font-bold">
                         {t.type === 'Debit' ? <CurrencyDisplay amount={t.amount} /> : '-'}
                       </TableCell>
                       <TableCell className="text-right text-slate-950 font-bold bg-slate-50/30">
                         <CurrencyDisplay amount={t.runningBalance} />
                       </TableCell>
                     </TableRow>
                  );
                })
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <TableCell colSpan={reportMode === 'monthly' ? 3 : 2} className="text-right text-slate-800 uppercase tracking-wider text-xs font-bold">Period Totals:</TableCell>
                <TableCell className="text-right text-green-700 font-extrabold text-sm">
                  <CurrencyDisplay amount={currentStats.credit} />
                </TableCell>
                <TableCell className="text-right text-destructive font-extrabold text-sm">
                  <CurrencyDisplay amount={currentStats.debit} />
                </TableCell>
                <TableCell className="text-right text-primary font-extrabold text-sm bg-slate-200/50">
                  <CurrencyDisplay amount={currentClosingBalance} />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="no-print mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <span>Show:</span>
            <Select 
              value={pageSize.toString()} 
              onValueChange={(val) => {
                const valNum = val === 'all' ? 'all' : parseInt(val);
                setPageSize(valNum);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[85px] h-8 bg-background border-slate-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="20">20 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
                <SelectItem value="all">All rows</SelectItem>
              </SelectContent>
            </Select>
            <span>
              {pageSize !== 'all' ? (
                `Showing ${Math.min(currentTransactions.length, (currentPage - 1) * pageSize + 1)}-${Math.min(currentTransactions.length, currentPage * pageSize)} of ${currentTransactions.length} entries`
              ) : (
                `Showing ${currentTransactions.length} entries`
              )}
            </span>
          </div>

          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                type="button"
                className="h-8 w-8 text-slate-500 hover:text-slate-900 border-slate-200 bg-white"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                &lt;&lt;
              </Button>
              <Button
                variant="outline"
                size="icon"
                type="button"
                className="h-8 w-8 text-slate-500 hover:text-slate-900 border-slate-200 bg-white"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                &lt;
              </Button>
              
              <div className="px-2.5 py-1.5 border rounded bg-slate-50 text-slate-700 text-xs">
                Page {currentPage} of {totalPages}
              </div>

              <Button
                variant="outline"
                size="icon"
                type="button"
                className="h-8 w-8 text-slate-500 hover:text-slate-900 border-slate-200 bg-white"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                &gt;
              </Button>
              <Button
                variant="outline"
                size="icon"
                type="button"
                className="h-8 w-8 text-slate-500 hover:text-slate-900 border-slate-200 bg-white"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                &gt;&gt;
              </Button>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-end space-y-2">
          {reportMode === 'monthly' && (
            <div className="flex justify-between w-64 pt-2">
              <span className="font-medium text-slate-500">Opening Balance:</span>
              <CurrencyDisplay amount={currentOpeningBalance} />
            </div>
          )}
          <div className="flex justify-between w-64 border-t border-slate-200 pt-2">
            <span className="font-medium text-slate-500">Period Net Change:</span>
            <CurrencyDisplay amount={currentStats.credit - currentStats.debit} showSign />
          </div>
          <div className="flex justify-between w-64 border-t-2 border-primary pt-2 font-bold text-primary text-lg">
            <span>Closing Balance:</span>
            <CurrencyDisplay amount={currentClosingBalance} />
          </div>
        </div>

        <div className="mt-12 text-center text-[10px] text-slate-400 italic pt-4 border-t border-dashed border-slate-200 space-y-1">
          {businessProfile.printFooter && (
            <p className="font-semibold text-slate-500 mb-2">{businessProfile.printFooter}</p>
          )}
          <p>
            Period summary generated by {businessProfile.companyName || "RupeeLedger Pro"} on {format(new Date(), 'PPP p')}.
          </p>
        </div>
      </div>
    </div>

      {/* 3. Footer (Fixed Close Button) */}
      <div className="flex-none p-4 border-t mt-auto flex justify-end no-print bg-slate-50 border-slate-200/80 rounded-b-lg">
        <Button onClick={onClose} variant="outline" className="h-9 px-6 font-semibold bg-white text-slate-700 hover:bg-slate-50">
          Close Report
        </Button>
      </div>
    </div>
  );
}
