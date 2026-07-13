const fs = require('fs');
let code = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

code = code.split('#009b69').join('hsl(var(--primary))');
code = code.split('#008257').join('hsl(var(--primary) / 0.8)');
code = code.split('bg-[#e6f5f0]').join('bg-primary/10');

fs.writeFileSync('src/components/LandingPage.tsx', code);
console.log('Colors replaced');
