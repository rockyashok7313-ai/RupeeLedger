const fs = require('fs');
let code = fs.readFileSync('src/components/ReportPrint.tsx', 'utf8');

const targetButtons = `<span className="text-sm font-semibold text-slate-700">
              Go To:
            </span>`;

const replacementButtons = `<span className="text-sm font-semibold text-slate-700">
              Page {currentPage} of {chunkedTransactions.length}
            </span>`;

if (code.includes(targetButtons)) {
    code = code.replace(targetButtons, replacementButtons);
    console.log("Restored page numbers");
} else {
    console.log("Could not find target to restore page numbers");
}

fs.writeFileSync('src/components/ReportPrint.tsx', code);
