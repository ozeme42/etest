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
  { no: 1, name: '1. Fasikül', answerPageIndices: [137, 138, 139, 140, 141] },
  { no: 2, name: '2. Fasikül', answerPageIndices: [236, 237, 238] },
  { no: 3, name: '3. Fasikül', answerPageIndices: [332, 333, 334] },
  { no: 4, name: '4. Fasikül', answerPageIndices: [429, 430] },
  { no: 5, name: '5. Fasikül', answerPageIndices: [494, 495] },
  { no: 6, name: '6. Fasikül', answerPageIndices: [527] }
];

const openEndedTests = [];

fasikuls.forEach(fas => {
  const allText = fas.answerPageIndices.map(idx => toUtf8(rawPages[idx])).join('\n\n---PAGE---\n\n');
  
  // Save each fasikül open ended answer text to inspect
  fs.writeFileSync(`C:/Users/mahmut/.gemini/antigravity/brain/602e7fcd-8fa0-4825-8afe-e3d07dddec13/scratch/fas_${fas.no}_open_ended.txt`, allText, 'utf8');
  console.log(`Fasikül ${fas.no} text length:`, allText.length);
});
