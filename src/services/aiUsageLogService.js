/**
 * aiUsageLogService.js
 * Tracks and manages AI Question Solution usage logs for teacher transparency and anti-cheat tracking.
 * Zero database bloat: Stores lightweight JSON metadata only (no images).
 */

const STORAGE_KEY = 'eTest_ai_usage_logs';

/**
 * Get all stored AI usage logs
 */
export function getAllAiUsageLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[aiUsageLogService] Failed to load logs:', err);
    return [];
  }
}

/**
 * Record an AI solution usage event
 */
export function recordAiUsageLog({
  studentId = 'anonymous',
  studentName = 'Öğrenci',
  testId = 'test',
  questionNo = 1,
  subject = 'Genel',
  topic = '',
  mistakeReason = '',
  actionType = 'solve' // 'solve', 'crop', 'camera'
}) {
  try {
    const logs = getAllAiUsageLogs();
    const cleanTestId = String(testId || 'test');
    const cleanQNo = Number(questionNo) || 1;
    const cleanStudentId = String(studentId || 'anonymous');
    const now = new Date().toISOString();

    const existingIndex = logs.findIndex(
      l => String(l.testId) === cleanTestId &&
           Number(l.questionNo) === cleanQNo &&
           String(l.studentId) === cleanStudentId
    );

    let updatedEntry;

    if (existingIndex >= 0) {
      const existing = logs[existingIndex];
      const prevCount = Number(existing.count) || 1;
      const history = Array.isArray(existing.history) ? existing.history : [existing.usedAt || existing.lastUsedAt || now];

      updatedEntry = {
        ...existing,
        studentName: studentName || existing.studentName,
        count: prevCount + 1,
        lastUsedAt: now,
        mistakeReason: mistakeReason || existing.mistakeReason,
        subject: subject || existing.subject,
        topic: topic || existing.topic,
        history: [...history, now]
      };
      logs[existingIndex] = updatedEntry;
    } else {
      updatedEntry = {
        id: `ailog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        studentId: cleanStudentId,
        studentName: studentName || 'Öğrenci',
        testId: cleanTestId,
        questionNo: cleanQNo,
        subject: subject || 'Genel',
        topic: topic || '',
        mistakeReason: mistakeReason || '',
        actionType,
        count: 1,
        firstUsedAt: now,
        lastUsedAt: now,
        history: [now]
      };
      logs.unshift(updatedEntry);
    }

    // Keep last 1000 logs locally
    const trimmedLogs = logs.slice(0, 1000);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedLogs));

    // Dispatch real-time event for UI badges to update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('etest_ai_log_updated', {
        detail: { testId: cleanTestId, questionNo: cleanQNo, studentId: cleanStudentId, entry: updatedEntry }
      }));
    }

    return updatedEntry;
  } catch (err) {
    console.warn('[aiUsageLogService] Failed to record log:', err);
    return null;
  }
}

/**
 * Get AI usage metadata for a specific question in a test
 */
export function getAiUsageForQuestion(testId, questionNo, studentId = null) {
  try {
    const logs = getAllAiUsageLogs();
    const cleanTestId = String(testId || 'test');
    const cleanQNo = Number(questionNo) || 1;

    const match = logs.find(l => {
      const isTestMatch = String(l.testId) === cleanTestId;
      const isQMatch = Number(l.questionNo) === cleanQNo;
      if (!isTestMatch || !isQMatch) return false;
      if (studentId) {
        return String(l.studentId) === String(studentId);
      }
      return true;
    });

    return match || null;
  } catch {
    return null;
  }
}

/**
 * Get a map of all questions that used AI in a specific test
 * Returns: { [qNo]: { count, lastUsedAt, mistakeReason } }
 */
export function getAiUsageMapForTest(testId, studentId = null) {
  try {
    const logs = getAllAiUsageLogs();
    const cleanTestId = String(testId || 'test');
    const map = {};

    logs.forEach(l => {
      if (String(l.testId) === cleanTestId) {
        if (!studentId || String(l.studentId) === String(studentId)) {
          map[l.questionNo] = l;
        }
      }
    });

    return map;
  } catch {
    return {};
  }
}

/**
 * Get summary stats for a student or overall
 */
export function getAiUsageSummary(studentId = null) {
  try {
    let logs = getAllAiUsageLogs();
    if (studentId) {
      logs = logs.filter(l => String(l.studentId) === String(studentId));
    }

    const totalRequests = logs.reduce((sum, l) => sum + (Number(l.count) || 1), 0);
    const uniqueQuestions = logs.length;

    // Subject breakdown
    const subjectCounts = {};
    const reasonCounts = {};

    logs.forEach(l => {
      const s = l.subject || 'Diğer';
      const r = l.mistakeReason || 'Belirtilmedi';
      subjectCounts[s] = (subjectCounts[s] || 0) + (Number(l.count) || 1);
      reasonCounts[r] = (reasonCounts[r] || 0) + (Number(l.count) || 1);
    });

    return {
      totalRequests,
      uniqueQuestions,
      subjectCounts,
      reasonCounts,
      recentLogs: logs.slice(0, 20)
    };
  } catch {
    return {
      totalRequests: 0,
      uniqueQuestions: 0,
      subjectCounts: {},
      reasonCounts: {},
      recentLogs: []
    };
  }
}
