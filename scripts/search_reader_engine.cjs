const https = require('https');
const fs = require('fs');

const scripts = [
  '/v/0191605e4aa597569914.js',
  '/v/21046b2212f56f64affe.js',
  '/v/44cb7dad4be2c0327278.js',
  '/v/7b95e3a82bc38d1894bf.js',
  '/v/1516a424926e4bbf4508.js',
  '/v/b266181b12c913921a7d.js',
  '/v/13faba3ddcf85c9d2b2a.js',
  '/v/18bf8a3f3d353314c3ec.js',
  '/v/a0391edd5548b178e19d.js',
  '/v/f780233f4b3499ff7e29.js',
  '/v/fcf8a920a125639c0647.js',
  '/v/84be32eb740da34ec899.js',
  '/v/2095414eb8e1458755f3.js',
  '/v/549ce1f6194c086ec923.js',
  '/v/52e40c4bf0df064602a2.js',
  '/v/40d00663390b72413288.js',
  '/v/7b36b6d45998f018dd1e.js',
  '/v/90e1dc9753f604f1b353.js',
  '/v/187b92d5f66a850d2b24.js',
  '/v/3e0c3f5d941a5d0e0f3c.js'
];

async function checkScripts() {
  for (const s of scripts) {
    await new Promise(resolve => {
      https.get('https://incele.hiperzeka.com' + s, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          // search for fetch or endpoints
          const fetches = data.match(/fetch\([^)]+\)|axios|\/oku\/[a-z0-9\/\-_]+/gi) || [];
          const endpoints = data.match(/["'](\/[a-zA-Z0-9_\-\/]+)["']/g) || [];
          console.log(`Script ${s} (${data.length} bytes): fetches=${fetches.length}`);
          if (fetches.length > 0) {
            console.log('  -> sample fetches:', fetches.slice(0, 5));
          }
          const interestingEndpoints = endpoints.filter(e => e.includes('oku') || e.includes('sayfa') || e.includes('kitap') || e.includes('api'));
          if (interestingEndpoints.length > 0) {
            console.log('  -> interesting endpoints:', interestingEndpoints.slice(0, 5));
          }
          resolve();
        });
      }).on('error', resolve);
    });
  }
}

checkScripts();
