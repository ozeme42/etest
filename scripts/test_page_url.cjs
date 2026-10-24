const https = require('https');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\decrypted_oku_fen.json', 'utf8'));

const firstPageHash = data.sayfalar[0];
console.log('First page hash:', firstPageHash);

const testUrls = [
  `https://incele.hiperzeka.com/oku/max-fen-5/g/${firstPageHash}`,
  `https://incele.hiperzeka.com/oku/max-fen-5/s/${firstPageHash}`,
  `https://incele.hiperzeka.com/oku/max-fen-5/sayfa/1`,
  `https://incele.hiperzeka.com/oku/max-fen-5/1`,
  `https://incele.hiperzeka.com/oku/max-fen-5/p/${firstPageHash}`
];

testUrls.forEach(u => {
  https.get(u, res => {
    console.log(`[${res.statusCode}] ${u} (Content-Type: ${res.headers['content-type']}, Length: ${res.headers['content-length']})`);
  }).on('error', e => console.error(u, e.message));
});
