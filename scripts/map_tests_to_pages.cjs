const fs = require('fs');

const searchJsPath = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\sosyal_search.js';
const content = fs.readFileSync(searchJsPath, 'binary');

const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
let match;
const pages = [];
while ((match = regex.exec(content)) !== null) {
  pages.push(Buffer.from(match[1], 'latin1').toString('utf8'));
}

// Find occurrences of each GELİŞTİRİYORUM and UYGULUYORUM across pages 8-260
const tests = [];
for (let i = 0; i < 260; i++) {
  const pText = pages[i];
  const pageNum = i + 1;
  const m = pText.match(/(GELİŞTİRİYORUM\s*-\s*\d+|UYGULUYORUM\s*-\s*\d+)/gi);
  if (m) {
    m.forEach(tName => {
      tests.push({ page: pageNum, name: tName.replace(/\s+/g, ' ').toUpperCase() });
    });
  }
}

console.log('Tests found in book pages:', tests.length);
tests.forEach(t => console.log(`Page ${t.page}: ${t.name}`));
