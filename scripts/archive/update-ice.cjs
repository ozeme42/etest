const fs = require('fs');

const dashCssIce = `
const DASH_CSS = \`
  .sd-shell {
    min-height: 100vh;
    background: #f8fafc;
    background-image: 
      radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
      radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.08) 0px, transparent 50%),
      radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.05) 0px, transparent 50%);
    font-family: inherit;
    color: #1e293b;
  }
\`;
`;

function transformToIce(file) {
  let c = fs.readFileSync(file, 'utf8');
  
  // Inject DASH_CSS if not exists
  if (!c.includes('DASH_CSS')) {
    c = c.replace(/import [^;]+;[\s\n]+/g, (match) => match + dashCssIce);
    // Wrap main return with sd-shell and inject style
    c = c.replace(/return\s*\(\s*<div\s+style={{[^}]+}}\s*>/, (match) => {
      return `return (\n    <div className="sd-shell">\n      <style>{DASH_CSS}</style>\n      ` + match.replace('return (', '').trim();
    });
    // Or if it just returns <div style={{
    if(!c.includes('sd-shell')) {
      c = c.replace(/return\s*\(\s*<div/, `return (\n    <div className="sd-shell">\n      <style>{DASH_CSS}</style>\n      <div`);
      c = c.replace(/;\n}\n*$/, `    </div>\n  );\n}\n`);
    }
  }

  // Safely soften white and light gray backgrounds into frosted glass
  // Use regex with word boundaries/exact matches to avoid breaking other things
  c = c.replace(/background:\s*'white'/g, "background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)'");
  c = c.replace(/background:\s*'#ffffff'/g, "background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)'");
  c = c.replace(/background:\s*'#f8fafc'/g, "background: 'rgba(255, 255, 255, 0.5)'");
  c = c.replace(/background:\s*'#f1f5f9'/g, "background: 'rgba(255, 255, 255, 0.6)'");
  
  // Soften solid light borders
  c = c.replace(/border:\s*'1px solid #e2e8f0'/g, "border: '1px solid rgba(255,255,255,1)'");
  c = c.replace(/border:\s*'2px solid #f1f5f9'/g, "border: '1px solid rgba(255,255,255,0.8)'");

  // Keep all text colors as they are! (They are already '#0f172a', '#64748b' etc.)

  fs.writeFileSync(file, c, 'utf8');
}

transformToIce('src/pages/StudentDashboard.jsx');
transformToIce('src/pages/MyCoachingPage.jsx');

let appCss = fs.readFileSync('src/App.css', 'utf8');
appCss = appCss.replace(/background-color:\s*#1e293b;/g, 'background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px); border-right: 1px solid rgba(255,255,255,1);');
appCss = appCss.replace(/color:\s*#f8fafc;/g, 'color: #0f172a;');
appCss = appCss.replace(/color:\s*#cbd5e1;/g, 'color: #64748b;');
appCss = appCss.replace(/background-color:\s*#334155;/g, 'background-color: rgba(99, 102, 241, 0.1); color: #6366f1;');
appCss = appCss.replace(/color:\s*#fff;/g, 'color: #0f172a;');
fs.writeFileSync('src/App.css', appCss, 'utf8');

console.log('Ice Theme Safely Injected!');
