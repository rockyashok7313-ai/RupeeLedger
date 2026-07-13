const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcLibDir = path.join(rootDir, 'src', 'lib');
const srcAiDir = path.join(rootDir, 'src', 'ai');
const srcDir = path.join(rootDir, 'src');

function walkDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = [...walkDir(srcLibDir), ...walkDir(srcAiDir)];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('@/')) {
    const relativeToSrc = path.relative(path.dirname(file), srcDir).replace(/\\/g, '/');
    let replacement = relativeToSrc;
    if (replacement === '') {
        replacement = '.';
    }
    content = content.replace(/@\//g, `${replacement}/`);
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
