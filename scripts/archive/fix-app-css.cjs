const fs = require('fs');

let css = fs.readFileSync('src/App.css', 'utf8');

// Sidebar and Mobile Header backgrounds and borders
css = css.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.8\);/g, 'background: #1e293b;');
css = css.replace(/border-right:\s*1px solid rgba\(0,\s*0,\s*0,\s*0\.05\);/g, 'border-right: 1px solid #334155;');
css = css.replace(/border-bottom:\s*1px solid rgba\(0,\s*0,\s*0,\s*0\.05\);/g, 'border-bottom: 1px solid #334155;');
css = css.replace(/background-color:\s*var\(--color-background\);/g, 'background-color: var(--color-bg);');

// Nav Links
css = css.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.02\);/g, 'background: rgba(255, 255, 255, 0.05);');
css = css.replace(/background:\s*rgba\(236,\s*72,\s*153,\s*0\.08\);/g, 'background: rgba(79, 70, 229, 0.15);');
css = css.replace(/color:\s*#db2777;/g, 'color: #818cf8;'); // Active icon/text color

// Scrollbar
css = css.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.1\);/g, 'background: rgba(255, 255, 255, 0.1);');
css = css.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.2\);/g, 'background: rgba(255, 255, 255, 0.2);');

fs.writeFileSync('src/App.css', css, 'utf8');
console.log('App.css fixed for Dark Theme');
