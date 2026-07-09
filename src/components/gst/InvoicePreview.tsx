import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from 'lucide-react';
import { BusinessProfile, Invoice } from '@/lib/types';
import { toWords } from 'number-to-words';

interface Props {
  businessProfile: BusinessProfile;
  invoices?: Invoice[];
}

export function InvoicePreview({ businessProfile, invoices = [] }: Props) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices.length > 0 ? invoices[invoices.length - 1].id : '');

  const invoice = invoices.find(inv => inv.id === selectedInvoiceId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .print-a4-page { width: 100%; min-height: 297mm; }
        }
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
        <Button onClick={handlePrint} variant="default" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white" disabled={!invoice}>
          <Printer className="h-4 w-4 mr-2" /> Print / PDF
        </Button>
      </div>
      
      {!invoice ? (
        <div className="rounded-md border p-12 text-center text-muted-foreground bg-white shadow-sm print:hidden">
          Please create an invoice in the "Invoices" tab first.
        </div>
      ) : (
        <Card className="bg-white text-black print:shadow-none print:border-none w-full max-w-4xl mx-auto overflow-hidden print-a4-page">
          <CardContent className="p-8 sm:p-12 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-gray-900 pb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-blue-900">{businessProfile.companyName || 'Your Company Name'}</h1>
                <p className="text-sm text-gray-600 whitespace-pre-line mt-2">{businessProfile.address || 'Your Company Address'}</p>
                {businessProfile.gstin && (
                  <p className="text-sm font-medium mt-1">GSTIN: {businessProfile.gstin}</p>
                )}
                {businessProfile.phone && (
                  <p className="text-sm text-gray-600">Phone: {businessProfile.phone}</p>
                )}
              </div>
              <div className="text-left sm:text-right mt-6 sm:mt-0">
                <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-widest">Tax Invoice</h2>
                <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 sm:text-right text-sm">
                  <span className="font-medium text-gray-500">Invoice No:</span>
                  <span className="font-bold">INV-{invoice.id.substring(0,6).toUpperCase()}</span>
                  
                  <span className="font-medium text-gray-500">Invoice Date:</span>
                  <span className="font-bold">{new Date(invoice.date).toLocaleDateString()}</span>
                  
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

            {/* Line Items Table */}
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 border-b border-gray-200 text-gray-700">
                  <tr>
                    <th className="p-3 font-bold">#</th>
                    <th className="p-3 font-bold">Item & Description</th>
                    <th className="p-3 font-bold">HSN</th>
                    <th className="p-3 font-bold text-center">Qty</th>
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
                      <td className="p-3 text-gray-600">{item.hsnCode || '-'}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">₹{item.rate.toFixed(2)}</td>
                      <td className="p-3 text-right text-gray-500">{item.taxPercent}%</td>
                      <td className="p-3 text-right font-medium">₹{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Notes */}
            <div className="flex flex-col sm:flex-row justify-between gap-8 pt-4">
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total in Words</h3>
                  <p className="text-sm font-medium text-gray-800 capitalize">
                    Rupees {toWords(Math.round(invoice.total))} Only
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Bank Details</h3>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100">
                    <p><span className="font-medium text-gray-700">Bank:</span> {businessProfile.bankName || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">A/C No:</span> {businessProfile.bankAccountNumber || 'N/A'}</p>
                    <p><span className="font-medium text-gray-700">IFSC:</span> {businessProfile.bankIfsc || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-72 bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.cgst > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>CGST</span>
                    <span>₹{invoice.cgst.toFixed(2)}</span>
                  </div>
                )}
                {invoice.sgst > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>SGST</span>
                    <span>₹{invoice.sgst.toFixed(2)}</span>
                  </div>
                )}
                {invoice.igst > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>IGST</span>
                    <span>₹{invoice.igst.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>₹{invoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-gray-100 pt-6 mt-8 flex flex-col sm:flex-row justify-between items-end gap-4">
              <div className="text-xs text-gray-500 whitespace-pre-line flex-1">
                <span className="font-bold text-gray-700 uppercase tracking-wider block mb-1">Terms & Conditions</span>
                {businessProfile.printFooter || '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed.'}
              </div>
              <div className="text-center sm:text-right mt-6 sm:mt-0 w-48">
                <div className="h-16 border-b-2 border-gray-300 border-dashed mb-2"></div>
                <p className="text-xs font-bold text-gray-700 uppercase">Authorized Signatory</p>
                <p className="text-[10px] text-gray-400 mt-1">For {businessProfile.companyName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
