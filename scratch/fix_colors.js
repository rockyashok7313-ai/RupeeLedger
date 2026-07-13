const fs = require('fs');
let code = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

code = code.replace(/bg-\\[hsl\\(var\\(--primary\\)\\)\\]/g, 'bg-primary');
code = code.replace(/text-\\[hsl\\(var\\(--primary\\)\\)\\]/g, 'text-primary');
code = code.replace(/border-\\[hsl\\(var\\(--primary\\)\\)\\]/g, 'border-primary');
code = code.replace(/hover:bg-\\[hsl\\(var\\(--primary\\) \\/ 0\\.8\\)\\]/g, 'hover:bg-primary/80');

fs.writeFileSync('src/components/LandingPage.tsx', code);
console.log('Colors fixed');
