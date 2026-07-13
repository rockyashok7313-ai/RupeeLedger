const fs = require('fs');
let content = fs.readFileSync('src/components/gst/InvoicePreview.tsx', 'utf8');

// 1. Update imports
content = content.replace(
  "import { toWords } from 'number-to-words';",
  "import { formatAmountInWords, formatCurrency } from '@/lib/currency';"
);

// 2. Update Invoice Title
content = content.replace(
  '<h2 className="text-2xl font-bold text-gray-800 uppercase tracking-widest">Tax Invoice</h2>',
  '<h2 className="text-2xl font-bold text-gray-800 uppercase tracking-widest">{invoice.type || \'Tax Invoice\'}</h2>'
);

// 3. Update Invoice Number
content = content.replace(
  '<span className="font-bold\">INV-{invoice.id.substring(0,6).toUpperCase()}</span>',
  '<span className="font-bold\">{invoice.invoiceNumber || (\'INV-\' + invoice.id.substring(0,6).toUpperCase())}</span>'
);

// 4. Update Qty column header to Qty/Unit
content = content.replace(
  '<th className="p-3 font-bold text-center">Qty</th>',
  '<th className="p-3 font-bold text-center">Qty/Unit</th>'
);

// 5. Update Qty column body to include unit
content = content.replace(
  '<td className="p-3 text-center">{item.quantity}</td>',
  '<td className="p-3 text-center">{item.quantity} {item.unit?.split(\'-\')[0] || \'\'}</td>'
);

// 6. Update Rate to use currency
content = content.replace(
  '<td className="p-3 text-right">₹{item.rate.toFixed(2)}</td>',
  '<td className="p-3 text-right">{formatCurrency(item.rate, invoice.currency || \'INR\')}</td>'
);

// 7. Update Amount to use currency
content = content.replace(
  '<td className="p-3 text-right font-medium\">₹{item.amount.toFixed(2)}</td>',
  '<td className="p-3 text-right font-medium\">{formatCurrency(item.amount, invoice.currency || \'INR\')}</td>'
);

// 8. Update Amount in Words
content = content.replace(
  'Rupees {toWords(Math.round(invoice.total))} Only',
  '{formatAmountInWords(invoice.total, invoice.currency || \'INR\')}'
);

fs.writeFileSync('src/components/gst/InvoicePreview.tsx', content);
