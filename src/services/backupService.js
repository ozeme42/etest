import { safeSetItem } from '../utils/storageUtils';
import { idbSetPayload, idbGetPayload } from './indexedDbService';

/**
 * Creates and downloads a 100% complete, uncompressed JSON backup of ALL application data
 * including curriculum, users, all 66 test submissions, tracked books, book tests, roadmaps,
 * question payloads, and teacher evaluations.
 */
export async function createFullBackup() {
  const backup = {
    version: '3.5',
    platform: 'e-Test Professional',
    exportDate: new Date().toISOString(),
    exportDateFormatted: new Date().toLocaleString('tr-TR'),
    data: {}
  };

  // 1. Dynamic Scanner: Collect ALL relevant keys from localStorage
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

  // 2. Extract and parse data for each key
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

  // 3. Fallback: If curriculum is in IndexedDB but not in localStorage, fetch from IDB!
  if (!backup.data['eTestCurriculum'] && !backup.data['curriculumData']) {
    try {
      const idbCur = await idbGetPayload('eTestCurriculum_Cache');
      if (idbCur) {
        backup.data['eTestCurriculum'] = JSON.parse(idbCur);
        backup.data['curriculumData'] = JSON.parse(idbCur);
      }
    } catch {}
  }

  // 4. Fetch full question payloads from IndexedDB if stored there
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

  // 5. Detailed statistics for user confirmation
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

  // 6. Trigger browser file download
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
 * Restores ALL data from a provided backup JSON object or string
 */
export async function restoreFullBackup(jsonInput) {
  let parsed;
  if (typeof jsonInput === 'string') {
    parsed = JSON.parse(jsonInput);
  } else {
    parsed = jsonInput;
  }

  if (!parsed || !parsed.data) {
    throw new Error('Geçersiz veya bozuk yedek dosyası formatı!');
  }

  const data = parsed.data;
  let restoredStats = {
    userCount: 0,
    submissionCount: 0,
    homeworkCount: 0,
    questionCount: 0,
    bookCount: 0,
    gradeCount: 0,
    subjectCount: 0
  };

  // Clear any tombstoned deleted ids to allow full restoration
  try {
    localStorage.removeItem('eTestDeletedSubmissions');
  } catch {}

  // 1. Restore Curriculum to both localStorage and IndexedDB
  const cur = data['eTestCurriculum'] || data['curriculumData'];
  if (cur) {
    const curStr = typeof cur === 'string' ? cur : JSON.stringify(cur);
    safeSetItem('eTestCurriculum', curStr);
    safeSetItem('curriculumData', curStr);
    await idbSetPayload('eTestCurriculum_Cache', curStr).catch(() => {});
    if (cur.grades) restoredStats.gradeCount = cur.grades.length;
    if (cur.subjects) restoredStats.subjectCount = cur.subjects.length;
  }

  // 2. Restore questions and separate heavy payloads to IndexedDB
  if (Array.isArray(data['eTestQuestions'])) {
    const qs = data['eTestQuestions'];
    restoredStats.questionCount = qs.length;

    for (const q of qs) {
      if (q && q.id && q.contentPayload && typeof q.contentPayload === 'string' && q.contentPayload.length > 500) {
        await idbSetPayload(q.id, q.contentPayload);
      }
    }

    const sanitizedQs = qs.map(q => {
      if (q && typeof q.contentPayload === 'string' && q.contentPayload.length > 500 && !q.contentPayload.startsWith('http')) {
        return { ...q, contentPayload: '[STORED_IN_INDEXEDDB]' };
      }
      return q;
    });
    safeSetItem('eTestQuestions', JSON.stringify(sanitizedQs));
  }

  // 3. Restore all other keys
  Object.keys(data).forEach(key => {
    if (key === 'eTestQuestions' || key === 'eTestCurriculum' || key === 'curriculumData') return;
    try {
      const val = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
      safeSetItem(key, val);
    } catch (e) {
      console.warn(`[Restore] Error writing ${key}:`, e);
    }
  });

  // Calculate restored stats
  if (data['eTestUsers']) restoredStats.userCount = data['eTestUsers'].length;
  if (data['eTestSubmissions']) restoredStats.submissionCount = data['eTestSubmissions'].length;
  else if (data['etest_submissions']) restoredStats.submissionCount = data['etest_submissions'].length;
  if (data['eTestHomeworks']) restoredStats.homeworkCount = data['eTestHomeworks'].length;
  if (data['eTestTrackedBooks']) restoredStats.bookCount = data['eTestTrackedBooks'].length;
  else if (data['trackedBooks']) restoredStats.bookCount = data['trackedBooks'].length;

  return restoredStats;
}
