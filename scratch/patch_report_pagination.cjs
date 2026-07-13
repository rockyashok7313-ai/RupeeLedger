const fs = require('fs');
let code = fs.readFileSync('src/components/ReportPrint.tsx', 'utf8');

// 1. Add currentPage state
if (!code.includes('const [currentPage, setCurrentPage] = useState(1);')) {
  code = code.replace(
    'const [isExporting, setIsExporting] = useState(false);',
    'const [isExporting, setIsExporting] = useState(false);\n  const [currentPage, setCurrentPage] = useState(1);'
  );
}

// 2. Add setTimeout to handleDownloadPDF
const targetDownload = `    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;`;

const replacementDownload = `    setIsExporting(true);
    await new Promise(r => setTimeout(r, 150));
    try {
      const html2canvas = (await import('html2canvas')).default;`;
if(code.includes(targetDownload)) {
    code = code.replace(targetDownload, replacementDownload);
}

// 3. Update the Buttons container with Pagination controls
const targetHeader = `<div className="flex gap-2 no-print">
        <Button onClick={handlePrint} className="flex-1 sm:flex-none">
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
        <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting} className="flex-1 sm:flex-none">
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Download PDF
        </Button>
      </div>`;

const replacementHeader = `<div className="flex flex-col sm:flex-row gap-4 no-print items-start sm:items-center justify-between mb-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handlePrint} className="flex-1 sm:flex-none">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting} className="flex-1 sm:flex-none">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </div>
        
        {chunkedTransactions.length > 1 && (
          <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-md border border-slate-200 w-full sm:w-auto justify-between">
            <Button 
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
            </Button>
          </div>
        )}
      </div>`;

if(code.includes(targetHeader)) {
    code = code.replace(targetHeader, replacementHeader);
}

// 4. Update the pdf-page class to only show currentPage unless printing/exporting
const targetPageClass = `className="pdf-page relative p-8 bg-white text-black font-sans w-[210mm] shadow-lg border border-gray-300 break-after-page flex flex-col"`;
const replacementPageClass = `className={\`pdf-page relative p-8 bg-white text-black font-sans w-[210mm] shadow-lg border border-gray-300 break-after-page flex-col \${
              (index + 1 === currentPage || isExporting) ? 'flex' : 'hidden print:flex'
            }\`}`;

if(code.includes(targetPageClass)) {
    code = code.replace(targetPageClass, replacementPageClass);
}

fs.writeFileSync('src/components/ReportPrint.tsx', code);
console.log("Patched ReportPrint.tsx");
