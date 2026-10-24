const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\incele_fen.html', 'utf8');

// Look for ebook, uzmankariyer, flip, iframe, 5_max, etc.
const matches = html.match(/https?:\/\/[^\s"']+/gi) || [];
const uniqueLinks = Array.from(new Set(matches));
console.log('Unique absolute links:', uniqueLinks.filter(l => l.includes('hiper') || l.includes('uzman') || l.includes('ebook') || l.includes('fen')));

// Also look for JavaScript variables or relative paths
const relativeMatches = html.match(/['"][^'"]*(?:fen|max|ebook|flip|mobile)[^'"]*['"]/gi) || [];
console.log('Relative matches:', Array.from(new Set(relativeMatches)).slice(0, 30));
