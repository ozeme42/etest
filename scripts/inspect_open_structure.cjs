const fs = require('fs');

const text = fs.readFileSync('scripts/sosyal_answers_full.txt', 'utf8');

const sectionRegex = /(\d+\.\s*Öğrenme Alanı\s*[-–]\s*[^0-9\n]+?(?=\s{2,}|Anlıyorum|Pekiştiriyorum|GELİŞTİRİYORUM|UYGULUYORUM|$)|Anlıyorum\s+\d+|Pekiştiriyorum\s+\d+|GELİŞTİRİYORUM\s*-\s*\d+|UYGULUYORUM\s*-\s*\d+)/gi;

const sections = [];
let m;
while ((m = sectionRegex.exec(text)) !== null) {
  sections.push({ name: m[1].replace(/\s+/g, ' ').trim(), index: m.index });
}

let currentUnit = '1. Öğrenme Alanı - Birlikte Yaşamak';
const openActivities = [];

for (let i = 0; i < sections.length; i++) {
  const cur = sections[i];
  if (cur.name.includes('Öğrenme Alanı')) {
    currentUnit = cur.name;
    continue;
  }
  if (!cur.name.startsWith('Anlıyorum') && !cur.name.startsWith('Pekiştiriyorum')) {
    continue;
  }
  const nextIdx = (i + 1 < sections.length) ? sections[i + 1].index : text.length;
  let body = text.slice(cur.index + cur.name.length, nextIdx).trim();
  body = body.replace(/=== PAGE ===/g, '').replace(/\b2[67]\d\b/g, '').trim();

  // Try parsing sub-questions in body
  // Can be numbers 1. 2. 3. or letters a. b. c. or plain text
  const numMatches = [...body.matchAll(/(?:^|\s)(\d+)\s*\.\s*(.*?)(?=(?:\s\d+\s*\.|$))/gs)];
  const letterMatches = [...body.matchAll(/(?:^|\s)([a-zçğıöşü])\s*\.\s*(.*?)(?=(?:\s[a-zçğıöşü]\s*\.|$))/gs)];

  openActivities.push({
    unit: currentUnit,
    name: cur.name,
    rawBody: body,
    numCount: numMatches.length,
    letterCount: letterMatches.length
  });
}

console.log('Total open activities:', openActivities.length);
console.log('Sample counts:');
openActivities.slice(0, 15).forEach(a => {
  console.log(`${a.name}: numCount=${a.numCount}, letterCount=${a.letterCount}, bodyPreview: "${a.rawBody.slice(0, 80).replace(/\s+/g, ' ')}"`);
});
