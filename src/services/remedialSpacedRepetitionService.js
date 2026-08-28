/**
 * remedialSpacedRepetitionService.js
 * Teacher-assigned remedial test spaced repetition & 100% mastery tracking engine.
 */

export const REPETITION_PRESETS = [
  { id: 'standard_leitner', label: 'Standart Leitner (1, 3, 7, 15 Gün)', intervals: [1, 3, 7, 15], icon: '🧠' },
  { id: 'fast_repetition', label: 'Hızlı Pekiştirme (1, 2, 4, 7 Gün)', intervals: [1, 2, 4, 7], icon: '⚡' },
  { id: 'weekly_repetition', label: 'Haftalık Tekrar (2, 5, 10, 20 Gün)', intervals: [2, 5, 10, 20], icon: '📅' }
];

const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];

/**
 * Schedule remedial test into student weekly coaching profile program.
 */
export function scheduleRemedialTestInProgram({
  currentWeeklyProgram = [],
  testItem,
  intervals = [1, 3, 7, 15],
  startDate = new Date(),
  studentId
}) {
  const rawProg = Array.isArray(currentWeeklyProgram) && currentWeeklyProgram.length === 7
    ? currentWeeklyProgram
    : DAYS_LIST.map(d => ({ day: d, items: [] }));

  const todayIdx = (startDate.getDay() + 6) % 7; // 0 for Pzt, 6 for Paz
  let updatedProg = JSON.parse(JSON.stringify(rawProg));

  intervals.forEach((intervalDays, idx) => {
    const stageNum = idx + 1;
    const targetDate = new Date(startDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    const targetDayIdx = (todayIdx + intervalDays) % 7;
    const targetDayKey = DAYS_LIST[targetDayIdx];
    const dateStr = targetDate.toISOString().split('T')[0];

    const newItem = {
      id: `remedial_stage_${testItem.id}_${stageNum}_${Date.now()}`,
      text: `👨‍🏫 [${stageNum}. Tekrar (${intervalDays}g)] ${testItem.title || testItem.name || 'Özel Telafi Testi'}`,
      subject: testItem.subject || 'Genel',
      qCount: testItem.questionCount || testItem.totalQuestions || testItem.questionsList?.length || 1,
      targetCount: testItem.questionCount || testItem.totalQuestions || testItem.questionsList?.length || 1,
      testId: testItem.id,
      type: 'remedialTest',
      isTeacherRemedial: true,
      stage: stageNum,
      totalStages: intervals.length,
      intervalDays,
      done: false,
      date: dateStr
    };

    updatedProg = updatedProg.map(dObj => {
      if (dObj.day === targetDayKey) {
        // Prevent exact duplicate items
        const existingItems = dObj.items || [];
        const isDuplicate = existingItems.some(it => it.testId === testItem.id && it.stage === stageNum);
        if (!isDuplicate) {
          return {
            ...dObj,
            items: [...existingItems, newItem]
          };
        }
      }
      return dObj;
    });
  });

  return updatedProg;
}

/**
 * Compute student mastery progression for a teacher-assigned remedial test.
 */
export function getRemedialTestMasteryStatus(test, submissions = []) {
  if (!test) return null;

  const testSubmissions = (submissions || []).filter(sub => {
    return String(sub.testId) === String(test.id) ||
           String(sub.hwId) === String(test.id) ||
           String(sub.id) === String(test.id) ||
           (test.title && sub.testTitle && sub.testTitle.toLowerCase().trim() === test.title.toLowerCase().trim());
  }).sort((a, b) => new Date(a.submittedAt || a.createdAt || 0) - new Date(b.submittedAt || b.createdAt || 0));

  const totalQuestions = Number(test.questionCount || test.totalQuestions || test.questionsList?.length || 10);
  const solveCount = testSubmissions.length;
  const isSolved = solveCount > 0;

  let currentScorePct = 0;
  let latestCorrect = 0;
  let latestWrong = 0;
  let latestBlank = 0;

  if (isSolved) {
    const latestSub = testSubmissions[testSubmissions.length - 1];
    latestCorrect = latestSub.correctCount ?? (latestSub.correct || 0);
    latestWrong = latestSub.wrongCount ?? (latestSub.wrong || 0);
    latestBlank = latestSub.blankCount ?? (latestSub.emptyCount || 0);
    const totalCalc = latestSub.totalQuestions || (latestCorrect + latestWrong + latestBlank) || totalQuestions;
    currentScorePct = totalCalc > 0 ? Math.min(100, Math.round((latestCorrect / totalCalc) * 100)) : 0;
  }

  const isMastered = currentScorePct === 100 && isSolved;
  const stageLevel = Math.min(5, Math.max(1, solveCount + 1));

  return {
    testId: test.id,
    title: test.title || test.name || 'Telafi Testi',
    subject: test.subject || 'Ders',
    totalQuestions,
    solveCount,
    isSolved,
    isMastered,
    stageLevel,
    currentScorePct,
    latestCorrect,
    latestWrong,
    latestBlank,
    submissions: testSubmissions,
    intervals: test.repetitionIntervals || [1, 3, 7, 15],
    teacherAssigned: test.teacherAssigned || test.createdBy === 'teacher' || Boolean(test.assignedTeacherId)
  };
}
