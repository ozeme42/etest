import { safeSetItem } from '../utils/storageUtils';
import { idbSetPayload, idbGetPayload } from './indexedDbService';

/**
 * Creates and downloads a 100% complete, uncompressed JSON backup of all application data
 * including localStorage items and IndexedDB binary/image question payloads.
 */
export async function createFullBackup() {
  const backup = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    exportDateFormatted: new Date().toLocaleString('tr-TR'),
    data: {}
  };

  // 1. Collect all localStorage keys
  const keysToBackup = [
    'eTestUsers',
    'eTestCurriculum',
    'curriculumData',
    'eTestHomeworks',
    'eTestSubmissions',
    'etest_submissions',
    'eTestQuestions',
    'eTestTrackedBooks',
    'trackedBooks',
    'eTestStudyPlans',
    'eTestMockExams',
    'eTestCoachingMeetings',
    'eTestCoachingProfiles',
    'eTestGoals',
    'eTestSchedules',
    'eTestSummaries',
    'eTestScales'
  ];

  keysToBackup.forEach(key => {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) {
        backup.data[key] = JSON.parse(val);
      }
    } catch (e) {
      console.warn(`[Backup] Could not parse ${key}:`, e);
      backup.data[key] = localStorage.getItem(key);
    }
  });

  // 2. Fetch full question payloads from IndexedDB if stored there
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

  // 3. Stats for notification
  const stats = {
    userCount: (backup.data['eTestUsers'] || []).length,
    submissionCount: (backup.data['eTestSubmissions'] || backup.data['etest_submissions'] || []).length,
    homeworkCount: (backup.data['eTestHomeworks'] || []).length,
    questionCount: (backup.data['eTestQuestions'] || []).length,
    bookCount: (backup.data['eTestTrackedBooks'] || backup.data['trackedBooks'] || []).length,
    examCount: (backup.data['eTestMockExams'] || []).length
  };
  backup.stats = stats;

  // 4. Trigger browser download
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
 * Restores all data from a provided backup JSON object or string
 */
export async function restoreFullBackup(jsonInput) {
  let parsed;
  if (typeof jsonInput === 'string') {
    parsed = JSON.parse(jsonInput);
  } else {
    parsed = jsonInput;
  }

  if (!parsed || !parsed.data) {
    throw new Error('Geçersiz yedek dosyası formatı!');
  }

  const data = parsed.data;
  let restoredStats = {
    userCount: 0,
    submissionCount: 0,
    homeworkCount: 0,
    questionCount: 0,
    bookCount: 0
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
    if (key === 'eTestQuestions') return; // already processed above
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
