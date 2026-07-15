const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The first Data & Backups card starts around index 185772.
// Let's find the exact string to start deleting.
const secondDataBackupsIdx = code.indexOf('{/* Data & Backups Card */}', 190000);
console.log("secondDataBackupsIdx:", secondDataBackupsIdx);

if (secondDataBackupsIdx !== -1) {
    // Where does this duplicate block end?
    // It ends after the "About RupeeLedger" card.
    const aboutCardStart = code.indexOf('{/* About RupeeLedger Card */}', secondDataBackupsIdx);
    const aboutCardEnd = code.indexOf('</Card>', aboutCardStart) + 7; // Length of </Card>
    
    console.log("aboutCardStart:", aboutCardStart);
    console.log("aboutCardEnd:", aboutCardEnd);
    
    if (aboutCardStart !== -1 && aboutCardEnd !== -1) {
        // Delete the duplicate block
        code = code.substring(0, secondDataBackupsIdx) + code.substring(aboutCardEnd);
        console.log("Deleted duplicated block.");
    }
}

// Now let's remove the "API Access" feature, or the entire "Enterprise Integrations & API" card.
// Let's just remove the entire "Enterprise Integrations & API" card because the whole card only has WhatsApp, API, and Branding.
// Actually, I can just remove the specific "API Access" div.
const apiAccessTitleIdx = code.indexOf('<h4 className="font-bold text-slate-800">API Access</h4>');
if (apiAccessTitleIdx !== -1) {
    // Find the starting <div> of this block
    const divStart = code.lastIndexOf('<div className="border rounded-lg p-4 flex flex-col justify-between h-full bg-slate-50/50">', apiAccessTitleIdx);
    // Find the end of this block
    const buttonEndIdx = code.indexOf('</Button>', apiAccessTitleIdx);
    const divEnd = code.indexOf('</div>', buttonEndIdx) + 6;
    
    if (divStart !== -1 && divEnd !== -1) {
        code = code.substring(0, divStart) + code.substring(divEnd);
        console.log("Deleted API Access block.");
    }
}

fs.writeFileSync('src/App.tsx', code);
