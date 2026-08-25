import { safeSetItem } from '../utils/storageUtils';
import { idbSetPayload, idbGetPayload } from './indexedDbService';

/**
 * Creates and downloads a 100% complete, uncompressed JSON backup of ALL application data
 * including localStorage items, roadmaps, book progress, wrong answers, and IndexedDB payloads.
 */
export async function createFullBackup() {
  const backup = {
    version: '3.0',
    platform: 'e-Test Professional',
    exportDate: new Date().toISOString(),
    exportDateFormatted: new Date().toLocaleString('tr-TR'),
    data: {}
  };

  // 1. Dynamic Universal Key Scanner: Collect ALL relevant keys from localStorage
  const prefixes = [
    'eTest', 'curriculum', 'tracked', 'study_', 'program_', 'mistake_reasons_',
    'student_', 'teacher_note_', 'theme_', 'gemini_', 'scale_', 'draft_'
  ];

  const explicitKeys = [
    'eTestUsers', 'eTestCurriculum', 'curriculumData', 'eTestHomeworks',
    'eTestSubmissions', 'etest_submissions', 'eTestQuestions', 'eTestTrackedBooks',
    'trackedBooks', 'eTestStudyPlans', 'eTestMockExams', 'eTestCoachingMeetings',
    'eTestCoachingProfiles', 'etest_coaching_profiles', 'eTestGoals', 'eTestSchedules',
    'eTestSummaries', 'eTestScales', 'eTestAuthUser'
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
      if (val !== null) {
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

  // 3. Fetch full question payloads from IndexedDB if stored there
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

  // 4. Detailed statistics for user confirmation
  const submissionsList = backup.data['eTestSubmissions'] || backup.data['etest_submissions'] || [];
  const booksList = backup.data['eTestTrackedBooks'] || backup.data['trackedBooks'] || [];
  const usersList = backup.data['eTestUsers'] || [];
  const homeworksList = backup.data['eTestHomeworks'] || [];
  const questionsList = backup.data['eTestQuestions'] || [];
  const studyPlansList = backup.data['eTestStudyPlans'] || [];

  const stats = {
    submissionCount: submissionsList.length,
    userCount: usersList.length,
    homeworkCount: homeworksList.length,
    questionCount: questionsList.length,
    bookCount: booksList.length,
    studyPlanCount: studyPlansList.length,
    totalKeys: Object.keys(backup.data).length
  };
  backup.stats = stats;

  // 5. Trigger browser file download
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
    throw new Error('Geçersiz veya bozuk yedek dosyası!');
  }

  const data = parsed.data;
  let restoredStats = {
    userCount: 0,
    submissionCount: 0,
    homeworkCount: 0,
    questionCount: 0,
    bookCount: 0,
    studyPlanCount: 0
  };

  // 1. Restore questions and separate heavy payloads to IndexedDB
  if (Array.isArray(data['eTestQuestions'])) {
    const qs = data['eTestQuestions'];
    restoredStats.questionCount = qs.length;

    for (const q of qs) {
      if (q && q.id && q.contentPayload && typeof q.contentPayload === 'string' && q.contentPayload.length > 500) {
        await idbSetPayload(q.id, q.contentPayload);
      }
    }

    // Save metadata-only in LocalStorage to preserve quota
    const sanitizedQs = qs.map(q => {
      if (q && typeof q.contentPayload === 'string' && q.contentPayload.length > 500 && !q.contentPayload.startsWith('http')) {
        return { ...q, contentPayload: '[STORED_IN_INDEXEDDB]' };
      }
      return q;
    });
    safeSetItem('eTestQuestions', JSON.stringify(sanitizedQs));
  }

  // 2. Restore all other keys
  Object.keys(data).forEach(key => {
    if (key === 'eTestQuestions') return; // already processed
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
  if (data['eTestStudyPlans']) restoredStats.studyPlanCount = data['eTestStudyPlans'].length;

  return restoredStats;
}
