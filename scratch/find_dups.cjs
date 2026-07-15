const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = '{/* Data & Backups Card */}';
let indices = [];
let idx = code.indexOf(target1);
while (idx !== -1) {
    indices.push(idx);
    idx = code.indexOf(target1, idx + 1);
}

console.log("Found target 1 at indices: ", indices);

const target2 = 'Enterprise Integrations & API';
let indices2 = [];
idx = code.indexOf(target2);
while (idx !== -1) {
    indices2.push(idx);
    idx = code.indexOf(target2, idx + 1);
}

console.log("Found target 2 at indices: ", indices2);
