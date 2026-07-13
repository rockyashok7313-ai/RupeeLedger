const fs = require('fs');
let content = fs.readFileSync('src/components/gst/InvoicePreview.tsx', 'utf8');

// Add imports
const imports = `import DOMPurify from 'dompurify';
import { exportInvoiceToPDF } from '@/lib/pdfExport';`;

content = content.replace("import { Label } from '@/components/ui/label';", "import { Label } from '@/components/ui/label';\n" + imports);

// Update print button logic
const printLogic = `
  const handlePrint = () => {
    if (!invoice) return;
    const filename = \`Invoice_\${invoice.invoiceNumber || invoice.id}.pdf\`;
    exportInvoiceToPDF('invoice-pdf-container', filename);
  };
`;

content = content.replace(
  "  const handlePrint = () => {\n    window.print();\n  };",
  printLogic
);

// Add id="invoice-pdf-container" to the Card
content = content.replace(
  '<Card className={`bg-white text-black print:shadow-none print:border-none w-full max-w-4xl mx-auto overflow-hidden print-a4-page theme-${theme.toLowerCase()}`} style={{ fontSize: `${fontScale}rem` }}>',
  '<Card id="invoice-pdf-container" className={`bg-white text-black print:shadow-none print:border-none w-full max-w-4xl mx-auto overflow-hidden print-a4-page theme-${theme.toLowerCase()}`} style={{ fontSize: `${fontScale}rem` }}>'
);

// Use DOMPurify for business address
content = content.replace(
  '<p className="text-sm text-gray-600 whitespace-pre-line mt-2">{businessProfile.address || \'Your Company Address\'}</p>',
  '<p className="text-sm text-gray-600 whitespace-pre-line mt-2" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(businessProfile.address || \'Your Company Address\') }}></p>'
);

// Use DOMPurify for Terms & Conditions
content = content.replace(
  "{invoice.terms || businessProfile.printFooter || '1. Goods once sold will not be taken back.\\\\n2. Interest @ 18% p.a. will be charged if payment is delayed.'}",
  "<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((invoice.terms || businessProfile.printFooter || '1. Goods once sold will not be taken back.\\n2. Interest @ 18% p.a. will be charged if payment is delayed.').replace(/\\n/g, '<br/>')) }} />"
);

fs.writeFileSync('src/components/gst/InvoicePreview.tsx', content);
