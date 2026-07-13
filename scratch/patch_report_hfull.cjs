const fs = require('fs');
let code = fs.readFileSync('src/components/ReportPrint.tsx', 'utf8');

code = code.replace('<div className="w-full h-full flex flex-col bg-white">', '<div className="w-full flex flex-col bg-white">');

fs.writeFileSync('src/components/ReportPrint.tsx', code);
console.log("Removed h-full from ReportPrint.tsx");
