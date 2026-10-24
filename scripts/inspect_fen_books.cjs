const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\decrypted_d.json', 'utf8'));

// Inspect kitaplar
console.log('Total kitaplar:', data.kitaplar.length);
const fenBooks = data.kitaplar.filter(k => (k.anahtar && k.anahtar.includes('fen')) || (k.ad && k.ad.toLowerCase().includes('fen')));
console.log('Fen books count:', fenBooks.length);
fenBooks.forEach(b => {
  console.log('Book:', b.ad, 'anahtar:', b.anahtar, 'id:', b.id, 'link:', b.link, 'url:', b.url, 'path:', b.path, 'kod:', b.kod);
});
