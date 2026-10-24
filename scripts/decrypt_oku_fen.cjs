const fs = require('fs');

const html = fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\oku_max_fen_5.html', 'utf8');
const dMatch = html.match(/<script type="application\/octet-stream" id="d">([\s\S]*?)<\/script>/);
if (!dMatch) {
  console.log('No script id=d found');
  process.exit(1);
}
const s = dMatch[1].trim();

const r = Array.from({ length: 94 }, (n, u) => 33 + u).filter(n => n !== 60);

function i(n) {
  const arr = r.slice();
  let e = n || 1;
  for (let o = arr.length - 1; o > 0; o--) {
    e ^= e << 13;
    e ^= e >>> 17;
    e ^= e << 5;
    e >>>= 0;
    const c = e % (o + 1);
    [arr[o], arr[c]] = [arr[c], arr[o]];
  }
  return arr;
}

const e = new Uint8Array(128);
e[32] = 32;
const seed = parseInt(s.slice(0, 8), 16);
i(seed).forEach((c, a) => {
  e[c] = r[a];
});

const o = new Uint8Array(s.length - 8);
for (let c = 0; c < o.length; c++) {
  o[c] = e[s.charCodeAt(c + 8)];
}

const jsonStr = new TextDecoder().decode(o);
console.log('Decrypted JSON length:', jsonStr.length);
fs.writeFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\decrypted_oku_fen.json', jsonStr, 'utf8');

const data = JSON.parse(jsonStr);
console.log('Keys in decrypted data:', Object.keys(data));
console.log('Sample:', JSON.stringify(data, null, 2).slice(0, 1000));
