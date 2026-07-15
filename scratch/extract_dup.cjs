const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');

const t1 = code.indexOf('{/* Data & Backups Card */}');
const t2 = code.indexOf('{/* Data & Backups Card */}', t1 + 1);

const t3 = code.indexOf('{/* About RupeeLedger Card */}', t2);
const t4 = code.indexOf('</CardContent>', t3);
const t5 = code.indexOf('</Card>', t4);

const snippet = code.substring(t1, t5 + 200);
fs.writeFileSync('scratch/dup_snippet.tsx', snippet);
console.log("Snippet written to scratch/dup_snippet.tsx");
