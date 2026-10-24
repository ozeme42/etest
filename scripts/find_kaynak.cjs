const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\reader_scripts';
const files = fs.readdirSync(dir);

for (const file of files) {
  const c = fs.readFileSync(path.join(dir, file), 'utf8');
  if (c.includes('.al=') || c.includes('al(u,e') || c.includes('al(t,e') || c.includes('al(') || c.includes('kaynak')) {
    const idx = c.indexOf('.al=') !== -1 ? c.indexOf('.al=') : (c.indexOf('al(') !== -1 ? c.indexOf('al(') : c.indexOf('kaynak'));
    console.log(`Found in ${file} at ${idx}:`, c.slice(Math.max(0, idx - 100), idx + 300));
  }
}
