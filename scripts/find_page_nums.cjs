const fs = require('fs');

const searchJsPath = 'C:\\Users\\mahmut\\.gemini\\antigravity\\brain\\602e7fcd-8fa0-4825-8afe-e3d07dddec13\\scratch\\sosyal_search.js';
const content = fs.readFileSync(searchJsPath, 'binary');

const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
let match;
const pages = [];
while ((match = regex.exec(content)) !== null) {
  pages.push(Buffer.from(match[1], 'latin1').toString('utf8'));
}

// Map each Pekiştiriyorum to its page number (1 to 260)
for (let pNum = 1; pNum <= 87; pNum++) {
  const padNum = pNum < 10 ? '0' + pNum : '' + pNum;
  const target1 = `Pekiştiriyorum ${padNum}`;
  const target2 = `Pekiştiriyorum ${pNum}`;
  let foundPage = -1;
  for (let i = 0; i < 260; i++) {
    if (pages[i].includes(target1) || pages[i].includes(target2)) {
      foundPage = i + 1;
      break;
    }
  }
  if (foundPage !== -1) {
    // console.log(`Pekiştiriyorum ${padNum} -> Page ${foundPage}`);
  } else {
    // console.log(`Pekiştiriyorum ${padNum} -> NOT FOUND in pages 1-260`);
  }
}

// Check GELİŞTİRİYORUM test pages:
for (let g = 1; g <= 21; g++) {
  let foundPage = -1;
  for (let i = 0; i < 260; i++) {
    if (pages[i].includes(`GELİŞTİRİYORUM - ${g}`) || pages[i].includes(`GELİŞTİRİYORUM - 0${g}`) || pages[i].includes(`Geliştiriyorum - ${g}`)) {
      foundPage = i + 1;
      break;
    }
  }
  console.log(`GELİŞTİRİYORUM ${g} -> Page ${foundPage}`);
}
