import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Transaction, Account, BusinessProfile } from '@/lib/types';
import { format } from 'date-fns';
import { Printer, Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { fetchReportHTML, downloadReportPDF } from '@/lib/pdfExport';

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
  const [htmlContent, setHtmlContent] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const reportData = useMemo(() => {
    const sortedTransactions = [...transactions].sort((a, b) => a.date - b.date);
    
    let runningBalance = account.initialBalance;
    const transactionsWithRunningBalance = sortedTransactions.map(t => {
      if (t.type === 'Credit') {
        runningBalance += t.amount;
      } else {
        runningBalance -= t.amount;
      }
      return { ...t, runningBalance };
    });

    const currentStats = transactions.reduce((acc, t) => {
      if (t.type === 'Credit') acc.credit += t.amount;
      else acc.debit += t.amount;
      return acc;
    }, { credit: 0, debit: 0 });

    return {
      reportHeading: 'STATEMENT OF ACCOUNT',
      ledgerDetail: `Account: ${account.name} | Type: ${account.type}`,
      datePeriod: 'All Time',
      transactions: transactionsWithRunningBalance,
      currentStats,
      currentOpeningBalance: account.initialBalance,
      currentClosingBalance: account.currentBalance,
      businessProfile
    };
  }, [account, transactions, businessProfile]);

  useEffect(() => {
    async function loadPreview() {
      try {
        const html = await fetchReportHTML('ledger', reportData);
        setHtmlContent(html);
      } catch (err: any) {
        console.error(err);
        setHtmlContent(`<html><body><h2 style="color:red; font-family:sans-serif; padding: 20px;">Preview Error</h2><pre style="padding: 20px;">${err.message}</pre></body></html>`);
      }
    }
    loadPreview();
  }, [reportData]);
  
  const handlePrint = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    iframeRef.current.contentWindow.print();
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    const filename = `Account_Statement_${account.name.replace(/\\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    await downloadReportPDF('ledger', reportData, filename);
    setIsExporting(false);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="sticky top-0 z-50 flex flex-col sm:flex-row gap-4 no-print items-start sm:items-center justify-between mb-2 bg-white/50 backdrop-blur-sm p-4 shadow-sm border rounded-xl flex-none">
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handlePrint} className="flex-1 sm:flex-none">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting} className="flex-1 sm:flex-none">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-[600px] border border-slate-200 rounded-lg overflow-hidden bg-slate-100 relative">
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          className="w-full h-full bg-white"
          title="Statement Preview"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
