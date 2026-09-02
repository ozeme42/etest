import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCoaching } from '../context/CoachingContext';
import { useTheme } from '../context/ThemeContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { toUUID } from '../services/supabaseService';
import { checkIsTaskSolved } from '../components/ProgramCenter';
import { isHomeworkForStudent } from '../utils/testResolver';

import { AmbientEngine } from '../features/study-room/services/ambientAudioEngine';
import {
  FOCUS_QUOTES,
  TREE_SPECIES,
  getThemeList,
  STUDY_SUBJECTS,
  formatSecToMinSec,
  getSpeedEvaluation,
  matchSubjectFromTask,
  extractQuestionCountFromTask
} from '../features/study-room/constants/studyRoomConstants';

// Modular Subcomponents
import StudyRoomHeader from '../features/study-room/components/StudyRoomHeader';
import StudyHeroCard from '../features/study-room/components/StudyHeroCard';
import StudyOpticalPanel from '../features/study-room/components/StudyOpticalPanel';
import StudySpeedAnalytics from '../features/study-room/components/StudySpeedAnalytics';
import StudyForestBadges from '../features/study-room/components/StudyForestBadges';
import StudyAmbientNotes from '../features/study-room/components/StudyAmbientNotes';
import StudyHomeworkPickerModal from '../features/study-room/components/StudyHomeworkPickerModal';
import StudyResultModal from '../features/study-room/components/StudyResultModal';
import StudySettingsDrawer from '../features/study-room/components/StudySettingsDrawer';

const ambientAudio = new AmbientEngine();

export default function StudyRoomPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');

  const { books = [], bookTests = [] } = useTrackedBooks() || {};
  const { studyPlans = [], studyAssignments = [] } = useStudyPlan() || {};
  const { homeworks = [] } = useHomework() || {};
  const { submissions = [], addSubmission } = useEvaluation() || {};
  const { coachingProfiles = {}, getCoachingProfileForStudent } = useCoaching() || {};

  const coachingProfile = useMemo(() => {
    if (!currentUser?.id) return {};
    if (getCoachingProfileForStudent) {
      const prof = getCoachingProfileForStudent(currentUser.id);
      if (prof && (prof.weeklyProgram || prof.schedule)) return prof;
    }
    if (coachingProfiles && (coachingProfiles[currentUser.id] || coachingProfiles[toUUID(currentUser.id)])) {
      return coachingProfiles[currentUser.id] || coachingProfiles[toUUID(currentUser.id)] || {};
    }
    return {};
  }, [currentUser?.id, getCoachingProfileForStudent, coachingProfiles]);

  const THEMES = useMemo(() => getThemeList(isDark), [isDark]);
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('study_theme') || 'system');
  const themeObj = useMemo(() => THEMES.find(t => t.id === activeTheme) || THEMES[0], [THEMES, activeTheme]);

  // ── 🎯 ÇALIŞMA MODLARI: 'question' | 'pomodoro' | 'stopwatch' ──
  const [activeStudyMode, setActiveStudyMode] = useState(() => localStorage.getItem('study_master_mode') || 'question');

  // ── 📝 GÖREV & ÖDEV SEÇİMİ ──
  const [selectedTask, setSelectedTask] = useState(null);
  const [showHomeworkPickerModal, setShowHomeworkPickerModal] = useState(false);
  const [hwSearchQuery, setHwSearchQuery] = useState('');
  const [hwFilterSubject, setHwFilterSubject] = useState('all');
  const [hwSourceTab, setHwSourceTab] = useState('program');
  const [hideCompletedTasks, setHideCompletedTasks] = useState(true);

  const todayDayMap = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];
  const currentTodayKey = todayDayMap[new Date().getDay()] || 'Pzt';
  const [selectedProgramDay, setSelectedProgramDay] = useState(currentTodayKey);

  const studentIdStr = String(currentUser?.id || '');
  const studentUuidStr = String(toUUID(currentUser?.id) || '');

  // ── 📅 HAFTALIK GÜN VE TARİH BİLGİLERİ ──
  const WEEK_DAYS_CONFIG = useMemo(() => [
    { key: 'Pzt', long: 'Pazartesi', aliases: ['pzt', 'pazartesi', 'monday', 'mon'], icon: '⚡', color: '#4f46e5' },
    { key: 'Sal', long: 'Salı', aliases: ['sal', 'salı', 'sali', 'tuesday', 'tue'], icon: '🎯', color: '#0891b2' },
    { key: 'Çrş', long: 'Çarşamba', aliases: ['çrş', 'crs', 'çarşamba', 'carsamba', 'wednesday', 'wed'], icon: '🌿', color: '#059669' },
    { key: 'Prş', long: 'Perşembe', aliases: ['prş', 'prs', 'perşembe', 'persembe', 'thursday', 'thu'], icon: '🔥', color: '#d97706' },
    { key: 'Cum', long: 'Cuma', aliases: ['cum', 'cuma', 'friday', 'fri'], icon: '✨', color: '#7c3aed' },
    { key: 'Cts', long: 'Cumartesi', aliases: ['cts', 'cumartesi', 'saturday', 'sat'], icon: '🚀', color: '#e11d48' },
    { key: 'Paz', long: 'Pazar', aliases: ['paz', 'pazar', 'sunday', 'sun'], icon: '🏖️', color: '#2563eb' }
  ], []);

  const weekDayDateMap = useMemo(() => {
    const d = new Date();
    const dayOfWeek = d.getDay();
    const diffToMonday = d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diffToMonday);

    const map = {};
    const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    WEEK_DAYS_CONFIG.forEach((cfg, idx) => {
      const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
      const ymd = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      map[cfg.key] = {
        ymd,
        time: cur.getTime(),
        dateLabel: `${cur.getDate()} ${months[cur.getMonth()]}`
      };
    });
    return map;
  }, [WEEK_DAYS_CONFIG]);

  const resolveDayKey = (input) => {
    if (!input) return null;
    const str = String(input).trim().toLowerCase();
    if (str.includes('-') || str.includes('t') || str.includes('.')) {
      const ymd = str.split('t')[0].split(' ')[0].replace(/\//g, '-');
      for (const [k, v] of Object.entries(weekDayDateMap)) {
        if (v.ymd === ymd) return k;
      }
      const parsed = new Date(input);
      if (!isNaN(parsed.getTime())) {
        const map = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];
        return map[parsed.getDay()];
      }
    }
    for (const cfg of WEEK_DAYS_CONFIG) {
      if (cfg.key.toLowerCase() === str || cfg.long.toLowerCase() === str || cfg.aliases.some(a => str === a || str.startsWith(a))) {
        return cfg.key;
      }
    }
    return null;
  };

  // 1. Öğrenciye atanan tüm görevleri birleştir
  const allAssignedTasks = useMemo(() => {
    if (!currentUser) return [];

    const isMatchHw = (hw) => {
      if (!hw || !currentUser) return false;
      if (isHomeworkForStudent(hw, currentUser, [])) return true;
      if (hw.studentId === currentUser.id || hw.student_id === currentUser.id) return true;
      if (studentUuidStr && (hw.studentId === studentUuidStr || hw.student_id === studentUuidStr)) return true;
      if (Array.isArray(hw.targetIds)) {
        if (hw.targetIds.includes(currentUser.id) || (studentUuidStr && hw.targetIds.includes(studentUuidStr))) return true;
        if (hw.targetIds.some(tid => String(tid) === studentIdStr || (studentUuidStr && String(tid) === studentUuidStr))) return true;
      }
      return false;
    };

    const taskList = [];
    const seenTaskKeys = new Set();
    const studentHws = (homeworks || []).filter(isMatchHw);

    // A. Atanmış Ödevler
    studentHws.forEach(hw => {
      const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || (hw.bookId && books.some(b => String(b.id) === String(hw.bookId)));
      if (!isBook) {
        const isSolved = checkIsTaskSolved({ hwId: hw.id, id: hw.id }, currentUser.id, submissions, homeworks, studyAssignments);
        const qCount = hw.questionCount || (Array.isArray(hw.questions) ? hw.questions.length : (hw.totalQuestions || 10));
        const assignedDayKey = resolveDayKey(hw.dueDate || hw.startDate || hw.assignedAt);
        const dedupeKey = `hw_${hw.id}`;
        if (!seenTaskKeys.has(dedupeKey)) {
          seenTaskKeys.add(dedupeKey);
          taskList.push({
            id: hw.id,
            dedupeKey,
            title: hw.title || 'Ödev',
            subtitle: hw.subject || 'Ödev Görevi',
            subject: hw.subject || 'Genel',
            unit: hw.unit || '',
            topic: hw.topic || '',
            questionCount: Number(qCount) || 10,
            dueDate: hw.dueDate,
            dayKey: assignedDayKey,
            dayName: assignedDayKey ? WEEK_DAYS_CONFIG.find(d => d.key === assignedDayKey)?.long : null,
            sourceType: 'homework',
            sourceLabel: '📝 Atanmış Ödev',
            type: hw.type,
            realTestId: hw.realTestId || hw.testId || hw.id,
            isCompleted: isSolved
          });
        }
      }
    });

    // B. Kitap Testleri
    // B. Kitap Testleri & Tarihli Testler
    const assignedBookIds = new Set();
    studentHws.forEach(hw => {
      if (hw.bookId) {
        assignedBookIds.add(String(hw.bookId));
        const u = toUUID(hw.bookId);
        if (u) assignedBookIds.add(u);
      }
      if (hw.raw_data?.bookId) {
        assignedBookIds.add(String(hw.raw_data.bookId));
        const u = toUUID(hw.raw_data.bookId);
        if (u) assignedBookIds.add(u);
      }
      if (hw.isBookAssignment && hw.id) assignedBookIds.add(String(hw.id));
    });

    (books || []).forEach(b => {
      if (assignedBookIds.has(String(b.id)) || (toUUID(b.id) && assignedBookIds.has(toUUID(b.id))) || (b.assignedStudents && b.assignedStudents.includes(currentUser?.id)) || (b.studentIds && b.studentIds.includes(currentUser?.id))) {
        assignedBookIds.add(String(b.id));
        const u = toUUID(b.id);
        if (u) assignedBookIds.add(u);
      }
    });

    (books || []).forEach(book => {
      const isAssigned = assignedBookIds.has(String(book.id)) || (toUUID(book.id) && assignedBookIds.has(toUUID(book.id))) || assignedBookIds.size === 0;
      if (!isAssigned && (books.length > 6)) return;

      const cleanBookTitle = (book.title || 'Kitap')
        .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
        .replace(/\s*\(Tüm Kitap\)/gi, '')
        .trim();

      const matchingHwsForBook = studentHws.filter(h => 
        String(h.bookId || h.raw_data?.bookId) === String(book.id) || 
        (toUUID(h.bookId || h.raw_data?.bookId) && toUUID(h.bookId || h.raw_data?.bookId) === toUUID(book.id)) ||
        String(h.id) === String(book.id)
      );
      const testsForBook = (bookTests || []).filter(bt => 
        String(bt.bookId || bt.book_id) === String(book.id) || 
        (toUUID(bt.bookId || bt.book_id) && toUUID(bt.bookId || bt.book_id) === toUUID(book.id))
      );

      testsForBook.forEach(bt => {
        const isSolved = checkIsTaskSolved({ testId: bt.id, bookTestId: bt.id, taskType: 'kitap' }, currentUser.id, submissions, homeworks, studyAssignments);
        const qCount = Number(bt.questionCount) || (bt.answerKey ? Object.keys(bt.answerKey).length : 12);

        let testDayKey = null;
        let testDueDate = null;
        matchingHwsForBook.forEach(hw => {
          const testDates = {
            ...(hw.test_due_dates || hw.testDueDates || hw.scheduleDates || hw.raw_data?.testDueDates || hw.raw_data?.scheduleDates || {})
          };
          const cleanBtId = String(bt.id).replace(/^bt_/, '').replace(/^q_/, '');
          const btUuid = toUUID(cleanBtId);

          const dateVal = testDates[cleanBtId] || testDates[String(bt.id)] || testDates[`bt_${cleanBtId}`] || (btUuid && testDates[btUuid]);
          if (dateVal) {
            testDueDate = dateVal;
            testDayKey = resolveDayKey(dateVal);
          } else if (Array.isArray(hw.tests) && hw.tests.some(tId => String(tId) === String(bt.id) || (btUuid && toUUID(tId) === btUuid)) && hw.dueDate) {
            testDueDate = hw.dueDate;
            testDayKey = resolveDayKey(hw.dueDate);
          }
        });

        const dedupeKey = `bt_${bt.id}`;
        if (!seenTaskKeys.has(dedupeKey)) {
          seenTaskKeys.add(dedupeKey);
          taskList.push({
            id: bt.id,
            dedupeKey,
            title: `${cleanBookTitle} — ${bt.name || bt.title || 'Test'}`,
            subtitle: `${cleanBookTitle} (${bt.name || 'Test'})`,
            bookTitle: cleanBookTitle,
            testName: bt.name || bt.title || 'Test',
            subject: bt.subjectName || bt.subject || book.subject || 'Genel',
            unit: bt.unitName || bt.unit || '',
            topic: bt.topicName || bt.topic || '',
            bookId: book.id,
            bookTestId: bt.id,
            questionCount: qCount,
            dayKey: testDayKey,
            dueDate: testDueDate,
            sourceType: testDayKey ? 'program' : 'homework',
            sourceLabel: '📚 Kitap Testi',
            answerKey: bt.answerKey || bt.answer_key,
            isCompleted: isSolved
          });
        }
      });
    });

    // C. Haftalık Ders Programı Görevleri (Koçluk / ProgramCenter)
    const weeklyProg = coachingProfile?.weeklyProgram || [];
    weeklyProg.forEach(dayObj => {
      const rawDay = dayObj.day || 'Pzt';
      const dayKey = resolveDayKey(rawDay) || rawDay;
      const dayCfg = WEEK_DAYS_CONFIG.find(d => d.key === dayKey) || { long: rawDay };

      (dayObj.items || []).forEach((item, idx) => {
        const matchedBookTest = (bookTests || []).find(bt => String(bt.id) === String(item.bookTestId || item.testId || item.realTestId));
        const matchedBook = (books || []).find(b => String(b.id) === String(matchedBookTest?.bookId || item.bookId));

        if (matchedBookTest) {
          const existingBtTask = taskList.find(t => String(t.bookTestId || t.id) === String(matchedBookTest.id));
          if (existingBtTask) {
            if (!existingBtTask.dayKey) {
              existingBtTask.dayKey = dayKey;
              existingBtTask.dayName = dayCfg.long;
            }
            return;
          }
        }

        const dedupeKey = `prog_${dayKey}_${item.id || idx}_${item.text || item.topic}`;
        if (!seenTaskKeys.has(dedupeKey)) {
          seenTaskKeys.add(dedupeKey);
          const qCount = Number(item.targetQuestions || item.questionCount) || 20;
          const isSolved = Boolean(item.done || checkIsTaskSolved(item, currentUser.id, submissions, homeworks, studyAssignments));

          taskList.push({
            id: dedupeKey,
            dedupeKey,
            title: `${item.text || item.topic || `${item.subject || 'Ders'} Çalışması`}`,
            subtitle: `${dayCfg.long} Programı`,
            dayName: dayCfg.long,
            dayKey,
            subject: item.subject || 'Genel',
            unit: item.unit || '',
            topic: item.topic || item.text || '',
            questionCount: qCount,
            sourceType: matchedBookTest ? 'bookTest' : 'program',
            sourceLabel: matchedBookTest ? '📚 Kitap Testi' : '📅 Ders Programı',
            bookTestId: matchedBookTest?.id || item.bookTestId,
            realTestId: matchedBookTest?.id || item.realTestId || item.testId,
            bookTitle: matchedBook?.title,
            isCompleted: isSolved,
            programItem: item
          });
        }
      });
    });

    return taskList;
  }, [currentUser, studentIdStr, studentUuidStr, homeworks, books, bookTests, submissions, studyAssignments, coachingProfile, WEEK_DAYS_CONFIG, currentTodayKey]);

  // 2. Haftalık Program Görevlerini Gün Gün Eksiksiz Gruplama (Birebir Ders Programı ile Özdeş)
  const weeklyProgramGrouped = useMemo(() => {
    const weeklyProg = coachingProfile?.weeklyProgram || [];
    const studentHws = (homeworks || []).filter(hw => {
      if (!hw || !currentUser) return false;
      if (isHomeworkForStudent(hw, currentUser, [])) return true;
      if (hw.studentId === currentUser.id || hw.student_id === currentUser.id) return true;
      if (studentUuidStr && (hw.studentId === studentUuidStr || hw.student_id === studentUuidStr)) return true;
      if (Array.isArray(hw.targetIds)) {
        if (hw.targetIds.includes(currentUser.id) || (studentUuidStr && hw.targetIds.includes(studentUuidStr))) return true;
        if (hw.targetIds.some(tid => String(tid) === studentIdStr || (studentUuidStr && String(tid) === studentUuidStr))) return true;
      }
      return false;
    });

    return WEEK_DAYS_CONFIG.map(dayCfg => {
      const dayTasks = [];
      const seenDayTaskKeys = new Set();
      const dayInfo = weekDayDateMap[dayCfg.key] || {};

      // 1. Koçluk / Ders Programındaki Öğeler
      const dayProgObj = weeklyProg.find(d => resolveDayKey(d.day) === dayCfg.key);
      const progItems = dayProgObj?.items || [];

      progItems.forEach((item, idx) => {
        const dedupeKey = `prog_${dayCfg.key}_${item.id || idx}_${item.text || item.topic}`;
        if (!seenDayTaskKeys.has(dedupeKey)) {
          seenDayTaskKeys.add(dedupeKey);
          const qCount = Number(item.targetQuestions || item.questionCount) || 20;
          const isSolved = Boolean(item.done || checkIsTaskSolved(item, currentUser.id, submissions, homeworks, studyAssignments));
          const matchedBookTest = (bookTests || []).find(bt => String(bt.id) === String(item.bookTestId || item.testId || item.realTestId));
          const matchedBook = (books || []).find(b => String(b.id) === String(matchedBookTest?.bookId || item.bookId));

          dayTasks.push({
            id: dedupeKey,
            dedupeKey,
            title: `${item.text || item.topic || `${item.subject || 'Ders'} Çalışması`}`,
            subtitle: `${dayCfg.long} Programı`,
            dayName: dayCfg.long,
            dayKey: dayCfg.key,
            subject: item.subject || matchedBook?.subject || 'Genel',
            unit: item.unit || matchedBookTest?.unit || '',
            topic: item.topic || item.text || matchedBookTest?.topic || '',
            questionCount: qCount,
            sourceType: matchedBookTest ? 'bookTest' : 'program',
            sourceLabel: matchedBookTest ? '📚 Kitap Testi' : '📅 Ders Programı',
            bookTestId: matchedBookTest?.id || item.bookTestId,
            realTestId: matchedBookTest?.id || item.realTestId || item.testId,
            bookTitle: matchedBook?.title,
            testName: matchedBookTest?.name || matchedBookTest?.title,
            isCompleted: isSolved,
            programItem: item
          });
        }
      });

      // 2. Bu Güne Özel Olarak Atanmış Kitap Testleri (hw.testDueDates)
      studentHws.forEach(hw => {
        const isBook = Boolean(
          hw.isBookAssignment ||
          hw.sourceType === 'trackedBook' ||
          hw.bookId ||
          hw.raw_data?.bookId ||
          (hw.testDueDates && Object.keys(hw.testDueDates).length > 0) ||
          (hw.scheduleDates && Object.keys(hw.scheduleDates).length > 0) ||
          (hw.test_due_dates && Object.keys(hw.test_due_dates).length > 0) ||
          (hw.title && /kitap|seti|soru bankası|paragraf|atlı karınca|artıbir/i.test(hw.title))
        );
        const bookObj = (books || []).find(b => 
          String(b.id) === String(hw.bookId || hw.raw_data?.bookId) || 
          (toUUID(b.id) && toUUID(b.id) === toUUID(hw.bookId || hw.raw_data?.bookId))
        );
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap')
          .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
          .replace(/\s*\(Tüm Kitap\)/gi, '')
          .trim();

        const testDates = {
          ...(hw.test_due_dates || hw.testDueDates || hw.scheduleDates || hw.raw_data?.testDueDates || hw.raw_data?.scheduleDates || {})
        };

        if (isBook && typeof testDates === 'object' && Object.keys(testDates).length > 0) {
          Object.entries(testDates).forEach(([testId, tDateStr]) => {
            if (!tDateStr) return;
            const cleanTestId = String(testId).replace(/^bt_/, '').replace(/^q_/, '');
            const testUuid = toUUID(cleanTestId);
            const targetDayKey = resolveDayKey(tDateStr);
            const isMatchDate = (dayInfo.ymd && tDateStr.startsWith(dayInfo.ymd)) || (targetDayKey === dayCfg.key);

            if (isMatchDate) {
              const dedupeKey = `bt_${cleanTestId}`;
              if (!seenDayTaskKeys.has(dedupeKey)) {
                seenDayTaskKeys.add(dedupeKey);
                const bt = (bookTests || []).find(b => {
                  const bId = String(b.id);
                  return bId === cleanTestId || bId === String(testId) || (testUuid && toUUID(bId) === testUuid);
                });
                const qCount = Number(bt?.questionCount) || (bt?.answerKey ? Object.keys(bt.answerKey).length : 15);
                const isSolved = checkIsTaskSolved({ testId: cleanTestId, bookTestId: cleanTestId, hwId: hw.id, taskType: 'kitap' }, currentUser.id, submissions, homeworks, studyAssignments);

                dayTasks.push({
                  id: dedupeKey,
                  dedupeKey,
                  title: `${cleanBookTitle} — ${bt?.name || bt?.title || 'Test'}`,
                  subtitle: `${dayCfg.long} Kitap Testi`,
                  dayName: dayCfg.long,
                  dayKey: dayCfg.key,
                  subject: bt?.subject || bt?.subjectName || hw.subject || bookObj?.subject || 'Genel',
                  unit: bt?.unit || bt?.unitName || '',
                  topic: bt?.topic || bt?.topicName || '',
                  questionCount: qCount,
                  dueDate: tDateStr,
                  sourceType: 'program',
                  sourceLabel: '📚 Kitap Testi',
                  bookTestId: cleanTestId,
                  realTestId: cleanTestId,
                  bookId: bookObj?.id || hw.bookId,
                  bookTitle: cleanBookTitle,
                  testName: bt?.name || bt?.title,
                  answerKey: bt?.answerKey || bt?.answer_key,
                  isCompleted: isSolved,
                  isBookAssignment: true
                });
              }
            }
          });
        } else if (!isBook && hw.dueDate) {
          const hwDayKey = resolveDayKey(hw.dueDate);
          const isDateMatch = (dayInfo.ymd && hw.dueDate.startsWith(dayInfo.ymd)) || (hwDayKey === dayCfg.key);

          if (isDateMatch) {
            const dedupeKey = `hw_${hw.id}`;
            if (!seenDayTaskKeys.has(dedupeKey)) {
              seenDayTaskKeys.add(dedupeKey);
              const qCount = Number(hw.questionCount || hw.totalQuestions) || 12;
              const isSolved = checkIsTaskSolved({ hwId: hw.id, id: hw.id }, currentUser.id, submissions, homeworks, studyAssignments);

              dayTasks.push({
                id: dedupeKey,
                dedupeKey,
                title: hw.title || 'Ödev Görevi',
                subtitle: `${dayCfg.long} Ödevi`,
                dayName: dayCfg.long,
                dayKey: dayCfg.key,
                subject: hw.subject || 'Genel',
                unit: hw.unit || '',
                topic: hw.topic || '',
                questionCount: qCount,
                dueDate: hw.dueDate,
                sourceType: 'homework',
                sourceLabel: '📝 Atanmış Ödev',
                realTestId: hw.realTestId || hw.testId || hw.id,
                isCompleted: isSolved
              });
            }
          }
        }
      });

      return {
        ...dayCfg,
        dateLabel: dayInfo.dateLabel || '',
        tasks: dayTasks,
        totalQuestions: dayTasks.reduce((acc, t) => acc + (Number(t.questionCount) || 0), 0),
        completedCount: dayTasks.filter(t => t.isCompleted).length
      };
    });
  }, [coachingProfile, homeworks, bookTests, books, submissions, studyAssignments, currentUser, studentIdStr, studentUuidStr, WEEK_DAYS_CONFIG, weekDayDateMap]);

  // ── 📚 DERS VE HIZ TAKİBİ ──
  const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('study_selected_subject') || 'Matematik');
  const [subjectStats, setSubjectStats] = useState(() => {
    try {
      const saved = localStorage.getItem('study_subject_stats');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [minutesPerQuestion, setMinutesPerQuestion] = useState(() => {
    const saved = localStorage.getItem('study_min_per_q');
    return saved ? Number(saved) : 2.0;
  });

  const [targetGoalCount, setTargetGoalCount] = useState(() => {
    const saved = localStorage.getItem('study_target_goal');
    return saved ? Number(saved) : 12;
  });

  const [currentProgressCount, setCurrentProgressCount] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`study_progress_${todayKey}`);
    return saved ? Number(saved) : 0;
  });

  // ── 📋 OPTİK VE CEVAP STATE'LERİ ──
  const [opticalAnswers, setOpticalAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem('study_optical_answers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [completedQuizResult, setCompletedQuizResult] = useState(null);
  const [isSubmittingOptical, setIsSubmittingOptical] = useState(false);
  const [activeToolTab, setActiveToolTab] = useState(() => selectedTask ? 'optical' : 'analytics');

  // Eşleşen test objesi & Cevap Anahtarı
  const matchedTestObj = useMemo(() => {
    if (!selectedTask) return null;
    const testId = String(selectedTask.bookTestId || selectedTask.realTestId || selectedTask.testId || selectedTask.id || '');
    const cleanTId = testId.replace(/^bt_|^test_/, '');
    if (bookTests && Array.isArray(bookTests)) {
      const found = bookTests.find(bt => {
        const btId = String(bt.id || '');
        return btId === testId || btId.replace(/^bt_|^test_/, '') === cleanTId;
      });
      if (found) return found;
    }
    return null;
  }, [selectedTask, bookTests]);

  const resolvedAnswerKey = useMemo(() => {
    const src = matchedTestObj || selectedTask;
    if (!src) return null;
    let key = src.answerKey || src.answer_key || src.correctAnswers;
    if (key && typeof key === 'object' && !Array.isArray(key)) {
      const arr = [];
      const total = Math.max(Object.keys(key).length, targetGoalCount || 1);
      for (let i = 1; i <= total; i++) {
        const val = key[String(i)] ?? key[i] ?? key[String(i - 1)] ?? key[i - 1];
        arr.push(val ? String(val).trim().toUpperCase() : null);
      }
      return arr.some(Boolean) ? arr : null;
    }
    if (Array.isArray(key) && key.length > 0) {
      return key.map(k => k ? String(k).trim().toUpperCase() : null);
    }
    return null;
  }, [matchedTestObj, selectedTask, targetGoalCount]);

  const isSelectedTaskOpenEnded = useMemo(() => {
    if (selectedTask?.isOpenEnded === true || selectedTask?.questionType === 'acik_uclu') return true;
    if (matchedTestObj?.isOpenEnded === true || matchedTestObj?.questionType === 'acik_uclu') return true;
    return false;
  }, [selectedTask, matchedTestObj]);

  // ── ⏳ ZAMANLAYICI MOTORU ──
  const [durations, setDurations] = useState(() => ({
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15
  }));
  const [pomodoroMode, setPomodoroMode] = useState('focus');
  const [completedCycles, setCompletedCycles] = useState(0);

  const calculatedBudgetMinutes = useMemo(() => {
    if (activeStudyMode === 'pomodoro') {
      return pomodoroMode === 'focus' ? durations.pomodoro : (pomodoroMode === 'shortBreak' ? durations.shortBreak : durations.longBreak);
    }
    return Math.max(1, Math.round((targetGoalCount || 10) * (minutesPerQuestion || 1.5)));
  }, [activeStudyMode, pomodoroMode, durations, targetGoalCount, minutesPerQuestion]);

  const [timeLeft, setTimeLeft] = useState(() => calculatedBudgetMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

  const timerRef = useRef(null);
  const stopwatchRef = useRef(null);

  // ── 🎧 AMBİYANS, SES VE DİĞER ARAÇLAR ──
  const [soundVolumes, setSoundVolumes] = useState({ rain: 0, fire: 0, whitenoise: 0, waves: 0, forest: 0, cafe: 0 });
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [questionChimeEnabled, setQuestionChimeEnabled] = useState(() => localStorage.getItem('study_question_chime_enabled') === 'true');
  const [pauseLimitMode, setPauseLimitMode] = useState(() => localStorage.getItem('study_pause_limit_mode') || 'none');

  const [plantedForest, setPlantedForest] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    try {
      const saved = localStorage.getItem(`study_forest_${todayKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [streakData, setStreakData] = useState(() => {
    try {
      const saved = localStorage.getItem('study_streak_data');
      return saved ? JSON.parse(saved) : { currentStreak: 1, lastStudyDate: new Date().toISOString().split('T')[0] };
    } catch {
      return { currentStreak: 1, lastStudyDate: new Date().toISOString().split('T')[0] };
    }
  });

  const [dailyStats, setDailyStats] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    try {
      const saved = localStorage.getItem(`study_daily_${todayKey}`);
      return saved ? JSON.parse(saved) : { totalMinutes: 0, questionsDone: 0, sessionsCount: 0 };
    } catch {
      return { totalMinutes: 0, questionsDone: 0, sessionsCount: 0 };
    }
  });

  const [todoList, setTodoList] = useState(() => {
    try {
      const saved = localStorage.getItem('study_todo_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newTodoText, setNewTodoText] = useState('');
  const [scratchNotes, setScratchNotes] = useState(() => localStorage.getItem('study_scratch_notes') || '');

  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const activeQuote = FOCUS_QUOTES[activeQuoteIndex % FOCUS_QUOTES.length];
  const currentTree = TREE_SPECIES[completedCycles % TREE_SPECIES.length];

  // ── 🔄 SAYAÇ VE SÜRE ETKİLEŞİMLERİ ──
  useEffect(() => {
    if (!isRunning && sessionElapsedSeconds === 0 && activeStudyMode !== 'stopwatch') {
      setTimeLeft(calculatedBudgetMinutes * 60);
    }
  }, [calculatedBudgetMinutes, isRunning, sessionElapsedSeconds, activeStudyMode]);

  // Sayfa açılışında yönlendirilmiş görevi otomatik al
  useEffect(() => {
    const incomingTask = location.state?.autoStartTask || (() => {
      try {
        const raw = localStorage.getItem('study_active_selected_task');
        if (raw) {
          localStorage.removeItem('study_active_selected_task');
          return JSON.parse(raw);
        }
      } catch {}
      return null;
    })();

    if (incomingTask) {
      handleSelectTask(incomingTask);
    }
  }, [location.state]);

  // Screen Wake Lock
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isRunning) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
        } catch {
          setWakeLockActive(false);
        }
      }
    };
    if (isRunning) requestWakeLock();
    else setWakeLockActive(false);

    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [isRunning]);

  // Sayaç Döngüsü (Interval Tick)
  useEffect(() => {
    if (activeStudyMode === 'stopwatch') {
      if (isRunning) {
        stopwatchRef.current = setInterval(() => {
          setStopwatchSeconds(prev => {
            const next = prev + 1;
            setSessionElapsedSeconds(e => e + 1);
            if (next % 60 === 0) {
              setDailyStats(d => {
                const updated = { ...d, totalMinutes: (d.totalMinutes || 0) + 1 };
                const todayKey = new Date().toISOString().split('T')[0];
                localStorage.setItem(`study_daily_${todayKey}`, JSON.stringify(updated));
                return updated;
              });
            }
            return next;
          });
        }, 1000);
      } else {
        clearInterval(stopwatchRef.current);
      }
      return () => clearInterval(stopwatchRef.current);
    }

    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          setSessionElapsedSeconds(e => {
            const nextElapsed = e + 1;
            if (activeStudyMode === 'question' && questionChimeEnabled && minutesPerQuestion > 0) {
              const intervalSec = Math.round(minutesPerQuestion * 60);
              if (intervalSec > 0 && nextElapsed % intervalSec === 0) {
                ambientAudio.playSoftDing();
              }
            }
            return nextElapsed;
          });

          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            handleCompleteSession();
            return 0;
          }
          if (prev % 60 === 0) {
            setDailyStats(d => {
              const updated = { ...d, totalMinutes: (d.totalMinutes || 0) + 1 };
              const todayKey = new Date().toISOString().split('T')[0];
              localStorage.setItem(`study_daily_${todayKey}`, JSON.stringify(updated));
              return updated;
            });
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, activeStudyMode, questionChimeEnabled, minutesPerQuestion]);

  // Seans Tamamlama
  const handleCompleteSession = () => {
    ambientAudio.playChime();
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });

    const elapsedSec = sessionElapsedSeconds > 0 ? sessionElapsedSeconds : (calculatedBudgetMinutes * 60 - timeLeft);
    if (activeStudyMode === 'question' && currentProgressCount > 0) {
      recordSubjectStudy(selectedSubject, currentProgressCount, elapsedSec);
    }

    // Ağaç dikme
    const newTree = {
      id: String(Date.now()),
      icon: currentTree.icon,
      name: currentTree.name,
      task: selectedTask?.title || `${selectedSubject} Çalışması`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      duration: Math.max(1, Math.round(elapsedSec / 60))
    };
    const updatedForest = [...plantedForest, newTree];
    setPlantedForest(updatedForest);
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`study_forest_${todayKey}`, JSON.stringify(updatedForest));

    setCompletedCycles(c => c + 1);
    setIsRunning(false);
  };

  // Ders Çalışma İstatistiği Kaydı
  const recordSubjectStudy = (subject, questionsCount, elapsedSec) => {
    if (!subject || questionsCount <= 0 || elapsedSec < 10) return;
    setSubjectStats(prev => {
      const existing = prev[subject] || { totalQuestions: 0, totalSeconds: 0, sessionCount: 0 };
      const updated = {
        ...prev,
        [subject]: {
          totalQuestions: (existing.totalQuestions || 0) + questionsCount,
          totalSeconds: (existing.totalSeconds || 0) + elapsedSec,
          sessionCount: (existing.sessionCount || 0) + 1,
          lastSessionSecPerQ: Math.round(elapsedSec / questionsCount),
          lastUpdated: new Date().toISOString()
        }
      };
      localStorage.setItem('study_subject_stats', JSON.stringify(updated));
      return updated;
    });
  };

  // Ders Seçimi
  const handleSelectSubject = (subjId) => {
    setSelectedSubject(subjId);
    localStorage.setItem('study_selected_subject', subjId);
    const subjObj = STUDY_SUBJECTS.find(s => s.id === subjId);
    const stat = subjectStats[subjId];
    let recommendedMin = subjObj ? subjObj.defaultMinPerQ : 1.5;
    if (stat && stat.totalQuestions >= 3 && stat.totalSeconds > 0) {
      recommendedMin = +(stat.totalSeconds / stat.totalQuestions / 60).toFixed(1);
    }
    setMinutesPerQuestion(recommendedMin);
  };

  // Görev Seçme
  const handleSelectTask = (task) => {
    if (!task) return;
    setSelectedTask(task);
    setShowHomeworkPickerModal(false);
    setActiveToolTab('optical');

    const matchedSubj = matchSubjectFromTask(task);
    if (matchedSubj) {
      setSelectedSubject(matchedSubj);
      localStorage.setItem('study_selected_subject', matchedSubj);
    }

    const qCount = extractQuestionCountFromTask(task);
    setTargetGoalCount(qCount);
    localStorage.setItem('study_target_goal', String(qCount));

    // Kayıtlı taslak cevapları yükle
    const taskId = task.id || task.testId || task.bookTestId || task.hwId;
    try {
      const saved = taskId ? localStorage.getItem(`study_optical_answers_${taskId}`) : null;
      if (saved) setOpticalAnswers(JSON.parse(saved));
      else setOpticalAnswers({});
    } catch {
      setOpticalAnswers({});
    }
  };

  const handleClearTask = () => {
    setSelectedTask(null);
    setOpticalAnswers({});
    localStorage.removeItem('study_optical_answers');
  };

  // Optik İşaretleme
  const handleSelectOpticalOption = (qNo, optLetter) => {
    setOpticalAnswers(prev => {
      const next = { ...prev };
      if (next[qNo] === optLetter) delete next[qNo];
      else next[qNo] = optLetter;

      const taskId = selectedTask?.id || selectedTask?.testId || selectedTask?.bookTestId || selectedTask?.hwId;
      try {
        localStorage.setItem('study_optical_answers', JSON.stringify(next));
        if (taskId) localStorage.setItem(`study_optical_answers_${taskId}`, JSON.stringify(next));
      } catch {}

      const answeredCount = Object.keys(next).length;
      setCurrentProgressCount(answeredCount);

      if (!isRunning && sessionElapsedSeconds === 0) setIsRunning(true);
      return next;
    });
  };

  const handleSetOpticalTextAnswer = (qNo, textVal) => {
    setOpticalAnswers(prev => {
      const next = { ...prev };
      if (!textVal) delete next[qNo];
      else next[qNo] = textVal;

      const taskId = selectedTask?.id || selectedTask?.testId || selectedTask?.bookTestId || selectedTask?.hwId;
      try {
        localStorage.setItem('study_optical_answers', JSON.stringify(next));
        if (taskId) localStorage.setItem(`study_optical_answers_${taskId}`, JSON.stringify(next));
      } catch {}

      const answeredCount = Object.keys(next).length;
      setCurrentProgressCount(answeredCount);
      if (!isRunning && sessionElapsedSeconds === 0) setIsRunning(true);
      return next;
    });
  };

  const handleClearOpticalAnswers = () => {
    setOpticalAnswers({});
    localStorage.removeItem('study_optical_answers');
    const taskId = selectedTask?.id || selectedTask?.testId || selectedTask?.bookTestId || selectedTask?.hwId;
    if (taskId) localStorage.removeItem(`study_optical_answers_${taskId}`);
    setCurrentProgressCount(0);
  };

  // Optik Testi Teslim Et & Değerlendir
  const handleFinishOpticalQuiz = async () => {
    if (isSubmittingOptical) return;
    setIsSubmittingOptical(true);

    const totalQ = Math.max(1, targetGoalCount || 10);
    const answersList = [];
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;

    for (let i = 1; i <= totalQ; i++) {
      const userRaw = opticalAnswers[i] ?? opticalAnswers[String(i)] ?? null;
      const userAns = userRaw ? String(userRaw).trim().toUpperCase() : '';
      const correctRaw = resolvedAnswerKey ? (resolvedAnswerKey[i - 1] || null) : null;
      const correctAns = correctRaw ? String(correctRaw).trim().toUpperCase() : '';
      let isCorrect = null;

      if (!userAns) {
        blankCount++;
      } else if (correctAns) {
        isCorrect = userAns === correctAns;
        if (isCorrect) correctCount++;
        else wrongCount++;
      } else {
        isCorrect = true;
        correctCount++;
      }

      answersList.push({
        questionNo: i,
        userAnswerLetter: userAns || null,
        correctAnswerLetter: correctAns || null,
        isCorrect
      });
    }

    const netScore = Math.max(0, correctCount - (wrongCount * 0.25));
    const scorePct = Math.round((correctCount / totalQ) * 100);
    const submissionId = `sub_study_${Date.now()}`;

    const subPayload = {
      id: submissionId,
      studentId: currentUser?.id || 'guest',
      studentName: currentUser?.name || 'Öğrenci',
      testId: selectedTask?.bookTestId || selectedTask?.id || submissionId,
      bookId: selectedTask?.bookId || null,
      bookTitle: selectedTask?.bookTitle || null,
      title: selectedTask?.title || `${selectedSubject} Testi`,
      subject: selectedSubject,
      answers: answersList,
      correctCount,
      wrongCount,
      blankCount,
      totalQuestions: totalQ,
      netScore: Number.isInteger(netScore) ? netScore : Number(netScore.toFixed(2)),
      score: scorePct,
      durationSeconds: sessionElapsedSeconds,
      status: 'completed',
      submittedAt: new Date().toISOString()
    };

    if (typeof addSubmission === 'function') {
      try {
        await addSubmission(subPayload);
      } catch (e) {
        console.warn('Submission save error:', e);
      }
    }

    recordSubjectStudy(selectedSubject, Object.keys(opticalAnswers).length, sessionElapsedSeconds);
    handleClearOpticalAnswers();
    setIsRunning(false);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });

    setCompletedQuizResult({
      ...subPayload,
      hasAnswerKey: Boolean(resolvedAnswerKey)
    });
    setIsSubmittingOptical(false);
  };

  // Hız Analitiği Verileri
  const trackedSubjectsList = useMemo(() => {
    return STUDY_SUBJECTS.map(subj => {
      const stat = subjectStats[subj.id];
      const hasData = Boolean(stat && stat.totalQuestions > 0 && stat.totalSeconds > 0);
      const avgSec = hasData ? Math.round(stat.totalSeconds / stat.totalQuestions) : 0;
      const evaluation = getSpeedEvaluation(avgSec, subj.defaultMinPerQ);
      return {
        ...subj,
        hasData,
        avgSec,
        totalQuestions: stat?.totalQuestions || 0,
        totalSeconds: stat?.totalSeconds || 0,
        sessionCount: stat?.sessionCount || 0,
        evaluation
      };
    });
  }, [subjectStats]);

  const activeTrackedCount = trackedSubjectsList.filter(s => s.hasData).length;
  const overallAvgSecPerQ = useMemo(() => {
    let totQ = 0;
    let totSec = 0;
    Object.values(subjectStats).forEach(s => {
      totQ += (s.totalQuestions || 0);
      totSec += (s.totalSeconds || 0);
    });
    return totQ > 0 ? Math.round(totSec / totQ) : 0;
  }, [subjectStats]);

  const fastestSubject = useMemo(() => {
    const valid = trackedSubjectsList.filter(s => s.hasData && s.totalQuestions >= 2);
    if (valid.length === 0) return null;
    return [...valid].sort((a, b) => a.avgSec - b.avgSec)[0];
  }, [trackedSubjectsList]);

  const slowestSubject = useMemo(() => {
    const valid = trackedSubjectsList.filter(s => s.hasData && s.totalQuestions >= 2);
    if (valid.length === 0) return null;
    return [...valid].sort((a, b) => b.avgSec - a.avgSec)[0];
  }, [trackedSubjectsList]);

  // Süre Formatlayıcı
  const displayTimerText = useMemo(() => {
    if (activeStudyMode === 'stopwatch') {
      const m = Math.floor(stopwatchSeconds / 60);
      const s = stopwatchSeconds % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [activeStudyMode, stopwatchSeconds, timeLeft]);

  const timerStatusLabel = isRunning ? '⚡ Odaklanılıyor...' : (sessionElapsedSeconds > 0 ? '⏸️ Duraklatıldı' : '🎯 Seans Başlamadı');
  const progressPercentage = useMemo(() => {
    if (activeStudyMode === 'stopwatch') return 100;
    const total = calculatedBudgetMinutes * 60;
    if (!total || total <= 0) return 0;
    return Math.round(((total - timeLeft) / total) * 100);
  }, [activeStudyMode, calculatedBudgetMinutes, timeLeft]);

  return (
    <div style={{
      minHeight: '100vh',
      background: themeObj.bg,
      color: themeObj.text,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      transition: 'background 0.3s ease, color 0.3s ease'
    }}>
      {/* ─── 1. MODERN HEADER ─── */}
      <StudyRoomHeader
        themeObj={themeObj}
        isMobile={isMobile}
        currentUser={currentUser}
        streakData={streakData}
        wakeLockActive={wakeLockActive}
        isFullscreen={isFullscreen}
        toggleFullscreen={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
          } else {
            document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
          }
        }}
        showSettingsDrawer={showSettingsDrawer}
        setShowSettingsDrawer={setShowSettingsDrawer}
        activeTheme={activeTheme}
        setActiveTheme={t => {
          setActiveTheme(t);
          localStorage.setItem('study_theme', t);
        }}
        themes={THEMES}
        onBack={() => navigate('/student')}
      />

      {/* ─── 2. ANA SAYFA GÖVDESİ ─── */}
      <main style={{
        flex: 1,
        maxWidth: 960,
        margin: '0 auto',
        width: '100%',
        padding: isMobile ? '1rem 0.85rem 4rem' : '2rem 1.5rem 5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        boxSizing: 'border-box'
      }}>
        {/* MERKEZ ODAK SAYAÇ KARTI (HERO CARD) */}
        <StudyHeroCard
          themeObj={themeObj}
          isMobile={isMobile}
          activeStudyMode={activeStudyMode}
          handleSwitchMasterMode={m => {
            setActiveStudyMode(m);
            localStorage.setItem('study_master_mode', m);
            setIsRunning(false);
          }}
          selectedTask={selectedTask}
          onOpenTaskPicker={() => setShowHomeworkPickerModal(true)}
          onClearTask={handleClearTask}
          selectedSubject={selectedSubject}
          handleSelectSubject={handleSelectSubject}
          minutesPerQuestion={minutesPerQuestion}
          setMinutesPerQuestion={m => {
            setMinutesPerQuestion(m);
            localStorage.setItem('study_min_per_q', String(m));
          }}
          targetGoalCount={targetGoalCount}
          handleSetNewTargetGoal={q => {
            setTargetGoalCount(q);
            localStorage.setItem('study_target_goal', String(q));
          }}
          currentProgressCount={currentProgressCount}
          handleIncrementProgress={() => {
            setCurrentProgressCount(c => {
              const next = c + 1;
              const todayKey = new Date().toISOString().split('T')[0];
              localStorage.setItem(`study_progress_${todayKey}`, String(next));
              return next;
            });
            if (!isRunning && sessionElapsedSeconds === 0) setIsRunning(true);
          }}
          handleDecrementProgress={() => {
            setCurrentProgressCount(c => {
              const next = Math.max(0, c - 1);
              const todayKey = new Date().toISOString().split('T')[0];
              localStorage.setItem(`study_progress_${todayKey}`, String(next));
              return next;
            });
          }}
          isRunning={isRunning}
          handleToggleTimer={() => setIsRunning(r => !r)}
          handleResetTimer={() => {
            setIsRunning(false);
            setSessionElapsedSeconds(0);
            setStopwatchSeconds(0);
            setTimeLeft(calculatedBudgetMinutes * 60);
          }}
          handleConfirmFinish={handleCompleteSession}
          displayTimerText={displayTimerText}
          timerStatusLabel={timerStatusLabel}
          progressPercentage={progressPercentage}
          activeQuote={activeQuote}
          onNextQuote={() => setActiveQuoteIndex(i => i + 1)}
          pomodoroMode={pomodoroMode}
          handleSelectPomodoroMode={m => {
            setPomodoroMode(m);
            setIsRunning(false);
          }}
          completedCycles={completedCycles}
          currentTree={currentTree}
          activeToolTab={activeToolTab}
          setActiveToolTab={setActiveToolTab}
          opticalAnswerCount={Object.keys(opticalAnswers).length}
          hasAnswerKey={Boolean(resolvedAnswerKey)}
          isSelectedTaskOpenEnded={isSelectedTaskOpenEnded}
        />

        {/* ─── 3. AKILLI YARDIMCI ARAÇLAR SEKMESİ (TAB BAR) ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: selectedTask ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
          gap: 6,
          background: themeObj.innerBg,
          padding: 4,
          borderRadius: 18,
          border: `1px solid ${themeObj.border}`
        }}>
          {selectedTask && (
            <button
              onClick={() => setActiveToolTab('optical')}
              style={{
                padding: '0.65rem 0.5rem',
                borderRadius: 14,
                border: 'none',
                background: activeToolTab === 'optical' ? (themeObj.accentGradient || themeObj.accent) : 'transparent',
                color: activeToolTab === 'optical' ? '#ffffff' : themeObj.subText,
                fontWeight: 800,
                fontSize: isMobile ? '0.74rem' : '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s',
                boxShadow: activeToolTab === 'optical' ? `0 4px 12px ${themeObj.accent}40` : 'none'
              }}
            >
              <span>📋</span>
              <span>{isSmallMobile ? 'Optik' : 'Optik Cevaplar'}</span>
            </button>
          )}

          <button
            onClick={() => setActiveToolTab('analytics')}
            style={{
              padding: '0.65rem 0.5rem',
              borderRadius: 14,
              border: 'none',
              background: activeToolTab === 'analytics' ? (themeObj.accentGradient || themeObj.accent) : 'transparent',
              color: activeToolTab === 'analytics' ? '#ffffff' : themeObj.subText,
              fontWeight: 800,
              fontSize: isMobile ? '0.74rem' : '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s',
              boxShadow: activeToolTab === 'analytics' ? `0 4px 12px ${themeObj.accent}40` : 'none'
            }}
          >
            <span>📊</span>
            <span>{isSmallMobile ? 'Hız' : 'Hız Analizi'}</span>
          </button>

          <button
            onClick={() => setActiveToolTab('forest')}
            style={{
              padding: '0.65rem 0.5rem',
              borderRadius: 14,
              border: 'none',
              background: activeToolTab === 'forest' ? (themeObj.accentGradient || themeObj.accent) : 'transparent',
              color: activeToolTab === 'forest' ? '#ffffff' : themeObj.subText,
              fontWeight: 800,
              fontSize: isMobile ? '0.74rem' : '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s',
              boxShadow: activeToolTab === 'forest' ? `0 4px 12px ${themeObj.accent}40` : 'none'
            }}
          >
            <span>🌲</span>
            <span>{isSmallMobile ? 'Orman' : 'Başarı Ormanı'}</span>
          </button>

          <button
            onClick={() => setActiveToolTab('ambient')}
            style={{
              padding: '0.65rem 0.5rem',
              borderRadius: 14,
              border: 'none',
              background: activeToolTab === 'ambient' ? (themeObj.accentGradient || themeObj.accent) : 'transparent',
              color: activeToolTab === 'ambient' ? '#ffffff' : themeObj.subText,
              fontWeight: 800,
              fontSize: isMobile ? '0.74rem' : '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s',
              boxShadow: activeToolTab === 'ambient' ? `0 4px 12px ${themeObj.accent}40` : 'none'
            }}
          >
            <span>🎧</span>
            <span>{isSmallMobile ? 'Notlar' : 'Ambiyans & Not'}</span>
          </button>
        </div>

        {/* ─── 4. AKTİF SEKME PANELİ ─── */}
        <div>
          {activeToolTab === 'optical' && selectedTask && (
            <StudyOpticalPanel
              themeObj={themeObj}
              isMobile={isMobile}
              targetGoalCount={targetGoalCount}
              opticalAnswers={opticalAnswers}
              handleSelectOpticalOption={handleSelectOpticalOption}
              handleSetOpticalTextAnswer={handleSetOpticalTextAnswer}
              handleClearOpticalAnswers={handleClearOpticalAnswers}
              handleFinishOpticalQuiz={handleFinishOpticalQuiz}
              isSubmittingOptical={isSubmittingOptical}
              isSelectedTaskOpenEnded={isSelectedTaskOpenEnded}
              resolvedAnswerKey={resolvedAnswerKey}
            />
          )}

          {activeToolTab === 'analytics' && (
            <StudySpeedAnalytics
              themeObj={themeObj}
              isMobile={isMobile}
              overallAvgSecPerQ={overallAvgSecPerQ}
              totalTrackedQuestions={allAssignedTasks.length}
              fastestSubject={fastestSubject}
              slowestSubject={slowestSubject}
              trackedSubjectsList={trackedSubjectsList}
              activeTrackedCount={activeTrackedCount}
              selectedSubject={selectedSubject}
              handleSelectSubject={handleSelectSubject}
              handleSwitchMasterMode={m => setActiveStudyMode(m)}
              clearSubjectStats={() => {
                setSubjectStats({});
                localStorage.removeItem('study_subject_stats');
              }}
              loadDemoSubjectStats={() => {
                const demo = {
                  'Matematik': { totalQuestions: 40, totalSeconds: 4800, sessionCount: 4 },
                  'Türkçe': { totalQuestions: 35, totalSeconds: 2450, sessionCount: 3 },
                  'Fen Bilimleri': { totalQuestions: 25, totalSeconds: 2250, sessionCount: 2 }
                };
                setSubjectStats(demo);
                localStorage.setItem('study_subject_stats', JSON.stringify(demo));
              }}
            />
          )}

          {activeToolTab === 'forest' && (
            <StudyForestBadges
              themeObj={themeObj}
              isMobile={isMobile}
              plantedForest={plantedForest}
              dailyStats={dailyStats}
            />
          )}

          {activeToolTab === 'ambient' && (
            <StudyAmbientNotes
              themeObj={themeObj}
              isMobile={isMobile}
              soundVolumes={soundVolumes}
              handleVolumeChange={(id, vol) => {
                setSoundVolumes(v => ({ ...v, [id]: vol }));
                try {
                  if (vol > 0) ambientAudio.playSound(id, vol / 100);
                  else ambientAudio.stopSound(id);
                } catch {}
              }}
              ambientAudio={ambientAudio}
              todoList={todoList}
              newTodoText={newTodoText}
              setNewTodoText={setNewTodoText}
              handleAddTodo={() => {
                if (!newTodoText.trim()) return;
                const newItem = { id: Date.now(), text: newTodoText.trim(), completed: false };
                const nextList = [...todoList, newItem];
                setTodoList(nextList);
                localStorage.setItem('study_todo_list', JSON.stringify(nextList));
                setNewTodoText('');
              }}
              handleToggleTodo={id => {
                const nextList = todoList.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
                setTodoList(nextList);
                localStorage.setItem('study_todo_list', JSON.stringify(nextList));
              }}
              handleDeleteTodo={id => {
                const nextList = todoList.filter(t => t.id !== id);
                setTodoList(nextList);
                localStorage.setItem('study_todo_list', JSON.stringify(nextList));
              }}
              scratchNotes={scratchNotes}
              setScratchNotes={text => {
                setScratchNotes(text);
                localStorage.setItem('study_scratch_notes', text);
              }}
            />
          )}
        </div>
      </main>

      {/* ─── 5. MODAL VE ÇEKMECELER ─── */}
      <StudyHomeworkPickerModal
        show={showHomeworkPickerModal}
        onClose={() => setShowHomeworkPickerModal(false)}
        themeObj={themeObj}
        isMobile={isMobile}
        hwSourceTab={hwSourceTab}
        setHwSourceTab={setHwSourceTab}
        hwFilterSubject={hwFilterSubject}
        setHwFilterSubject={setHwFilterSubject}
        hwSearchQuery={hwSearchQuery}
        setHwSearchQuery={setHwSearchQuery}
        hideCompletedTasks={hideCompletedTasks}
        setHideCompletedTasks={setHideCompletedTasks}
        selectedProgramDay={selectedProgramDay}
        setSelectedProgramDay={setSelectedProgramDay}
        weeklyProgramGrouped={weeklyProgramGrouped}
        allAssignedTasks={allAssignedTasks}
        onSelectTask={handleSelectTask}
      />

      <StudyResultModal
        result={completedQuizResult}
        onClose={() => setCompletedQuizResult(null)}
        onViewResults={() => {
          setCompletedQuizResult(null);
          navigate('/student-results');
        }}
        themeObj={themeObj}
        isMobile={isMobile}
      />

      <StudySettingsDrawer
        show={showSettingsDrawer}
        onClose={() => setShowSettingsDrawer(false)}
        themeObj={themeObj}
        isMobile={isMobile}
        themes={THEMES}
        activeTheme={activeTheme}
        setActiveTheme={t => {
          setActiveTheme(t);
          localStorage.setItem('study_theme', t);
        }}
        isFullscreen={isFullscreen}
        toggleFullscreen={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
          } else {
            document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
          }
        }}
        wakeLockActive={wakeLockActive}
        questionChimeEnabled={questionChimeEnabled}
        setQuestionChimeEnabled={setQuestionChimeEnabled}
        pauseLimitMode={pauseLimitMode}
        setPauseLimitMode={setPauseLimitMode}
      />
    </div>
  );
}
