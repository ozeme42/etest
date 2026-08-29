
const extractPageNumbers = (str) => {
  if (!str || typeof str !== 'string') return null;
  const match = str.match(/(\d+)\s*[-–/]\s*(\d+)/);
  if (match) return \\-\\;
  const singleMatch = str.match(/sayfa\s*(\d+)/i) || str.match(/(\d+)\.\s*sayfa/i);
  if (singleMatch) return singleMatch[1];
  return null;
};

const targetTest = {
  id: '7462745f-756c-456a-a271-365f6d743932',
  name: '37-38. Sayfa 2. Ünite - PARAGRAF TEST - 5',
  subject: 'Türkçe',
};

const s = {
  testId: '7462745f-6b34-4568-a472-795f6d743933',
  title: '37-38. Sayfa 2. Ünite - PARAGRAF TEST - 5',
  subject: 'Türkçe',
};

const tName = String(targetTest.name).toLowerCase().trim();
const sTitle = String(s.title).toLowerCase().trim();

const targetPages = extractPageNumbers(targetTest.name);
const subPages = extractPageNumbers(s.title);

console.log('Target pages:', targetPages);
console.log('Sub pages:', subPages);
console.log('Match?', targetPages === subPages);

