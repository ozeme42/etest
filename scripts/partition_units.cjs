const fs = require('fs');

const text = fs.readFileSync('scripts/sosyal_answers_full.txt', 'utf8');

// The 6 unit headers:
const unitHeaders = [
  '1. Öğrenme Alanı - Birlikte Yaşamak',
  '2. Öğrenme Alanı - Evimiz Dünya',
  '3. Öğrenme Alanı - Ortak Mirasımız',
  '4. Öğrenme Alanı - Yaşayan Demokrasimiz',
  '5. Öğrenme Alanı - Hayatımızdaki Ekonomi',
  '6. Öğrenme Alanı - Teknoloji ve Sosyal Bilimler'
];

const unitIndices = unitHeaders.map(h => {
  const idx = text.indexOf(h);
  return { header: h, idx };
});

const units = [];
for (let i = 0; i < unitIndices.length; i++) {
  const start = unitIndices[i].idx;
  const end = (i + 1 < unitIndices.length) ? unitIndices[i + 1].idx : text.length;
  const chunk = text.slice(start, end);
  units.push({
    title: unitIndices[i].header,
    chunk
  });
}

units.forEach((u, idx) => {
  console.log(`\n=================== UNIT ${idx + 1}: ${u.title} ===================`);
  // Find MC tests
  const mcMatches = [...u.chunk.matchAll(/(GELİŞTİRİYORUM\s*-\s*\d+|UYGULUYORUM\s*-\s*\d+)/gi)].map(m => m[1].replace(/\s+/g, ' '));
  console.log('MC Tests:', mcMatches);
  
  // Find Anlıyorum matches
  const anlMatches = [...u.chunk.matchAll(/Anlıyorum\s*(\d+)/gi)].map(m => 'Anlıyorum ' + m[1]);
  console.log('Anlıyorum:', anlMatches);
  
  // Find Pekiştiriyorum matches
  const pekMatches = [...u.chunk.matchAll(/Pekiştiriyorum\s*(\d+)/gi)].map(m => 'Pekiştiriyorum ' + m[1]);
  console.log('Pekiştiriyorum (' + pekMatches.length + '):', pekMatches.join(', '));
});
