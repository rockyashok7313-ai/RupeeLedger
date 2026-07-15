const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf8');
const idx1 = 185772; // First "Data & Backups Card"
const idx2 = 198743; // Second "Data & Backups Card"

let matchLength = 0;
while (code[idx1 + matchLength] === code[idx2 + matchLength] && (idx2 + matchLength) < code.length) {
    matchLength++;
}

console.log(`Matched ${matchLength} characters!`);
console.log(`First block ends at: ${idx1 + matchLength}`);
console.log(`Second block ends at: ${idx2 + matchLength}`);

// Let's print the last 100 characters of the matched block
console.log("End of match:\\n", code.substring(idx1 + matchLength - 100, idx1 + matchLength));
console.log("Next 100 chars in block 1:\\n", code.substring(idx1 + matchLength, idx1 + matchLength + 100));
console.log("Next 100 chars in block 2:\\n", code.substring(idx2 + matchLength, idx2 + matchLength + 100));
