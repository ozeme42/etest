const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\reader_scripts';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const html = fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\oku_max_fen_5.html', 'utf8');
const scriptSrcs = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);

async function downloadAll() {
  for (const s of scriptSrcs) {
    const filename = path.basename(s);
    const target = path.join(dir, filename);
    await new Promise(resolve => {
      https.get('https://incele.hiperzeka.com' + s, res => {
        const fileStream = fs.createWriteStream(target);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      }).on('error', resolve);
    });
  }
  console.log('Downloaded all reader scripts!');
}

downloadAll();
