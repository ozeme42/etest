const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\reader_scripts';
const c = fs.readFileSync(path.join(dir, '84be32eb740da34ec899.js'), 'utf8');

const idx = c.indexOf('function o0(');
console.log('Index of function o0:', idx);
if (idx !== -1) {
  console.log(c.slice(idx, idx + 1000));
} else {
  // search for o0 =
  const idx2 = c.indexOf('o0(');
  console.log('Index of o0(:', idx2);
  console.log(c.slice(Math.max(0, idx2 - 500), idx2 + 500));
}
