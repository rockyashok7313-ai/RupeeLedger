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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onEdit) {
      onEdit({ 
        hsnCode: editHsn || undefined, 
        customerAddress: editAddress || undefined 
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
                <Label htmlFor="address">Buyer Address</Label>
                <Textarea 
                  id="address" 
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Enter Full Buyer Address"
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

      {/* Invoice Document Wrapper — A4 single page */}
      <div className="invoice-wrapper border-2 border-black bg-white max-w-[800px] mx-auto text-black text-[12px] font-sans leading-snug relative shadow-lg">
        
        {/* Header */}
        <div className="flex justify-between border-b-2 border-black px-2 py-1 font-bold text-[10px]">
          <span>TAX INVOICE</span>
          <span>DUPLICATE FOR TRANSPORTER</span>
        </div>
        
        {/* Company Info Box */}
        <div className="border-b-2 border-black p-4 text-center relative">
          <h1 className="text-2xl font-black uppercase mb-1">{profile.companyName || "SENTHIL KUMAR TEXTILES"}</h1>
          {profile.address && <p className="uppercase">{profile.address}</p>}
          {profile.phone && <p className="uppercase">PHONE : {profile.phone}</p>}
          <div className="flex justify-between mt-2 font-bold uppercase text-[11px]">
            <span>GSTIN : {profile.gstin || 'Unregistered'}</span>
            <span>MSME NO : </span>
          </div>
          <div className="flex justify-between font-bold uppercase text-[11px] mt-0.5">
            <span>Tax is Payable On Reverse Charge : NO</span>
            <span>PAN : </span>
          </div>
        </div>
        
        {/* Metadata Row 1 */}
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="border-r-2 border-black p-2 space-y-1">
            <div className="flex"><span className="w-28 font-bold">INVOICE NO</span><span className="font-bold">: {invoiceNo}</span></div>
            <div className="flex"><span className="w-28">INVOICE DATE</span><span>: {format(transaction.date, 'dd/MM/yyyy')}</span></div>
          </div>
          <div className="p-2 space-y-1">
            <div className="flex"><span className="w-24">Ack.No</span><span>: </span></div>
            <div className="flex"><span className="w-24">Ack.Date</span><span>: </span></div>
          </div>
        </div>
        
        {/* Metadata Row 2 */}
        <div className="border-b-2 border-black p-2 space-y-1">
          <div className="flex"><span className="w-32">I.R.N</span><span>: </span></div>
          <div className="flex"><span className="w-32">EWAY BILL NO</span><span>: </span></div>
        </div>
        
        {/* Billed To & Shipped To */}
        <div className="grid grid-cols-2 border-b-2 border-black min-h-[120px]">
          <div className="border-r-2 border-black p-2 flex flex-col">
            <p className="mb-1">Billed To.</p>
            <h3 className="font-bold text-sm uppercase">{transaction.customerName || "Customer Name"}</h3>
            <p className="whitespace-pre-wrap uppercase flex-1 mt-1">{(transaction.customerAddress || account.address) || ""}</p>
            <div className="flex justify-between mt-2 font-bold uppercase text-[10px]">
              <span>GSTIN : {transaction.customerGstin || account.gstin}</span>
              <span>PAN : </span>
            </div>
          </div>
          <div className="p-2 flex flex-col">
            <p className="mb-1">Shipped To.</p>
            <h3 className="font-bold text-sm uppercase">{transaction.customerName || "Customer Name"}</h3>
            <p className="whitespace-pre-wrap uppercase flex-1 mt-1">{(transaction.customerAddress || account.address) || ""}</p>
            <div className="flex justify-between mt-2 font-bold uppercase text-[10px]">
              <span>GSTIN : {transaction.customerGstin || account.gstin}</span>
            </div>
          </div>
        </div>
        
        {/* Transport Box */}
        <div className="grid grid-cols-2 border-b-2 border-black uppercase text-[11px]">
          <div className="border-r-2 border-black p-2 space-y-1">
            <div className="flex"><span className="w-28">AGENT NAME</span><span>: DIRECT A/C</span></div>
            <div className="flex"><span className="w-28">ORDER NO</span><span>: </span></div>
            <div className="flex"><span className="w-28">D.C. NO</span><span>: </span></div>
          </div>
          <div className="p-2 space-y-1">
            <div className="flex"><span className="w-28">TRANSPORT</span><span>: </span></div>
            <div className="flex"><span className="w-28">LR . NO</span><span>: </span></div>
            <div className="flex"><span className="w-28">VEHICLE NO</span><span>: </span></div>
          </div>
        </div>
        
        {/* Items Table container */}
        <div className="flex flex-col border-b-2 border-black min-h-[400px]">
          <table className="w-full text-center border-collapse table-fixed h-full">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="border-r-2 border-black p-2 font-normal text-center w-[40%]">DESCRIPTION OF GOODS</th>
                <th className="border-r-2 border-black p-2 font-normal text-center w-[10%]">HSN</th>
                <th className="border-r-2 border-black p-2 font-normal text-center w-[10%]">NO.OF<br/>BUNDLES</th>
                <th className="border-r-2 border-black p-2 font-normal text-center w-[10%]">NO.OF<br/>PIECES</th>
                <th className="border-r-2 border-black p-2 font-normal text-center w-[10%]">TOTAL<br/>METRE</th>
                <th className="border-r-2 border-black p-2 font-normal text-center w-[10%]">RATE /<br/>METRE</th>
                <th className="p-2 font-normal text-center w-[10%]">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="h-full">
                <td className="border-r-2 border-black p-2 text-left uppercase whitespace-pre-wrap">{transaction.description}</td>
                <td className="border-r-2 border-black p-2">{transaction.hsnCode}</td>
                <td className="border-r-2 border-black p-2"></td>
                <td className="border-r-2 border-black p-2"></td>
                <td className="border-r-2 border-black p-2"></td>
                <td className="border-r-2 border-black p-2"></td>
                <td className="p-2 text-right">{taxableVal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bank Details & Assessable Value */}
        <div className="flex border-b-2 border-black">
          <div className="w-[70%] border-r-2 border-black p-2 flex flex-col justify-end uppercase text-[11px] font-bold">
            <p className="mb-2">BANK DETAIL :-</p>
            <div className="grid grid-cols-[100px_auto] gap-2 mb-1">
              <span>ACCOUNT NO</span><span>: {account.bankAccountNumber || ""}</span>
            </div>
            <div className="grid grid-cols-[100px_auto] gap-2 mb-1">
              <span>BANK NAME</span><span>: {account.bankName || ""}</span>
            </div>
            <div className="grid grid-cols-[100px_auto] gap-2 mb-1">
              <span>BRANCH</span><span>: </span>
            </div>
            <div className="grid grid-cols-[100px_auto] gap-2">
              <span>IFSC</span><span>: {account.bankIfsc || ""}</span>
            </div>
          </div>
          <div className="w-[30%] text-[11px]">
            <div className="flex justify-between p-2">
              <span>ASSESSABLE VALUE</span>
              <span>{taxableVal.toFixed(2)}</span>
            </div>
            {gstType === 'CGST+SGST' ? (
              <>
                <div className="flex justify-between px-2 py-0.5">
                  <span>CGST {(rate / 2).toFixed(1)}%</span>
                  <span>{(transaction.cgst || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-2 py-0.5">
                  <span>SGST {(rate / 2).toFixed(1)}%</span>
                  <span>{(transaction.sgst || 0).toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between px-2 py-0.5">
                <span>IGST {rate}%</span>
                <span>{(transaction.igst || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between px-2 py-0.5 mt-4">
              <span>ROUNDED OFF</span>
              <span>{(transaction.amount - taxableVal - (transaction.cgst || 0) - (transaction.sgst || 0) - (transaction.igst || 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2 border-t-2 border-black font-bold text-sm">
              <span>NET AMOUNT</span>
              <span>{transaction.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Rupees in Words */}
        <div className="border-b-2 border-black p-2 font-bold text-[11px]">
          Rupees : {toIndianWords(transaction.amount)}
        </div>

        {/* Terms & Conditions and Signatures */}
        <div className="flex min-h-[100px]">
          <div className="flex-1 p-2">
            <h4 className="font-bold mb-1">Terms & Conditions :</h4>
            <p>Overdue interest will be charged at 24% from the invoice date.</p>
            <p>We are not responsible for any loss or damage in transit.</p>
            <p>We will not accept any claim after processing of goods.</p>
            <p>Subject to jurisdiction.</p>
          </div>
          <div className="w-[300px] p-2 flex flex-col justify-between items-end text-right font-bold">
            <p className="uppercase">For {profile.companyName || "SENTHIL KUMAR TEXTILES"}</p>
            <p className="mt-8 font-normal">Authorised Signatory</p>
          </div>
        </div>

        {/* Bottom Signatures Row */}
        <div className="flex justify-between px-4 pb-2 pt-8 text-[11px]">
          <span>Checked By</span>
          <span>Prepared By</span>
          <span>Received By</span>
          {/* Authorised Signatory is already above, so we leave it empty here or match the PDF spacing */}
          <span className="w-[120px]"></span>
        </div>

      </div>
    </div>
  );
}
