const fs = require('fs');

const searchJsPath = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\sosyal_search.js';
const content = fs.readFileSync(searchJsPath, 'binary');

const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
let match;
const pages = [];
while ((match = regex.exec(content)) !== null) {
  const decoded = Buffer.from(match[1], 'latin1').toString('utf8');
  pages.push(decoded);
}

console.log('Total pages decoded:', pages.length);

// Let's examine table of contents (sayfa 2, 3, 4, 5, 6)
for (let i = 0; i < 8; i++) {
  console.log(`--- Page ${i + 1} ---`);
  console.log(pages[i].slice(0, 500));
}

// Combine answer pages (261 to 272, index 260 to 271)
const answerText = pages.slice(260, 272).join('\n=== PAGE ===\n');
fs.writeFileSync('scripts/sosyal_answers_full.txt', answerText, 'utf8');
console.log('Written sosyal_answers_full.txt length:', answerText.length);
