const fs = require('fs');

function cleanTurkish(str) {
  if (!str) return '';
  return str
    .replace(/Åž/g, 'Ş').replace(/ÅŸ/g, 'ş')
    .replace(/Ä°/g, 'İ').replace(/Ä±/g, 'ı')
    .replace(/Ã‡/g, 'Ç').replace(/Ã§/g, 'ç')
    .replace(/Ã–/g, 'Ö').replace(/Ã¶/g, 'ö')
    .replace(/Ãœ/g, 'Ü').replace(/Ã¼/g, 'ü')
    .replace(/Äž/g, 'Ğ').replace(/ÄŸ/g, 'ğ')
    .replace(/â€œ/g, '"').replace(/â€/g, '"')
    .replace(/â€™/g, "'")
    .replace(/âœ“/g, '✓').replace(/âœ—/g, '✗')
    .replace(/â†’/g, '→').replace(/âˆ’/g, '-');
}

for (let i = 1; i <= 6; i++) {
  const file = `C:/Users/mahmut/.gemini/antigravity/brain/602e7fcd-8fa0-4825-8afe-e3d07dddec13/scratch/fas_${i}_open_ended.txt`;
  const raw = fs.readFileSync(file, 'utf8');
  const cleaned = cleanTurkish(raw);
  fs.writeFileSync(`C:/Users/mahmut/.gemini/antigravity/brain/602e7fcd-8fa0-4825-8afe-e3d07dddec13/scratch/fas_${i}_clean.txt`, cleaned, 'utf8');
  console.log(`Fasikül ${i} cleaned, length:`, cleaned.length);
}
