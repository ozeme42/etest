
const fs = require('fs');
let code = fs.readFileSync('src/utils/testResolver.js', 'utf8');
code = code.replace(/export /g, '');
eval(code);

const targetTest = {
  id: '7462745f-756c-456a-a271-365f6d743932',
  name: '37-38. Sayfa 2. Ünite - PARAGRAF TEST - 5',
  subject: 'Türkçe'
};

const s = {
  testId: '7462745f-6b34-4568-a472-795f6d743933',
  bookTestId: '7462745f-6b34-4568-a472-795f6d743933',
  subject: 'Türkçe',
  title: '37-38. Sayfa 2. Ünite - PARAGRAF TEST - 5'
};

console.log('Match?', isSubmissionMatchingBookTest(s, targetTest, [], []));

