import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2,
  Brain, Sparkles, LayoutGrid, Clock, Settings2, Plus, ArrowLeft,
  CheckCircle2, X, FileText, Check, ChevronRight, ChevronDown, Layers, Sliders,
  Coffee, Zap, Flame, Compass, Target, BookOpen, Music, CheckSquare
} from 'lucide-react';
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
import { isHomeworkForStudent, createCompositeTestKey } from '../utils/testResolver';

import { AmbientEngine } from '../features/study-room/services/ambientAudioEngine';
import {
  FOCUS_QUOTES,
  TREE_SPECIES,
  getThemeList,
  STUDY_SUBJECTS,
  STUDY_ENVIRONMENTS,
  AMBIENT_SOUNDS,
  formatSecToMinSec,
  getSpeedEvaluation,
  matchSubjectFromTask,
  extractQuestionCountFromTask
} from '../features/study-room/constants/studyRoomConstants';
import './StudyRoomPage.css';

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
  const isDesktop = useMediaQuery('(min-width: 960px)');

  const { books = [], bookTests = [] } = useTrackedBooks() || {};
  const { studyPlans = [], studyAssignments = [] } = useStudyPlan() || {};
  const { homeworks = [], submitHomework } = useHomework() || {};
  const { submissions = [], addSubmission } = useEvaluation() || {};
  const { coachingProfiles = {}, getCoachingProfileForStudent, saveCoachingProfile } = useCoaching() || {};

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
  const themeObj = useMemo(() => {
    return (Array.isArray(THEMES) && THEMES.find(t => t.id === activeTheme)) || THEMES?.[0] || {
      id: 'cyberpunk',
      name: 'E-Test Dark',
      bg: '#090d16',
      cardBg: '#0f172a',
      innerBg: '#1e293b',
      border: 'rgba(255, 255, 255, 0.08)',
      text: '#f8fafc',
      subText: '#94a3b8',
      accent: '#6366f1',
      accentGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      buttonBg: '#1e293b',
      isDark: true
    };
  }, [THEMES, activeTheme]);

  // ── 🎯 ÇALIŞMA MODLARI: 'question' | 'pomodoro' | 'stopwatch' ──
  const [activeStudyMode, setActiveStudyMode] = useState(() => localStorage.getItem('study_master_mode') || 'question');

  // ── 📝 GÖREV & ÖDEV SEÇİMİ ──
  const [selectedTask, setSelectedTask] = useState(null);
  const [showHomeworkPickerModal, setShowHomeworkPickerModal] = useState(false);
  const [hwSearchQuery, setHwSearchQuery] = useState('');
  const [hwFilterSubject, setHwFilterSubject] = useState('all');
  const [hwSourceTab, setHwSourceTab] = useState('program');
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);

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

    // A. Atanmış Ödevler & Denemeler
    studentHws.forEach(hw => {
      const bookObj = (books || []).find(b => 
        String(b.id) === String(hw.bookId || hw.raw_data?.bookId) || 
        (toUUID(b.id) && toUUID(b.id) === toUUID(hw.bookId || hw.raw_data?.bookId))
      );
      const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim();

      const isExam = Boolean(
        hw.type === 'physicalExam' ||
        hw.contentType === 'physicalExam' ||
        hw.raw_data?.type === 'physicalExam' ||
        hw.raw_data?.contentType === 'physicalExam' ||
        hw.isPhysical ||
        hw.raw_data?.isPhysical ||
        hw.bookType === 'exam' ||
        bookObj?.bookType === 'exam' ||
        (hw.title && /deneme|sınav|hazır bulunuşluk|hazir bulunusluk/i.test(hw.title))
      );

      const testDates = {
        ...(hw.test_due_dates || hw.testDueDates || hw.scheduleDates || hw.raw_data?.testDueDates || hw.raw_data?.scheduleDates || {})
      };
      const hasIndividualTestDates = !isExam && Object.keys(testDates).length > 0;

      if (isExam || !hasIndividualTestDates) {
        const isSolved = checkIsTaskSolved({ hwId: hw.id, id: hw.id }, currentUser.id, submissions, homeworks, studyAssignments, null, bookTests, books);
        const qCount = Number(hw.totalQuestions || hw.questionCount || (Array.isArray(hw.tests) ? hw.tests.length : (Array.isArray(hw.questions) ? hw.questions.length : 0))) || (isExam ? 54 : 10);
        const hwDueDate = hw.dueDate || hw.due_date || hw.raw_data?.dueDate;
        const assignedDayKey = resolveDayKey(hwDueDate || hw.startDate || hw.assignedAt);

        const dedupeKey = `hw_${hw.id}`;
        if (!seenTaskKeys.has(dedupeKey)) {
          seenTaskKeys.add(dedupeKey);
          taskList.push({
            id: hw.id,
            dedupeKey,
            title: hw.title || (isExam ? 'Deneme Sınavı' : 'Ödev'),
            subtitle: isExam ? '📋 Deneme Sınavı' : (hw.subject || 'Ödev Görevi'),
            subject: isExam ? '📋 Deneme' : (hw.subject || 'Genel'),
            unit: hw.unit || '',
            topic: hw.topic || (isExam ? cleanBookTitle : ''),
            questionCount: qCount,
            dueDate: hwDueDate,
            dayKey: assignedDayKey,
            dayName: assignedDayKey ? WEEK_DAYS_CONFIG.find(d => d.key === assignedDayKey)?.long : null,
            sourceType: 'homework',
            sourceLabel: isExam ? '📋 Deneme Sınavı' : '📝 Atanmış Ödev',
            type: hw.type || (isExam ? 'physicalExam' : 'standard'),
            isExamTask: isExam,
            isPhysical: isExam || hw.isPhysical || hw.raw_data?.isPhysical,
            realTestId: hw.realTestId || hw.testId || hw.id,
            hwId: hw.id,
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
        const isSolved = checkIsTaskSolved({ testId: bt.id, bookTestId: bt.id, taskType: 'kitap', bookTitle: cleanBookTitle, subject: bt.subject || book.subject }, currentUser.id, submissions, homeworks, studyAssignments, null, bookTests, books);
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

        const isReading = item.taskType === 'okuma' ||
          item.subject === 'Kitap Okuma' ||
          String(item.topic || '').toLowerCase().includes('kitap okuma') ||
          String(item.title || '').toLowerCase().includes('kitap okuma') ||
          String(item.taskType || '').toLowerCase().includes('okuma') ||
          Boolean(item.readingBookId);

        const dedupeKey = `prog_${dayKey}_${item.id || idx}_${item.text || item.topic}`;
        if (!seenTaskKeys.has(dedupeKey)) {
          seenTaskKeys.add(dedupeKey);
          const qCount = isReading ? 0 : (Number(item.targetQuestions || item.questionCount) || 20);
          const isSolved = Boolean(item.done || checkIsTaskSolved(item, currentUser.id, submissions, homeworks, studyAssignments, null, bookTests, books));

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
            isReadingTask: isReading,
            sourceType: isReading ? 'okuma' : (matchedBookTest ? 'bookTest' : 'program'),
            sourceLabel: isReading ? '📖 Kitap Okuma' : (matchedBookTest ? '📚 Kitap Testi' : '📅 Ders Programı'),
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
        const isReading = item.taskType === 'okuma' ||
          item.subject === 'Kitap Okuma' ||
          String(item.topic || '').toLowerCase().includes('kitap okuma') ||
          String(item.title || '').toLowerCase().includes('kitap okuma') ||
          String(item.taskType || '').toLowerCase().includes('okuma') ||
          Boolean(item.readingBookId);

        const dedupeKey = `prog_${dayCfg.key}_${item.id || idx}_${item.text || item.topic}`;
        if (!seenDayTaskKeys.has(dedupeKey)) {
          seenDayTaskKeys.add(dedupeKey);
          const qCount = isReading ? 0 : (Number(item.targetQuestions || item.questionCount) || 20);
          const isSolved = Boolean(item.done || checkIsTaskSolved(item, currentUser.id, submissions, homeworks, studyAssignments, null, bookTests, books));
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
            isReadingTask: isReading,
            sourceType: isReading ? 'okuma' : (matchedBookTest ? 'bookTest' : 'program'),
            sourceLabel: isReading ? '📖 Kitap Okuma' : (matchedBookTest ? '📚 Kitap Testi' : '📅 Ders Programı'),
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
        if (isBook && !bookObj) return;

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
            const isExplicitDate = String(tDateStr).includes('-') || String(tDateStr).includes('.');
            const isMatchDate = isExplicitDate
              ? (dayInfo.ymd && tDateStr.startsWith(dayInfo.ymd))
              : (targetDayKey === dayCfg.key);

            if (isMatchDate) {
              const canonicalTestId = testUuid || cleanTestId;
              const dedupeKey = `bt_${canonicalTestId}`;
              if (seenDayTaskKeys.has(dedupeKey) || seenDayTaskKeys.has(`bt_${cleanTestId}`)) return;
              seenDayTaskKeys.add(dedupeKey);
              seenDayTaskKeys.add(`bt_${cleanTestId}`);

              let bt = (bookTests || []).find(b => {
                const bId = String(b.id);
                return bId === cleanTestId || bId === String(testId) || (testUuid && toUUID(bId) === testUuid);
              });

              let resolvedSubject = bt?.subject || bt?.subjectName || '';
              let resolvedUnit = bt?.unit || bt?.unitName || '';
              const sId = bt?.subjectId || bt?.subject_id;
              const tId = bt?.topicId || bt?.topic_id;

              let bookSubjects = bookObj?.subjects || [];
              if (typeof bookSubjects === 'string') {
                try { bookSubjects = JSON.parse(bookSubjects); } catch {}
              }

              if (Array.isArray(bookSubjects)) {
                for (const subj of bookSubjects) {
                  if (!subj || subj.__meta === true || subj.id === '__book_meta__') continue;
                  const isSubjMatch = sId && String(subj.id) === String(sId);
                  let isTopicMatch = false;

                  // 1. Direct tests under subject
                  if (!bt && Array.isArray(subj.tests)) {
                    const directTest = subj.tests.find(t => {
                      const tid = String(t.id);
                      return tid === cleanTestId || tid === String(testId) || (testUuid && toUUID(tid) === testUuid);
                    });
                    if (directTest) {
                      bt = directTest;
                      if (!resolvedSubject) resolvedSubject = subj.name;
                      break;
                    }
                  }

                  // 2. Topic tests
                  for (const top of (subj.topics || [])) {
                    const topTest = (top.tests || []).find(t => {
                      const tid = String(t.id);
                      return tid === cleanTestId || tid === String(testId) || (testUuid && toUUID(tid) === testUuid);
                    });
                    if ((tId && String(top.id) === String(tId)) || topTest) {
                      resolvedUnit = top.name;
                      isTopicMatch = true;
                      if (!bt && topTest) {
                        bt = topTest;
                      }
                      break;
                    }
                  }
                  if (isSubjMatch || isTopicMatch) {
                    if (!resolvedSubject) resolvedSubject = subj.name;
                    break;
                  }
                }
              }

              if (!resolvedSubject) {
                resolvedSubject = hw.subject || bookObj?.subject || 'Genel';
              }

              const qCount = Number(bt?.questionCount || bt?.question_count) || (bt?.answerKey ? Object.keys(bt.answerKey).filter(k => k !== '__meta' && k !== 'meta').length : 12);

                const isSolved = checkIsTaskSolved({ testId: cleanTestId, bookTestId: cleanTestId, hwId: hw.id, taskType: 'kitap', subject: resolvedSubject, unitTopic: resolvedUnit, bookTitle: cleanBookTitle }, currentUser.id, submissions, homeworks, studyAssignments, null, bookTests, books);

                dayTasks.push({
                  id: dedupeKey,
                  dedupeKey,
                  title: `${cleanBookTitle} — ${bt?.name || bt?.title || 'Test'}`,
                  subtitle: `${dayCfg.long} Kitap Testi`,
                  dayName: dayCfg.long,
                  dayKey: dayCfg.key,
                  subject: resolvedSubject,
                  unit: resolvedUnit || bt?.unit || bt?.unitName || '',
                  topic: resolvedUnit || bt?.topic || bt?.topicName || '',
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
          });
        }

        // Homework or Exam with a single due date matching this day
        const hwDueDate = hw.dueDate || hw.due_date || hw.raw_data?.dueDate;
        const isExam = Boolean(
          hw.type === 'physicalExam' ||
          hw.contentType === 'physicalExam' ||
          hw.raw_data?.type === 'physicalExam' ||
          hw.raw_data?.contentType === 'physicalExam' ||
          hw.isPhysical ||
          hw.raw_data?.isPhysical ||
          hw.bookType === 'exam' ||
          bookObj?.bookType === 'exam' ||
          (hw.title && /deneme|sınav|hazır bulunuşluk|hazir bulunusluk/i.test(hw.title))
        );

        if (hwDueDate && (isExam || !isBook || Object.keys(testDates).length === 0)) {
          const hwDayKey = resolveDayKey(hwDueDate);
          const isExplicitDate = String(hwDueDate).includes('-') || String(hwDueDate).includes('.');
          const isDateMatch = isExplicitDate
            ? (dayInfo.ymd && hwDueDate.startsWith(dayInfo.ymd))
            : (hwDayKey === dayCfg.key);

          if (isDateMatch) {
            const dedupeKey = `hw_${hw.id}`;
            if (!seenDayTaskKeys.has(dedupeKey)) {
              seenDayTaskKeys.add(dedupeKey);
              const qCount = Number(hw.totalQuestions || hw.questionCount || (Array.isArray(hw.tests) ? hw.tests.length : (Array.isArray(hw.questions) ? hw.questions.length : 0))) || (isExam ? 54 : 12);
              const isSolved = checkIsTaskSolved({ hwId: hw.id, id: hw.id }, currentUser.id, submissions, homeworks, studyAssignments, null, bookTests, books);

              dayTasks.push({
                id: dedupeKey,
                dedupeKey,
                title: hw.title || (isExam ? 'Deneme Sınavı' : 'Ödev Görevi'),
                subtitle: isExam ? `${dayCfg.long} Denemesi` : `${dayCfg.long} Ödevi`,
                dayName: dayCfg.long,
                dayKey: dayCfg.key,
                subject: isExam ? '📋 Deneme' : (hw.subject || 'Genel'),
                unit: hw.unit || '',
                topic: hw.topic || (isExam ? cleanBookTitle : ''),
                questionCount: qCount,
                dueDate: hwDueDate,
                sourceType: 'program',
                sourceLabel: isExam ? '📋 Deneme Sınavı' : '📝 Atanmış Ödev',
                isExamTask: isExam,
                isPhysical: isExam || hw.isPhysical || hw.raw_data?.isPhysical,
                realTestId: hw.realTestId || hw.testId || hw.id,
                hwId: hw.id,
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

      if (selectedTask.bookId) {
        const byBook = bookTests.filter(bt => String(bt.book_id || bt.bookId) === String(selectedTask.bookId));
        if (selectedTask.testOrder !== undefined) {
          const byOrder = byBook.find(bt => Number(bt.test_order || bt.testOrder) === Number(selectedTask.testOrder));
          if (byOrder) return byOrder;
        }
        if (selectedTask.title) {
          const cleanTitle = (t) => String(t || '').trim().toLowerCase();
          const byTitle = byBook.find(bt => cleanTitle(bt.title) === cleanTitle(selectedTask.title));
          if (byTitle) return byTitle;
        }
      }
    }
    return null;
  }, [selectedTask, bookTests]);

  const rawAnswerKey = useMemo(() => {
    const src = matchedTestObj || selectedTask;
    if (!src) return null;
    return (
      src.answer_key ||
      src.answerKey ||
      src.correctAnswers ||
      src.raw_data?.answer_key ||
      src.raw_data?.answerKey ||
      selectedTask?.answer_key ||
      selectedTask?.answerKey ||
      selectedTask?.raw_data?.answer_key ||
      null
    );
  }, [matchedTestObj, selectedTask]);

  const resolvedAnswerKey = useMemo(() => {
    const key = rawAnswerKey;
    if (!key) return null;
    if (typeof key === 'object' && !Array.isArray(key)) {
      const arr = [];
      const total = Math.max(Object.keys(key).filter(k => k !== '__meta' && k !== 'meta').length, targetGoalCount || 1);
      for (let i = 1; i <= total; i++) {
        const val = key[String(i)] ?? key[i] ?? key[String(i - 1)] ?? key[i - 1];
        arr.push(val !== undefined && val !== null ? String(val).trim() : null);
      }
      return arr.some(Boolean) ? arr : null;
    }
    if (Array.isArray(key) && key.length > 0) {
      return key.map(k => (k !== undefined && k !== null ? String(k).trim() : null));
    }
    return null;
  }, [rawAnswerKey, targetGoalCount]);

  const isSelectedTaskOpenEnded = useMemo(() => {
    if (selectedTask?.isOpenEnded === true || selectedTask?.questionType === 'acik_uclu' || selectedTask?.type === 'acik_uclu') return true;
    if (matchedTestObj?.isOpenEnded === true || matchedTestObj?.questionType === 'acik_uclu' || matchedTestObj?.type === 'acik_uclu') return true;
    if (rawAnswerKey && typeof rawAnswerKey === 'object') {
      const meta = rawAnswerKey.__meta || rawAnswerKey.meta;
      if (meta && (meta.isOpenEnded || meta.type === 'acik_uclu')) return true;
      const nonMetaVals = Object.entries(rawAnswerKey)
        .filter(([k]) => k !== '__meta' && k !== 'meta')
        .map(([, v]) => String(v || '').trim());
      if (nonMetaVals.length > 0 && nonMetaVals.some(v => v.length > 1 && !/^[A-E]$/i.test(v))) {
        return true;
      }
    }
    return false;
  }, [selectedTask, matchedTestObj, rawAnswerKey]);

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
      setActiveDrawerView('optical');
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
      icon: currentTree?.icon || '🌲',
      name: currentTree?.name || 'Ağaç',
      task: selectedTask?.title || `${selectedSubject || 'Ders'} Çalışması`,
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

    const isReading = task.isReadingTask ||
      task.taskType === 'okuma' ||
      task.subject === 'Kitap Okuma' ||
      String(task.topic || '').toLowerCase().includes('kitap okuma') ||
      String(task.title || '').toLowerCase().includes('kitap okuma') ||
      String(task.taskType || '').toLowerCase().includes('okuma') ||
      Boolean(task.readingBookId);

    if (isReading) {
      // Kitap okuma görevi soru çözüm DEĞİLDİR: Odaklı okuma seansıdır
      if (activeStudyMode === 'question') {
        setActiveStudyMode('pomodoro');
        localStorage.setItem('study_master_mode', 'pomodoro');
      }
      setActiveToolTab('ambient');
      setTargetGoalCount(0);
      localStorage.setItem('study_target_goal', '0');
      setSelectedSubject('Türkçe');
      setOpticalAnswers({});
      return;
    }

    setActiveToolTab('optical');
    setActiveDrawerView('optical');

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
      const userAns = userRaw ? String(userRaw).trim() : '';
      const correctRaw = resolvedAnswerKey ? (resolvedAnswerKey[i - 1] || null) : null;
      const correctAns = correctRaw ? String(correctRaw).trim() : '';
      let isCorrect = null;

      if (!userAns) {
        blankCount++;
      } else if (correctAns) {
        const cleanCompare = (s) => String(s || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
        isCorrect = cleanCompare(userAns) === cleanCompare(correctAns);
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

    const targetTestId = String(
      matchedTestObj?.id ||
      selectedTask?.realTestId ||
      selectedTask?.bookTestId ||
      selectedTask?.testId ||
      selectedTask?.id ||
      submissionId
    );
    const cleanTestId = targetTestId.replace(/^bt_|^test_|^prog_|^hw_/, '');
    const targetHwId = selectedTask?.hwId || selectedTask?.homeworkId || (homeworks?.find(h => String(h.id) === String(selectedTask?.id))?.id) || null;
    const targetBookId = selectedTask?.bookId || matchedTestObj?.book_id || matchedTestObj?.bookId || null;
    const targetBook = (books || []).find(b => String(b.id) === String(targetBookId));
    const targetBookTitle = targetBook?.title || selectedTask?.bookTitle || matchedTestObj?.bookTitle || 'Kitap';
    const targetUnit = selectedTask?.unit || selectedTask?.topic || matchedTestObj?.unit || matchedTestObj?.unitName || matchedTestObj?.topic || '';
    const targetTitle = selectedTask?.testName || selectedTask?.title || matchedTestObj?.name || matchedTestObj?.title || `${selectedSubject} Testi`;
    const finalCompKey = createCompositeTestKey(targetBookTitle, selectedSubject, targetUnit, targetTitle);

    const subPayload = {
      id: submissionId,
      studentId: currentUser?.id || 'guest',
      student_id: currentUser?.id || 'guest',
      userId: currentUser?.id || 'guest',
      user_id: currentUser?.id || 'guest',
      studentName: currentUser?.name || 'Öğrenci',
      testId: targetTestId,
      test_id: targetTestId,
      realTestId: targetTestId,
      bookTestId: matchedTestObj?.id || selectedTask?.bookTestId || targetTestId,
      bookId: targetBookId,
      book_id: targetBookId,
      bookTitle: targetBookTitle,
      title: targetTitle,
      testTitle: targetTitle,
      testName: targetTitle,
      subject: selectedSubject,
      subjectName: selectedSubject,
      unitTopic: targetUnit,
      unit: targetUnit,
      topic: targetUnit,
      compositeKey: finalCompKey,
      hwId: targetHwId,
      homeworkId: targetHwId,
      answers: answersList,
      correctCount,
      wrongCount,
      blankCount,
      emptyCount: blankCount,
      totalQuestions: totalQ,
      netScore: Number.isInteger(netScore) ? netScore : Number(netScore.toFixed(2)),
      totalNet: Number.isInteger(netScore) ? netScore : Number(netScore.toFixed(2)),
      score: scorePct,
      scorePercentage: scorePct,
      durationSeconds: sessionElapsedSeconds,
      status: 'completed',
      approvalStatus: 'approved',
      isApproved: true,
      isAutoEvaluated: true,
      sourceType: 'study_room',
      submittedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      metadata: {
        realTestId: targetTestId,
        bookTestId: matchedTestObj?.id || selectedTask?.bookTestId || targetTestId,
        hwId: targetHwId,
        bookTitle: targetBookTitle,
        unitTopic: targetUnit,
        compositeKey: finalCompKey
      }
    };

    if (typeof addSubmission === 'function') {
      try {
        await addSubmission(subPayload);
      } catch (e) {
        console.warn('Submission save error:', e);
      }
    }

    // 1. Ödev Senkronizasyonu
    if (targetHwId && typeof submitHomework === 'function') {
      try {
        await submitHomework(targetHwId, currentUser?.id, scorePct, totalQ, {
          testId: targetTestId,
          correctCount,
          wrongCount,
          emptyCount: blankCount,
          netScore,
          score: scorePct
        });
      } catch (hwErr) {
        console.warn('Homework submit sync error:', hwErr);
      }
    }

    // 2. Koçluk Haftalık Program Senkronizasyonu
    if (selectedTask?.programItem && coachingProfile?.weeklyProgram && typeof saveCoachingProfile === 'function') {
      try {
        const pItem = selectedTask.programItem;
        const updatedWeekly = coachingProfile.weeklyProgram.map(d => ({
          ...d,
          items: (d.items || []).map(it => {
            if (it.id === pItem.id || (it.text && it.text === pItem.text && it.day === pItem.day)) {
              return { ...it, done: true };
            }
            return it;
          })
        }));
        await saveCoachingProfile({
          ...coachingProfile,
          weeklyProgram: updatedWeekly
        });
      } catch (cpErr) {
        console.warn('Coaching profile program update error:', cpErr);
      }
    }

    // 3. Global olayları tetikle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('submissions-updated', { detail: { testId: targetTestId, studentId: currentUser?.id } }));
      window.dispatchEvent(new CustomEvent('etest-submissions-updated', { detail: { newSubId: submissionId } }));
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

  const handleToggleTimer = () => setIsRunning(r => !r);

  const selectedTaskIsReading = useMemo(() => {
    if (!selectedTask) return false;
    return Boolean(
      selectedTask.isReadingTask ||
      selectedTask.taskType === 'okuma' ||
      selectedTask.subject === 'Kitap Okuma' ||
      String(selectedTask.topic || '').toLowerCase().includes('kitap okuma') ||
      String(selectedTask.title || '').toLowerCase().includes('kitap okuma') ||
      String(selectedTask.taskType || '').toLowerCase().includes('okuma') ||
      selectedTask.readingBookId
    );
  }, [selectedTask]);

  // ── 🎨 FOCUS ROOM ENVIRONMENT & AMBIENT AUDIO STATE ──
  const [activeEnvId, setActiveEnvId] = useState(() => localStorage.getItem('study_env_id') || 'lofi_bedroom');
  const activeEnv = useMemo(() => {
    return STUDY_ENVIRONMENTS.find(e => e.id === activeEnvId) || STUDY_ENVIRONMENTS[0];
  }, [activeEnvId]);

  const [activeSoundId, setActiveSoundId] = useState(() => localStorage.getItem('study_sound_id') || 'brownnoise');
  const [soundVolume, setSoundVolume] = useState(() => {
    const v = localStorage.getItem('study_sound_volume');
    return v !== null ? Number(v) : 50;
  });
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);

  // ── 📂 SLIDE-OVER DRAWER STATE (No feature deletion) ──
  // 'dashboard' | 'optical' | 'notes' | null
  const [activeDrawerView, setActiveDrawerView] = useState(null);

  // ── ⏱️ FOCUS / BREAK MODE TOGGLE (Matching reference image) ──
  const [focusSegment, setFocusSegment] = useState('focus'); // 'focus' | 'break'

  // Audio synchronization
  useEffect(() => {
    if (!isSoundPlaying || isSoundMuted || soundVolume <= 0) {
      ambientAudio.stopAll();
    } else {
      Object.keys(ambientAudio.nodes || {}).forEach(k => {
        if (k !== activeSoundId) ambientAudio.stopSound(k);
      });
      ambientAudio.setSoundVolume(activeSoundId, soundVolume / 100);
    }
  }, [activeSoundId, isSoundPlaying, isSoundMuted, soundVolume]);

  useEffect(() => {
    return () => {
      ambientAudio.stopAll();
    };
  }, []);

  const handleSelectEnv = (env) => {
    setActiveEnvId(env.id);
    localStorage.setItem('study_env_id', env.id);
    if (env.defaultSound && env.defaultSound !== activeSoundId) {
      setActiveSoundId(env.defaultSound);
      localStorage.setItem('study_sound_id', env.defaultSound);
    }
  };

  const toggleSoundPower = () => {
    setIsSoundPlaying(p => {
      const next = !p;
      if (next && soundVolume <= 0) {
        setSoundVolume(50);
        localStorage.setItem('study_sound_volume', '50');
      }
      return next;
    });
  };

  const handleVolumeChange = (e) => {
    const v = Number(e.target.value);
    setSoundVolume(v);
    localStorage.setItem('study_sound_volume', String(v));
    if (v > 0 && !isSoundPlaying) setIsSoundPlaying(true);
    if (v === 0) setIsSoundPlaying(false);
  };

  const handleSelectFocusSegment = (seg) => {
    setFocusSegment(seg);
    setIsRunning(false);
    if (seg === 'break') {
      setTimeLeft(5 * 60);
      setSessionElapsedSeconds(0);
    } else {
      setTimeLeft(calculatedBudgetMinutes * 60);
      setSessionElapsedSeconds(0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Level & XP
  const currentXP = Number(currentUser?.xp) || (completedCycles * 40 + currentProgressCount * 10) || 50;
  const currentLevel = Math.max(1, Math.floor(currentXP / 100) + 1);
  const levelProgressPct = Math.min(100, Math.max(10, currentXP % 100));

  const answeredOpticalCount = Object.keys(opticalAnswers || {}).length;

  return (
    <div className={`focus-room-container ${activeDrawerView === 'optical' ? 'has-optical-open' : ''}`}>
      {/* ─── 0. AMBIENT BACKDROP & MOOD LIGHTING ─── */}
      <div 
        className="focus-room-backdrop" 
        style={{
          backgroundImage: `url(${activeEnv.image})`,
          backgroundPosition: 'center',
          backgroundColor: activeEnv.accent ? `${activeEnv.accent}15` : '#0b0c16'
        }}
      />
      <div className="focus-room-overlay" style={{ background: activeEnv.overlay }} />

      {activeEnv.id === 'lofi_bedroom' && (
        <div 
          className="focus-room-lamp-glow" 
          style={{ background: `radial-gradient(circle, ${activeEnv.glowColor || 'rgba(251, 146, 60, 0.28)'} 0%, transparent 70%)` }} 
        />
      )}

      {/* ─── 1. TOP FLOATING PILL BAR (Matching Reference Image) ─── */}
      <header className="focus-top-pill-bar">
        {/* Brand */}
        <div className="focus-brand" onClick={() => navigate('/student')} title="Öğrenci Paneline Dön">
          <div className="focus-brand-logo">
            <Brain size={19} />
          </div>
          <span className="focus-brand-title">FocusRooms</span>
        </div>

        {/* Center Tabs: Dashboard | Solo Study | Rooms */}
        <div className="focus-tabs-segment">
          <button 
            type="button"
            className={`focus-tab-btn ${activeDrawerView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveDrawerView(v => v === 'dashboard' ? null : 'dashboard')}
            title="Çalışma Karnesi & Fidanlık"
          >
            <LayoutGrid size={15} />
            <span>Dashboard</span>
          </button>

          <button 
            type="button"
            className={`focus-tab-btn ${!activeDrawerView ? 'active' : ''}`}
            onClick={() => setActiveDrawerView(null)}
            title="Bireysel Odak Odası"
          >
            <Zap size={15} />
            <span>Solo Study</span>
          </button>

          <button 
            type="button"
            className={`focus-tab-btn ${activeDrawerView === 'optical' ? 'active' : ''}`}
            onClick={() => setActiveDrawerView(v => v === 'optical' ? null : 'optical')}
            title="Optik Cevap Formu & Görevler"
          >
            <BookOpen size={15} />
            <span>Optik Form</span>
            {answeredOpticalCount > 0 && (
              <span style={{
                background: '#a855f7',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 900,
                padding: '1px 6px',
                borderRadius: 99
              }}>
                {answeredOpticalCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Status: LVL Badge | Avatar | Exit */}
        <div className="focus-top-right">
          <div className="focus-level-badge" title={`${currentXP} XP • Seviye ${currentLevel}`}>
            <span>LVL {currentLevel}</span>
            <div className="focus-level-bar">
              <div className="focus-level-fill" style={{ width: `${levelProgressPct}%` }} />
            </div>
          </div>

          <button 
            type="button"
            className="focus-avatar-btn" 
            onClick={() => navigate('/student')}
            title={currentUser?.name || 'Profil'}
          >
            <span style={{ fontSize: '0.76rem', fontWeight: 800 }}>
              {(currentUser?.name || 'Ö')[0]?.toUpperCase()}
            </span>
          </button>

          <button 
            type="button"
            className="focus-exit-btn" 
            onClick={() => navigate('/student')} 
            title="Çıkış (Panale Dön)"
          >
            <ArrowLeft size={16} />
          </button>
        </div>
      </header>

      {/* ─── 2. CENTER STAGE (Minimal Zen Circle Timer) ─── */}
      <main className="focus-center-stage">
        {/* Focus | Break Mode Switcher */}
        <div className="focus-mode-switcher">
          <button 
            type="button"
            className={`focus-mode-btn ${focusSegment === 'focus' ? 'active' : ''}`}
            onClick={() => handleSelectFocusSegment('focus')}
          >
            <Zap size={14} />
            <span>Focus</span>
          </button>
          <button 
            type="button"
            className={`focus-mode-btn ${focusSegment === 'break' ? 'active' : ''}`}
            onClick={() => handleSelectFocusSegment('break')}
          >
            <Coffee size={14} />
            <span>Break</span>
          </button>
        </div>

        {/* Circular SVG Timer */}
        <div className="focus-circle-wrapper">
          <svg className="focus-svg-ring" viewBox="0 0 300 300">
            <circle
              cx="150"
              cy="150"
              r="135"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="4"
            />
            <circle
              cx="150"
              cy="150"
              r="135"
              fill="none"
              stroke="url(#focusTimerGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 135}
              strokeDashoffset={((100 - Math.min(100, Math.max(0, progressPercentage))) / 100) * (2 * Math.PI * 135)}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
            <defs>
              <linearGradient id="focusTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>

          <div className="focus-timer-content">
            <div className="focus-timer-digits">
              {displayTimerText}
            </div>
            <div className="focus-timer-sub">
              {focusSegment === 'break' ? 'BREAK' : (isRunning ? 'FOCUSING' : (sessionElapsedSeconds > 0 ? 'PAUSED' : 'READY'))}
            </div>
          </div>
        </div>

        {/* Task Pill / Subject Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            className="focus-task-pill"
            onClick={() => setShowHomeworkPickerModal(true)}
            title="Görevi Değiştir"
          >
            <span>{selectedTaskIsReading ? '📖' : '🎯'}</span>
            <span>
              {selectedTask ? (selectedTask.title || selectedTask.name) : `${selectedSubject} Odak Seansı`}
            </span>
            {!selectedTaskIsReading && (
              <span style={{ color: '#c084fc', fontWeight: 800 }}>
                • {currentProgressCount} / {targetGoalCount} Soru
              </span>
            )}
            <ChevronRight size={14} style={{ opacity: 0.6 }} />
          </button>

          {!selectedTaskIsReading && (
            <button
              type="button"
              className="focus-fast-add-btn"
              onClick={() => {
                handleIncrementProgress();
                confetti({ particleCount: 30, spread: 55, origin: { y: 0.6 } });
              }}
              title="Bir soru tamamla (+1)"
            >
              <Plus size={14} />
              <span>+1 Soru</span>
            </button>
          )}
        </div>

        {/* Controls: Reset | Play/Pause | Finish */}
        <div className="focus-controls-row">
          <button 
            type="button"
            className="focus-reset-btn"
            onClick={() => {
              setIsRunning(false);
              setSessionElapsedSeconds(0);
              setStopwatchSeconds(0);
              setTimeLeft(calculatedBudgetMinutes * 60);
            }}
            title="Sıfırla"
          >
            <RotateCcw size={18} />
          </button>

          <button 
            type="button"
            className="focus-play-btn"
            onClick={handleToggleTimer}
            title={isRunning ? "Duraklat" : "Başlat"}
          >
            {isRunning ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 3 }} />}
          </button>

          <button 
            type="button"
            className="focus-reset-btn"
            onClick={handleCompleteSession}
            title="Seansı Bitir"
            style={{ color: '#34d399' }}
          >
            <CheckCircle2 size={19} />
          </button>
        </div>

        {/* Optical Form Quick Access Capsule */}
        {selectedTask && !selectedTaskIsReading && (
          <button
            type="button"
            className={`focus-center-optical-pill ${activeDrawerView === 'optical' ? 'active-pill' : ''}`}
            onClick={() => setActiveDrawerView(v => v === 'optical' ? null : 'optical')}
            title={activeDrawerView === 'optical' ? "Optik Formu Gizle" : "Optik Formu Aç & Cevapları İşaretle"}
          >
            <BookOpen size={15} />
            <span>
              {activeDrawerView === 'optical'
                ? `Optik Form Açık (${answeredOpticalCount}/${targetGoalCount || 12})`
                : `Optik Formu Aç (${answeredOpticalCount}/${targetGoalCount || 12})`}
            </span>
            <ChevronRight 
              size={14} 
              style={{ 
                transform: activeDrawerView === 'optical' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.25s ease',
                opacity: 0.8 
              }} 
            />
          </button>
        )}
      </main>

      {/* ─── 3. BOTTOM FLOATING DOCK (Matching Reference Image) ─── */}
      <footer className="focus-bottom-dock">
        {/* Left: Sound / Brown Noise Controller */}
        <div className="focus-dock-col">
          <div className="focus-dock-title">
            <span 
              onClick={() => setShowSoundPicker(s => !s)} 
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
              title="Sesi Değiştir"
            >
              <span>{AMBIENT_SOUNDS.find(s => s.id === activeSoundId)?.name || 'Brown Noise'}</span>
              <ChevronDown size={12} />
            </span>
            <span style={{ fontSize: '0.68rem', color: isSoundPlaying && !isSoundMuted ? '#34d399' : '#64748b' }}>
              {isSoundPlaying && !isSoundMuted ? 'Açık' : 'Kapalı'}
            </span>
          </div>

          <div className="focus-sound-row">
            <button 
              type="button"
              className="focus-sound-icon-btn"
              onClick={toggleSoundPower}
              title={isSoundPlaying ? "Sesi Kapat" : "Sesi Aç"}
              style={{ color: isSoundPlaying && !isSoundMuted ? '#a855f7' : '#64748b' }}
            >
              <Music size={16} />
            </button>

            <input
              type="range"
              min="0"
              max="100"
              value={isSoundPlaying && !isSoundMuted ? soundVolume : 0}
              onChange={handleVolumeChange}
              className="focus-slider-track"
              style={{ accentColor: '#a855f7', width: '100%', cursor: 'pointer' }}
            />

            <span className="focus-sound-label">
              {isSoundPlaying && !isSoundMuted ? `${soundVolume}%` : 'Off'}
            </span>
          </div>

          {/* Sound Selector Dropdown */}
          {showSoundPicker && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 12px)',
              left: 10,
              width: 220,
              background: 'rgba(20, 18, 30, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 16,
              padding: 8,
              boxShadow: '0 16px 35px rgba(0,0,0,0.6)',
              zIndex: 100
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', padding: '4px 8px' }}>
                ORTAM SESLERİ
              </div>
              {AMBIENT_SOUNDS.map(s => (
                <div
                  key={s.id}
                  onClick={() => {
                    setActiveSoundId(s.id);
                    localStorage.setItem('study_sound_id', s.id);
                    setShowSoundPicker(false);
                    if (!isSoundPlaying) setIsSoundPlaying(true);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: activeSoundId === s.id ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                    color: activeSoundId === s.id ? '#ffffff' : '#cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    transition: 'all 0.15s'
                  }}
                  className="hover:bg-white/10"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span>{s.icon}</span>
                    <span>{s.name}</span>
                  </span>
                  {activeSoundId === s.id && <Check size={14} color="#a855f7" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center: Environment Thumbnails */}
        <div className="focus-dock-col">
          <div className="focus-dock-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <LayoutGrid size={13} />
              <span>Environment</span>
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              {activeEnv.name}
            </span>
          </div>

          <div className="focus-env-grid">
            {STUDY_ENVIRONMENTS.map(env => {
              const isActive = activeEnvId === env.id;
              return (
                <button
                  key={env.id}
                  type="button"
                  className={`focus-env-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectEnv(env)}
                  style={{
                    backgroundImage: `url(${env.image})`,
                    backgroundColor: env.accent ? `${env.accent}20` : '#1e1b4b'
                  }}
                  title={env.name}
                >
                  <span className="focus-env-name">
                    {env.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Timer Summary & Customize Button */}
        <div className="focus-dock-col">
          <div className="focus-dock-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={13} />
              <span>Timer</span>
            </span>
          </div>

          <div className="focus-timer-summary">
            <span>Focus: {calculatedBudgetMinutes}m</span>
            <span>Break: 5m</span>
          </div>

          <button
            type="button"
            className="focus-customize-btn"
            onClick={() => setShowSettingsDrawer(true)}
            title="Süre ve Ders Ayarları"
          >
            <Sliders size={13} />
            <span>Customize</span>
          </button>
        </div>
      </footer>

      {/* ─── 4. CORNER FLOATING CONTROLS ─── */}
      <aside className="focus-corner-right">
        <button 
          type="button"
          className="focus-corner-btn" 
          onClick={() => setIsSoundMuted(m => !m)}
          title={isSoundMuted ? "Sesi Aç" : "Sesi Kapat"}
        >
          {isSoundMuted ? <VolumeX size={18} color="#ef4444" /> : <Volume2 size={18} />}
        </button>

        <button 
          type="button"
          className="focus-corner-btn" 
          onClick={toggleFullscreen}
          title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        <button 
          type="button"
          className="focus-corner-btn" 
          onClick={() => setActiveDrawerView(v => v === 'notes' ? null : 'notes')}
          title="Not Defteri"
          style={{ color: activeDrawerView === 'notes' ? '#a855f7' : '#cbd5e1' }}
        >
          <FileText size={18} />
        </button>
      </aside>

      {/* ─── 5. SLIDE-OVER DRAWERS (ZERO FEATURE LOSS) ─── */}
      {/* 5A. Optical Form Drawer (Harmonious Dual Display, No Heavy Dimming) */}
      {activeDrawerView === 'optical' && (
        <>
          <div className="focus-drawer-overlay optical-overlay" onClick={() => setActiveDrawerView(null)} />
          <div className="focus-drawer-panel focus-optical-panel-glass">
            <div className="focus-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #a855f7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: '#ffffff' }}>
                    Optik Cevap Formu
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedTask ? (selectedTask.title || selectedTask.name) : `${selectedSubject} Testi`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{
                  background: 'rgba(168, 85, 247, 0.18)',
                  color: '#e9d5ff',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 8,
                  whiteSpace: 'nowrap'
                }}>
                  {answeredOpticalCount} / {targetGoalCount || 12}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setHwSourceTab('books');
                    setShowHomeworkPickerModal(true);
                  }}
                  style={{
                    background: 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#e9d5ff',
                    borderRadius: 8,
                    padding: '5px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                  title="Kütüphane kitaplarından test seç veya değiştir"
                >
                  <BookOpen size={13} />
                  <span>Değiştir</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setActiveDrawerView(null)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  className="hover:bg-white/15"
                  title="Optik Formu Kapat / Gizle"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="focus-drawer-body">
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
                rawAnswerKey={rawAnswerKey}
                resolvedAnswerKey={resolvedAnswerKey}
              />
            </div>
          </div>
        </>
      )}

      {/* 5B. Dashboard Drawer (Speed Analytics & Forest) */}
      {activeDrawerView === 'dashboard' && (
        <>
          <div className="focus-drawer-overlay" onClick={() => setActiveDrawerView(null)} />
          <div className="focus-drawer-panel" style={{ width: 560 }}>
            <div className="focus-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: '#ffffff' }}>
                    Çalışma Karnesi & Fidanlık
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Hız analizi, dikilen ağaçlar ve çalışma geçmişi
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setActiveDrawerView(null)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                className="hover:bg-white/15"
              >
                <X size={18} />
              </button>
            </div>

            <div className="focus-drawer-body">
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

              <div style={{ marginTop: 12 }}>
                <StudyForestBadges
                  themeObj={themeObj}
                  isMobile={isMobile}
                  plantedForest={plantedForest}
                  dailyStats={dailyStats}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* 5C. Notes Drawer */}
      {activeDrawerView === 'notes' && (
        <>
          <div className="focus-drawer-overlay" onClick={() => setActiveDrawerView(null)} />
          <div className="focus-drawer-panel">
            <div className="focus-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <FileText size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: '#ffffff' }}>
                    Çalışma Notları & Hedefler
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Anlık karalama ve yapılacaklar listesi
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setActiveDrawerView(null)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                className="hover:bg-white/15"
              >
                <X size={18} />
              </button>
            </div>

            <div className="focus-drawer-body">
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
            </div>
          </div>
        </>
      )}

      {/* ─── 6. MODALS ─── */}
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
        books={books}
        bookTests={bookTests}
        submissions={submissions}
        homeworks={homeworks}
        studyAssignments={studyAssignments}
        currentUserId={currentUser?.id}
        onSelectTask={handleSelectTask}
      />

      <StudyResultModal
        result={completedQuizResult}
        onClose={() => { setCompletedQuizResult(null); handleClearTask(); }}
        onViewResults={() => {
          setCompletedQuizResult(null);
          handleClearTask();
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
        toggleFullscreen={toggleFullscreen}
        wakeLockActive={wakeLockActive}
        questionChimeEnabled={questionChimeEnabled}
        setQuestionChimeEnabled={setQuestionChimeEnabled}
        pauseLimitMode={pauseLimitMode}
        setPauseLimitMode={setPauseLimitMode}
      />
    </div>
  );
}
