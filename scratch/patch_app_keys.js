const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const postSearch = `        const res = await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },`;
const postReplace = `        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': \`Bearer \${token}\` } : {}) },`;

const putSearch = `        const res = await fetch('/api/keys', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },`;
const putReplace = `        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/keys', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': \`Bearer \${token}\` } : {}) },`;

code = code.replace(postSearch, postReplace).replace(postSearch.replace(/\n/g, '\r\n'), postReplace.replace(/\n/g, '\r\n'));
code = code.replace(putSearch, putReplace).replace(putSearch.replace(/\n/g, '\r\n'), putReplace.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx patched successfully');
