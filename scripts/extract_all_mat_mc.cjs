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

// Find every occurrence of 1.A 2.B ... in the entire book
const allMCTests = [];

rawPages.forEach((p, idx) => {
  const clean = toCleanUtf8(p);
  const pNum = idx + 1;

  // Regex to match answer sequences: 1.A 2.B 3.C ...
  const ansRegex = /(\d+\.[A-D](?:\s+\d+\.[A-D]+)+)/g;
  let match;
  while ((match = ansRegex.exec(clean)) !== null) {
    const seq = match[1];
    const answers = {};
    const aMatches = seq.matchAll(/(\d+)\.([A-D])/g);
    for (const a of aMatches) {
      answers[a[1]] = a[2];
    }
    const qCount = Object.keys(answers).length;
    if (qCount >= 3) {
      const before = clean.substring(Math.max(0, match.index - 80), match.index).replace(/\s+/g, ' ');
      allMCTests.push({
        page: pNum,
        header: before,
        qCount,
        answers
      });
    }
  }
});

console.log('Total MC test answer sequences found in book:', allMCTests.length);
allMCTests.forEach((t, i) => {
  console.log(`[${i+1}] Page ${t.page} (${t.qCount}q): [${t.header}] -> ${JSON.stringify(t.answers).substring(0, 45)}...`);
});
