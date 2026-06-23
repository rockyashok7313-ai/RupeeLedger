import React from 'react';
import { Transaction, Account, BusinessProfile } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format } from 'date-fns';
import { Printer, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';

export function VoucherPrint({ 
  transaction, 
  account, 
  businessProfile 
}: { 
  transaction: Transaction; 
  account: Account; 
  businessProfile?: BusinessProfile;
}) {
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
    const amount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(transaction.amount);
    
    const company = profile.companyName || "RupeeLedger";
    const text = `*${company} Voucher*%0A--------------------------%0A*Type:* ${transaction.type}%0A*Account:* ${account.name}%0A*Date:* ${format(transaction.date, 'PPP')}%0A*Amount:* ${amount}%0A*Narration:* ${transaction.description}%0A--------------------------%0A_Generated via ${company}_`;
    
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex gap-2">
        <Button onClick={handlePrint} className="flex-1">
          <Printer className="mr-2 h-4 w-4" /> Print Voucher
        </Button>
        <Button onClick={shareToWhatsApp} variant="secondary" className="flex-1 bg-[#25D366] text-white hover:bg-[#128C7E]">
          <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
        </Button>
      </div>

      <div className="border-2 border-primary p-8 bg-white max-w-2xl mx-auto rounded-lg shadow-sm">
        <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {profile.companyName || "RupeeLedger"}
            </h1>
            {profile.address && (
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">{profile.address}</p>
            )}
            {profile.gstin && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">GSTIN: {profile.gstin}</p>
            )}
            {profile.phone && (
              <p className="text-xs text-muted-foreground mt-0.5">Contact: {profile.phone}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-2 font-semibold">Professional Financial Voucher</p>
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
          <p className="text-lg italic">&ldquo;{transaction.description}&rdquo;</p>
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
            <p className="text-xs uppercase font-bold">Receiver&apos;s Signature</p>
          </div>
        </div>
        
        <div className="mt-12 text-center text-[10px] text-muted-foreground italic border-t border-dashed pt-4 space-y-1">
          {profile.printFooter && (
            <p className="font-semibold text-muted-foreground mb-1">{profile.printFooter}</p>
          )}
          <p>
            This is a computer-generated voucher from {profile.companyName || "RupeeLedger"}.
          </p>
        </div>
      </div>
    </div>
  );
}
