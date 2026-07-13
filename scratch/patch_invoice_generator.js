const fs = require('fs');

let content = fs.readFileSync('src/components/gst/InvoiceGenerator.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  "import { BusinessProfile, Client, InventoryItem, Invoice, InvoiceItem } from '@/lib/types';",
  "import { BusinessProfile, Client, InventoryItem, Invoice, InvoiceItem, InvoiceType } from '@/lib/types';\nimport { currencies } from '@/lib/currency';\nimport { UQC_LIST, generateInvoiceNumber, getCurrentFinancialYear } from '@/lib/invoiceUtils';"
);

// 2. Add state
content = content.replace(
  "const [items, setItems] = useState<Partial<InvoiceItem>[]>([{ name: '', hsnCode: '', quantity: 1, rate: 0, taxPercent: 18 }]);",
  "const [items, setItems] = useState<Partial<InvoiceItem>[]>([{ name: '', hsnCode: '', quantity: 1, rate: 0, taxPercent: 18, unit: 'NOS-NUMBERS' }]);\n  const [invoiceType, setInvoiceType] = useState<InvoiceType>('Tax Invoice');\n  const [currency, setCurrency] = useState('INR');\n  const [exchangeRate, setExchangeRate] = useState(1);"
);

// 3. Update items initial state in handleAddItem
content = content.replace(
  "setItems([...items, { name: '', hsnCode: '', quantity: 1, rate: 0, taxPercent: 18 }]);",
  "setItems([...items, { name: '', hsnCode: '', quantity: 1, rate: 0, taxPercent: 18, unit: 'NOS-NUMBERS' }]);"
);

// 4. Update save function for prefix and financialYear
content = content.replace(
  "const newInvoice: Invoice = {",
  "const newInvoice: Invoice = {\n      type: invoiceType,\n      currency,\n      exchangeRate,\n      financialYear: getCurrentFinancialYear(),"
);

// 5. Update items map in handleSaveInvoice
content = content.replace(
  "hsnCode: item.hsnCode || '',\n        quantity: qty,",
  "hsnCode: item.hsnCode || '',\n        unit: item.unit || 'NOS-NUMBERS',\n        quantity: qty,"
);

// 6. Update Inter-state guard validation in handleSaveInvoice
content = content.replace(
  "if (!clientName) return alert('Please enter a client name.');",
  "if (!clientName) return alert('Please enter a client name.');\n    if (gstType === 'IGST' && !customerAddress) return alert('Inter-state supply requires Customer Address to determine Place of Supply.');"
);

// 7. Inject UI fields
const uiFields = `        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Invoice Type</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={invoiceType} onChange={e => setInvoiceType(e.target.value as InvoiceType)}>
              <option value="Tax Invoice">Tax Invoice</option>
              <option value="Proforma">Proforma / Estimate</option>
              <option value="Bill of Supply">Bill of Supply</option>
              <option value="Credit Note">Credit Note</option>
              <option value="Delivery Challan">Delivery Challan</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={currency} onChange={e => setCurrency(e.target.value)}>
              {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`;

content = content.replace('<div className="grid grid-cols-1 md:grid-cols-2 gap-4">', uiFields);

// 8. Add Unit dropdown to items map
const unitDropdown = `              <div className="w-24 space-y-2">
                <Label className="text-xs">Unit</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs" value={item.unit || 'NOS-NUMBERS'} onChange={(e) => handleItemChange(index, 'unit', e.target.value)}>
                  {UQC_LIST.map(uqc => <option key={uqc} value={uqc}>{uqc.split('-')[0]}</option>)}
                </select>
              </div>`;

content = content.replace(
  '<div className="w-20 space-y-2">\n                <Label className="text-xs">Qty</Label>',
  unitDropdown + '\n              <div className="w-20 space-y-2">\n                <Label className="text-xs">Qty</Label>'
);

fs.writeFileSync('src/components/gst/InvoiceGenerator.tsx', content);
