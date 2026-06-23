"use client";

import React from 'react';
import { Transaction, Account, BusinessProfile } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format } from 'date-fns';
import { Printer, MessageCircle, FileCheck2, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';

interface InvoicePrintProps {
  transaction: Transaction;
  account: Account;
  businessProfile?: BusinessProfile;
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

export function InvoicePrint({ transaction, account, businessProfile }: InvoicePrintProps) {
  const profile = businessProfile || {
    companyName: "RupeeLedger",
    address: "",
    gstin: "",
    phone: "",
    printFooter: ""
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
      </div>

      {/* Invoice Document Wrapper */}
      <div className="border border-slate-300 p-6 sm:p-12 bg-white max-w-3xl mx-auto rounded-xl shadow-lg text-slate-800 text-sm font-sans leading-relaxed relative overflow-hidden">
        
        {/* Subtle top decoration */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-primary" />

        {/* Invoice Title & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b pb-6 mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-6 w-6 bg-emerald-600 rounded flex items-center justify-center text-white font-black text-xs">₹</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                {profile.companyName || "RupeeLedger"}
              </h1>
            </div>
            {profile.address && <p className="text-xs text-slate-500 max-w-xs">{profile.address}</p>}
            {profile.phone && <p className="text-xs text-slate-500 mt-0.5">Contact: {profile.phone}</p>}
            {profile.gstin ? (
              <p className="text-xs font-mono font-bold mt-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                GSTIN: {profile.gstin}
              </p>
            ) : (
              <p className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded inline-block mt-1">
                GSTIN: Unregistered / Exempt
              </p>
            )}
          </div>
          <div className="text-right sm:text-right space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-wider">TAX INVOICE</h2>
            <div className="text-xs text-slate-500 flex items-center justify-end gap-1.5 font-bold uppercase mt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Compliant with Section 31 of CGST Act</span>
            </div>
          </div>
        </div>

        {/* Invoice Info Details Block */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b mb-6 bg-slate-50/50 p-4 rounded-lg border border-slate-200/50">
          <div>
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-2">Supplier (Seller)</h3>
            <p className="text-sm font-bold text-slate-900">{profile.companyName || "RupeeLedger"}</p>
            {profile.address && <p className="text-xs text-slate-500 mt-1 max-w-[200px]">{profile.address}</p>}
            {profile.phone && <p className="text-xs text-slate-500 mt-0.5">Phone: {profile.phone}</p>}
            {profile.gstin ? (
              <p className="text-[10px] font-mono font-bold mt-2 text-emerald-600 bg-white border border-emerald-200 px-2 py-0.5 rounded inline-block uppercase">
                GSTIN: {profile.gstin}
              </p>
            ) : (
              <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded inline-block mt-2">
                GSTIN: Unregistered
              </p>
            )}
          </div>
          <div>
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-2">Billed To (Buyer)</h3>
            <p className="text-sm font-bold text-slate-900">{transaction.customerName || "Valued Customer"}</p>
            {transaction.customerGstin ? (
              <p className="text-[10px] font-mono font-semibold mt-2 text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded inline-block uppercase">
                GSTIN: {transaction.customerGstin}
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic mt-1">GSTIN: Not Provided</p>
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-2">Invoice Identifiers</h3>
            <p className="text-xs">
              <span className="font-semibold text-slate-500">Invoice No:</span> <span className="font-mono font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">{invoiceNo}</span>
            </p>
            <p className="text-xs">
              <span className="font-semibold text-slate-500">Invoice Date:</span> <span className="font-bold text-slate-800">{format(transaction.date, 'dd-MM-yyyy')}</span>
            </p>
            <p className="text-xs">
              <span className="font-semibold text-slate-500">Payment Account:</span> <span className="font-semibold text-slate-700">{account.name}</span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="my-8 overflow-hidden border border-slate-200 rounded-lg shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Description of Services / Goods</th>
                <th className="py-3 px-3 text-right">HSN/SAC</th>
                <th className="py-3 px-3 text-right">Taxable Value</th>
                <th className="py-3 px-3 text-right">GST Rate</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white border-b hover:bg-slate-50 transition-colors">
                <td className="py-4 px-4 font-semibold text-slate-900 leading-normal max-w-[320px]">
                  {transaction.description}
                </td>
                <td className="py-4 px-3 text-right font-mono text-xs text-slate-500">998311</td>
                <td className="py-4 px-3 text-right font-semibold text-slate-800">
                  <CurrencyDisplay amount={taxableVal} />
                </td>
                <td className="py-4 px-3 text-right font-bold text-slate-700">{rate}%</td>
                <td className="py-4 px-4 text-right font-extrabold text-slate-900 text-base">
                  <CurrencyDisplay amount={transaction.amount} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* GST Breakdown Section */}
        <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <h4 className="text-xs uppercase font-extrabold text-slate-500 tracking-wider mb-3 flex items-center gap-1.5">
            <FileCheck2 className="h-4 w-4 text-emerald-600" />
            <span>Tax Assessment Details</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Taxable Base Value</p>
              <p className="font-bold text-sm text-slate-800 mt-0.5"><CurrencyDisplay amount={taxableVal} /></p>
            </div>
            {gstType === 'CGST+SGST' ? (
              <>
                <div>
                  <p className="text-slate-400 font-medium">CGST ({(rate / 2).toFixed(1)}%)</p>
                  <p className="font-bold text-sm text-slate-800 mt-0.5"><CurrencyDisplay amount={transaction.cgst || 0} /></p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">SGST ({(rate / 2).toFixed(1)}%)</p>
                  <p className="font-bold text-sm text-slate-800 mt-0.5"><CurrencyDisplay amount={transaction.sgst || 0} /></p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-slate-400 font-medium">IGST ({rate}%)</p>
                <p className="font-bold text-sm text-slate-800 mt-0.5"><CurrencyDisplay amount={transaction.igst || 0} /></p>
              </div>
            )}
            <div className="text-right">
              <p className="text-slate-400 font-medium">Total tax accrued</p>
              <p className="font-bold text-sm text-emerald-600 mt-0.5">
                <CurrencyDisplay amount={Math.round((transaction.amount - taxableVal) * 100) / 100} />
              </p>
            </div>
          </div>
        </div>

        {/* Total details and amount in words */}
        <div className="my-8 border-t border-slate-200 pt-6">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div className="flex-1 space-y-1">
              <p className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Amount in Words (INR)</p>
              <p className="text-xs font-semibold text-slate-700 italic bg-slate-50 p-2.5 rounded border leading-relaxed">
                {toIndianWords(transaction.amount)}
              </p>
            </div>
            <div className="w-full sm:w-[240px] bg-slate-900 text-white p-5 rounded-xl text-right space-y-1 shadow-sm border border-slate-800 shrink-0">
              <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Invoice Value</p>
              <p className="text-3xl font-black text-white">
                <CurrencyDisplay amount={transaction.amount} />
              </p>
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest pt-1">
                {transaction.gstCalculationType === 'excluding' ? 'Exclusive of GST' : 'Inclusive of GST'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment and Terms Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t text-xs text-slate-500">
          <div>
            <h5 className="font-extrabold uppercase text-slate-700 tracking-wider mb-1">Standard Terms & Declarations</h5>
            <ul className="list-disc list-inside space-y-0.5 leading-normal">
              <li>Declare that all details are true and correct.</li>
              <li>Interest at 18% p.a. charged if payments delayed.</li>
              <li>Subject to local court jurisdiction.</li>
            </ul>
          </div>
          <div className="flex flex-col justify-end items-end text-right">
            <p className="text-[10px] text-slate-400 uppercase">For {profile.companyName || "RupeeLedger"}</p>
            <div className="border-b border-slate-300 w-[180px] h-12 mb-2"></div>
            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">Authorized Representative</p>
          </div>
        </div>

        {/* Print-only Footer */}
        <div className="mt-12 text-center text-[10px] text-slate-400 italic border-t pt-4 space-y-1">
          {profile.printFooter && (
            <p className="font-bold text-slate-500 mb-1">{profile.printFooter}</p>
          )}
          <p>This is a certified digital tax invoice generated dynamically on the RupeeLedger Financial Suite.</p>
        </div>
      </div>
    </div>
  );
}
