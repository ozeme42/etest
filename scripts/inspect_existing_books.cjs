const fs = require('fs');

const backup = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
const data = backup[0].backup_data;
const books = data.tracked_books || [];

books.forEach(b => {
  console.log('-----------------------------------------');
  console.log(`Book: ${b.title} (ID: ${b.id})`);
  console.log(`Publisher: ${b.publisher}, pdf_url: "${b.pdf_url}"`);
  const tests = (data.tracked_book_tests || []).filter(t => t.book_id === b.id);
  const mc = tests.filter(t => !t.answer_key || !t.answer_key.__meta || !t.answer_key.__meta.isOpenEnded);
  const open = tests.filter(t => t.answer_key && t.answer_key.__meta && t.answer_key.__meta.isOpenEnded);
  console.log(`Total tests: ${tests.length} (MC: ${mc.length}, Open: ${open.length})`);
  if (b.subjects) {
    b.subjects.forEach(s => {
      console.log(`  Subject: ${s.name} (${s.topics ? s.topics.length : 0} topics)`);
      if (s.topics) {
        s.topics.slice(0, 3).forEach(top => {
          const tCount = tests.filter(t => t.topic_id === top.id).length;
          console.log(`    Topic: ${top.name} (id: ${top.id}, tests: ${tCount})`);
        });
      }
    });
  }
});
