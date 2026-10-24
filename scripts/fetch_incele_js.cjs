const https = require('https');
const fs = require('fs');

async function download(path, outFile) {
  return new Promise((resolve, reject) => {
    https.get('https://incele.hiperzeka.com' + path, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        fs.writeFileSync(outFile, data, 'utf8');
        console.log(`Saved ${path} (${data.length} bytes) to ${outFile}`);
        resolve(data);
      });
    }).on('error', reject);
  });
}

async function run() {
  await download('/v/24d33a2fd76217e8035f.js', 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\incele_app1.js');
  await download('/v/a431db79ac6ba03855a5.js', 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\incele_app2.js');
}
run();
