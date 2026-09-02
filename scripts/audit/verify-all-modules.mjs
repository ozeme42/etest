import { 
  isExamBook, 
  isStandardOrMixedBook, 
  isSubmissionMatchingBookTest 
} from '../../src/utils/testResolver.js';

import { 
  checkIsAnswerCorrect, 
  formatAnswerLetter, 
  normalizeAnswerIndex,
  compareOpenEndedAnswers 
} from '../../src/utils/answerEvaluation.js';

import { 
  parseAnswerKeyString, 
  sortTestsNaturally, 
  toUUID 
} from '../../src/features/book-management/constants/bookHelpers.js';

import { 
  getRemedialTestMasteryStatus,
  isRemedialStageDone,
  scheduleRemedialTestInProgram,
  getRemedialLockStatus,
  REPETITION_PRESETS 
} from '../../src/services/remedialSpacedRepetitionService.js';

import { 
  computeStudentGamificationData 
} from '../../src/services/gamificationService.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 eTest UÇTAN UCA TÜM MODÜLLER SAĞLIK VE YAŞAM DÖNGÜSÜ TESTİ');
console.log('═══════════════════════════════════════════════════════════════\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [BAŞARILI] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [HATA] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// MODÜL 1: KİTAP & TAKİP EDİLEN KİTAP TESTLERİ
// ─────────────────────────────────────────────────────────────
console.log('📚 MODÜL 1: Kitap & Takip Edilen Testler Denetimi...');

// 1.1 Kitap Tipi Ayrımı (Standard vs Exam)
const standardBook = { id: 'book_1', title: '4. Sınıf Matematik Soru Bankası', publisher: 'Bilgi', bookType: 'standard' };
const examBook = { id: 'exam_1', title: 'LGS 1. Deneme Sınavı', publisher: 'LGS', bookType: 'exam', penaltyRatio: 0.33 };

assert(isStandardOrMixedBook(standardBook) === true, 'Standart kitap doğru sınıflandırıldı');
assert(isExamBook(standardBook) === false, 'Standart kitap deneme sınavı olarak algılanmadı');
assert(isExamBook(examBook) === true, 'Deneme sınavı doğru tespit edildi');
assert(isStandardOrMixedBook(examBook) === false, 'Deneme sınavı standart kitap listesine karışmadı');

// 1.2 Cevap Anahtarı Ayrıştırma (Parse Answer Key)
const answerKeyRaw = '1:A 2:B 3:C 4:D 5:E';
const parsedKey = parseAnswerKeyString(answerKeyRaw);
assert(parsedKey['1'] === 'A' || parsedKey[1] === 'A', '1. soru cevabı A olarak ayrıştırıldı');
assert(parsedKey['5'] === 'E' || parsedKey[5] === 'E', '5. soru cevabı E olarak ayrıştırıldı');

// 1.3 Doğru/Yanlış Karşılaştırması & Puanlama
const qSample = { correctAnswer: 'A' };
assert(checkIsAnswerCorrect('A', qSample, {}, 1) === true, 'Doğru şık eşleşmesi doğrulandı');
assert(checkIsAnswerCorrect('B', qSample, {}, 1) === false, 'Yanlış şık eşleşmesi tespit edildi');
assert(checkIsAnswerCorrect('', qSample, {}, 1) === null, 'Boş cevap null olarak tespit edildi');

// 1.4 Test İlerlemesi ve Eşleştirme (Submission Matching)
const mockBookTest = { id: 'bt_101', bookId: 'book_1', name: 'Test 1' };
const mockSubmission = { testId: 'bt_101', bookId: 'book_1', status: 'completed', score: 85 };
assert(isSubmissionMatchingBookTest(mockSubmission, mockBookTest) === true, 'Çözülen test ile kitap testi eşleşti');


// ─────────────────────────────────────────────────────────────
// MODÜL 2: SORU BANKASI & AÇIK UÇLU / KLASİK SORULAR
// ─────────────────────────────────────────────────────────────
console.log('\n📝 MODÜL 2: Soru Bankası & Değerlendirme Denetimi...');

// 2.1 Çoktan Seçmeli Normalizasyon
assert(formatAnswerLetter(0) === 'A', 'Index 0 harf karşılığı A');
assert(formatAnswerLetter(3) === 'D', 'Index 3 harf karşılığı D');
assert(normalizeAnswerIndex('A') === 0, 'A harfi index 0 olarak dönüştürüldü');
assert(normalizeAnswerIndex('C') === 2, 'C harfi index 2 olarak dönüştürüldü');

// 2.2 Açık Uçlu / Metin Karşılaştırması (Open-Ended Evaluation)
assert(compareOpenEndedAnswers('Ankara', 'ankara') === true, 'Büyük/küçük harf toleranslı açık uçlu eşleşti');
assert(compareOpenEndedAnswers('25 km/s', '25  km/s') === true, 'Fazla boşluklu metin doğru kabul edildi');
assert(compareOpenEndedAnswers('İstanbul', 'Ankara') === false, 'Farklı metinler doğru reddedildi');

// 2.3 UUID Dönüştürme Sağlamlığı
const stringId = 'q_custom_test_123';
const uuid1 = toUUID(stringId);
const uuid2 = toUUID(stringId);
assert(uuid1 === uuid2, 'toUUID deterministik ve tutarlı');
assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid1), 'UUID formatı geçerli');


// ─────────────────────────────────────────────────────────────
// MODÜL 3: ÖDEV YÖNETİMİ & TARİH HESAPLAMA
// ─────────────────────────────────────────────────────────────
import { getTurkeyYMD } from '../../src/utils/dateHelpers.js';

const todayYMD = getTurkeyYMD(new Date());
const tomorrowYMD = getTurkeyYMD(new Date(Date.now() + 24 * 60 * 60 * 1000));
const yesterdayYMD = getTurkeyYMD(new Date(Date.now() - 24 * 60 * 60 * 1000));

function getDueStatus(dueDate) {
  if (!dueDate) return 'no_date';
  const target = getTurkeyYMD(dueDate);
  const today = getTurkeyYMD(new Date());
  if (target < today) return 'overdue';
  if (target === today) return 'due_today';
  return 'upcoming';
}

assert(getDueStatus(yesterdayYMD) === 'overdue', 'Dünkü ödev Gecikmiş olarak tespit edildi');
assert(getDueStatus(tomorrowYMD) === 'upcoming', 'Yarınki ödev Yaklaşan olarak tespit edildi');
assert(getDueStatus(todayYMD) === 'due_today', 'Bugünkü ödev Bugün Teslim Edilecek olarak tespit edildi');


// ─────────────────────────────────────────────────────────────
// MODÜL 4: TELAFİ & ARALIKLI TEKRAR SİSTEMİ (SPACED REPETITION)
// ─────────────────────────────────────────────────────────────
console.log('\n🎯 MODÜL 4: Telafi ve Aralıklı Tekrar Sistemi Denetimi...');

// 4.1 Aşama ve Ustalık Hesaplama
const sampleRemedialTest = {
  id: 'rem_1',
  title: 'Matematik Kesirler Telafi',
  questionCount: 10
};
const sampleRemSubmissions = [
  { testId: 'rem_1', correctCount: 10, wrongCount: 0, emptyCount: 0, totalQuestions: 10, createdAt: new Date().toISOString() }
];

const masteryObj = getRemedialTestMasteryStatus(sampleRemedialTest, sampleRemSubmissions);
assert(masteryObj.isMastered === true, 'Tam doğru yapan öğrencinin testi ustalık (%100) olarak belirlendi');
assert(masteryObj.currentScorePct === 100, 'Puan %100 hesaplandı');

const stageDone = isRemedialStageDone({ testId: 'rem_1', stage: 1 }, sampleRemSubmissions);
assert(stageDone === true, 'Telafi aşamasının tamamlandığı doğrulandı');

// 4.2 Çizelgeleme (scheduleRemedialTestInProgram)
const initialWeekly = [
  { day: 'Pzt', items: [] }, { day: 'Sal', items: [] }, { day: 'Çrş', items: [] },
  { day: 'Prş', items: [] }, { day: 'Cum', items: [] }, { day: 'Cts', items: [] }, { day: 'Paz', items: [] }
];
const updatedProg = scheduleRemedialTestInProgram({
  currentWeeklyProgram: initialWeekly,
  testItem: sampleRemedialTest,
  intervals: [0, 3, 7, 15],
  startDate: new Date(),
  studentId: 'st_1'
});
const totalScheduledItems = updatedProg.reduce((acc, d) => acc + d.items.length, 0);
assert(totalScheduledItems === 4, 'Aralıklı tekrar programına 4 aşama eksiksiz yerleştirildi');

// 4.3 Gelecek Tarih Kilitleme (getRemedialLockStatus)
const todayTask = {
  type: 'remedialTest',
  testId: 'rem_1',
  stage: 1,
  scheduledDate: todayYMD
};
const futureTask = {
  type: 'remedialTest',
  testId: 'rem_1',
  stage: 2,
  scheduledDate: tomorrowYMD
};

const todayLock = getRemedialLockStatus(todayTask, todayYMD, [], 'st_1');
assert(todayLock.isLocked === false, 'Günü gelen telafi testi öğrenciye çözülebilir olarak açıldı');

const futureLock = getRemedialLockStatus(futureTask, todayYMD, [], 'st_1');
assert(futureLock.isLocked === true, 'Günü gelmemiş aralıklı tekrar testi erkenden çözülmeye karşı kilitlendi');
assert(futureLock.daysLeft >= 1, `Kalan gün sayısı doğru hesaplandı: ${futureLock.daysLeft} gün`);

// 4.4 Ustalık Elde Edildiğinde Kilit Açma
const masteredFutureLock = getRemedialLockStatus(futureTask, todayYMD, sampleRemSubmissions, 'st_1');
assert(masteredFutureLock.isLocked === false, 'Önceki denemede %100 yapan öğrenci için gelecek tekrar serbest bırakıldı');


// ─────────────────────────────────────────────────────────────
// MODÜL 5: OYUNLAŞTIRMA & SEVİYE SİSTEMİ (GAMIFICATION)
// ─────────────────────────────────────────────────────────────
console.log('\n🎮 MODÜL 5: Oyunlaştırma ve İlerleme Sistemi Denetimi...');

const studentMock = { id: 'u_student_1', name: 'Ahmet Yılmaz' };
const submissionsMock = [
  { studentId: 'u_student_1', score: 100, correctCount: 10, wrongCount: 0, emptyCount: 0, createdAt: new Date().toISOString() },
  { studentId: 'u_student_1', score: 80, correctCount: 8, wrongCount: 2, emptyCount: 0, createdAt: new Date().toISOString() }
];

const gData = computeStudentGamificationData({
  studentId: studentMock.id,
  submissions: submissionsMock,
  homeworks: [],
  books: [],
  bookTests: [],
  mockExams: [],
  studySessions: []
});

assert(gData.levelInfo && gData.levelInfo.level >= 1, `Seviye hesaplandı: Seviye ${gData.levelInfo?.level} (${gData.levelInfo?.title})`);
assert(gData.xp > 0, `XP puanı üretildi: ${gData.xp} XP`);
assert(Array.isArray(gData.unlockedBadges), 'Rozetler listesi oluşturuldu');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`🎉 TÜM MODÜL DENETİMİ TAMAMLANDI: ${passedTests}/${totalTests} ADIM EKSİKSİZ BAŞARILI!`);
console.log('═══════════════════════════════════════════════════════════════\n');
