const fs = require('fs');
let content = fs.readFileSync('src/components/gst/InvoicePreview.tsx', 'utf8');

const shareLogic = `
  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!invoice) return;
    const text = \`Hello \${invoice.clientName},\\n\\nPlease find your invoice \${invoice.invoiceNumber || invoice.id} attached.\\nAmount Due: \${formatCurrency(invoice.total, invoice.currency || 'INR')}\\nDue Date: \${new Date(invoice.dueDate).toLocaleDateString()}\\n\\nThank you for your business!\\n- \${businessProfile.companyName}\`;
    const url = \`https://wa.me/?text=\${encodeURIComponent(text)}\`;
    window.open(url, '_blank');
  };

  const handleEmailShare = () => {
    if (!invoice) return;
    const subject = \`Invoice \${invoice.invoiceNumber || invoice.id} from \${businessProfile.companyName}\`;
    const body = \`Hello \${invoice.clientName},\\n\\nPlease find your invoice \${invoice.invoiceNumber || invoice.id} attached.\\nAmount Due: \${formatCurrency(invoice.total, invoice.currency || 'INR')}\\nDue Date: \${new Date(invoice.dueDate).toLocaleDateString()}\\n\\nThank you for your business!\\n\\nRegards,\\n\${businessProfile.companyName}\`;
    const url = \`mailto:?subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(body)}\`;
    window.location.href = url;
  };
`;

content = content.replace(
  "  const handlePrint = () => {\n    window.print();\n  };",
  shareLogic
);

const buttons = `
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button onClick={handleWhatsAppShare} variant="outline" className="flex-1 sm:flex-none border-green-200 text-green-700 hover:bg-green-50" disabled={!invoice}>
            WhatsApp
          </Button>
          <Button onClick={handleEmailShare} variant="outline" className="flex-1 sm:flex-none" disabled={!invoice}>
            Email
          </Button>
          <Button onClick={handlePrint} variant="default" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white" disabled={!invoice}>
            <Printer className="h-4 w-4 mr-2" /> Print / PDF
          </Button>
        </div>
`;

content = content.replace(
  '<Button onClick={handlePrint} variant="default" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white" disabled={!invoice}>\n          <Printer className="h-4 w-4 mr-2" /> Print / PDF\n        </Button>',
  buttons
);

fs.writeFileSync('src/components/gst/InvoicePreview.tsx', content);
