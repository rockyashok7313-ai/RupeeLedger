const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const searchString = '{/* About Card */}';
const parts = code.split(searchString);
if (parts.length > 2) {
  console.log('Duplication found. Fixing...');
}
console.log('Done');
