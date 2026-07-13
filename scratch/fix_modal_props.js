const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `        setUpgradeModalProps({
          isOpen: true,
          requiredTier: "MONTHLY",
          featureName: "Unlimited Transactions",
          onClose: () => setUpgradeModalProps(prev => ({ ...prev, isOpen: false }))
        });`;

const replacement1 = `        setUpgradeFeatureName("Unlimited Transactions");
        setUpgradeRequiredTier("MONTHLY");
        setUpgradeModalOpen(true);`;

const target2 = `        setUpgradeModalProps({
          isOpen: true,
          requiredTier: "MONTHLY",
          featureName: "Unlimited Ledgers",
          onClose: () => setUpgradeModalProps(prev => ({ ...prev, isOpen: false }))
        });`;

const replacement2 = `        setUpgradeFeatureName("Unlimited Ledgers");
        setUpgradeRequiredTier("MONTHLY");
        setUpgradeModalOpen(true);`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed upgrade modal properties');
