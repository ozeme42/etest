const fs = require('fs');

const html = fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\incele_fen.html', 'utf8');
const dMatch = html.match(/<script type="application\/octet-stream" id="d">([\s\S]*?)<\/script>/);
if (!dMatch) {
  console.log('No script id=d found');
  process.exit(1);
}
const s = dMatch[1].trim();

// Now reproduce the exact decryption logic from scratch/incele_app1.js:
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
fs.writeFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\decrypted_d.json', jsonStr, 'utf8');

const data = JSON.parse(jsonStr);
console.log('Keys in data:', Object.keys(data));

// Search for fen|max|5
function searchObj(obj, path = '') {
  if (typeof obj === 'string') {
    if (obj.includes('fen|max|5') || obj.includes('5_max') || obj.includes('fen')) {
      // console.log(`Found in ${path}: ${obj}`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => searchObj(item, `${path}[${idx}]`));
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'fen|max|5') {
        console.log('FOUND KEY fen|max|5:', JSON.stringify(v, null, 2));
      }
      searchObj(v, `${path}.${k}`);
    }
  }
}
searchObj(data);
