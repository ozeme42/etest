const fs = require('fs');
let c = fs.readFileSync('src/pages/QuizRunner.jsx', 'utf8');

c = c.replace(/const studentSel = typeof bundleAns === 'object' \? bundleAns\[i\] : null;/g,
  "const studentSel = typeof bundleAns === 'object' && bundleAns !== null ? bundleAns[i] : (i === 0 && typeof bundleAns === 'number' ? bundleAns : null);");

c = c.replace(/const textVal = typeof bundleAns === 'object' \? \(bundleAns\[i\] \|\| ''\) : \(typeof bundleAns === 'string' \? bundleAns : ''\);/g,
  "const textVal = typeof bundleAns === 'object' && bundleAns !== null ? (bundleAns[i] || '') : (i === 0 && typeof bundleAns === 'string' ? bundleAns : '');");

c = c.replace(/⚖️ Öğretmen Modu/g, "⚖️ Öğretmen Modu");
c = c.replace(/<span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var\(--color-text-muted\)', background: 'rgba\(99,102,241,0.1\)', border: '1px solid rgba\(99,102,241,0.2\)', borderRadius: '50px', padding: '0.2rem 0.65rem' }}>/g,
  "<span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ffffff', background: 'var(--color-secondary)', border: '1px solid var(--color-secondary)', borderRadius: '50px', padding: '0.3rem 0.8rem', boxShadow: '0 0 10px rgba(249,115,22,0.4)' }}>");

fs.writeFileSync('src/pages/QuizRunner.jsx', c);
console.log("Bug fixed.");
