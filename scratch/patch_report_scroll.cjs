const fs = require('fs');
let code = fs.readFileSync('src/components/ReportPrint.tsx', 'utf8');

// 1. Revert the hidden logic on pdf-page
const targetClass = `className={\`pdf-page relative p-8 bg-white text-black font-sans w-[210mm] shadow-lg border border-gray-300 break-after-page flex-col \${
              (index + 1 === currentPage || isExporting) ? 'flex' : 'hidden print:flex'
            }\`}`;
const replacementClass = `id={\`pdf-page-\${index + 1}\`}
            className="pdf-page relative p-8 bg-white text-black font-sans w-[210mm] shadow-lg border border-gray-300 break-after-page flex flex-col"`;

if (code.includes(targetClass)) {
    code = code.replace(targetClass, replacementClass);
    console.log("Reverted hidden pages");
} else {
    // try a regex in case of whitespace
    const regexClass = /className=\{\`pdf-page relative p-8 bg-white text-black font-sans w-\[210mm\] shadow-lg border border-gray-300 break-after-page flex-col \$\{[\s\S]*?\}\`\}/g;
    if (regexClass.test(code)) {
        code = code.replace(regexClass, replacementClass);
        console.log("Reverted hidden pages (regex)");
    } else {
        console.log("Could not find the target class!");
    }
}

// 2. Update the buttons to scroll instead of just setting state
// We already have `currentPage` state. We can update it and scroll.
const targetButtons = `<Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isExporting}
            >
              Prev Page
            </Button>
            <span className="text-sm font-semibold text-slate-700">
              Page {currentPage} of {chunkedTransactions.length}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(chunkedTransactions.length, p + 1))}
              disabled={currentPage === chunkedTransactions.length || isExporting}
            >
              Next Page
            </Button>`;

const replacementButtons = `<Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const newPage = Math.max(1, currentPage - 1);
                setCurrentPage(newPage);
                document.getElementById(\`pdf-page-\${newPage}\`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              disabled={currentPage === 1 || isExporting}
            >
              Prev Page
            </Button>
            <span className="text-sm font-semibold text-slate-700">
              Go To:
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const newPage = Math.min(chunkedTransactions.length, currentPage + 1);
                setCurrentPage(newPage);
                document.getElementById(\`pdf-page-\${newPage}\`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              disabled={currentPage === chunkedTransactions.length || isExporting}
            >
              Next Page
            </Button>`;

if (code.includes(targetButtons)) {
    code = code.replace(targetButtons, replacementButtons);
    console.log("Updated pagination buttons to scroll");
} else {
    console.log("Could not find pagination buttons");
}

fs.writeFileSync('src/components/ReportPrint.tsx', code);
