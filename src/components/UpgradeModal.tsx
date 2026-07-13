import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle2 } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  requiredTier: 'MONTHLY' | 'YEARLY';
}

export function UpgradeModal({ isOpen, onClose, featureName, requiredTier }: UpgradeModalProps) {
  const isYearly = requiredTier === 'YEARLY';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="h-5 w-5 text-amber-500" />
            Feature Locked
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            <span className="font-semibold text-slate-800">{featureName}</span> is only available on the {isYearly ? 'Yearly' : 'Monthly'} plan and above.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-primary/5 p-4 rounded-lg my-2 border border-primary/10">
          <h4 className="font-semibold text-primary mb-2">Upgrade to {isYearly ? 'Yearly' : 'Monthly'} to get:</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            {isYearly ? (
              <>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited Users</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Multi-Branch Support</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> API Access & Integrations</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Custom Branding</li>
              </>
            ) : (
              <>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Up to 5 Users</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited Ledgers</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited Transactions</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> GST Invoices & Receipts</li>
              </>
            )}
          </ul>
        </div>
        
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => window.open('https://www.rupeeledgerpro.com', '_blank')}>
            Upgrade Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
