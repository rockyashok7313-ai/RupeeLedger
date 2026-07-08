const fs = require('fs');
const path = require('path');

const filePath = path.resolve('C:/Users/AK/Downloads/KUNJU/PETTY/src/components/ReportPrint.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const newLogic = `
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const pages = reportRef.current.querySelectorAll('.pdf-page');
      if (pages.length === 0) throw new Error("No pages found");

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          logging: false,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 12.7;
        const maxWidth = pageWidth - (margin * 2);
        
        const ratio = imgProps.width / imgProps.height;
        const printHeight = maxWidth / ratio;
        
        // Center vertically if it's smaller than page height, otherwise align to top margin
        const maxHeight = pageHeight - (margin * 2);
        let yOffset = margin;
        if (printHeight < maxHeight) {
            yOffset = margin + (maxHeight - printHeight) / 2;
        }

        pdf.addImage(imgData, 'PNG', margin, yOffset, maxWidth, printHeight);
        
        // Add Page Number
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(\`Page \${i + 1} of \${pages.length}\`, pageWidth / 2, pageHeight - 5, { align: "center" });
      }
      
      pdf.save(\`Account_Statement_\${account.name.replace(/\\s+/g, '_')}_\${format(new Date(), 'yyyyMMdd')}.pdf\`);
      toast({ title: "PDF downloaded successfully" });
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };
`;

// Replace handleDownloadPDF
content = content.replace(/const handleDownloadPDF = async \(\) => \{[\s\S]*?^\s*\};\n/m, newLogic + "\n");

// Rewrite the JSX return
const jsxStart = content.indexOf('return (');
const oldJsx = content.slice(jsxStart);

const newJsx = `return (
    <div className="space-y-6">
      <div className="flex gap-2 no-print">
        <Button onClick={handlePrint} className="flex-1 sm:flex-none">
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
        <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting} className="flex-1 sm:flex-none">
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Download PDF
        </Button>
      </div>

      <div ref={reportRef} className="print-only-reset flex flex-col items-center gap-8 bg-gray-100 p-4 rounded-md">
        {chunkedTransactions.map((chunk, index) => (
          <div 
            key={index} 
            className="pdf-page relative p-8 bg-white text-black font-sans w-[210mm] min-h-[297mm] shadow-lg border border-gray-300 break-after-page flex flex-col"
          >
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-black pb-4 mb-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wider text-black">
                  {businessProfile.companyName || "RupeeLedger"}
                </h1>
                {index === 0 && businessProfile.address && (
                  <p className="text-sm font-semibold text-gray-800 mt-1 max-w-sm whitespace-pre-wrap">{businessProfile.address}</p>
                )}
                {index === 0 && businessProfile.gstin && (
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">GSTIN: {businessProfile.gstin}</p>
                )}
              </div>
              <div className="text-left sm:text-right">
                <h2 className="text-xl font-bold uppercase text-black">STATEMENT OF ACCOUNT</h2>
                <p className="text-sm font-semibold text-gray-800 mt-2">Account Name: <span className="font-bold text-black">{account.name}</span></p>
                <p className="text-sm font-semibold text-gray-800">Account Type: <span className="font-bold text-black">{account.type}</span></p>
                <p className="text-xs font-semibold text-gray-600 mt-1">Generated: {format(new Date(), 'dd-MMM-yyyy HH:mm')}</p>
              </div>
            </div>

            {/* SUMMARY ONLY ON FIRST PAGE */}
            {index === 0 && (
              <div className="flex justify-between items-center border border-black mb-8">
                <div className="flex-1 p-3 text-center border-r border-black bg-gray-50">
                  <p className="text-xs uppercase font-bold text-gray-700">Opening Balance</p>
                  <div className="text-lg font-bold text-black mt-1">
                    <CurrencyDisplay amount={account.initialBalance} />
                  </div>
                </div>
                <div className="flex-1 p-3 text-center border-r border-black bg-gray-50">
                  <p className="text-xs uppercase font-bold text-gray-700">Total Deposits (Cr)</p>
                  <div className="text-lg font-bold text-black mt-1">
                    <CurrencyDisplay amount={totals.credit} />
                  </div>
                </div>
                <div className="flex-1 p-3 text-center border-r border-black bg-gray-50">
                  <p className="text-xs uppercase font-bold text-gray-700">Total Withdrawals (Dr)</p>
                  <div className="text-lg font-bold text-black mt-1">
                    <CurrencyDisplay amount={totals.debit} />
                  </div>
                </div>
                <div className="flex-1 p-3 text-center bg-gray-100">
                  <p className="text-xs uppercase font-bold text-black">Closing Balance</p>
                  <div className="text-xl font-bold text-black mt-1">
                    <CurrencyDisplay amount={account.currentBalance} />
                  </div>
                </div>
              </div>
            )}

            {/* TABLE CHUNK */}
            <div className="border-t-2 border-l-2 border-r-2 border-black border-b-2 flex-grow">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-200 border-b-2 border-black">
                    <th className="py-2 px-3 text-left font-bold text-black border-r-2 border-black w-28">Date</th>
                    <th className="py-2 px-3 text-left font-bold text-black border-r-2 border-black">Particulars / Narration</th>
                    <th className="py-2 px-3 text-right font-bold text-black border-r-2 border-black w-32">Withdrawals (Dr)</th>
                    <th className="py-2 px-3 text-right font-bold text-black border-r-2 border-black w-32">Deposits (Cr)</th>
                    <th className="py-2 px-3 text-right font-bold text-black w-36">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-600 font-semibold">
                        No transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    chunk.map((t) => (
                      <tr key={t.id} className="border-b border-gray-400 font-semibold last:border-b-0">
                        <td className="py-2 px-3 whitespace-nowrap text-black border-r-2 border-black">
                          {format(t.date, "dd-MMM-yyyy")}
                        </td>
                        <td className="py-2 px-3 text-black border-r-2 border-black">
                          {t.description}
                        </td>
                        <td className="py-2 px-3 text-right text-black border-r-2 border-black">
                          {t.type === "Debit" ? <CurrencyDisplay amount={t.amount} /> : ""}
                        </td>
                        <td className="py-2 px-3 text-right text-black border-r-2 border-black">
                          {t.type === "Credit" ? <CurrencyDisplay amount={t.amount} /> : ""}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-black">
                          <CurrencyDisplay amount={t.balanceAfter} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                
                {/* FOOTER TOTALS ONLY ON LAST PAGE */}
                {index === chunkedTransactions.length - 1 && chunk.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-black">
                      <td colSpan={2} className="py-2 px-3 text-right text-black border-r-2 border-black">TOTALS / CLOSING:</td>
                      <td className="py-2 px-3 text-right text-black border-r-2 border-black">
                        <CurrencyDisplay amount={totals.debit} />
                      </td>
                      <td className="py-2 px-3 text-right text-black border-r-2 border-black">
                        <CurrencyDisplay amount={totals.credit} />
                      </td>
                      <td className="py-2 px-3 text-right text-black text-base">
                        <CurrencyDisplay amount={account.currentBalance} />
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* FOOTER */}
            <div className="mt-8 text-center text-xs font-semibold text-gray-700 italic pt-4 space-y-1">
              {businessProfile.printFooter && (
                <p className="font-bold text-black mb-1">{businessProfile.printFooter}</p>
              )}
              <p>
                ** End of Statement Page \${index + 1} - This is a computer generated report from {businessProfile.companyName || "RupeeLedger"} and does not require a physical signature **
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

content = content.replace(oldJsx, newJsx);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Rewrite completed successfully!");
