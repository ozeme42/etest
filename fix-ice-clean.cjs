const fs = require('fs');
const { execSync } = require('child_process');

// 1. Restore everything to clean HEAD
execSync('git restore src/pages/MyCoachingPage.jsx src/pages/StudentDashboard.jsx src/App.css src/index.css');

// 2. Update index.css for global Ice Theme
let indexCss = fs.readFileSync('src/index.css', 'utf8');
indexCss = indexCss.replace(/body\s*{[^}]+}/, `body {
  font-family: 'Outfit', sans-serif;
  background-color: var(--color-bg);
  background-image: 
    radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.08) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.05) 0px, transparent 50%);
  background-attachment: fixed;
  color: var(--color-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`);
fs.writeFileSync('src/index.css', indexCss, 'utf8');

// 3. Update App.css for Sidebar
let appCss = fs.readFileSync('src/App.css', 'utf8');
appCss = appCss.replace(/background-color:\s*#1e293b;/g, 'background-color: rgba(255, 255, 255, 0.6); backdrop-filter: blur(20px); border-right: 1px solid rgba(255,255,255,0.8);');
appCss = appCss.replace(/color:\s*#f8fafc;/g, 'color: #0f172a;');
appCss = appCss.replace(/color:\s*#cbd5e1;/g, 'color: #64748b;');
appCss = appCss.replace(/background-color:\s*#334155;/g, 'background-color: rgba(99, 102, 241, 0.1); color: #6366f1;');
appCss = appCss.replace(/color:\s*#fff;/g, 'color: #0f172a;');
fs.writeFileSync('src/App.css', appCss, 'utf8');

// 4. Update Pages
function applyFrostedGlass(file) {
  let c = fs.readFileSync(file, 'utf8');
  
  // Transform hardcoded light theme colors to Frosted Glass equivalents
  c = c.replace(/background:\s*'white'/g, "background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)'");
  c = c.replace(/background:\s*'#ffffff'/g, "background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)'");
  c = c.replace(/background:\s*'#f8fafc'/g, "background: 'rgba(255, 255, 255, 0.5)'");
  c = c.replace(/background:\s*'#f1f5f9'/g, "background: 'rgba(255, 255, 255, 0.6)'");
  
  // Soften borders
  c = c.replace(/border:\s*'1px solid #e2e8f0'/g, "border: '1px solid rgba(255,255,255,1)'");
  c = c.replace(/border:\s*'2px solid #f1f5f9'/g, "border: '1px solid rgba(255,255,255,0.8)'");
  
  // Drop shadows
  c = c.replace(/boxShadow:\s*'0 2px 12px rgba\(0,0,0,0.05\)'/g, "boxShadow: '0 10px 30px -10px rgba(30,41,59,0.06)'");

  fs.writeFileSync(file, c, 'utf8');
}

applyFrostedGlass('src/pages/StudentDashboard.jsx');
applyFrostedGlass('src/pages/MyCoachingPage.jsx');

console.log('Successfully restored clean code and applied global Frosted Glass theme.');
