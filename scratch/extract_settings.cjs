const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf8');
const settingsStartStr = "activeTab === 'settings' && (";
const settingsStart = code.indexOf(settingsStartStr);

console.log("settingsStart:", settingsStart);

// We want to write the whole settings block to a scratch file so I can inspect it easily.
// I will just write from settingsStart to settingsStart + 40000 characters.
const snippet = code.substring(settingsStart, settingsStart + 40000);
fs.writeFileSync('scratch/settings_snippet.txt', snippet);
console.log("Snippet written to scratch/settings_snippet.txt");
