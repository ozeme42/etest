const fs = require('fs');
let c = fs.readFileSync('src/pages/QuizRunner.jsx', 'utf8');

c = c.replace(/var\(--color-surface\)/g, 'rgba(255,255,255,0.05)')
     .replace(/var\(--color-border\)/g, 'rgba(255,255,255,0.15)')
     .replace(/var\(--color-text\)/g, '#e2e8f0')
     .replace(/var\(--color-text-muted\)/g, '#94a3b8')
     .replace(/className="card glass"/g, 'className="card glass-dark"')
     .replace(/className="quiz-header card glass"/g, 'className="quiz-header card glass-dark"')
     .replace(/className="modal-content card glass animate-fade-in"/g, 'className="modal-content card glass-dark animate-fade-in"');

fs.writeFileSync('src/pages/QuizRunner.jsx', c);
console.log("Done");
