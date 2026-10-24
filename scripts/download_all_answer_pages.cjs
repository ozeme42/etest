const https = require('https');
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\decrypted_oku_fen.json', 'utf8'));

function getCookies() {
  return new Promise((resolve, reject) => {
    https.get('https://incele.hiperzeka.com/oku/max-fen-5', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
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
  const outDir = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\fen_answers';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Fasikül start pages (to get unit titles):
  const startPages = [1, 65, 145, 225, 289, 385, 433];
  for (const sp of startPages) {
    const out = path.join(outDir, `start_${sp}.webp`);
    if (!fs.existsSync(out)) {
      console.log(`Downloading start page ${sp}...`);
      await downloadPage(sp - 1, out, cookies);
    }
  }

  // Fasikül answer key pages:
  // Fasikül 1: 61, 62, 63
  // Fasikül 2: 141, 142, 143
  // Fasikül 3: 221, 222, 223
  // Fasikül 4: 285, 286, 287
  // Fasikül 5: 381, 382, 383
  // Fasikül 6: 429, 430, 431
  // Fasikül 7: 461, 462, 463
  const answerPages = [
    61, 62, 63,
    140, 141, 142, 143,
    220, 221, 222, 223,
    284, 285, 286, 287,
    380, 381, 382, 383,
    428, 429, 430, 431,
    460, 461, 462, 463
  ];

  for (const ap of answerPages) {
    const out = path.join(outDir, `ans_${ap}.webp`);
    if (!fs.existsSync(out)) {
      console.log(`Downloading answer page ${ap}...`);
      await downloadPage(ap - 1, out, cookies);
    }
  }

  console.log('All required pages downloaded successfully!');
}

main().catch(console.error);
