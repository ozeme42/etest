import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useHomework } from '../context/HomeworkContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useCoaching } from '../context/CoachingContext';
import { useTheme } from '../context/ThemeContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { toUUID } from '../services/supabaseService';
import { checkIsTaskSolved, resolveBookTestInfo } from '../components/ProgramCenter';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2,
  Sparkles, Flame, CheckCircle2, Clock, Music, Headphones, BookOpen,
  Target, Coffee, Moon, Sun, ArrowLeft, Plus, Minus, Trash2, Check, BarChart2,
  Zap, Settings2, Bell, Award, ListTodo, Edit3, Shield, TreePine, Sprout,
  Trophy, BookmarkCheck, ChevronRight, X, Gift, Compass, Expand, Shrink,
  Gauge, Activity, TrendingUp, HelpCircle, History, BookMarked, PlayCircle,
  Layers, ExternalLink, FileText, Search, Filter, Calendar, Eye, EyeOff, MapPin,
  AlertCircle
} from 'lucide-react';

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

const ambientAudio = new AmbientEngine();

export default function StudyRoomPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');
  const { books = [], bookTests = [] } = useTrackedBooks() || {};
  const { studyPlans = [], studyAssignments = [], updateStudyAssignment } = useStudyPlan() || {};
  const { homeworks = [] } = useHomework() || {};
  const { submissions = [], addSubmission, updateSubmission } = useEvaluation() || {};
  const { getCoachingProfileForStudent } = useCoaching() || {};

  const coachingProfile = useMemo(() => {
    if (!currentUser?.id || !getCoachingProfileForStudent) return {};
    return getCoachingProfileForStudent(currentUser.id) || {};
  }, [currentUser?.id, getCoachingProfileForStudent]);

  const THEMES = useMemo(() => getThemeList(isDark), [isDark]);

  // ── 🎯 BİRLEŞİK ÇALIŞMA & HEDEF MODLARI: 'question' | 'book' | 'study' | 'break' | 'stopwatch' ──
  const [activeStudyMode, setActiveStudyMode] = useState(() => localStorage.getItem('study_master_mode') || 'question');

  // ── 📝 ATANMIŞ ÖDEV, KİTAP TESTİ & PROGRAM GÖREVLERİ SEÇİMİ ──
  const [selectedTask, setSelectedTask] = useState(null);
  const [showHomeworkPickerModal, setShowHomeworkPickerModal] = useState(false);
  const [hwSearchQuery, setHwSearchQuery] = useState('');
  const [hwFilterSubject, setHwFilterSubject] = useState('all');
  const [hwSourceTab, setHwSourceTab] = useState('program'); // Default to 'program' for weekly view
  const [hideCompletedTasks, setHideCompletedTasks] = useState(true); // Çözülenler/bitenler varsayılan olarak gizli
  
  const todayDayMap = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];
  const currentTodayKey = todayDayMap[new Date().getDay()] || 'Pzt';
  const [selectedProgramDay, setSelectedProgramDay] = useState(currentTodayKey);

  const studentIdStr = String(currentUser?.id || '');
  const studentUuidStr = String(toUUID(currentUser?.id) || '');

  // ── 📅 HAFTALIK GÜN VE TARİH BİLGİLERİ HESAPLAMA ──
  const WEEK_DAYS_CONFIG = useMemo(() => [
    { key: 'Pzt', long: 'Pazartesi', aliases: ['pzt', 'pazartesi', 'monday', 'mon'], icon: '⚡', color: '#4f46e5', bg: isDark ? 'rgba(79, 70, 229, 0.15)' : '#eef2ff' },
    { key: 'Sal', long: 'Salı', aliases: ['sal', 'salı', 'sali', 'tuesday', 'tue'], icon: '🎯', color: '#0891b2', bg: isDark ? 'rgba(8, 145, 178, 0.15)' : '#ecfeff' },
    { key: 'Çrş', long: 'Çarşamba', aliases: ['çrş', 'crs', 'çarşamba', 'carsamba', 'wednesday', 'wed'], icon: '🌿', color: '#059669', bg: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ecfdf5' },
    { key: 'Prş', long: 'Perşembe', aliases: ['prş', 'prs', 'perşembe', 'persembe', 'thursday', 'thu'], icon: '🔥', color: '#d97706', bg: isDark ? 'rgba(217, 119, 6, 0.15)' : '#fffbeb' },
    { key: 'Cum', long: 'Cuma', aliases: ['cum', 'cuma', 'friday', 'fri'], icon: '✨', color: '#7c3aed', bg: isDark ? 'rgba(124, 58, 237, 0.15)' : '#faf5ff' },
    { key: 'Cts', long: 'Cumartesi', aliases: ['cts', 'cumartesi', 'saturday', 'sat'], icon: '🚀', color: '#e11d48', bg: isDark ? 'rgba(225, 29, 72, 0.15)' : '#fff1f2' },
    { key: 'Paz', long: 'Pazar', aliases: ['paz', 'pazar', 'sunday', 'sun'], icon: '🏖️', color: '#2563eb', bg: isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff' }
  ], [isDark]);

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

  // Yardımcı: Tarih veya gün adından gün anahtarını (Pzt, Sal...) bul
  const resolveDayKey = (input) => {
    if (!input) return null;
    const str = String(input).trim().toLowerCase();
    
    // 1. Tarih eşleşmesi (YYYY-MM-DD)
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

    // 2. Gün adı eşleşmesi
    for (const cfg of WEEK_DAYS_CONFIG) {
      if (cfg.key.toLowerCase() === str || cfg.long.toLowerCase() === str || cfg.aliases.some(a => str === a || str.startsWith(a))) {
        return cfg.key;
      }
    }
    return null;
  };

  // 1. Öğrenciye atanan tüm görevleri birleştir (Ödevler, Kitap Testleri, Ders Programı, Yol Haritaları)
  const allAssignedTasks = useMemo(() => {
    if (!currentUser) return [];

    const isMatchStudent = (s) => {
      if (!s) return false;
      const sId = String(s.studentId || s.student_id || s.user_id || s.userId || '');
      if (!sId) return false;
      if (sId === studentIdStr) return true;
      if (studentUuidStr && (sId === studentUuidStr || toUUID(sId) === studentUuidStr)) return true;
      if (studentIdStr && toUUID(studentIdStr) === sId) return true;
      return false;
    };

    const isMatchHw = (hw) => {
      if (!hw) return false;
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

    // A. Atanmış Bireysel & Optik Ödevler
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
            isPhysical: hw.isPhysical || hw.type === 'physicalExam',
            realTestId: hw.realTestId || hw.testId || hw.id,
            isCompleted: isSolved
          });
        }
      }
    });

    // B. Atanmış Kitap Görevleri & Kitap Testleri ("Tüm Kitap Görevi" veya gün gün atanan testler)
    const assignedBookIds = new Set();
    studentHws.forEach(hw => {
      if (hw.bookId) assignedBookIds.add(String(hw.bookId));
      if (hw.isBookAssignment && hw.id) assignedBookIds.add(String(hw.id));
    });
    (books || []).forEach(b => {
      if (assignedBookIds.has(String(b.id)) || (b.assignedStudents && b.assignedStudents.includes(currentUser?.id)) || (b.studentIds && b.studentIds.includes(currentUser?.id))) {
        assignedBookIds.add(String(b.id));
      }
    });

    (books || []).forEach(book => {
      const isAssigned = assignedBookIds.has(String(book.id)) || assignedBookIds.size === 0;
      if (!isAssigned && (books.length > 6)) return;

      const cleanBookTitle = (book.title || 'Kitap')
        .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
        .replace(/\s*\(Tüm Kitap\)/gi, '')
        .replace(/\s*\(Kendi Eklediğim\)/gi, '')
        .trim();

      const matchingHwsForBook = studentHws.filter(h => String(h.bookId) === String(book.id) || String(h.id) === String(book.id));
      const testsForBook = (bookTests || []).filter(bt => String(bt.bookId) === String(book.id));

      testsForBook.forEach(bt => {
        const isSolved = checkIsTaskSolved({ testId: bt.id, bookTestId: bt.id, taskType: 'kitap' }, currentUser.id, submissions, homeworks, studyAssignments);
        const qCount = Number(bt.questionCount) || (bt.answerKey ? Object.keys(bt.answerKey).length : 12);

        // Bu test için belirlenmiş bir gün veya teslim tarihi var mı? (Sadece bu test özelinde gün atanmışsa)
        let testDayKey = null;
        let testDueDate = null;
        matchingHwsForBook.forEach(hw => {
          if (hw.testDueDates && hw.testDueDates[bt.id]) {
            testDueDate = hw.testDueDates[bt.id];
            testDayKey = resolveDayKey(testDueDate);
          } else if (Array.isArray(hw.tests) && hw.tests.some(tId => String(tId) === String(bt.id)) && hw.dueDate) {
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
            subject: bt.subject || book.subject || 'Genel',
            unit: bt.unit || bt.unitName || '',
            topic: bt.topic || bt.topicName || '',
            questionCount: qCount,
            dayKey: testDayKey,
            dayName: testDayKey ? WEEK_DAYS_CONFIG.find(d => d.key === testDayKey)?.long : null,
            dueDate: testDueDate,
            sourceType: 'bookTest',
            sourceLabel: '📚 Kitap Testi',
            isBookAssignment: true,
            bookTestId: bt.id,
            realTestId: bt.id,
            bookId: book.id,
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

        // Eğer bu kitap testi zaten B bölümünden eklendiyse gününü güncelle, mükerrer görev oluşturma
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

    // D. Yol Haritası (Roadmap / Study Plans)
    const studentAssignments = (studyAssignments || []).filter(a => String(a.studentId) === String(currentUser.id) || toUUID(a.studentId) === studentUuidStr);
    studentAssignments.forEach(assignment => {
      if (assignment.status === 'completed' || assignment.status === 'done' || assignment.isCompleted) return;

      const plan = (studyPlans || []).find(p => String(p.id) === String(assignment.planId || assignment.studyPlanId));
      if (!plan) return;

      let compTopics = [];
      if (Array.isArray(assignment.completedTopics)) compTopics = assignment.completedTopics;
      else if (typeof assignment.completedTopics === 'string') {
        try { compTopics = JSON.parse(assignment.completedTopics); } catch(e) {}
      } else if (typeof assignment.topic === 'string') {
        try { compTopics = JSON.parse(assignment.topic); } catch(e) {}
      }
      const completedTopicsSet = new Set(compTopics.map(String));

      (plan.subjects || []).forEach(subject => {
        const hasChildTopics = Array.isArray(subject.topics) && subject.topics.length > 0;
        const allChildTopicsDone = hasChildTopics && subject.topics.every(t => completedTopicsSet.has(String(t.id)) || completedTopicsSet.has(t.name));
        const isSubjectCompleted = completedTopicsSet.has(String(subject.id)) || completedTopicsSet.has(subject.name) || allChildTopicsDone;

        if (!hasChildTopics && subject.dueDate) {
          const sDayKey = resolveDayKey(subject.dueDate);
          const subId = `roadmap_sub_${assignment.id}_${subject.id}`;
          if (!seenTaskKeys.has(subId)) {
            seenTaskKeys.add(subId);
            taskList.push({
              id: subId,
              dedupeKey: subId,
              roadmapAssignmentId: assignment.id,
              roadmapPlanId: plan.id,
              roadmapSubjectId: subject.id,
              roadmapSubjectName: subject.name,
              roadmapTargetId: subject.id,
              isRoadmapTask: true,
              sourceType: 'roadmap',
              sourceLabel: '🗺️ Yol Haritası',
              subject: subject.name || plan.title || 'Genel',
              topic: subject.name,
              title: `${plan.title} • ${subject.name}`,
              subtitle: `${plan.title} Yol Haritası`,
              dayName: sDayKey ? WEEK_DAYS_CONFIG.find(d => d.key === sDayKey)?.long : null,
              dayKey: sDayKey,
              questionCount: 0,
              dueDate: subject.dueDate,
              isCompleted: isSubjectCompleted
            });
          }
        }

        (subject.topics || []).forEach(topic => {
          if (topic.dueDate) {
            const tDayKey = resolveDayKey(topic.dueDate);
            const isCompleted = completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name);
            const topId = `roadmap_top_${assignment.id}_${topic.id}`;
            if (!seenTaskKeys.has(topId)) {
              seenTaskKeys.add(topId);
              taskList.push({
                id: topId,
                dedupeKey: topId,
                roadmapAssignmentId: assignment.id,
                roadmapPlanId: plan.id,
                roadmapTopicId: topic.id,
                roadmapTopicName: topic.name,
                roadmapSubjectId: subject.id,
                roadmapSubjectName: subject.name,
                roadmapTargetId: topic.id,
                isRoadmapTask: true,
                sourceType: 'roadmap',
                sourceLabel: '🗺️ Yol Haritası',
                subject: subject.name || plan.title || 'Genel',
                topic: topic.name,
                title: `${plan.title} • ${topic.name}`,
                subtitle: `${plan.title} Yol Haritası`,
                dayName: tDayKey ? WEEK_DAYS_CONFIG.find(d => d.key === tDayKey)?.long : null,
                dayKey: tDayKey,
                questionCount: 0,
                dueDate: topic.dueDate,
                isCompleted
              });
            }
          }
        });
      });

    });

    return taskList;
  }, [homeworks, books, bookTests, submissions, coachingProfile, studyPlans, studyAssignments, currentUser, studentIdStr, studentUuidStr, weekDayDateMap, WEEK_DAYS_CONFIG]);

  // Haftalık Program Görevlerini Gün Gün Eksiksiz Gruplama (Birebir Ders Programı ile Özdeş)
  const weeklyProgramGrouped = useMemo(() => {
    const weeklyProg = coachingProfile?.weeklyProgram || [];
    const studentHws = (homeworks || []).filter(hw => {
      if (!hw || !currentUser) return false;
      if (hw.studentId === currentUser.id || hw.student_id === currentUser.id) return true;
      if (studentUuidStr && (hw.studentId === studentUuidStr || hw.student_id === studentUuidStr)) return true;
      if (Array.isArray(hw.targetIds)) {
        if (hw.targetIds.includes(currentUser.id) || (studentUuidStr && hw.targetIds.includes(studentUuidStr))) return true;
        if (hw.targetIds.some(tid => String(tid) === studentIdStr || (studentUuidStr && String(tid) === studentUuidStr))) return true;
      }
      return false;
    });
    const studentAssignments = (studyAssignments || []).filter(a => String(a.studentId) === String(currentUser.id) || toUUID(a.studentId) === studentUuidStr);

    return WEEK_DAYS_CONFIG.map(dayCfg => {
      const dayTasks = [];
      const seenDayTaskKeys = new Set();
      const dayInfo = weekDayDateMap[dayCfg.key] || {};

      // 1. Koçluk / Ders Programındaki Manuel Öğeler (Sadece bu güne ait olanlar)
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
        const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || (hw.bookId && books.some(b => String(b.id) === String(hw.bookId)));
        const bookObj = (books || []).find(b => String(b.id) === String(hw.bookId || hw.id));
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap')
          .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
          .replace(/\s*\(Tüm Kitap\)/gi, '')
          .trim();

        if (isBook && hw.testDueDates && typeof hw.testDueDates === 'object') {
          Object.entries(hw.testDueDates).forEach(([testId, tDateStr]) => {
            if (!tDateStr) return;
            const targetDayKey = resolveDayKey(tDateStr);
            const isMatchDate = (dayInfo.ymd && tDateStr.startsWith(dayInfo.ymd)) || (targetDayKey === dayCfg.key);

            if (isMatchDate) {
              const dedupeKey = `bt_${testId}`;
              if (!seenDayTaskKeys.has(dedupeKey)) {
                seenDayTaskKeys.add(dedupeKey);
                const bt = (bookTests || []).find(b => String(b.id) === String(testId));
                const qCount = Number(bt?.questionCount) || (bt?.answerKey ? Object.keys(bt.answerKey).length : 15);
                const isSolved = checkIsTaskSolved({ testId: testId, bookTestId: testId, hwId: hw.id, taskType: 'kitap' }, currentUser.id, submissions, homeworks, studyAssignments);

                dayTasks.push({
                  id: dedupeKey,
                  dedupeKey,
                  title: `${cleanBookTitle} — ${bt?.name || bt?.title || 'Test'}`,
                  subtitle: `${dayCfg.long} Kitap Testi`,
                  dayName: dayCfg.long,
                  dayKey: dayCfg.key,
                  subject: bt?.subject || hw.subject || bookObj?.subject || 'Genel',
                  unit: bt?.unit || bt?.unitName || '',
                  topic: bt?.topic || bt?.topicName || '',
                  questionCount: qCount,
                  dueDate: tDateStr,
                  sourceType: 'bookTest',
                  sourceLabel: '📚 Kitap Testi',
                  bookTestId: testId,
                  realTestId: testId,
                  bookId: bookObj?.id || hw.bookId,
                  bookTitle: cleanBookTitle,
                  testName: bt?.name || bt?.title,
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

      // 3. Bu Güne Ait Yol Haritası Konuları (studyAssignments)
      studentAssignments.forEach(assignment => {
        if (assignment.status === 'completed' || assignment.status === 'done' || assignment.isCompleted) return;
        const plan = (studyPlans || []).find(p => String(p.id) === String(assignment.planId || assignment.studyPlanId));
        if (!plan) return;

        let compTopics = [];
        if (Array.isArray(assignment.completedTopics)) compTopics = assignment.completedTopics;
        else if (typeof assignment.completedTopics === 'string') {
          try { compTopics = JSON.parse(assignment.completedTopics); } catch(e) {}
        } else if (typeof assignment.topic === 'string') {
          try { compTopics = JSON.parse(assignment.topic); } catch(e) {}
        }
        const completedTopicsSet = new Set(compTopics.map(String));

        (plan.subjects || []).forEach(subject => {
          const hasChildTopics = Array.isArray(subject.topics) && subject.topics.length > 0;
          const allChildTopicsDone = hasChildTopics && subject.topics.every(t => completedTopicsSet.has(String(t.id)) || completedTopicsSet.has(t.name));
          const isSubjectCompleted = completedTopicsSet.has(String(subject.id)) || completedTopicsSet.has(subject.name) || allChildTopicsDone;

          if (!hasChildTopics && subject.dueDate) {
            const sDayKey = resolveDayKey(subject.dueDate);
            const isMatch = (dayInfo.ymd && subject.dueDate.startsWith(dayInfo.ymd)) || (sDayKey === dayCfg.key);
            if (isMatch) {
              const subId = `roadmap_sub_${assignment.id}_${subject.id}`;
              if (!seenDayTaskKeys.has(subId)) {
                seenDayTaskKeys.add(subId);
                dayTasks.push({
                  id: subId,
                  dedupeKey: subId,
                  roadmapAssignmentId: assignment.id,
                  roadmapPlanId: plan.id,
                  roadmapSubjectId: subject.id,
                  roadmapSubjectName: subject.name,
                  roadmapTargetId: subject.id,
                  isRoadmapTask: true,
                  sourceType: 'roadmap',
                  sourceLabel: '🗺️ Yol Haritası',
                  subject: subject.name || plan.title || 'Genel',
                  topic: subject.name,
                  title: `${plan.title} • ${subject.name}`,
                  subtitle: `${dayCfg.long} Yol Haritası`,
                  dayName: dayCfg.long,
                  dayKey: dayCfg.key,
                  questionCount: 0,
                  dueDate: subject.dueDate,
                  isCompleted: isSubjectCompleted
                });
              }
            }
          }

          (subject.topics || []).forEach(topic => {
            if (topic.dueDate) {
              const tDayKey = resolveDayKey(topic.dueDate);
              const isMatch = (dayInfo.ymd && topic.dueDate.startsWith(dayInfo.ymd)) || (tDayKey === dayCfg.key);
              if (isMatch) {
                const isCompleted = completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name);
                const topId = `roadmap_top_${assignment.id}_${topic.id}`;
                if (!seenDayTaskKeys.has(topId)) {
                  seenDayTaskKeys.add(topId);
                  dayTasks.push({
                    id: topId,
                    dedupeKey: topId,
                    roadmapAssignmentId: assignment.id,
                    roadmapPlanId: plan.id,
                    roadmapTopicId: topic.id,
                    roadmapTopicName: topic.name,
                    roadmapSubjectId: subject.id,
                    roadmapSubjectName: subject.name,
                    roadmapTargetId: topic.id,
                    isRoadmapTask: true,
                    sourceType: 'roadmap',
                    sourceLabel: '🗺️ Yol Haritası',
                    subject: subject.name || plan.title || 'Genel',
                    topic: topic.name,
                    title: `${plan.title} • ${topic.name}`,
                    subtitle: `${dayCfg.long} Yol Haritası`,
                    dayName: dayCfg.long,
                    dayKey: dayCfg.key,
                    questionCount: 0,
                    dueDate: topic.dueDate,
                    isCompleted
                  });
                }
              }
            }
          });
        });
      });

      return {
        ...dayCfg,
        dateLabel: dayInfo.dateLabel || '',
        tasks: dayTasks,
        totalQuestions: dayTasks.reduce((acc, t) => acc + (Number(t.questionCount) || 0), 0),
        completedCount: dayTasks.filter(t => t.isCompleted).length
      };
    });
  }, [coachingProfile, homeworks, studyAssignments, studyPlans, books, bookTests, submissions, currentUser, studentIdStr, studentUuidStr, WEEK_DAYS_CONFIG, weekDayDateMap]);

  // Kitap Testlerini Kitap Bazında Gruplama
  const bookGroupedTests = useMemo(() => {
    const bookTestsOnly = allAssignedTasks.filter(t => t.sourceType === 'bookTest');
    const groups = {};
    bookTestsOnly.forEach(t => {
      const bTitle = t.bookTitle || 'Kitap Testleri';
      if (!groups[bTitle]) {
        groups[bTitle] = {
          bookTitle: bTitle,
          bookId: t.bookId,
          subject: t.subject,
          tests: []
        };
      }
      groups[bTitle].tests.push(t);
    });
    return Object.values(groups);
  }, [allAssignedTasks]);

  const pendingAssignedTasks = useMemo(() => {
    return allAssignedTasks.filter(t => !t.isCompleted);
  }, [allAssignedTasks]);

  const filteredTasksList = useMemo(() => {
    return allAssignedTasks.filter(task => {
      if (hideCompletedTasks && task.isCompleted) return false;
      const matchSource = hwSourceTab === 'all' || task.sourceType === hwSourceTab;
      const matchSubject = hwFilterSubject === 'all' || (task.subject && task.subject.toLowerCase().includes(hwFilterSubject.toLowerCase()));
      const matchQuery = !hwSearchQuery.trim() ||
        (task.title || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
        (task.subtitle || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
        (task.subject || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
        (task.topic || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
        (task.unit || '').toLowerCase().includes(hwSearchQuery.toLowerCase());
      return matchSource && matchSubject && matchQuery;
    });
  }, [allAssignedTasks, hwSourceTab, hwFilterSubject, hwSearchQuery, hideCompletedTasks]);

  // Görevi / Testi Seçerek Süre & Hedef Hazırlama ve Otomatik Başlatma
  const handleSelectTask = (task, startImmediately = false) => {
    if (!task) return;
    setSelectedTask(task);
    setShowHomeworkPickerModal(false);

    const isRoadmap = task.isRoadmapTask || task.sourceType === 'roadmap';

    if (isRoadmap) {
      // Yol Haritası konu takibi olduğu için optik girme YOKTUR, sadece odaklanarak çalışma (Pomodoro) vardır.
      setActiveStudyMode('study');
      localStorage.setItem('study_master_mode', 'study');
      setOpticalAnswers({});
      localStorage.removeItem('study_optical_answers');
      setOpticalInputMode('counter');
      localStorage.setItem('study_optical_mode', 'counter');

      // Dersi eşle
      const matchedSubjId = matchSubjectFromTask(task);
      if (matchedSubjId) {
        setSelectedSubject(matchedSubjId);
        localStorage.setItem('study_selected_subject', matchedSubjId);
      }

      // Varsayılan çalışma süresi 25 dk Pomodoro
      setDurations(d => ({ ...d, pomodoro: 25 }));
      if (!isRunning) setTimeLeft(25 * 60);
    } else {
      setOpticalInputMode('optical');
      localStorage.setItem('study_optical_mode', 'optical');

      // Dersi otomatik eşle
      const matchedSubjId = matchSubjectFromTask(task);
      if (matchedSubjId) {
        setSelectedSubject(matchedSubjId);
        localStorage.setItem('study_selected_subject', matchedSubjId);
        const subjObj = STUDY_SUBJECTS.find(s => s.id === matchedSubjId);
        if (subjObj) {
          setMinutesPerQuestion(subjObj.defaultMinPerQ || 2.0);
          localStorage.setItem('study_min_per_q', String(subjObj.defaultMinPerQ || 2.0));
        }
      }

      // Hedef soru sayısını ayarla
      const qCount = extractQuestionCountFromTask(task);
      handleSetNewTargetGoal(qCount, true);

      // Soru moduna geç
      setActiveStudyMode('question');
      localStorage.setItem('study_master_mode', 'question');
    }

    if (startImmediately) {
      setIsRunning(true);
      try {
        ambientAudio.playChime();
      } catch (e) {}
    } else {
      setIsRunning(false);
    }
  };

  // Yol Haritası Konu Çalışmasını Tamamlama Fonksiyonu
  const handleCompleteRoadmapTask = async () => {
    if (!selectedTask || (!selectedTask.isRoadmapTask && selectedTask.sourceType !== 'roadmap')) return;

    try {
      const assignmentId = selectedTask.roadmapAssignmentId;
      const targetId = selectedTask.roadmapTargetId || selectedTask.roadmapTopicId || selectedTask.roadmapSubjectId || selectedTask.id;
      const targetName = selectedTask.roadmapTopicName || selectedTask.roadmapSubjectName || selectedTask.topic || selectedTask.subject;

      if (assignmentId && updateStudyAssignment) {
        const assignment = (studyAssignments || []).find(a => String(a.id) === String(assignmentId));
        if (assignment) {
          let currentCompleted = [];
          if (Array.isArray(assignment.completedTopics)) currentCompleted = [...assignment.completedTopics];
          else if (typeof assignment.completedTopics === 'string') {
            try { currentCompleted = JSON.parse(assignment.completedTopics); } catch(e) {}
          } else if (typeof assignment.topic === 'string') {
            try { currentCompleted = JSON.parse(assignment.topic); } catch(e) {}
          }
          
          const newSet = new Set(currentCompleted.map(String));
          if (targetId) newSet.add(String(targetId));
          if (targetName) newSet.add(String(targetName));
          const updatedList = Array.from(newSet);

          await updateStudyAssignment(assignmentId, {
            completedTopics: updatedList
          });
        }
      }

      // Çalışma süresini istatistiklere ekle
      const elapsedMinutes = Math.max(1, Math.round(currentElapsedSec / 60));
      setDailyStats(prev => ({
        ...prev,
        studyMinutes: prev.studyMinutes + elapsedMinutes,
        sessionsCount: prev.sessionsCount + 1
      }));

      // Tebrik ve tamamlama efektleri
      try {
        ambientAudio.playChime();
      } catch (e) {}

      try {
        jsConfettiRef.current?.addConfetti({ emojis: ['🎉', '⭐', '✨', '🎯', '📚'] });
      } catch (e) {}

      showStudyToast(`"${selectedTask.title || selectedTask.topic || 'Konu'}" çalışması tamamlandı! 🎉`, 'success');
      handleClearSelectedTask();
      setIsRunning(false);
    } catch (err) {
      console.error('Error completing roadmap task:', err);
      showStudyToast('Konu tamamlanırken bir hata oluştu.', 'error');
    }
  };


  // Program sayfasından gelindiğinde görevi otomatik yükle, ders & soru sayısını aktar ve doğrudan başlat
  useEffect(() => {
    const incomingTask = location.state?.autoStartTask || (() => {
      try {
        const raw = localStorage.getItem('study_active_selected_task');
        if (raw) {
          localStorage.removeItem('study_active_selected_task');
          return JSON.parse(raw);
        }
      } catch(e) {}
      return null;
    })();

    if (incomingTask) {
      const shouldAutoStart = location.state?.autoStart ?? incomingTask.autoStart ?? true;
      handleSelectTask(incomingTask, shouldAutoStart);
    }
  }, [location.state]);

  const handleClearSelectedTask = () => {
    setSelectedTask(null);
    setOpticalAnswers({});
    localStorage.removeItem('study_optical_answers');
    setOpticalInputMode('counter');
    localStorage.setItem('study_optical_mode', 'counter');
  };

  const handleLaunchTaskQuiz = (task) => {
    if (!task) return;
    const targetBookTestId = task.bookTestId || task.testId || task.realTestId ||
      (task.hwId && (homeworks || []).find(h => String(h.id) === String(task.hwId))?.tests?.[0]);
    const isBook = Boolean(
      task.sourceType === 'bookTest' ||
      task.sourceType === 'trackedBook' ||
      task.taskType === 'kitap' ||
      task.isBookAssignment ||
      task.isBookTask ||
      task.bookId ||
      targetBookTestId
    );

    if (task.type === 'physicalExam' || task.isPhysical || task.isExamTask || task.taskType === 'deneme') {
      navigate(`/physical-exam/${task.hwId || task.realTestId || task.id}?studentId=${currentUser.id}`);
    } else if (isBook && targetBookTestId) {
      navigate(`/book-quiz/${targetBookTestId}?studentId=${currentUser.id}`);
    } else if (task.sourceType === 'program' && !task.hwId && !task.testId && !task.bookTestId) {
      handleSelectTask(task, false);
    } else {
      navigate(`/quiz/${task.realTestId || task.hwId || task.testId || task.id}?studentId=${currentUser.id}`);
    }
  };

  // ── 📚 DERS BAZLI ÇALIŞMA & SORU SÜRESİ TAKİBİ ──
  const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('study_selected_subject') || 'Matematik');
  const [subjectStats, setSubjectStats] = useState(() => {
    const saved = localStorage.getItem('study_subject_stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // Soru Başı Bütçe Dakikası (Örn: 2.0 dk / soru)
  const [minutesPerQuestion, setMinutesPerQuestion] = useState(() => {
    const saved = localStorage.getItem('study_min_per_q');
    return saved ? Number(saved) : 2.0;
  });

  // Hedef ve Çözülen Sayısı
  const [targetGoalCount, setTargetGoalCount] = useState(() => {
    const saved = localStorage.getItem('study_target_goal');
    return saved ? Number(saved) : 12;
  });

  const [targetInputVal, setTargetInputVal] = useState(() => {
    const saved = localStorage.getItem('study_target_goal');
    return saved ? String(saved) : '12';
  });

  const [currentProgressCount, setCurrentProgressCount] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`study_progress_${todayKey}`);
    return saved ? Number(saved) : 0;
  });

  // ── 📋 ENTEGRE OPTİK FORM STATE & YÖNETİMİ ──
  const [opticalInputMode, setOpticalInputMode] = useState(() => localStorage.getItem('study_optical_mode') || 'optical');
  const [opticalAnswers, setOpticalAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem('study_optical_answers');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [opticalOptionCount, setOpticalOptionCount] = useState(() => {
    const saved = localStorage.getItem('study_optical_opt_count');
    return saved ? Number(saved) : 4;
  });
  const [completedQuizResult, setCompletedQuizResult] = useState(null);
  const [isSubmittingOptical, setIsSubmittingOptical] = useState(false);

  const matchedTestObj = useMemo(() => {
    if (!selectedTask) return null;
    const testId = selectedTask.bookTestId || selectedTask.realTestId || selectedTask.testId || selectedTask.id;
    const taskTitle = (selectedTask.title || selectedTask.text || selectedTask.topic || '').toLowerCase();

    // 1. Check in bookTests directly
    if (bookTests && Array.isArray(bookTests)) {
      const found = bookTests.find(bt => 
        (testId && (String(bt.id) === String(testId) || toUUID(bt.id) === String(testId) || String(bt.realTestId) === String(testId))) ||
        (selectedTask.bookTestId && String(bt.id) === String(selectedTask.bookTestId)) ||
        (taskTitle && bt.name && taskTitle.includes(bt.name.toLowerCase()))
      );
      if (found) return found;
    }

    // 2. Search deeply inside books -> subjects -> topics -> tests
    if (books && Array.isArray(books)) {
      for (const b of books) {
        if (b.subjects && Array.isArray(b.subjects)) {
          for (const s of b.subjects) {
            if (s.tests && Array.isArray(s.tests)) {
              const fTest = s.tests.find(t =>
                (testId && (String(t.id) === String(testId) || toUUID(t.id) === String(testId))) ||
                (taskTitle && t.name && taskTitle.includes(t.name.toLowerCase()))
              );
              if (fTest) return fTest;
            }
            if (s.topics && Array.isArray(s.topics)) {
              for (const tp of s.topics) {
                if (tp.tests && Array.isArray(tp.tests)) {
                  const fTest = tp.tests.find(t =>
                    (testId && (String(t.id) === String(testId) || toUUID(t.id) === String(testId))) ||
                    (taskTitle && t.name && taskTitle.includes(t.name.toLowerCase()))
                  );
                  if (fTest) return fTest;
                }
              }
            }
          }
        }
      }
    }

    // 3. Search in homeworks
    if (homeworks && Array.isArray(homeworks)) {
      const found = homeworks.find(hw => 
        (testId && (String(hw.id) === String(testId) || toUUID(hw.id) === String(testId))) ||
        (selectedTask.hwId && String(hw.id) === String(selectedTask.hwId))
      );
      if (found) return found;
    }

    return null;
  }, [selectedTask, bookTests, books, homeworks]);

  const isSelectedTaskOpenEnded = useMemo(() => {
    return Boolean(
      selectedTask?.isOpenEnded ||
      selectedTask?.is_open_ended ||
      selectedTask?.questionType === 'acik_uclu' ||
      selectedTask?.type === 'acik_uclu' ||
      matchedTestObj?.isOpenEnded ||
      matchedTestObj?.is_open_ended ||
      matchedTestObj?.questionType === 'acik_uclu' ||
      matchedTestObj?.type === 'acik_uclu' ||
      matchedTestObj?.answerKey?.__meta?.isOpenEnded ||
      matchedTestObj?.answerKey?.__meta?.questionType === 'acik_uclu' ||
      (selectedTask?.title && /açık\s*uçlu|acik\s*uclu|klasik|yazılı/i.test(selectedTask.title)) ||
      (matchedTestObj?.name && /açık\s*uçlu|acik\s*uclu|klasik|yazılı/i.test(matchedTestObj.name)) ||
      (matchedTestObj?.title && /açık\s*uçlu|acik\s*uclu|klasik|yazılı/i.test(matchedTestObj.title))
    );
  }, [selectedTask, matchedTestObj]);

  const resolvedAnswerKey = useMemo(() => {
    const src = matchedTestObj || selectedTask;
    if (!src) return null;

    let key = src.answerKey || src.correctAnswers || src.opticAnswers || src.test?.answerKey || src.rawAnswerKey;

    if (!key && src.answers && Array.isArray(src.answers)) {
      key = src.answers.map(a => a.correctAnswer ?? a.correctAnswerLetter ?? a.userAnswerText);
    }

    if (!key && src.questions && Array.isArray(src.questions)) {
      key = src.questions.map(q => q.correctAnswer ?? q.answer ?? q.correctOption ?? q.correctAnswerLetter);
    }

    if (!key) return null;

    // Format 1: Object { "1": "A", "2": "B", ... } or { 0: "A", 1: "B" }
    if (typeof key === 'object' && !Array.isArray(key)) {
      const total = Math.max(Object.keys(key).length, targetGoalCount || 1);
      const arr = [];
      for (let i = 1; i <= total; i++) {
        const val = key[String(i)] ?? key[i] ?? key[String(i - 1)] ?? key[i - 1];
        if (val !== undefined && val !== null && val !== '') {
          const str = String(val).trim();
          if (isSelectedTaskOpenEnded) {
            arr.push(str);
          } else {
            const up = str.toUpperCase();
            if (/^[A-E]$/.test(up)) {
              arr.push(up);
            } else {
              const num = Number(str);
              if (!isNaN(num) && num >= 0 && num <= 4) {
                arr.push(String.fromCharCode(65 + num));
              } else {
                arr.push(str);
              }
            }
          }
        } else {
          arr.push(null);
        }
      }
      if (arr.some(Boolean)) return arr;
    }

    // Format 2: Array ["A", "B", ...]
    if (Array.isArray(key) && key.length > 0) {
      return key.map(k => {
        if (k === null || k === undefined || k === '') return null;
        if (typeof k === 'number') return isSelectedTaskOpenEnded ? String(k) : String.fromCharCode(65 + k);
        const str = String(k).trim();
        if (isSelectedTaskOpenEnded) return str;
        const up = str.toUpperCase();
        if (/^[A-E]$/.test(up)) return up;
        const num = Number(str);
        if (!isNaN(num) && num >= 0 && num <= 4) return String.fromCharCode(65 + num);
        return str;
      });
    }

    // Format 3: String "ABCD..." or "A B C D..."
    if (typeof key === 'string') {
      if (isSelectedTaskOpenEnded) return [key.trim()];
      const clean = key.replace(/[^A-Ea-e]/g, '').toUpperCase();
      return clean.length > 0 ? clean.split('') : null;
    }

    return null;
  }, [matchedTestObj, selectedTask, targetGoalCount, isSelectedTaskOpenEnded]);

  // Optik Cevap Seçme / Kaldırma
  const handleSelectOpticalOption = (qNo, optLetter) => {
    setOpticalAnswers(prev => {
      const next = { ...prev };
      if (next[qNo] === optLetter) {
        delete next[qNo];
      } else {
        next[qNo] = optLetter;
      }
      try {
        localStorage.setItem('study_optical_answers', JSON.stringify(next));
      } catch (e) {}

      // Otomatik çözülen soru sayısını güncelle
      const answeredCount = Object.keys(next).length;
      setCurrentProgressCount(answeredCount);
      const todayKey = new Date().toISOString().split('T')[0];
      localStorage.setItem(`study_progress_${todayKey}`, String(answeredCount));

      // Otomatik sayaç başlat (eğer duruyorsa)
      if (!isRunning && sessionElapsedSeconds === 0) {
        setIsRunning(true);
      }

      return next;
    });
  };

  const handleSetOpticalTextAnswer = (qNo, textVal) => {
    setOpticalAnswers(prev => {
      const next = { ...prev };
      if (textVal === undefined || textVal === null || textVal === '') {
        delete next[qNo];
      } else {
        next[qNo] = textVal;
      }
      try {
        localStorage.setItem('study_optical_answers', JSON.stringify(next));
      } catch (e) {}

      const answeredCount = Object.keys(next).length;
      setCurrentProgressCount(answeredCount);
      const todayKey = new Date().toISOString().split('T')[0];
      localStorage.setItem(`study_progress_${todayKey}`, String(answeredCount));

      if (!isRunning && sessionElapsedSeconds === 0) {
        setIsRunning(true);
      }

      return next;
    });
  };

  const handleClearOpticalAnswers = () => {
    setOpticalAnswers({});
    localStorage.removeItem('study_optical_answers');
    setCurrentProgressCount(0);
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`study_progress_${todayKey}`, '0');
  };

  const handleFinishOpticalQuiz = async () => {
    if (isSubmittingOptical) return;
    setIsSubmittingOptical(true);

    const totalQ = Math.max(1, targetGoalCount || 1);
    const answersList = [];
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;

    for (let i = 1; i <= totalQ; i++) {
      const userRaw = opticalAnswers[i] ?? opticalAnswers[String(i)] ?? null;
      const userAnsStr = userRaw !== null && userRaw !== undefined ? String(userRaw).trim() : '';
      const correctRaw = resolvedAnswerKey ? (resolvedAnswerKey[i - 1] || null) : null;
      const correctAnsStr = correctRaw !== null && correctRaw !== undefined ? String(correctRaw).trim() : '';
      let isCorrect = null;

      if (!userAnsStr) {
        blankCount++;
      } else if (correctAnsStr) {
        if (isSelectedTaskOpenEnded) {
          const cleanUser = userAnsStr.replace(/\s/g, '').replace(',', '.').toLowerCase();
          const cleanCorr = correctAnsStr.replace(/\s/g, '').replace(',', '.').toLowerCase();
          isCorrect = cleanUser === cleanCorr || userAnsStr.toLowerCase() === correctAnsStr.toLowerCase();
        } else {
          isCorrect = userAnsStr.toUpperCase() === correctAnsStr.toUpperCase();
        }
        if (isCorrect) correctCount++;
        else wrongCount++;
      } else {
        isCorrect = true;
        correctCount++;
      }

      answersList.push({
        questionNo: i,
        userAnswer: isSelectedTaskOpenEnded ? null : (userAnsStr ? (userAnsStr.charCodeAt(0) - 65) : null),
        userAnswerLetter: userAnsStr || null,
        userAnswerText: userAnsStr || null,
        correctAnswer: isSelectedTaskOpenEnded ? null : (correctAnsStr ? (correctAnsStr.charCodeAt(0) - 65) : null),
        correctAnswerLetter: correctAnsStr || null,
        correctAnswerText: correctAnsStr || null,
        isOpenEnded: isSelectedTaskOpenEnded,
        isCorrect
      });
    }

    const netScore = Math.max(0, correctCount - (wrongCount * 0.25));
    const scorePct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

    const submissionId = `sub_study_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalBookTestId = matchedTestObj?.id || selectedTask?.bookTestId || selectedTask?.realTestId || null;
    const finalBookId = selectedTask?.bookId || matchedTestObj?.bookId || null;
    const finalBookTitle = selectedTask?.bookTitle || matchedTestObj?.bookTitle || null;
    const resolvedTestId = finalBookTestId || selectedTask?.testId || selectedTask?.id || submissionId;
    const finalTestTitle = matchedTestObj?.name || selectedTask?.testName || selectedTask?.title || selectedTask?.topic || `${selectedSubject} ${isSelectedTaskOpenEnded ? 'Yazılı / Açık Uçlu Sınavı' : 'Optik Sınavı'}`;
    const finalUnit = selectedTask?.unit || matchedTestObj?.unit || matchedTestObj?.unitName || '';
    const finalTopic = selectedTask?.topic || matchedTestObj?.topic || matchedTestObj?.topicName || '';

    const subPayload = {
      id: submissionId,
      studentId: currentUser?.id || 'guest',
      studentName: currentUser?.name || 'Öğrenci',
      testId: resolvedTestId,
      realTestId: resolvedTestId,
      bookTestId: finalBookTestId,
      bookId: finalBookId,
      bookTitle: finalBookTitle,
      testTitle: finalTestTitle,
      title: finalTestTitle,
      subject: selectedSubject,
      unit: finalUnit,
      topic: finalTopic,
      unitTopic: (finalUnit && finalTopic) ? `${finalUnit} › ${finalTopic}` : (finalUnit || finalTopic || ''),
      sourceType: selectedTask?.sourceType || 'study_room_optical',
      hwId: selectedTask?.hwId || null,
      roadmapAssignmentId: selectedTask?.roadmapAssignmentId || null,
      isOpenEnded: isSelectedTaskOpenEnded,
      answers: answersList,
      correctCount,
      wrongCount,
      blankCount,
      totalQuestions: totalQ,
      netScore: Number.isInteger(netScore) ? netScore : Number(netScore.toFixed(2)),
      score: scorePct,
      durationSeconds: sessionElapsedSeconds,
      completedAt: new Date().toISOString(),
      status: 'completed',
      submittedAt: new Date().toISOString()
    };

    let savedId = submissionId;
    if (typeof addSubmission === 'function') {
      try {
        const res = await addSubmission(subPayload);
        if (res) savedId = res;
      } catch (e) {
        console.warn('Error saving study optical submission:', e);
      }
    }

    // Save subject stats
    recordSubjectStudy(selectedSubject, Object.keys(opticalAnswers).length, sessionElapsedSeconds);

    // Stop timer
    setIsRunning(false);
    try { ambientAudio.playChime(); } catch (e) {}

    // Show result state
    setCompletedQuizResult({
      ...subPayload,
      id: savedId,
      hasAnswerKey: Boolean(resolvedAnswerKey)
    });
    setIsSubmittingOptical(false);
  };

  // 🎯 Yeni Hedef Belirleme & Çözülen Sayısını Otomatik Sıfırlama
  const handleSetNewTargetGoal = (newGoalCount, resetProgress = true) => {
    const validGoal = Math.max(1, Math.min(500, Number(newGoalCount) || 12));
    setTargetGoalCount(validGoal);
    setTargetInputVal(String(validGoal));
    localStorage.setItem('study_target_goal', String(validGoal));

    if (resetProgress && !isRunning && sessionElapsedSeconds === 0) {
      setCurrentProgressCount(0);
      const todayKey = new Date().toISOString().split('T')[0];
      localStorage.setItem(`study_progress_${todayKey}`, '0');
      setSessionElapsedSeconds(0);
      setStopwatchSeconds(0);
    }

    if (!isRunning && sessionElapsedSeconds === 0) {
      setTimeLeft(Math.max(5, Math.round(validGoal * minutesPerQuestion)) * 60);
    }
  };

  // 🔄 Çözülen Soru Sayısını Sıfırlama
  const handleResetProgressCount = () => {
    setCurrentProgressCount(0);
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`study_progress_${todayKey}`, '0');
    if (!isRunning && sessionElapsedSeconds === 0) {
      setSessionElapsedSeconds(0);
      setStopwatchSeconds(0);
    }
  };

  // Hesaplanan Soru Süre Bütçesi
  const calculatedQuestionBudgetMinutes = useMemo(() => {
    return Math.max(5, Math.round(targetGoalCount * minutesPerQuestion));
  }, [targetGoalCount, minutesPerQuestion]);

  // Durations (Tek Mola Sistemi: Odak & Mola)
  const [durations, setDurations] = useState(() => {
    const saved = localStorage.getItem('study_durations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          pomodoro: parsed.pomodoro || 25,
          shortBreak: parsed.shortBreak || parsed.breakTime || 10
        };
      } catch (e) {}
    }
    return { pomodoro: 25, shortBreak: 10 };
  });

  // Soru sayısı veya bütçe değiştiğinde odak süresini otomatik senkronize et
  useEffect(() => {
    setDurations(prev => {
      if (prev.pomodoro === calculatedQuestionBudgetMinutes) return prev;
      return { ...prev, pomodoro: calculatedQuestionBudgetMinutes };
    });
  }, [calculatedQuestionBudgetMinutes]);

  const [focusInputVal, setFocusInputVal] = useState(() => String(durations.pomodoro || 25));
  const [breakInputVal, setBreakInputVal] = useState(() => String(durations.shortBreak || 10));

  useEffect(() => {
    setFocusInputVal(String(durations.pomodoro || calculatedQuestionBudgetMinutes || 25));
  }, [durations.pomodoro, calculatedQuestionBudgetMinutes]);

  useEffect(() => {
    setBreakInputVal(String(durations.shortBreak || 10));
  }, [durations.shortBreak]);

  const handleAdjustFocus = (delta) => {
    const current = Number(durations.pomodoro) || calculatedQuestionBudgetMinutes || 25;
    const newVal = Math.min(180, Math.max(1, current + delta));
    setDurations(p => ({ ...p, pomodoro: newVal }));
    setFocusInputVal(String(newVal));
    const newGoal = Math.max(1, Math.round(newVal / minutesPerQuestion));
    setTargetGoalCount(newGoal);
    setTargetInputVal(String(newGoal));
    if (!isRunning && (activeStudyMode === 'question' || activeStudyMode === 'study')) {
      setTimeLeft(newVal * 60);
    }
  };

  const handleSetFocusPreset = (minutes) => {
    const val = Math.min(180, Math.max(1, minutes));
    setDurations(p => ({ ...p, pomodoro: val }));
    setFocusInputVal(String(val));
    const newGoal = Math.max(1, Math.round(val / minutesPerQuestion));
    setTargetGoalCount(newGoal);
    setTargetInputVal(String(newGoal));
    if (!isRunning && (activeStudyMode === 'question' || activeStudyMode === 'study')) {
      setTimeLeft(val * 60);
    }
  };

  const handleFocusInputChange = (rawStr) => {
    const clean = rawStr.replace(/[^0-9]/g, '');
    setFocusInputVal(clean);
    if (clean && Number(clean) >= 1) {
      const val = Math.min(180, Number(clean));
      setDurations(p => ({ ...p, pomodoro: val }));
      const newGoal = Math.max(1, Math.round(val / minutesPerQuestion));
      setTargetGoalCount(newGoal);
      setTargetInputVal(String(newGoal));
      if (!isRunning && (activeStudyMode === 'question' || activeStudyMode === 'study')) {
        setTimeLeft(val * 60);
      }
    }
  };

  const handleFocusInputBlur = () => {
    if (!focusInputVal || Number(focusInputVal) < 1) {
      const fallback = Math.max(1, Number(durations.pomodoro) || calculatedQuestionBudgetMinutes || 25);
      setFocusInputVal(String(fallback));
      setDurations(p => ({ ...p, pomodoro: fallback }));
    } else {
      const clamped = Math.min(180, Math.max(1, Number(focusInputVal)));
      setFocusInputVal(String(clamped));
      setDurations(p => ({ ...p, pomodoro: clamped }));
    }
  };

  const handleAdjustBreak = (delta) => {
    const current = Number(durations.shortBreak) || 10;
    const newVal = Math.min(90, Math.max(1, current + delta));
    setDurations(p => ({ ...p, shortBreak: newVal, breakTime: newVal }));
    setBreakInputVal(String(newVal));
    if (!isRunning && activeStudyMode === 'break') {
      setTimeLeft(newVal * 60);
    }
  };

  const handleSetBreakPreset = (minutes) => {
    const val = Math.min(90, Math.max(1, minutes));
    setDurations(p => ({ ...p, shortBreak: val, breakTime: val }));
    setBreakInputVal(String(val));
    if (!isRunning && activeStudyMode === 'break') {
      setTimeLeft(val * 60);
    }
  };

  const handleBreakInputChange = (rawStr) => {
    const clean = rawStr.replace(/[^0-9]/g, '');
    setBreakInputVal(clean);
    if (clean && Number(clean) >= 1) {
      const val = Math.min(90, Number(clean));
      setDurations(p => ({ ...p, shortBreak: val, breakTime: val }));
      if (!isRunning && activeStudyMode === 'break') {
        setTimeLeft(val * 60);
      }
    }
  };

  const handleBreakInputBlur = () => {
    if (!breakInputVal || Number(breakInputVal) < 1) {
      const fallback = Math.max(1, Number(durations.shortBreak) || 10);
      setBreakInputVal(String(fallback));
      setDurations(p => ({ ...p, shortBreak: fallback, breakTime: fallback }));
    } else {
      const clamped = Math.min(90, Math.max(1, Number(breakInputVal)));
      setBreakInputVal(String(clamped));
      setDurations(p => ({ ...p, shortBreak: clamped, breakTime: clamped }));
    }
  };

  // Dinamik Zaman Sayacı
  const [timeLeft, setTimeLeft] = useState(() => {
    const initMode = localStorage.getItem('study_master_mode') || 'question';
    if (initMode === 'question') {
      const savedGoal = Number(localStorage.getItem('study_target_goal')) || 12;
      const savedMin = Number(localStorage.getItem('study_min_per_q')) || 2.0;
      return Math.max(5, Math.round(savedGoal * savedMin)) * 60;
    }
    return 25 * 60;
  });

  const [isRunning, setIsRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

  // ⏸️ Seans Başı Maksimum Duraklatma Hakkı Sınırı (Süreye Göre Otomatik Artan/Azalan Dinamik Ölçek)
  const [pauseLimitMode, setPauseLimitMode] = useState(() => {
    const s = localStorage.getItem('study_pause_limit_mode');
    return s || 'auto';
  });

  const currentSessionMinutes = useMemo(() => {
    if (activeStudyMode === 'question') {
      return Number(durations.pomodoro || calculatedQuestionBudgetMinutes) || 25;
    }
    if (activeStudyMode === 'study') {
      return Number(durations.pomodoro) || 25;
    }
    if (activeStudyMode === 'book') {
      return 25;
    }
    if (activeStudyMode === 'break') {
      return Number(durations.shortBreak || 10);
    }
    return 25;
  }, [activeStudyMode, durations.pomodoro, durations.shortBreak, calculatedQuestionBudgetMinutes]);

  const calculateDynamicMaxPauses = (mins) => {
    if (mins <= 15) return 1;       // 1 - 15 dk: 1 hak
    if (mins <= 30) return 2;       // 16 - 30 dk: 2 hak (Örn: 25 dk Pomodoro)
    if (mins <= 45) return 3;       // 31 - 45 dk: 3 hak (Örn: 42 dk soru)
    if (mins <= 65) return 4;       // 46 - 65 dk: 4 hak (Örn: 60 dk ders)
    if (mins <= 90) return 5;       // 66 - 90 dk: 5 hak
    return Math.min(8, Math.floor(mins / 15)); // 90+ dk: her 15 dk için 1 hak
  };

  const maxPauses = useMemo(() => {
    if (pauseLimitMode !== 'auto') {
      const num = Number(pauseLimitMode);
      if (!isNaN(num) && num > 0) return num;
    }
    return calculateDynamicMaxPauses(currentSessionMinutes);
  }, [pauseLimitMode, currentSessionMinutes]);

  const [pauseCount, setPauseCount] = useState(0);
  const [pauseWarningToast, setPauseWarningToast] = useState(null);

  const remainingPauses = Math.max(0, maxPauses - pauseCount);

  const handleToggleRunning = () => {
    if (!isRunning) {
      setIsRunning(true);
      setPauseWarningToast(null);
    } else {
      if (remainingPauses <= 0) {
        setPauseWarningToast(`🚫 Bu seansta duraklatma hakkınız doldu (${maxPauses}/${maxPauses} kullanıldı). Odaklanmanızı korumak için lütfen seansı tamamlayın!`);
        setTimeout(() => {
          setPauseWarningToast(null);
        }, 4000);
        return;
      }
      setPauseCount(c => c + 1);
      setIsRunning(false);
    }
  };

  // 🌟 SADECE BU KARTI TAM EKRAN (ZEN ODAK MODU) YAPMA STATE'İ
  const [isCardFullscreen, setIsCardFullscreen] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('system');
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);

  // Bonus Mola Kutlama Modalı
  const [earnedBonusModal, setEarnedBonusModal] = useState(null);

  // ── 🌟 EKRAN KAPANMAMA (WAKE LOCK) SİSTEMİ ──
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef(null);

  // Soru Başı Hatırlatıcı Bildirim Sesi (Örn: her 2 dakikada bir küçük yumuşak zil)
  const [questionChimeEnabled, setQuestionChimeEnabled] = useState(() => {
    const saved = localStorage.getItem('study_question_chime_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Ekran Kapanmama (Wake Lock API) Otomatik Yönetimi
  useEffect(() => {
    let isSubscribed = true;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isRunning) {
        try {
          if (!wakeLockRef.current) {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            if (isSubscribed) setWakeLockActive(true);
            wakeLockRef.current.addEventListener('release', () => {
              if (isSubscribed) setWakeLockActive(false);
              wakeLockRef.current = null;
            });
          }
        } catch (err) {
          console.warn('Wake Lock request error:', err);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch (err) {}
        wakeLockRef.current = null;
        if (isSubscribed) setWakeLockActive(false);
      }
    };

    if (isRunning) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isRunning]);

  // ── 1. FOREST & BÜYÜYEN AĞAÇ SİSTEMİ ──
  const [plantedForest, setPlantedForest] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`study_forest_${todayKey}`);
    return saved ? JSON.parse(saved) : [];
  });

  // ── 6. GÜNLÜK ÇALIŞMA SERİSİ (STREAK ATEŞİ) & ROZETLER ──
  const [streakData, setStreakData] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('study_streak_info');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch (e) {}
    }
    return { currentStreak: 1, lastStudyDate: todayKey };
  });

  // ToDo Checklist & Scratchpad Notes
  const [todoList, setTodoList] = useState(() => {
    const saved = localStorage.getItem('study_todolist');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Konu özetini gözden geçir', done: false },
      { id: '2', text: 'Hedef test sorularını çöz', done: false },
      { id: '3', text: 'Yanlış yapılan soruları incele', done: false }
    ];
  });
  const [newTodoText, setNewTodoText] = useState('');
  const [scratchNotes, setScratchNotes] = useState(() => localStorage.getItem('study_scratch_notes') || '');

  // Ambient Sound volumes
  const [soundVolumes, setSoundVolumes] = useState({
    rain: 0,
    waves: 0,
    binaural: 0,
    fire: 0,
    whitenoise: 0
  });

  // Daily Stats
  const [dailyStats, setDailyStats] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`study_stats_${todayKey}`);
    return saved ? JSON.parse(saved) : { totalMinutes: 0, pomodorosDone: 0, questionsDone: 0 };
  });

  // Refs
  const timerRef = useRef(null);
  const stopwatchRef = useRef(null);
  const containerRef = useRef(null);

  const themeObj = THEMES.find(t => t.id === activeTheme) || THEMES[0];

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveQuoteIndex(prev => (prev + 1) % FOCUS_QUOTES.length);
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Save changes
  useEffect(() => {
    localStorage.setItem('study_master_mode', activeStudyMode);
  }, [activeStudyMode]);

  useEffect(() => {
    localStorage.setItem('study_durations', JSON.stringify(durations));
  }, [durations]);

  useEffect(() => {
    localStorage.setItem('study_min_per_q', String(minutesPerQuestion));
  }, [minutesPerQuestion]);

  useEffect(() => {
    localStorage.setItem('study_target_goal', String(targetGoalCount));
  }, [targetGoalCount]);

  useEffect(() => {
    localStorage.setItem('study_todolist', JSON.stringify(todoList));
  }, [todoList]);

  useEffect(() => {
    localStorage.setItem('study_scratch_notes', scratchNotes);
  }, [scratchNotes]);

  useEffect(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`study_progress_${todayKey}`, String(currentProgressCount));
  }, [currentProgressCount]);

  // ── 📚 DERS İSTATİSTİĞİ KAYDI & SEÇİMİ ──
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

    // Sadece sayaç çalışmıyorken çözülen sayısını ve süreyi güncelle
    if (!isRunning && sessionElapsedSeconds === 0) {
      handleResetProgressCount();
      setTimeLeft(Math.max(5, Math.round(targetGoalCount * recommendedMin)) * 60);
    }
  };

  const clearSubjectStats = (subjectKey = null) => {
    if (subjectKey) {
      setSubjectStats(prev => {
        const next = { ...prev };
        delete next[subjectKey];
        localStorage.setItem('study_subject_stats', JSON.stringify(next));
        return next;
      });
    } else {
      setSubjectStats({});
      localStorage.removeItem('study_subject_stats');
    }
  };

  // Persist Daily Stats & Streak
  const saveDailyStats = (updated) => {
    setDailyStats(updated);
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`study_stats_${todayKey}`, JSON.stringify(updated));
    updateStreak();
  };

  const updateStreak = () => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('study_streak_info');
    let data = { currentStreak: 1, lastStudyDate: today };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.lastStudyDate === today) {
          data = parsed;
        } else {
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          if (parsed.lastStudyDate === yesterday) {
            data = { currentStreak: (parsed.currentStreak || 1) + 1, lastStudyDate: today };
          } else {
            data = { currentStreak: 1, lastStudyDate: today };
          }
        }
      } catch (e) {}
    }

    setStreakData(data);
    localStorage.setItem('study_streak_info', JSON.stringify(data));
  };

  // Sound handlers
  const handleVolumeChange = (type, val) => {
    const num = Number(val);
    setSoundVolumes(prev => ({ ...prev, [type]: num }));
    ambientAudio.setSoundVolume(type, num / 100);
  };

  const handleMuteAll = () => {
    const isAnyActive = Object.values(soundVolumes).some(v => v > 0);
    if (isAnyActive) {
      setSoundVolumes({ rain: 0, waves: 0, binaural: 0, fire: 0, whitenoise: 0 });
      ambientAudio.stopAll();
    } else {
      handleVolumeChange('rain', 40);
      handleVolumeChange('binaural', 30);
    }
  };

  useEffect(() => {
    return () => {
      ambientAudio.stopAll();
      if (timerRef.current) clearInterval(timerRef.current);
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, []);

  // Timer Tick
  useEffect(() => {
    if (activeStudyMode === 'stopwatch') {
      if (isRunning) {
        stopwatchRef.current = setInterval(() => {
          setStopwatchSeconds(prev => {
            const next = prev + 1;
            setSessionElapsedSeconds(e => e + 1);
            if (next % 60 === 0) {
              saveDailyStats({
                ...dailyStats,
                totalMinutes: dailyStats.totalMinutes + 1
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
            // 🔔 Soru Başı Bütçe Süresi Hatırlatması (Örn: her 2 dakikada bir çok hafif yumuşak bildirim sesi)
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
            handleTimerComplete();
            return 0;
          }
          if (activeStudyMode !== 'break' && prev % 60 === 0) {
            saveDailyStats({
              ...dailyStats,
              totalMinutes: dailyStats.totalMinutes + 1
            });
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, activeStudyMode, dailyStats, questionChimeEnabled, minutesPerQuestion]);

  // Seans Tamamlama & Ağaç Dikme Mantığı
  const handleTimerComplete = () => {
    ambientAudio.playChime();

    if (activeStudyMode !== 'break') {
      const newCycles = completedCycles + 1;
      setCompletedCycles(newCycles);

      const elapsedSec = sessionElapsedSeconds > 0 ? sessionElapsedSeconds : (totalModeSeconds - timeLeft);

      // Soru modunda ders istatistiğini kaydet
      if (activeStudyMode === 'question' && currentProgressCount > 0) {
        recordSubjectStudy(selectedSubject, currentProgressCount, elapsedSec);
      }

      const randomTree = TREE_SPECIES[Math.floor(Math.random() * TREE_SPECIES.length)];
      const modeLabel = activeStudyMode === 'question'
        ? `${currentProgressCount} Soru (${selectedSubject})`
        : activeStudyMode === 'book'
          ? `${currentProgressCount} Sayfa`
          : 'Konu Çalışması';
      const newTreeItem = {
        id: String(Date.now()),
        icon: randomTree.icon,
        name: randomTree.name,
        task: modeLabel,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        duration: Math.max(1, Math.round(elapsedSec / 60))
      };

      const updatedForest = [...plantedForest, newTreeItem];
      setPlantedForest(updatedForest);

      const todayKey = new Date().toISOString().split('T')[0];
      localStorage.setItem(`study_forest_${todayKey}`, JSON.stringify(updatedForest));

      saveDailyStats({
        ...dailyStats,
        totalMinutes: dailyStats.totalMinutes + Math.max(1, Math.round(elapsedSec / 60)),
        pomodorosDone: dailyStats.pomodorosDone + 1,
        questionsDone: dailyStats.questionsDone + (activeStudyMode === 'question' ? currentProgressCount : 0)
      });

      try {
        jsConfettiRef.current?.addConfetti({ emojis: ['🌲', '✨', '⚡', '🏆', '🎉'] });
      } catch (e) {}

      showStudyToast(`🌲 Tebrikler! 1 Odaklanma Ağacı (+10 XP) diktin ve Pomodoro'yu tamamladın (+15 XP)! 🎉`, 'success');

      // Mola moduna geçiş yap (Tek mola sistemi)
      setActiveStudyMode('break');
      const baseBreak = Number(durations.shortBreak || durations.breakTime) || 10;
      setTimeLeft(baseBreak * 60);
      setSessionElapsedSeconds(0);
      setPauseCount(0);
      setPauseWarningToast(null);
    } else {
      // Mola bitti, soru veya konu moduna dön
      setActiveStudyMode('question');
      setTimeLeft(calculatedQuestionBudgetMinutes * 60);
      setSessionElapsedSeconds(0);
      setPauseCount(0);
      setPauseWarningToast(null);
    }
  };

  // Birleşik Mod Değiştirici
  const handleSwitchMasterMode = (mode) => {
    if (mode === activeStudyMode) return;

    const studyModes = ['question', 'book', 'study'];
    const isCurrentStudy = studyModes.includes(activeStudyMode);
    const isTargetStudy = studyModes.includes(mode);

    // Eğer çalışma modları (Soru, Kitap, Konu) arasında geçiş yapılıyorsa ve sayaç başlamışsa (çalışıyor veya süre ilerlemişse)
    // Sayacı sıfırlama, kaldığı yerden devam ettir!
    if (isCurrentStudy && isTargetStudy && (isRunning || sessionElapsedSeconds > 0)) {
      setActiveStudyMode(mode);
      localStorage.setItem('study_master_mode', mode);
      return;
    }

    // Mola veya ilk kez başlatılmamış durumdaki geçişler
    setIsRunning(false);
    setActiveStudyMode(mode);
    localStorage.setItem('study_master_mode', mode);
    setSessionElapsedSeconds(0);
    setPauseCount(0);
    setPauseWarningToast(null);

    if (mode === 'question') {
      setTimeLeft(calculatedQuestionBudgetMinutes * 60);
    } else if (mode === 'book') {
      setTimeLeft(25 * 60);
    } else if (mode === 'study') {
      setTimeLeft((durations.pomodoro || calculatedQuestionBudgetMinutes || 25) * 60);
    } else if (mode === 'break') {
      const baseBreak = Number(durations.shortBreak || durations.breakTime) || 10;
      setTimeLeft(baseBreak * 60);
    } else if (mode === 'stopwatch') {
      setStopwatchSeconds(0);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSessionElapsedSeconds(0);
    setPauseCount(0);
    setPauseWarningToast(null);
    if (activeStudyMode === 'question') {
      setTimeLeft(calculatedQuestionBudgetMinutes * 60);
    } else if (activeStudyMode === 'book') {
      setTimeLeft(25 * 60);
    } else if (activeStudyMode === 'study') {
      setTimeLeft((durations.pomodoro || calculatedQuestionBudgetMinutes || 25) * 60);
    } else if (activeStudyMode === 'break') {
      const baseBreak = Number(durations.shortBreak || durations.breakTime) || 10;
      setTimeLeft(baseBreak * 60);
    } else if (activeStudyMode === 'stopwatch') {
      setStopwatchSeconds(0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Toplam Mod Süresi
  const baseBreakMinutes = Number(durations.shortBreak || durations.breakTime) || 10;
  const totalModeSeconds = activeStudyMode === 'question'
    ? calculatedQuestionBudgetMinutes * 60
    : activeStudyMode === 'book'
      ? 25 * 60
      : activeStudyMode === 'study'
        ? (durations.pomodoro || calculatedQuestionBudgetMinutes || 25) * 60
        : baseBreakMinutes * 60;

  const progressPct = activeStudyMode === 'stopwatch'
    ? Math.min(100, (stopwatchSeconds % 3600) / 36)
    : Math.max(0, Math.min(100, ((totalModeSeconds - timeLeft) / totalModeSeconds) * 100));

  // Canlı Ağaç Büyüme Aşaması
  const treeGrowthStage = useMemo(() => {
    if (activeStudyMode === 'break') return { icon: '🍃', label: 'Dinlenme', desc: 'Mola Vakti' };
    if (!isRunning && progressPct === 0) return { icon: '🌱', label: 'Tohum', desc: 'Başlatınca büyüyecek' };
    if (progressPct < 25) return { icon: '🌱', label: 'Filizleniyor', desc: 'Kök salıyor...' };
    if (progressPct < 55) return { icon: '🌿', label: 'Fidan Büyüyor', desc: 'Gelişiyor...' };
    if (progressPct < 85) return { icon: '🌳', label: 'Genç Ağaç', desc: 'Yaprak açıyor...' };
    return { icon: '🌸', label: 'Çiçek Açan Ağaç', desc: 'Neredeyse tamam!' };
  }, [progressPct, activeStudyMode, isRunning]);

  // Dinamik Hedef Yüzdesi
  const targetProgressPct = Math.min(100, Math.round((currentProgressCount / Math.max(1, targetGoalCount)) * 100));

  const handleIncrementProgress = (amount) => {
    const nextVal = Math.max(0, currentProgressCount + amount);
    setCurrentProgressCount(nextVal);
    if (nextVal >= targetGoalCount && currentProgressCount < targetGoalCount) {
      ambientAudio.playChime();
    }
  };

  // ⚡ Soru Çözümünde "Testi Erken Bitir & Mola Kazan" Mantığı
  const handleFinishEarlyAndRewardBreak = () => {
    setIsRunning(false);
    ambientAudio.playChime();

    const budgetSec = calculatedQuestionBudgetMinutes * 60;
    const elapsedSec = sessionElapsedSeconds > 0 ? sessionElapsedSeconds : (totalModeSeconds - timeLeft);
    const savedSeconds = Math.max(0, budgetSec - elapsedSec);
    const bonusMinutes = Math.floor(savedSeconds / 60);

    const standardBreak = Number(durations.shortBreak || durations.breakTime) || 10;
    const finalBreakDuration = standardBreak + bonusMinutes;

    const randomTree = TREE_SPECIES[Math.floor(Math.random() * TREE_SPECIES.length)];
    const newTreeItem = {
      id: String(Date.now()),
      icon: randomTree.icon,
      name: randomTree.name,
      task: `⚡ Hızlı Test: ${currentProgressCount} Soru (${bonusMinutes} dk erken bitirme)`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      duration: Math.max(1, Math.round(elapsedSec / 60))
    };

    const updatedForest = [...plantedForest, newTreeItem];
    setPlantedForest(updatedForest);
    const todayKey = new Date().toISOString().split('T')[0];
    localStorage.setItem(`study_forest_${todayKey}`, JSON.stringify(updatedForest));

    saveDailyStats({
      ...dailyStats,
      totalMinutes: dailyStats.totalMinutes + Math.max(1, Math.round(elapsedSec / 60)),
      pomodorosDone: dailyStats.pomodorosDone + 1,
      questionsDone: dailyStats.questionsDone + currentProgressCount
    });

    try {
      jsConfettiRef.current?.addConfetti({ emojis: ['⚡', '🌲', '🔥', '🎯', '🌟'] });
    } catch (e) {}

    showStudyToast(`⚡ Erken Bitirme Başarısı! +15 Pomodoro XP ve +10 Ağaç Bonusu Kazandın! 🎉`, 'success');

    // Soru modunda ders istatistiğini kaydet
    if (currentProgressCount > 0 && elapsedSec >= 10) {
      recordSubjectStudy(selectedSubject, currentProgressCount, elapsedSec);
    }

    setActiveStudyMode('break');
    setTimeLeft(finalBreakDuration * 60);
    setSessionElapsedSeconds(0);

    setEarnedBonusModal({
      subject: selectedSubject,
      questionsDone: currentProgressCount,
      elapsedMinutes: Math.max(1, Math.round(elapsedSec / 60)),
      budgetMinutes: calculatedQuestionBudgetMinutes,
      bonusMinutes,
      totalBreakMinutes: finalBreakDuration
    });
  };

  // Canlı Seans ve Soru Başı Hız Hesabı
  const currentElapsedSec = sessionElapsedSeconds > 0
    ? sessionElapsedSeconds
    : (activeStudyMode === 'stopwatch' ? stopwatchSeconds : (totalModeSeconds - timeLeft));

  const liveSessionSecPerQ = (activeStudyMode === 'question' && currentProgressCount > 0 && currentElapsedSec > 0)
    ? Math.round(currentElapsedSec / currentProgressCount)
    : 0;

  // ── ⏱️ CANLI PLAN & HIZ TAKİBİ HESAPLAMALARI (PACING & GOAL DYNAMICS) ──
  const livePacingData = useMemo(() => {
    if (activeStudyMode !== 'question') return null;

    const targetSecPerQ = Math.round(minutesPerQuestion * 60);
    const totalBudgetSec = targetGoalCount * targetSecPerQ;
    const remainingQuestions = Math.max(0, targetGoalCount - currentProgressCount);
    const remainingSeconds = activeStudyMode === 'stopwatch' 
      ? Math.max(0, totalBudgetSec - stopwatchSeconds) 
      : Math.max(0, timeLeft);

    // Kalan her soruya kaç saniye düşüyor?
    const remainingSecPerQ = (remainingQuestions > 0 && remainingSeconds > 0)
      ? Math.round(remainingSeconds / remainingQuestions)
      : 0;

    // Şu ana kadar çözülen soru için hedeflenen ideal geçen süre:
    const expectedElapsedSec = currentProgressCount * targetSecPerQ;
    const deltaSec = expectedElapsedSec - currentElapsedSec; // Pozitif: İleride (önde), Negatif: Geride

    let status = 'on_track';
    let label = '⚡ Tam Hedef Hızındasın';
    let statusText = 'Zaman ve soru çözme temponuz hedefle mükemmel dengede.';
    let color = '#3b82f6';
    let bg = isDark ? 'rgba(59, 130, 246, 0.16)' : '#eff6ff';
    let border = isDark ? 'rgba(59, 130, 246, 0.35)' : '#bfdbfe';
    let glow = 'rgba(59, 130, 246, 0.15)';
    let icon = <Zap size={15} color="#3b82f6" />;

    if (currentProgressCount === 0 && currentElapsedSec <= 10) {
      status = 'ready';
      label = `🎯 Hedef Hız: Soru Başı ${formatSecToMinSec(targetSecPerQ)}`;
      statusText = `Toplam ${targetGoalCount} soru için ${calculatedQuestionBudgetMinutes} dakika planlandı.`;
      color = '#6366f1';
      bg = isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff';
      border = isDark ? 'rgba(99, 102, 241, 0.35)' : '#c7d2fe';
      glow = 'rgba(99, 102, 241, 0.12)';
      icon = <Target size={15} color="#6366f1" />;
    } else if (currentProgressCount >= targetGoalCount) {
      status = 'completed';
      label = '🎉 Hedef Soru Tamamlandı!';
      statusText = deltaSec >= 0 ? `${formatSecToMinSec(deltaSec)} süre artırdınız, tebrikler!` : 'Tüm soruları tamamladınız.';
      color = '#10b981';
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#f0fdf4';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#bbf7d0';
      glow = 'rgba(16, 185, 129, 0.2)';
      icon = <Trophy size={15} color="#10b981" />;
    } else if (deltaSec >= 20) {
      status = 'ahead';
      label = `🚀 ${formatSecToMinSec(Math.abs(deltaSec))} Öndesin (Harika Hız!)`;
      statusText = `Plana göre ${formatSecToMinSec(Math.abs(deltaSec))} daha hızlısınız.`;
      color = '#10b981';
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#f0fdf4';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#bbf7d0';
      glow = 'rgba(16, 185, 129, 0.2)';
      icon = <Sparkles size={15} color="#10b981" />;
    } else if (deltaSec <= -20) {
      status = 'behind';
      label = `⚠️ ${formatSecToMinSec(Math.abs(deltaSec))} Geridesin (Hızlanmalısın)`;
      statusText = `Kalan sorular için soru başı ${formatSecToMinSec(remainingSecPerQ)} vaktiniz var.`;
      color = '#f59e0b';
      bg = isDark ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb';
      border = isDark ? 'rgba(245, 158, 11, 0.35)' : '#fde68a';
      glow = 'rgba(245, 158, 11, 0.2)';
      icon = <AlertCircle size={15} color="#f59e0b" />;
    }

    return {
      targetSecPerQ,
      totalBudgetSec,
      remainingQuestions,
      remainingSeconds,
      remainingSecPerQ,
      expectedElapsedSec,
      deltaSec,
      status,
      label,
      statusText,
      color,
      bg,
      border,
      glow,
      icon
    };
  }, [activeStudyMode, minutesPerQuestion, targetGoalCount, currentProgressCount, currentElapsedSec, timeLeft, stopwatchSeconds, isDark, calculatedQuestionBudgetMinutes]);

  // ── 📊 DERS BAZLI HIZ İSTATİSTİKLERİ ÖZETİ & HESAPLAMALARI ──
  const trackedSubjectsList = useMemo(() => {
    return STUDY_SUBJECTS.map(subj => {
      const st = subjectStats[subj.id];
      const hasData = st && st.totalQuestions > 0 && st.totalSeconds > 0;
      const avgSec = hasData ? Math.round(st.totalSeconds / st.totalQuestions) : 0;
      const evaluation = getSpeedEvaluation(avgSec, subj.defaultMinPerQ);
      return {
        ...subj,
        totalQuestions: st?.totalQuestions || 0,
        totalSeconds: st?.totalSeconds || 0,
        sessionCount: st?.sessionCount || 0,
        lastSessionSecPerQ: st?.lastSessionSecPerQ || 0,
        hasData,
        avgSec,
        evaluation
      };
    });
  }, [subjectStats]);

  const activeTrackedCount = trackedSubjectsList.filter(s => s.hasData).length;

  const totalTrackedQuestions = useMemo(() => {
    return Object.values(subjectStats).reduce((acc, s) => acc + (s.totalQuestions || 0), 0);
  }, [subjectStats]);

  const totalTrackedSeconds = useMemo(() => {
    return Object.values(subjectStats).reduce((acc, s) => acc + (s.totalSeconds || 0), 0);
  }, [subjectStats]);

  const overallAvgSecPerQ = totalTrackedQuestions > 0 ? Math.round(totalTrackedSeconds / totalTrackedQuestions) : 0;

  const fastestSubject = useMemo(() => {
    const withData = trackedSubjectsList.filter(s => s.hasData && s.avgSec > 0);
    if (withData.length === 0) return null;
    return [...withData].sort((a, b) => a.avgSec - b.avgSec)[0];
  }, [trackedSubjectsList]);

  const slowestSubject = useMemo(() => {
    const withData = trackedSubjectsList.filter(s => s.hasData && s.avgSec > 0);
    if (withData.length === 0) return null;
    return [...withData].sort((a, b) => b.avgSec - a.avgSec)[0];
  }, [trackedSubjectsList]);

  const loadDemoSubjectStats = () => {
    const demo = {
      'Matematik': { totalQuestions: 40, totalSeconds: 5040, sessionCount: 3, lastSessionSecPerQ: 126 },
      'Fen Bilimleri': { totalQuestions: 35, totalSeconds: 3150, sessionCount: 2, lastSessionSecPerQ: 90 },
      'Türkçe': { totalQuestions: 45, totalSeconds: 3105, sessionCount: 3, lastSessionSecPerQ: 69 },
      'T.C. İnkılap Tarihi': { totalQuestions: 25, totalSeconds: 1200, sessionCount: 2, lastSessionSecPerQ: 48 }
    };
    setSubjectStats(demo);
    localStorage.setItem('study_subject_stats', JSON.stringify(demo));
  };

  const currentSubjectObj = STUDY_SUBJECTS.find(s => s.id === selectedSubject) || STUDY_SUBJECTS[0];
  const currentSubjectStat = subjectStats[selectedSubject] || null;
  const currentSubjectAvgSec = (currentSubjectStat && currentSubjectStat.totalQuestions > 0)
    ? Math.round(currentSubjectStat.totalSeconds / currentSubjectStat.totalQuestions)
    : Math.round(currentSubjectObj.defaultMinPerQ * 60);

  // Kartın içindeki render bileşeni (Normal ve Fullscreen için ortak)
  const renderMasterStationContent = (isFullscreenView = false) => (
    <div style={{
      width: '100%',
      maxWidth: isFullscreenView ? 1040 : '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: isFullscreenView ? 20 : 16
    }}>
      {/* 1. ÜST MOD SWITCHER BARI & DERS PROGRAMINA GİT BUTONU */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 8 : 10,
        width: '100%'
      }}>
        <div className="sr-timer-modes" style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: isMobile ? 4 : 6,
          background: themeObj.innerBg,
          padding: isMobile ? 3 : 5,
          borderRadius: isMobile ? 14 : 18,
          border: `1.5px solid ${themeObj.border}`
        }}>
          {[
            { id: 'question', label: isMobile ? '✏️ Soru' : '✏️ Soru Çözümü', sub: `${calculatedQuestionBudgetMinutes} dk` },
            { id: 'book', label: isMobile ? '📖 Kitap' : '📖 Kitap Okuma', sub: 'Sayfa' },
            { id: 'study', label: isMobile ? '🎯 Konu' : '🎯 Konu Çalışma', sub: `${durations.pomodoro || calculatedQuestionBudgetMinutes} dk` },
            { id: 'break', label: isMobile ? '☕ Mola' : '☕ Mola', sub: `${durations.shortBreak || 10} dk` }
          ].map(m => {
            const isSelected = activeStudyMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSwitchMasterMode(m.id)}
                className="sr-timer-mode-btn"
                style={{
                  padding: isFullscreenView ? '0.75rem 0.6rem' : isMobile ? '0.45rem 0.2rem' : '0.6rem 0.5rem',
                  borderRadius: isMobile ? 10 : 14,
                  border: 'none',
                  fontWeight: 900,
                  fontSize: isFullscreenView ? '0.86rem' : isMobile ? '0.72rem' : '0.78rem',
                  cursor: 'pointer',
                  background: isSelected
                    ? (m.id === 'question' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : m.id === 'book' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : m.id === 'study' ? 'linear-gradient(135deg, #10b981, #059669)' : themeObj.accent)
                    : 'transparent',
                  color: isSelected ? '#ffffff' : themeObj.text,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  boxShadow: isSelected ? '0 6px 16px rgba(0,0,0,0.18)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  overflow: 'hidden'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{m.label}</span>
                <span style={{ fontSize: isFullscreenView ? '0.7rem' : isMobile ? '0.58rem' : '0.64rem', opacity: isSelected ? 0.95 : 0.65 }}>{m.sub}</span>
              </button>
            );
          })}
        </div>

        {/* 3 Buton (Program Sayfası, Ödev Seç ve Zen Odak) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : 'auto auto auto',
          gap: isMobile ? 5 : 8
        }}>
          {/* Program Sayfası Butonu (Doğrudan Programı Açar) */}
          <button
            onClick={() => navigate('/student/program')}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none',
              color: '#ffffff',
              borderRadius: isMobile ? 12 : 16,
              padding: isFullscreenView ? '0.85rem 1.1rem' : isMobile ? '0.55rem 0.55rem' : '0.75rem 0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              fontSize: isFullscreenView ? '0.84rem' : isMobile ? '0.72rem' : '0.78rem',
              fontWeight: 900,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              transition: 'all 0.15s'
            }}
            title="Ders Programını tam sayfa aç"
          >
            <Calendar size={isMobile ? 14 : 17} />
            <span>📅 Program</span>
          </button>

          {/* Ödev / Test Seç Modalı Butonu */}
          <button
            onClick={() => {
              setHwSourceTab('bookTest');
              setShowHomeworkPickerModal(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              color: '#ffffff',
              borderRadius: isMobile ? 12 : 16,
              padding: isFullscreenView ? '0.85rem 1.1rem' : isMobile ? '0.55rem 0.55rem' : '0.75rem 0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              fontSize: isFullscreenView ? '0.84rem' : isMobile ? '0.72rem' : '0.78rem',
              fontWeight: 900,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
              transition: 'all 0.15s'
            }}
            title="Ödev veya test seçip çalışma odasında başlat"
          >
            <BookMarked size={isMobile ? 14 : 17} />
            <span>📝 Ödev Seç</span>
          </button>

          {/* Zen Tam Ekran Butonu */}
          <button
            onClick={() => setIsCardFullscreen(!isCardFullscreen)}
            style={{
              background: isCardFullscreen ? themeObj.accent : themeObj.buttonBg,
              border: `1.5px solid ${themeObj.border}`,
              color: isCardFullscreen ? 'white' : themeObj.text,
              borderRadius: isMobile ? 12 : 16,
              padding: isFullscreenView ? '0.85rem 1.1rem' : isMobile ? '0.55rem 0.75rem' : '0.75rem 0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: isFullscreenView ? '0.84rem' : isMobile ? '0.72rem' : '0.78rem',
              fontWeight: 900,
              whiteSpace: 'nowrap',
              boxShadow: isCardFullscreen ? '0 6px 16px rgba(0,0,0,0.25)' : 'none',
              transition: 'all 0.15s'
            }}
            title={isCardFullscreen ? "Normal Ekrana Dön" : "Geniş Zen Odak Moduna Geç"}
          >
            {isCardFullscreen ? <Shrink size={isMobile ? 15 : 18} /> : <Expand size={isMobile ? 15 : 18} />}
            <span>{isCardFullscreen ? 'Küçült' : 'Zen Odak'}</span>
          </button>
        </div>
      </div>

      {/* 2. AKTİF GÖREV BİLGİ KARTI (SADECE BİR GÖREV YÜKLENDİĞİNDE GÖSTERİLİR) */}
      {selectedTask && (
        <div style={{
          background: selectedTask.isRoadmapTask || selectedTask.sourceType === 'roadmap'
            ? (isDark ? 'rgba(139, 92, 246, 0.14)' : '#f5f3ff')
            : (isDark ? 'rgba(59, 130, 246, 0.14)' : '#eff6ff'),
          border: `1.5px solid ${selectedTask.isRoadmapTask || selectedTask.sourceType === 'roadmap' ? '#8b5cf6' : '#3b82f6'}`,
          borderRadius: 18,
          padding: '0.85rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          boxShadow: selectedTask.isRoadmapTask || selectedTask.sourceType === 'roadmap'
            ? '0 4px 16px rgba(139,92,246,0.15)'
            : '0 4px 16px rgba(59,130,246,0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 220 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: selectedTask.isRoadmapTask || selectedTask.sourceType === 'roadmap'
                ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <BookMarked size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  color: selectedTask.isRoadmapTask || selectedTask.sourceType === 'roadmap' ? '#8b5cf6' : '#3b82f6',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {selectedTask.isRoadmapTask || selectedTask.sourceType === 'roadmap'
                    ? '🗺️ Yol Haritası (Konu Takibi)'
                    : selectedTask.sourceType === 'program'
                    ? '📅 Program Görevi'
                    : selectedTask.sourceType === 'bookTest'
                    ? '📚 Kitap Testi'
                    : '📝 Ödev'}
                </span>
                {selectedTask.subject && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(139,92,246,0.18)', color: '#7c3aed', padding: '0.05rem 0.45rem', borderRadius: 6 }}>
                    {selectedTask.subject}
                  </span>
                )}
                {(selectedTask.unit || selectedTask.topic) && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(16,185,129,0.18)', color: '#059669', padding: '0.05rem 0.45rem', borderRadius: 6 }}>
                    {[selectedTask.unit, selectedTask.topic].filter(Boolean).join(' › ')}
                  </span>
                )}
                {selectedTask.bookTitle && selectedTask.bookTitle !== selectedTask.title && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '0.05rem 0.4rem', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                    📖 {selectedTask.bookTitle}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 900, color: themeObj.text, lineHeight: 1.3 }}>
                {selectedTask.title || selectedTask.testName || selectedTask.topic || 'Test'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(selectedTask.isRoadmapTask || selectedTask.sourceType === 'roadmap') ? (
              <button
                type="button"
                onClick={handleCompleteRoadmapTask}
                style={{
                  padding: '0.45rem 0.95rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 3px 10px rgba(16,185,129,0.35)'
                }}
              >
                <CheckCircle2 size={15} /> Konuyu Tamamla ✅
              </button>
            ) : (
              (selectedTask.realTestId || selectedTask.bookTestId) && (
                <button
                  type="button"
                  onClick={() => handleLaunchTaskQuiz(selectedTask)}
                  style={{
                    padding: '0.45rem 0.9rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 3px 10px rgba(16,185,129,0.3)'
                  }}
                >
                  <PlayCircle size={15} /> Testi Çöz
                </button>
              )
            )}
            <button
              type="button"
              onClick={handleClearSelectedTask}
              style={{
                padding: '0.45rem 0.75rem',
                background: 'transparent',
                color: themeObj.subText,
                border: `1.5px solid ${themeObj.border}`,
                borderRadius: 10,
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Seçili görevi kaldır"
            >
              <X size={14} /> Kaldır
            </button>
          </div>
        </div>
      )}


      {/* 3. ANA İÇERİK IZGARASI (SOL SAYAÇ + SAĞ KONTROLLER) */}
      <div className={isFullscreenView ? "sr-zen-grid" : "sr-card-body-grid"}>

        {/* ── SOL BÖLÜM: BÜYÜK SAYAÇ HALKASI + ANA BUTONLAR ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: themeObj.innerBg,
          borderRadius: 24,
          padding: isFullscreenView ? '2rem 1.5rem' : '1.5rem 1.25rem',
          border: `1.5px solid ${themeObj.border}`,
          position: 'relative'
        }}>
          {/* SVG Timer Ring */}
          {(() => {
            const timerSize = isFullscreenView ? 320 : isMobile ? 210 : 270;
            const timerCenter = timerSize / 2;
            const timerRadius = isFullscreenView ? 140 : isMobile ? 89 : 115;
            const timerStroke = isFullscreenView ? 13 : isMobile ? 9 : 11;

            return (
              <div style={{
                position: 'relative',
                width: timerSize,
                height: timerSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width={timerSize} height={timerSize} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                  <circle
                    cx={timerCenter}
                    cy={timerCenter}
                    r={timerRadius}
                    stroke={themeObj.isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}
                    strokeWidth={timerStroke}
                    fill="transparent"
                  />
                  <circle
                    cx={timerCenter}
                    cy={timerCenter}
                    r={timerRadius}
                    stroke={activeStudyMode === 'question' ? '#f59e0b' : activeStudyMode === 'book' ? '#6366f1' : activeStudyMode === 'break' ? '#38bdf8' : '#10b981'}
                    strokeWidth={timerStroke}
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * timerRadius}
                    strokeDashoffset={2 * Math.PI * timerRadius * (1 - progressPct / 100)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>

                <div style={{ textAlign: 'center', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div className={isRunning ? "sr-tree-pulse" : ""} style={{ fontSize: isFullscreenView ? '3.2rem' : isMobile ? '1.9rem' : '2.5rem', marginBottom: 2 }}>
                    {treeGrowthStage.icon}
                  </div>

                  <div className="sr-timer-digits" style={{
                    fontSize: isFullscreenView ? '4.8rem' : isMobile ? '2.7rem' : '3.7rem',
                    fontWeight: 900,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    color: themeObj.text
                  }}>
                    {activeStudyMode === 'stopwatch' ? formatTime(stopwatchSeconds) : formatTime(timeLeft)}
                  </div>

                  {(activeStudyMode === 'question' || activeStudyMode === 'book') ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginTop: isMobile ? 3 : 6 }}>
                      <div style={{
                        fontSize: isFullscreenView ? '1rem' : isMobile ? '0.78rem' : '0.84rem',
                        fontWeight: 900,
                        color: activeStudyMode === 'question' ? '#f59e0b' : themeObj.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}>
                        <span>{currentProgressCount} / {targetGoalCount} {activeStudyMode === 'question' ? 'Soru' : 'Sayfa'}</span>
                        <span style={{ fontSize: isMobile ? '0.68rem' : '0.74rem', opacity: 0.8 }}>({targetProgressPct}%)</span>
                      </div>

                      {activeStudyMode === 'question' && livePacingData && (
                        <div style={{
                          fontSize: isMobile ? '0.64rem' : '0.72rem',
                          fontWeight: 800,
                          color: livePacingData.color,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: livePacingData.bg,
                          border: `1px solid ${livePacingData.border}`,
                          padding: isMobile ? '1px 6px' : '2px 8px',
                          borderRadius: 99,
                          marginTop: 2,
                          boxShadow: `0 2px 8px ${livePacingData.glow}`
                        }}>
                          {livePacingData.icon}
                          <span>{livePacingData.label}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      fontSize: isMobile ? '0.68rem' : '0.75rem',
                      fontWeight: 800,
                      color: themeObj.subText,
                      marginTop: isMobile ? 3 : 6
                    }}>
                      {treeGrowthStage.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Ana Kontroller (Başlat / Duraklat / Sıfırla / Ayarlar) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 8 : 10, marginTop: isMobile ? 10 : 14 }}>
            <button
              onClick={resetTimer}
              title="Sıfırla"
              style={{
                width: isFullscreenView ? 50 : isMobile ? 40 : 44,
                height: isFullscreenView ? 50 : isMobile ? 40 : 44,
                borderRadius: isMobile ? 12 : 14,
                background: themeObj.buttonBg,
                border: `1.5px solid ${themeObj.border}`,
                color: themeObj.text,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <RotateCcw size={isFullscreenView ? 20 : isMobile ? 16 : 17} />
            </button>

            <button
              onClick={handleToggleRunning}
              className="sr-action-btn-main"
              style={{
                padding: isFullscreenView ? '1rem 2.8rem' : isMobile ? '0.75rem 1.6rem' : '0.85rem 2.2rem',
                borderRadius: isMobile ? 14 : 18,
                background: isRunning 
                  ? '#ef4444' 
                  : (activeStudyMode === 'question' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)'),
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: isFullscreenView ? '1.15rem' : isMobile ? '0.92rem' : '1.02rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: isRunning 
                  ? '0 8px 25px rgba(239,68,68,0.4)' 
                  : '0 8px 25px rgba(245,158,11,0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              {isRunning ? (
                <><Pause size={isFullscreenView ? 22 : isMobile ? 16 : 18} fill="white" /> Duraklat</>
              ) : (
                sessionElapsedSeconds > 0 ? (
                  <><Play size={isFullscreenView ? 22 : isMobile ? 16 : 18} fill="white" /> Devam Et</>
                ) : (
                  <><Play size={isFullscreenView ? 22 : isMobile ? 16 : 18} fill="white" /> Başlat</>
                )
              )}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              title="Süre Ayarları"
              style={{
                width: isFullscreenView ? 50 : isMobile ? 40 : 44,
                height: isFullscreenView ? 50 : isMobile ? 40 : 44,
                borderRadius: isMobile ? 12 : 14,
                background: showSettings ? themeObj.accent : themeObj.buttonBg,
                border: `1.5px solid ${themeObj.border}`,
                color: showSettings ? 'white' : themeObj.text,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <Settings2 size={isFullscreenView ? 20 : isMobile ? 16 : 17} />
            </button>
          </div>

          {/* ⏱️ CANLI PLAN & HIZ KONTROL PANELİ (SAYACIN ALTINDA) */}
          {activeStudyMode === 'question' && livePacingData && (
            <div style={{
              width: '100%',
              marginTop: isMobile ? 10 : 14,
              background: themeObj.cardBg,
              borderRadius: isMobile ? 14 : 18,
              padding: isMobile ? '0.65rem 0.75rem' : '0.85rem 1rem',
              border: `1.5px solid ${livePacingData.border}`,
              boxShadow: `0 4px 16px ${livePacingData.glow}`,
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 6 : 8,
              transition: 'all 0.3s ease',
              boxSizing: 'border-box'
            }}>
              {/* Başlık ve Durum */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: livePacingData.bg,
                  color: livePacingData.color,
                  border: `1px solid ${livePacingData.border}`,
                  borderRadius: 99,
                  padding: isMobile ? '0.15rem 0.5rem' : '0.2rem 0.65rem',
                  fontSize: isMobile ? '0.66rem' : '0.74rem',
                  fontWeight: 900
                }}>
                  {livePacingData.icon}
                  <span>{livePacingData.label}</span>
                </div>

                <span style={{ fontSize: isMobile ? '0.66rem' : '0.72rem', fontWeight: 800, color: themeObj.subText }}>
                  🎯 Hedef: <strong style={{ color: themeObj.text }}>{formatSecToMinSec(livePacingData.targetSecPerQ)}/soru</strong>
                </span>
              </div>

              {/* 3'lü Hız ve Süre Göstergesi */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: isMobile ? 3 : 6,
                background: themeObj.innerBg,
                padding: isMobile ? '0.4rem 0.5rem' : '0.5rem 0.65rem',
                borderRadius: 12,
                border: `1px solid ${themeObj.border}`
              }}>
                {/* 1. Kalan Her Soru Başına Süre */}
                <div style={{ textAlign: 'center', minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? '0.52rem' : '0.62rem', fontWeight: 800, color: themeObj.subText, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>KALAN SORUYA</div>
                  <div style={{
                    fontSize: isMobile ? '0.82rem' : '0.95rem',
                    fontWeight: 900,
                    color: livePacingData.remainingSecPerQ >= livePacingData.targetSecPerQ 
                      ? '#10b981' 
                      : livePacingData.remainingSecPerQ >= livePacingData.targetSecPerQ * 0.75 
                        ? '#f59e0b' 
                        : '#ef4444',
                    marginTop: 2
                  }}>
                    {livePacingData.remainingQuestions > 0 
                      ? (livePacingData.remainingSeconds > 0 ? `${formatSecToMinSec(livePacingData.remainingSecPerQ)}` : '0 sn') 
                      : 'Bitti'}
                  </div>
                </div>

                {/* 2. Şu Anki Gerçekleşen Hız */}
                <div style={{ textAlign: 'center', borderLeft: `1px solid ${themeObj.border}`, borderRight: `1px solid ${themeObj.border}`, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? '0.52rem' : '0.62rem', fontWeight: 800, color: themeObj.subText, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>ŞU ANKİ HIZIN</div>
                  <div style={{
                    fontSize: isMobile ? '0.82rem' : '0.95rem',
                    fontWeight: 900,
                    color: liveSessionSecPerQ <= livePacingData.targetSecPerQ ? '#10b981' : '#f59e0b',
                    marginTop: 2
                  }}>
                    {currentProgressCount > 0 ? `${formatSecToMinSec(liveSessionSecPerQ)}` : '—'}
                  </div>
                </div>

                {/* 3. Kalan Soru */}
                <div style={{ textAlign: 'center', minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? '0.52rem' : '0.62rem', fontWeight: 800, color: themeObj.subText, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>KALAN SORU</div>
                  <div style={{ fontSize: isMobile ? '0.82rem' : '0.95rem', fontWeight: 900, color: themeObj.text, marginTop: 2 }}>
                    {livePacingData.remainingQuestions} / {targetGoalCount}
                  </div>
                </div>
              </div>

              {/* Canlı İlerleme Çubuğu */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 800, color: themeObj.subText }}>
                  <span>Soru: %{targetProgressPct} ({currentProgressCount}/{targetGoalCount})</span>
                  <span>Süre: {formatTime(currentElapsedSec)} / {formatTime(livePacingData.totalBudgetSec)}</span>
                </div>
                <div style={{ height: 6, background: themeObj.innerBg, borderRadius: 99, overflow: 'hidden', border: `1px solid ${themeObj.border}` }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, targetProgressPct)}%`,
                    background: livePacingData.color,
                    borderRadius: 99,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SAĞ BÖLÜM: DERS SEÇİMİ, HEDEF VE SORU ÇÖZME BUTONU ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          
          {/* SORU ÇÖZME MODU KONTROLLERİ */}
          {activeStudyMode === 'question' && (
            <div style={{
              background: themeObj.innerBg,
              borderRadius: isMobile ? 18 : 22,
              padding: isFullscreenView ? '1.25rem 1.4rem' : isMobile ? '0.85rem 0.75rem' : '1.1rem 1.25rem',
              border: `1.5px solid ${themeObj.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 10 : 14,
              boxSizing: 'border-box',
              width: '100%',
              minWidth: 0
            }}>
              {/* Ders & Soru Başı Süre Seçimi */}
              <div style={{ display: 'grid', gridTemplateColumns: isSmallMobile ? '1fr' : '1.2fr 1fr', gap: isMobile ? 8 : 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 800, color: themeObj.subText, marginBottom: 4 }}>
                    📚 Ders:
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={e => handleSelectSubject(e.target.value)}
                    style={{
                      width: '100%',
                      background: themeObj.cardBg,
                      border: `1.5px solid ${themeObj.border}`,
                      color: themeObj.text,
                      borderRadius: 12,
                      fontSize: isMobile ? '0.78rem' : '0.84rem',
                      fontWeight: 900,
                      padding: isMobile ? '0.45rem 0.5rem' : '0.5rem 0.6rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {STUDY_SUBJECTS.map(subj => (
                      <option key={subj.id} value={subj.id}>
                        {subj.icon} {subj.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 800, color: themeObj.subText, marginBottom: 4 }}>
                    ⏱️ Soru Başı:
                  </label>
                  <select
                    value={minutesPerQuestion}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setMinutesPerQuestion(val);
                      if (!isRunning) setTimeLeft(Math.round(targetGoalCount * val) * 60);
                    }}
                    style={{
                      width: '100%',
                      background: themeObj.cardBg,
                      border: `1.5px solid ${themeObj.border}`,
                      color: themeObj.text,
                      borderRadius: 12,
                      fontSize: isMobile ? '0.78rem' : '0.84rem',
                      fontWeight: 900,
                      padding: isMobile ? '0.45rem 0.5rem' : '0.5rem 0.6rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={1.0}>1.0 dk / soru</option>
                    <option value={1.25}>1.25 dk (1:15)</option>
                    <option value={1.5}>1.5 dk (1:30)</option>
                    <option value={2.0}>2.0 dk / soru</option>
                    <option value={2.5}>2.5 dk (2:30)</option>
                    <option value={3.0}>3.0 dk / soru</option>
                  </select>
                </div>
              </div>

              {/* Hedef Soru Ayarı */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: themeObj.cardBg,
                padding: isMobile ? '0.45rem 0.65rem' : '0.6rem 0.9rem',
                borderRadius: 14,
                border: `1.5px solid ${themeObj.border}`
              }}>
                <span style={{ fontSize: isMobile ? '0.76rem' : '0.82rem', fontWeight: 900, color: themeObj.text }}>
                  🎯 Hedef Soru:
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: isMobile ? 4 : 6 }}>
                  <button
                    type="button"
                    onClick={() => handleSetNewTargetGoal(Math.max(1, targetGoalCount - 1), true)}
                    style={{
                      width: isMobile ? 28 : 32,
                      height: isMobile ? 28 : 32,
                      borderRadius: 8,
                      border: `1px solid ${themeObj.border}`,
                      background: themeObj.innerBg,
                      color: themeObj.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900
                    }}
                  >
                    <Minus size={isMobile ? 12 : 14} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={targetInputVal}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setTargetInputVal(raw);
                      if (raw && Number(raw) > 0) handleSetNewTargetGoal(Number(raw), true);
                    }}
                    onBlur={() => {
                      if (!targetInputVal || Number(targetInputVal) < 1) setTargetInputVal(String(targetGoalCount || 12));
                    }}
                    style={{
                      width: isMobile ? 38 : 44,
                      textAlign: 'center',
                      fontSize: isMobile ? '0.92rem' : '1rem',
                      fontWeight: 900,
                      border: 'none',
                      background: 'transparent',
                      color: themeObj.text,
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSetNewTargetGoal(Math.min(500, targetGoalCount + 1), true)}
                    style={{
                      width: isMobile ? 28 : 32,
                      height: isMobile ? 28 : 32,
                      borderRadius: 8,
                      border: `1px solid ${themeObj.border}`,
                      background: themeObj.innerBg,
                      color: themeObj.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900
                    }}
                  >
                    <Plus size={isMobile ? 12 : 14} />
                  </button>
                  <span style={{ fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 800, color: themeObj.subText, marginLeft: 2 }}>
                    ({calculatedQuestionBudgetMinutes} dk)
                  </span>
                </div>
              </div>

              {/* MOD SEÇİCİ & OPTİK FORM (SADECE TEST / ÖDEV SEÇİLDİĞİNDE GÖRÜNÜR) */}
              {selectedTask ? (
                <>
                  {/* MOD SEÇİCİ: OPTİK FORM vs HIZLI SAYAÇ */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                    background: themeObj.cardBg,
                    padding: 3,
                    borderRadius: 14,
                    border: `1.5px solid ${themeObj.border}`
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpticalInputMode('optical');
                        localStorage.setItem('study_optical_mode', 'optical');
                      }}
                      style={{
                        padding: isMobile ? '0.45rem 0.5rem' : '0.5rem 0.75rem',
                        borderRadius: 10,
                        border: 'none',
                        background: opticalInputMode === 'optical'
                          ? (themeObj.accentGradient || `linear-gradient(135deg, ${themeObj.accent}, ${themeObj.accent})`)
                          : 'transparent',
                        color: opticalInputMode === 'optical' ? '#ffffff' : themeObj.subText,
                        fontWeight: 900,
                        fontSize: isMobile ? '0.74rem' : '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        boxShadow: opticalInputMode === 'optical' ? `0 3px 12px ${themeObj.accent}40` : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      <BookMarked size={isMobile ? 13 : 15} />
                      <span>Optik Form</span>
                      {Object.keys(opticalAnswers).length > 0 && (
                        <span style={{
                          background: opticalInputMode === 'optical' ? 'rgba(255,255,255,0.25)' : themeObj.accent,
                          color: '#ffffff',
                          fontSize: '0.64rem',
                          padding: '1px 5px',
                          borderRadius: 99,
                          fontWeight: 900
                        }}>
                          {Object.keys(opticalAnswers).length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpticalInputMode('counter');
                        localStorage.setItem('study_optical_mode', 'counter');
                      }}
                      style={{
                        padding: isMobile ? '0.45rem 0.5rem' : '0.5rem 0.75rem',
                        borderRadius: 10,
                        border: 'none',
                        background: opticalInputMode === 'counter'
                          ? (themeObj.accentGradient || `linear-gradient(135deg, ${themeObj.accent}, ${themeObj.accent})`)
                          : 'transparent',
                        color: opticalInputMode === 'counter' ? '#ffffff' : themeObj.subText,
                        fontWeight: 900,
                        fontSize: isMobile ? '0.74rem' : '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        boxShadow: opticalInputMode === 'counter' ? `0 3px 12px ${themeObj.accent}40` : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Target size={isMobile ? 13 : 15} />
                      <span>Hızlı Sayaç (+1)</span>
                    </button>
                  </div>

                  {/* OPTİK / AÇIK UÇLU FORM GÖRÜNÜMÜ */}
                  {opticalInputMode === 'optical' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
                      {/* Form Araç Çubuğu */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 6,
                        padding: isMobile ? '0.35rem 0.5rem' : '0.4rem 0.6rem',
                        background: themeObj.cardBg,
                        borderRadius: 12,
                        border: `1px solid ${themeObj.border}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontSize: isMobile ? '0.68rem' : '0.74rem',
                            fontWeight: 900,
                            color: Object.keys(opticalAnswers).length === targetGoalCount ? '#10b981' : (isSelectedTaskOpenEnded ? '#8b5cf6' : themeObj.accent),
                            background: themeObj.innerBg,
                            padding: '2px 7px',
                            borderRadius: 8,
                            border: `1px solid ${themeObj.border}`
                          }}>
                            {isSelectedTaskOpenEnded ? '✍️ Açık Uçlu: ' : '📋 Optik: '}
                            {Object.keys(opticalAnswers).length} / {targetGoalCount} {isSelectedTaskOpenEnded ? 'Yanıtlandı' : 'Kodlandı'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {/* 4 / 5 Şık Seçici (Sadece Çoktan Seçmelide) */}
                          {!isSelectedTaskOpenEnded && (
                            <div style={{ display: 'inline-flex', background: themeObj.innerBg, padding: 2, borderRadius: 8, border: `1px solid ${themeObj.border}` }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpticalOptionCount(4);
                                  localStorage.setItem('study_optical_opt_count', '4');
                                }}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: opticalOptionCount === 4 ? themeObj.accent : 'transparent',
                                  color: opticalOptionCount === 4 ? '#ffffff' : themeObj.subText,
                                  fontSize: isMobile ? '0.64rem' : '0.68rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                A-D (4)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpticalOptionCount(5);
                                  localStorage.setItem('study_optical_opt_count', '5');
                                }}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: opticalOptionCount === 5 ? themeObj.accent : 'transparent',
                                  color: opticalOptionCount === 5 ? '#ffffff' : themeObj.subText,
                                  fontSize: isMobile ? '0.64rem' : '0.68rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                A-E (5)
                              </button>
                            </div>
                          )}

                          {Object.keys(opticalAnswers).length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearOpticalAnswers}
                              style={{
                                padding: '2px 6px',
                                borderRadius: 6,
                                border: `1px solid ${themeObj.border}`,
                                background: themeObj.buttonBg,
                                color: '#ef4444',
                                fontSize: isMobile ? '0.64rem' : '0.68rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                              title="Tüm yanıtları temizle"
                            >
                              Temizle
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sorular Grid Listesi */}
                      <div style={{
                        maxHeight: isFullscreenView ? '600px' : isMobile ? '360px' : '500px',
                        overflowY: 'auto',
                        padding: isMobile ? '0.45rem' : '0.65rem',
                        background: themeObj.cardBg,
                        borderRadius: 14,
                        border: `1.5px solid ${themeObj.border}`,
                        display: 'grid',
                        gridTemplateColumns: isSelectedTaskOpenEnded
                          ? (isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))')
                          : (isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : (targetGoalCount <= 8 ? '1fr' : 'repeat(auto-fill, minmax(210px, 1fr))')),
                        gap: isMobile ? 6 : 8,
                        alignItems: 'start'
                      }} className="custom-scrollbar">
                        {Array.from({ length: targetGoalCount }).map((_, idx) => {
                          const qNo = idx + 1;
                          const userAns = opticalAnswers[qNo] ?? opticalAnswers[String(qNo)] ?? null;
                          const opts = opticalOptionCount === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];

                          if (isSelectedTaskOpenEnded) {
                            return (
                              <div
                                key={qNo}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: isMobile ? 6 : 8,
                                  padding: isMobile ? '0.35rem 0.5rem' : '0.45rem 0.65rem',
                                  borderRadius: 10,
                                  background: userAns ? (themeObj.opticalSelectedBg || 'rgba(124, 58, 237, 0.12)') : themeObj.innerBg,
                                  border: `1.5px solid ${userAns ? (themeObj.opticalSelectedBorder || '#8b5cf6') : themeObj.border}`,
                                  transition: 'all 0.15s',
                                  minWidth: 0
                                }}
                              >
                                <span style={{
                                  fontSize: isMobile ? '0.74rem' : '0.8rem',
                                  fontWeight: 900,
                                  color: userAns ? '#8b5cf6' : themeObj.text,
                                  minWidth: isMobile ? 42 : 52,
                                  flexShrink: 0
                                }}>
                                  Soru {qNo}:
                                </span>
                                <input
                                  type="text"
                                  value={userAns || ''}
                                  onChange={(e) => handleSetOpticalTextAnswer(qNo, e.target.value)}
                                  placeholder="Yanıtı yazınız..."
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    padding: isMobile ? '0.35rem 0.5rem' : '0.4rem 0.6rem',
                                    borderRadius: 7,
                                    border: `1px solid ${userAns ? '#8b5cf6' : themeObj.border}`,
                                    background: themeObj.cardBg,
                                    color: themeObj.text,
                                    fontSize: isMobile ? '0.78rem' : '0.84rem',
                                    fontWeight: 700,
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                            );
                          }

                          return (
                            <div
                              key={qNo}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: isMobile ? '0.3rem 0.4rem' : '0.35rem 0.6rem',
                                borderRadius: 10,
                                background: userAns ? (themeObj.opticalSelectedBg || 'rgba(99, 102, 241, 0.15)') : themeObj.innerBg,
                                border: `1px solid ${userAns ? (themeObj.opticalSelectedBorder || themeObj.accent) : themeObj.border}`,
                                transition: 'all 0.15s',
                                minWidth: 0
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2, width: isMobile ? 24 : 36, flexShrink: 0 }}>
                                <span style={{
                                  fontSize: isMobile ? '0.72rem' : '0.78rem',
                                  fontWeight: 900,
                                  color: userAns ? themeObj.accent : themeObj.text
                                }}>
                                  {qNo}.
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 3 : 5 }}>
                                {opts.map(opt => {
                                  const isSelected = userAns === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => handleSelectOpticalOption(qNo, opt)}
                                      style={{
                                        width: isMobile ? 25 : 30,
                                        height: isMobile ? 25 : 30,
                                        borderRadius: '50%',
                                        border: isSelected ? `1.5px solid ${themeObj.accent}` : `1.5px solid ${themeObj.border}`,
                                        background: isSelected
                                          ? (themeObj.accentGradient || `linear-gradient(135deg, ${themeObj.accent}, ${themeObj.accent})`)
                                          : themeObj.buttonBg,
                                        color: isSelected ? '#ffffff' : themeObj.text,
                                        fontWeight: 900,
                                        fontSize: isMobile ? '0.72rem' : '0.8rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: isSelected ? `0 2px 10px ${themeObj.accent}55` : 'none',
                                        transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                        transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        flexShrink: 0
                                      }}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Optiği / Yanıtları Kaydet & Sınavı Tamamla Butonu */}
                      <button
                        type="button"
                        onClick={handleFinishOpticalQuiz}
                        disabled={isSubmittingOptical || Object.keys(opticalAnswers).length === 0}
                        className="sr-action-btn-main"
                        style={{
                          width: '100%',
                          padding: isMobile ? '0.75rem 0.85rem' : '0.85rem 1.1rem',
                          borderRadius: 14,
                          background: Object.keys(opticalAnswers).length > 0
                            ? (isSelectedTaskOpenEnded ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'linear-gradient(135deg, #10b981, #059669)')
                            : themeObj.buttonBg,
                          color: Object.keys(opticalAnswers).length > 0 ? '#ffffff' : themeObj.subText,
                          border: 'none',
                          fontWeight: 900,
                          fontSize: isMobile ? '0.82rem' : '0.92rem',
                          cursor: Object.keys(opticalAnswers).length > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          boxShadow: Object.keys(opticalAnswers).length > 0 ? '0 6px 20px rgba(16, 185, 129, 0.35)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <CheckCircle2 size={isMobile ? 16 : 18} />
                        <span>
                          {isSubmittingOptical ? 'Kaydediliyor...' : `${isSelectedTaskOpenEnded ? 'Yanıtları' : 'Optiği'} Kaydet & Bitir (${Object.keys(opticalAnswers).length} Soru) 🎯`}
                        </span>
                      </button>
                    </div>
                  ) : (
                    /* HIZLI SAYAÇ GÖRÜNÜMÜ (+1 / -1) */
                    <>
                      {/* Soru Çözdüm Butonu (+1 / -1) */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10 }}>
                        <button
                          onClick={() => handleIncrementProgress(-1)}
                          style={{
                            padding: isFullscreenView ? '1.1rem 1.4rem' : isMobile ? '0.75rem 1rem' : '0.95rem 1.15rem',
                            borderRadius: isMobile ? 14 : 16,
                            background: themeObj.buttonBg,
                            border: `1.5px solid ${themeObj.border}`,
                            color: themeObj.text,
                            fontWeight: 900,
                            fontSize: isMobile ? '0.95rem' : '1.05rem',
                            cursor: 'pointer'
                          }}
                          title="1 Soru Geri Al"
                        >
                          -1
                        </button>

                        <button
                          onClick={() => handleIncrementProgress(1)}
                          className="sr-action-btn-main"
                          style={{
                            padding: isFullscreenView ? '1.1rem 1.6rem' : isMobile ? '0.75rem 1.1rem' : '0.95rem 1.3rem',
                            borderRadius: isMobile ? 14 : 16,
                            background: themeObj.accentGradient || 'linear-gradient(135deg, #f59e0b, #d97706)',
                            border: 'none',
                            color: 'white',
                            fontWeight: 900,
                            fontSize: isFullscreenView ? '1.15rem' : isMobile ? '0.92rem' : '1.02rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: `0 6px 20px ${themeObj.accent}44`
                          }}
                        >
                          <Plus size={isMobile ? 18 : 22} strokeWidth={3} />
                          <span>+1 Soru Çözdüm 🎯</span>
                        </button>
                      </div>

                      {/* İlerleme Çubuğu */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ height: 8, borderRadius: 99, background: themeObj.cardBg, overflow: 'hidden', border: `1px solid ${themeObj.border}` }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, targetProgressPct)}%`,
                            background: 'linear-gradient(90deg, #f59e0b, #10b981)',
                            borderRadius: 99,
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>

                      {/* Testi Bitir & Molaya Geç */}
                      {currentProgressCount > 0 && (
                        <button
                          onClick={() => setShowConfirmFinish(true)}
                          className="sr-action-btn-main"
                          style={{
                            width: '100%',
                            padding: isMobile ? '0.75rem 0.85rem' : '0.85rem 1.1rem',
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 900,
                            fontSize: isMobile ? '0.84rem' : '0.94rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: '0 6px 20px rgba(16,185,129,0.35)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <CheckCircle2 size={isMobile ? 16 : 18} />
                          <span>Testi Bitir & Molaya Geç ({currentProgressCount} Soru Kaydet)</span>
                        </button>
                      )}
                    </>
                  )}
                </>
              ) : (
                /* TEST / ÖDEV SEÇİLMEDİĞİNDE: OPTİK GİZLENİR, SADECE HIZLI SAYAÇ VE TEST SEÇME BUTONU GELİR */
                <>
                  {/* Soru Çözdüm Butonu (+1 / -1) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10 }}>
                    <button
                      onClick={() => handleIncrementProgress(-1)}
                      style={{
                        padding: isFullscreenView ? '1.1rem 1.4rem' : isMobile ? '0.75rem 1rem' : '0.95rem 1.15rem',
                        borderRadius: isMobile ? 14 : 16,
                        background: themeObj.buttonBg,
                        border: `1.5px solid ${themeObj.border}`,
                        color: themeObj.text,
                        fontWeight: 900,
                        fontSize: isMobile ? '0.95rem' : '1.05rem',
                        cursor: 'pointer'
                      }}
                      title="1 Soru Geri Al"
                    >
                      -1
                    </button>

                    <button
                      onClick={() => handleIncrementProgress(1)}
                      className="sr-action-btn-main"
                      style={{
                        padding: isFullscreenView ? '1.1rem 1.6rem' : isMobile ? '0.75rem 1.1rem' : '0.95rem 1.3rem',
                        borderRadius: isMobile ? 14 : 16,
                        background: themeObj.accentGradient || 'linear-gradient(135deg, #f59e0b, #d97706)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 900,
                        fontSize: isFullscreenView ? '1.15rem' : isMobile ? '0.92rem' : '1.02rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: `0 6px 20px ${themeObj.accent}44`
                      }}
                    >
                      <Plus size={isMobile ? 18 : 22} strokeWidth={3} />
                      <span>+1 Soru Çözdüm 🎯</span>
                    </button>
                  </div>

                  {/* İlerleme Çubuğu */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ height: 8, borderRadius: 99, background: themeObj.cardBg, overflow: 'hidden', border: `1px solid ${themeObj.border}` }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, targetProgressPct)}%`,
                        background: 'linear-gradient(90deg, #f59e0b, #10b981)',
                        borderRadius: 99,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>


                  {/* Testi Bitir & Molaya Geç */}
                  {currentProgressCount > 0 && (
                    <button
                      onClick={() => setShowConfirmFinish(true)}
                      className="sr-action-btn-main"
                      style={{
                        width: '100%',
                        padding: isMobile ? '0.75rem 0.85rem' : '0.85rem 1.1rem',
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        fontWeight: 900,
                        fontSize: isMobile ? '0.84rem' : '0.92rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <Zap size={isMobile ? 16 : 18} fill="white" />
                      <span>Testi Bitir & Molaya Geç ({currentProgressCount} Soru) 🏖️</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* KİTAP OKUMA MODU KONTROLLERİ */}
          {activeStudyMode === 'book' && (
            <div style={{
              background: themeObj.innerBg,
              borderRadius: isMobile ? 18 : 22,
              padding: isFullscreenView ? '1.25rem 1.4rem' : isMobile ? '0.85rem 0.75rem' : '1.1rem 1.25rem',
              border: `1.5px solid ${themeObj.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 10 : 14,
              boxSizing: 'border-box'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: themeObj.cardBg,
                padding: isMobile ? '0.45rem 0.65rem' : '0.6rem 0.9rem',
                borderRadius: 14,
                border: `1.5px solid ${themeObj.border}`
              }}>
                <span style={{ fontSize: isMobile ? '0.76rem' : '0.82rem', fontWeight: 900, color: themeObj.text }}>
                  📖 Hedef Sayfa:
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: isMobile ? 4 : 6 }}>
                  <button
                    type="button"
                    onClick={() => handleSetNewTargetGoal(Math.max(1, targetGoalCount - 5), true)}
                    style={{
                      width: isMobile ? 28 : 32,
                      height: isMobile ? 28 : 32,
                      borderRadius: 8,
                      border: `1px solid ${themeObj.border}`,
                      background: themeObj.innerBg,
                      color: themeObj.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900
                    }}
                  >
                    <Minus size={isMobile ? 12 : 14} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={targetInputVal}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setTargetInputVal(raw);
                      if (raw && Number(raw) > 0) handleSetNewTargetGoal(Number(raw), true);
                    }}
                    onBlur={() => {
                      if (!targetInputVal || Number(targetInputVal) < 1) setTargetInputVal(String(targetGoalCount || 20));
                    }}
                    style={{
                      width: isMobile ? 38 : 44,
                      textAlign: 'center',
                      fontSize: isMobile ? '0.92rem' : '1rem',
                      fontWeight: 900,
                      border: 'none',
                      background: 'transparent',
                      color: themeObj.text,
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSetNewTargetGoal(Math.min(500, targetGoalCount + 5), true)}
                    style={{
                      width: isMobile ? 28 : 32,
                      height: isMobile ? 28 : 32,
                      borderRadius: 8,
                      border: `1px solid ${themeObj.border}`,
                      background: themeObj.innerBg,
                      color: themeObj.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900
                    }}
                  >
                    <Plus size={isMobile ? 12 : 14} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10 }}>
                <button
                  onClick={() => handleIncrementProgress(-1)}
                  style={{
                    padding: isFullscreenView ? '1.1rem 1.4rem' : isMobile ? '0.75rem 1rem' : '0.95rem 1.15rem',
                    borderRadius: isMobile ? 14 : 16,
                    background: themeObj.buttonBg,
                    border: `1.5px solid ${themeObj.border}`,
                    color: themeObj.text,
                    fontWeight: 900,
                    fontSize: isMobile ? '0.95rem' : '1.05rem',
                    cursor: 'pointer'
                  }}
                  title="1 Sayfa Geri Al"
                >
                  -1
                </button>

                <button
                  onClick={() => handleIncrementProgress(1)}
                  className="sr-action-btn-main"
                  style={{
                    padding: isFullscreenView ? '1.1rem 1.6rem' : isMobile ? '0.75rem 1.1rem' : '0.95rem 1.3rem',
                    borderRadius: isMobile ? 14 : 16,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    border: 'none',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: isFullscreenView ? '1.15rem' : isMobile ? '0.92rem' : '1.02rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 6px 20px rgba(99,102,241,0.35)'
                  }}
                >
                  <Plus size={isMobile ? 18 : 22} strokeWidth={3} />
                  <span>+1 Sayfa Okudum 📖</span>
                </button>
              </div>
            </div>
          )}

          {/* KONU ÇALIŞMA VEYA MOLA MODU KONTROLLERİ */}
          {(activeStudyMode === 'study' || activeStudyMode === 'break') && (
            <div style={{
              background: themeObj.innerBg,
              borderRadius: isMobile ? 18 : 22,
              padding: isMobile ? '0.85rem 0.75rem' : '1.25rem',
              border: `1.5px solid ${themeObj.border}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: isMobile ? 8 : 12,
              textAlign: 'center',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: isMobile ? '0.78rem' : '0.86rem', fontWeight: 900, color: themeObj.text }}>
                {activeStudyMode === 'study' ? '🎯 Hızlı Süre Seçimi:' : '☕ Mola Süresi:'}
              </span>
              <div style={{ display: 'flex', gap: isMobile ? 5 : 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {(activeStudyMode === 'study' ? [15, 25, 30, 45, 60] : [5, 10, 15, 20]).map(mins => (
                  <button
                    key={mins}
                    onClick={() => {
                      if (activeStudyMode === 'study') {
                        setDurations(d => ({ ...d, pomodoro: mins }));
                      } else {
                        setDurations(d => ({ ...d, shortBreak: mins }));
                      }
                      if (!isRunning) setTimeLeft(mins * 60);
                    }}
                    style={{
                      padding: isMobile ? '0.4rem 0.65rem' : '0.5rem 0.9rem',
                      borderRadius: 10,
                      border: `1.5px solid ${themeObj.border}`,
                      background: themeObj.cardBg,
                      color: themeObj.text,
                      fontWeight: 900,
                      fontSize: isMobile ? '0.74rem' : '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    {mins} dk
                  </button>
                ))}
              </div>

              {/* Yol Haritası Görevi Seçiliyse Tamamlama Butonu */}
              {activeStudyMode === 'study' && (selectedTask?.isRoadmapTask || selectedTask?.sourceType === 'roadmap') && (
                <div style={{ width: '100%', marginTop: 6, paddingTop: 8, borderTop: `1px solid ${themeObj.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: isMobile ? '0.74rem' : '0.8rem', fontWeight: 800, color: '#8b5cf6' }}>
                    🗺️ {selectedTask.title || selectedTask.topic}
                  </div>
                  <button
                    type="button"
                    onClick={handleCompleteRoadmapTask}
                    className="sr-action-btn-main"
                    style={{
                      width: '100%',
                      padding: isMobile ? '0.65rem 0.85rem' : '0.8rem 1.1rem',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 900,
                      fontSize: isMobile ? '0.8rem' : '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <CheckCircle2 size={isMobile ? 15 : 17} />
                    <span>Konu Çalışmasını Tamamla &amp; Bitir ✅</span>
                  </button>
                </div>
              )}
            </div>

          )}

        </div>
      </div>

          {/* Testi Bitir Onay Modalı */}
          {showConfirmFinish && (
            <div
              onClick={() => setShowConfirmFinish(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem'
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: themeObj.cardBg || '#1e293b',
                  borderRadius: 24,
                  padding: '2rem 1.75rem',
                  maxWidth: 380,
                  width: '100%',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏖️</div>
                <h3 style={{ margin: '0 0 0.5rem', fontWeight: 900, color: themeObj.text || '#f1f5f9', fontSize: '1.15rem' }}>
                  Testi bitirmek istiyor musun?
                </h3>
                <p style={{ margin: '0 0 1.5rem', color: themeObj.subText || '#94a3b8', fontSize: '0.87rem', lineHeight: 1.5 }}>
                  <strong style={{ color: '#10b981' }}>{currentProgressCount} soru</strong> çözdün.
                  {liveSessionSecPerQ > 0 && <> Ortalama <strong style={{ color: '#10b981' }}>{formatSecToMinSec(liveSessionSecPerQ)}/soru</strong>.</>}
                  {' '}Artan süre molana eklenecek! ✨
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setShowConfirmFinish(false)}
                    style={{
                      flex: 1, padding: '0.8rem', borderRadius: 14,
                      background: 'rgba(148,163,184,0.15)', border: '1.5px solid rgba(148,163,184,0.25)',
                      color: themeObj.subText || '#94a3b8', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer'
                    }}
                  >
                    ✕ Vazgeç
                  </button>
                  <button
                    onClick={() => { setShowConfirmFinish(false); handleFinishEarlyAndRewardBreak(); }}
                    style={{
                      flex: 1, padding: '0.8rem', borderRadius: 14,
                      background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                      color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer',
                      boxShadow: '0 6px 16px rgba(16,185,129,0.4)'
                    }}
                  >
                    ✓ Evet, Bitir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ayarlar Açılır Paneli (Tek Mola & Odak Senkronizasyonu) */}
          {showSettings && (
            <div style={{
              background: themeObj.innerBg,
              padding: isMobile ? '0.85rem 0.75rem' : '1.25rem',
              borderRadius: isMobile ? 16 : 20,
              border: `1.5px solid ${themeObj.border}`,
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: isMobile ? 10 : 14,
              boxShadow: '0 6px 20px rgba(0,0,0,0.06)'
            }}>
              {/* ODAK SÜRESİ */}
              <div style={{
                background: themeObj.cardBg,
                padding: '0.85rem 1rem',
                borderRadius: 16,
                border: `1.5px solid ${themeObj.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 900, color: themeObj.text }}>🎯 Odak Süresi (dk)</label>
                  <span style={{ fontSize: '0.64rem', color: '#6366f1', fontWeight: 800, background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: 6 }}>Otomatik Eşitlenir</span>
                </div>

                {/* Touch-friendly Stepper Control */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: themeObj.innerBg,
                  borderRadius: 12,
                  border: `1.5px solid ${themeObj.border}`,
                  padding: 4
                }}>
                  <button
                    type="button"
                    onClick={() => handleAdjustFocus(-5)}
                    style={{
                      minWidth: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: themeObj.cardBg,
                      color: themeObj.text,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                    title="5 dk azalt"
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={focusInputVal}
                    onChange={e => handleFocusInputChange(e.target.value)}
                    onBlur={handleFocusInputBlur}
                    style={{
                      width: '100%',
                      maxWidth: 90,
                      padding: '0.4rem 0.2rem',
                      border: 'none',
                      background: 'transparent',
                      color: themeObj.text,
                      fontWeight: 900,
                      fontSize: '1.15rem',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => handleAdjustFocus(5)}
                    style={{
                      minWidth: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: themeObj.cardBg,
                      color: themeObj.text,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                    title="5 dk artır"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Quick Presets for Mobile */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[15, 25, 30, 42, 45, 60].map(mins => {
                    const isActive = Number(durations.pomodoro) === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleSetFocusPreset(mins)}
                        style={{
                          flex: 1,
                          minWidth: 32,
                          padding: '0.35rem 0.3rem',
                          borderRadius: 8,
                          border: `1.5px solid ${isActive ? '#6366f1' : themeObj.border}`,
                          background: isActive ? '#6366f1' : themeObj.innerBg,
                          color: isActive ? '#ffffff' : themeObj.subText,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {mins}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.64rem', color: themeObj.subText, fontWeight: 700, lineHeight: 1.3 }}>
                  ⚡ Soru sayısına göre: {targetGoalCount} soru × {minutesPerQuestion} dk = {calculatedQuestionBudgetMinutes} dk
                </div>
              </div>

              {/* MOLA SÜRESİ */}
              <div style={{
                background: themeObj.cardBg,
                padding: '0.85rem 1rem',
                borderRadius: 16,
                border: `1.5px solid ${themeObj.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 900, color: themeObj.text }}>☕ Mola Süresi (dk)</label>
                  <span style={{ fontSize: '0.64rem', color: '#10b981', fontWeight: 800, background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 6 }}>Tek Mola</span>
                </div>

                {/* Touch-friendly Stepper Control */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: themeObj.innerBg,
                  borderRadius: 12,
                  border: `1.5px solid ${themeObj.border}`,
                  padding: 4
                }}>
                  <button
                    type="button"
                    onClick={() => handleAdjustBreak(-1)}
                    style={{
                      minWidth: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: themeObj.cardBg,
                      color: themeObj.text,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                    title="1 dk azalt"
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={breakInputVal}
                    onChange={e => handleBreakInputChange(e.target.value)}
                    onBlur={handleBreakInputBlur}
                    style={{
                      width: '100%',
                      maxWidth: 90,
                      padding: '0.4rem 0.2rem',
                      border: 'none',
                      background: 'transparent',
                      color: themeObj.text,
                      fontWeight: 900,
                      fontSize: '1.15rem',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => handleAdjustBreak(1)}
                    style={{
                      minWidth: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: themeObj.cardBg,
                      color: themeObj.text,
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                    title="1 dk artır"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Quick Presets for Mobile */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[5, 8, 10, 15, 20].map(mins => {
                    const isActive = Number(durations.shortBreak) === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleSetBreakPreset(mins)}
                        style={{
                          flex: 1,
                          minWidth: 32,
                          padding: '0.35rem 0.3rem',
                          borderRadius: 8,
                          border: `1.5px solid ${isActive ? '#10b981' : themeObj.border}`,
                          background: isActive ? '#10b981' : themeObj.innerBg,
                          color: isActive ? '#ffffff' : themeObj.subText,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {mins}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.64rem', color: themeObj.subText, fontWeight: 700, lineHeight: 1.3 }}>
                  🏖️ Erken bitirilen seansların artan dakikaları bu molaya otomatik eklenir.
                </div>
              </div>

              {/* 🔔 Soru Başı Süre Hatırlatma Sesi & Ekran Açık Tutma Modu Kontrolleri */}
              <div style={{
                gridColumn: '1 / -1',
                background: themeObj.cardBg,
                borderRadius: 14,
                padding: '0.75rem 1rem',
                border: `1.5px solid ${themeObj.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: questionChimeEnabled ? 'rgba(245, 158, 11, 0.15)' : themeObj.innerBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Bell size={18} color={questionChimeEnabled ? '#f59e0b' : themeObj.subText} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.text }}>
                      Soru Başı Süre Hatırlatma Sesi
                    </div>
                    <div style={{ fontSize: '0.66rem', color: themeObj.subText, fontWeight: 700 }}>
                      Her {minutesPerQuestion} dakikada bir (1 soru süresi dolduğunda) hafif yumuşak sesle uyarır
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const next = !questionChimeEnabled;
                    setQuestionChimeEnabled(next);
                    localStorage.setItem('study_question_chime_enabled', String(next));
                    if (next) ambientAudio.playSoftDing();
                  }}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: 10,
                    border: 'none',
                    background: questionChimeEnabled ? 'linear-gradient(135deg, #10b981, #059669)' : (themeObj.isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'),
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: questionChimeEnabled ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {questionChimeEnabled ? '🔔 Ses Açık' : '🔕 Kapalı'}
                </button>
              </div>

              {/* 🛑 Seans Başı Duraklatma Limiti Ayarı */}
              <div style={{
                gridColumn: '1 / -1',
                background: themeObj.cardBg,
                borderRadius: 14,
                padding: '0.75rem 1rem',
                border: `1.5px solid ${themeObj.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'rgba(239, 68, 68, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444'
                  }}>
                    <Pause size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: themeObj.text }}>
                      Seans Başı Duraklatma Sınırı
                    </div>
                    <div style={{ fontSize: '0.66rem', color: themeObj.subText, fontWeight: 700 }}>
                      Süre arttıkça hak otomatik artar (Örn: ≤15 dk=1, 25 dk=2, 42 dk=3, 60 dk=4 Hak)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'auto', label: '⚡ Süreye Göre (Otomatik)' },
                    { key: '2', label: '2 Hak' },
                    { key: '3', label: '3 Hak' },
                    { key: '5', label: '5 Hak' }
                  ].map(opt => {
                    const isActive = pauseLimitMode === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setPauseLimitMode(opt.key);
                          localStorage.setItem('study_pause_limit_mode', opt.key);
                        }}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 8,
                          border: `1.5px solid ${isActive ? '#ef4444' : themeObj.border}`,
                          background: isActive ? '#ef4444' : themeObj.innerBg,
                          color: isActive ? '#ffffff' : themeObj.subText,
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 2px 8px rgba(239,68,68,0.3)' : 'none'
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ekran Kapanmama Bilgi Şeridi */}
              <div style={{
                gridColumn: '1 / -1',
                background: 'rgba(16, 185, 129, 0.08)',
                borderRadius: 12,
                padding: '0.55rem 0.85rem',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.72rem',
                color: '#10b981',
                fontWeight: 800
              }}>
                <Sun size={15} />
                <span>Ekran Kapanmama Modu: Sayaç çalışırken ekranınız dokunmasanız da asla kapanmaz ve uyumaz.</span>
              </div>
            </div>
          )}

    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        background: themeObj.bg,
        color: themeObj.text,
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden',
        transition: 'background 0.3s ease, color 0.3s ease'
      }}
    >
      <style>{`
        .sr-main-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 1420px;
          margin: 0 auto;
          width: 100%;
          padding: 0 0.5rem;
        }
        .sr-card-body-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        @media (min-width: 960px) {
          .sr-card-body-grid {
            display: grid;
            grid-template-columns: 1fr 1.35fr;
            gap: 1.75rem;
            align-items: start;
          }
        }
        @media (min-width: 1300px) {
          .sr-card-body-grid {
            display: grid;
            grid-template-columns: 1fr 1.55fr;
            gap: 2.25rem;
            align-items: start;
          }
        }
        .sr-zen-grid {
          display: grid;
          grid-template-columns: 1fr 1.45fr;
          gap: 2.25rem;
          align-items: start;
        }
        @media (min-width: 1300px) {
          .sr-zen-grid {
            grid-template-columns: 1fr 1.65fr;
            gap: 2.75rem;
          }
        }
        @media (max-width: 920px) {
          .sr-zen-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
        }
        .sr-theme-btn {
          transition: all 0.15s ease;
        }
        .sr-theme-btn:hover {
          transform: translateY(-1px);
        }
        .sr-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .sr-card:hover {
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.09);
        }
        .sr-tree-pulse {
          animation: treePulse 2.5s infinite ease-in-out;
        }
        @keyframes treePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 14px rgba(52, 211, 153, 0.5)); }
          100% { transform: scale(1); }
        }
        .sr-flame-glow {
          animation: flameGlow 1.8s infinite alternate ease-in-out;
        }
        @keyframes flameGlow {
          0% { filter: drop-shadow(0 0 4px #f97316); }
          100% { filter: drop-shadow(0 0 14px #ef4444); }
        }
        .sr-zen-btn-text {
          display: inline;
        }
        .sr-action-btn-main {
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sr-action-btn-main:active {
          transform: scale(0.96);
        }

        @media (max-width: 960px) {
          .sr-main-grid {
            grid-template-columns: 1fr !important;
            padding: 0 !important;
          }
        }
        @media (max-width: 640px) {
          .sr-zen-btn-text {
            display: none !important;
          }
          .sr-header-title {
            font-size: 0.95rem !important;
          }
          .sr-sub-text {
            display: none !important;
          }
          .sr-timer-digits {
            font-size: 2.4rem !important;
          }
          .sr-timer-modes {
            gap: 3px !important;
            padding: 3px !important;
          }
          .sr-timer-mode-btn {
            padding: 0.35rem 0.2rem !important;
            font-size: 0.68rem !important;
          }
        }
      `}</style>

      {/* ─── HEADER / NAV BAR ─── */}
      <div style={{
        padding: isMobile ? '0.6rem 0.75rem' : '0.9rem 1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1.5px solid ${themeObj.border}`,
        background: themeObj.isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 10,
        gap: 8,
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0 }}>
          <button
            onClick={() => navigate('/student')}
            style={{
              background: themeObj.buttonBg,
              border: `1.5px solid ${themeObj.border}`,
              color: themeObj.text,
              borderRadius: isMobile ? 10 : 12,
              padding: isMobile ? '0.4rem' : '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s',
              flexShrink: 0
            }}
            title="Öğrenci Paneline Dön"
          >
            <ArrowLeft size={isMobile ? 16 : 18} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: isMobile ? '1rem' : '1.2rem' }}>🎧</span>
              <h1 className="sr-header-title" style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.15rem', fontWeight: 900, letterSpacing: '-0.02em', color: themeObj.text, whiteSpace: 'nowrap' }}>
                {isSmallMobile ? 'Odak Odası' : 'Odaklı Çalışma Odası'}
              </h1>

              {/* 6. GÜNLÜK STREAK ROZETİ */}
              <span className="sr-flame-glow" style={{
                background: themeObj.isDark ? 'rgba(249, 115, 22, 0.22)' : '#fff7ed',
                color: '#f97316',
                fontSize: isMobile ? '0.62rem' : '0.72rem',
                fontWeight: 900,
                padding: isMobile ? '0.15rem 0.45rem' : '0.2rem 0.6rem',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                border: '1.5px solid #fdba74',
                whiteSpace: 'nowrap'
              }}>
                <Flame size={isMobile ? 12 : 14} color="#f97316" fill="#f97316" />
                <span>{streakData.currentStreak} Gün!</span>
              </span>

              {/* 🌟 EKRAN KAPANMAMA MODU ROZETİ */}
              {wakeLockActive && !isSmallMobile && (
                <span style={{
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: '#10b981',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  padding: '0.15rem 0.45rem',
                  borderRadius: 99,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  border: '1.5px solid #a7f3d0',
                  whiteSpace: 'nowrap'
                }} title="Sayaç çalıştığı sürece ekranınız hiç kapanmaz.">
                  <Sun size={11} />
                  <span>Ekran Açık</span>
                </span>
              )}
            </div>
            {!isMobile && (
              <div className="sr-sub-text" style={{ fontSize: '0.72rem', color: themeObj.subText, fontWeight: 600, marginTop: 1 }}>
                {currentUser?.name || 'Öğrenci'} · Birleşik Odaklanma & Hızlı Mola İstasyonu
              </div>
            )}
          </div>
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, flexShrink: 0 }}>
          {/* Masaüstünde tema seçici görünür, mobilde gizlenir */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 2, background: themeObj.innerBg, padding: 3, borderRadius: 12, border: `1.5px solid ${themeObj.border}` }}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTheme(t.id)}
                  title={t.name}
                  className="sr-theme-btn"
                  style={{
                    padding: '0.3rem 0.55rem',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: activeTheme === t.id ? themeObj.accent : 'transparent',
                    color: activeTheme === t.id ? '#ffffff' : themeObj.text,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}

          {/* Ayarlar Butonu - drawer açar */}
          <button
            onClick={() => setShowSettingsDrawer(v => !v)}
            title="Ayarlar (Tema, Zen, Ses)"
            style={{
              background: showSettingsDrawer ? themeObj.accent : themeObj.buttonBg,
              border: `1.5px solid ${showSettingsDrawer ? themeObj.accent : themeObj.border}`,
              color: showSettingsDrawer ? '#ffffff' : themeObj.text,
              borderRadius: isMobile ? 10 : 12,
              padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: isMobile ? '0.7rem' : '0.75rem',
              fontWeight: 800,
              transition: 'all 0.15s'
            }}
          >
            <Settings2 size={isMobile ? 15 : 17} />
            {!isMobile && <span>Ayarlar</span>}
          </button>
        </div>
      </div>

      {/* ─── AYARLAR DRAWER (sağdan kayan panel) ─── */}
      {showSettingsDrawer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 200,
          display: 'flex'
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setShowSettingsDrawer(false)}
            style={{ flex: 1, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          />
          {/* Panel */}
          <div style={{
            width: isMobile ? '80vw' : 320,
            maxWidth: 360,
            background: themeObj.isDark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(20px)',
            borderLeft: `1.5px solid ${themeObj.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            padding: '1.25rem 1rem',
            overflowY: 'auto',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.18)'
          }}>
            {/* Başlık */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings2 size={18} color={themeObj.accent} />
                <span style={{ fontWeight: 900, fontSize: '1rem', color: themeObj.text }}>Ayarlar</span>
              </div>
              <button
                onClick={() => setShowSettingsDrawer(false)}
                style={{ background: 'transparent', border: 'none', color: themeObj.subText, cursor: 'pointer', padding: '0.25rem', borderRadius: 8 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tema Seçici */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: themeObj.subText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                🎨 Tema
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTheme(t.id)}
                    title={t.name}
                    style={{
                      padding: '0.5rem 0.6rem',
                      borderRadius: 10,
                      border: `1.5px solid ${activeTheme === t.id ? themeObj.accent : themeObj.border}`,
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: activeTheme === t.id ? themeObj.accent : themeObj.innerBg,
                      color: activeTheme === t.id ? '#ffffff' : themeObj.text,
                      textAlign: 'left',
                      transition: 'all 0.12s'
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tam Ekran / Zen */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: themeObj.subText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                🖥️ Ekran
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={() => { toggleFullscreen(); setShowSettingsDrawer(false); }}
                  style={{
                    padding: '0.55rem 0.85rem',
                    borderRadius: 10,
                    border: `1.5px solid ${themeObj.border}`,
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: isFullscreen ? themeObj.accent : themeObj.buttonBg,
                    color: isFullscreen ? '#ffffff' : themeObj.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.12s'
                  }}
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  {isFullscreen ? 'Tam Ekrandan Çık' : 'Zen Tam Ekran Modu'}
                </button>
                <button
                  onClick={() => { setIsCardFullscreen(v => !v); setShowSettingsDrawer(false); }}
                  style={{
                    padding: '0.55rem 0.85rem',
                    borderRadius: 10,
                    border: `1.5px solid ${themeObj.border}`,
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: isCardFullscreen ? themeObj.accent : themeObj.buttonBg,
                    color: isCardFullscreen ? '#ffffff' : themeObj.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.12s'
                  }}
                >
                  {isCardFullscreen ? <Shrink size={15} /> : <Expand size={15} />}
                  {isCardFullscreen ? 'Zen Odaktan Çık' : 'Zen Odak Modu (Kart)'}
                </button>
              </div>
            </div>

            {/* Ambiyans Sesleri */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: themeObj.subText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                🎵 Ambiyans Sesi
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {[
                  { id: 'rain', label: '💧 Yağmur', icon: '💧' },
                  { id: 'fire', label: '🔥 Ateş', icon: '🔥' },
                  { id: 'whitenoise', label: '⬜ Beyaz', icon: '⬜' }
                ].map(s => {
                  const isActive = (soundVolumes[s.id] || 0) > 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (isActive) {
                          handleVolumeChange(s.id, 0);
                          ambientAudio.stopSound(s.id);
                        } else {
                          handleVolumeChange(s.id, 40);
                        }
                      }}
                      style={{
                        padding: '0.5rem 0.3rem',
                        borderRadius: 10,
                        border: `1.5px solid ${isActive ? themeObj.accent : themeObj.border}`,
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: isActive ? themeObj.accent : themeObj.innerBg,
                        color: isActive ? '#ffffff' : themeObj.text,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                        transition: 'all 0.12s'
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
                      <span style={{ fontSize: '0.62rem' }}>{isActive ? 'Açık' : 'Kapalı'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Soru Başı Çan Sesi */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: themeObj.subText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                🔔 Hatırlatıcı
              </div>
              <button
                onClick={() => {
                  setQuestionChimeEnabled(v => {
                    const next = !v;
                    localStorage.setItem('study_question_chime_enabled', String(next));
                    return next;
                  });
                }}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem',
                  borderRadius: 10,
                  border: `1.5px solid ${questionChimeEnabled ? themeObj.accent : themeObj.border}`,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: questionChimeEnabled ? themeObj.accent : themeObj.buttonBg,
                  color: questionChimeEnabled ? '#ffffff' : themeObj.text,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.12s'
                }}
              >
                {questionChimeEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                Soru Başı Zil {questionChimeEnabled ? '(Açık)' : '(Kapalı)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div style={{
        flex: 1,
        maxWidth: 1440,
        margin: '0 auto',
        width: '100%',
        padding: isMobile ? '0.75rem 0.5rem 3.5rem' : '1.5rem 1.75rem',
        boxSizing: 'border-box'
      }}>
        <div className="sr-main-grid">

          {/* ─── LEFT COLUMN: 🌟 BİRLEŞİK ODAK & HEDEF İSTASYONU (MASTER CARD) ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>

            {/* MASTER CARD: SAYAÇ + HEDEF TAKİPÇİSİ BİRLEŞİK */}
            <div className="sr-card" style={{
              background: themeObj.cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: isMobile ? 20 : 30,
              border: `1.5px solid ${themeObj.border}`,
              padding: isMobile ? '0.85rem 0.75rem' : '1.75rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: themeObj.isDark ? '0 20px 50px rgba(0,0,0,0.3)' : '0 6px 25px -2px rgba(0,0,0,0.05)',
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}>
              {renderMasterStationContent(false)}
            </div>

            {/* ─── 📊 DERS BAZLI SORU SÜRESİ & HIZ ANALİZİ KARTI ─── */}
            <div className="sr-card" style={{
              background: themeObj.cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: isMobile ? 18 : 24,
              border: `1.5px solid ${themeObj.border}`,
              padding: isMobile ? '0.85rem 0.75rem' : '1.25rem',
              boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 4px 20px -2px rgba(0,0,0,0.03)',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {/* Başlık ve Butonlar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 8 : 12, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                    flexShrink: 0
                  }}>
                    <Gauge size={isMobile ? 15 : 18} color="white" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 900, color: themeObj.text }}>
                      Ders Bazlı Soru Başı Süre & Hız Analizi
                    </h3>
                    <div style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', color: themeObj.subText, fontWeight: 600 }}>
                      Hangi derste bir soruya ortalama kaç dakika harcandığının tespiti
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {activeTrackedCount > 0 ? (
                    <button
                      onClick={() => {
                        if (window.confirm('Tüm ders süre istatistiklerini sıfırlamak istediğinize emin misiniz?')) {
                          clearSubjectStats();
                        }
                      }}
                      title="İstatistikleri Sıfırla"
                      style={{
                        background: themeObj.innerBg,
                        border: `1px solid ${themeObj.border}`,
                        color: themeObj.subText,
                        padding: isMobile ? '0.25rem 0.45rem' : '0.3rem 0.55rem',
                        borderRadius: 8,
                        fontSize: isMobile ? '0.64rem' : '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <RotateCcw size={11} />
                      <span>Sıfırla</span>
                    </button>
                  ) : (
                    <button
                      onClick={loadDemoSubjectStats}
                      style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#6366f1',
                        padding: isMobile ? '0.25rem 0.5rem' : '0.3rem 0.65rem',
                        borderRadius: 8,
                        fontSize: isMobile ? '0.64rem' : '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      ✨ Demo Veri
                    </button>
                  )}
                </div>
              </div>

              {/* Üst Özet Rozetleri (KPIs) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: isMobile ? 4 : 8,
                marginBottom: isMobile ? 8 : 12
              }}>
                <div style={{
                  background: themeObj.innerBg,
                  borderRadius: isMobile ? 10 : 14,
                  padding: isMobile ? '0.45rem 0.4rem' : '0.65rem 0.75rem',
                  border: `1px solid ${themeObj.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  minWidth: 0
                }}>
                  <span style={{ fontSize: isMobile ? '0.54rem' : '0.64rem', fontWeight: 800, color: themeObj.subText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>⚡ Genel Ortalama</span>
                  <span style={{ fontSize: isMobile ? '0.78rem' : '0.92rem', fontWeight: 900, color: '#6366f1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {totalTrackedQuestions > 0 ? `${formatSecToMinSec(overallAvgSecPerQ)}/s` : 'Veri Yok'}
                  </span>
                  <span style={{ fontSize: isMobile ? '0.52rem' : '0.62rem', color: themeObj.subText, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {totalTrackedQuestions > 0 ? `${totalTrackedQuestions} soru` : 'Seans başlatın'}
                  </span>
                </div>

                <div style={{
                  background: themeObj.innerBg,
                  borderRadius: isMobile ? 10 : 14,
                  padding: isMobile ? '0.45rem 0.4rem' : '0.65rem 0.75rem',
                  border: `1px solid ${themeObj.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  minWidth: 0
                }}>
                  <span style={{ fontSize: isMobile ? '0.54rem' : '0.64rem', fontWeight: 800, color: themeObj.subText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🏎️ En Hızlı</span>
                  <span style={{ fontSize: isMobile ? '0.74rem' : '0.85rem', fontWeight: 900, color: '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fastestSubject ? `${fastestSubject.icon} ${fastestSubject.name.split(' ')[0]}` : '-'}
                  </span>
                  <span style={{ fontSize: isMobile ? '0.52rem' : '0.62rem', color: '#10b981', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fastestSubject ? `${formatSecToMinSec(fastestSubject.avgSec)}/s` : '-'}
                  </span>
                </div>

                <div style={{
                  background: themeObj.innerBg,
                  borderRadius: isMobile ? 10 : 14,
                  padding: isMobile ? '0.45rem 0.4rem' : '0.65rem 0.75rem',
                  border: `1px solid ${themeObj.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  minWidth: 0
                }}>
                  <span style={{ fontSize: isMobile ? '0.54rem' : '0.64rem', fontWeight: 800, color: themeObj.subText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>⏳ En Detaylı</span>
                  <span style={{ fontSize: isMobile ? '0.74rem' : '0.85rem', fontWeight: 900, color: '#f59e0b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {slowestSubject ? `${slowestSubject.icon} ${slowestSubject.name.split(' ')[0]}` : '-'}
                  </span>
                  <span style={{ fontSize: isMobile ? '0.52rem' : '0.62rem', color: '#f59e0b', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {slowestSubject ? `${formatSecToMinSec(slowestSubject.avgSec)}/s` : '-'}
                  </span>
                </div>
              </div>

              {/* Ders Listesi ve Hız Kartları */}
              {activeTrackedCount > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 4 : 6, maxHeight: 320, overflowY: 'auto' }}>
                  {trackedSubjectsList
                    .filter(subj => subj.hasData)
                    .sort((a, b) => a.avgSec - b.avgSec)
                    .map(subj => {
                      const isSelected = selectedSubject === subj.id;
                      return (
                        <div
                          key={subj.id}
                          onClick={() => handleSelectSubject(subj.id)}
                          style={{
                            background: isSelected ? (themeObj.isDark ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff') : themeObj.innerBg,
                            border: isSelected ? '1.5px solid #6366f1' : `1px solid ${themeObj.border}`,
                            borderRadius: isMobile ? 10 : 14,
                            padding: isMobile ? '0.5rem 0.65rem' : '0.65rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            gap: 6
                          }}
                        >
                          {/* Sol: Ders Adı & İkonu & Çözülen Soru Sayısı */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, minWidth: 0 }}>
                            <span style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', flexShrink: 0 }}>{subj.icon}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ fontSize: isMobile ? '0.76rem' : '0.82rem', fontWeight: 900, color: themeObj.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {subj.name}
                                </span>
                                {isSelected && (
                                  <span style={{
                                    fontSize: '0.58rem',
                                    background: '#6366f1',
                                    color: 'white',
                                    padding: '1px 4px',
                                    borderRadius: 99,
                                    fontWeight: 800,
                                    flexShrink: 0
                                  }}>
                                    Aktif
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: isMobile ? '0.58rem' : '0.65rem', color: themeObj.subText, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {subj.totalQuestions} Soru · {subj.sessionCount} Seans · {Math.round(subj.totalSeconds / 60)} dk
                              </div>
                            </div>
                          </div>

                          {/* Sağ: Soru Başı Ortalama Süre & Değerlendirme Rozeti */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexShrink: 0 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: isMobile ? '0.78rem' : '0.9rem', fontWeight: 900, color: subj.evaluation.color }}>
                                {formatSecToMinSec(subj.avgSec)}
                                <span style={{ fontSize: isMobile ? '0.58rem' : '0.68rem', fontWeight: 700, opacity: 0.85 }}> / soru</span>
                              </div>
                              <div style={{
                                fontSize: isMobile ? '0.56rem' : '0.62rem',
                                fontWeight: 800,
                                color: subj.evaluation.color,
                                background: subj.evaluation.bg,
                                padding: '1px 5px',
                                borderRadius: 6,
                                display: 'inline-block',
                                marginTop: 1
                              }}>
                                {subj.evaluation.label}
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSubject(subj.id);
                                if (activeStudyMode !== 'question') handleSwitchMasterMode('question');
                              }}
                              style={{
                                background: isSelected ? '#6366f1' : themeObj.buttonBg,
                                border: `1px solid ${isSelected ? '#6366f1' : themeObj.border}`,
                                color: isSelected ? 'white' : themeObj.text,
                                borderRadius: 8,
                                padding: isMobile ? '0.25rem 0.45rem' : '0.35rem 0.6rem',
                                fontSize: isMobile ? '0.65rem' : '0.7rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                            >
                              <Play size={10} fill={isSelected ? 'white' : 'currentColor'} />
                              <span>Çalış</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div style={{
                  background: themeObj.innerBg,
                  borderRadius: 16,
                  padding: isMobile ? '0.9rem 0.75rem' : '1.25rem 1rem',
                  border: `1.5px dashed ${themeObj.border}`,
                  textAlign: 'center'
                }}>
                  <Clock size={isMobile ? 22 : 26} color="#6366f1" style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: isMobile ? '0.78rem' : '0.82rem', fontWeight: 800, color: themeObj.text }}>Henüz Kayıtlı Soru Seansı Yok</div>
                  <div style={{ fontSize: isMobile ? '0.66rem' : '0.72rem', color: themeObj.subText, marginTop: 3, lineHeight: 1.4, maxWidth: 380, margin: '3px auto 8px' }}>
                    Yukarıdaki <strong>✏️ Soru Çözümü</strong> modundan dersinizi seçip soru çözdükçe ortalama süreniz burada analiz edilir.
                  </div>
                  <button
                    onClick={loadDemoSubjectStats}
                    style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1.5px solid rgba(99, 102, 241, 0.3)',
                      color: '#6366f1',
                      padding: isMobile ? '0.35rem 0.75rem' : '0.45rem 1rem',
                      borderRadius: 10,
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ✨ Demo Verileri Gör
                  </button>
                </div>
              )}
            </div>

            {/* 1. BUGÜNÜN BAŞARI ORMANI (FOREST BAHÇESİ) */}
            <div className="sr-card" style={{
              background: themeObj.cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: isMobile ? 18 : 24,
              border: `1.5px solid ${themeObj.border}`,
              padding: isMobile ? '0.85rem 0.75rem' : '1.25rem',
              boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 4px 20px -2px rgba(0,0,0,0.03)',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 8 : 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TreePine size={isMobile ? 18 : 20} color="#10b981" />
                  <h3 style={{ margin: 0, fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 900, color: themeObj.text }}>
                    Bugünün Başarı Ormanı
                  </h3>
                </div>
                <span style={{
                  background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
                  color: '#10b981',
                  border: '1px solid #a7f3d0',
                  padding: isMobile ? '0.15rem 0.45rem' : '0.2rem 0.55rem',
                  borderRadius: 99,
                  fontSize: isMobile ? '0.65rem' : '0.72rem',
                  fontWeight: 900
                }}>
                  {plantedForest.length} Ağaç
                </span>
              </div>

              {plantedForest.length > 0 ? (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: isMobile ? 6 : 10,
                  background: themeObj.innerBg,
                  borderRadius: 16,
                  padding: isMobile ? '0.65rem' : '0.85rem',
                  border: `1.5px solid ${themeObj.border}`,
                  minHeight: 60,
                  alignItems: 'center'
                }}>
                  {plantedForest.map((tree, i) => (
                    <div
                      key={tree.id || i}
                      title={`${tree.name} (${tree.time}) - ${tree.task}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        background: themeObj.cardBg,
                        padding: isMobile ? '0.3rem 0.45rem' : '0.4rem 0.6rem',
                        borderRadius: 10,
                        border: `1px solid ${themeObj.border}`,
                        cursor: 'default'
                      }}
                    >
                      <span style={{ fontSize: isMobile ? '1.15rem' : '1.4rem' }}>{tree.icon}</span>
                      <span style={{ fontSize: isMobile ? '0.56rem' : '0.62rem', fontWeight: 800, color: themeObj.subText }}>{tree.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  background: themeObj.innerBg,
                  borderRadius: 16,
                  padding: isMobile ? '0.9rem 0.75rem' : '1.25rem 1rem',
                  border: `1.5px dashed ${themeObj.border}`,
                  textAlign: 'center',
                  color: themeObj.subText
                }}>
                  <Sprout size={isMobile ? 24 : 28} color="#10b981" style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: isMobile ? '0.78rem' : '0.82rem', fontWeight: 800, color: themeObj.text }}>Ormanın Henüz Boş</div>
                  <div style={{ fontSize: isMobile ? '0.66rem' : '0.72rem', marginTop: 2 }}>Hedefini tamamla veya odaklanma seansını bitir ve ilk ağacını dik!</div>
                </div>
              )}
            </div>

            {/* 6. GÜNLÜK HEDEF & ROZETLER */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: isMobile ? 6 : 10
            }}>
              {[
                {
                  label: '50 dk Hedefi',
                  unlocked: dailyStats.totalMinutes >= 50,
                  icon: '🥉',
                  title: 'Bronz Odak',
                  req: '50 dk'
                },
                {
                  label: '100 dk Hedefi',
                  unlocked: dailyStats.totalMinutes >= 100,
                  icon: '🥈',
                  title: 'Gümüş Odak',
                  req: '100 dk'
                },
                {
                  label: '150+ dk Şampiyon',
                  unlocked: dailyStats.totalMinutes >= 150,
                  icon: '🥇',
                  title: 'Altın Şampiyon',
                  req: '150 dk'
                }
              ].map((badge, i) => (
                <div
                  key={i}
                  className="sr-card"
                  style={{
                    background: badge.unlocked
                      ? (isDark ? 'rgba(234, 179, 8, 0.15)' : '#fefce8')
                      : themeObj.cardBg,
                    borderRadius: isMobile ? 14 : 20,
                    border: badge.unlocked ? '1.5px solid #facc15' : `1.5px solid ${themeObj.border}`,
                    padding: isMobile ? '0.65rem 0.4rem' : '0.85rem 0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 2,
                    opacity: badge.unlocked ? 1 : 0.65,
                    minWidth: 0
                  }}
                >
                  <span style={{ fontSize: isMobile ? '1.3rem' : '1.6rem' }}>{badge.icon}</span>
                  <span style={{ fontSize: isMobile ? '0.68rem' : '0.74rem', fontWeight: 900, color: badge.unlocked ? (isDark ? '#fde047' : '#854d0e') : themeObj.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {badge.title}
                  </span>
                  <span style={{ fontSize: isMobile ? '0.58rem' : '0.64rem', color: themeObj.subText, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {badge.unlocked ? '✅ Kazanıldı' : `${badge.req}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 🌟 SADECE KARTIN TAM EKRAN (ZEN ODAK) OVERLAY MODU ─── */}
      {isCardFullscreen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: themeObj.bg,
          zIndex: 99990,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: isMobile ? '0.75rem 0.5rem' : '1.5rem',
          backdropFilter: 'blur(30px)',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          {/* Zen Üst Barı */}
          <div style={{
            position: 'absolute',
            top: isMobile ? 10 : 20,
            left: isMobile ? 12 : 24,
            right: isMobile ? 12 : 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
            gap: 6,
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
              <span style={{ fontSize: isMobile ? '1.1rem' : '1.4rem' }}>🎧</span>
              <span style={{ fontWeight: 900, fontSize: isMobile ? '0.9rem' : '1.05rem', color: themeObj.text }}>Zen Mod</span>
              <span className="sr-flame-glow" style={{
                background: themeObj.isDark ? 'rgba(249, 115, 22, 0.22)' : '#fff7ed',
                color: '#f97316',
                fontSize: isMobile ? '0.62rem' : '0.72rem',
                fontWeight: 900,
                padding: isMobile ? '0.12rem 0.45rem' : '0.2rem 0.6rem',
                borderRadius: 99,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                border: '1.5px solid #fdba74'
              }}>
                <Flame size={isMobile ? 12 : 14} color="#f97316" fill="#f97316" />
                <span>{streakData.currentStreak} Gün!</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
              {/* Theme Selector */}
              <div style={{ display: 'flex', gap: 2, background: themeObj.innerBg, padding: 3, borderRadius: 12, border: `1.5px solid ${themeObj.border}` }}>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTheme(t.id)}
                    style={{
                      padding: isMobile ? '0.25rem 0.45rem' : '0.3rem 0.55rem',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: isMobile ? '0.64rem' : '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: activeTheme === t.id ? themeObj.accent : 'transparent',
                      color: activeTheme === t.id ? '#ffffff' : themeObj.text
                    }}
                  >
                    {t.name.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Zen Çıkış Butonu */}
              <button
                onClick={() => setIsCardFullscreen(false)}
                style={{
                  background: themeObj.buttonBg,
                  border: `1.5px solid ${themeObj.border}`,
                  color: themeObj.text,
                  borderRadius: isMobile ? 10 : 12,
                  padding: isMobile ? '0.4rem 0.65rem' : '0.5rem 0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: isMobile ? '0.74rem' : '0.82rem',
                  fontWeight: 900
                }}
              >
                <Shrink size={isMobile ? 14 : 16} />
                <span>{isMobile ? 'Çık' : 'Normal Ekrana Dön'}</span>
              </button>
            </div>
          </div>

          {/* Merkezde Büyük İstasyon Kartı */}
          <div style={{
            background: themeObj.cardBg,
            borderRadius: isMobile ? 22 : 32,
            border: `1.5px solid ${themeObj.border}`,
            padding: isMobile ? '1.1rem 0.85rem' : '2.5rem 2.8rem',
            maxWidth: 1060,
            width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            marginTop: isMobile ? '3.2rem' : '2.5rem',
            boxSizing: 'border-box'
          }}>
            {renderMasterStationContent(true)}
          </div>
        </div>
      )}

      {/* ─── KUTLAMA & BONUS MOLA MODALI ─── */}
      {earnedBonusModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--color-surface, #ffffff)',
            borderRadius: 24,
            padding: isMobile ? '1.25rem 1rem' : '2rem 1.75rem',
            maxWidth: 460,
            width: '100%',
            border: '2px solid #10b981',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            color: 'var(--color-text, #0f172a)',
            boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 6 }}>
              🏖️⚡🎉
            </div>

            <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 900, margin: '0 0 0.5rem 0', color: '#10b981' }}>
              Harika Hız! Mola Kazandın!
            </h2>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #64748b)', margin: '0 0 1.25rem 0', lineHeight: 1.4 }}>
              Hedeflenen <strong>{earnedBonusModal.questionsDone} {earnedBonusModal.subject || ''} sorusunu</strong> toplam {earnedBonusModal.budgetMinutes} dakikalık bütçe yerine sadece <strong>{earnedBonusModal.elapsedMinutes} dakikada</strong> tamamladın!
            </p>

            <div style={{
              background: 'var(--color-surface-hover, #f8fafc)',
              borderRadius: 16,
              padding: '0.85rem',
              border: '1.5px solid var(--color-border, #e2e8f0)',
              marginBottom: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>Soru Başı Hız</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#6366f1' }}>
                  {formatSecToMinSec(Math.round((earnedBonusModal.elapsedMinutes * 60) / Math.max(1, earnedBonusModal.questionsDone)))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>Erken Bitirme</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b' }}>+{earnedBonusModal.bonusMinutes} dk</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>Toplam Mola</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#10b981' }}>{earnedBonusModal.totalBreakMinutes} dk</div>
              </div>
            </div>

            <button
              onClick={() => {
                setEarnedBonusModal(null);
                setIsRunning(true);
              }}
              style={{
                width: '100%',
                padding: '0.85rem 1.5rem',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
              }}
            >
              🏖️ {earnedBonusModal.totalBreakMinutes} Dakikalık Molayı Başlat!
            </button>
          </div>
        </div>
      )}

      {/* ─── ATANMIŞ ÖDEV, KİTAP TESTİ & HAFTALIK PROGRAM SEÇİM VE BAŞLATMA MODALI ─── */}
      {showHomeworkPickerModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '0.4rem' : '1.25rem'
        }}>
          <div style={{
            background: 'var(--color-surface, #ffffff)',
            borderRadius: isMobile ? 18 : 24,
            padding: isMobile ? '1rem 0.85rem' : '1.75rem 2rem',
            maxWidth: isMobile ? '100%' : 980,
            width: isMobile ? '100%' : 'min(980px, 94vw)',
            maxHeight: isMobile ? '96vh' : '90vh',
            display: 'flex',
            flexDirection: 'column',
            border: '2px solid #3b82f6',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            color: 'var(--color-text, #0f172a)',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}>
            {/* Modal Başlığı */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 8 : 14, gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
                <div style={{
                  width: isMobile ? 36 : 48,
                  height: isMobile ? 36 : 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
                  flexShrink: 0
                }}>
                  <BookMarked size={isMobile ? 18 : 24} />
                </div>
                <div>
                  <h2 style={{ fontSize: isMobile ? '1.05rem' : '1.35rem', fontWeight: 900, margin: 0, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                    Çalışma Görevi / Test Seç
                  </h2>
                  <p style={{ fontSize: isMobile ? '0.72rem' : '0.85rem', color: 'var(--color-text-muted)', margin: '2px 0 0', fontWeight: 600 }}>
                    Haftalık program veya ödevlerinden görev başlat
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, flexShrink: 0 }}>
                {/* Bitenleri / Çözülenleri Gizle/Göster Butonu */}
                <button
                  type="button"
                  onClick={() => setHideCompletedTasks(!hideCompletedTasks)}
                  title={hideCompletedTasks ? 'Çözülenleri Göster' : 'Çözülenleri Gizle'}
                  style={{
                    padding: isMobile ? '0.35rem 0.6rem' : '0.5rem 0.95rem',
                    borderRadius: 10,
                    border: `1.5px solid ${hideCompletedTasks ? '#10b981' : 'var(--color-border, #e2e8f0)'}`,
                    background: hideCompletedTasks ? (isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5') : 'transparent',
                    color: hideCompletedTasks ? '#10b981' : 'var(--color-text-muted)',
                    fontWeight: 800,
                    fontSize: isMobile ? '0.72rem' : '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {hideCompletedTasks ? <EyeOff size={isMobile ? 13 : 15} color="#10b981" /> : <Eye size={isMobile ? 13 : 15} />}
                  <span>{hideCompletedTasks ? 'Bitenler Gizli' : 'Bitenleri Göster'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHomeworkPickerModal(false)}
                  style={{
                    background: 'var(--color-surface-hover, #f1f5f9)',
                    border: 'none',
                    borderRadius: 10,
                    width: isMobile ? 32 : 38,
                    height: isMobile ? 32 : 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--color-text)'
                  }}
                >
                  <X size={isMobile ? 18 : 22} />
                </button>
              </div>
            </div>

            {/* Haftalık Program Sayfasına Hızlı Geçiş Banner'ı (Sadece Masaüstü) */}
            {!isMobile && (
              <div style={{
                background: isDark ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(79, 70, 229, 0.22))' : 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                border: '1.5px solid #818cf8',
                borderRadius: 14,
                padding: '0.85rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 12,
                flexWrap: 'wrap',
                boxShadow: '0 2px 10px rgba(99,102,241,0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                  <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>📅</span>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>
                      Haftalık Program Sayfasından Seç
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 1 }}>
                      Tüm haftalık planını tam sayfa görüp 'Odada Başlat' yapabilirsin.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowHomeworkPickerModal(false);
                    navigate('/student/program');
                  }}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 3px 10px rgba(79,70,229,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <span>Git</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Ana Kategori Sekmeleri (Tabs) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: 6,
              background: 'var(--color-surface-hover, #f1f5f9)',
              padding: isMobile ? 4 : 6,
              borderRadius: 14,
              marginBottom: isMobile ? 8 : 12
            }}>
              {[
                { 
                  id: 'program', 
                  label: '📅 Program', 
                  count: weeklyProgramGrouped.reduce((acc, g) => acc + (hideCompletedTasks ? (g.tasks || []).filter(t => !t.isCompleted).length : (g.tasks || []).length), 0) 
                },
                { id: 'bookTest', label: '📚 Kitap Testleri', count: allAssignedTasks.filter(t => t.sourceType === 'bookTest' && (!hideCompletedTasks || !t.isCompleted)).length },
                { id: 'homework', label: '📝 Atanmış Ödevler', count: allAssignedTasks.filter(t => t.sourceType === 'homework' && (!hideCompletedTasks || !t.isCompleted)).length },
                { id: 'all', label: '🌟 Tüm Liste', count: allAssignedTasks.filter(t => (!hideCompletedTasks || !t.isCompleted)).length }
              ].map(tab => {
                const isTabActive = hwSourceTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHwSourceTab(tab.id)}
                    style={{
                      padding: isMobile ? '0.6rem 0.5rem' : '0.75rem 0.85rem',
                      borderRadius: 10,
                      border: 'none',
                      background: isTabActive ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                      color: isTabActive ? '#ffffff' : 'var(--color-text)',
                      fontWeight: 900,
                      fontSize: isMobile ? '0.82rem' : '0.94rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                      boxShadow: isTabActive ? '0 3px 10px rgba(59,130,246,0.35)' : 'none'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{
                      fontSize: isMobile ? '0.7rem' : '0.78rem',
                      fontWeight: 900,
                      background: isTabActive ? 'rgba(255,255,255,0.28)' : 'var(--color-border, #e2e8f0)',
                      color: isTabActive ? '#ffffff' : 'var(--color-text-muted)',
                      padding: isMobile ? '2px 6px' : '2px 8px',
                      borderRadius: 99
                    }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 1. GÖRÜNÜM: HAFTALIK DERS PROGRAMI (GÜN GÜN SEÇİM & LİSTE) */}
            {hwSourceTab === 'program' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
                {/* Gün Seçici Yatay Şerit (Tek Satır, Geniş ve Rahat Tıklanabilir) */}
                <div style={{
                  display: 'flex',
                  gap: isMobile ? 8 : 10,
                  overflowX: 'auto',
                  padding: isMobile ? '4px 2px 10px' : '6px 3px 12px',
                  borderBottom: '1.5px solid var(--color-border, #e2e8f0)',
                  scrollbarWidth: 'thin',
                  WebkitOverflowScrolling: 'touch',
                  flexShrink: 0
                }}>
                  <button
                    type="button"
                    onClick={() => setSelectedProgramDay('all')}
                    style={{
                      flexShrink: 0,
                      padding: isMobile ? '0.55rem 0.95rem' : '0.75rem 1.25rem',
                      borderRadius: 14,
                      border: `2px solid ${selectedProgramDay === 'all' ? '#3b82f6' : 'var(--color-border, #e2e8f0)'}`,
                      background: selectedProgramDay === 'all' ? (isDark ? 'rgba(59,130,246,0.25)' : '#eff6ff') : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                      color: selectedProgramDay === 'all' ? '#3b82f6' : 'var(--color-text)',
                      fontWeight: 900,
                      fontSize: isMobile ? '0.85rem' : '0.96rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: selectedProgramDay === 'all' ? '0 4px 14px rgba(59,130,246,0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: isMobile ? '1.1rem' : '1.2rem' }}>🌟</span>
                    <span>Tüm Hafta</span>
                  </button>

                  {WEEK_DAYS_CONFIG.map(dayCfg => {
                    const isSelected = selectedProgramDay === dayCfg.key;
                    const isToday = currentTodayKey === dayCfg.key;
                    const dayGroup = weeklyProgramGrouped.find(g => g.key === dayCfg.key);
                    const pendingCount = (dayGroup?.tasks || []).filter(t => !t.isCompleted).length;
                    const totalCount = dayGroup?.tasks?.length || 0;
                    const displayCount = hideCompletedTasks ? pendingCount : totalCount;

                    return (
                      <button
                        key={dayCfg.key}
                        type="button"
                        onClick={() => setSelectedProgramDay(dayCfg.key)}
                        style={{
                          flexShrink: 0,
                          padding: isMobile ? '0.55rem 0.95rem' : '0.75rem 1.25rem',
                          borderRadius: 14,
                          border: `2px solid ${isSelected ? dayCfg.color : isToday ? '#f59e0b' : 'var(--color-border, #e2e8f0)'}`,
                          background: isSelected
                            ? (isDark ? 'rgba(59,130,246,0.25)' : dayCfg.bg)
                            : isToday
                              ? (isDark ? 'rgba(245,158,11,0.2)' : '#fffbeb')
                              : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                          color: isSelected ? dayCfg.color : 'var(--color-text)',
                          fontWeight: 900,
                          fontSize: isMobile ? '0.85rem' : '0.96rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: isSelected
                            ? '0 4px 14px rgba(59,130,246,0.3)'
                            : isToday
                              ? '0 3px 10px rgba(245,158,11,0.25)'
                              : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: isMobile ? '1.1rem' : '1.2rem' }}>{dayCfg.icon}</span>
                        <span>{dayCfg.long}</span>
                        {displayCount > 0 && (
                          <span style={{
                            fontSize: isMobile ? '0.72rem' : '0.8rem',
                            fontWeight: 900,
                            background: isSelected ? dayCfg.color : 'var(--color-border, #e2e8f0)',
                            color: isSelected ? '#ffffff' : 'var(--color-text-muted)',
                            padding: '2px 8px',
                            borderRadius: 99
                          }}>
                            {displayCount}
                          </span>
                        )}
                        {isToday && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            padding: '2px 6px',
                            borderRadius: 6,
                            letterSpacing: '0.03em',
                            boxShadow: '0 2px 8px rgba(245,158,11,0.35)'
                          }}>
                            BUGÜN
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Günlerin Görev Listesi */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 6, maxHeight: isMobile ? 'calc(94vh - 300px)' : '56vh' }}>
                  {weeklyProgramGrouped
                    .filter(dayGroup => selectedProgramDay === 'all' || selectedProgramDay === dayGroup.key)
                    .map(dayGroup => {
                      const isToday = currentTodayKey === dayGroup.key;
                      const visibleTasks = (dayGroup.tasks || []).filter(t => !hideCompletedTasks || !t.isCompleted);

                      return (
                        <div
                          key={dayGroup.key}
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                            border: `1.5px solid ${isToday ? dayGroup.color : 'var(--color-border, #e2e8f0)'}`,
                            borderRadius: 16,
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                          }}
                        >
                          {/* Gün Başlığı & İlerleme Özeti */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1rem' }}>{dayGroup.icon}</span>
                              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: dayGroup.color }}>
                                {dayGroup.long}
                              </span>
                              {dayGroup.dateLabel && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                  ({dayGroup.dateLabel})
                                </span>
                              )}
                              {isToday && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#f59e0b', color: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: 6 }}>
                                  BUGÜNÜN PROGRAMI
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                              {dayGroup.tasks.length > 0 ? (
                                <span>{dayGroup.completedCount} / {dayGroup.tasks.length} Tamamlandı ({dayGroup.totalQuestions} Soru)</span>
                              ) : (
                                <span>Görev Yok</span>
                              )}
                            </div>
                          </div>

                          {/* Günün Görevleri */}
                          {visibleTasks.length === 0 ? (
                            <div style={{
                              padding: '0.9rem',
                              textAlign: 'center',
                              background: 'var(--color-surface, #ffffff)',
                              borderRadius: 12,
                              border: '1px dashed var(--color-border, #cbd5e1)',
                              fontSize: '0.78rem',
                              color: 'var(--color-text-muted)'
                            }}>
                              {dayGroup.tasks.length > 0 && hideCompletedTasks ? (
                                <span style={{ color: '#10b981', fontWeight: 800 }}>
                                  🎉 Bu günün tüm görevleri tamamlandı! ({dayGroup.tasks.length} Görev)
                                </span>
                              ) : (
                                <span>🍃 Bu gün için tanımlı ders programı görevi bulunmuyor.</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowHomeworkPickerModal(false);
                                  setActiveStudyMode('question');
                                }}
                                style={{
                                  marginLeft: 8,
                                  background: 'none',
                                  border: 'none',
                                  color: '#3b82f6',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  fontSize: '0.78rem'
                                }}
                              >
                                Serbest Çalışma Başlat ➔
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {visibleTasks.map(task => {
                                const isSelected = selectedTask?.id === task.id || selectedTask?.dedupeKey === task.dedupeKey;
                                const isRoadmap = task.sourceType === 'roadmap';
                                const isBook = task.sourceType === 'bookTest' || task.isBookAssignment;
                                const isHw = task.sourceType === 'homework';
                                const bookInfo = resolveBookTestInfo(task, books, bookTests);

                                return (
                                  <div
                                    key={task.dedupeKey || task.id}
                                    style={{
                                      background: isSelected
                                        ? (isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff')
                                        : 'var(--color-surface, #ffffff)',
                                      border: isSelected ? '2px solid #3b82f6' : '1px solid var(--color-border, #e2e8f0)',
                                      borderRadius: 12,
                                      padding: '0.75rem 0.95rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      flexWrap: 'wrap',
                                      gap: 8
                                    }}
                                  >
                                    <div style={{ flex: 1, minWidth: 180 }}>
                                      {/* Üst Rozet Satırı */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                        <span style={{
                                          fontSize: '0.68rem',
                                          fontWeight: 900,
                                          background: isRoadmap ? 'rgba(139, 92, 246, 0.15)' : (bookInfo?.isBookTest || isBook) ? 'rgba(59, 130, 246, 0.15)' : isHw ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                          color: isRoadmap ? '#8b5cf6' : (bookInfo?.isBookTest || isBook) ? '#3b82f6' : isHw ? '#0891b2' : '#10b981',
                                          padding: '0.1rem 0.45rem',
                                          borderRadius: 6
                                        }}>
                                          {task.sourceLabel || (isRoadmap ? '🗺️ Yol Haritası' : (bookInfo?.isBookTest || isBook) ? '📚 Kitap Testi' : '📅 Ders Programı')}
                                        </span>

                                        {/* DERS ADI */}
                                        <span style={{
                                          fontSize: '0.74rem',
                                          fontWeight: 900,
                                          background: 'var(--color-surface-hover, #f1f5f9)',
                                          color: 'var(--color-text)',
                                          padding: '0.1rem 0.5rem',
                                          borderRadius: 6,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 3
                                        }}>
                                          <span>📚</span>
                                          <span>{bookInfo?.isBookTest ? bookInfo.subject : (task.subject || 'Genel Ders')}</span>
                                        </span>

                                        {/* YAYINEVİ ROZETİ */}
                                        {bookInfo?.isBookTest && bookInfo.publisher && (
                                          <span style={{
                                            fontSize: '0.64rem',
                                            fontWeight: 700,
                                            color: isDark ? '#c7d2fe' : '#4f46e5',
                                            background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
                                            border: isDark ? '1px solid rgba(165,180,252,0.3)' : '1px solid #c7d2fe',
                                            borderRadius: 5,
                                            padding: '1px 5px'
                                          }}>
                                            🏢 {bookInfo.publisher}
                                          </span>
                                        )}

                                        {task.isCompleted ? (
                                          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#10b981', background: '#dcfce7', padding: '0.1rem 0.4rem', borderRadius: 6 }}>
                                            ✓ Tamamlandı
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '0.1rem 0.4rem', borderRadius: 6 }}>
                                            ⏳ Bekliyor
                                          </span>
                                        )}
                                      </div>

                                      {/* Başlık / Kitap & Test Detayı */}
                                      {bookInfo?.isBookTest ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                          {bookInfo.bookTitle && (
                                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--color-text)' }}>
                                              📖 {bookInfo.bookTitle}
                                            </div>
                                          )}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 1 }}>
                                            {bookInfo.unit && (
                                              <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                fontWeight: 700,
                                                fontSize: '0.68rem',
                                                color: isDark ? '#93c5fd' : '#1d4ed8',
                                                background: isDark ? 'rgba(37,99,235,0.2)' : '#eff6ff',
                                                border: isDark ? '1px solid rgba(59,130,246,0.35)' : '1px solid #bfdbfe',
                                                borderRadius: '0.35rem',
                                                padding: '1px 6px'
                                              }}>
                                                📂 {bookInfo.unit}
                                              </span>
                                            )}
                                            {bookInfo.testName && (
                                              <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                fontWeight: 800,
                                                fontSize: '0.68rem',
                                                color: isDark ? '#c084fc' : '#6d28d9',
                                                background: isDark ? 'rgba(124,58,237,0.2)' : '#f5f3ff',
                                                border: isDark ? '1px solid rgba(168,85,247,0.35)' : '1px solid #ddd6fe',
                                                borderRadius: '0.35rem',
                                                padding: '1px 6px'
                                              }}>
                                                🎯 {bookInfo.testName}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)' }}>
                                          {task.title}
                                        </div>
                                      )}
                                       <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>
                                         {isRoadmap ? (
                                           <span style={{ color: '#8b5cf6', fontWeight: 800 }}>🎯 Konu Çalışması • Odaklanma (Optik Yok)</span>
                                         ) : (
                                           <>
                                             ✏️ {task.questionCount} Soru • Yaklaşık {Math.round(task.questionCount * minutesPerQuestion)} dk
                                             {!bookInfo?.isBookTest && task.topic ? ` • ${task.topic}` : ''}
                                           </>
                                         )}
                                       </div>
                                     </div>

                                     <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                       <button
                                         type="button"
                                         onClick={() => handleSelectTask(task, false)}
                                         style={{
                                           padding: '0.45rem 0.85rem',
                                           borderRadius: 10,
                                           background: isRoadmap
                                             ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                                             : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                           color: '#ffffff',
                                           border: 'none',
                                           fontWeight: 900,
                                           fontSize: '0.76rem',
                                           cursor: 'pointer',
                                           display: 'flex',
                                           alignItems: 'center',
                                           gap: 5,
                                           boxShadow: isRoadmap ? '0 3px 10px rgba(139,92,246,0.25)' : '0 3px 10px rgba(245,158,11,0.25)'
                                         }}
                                       >
                                         <Target size={13} /> {isRoadmap ? 'Konu Çalış' : 'Görevi Seç'}
                                       </button>

                                       {isRoadmap ? (
                                         <button
                                           type="button"
                                           onClick={() => handleSelectTask(task, true)}
                                           style={{
                                             padding: '0.45rem 0.85rem',
                                             borderRadius: 10,
                                             background: 'linear-gradient(135deg, #10b981, #059669)',
                                             color: '#ffffff',
                                             border: 'none',
                                             fontWeight: 900,
                                             fontSize: '0.76rem',
                                             cursor: 'pointer',
                                             display: 'flex',
                                             alignItems: 'center',
                                             gap: 5,
                                             boxShadow: '0 3px 10px rgba(16,185,129,0.25)'
                                           }}
                                         >
                                           <PlayCircle size={13} /> Hemen Başla
                                         </button>
                                       ) : (
                                         <button
                                           type="button"
                                           onClick={() => handleLaunchTaskQuiz(task)}
                                           style={{
                                             padding: '0.45rem 0.85rem',
                                             borderRadius: 10,
                                             background: 'linear-gradient(135deg, #10b981, #059669)',
                                             color: '#ffffff',
                                             border: 'none',
                                             fontWeight: 900,
                                             fontSize: '0.76rem',
                                             cursor: 'pointer',
                                             display: 'flex',
                                             alignItems: 'center',
                                             gap: 5,
                                             boxShadow: '0 3px 10px rgba(16,185,129,0.25)'
                                           }}
                                         >
                                           <PlayCircle size={13} /> Testi Çöz
                                         </button>
                                       )}
                                     </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 2. GÖRÜNÜM: KİTAP TESTLERİ (KİTAP BAZINDA GRUPLU) */}
            {hwSourceTab === 'bookTest' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
                {/* Arama & Ders Filtresi */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Kitap veya test adı ara..."
                      value={hwSearchQuery}
                      onChange={e => setHwSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem 0.5rem 2rem',
                        background: 'var(--color-surface-hover, #f8fafc)',
                        border: '1.5px solid var(--color-border, #e2e8f0)',
                        borderRadius: 12,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <select
                    value={hwFilterSubject}
                    onChange={e => setHwFilterSubject(e.target.value)}
                    style={{
                      padding: '0.5rem 0.85rem',
                      background: 'var(--color-surface-hover, #f8fafc)',
                      border: '1.5px solid var(--color-border, #e2e8f0)',
                      borderRadius: 12,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: 'var(--color-text)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Tüm Dersler</option>
                    {STUDY_SUBJECTS.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Kitaplar ve Testleri */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 6, maxHeight: isMobile ? 'calc(94vh - 270px)' : '56vh' }}>
                  {bookGroupedTests.length === 0 ? (
                    <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16 }}>
                      <div style={{ fontSize: '2rem', marginBottom: 6 }}>📚</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>Kitap testi bulunamadı</div>
                    </div>
                  ) : (
                    bookGroupedTests.map(bg => {
                      const matchingTests = bg.tests.filter(t => {
                        if (hideCompletedTasks && t.isCompleted) return false;
                        const matchSubject = hwFilterSubject === 'all' || (t.subject && t.subject.toLowerCase().includes(hwFilterSubject.toLowerCase()));
                        const matchQuery = !hwSearchQuery.trim() ||
                          (t.title || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
                          (bg.bookTitle || '').toLowerCase().includes(hwSearchQuery.toLowerCase()) ||
                          (t.testName || '').toLowerCase().includes(hwSearchQuery.toLowerCase());
                        return matchSubject && matchQuery;
                      });

                      if (matchingTests.length === 0) return null;

                      return (
                        <div
                          key={bg.bookTitle}
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                            border: '1.5px solid var(--color-border, #e2e8f0)',
                            borderRadius: 16,
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1.1rem' }}>📖</span>
                              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#3b82f6' }}>{bg.bookTitle}</span>
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                              {matchingTests.length} Bekleyen Test
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                            {matchingTests.map(test => {
                              const isSelected = selectedTask?.id === test.id || selectedTask?.dedupeKey === test.dedupeKey;
                              const bookInfo = resolveBookTestInfo(test, books, bookTests);

                              return (
                                <div
                                  key={test.id}
                                  style={{
                                    background: isSelected ? (isDark ? 'rgba(59,130,246,0.2)' : '#eff6ff') : 'var(--color-surface, #ffffff)',
                                    border: isSelected ? '2px solid #3b82f6' : '1px solid var(--color-border, #e2e8f0)',
                                    borderRadius: 12,
                                    padding: '0.75rem 0.85rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: 8
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 4, flexWrap: 'wrap' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 900, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', padding: '0.1rem 0.45rem', borderRadius: 6 }}>
                                          📚 {bookInfo?.subject || test.subject || bg.subject || 'Ders'}
                                        </span>
                                        {bookInfo?.publisher && (
                                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: isDark ? '#c7d2fe' : '#4f46e5', background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff', padding: '0.1rem 0.4rem', borderRadius: 5 }}>
                                            🏢 {bookInfo.publisher}
                                          </span>
                                        )}
                                      </div>
                                      {test.isCompleted ? (
                                        <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#10b981' }}>✓ Çözüldü</span>
                                      ) : (
                                        <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#d97706' }}>⏳ Bekliyor</span>
                                      )}
                                    </div>

                                    {bookInfo?.unit && (
                                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#3b82f6', marginBottom: 2 }}>
                                        📂 {bookInfo.unit}
                                      </div>
                                    )}
                                    <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--color-text)' }}>
                                      🎯 {bookInfo?.testName || test.testName || test.title}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                      ✏️ {test.questionCount} Soru • Yaklaşık {Math.round(test.questionCount * minutesPerQuestion)} dk
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectTask(test, false)}
                                      style={{
                                        flex: 1,
                                        padding: '0.4rem 0.6rem',
                                        borderRadius: 8,
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontWeight: 900,
                                        fontSize: '0.74rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4
                                      }}
                                    >
                                      <Target size={12} /> Görevi Seç
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleLaunchTaskQuiz(test)}
                                      style={{
                                        flex: 1,
                                        padding: '0.4rem 0.6rem',
                                        borderRadius: 8,
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontWeight: 900,
                                        fontSize: '0.74rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 4
                                      }}
                                    >
                                      <PlayCircle size={12} /> Hemen Çöz
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 3. GÖRÜNÜM: ATANMIŞ ÖDEVLER & 4. TÜM LİSTE */}
            {(hwSourceTab === 'homework' || hwSourceTab === 'all') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
                {/* Arama ve Ders Filtresi */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Ödev, konu veya ders ara..."
                      value={hwSearchQuery}
                      onChange={e => setHwSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem 0.5rem 2rem',
                        background: 'var(--color-surface-hover, #f8fafc)',
                        border: '1.5px solid var(--color-border, #e2e8f0)',
                        borderRadius: 12,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <select
                    value={hwFilterSubject}
                    onChange={e => setHwFilterSubject(e.target.value)}
                    style={{
                      padding: '0.5rem 0.85rem',
                      background: 'var(--color-surface-hover, #f8fafc)',
                      border: '1.5px solid var(--color-border, #e2e8f0)',
                      borderRadius: 12,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: 'var(--color-text)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Tüm Dersler</option>
                    {STUDY_SUBJECTS.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Görev Listesi */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 6, maxHeight: isMobile ? 'calc(94vh - 270px)' : '56vh' }}>
                  {filteredTasksList.length === 0 ? (
                    <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 16 }}>
                      <div style={{ fontSize: '2rem', marginBottom: 6 }}>📭</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>
                        {hideCompletedTasks ? 'Bekleyen ödev / görev bulunmuyor' : 'Kriterlere uygun ödev / görev bulunamadı'}
                      </div>
                    </div>
                  ) : (
                    filteredTasksList.map(task => {
                      const isSelected = selectedTask?.id === task.id || selectedTask?.dedupeKey === task.dedupeKey;
                      const isRoadmap = task.sourceType === 'roadmap';
                      const isBook = task.sourceType === 'bookTest' || task.isBookAssignment;
                      const isHw = task.sourceType === 'homework';
                      const bookInfo = resolveBookTestInfo(task, books, bookTests);

                      return (
                        <div
                          key={task.dedupeKey || task.id}
                          style={{
                            background: isSelected ? (isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff') : 'var(--color-surface, #ffffff)',
                            border: isSelected ? '2px solid #3b82f6' : '1.5px solid var(--color-border, #e2e8f0)',
                            borderRadius: 16,
                            padding: '0.85rem 1.05rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 900,
                                background: isRoadmap ? 'rgba(139, 92, 246, 0.15)' : (bookInfo?.isBookTest || isBook) ? 'rgba(59, 130, 246, 0.15)' : isHw ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: isRoadmap ? '#8b5cf6' : (bookInfo?.isBookTest || isBook) ? '#3b82f6' : isHw ? '#0891b2' : '#10b981',
                                padding: '0.12rem 0.5rem',
                                borderRadius: 6
                              }}>
                                {task.sourceLabel || (isRoadmap ? '🗺️ Yol Haritası' : (bookInfo?.isBookTest || isBook) ? '📚 Kitap Testi' : '📅 Ders Programı')}
                              </span>

                              <span style={{ fontSize: '0.74rem', fontWeight: 900, background: 'var(--color-surface-hover, #f1f5f9)', color: 'var(--color-text)', padding: '0.12rem 0.5rem', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <span>📚</span>
                                <span>{bookInfo?.isBookTest ? bookInfo.subject : (task.subject || 'Genel Ders')}</span>
                              </span>

                              {bookInfo?.isBookTest && bookInfo.publisher && (
                                <span style={{ fontSize: '0.64rem', fontWeight: 700, color: isDark ? '#c7d2fe' : '#4f46e5', background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff', padding: '0.12rem 0.45rem', borderRadius: 5 }}>
                                  🏢 {bookInfo.publisher}
                                </span>
                              )}

                              {task.isCompleted ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10b981', background: '#dcfce7', padding: '0.12rem 0.45rem', borderRadius: 6 }}>
                                  ✓ Tamamlandı
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '0.12rem 0.45rem', borderRadius: 6 }}>
                                  ⏳ Bekliyor
                                </span>
                              )}

                              {task.dueDate && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                  📅 {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                                </span>
                              )}
                            </div>

                            {bookInfo?.isBookTest ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {bookInfo.bookTitle && (
                                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--color-text)' }}>
                                    📖 {bookInfo.bookTitle}
                                  </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 1 }}>
                                  {bookInfo.unit && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 2,
                                      fontWeight: 700,
                                      fontSize: '0.68rem',
                                      color: isDark ? '#93c5fd' : '#1d4ed8',
                                      background: isDark ? 'rgba(37,99,235,0.2)' : '#eff6ff',
                                      border: isDark ? '1px solid rgba(59,130,246,0.35)' : '1px solid #bfdbfe',
                                      borderRadius: '0.35rem',
                                      padding: '1px 6px'
                                    }}>
                                      📂 {bookInfo.unit}
                                    </span>
                                  )}
                                  {bookInfo.testName && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 2,
                                      fontWeight: 800,
                                      fontSize: '0.68rem',
                                      color: isDark ? '#c084fc' : '#6d28d9',
                                      background: isDark ? 'rgba(124,58,237,0.2)' : '#f5f3ff',
                                      border: isDark ? '1px solid rgba(168,85,247,0.35)' : '1px solid #ddd6fe',
                                      borderRadius: '0.35rem',
                                      padding: '1px 6px'
                                    }}>
                                      🎯 {bookInfo.testName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text)' }}>
                                {task.title}
                              </div>
                            )}
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>
                              {isRoadmap ? (
                                <span style={{ color: '#8b5cf6', fontWeight: 800 }}>🎯 Konu Çalışması • Odaklanma (Optik Yok)</span>
                              ) : (
                                <>
                                  ✏️ {task.questionCount} Soru • Yaklaşık {Math.round(task.questionCount * minutesPerQuestion)} dk
                                  {!bookInfo?.isBookTest && task.topic ? ` • ${task.topic}` : ''}
                                </>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleSelectTask(task, false)}
                              style={{
                                padding: '0.5rem 0.9rem',
                                borderRadius: 10,
                                background: isRoadmap
                                  ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 900,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                boxShadow: isRoadmap ? '0 3px 10px rgba(139,92,246,0.3)' : '0 3px 10px rgba(245,158,11,0.3)'
                              }}
                            >
                              <Target size={13} /> {isRoadmap ? 'Konu Çalış' : 'Görevi Seç'}
                            </button>

                            {isRoadmap ? (
                              <button
                                type="button"
                                onClick={() => handleSelectTask(task, true)}
                                style={{
                                  padding: '0.5rem 0.9rem',
                                  borderRadius: 10,
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 900,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  boxShadow: '0 3px 10px rgba(16,185,129,0.3)'
                                }}
                              >
                                <PlayCircle size={14} /> Hemen Başla
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleLaunchTaskQuiz(task)}
                                style={{
                                  padding: '0.5rem 0.9rem',
                                  borderRadius: 10,
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 900,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  boxShadow: '0 3px 10px rgba(16,185,129,0.3)'
                                }}
                              >
                                <PlayCircle size={14} /> Testi Çöz
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Modal Alt Kapatma */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowHomeworkPickerModal(false)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 12,
                  background: 'var(--color-surface-hover, #f1f5f9)',
                  color: 'var(--color-text)',
                  border: '1.5px solid var(--color-border)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. OPTİK SINAV TAMAMLANDI & DEĞERLENDİRME MODALI */}
      {completedQuizResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: themeObj.cardBg,
            borderRadius: isMobile ? 18 : 24,
            width: '100%',
            maxWidth: 580,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: isMobile ? '1.1rem 0.9rem' : '1.75rem',
            border: `2px solid ${themeObj.border}`,
            boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 12 : 16,
            boxSizing: 'border-box'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ fontSize: isMobile ? '2.2rem' : '3rem', marginBottom: 2 }}>🏆</div>
              <h2 style={{ margin: 0, fontSize: isMobile ? '1.15rem' : '1.35rem', fontWeight: 900, color: themeObj.text }}>
                Tebrikler! Sınavınız Kaydedildi
              </h2>
              <div style={{ fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 800, color: themeObj.subText, marginTop: 4 }}>
                {completedQuizResult.testTitle}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '2px 8px', borderRadius: 6 }}>
                  {completedQuizResult.subject}
                </span>
                <span style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 800, color: themeObj.subText }}>
                  ⏱️ Süre: {formatSecToMinSec(completedQuizResult.durationSeconds)}
                </span>
              </div>
            </div>

            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isSmallMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: 6,
              background: themeObj.innerBg,
              padding: isMobile ? '0.65rem' : '0.85rem',
              borderRadius: 14,
              border: `1.5px solid ${themeObj.border}`,
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 900, color: '#10b981' }}>{completedQuizResult.correctCount}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: themeObj.subText }}>Doğru</div>
              </div>
              <div>
                <div style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 900, color: '#ef4444' }}>{completedQuizResult.wrongCount}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: themeObj.subText }}>Yanlış</div>
              </div>
              <div>
                <div style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 900, color: '#64748b' }}>{completedQuizResult.blankCount}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: themeObj.subText }}>Boş</div>
              </div>
              <div>
                <div style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 900, color: '#f59e0b' }}>{completedQuizResult.netScore}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: themeObj.subText }}>Net (%{completedQuizResult.score})</div>
              </div>
            </div>

            {!completedQuizResult.hasAnswerKey && (
              <div style={{ fontSize: '0.72rem', color: themeObj.subText, textAlign: 'center', fontWeight: 700 }}>
                ℹ️ Teste ait cevap anahtarı bulunamadığı için işaretlenen tüm sorular doğru kabul edilerek kaydedildi.
              </div>
            )}

            {/* Soru Soru Cevap Analizi */}
            {completedQuizResult.answers && completedQuizResult.answers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 900, color: themeObj.subText }}>
                  📋 Kodlanan Cevaplar:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                  gap: 5,
                  maxHeight: '160px',
                  overflowY: 'auto',
                  padding: '0.45rem',
                  background: themeObj.innerBg,
                  borderRadius: 12,
                  border: `1px solid ${themeObj.border}`
                }} className="custom-scrollbar">
                  {completedQuizResult.answers.map(ans => {
                    const hasKey = completedQuizResult.hasAnswerKey;
                    let badgeBg = themeObj.buttonBg;
                    let badgeBorder = themeObj.border;
                    let badgeText = themeObj.text;

                    if (hasKey) {
                      if (!ans.userAnswerLetter) {
                        badgeBg = themeObj.innerBg;
                        badgeText = themeObj.subText;
                      } else if (ans.isCorrect) {
                        badgeBg = 'rgba(16, 185, 129, 0.15)';
                        badgeBorder = '#10b981';
                        badgeText = '#10b981';
                      } else {
                        badgeBg = 'rgba(239, 68, 68, 0.15)';
                        badgeBorder = '#ef4444';
                        badgeText = '#ef4444';
                      }
                    }

                    return (
                      <div
                        key={ans.questionNo}
                        style={{
                          padding: '0.3rem 0.2rem',
                          borderRadius: 8,
                          border: `1px solid ${badgeBorder}`,
                          background: badgeBg,
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: themeObj.subText }}>
                          Soru {ans.questionNo}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: badgeText, marginTop: 2 }}>
                          {ans.userAnswerLetter || '—'}
                          {hasKey && ans.correctAnswerLetter && !ans.isCorrect && ans.userAnswerLetter && (
                            <span style={{ fontSize: '0.62rem', color: '#10b981', marginLeft: 2 }}>
                              ({ans.correctAnswerLetter})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: 8,
              marginTop: 4
            }}>
              <button
                type="button"
                onClick={() => {
                  const subId = completedQuizResult.id;
                  const finalTid = completedQuizResult.bookTestId || completedQuizResult.realTestId || completedQuizResult.testId;
                  const isBook = completedQuizResult.sourceType === 'bookTest' || Boolean(completedQuizResult.bookTestId);
                  setCompletedQuizResult(null);
                  handleClearOpticalAnswers();
                  handleClearSelectedTask();
                  if (isBook && finalTid) {
                    navigate(`/book-quiz/${finalTid}?studentId=${currentUser?.id || ''}`);
                  } else {
                    navigate(`/review/${subId}?studentId=${currentUser?.id || ''}`);
                  }
                }}
                style={{
                  padding: isMobile ? '0.6rem 0.75rem' : '0.75rem 1rem',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.76rem' : '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  boxShadow: '0 4px 14px rgba(245,158,11,0.35)'
                }}
              >
                <Eye size={15} /> İncele
              </button>

              <button
                type="button"
                onClick={() => {
                  setCompletedQuizResult(null);
                  handleClearOpticalAnswers();
                  handleClearSelectedTask();
                  navigate('/student-results');
                }}
                style={{
                  padding: isMobile ? '0.6rem 0.75rem' : '0.75rem 1rem',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.76rem' : '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  boxShadow: '0 4px 14px rgba(59,130,246,0.3)'
                }}
              >
                <BarChart2 size={15} /> Sonuçlar
              </button>

              <button
                type="button"
                onClick={() => {
                  setCompletedQuizResult(null);
                  handleClearOpticalAnswers();
                }}
                style={{
                  padding: isMobile ? '0.6rem 0.75rem' : '0.75rem 1rem',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.76rem' : '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
                }}
              >
                <RotateCcw size={15} /> Yeni
              </button>

              <button
                type="button"
                onClick={() => setCompletedQuizResult(null)}
                style={{
                  padding: isMobile ? '0.6rem 0.75rem' : '0.75rem 1.25rem',
                  borderRadius: 10,
                  background: 'transparent',
                  color: themeObj.subText,
                  border: `1.5px solid ${themeObj.border}`,
                  fontWeight: 800,
                  fontSize: isMobile ? '0.76rem' : '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
