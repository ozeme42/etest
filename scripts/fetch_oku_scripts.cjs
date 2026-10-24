const https = require('https');
const fs = require('fs');

const html = fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\oku_max_fen_5.html', 'utf8');
const scriptSrcs = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
console.log('Script srcs:', scriptSrcs);

// Let's check the text of script 0: /v/deec93a17fbb268ed9bc.js
https.get('https://incele.hiperzeka.com' + scriptSrcs[0], res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log(`Script ${scriptSrcs[0]} length: ${d.length}`);
    fs.writeFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\script0.js', d, 'utf8');
  });
});
