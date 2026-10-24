const https = require('https');

https.get('https://incele.hiperzeka.com/oku/max-fen-5/sayfa/1', res => {
  console.log('Status:', res.statusCode);
  console.log('Location:', res.headers.location);
});
