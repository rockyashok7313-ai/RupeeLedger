const fs = require('fs');
let code = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

code = code.split('bg-[hsl(var(--primary))]').join('bg-primary');
code = code.split('text-[hsl(var(--primary))]').join('text-primary');
code = code.split('border-[hsl(var(--primary))]').join('border-primary');
code = code.split('hover:bg-[hsl(var(--primary) / 0.8)]').join('hover:bg-primary/80');

fs.writeFileSync('src/components/LandingPage.tsx', code);
console.log('Colors finally fixed');
