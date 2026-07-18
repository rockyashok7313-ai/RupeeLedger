import React, { useState } from 'react';
import { Transaction, Account } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format } from 'date-fns';
import { Printer, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { WhatsAppShareDialog } from './WhatsAppShareDialog';

export function VoucherPrint({ transaction, account }: { transaction: Transaction; account: Account | undefined }) {
  const [isShareOpen, setIsShareOpen] = useState(false);

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

  const amountStr = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(transaction.amount || 0);
  
  const shareText = `*RupeeLedger Pro Voucher*\n--------------------------\n*Type:* ${transaction.type || 'N/A'}\n*Account:* ${account.name || 'N/A'}\n*Date:* ${transaction.date ? format(new Date(transaction.date), 'PPP') : 'N/A'}\n*Amount:* ${amountStr}\n*Narration:* ${transaction.description || 'N/A'}\n--------------------------\n_Generated via RupeeLedger Pro_`;

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
          }
          .voucher-page {
            width: 148mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 10mm !important;
            border: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background-color: white !important;
            color: black !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
          .voucher-body {
            flex-grow: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            gap: 15px !important;
            margin: auto 0 !important;
          }
          .voucher-footer {
            margin-top: auto !important;
          }
          /* A5 scaling rules */
          .voucher-page h1 {
            font-size: 1.4rem !important;
            line-height: 1.2 !important;
          }
          .voucher-page h2 {
            font-size: 1rem !important;
            line-height: 1.2 !important;
          }
          .voucher-page p, .voucher-page span, .voucher-page div {
            font-size: 0.8rem !important;
          }
          .voucher-page .text-lg {
            font-size: 0.95rem !important;
          }
          .voucher-page .text-xl {
            font-size: 1.1rem !important;
          }
          .voucher-page .text-4xl, .voucher-page .text-5xl {
            font-size: 1.8rem !important;
          }
          .voucher-page .text-xs {
            font-size: 0.65rem !important;
          }
          .voucher-page .p-8 {
            padding: 1rem !important;
          }
          .voucher-page .mb-6, .voucher-page .mb-8, .voucher-page .mb-12 {
            margin-bottom: 0.5rem !important;
          }
          .voucher-page .mt-16 {
            margin-top: 1rem !important;
          }
          .voucher-page .gap-12 {
            gap: 1.5rem !important;
          }
          .voucher-page .pb-4 {
            padding-bottom: 0.5rem !important;
          }
        }
      `}</style>
      <div className="no-print flex gap-2">
        <Button onClick={handlePrint} className="flex-1">
          <Printer className="mr-2 h-4 w-4" /> Print Voucher
        </Button>
        <Button onClick={() => setIsShareOpen(true)} variant="secondary" className="flex-1 bg-[#25D366] text-white hover:bg-[#128C7E]">
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

        <div className="voucher-body flex-1 flex flex-col justify-center gap-8">
          <div className="grid grid-cols-2 gap-8">
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

          <div className="bg-gray-100 p-6 rounded-md border">
            <p className="text-xs uppercase font-semibold text-gray-500 mb-2">Description / Particulars</p>
            <p className="text-lg italic text-black font-medium">"{transaction.description}"</p>
          </div>

          <div className="flex justify-end items-center">
            <div className="text-right">
              <p className="text-xs uppercase font-semibold text-gray-500">Amount</p>
              <div className="text-4xl font-extrabold text-black mt-1">
                 <CurrencyDisplay amount={transaction.amount} />
              </div>
            </div>
          </div>
        </div>

        <div className="voucher-footer space-y-8 mt-auto pt-8">
          <div className="grid grid-cols-2 gap-12 border-t border-dashed border-gray-300 pt-8">
            <div className="text-center">
              <div className="border-b border-black w-full h-8 mb-2"></div>
              <p className="text-xs uppercase font-bold text-black">Authorized Signature</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black w-full h-8 mb-2"></div>
              <p className="text-xs uppercase font-bold text-black">Receiver's Signature</p>
            </div>
          </div>
          
          <div className="text-center text-[10px] text-gray-500 italic">
            This is a computer-generated voucher from RupeeLedger Pro.
          </div>
        </div>
      </div>
    </div>
  );
}
