const fs = require('fs');

function applyQuizTheme(file) {
  let c = fs.readFileSync(file, 'utf8');

  // Backgrounds
  c = c.replace(/background:\s*'white'/g, "background: '#1e293b'");
  c = c.replace(/background:\s*'#ffffff'/g, "background: '#1e293b'");
  c = c.replace(/background:\s*'#f8fafc'/g, "background: '#0f172a'");
  c = c.replace(/background:\s*'#f1f5f9'/g, "background: '#0f172a'");

  // Borders
  c = c.replace(/border:\s*'1px solid #e2e8f0'/g, "border: '1px solid #334155'");
  c = c.replace(/border:\s*'2px solid #f1f5f9'/g, "border: '2px solid #334155'");
  c = c.replace(/border:\s*'2px solid #e2e8f0'/g, "border: '2px solid #334155'");
  c = c.replace(/borderBottom:\s*'2px solid white'/g, "borderBottom: '2px solid #1e293b'");
  c = c.replace(/borderBottom:\s*'2px solid #f8fafc'/g, "borderBottom: '2px solid #0f172a'");
  c = c.replace(/border:\s*'1px solid #f1f5f9'/g, "border: '1px solid #334155'");
  c = c.replace(/border:\s*'none'/g, "border: 'none'"); // no-op but safe

  // Text
  c = c.replace(/color:\s*'#0f172a'/g, "color: 'white'");
  c = c.replace(/color:\s*'#374151'/g, "color: 'white'");
  c = c.replace(/color:\s*'#64748b'/g, "color: '#94a3b8'");
  c = c.replace(/color:\s*'#4b5563'/g, "color: '#94a3b8'");
  
  // Box shadows (soften them for dark mode to prevent black blobs)
  c = c.replace(/boxShadow:\s*'0 2px 12px rgba\(0,0,0,0\.05\)'/g, "boxShadow: '0 4px 15px rgba(0,0,0,0.3)'");
  c = c.replace(/boxShadow:\s*'0 2px 8px rgba\(0,0,0,0\.15\)'/g, "boxShadow: '0 4px 15px rgba(0,0,0,0.4)'");

  // Accents (Indigo)
  c = c.replace(/background:\s*'#f0f4ff'/g, "background: 'rgba(79, 70, 229, 0.15)'");
  c = c.replace(/background:\s*'#f5f3ff'/g, "background: 'rgba(79, 70, 229, 0.15)'");
  c = c.replace(/border:\s*'1\.5px solid #c7d2fe'/g, "border: '1.5px solid rgba(79, 70, 229, 0.3)'");
  c = c.replace(/border:\s*'1px solid #ddd6fe'/g, "border: '1px solid rgba(79, 70, 229, 0.3)'");
  c = c.replace(/color:\s*'#3730a3'/g, "color: '#818cf8'");
  c = c.replace(/color:\s*'#6d28d9'/g, "color: '#818cf8'");

  // Accents (Emerald)
  c = c.replace(/background:\s*'#f0fdf4'/g, "background: 'rgba(16, 185, 129, 0.15)'");
  c = c.replace(/background:\s*'#ecfdf5'/g, "background: 'rgba(16, 185, 129, 0.15)'");
  c = c.replace(/border:\s*'1\.5px solid #bbf7d0'/g, "border: '1.5px solid rgba(16, 185, 129, 0.3)'");
  c = c.replace(/border:\s*'1px solid #a7f3d0'/g, "border: '1px solid rgba(16, 185, 129, 0.3)'");
  c = c.replace(/color:\s*'#166534'/g, "color: '#34d399'");
  c = c.replace(/color:\s*'#047857'/g, "color: '#34d399'");
  
  // Accents (Rose/Red)
  c = c.replace(/background:\s*'#fff1f2'/g, "background: 'rgba(225, 29, 72, 0.15)'");
  c = c.replace(/background:\s*'#fee2e2'/g, "background: 'rgba(239, 68, 68, 0.15)'");
  c = c.replace(/border:\s*'1px solid #fecdd3'/g, "border: '1px solid rgba(225, 29, 72, 0.3)'");
  c = c.replace(/border:\s*'1px solid #fca5a5'/g, "border: '1px solid rgba(239, 68, 68, 0.3)'");
  c = c.replace(/color:\s*'#be123c'/g, "color: '#fb7185'");
  c = c.replace(/color:\s*'#b91c1c'/g, "color: '#f87171'");

  // Accents (Amber/Yellow)
  c = c.replace(/background:\s*'#fef3c7'/g, "background: 'rgba(245, 158, 11, 0.15)'");
  c = c.replace(/border:\s*'1px solid #fde68a'/g, "border: '1px solid rgba(245, 158, 11, 0.3)'");
  c = c.replace(/color:\s*'#b45309'/g, "color: '#fbbf24'");
  
  // Specific grey backgrounds
  c = c.replace(/background:\s*'#f3f4f6'/g, "background: 'rgba(255, 255, 255, 0.05)'");
  c = c.replace(/border:\s*'1px solid #e5e7eb'/g, "border: '1px solid rgba(255, 255, 255, 0.1)'");

  fs.writeFileSync(file, c, 'utf8');
}

applyQuizTheme('src/pages/StudentDashboard.jsx');
applyQuizTheme('src/pages/MyCoachingPage.jsx');

// Update Global CSS variables
let indexCss = fs.readFileSync('src/index.css', 'utf8');
indexCss = indexCss.replace(/--color-bg:\s*#f8fafc;/g, '--color-bg: #0f172a;');
indexCss = indexCss.replace(/--color-surface:\s*#ffffff;/g, '--color-surface: #1e293b;');
indexCss = indexCss.replace(/--color-surface-hover:\s*#f1f5f9;/g, '--color-surface-hover: #334155;');
indexCss = indexCss.replace(/--color-text:\s*#0f172a;/g, '--color-text: #ffffff;');
indexCss = indexCss.replace(/--color-text-muted:\s*#64748b;/g, '--color-text-muted: #94a3b8;');
fs.writeFileSync('src/index.css', indexCss, 'utf8');

// Update Sidebar App.css
let appCss = fs.readFileSync('src/App.css', 'utf8');
appCss = appCss.replace(/background-color:\s*#ffffff;/g, 'background-color: #1e293b;');
appCss = appCss.replace(/border-right:\s*1px solid #e2e8f0;/g, 'border-right: 1px solid #334155;');
// Ensure it hasn't been transformed yet, but just in case:
appCss = appCss.replace(/background-color:\s*rgba\(255, 255, 255, 0\.8\);.*?;/g, 'background-color: #1e293b; border-right: 1px solid #334155;');
appCss = appCss.replace(/color:\s*#0f172a;/g, 'color: white;');
appCss = appCss.replace(/color:\s*#64748b;/g, 'color: #94a3b8;');

// App.css uses #f1f5f9 for active link bg
appCss = appCss.replace(/background-color:\s*#f1f5f9;/g, 'background-color: #334155;');
appCss = appCss.replace(/color:\s*#6366f1;/g, 'color: #818cf8;');

fs.writeFileSync('src/App.css', appCss, 'utf8');

console.log('Quiz theme successfully applied to all pages.');
