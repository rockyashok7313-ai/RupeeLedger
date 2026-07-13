const fs = require('fs');

const appTsxPath = 'src/App.tsx';
let content = fs.readFileSync(appTsxPath, 'utf8');

// Patch handleActivateKey
const target3 = `const res = await fetch('/api/keys', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: keyStr,
            userId: user.id
          })
        });`;
const replacement3 = `const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/keys', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
          },
          body: JSON.stringify({
            key: keyStr,
            userId: user.id
          })
        });`;

content = content.replace(target3, replacement3);

fs.writeFileSync(appTsxPath, content);
console.log('App.tsx patched activate key successfully');
