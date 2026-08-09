const fs = require('fs');

let content = fs.readFileSync('src/pages/MyCoachingPage.jsx', 'utf8');

// Inject DASH_CSS
const DASH_CSS = `
  .sd-shell {
    min-height: 100vh;
    background: #090d16;
    background-image: 
      radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.12) 0px, transparent 50%),
      radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.12) 0px, transparent 50%),
      radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.08) 0px, transparent 50%);
    font-family: inherit;
    color: #f1f5f9;
  }
  .sd-container { max-width: 1400px; margin: 0 auto; padding: 16px; }
  @media (min-width: 641px){ .sd-container{ padding: 24px 32px; } }
  @media (min-width: 1400px){ .sd-container{ padding: 32px 0; } }
`;

// Only replace once to avoid duplicate wrappers if run multiple times
if (!content.includes('className="sd-shell"')) {
  // Replace outer wrapper
  content = content.replace(/return \(\s*<div style=\{\{ minHeight: '100vh', background: 'linear-gradient[^>]*\}\}>/,
    'return (\n    <div className="sd-shell">\n      <style>{`' + DASH_CSS.replace(/`/g, '\\`') + '`}</style>\n      <div className="sd-container">'
  );

  // Close the new divs at the very end
  const lastReturnMatch = content.lastIndexOf('    </div>\n  );\n}');
  if (lastReturnMatch !== -1) {
    content = content.substring(0, lastReturnMatch) + '      </div>\n    </div>\n  );\n}' + content.substring(lastReturnMatch + 16);
  }
}

// Global color replacements for inline styles
content = content.replace(/background:\s*'white'/g, "background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)'");
content = content.replace(/color:\s*'#0f172a'/g, "color: '#fff'");
content = content.replace(/color:\s*'#1e293b'/g, "color: '#e2e8f0'");
content = content.replace(/color:\s*'#374151'/g, "color: '#cbd5e1'");
content = content.replace(/color:\s*'#475569'/g, "color: '#94a3b8'");
content = content.replace(/background:\s*'#f8fafc'/g, "background: 'rgba(255,255,255,0.02)'");
content = content.replace(/background:\s*'#f1f5f9'/g, "background: 'rgba(255,255,255,0.04)'");
content = content.replace(/border:\s*'1\.5px solid #e2e8f0'/g, "border: '1px solid rgba(255,255,255,0.1)'");
content = content.replace(/border:\s*'2px solid #f1f5f9'/g, "border: '1px solid rgba(255,255,255,0.07)'");
content = content.replace(/border:\s*'1px solid #cbd5e1'/g, "border: '1px solid rgba(255,255,255,0.15)'");
content = content.replace(/border:\s*'1px solid #e2e8f0'/g, "border: '1px solid rgba(255,255,255,0.1)'");
content = content.replace(/borderBottom:\s*'2px solid #f8fafc'/g, "borderBottom: '1px solid rgba(255,255,255,0.05)'");
content = content.replace(/borderBottom:\s*'1px solid #e2e8f0'/g, "borderBottom: '1px solid rgba(255,255,255,0.08)'");
content = content.replace(/borderTop:\s*'1px solid #e2e8f0'/g, "borderTop: '1px solid rgba(255,255,255,0.08)'");
content = content.replace(/background:\s*'#f0fdf4'/g, "background: 'rgba(16,185,129,0.1)'");
content = content.replace(/border:\s*'1\.5px solid #bbf7d0'/g, "border: '1px solid rgba(16,185,129,0.3)'");
content = content.replace(/background:\s*'#f0f4ff'/g, "background: 'rgba(99,102,241,0.15)'");
content = content.replace(/border:\s*'1\.5px solid #c7d2fe'/g, "border: '1px solid rgba(99,102,241,0.3)'");
content = content.replace(/boxShadow:\s*'[^']+'/g, "boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)'");

// Update 'inp' object specifically to make text visible on dark bg
content = content.replace(/const inp = \{[^\}]+\};/, "const inp = { width: '100%', padding: '0.6rem 0.85rem', borderRadius: '0.7rem', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.84rem', outline: 'none', background: 'rgba(255,255,255,0.04)', fontFamily: 'inherit', boxSizing: 'border-box', color: '#fff' };");

// Fix TabBtn specific borders
content = content.replace(/border:\s*active \? '2px solid #e2e8f0' : '2px solid transparent'/g, "border: active ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent'");
content = content.replace(/borderBottom:\s*active \? '2px solid white' : '2px solid transparent'/g, "borderBottom: active ? '2px solid #818cf8' : '1px solid transparent'");
content = content.replace(/background:\s*active \? 'white' : 'transparent'/g, "background: active ? 'rgba(255,255,255,0.05)' : 'transparent'");

fs.writeFileSync('src/pages/MyCoachingPage.jsx', content, 'utf8');
console.log('Theme applied successfully!');
