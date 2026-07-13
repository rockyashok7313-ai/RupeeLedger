const fs = require('fs');

let code = fs.readFileSync('src/components/ReportPrint.tsx', 'utf8');

const regex1 = /const PAGE_1_MAX = 25;/g;
const replacement1 = `const PAGE_1_MAX = 16;`;

const regex2 = /const PAGE_OTHER_MAX = 35;/g;
const replacement2 = `const PAGE_OTHER_MAX = 16;`;

if (regex1.test(code)) {
    code = code.replace(regex1, replacement1);
    console.log("Replaced PAGE_1_MAX");
} else {
    console.log("Could not find PAGE_1_MAX");
}

if (regex2.test(code)) {
    code = code.replace(regex2, replacement2);
    console.log("Replaced PAGE_OTHER_MAX");
} else {
    console.log("Could not find PAGE_OTHER_MAX");
}

fs.writeFileSync('src/components/ReportPrint.tsx', code);
