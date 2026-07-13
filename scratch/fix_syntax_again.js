const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The issue is that `{/* Integrations & API Card */}` was inserted BEFORE the `)}` that closed the `isOwner` check.
// So we need to insert `)}` right before `{/* Integrations & API Card */}`
// and remove the rogue `)}` right before `{/* Data & Backups Card */}`

code = code.replace(
  '</Card>\n\n{/* Integrations & API Card */}',
  '</Card>\n                  )}\n\n                  {/* Integrations & API Card */}'
);

code = code.replace(
  '                  )}\n\n                  {/* Data & Backups Card */}',
  '                  {/* Data & Backups Card */}'
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed syntax!');
