const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /handleFeatureAccess\("([^"]+)", "YEARLY", \(\) => \{\}\)/g;
code = code.replace(regex, 'handleFeatureAccess("$1", "YEARLY", () => toast({ title: "Feature Coming Soon", description: "$1 will be available in the next update." }))');

fs.writeFileSync('src/App.tsx', code);
console.log('Done!');
