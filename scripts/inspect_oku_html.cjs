const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\oku_max_fen_5.html', 'utf8');

// Print scripts or interesting tags
const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];
console.log('Scripts in oku_max_fen_5.html:', scripts.length);
scripts.forEach((s, i) => {
  console.log(`Script ${i}:`, s.slice(0, 300));
});

// Also search for urls, paths, or data attributes
const allMatches = html.match(/data-[a-z0-9\-]+="[^"]+"/gi) || [];
console.log('Data attributes:', allMatches.slice(0, 20));
