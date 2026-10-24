const fs = require('fs');

const searchJsPath = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\sosyal_search.js';
const content = fs.readFileSync(searchJsPath, 'binary');

const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
let match;
const pages = [];
while ((match = regex.exec(content)) !== null) {
  pages.push(Buffer.from(match[1], 'latin1').toString('utf8'));
}

for (let i = 0; i < 50; i++) {
  const pText = pages[i];
  if (pText.toLowerCase().includes('geliştir') || pText.toLowerCase().includes('uygula') || pText.toLowerCase().includes('uygulu')) {
    console.log(`Page ${i + 1} has match:`);
    const lines = pText.split('\n').filter(l => l.toLowerCase().includes('geliş') || l.toLowerCase().includes('uygul'));
    console.log(lines.slice(0, 3));
  }
}
