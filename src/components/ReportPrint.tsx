
import React, { useRef, useState } from 'react';
import { Transaction, Account, BusinessProfile } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format } from 'date-fns';
import { Printer, Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
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
  const [currentPage, setCurrentPage] = useState(1);
  const reportRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 150));
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const pages = reportRef.current.querySelectorAll('.pdf-page');
      if (pages.length === 0) throw new Error("No pages found");

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 12.7;
        const maxWidth = pageWidth - (margin * 2);
        
        const ratio = imgProps.width / imgProps.height;
        const printHeight = maxWidth / ratio;
        
        pdf.addImage(imgData, 'PNG', margin, margin, maxWidth, printHeight);
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

  const PAGE_1_MAX = 16;
  const PAGE_OTHER_MAX = 16;
  
  const chunkedTransactions = [];
  let runningIndex = 0;
  
  if (sortedTransactions.length === 0) {
    chunkedTransactions.push({ rows: [], isLast: true, bf: 0, cf: 0, pageNum: 1 });
  } else {
    let pageNum = 1;
    while (runningIndex < sortedTransactions.length) {
      const isFirstPage = pageNum === 1;
      const maxRows = isFirstPage ? PAGE_1_MAX : PAGE_OTHER_MAX;
      
      const chunk = sortedTransactions.slice(runningIndex, runningIndex + maxRows);
      
      let bf = 0;
      if (isFirstPage) {
        bf = account.initialBalance;
      } else {
        bf = sortedTransactions[runningIndex - 1].balanceAfter;
      }
      
      runningIndex += maxRows;
      const isLast = runningIndex >= sortedTransactions.length;
      
      let cf = 0;
      if (!isLast) {
        cf = chunk[chunk.length - 1].balanceAfter;
      }
      
      chunkedTransactions.push({ rows: chunk, isLast, bf, cf, pageNum });
      pageNum++;
    }
  }

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'Credit') acc.credit += t.amount;
    else acc.debit += t.amount;
    return acc;
  }, { credit: 0, debit: 0 });

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .pdf-page {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
        }
        .pdf-page tr {
          page-break-inside: avoid;
        }
      `}</style>
      <div className="sticky top-0 z-50 flex flex-col sm:flex-row gap-4 no-print items-start sm:items-center justify-between mb-4 bg-slate-100 p-3 shadow-md rounded-b-md">
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handlePrint} className="flex-1 sm:flex-none">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting} className="flex-1 sm:flex-none">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </div>
        
        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-md border border-slate-200 w-full sm:w-auto justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const newPage = Math.max(1, currentPage - 1);
                setCurrentPage(newPage);
                document.getElementById(`pdf-page-${newPage}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              disabled={currentPage === 1 || isExporting}
            >
              Prev Page
            </Button>
            <span className="text-sm font-semibold text-slate-700">
              Page {currentPage} of {chunkedTransactions.length}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const newPage = Math.min(chunkedTransactions.length, currentPage + 1);
                setCurrentPage(newPage);
                document.getElementById(`pdf-page-${newPage}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              disabled={currentPage === chunkedTransactions.length || isExporting}
            >
              Next Page
            </Button>
          </div>
      </div>

      <div ref={reportRef} className="print-only-reset flex flex-col items-center gap-8 bg-gray-100 p-4 rounded-md">
        {chunkedTransactions.map((chunk, index) => (
          <div 
            key={index} 
            id={`pdf-page-${index + 1}`}
            className="pdf-page scroll-mt-20 relative p-8 bg-white text-black font-sans w-[210mm] h-[297mm] shadow-lg border border-gray-300 break-after-page flex flex-col"
          >
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-black pb-4 mb-6 gap-4 shrink-0">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wider text-black">
                  {businessProfile.companyName || "RupeeLedger Pro"}
                </h1>
                {index === 0 && businessProfile.address && (
                  <p className="text-sm font-semibold text-gray-800 mt-1 max-w-sm whitespace-pre-wrap">{businessProfile.address}</p>
                )}
                {index === 0 && businessProfile.gstin && (
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">GSTIN: {businessProfile.gstin}</p>
                )}
              </div>
              <div className="text-left sm:text-right">
                <h2 className="text-xl font-bold uppercase text-black">STATEMENT OF ACCOUNT</h2>
                <p className="text-sm font-semibold text-gray-800 mt-2">Account Name: <span className="font-bold text-black">{account.name}</span></p>
                <p className="text-sm font-semibold text-gray-800">Account Type: <span className="font-bold text-black">{account.type}</span></p>
                <p className="text-xs font-semibold text-gray-600 mt-1">Generated: {format(new Date(), 'dd-MMM-yyyy HH:mm')}</p>
              </div>
            </div>

            {/* SUMMARY ONLY ON FIRST PAGE */}
            {index === 0 && (
              <div className="flex justify-between items-center border border-black mb-8 shrink-0">
                <div className="flex-1 p-3 text-center border-r border-black bg-gray-50">
                  <p className="text-xs uppercase font-bold text-gray-700">Opening Balance</p>
                  <div className="text-lg font-bold text-black mt-1">
                    <CurrencyDisplay amount={account.initialBalance} />
                  </div>
                </div>
                <div className="flex-1 p-3 text-center border-r border-black bg-gray-50">
                  <p className="text-xs uppercase font-bold text-gray-700">Total Credit (Cr)</p>
                  <div className="text-lg font-bold text-black mt-1">
                    <CurrencyDisplay amount={totals.credit} />
                  </div>
                </div>
                <div className="flex-1 p-3 text-center border-r border-black bg-gray-50">
                  <p className="text-xs uppercase font-bold text-gray-700">Total Debit (Dr)</p>
                  <div className="text-lg font-bold text-black mt-1">
                    <CurrencyDisplay amount={totals.debit} />
                  </div>
                </div>
                <div className="flex-1 p-3 text-center bg-gray-100">
                  <p className="text-xs uppercase font-bold text-black">Closing Balance</p>
                  <div className="text-xl font-bold text-black mt-1">
                    <CurrencyDisplay amount={account.currentBalance} />
                  </div>
                </div>
              </div>
            )}

            {/* TABLE CHUNK */}
            <div className="border-t-2 border-l-2 border-r-2 border-black border-b-2 flex-grow flex flex-col">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-200 border-b-2 border-black">
                    <th className="py-2 px-3 text-left font-bold text-black border-r-2 border-black w-28">Date</th>
                    <th className="py-2 px-3 text-left font-bold text-black border-r-2 border-black">Particulars / Narration</th>
                    <th className="py-2 px-3 text-right font-bold text-black border-r-2 border-black w-32">Debit (Dr)</th>
                    <th className="py-2 px-3 text-right font-bold text-black border-r-2 border-black w-32">Credit (Cr)</th>
                    <th className="py-2 px-3 text-right font-bold text-black w-36">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance for first page */}
                  {chunk.pageNum === 1 && (
                    <tr className="border-b border-gray-400 font-bold bg-gray-50">
                      <td className="py-2 px-3 text-black border-r-2 border-black">-</td>
                      <td className="py-2 px-3 text-black border-r-2 border-black">OPENING BALANCE</td>
                      <td className="py-2 px-3 text-black border-r-2 border-black"></td>
                      <td className="py-2 px-3 text-black border-r-2 border-black"></td>
                      <td className="py-2 px-3 text-right text-black">
                        <CurrencyDisplay amount={account.initialBalance} />
                      </td>
                    </tr>
                  )}

                  {/* Brought Forward for intermediate pages */}
                  {chunk.pageNum > 1 && (
                    <tr className="border-b-2 border-black bg-gray-50 font-bold">
                      <td colSpan={4} className="py-2 px-3 text-right text-black border-r-2 border-black">BALANCE B/F:</td>
                      <td className="py-2 px-3 text-right text-black">
                        <CurrencyDisplay amount={chunk.bf} />
                      </td>
                    </tr>
                  )}

                  {chunk.rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-600 font-semibold">
                        No transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    chunk.rows.map((t: Transaction) => (
                      <tr key={t.id} className="border-b border-gray-400 font-semibold last:border-b-0">
                        <td className="py-2 px-3 whitespace-nowrap text-black border-r-2 border-black">
                          {format(t.date, "dd-MMM-yyyy")}
                        </td>
                        <td className="py-2 px-3 text-black border-r-2 border-black">
                          {t.description}
                        </td>
                        <td className="py-2 px-3 text-right text-black border-r-2 border-black">
                          {t.type === "Debit" ? <CurrencyDisplay amount={t.amount} /> : ""}
                        </td>
                        <td className="py-2 px-3 text-right text-black border-r-2 border-black">
                          {t.type === "Credit" ? <CurrencyDisplay amount={t.amount} /> : ""}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-black">
                          <CurrencyDisplay amount={t.balanceAfter} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                
                {/* FOOTER TOTALS ONLY ON LAST PAGE */}
                {chunk.isLast ? (
                  chunk.rows.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-100 font-bold border-t-2 border-black">
                        <td colSpan={2} className="py-2 px-3 text-right text-black border-r-2 border-black">TOTALS / CLOSING:</td>
                        <td className="py-2 px-3 text-right text-black border-r-2 border-black">
                          <CurrencyDisplay amount={totals.debit} />
                        </td>
                        <td className="py-2 px-3 text-right text-black border-r-2 border-black">
                          <CurrencyDisplay amount={totals.credit} />
                        </td>
                        <td className="py-2 px-3 text-right text-black text-base">
                          <CurrencyDisplay amount={account.currentBalance} />
                        </td>
                      </tr>
                    </tfoot>
                  )
                ) : (
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t-2 border-black">
                      <td colSpan={4} className="py-2 px-3 text-right text-black border-r-2 border-black italic">PAGE CONTINUE (BALANCE C/F) ...</td>
                      <td className="py-2 px-3 text-right text-black">
                        <CurrencyDisplay amount={chunk.cf} />
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* FOOTER & PAGE NUMBERS */}
            <div className="mt-auto pt-4 flex justify-between items-end text-xs font-semibold text-gray-700 italic shrink-0">
              <div>
                {businessProfile.printFooter && (
                  <p className="font-bold text-black mb-1">{businessProfile.printFooter}</p>
                )}
                <p>
                  ** This is a computer generated report from {businessProfile.companyName || "RupeeLedger Pro"} **
                </p>
              </div>
              <div className="text-right text-black font-bold text-sm">
                Page {chunk.pageNum} of {chunkedTransactions.length}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
