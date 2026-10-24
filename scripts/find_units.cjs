const fs = require('fs');
const text = fs.readFileSync('scripts/sosyal_answers_full.txt', 'utf8');

const regex = /(\d+\.\s*Öğrenme Alanı[^\n]*)/gi;
let m;
while ((m = regex.exec(text)) !== null) {
  console.log(`Pos ${m.index}: ${m[1]}`);
}
