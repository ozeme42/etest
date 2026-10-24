const fs = require('fs');

const fullText = fs.readFileSync('scripts/sosyal_answers_full.txt', 'utf8');

// Parse Geliştiriyorum tests:
// Format: GELİŞTİRİYORUM - 1 1.B 2.A 3.D ...
const testRegex = /(GELİŞTİRİYORUM\s*-\s*\d+|UYGULUYORUM\s*-\s*\d+)([\s\S]*?)(?=(?:GELİŞTİRİYORUM|UYGULUYORUM|\d+\.\s*Öğrenme|Anlıyorum|Pekiştiriyorum|=== PAGE ===|$))/gi;

let match;
const mcTests = [];
while ((match = testRegex.exec(fullText)) !== null) {
  const name = match[1].replace(/\s+/g, ' ').trim();
  const rawBody = match[2];
  
  // Extract questions like 1.B 2.C or 1. B 2. C
  const qMatches = [...rawBody.matchAll(/(\d+)\s*\.\s*([A-D])/gi)];
  if (qMatches.length > 0) {
    const answerKey = {};
    for (const qm of qMatches) {
      answerKey[qm[1]] = qm[2].toUpperCase();
    }
    mcTests.push({
      name,
      questionCount: qMatches.length,
      answerKey
    });
  }
}

console.log('Total MC tests parsed:', mcTests.length);
mcTests.forEach((t, i) => {
  console.log(`${i + 1}. ${t.name} (${t.questionCount} sorular): ${JSON.stringify(t.answerKey)}`);
});
