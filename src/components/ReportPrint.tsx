"use client";

import React, { useRef, useState } from 'react';
import { Transaction, Account, BusinessProfile } from '@/lib/types';
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
import { toast } from '@/hooks/use-toast';

export function ReportPrint({ 
  account, 
  transactions,
  businessProfile
}: { 
  account: Account; 
  transactions: Transaction[];
  businessProfile: BusinessProfile;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
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
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
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
        
        const companyName = businessProfile.companyName || "RupeeLedger";
        
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

          // Draw Branded Header and Summary row on top of the canvas for Subsequent Pages
          if (pageNumber > 1) {
            // Draw solid white cover over the header area (up to y = 45mm) to clear any bleeding transaction content
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, margin + headerHeight - 5, "F");

            // Draw Branded Header (Left side)
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(18);
            pdf.setTextColor(233, 64, 87); // Metallic pink match
            pdf.text(companyName, margin, margin + 8);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9.5);
            pdf.setTextColor(100, 116, 139); // Slate-500
            pdf.text("Transaction Statement", margin, margin + 14);
            
            // Right aligned info (Right side)
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            pdf.setTextColor(15, 23, 42);
            pdf.text(account.name.toUpperCase(), pageWidth - margin, margin + 6, { align: "right" });
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            pdf.setTextColor(71, 85, 105); // Slate-600
            pdf.text(`Account Type: ${account.type}`, pageWidth - margin, margin + 11, { align: "right" });
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8);
            pdf.setTextColor(148, 163, 184); // Slate-400
            pdf.text(`Generated: ${format(new Date(), 'PPP p')}`, pageWidth - margin, margin + 15, { align: "right" });
            
            // Divider line
            pdf.setDrawColor(226, 232, 240); // Slate-200 line
            pdf.setLineWidth(0.5);
            pdf.line(margin, margin + 18, pageWidth - margin, margin + 18);

            // Draw Ledger Summary Details Row at y = 31mm (margin + 21mm)
            pdf.setFontSize(8.5);
            
            // Opening Bal
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(71, 85, 105);
            pdf.text("Opening Bal: ", margin, margin + 21);
            const opBalText = formatINR(account.initialBalance);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(15, 23, 42);
            const opLabelWidth = pdf.getTextWidth("Opening Bal: ");
            pdf.text(opBalText, margin + opLabelWidth, margin + 21);
            
            // Total Credit
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(71, 85, 105);
            pdf.text("Total Credit: ", margin + 47.5, margin + 21);
            const creditText = formatINR(totals.credit);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(21, 128, 61); // Green
            const crLabelWidth = pdf.getTextWidth("Total Credit: ");
            pdf.text(creditText, margin + 47.5 + crLabelWidth, margin + 21);
            
            // Total Debit
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(71, 85, 105);
            pdf.text("Total Debit: ", margin + 95, margin + 21);
            const debitText = formatINR(totals.debit);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(220, 38, 38); // Red
            const dbLabelWidth = pdf.getTextWidth("Total Debit: ");
            pdf.text(debitText, margin + 95 + dbLabelWidth, margin + 21);
            
            // Closing Bal
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(71, 85, 105);
            pdf.text("Closing Bal: ", margin + 142.5, margin + 21);
            const clBalText = formatINR(account.currentBalance);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(15, 23, 42); // Navy
            const clLabelWidth = pdf.getTextWidth("Closing Bal: ");
            pdf.text(clBalText, margin + 142.5 + clLabelWidth, margin + 21);

            // Divider line separating summary row from table headers
            pdf.setDrawColor(226, 232, 240); // Slate-200 line
            pdf.setLineWidth(0.5);
            pdf.line(margin, margin + 24, pageWidth - margin, margin + 24); // y = 34mm
            
            // Draw Repeated Table Headers Bar
            pdf.setFillColor(248, 250, 252); // slate-50
            pdf.rect(margin, margin + 27, maxWidth, 8, "F");
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.3);
            pdf.line(margin, margin + 27, pageWidth - margin, margin + 27);
            pdf.line(margin, margin + 35, pageWidth - margin, margin + 35);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8.5);
            pdf.setTextColor(15, 23, 42);
            
            pdf.text("Date", margin + 3, margin + 32.5);
            pdf.text("Description / Narration", margin + 32, margin + 32.5);
            pdf.text("Credit (In)", 135, margin + 32.5, { align: "right" });
            pdf.text("Debit (Out)", 165, margin + 32.5, { align: "right" });
            pdf.text("Balance", 197, margin + 32.5, { align: "right" });
          }
          
          canvasYOffset += sliceHeight;
          remainingHeight -= sliceHeight;
          pageNumber++;
        }
      }
      pdf.save(`Account_Statement_${account.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast({ title: "PDF downloaded successfully" });
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

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

      <div ref={reportRef} className="p-8 metallic-bg font-bold border border-gray-200 rounded-lg text-slate-950 font-bold">
        <div className="flex flex-col sm:flex-row justify-between items-start border-b-4 border-pink-400 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-4xl metallic-text tracking-wider">
              {businessProfile.companyName || "RupeeLedger"}
            </h1>
            {businessProfile.address && (
              <p className="text-sm font-bold text-slate-700 mt-1 max-w-sm">{businessProfile.address}</p>
            )}
            {businessProfile.gstin && (
              <p className="text-sm font-bold text-slate-700 mt-0.5">GSTIN: {businessProfile.gstin}</p>
            )}
            <p className="text-base font-extrabold text-slate-800 mt-2">Transaction Statement</p>
          </div>
          <div className="text-left sm:text-right">
            <h2 className="text-2xl font-extrabold uppercase metallic-text">{account.name}</h2>
            <p className="text-sm font-bold text-slate-700">Account Type: {account.type}</p>
            {businessProfile.phone && (
              <p className="text-xs font-bold text-slate-600">Contact: {businessProfile.phone}</p>
            )}
            <p className="text-xs font-bold text-slate-500 mt-1">Generated: {format(new Date(), 'PPP p')}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-slate-50/80 rounded-lg border-2 border-slate-200 shadow-sm">
            <p className="text-xs uppercase font-extrabold text-slate-700">Opening Balance</p>
            <div className="text-xl font-extrabold text-slate-900 mt-1">
              <CurrencyDisplay amount={account.initialBalance} />
            </div>
          </div>
          <div className="p-4 bg-green-50/80 rounded-lg border-2 border-green-200 shadow-sm">
            <p className="text-xs uppercase font-extrabold text-green-700">Total Credit (+)</p>
            <div className="text-xl font-extrabold text-green-800 mt-1">
              <CurrencyDisplay amount={totals.credit} />
            </div>
          </div>
          <div className="p-4 bg-red-50/80 rounded-lg border-2 border-red-200 shadow-sm">
            <p className="text-xs uppercase font-extrabold text-red-700">Total Debit (-)</p>
            <div className="text-xl font-extrabold text-destructive mt-1">
              <CurrencyDisplay amount={totals.debit} />
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-lg shadow-md border-2 border-pink-400">
            <p className="text-xs uppercase font-extrabold opacity-90 text-white">Closing Balance</p>
            <div className="text-xl font-extrabold mt-1 text-white">
              <CurrencyDisplay amount={account.currentBalance} />
            </div>
          </div>
        </div>

        <div className="border-2 border-slate-300 rounded-lg overflow-hidden bg-white/50 backdrop-blur-sm">
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
                  <TableRow key={t.id} className="border-b-2 border-slate-200 font-bold">
                    <TableCell className="whitespace-nowrap text-slate-900 font-bold">
                      {format(t.date, "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm text-slate-800 font-bold">
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
              <TableRow className="bg-slate-100 font-extrabold border-t-2 border-slate-300">
                <TableCell colSpan={2} className="text-right font-extrabold text-slate-900">TOTALS / CLOSING:</TableCell>
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

        <div className="mt-12 text-center text-xs font-bold text-slate-600 italic border-t-2 border-slate-300 pt-4 space-y-1">
          {businessProfile.printFooter && (
            <p className="font-extrabold text-slate-800 mb-1">{businessProfile.printFooter}</p>
          )}
          <p>
            End of Statement - This is an electronically generated report from {businessProfile.companyName || "RupeeLedger"}.
          </p>
        </div>
      </div>
    </div>
  );
}
