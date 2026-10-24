const https = require('https');

const candidates = [
  'https://www.uzmankariyer.com/hiperzeka/uploads/ebooks/2026/max/5/5_max_fen/mobile/index.html',
  'https://www.uzmankariyer.com/hiperzeka/uploads/ebooks/2026/max/5/5_max_fen/mobile/javascript/search_config.js',
  'https://www.uzmankariyer.com/hiperzeka/uploads/ebooks/2026/max/5/5_max_fen_bilimleri/mobile/index.html',
  'https://www.uzmankariyer.com/hiperzeka/uploads/ebooks/2026/max/5/5-max-fen/mobile/index.html',
  'https://www.uzmankariyer.com/hiperzeka/uploads/ebooks/2026/max/5/fen/mobile/index.html'
];

async function checkUrl(u) {
  return new Promise(resolve => {
    https.get(u, res => {
      console.log(`[${res.statusCode}] ${u}`);
      resolve({ url: u, status: res.statusCode });
    }).on('error', err => {
      console.log(`[ERR] ${u}: ${err.message}`);
      resolve({ url: u, status: 500 });
    });
  });
}

async function run() {
  for (const c of candidates) {
    await checkUrl(c);
  }
}
run();
