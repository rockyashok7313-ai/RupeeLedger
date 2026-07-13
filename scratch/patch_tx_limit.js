const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The string we want to replace is exactly the start of the handleTransactionAdd function body
const target = `  const handleTransactionAdd = (data: { 
    accountId: string; 
    type: TransactionType; 
    amount: number; 
    description: string; 
    date: number;
    gstEnabled?: boolean;
    gstRate?: number;
    gstType?: 'CGST+SGST' | 'IGST';
    cgst?: number;
    sgst?: number;
    igst?: number;
    taxableAmount?: number;
    invoiceNumber?: string;
    customerName?: string;
    customerGstin?: string;
    gstCalculationType?: 'including' | 'excluding';
    hsnCode?: string;
    customerAddress?: string;
    shippingAddress?: string;
  }) => {
    const newTx: Transaction = {`;

const replacement = `  const handleTransactionAdd = (data: { 
    accountId: string; 
    type: TransactionType; 
    amount: number; 
    description: string; 
    date: number;
    gstEnabled?: boolean;
    gstRate?: number;
    gstType?: 'CGST+SGST' | 'IGST';
    cgst?: number;
    sgst?: number;
    igst?: number;
    taxableAmount?: number;
    invoiceNumber?: string;
    customerName?: string;
    customerGstin?: string;
    gstCalculationType?: 'including' | 'excluding';
    hsnCode?: string;
    customerAddress?: string;
    shippingAddress?: string;
  }) => {
    if (subscription.tier === "FREE") {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthTx = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      if (thisMonthTx.length >= 50) {
        setUpgradeModalProps({
          isOpen: true,
          requiredTier: "MONTHLY",
          featureName: "Unlimited Transactions",
          onClose: () => setUpgradeModalProps(prev => ({ ...prev, isOpen: false }))
        });
        setIsNewInvoiceOpen(false);
        return;
      }
    }

    const newTx: Transaction = {`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log('Transaction limit patched successfully.');
} else {
    console.log('Could not find target string in handleTransactionAdd');
}
