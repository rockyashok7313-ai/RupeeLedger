import React from 'react';
import { Transaction, Account } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import { Button } from './ui/button';

export function VoucherPrint({ transaction, account }: { transaction: Transaction; account: Account }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="no-print">
        <Button onClick={handlePrint} className="w-full sm:w-auto">
          <Printer className="mr-2 h-4 w-4" /> Print Voucher
        </Button>
      </div>

      <div className="print-only border-2 border-primary p-8 bg-white max-w-2xl mx-auto rounded-lg shadow-sm">
        <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">RupeeLedger</h1>
            <p className="text-sm text-muted-foreground">Professional Financial Voucher</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase">{transaction.type} VOUCHER</h2>
            <p className="text-xs">Voucher ID: {transaction.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs uppercase font-semibold text-muted-foreground">Account Name</p>
            <p className="text-lg font-semibold">{account.name}</p>
            <p className="text-sm">{account.type} Account</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase font-semibold text-muted-foreground">Date</p>
            <p className="text-lg font-semibold">{format(transaction.date, 'PPP')}</p>
          </div>
        </div>

        <div className="bg-muted/30 p-4 rounded-md mb-8">
          <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Description / Particulars</p>
          <p className="text-lg italic">"{transaction.description}"</p>
        </div>

        <div className="flex justify-end items-center mb-12">
          <div className="text-right">
            <p className="text-xs uppercase font-semibold text-muted-foreground">Amount</p>
            <div className="text-4xl font-bold text-primary">
               <CurrencyDisplay amount={transaction.amount} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-dashed">
          <div className="text-center">
            <div className="border-b border-primary w-full h-8 mb-2"></div>
            <p className="text-xs uppercase font-bold">Authorized Signature</p>
          </div>
          <div className="text-center">
            <div className="border-b border-primary w-full h-8 mb-2"></div>
            <p className="text-xs uppercase font-bold">Receiver's Signature</p>
          </div>
        </div>
        
        <div className="mt-12 text-center text-[10px] text-muted-foreground italic">
          This is a computer-generated voucher from RupeeLedger.
        </div>
      </div>
    </div>
  );
}