const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /(const handleTransactionAdd = \(data: \{[\s\S]*?\}\) => \{)(\s+)(const newTx: Transaction = \{)/;

if (regex.test(code)) {
    code = code.replace(regex, `$1$2if (subscription.tier === "FREE") {
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
        setIsNewTransactionOpen(false);
        setIsNewInvoiceOpen(false);
        return;
      }
    }

    $3`);
    fs.writeFileSync('src/App.tsx', code);
    console.log('Transaction limit patched successfully via Regex.');
} else {
    console.log('Regex did not match handleTransactionAdd in App.tsx');
}
