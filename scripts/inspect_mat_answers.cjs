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

const groups = [
  { fas: 1, name: '1. Fasikül: Geometrik Şekiller', pages: [92, 93, 94, 95, 96, 97] },
  { fas: 2, name: '2. Fasikül: Sayılar ve İşlemler', pages: [204, 205, 206, 207, 208] },
  { fas: 3, name: '3. Fasikül: Geometrik Nicelikler', pages: [267, 268, 269, 270] },
  { fas: 4, name: '4. Fasikül: Kesirler', pages: [363, 364, 365, 366, 367, 368] },
  { fas: 5, name: '5. Fasikül: İstatistiksel Araştırma', pages: [415, 416, 417, 418] },
  { fas: 6, name: '6. Fasikül: İşlemlerle Cebirsel Düşünme', pages: [511, 512, 513] }
];

groups.forEach(g => {
  console.log(`\n======================================================`);
  console.log(`FASİKÜL ${g.fas}: ${g.name}`);
  g.pages.forEach(pNum => {
    const text = toCleanUtf8(rawPages[pNum - 1]);
    const mcCount = (text.match(/\b\d+\s*\.\s*[A-D]\b/g) || []).length;
    console.log(`--- Page ${pNum} (length: ${text.length}, MC: ${mcCount}) ---`);
    console.log(text.substring(0, 400).replace(/\s+/g, ' '));
  });
});
