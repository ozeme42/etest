const https = require('https');

https.get('https://incele.hiperzeka.com/oku/max-fen-5', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}, res => {
  console.log('Status:', res.statusCode);
  console.log('Set-Cookie:', res.headers['set-cookie']);
  
  const cookies = res.headers['set-cookie'] ? res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
  console.log('Cookies string:', cookies);

  // Now test image with Referer and Cookie
  const page0Url = 'https://incele.hiperzeka.com/oku/max-fen-5/i/f9fZ6KSKu0MR?v=1792084313456098600';
  https.get(page0Url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://incele.hiperzeka.com/oku/max-fen-5',
      'Cookie': cookies
    }
  }, imgRes => {
    console.log(`Image Status: [${imgRes.statusCode}]`);
    console.log('Content-Type:', imgRes.headers['content-type']);
    console.log('Content-Length:', imgRes.headers['content-length']);
  });
});
