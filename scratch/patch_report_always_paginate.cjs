const fs = require('fs');
let code = fs.readFileSync('src/components/ReportPrint.tsx', 'utf8');

const target = `{chunkedTransactions.length > 1 && (
          <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-md border border-slate-200 w-full sm:w-auto justify-between">`;
          
const replacement = `<div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-md border border-slate-200 w-full sm:w-auto justify-between">`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    // Also need to remove the closing brace
    const endTarget = `</Button>
          </div>
        )}`;
    const endReplacement = `</Button>
          </div>`;
    code = code.replace(endTarget, endReplacement);
    console.log("Always showing pagination");
} else {
    console.log("Could not find pagination condition");
}

fs.writeFileSync('src/components/ReportPrint.tsx', code);
