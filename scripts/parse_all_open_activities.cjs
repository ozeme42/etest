const fs = require('fs');

const text = fs.readFileSync('scripts/sosyal_answers_full.txt', 'utf8');

// Let's inspect how Anlıyorum and Pekiştiriyorum are delimited
// All section markers:
// Anlıyorum \d+
// Pekiştiriyorum \d+
// GELİŞTİRİYORUM - \d+
// UYGULUYORUM - \d+
// \d+\. Öğrenme Alanı

const sectionRegex = /(Anlıyorum\s*\d+|Pekiştiriyorum\s*\d+|GELİŞTİRİYORUM\s*-\s*\d+|UYGULUYORUM\s*-\s*\d+|\d+\.\s*Öğrenme Alanı[^\n]*)/gi;

const sections = [];
let m;
while ((m = sectionRegex.exec(text)) !== null) {
  sections.push({ name: m[1].replace(/\s+/g, ' ').trim(), index: m.index });
}

console.log('Total section markers found:', sections.length);

const parsedActivities = [];
for (let i = 0; i < sections.length; i++) {
  const cur = sections[i];
  if (cur.name.startsWith('Anlıyorum') || cur.name.startsWith('Pekiştiriyorum')) {
    const nextIdx = (i + 1 < sections.length) ? sections[i + 1].index : text.length;
    let body = text.slice(cur.index + cur.name.length, nextIdx).trim();
    // remove page markers like "=== PAGE ===" or "261", etc.
    body = body.replace(/=== PAGE ===/g, '').replace(/\b2[67]\d\b/g, '').trim();
    parsedActivities.push({
      name: cur.name,
      body: body
    });
  }
}

console.log('Total open-ended activities parsed:', parsedActivities.length);
console.log('Sample 1:', parsedActivities[0]);
console.log('Sample 2:', parsedActivities[1]);
console.log('Sample 3:', parsedActivities[2]);
console.log('Sample 4:', parsedActivities[3]);
console.log('Sample 5:', parsedActivities[4]);
