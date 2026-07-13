const fs = require('fs');
let code = fs.readFileSync('src/components/ReportPrint.tsx', 'utf8');

const targetHeader = `<div className="flex flex-col sm:flex-row gap-4 no-print items-start sm:items-center justify-between mb-4">`;
const replacementHeader = `<div className="sticky top-0 z-50 flex flex-col sm:flex-row gap-4 no-print items-start sm:items-center justify-between mb-4 bg-slate-100 p-3 shadow-md rounded-b-md">`;

if (code.includes(targetHeader)) {
    code = code.replace(targetHeader, replacementHeader);
    console.log("Patched ReportPrint sticky header");
} else {
    console.log("Could not find target header in ReportPrint");
}

fs.writeFileSync('src/components/ReportPrint.tsx', code);
