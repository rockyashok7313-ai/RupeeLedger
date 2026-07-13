const fs = require('fs');
let content = fs.readFileSync('src/components/gst/GSTReturns.tsx', 'utf8');

const imports = "import { generateGSTR1JSON } from '@/lib/gstExport';\nimport { BusinessProfile } from '@/lib/types';";
content = content.replace("import { Invoice, Expense } from '@/lib/types';", imports + "\nimport { Invoice, Expense } from '@/lib/types';");

// Add businessProfile to Props
content = content.replace(
  "interface Props {\n  invoices?: Invoice[];\n  expenses?: Expense[];\n}",
  "interface Props {\n  invoices?: Invoice[];\n  expenses?: Expense[];\n  businessProfile: BusinessProfile;\n}"
);
content = content.replace(
  "export function GSTReturns({ invoices = [], expenses = [] }: Props) {",
  "export function GSTReturns({ invoices = [], expenses = [], businessProfile }: Props) {"
);

const downloadLogic = `
  const handleDownloadJSON = (type: string) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let data = {};
    if (type === 'GSTR-1') {
      data = generateGSTR1JSON(invoices, businessProfile, year, month);
    } else {
      data = {
        gstin: businessProfile.gstin,
        ret_period: \`\${String(month).padStart(2, '0')}\${year}\`,
        sup_details: {
          osup_det: { txval: stats.sales.taxableAmount, iamt: stats.sales.igst, camt: stats.sales.cgst, samt: stats.sales.sgst }
        },
        itc_elg: {
          itc_avl: { txval: 0, iamt: stats.itc.igst, camt: stats.itc.cgst, samt: stats.itc.sgst }
        }
      };
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`\${type}_\${selectedMonth}.json\`;
    a.click();
    URL.revokeObjectURL(url);
  };
`;

content = content.replace(
  "  const handleDownloadExcel = (type: string) => {\n    alert(`Downloading ${type} Excel format is not implemented in this demo. Normally, this would generate a CSV matching the offline utility format.`);\n  };",
  downloadLogic
);

// Replace button calls
content = content.replace(
  "onClick={() => handleDownloadExcel('GSTR-1')}",
  "onClick={() => handleDownloadJSON('GSTR-1')}"
);
content = content.replace(
  "Download GSTR-1 Excel",
  "Download GSTR-1 JSON"
);

content = content.replace(
  "onClick={() => handleDownloadExcel('GSTR-3B')}",
  "onClick={() => handleDownloadJSON('GSTR-3B')}"
);
content = content.replace(
  "Download GSTR-3B Excel",
  "Download GSTR-3B JSON"
);

fs.writeFileSync('src/components/gst/GSTReturns.tsx', content);
