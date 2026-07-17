import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from 'lucide-react';
import { BusinessProfile, Invoice } from '@/lib/types';
import { formatAmountInWords, formatCurrency } from '@/lib/currency';
import { Label } from '@/components/ui/label';
import DOMPurify from 'dompurify';
import { exportInvoiceToPDF } from '@/lib/pdfExport';

interface Props {
  businessProfile: BusinessProfile;
  invoices?: Invoice[];
}

export function InvoicePreview({ businessProfile, invoices = [] }: Props) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices.length > 0 ? invoices[invoices.length - 1].id : '');
  
  // Settings State
  const [theme, setTheme] = useState<'Classic' | 'Modern' | 'Minimal'>('Classic');
  const [fontScale, setFontScale] = useState(1);
  const [showHsn, setShowHsn] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [showAmountInWords, setShowAmountInWords] = useState(true);
  const [showSignatory, setShowSignatory] = useState(true);

  const invoice = invoices.find(inv => inv.id === selectedInvoiceId);



  const handlePrint = () => {
    if (!invoice) return;
    const filename = `Invoice_${invoice.invoiceNumber || invoice.id}.pdf`;
    exportInvoiceToPDF('invoice-pdf-container', filename);
  };


  const handleWhatsAppShare = () => {
    if (!invoice) return;
    const text = `Hello ${invoice.clientName},\n\nPlease find your invoice ${invoice.invoiceNumber || invoice.id} attached.\nAmount Due: ${formatCurrency(invoice.total, invoice.currency || 'INR')}\nDue Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nThank you for your business!\n- ${businessProfile.companyName}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleEmailShare = () => {
    if (!invoice) return;
    const subject = `Invoice ${invoice.invoiceNumber || invoice.id} from ${businessProfile.companyName}`;
    const body = `Hello ${invoice.clientName},\n\nPlease find your invoice ${invoice.invoiceNumber || invoice.id} attached.\nAmount Due: ${formatCurrency(invoice.total, invoice.currency || 'INR')}\nDue Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nThank you for your business!\n\nRegards,\n${businessProfile.companyName}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };


  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .print-a4-page { width: 100%; min-height: 297mm; }
        }
        .theme-modern .invoice-header { background: #f8fafc; padding-bottom: 1.5rem; }
        .theme-minimal .invoice-header { border-bottom: 1px solid #e2e8f0; }
        .theme-classic .invoice-header { border-bottom: 2px solid #1e293b; }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 backdrop-blur-sm border p-4 rounded-xl print:hidden shadow-sm">
        <div className="w-full max-w-sm">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Select Invoice to Preview</label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            value={selectedInvoiceId}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
          >
            {invoices.length === 0 && <option value="">No Invoices Available</option>}
            {invoices.map((inv, idx) => (
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
          <Button onClick={handlePrint} variant="default" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white" disabled={!invoice}>
            <Printer className="h-4 w-4 mr-2" /> Print / PDF
          </Button>
        </div>

      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 space-y-6 print:hidden">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-sm border-b pb-2">Display Settings</h3>
              
              <div className="space-y-2">
                <Label className="text-xs">Theme</Label>
                <select className="flex h-8 w-full rounded-md border px-2 text-xs" value={theme} onChange={e => setTheme(e.target.value as any)}>
                  <option value="Classic">Classic</option>
                  <option value="Modern">Modern</option>
                  <option value="Minimal">Minimal</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Font Scale ({Math.round(fontScale * 100)}%)</Label>
                <input type="range" min="0.8" max="1.4" step="0.1" value={fontScale} onChange={e => setFontScale(parseFloat(e.target.value))} className="w-full" />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Show HSN Code</span>
                  <input type="checkbox" checked={showHsn} onChange={e => setShowHsn(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Bank Details</span>
                  <input type="checkbox" checked={showBankDetails} onChange={e => setShowBankDetails(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Amount in Words</span>
                  <input type="checkbox" checked={showAmountInWords} onChange={e => setShowAmountInWords(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Signatory</span>
                  <input type="checkbox" checked={showSignatory} onChange={e => setShowSignatory(e.target.checked)} />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 overflow-auto">
          {!invoice ? (
            <div className="rounded-md border p-12 text-center text-muted-foreground bg-white shadow-sm print:hidden">
              Please create an invoice in the "Invoices" tab first.
            </div>
          ) : (
            <Card id="invoice-pdf-container" className={`bg-white text-black print:shadow-none print:border-none w-full max-w-4xl mx-auto overflow-hidden print-a4-page theme-${theme.toLowerCase()}`} style={{ fontSize: `${fontScale}rem` }}>
              <CardContent className="p-8 sm:p-12 space-y-8">
                {/* Header */}
                <div className="invoice-header flex flex-col sm:flex-row justify-between items-start pb-6">
                  <div className="flex gap-4 items-start">
                    {businessProfile.logoBase64 && (
                      <img src={businessProfile.logoBase64} alt="Logo" className="w-20 h-20 object-contain" />
                    )}
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight text-blue-900">{businessProfile.companyName || 'Your Company Name'}</h1>
                      <p className="text-sm text-gray-600 whitespace-pre-line mt-2" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(businessProfile.address || 'Your Company Address') }}></p>
                      {businessProfile.gstin && (
                        <p className="text-sm font-medium mt-1">GSTIN: {businessProfile.gstin}</p>
                      )}
                      {businessProfile.phone && (
                        <p className="text-sm text-gray-600">Phone: {businessProfile.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right mt-6 sm:mt-0">
                    <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-widest">{invoice.type || 'Tax Invoice'}</h2>
                    <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 sm:text-right text-sm">
                      <span className="font-medium text-gray-500">Invoice No:</span>
                      <span className="font-bold">{invoice.invoiceNumber || ('INV-' + invoice.id.substring(0,6).toUpperCase())}</span>
                      
                      <span className="font-medium text-gray-500">Invoice Date:</span>
                      <span className="font-bold">{new Date(invoice.date).toLocaleDateString()}</span>
                      
                      {invoice.orderNo && (
                        <>
                          <span className="font-medium text-gray-500">Order No:</span>
                          <span className="font-bold">{invoice.orderNo}</span>
                        </>
                      )}

                      {invoice.orderDate && (
                        <>
                          <span className="font-medium text-gray-500">Order Date:</span>
                          <span className="font-bold">{new Date(invoice.orderDate).toLocaleDateString()}</span>
                        </>
                      )}

                      {invoice.deliveryChallanNo && (
                        <>
                          <span className="font-medium text-gray-500">Delivery Challan No:</span>
                          <span className="font-bold">{invoice.deliveryChallanNo}</span>
                        </>
                      )}

                      <span className="font-medium text-gray-500">Due Date:</span>
                      <span className="font-bold">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Bill To */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
                    <p className="font-bold text-lg text-gray-800">{invoice.clientName}</p>
                    {invoice.customerAddress && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{invoice.customerAddress}</p>}
                    {invoice.customerGstin && <p className="text-sm font-medium text-gray-700 mt-1">GSTIN: {invoice.customerGstin}</p>}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ship To / Transport</h3>
                    <p className="font-bold text-lg text-gray-800">{invoice.clientName}</p>
                    {invoice.customerAddress && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{invoice.customerAddress}</p>}
                    {invoice.vehicleNo && <p className="text-sm font-medium text-gray-700 mt-1">Vehicle No: {invoice.vehicleNo}</p>}
                  </div>
                </div>

                {invoice.agentName && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-bold text-gray-700">Agent / Sales Rep:</span> {invoice.agentName}
                  </div>
                )}

                {/* Line Items Table */}
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 border-b border-gray-200 text-gray-700">
                      <tr>
                        <th className="p-3 font-bold">#</th>
                        <th className="p-3 font-bold">Item & Description</th>
                        {showHsn && <th className="p-3 font-bold">HSN</th>}
                        <th className="p-3 font-bold text-center">Piece No</th>
                        <th className="p-3 font-bold text-center">Qty/Unit</th>
                        <th className="p-3 font-bold text-right">Rate</th>
                        <th className="p-3 font-bold text-right">GST %</th>
                        <th className="p-3 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoice.items.map((item, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-3 text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-medium text-gray-900">{item.name}</td>
                          {showHsn && <td className="p-3 text-gray-600">{item.hsnCode || '-'}</td>}
                          <td className="p-3 text-center">{item.pieceNo || '-'}</td>
                          <td className="p-3 text-center">{item.quantity} {item.unit?.split('-')[0] || ''}</td>
                          <td className="p-3 text-right">{formatCurrency(item.rate, invoice.currency || 'INR')}</td>
                          <td className="p-3 text-right text-gray-500">{item.taxPercent}%</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(item.amount, invoice.currency || 'INR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Notes */}
                <div className="flex flex-col sm:flex-row justify-between gap-8 pt-4">
                  <div className="flex-1 space-y-4">
                    {showAmountInWords && (
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total in Words</h3>
                        <p className="text-sm font-medium text-gray-800 capitalize">
                          {formatAmountInWords(invoice.total, invoice.currency || 'INR')}
                        </p>
                      </div>
                    )}
                    {showBankDetails && (
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Bank Details</h3>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100">
                          <p><span className="font-medium text-gray-700">Bank:</span> {businessProfile.bankName || 'N/A'}</p>
                          <p><span className="font-medium text-gray-700">A/C No:</span> {businessProfile.bankAccountNumber || 'N/A'}</p>
                          <p><span className="font-medium text-gray-700">IFSC:</span> {businessProfile.bankIfsc || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="w-full sm:w-72 bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(invoice.subtotal, invoice.currency || 'INR')}</span>
                    </div>
                    {invoice.cgst > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>CGST</span>
                        <span>{formatCurrency(invoice.cgst, invoice.currency || 'INR')}</span>
                      </div>
                    )}
                    {invoice.sgst > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>SGST</span>
                        <span>{formatCurrency(invoice.sgst, invoice.currency || 'INR')}</span>
                      </div>
                    )}
                    {invoice.igst > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>IGST</span>
                        <span>{formatCurrency(invoice.igst, invoice.currency || 'INR')}</span>
                      </div>
                    )}
                    {(invoice.tcsAmount || 0) > 0 && (
                      <div className="flex justify-between text-sm text-gray-600 text-blue-600">
                        <span>TCS</span>
                        <span>{formatCurrency(invoice.tcsAmount!, invoice.currency || 'INR')}</span>
                      </div>
                    )}
                    {(invoice.roundoff || 0) !== 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Roundoff</span>
                        <span>{formatCurrency(invoice.roundoff!, invoice.currency || 'INR')}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between text-lg font-bold text-gray-900">
                        <span>Total</span>
                        <span>{formatCurrency(invoice.total, invoice.currency || 'INR')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t-2 border-gray-100 pt-6 mt-8 flex flex-col sm:flex-row justify-between items-end gap-4">
                  <div className="text-xs text-gray-500 whitespace-pre-line flex-1">
                    <span className="font-bold text-gray-700 uppercase tracking-wider block mb-1">Terms & Conditions</span>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((invoice.terms || businessProfile.invoiceSettings?.defaultTerms || businessProfile.printFooter || '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed.').replace(/\n/g, '<br/>')) }} />
                  </div>
                  {showSignatory && (
                    <div className="text-center sm:text-right mt-6 sm:mt-0 w-48">
                      <div className="h-16 border-b-2 border-gray-300 border-dashed mb-2"></div>
                      <p className="text-xs font-bold text-gray-700 uppercase">Authorized Signatory</p>
                      <p className="text-[10px] text-gray-400 mt-1">For {businessProfile.companyName}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
