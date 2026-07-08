const fs = require('fs');
const path = require('path');

const filePath = path.resolve('C:/Users/AK/Downloads/KUNJU/PETTY/src/components/ReportPrint.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: The white cover overlap logic
content = content.replace(
  'pdf.rect(0, 0, pageWidth, margin + headerHeight - 5, "F");',
  'pdf.rect(0, 0, pageWidth, margin + headerHeight, "F");'
);

// Fix 2: Add page numbers to single-page
content = content.replace(
  "pdf.addImage(imgData, 'PNG', xOffset, yOffset, printWidth, printHeight);",
  `pdf.addImage(imgData, 'PNG', xOffset, yOffset, printWidth, printHeight);
        
        // Add Page Number for single page
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(\`Page 1\`, pageWidth / 2, pageHeight - 5, { align: "center" });`
);

// Fix 3: Add page numbers to multi-page
content = content.replace(
  "canvasYOffset += sliceHeight;",
  `// Add Page Number for multi page
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(100, 116, 139);
          pdf.text(\`Page \${pageNumber}\`, pageWidth / 2, pageHeight - 5, { align: "center" });
          
          canvasYOffset += sliceHeight;`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Pagination fixed!");
