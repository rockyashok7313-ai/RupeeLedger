import React from 'react';
import { Transaction, Account } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format } from 'date-fns';
import { Printer, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';

export function VoucherPrint({ transaction, account }: { transaction: Transaction; account: Account | undefined }) {
  if (!transaction || !account) {
    return (
      <div className="p-8 text-center text-destructive font-semibold">
        Error: Could not load voucher. Missing transaction or account details.
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const shareToWhatsApp = () => {
    const amount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(transaction.amount || 0);
    
    const text = `*RupeeLedger Pro Voucher*%0A--------------------------%0A*Type:* ${transaction.type || 'N/A'}%0A*Account:* ${account.name || 'N/A'}%0A*Date:* ${transaction.date ? format(new Date(transaction.date), 'PPP') : 'N/A'}%0A*Amount:* ${amount}%0A*Narration:* ${transaction.description || 'N/A'}%0A--------------------------%0A_Generated via RupeeLedger Pro_`;
    
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page {
            size: A5 landscape;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .voucher-page {
            width: 210mm !important;
            height: 148mm !important;
            margin: 0 !important;
            padding: 10mm !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <div className="no-print flex gap-2">
        <Button onClick={handlePrint} className="flex-1">
          <Printer className="mr-2 h-4 w-4" /> Print Voucher
        </Button>
        <Button onClick={shareToWhatsApp} variant="secondary" className="flex-1 bg-[#25D366] text-white hover:bg-[#128C7E]">
          <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
        </Button>
      </div>

      <div className="voucher-page print-only-reset border-2 border-primary p-8 bg-white text-black max-w-2xl mx-auto rounded-lg shadow-sm">
        <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black">RupeeLedger Pro</h1>
            <p className="text-sm text-gray-600">Professional Financial Voucher</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase text-black">{transaction.type} VOUCHER</h2>
            <p className="text-xs text-black">Voucher ID: {transaction.id ? transaction.id.toString().slice(0, 8).toUpperCase() : 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs uppercase font-semibold text-gray-500">Account Name</p>
            <p className="text-lg font-semibold text-black">{account.name}</p>
            <p className="text-sm text-black">{account.type} Account</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase font-semibold text-gray-500">Date</p>
            <p className="text-lg font-semibold text-black">{transaction.date ? format(new Date(transaction.date), 'PPP') : 'N/A'}</p>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-md mb-8">
          <p className="text-xs uppercase font-semibold text-gray-500 mb-2">Description / Particulars</p>
          <p className="text-lg italic text-black">"{transaction.description}"</p>
        </div>

        <div className="flex justify-end items-center mb-12">
          <div className="text-right">
            <p className="text-xs uppercase font-semibold text-gray-500">Amount</p>
            <div className="text-4xl font-bold text-black">
               <CurrencyDisplay amount={transaction.amount} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-dashed border-gray-300">
          <div className="text-center">
            <div className="border-b border-black w-full h-8 mb-2"></div>
            <p className="text-xs uppercase font-bold text-black">Authorized Signature</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black w-full h-8 mb-2"></div>
            <p className="text-xs uppercase font-bold text-black">Receiver's Signature</p>
          </div>
        </div>
        
        <div className="mt-12 text-center text-[10px] text-gray-500 italic">
          This is a computer-generated voucher from RupeeLedger Pro.
        </div>
      </div>
    </div>
  );
}
