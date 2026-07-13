const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{\/\* Print-only containers \*\/\}\s*<div className="print-only fixed inset-0 z-\[9999\] bg-white overflow-visible">[\s\S]*?<UpgradeModal[\s\S]*?\/>\s*<\/div>/g;

const replacement = `<UpgradeModal 
           isOpen={upgradeModalOpen} 
           onClose={() => setUpgradeModalOpen(false)} 
           featureName={upgradeFeatureName}
           requiredTier={upgradeRequiredTier}
         />`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    console.log("Successfully removed print-only container");
} else {
    console.log("Could not find regex pattern");
}

fs.writeFileSync('src/App.tsx', code);
