const fs = require('fs');

const searchJsPath = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\sosyal_search.js';
const content = fs.readFileSync(searchJsPath, 'binary');

const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
let match;
const pages = [];
while ((match = regex.exec(content)) !== null) {
  pages.push(Buffer.from(match[1], 'latin1').toString('utf8'));
}

for (let p = 260; p < 272; p++) {
  const pageText = pages[p];
  console.log(`\n================== PAGE ${p + 1} ==================`);
  // Look for "Öğrenme Alanı" or headings
  const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean);
  const headings = pageText.match(/(\d+\.\s*Öğrenme Alanı[^\n]*|GELİŞTİRİYORUM\s*-\s*\d+|UYGULUYORUM\s*-\s*\d+|Anlıyorum\s*\d+|Pekiştiriyorum\s*\d+)/gi);
  console.log('Headings found:', headings);
}
