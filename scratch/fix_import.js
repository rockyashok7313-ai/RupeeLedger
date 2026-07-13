const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('UserPlus,')) {
  code = code.replace(/import {([^}]*)} from ["']lucide-react["'];/, (match, p1) => {
    return `import {${p1}, UserPlus} from 'lucide-react';`;
  });
}

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed import!');
