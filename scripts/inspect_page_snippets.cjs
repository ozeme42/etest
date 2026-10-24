const fs = require('fs');
const searchJsPath = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\sosyal_search.js';
const content = fs.readFileSync(searchJsPath, 'binary');
const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
let match;
const pages = [];
while ((match = regex.exec(content)) !== null) {
  pages.push(Buffer.from(match[1], 'latin1').toString('utf8'));
}

for (let p of [11, 21, 31, 41, 42, 43, 44, 45, 46]) {
  console.log(`\n=== PAGE ${p + 1} ===`);
  console.log(pages[p].slice(0, 300));
}
