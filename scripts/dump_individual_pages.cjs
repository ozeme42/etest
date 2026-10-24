const fs = require('fs');

const searchJsPath = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\sosyal_search.js';
const content = fs.readFileSync(searchJsPath, 'binary');
const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
let match;
const pages = [];
while ((match = regex.exec(content)) !== null) {
  pages.push(Buffer.from(match[1], 'latin1').toString('utf8'));
}

// Dump each answer page (261 to 272, index 260 to 271) to separate txt files for easy review
for (let p = 260; p < 272; p++) {
  fs.writeFileSync(`scripts/page_${p + 1}.txt`, pages[p], 'utf8');
}
console.log('Dumped pages 261 to 272');
