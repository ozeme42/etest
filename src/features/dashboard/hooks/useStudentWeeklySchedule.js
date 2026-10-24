import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useCoaching } from '../../../context/CoachingContext';
import { useHomework } from '../../../context/HomeworkContext';
import { useTrackedBooks } from '../../../context/TrackedBookContext';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useStudyPlan } from '../../../context/StudyPlanContext';
import { useCurriculum } from '../../../context/CurriculumContext';
import { useSchedule } from '../../../context/ScheduleContext';
import { useReading } from '../../../context/ReadingContext';
import { toUUID } from '../../../services/supabaseService';
import { getRemedialLockStatus } from '../../../services/remedialSpacedRepetitionService';
import {
  isHomeworkForStudent,
  isSubmissionMatchingBookTest,
  isExamBook,
  sortItemsByBookOrder
} from '../../../utils/testResolver';
import { normalizeWeeklyProgram, checkIsTaskSolved } from '../../../components/ProgramCenter';

export const SUBJECT_ROW_THEMES = {
  'matematik':       { bg: '#f0f7ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8', badgeBg: '#dbeafe' },
  'türkçe':          { bg: '#fff1f2', border: '#fecdd3', accent: '#f43f5e', text: '#be123c', badgeBg: '#ffe4e6' },
  'fen':             { bg: '#f0fdf4', border: '#bbf7d0', accent: '#10b981', text: '#15803d', badgeBg: '#dcfce7' },
  'sosyal':          { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', text: '#b45309', badgeBg: '#fef3c7' },
  'inkılap':         { bg: '#fff7ed', border: '#fed7aa', accent: '#ea580c', text: '#c2410c', badgeBg: '#ffedd5' },
  'ingilizce':       { bg: '#faf5ff', border: '#e9d5ff', accent: '#8b5cf6', text: '#6d28d9', badgeBg: '#f3e8ff' },
  'yabancı dil':     { bg: '#faf5ff', border: '#e9d5ff', accent: '#8b5cf6', text: '#6d28d9', badgeBg: '#f3e8ff' },
  'din':             { bg: '#ecfeff', border: '#a5f3fc', accent: '#06b6d4', text: '#0e7490', badgeBg: '#cffafe' },
  'geometri':        { bg: '#f0fdfa', border: '#99f6e4', accent: '#0d9488', text: '#0f766e', badgeBg: '#ccfbf1' },
  'fizik':           { bg: '#f5f3ff', border: '#ddd6fe', accent: '#6366f1', text: '#4338ca', badgeBg: '#ede9fe' },
  'kimya':           { bg: '#fdf4ff', border: '#f5d0fe', accent: '#c026d3', text: '#a21caf', badgeBg: '#fae8ff' },
  'biyoloji':        { bg: '#f0fdf4', border: '#a7f3d0', accent: '#059669', text: '#047857', badgeBg: '#d1fae5' },
  'tarih':           { bg: '#fffbeb', border: '#fed7aa', accent: '#d97706', text: '#9a3412', badgeBg: '#ffedd5' },
  'coğrafya':        { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a', text: '#166534', badgeBg: '#dcfce7' },
  'felsefe':         { bg: '#fdf2f8', border: '#fbcfe8', accent: '#ec4899', text: '#be185d', badgeBg: '#fce7f3' },
};

export const PALETTES_LIST = [
  { bg: '#f0f7ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8', badgeBg: '#dbeafe' },
  { bg: '#fff1f2', border: '#fecdd3', accent: '#f43f5e', text: '#be123c', badgeBg: '#ffe4e6' },
  { bg: '#f0fdf4', border: '#bbf7d0', accent: '#10b981', text: '#15803d', badgeBg: '#dcfce7' },
  { bg: '#faf5ff', border: '#e9d5ff', accent: '#8b5cf6', text: '#6d28d9', badgeBg: '#f3e8ff' },
  { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', text: '#b45309', badgeBg: '#fef3c7' },
  { bg: '#ecfeff', border: '#a5f3fc', accent: '#06b6d4', text: '#0e7490', badgeBg: '#cffafe' },
];

export const getRowTheme = (subject, idx = 0) => {
  if (subject) {
    const sLower = String(subject).toLowerCase();
    for (const [key, val] of Object.entries(SUBJECT_ROW_THEMES)) {
      if (sLower.includes(key)) return val;
    }
  }
  return PALETTES_LIST[idx % PALETTES_LIST.length];
};

export const DAYS_OF_WEEK = [
  { key: 'Pzt', name: 'Pazartesi', short: 'Pzt', icon: '⚡', color: '#4f46e5', bg: '#eef2ff' },
  { key: 'Sal', name: 'Salı', short: 'Sal', icon: '🎯', color: '#0891b2', bg: '#ecfeff' },
  { key: 'Çrş', name: 'Çarşamba', short: 'Çrş', icon: '🌿', color: '#059669', bg: '#ecfdf5' },
  { key: 'Prş', name: 'Perşembe', short: 'Prş', icon: '🔥', color: '#d97706', bg: '#fffbeb' },
  { key: 'Cum', name: 'Cuma', short: 'Cum', icon: '✨', color: '#7c3aed', bg: '#faf5ff' },
  { key: 'Cts', name: 'Cumartesi', short: 'Cts', icon: '🚀', color: '#e11d48', bg: '#fff1f2' },
  { key: 'Paz', name: 'Pazar', short: 'Paz', icon: '🏖️', color: '#2563eb', bg: '#eff6ff' }
];

export function formatLocalYMD(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function extractItemYMD(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    const str = item.trim();
    const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const trMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (trMatch) return `${trMatch[3]}-${trMatch[2].padStart(2, '0')}-${trMatch[1].padStart(2, '0')}`;
    return null;
  }
  if (item instanceof Date && !isNaN(item.getTime())) {
    return formatLocalYMD(item);
  }
  if (typeof item !== 'object') return null;

  const candidates = [
    item.singleDate,
    item.specificDate,
    item.scheduledDate,
    item.date,
    item.targetDate,
    item.dueDate,
    item.assignedDueDate,
    item.time,
    item.saat,
    item.note
  ];

  for (const val of candidates) {
    if (!val) continue;
    if (val instanceof Date && !isNaN(val.getTime())) {
      const res = formatLocalYMD(val);
      if (res) return res;
    }
    const str = String(val).trim();
    const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    const trMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (trMatch) {
      const d = trMatch[1].padStart(2, '0');
      const m = trMatch[2].padStart(2, '0');
      const y = trMatch[3];
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

export function useStudentWeeklySchedule(overrideStudentId = null, overrideStudentObj = null) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { coachingProfile, coachingProfiles = [], getCoachingProfileForStudent, saveCoachingProfile, refreshCoaching } = useCoaching();
  const { homeworks = [] } = useHomework();
  const { books = [], bookTests = [] } = useTrackedBooks();
  const { submissions = [] } = useEvaluation();
  const { studyPlans = [], studyAssignments = [], updateStudyAssignment } = useStudyPlan();
  const { schedules = [], toggleScheduleDone, refreshSchedules } = useSchedule() || {};
  const { books: readingBooksList = [], updateReadingProgress } = useReading() || {};
  const { curData } = useCurriculum();

  const effectiveStudent = useMemo(() => {
    if (overrideStudentObj) return overrideStudentObj;
    if (currentUser?.role === 'student') return currentUser;
    return currentUser;
  }, [overrideStudentObj, currentUser]);

  const studentId = overrideStudentId || effectiveStudent?.id || currentUser?.id;
  const sUuid = toUUID(studentId);

  // Today key: 'Pzt' | 'Sal' | 'Çrş' | 'Prş' | 'Cum' | 'Cts' | 'Paz'
  const todayDayKey = useMemo(() => {
    const d = new Date().getDay();
    const map = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];
    return map[d] || 'Pzt';
  }, []);

  const [activeDayKey, setActiveDayKey] = useState(todayDayKey);

  // Week date range calculation
  const weekInfo = useMemo(() => {
    const now = new Date();
    const currentDayIdx = now.getDay();
    const mondayDiff = now.getDate() - (currentDayIdx === 0 ? 6 : currentDayIdx - 1);
    const mondayDate = new Date(now.getFullYear(), now.getMonth(), mondayDiff, 12, 0, 0);

    const MONTHS_SHORT_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    const dayDateMap = {};
    DAYS_OF_WEEK.forEach((d, idx) => {
      const dObj = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + idx, 12, 0, 0);
      const ymd = formatLocalYMD(dObj);
      const dayNum = dObj.getDate();
      const mShort = MONTHS_SHORT_TR[dObj.getMonth()];
      const mLong = MONTHS_TR[dObj.getMonth()];

      dayDateMap[d.key] = {
        key: d.key,
        name: d.name,
        short: d.short,
        ymd,
        time: dObj.getTime(),
        dayNumber: dayNum,
        monthShort: mShort,
        monthLong: mLong,
        dateLabel: `${dayNum} ${mShort}`,
        fullDateLabel: `${dayNum} ${mLong} ${d.name}`
      };
    });

    return { mondayDate, dayDateMap };
  }, []);

  // Student coaching profile
  const activeProfile = useMemo(() => {
    if (coachingProfile && String(coachingProfile.studentId || coachingProfile.userId || '') === String(studentId)) {
      return coachingProfile;
    }
    const found = (coachingProfiles || []).find(p => {
      if (!p) return false;
      const pSid = String(p.studentId || p.userId || p.id || '');
      return pSid === String(studentId) || (sUuid && (pSid === sUuid || toUUID(pSid) === sUuid));
    });
    if (found) return found;
    return getCoachingProfileForStudent?.(studentId) || { studentId, weeklyProgram: [], topicPool: [] };
  }, [coachingProfile, coachingProfiles, getCoachingProfileForStudent, studentId, sUuid]);

  // Pre-index books map
  const booksByIdMap = useMemo(() => {
    const map = new Map();
    (books || []).forEach(b => {
      if (!b?.id) return;
      const bId = String(b.id);
      map.set(bId, b);
      const bUuid = toUUID(bId);
      if (bUuid) map.set(bUuid, b);
    });
    return map;
  }, [books]);

  // Pre-index book test info cache
  const bookTestInfoCache = useMemo(() => {
    const cache = new Map();
    (bookTests || []).forEach(bt => {
      if (!bt?.id) return;
      const bObj = bt.bookId ? booksByIdMap.get(String(bt.bookId)) : null;
      cache.set(String(bt.id), {
        tObj: bt,
        cleanBookTitle: bObj?.title || 'Kitap',
        resolvedSubject: bt.subject || bObj?.subject || 'Genel',
        resolvedUnit: bt.unit || bt.topic || '',
        qCount: bt.questionCount || 12
      });
    });
    return cache;
  }, [bookTests, booksByIdMap]);

  // Solved sets
  const studentSolvedSet = useMemo(() => {
    const set = new Set();
    const studentIdStr = String(studentId || '');
    const studentUuidStr = String(sUuid || '');

    (submissions || []).forEach(s => {
      if (!s || s.status === 'in_progress' || s.status === 'draft') return;
      const sId = String(s.studentId ?? s.userId ?? s.student_id ?? '');
      if (studentIdStr && sId !== studentIdStr && sId !== studentUuidStr) return;

      if (s.testId) set.add(String(s.testId));
      if (s.bookTestId) set.add(String(s.bookTestId));
      if (s.realTestId) set.add(String(s.realTestId));
      if (s.homeworkId) set.add(String(s.homeworkId));
      if (s.hwId) set.add(String(s.hwId));
    });
    return set;
  }, [submissions, studentId, sUuid]);

  // Full processed week map (tasks grouped by day)
  const fullProcessedWeekMap = useMemo(() => {
    try {
      const rawProg = normalizeWeeklyProgram(activeProfile?.weeklyProgram);
      const gradesList = curData?.grades || [];

      const studentHomeworks = (homeworks || []).filter(hw => {
        if (!effectiveStudent || !hw) return false;
        return isHomeworkForStudent(hw, effectiveStudent, gradesList);
      });

      const allDailyItems = [];
      if (Array.isArray(rawProg)) {
        rawProg.forEach(dObj => {
          (dObj?.items || []).forEach(item => {
            if (!item) return;
            if ((item.repeatType === 'daily' || item.isDaily) && !allDailyItems.some(i => i?.id === item.id)) {
              allDailyItems.push({ ...item, isDaily: true });
            }
          });
        });
      }

      const resultMap = {};

      DAYS_OF_WEEK.forEach(dayMeta => {
        const dayInfo = weekInfo?.dayDateMap?.[dayMeta.key];
        const dayYMD = dayInfo?.ymd || '';

        let dayManualItems = [];
        if (Array.isArray(rawProg)) {
          const found = rawProg.find(r => r?.day === dayMeta.key);
          if (found && Array.isArray(found.items)) {
            found.items.forEach(item => {
              if (!item) return;
              if (item.isTeacherRemedial || item.type === 'remedialTest' || item.isRemedial || item.isRemedialTest || item.isSpacedRepetition) {
                const itemYMD = extractItemYMD(item) || item.scheduledDate || item.date || item.specificDate || item.singleDate;
                if (itemYMD && dayYMD && itemYMD !== dayYMD) return;
                dayManualItems.push({ ...item, isWeeklyProgItem: true });
                return;
              }
              const isReading = item.taskType === 'okuma' || Boolean(item.readingBookId) || String(item.subject || '').includes('Okuma');
              const itemYMD = item.singleDate || item.specificDate || item.scheduledDate || extractItemYMD(item) || (item.repeatType === 'none' || item.isRecurring === false ? (item.date || item.targetDate) : null);
              if (isReading) {
                const readDate = itemYMD || item.date || item.targetDate || item.createdYMD;
                if (readDate && readDate !== dayYMD) return;
              }
              if (itemYMD && itemYMD !== dayYMD) return;
              if (item.repeatEndDate && dayYMD > item.repeatEndDate) return;
              dayManualItems.push({ ...item, isWeeklyProgItem: true });
            });
          }

          rawProg.forEach(dObj => {
            if (dObj?.day !== dayMeta.key) {
              (dObj?.items || []).forEach(item => {
                if (!item) return;
                const itYMD = extractItemYMD(item);
                if (itYMD && itYMD === dayYMD) {
                  if (!dayManualItems.some(i => i?.id === item.id)) {
                    dayManualItems.push({ ...item, isWeeklyProgItem: true });
                  }
                }
              });
            }
          });
        }

        allDailyItems.forEach(dItem => {
          if (!dItem) return;
          const itemYMD = extractItemYMD(dItem);
          if (itemYMD && itemYMD !== dayYMD) return;
          if (dItem.createdYMD && dayYMD < dItem.createdYMD) return;
          if (dItem.repeatEndDate && dayYMD > dItem.repeatEndDate) return;
          if (!dayManualItems.some(i => i?.id === dItem.id)) {
            dayManualItems.push({ ...dItem, done: false, isWeeklyProgItem: true });
          }
        });

        // Scheduled book tests for this day
        const scheduledBookItems = [];
        const seenDayBtKeys = new Set();
        (studentHomeworks || []).forEach(hw => {
          const testDates = hw.testDueDates || hw.scheduleDates || hw.test_due_dates || hw.raw_data?.testDueDates || hw.raw_data?.scheduleDates || {};
          if (typeof testDates !== 'object' || Object.keys(testDates).length === 0) return;

          const hwBookKey = String(hw.bookId || hw.raw_data?.bookId || '');
          const bookObj = hwBookKey ? booksByIdMap.get(hwBookKey) : null;
          const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap')
            .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
            .replace(/\s*\(Tüm Kitap\)/gi, '')
            .trim();

          Object.entries(testDates).forEach(([testIdKey, tDateStr]) => {
            if (!tDateStr) return;
            const isMatchDate = dayYMD && String(tDateStr).startsWith(dayYMD);
            if (!isMatchDate) return;

            const cleanTestId = String(testIdKey).replace(/^bt_/, '').replace(/^q_/, '');
            const canonicalTestId = toUUID(cleanTestId) || cleanTestId;
            const dedupeKey = `bt_${canonicalTestId}`;
            if (seenDayBtKeys.has(dedupeKey)) return;
            seenDayBtKeys.add(dedupeKey);

            const cached = bookTestInfoCache.get(cleanTestId) || {};
            const testTitle = cached?.tObj?.name || (cleanBookTitle ? `${cleanBookTitle} Testi` : 'Test');
            const qCount = cached?.qCount || 12;

            scheduledBookItems.push({
              id: dedupeKey,
              testId: cleanTestId,
              bookTestId: cleanTestId,
              realTestId: cleanTestId,
              canonicalTestId,
              hwId: hw.id,
              bookId: hw.bookId || bookObj?.id,
              bookTitle: cleanBookTitle,
              title: testTitle,
              testName: testTitle,
              subject: cached?.resolvedSubject || hw.subject || 'Genel Ders',
              unitTopic: cached?.resolvedUnit || '',
              topic: cached?.resolvedUnit || '',
              questionCount: qCount,
              targetQuestionCount: qCount,
              categoryType: 'kitap',
              isBookTask: true,
              isAutoHomework: true,
              dueDateStr: tDateStr,
              time: `Son Teslim: ${new Date(tDateStr).toLocaleDateString('tr-TR')}`,
              done: false
            });
          });
        });

        // Study plan / roadmap tasks for this day
        const autoHwItems = [];
        (studyAssignments || []).filter(a => String(a?.studentId) === String(studentId)).forEach(assignment => {
          if (!assignment || assignment.status === 'completed' || assignment.status === 'done') return;
          const plan = (studyPlans || []).find(p => String(p?.id) === String(assignment.planId || assignment.studyPlanId));
          if (!plan) return;

          let compTopics = [];
          if (Array.isArray(assignment.completedTopics)) compTopics = assignment.completedTopics;
          else if (typeof assignment.completedTopics === 'string') {
            try { compTopics = JSON.parse(assignment.completedTopics); } catch {}
          }
          const completedTopicsSet = new Set(compTopics.map(String));

          (plan.subjects || []).forEach(subject => {
            (subject?.topics || []).forEach(topic => {
              if (topic?.dueDate) {
                const tYMD = extractItemYMD(topic.dueDate);
                if (dayYMD === tYMD) {
                  const isCompleted = completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name);
                  const autoId = `roadmap_top_${assignment.id}_${topic.id}_${dayYMD}`;
                  autoHwItems.push({
                    id: autoId,
                    roadmapAssignmentId: assignment.id,
                    isAutoHomework: true,
                    isRoadmapTask: true,
                    taskType: 'konu',
                    subject: subject.name || 'Genel',
                    bookTitle: plan.title,
                    unitTopic: subject.name,
                    title: topic.name,
                    topic: topic.name,
                    topicId: topic.id,
                    time: `Hedef: ${new Date(topic.dueDate).toLocaleDateString('tr-TR')}`,
                    dueDate: topic.dueDate,
                    done: isCompleted
                  });
                }
              }
            });
          });
        });

        // Combined raw items
        const rawAllItems = sortItemsByBookOrder([...scheduledBookItems, ...autoHwItems, ...dayManualItems], books, bookTests);

        // Deduplication & done checking
        const seenIds = new Set();
        const allItems = [];

        rawAllItems.forEach(item => {
          if (!item) return;
          const itemKey = String(item.id || item.testId || item.title || '');
          if (seenIds.has(itemKey)) return;
          seenIds.add(itemKey);

          const isSolved = checkIsTaskSolved(item, studentId, submissions, homeworks, studyAssignments, studentSolvedSet, bookTests, books);

          const rawSubj = typeof item.subject === 'object' ? (item.subject?.name || item.subject?.title || 'Ders') : (item.subject || 'Ders');
          const cleanSubj = String(rawSubj).trim();

          const rawTopic = typeof item.topic === 'object' ? (item.topic?.name || item.topic?.title || '') : (item.topic || item.unitTopic || '');
          const cleanTopic = String(rawTopic).trim();

          const rawTitle = typeof item.title === 'object' ? (item.title?.name || item.title?.title || '') : (item.title || item.testName || '');
          const cleanTitle = String(rawTitle).trim();

          const rawTestName = typeof item.testName === 'object' ? (item.testName?.name || item.testName?.title || '') : (item.testName || '');
          const cleanTestName = String(rawTestName).trim();

          const rawBook = typeof item.bookTitle === 'object' ? (item.bookTitle?.title || item.bookTitle?.name || '') : (item.bookTitle || '');
          const cleanBookTitle = String(rawBook).trim();

          // Find matching submission if solved
          let matchedSub = null;
          if (submissions && submissions.length > 0) {
            const targetTid = String(item.testId || item.bookTestId || item.realTestId || item.id || '');
            const cleanTid = targetTid.replace(/^bt_/, '').replace(/^q_/, '');
            matchedSub = submissions.find(s => {
              if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
              const sTid = String(s.testId || s.bookTestId || s.realTestId || '');
              const sClean = sTid.replace(/^bt_/, '').replace(/^q_/, '');
              if (targetTid && (sTid === targetTid || sClean === cleanTid)) return true;
              if (item.hwId && String(s.hwId || s.homeworkId) === String(item.hwId)) return true;
              return false;
            }) || null;
          }

          let testResult = null;
          if (matchedSub) {
            const c = Number(matchedSub.correctCount ?? matchedSub.correct_count ?? matchedSub.correct ?? 0);
            const w = Number(matchedSub.wrongCount ?? matchedSub.wrong_count ?? matchedSub.wrong ?? 0);
            const e = Number(matchedSub.emptyCount ?? matchedSub.empty_count ?? matchedSub.blankCount ?? matchedSub.blank_count ?? 0);
            const explicitQ = Number(matchedSub.totalQuestions ?? matchedSub.questionCount ?? item.questionCount ?? 0);
            const q = (c + w + e > 0) ? (c + w + e) : explicitQ;

            // Accurate success percentage calculation:
            let scoreVal = 0;
            const explicitPct = matchedSub.scorePercentage ?? matchedSub.scorePct ?? matchedSub.accuracy ?? matchedSub.successRate;
            if (explicitPct !== undefined && explicitPct !== null && !isNaN(Number(explicitPct))) {
              scoreVal = Math.min(100, Math.max(0, Math.round(Number(explicitPct))));
            } else if (q > 0) {
              scoreVal = Math.min(100, Math.max(0, Math.round((c / q) * 100)));
            } else if (c > 0 && w === 0) {
              scoreVal = 100;
            } else if (c + w > 0) {
              scoreVal = Math.min(100, Math.max(0, Math.round((c / (c + w)) * 100)));
            } else if (matchedSub.score !== undefined && matchedSub.score !== null && !isNaN(Number(matchedSub.score))) {
              scoreVal = Math.min(100, Math.max(0, Math.round(Number(matchedSub.score))));
            }

            const netVal = (matchedSub.net !== undefined && matchedSub.net !== null && !isNaN(Number(matchedSub.net)))
              ? Number(matchedSub.net)
              : Math.max(0, Math.round((c - (w / 3)) * 100) / 100);

            testResult = {
              score: scoreVal,
              correctCount: c,
              wrongCount: w,
              emptyCount: e,
              totalQuestions: q,
              net: netVal,
              submissionId: matchedSub.id,
              isPendingApproval: Boolean(matchedSub.isPendingApproval),
              isPendingEval: Boolean(matchedSub.isPendingEval)
            };
          }

          allItems.push({
            ...item,
            subject: cleanSubj,
            topic: cleanTopic,
            title: cleanTitle || cleanTopic || cleanSubj || 'Görev',
            testName: cleanTestName,
            bookTitle: cleanBookTitle,
            done: Boolean(item.done || isSolved),
            submission: matchedSub,
            testResult: testResult
          });
        });

        const completedItems = allItems.filter(i => i.done);

        resultMap[dayMeta.key] = {
          dayKey: dayMeta.key,
          dayName: dayMeta.name,
          short: dayMeta.short,
          dateLabel: dayInfo?.dateLabel || '',
          fullDateLabel: dayInfo?.fullDateLabel || '',
          ymd: dayYMD,
          isToday: dayMeta.key === todayDayKey,
          items: allItems,
          totalCount: allItems.length,
          completedCount: completedItems.length,
          hasAllCompleted: allItems.length > 0 && completedItems.length === allItems.length
        };
      });

      return resultMap;
    } catch (err) {
      console.error('Error computing fullProcessedWeekMap:', err);
      return {};
    }
  }, [activeProfile, curData, homeworks, effectiveStudent, studentId, sUuid, weekInfo, booksByIdMap, bookTests, bookTestInfoCache, studyAssignments, studyPlans, books, submissions, studentSolvedSet, todayDayKey]);

  // Current active day info
  const dayProgramInfo = useMemo(() => {
    return fullProcessedWeekMap[activeDayKey] || {
      dayKey: activeDayKey,
      dayName: 'Bugün',
      isToday: activeDayKey === todayDayKey,
      totalCount: 0,
      completedCount: 0,
      items: [],
      hasAllCompleted: false
    };
  }, [fullProcessedWeekMap, activeDayKey, todayDayKey]);

  // Tasks count per day map
  const weekTasksCountMap = useMemo(() => {
    const map = {};
    DAYS_OF_WEEK.forEach(d => {
      map[d.key] = fullProcessedWeekMap[d.key]?.totalCount || 0;
    });
    return map;
  }, [fullProcessedWeekMap]);

  // Catch-up tasks (tasks from earlier days this week that are not completed)
  const catchUpTasks = useMemo(() => {
    const list = [];
    const todayIndex = DAYS_OF_WEEK.findIndex(d => d.key === todayDayKey);
    if (todayIndex <= 0) return [];

    for (let i = 0; i < todayIndex; i++) {
      const pastDayKey = DAYS_OF_WEEK[i].key;
      const pastDay = fullProcessedWeekMap[pastDayKey];
      if (pastDay && pastDay.items) {
        pastDay.items.filter(it => !it.done).forEach(item => {
          list.push({ ...item, pastDayKey, pastDayName: pastDay.dayName });
        });
      }
    }
    return list;
  }, [fullProcessedWeekMap, todayDayKey]);

  // Toggle task handler
  const handleToggleTask = useCallback(async (taskOrId) => {
    if (!taskOrId) return;
    const isObj = typeof taskOrId === 'object' && taskOrId !== null;
    const taskId = isObj ? (taskOrId.id || taskOrId.uniqueKey) : taskOrId;

    // Reading task: sync reading progress
    if (isObj && (taskOrId.taskType === 'okuma' || taskOrId.readingBookId)) {
      const targetBookId = taskOrId.readingBookId || (readingBooksList || []).find(b =>
        (taskOrId.bookTitle && b.title && b.title.trim().toLowerCase() === taskOrId.bookTitle.trim().toLowerCase())
      )?.id;

      if (targetBookId && updateReadingProgress) {
        const toP = Number(taskOrId.toPage) || (taskOrId.pageCount ? Number(taskOrId.pageCount) : 0);
        updateReadingProgress(targetBookId, toP);
      }
    }

    // Roadmap task
    if (isObj && taskOrId.roadmapAssignmentId && updateStudyAssignment) {
      const assignment = (studyAssignments || []).find(a => String(a.id) === String(taskOrId.roadmapAssignmentId));
      if (assignment) {
        let compTopics = Array.isArray(assignment.completedTopics) ? [...assignment.completedTopics] : [];
        const targetTopicId = String(taskOrId.topicId || taskOrId.id);
        const idx = compTopics.indexOf(targetTopicId);
        if (idx >= 0) compTopics.splice(idx, 1);
        else compTopics.push(targetTopicId);
        await updateStudyAssignment(assignment.id, { completedTopics: compTopics });
        return;
      }
    }

    // Virtual auto-homework: do not modify weeklyProgram
    if (isObj && (taskOrId.isAutoHomework || taskOrId.hwId || taskOrId.roadmapAssignmentId)) {
      return;
    }

    if (activeProfile && saveCoachingProfile) {
      const rawWeekly = normalizeWeeklyProgram(activeProfile.weeklyProgram);
      const updatedWeeklyProgram = rawWeekly.map(dayRow => {
        if (dayRow.day === activeDayKey) {
          return {
            ...dayRow,
            items: (dayRow.items || []).map(item => item.id === taskId ? { ...item, done: !item.done } : item)
          };
        }
        return dayRow;
      });

      await saveCoachingProfile({
        ...activeProfile,
        studentId,
        weeklyProgram: updatedWeeklyProgram
      });
      refreshCoaching?.(true);
    }
  }, [activeProfile, activeDayKey, readingBooksList, updateReadingProgress, studyAssignments, updateStudyAssignment, saveCoachingProfile, studentId, refreshCoaching]);

  // Add task to schedule
  const handleAddScheduleTask = useCallback(async (newItem, targetDayKey) => {
    try {
      const dayToUse = targetDayKey || activeDayKey || 'Pzt';
      const rawWeekly = normalizeWeeklyProgram(activeProfile?.weeklyProgram);

      const updatedWeeklyProgram = rawWeekly.map(dayRow => {
        if (dayRow.day === dayToUse) {
          return {
            ...dayRow,
            items: [...(dayRow.items || []), newItem]
          };
        }
        return dayRow;
      });

      await saveCoachingProfile({
        ...activeProfile,
        studentId,
        weeklyProgram: updatedWeeklyProgram
      });

      refreshCoaching?.(true);
      refreshSchedules?.(true);
    } catch (e) {
      console.error('Error adding schedule task:', e);
    }
  }, [activeDayKey, activeProfile, saveCoachingProfile, studentId, refreshCoaching, refreshSchedules]);

  // Delete task from schedule
  const handleDeleteScheduleTask = useCallback(async (taskId, targetDayKey) => {
    try {
      const dayToUse = targetDayKey || activeDayKey || 'Pzt';
      const rawWeekly = normalizeWeeklyProgram(activeProfile?.weeklyProgram);

      const updatedWeeklyProgram = rawWeekly.map(dayRow => {
        if (dayRow.day === dayToUse) {
          return {
            ...dayRow,
            items: (dayRow.items || []).filter(item => item.id !== taskId)
          };
        }
        return dayRow;
      });

      await saveCoachingProfile({
        ...activeProfile,
        studentId,
        weeklyProgram: updatedWeeklyProgram
      });

      refreshCoaching?.(true);
    } catch (e) {
      console.error('Error deleting schedule task:', e);
    }
  }, [activeDayKey, activeProfile, saveCoachingProfile, studentId, refreshCoaching]);

  const activeDayConfig = useMemo(() => {
    return DAYS_OF_WEEK.find(d => d.key === activeDayKey) || DAYS_OF_WEEK[0];
  }, [activeDayKey]);

  // Task click / action navigation handler
  const handleTaskAction = useCallback((task, customNavigate) => {
    const nav = customNavigate || navigate;
    if (!task || !nav) return;

    // Reading task
    const isReading = task.taskType === 'okuma' ||
      task.subject === 'Kitap Okuma' ||
      String(task.topic || '').toLowerCase().includes('kitap okuma') ||
      String(task.title || '').toLowerCase().includes('kitap okuma');
    if (isReading) {
      handleToggleTask(task);
      return;
    }

    if (task.roadmapAssignmentId) {
      nav(`/student/study-plan/${task.roadmapAssignmentId}`, { state: { from: '/my-program' } });
      return;
    }

    if (task.type === 'remedialTest' || task.taskType === 'remedial' || task.isRemedial) {
      const testTargetId = task.testId || task.realTestId || task.id;
      if (task.done) {
        nav(`/quiz-review/${testTargetId}?studentId=${studentId}`, { state: { from: '/my-program' } });
        return;
      }
      const lockStatus = getRemedialLockStatus(task, null, submissions, studentId);
      if (lockStatus.isLocked) {
        alert(lockStatus.lockMessage);
        return;
      }
      nav(`/quiz/${testTargetId}?studentId=${studentId}&retake=true&mode=solve`, { state: { from: '/my-program', retake: true, mode: 'solve' } });
      return;
    }

    const isExam = task.isExamTask || task.taskType === 'deneme';
    if (isExam) {
      nav(`/physical-exam/${task.hwId || task.realTestId || task.id}?studentId=${studentId}`, { state: { from: '/my-program' } });
      return;
    }

    if (task.done) {
      const reviewTargetId = task.bookTestId || task.testId || task.realTestId || task.hwId;
      if (reviewTargetId) {
        nav(`/quiz-review/${reviewTargetId}?studentId=${studentId}`, { state: { from: '/my-program' } });
        return;
      }
    }

    const targetBookTestId = task.bookTestId || task.testId || task.realTestId;
    if (targetBookTestId && (task.isBookTask || task.isBookAssignment || task.taskType === 'kitap')) {
      nav(`/book-quiz/${targetBookTestId}?studentId=${studentId}`, { state: { from: '/my-program' } });
      return;
    }

    const quizTargetId = task.realTestId || task.hwId || task.testId || (task.id && String(task.id).startsWith('hw_') ? task.id : null);
    if (quizTargetId) {
      nav(`/quiz/${quizTargetId}?studentId=${studentId}`, { state: { from: '/my-program' } });
      return;
    }

    handleToggleTask(task);
  }, [studentId, submissions, handleToggleTask, navigate]);

  return {
    daysOfWeek: DAYS_OF_WEEK,
    weekInfo,
    todayDayKey,
    activeDayKey,
    setActiveDayKey,
    activeDayConfig,
    fullProcessedWeekMap,
    dayProgramInfo,
    weekTasksCountMap,
    catchUpTasks,
    handleToggleTask,
    handleTaskAction,
    handleAddScheduleTask,
    handleDeleteScheduleTask,
    getRowTheme,
    coachingProfile: activeProfile,
    topicPool: Array.isArray(activeProfile?.topicPool) ? activeProfile.topicPool : [],
    rawWeeklyProgram: normalizeWeeklyProgram(activeProfile?.weeklyProgram)
  };
}
