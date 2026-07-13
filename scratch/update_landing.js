const fs = require('fs');
let code = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

code = code.replace(/bg-\\[#009b69\\]/g, 'bg-primary');
code = code.replace(/text-\\[#009b69\\]/g, 'text-primary');
code = code.replace(/border-\\[#009b69\\]/g, 'border-primary');
code = code.replace(/bg-\\[#e6f5f0\\]/g, 'bg-primary/10');
code = code.replace(/hover:bg-\\[#008257\\]/g, 'hover:bg-primary/90');

code = code.replace(
  '<h3 className="text-xl font-bold text-[#1a2b3b] mb-4">Business</h3>',
  '<h3 className="text-xl font-bold text-[#1a2b3b] mb-4">Monthly</h3>'
);

code = code.replace(
  '<span className="text-4xl font-extrabold text-[#1a2b3b]">₹499</span>',
  '<span className="text-4xl font-extrabold text-[#1a2b3b]">₹199</span>'
);

code = code.replace(
  '<h3 className="text-xl font-bold text-[#1a2b3b] mb-4">Enterprise</h3>',
  '<h3 className="text-xl font-bold text-[#1a2b3b] mb-4">Yearly</h3>'
);

code = code.replace(
  '<span className="text-4xl font-extrabold text-[#1a2b3b]">₹1,499</span>\\n                <span className="text-slate-500">/month</span>',
  '<span className="text-4xl font-extrabold text-[#1a2b3b]">₹1,999</span>\\n                <span className="text-slate-500">/year</span>'
);

fs.writeFileSync('src/components/LandingPage.tsx', code);
console.log('Update complete');
