const fs = require('fs');

const text = fs.readFileSync('C:/Users/mahmut/.gemini/antigravity/brain/602e7fcd-8fa0-4825-8afe-e3d07dddec13/scratch/fas_1_open_ended.txt', 'utf8');

// The text has exercise numbers like 01, 02, 03, 04... under sections
// In page 138:
// Şimdi Uygula: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14
// In page 139:
// 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27
// In page 140:
// 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40
// And Birbirine Bağla: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12
// In page 141:
// 41, 42, 43, 44, 45, 46, 47, 48
// And Yaşama Uyarla: 01, 02, 03, 04

console.log('Testing pattern detection in Fasikül 1...');

// Let's split by double newlines or check structure
const pages = text.split('---PAGE---');
console.log('Pages count:', pages.length);

pages.forEach((p, idx) => {
  console.log(`Page chunk ${idx}: length ${p.length}`);
});
