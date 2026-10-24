const https = require('https');

function fetchUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log('Redirecting to:', res.headers.location);
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

fetchUrl('https://incele.hiperzeka.com/kitap?oku=fen|max|5')
  .then(html => {
    console.log('HTML length:', html.length);
    // Find iframes, links, scripts
    const matches = html.match(/(?:href|src|iframe|location|window\.location)[^"'>\s]+/gi) || [];
    console.log('Matches:', matches.slice(0, 30));
    // Print title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    console.log('Title:', titleMatch ? titleMatch[1] : 'No title');
    // Save to scratch
    const fs = require('fs');
    fs.writeFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\incele_fen.html', html, 'utf8');
  })
  .catch(err => console.error('Fetch error:', err));
