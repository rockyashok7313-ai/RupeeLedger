const fs = require('fs');
let code = fs.readFileSync('src/components/ReportPrint.tsx', 'utf8');

// 1. Update handlePrint to use setTimeout
const printTarget = `  const handlePrint = () => {
    window.print();
  };`;
const printReplacement = `  const handlePrint = () => {
    setIsExporting(true);
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 150);
  };`;
code = code.replace(printTarget, printReplacement);

// 2. Make PAGE_1_MAX dynamic based on isExporting
const pageMaxTarget = `  const PAGE_1_MAX = 16;
  const PAGE_OTHER_MAX = 16;`;
const pageMaxReplacement = `  const PAGE_1_MAX = isExporting ? 16 : 999999;
  const PAGE_OTHER_MAX = isExporting ? 16 : 999999;`;
code = code.replace(pageMaxTarget, pageMaxReplacement);

// 3. Remove fixed height from pdf-page so it grows naturally on screen, but retains width and print behavior
const classTarget = 'className="pdf-page scroll-mt-20 relative p-8 bg-white text-black font-sans w-[210mm] h-[297mm] shadow-lg border border-gray-300 break-after-page flex flex-col"';
const classReplacement = 'className={`pdf-page scroll-mt-20 relative p-8 bg-white text-black font-sans w-[210mm] shadow-lg border border-gray-300 break-after-page flex flex-col ${isExporting ? "h-[297mm]" : "min-h-[297mm]"}`}';
code = code.replace(classTarget, classReplacement);

// 4. Remove the pagination bar completely since they don't want "pdf scroll" on screen
const paginationStart = `<div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-md border border-slate-200 w-full sm:w-auto justify-between">`;
const paginationEnd = `Next Page
            </Button>
          </div>`;

const startIndex = code.indexOf(paginationStart);
const endIndex = code.indexOf(paginationEnd) + paginationEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + code.substring(endIndex);
}

fs.writeFileSync('src/components/ReportPrint.tsx', code);
console.log("Applied continuous scroll on-screen patch");
