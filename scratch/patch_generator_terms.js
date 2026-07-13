const fs = require('fs');
let content = fs.readFileSync('src/components/gst/InvoiceGenerator.tsx', 'utf8');

const termsPresets = `
  const termsTemplates = {
    'general': '1. Goods once sold will not be taken back.\\n2. Interest @ 18% p.a. will be charged if payment is delayed by more than 30 days.',
    'it_services': '1. Payment terms: Net 15 days.\\n2. Intellectual property transfers upon full payment.\\n3. Late fees: 1.5% per month on overdue balances.',
    'ecommerce': '1. Returns accepted within 7 days of delivery.\\n2. Subject to local jurisdiction.\\n3. Warranty applies as per manufacturer terms.',
    'consulting': '1. Invoice payable upon receipt.\\n2. Retainer fees are non-refundable.\\n3. Subject to NDA terms signed.'
  };
  const [terms, setTerms] = useState<string>('');
`;

content = content.replace(
  "const [items, setItems] = useState<Partial<InvoiceItem>[]>([{ name: '', hsnCode: '', quantity: 1, rate: 0, taxPercent: 18, unit: 'NOS-NUMBERS' }]);",
  "const [items, setItems] = useState<Partial<InvoiceItem>[]>([{ name: '', hsnCode: '', quantity: 1, rate: 0, taxPercent: 18, unit: 'NOS-NUMBERS' }]);\n" + termsPresets
);

content = content.replace(
  "const newInvoice: Invoice = {",
  "const newInvoice: Invoice = {\n      terms,"
);

const termsUI = `
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold border-b pb-2">Terms & Conditions (Rich Text)</h3>
          <div className="flex gap-4">
            <div className="w-1/3 space-y-2">
              <Label>Starter Templates</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" onChange={e => setTerms(termsTemplates[e.target.value as keyof typeof termsTemplates] || '')}>
                <option value="">-- Select Template --</option>
                <option value="general">General Business</option>
                <option value="it_services">IT & Software Services</option>
                <option value="ecommerce">E-Commerce / Retail</option>
                <option value="consulting">Consulting Services</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">Select a preset to auto-fill your terms. You can then edit them in the text area.</p>
            </div>
            <div className="w-2/3 space-y-2">
              <Label>Custom Terms</Label>
              <textarea 
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                placeholder="Enter your terms and conditions here..."
                value={terms}
                onChange={e => setTerms(e.target.value)}
              />
            </div>
          </div>
        </div>
`;

content = content.replace(
  '<div className="pt-4 border-t flex justify-end gap-3">',
  termsUI + '\n        <div className="pt-4 border-t flex justify-end gap-3">'
);

fs.writeFileSync('src/components/gst/InvoiceGenerator.tsx', content);
