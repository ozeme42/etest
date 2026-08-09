const fs = require('fs');

let content = fs.readFileSync('src/pages/MyCoachingPage.jsx', 'utf8');

// Replace dark #090d16 with #1e293b
content = content.replace(/background:\s*#090d16/g, "background: #1e293b");

// Update DASH_CSS hero gradients (if any exist in MyCoachingPage)
content = content.replace(/rgba\(30, 27, 75, 0\.8\), rgba\(15, 23, 42, 0\.9\)/g, "rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.9)");

// Replace modal background #0f172a with #334155
content = content.replace(/rgba\(15, 23, 42, 0\.75\)/g, "rgba(51, 65, 85, 0.75)"); // mostly for backdrop filters
content = content.replace(/rgba\(15,23,42,0\.6\)/g, "rgba(51, 65, 85, 0.6)");
content = content.replace(/background:\s*'#0f172a'/g, "background: '#334155'");

fs.writeFileSync('src/pages/MyCoachingPage.jsx', content, 'utf8');
console.log('MyCoachingPage theme updated successfully!');
