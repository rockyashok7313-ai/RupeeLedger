const fs = require('fs');

let code = fs.readFileSync('src/components/ReportPrint.tsx', 'utf8');

// Change Table Headers
code = code.replace(
  '<th className="py-2 px-3 text-right font-bold text-black border-r-2 border-black w-32">Withdrawals (Dr)</th>',
  '<th className="py-2 px-3 text-right font-bold text-black border-r-2 border-black w-32">Debit (Dr)</th>'
);
code = code.replace(
  '<th className="py-2 px-3 text-right font-bold text-black border-r-2 border-black w-32">Deposits (Cr)</th>',
  '<th className="py-2 px-3 text-right font-bold text-black border-r-2 border-black w-32">Credit (Cr)</th>'
);

// Change Summary Labels
code = code.replace(
  '<p className="text-xs uppercase font-bold text-gray-700">Total Deposits (Cr)</p>',
  '<p className="text-xs uppercase font-bold text-gray-700">Total Credit (Cr)</p>'
);
code = code.replace(
  '<p className="text-xs uppercase font-bold text-gray-700">Total Withdrawals (Dr)</p>',
  '<p className="text-xs uppercase font-bold text-gray-700">Total Debit (Dr)</p>'
);

// Add Opening Balance Row to the first page's table
const tableBodyStart = `                <tbody>
                  {/* Brought Forward for intermediate pages */}
                  {chunk.pageNum > 1 && (`;

const newTableBodyStart = `                <tbody>
                  {/* Opening Balance for first page */}
                  {chunk.pageNum === 1 && (
                    <tr className="border-b border-gray-400 font-bold bg-gray-50">
                      <td className="py-2 px-3 text-black border-r-2 border-black">-</td>
                      <td className="py-2 px-3 text-black border-r-2 border-black">OPENING BALANCE</td>
                      <td className="py-2 px-3 text-black border-r-2 border-black"></td>
                      <td className="py-2 px-3 text-black border-r-2 border-black"></td>
                      <td className="py-2 px-3 text-right text-black">
                        <CurrencyDisplay amount={account.initialBalance} />
                      </td>
                    </tr>
                  )}

                  {/* Brought Forward for intermediate pages */}
                  {chunk.pageNum > 1 && (`;

if (code.includes(tableBodyStart)) {
    code = code.replace(tableBodyStart, newTableBodyStart);
    console.log("Successfully injected Opening Balance row into ReportPrint");
} else {
    console.log("Failed to find tableBodyStart in ReportPrint");
}

fs.writeFileSync('src/components/ReportPrint.tsx', code);
