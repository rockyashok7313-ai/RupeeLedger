import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileDown } from 'lucide-react';
import { BusinessProfile, Invoice } from '@/lib/types';
import { fetchReportHTML, downloadReportPDF } from '@/lib/pdfExport';
import { WhatsAppShareDialog } from '../WhatsAppShareDialog';
import { formatCurrency } from '@/lib/currency';

interface Props {
  businessProfile: BusinessProfile;
  invoices?: Invoice[];
}

export function InvoicePreview({ businessProfile, invoices = [] }: Props) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices.length > 0 ? invoices[invoices.length - 1].id : '');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const invoice = invoices.find(inv => inv.id === selectedInvoiceId);

  useEffect(() => {
    async function loadPreview() {
      if (!invoice) return;
      setIsLoading(true);
      try {
        const html = await fetchReportHTML('invoice', { invoice, businessProfile });
        setHtmlContent(html);
      } catch (err: any) {
        console.error(err);
        setHtmlContent(`<html><body><h2 style="color:red; font-family:sans-serif; padding: 20px;">Preview Error</h2><pre style="padding: 20px;">${err.message}</pre></body></html>`);
      } finally {
        setIsLoading(false);
      }
    }
    loadPreview();
  }, [invoice, businessProfile]);

  const handlePrint = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    iframeRef.current.contentWindow.print();
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  const handleWhatsAppShare = () => {
    if (!invoice) return;
    setIsShareOpen(true);
  };

  const handleEmailShare = () => {
    if (!invoice) return;
    const subject = `Invoice ${invoice.invoiceNumber || invoice.id} from ${businessProfile.companyName}`;
    const body = `Hello ${invoice.clientName},\n\nPlease find your invoice ${invoice.invoiceNumber || invoice.id} attached.\nAmount Due: ${formatCurrency(invoice.total, invoice.currency || 'INR')}\nDue Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nThank you for your business!\n\nRegards,\n${businessProfile.companyName}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 backdrop-blur-sm border p-4 rounded-xl shadow-sm flex-none">
        <div className="w-full max-w-sm">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Select Invoice to Preview</label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            value={selectedInvoiceId}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
          >
            {invoices.length === 0 && <option value="">No Invoices Available</option>}
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {new Date(inv.date).toLocaleDateString()} - {inv.clientName} (₹{inv.total.toFixed(2)})
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button onClick={handleWhatsAppShare} variant="outline" className="flex-1 sm:flex-none border-green-200 text-green-700 hover:bg-green-50" disabled={!invoice}>
            WhatsApp
          </Button>
          <Button onClick={handleEmailShare} variant="outline" className="flex-1 sm:flex-none" disabled={!invoice}>
            Email
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" className="flex-1 sm:flex-none border-blue-200 text-blue-700 hover:bg-blue-50" disabled={!invoice}>
            <FileDown className="h-4 w-4 mr-2" /> Download PDF
          </Button>
          <Button onClick={handlePrint} variant="default" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold" disabled={!invoice}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-[600px] border border-slate-200 rounded-lg overflow-hidden bg-slate-100 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        {!invoice ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            Please create an invoice first.
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            className="w-full h-full bg-white"
            title="Invoice Preview"
            sandbox="allow-same-origin allow-scripts allow-modals"
          />
        )}
      </div>

      {invoice && (
        <WhatsAppShareDialog
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          defaultText={`Hello ${invoice.clientName},\n\nPlease find your invoice ${invoice.invoiceNumber || invoice.id} attached.\nAmount Due: ${formatCurrency(invoice.total, invoice.currency || 'INR')}\nDue Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nThank you for your business!\n- ${businessProfile.companyName}`}
          title="Share Invoice via WhatsApp"
        />
      )}
    </div>
  );
}
