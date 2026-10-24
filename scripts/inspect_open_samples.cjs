const fs = require('fs');
const text = fs.readFileSync('scripts/sosyal_answers_full.txt', 'utf8');

// Inspect a few Anlıyorum and Pekiştiriyorum chunks
function getSnippet(keyword) {
  const idx = text.indexOf(keyword);
  if (idx !== -1) {
    return text.slice(idx, idx + 400);
  }
  return 'NOT FOUND';
}

console.log('--- Anlıyorum 01 ---');
console.log(getSnippet('Anlıyorum  01'));

console.log('--- Pekiştiriyorum 01 ---');
console.log(getSnippet('Pekiştiriyorum   01'));

console.log('--- Pekiştiriyorum 04 ---');
console.log(getSnippet('Pekiştiriyorum   04'));

console.log('--- Pekiştiriyorum 11 ---');
console.log(getSnippet('Pekiştiriyorum   11'));
