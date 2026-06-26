"use client";

import React, { useState } from 'react';
import { Transaction, Account, BusinessProfile } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format } from 'date-fns';
import { Printer, MessageCircle, FileCheck2, ShieldCheck, Edit3 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface InvoicePrintProps {
  transaction: Transaction;
  account: Account;
  businessProfile?: BusinessProfile;
  onEdit?: (updates: Partial<Transaction>) => void;
}

// Helper to convert number to Indian Rupees in words
export function toIndianWords(num: number): string {
  const a = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seven-teen', 'eighteen', 'nineteen'
  ];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  const numToWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 !== 0 ? ' and ' + numToWords(n % 100) : '');
    return '';
  };

  const convert = (n: number): string => {
    let str = '';
    if (n >= 10000000) {
      str += convert(Math.floor(n / 10000000)) + ' crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += convert(Math.floor(n / 100000)) + ' lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += convert(Math.floor(n / 1000)) + ' thousand ';
      n %= 1000;
    }
    if (n > 0) {
      str += numToWords(n);
    }
    return str.trim();
  };

  if (num === 0) return 'Zero Rupees';
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = convert(integerPart) + ' Rupees';
  if (decimalPart > 0) {
    result += ' and ' + convert(decimalPart) + ' Paisa';
  }
  result += ' Only';
  return result.replace(/\s+/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase());
}

export function InvoicePrint({ transaction, account, businessProfile, onEdit }: InvoicePrintProps) {
  const profile = businessProfile || {
    companyName: "RupeeLedger",
    address: "",
    gstin: "",
    phone: "",
    printFooter: ""
  };

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editHsn, setEditHsn] = useState(transaction.hsnCode || '');
  const [editAddress, setEditAddress] = useState(transaction.customerAddress || '');
  const [editShippingAddress, setEditShippingAddress] = useState(transaction.shippingAddress || '');

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onEdit) {
      onEdit({ 
        hsnCode: editHsn || undefined, 
        customerAddress: editAddress || undefined,
        shippingAddress: editShippingAddress || undefined
      });
    }
    setIsEditDialogOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const shareToWhatsApp = () => {
    const totalAmountStr = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(transaction.amount);

    const taxableAmountStr = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(transaction.taxableAmount || transaction.amount);

    const company = profile.companyName || "RupeeLedger";
    const invoiceNo = transaction.invoiceNumber || `INV-${transaction.id.slice(0, 6).toUpperCase()}`;
    const customer = transaction.customerName || "Valued Customer";
    const dateStr = format(transaction.date, 'dd MMM yyyy');

    let taxBreakdown = '';
    if (transaction.gstType === 'CGST+SGST') {
      const cgstVal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(transaction.cgst || 0);
      const sgstVal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(transaction.sgst || 0);
      taxBreakdown = `*CGST:* ${cgstVal}%0A*SGST:* ${sgstVal}%0A`;
    } else if (transaction.gstType === 'IGST') {
      const igstVal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(transaction.igst || 0);
      taxBreakdown = `*IGST:* ${igstVal}%0A`;
    }

    const text = `*${company} - TAX INVOICE*%0A--------------------------%0A*Invoice No:* ${invoiceNo}%0A*Date:* ${dateStr}%0A*Customer:* ${customer}%0A*GSTIN:* ${transaction.customerGstin || 'N/A'}%0A*Particulars:* ${transaction.description}%0A--------------------------%0A*Taxable Value:* ${taxableAmountStr}%0A*GST Rate:* ${transaction.gstRate || 0}%25%0A${taxBreakdown}*Total Invoice Amount:* ${totalAmountStr}%0A--------------------------%0A_Thank you for your business! Generated via RupeeLedger._`;
    
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const invoiceNo = transaction.invoiceNumber || `INV-${transaction.id.slice(0, 6).toUpperCase()}`;
  const taxableVal = transaction.taxableAmount || transaction.amount;
  const rate = transaction.gstRate || 0;
  const gstType = transaction.gstType || 'CGST+SGST';

  return (
    <div className="space-y-4">
      {/* Action triggers */}
      <div className="no-print flex gap-2">
        <Button onClick={handlePrint} className="flex-1 bg-slate-900 text-white hover:bg-slate-800 shadow-md">
          <Printer className="mr-2 h-4 w-4" /> Print Tax Invoice (PDF)
        </Button>
        <Button onClick={shareToWhatsApp} variant="secondary" className="flex-1 bg-[#25D366] text-white hover:bg-[#128C7E]">
          <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Invoice
        </Button>
        <Button onClick={() => setIsEditDialogOpen(true)} className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">
          <Edit3 className="mr-2 h-4 w-4" /> Edit Details
        </Button>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Invoice Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="hsn">HSN / SAC Code</Label>
                <Input 
                  id="hsn" 
                  value={editHsn}
                  onChange={(e) => setEditHsn(e.target.value)}
                  placeholder="Enter HSN Code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Billing Address</Label>
                <Textarea 
                  id="address" 
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Enter Full Billing Address"
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingAddress">Shipping Address (Optional)</Label>
                <Textarea 
                  id="shippingAddress" 
                  value={editShippingAddress}
                  onChange={(e) => setEditShippingAddress(e.target.value)}
                  placeholder="Leave blank to use Billing Address"
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Premium A4 Invoice Document Wrapper */}
      <div className="invoice-wrapper bg-white max-w-[800px] mx-auto text-slate-800 text-[12px] font-sans leading-snug relative shadow-2xl rounded-xl overflow-hidden border border-slate-200">
        
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-emerald-500 to-indigo-600" />

        <div className="p-8 sm:p-10">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div className="max-w-[50%]">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-2">
                {profile.companyName || "SENTHIL KUMAR TEXTILES"}
              </h1>
              {profile.address && <p className="text-slate-500 text-[11px] leading-relaxed uppercase">{profile.address}</p>}
              {profile.phone && <p className="text-slate-500 text-[11px] mt-1 uppercase">PHONE: {profile.phone}</p>}
              
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase">
                  GSTIN: {profile.gstin || 'Unregistered'}
                </span>
                <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase">
                  MSME NO: N/A
                </span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <h2 className="text-2xl font-bold text-indigo-600 tracking-wider uppercase">TAX INVOICE</h2>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Duplicate for Transporter</p>
              <div className="pt-4 flex flex-col items-end space-y-1 text-[11px]">
                <div className="flex gap-2">
                  <span className="text-slate-400">INVOICE NO:</span>
                  <span className="font-bold text-slate-900">{invoiceNo}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400">INVOICE DATE:</span>
                  <span className="font-bold text-slate-900">{format(transaction.date, 'dd/MM/yyyy')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transportation & Logistics Row */}
          <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6 text-[10px] font-semibold uppercase">
            <div>
              <span className="block text-slate-400 mb-0.5">Ack. No</span>
              <span className="text-slate-800">N/A</span>
            </div>
            <div>
              <span className="block text-slate-400 mb-0.5">I.R.N</span>
              <span className="text-slate-800">N/A</span>
            </div>
            <div>
              <span className="block text-slate-400 mb-0.5">EWAY BILL NO</span>
              <span className="text-slate-800">N/A</span>
            </div>
            <div>
              <span className="block text-slate-400 mb-0.5">TRANSPORT</span>
              <span className="text-slate-800">DIRECT A/C</span>
            </div>
          </div>
          
          {/* Billed To & Shipped To */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Billed To */}
            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
              <h3 className="text-[10px] font-extrabold text-indigo-600 tracking-wider uppercase mb-2">Billed To</h3>
              <p className="font-bold text-sm text-slate-900 uppercase mb-1">{transaction.customerName || "Customer Name"}</p>
              <p className="text-slate-500 text-[11px] whitespace-pre-wrap uppercase min-h-[40px]">
                {transaction.customerAddress || account.address || "Address Not Provided"}
              </p>
              {transaction.customerGstin && (
                <p className="mt-3 text-[10px] font-bold text-slate-700 uppercase">
                  GSTIN: {transaction.customerGstin}
                </p>
              )}
            </div>
            
            {/* Shipped To */}
            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
              <h3 className="text-[10px] font-extrabold text-emerald-600 tracking-wider uppercase mb-2">Shipped To</h3>
              <p className="font-bold text-sm text-slate-900 uppercase mb-1">{transaction.customerName || "Customer Name"}</p>
              <p className="text-slate-500 text-[11px] whitespace-pre-wrap uppercase min-h-[40px]">
                {transaction.shippingAddress || transaction.customerAddress || account.address || "Address Not Provided"}
              </p>
              {transaction.customerGstin && (
                <p className="mt-3 text-[10px] font-bold text-slate-700 uppercase">
                  GSTIN: {transaction.customerGstin}
                </p>
              )}
            </div>
          </div>
          
          {/* Items Table container */}
          <div className="mb-8 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-[35%]">Description of Goods</th>
                  <th className="py-3 px-3 text-center">HSN</th>
                  <th className="py-3 px-2 text-center">Bundles</th>
                  <th className="py-3 px-2 text-center">Pieces</th>
                  <th className="py-3 px-2 text-center">Metres</th>
                  <th className="py-3 px-3 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-slate-900 text-xs uppercase whitespace-pre-wrap">
                    {transaction.description}
                  </td>
                  <td className="py-4 px-3 text-center font-mono text-[11px] text-slate-600">{transaction.hsnCode || 'N/A'}</td>
                  <td className="py-4 px-2 text-center text-slate-400">-</td>
                  <td className="py-4 px-2 text-center text-slate-400">-</td>
                  <td className="py-4 px-2 text-center text-slate-400">-</td>
                  <td className="py-4 px-3 text-right text-slate-400">-</td>
                  <td className="py-4 px-4 text-right font-bold text-slate-900 text-sm">
                    {taxableVal.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Grid: Bank Details & Tax Breakdown */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            
            {/* Bank Details */}
            <div className="flex flex-col justify-end">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                  Bank Details
                </h4>
                <div className="space-y-1.5 text-[11px] uppercase">
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-semibold">Account No</span>
                    <span className="font-bold text-slate-900">{account.bankAccountNumber || "N/A"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-semibold">Bank Name</span>
                    <span className="font-bold text-slate-900">{account.bankName || "N/A"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-semibold">IFSC Code</span>
                    <span className="font-bold text-slate-900">{account.bankIfsc || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Breakdown */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>Assessable Value</span>
                  <span>{taxableVal.toFixed(2)}</span>
                </div>
                {gstType === 'CGST+SGST' ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST {(rate / 2).toFixed(1)}%</span>
                      <span>{(transaction.cgst || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST {(rate / 2).toFixed(1)}%</span>
                      <span>{(transaction.sgst || 0).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST {rate}%</span>
                    <span>{(transaction.igst || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-100">
                  <span>Rounded Off</span>
                  <span>{(transaction.amount - taxableVal - (transaction.cgst || 0) - (transaction.sgst || 0) - (transaction.igst || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-slate-200">
                  <span className="font-black text-indigo-600 text-sm uppercase">Net Amount</span>
                  <span className="font-black text-2xl text-slate-900">₹{transaction.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rupees in Words */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-8">
            <p className="text-[11px] font-bold text-indigo-900 uppercase">
              <span className="text-indigo-500 mr-2">Amount in Words:</span>
              {toIndianWords(transaction.amount)}
            </p>
          </div>

          {/* Terms & Conditions and Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200">
            <div className="text-[10px] text-slate-500">
              <h4 className="font-bold text-slate-700 uppercase mb-2">Terms & Conditions</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Overdue interest will be charged at 24% from the invoice date.</li>
                <li>We are not responsible for any loss or damage in transit.</li>
                <li>We will not accept any claim after processing of goods.</li>
                <li>Subject to jurisdiction.</li>
              </ul>
            </div>
            
            <div className="flex flex-col justify-end items-end text-right">
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                For {profile.companyName || "SENTHIL KUMAR TEXTILES"}
              </p>
              <div className="mt-12 w-40 border-b border-slate-400"></div>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Authorised Signatory</p>
            </div>
          </div>
          
          <div className="flex justify-between mt-8 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Checked By: __________</span>
            <span>Prepared By: __________</span>
            <span>Received By: __________</span>
          </div>

        </div>
      </div>
    </div>
  );
}
