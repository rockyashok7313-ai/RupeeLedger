const fs = require('fs');

const appTsxPath = 'src/App.tsx';
let content = fs.readFileSync(appTsxPath, 'utf8');

// Patch fetchGeneratedKeys
const target1 = `const res = await fetch(\`/api/keys?userId=\${userId}\`);`;
const replacement1 = `const token = await auth.currentUser?.getIdToken();
      const res = await fetch(\`/api/keys?userId=\${userId}\`, {
        headers: token ? { 'Authorization': \`Bearer \${token}\` } : {}
      });`;
content = content.replace(target1, replacement1);

// Patch handleGenerateLicenseKey
const target2 = `const res = await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: newKey,
            durationDays,
            createdBy: user.id
          })
        });`;
const replacement2 = `const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/keys', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
          },
          body: JSON.stringify({
            key: newKey,
            durationDays,
            createdBy: user.id
          })
        });`;
content = content.replace(target2, replacement2);

fs.writeFileSync(appTsxPath, content);
console.log('App.tsx patched successfully');
