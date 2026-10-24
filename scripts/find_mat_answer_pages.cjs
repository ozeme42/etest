const fs = require('fs');

const raw = fs.readFileSync('C:/Users/mahmut/.gemini/antigravity/brain/602e7fcd-8fa0-4825-8afe-e3d07dddec13/scratch/cilt3_mat_search.js', 'latin1');

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
function toCleanUtf8(str) {
  try {
    return Buffer.from(str, 'latin1').toString('utf8');
  } catch(e) {
    return str;
  }
}

// Find every page that has multiple choice answer patterns or answer key headers
const results = [];
rawPages.forEach((p, idx) => {
  const clean = toCleanUtf8(p);
  const mcMatches = (clean.match(/\b\d+\s*\.\s*[A-D]\b/g) || []).length;
  const hasCevap = /Cevap\s*Anahtar/i.test(clean);
  const hasUygula = /Şimdi\s*Uygula/i.test(clean);
  
  if (mcMatches >= 3 || hasCevap || hasUygula) {
    results.push({ page: idx + 1, mcMatches, hasCevap, hasUygula, preview: clean.substring(0, 100).replace(/\s+/g, ' ') });
  }
});

console.log('Total candidate answer pages:', results.length);
results.forEach(r => {
  console.log(`Page ${r.page}: MC=${r.mcMatches}, Cevap=${r.hasCevap}, Uygula=${r.hasUygula} | ${r.preview}`);
});
