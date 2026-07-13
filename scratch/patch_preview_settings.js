const fs = require('fs');
let content = fs.readFileSync('src/components/gst/InvoicePreview.tsx', 'utf8');

const importsToAdd = "import { Switch } from '@/components/ui/switch';\nimport { Label } from '@/components/ui/label';\n";

content = content.replace("import { BusinessProfile, Invoice } from '@/lib/types';", importsToAdd + "import { BusinessProfile, Invoice } from '@/lib/types';");

const stateToAdd = `  const [theme, setTheme] = useState<'Classic' | 'Modern' | 'Minimal'>('Classic');
  const [fontScale, setFontScale] = useState(1);
  const [showHsn, setShowHsn] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [showAmountInWords, setShowAmountInWords] = useState(true);
  const [showSignatory, setShowSignatory] = useState(true);
`;

content = content.replace(
  "const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices.length > 0 ? invoices[invoices.length - 1].id : '');",
  "const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices.length > 0 ? invoices[invoices.length - 1].id : '');\n" + stateToAdd
);

// Sidebar UI
const sidebarUI = `
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 space-y-6 print:hidden">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-sm border-b pb-2">Display Settings</h3>
              
              <div className="space-y-2">
                <Label className="text-xs">Theme</Label>
                <select className="flex h-8 w-full rounded-md border px-2 text-xs" value={theme} onChange={e => setTheme(e.target.value as any)}>
                  <option value="Classic">Classic</option>
                  <option value="Modern">Modern</option>
                  <option value="Minimal">Minimal</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Font Scale ({Math.round(fontScale * 100)}%)</Label>
                <input type="range" min="0.8" max="1.4" step="0.1" value={fontScale} onChange={e => setFontScale(parseFloat(e.target.value))} className="w-full" />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Show HSN Code</span>
                  <input type="checkbox" checked={showHsn} onChange={e => setShowHsn(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Bank Details</span>
                  <input type="checkbox" checked={showBankDetails} onChange={e => setShowBankDetails(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Amount in Words</span>
                  <input type="checkbox" checked={showAmountInWords} onChange={e => setShowAmountInWords(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Signatory</span>
                  <input type="checkbox" checked={showSignatory} onChange={e => setShowSignatory(e.target.checked)} />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex-1 overflow-auto">
`;

content = content.replace(
  '      {!invoice ? (',
  sidebarUI + '\n      {!invoice ? ('
);

// Close the flex container at the end
content = content.replace(
  '      )}',
  '      )}\n        </div>'
);

// Close main div properly
content = content.replace(
  '    </div>\n  );\n}\n',
  '      </div>\n    </div>\n  );\n}\n'
);


// Apply Theme and Font Scale
content = content.replace(
  '<Card className="bg-white text-black print:shadow-none print:border-none w-full max-w-4xl mx-auto overflow-hidden print-a4-page">',
  '<Card className={\`bg-white text-black print:shadow-none print:border-none w-full max-w-4xl mx-auto overflow-hidden print-a4-page theme-\${theme.toLowerCase()}\`} style={{ fontSize: \`\${fontScale}rem\` }}>'
);

// Apply Toggles
content = content.replace(
  '<th className="p-3 font-bold">HSN</th>',
  '{showHsn && <th className="p-3 font-bold">HSN</th>}'
);
content = content.replace(
  '<td className="p-3 text-gray-600">{item.hsnCode || \'-\'}</td>',
  '{showHsn && <td className="p-3 text-gray-600">{item.hsnCode || \'-\'}</td>}'
);

content = content.replace(
  '<div>\n                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Bank Details</h3>',
  '{showBankDetails && <div>\n                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Bank Details</h3>'
);
content = content.replace(
  '<p><span className="font-medium text-gray-700">IFSC:</span> {businessProfile.bankIfsc || \'N/A\'}</p>\n                  </div>\n                </div>',
  '<p><span className="font-medium text-gray-700">IFSC:</span> {businessProfile.bankIfsc || \'N/A\'}</p>\n                  </div>\n                </div>}'
);

content = content.replace(
  '<div>\n                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total in Words</h3>',
  '{showAmountInWords && <div>\n                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total in Words</h3>'
);
content = content.replace(
  '</p>\n                </div>',
  '</p>\n                </div>}'
);

content = content.replace(
  '<div className="text-center sm:text-right mt-6 sm:mt-0 w-48">',
  '{showSignatory && <div className="text-center sm:text-right mt-6 sm:mt-0 w-48">'
);
content = content.replace(
  '<p className="text-[10px] text-gray-400 mt-1">For {businessProfile.companyName}</p>\n              </div>',
  '<p className="text-[10px] text-gray-400 mt-1">For {businessProfile.companyName}</p>\n              </div>}'
);

fs.writeFileSync('src/components/gst/InvoicePreview.tsx', content);
