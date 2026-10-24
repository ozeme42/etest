const fs = require('fs');

const searchJsPath = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\sosyal_search.js';
const content = fs.readFileSync(searchJsPath, 'binary');

const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
let match;
const pages = [];
while ((match = regex.exec(content)) !== null) {
  pages.push(Buffer.from(match[1], 'latin1').toString('utf8'));
}

console.log('Total pages:', pages.length);

// Let's check all sections found across the whole book
const titles = new Set();
for (let i = 0; i < 260; i++) {
  const p = pages[i];
  const m = p.match(/(Yazılıya Hazırlık|Beceri Temelli|Deneme|Tarama|Sınav|Geliştiriyorum|Uyguluyorum|Pekiştiriyorum|Anlıyorum)[^\n\d]*\d*/gi);
  if (m) m.forEach(x => titles.add(x.trim().replace(/\s+/g, ' ')));
}
console.log('Book sections in main pages (count: ' + titles.size + '):');
console.log(Array.from(titles));
