const fs = require('fs');

const raw = fs.readFileSync('C:/Users/mahmut/.gemini/antigravity/brain/602e7fcd-8fa0-4825-8afe-e3d07dddec13/scratch/sosyal_search.js', 'latin1');

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
console.log('Total pages in Sosyal Bilgiler:', rawPages.length);

function toCleanUtf8(str) {
  try {
    return Buffer.from(str, 'latin1').toString('utf8');
  } catch(e) {
    return str;
  }
}

// Find table of contents and answer key pages
rawPages.forEach((p, idx) => {
  const clean = toCleanUtf8(p);
  const pNum = idx + 1;
  if (/İÇİNDEKİLER|ÜNİTE\s*İÇERİĞİ/i.test(clean) && pNum <= 10) {
    console.log(`\n=== CONTENTS PAGE ${pNum} ===`);
    console.log(clean.substring(0, 1500));
  }
  if (/Cevap\s*Anahtar/i.test(clean)) {
    console.log(`\n=== ANSWER KEY PAGE ${pNum} ===`);
    console.log(clean.substring(0, 500));
  }
});
