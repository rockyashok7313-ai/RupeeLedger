const fs = require('fs');
let code = fs.readFileSync('src/components/ReportPrint.tsx', 'utf8');

const targetClass = 'className="pdf-page scroll-mt-20 relative p-8 bg-white text-black font-sans w-[210mm] shadow-lg border border-gray-300 break-after-page flex flex-col"';
const replacementClass = 'className="pdf-page scroll-mt-20 relative p-8 bg-white text-black font-sans w-[210mm] h-[297mm] shadow-lg border border-gray-300 break-after-page flex flex-col"';

if (code.includes(targetClass)) {
    code = code.replace(targetClass, replacementClass);
    console.log("Added h-[297mm] to pdf-page");
} else {
    console.log("Could not find target class to add height");
}

fs.writeFileSync('src/components/ReportPrint.tsx', code);
