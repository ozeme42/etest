/**
 * remedialSpacedRepetitionService.js
 * Teacher-assigned remedial test spaced repetition & 100% mastery tracking engine.
 */

export const REPETITION_PRESETS = [
  { id: 'standard_leitner', label: 'Standart Leitner (Bugün, 3, 7, 15 Gün)', intervals: [0, 3, 7, 15], icon: '🧠' },
  { id: 'fast_repetition', label: 'Hızlı Pekiştirme (Bugün, 2, 4, 7 Gün)', intervals: [0, 2, 4, 7], icon: '⚡' },
  { id: 'weekly_repetition', label: 'Haftalık Tekrar (Bugün, 5, 10, 20 Gün)', intervals: [0, 5, 10, 20], icon: '📅' }
];

const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];

/**
 * Schedule remedial test into student weekly coaching profile program.
 */
export function scheduleRemedialTestInProgram({
  currentWeeklyProgram = [],
  testItem,
  intervals = [0, 3, 7, 15],
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
    const targetDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + intervalDays, 12, 0, 0);
    const targetDayIdx = (todayIdx + intervalDays) % 7;
    const targetDayKey = DAYS_LIST[targetDayIdx];
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    const newItem = {
      id: `remedial_stage_${testItem.id}_${stageNum}_${Date.now()}`,
      text: `👨‍🏫 [${stageNum}. Tekrar (${intervalDays === 0 ? 'Bugün' : intervalDays + 'g'})] ${testItem.title || testItem.name || 'Özel Telafi Testi'}`,
      title: testItem.title || testItem.name || 'Özel Telafi Testi',
      topic: `[${stageNum}. Tekrar] ${testItem.title || testItem.name || 'Özel Telafi Testi'}`,
      subject: testItem.subject || 'Genel',
      qCount: testItem.questionCount || testItem.totalQuestions || testItem.questionsList?.length || 1,
      targetCount: testItem.questionCount || testItem.totalQuestions || testItem.questionsList?.length || 1,
      questionCount: testItem.questionCount || testItem.totalQuestions || testItem.questionsList?.length || 1,
      testId: testItem.id,
      realTestId: testItem.id,
      hwId: testItem.hwId || testItem.id,
      type: 'remedialTest',
      taskType: 'remedialTest',
      isTeacherRemedial: true,
      isRemedial: true,
      isRemedialTest: true,
      stage: stageNum,
      totalStages: intervals.length,
      intervalDays,
      done: false,
      targetDayKey,
      scheduledDate: dateStr,
      singleDate: dateStr,
      specificDate: dateStr,
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
 * Determines if a specific remedial test repetition stage is completed.
 * Rule:
 * 1. If student reached 100% correct (0 mistakes), isMastered = true and ALL stages are done.
 * 2. Otherwise, Stage N is completed only if total valid attempts >= N.
 */
export function isRemedialStageDone(item, submissions = [], studentId = null) {
  if (!item) return false;
  const specificTestId = item.testId || item.realTestId || item.bookTestId || item.hwId || item.id;
  if (!specificTestId) return false;

  const tIdStr = String(specificTestId);
  const studentIdStr = studentId ? String(studentId) : '';

  const matchingSubs = (submissions || []).filter(s => {
    if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
    if (studentIdStr) {
      const sId = String(s.studentId || s.student_id || s.userId || s.user_id || '');
      if (sId && sId !== studentIdStr) return false;
    }

    const subFields = [
      s.testId,
      s.test_id,
      s.hwId,
      s.realTestId,
      s.bookTestId,
      s.id,
      s.metadata?.realTestId,
      s.metadata?.bookTestId,
      s.metadata?.realId,
      s.metadata?.testId
    ].filter(Boolean).map(String);

    return subFields.some(sf => sf && (
      sf === tIdStr ||
      sf === tIdStr.replace(/^bt_|^q_|^hw_/, '') ||
      (item.title && s.testTitle && s.testTitle.toLowerCase().trim() === String(item.title).toLowerCase().trim())
    ));
  });

  const targetStage = Number(item.stage || 1);
  const solveCount = matchingSubs.length;

  if (solveCount === 0) return false;

  // Check 100% Mastery
  const isMastered = matchingSubs.some(s => {
    const corr = Number(s.correctCount ?? s.correct ?? 0);
    const tot = Number(s.totalQuestions ?? s.total ?? 0);
    return tot > 0 && corr === tot;
  });

  if (isMastered) return true;
  return solveCount >= targetStage;
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
