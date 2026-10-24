const https = require('https');

function fetchUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      console.log(`[${res.statusCode}] ${targetUrl}`);
      if (res.headers.location) {
        console.log('Redirect Location:', res.headers.location);
        return resolve(fetchUrl(res.headers.location.startsWith('http') ? res.headers.location : 'https://incele.hiperzeka.com' + res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

fetchUrl('https://incele.hiperzeka.com/oku/max-fen-5')
  .then(html => {
    console.log('HTML length:', html.length);
    const fs = require('fs');
    fs.writeFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\oku_max_fen_5.html', html, 'utf8');
    // find iframe or flipbook link
    const iframes = html.match(/<iframe[^>]+>/gi) || [];
    console.log('iframes:', iframes);
    const links = html.match(/https?:\/\/[^\s"']+/gi) || [];
    console.log('Absolute links:', Array.from(new Set(links)).slice(0, 20));
  })
  .catch(err => console.error('Error:', err));
