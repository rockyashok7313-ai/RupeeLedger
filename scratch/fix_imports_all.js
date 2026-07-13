const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const routesDir = path.join(rootDir, 'backend', 'routes');
const srcDir = path.join(rootDir, 'src');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walkDir(routesDir);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('@/')) {
    const relativeToSrc = path.relative(path.dirname(file), srcDir).replace(/\\/g, '/');
    content = content.replace(/@\//g, `${relativeToSrc}/`);
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
