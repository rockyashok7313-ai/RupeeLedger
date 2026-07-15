const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const secondDataBackupsIdx = code.indexOf('{/* Data & Backups Card */}', 190000);
if (secondDataBackupsIdx !== -1) {
    const aboutCardStart = code.indexOf('{/* About Card */}', secondDataBackupsIdx);
    const aboutCardEnd = code.indexOf('</Card>', aboutCardStart) + 7;
    
    if (aboutCardStart !== -1 && aboutCardEnd !== -1) {
        code = code.substring(0, secondDataBackupsIdx) + code.substring(aboutCardEnd);
        console.log("Deleted duplicated block.");
    }
}
fs.writeFileSync('src/App.tsx', code);
