const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\reader_scripts';
const c = fs.readFileSync(path.join(dir, '1516a424926e4bbf4508.js'), 'utf8');

// The bottom has _4ac344K and _4ac344W
const kIdx = c.indexOf('function _4ac344K(');
eval(c.slice(kIdx)); // defines both _4ac344K and _4ac344W!

// Now run the shifter at top
const shiftEnd = c.indexOf(',(()=>{"use strict";');
eval(c.slice(0, shiftEnd));

const targetIndices = [555, 561, 534, 522, 519, 598, 535, 480, 473, 564, 599, 523, 516];
targetIndices.forEach(idx => {
  try {
    console.log(`${idx}: "${_4ac344K(idx)}"`);
  } catch(e) {
    console.log(`${idx}: error: ${e.message}`);
  }
});
