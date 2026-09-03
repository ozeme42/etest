import { toUUID } from './supabaseService';

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
  const tClean = tIdStr.replace(/^bt_|^q_|^hw_/, '');
  const tUuid = toUUID(specificTestId);
  const itemTitle = String(item.title || item.name || '').toLowerCase().trim();
  const studentIdStr = studentId ? String(studentId) : '';
  const studentUuid = studentId ? String(toUUID(studentId) || '') : '';

  const matchingSubs = (submissions || []).filter(s => {
    if (!s) return false;
    const sId = String(s.id || '');
    const suId = String(s.supabaseId || '');
    const answersArr = Array.isArray(s.answers) ? s.answers : [];
    const meta = answersArr.find(a => a?.type === 'metadata') || {};
    const realId = String(meta.realId || s.realId || '');
    
    if (s.status === 'in_progress' || s.status === 'draft' || meta.status === 'in_progress') return false;
    if (sId.startsWith('draft_') || sId.startsWith('64726166') || suId.startsWith('64726166') || realId.startsWith('draft_')) return false;

    if (studentIdStr) {
      const sStdId = String(s.studentId || s.student_id || s.userId || s.user_id || '');
      if (sStdId && sStdId !== studentIdStr && (!studentUuid || sStdId !== studentUuid)) return false;
    }

    const subFields = [
      s.testId,
      s.test_id,
      s.hwId,
      s.homeworkId,
      s.realTestId,
      s.bookTestId,
      s.id,
      s.supabaseId,
      meta.realTestId,
      meta.bookTestId,
      meta.realId,
      meta.testId
    ].filter(Boolean).map(String);

    const idMatches = subFields.some(sf => sf === tIdStr || sf === tClean || (tUuid && sf === tUuid));
    const subTitle = (s.testTitle || s.title || s.test_title || meta.testTitle || '').toLowerCase().trim();
    const titleMatches = Boolean(itemTitle && subTitle && subTitle === itemTitle);

    return idMatches || titleMatches;
  });

  const targetStage = Number(item.stage || 1);
  const solveCount = matchingSubs.length;

  if (solveCount === 0) return false;

  // Check 100% Mastery
  const isMastered = matchingSubs.some(s => {
    const corr = Number(s.correctCount ?? s.correct_count ?? s.correct ?? 0);
    const tot = Number(s.totalQuestions ?? (corr + Number(s.wrongCount ?? s.wrong_count ?? s.wrong ?? 0)));
    const score = Number(s.score || 0);
    return (tot > 0 && corr === tot) || score === 100;
  });

  if (isMastered) return true;
  return solveCount >= targetStage;
}

/**
 * Compute student mastery progression for a teacher-assigned remedial test.
 */
export function getRemedialTestMasteryStatus(test, submissions = []) {
  if (!test) return null;

  const rawIds = [
    test.id,
    test.hwId,
    test.testId,
    test.realTestId,
    test.bookTestId,
    test.questionId,
    test.supabaseId,
    ...(test.allIds || [])
  ].filter(Boolean).map(String);

  const testIdSet = new Set(rawIds);
  rawIds.forEach(id => {
    testIdSet.add(id.replace(/^bt_|^q_|^hw_/, ''));
    const uuidVal = toUUID(id);
    if (uuidVal) testIdSet.add(String(uuidVal));
  });

  const cleanTestTitle = (test.title || test.name || '').toLowerCase().trim();

  // Helper to detect if a submission is an unfinished draft
  const isDraftSub = (s) => {
    if (!s) return true;
    const sId = String(s.id || '');
    const suId = String(s.supabaseId || '');
    const answersArr = Array.isArray(s.answers) ? s.answers : [];
    const meta = answersArr.find(a => a?.type === 'metadata') || {};
    const realId = String(meta.realId || s.realId || '');
    
    if (s.status === 'in_progress' || s.status === 'draft' || meta.status === 'in_progress') return true;
    if (sId.startsWith('draft_') || sId.startsWith('64726166') || suId.startsWith('64726166') || realId.startsWith('draft_')) {
      const hasAnswers = answersArr.some(a => a?.type !== 'metadata' && a?.userAnswer !== null && a?.userAnswer !== undefined);
      const hasCounts = (Number(s.correctCount ?? s.correct_count ?? s.correct ?? 0) + Number(s.wrongCount ?? s.wrong_count ?? s.wrong ?? 0)) > 0;
      if (!hasAnswers && !hasCounts) return true;
      if (s.status === 'in_progress' || meta.status === 'in_progress') return true;
    }
    return false;
  };

  const testSubmissions = (submissions || []).filter(sub => {
    if (isDraftSub(sub)) return false;

    const answersArr = Array.isArray(sub.answers) ? sub.answers : [];
    const meta = answersArr.find(a => a?.type === 'metadata') || {};

    const subFields = [
      sub.testId,
      sub.test_id,
      sub.realTestId,
      sub.hwId,
      sub.homeworkId,
      sub.bookTestId,
      sub.id,
      sub.supabaseId,
      meta.realTestId,
      meta.bookTestId,
      meta.hwId,
      meta.realId,
      meta.testId
    ].filter(Boolean).map(String);

    const idMatches = subFields.some(sf => testIdSet.has(sf) || testIdSet.has(sf.replace(/^bt_|^q_|^hw_/, '')));

    const subTitle = (sub.testTitle || sub.title || sub.test_title || meta.testTitle || '').toLowerCase().trim();
    const titleMatches = Boolean(cleanTestTitle && subTitle && subTitle === cleanTestTitle);

    return idMatches || titleMatches;
  }).sort((a, b) => new Date(a.submittedAt || a.createdAt || a.created_at || 0) - new Date(b.submittedAt || b.createdAt || b.created_at || 0));

  const totalQuestions = Number(test.questionCount || test.totalQuestions || test.questionsList?.length || 10);
  const solveCount = testSubmissions.length;
  const isSolved = solveCount > 0;

  let currentScorePct = 0;
  let latestCorrect = 0;
  let latestWrong = 0;
  let latestBlank = 0;

  if (isSolved) {
    const latestSub = testSubmissions[testSubmissions.length - 1];
    latestCorrect = Number(latestSub.correctCount ?? latestSub.correct_count ?? latestSub.correct ?? 0);
    latestWrong = Number(latestSub.wrongCount ?? latestSub.wrong_count ?? latestSub.wrong ?? 0);
    latestBlank = Number(latestSub.blankCount ?? latestSub.emptyCount ?? latestSub.empty_count ?? 0);
    
    // Total questions in submission
    const answeredCount = latestCorrect + latestWrong + latestBlank;
    const effectiveTotal = latestSub.totalQuestions || (answeredCount > 0 ? answeredCount : totalQuestions);
    
    if (effectiveTotal > (latestCorrect + latestWrong) && latestBlank === 0) {
      latestBlank = effectiveTotal - (latestCorrect + latestWrong);
    }

    if (effectiveTotal > 0) {
      currentScorePct = Math.min(100, Math.round((latestCorrect / effectiveTotal) * 100));
    }
    if (currentScorePct === 0 && typeof latestSub.score === 'number' && latestSub.score > 0) {
      currentScorePct = Math.round(latestSub.score);
    }
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
    intervals: test.repetitionIntervals || test.intervals || [0, 3, 7, 15],
    teacherAssigned: test.teacherAssigned || test.createdBy === 'teacher' || Boolean(test.assignedTeacherId)
  };
}

/**
 * Checks whether a remedial task / stage is date-locked (scheduled for a future date).
 * Prevents students from solving future spaced repetition stages ahead of time.
 */
export function getRemedialLockStatus(task, todayStr = null, submissions = [], studentId = null) {
  if (!task) return { isLocked: false };

  const isRemedial = Boolean(
    task.isRemedial ||
    task.isRemedialTest ||
    task.isTeacherRemedial ||
    task.type === 'remedialTest' ||
    task.taskType === 'remedialTest' ||
    task.type === 'remedial' ||
    task.taskType === 'remedial' ||
    String(task.text || task.title || '').includes('Tekrar') ||
    Boolean(task.stage)
  );

  if (!isRemedial) return { isLocked: false };

  // If already done/completed, it is not locked for review
  if (task.done) return { isLocked: false };

  // If already mastered (100% correct in previous submission), it is not locked
  if (isRemedialStageDone(task, submissions, studentId)) {
    return { isLocked: false };
  }

  // Resolve today's date in local YYYY-MM-DD
  const now = new Date();
  const defaultTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const today = (todayStr && typeof todayStr === 'string') ? todayStr.slice(0, 10) : defaultTodayStr;

  const targetDateRaw = task.scheduledDate || task.date || task.singleDate || task.specificDate || task.due_date;

  if (targetDateRaw && typeof targetDateRaw === 'string') {
    const cleanTarget = targetDateRaw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanTarget) && cleanTarget > today) {
      const parts = cleanTarget.split('-').map(Number);
      const targetDateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const formattedDate = targetDateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' });
      
      const todayParts = today.split('-').map(Number);
      const todayDateObj = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
      const diffMs = targetDateObj.getTime() - todayDateObj.getTime();
      const daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        isLocked: true,
        reason: 'future_scheduled',
        targetDate: cleanTarget,
        formattedDate,
        daysLeft,
        badgeText: daysLeft === 1 ? '🔒 Yarın Açılacak' : `🔒 ${formattedDate} (${daysLeft} gün sonra)`,
        lockMessage: `Bu telafi testi aralıklı tekrar programınıza göre ${formattedDate} tarihinde çözülecektir. Bilgilerin hafızaya tam yerleşmesi ve pekişmesi için günü gelmeden erken çözülemez.`
      };
    }
  }

  return { isLocked: false };
}

