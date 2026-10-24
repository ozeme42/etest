const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\reader_scripts';
const c = fs.readFileSync(path.join(dir, '1516a424926e4bbf4508.js'), 'utf8');

const matchW = c.match(/function _4ac344W\(\)\{[\s\S]*?return _4ac344W\(\)\}/);
const matchK = c.match(/function _4ac344K\([\s\S]*?return r\}/);

eval(matchW[0]);
eval(matchK[0]);

const matchShift = c.match(/\(function\(i,D\)\{[\s\S]*?\}\)\(_4ac344W,730211\);/);
eval(matchShift[0]);

const targetIndices = [555, 561, 534, 522, 519, 598, 535, 480, 473, 564, 599, 523, 516];
targetIndices.forEach(idx => {
  try {
    console.log(`${idx}: "${_4ac344K(idx)}"`);
  } catch(e) {
    console.log(`${idx}: error`);
  }
});
