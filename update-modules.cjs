const fs = require('fs');
let code = fs.readFileSync('src/pages/MyCoachingPage.jsx', 'utf8');

const replacements = [
  // Backgrounds
  [/'#f8fafc'/g, "'rgba(255, 255, 255, 0.03)'"],
  [/'#f0fdf4'/g, "'rgba(16, 185, 129, 0.1)'"],
  [/'white'/g, "'rgba(255, 255, 255, 0.04)'"],
  [/: 'white'/g, ": '#ffffff'"], // Restore some text that was replaced by previous rule
  [/: 'rgba\\(255, 255, 255, 0\\.04\\)'/g, ": 'rgba(255, 255, 255, 0.04)'"], // Fix any double replacements
  
  // Borders
  [/'#e2e8f0'/g, "'rgba(255, 255, 255, 0.08)'"],
  [/'#bbf7d0'/g, "'rgba(16, 185, 129, 0.3)'"],
  [/'#cbd5e1'/g, "'rgba(255, 255, 255, 0.2)'"],
  [/'#86efac'/g, "'rgba(16, 185, 129, 0.4)'"],
  
  // Text Colors
  [/'#374151'/g, "'#f1f5f9'"],
  [/'#166534'/g, "'#34d399'"],
  [/'#3730a3'/g, "'#a5b4fc'"],
  [/'#1e293b'/g, "'#f1f5f9'"], // If any dark text was left for headings
  
  // Specific fix for the "white" replacement which might break color: 'white'
  [/color:\s*'rgba\(255, 255, 255, 0\.04\)'/g, "color: '#ffffff'"],
];

for (const [regex, replacement] of replacements) {
  code = code.replace(regex, replacement);
}

// Special case: The Tip component has a dark text color
code = code.replace(/color:\s*'#3730a3'/g, "color: '#a5b4fc'");

fs.writeFileSync('src/pages/MyCoachingPage.jsx', code, 'utf8');
console.log('MyCoachingPage internal components updated to Soft Twilight!');
