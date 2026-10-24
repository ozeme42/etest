const https = require('https');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\decrypted_oku_fen.json', 'utf8'));

console.log('kod:', data.kod);
console.log('sayfa_surum:', data.sayfa_surum);
console.log('sayfalar count:', data.sayfalar.length);

const page0Url = 'https://incele.hiperzeka.com/oku/' + encodeURIComponent(data.kod) + '/i/' + data.sayfalar[0] + (data.sayfa_surum ? '?v=' + data.sayfa_surum : '');
console.log('Page 0 URL:', page0Url);

https.get(page0Url, res => {
  console.log(`[${res.statusCode}] Headers:`, res.headers['content-type'], res.headers['content-length']);
  if (res.statusCode === 200) {
    const file = fs.createWriteStream('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\page_0.jpg');
    res.pipe(file);
    file.on('finish', () => console.log('Downloaded page_0.jpg successfully!'));
  }
}).on('error', err => console.error(err));
