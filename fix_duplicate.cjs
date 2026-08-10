const fs = require('fs');
let c = fs.readFileSync('src/pages/StudentExamsPage.jsx', 'utf8');
c = c.replace(
  `<div className="container" style={{ padding: '2rem 1rem', maxWidth: 1200, margin: '0 auto' }}>\\r\\n    <div className="container" style={{ padding: '2rem 1rem', maxWidth: 1200, margin: '0 auto' }}>`,
  `<div className="container" style={{ padding: '2rem 1rem', maxWidth: 1200, margin: '0 auto' }}>`
);
c = c.replace(
  `<div className="container" style={{ padding: '2rem 1rem', maxWidth: 1200, margin: '0 auto' }}>\\n    <div className="container" style={{ padding: '2rem 1rem', maxWidth: 1200, margin: '0 auto' }}>`,
  `<div className="container" style={{ padding: '2rem 1rem', maxWidth: 1200, margin: '0 auto' }}>`
);
fs.writeFileSync('src/pages/StudentExamsPage.jsx', c);
console.log('Fixed duplicate container');
