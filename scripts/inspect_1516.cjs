const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\reader_scripts';
const c = fs.readFileSync(path.join(dir, '1516a424926e4bbf4508.js'), 'utf8');

console.log('Length:', c.length);
// print first 2000 chars
console.log(c.slice(0, 2500));
