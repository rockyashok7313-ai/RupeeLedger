const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'backend', 'routes');
const nextResponsePath = path.join(__dirname, 'backend', 'next-response.ts');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes("from 'next/server'") || content.includes('from "next/server"')) {
        let relPath = path.relative(path.dirname(fullPath), nextResponsePath);
        relPath = relPath.replace(/\\/g, '/').replace('.ts', '');
        if (!relPath.startsWith('.')) relPath = './' + relPath;
        
        content = content.replace(/from ['"]next\/server['"]/g, `from '${relPath}'`);
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(routesDir);
