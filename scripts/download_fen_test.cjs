const https = require('https');
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\decrypted_oku_fen.json', 'utf8'));

// First obtain session cookies
function getCookies() {
  return new Promise((resolve, reject) => {
    https.get('https://incele.hiperzeka.com/oku/max-fen-5', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, res => {
      const cookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
      resolve(cookies);
    }).on('error', reject);
  });
}

function downloadPage(pageIndex, outPath, cookies) {
  return new Promise((resolve, reject) => {
    const hash = data.sayfalar[pageIndex];
    const url = 'https://incele.hiperzeka.com/oku/' + encodeURIComponent(data.kod) + '/i/' + hash + (data.sayfa_surum ? '?v=' + data.sayfa_surum : '');
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://incele.hiperzeka.com/oku/max-fen-5',
        'Cookie': cookies
      }
    }, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode} for page ${pageIndex + 1}`));
      }
      const stream = fs.createWriteStream(outPath);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function main() {
  const cookies = await getCookies();
  console.log('Got cookies:', cookies);

  const outDir = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\fen_pages';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Test downloading page 2 and page 64
  console.log('Downloading page 2 (index 1)...');
  await downloadPage(1, path.join(outDir, 'page_002.webp'), cookies);
  console.log('Downloading page 64 (index 63)...');
  await downloadPage(63, path.join(outDir, 'page_064.webp'), cookies);
  console.log('Downloaded test pages!');
}

main().catch(console.error);
