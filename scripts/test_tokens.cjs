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
function toCleanUtf8(str) {
  try {
    return Buffer.from(str, 'latin1').toString('utf8');
  } catch(e) {
    return str;
  }
}

// Let's inspect page 138 chunks
const p138 = toCleanUtf8(rawPages[137]);

// Regex to find exercise blocks like:
// (0[1-9]|[1-9][0-9]) followed by exercise text until the next exercise number or end
// Or let's see how tokens are separated
const tokens = p138.split(/\s{4,}/).map(t => t.trim()).filter(Boolean);
console.log('Page 138 tokens count:', tokens.length);
tokens.slice(0, 30).forEach((t, i) => {
  console.log(`[${i}] ${t.substring(0, 60)}`);
});
