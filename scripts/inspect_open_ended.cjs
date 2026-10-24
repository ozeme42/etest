const fs = require('fs');

const raw = fs.readFileSync('C:/Users/mahmut/.gemini/antigravity/brain/602e7fcd-8fa0-4825-8afe-e3d07dddec13/scratch/cilt3_search.js', 'latin1');

function parsePages(content) {
  const start = content.indexOf('var textForPages = [');
  const end = content.lastIndexOf('];');
  let pages = [];
  let inStr = false;
  let escaped = false;
  let cur = '';
  let i = start + 'var textForPages = ['.length;
  while (i <= end) {
    const c = content[i];
    if (escaped) {
      if (c === 'n') cur += '\n';
      else if (c === 't') cur += '\t';
      else if (c === 'r') cur += '\r';
      else cur += c;
      escaped = false; i++; continue;
    }
    if (c === '\\') { escaped = true; i++; continue; }
    if (c === '"') {
      if (inStr) { pages.push(cur); cur = ''; inStr = false; }
      else { inStr = true; }
      i++; continue;
    }
    if (inStr) cur += c;
    i++;
  }
  return pages;
}

const rawPages = parsePages(raw);
function toUtf8(str) {
  try { return Buffer.from(str, 'latin1').toString('utf8'); } catch(e) { return str; }
}

const fasikuls = [
  { no: 1, name: '1. Fasikül', answerPageIndices: [137, 138, 139, 140, 141] }, // pages 138-142
  { no: 2, name: '2. Fasikül', answerPageIndices: [236, 237, 238] },             // pages 237-239
  { no: 3, name: '3. Fasikül', answerPageIndices: [332, 333, 334] },             // pages 333-335
  { no: 4, name: '4. Fasikül', answerPageIndices: [429, 430] },                  // pages 430-431
  { no: 5, name: '5. Fasikül', answerPageIndices: [494, 495] },                  // pages 495-496
  { no: 6, name: '6. Fasikül', answerPageIndices: [527] }                        // page 528
];

fasikuls.forEach(fas => {
  console.log(`\n========================================================================`);
  console.log(`FASİKÜL ${fas.no}`);
  fas.answerPageIndices.forEach(idx => {
    console.log(`--- Page ${idx + 1} ---`);
    console.log(toUtf8(rawPages[idx]).substring(0, 800));
  });
});
