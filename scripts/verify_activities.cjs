const fs = require('fs');

const text = fs.readFileSync('scripts/sosyal_answers_full.txt', 'utf8');

// Match sections
const sectionRegex = /(\d+\.\s*Öğrenme Alanı\s*[-–]\s*[^0-9\n]+?(?=\s{2,}|Anlıyorum|Pekiştiriyorum|GELİŞTİRİYORUM|UYGULUYORUM|$)|Anlıyorum\s+\d+|Pekiştiriyorum\s+\d+|GELİŞTİRİYORUM\s*-\s*\d+|UYGULUYORUM\s*-\s*\d+)/gi;

const sections = [];
let m;
while ((m = sectionRegex.exec(text)) !== null) {
  sections.push({ name: m[1].replace(/\s+/g, ' ').trim(), index: m.index });
}

const activities = {};

for (let i = 0; i < sections.length; i++) {
  const cur = sections[i];
  if (cur.name.startsWith('Anlıyorum') || cur.name.startsWith('Pekiştiriyorum')) {
    const nextIdx = (i + 1 < sections.length) ? sections[i + 1].index : text.length;
    let body = text.slice(cur.index + cur.name.length, nextIdx).trim();
    body = body.replace(/=== PAGE ===/g, '').replace(/\b2[67]\d\b/g, '').trim();
    // clean leading duplicate numbers if present (e.g. "01 a. ...")
    body = body.replace(/^0*\d+\s+/, '').trim();
    activities[cur.name] = body;
  }
}

console.log('Total extracted activities:', Object.keys(activities).length);
console.log('Anlıyorum keys:', Object.keys(activities).filter(k => k.startsWith('Anlıyorum')));
console.log('Pekiştiriyorum count:', Object.keys(activities).filter(k => k.startsWith('Pekiştiriyorum')).length);

// Let's verify each one has non-empty body
let emptyCount = 0;
for (const [k, v] of Object.entries(activities)) {
  if (!v || v.length < 3) {
    console.log('EMPTY activity:', k, 'body:', JSON.stringify(v));
    emptyCount++;
  }
}
console.log('Empty activities:', emptyCount);
