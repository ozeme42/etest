const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\oku_max_fen_5.html', 'utf8');

const cleanHtml = html.replace(/<script type="application\/octet-stream" id="d">[\s\S]*?<\/script>/, '<!-- SCRIPT D -->');
console.log(cleanHtml.slice(3000));
