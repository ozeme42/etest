const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\reader_scripts';

function inspect(file) {
  console.log(`\n================= ${file} =================`);
  const c = fs.readFileSync(path.join(dir, file), 'utf8');
  // find occurrences of sayfa or url
  const lines = c.split(';').filter(l => l.includes('sayfa') || l.includes('http') || l.includes('fetch') || l.includes('/oku/'));
  console.log(lines.slice(0, 5).join('\n;'));
}

inspect('7b36b6d45998f018dd1e.js');
inspect('84be32eb740da34ec899.js');
inspect('187b92d5f66a850d2b24.js');
