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
console.log('Total pages in Matematik CİLT-3:', rawPages.length);

function toCleanUtf8(str) {
  try {
    return Buffer.from(str, 'latin1').toString('utf8');
  } catch(e) {
    return str;
  }
}

// Find contents pages (İçindekiler / FASİKÜL) and answer key pages
rawPages.forEach((p, idx) => {
  const clean = toCleanUtf8(p);
  if (/FAS[İI]K[ÜU]L\s*İÇERİĞİ|İÇİNDEKİLER/i.test(clean)) {
    console.log(`\n=== CONTENTS PAGE ${idx + 1} ===`);
    console.log(clean.substring(0, 1000));
  }
  if (/Cevap\s*Anahtar/i.test(clean)) {
    console.log(`\n=== ANSWER KEY PAGE ${idx + 1} ===`);
    console.log(clean.substring(0, 500));
  }
});
