const fs = require('fs');

function toCleanUtf8(str) {
  try {
    return Buffer.from(str, 'latin1').toString('utf8');
  } catch(e) {
    return str;
  }
}

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

// Let's parse each fasikül's open ended pages
// Fasikül 1: pages 138-142 (indices 137-141)
// Fasikül 2: pages 237-239 (indices 236-238)
// Fasikül 3: pages 333-335 (indices 332-334)
// Fasikül 4: pages 430-431 (indices 429-430)
// Fasikül 5: pages 495-496 (indices 494-495)
// Fasikül 6: page 528 (index 527)

const fasikuls = [
  { no: 1, name: '1. Fasikül', indices: [137, 138, 139, 140, 141] },
  { no: 2, name: '2. Fasikül', indices: [236, 237, 238] },
  { no: 3, name: '3. Fasikül', indices: [332, 333, 334] },
  { no: 4, name: '4. Fasikül', indices: [429, 430] },
  { no: 5, name: '5. Fasikül', indices: [494, 495] },
  { no: 6, name: '6. Fasikül', indices: [527] }
];

fasikuls.forEach(fas => {
  console.log(`\n======================================================`);
  console.log(`Fasikül ${fas.no}`);
  let combined = '';
  fas.indices.forEach(idx => {
    combined += '\n' + toCleanUtf8(rawPages[idx]);
  });
  
  // Find lines that have exercise numbers or section headers
  const lines = combined.split('\n').map(l => l.trim()).filter(Boolean);
  console.log(`Total non-empty lines: ${lines.length}`);
  
  // Print lines that start with numbers or have section keywords
  lines.slice(0, 30).forEach(l => {
    if(l.length < 100) console.log('  ' + l);
  });
});
