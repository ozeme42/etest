const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\reader_scripts';
const files = fs.readdirSync(dir);

for (const file of files) {
  const c = fs.readFileSync(path.join(dir, file), 'utf8');
  const m = c.match(/ara|search|cevap|anahtar|metin|sozcuk/gi);
  if (m && m.length > 5) {
    console.log(`${file}: matched ${m.length} occurrences`);
  }
}
