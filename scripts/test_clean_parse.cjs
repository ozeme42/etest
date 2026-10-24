const fs = require('fs');

const text = fs.readFileSync('scripts/sosyal_answers_full.txt', 'utf8');

// Match sections cleanly
// Any of:
// - \d+\.\s*Öğrenme Alanı[^-–\n]*[-–]\s*[A-Za-zÇĞİÖŞÜa-zçğıöşü\s]+?(?=\s{2,}|Anlıyorum|Pekiştiriyorum|GELİŞTİRİYORUM|UYGULUYORUM|\n|$)
// - Anlıyorum\s+\d+
// - Pekiştiriyorum\s+\d+
// - GELİŞTİRİYORUM\s*-\s*\d+
// - UYGULUYORUM\s*-\s*\d+

const sectionRegex = /(\d+\.\s*Öğrenme Alanı\s*[-–]\s*[^0-9\n]+?(?=\s{2,}|Anlıyorum|Pekiştiriyorum|GELİŞTİRİYORUM|UYGULUYORUM|$)|Anlıyorum\s+\d+|Pekiştiriyorum\s+\d+|GELİŞTİRİYORUM\s*-\s*\d+|UYGULUYORUM\s*-\s*\d+)/gi;

const sections = [];
let m;
while ((m = sectionRegex.exec(text)) !== null) {
  sections.push({ name: m[1].replace(/\s+/g, ' ').trim(), index: m.index });
}

console.log('Total section markers found:', sections.length);

let currentUnit = '1. Öğrenme Alanı - Birlikte Yaşamak';
const allItems = [];

for (let i = 0; i < sections.length; i++) {
  const cur = sections[i];
  if (cur.name.includes('Öğrenme Alanı')) {
    currentUnit = cur.name;
    continue;
  }
  const nextIdx = (i + 1 < sections.length) ? sections[i + 1].index : text.length;
  let body = text.slice(cur.index + cur.name.length, nextIdx).trim();
  body = body.replace(/=== PAGE ===/g, '').replace(/\b2[67]\d\b/g, '').trim();
  
  allItems.push({
    unit: currentUnit,
    name: cur.name,
    body: body
  });
}

console.log('Total items parsed:', allItems.length);
const anls = allItems.filter(x => x.name.startsWith('Anlıyorum'));
const peks = allItems.filter(x => x.name.startsWith('Pekiştiriyorum'));
const gels = allItems.filter(x => x.name.startsWith('GELİŞTİRİYORUM'));
const uygs = allItems.filter(x => x.name.startsWith('UYGULUYORUM'));

console.log('Anlıyorum count:', anls.length);
console.log('Pekiştiriyorum count:', peks.length);
console.log('Geliştiriyorum count:', gels.length);
console.log('Uyguluyorum count:', uygs.length);
