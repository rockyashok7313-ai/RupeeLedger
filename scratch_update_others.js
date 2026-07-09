const fs = require('fs');
const path = require('path');

const replacements = [
  {
    file: 'src/components/DailyReport.tsx',
    rules: [
      { from: /"RupeeLedger"/g, to: '"RupeeLedger Pro"' },
    ]
  },
  {
    file: 'src/components/ReportPrint.tsx',
    rules: [
      { from: /"RupeeLedger"/g, to: '"RupeeLedger Pro"' },
    ]
  },
  {
    file: 'src/components/VoucherPrint.tsx',
    rules: [
      { from: /RupeeLedger Voucher/g, to: 'RupeeLedger Pro Voucher' },
      { from: /via RupeeLedger/g, to: 'via RupeeLedger Pro' },
      { from: />RupeeLedger</g, to: '>RupeeLedger Pro<' },
      { from: /from RupeeLedger/g, to: 'from RupeeLedger Pro' },
    ]
  },
  {
    file: 'src/lib/license.ts',
    rules: [
      { from: /noreply@rupeeledger\.com/g, to: 'noreply@rupeeledgerpro.com' },
      { from: /RupeeLedger Pro/g, to: 'RupeeLedger Pro' }, // already has Pro in some places
      { from: /RupeeLedger application/g, to: 'RupeeLedger Pro application' },
    ]
  },
  {
    file: 'src/lib/mongodb.ts',
    rules: [
      { from: /rupeeledger/g, to: 'rupeeledgerpro' },
    ]
  }
];

for (const rep of replacements) {
  const filePath = path.join(__dirname, rep.file);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const rule of rep.rules) {
    content = content.replace(rule.from, rule.to);
  }
  fs.writeFileSync(filePath, content);
  console.log('Updated ' + rep.file);
}
