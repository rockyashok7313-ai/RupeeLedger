const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src/app/page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// Replacements in page.tsx
content = content.replace(/DB_NAME = 'RupeeLedgerDB'/g, "DB_NAME = 'RupeeLedgerProDB'");
content = content.replace(/rupeeledger_backup\.json/g, "rupeeledgerpro_backup.json");
content = content.replace(/ak@rupeeledger\.com/g, "ak@rupeeledgerpro.com");
content = content.replace(/admin@rupeeledger\.com/g, "admin@rupeeledgerpro.com");
content = content.replace(/RupeeLedger Member/g, "RupeeLedger Pro Member");
content = content.replace(/Welcome back to RupeeLedger/g, "Welcome back to RupeeLedger Pro");
content = content.replace(/>RupeeLedger</g, ">RupeeLedger Pro<");
content = content.replace(/About RupeeLedger/g, "About RupeeLedger Pro");
content = content.replace(/RupeeLedger is designed for absolute privacy/g, "RupeeLedger Pro is designed for absolute privacy");
content = content.replace(/alt="RupeeLedger Logo"/g, 'alt="RupeeLedger Pro Logo"');
content = content.replace(/e\.g\. RupeeLedger Enterprises/g, "e.g. RupeeLedger Pro Enterprises");

fs.writeFileSync(pagePath, content);
console.log('page.tsx updated.');
