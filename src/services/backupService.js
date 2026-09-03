import { safeSetItem } from '../utils/storageUtils';
import { idbSetPayload, idbGetPayload } from './indexedDbService';

/**
 * Creates and downloads a 100% complete, uncompressed JSON backup of ALL application data
 */
export async function createFullBackup() {
  const backup = {
    version: '3.5',
    platform: 'e-Test Professional',
    exportDate: new Date().toISOString(),
    exportDateFormatted: new Date().toLocaleString('tr-TR'),
    data: {}
  };

  const prefixes = [
    'eTest', 'etest', 'curriculum', 'tracked', 'study_', 'program_', 'mistake_reasons_',
    'student_', 'teacher_note_', 'theme_', 'gemini_', 'scale_', 'draft_'
  ];

  const explicitKeys = [
    'eTestUsers', 'eTestCurriculum', 'curriculumData', 'eTestHomeworks',
    'eTestSubmissions', 'etest_submissions', 'eTestQuestions', 'eTestTrackedBooks',
    'trackedBooks', 'eTestTrackedBookTests', 'eTestStudyPlans', 'eTestMockExams',
    'eTestCoachingMeetings', 'eTestCoachingProfiles', 'etest_coaching_profiles',
    'eTestGoals', 'eTestSchedules', 'eTestSummaries', 'eTestScales', 'eTestAuthUser'
  ];

  const allKeys = new Set(explicitKeys);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && prefixes.some(p => k.startsWith(p))) {
        allKeys.add(k);
      }
    }
  } catch (e) {
    console.warn('[Backup] Error iterating localStorage keys:', e);
  }

  allKeys.forEach(key => {
    try {
      const val = localStorage.getItem(key);
      if (val !== null && val !== undefined && val !== '') {
        try {
          backup.data[key] = JSON.parse(val);
        } catch {
          backup.data[key] = val;
        }
      }
    } catch (e) {
      console.warn(`[Backup] Error reading ${key}:`, e);
    }
  });

  if (!backup.data['eTestCurriculum'] && !backup.data['curriculumData']) {
    try {
      const idbCur = await idbGetPayload('eTestCurriculum_Cache');
      if (idbCur) {
        backup.data['eTestCurriculum'] = JSON.parse(idbCur);
        backup.data['curriculumData'] = JSON.parse(idbCur);
      }
    } catch {}
  }

  const questions = backup.data['eTestQuestions'] || [];
  if (Array.isArray(questions)) {
    const fullQuestions = await Promise.all(questions.map(async (q) => {
      if (q && q.id) {
        const fullPayload = await idbGetPayload(q.id);
        if (fullPayload) {
          return { ...q, contentPayload: fullPayload };
        }
      }
      return q;
    }));
    backup.data['eTestQuestions'] = fullQuestions;
  }

  const submissionsList = backup.data['eTestSubmissions'] || backup.data['etest_submissions'] || [];
  const booksList = backup.data['eTestTrackedBooks'] || backup.data['trackedBooks'] || [];
  const bookTestsList = backup.data['eTestTrackedBookTests'] || [];
  const usersList = backup.data['eTestUsers'] || [];
  const homeworksList = backup.data['eTestHomeworks'] || [];
  const questionsList = backup.data['eTestQuestions'] || [];
  const curData = backup.data['eTestCurriculum'] || backup.data['curriculumData'] || {};

  const stats = {
    submissionCount: submissionsList.length,
    userCount: usersList.length,
    homeworkCount: homeworksList.length,
    questionCount: questionsList.length,
    bookCount: booksList.length,
    bookTestCount: bookTestsList.length,
    gradeCount: (curData.grades || []).length,
    subjectCount: (curData.subjects || []).length,
    unitCount: (curData.units || []).length,
    topicCount: (curData.topics || []).length,
    totalKeys: Object.keys(backup.data).length
  };
  backup.stats = stats;

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `etest_tam_yedek_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return stats;
}

/**
 * Robust JSON parser supporting Supabase SQL output, CSV wrapper, and direct JSON
 */
function cleanAndParseJson(raw) {
  if (typeof raw === 'object' && raw !== null) return raw;
  let text = String(raw || '').trim();

  // If pasted from CSV export (e.g. header full_backup_data)
  if (text.startsWith('"full_backup_data"') || text.startsWith('full_backup_data')) {
    const lines = text.split('\n');
    lines.shift(); // Remove header line
    text = lines.join('\n').trim();
  }

  // If wrapped in outer quotes (CSV string escape)
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1).replace(/""/g, '"').replace(/\\"/g, '"');
  }

  try {
    return JSON.parse(text);
  } catch (e1) {
    // Try unescaping
    try {
      const unescaped = text.replace(/\\"/g, '"').replace(/\\n/g, '');
      return JSON.parse(unescaped);
    } catch (e2) {
      throw new Error('Yapıştırılan metin geçerli bir JSON formatında değil! Lütfen Supabase çıktısını eksiksiz kopyaladığınızdan emin olun.');
    }
  }
}

/**
 * Restores ALL data from a provided backup JSON object or string
 */
export async function restoreFullBackup(jsonInput) {
  const parsed = cleanAndParseJson(jsonInput);

  // Extract actual data dictionary from various wrapper formats
  let data = null;
  if (parsed.tables && typeof parsed.tables === 'object') {
    data = parsed.tables;
  } else if (parsed.backup_data && typeof parsed.backup_data === 'object') {
    data = parsed.backup_data;
  } else if (Array.isArray(parsed) && parsed[0]?.backup_data) {
    data = parsed[0].backup_data;
  } else if (parsed.data && typeof parsed.data === 'object') {
    data = parsed.data;
  } else if (parsed.full_backup_data && typeof parsed.full_backup_data === 'object') {
    data = parsed.full_backup_data;
  } else if (Array.isArray(parsed) && parsed[0]?.full_backup_data) {
    data = parsed[0].full_backup_data;
  } else if (typeof parsed === 'object') {
    data = parsed;
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Geçersiz veya bozuk yedek verisi formatı!');
  }

  let restoredStats = {
    userCount: 0,
    submissionCount: 0,
    homeworkCount: 0,
    questionCount: 0,
    bookCount: 0,
    bookTestCount: 0,
    gradeCount: 0,
    subjectCount: 0
  };

  try {
    localStorage.removeItem('eTestDeletedSubmissions');
  } catch {}

  // 1. Restore Curriculum to both localStorage and IndexedDB
  let cur = data['eTestCurriculum'] || data['curriculumData'] || data['curriculum'];
  if (!cur && (data['grades'] || data['subjects'] || data['units'] || data['topics'])) {
    cur = {
      grades: data['grades'] || [],
      subjects: data['subjects'] || [],
      units: data['units'] || [],
      topics: data['topics'] || []
    };
  }
  if (cur) {
    const curStr = typeof cur === 'string' ? cur : JSON.stringify(cur);
    safeSetItem('eTestCurriculum', curStr);
    safeSetItem('curriculumData', curStr);
    await idbSetPayload('eTestCurriculum_Cache', curStr).catch(() => {});
    const curObj = typeof cur === 'string' ? JSON.parse(cur) : cur;
    if (curObj.grades) restoredStats.gradeCount = curObj.grades.length;
    if (curObj.subjects) restoredStats.subjectCount = curObj.subjects.length;
  }

  // 2. Restore questions and separate heavy payloads to IndexedDB
  const questions = data['eTestQuestions'] || data['questions'];
  if (Array.isArray(questions)) {
    restoredStats.questionCount = questions.length;

    for (const q of questions) {
      if (q && q.id && q.contentPayload && typeof q.contentPayload === 'string' && q.contentPayload.length > 500) {
        await idbSetPayload(q.id, q.contentPayload);
      }
    }

    const sanitizedQs = questions.map(q => {
      if (q && typeof q.contentPayload === 'string' && q.contentPayload.length > 500 && !q.contentPayload.startsWith('http')) {
        return { ...q, contentPayload: '[STORED_IN_INDEXEDDB]' };
      }
      return q;
    });
    safeSetItem('eTestQuestions', JSON.stringify(sanitizedQs));
  }

  // 3. Restore Submissions (Exam and test results)
  const subs = data['eTestSubmissions'] || data['etest_submissions'] || data['submissions'];
  if (Array.isArray(subs)) {
    restoredStats.submissionCount = subs.length;
    const subsStr = JSON.stringify(subs);
    safeSetItem('eTestSubmissions', subsStr);
    safeSetItem('etest_submissions', subsStr);
  }

  // 4. Restore Tracked Books & Tests
  const books = data['eTestTrackedBooks'] || data['trackedBooks'] || data['tracked_books'];
  if (Array.isArray(books)) {
    restoredStats.bookCount = books.length;
    const booksStr = JSON.stringify(books);
    safeSetItem('eTestTrackedBooks', booksStr);
    safeSetItem('trackedBooks', booksStr);
  }

  const bTests = data['eTestTrackedBookTests'] || data['tracked_book_tests'];
  if (Array.isArray(bTests)) {
    restoredStats.bookTestCount = bTests.length;
    safeSetItem('eTestTrackedBookTests', JSON.stringify(bTests));
  }

  // 5. Restore Homeworks
  const hws = data['eTestHomeworks'] || data['homeworks'];
  if (Array.isArray(hws)) {
    restoredStats.homeworkCount = hws.length;
    safeSetItem('eTestHomeworks', JSON.stringify(hws));
  }

  // 6. Restore Users
  const users = data['eTestUsers'] || data['users'];
  if (Array.isArray(users)) {
    restoredStats.userCount = users.length;
    safeSetItem('eTestUsers', JSON.stringify(users));
  }

  // 7. Restore Study Plans & Coaching & Scales & Goals
  if (data['study_plans'] || data['eTestStudyPlans']) {
    safeSetItem('eTestStudyPlans', JSON.stringify(data['study_plans'] || data['eTestStudyPlans']));
  }
  if (data['coaching_profiles'] || data['eTestCoachingProfiles'] || data['etest_coaching_profiles']) {
    const cpStr = JSON.stringify(data['coaching_profiles'] || data['eTestCoachingProfiles'] || data['etest_coaching_profiles']);
    safeSetItem('eTestCoachingProfiles', cpStr);
    safeSetItem('etest_coaching_profiles', cpStr);
  }
  if (data['goals'] || data['eTestGoals']) {
    safeSetItem('eTestGoals', JSON.stringify(data['goals'] || data['eTestGoals']));
  }
  if (data['schedules'] || data['eTestSchedules']) {
    safeSetItem('eTestSchedules', JSON.stringify(data['schedules'] || data['eTestSchedules']));
  }
  if (data['summaries'] || data['eTestSummaries']) {
    safeSetItem('eTestSummaries', JSON.stringify(data['summaries'] || data['eTestSummaries']));
  }
  if (data['scales'] || data['eTestScales']) {
    safeSetItem('eTestScales', JSON.stringify(data['scales'] || data['eTestScales']));
  }

  // 8. Restore all other miscellaneous keys
  Object.keys(data).forEach(key => {
    if (['eTestQuestions', 'eTestCurriculum', 'curriculumData', 'questions', 'curriculum',
         'eTestSubmissions', 'etest_submissions', 'submissions',
         'eTestTrackedBooks', 'trackedBooks', 'tracked_books',
         'eTestTrackedBookTests', 'tracked_book_tests',
         'eTestHomeworks', 'homeworks',
         'eTestUsers', 'users',
         'grades', 'subjects', 'units', 'topics',
         'study_plans', 'eTestStudyPlans',
         'coaching_profiles', 'eTestCoachingProfiles', 'etest_coaching_profiles',
         'goals', 'eTestGoals', 'schedules', 'eTestSchedules', 'summaries', 'eTestSummaries', 'scales', 'eTestScales'
        ].includes(key)) return;
    try {
      const val = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
      safeSetItem(key, val);
    } catch (e) {
      console.warn(`[Restore] Error writing ${key}:`, e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('etest-data-restored'));
    window.dispatchEvent(new CustomEvent('etest-submissions-updated'));
  }

  return restoredStats;
}
