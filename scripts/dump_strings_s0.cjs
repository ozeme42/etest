const fs = require('fs');

const s0 = fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\script0.js', 'utf8');

// Extract the function _88b490W and _88b490K
const matchW = s0.match(/function _88b490W\(\)\{[\s\S]*?return _88b490W\(\)\}/);
const matchK = s0.match(/function _88b490K\([\s\S]*?return r\}/);

eval(matchW[0]);
eval(matchK[0]);

// Run the shifter
const matchShift = s0.match(/\(function\(t,n\)\{[\s\S]*?\}\)\(_88b490W,544130\);/);
eval(matchShift[0]);

const strings = [];
for (let i = 250; i < 380; i++) {
  try {
    const val = _88b490K(i);
    strings.push(`${i}: ${val}`);
  } catch(e) {}
}

console.log(strings.join('\n'));
