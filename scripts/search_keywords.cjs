const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\reader_scripts';
const files = fs.readdirSync(dir);

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  // Check for interesting keywords
  const keywords = ['sayfa', 'fasikul', 'kapak', 'xhr', 'XMLHttpRequest', 'fetch', 'canvas', 'createObjectURL', 'WebSocket', 'pdf', 'image/'];
  const found = keywords.filter(k => content.toLowerCase().includes(k.toLowerCase()));
  if (found.length > 0) {
    console.log(`File: ${file} (size: ${content.length}) matched: ${found.join(', ')}`);
  }
}
