import React, { useState, useEffect, useRef } from 'react';
import { Transaction, Account, BusinessProfile } from '@/lib/types';
import { format } from 'date-fns';
import { Printer, MessageCircle, FileDown, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { WhatsAppShareDialog } from './WhatsAppShareDialog';
import { fetchReportHTML, downloadReportPDF } from '@/lib/pdfExport';

export function VoucherPrint({ 
  transaction, 
  account, 
  businessProfile 
}: { 
  transaction: Transaction; 
  account: Account | undefined;
  businessProfile: BusinessProfile;
}) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function loadPreview() {
      if (!transaction || !account) return;
      try {
        const html = await fetchReportHTML('voucher', { transaction, account, businessProfile });
        setHtmlContent(html);
      } catch (err: any) {
        console.error(err);
        setHtmlContent(`<html><body><h2 style="color:red; font-family:sans-serif; padding: 20px;">Preview Error</h2><pre style="padding: 20px;">${err.message}</pre></body></html>`);
      }
    }
    loadPreview();
  }, [transaction, account, businessProfile]);

  if (!transaction || !account) {
    return (
      <div className="p-8 text-center text-destructive font-semibold">
        Error: Could not load voucher. Missing transaction or account details.
      </div>
    );
  }

  const handlePrint = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    iframeRef.current.contentWindow.print();
  };
  
  const handleDownloadPDF = async () => {
    setIsExporting(true);
    const filename = `Voucher_${transaction.id?.toString().slice(0,8) || 'receipt'}.pdf`;
    await downloadReportPDF('voucher', { transaction, account, businessProfile }, filename);
    setIsExporting(false);
  };

  const amountStr = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(transaction.amount || 0);
  
  const shareText = `*RupeeLedger Pro Voucher*\n--------------------------\n*Type:* ${transaction.type || 'N/A'}\n*Account:* ${account.name || 'N/A'}\n*Date:* ${transaction.date ? format(new Date(transaction.date), 'PPP') : 'N/A'}\n*Amount:* ${amountStr}\n*Narration:* ${transaction.description || 'N/A'}\n--------------------------\n_Generated via RupeeLedger Pro_`;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="no-print flex flex-wrap gap-2">
        <Button onClick={handlePrint} className="flex-1 sm:flex-none">
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
        <Button onClick={handleDownloadPDF} disabled={isExporting} variant="outline" className="flex-1 sm:flex-none border-blue-200 text-blue-700 hover:bg-blue-50">
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />} 
          Save PDF
        </Button>
        <Button onClick={() => setIsShareOpen(true)} variant="secondary" className="flex-1 sm:flex-none bg-[#25D366] text-white hover:bg-[#128C7E]">
          <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
        </Button>
      </div>

      <WhatsAppShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        defaultPhone={account.phone || ''}
        defaultText={shareText}
        title="Share Voucher via WhatsApp"
      />

      <div className="flex-1 min-h-[600px] border border-slate-200 rounded-lg overflow-hidden bg-slate-100 relative">
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          className="w-full h-full bg-white"
          title="Voucher Preview"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
