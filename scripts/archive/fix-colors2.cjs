const fs = require('fs');
let c = fs.readFileSync('src/pages/QuizRunner.jsx', 'utf8');

c = c.replace(/background:\s*'white'/g, "background: 'var(--color-surface)'")
     .replace(/background:\s*'#f8fafc'/g, "background: 'var(--color-surface)'")
     .replace(/border:\s*'1px solid #e2e8f0'/g, "border: '1px solid var(--color-border)'")
     .replace(/border:\s*'1.5px solid #e2e8f0'/g, "border: '1.5px solid var(--color-border)'")
     .replace(/border:\s*'1px solid #cbd5e1'/g, "border: '1px solid var(--color-border)'")
     .replace(/boxShadow:\s*'0 2px 4px rgba\(0,0,0,0.02\)'/g, "boxShadow: '0 4px 12px rgba(0,0,0,0.1)'")
     .replace(/boxShadow:\s*'0 2px 4px rgba\(0,0,0,0.03\)'/g, "boxShadow: '0 4px 12px rgba(0,0,0,0.1)'")
     .replace(/color:\s*'#1e293b'/g, "color: 'var(--color-text)'")
     .replace(/color:\s*'#0f172a'/g, "color: 'var(--color-text)'")
     .replace(/color:\s*'#475569'/g, "color: 'var(--color-text-muted)'")
     .replace(/color:\s*'#64748b'/g, "color: 'var(--color-text-muted)'")
     .replace(/background:\s*'#f1f5f9'/g, "background: 'rgba(255,255,255,0.05)'")
     .replace(/border:\s*'2px solid #e2e8f0'/g, "border: '2px solid var(--color-border)'")
     .replace(/background:\s*'#eff6ff'/g, "background: 'rgba(59, 130, 246, 0.15)'");

fs.writeFileSync('src/pages/QuizRunner.jsx', c);
console.log("Done remaining whites.");
