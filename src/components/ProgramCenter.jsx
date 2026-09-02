import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, Lock, Edit3, Check, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Calendar, CheckCircle2, X, BookOpen, Clock, GraduationCap, Printer, Play, PlayCircle, RotateCcw, ArrowRight, Search } from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useHomework } from '../context/HomeworkContext';
import { useAuth } from '../context/AuthContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { isHomeworkForStudent, sortItemsByBookOrder, isSubmissionMatchingBookTest, isStandardOrMixedBook } from '../utils/testResolver';
import { toUUID } from '../services/supabaseService';
import { isRemedialStageDone, getRemedialLockStatus } from '../services/remedialSpacedRepetitionService';
import AddTaskModal from './program/AddTaskModal';

/* ─── Constants ─── */
export const DAYS = [
  { key: 'Pzt', long: 'Pazartesi' },
  { key: 'Sal', long: 'Salı' },
  { key: 'Çrş', long: 'Çarşamba' },
  { key: 'Prş', long: 'Perşembe' },
  { key: 'Cum', long: 'Cuma' },
  { key: 'Cts', long: 'Cumartesi' },
  { key: 'Paz', long: 'Pazar' },
];

const SUBJECTS = [
  'Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler',
  'İngilizce', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya',
  'Geometri', 'Genel Tekrar', 'Soru Çözümü', 'Deneme Sınavı'
];

export const TOPIC_STATUSES = ['Başlanmadı', 'Başlandı', 'Öğrenildi', 'Tekrar Yapıldı', 'Tamamlandı'];
export const STATUS_COLORS = {
  'Başlanmadı':    { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
  'Başlandı':      { bg: '#fef9c3', text: '#a16207', border: '#fde68a' },
  'Öğrenildi':     { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
  'Tekrar Yapıldı':{ bg: '#fed7aa', text: '#c2410c', border: '#fdba74' },
  'Tamamlandı':    { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
};

export const TASK_TYPES = [
  { id: 'konu',   label: 'Konu Çalışması', icon: '📖', color: '#6366f1', bg: '#eef2ff' },
  { id: 'soru',   label: 'Soru Çözme',     icon: '✏️', color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'tekrar', label: 'Tekrar',          icon: '🔄', color: '#0891b2', bg: '#ecfeff' },
  { id: 'kitap',  label: 'Kitap Takibi',    icon: '📚', color: '#059669', bg: '#f0fdf4' },
  { id: 'deneme', label: 'Deneme Sınavı',   icon: '📊', color: '#d97706', bg: '#fffbeb' },
  { id: 'diger',  label: 'Diğer',           icon: '✨', color: '#64748b', bg: '#f8fafc' },
];

export const DAY_THEMES = {
  'Pzt': { gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', lightBg: '#f5f3ff', border: '#c7d2fe', text: '#4f46e5', badgeBg: '#4f46e5' },
  'Sal': { gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', lightBg: '#ecfeff', border: '#a5f3fc', text: '#0891b2', badgeBg: '#0891b2' },
  'Çrş': { gradient: 'linear-gradient(135deg, #059669, #10b981)', lightBg: '#ecfdf5', border: '#a7f3d0', text: '#059669', badgeBg: '#059669' },
  'Prş': { gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', lightBg: '#fffbeb', border: '#fde68a', text: '#d97706', badgeBg: '#d97706' },
  'Cum': { gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', lightBg: '#faf5ff', border: '#ddd6fe', text: '#7c3aed', badgeBg: '#7c3aed' },
  'Cts': { gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)', lightBg: '#fff1f2', border: '#fecdd3', text: '#e11d48', badgeBg: '#e11d48' },
  'Paz': { gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)', lightBg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', badgeBg: '#2563eb' },
};

export const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function canStudentDeleteItem(item, currentUser) {
  if (!item) return false;
  // Teachers and admins can delete anything
  if (currentUser?.role && currentUser.role !== 'student') return true;

  // Check if item is teacher-assigned, remedial, homework, curriculum, roadmap, or book test
  const isTeacherTask = Boolean(
    item.isAutoHomework ||
    item.isTeacherAssigned ||
    item.isTeacherRemedial ||
    item.isRemedial ||
    item.isRemedialTest ||
    item.type === 'remedialTest' ||
    item.taskType === 'remedialTest' ||
    item.type === 'remedial' ||
    item.taskType === 'remedial' ||
    item.isHomework ||
    item.homeworkId ||
    item.hwId ||
    item.roadmapAssignmentId ||
    item.bookTestId ||
    item.testId ||
    item.bookId ||
    item.isCurriculum ||
    item.isRoadmap ||
    item.source === 'teacher' ||
    item.source === 'homework' ||
    item.source === 'curriculum' ||
    item.source === 'roadmap' ||
    (item.assignedBy && currentUser?.id && String(item.assignedBy) !== String(currentUser.id)) ||
    (typeof item.id === 'string' && (
      item.id.startsWith('hw_') ||
      item.id.startsWith('auto_hw_') ||
      item.id.startsWith('remedial_') ||
      item.id.startsWith('tbt_') ||
      item.id.startsWith('bt_') ||
      item.id.startsWith('book_test_')
    ))
  );

  if (isTeacherTask) return false;

  // Student can delete only their own custom-added tasks
  return Boolean(
    item.isSelfAdded === true ||
    item.isCustom === true ||
    item.isStudentAdded === true ||
    item.source === 'student_custom' ||
    item.source === 'manual' ||
    (item.addedBy && currentUser?.id && String(item.addedBy) === String(currentUser.id)) ||
    (item.createdBy && currentUser?.id && String(item.createdBy) === String(currentUser.id)) ||
    (!item.testId && !item.hwId && !item.homeworkId && !item.roadmapAssignmentId && !item.isAutoHomework && !item.isTeacherAssigned)
  );
}

export function getTodayKey() {
  const d = new Date();
  const map = [6, 0, 1, 2, 3, 4, 5];
  return DAYS[map[d.getDay()]]?.key || 'Pzt';
}

export function getLocalYMD(dInput) {
  if (!dInput) return '';
  if (typeof dInput === 'string') {
    const match = dInput.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const dt = new Date(dInput);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMondayYMD(dStr) {
  if (!dStr) return null;
  const ymd = getLocalYMD(dStr);
  const parts = ymd.split('-');
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  const dt = new Date(y, m, d);
  const day = dt.getDay();
  const diff = dt.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(y, m, diff);

  const monY = monday.getFullYear();
  const monM = String(monday.getMonth() + 1).padStart(2, '0');
  const monD = String(monday.getDate()).padStart(2, '0');
  return `${monY}-${monM}-${monD}`;
}

export function isSameWeek(d1, d2) {
  if (!d1 || !d2) return true;
  const mon1 = getMondayYMD(d1);
  const mon2 = getMondayYMD(d2);
  if (!mon1 || !mon2) return true;
  return mon1 === mon2;
}

export function normalizeWeeklyProgram(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DAYS.map(d => ({ day: d.key, items: [] }));
  }
  return DAYS.map(d => {
    const found = raw.find(r => r.day === d.key);
    if (!found) return { day: d.key, items: [] };
    if (Array.isArray(found.items)) return { day: d.key, items: found.items };
    return { day: d.key, items: [] };
  });
}


export function checkHasItemBeenAttempted(item, studentId, submissions, allHomeworks) {
  if (!item) return false;

  const studentIdStr = String(studentId || '').trim();
  const studentUuidStr = String(toUUID(studentId) || '').trim();

  const isMatchStudent = (s) => {
    if (!s) return false;
    const subStudentId = String(s.studentId ?? s.student_id ?? s.userId ?? s.user_id ?? '');
    return !studentIdStr || subStudentId === studentIdStr || subStudentId === studentUuidStr || toUUID(subStudentId) === studentUuidStr;
  };

  const targetIds = [
    item.submissionId,
    item.realTestId,
    item.testId,
    item.bookTestId,
    item.hwId,
    item.id
  ].filter(Boolean).map(String);

  const cleanTargetIds = [];
  targetIds.forEach(tId => {
    cleanTargetIds.push(tId);
    cleanTargetIds.push(tId.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, ''));
  });

  const isRemedial = Boolean(
    item.type === 'remedialTest' ||
    item.taskType === 'remedialTest' ||
    item.isTeacherRemedial ||
    item.isRemedial ||
    item.isRemedialTest ||
    item.stage !== undefined ||
    /telafi/i.test(item.text || item.title || '') ||
    /tekrar/i.test(item.text || item.title || '')
  );

  // 1. Check in global submissions
  const matchInSubs = (submissions || []).some(s => {
    if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
    if (!isMatchStudent(s)) return false;

    const sIds = [
      s.id,
      s.submissionId,
      s.testId,
      s.test_id,
      s.realTestId,
      s.hwId,
      s.homeworkId,
      s.homework_id,
      s.bookTestId,
      s.metadata?.realTestId,
      s.metadata?.bookTestId,
      s.metadata?.testId
    ].filter(Boolean).map(String);

    const hasIdMatch = cleanTargetIds.some(tId => sIds.some(sId => {
      if (!sId || !tId) return false;
      const sClean = sId.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
      const tClean = tId.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
      return sId === tId || sClean === tClean || (toUUID(sClean) && toUUID(tClean) && toUUID(sClean) === toUUID(tClean));
    }));
    if (hasIdMatch) return true;

    if (isRemedial) {
      const itemTitle = String(item.title || item.testTitle || item.text || '').toLowerCase().trim();
      const subTitle = String(s.title || s.testTitle || '').toLowerCase().trim();
      if (itemTitle && subTitle && (itemTitle.includes(subTitle) || subTitle.includes(itemTitle))) return true;
    }

    return false;
  });

  if (matchInSubs) return true;

  // 2. Check in allHomeworks embedded submissions
  if (allHomeworks && Array.isArray(allHomeworks)) {
    const matchInHws = allHomeworks.some(hw => {
      if (!hw || !Array.isArray(hw.submissions)) return false;
      const isTargetHw = targetIds.some(tId => String(hw.id) === tId || (toUUID(hw.id) && toUUID(tId) && toUUID(hw.id) === toUUID(tId)));
      if (!isTargetHw) return false;

      return hw.submissions.some(s => {
        if (!s || s.status === 'in_progress' || s.status === 'draft') return false;
        return isMatchStudent(s);
      });
    });
    if (matchInHws) return true;
  }

  return false;
}

export function checkIsTaskSolved(item, studentId, submissions, allHomeworks, studyAssignments, precomputedSolvedIdsSet = null, bookTests = [], books = []) {
  if (!item) return false;

  const studentIdStr = String(studentId || '');
  const studentUuidStr = String(toUUID(studentId) || '');

  const isMatchStudent = (s) => {
    if (!studentId) return true;
    const sId = String(s.studentId || s.student_id || s.userId || s.user_id || '');
    return sId === studentIdStr || (studentUuidStr && sId === studentUuidStr) || (studentUuidStr && toUUID(sId) === studentUuidStr);
  };

  const specificTestId = item.testId || item.realTestId || item.bookTestId || item.hwId || null;

  // CASE 0: REMEDIAL TEST WITH SPACED REPETITION / STAGES / %100 MASTERY
  const isRemedial = Boolean(
    item.type === 'remedialTest' ||
    item.taskType === 'remedialTest' ||
    item.isTeacherRemedial ||
    item.isRemedial ||
    item.isRemedialTest ||
    item.stage !== undefined ||
    String(item.text || item.title || '').includes('Tekrar')
  );

  if (isRemedial && specificTestId) {
    return isRemedialStageDone(item, submissions, studentId);
  }

  if (item.done || item.isCompleted) return true;

  // CASE 1: SPECIFIC TEST / QUIZ TASK (MUST match the exact test ID)
  if (specificTestId) {
    const tIdStr = String(specificTestId);
    const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
    const tUuidStr = String(toUUID(tCleanId || specificTestId) || '');

    if (precomputedSolvedIdsSet && (
      precomputedSolvedIdsSet.has(tIdStr) ||
      precomputedSolvedIdsSet.has(tCleanId) ||
      precomputedSolvedIdsSet.has(`bt_${tCleanId}`) ||
      (tUuidStr && precomputedSolvedIdsSet.has(tUuidStr))
    )) return true;

    // 1. Check in global submissions
    const isTestSolvedInSubs = (submissions || []).some(s => {
      if (!s || !isMatchStudent(s)) return false;
      if (s.status === 'in_progress' || s.status === 'draft') return false;

      const subFields = [
        s.testId,
        s.test_id,
        s.realTestId,
        s.bookTestId,
        s.metadata?.realTestId,
        s.metadata?.bookTestId,
        s.metadata?.realId,
        s.metadata?.testId
      ].filter(Boolean).map(String);

      if (Array.isArray(s.bookTestIds)) {
        s.bookTestIds.forEach(bid => { if (bid) subFields.push(String(bid)); });
      }

      if (subFields.some(sf => {
        if (!sf) return false;
        const sfClean = sf.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
        const sfUuid = toUUID(sfClean || sf);
        return sf === tIdStr || sf === tCleanId || sfClean === tCleanId ||
          (tUuidStr && (sf === tUuidStr || sfClean === tUuidStr || (sfUuid && sfUuid === tUuidStr))) ||
          (toUUID(sf) && (toUUID(sf) === tIdStr || toUUID(sf) === tCleanId));
      })) return true;

      return isSubmissionMatchingBookTest(s, item, bookTests, books);
    });

    if (isTestSolvedInSubs) return true;

    // 2. Check in homework embedded submissions specifically for this test
    const targetHwId = item.hwId || (item.id && String(item.id).startsWith('hw_') ? String(item.id).replace('hw_', '') : null);
    if (targetHwId) {
      const hwObj = (allHomeworks || []).find(h => String(h.id) === String(targetHwId));
      if (hwObj && Array.isArray(hwObj.submissions)) {
        const hasTestSub = hwObj.submissions.some(s => {
          if (!s || !isMatchStudent(s)) return false;
          if (s.status === 'in_progress' || s.status === 'draft') return false;
          const sTestId = String(s.testId || s.test_id || s.realTestId || s.bookTestId || '');
          const sClean = sTestId.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
          if (sTestId === tIdStr || sTestId === tCleanId || sClean === tCleanId || (tUuidStr && sTestId === tUuidStr) || (tUuidStr && sClean === tUuidStr)) return true;
          return isSubmissionMatchingBookTest(s, item, bookTests, books);
        });
        if (hasTestSub) return true;
      }
    }

    return false;
  }

  // CASE 2: ROADMAP TOPIC TASK
  if (item.roadmapAssignmentId) {
    const assignment = (studyAssignments || []).find(a => String(a.id) === String(item.roadmapAssignmentId));
    if (assignment) {
      if (assignment.status === 'completed' || assignment.status === 'done' || assignment.isCompleted) return true;
      let compTopics = [];
      if (Array.isArray(assignment.completedTopics)) compTopics = assignment.completedTopics;
      else if (typeof assignment.completedTopics === 'string') {
        try { compTopics = JSON.parse(assignment.completedTopics); } catch(e) {}
      }
      const completedSet = new Set(compTopics.map(String));
      if (item.topicId && completedSet.has(String(item.topicId))) return true;
      if (item.topic && completedSet.has(item.topic)) return true;
      if (item.title && completedSet.has(item.title)) return true;
    }
    return false;
  }

  // CASE 3: GENERAL NON-TEST HOMEWORK TASK
  const generalHwId = item.hwId || (item.id && String(item.id).startsWith('hw_') ? String(item.id).replace(/^hw_/, '') : null) || (item.isAutoHomework || item.isHomework ? item.id : null);
  if (generalHwId) {
    const gHwIdStr = String(generalHwId);
    if (precomputedSolvedIdsSet && precomputedSolvedIdsSet.has(gHwIdStr)) return true;
    const gUuidStr = String(toUUID(generalHwId) || '');
    if (precomputedSolvedIdsSet && gUuidStr && precomputedSolvedIdsSet.has(gUuidStr)) return true;

    const isHwSolvedInSubs = (submissions || []).some(s => {
      if (!s || !isMatchStudent(s)) return false;
      if (s.status === 'in_progress' || s.status === 'draft') return false;
      const subFields = [s.id, s.hwId, s.homeworkId, s.homework_id, s.testId, s.test_id].filter(Boolean).map(String);
      return subFields.some(sf => sf === gHwIdStr || (gUuidStr && sf === gUuidStr) || toUUID(sf) === gHwIdStr);
    });
    if (isHwSolvedInSubs) return true;

    const hwObj = (allHomeworks || []).find(h => String(h.id) === gHwIdStr || (gUuidStr && String(h.id) === gUuidStr));
    if (hwObj && Array.isArray(hwObj.submissions)) {
      const hasHwSub = hwObj.submissions.some(s => isMatchStudent(s) && s.status !== 'in_progress' && s.status !== 'draft');
      if (hasHwSub) return true;
    }
  }

  // CASE 4: FALLBACK MATCHING BY BOOK TEST OR TITLE
  if (Array.isArray(submissions) && submissions.length > 0) {
    const matched = submissions.some(s => {
      if (!s || !isMatchStudent(s)) return false;
      if (s.status === 'in_progress' || s.status === 'draft') return false;
      return isSubmissionMatchingBookTest(s, item, bookTests, books);
    });
    if (matched) return true;
  }

  return false;
}

/* ─── Subject Detection & Publisher Helper ─── */
export const KNOWN_PUBLISHERS = [
  'atlı karınca', 'atli karinca', '3d', '3d yayınları', 'karekök', 'limit', 'hız yayınları', 'hiz',
  'tonguç', 'tonguc', 'bilfen', 'apotemi', 'palme', 'çap', 'cap', 'okyanus', 'aydın', 'aydin',
  'birey', 'esen', 'endemik', 'supara', 'kafadengi', 'nitelik', 'model', 'mozaik', 'arı', 'ari',
  'sadık uygun', 'sadik uygun', 'newton', 'tudem', 'sınav', 'sinav', 'kırmızı beyaz', 'kirmizi beyaz',
  'evrensel', 'fenomen', 'ankara', 'editör', 'editor', 'vip', 'yanıt', 'yanit', 'paraf', 'yayın denizi',
  'test okul', 'merkez', 'metin', 'bilgi sarmal', 'orijinal', 'acil', 'hocalara geldik', 'benim hocam',
  'pegem', 'yediiklim', 'murat', 'isem', 'data', 'uzman kariyer', 'tasarım', 'beyaz kalem', 'lider',
  'puan', 'kültür', 'kultur', 'doğa', 'doga', 'uğur', 'ugur', 'bahçeşehir', 'final', 'açı', 'aci'
];

export const detectSubjectFromText = (text) => {
  if (!text || typeof text !== 'string') return '';
  const lower = text.toLowerCase();
  
  if (lower.includes('matematik') || lower.includes('geometri')) return lower.includes('geometri') ? 'Geometri' : 'Matematik';
  if (lower.includes('türkçe') || lower.includes('turkce') || lower.includes('edebiyat') || lower.includes('paragraf') || lower.includes('dil bilgisi')) {
    if (lower.includes('edebiyat')) return 'Türk Dili ve Edebiyatı';
    if (lower.includes('paragraf')) return 'Paragraf';
    return 'Türkçe';
  }
  if (lower.includes('fen bilim') || lower.includes('fen ve tek') || lower.includes('fen lisesi fen') || lower.includes('fen ')) return 'Fen Bilimleri';
  if (lower.includes('inkılap') || lower.includes('inkilap') || lower.includes('t.c.')) return 'T.C. İnkılap Tarihi';
  if (lower.includes('sosyal bilim') || lower.includes('sosyal bilg') || lower.includes('sosyal')) return 'Sosyal Bilgiler';
  if (lower.includes('ingilizce') || lower.includes('english') || lower.includes('yabancı dil') || lower.includes('yabanci dil')) return 'İngilizce';
  if (lower.includes('din kültür') || lower.includes('din kultur') || lower.includes('din ve ahlak') || lower.includes('din ')) return 'Din Kültürü';
  if (lower.includes('fizik')) return 'Fizik';
  if (lower.includes('kimya')) return 'Kimya';
  if (lower.includes('biyoloji')) return 'Biyoloji';
  if (lower.includes('tarih')) return 'Tarih';
  if (lower.includes('coğrafya') || lower.includes('cografya')) return 'Coğrafya';
  if (lower.includes('felsefe') || lower.includes('mantık') || lower.includes('sosyoloji') || lower.includes('psikoloji')) return 'Felsefe';
  if (lower.includes('hayat bilgisi') || lower.includes('hayat bil')) return 'Hayat Bilgisi';
  if (lower.includes('bilişim') || lower.includes('bilisim') || lower.includes('kodlama')) return 'Bilişim';
  if (lower.includes('almanca')) return 'Almanca';
  if (lower.includes('fransızca') || lower.includes('fransizca')) return 'Fransızca';
  return '';
};

/* ─── resolveBookTestInfo Helper ─── */
export const resolveBookTestInfo = (item, books = [], bookTests = []) => {
  if (!item) return null;

  const isExplicitBook = item.taskType === 'kitap' || item.isBookAssignment || Boolean(item.bookId || item.bookTestId || item.testName || item.unit || item.bookName);

  let rawSubject = String(item.subject || '').trim();
  let unit = String(item.unit || '').trim();
  let testName = String(item.testName || '').trim();
  let bookTitle = String(item.bookName || item.bookTitle || '').trim();
  let questionCount = String(item.questionCount || '').trim();
  let publisher = String(item.publisher || '').trim();

  // Match test in bookTests if testId / bookTestId / realTestId exists
  const tid = String(item.testId || item.bookTestId || item.realTestId || '');
  let matchedTest = null;
  if (tid) {
    matchedTest = (bookTests || []).find(bt => String(bt.id) === tid || toUUID(bt.id) === tid);
  }

  // Match book
  let matchedBook = null;
  const bid = String(item.bookId || matchedTest?.bookId || '');
  if (bid) {
    matchedBook = (books || []).find(b => String(b.id) === bid || toUUID(b.id) === bid);
  } else if (bookTitle) {
    const cleanBTitle = bookTitle.toLowerCase();
    matchedBook = (books || []).find(b => {
      const bTitle = (b.title || '').toLowerCase();
      return bTitle.includes(cleanBTitle) || cleanBTitle.includes(bTitle);
    });
  }

  if (matchedBook?.publisher && !publisher) {
    publisher = matchedBook.publisher;
  }

  // Check if raw subject is actually a publisher or placeholder
  const rawSubjLower = rawSubject.toLowerCase();
  const isRawSubjPublisher = Boolean(
    (publisher && rawSubjLower === publisher.toLowerCase()) ||
    KNOWN_PUBLISHERS.some(p => rawSubjLower === p || rawSubjLower.startsWith(p + ' ')) ||
    rawSubjLower === 'atanan kitap' ||
    rawSubjLower === 'atanmış ödev' ||
    rawSubjLower === 'kitap takibi' ||
    rawSubjLower === 'genel' ||
    rawSubjLower === 'ödev'
  );

  if (isRawSubjPublisher && !publisher && rawSubject && rawSubjLower !== 'atanan kitap' && rawSubjLower !== 'atanmış ödev' && rawSubjLower !== 'kitap takibi' && rawSubjLower !== 'genel') {
    publisher = rawSubject;
  }

  if (matchedTest) {
    if (!testName) testName = matchedTest.name || matchedTest.title || '';
    if (!unit) unit = matchedTest.unit || matchedTest.unitName || '';
    if (!questionCount && matchedTest.questionCount) {
      questionCount = `${matchedTest.questionCount} soru`;
    }
  }

  if (matchedBook) {
    if (!bookTitle) bookTitle = matchedBook.title || '';
    if (!unit && matchedTest?.subjectId && Array.isArray(matchedBook.subjects)) {
      const sObj = matchedBook.subjects.find(s => String(s.id) === String(matchedTest.subjectId));
      if (sObj) {
        if (matchedTest.topicId && Array.isArray(sObj.topics)) {
          const tObj = sObj.topics.find(t => String(t.id) === String(matchedTest.topicId));
          if (tObj && !unit) unit = tObj.name || '';
        }
      }
    }
  }

  // Compound strings parsing fallback
  if (typeof item.topic === 'string' && item.topic.includes(' — ')) {
    const parts = item.topic.split(' — ');
    if (!bookTitle && !unit) {
      bookTitle = parts[0];
    } else if (!unit && bookTitle) {
      unit = parts[0];
    }
    if (!testName) testName = parts.slice(1).join(' — ');
  } else if (!testName && item.topic) {
    testName = item.topic;
  }

  if (rawSubject && rawSubject.includes(' • ')) {
    const sParts = rawSubject.split(' • ');
    if (!unit) unit = sParts.slice(1).join(' • ');
  }

  // Resolve REAL Subject (Ders Adı)
  let subject = '';

  // 1. From matched test
  if (matchedTest?.subject && !KNOWN_PUBLISHERS.includes(matchedTest.subject.toLowerCase()) && matchedTest.subject.toLowerCase() !== publisher.toLowerCase()) {
    subject = matchedTest.subject;
  } else if (matchedTest?.subjectName && !KNOWN_PUBLISHERS.includes(matchedTest.subjectName.toLowerCase()) && matchedTest.subjectName.toLowerCase() !== publisher.toLowerCase()) {
    subject = matchedTest.subjectName;
  }

  // 2. From matched test's subjectId in matchedBook
  if (!subject && matchedTest?.subjectId && Array.isArray(matchedBook?.subjects)) {
    const sObj = matchedBook.subjects.find(s => String(s.id) === String(matchedTest.subjectId));
    if (sObj?.name && !KNOWN_PUBLISHERS.includes(sObj.name.toLowerCase()) && sObj.name.toLowerCase() !== publisher.toLowerCase()) {
      subject = sObj.name;
    }
  }

  // 3. From matched book's first defined subject
  if (!subject && Array.isArray(matchedBook?.subjects) && matchedBook.subjects.length > 0) {
    const sObj = matchedBook.subjects.find(s => s?.name && !KNOWN_PUBLISHERS.includes(s.name.toLowerCase()) && s.name.toLowerCase() !== publisher.toLowerCase());
    if (sObj?.name) subject = sObj.name;
  }

  // 4. From matched book's subject field
  if (!subject && matchedBook?.subject && matchedBook.subject.toLowerCase() !== publisher.toLowerCase() && !KNOWN_PUBLISHERS.includes(matchedBook.subject.toLowerCase())) {
    subject = matchedBook.subject;
  }

  // 5. From text content detection (keywords in bookTitle, testName, topic, unit)
  if (!subject) {
    subject = detectSubjectFromText(bookTitle || matchedBook?.title || '') ||
              detectSubjectFromText(testName || matchedTest?.name || '') ||
              detectSubjectFromText(item.topic || '') ||
              detectSubjectFromText(unit || '') ||
              detectSubjectFromText(rawSubject);
  }

  // 6. If rawSubject was a legitimate subject (not publisher / placeholder)
  if (!subject && !isRawSubjPublisher && rawSubject) {
    subject = rawSubject.includes(' • ') ? rawSubject.split(' • ')[0] : rawSubject;
  }

  // 7. Smart Default for Turkish curriculum books
  if (!subject) {
    subject = 'Matematik';
  }

  const cleanBookTitle = (bookTitle || '')
    .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
    .replace(/\s*\(Tüm Kitap\)/gi, '')
    .replace(/\s*\(Kendi Eklediğim\)/gi, '')
    .trim();

  const isBookTest = isExplicitBook || Boolean(matchedTest || matchedBook);

  return {
    isBookTest,
    subject: subject || (isBookTest ? 'Matematik' : ''),
    publisher: publisher || '',
    unit: unit || '',
    testName: testName || (isBookTest ? 'Kitap Testi' : ''),
    bookTitle: cleanBookTitle,
    questionCount: questionCount || ''
  };
};

/* ─── AddItemModal ─── */
export function AddItemModal(props) {
  return <AddTaskModal {...props} />;
}

/* ─── DayCard ─── */
export function DayCard({ dayObj, dayMeta, isToday, onToggle, onDelete, onEditClick, onAddClick, onOpenResult, onStartStudy, isDark = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const items = dayObj.items || [];
  const done = items.filter(i => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const theme = DAY_THEMES[dayObj.day] || DAY_THEMES['Pzt'];

  const { currentUser } = useAuth();
  const trackedBooksData = useTrackedBooks();
  const books = trackedBooksData?.books || [];
  const bookTests = trackedBooksData?.bookTests || [];

  const MAX_VISIBLE = 3;
  const shouldCollapse = items.length > MAX_VISIBLE;
  const visibleItems = (shouldCollapse && !isExpanded) ? items.slice(0, MAX_VISIBLE) : items;
  const hiddenCount = items.length - MAX_VISIBLE;

  return (
    <div style={{
      background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)' : 'white',
      borderRadius: '1.25rem',
      border: isToday ? (isDark ? '2px solid #818cf8' : '2.5px solid #6366f1') : (isDark ? '1.5px solid rgba(255, 255, 255, 0.14)' : `1.5px solid ${theme.border}`),
      boxShadow: isToday ? (isDark ? '0 8px 30px rgba(99,102,241,0.35), 0 0 0 2px rgba(99,102,241,0.3)' : '0 8px 30px rgba(99,102,241,0.22), 0 0 0 3px rgba(99,102,241,0.1)') : (isDark ? '0 12px 36px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.03)'),
      overflow: 'hidden',
      minWidth: 0,
      position: 'relative',
      transition: 'all 0.2s ease',
      backdropFilter: isDark ? 'blur(20px)' : 'none'
    }}>
      {/* Day Header with Vibrant Gradient */}
      <div style={{
        padding: '0.8rem 1rem 0.65rem',
        background: isToday ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : theme.gradient,
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.01em', color: 'white' }}>
              {dayObj.dateLabel ? `${dayObj.dateLabel}` : dayMeta.key}
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.9, marginTop: 1 }}>{dayMeta.long}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {shouldCollapse && (
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontSize: '0.58rem',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '99px'
              }}>
                Toplu ({total})
              </span>
            )}
            {isToday && (
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                fontSize: '0.62rem',
                fontWeight: 900,
                padding: '3px 9px',
                borderRadius: '99px',
                boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                letterSpacing: '0.05em'
              }}>
                BUGÜN
              </span>
            )}
          </div>
        </div>
        {total > 0 && (
          <div style={{ marginTop: '0.55rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.95 }}>{done}/{total} Tamamlandı</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>%{pct}</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: 4, borderRadius: 99, width: `${pct}%`, background: pct === 100 ? '#4ade80' : 'white', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 65, background: isDark ? 'rgba(0,0,0,0.25)' : '#fafafc' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1.25rem 0', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize: '0.78rem', fontWeight: 600, fontStyle: 'italic' }}>
            Henüz ders yok
          </div>
        )}
        {visibleItems.map(item => {
          const tt = TASK_TYPES.find(t => t.id === item.taskType);
          const accentColor = item.done ? '#22c55e' : (tt?.color || theme.accent);
          const isQuizTask = item.isAutoHomework || item.testId || item.hwId || item.roadmapAssignmentId || (item.id && String(item.id).startsWith('hw_'));
          const bookInfo = resolveBookTestInfo(item, books, bookTests);

          return (
            <div key={item.id}
              style={{
                background: item.done ? (isDark ? 'rgba(5,150,105,0.2)' : '#f0fdf4') : (isDark ? 'rgba(255,255,255,0.06)' : 'white'),
                border: item.done ? (isDark ? '1px solid rgba(52,211,153,0.35)' : '1px solid #bbf7d0') : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e8ecf0'),
                borderLeft: `4px solid ${accentColor}`,
                borderRadius: '0.75rem',
                padding: '0.55rem 0.65rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: item.done ? 'none' : (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.02)'),
                transition: 'all 0.15s ease'
              }}
              onClick={() => {
                if (isQuizTask && onOpenResult) {
                  onOpenResult(item);
                } else {
                  onToggle(dayObj.day, item.id);
                }
              }}>
              {/* Icon */}
              <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, background: item.done ? '#22c55e' : (isDark ? 'rgba(255,255,255,0.1)' : (tt?.bg || '#f1f5f9')), border: item.done ? 'none' : `1px solid ${tt?.color || '#cbd5e1'}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                {item.done ? <Check size={12} color="white" strokeWidth={3} /> : (tt?.icon || '📝')}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {item.taskType && (
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, color: tt?.color || (isDark ? '#cbd5e1' : '#64748b'), background: isDark ? `${tt?.color || '#6366f1'}22` : (tt?.bg || '#f8fafc'), display: 'inline-block', padding: '1px 7px', borderRadius: '99px', marginBottom: 2, border: `1px solid ${tt?.color || '#6366f1'}33` }}>
                    {tt?.label}
                  </div>
                )}

                {/* Ders Başlığı & Kitap Adı */}
                {bookInfo?.isBookTest ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Ders Adı & Yayınevi */}
                    <div style={{
                      fontSize: '0.84rem',
                      fontWeight: 900,
                      color: item.done ? (isDark ? '#4ade80' : '#166534') : (isDark ? '#ffffff' : '#0f172a'),
                      textDecoration: item.done ? 'line-through' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 4,
                      lineHeight: 1.3
                    }}>
                      <span>📚 {bookInfo.subject}</span>
                      {bookInfo.publisher && (
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          color: isDark ? '#c7d2fe' : '#4f46e5',
                          background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
                          border: isDark ? '1px solid rgba(165,180,252,0.3)' : '1px solid #c7d2fe',
                          borderRadius: 4,
                          padding: '1px 5px'
                        }}>
                          🏢 {bookInfo.publisher}
                        </span>
                      )}
                    </div>

                    {/* Kitap Adı */}
                    {bookInfo.bookTitle && (
                      <div style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: isDark ? 'rgba(255,255,255,0.85)' : '#334155',
                        wordBreak: 'break-word',
                        lineHeight: 1.3
                      }}>
                        📖 {bookInfo.bookTitle}
                      </div>
                    )}

                    {/* Ünite ve Test Adı Rozetleri */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
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
                  <>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: item.done ? (isDark ? '#4ade80' : '#166534') : (isDark ? '#ffffff' : '#0f172a'), textDecoration: item.done ? 'line-through' : 'none', wordBreak: 'break-word', lineHeight: 1.3 }}>
                      {item.bookName || item.subject || 'Ders Çalışması'}
                    </div>
                    {item.topic && (
                      <div style={{ fontSize: '0.72rem', color: item.done ? (isDark ? '#34d399' : '#22c55e') : (isDark ? 'rgba(255,255,255,0.85)' : '#334155'), fontWeight: 600, marginTop: 2, wordBreak: 'break-word', lineHeight: 1.35 }}>
                        {item.topic}
                      </div>
                    )}
                  </>
                )}

                {(item.startTime || item.endTime) && (
                  <div style={{ marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 3, background: isDark ? 'rgba(99,102,241,0.2)' : '#eef2ff', border: isDark ? '1px solid rgba(165,180,252,0.3)' : '1px solid #c7d2fe', borderRadius: '99px', padding: '1px 7px' }}>
                    <span style={{ fontSize: '0.63rem', fontWeight: 800, color: isDark ? '#c7d2fe' : '#4f46e5' }}>
                      🕐 {item.startTime}{item.endTime ? ` → ${item.endTime}` : ''}
                    </span>
                  </div>
                )}
                {(bookInfo?.questionCount || item.questionCount || item.hours || item.note) && (
                  <div style={{ fontSize: '0.67rem', color: isDark ? 'rgba(255,255,255,0.65)' : '#64748b', fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {(bookInfo?.questionCount || item.questionCount) && (
                      <span style={{ color: '#22d3ee', fontWeight: 700 }}>
                        ✏️ {String(bookInfo?.questionCount || item.questionCount).includes('soru') ? (bookInfo?.questionCount || item.questionCount) : `${bookInfo?.questionCount || item.questionCount} soru`}
                      </span>
                    )}
                    {item.hours && <span><Clock size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {item.hours}</span>}
                    {item.note && <span style={{ color: '#c084fc' }}>· {item.note}</span>}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                {!item.done && onStartStudy && (
                  <button
                    type="button"
                    onClick={() => onStartStudy(item)}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      padding: '0.22rem 0.55rem',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      boxShadow: '0 2px 6px rgba(245,158,11,0.3)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Bu görevi Çalışma Odası'na aktar ve hazırla"
                  >
                    <Play size={10} fill="#ffffff" /> Odada Çalış
                  </button>
                )}
                {isQuizTask && onOpenResult && (
                  <button
                    onClick={() => onOpenResult(item)}
                    style={{
                      background: item.done ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      padding: '0.22rem 0.55rem',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      boxShadow: item.done ? '0 2px 6px rgba(16,185,129,0.3)' : '0 2px 6px rgba(99,102,241,0.3)',
                      transition: 'all 0.15s ease'
                    }}
                    title={item.done ? 'Sınav Sonucunu İncele' : 'Sınavı Çöz'}
                  >
                    {item.done ? <CheckCircle2 size={11} /> : <PlayCircle size={11} />} {item.done ? 'Sonuç' : 'Çöz'}
                  </button>
                )}
                {!item.isAutoHomework && onEditClick && canStudentDeleteItem(item, currentUser) && (
                  <button onClick={() => onEditClick(dayObj.day, item)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8', padding: 2, display: 'flex', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
                    onMouseLeave={e => e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8'}
                    title="Görevi Düzenle">
                    <Edit3 size={12} />
                  </button>
                )}
                {canStudentDeleteItem(item, currentUser) && onDelete && (
                  <button onClick={() => onDelete(dayObj.day, item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? 'rgba(255,255,255,0.4)' : '#cbd5e1', padding: 2, display: 'flex', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.4)' : '#cbd5e1'}
                    title="Görevi Sil">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {shouldCollapse && (
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            style={{
              width: '100%',
              padding: '0.45rem 0.65rem',
              borderRadius: '0.65rem',
              background: isDark ? (isExpanded ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))') : (isExpanded ? '#f1f5f9' : 'linear-gradient(135deg, #eef2ff, #e0e7ff)'),
              border: isDark ? '1px solid rgba(255,255,255,0.14)' : (isExpanded ? '1px solid #cbd5e1' : '1.5px solid #c7d2fe'),
              color: isDark ? '#a5b4fc' : '#4f46e5',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: '0.2rem',
              transition: 'all 0.15s ease',
              boxShadow: isExpanded ? 'none' : '0 2px 8px rgba(99,102,241,0.15)'
            }}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} /> Daha Az Göster
              </>
            ) : (
              <>
                <ChevronDown size={14} /> ➕ {hiddenCount} Görev Daha (Toplu Görünüm)
              </>
            )}
          </button>
        )}
      </div>

      {/* Add Button */}
      <div style={{ padding: '0 0.65rem 0.65rem' }}>
        <button onClick={() => onAddClick(dayObj.day)}
          style={{ width: '100%', padding: '0.45rem', border: isDark ? '1.5px dashed rgba(129,140,248,0.35)' : '1.5px dashed #c7d2fe', borderRadius: '0.6rem', background: 'transparent', color: isDark ? '#a5b4fc' : '#6366f1', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Plus size={13} /> Ekle
        </button>
      </div>
    </div>
  );
}

const TOPIC_TEMPLATES = {
  'LGS': [
    { name: 'Türkçe', color: '#d97706', topics: ['Sözcükte Anlam','Cümlede Anlam','Söz Varlığı','Yapısal Anlam','Yazım Kuralları','Noktalama İşaretleri','Fiil','İsim Soylu Fiiller','Sıfat','Zarf','Zamir','Bağlaç','Edatlar','Ünlü Uyumları','Paragraf','Anlatım Biçimleri','Metin Türleri'] },
    { name: 'Matematik', color: '#2563eb', topics: ['Doğal Sayılar','Bölme-Kalan','OBEB-OKEK','Kesirler','Ondalık Sayılar','Yüzde','Oran-Orantı','Denklemler','Eşitsizlikler','Üslular','Köklü Sayılar','Veri Analizi','Olasılık','Geometri Temelleri','Üçgenler','Dörtgenler','Daireler','Dik Üçgen','Prizmalar'] },
    { name: 'Fen Bilimleri', color: '#059669', topics: ['Hücreler','Biyolojik Çeşitlilik','Kuvvet ve Hareket','Madde ve Atomun Yapısı','Kimyasal Tepkimeler','Enerji Dönüşümleri','Elektrik ve Manyetizma','Optik','Ses','Çevre ve İklim','Canlılar ve Yaşam'] },
    { name: 'Sosyal Bilgiler', color: '#dc2626', topics: ['Tarihte Yolculuk','Bilim Tarih ve Hukuk','Yaşadığımız Yer','Üretim Tüketim','Demokrasi ve Katılım','Ortak Mirasımız','Küresel Bağlantılar'] },
    { name: 'İngilizce', color: '#0891b2', topics: ['Teens','Yummy Yummy','In the Kitchen','On the Phone','TV & Social Media','Adventures','Tourism','Emergency','Digital Era','Greens'] },
    { name: 'Din Kültürü', color: '#7c3aed', topics: ["Kur'an'ın Temel Eğitimi",'Hz. Muhammed','Küresel Etik','Din ve Hayat','Gençlik Dönemi'] },
  ],
  'TYT': [
    { name: 'TYT Türkçe', color: '#d97706', topics: ['Sözcükte Anlam','Deyim-Atasözü','Cümle Anlamı','Paragraf','Yazım Kuralları','Noktalama','Cümle Türleri','Fiil Çekimleri','Edatlar-Bağlaçlar','Anlatım Bozuklukları'] },
    { name: 'TYT Matematik', color: '#2563eb', topics: ['Temel Kavramlar','Sayı Basamakları','Bölünebilme','OBEB-OKEK','Üslular-Köklüler','Kesirler','Denklemler','Eşitsizlikler','Oran-Orantı','Yüzde-Faiz','Kümeler','Fonksiyonlar','Kombinasyon','Olasılık','İstatistik'] },
    { name: 'TYT Fen', color: '#059669', topics: ['Atom Modelleri','Periyodik Sistem','Kimyasal Bağlar','Asit-Baz','Kinetik Enerji','Newton Yasaları','Optik','Elektrik','DNA ve Kalıtım','Ekosistem'] },
    { name: 'TYT Sosyal', color: '#dc2626', topics: ['Tarih Bilimi','İlk Uygarlıklar','İslam Tarihi','Osmanlı Devleti','Birinci Dünya Savaşı','İstiklal Savaşı','Cumhuriyet Dönemi','Coğrafya Temelleri','Türkiye Coğrafyası','Felsefe Giriş'] },
  ],
  'AYT-Sözel': [
    { name: 'Edebiyat', color: '#d97706', topics: ['Güzel Sanatlar','Dil-Anlatım','Halk Edebiyatı','Divan Edebiyatı','Tanzimat','Servetifünun','Milli Edebiyat','Cumhuriyet Edebiyatı'] },
    { name: 'Tarih', color: '#dc2626', topics: ['Tarih Felsefesi','Meşrutiyet Dönemi','Birinci Dünya Savaşı','Kurtuluş Savaşı','Atatürk Dönemi','Siyasi Tarih','İkinci Dünya Savaşı','Soğuk Savaş'] },
    { name: 'Coğrafya', color: '#059669', topics: ['Doğal Sistemler','Küresel Ortam','Nüfus','Göç','Yerleşme','Tarım','Endüstri','Enerji','Turizm','Afetler'] },
  ],
  'AYT-Sayısal': [
    { name: 'Matematik', color: '#2563eb', topics: ['Fonksiyonlar','Trigonometri','Logaritma','Dizi ve Seriler','Limit-Türev','İntegral','Karmaşık Sayılar','Kombinasyon-Olasılık','Analitik Geometri','Konik Kesitler'] },
    { name: 'Fizik', color: '#0891b2', topics: ['Vektörler','Kinematik','Dinamik','Enerji','İtme-Momentum','Tork-Döndürme','Basınç','Dalgalar','Elektrik','Manyetizma','Modern Fizik'] },
    { name: 'Kimya', color: '#db2777', topics: ['Atom Modelleri','Periyodik Tablo','Kimyasal Bağ','Gaz Yasaları','Termokimya','Kimyasal Denge','Elektrokimya','Organik Kimya'] },
    { name: 'Biyoloji', color: '#059669', topics: ['Hücre','Mitoz-Mayoz','Kalıtım','Mutasyon','Ekosistem','Solunum Sistemleri','Sinir Sistemi','Hormonal Sistem','Üreme'] },
  ],
};

/* ─── TopicPoolPanel ─── */
export function TopicPoolPanel({ topicPool, setTopicPool, onAssignTopic, isDark = false }) {
  const { data: curriculumData = [] } = useCurriculum() || {};
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCurriculumPreview, setSelectedCurriculumPreview] = useState(null);
  const [selectedSubjectsForImport, setSelectedSubjectsForImport] = useState(new Set());
  
  const loadTemplate = (tplKey) => {
    if (!window.confirm(`Mevcut tüm dersleriniz silinecek ve ${tplKey} şablonu yüklenecek. Emin misiniz?`)) return;
    const subjects = TOPIC_TEMPLATES[tplKey];
    setTopicPool(subjects.map(s => ({
      id: uid(),
      name: s.name,
      color: s.color,
      topics: s.topics.map(n => ({ id: uid(), name: n, done: false, status: 'Başlanmadı' }))
    })));
  };

  const previewGradeCurriculum = (gradeId) => {
    if (!curriculumData) return;
    const gradeObj = (curriculumData.grades || []).find(g => g.id === gradeId);
    if (!gradeObj) return;

    const gradeSubjects = (curriculumData.subjects || []).filter(s => s.gradeId === gradeId);
    if (gradeSubjects.length === 0) {
      alert(`"${gradeObj.name}" sınıfı için henüz kayıtlı ders müfredatı bulunamadı.`);
      return;
    }

    const colors = ['#6366f1', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#ec4899'];
    const preview = gradeSubjects.map((sub, idx) => {
      const unitsForSub = (curriculumData.units || []).filter(u => u.subjectId === sub.id);
      const unitIds = new Set(unitsForSub.map(u => u.id));
      const topicsForSub = (curriculumData.topics || []).filter(t => t.subjectId === sub.id || unitIds.has(t.unitId));
      const topicNames = topicsForSub.map(t => t.name).filter(bool => bool);
      
      return {
        id: sub.id,
        name: sub.name,
        color: colors[idx % colors.length],
        topics: topicNames
      };
    });

    setSelectedCurriculumPreview({ grade: gradeObj, subjects: preview });
    setSelectedSubjectsForImport(new Set(preview.map(s => s.id)));
  };

  const confirmCurriculumImport = () => {
    if (!selectedCurriculumPreview || selectedSubjectsForImport.size === 0) return;
    
    setTopicPool(prev => {
      const next = [...(prev || [])];
      const subjectsToImport = selectedCurriculumPreview.subjects.filter(s => selectedSubjectsForImport.has(s.id));
      
      subjectsToImport.forEach(sub => {
        const existing = next.find(s => s.name.toLowerCase() === sub.name.toLowerCase());
        if (existing) {
          const existingNames = new Set(existing.topics.map(t => t.name));
          const newTopics = sub.topics.filter(n => !existingNames.has(n)).map(n => ({ id: uid(), name: n, done: false, status: 'Başlanmadı' }));
          existing.topics = [...existing.topics, ...newTopics];
        } else {
          next.push({ id: uid(), name: sub.name, color: sub.color, topics: sub.topics.map(n => ({ id: uid(), name: n, done: false, status: 'Başlanmadı' })) });
        }
      });
      return next;
    });

    setSelectedCurriculumPreview(null);
    setShowTemplates(false);
  };
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopics, setNewTopics] = useState({});

  const toggleSubject = id => setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));

  const addSubject = () => {
    if (!newSubjectName.trim()) return;
    const colors = ['#6366f1', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#ec4899'];
    const color = colors[(topicPool || []).length % colors.length];
    setTopicPool(prev => [...(prev || []), { id: uid(), name: newSubjectName.trim(), color, topics: [] }]);
    setNewSubjectName('');
  };

  const deleteSubject = subId => setTopicPool(prev => (prev || []).filter(s => s.id !== subId));

  const addTopic = subId => {
    const name = (newTopics[subId] || '').trim();
    if (!name) return;
    setTopicPool(prev => (prev || []).map(s => s.id === subId
      ? { ...s, topics: [...s.topics, { id: uid(), name, status: 'Başlanmadı' }] } : s));
    setNewTopics(prev => ({ ...prev, [subId]: '' }));
  };

  const updateTopicStatus = (subId, topicId, status) => {
    setTopicPool(prev => (prev || []).map(s => s.id === subId
      ? { ...s, topics: s.topics.map(t => t.id === topicId ? { ...t, status } : t) } : s));
  };

  const deleteTopic = (subId, topicId) => {
    setTopicPool(prev => (prev || []).map(s => s.id === subId
      ? { ...s, topics: s.topics.filter(t => t.id !== topicId) } : s));
  };

  const pool = topicPool || [];

  return (
    <div>
      {/* Şablon Yükleme Alanı */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button onClick={() => { setShowTemplates(p => !p); setSelectedCurriculumPreview(null); }}
          style={{ background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)', color: isDark ? '#a5b4fc' : '#6366f1', border: isDark ? '1.5px solid rgba(165,180,252,0.35)' : '1.5px solid #c7d2fe', borderRadius: '0.65rem', padding: '0.45rem 0.85rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)' }}>
          📚 Şablon Yükle {showTemplates ? '▲' : '▼'}
        </button>
      </div>

      {showTemplates && (
        <div style={{ background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 100%)' : 'white', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(255,255,255,0.14)' : '1.5px solid #e8ecf0', padding: '1rem', marginBottom: '1rem', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          {selectedCurriculumPreview ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#ffffff' : '#334155' }}>
                  🏫 {selectedCurriculumPreview.grade.name} Müfredatı
                </div>
                <button onClick={() => setSelectedCurriculumPreview(null)} style={{ background: 'none', border: 'none', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', cursor: 'pointer', display: 'flex' }}><X size={16}/></button>
              </div>
              <div style={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', marginBottom: 10 }}>Havuza eklemek istediğiniz dersleri seçin:</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
                {selectedCurriculumPreview.subjects.map((sub, idx) => {
                  const isSelected = selectedSubjectsForImport.has(sub.id);
                  return (
                    <div key={`${sub.id || sub.name}_${idx}`} 
                      onClick={() => {
                        const next = new Set(selectedSubjectsForImport);
                        if (isSelected) next.delete(sub.id);
                        else next.add(sub.id);
                        setSelectedSubjectsForImport(next);
                      }}
                      style={{ padding: '0.5rem', border: isSelected ? `1.5px solid ${sub.color}` : (isDark ? '1px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0'), borderRadius: '0.6rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: isSelected ? `${sub.color}25` : (isDark ? 'rgba(255,255,255,0.05)' : 'white') }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${isSelected ? sub.color : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? sub.color : 'transparent', flexShrink: 0 }}>
                        {isSelected && <Check size={10} color="white" />}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? (isDark ? '#ffffff' : sub.color) : (isDark ? 'rgba(255,255,255,0.8)' : '#475569'), lineHeight: 1.2 }}>{sub.name} <span style={{fontSize: '0.65rem', opacity: 0.7}}>({sub.topics.length})</span></div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => {
                  if (selectedSubjectsForImport.size === selectedCurriculumPreview.subjects.length) {
                    setSelectedSubjectsForImport(new Set());
                  } else {
                    setSelectedSubjectsForImport(new Set(selectedCurriculumPreview.subjects.map(s => s.id)));
                  }
                }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.6rem', border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1.5px solid #e2e8f0', background: isDark ? 'rgba(255,255,255,0.08)' : 'white', color: isDark ? '#ffffff' : '#475569', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  {selectedSubjectsForImport.size === selectedCurriculumPreview.subjects.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                </button>
                <button onClick={confirmCurriculumImport} disabled={selectedSubjectsForImport.size === 0}
                  style={{ flex: 1, padding: '0.45rem 0.8rem', borderRadius: '0.6rem', border: 'none', background: selectedSubjectsForImport.size > 0 ? '#10b981' : (isDark ? 'rgba(255,255,255,0.1)' : '#94a3b8'), color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: selectedSubjectsForImport.size > 0 ? 'pointer' : 'not-allowed' }}>
                  Seçilenleri Ekle ({selectedSubjectsForImport.size})
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#ffffff' : '#334155', marginBottom: 12 }}>✨ Hazır Şablon & Kayıtlı Müfredatlardan Yükle</div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', marginBottom: 8 }}>📌 Sınav Hazırlık Şablonları:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.keys(TOPIC_TEMPLATES).map(tplKey => (
                    <button key={tplKey} onClick={() => loadTemplate(tplKey)}
                      style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: 'white', border: 'none', borderRadius: '0.6rem', padding: '0.45rem 0.8rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
                      <Plus size={14} /> {tplKey} Şablonu
                    </button>
                  ))}
                </div>
              </div>

              {curriculumData?.grades && curriculumData.grades.length > 0 && (
                <div style={{ paddingTop: 12, borderTop: isDark ? '1px dashed rgba(255,255,255,0.15)' : '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', marginBottom: 8 }}>🏫 Kayıtlı Sınıf Müfredatından Yükle:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {curriculumData.grades.map(grade => (
                      <button key={grade.id} onClick={() => previewGradeCurriculum(grade.id)}
                        style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: 'white', border: 'none', borderRadius: '0.6rem', padding: '0.45rem 0.8rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                        <GraduationCap size={14} /> {grade.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {pool.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {[
            { label: 'Toplam Ders', value: pool.length, color: '#818cf8', border: 'rgba(129,140,248,0.35)', bg: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.9) 100%)' : '#eef2ff' },
            { label: 'Toplam Konu', value: pool.reduce((a, s) => a + s.topics.length, 0), color: '#c084fc', border: 'rgba(192,132,252,0.35)', bg: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.9) 100%)' : '#f5f3ff' },
            { label: 'Tamamlanan', value: pool.reduce((a, s) => a + s.topics.filter(t => t.status === 'Tamamlandı').length, 0), color: '#34d399', border: 'rgba(52,211,153,0.35)', bg: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.9) 100%)' : '#f0fdf4' },
          ].map(stat => (
            <div key={stat.label} style={{ background: stat.bg, borderRadius: '0.85rem', padding: '0.7rem 1.1rem', flex: '1 1 120px', border: isDark ? `1.5px solid ${stat.border}` : 'none', boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : 'none', backdropFilter: isDark ? 'blur(16px)' : 'none' }}>
              <div style={{ fontWeight: 900, fontSize: '1.3rem', color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {pool.map((subject, idx) => {
          const isOpen = expandedSubjects[subject.id];
          const doneCount = subject.topics.filter(t => t.status === 'Tamamlandı').length;
          const totalCount = subject.topics.length;
          return (
            <div key={`${subject.id || subject.name}_${idx}`} style={{ background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)' : 'white', borderRadius: '1rem', border: isDark ? '1.5px solid rgba(255,255,255,0.14)' : '1.5px solid #e8ecf0', overflow: 'hidden', boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.3)' : 'none', backdropFilter: isDark ? 'blur(20px)' : 'none' }}>
              <div onClick={() => toggleSubject(subject.id)} style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1rem', cursor: 'pointer', gap: '0.75rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: subject.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isDark ? '#ffffff' : '#1e293b' }}>{subject.name}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.6)' : '#94a3b8', marginTop: 1 }}>{doneCount}/{totalCount} konu tamamlandı</div>
                </div>
                {totalCount > 0 && (
                  <div style={{ width: 48, height: 4, background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', borderRadius: 99 }}>
                    <div style={{ height: 4, borderRadius: 99, width: `${Math.round((doneCount / totalCount) * 100)}%`, background: subject.color }} />
                  </div>
                )}
                <button onClick={e => { e.stopPropagation(); deleteSubject(subject.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? 'rgba(255,255,255,0.3)' : '#e2e8f0', padding: 4, borderRadius: 6, display: 'flex' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.3)' : '#e2e8f0'}>
                  <Trash2 size={14} />
                </button>
                {isOpen ? <ChevronDown size={16} color={isDark ? '#a5b4fc' : '#94a3b8'} /> : <ChevronRight size={16} color={isDark ? '#a5b4fc' : '#94a3b8'} />}
              </div>

              {isOpen && (
                <div style={{ padding: '0 1rem 1rem', borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.65rem' }}>
                    {subject.topics.map((topic, tIdx) => {
                      const sc = STATUS_COLORS[topic.status] || STATUS_COLORS['Başlanmadı'];
                      return (
                        <div key={`${topic.id || topic.name}_${tIdx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.65rem', background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderRadius: '0.6rem', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 110, fontSize: '0.83rem', fontWeight: 700, color: isDark ? '#ffffff' : '#374151' }}>{topic.name}</div>
                          
                          {/* Quick Assign Action Chips */}
                          {onAssignTopic && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                              <button
                                title="Konu Çalışması Olarak Programa Ekle"
                                onClick={e => { e.stopPropagation(); onAssignTopic({ subjectName: subject.name, topicName: topic.name, taskType: 'konu' }); }}
                                style={{ padding: '3px 7px', border: '1px solid rgba(129,140,248,0.35)', borderRadius: '0.4rem', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '0.67rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                              >
                                📖 Çalış
                              </button>
                              <button
                                title="Soru Çözümü Olarak Programa Ekle"
                                onClick={e => { e.stopPropagation(); onAssignTopic({ subjectName: subject.name, topicName: topic.name, taskType: 'soru' }); }}
                                style={{ padding: '3px 7px', border: '1px solid rgba(251,146,60,0.35)', borderRadius: '0.4rem', background: 'rgba(234,88,12,0.2)', color: '#fb923c', fontSize: '0.67rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                              >
                                ✏️ Soru
                              </button>
                              <button
                                title="Tekrar Olarak Programa Ekle"
                                onClick={e => { e.stopPropagation(); onAssignTopic({ subjectName: subject.name, topicName: topic.name, taskType: 'tekrar' }); }}
                                style={{ padding: '3px 7px', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '0.4rem', background: 'rgba(16,185,129,0.2)', color: '#34d399', fontSize: '0.67rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                              >
                                🔄 Tekrar
                              </button>
                            </div>
                          )}

                          <select value={topic.status} onChange={e => updateTopicStatus(subject.id, topic.id, e.target.value)} onClick={e => e.stopPropagation()}
                            style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 6px', border: `1.5px solid ${sc.border}`, borderRadius: '0.4rem', background: isDark ? 'rgba(0,0,0,0.4)' : sc.bg, color: isDark ? '#ffffff' : sc.text, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                            {TOPIC_STATUSES.map(s => <option key={s} value={s} style={{ background: '#0f172a', color: '#ffffff' }}>{s}</option>)}
                          </select>
                          <button onClick={() => deleteTopic(subject.id, topic.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? 'rgba(255,255,255,0.4)' : '#cbd5e1', padding: 2, display: 'flex', borderRadius: 4, flexShrink: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                            onMouseLeave={e => e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.4)' : '#cbd5e1'}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                    <input value={newTopics[subject.id] || ''} onChange={e => setNewTopics(prev => ({ ...prev, [subject.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addTopic(subject.id)} placeholder="Yeni konu ekle..."
                      style={{ flex: 1, padding: '0.45rem 0.7rem', border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #e2e8f0', borderRadius: '0.55rem', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', background: isDark ? 'rgba(255,255,255,0.07)' : 'white', color: isDark ? '#ffffff' : '#0f172a' }} />
                    <button onClick={() => addTopic(subject.id)}
                      style={{ padding: '0.45rem 0.8rem', background: (newTopics[subject.id] || '').trim() ? subject.color : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'), color: (newTopics[subject.id] || '').trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: '0.55rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>
                      Ekle
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.9) 100%)' : 'white', borderRadius: '1rem', border: isDark ? '1.5px dashed rgba(129,140,248,0.35)' : '1.5px dashed #c7d2fe', padding: '1rem', marginTop: '0.75rem', display: 'flex', gap: '0.65rem', alignItems: 'center', backdropFilter: isDark ? 'blur(16px)' : 'none' }}>
        <BookOpen size={18} color="#818cf8" style={{ flexShrink: 0 }} />
        <input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubject()}
          placeholder="Yeni ders ekle (Örn: Matematik)..."
          style={{ flex: 1, padding: '0.5rem 0.7rem', border: isDark ? '1.5px solid rgba(255,255,255,0.16)' : '1.5px solid #e2e8f0', borderRadius: '0.55rem', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', background: isDark ? 'rgba(255,255,255,0.07)' : 'white', color: isDark ? '#ffffff' : '#0f172a' }} />
        <button onClick={addSubject}
          style={{ padding: '0.5rem 1rem', background: newSubjectName.trim() ? 'linear-gradient(135deg,#6366f1,#7c3aed)' : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'), color: newSubjectName.trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: '0.55rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: newSubjectName.trim() ? '0 2px 8px rgba(99,102,241,0.3)' : 'none' }}>
          + Ders Ekle
        </button>
      </div>
    </div>
  );
}

/* ─── MonthlyListPanel Component ─── */
export function MonthlyListPanel({
  weeklyProgram,
  allHomeworks,
  currentUser,
  submissions,
  curData,
  books = [],
  bookTests = [],
  studyPlans = [],
  studyAssignments = [],
  onToggle,
  onDelete,
  onEditClick,
  onOpenResult,
  onStartStudy,
  isDark = false
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [onlyWithTasks, setOnlyWithTasks] = useState(false);
  const [expandedMonthDays, setExpandedMonthDays] = useState({});
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const MONTHS_TR = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  const DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];

  const monthInfo = useMemo(() => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const monthIdx = targetDate.getMonth();
    const monthName = MONTHS_TR[monthIdx];

    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const daysList = [];

    const todayYMD = getLocalYMD(new Date());

    const studentId = currentUser?.id;
    const studentGrades = curData?.grades || [];

    const studentHomeworks = (allHomeworks || []).filter(hw => {
      return isHomeworkForStudent(hw, currentUser, studentGrades);
    });

    const allDailyItems = [];
    (weeklyProgram || []).forEach(dObj => {
      (dObj.items || []).forEach(item => {
        if ((item.repeatType === 'daily' || item.isDaily) && !allDailyItems.some(i => i.id === item.id)) {
          allDailyItems.push(item);
        }
      });
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, monthIdx, day);
      const ymd = getLocalYMD(dateObj);
      const dayOfWeekIdx = dateObj.getDay();
      const dayKey = DAYS_SHORT[dayOfWeekIdx];
      const isToday = ymd === todayYMD;

      const dayProg = (weeklyProgram || []).find(r => r.day === dayKey);
      const rawManualItems = dayProg?.items || [];
      
      // All items belonging to this weekday in weeklyProgram reflect on this day
      let manualItems = rawManualItems.filter(item => {
        if (item.createdYMD && ymd < item.createdYMD) return false;
        if (item.repeatEndDate && ymd > item.repeatEndDate) return false;
        if (item.singleDate && item.singleDate !== ymd) return false;
        if (item.specificDate && item.specificDate !== ymd) return false;
        return true;
      });

      // Add daily tasks
      allDailyItems.forEach(dItem => {
        if (dItem.createdYMD && ymd < dItem.createdYMD) return;
        if (dItem.repeatEndDate && ymd > dItem.repeatEndDate) return;
        if (!manualItems.some(i => i.id === dItem.id)) {
          manualItems.push(dItem);
        }
      });

      // Map manual items to dynamically reflect test/assignment completion
      manualItems = manualItems.map(item => {
        const isDone = Boolean(item.done || checkIsTaskSolved(item, studentId, submissions, allHomeworks, studyAssignments));
        return {
          ...item,
          done: isDone
        };
      });

      const dateTime = dateObj.getTime();
      const autoHwItems = [];

      // A) Homeworks & Book Assignments
      studentHomeworks.forEach(hw => {
        const bookObj = (books || []).find(b => String(b.id) === String(hw.bookId) || toUUID(b.id) === toUUID(hw.bookId));
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

        const isExam = Boolean(
          hw.type === 'physicalExam' ||
          hw.contentType === 'physicalExam' ||
          hw.raw_data?.type === 'physicalExam' ||
          hw.raw_data?.contentType === 'physicalExam' ||
          hw.bookType === 'exam' ||
          bookObj?.bookType === 'exam' ||
          hw.isPhysical ||
          hw.raw_data?.isPhysical ||
          (hw.title && (hw.title.toLowerCase().includes('deneme') || hw.title.toLowerCase().includes('sınav') || hw.title.toLowerCase().includes('hazır bulunuşluk') || hw.title.toLowerCase().includes('hazir bulunusluk')))
        );

        if (isExam) {
          const rawStart = hw.startDate || hw.assignedAt || hw.createdAt;
          const startYMD = rawStart ? new Date(rawStart).toISOString().split('T')[0] : null;
          const startTime = startYMD ? new Date(startYMD).getTime() : null;

          const rawDue = hw.dueDate || hw.due_date || hw.raw_data?.dueDate || hw.assignedDueDate;
          const dueYMD = rawDue ? new Date(rawDue).toISOString().split('T')[0] : null;
          const dueTime = dueYMD ? new Date(dueYMD).getTime() : null;

          let isForThisDay = dueYMD ? (ymd === dueYMD) : (!dueYMD && startTime ? dateTime === startTime : false);

          if (isForThisDay) {
            const isHwDone = checkIsTaskSolved({
              hwId: hw.id,
              id: hw.id
            }, studentId, submissions, allHomeworks, studyAssignments);

            let totalQ = hw.totalQuestions;
            if (!totalQ && hw.tests && Array.isArray(hw.tests)) {
              totalQ = hw.tests.reduce((acc, tid) => {
                const bt = (bookTests || []).find(b => String(b.id) === String(tid));
                return acc + (bt?.questionCount || 0);
              }, 0);
            }
            if (!totalQ) totalQ = (bookObj?.subjects || []).reduce((acc, s) => acc + (s.count || 20), 0) || 30;

            const exists = manualItems.some(m => m.id === `hw_${hw.id}` || m.hwId === hw.id || (m.topic === (hw.title || hw.name)));
            if (!exists) {
              autoHwItems.push({
                id: `auto_hw_${hw.id}_${ymd}`,
                hwId: hw.id,
                isAutoHomework: true,
                isExamTask: true,
                taskType: 'deneme',
                subject: '📋 Deneme',
                topic: cleanBookTitle || hw.title || 'Deneme Sınavı',
                questionCount: `${totalQ} Soru`,
                time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
                done: isHwDone
              });
            }
          }
          return;
        }

        const isBook = Boolean(
          hw.isBookAssignment ||
          hw.sourceType === 'trackedBook' ||
          hw.bookId ||
          hw.book_id ||
          hw.raw_data?.bookId ||
          hw.raw_data?.isBookAssignment ||
          (hw.testDueDates && Object.keys(hw.testDueDates).length > 0) ||
          (hw.scheduleDates && Object.keys(hw.scheduleDates).length > 0) ||
          (hw.title && /kitap|seti|soru bankası|paragraf|atlı karınca|artıbir/i.test(hw.title))
        );

        // Helper to resolve accurate subject, unit/topic, and test names
        const resolveBookTestInfo = (testId) => {
          const tIdStr = String(testId || '');
          const tUuidStr = String(toUUID(tIdStr) || '');
          const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '');

          let currentBook = bookObj || (books || []).find(b => 
            String(b?.id) === String(hw?.bookId || hw?.book_id) || 
            (toUUID(b?.id) && String(toUUID(b?.id)) === String(toUUID(hw?.bookId || hw?.book_id))) ||
            (hw?.title && String(b?.title).toLowerCase().trim().includes(String(hw?.title).toLowerCase().replace(/\s*\(tüm kitap görevi\)/gi, '').trim())) ||
            (hw?.title && String(hw?.title).toLowerCase().trim().includes(String(b?.title).toLowerCase().trim()))
          );

          let tObj = (bookTests || []).find(b => {
            const bId = String(b?.id || '');
            return bId === tIdStr || 
              (tUuidStr && bId === tUuidStr) || 
              (tUuidStr && toUUID(bId) === tUuidStr) || 
              bId.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId;
          });

          let subjObj = null;
          let topicObj = null;

          if (currentBook && currentBook.subjects) {
            for (const s of currentBook.subjects) {
              if (s.tests && Array.isArray(s.tests)) {
                const found = s.tests.find(t => String(t.id) === tIdStr || (tUuidStr && String(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '') === tCleanId);
                if (found) {
                  if (!tObj) tObj = found;
                  subjObj = s;
                  break;
                }
              }
              if (s.topics && Array.isArray(s.topics)) {
                for (const tp of s.topics) {
                  if (tp.tests && Array.isArray(tp.tests)) {
                    const found = tp.tests.find(t => String(t.id) === tIdStr || (tUuidStr && String(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '') === tCleanId);
                    if (found) {
                      if (!tObj) tObj = found;
                      subjObj = s;
                      topicObj = tp;
                      break;
                    }
                  }
                }
              }
              if (subjObj) break;
            }
          }

          if (!subjObj && (!tObj || !tObj.subjectId)) {
            for (const b of (books || [])) {
              if (!b.subjects) continue;
              for (const s of b.subjects) {
                if (s.tests) {
                  const found = s.tests.find(t => String(t.id) === tIdStr || (tUuidStr && String(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '') === tCleanId);
                  if (found) {
                    if (!tObj) tObj = found;
                    subjObj = s;
                    if (!currentBook) currentBook = b;
                    break;
                  }
                }
                if (s.topics) {
                  for (const tp of s.topics) {
                    if (tp.tests) {
                      const found = tp.tests.find(t => String(t.id) === tIdStr || (tUuidStr && String(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '') === tCleanId);
                      if (found) {
                        if (!tObj) tObj = found;
                        subjObj = s;
                        topicObj = tp;
                        if (!currentBook) currentBook = b;
                        break;
                      }
                    }
                  }
                }
                if (subjObj) break;
              }
              if (subjObj) break;
            }
          }

          if (tObj && !subjObj && currentBook) {
            subjObj = (currentBook.subjects || []).find(s => 
              String(s.id) === String(tObj.subjectId || tObj.subject_id) || 
              (toUUID(s.id) && toUUID(s.id) === toUUID(tObj.subjectId || tObj.subject_id)) || 
              (s.name && (tObj.subjectName || tObj.subject) && String(s.name).toLowerCase().trim() === String(tObj.subjectName || tObj.subject).toLowerCase().trim())
            );
            topicObj = (subjObj?.topics || []).find(tp => 
              String(tp.id) === String(tObj.topicId || tObj.topic_id) || 
              (toUUID(tp.id) && toUUID(tp.id) === toUUID(tObj.topicId || tObj.topic_id)) || 
              (tp.name && (tObj.topicName || tObj.topic) && String(tp.name).toLowerCase().trim() === String(tObj.topicName || tObj.topic).toLowerCase().trim())
            );
          }

          let subjectName = subjObj?.name || tObj?.subjectName || tObj?.subject;
          if (!subjectName || subjectName === 'Atlı Karınca' || subjectName === 'Artıbir' || subjectName === 'CUSTOM') {
            const rawToCheck = `${hw?.title || ''} ${hw?.subject || ''} ${currentBook?.title || ''}`;
            if (/matematik/i.test(rawToCheck)) subjectName = 'Matematik';
            else if (/turkce|türkçe|paragraf/i.test(rawToCheck)) subjectName = 'Türkçe';
            else if (/sosyal/i.test(rawToCheck)) subjectName = 'Sosyal Bilgiler';
            else if (/fen/i.test(rawToCheck)) subjectName = 'Fen Bilimleri';
            else if (/ingilizce/i.test(rawToCheck)) subjectName = 'İngilizce';
            else if (/din/i.test(rawToCheck)) subjectName = 'Din Kültürü';
            else subjectName = currentBook?.title ? currentBook.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim() : 'Kitap Takibi';
          }

          const topicName = topicObj?.name || tObj?.topicName || tObj?.topic || '';
          const testName = tObj?.name || 'Test';
          const qCount = tObj?.questionCount || 12;
          const cleanTitle = (currentBook?.title || hw?.title || 'Kitap')
            .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
            .replace(/\s*\(Tüm Kitap\)/gi, '')
            .replace(/\s*\(Kendi Eklediğim\)/gi, '')
            .trim();

          return {
            tObj,
            subjObj,
            topicObj,
            subjectName,
            topicName,
            testName,
            qCount,
            cleanBookTitle: cleanTitle,
            currentBook
          };
        };

        let rawData = hw.raw_data;
        if (typeof rawData === 'string') {
          try { rawData = JSON.parse(rawData); } catch {}
        }
        const testDueDatesMap = hw.testDueDates || hw.scheduleDates || hw.test_due_dates || rawData?.testDueDates || rawData?.scheduleDates || rawData?.test_due_dates || hw.testDates || {};
        if (isBook && typeof testDueDatesMap === 'object' && Object.keys(testDueDatesMap).length > 0) {
          const processedCleanIds = new Set();
          Object.entries(testDueDatesMap).forEach(([testId, tDateStr]) => {
            if (!tDateStr) return;
            const tCleanId = String(testId).replace(/^bt_/, '').replace(/^q_/, '');
            if (processedCleanIds.has(tCleanId)) return;
            processedCleanIds.add(tCleanId);

            const tYMD = String(tDateStr).split('T')[0];
            if (ymd === tYMD) {
              const info = resolveBookTestInfo(testId);
              const testName = info.testName;
              const qCount = info.qCount;
              const subjectName = info.subjectName;
              const topicName = info.topicName;
              const cleanBookTitle = info.cleanBookTitle;

              const displayHeader = topicName ? `${subjectName} • ${topicName}` : subjectName;
              const displaySub = `${cleanBookTitle} — ${testName}`;

              const isSolved = checkIsTaskSolved({
                ...info.tObj,
                id: tCleanId,
                testId: tCleanId,
                bookTestId: tCleanId,
                hwId: hw.id,
                taskType: 'kitap',
                name: testName,
                testName: testName,
                title: testName,
                subject: subjectName,
                subjectName: subjectName,
                unit: topicName,
                unitName: topicName,
                unitTopic: topicName,
                bookTitle: cleanBookTitle
              }, studentId, submissions, allHomeworks, studyAssignments);

              const exists = manualItems.some(m => m.id === `book_test_${hw.id}_${tCleanId}_${ymd}` || m.testId === testId || m.testId === tCleanId || m.bookTestId === testId || m.bookTestId === tCleanId) ||
                autoHwItems.some(a => a.testId === testId || a.testId === tCleanId || a.bookTestId === testId || a.bookTestId === tCleanId);

              if (!exists) {
                autoHwItems.push({
                  id: `book_test_${hw.id}_${tCleanId}_${ymd}`,
                  hwId: hw.id,
                  testId: tCleanId,
                  bookTestId: tCleanId,
                  bookId: hw.bookId || info.currentBook?.id || null,
                  isAutoHomework: true,
                  taskType: 'kitap',
                  subject: displayHeader,
                  topic: displaySub,
                  questionCount: typeof qCount === 'string' && qCount.includes('soru') ? qCount : `${qCount} soru`,
                  time: `Hedef: ${new Date(tDateStr).toLocaleDateString('tr-TR')}`,
                  done: isSolved
                });
              }
            }
          });
          return;
        }

        const rawStart = hw.startDate || hw.assignedAt || hw.createdAt;
        const startYMD = rawStart ? new Date(rawStart).toISOString().split('T')[0] : null;
        const startTime = startYMD ? new Date(startYMD).getTime() : null;

        const rawDue = hw.dueDate || hw.due_date || hw.raw_data?.dueDate || hw.assignedDueDate;
        const dueYMD = rawDue ? new Date(rawDue).toISOString().split('T')[0] : null;
        const dueTime = dueYMD ? new Date(dueYMD).getTime() : null;

        let isForThisDay = false;
        if (dueTime && startTime) {
          isForThisDay = dateTime >= startTime && dateTime <= dueTime;
        } else if (dueTime) {
          isForThisDay = ymd === dueYMD || (dateTime <= dueTime && dateTime >= dueTime - 6 * 86400000);
        } else if (startTime) {
          isForThisDay = dateTime === startTime;
        }

        if (isForThisDay) {
          if (isBook && (hw.totalQuestions > 50 || (typeof testDueDatesMap === 'object' && Object.keys(testDueDatesMap).length > 0) || /tüm kitap/i.test(hw.title || ''))) {
            return;
          }
          if (isBook) {
            if (ymd === dueYMD || (!dueYMD && startTime && dateTime === startTime)) {
              const isHwDone = checkIsTaskSolved({
                hwId: hw.id,
                id: hw.id
              }, studentId, submissions, allHomeworks, studyAssignments);

              const exists = manualItems.some(m => m.id === `hw_${hw.id}` || m.hwId === hw.id || (m.topic === (hw.title || hw.name)));
              if (!exists) {
                autoHwItems.push({
                  id: `auto_hw_${hw.id}_${ymd}`,
                  hwId: hw.id,
                  isAutoHomework: true,
                  isBookAssignment: true,
                  bookId: hw.bookId || bookObj?.id || null,
                  taskType: 'kitap',
                  subject: hw.subject || 'Atanan Kitap',
                  topic: cleanBookTitle || hw.title || hw.name || 'Kitap Görevi',
                  questionCount: hw.totalQuestions ? (String(hw.totalQuestions).includes('soru') ? hw.totalQuestions : `${hw.totalQuestions} soru`) : null,
                  time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
                  done: isHwDone
                });
              }
            }
            return;
          }

          const isHwDone = checkIsTaskSolved({
            hwId: hw.id,
            id: hw.id
          }, studentId, submissions, allHomeworks, studyAssignments);

          const exists = manualItems.some(m => m.id === `hw_${hw.id}` || m.hwId === hw.id || (m.topic === (hw.title || hw.name)));
          if (!exists) {
            autoHwItems.push({
              id: `auto_hw_${hw.id}_${ymd}`,
              hwId: hw.id,
              isAutoHomework: true,
              taskType: hw.isBookAssignment ? 'kitap' : 'ödev',
              subject: hw.subject || 'Atanan Ödev',
              topic: hw.title || hw.name || 'Ödev Görevi',
              questionCount: hw.totalQuestions ? (String(hw.totalQuestions).includes('soru') ? hw.totalQuestions : `${hw.totalQuestions} soru`) : null,
              time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
              done: isHwDone
            });
          }
        }
      });

      // A.3) Tüm Kitaplarda Tarih Girilmiş Testler (Direct Book Test Due Dates)
      (books || []).filter(b => b && b.bookType !== 'exam').forEach(b => {
        const cleanBookTitle = (b.title || 'Kitap')
          .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
          .replace(/\s*\(Tüm Kitap\)/gi, '')
          .replace(/\s*\(Kendi Eklediğim\)/gi, '')
          .trim();

        (b.subjects || []).forEach(subj => {
          const subjName = subj.name || 'Genel';
          
          (subj.tests || []).forEach(t => {
            const tDue = t.dueDate || t.testDueDate || t.due_date || t.date;
            if (!tDue) return;
            const tYMD = String(tDue).split('T')[0];
            if (tYMD === ymd) {
              const autoId = `book_test_direct_${b.id}_${t.id}_${ymd}`;
              if (!manualItems.some(m => m.id === autoId || m.testId === t.id) && !autoHwItems.some(a => a.testId === t.id)) {
                const isSolved = checkIsTaskSolved({ testId: t.id, taskType: 'kitap' }, studentId, submissions, allHomeworks, studyAssignments);
                autoHwItems.push({
                  id: autoId,
                  testId: t.id,
                  bookTestId: t.id,
                  bookId: b.id,
                  isAutoHomework: true,
                  isBookTask: true,
                  taskType: 'kitap',
                  subject: subjName,
                  topic: `${cleanBookTitle} — ${t.name || 'Test'}`,
                  questionCount: typeof t.questionCount === 'string' && t.questionCount.includes('soru') ? t.questionCount : `${t.questionCount || 12} soru`,
                  time: `Hedef: ${new Date(tDue).toLocaleDateString('tr-TR')}`,
                  done: isSolved
                });
              }
            }
          });

          (subj.topics || []).forEach(tp => {
            const tpName = tp.name || '';
            (tp.tests || []).forEach(t => {
              const tDue = t.dueDate || t.testDueDate || t.due_date || t.date;
              if (!tDue) return;
              const tYMD = String(tDue).split('T')[0];
              if (tYMD === ymd) {
                const autoId = `book_test_direct_${b.id}_${t.id}_${ymd}`;
                if (!manualItems.some(m => m.id === autoId || m.testId === t.id) && !autoHwItems.some(a => a.testId === t.id)) {
                  const isSolved = checkIsTaskSolved({ testId: t.id, taskType: 'kitap' }, studentId, submissions, allHomeworks, studyAssignments);
                  autoHwItems.push({
                    id: autoId,
                    testId: t.id,
                    bookTestId: t.id,
                    bookId: b.id,
                    isAutoHomework: true,
                    isBookTask: true,
                    taskType: 'kitap',
                    subject: tpName ? `${subjName} • ${tpName}` : subjName,
                    topic: `${cleanBookTitle} — ${t.name || 'Test'}`,
                    questionCount: typeof t.questionCount === 'string' && t.questionCount.includes('soru') ? t.questionCount : `${t.questionCount || 12} soru`,
                    time: `Hedef: ${new Date(tDue).toLocaleDateString('tr-TR')}`,
                    done: isSolved
                  });
                }
              }
            });
          });
        });
      });

      // A.4) bookTests içinde tarihi olan tüm testler (Supabase tracked_book_tests)
      (bookTests || []).forEach(bt => {
        if (!bt) return;
        const tDue = bt.dueDate || bt.testDueDate || bt.due_date || bt.date;
        if (!tDue) return;
        const tYMD = String(tDue).split('T')[0];
        if (tYMD === ymd) {
          const bId = String(bt.bookId || bt.book_id || '');
          const currentBook = (books || []).find(b => String(b.id) === bId || (toUUID(b.id) && toUUID(b.id) === toUUID(bId)));
          const cleanBookTitle = (currentBook?.title || 'Kitap')
            .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
            .replace(/\s*\(Tüm Kitap\)/gi, '')
            .replace(/\s*\(Kendi Eklediğim\)/gi, '')
            .trim();

          const autoId = `book_test_bt_${bt.id}_${ymd}`;
          if (!manualItems.some(m => m.id === autoId || m.testId === bt.id || m.bookTestId === bt.id) && !autoHwItems.some(a => a.testId === bt.id || a.bookTestId === bt.id)) {
            const isSolved = checkIsTaskSolved({ testId: bt.id, taskType: 'kitap' }, studentId, submissions, allHomeworks, studyAssignments);
            autoHwItems.push({
              id: autoId,
              testId: bt.id,
              bookTestId: bt.id,
              bookId: bId,
              isAutoHomework: true,
              isBookTask: true,
              taskType: 'kitap',
              subject: bt.subject || 'Kitap Testi',
              topic: `${cleanBookTitle} — ${bt.name || 'Test'}`,
              questionCount: typeof bt.questionCount === 'string' && bt.questionCount.includes('soru') ? bt.questionCount : `${bt.questionCount || 12} soru`,
              time: `Hedef: ${new Date(tDue).toLocaleDateString('tr-TR')}`,
              done: isSolved
            });
          }
        }
      });

      // B) Roadmap / Study Plan items with target dates (dueDate)
      const studentAssignments = (studyAssignments || []).filter(a => String(a.studentId) === String(studentId));
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

        let totalPlanSteps = 0;
        let completedPlanSteps = 0;
        (plan.subjects || []).forEach(subject => {
          if (subject.dueDate) {
            totalPlanSteps++;
            if (completedTopicsSet.has(String(subject.id)) || completedTopicsSet.has(subject.name)) completedPlanSteps++;
          }
          (subject.topics || []).forEach(topic => {
            totalPlanSteps++;
            if (completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name)) completedPlanSteps++;
          });
        });

        if (totalPlanSteps > 0 && completedPlanSteps >= totalPlanSteps) return;

        (plan.subjects || []).forEach(subject => {
          const hasChildTopics = Array.isArray(subject.topics) && subject.topics.length > 0;
          const allChildTopicsDone = hasChildTopics && subject.topics.every(t => completedTopicsSet.has(String(t.id)) || completedTopicsSet.has(t.name));
          const isSubjectCompleted = completedTopicsSet.has(String(subject.id)) || completedTopicsSet.has(subject.name) || allChildTopicsDone;

          if (!hasChildTopics && subject.dueDate) {
            const sYMD = subject.dueDate.split('T')[0];
            if (ymd === sYMD) {
              const subId = `roadmap_sub_${assignment.id}_${subject.id}_${ymd}`;
              const exists = manualItems.some(m => m.id === subId) || autoHwItems.some(a => a.id === subId);
              if (!exists) {
                autoHwItems.push({
                  id: subId,
                  roadmapAssignmentId: assignment.id,
                  isAutoHomework: true,
                  isRoadmapTask: true,
                  taskType: 'konu',
                  subject: `${plan.title} • ${subject.name}`,
                  topic: subject.name,
                  time: `Hedef: ${new Date(subject.dueDate).toLocaleDateString('tr-TR')}`,
                  done: isSubjectCompleted
                });
              }
            }
          }

          (subject.topics || []).forEach(topic => {
            if (topic.dueDate) {
              const tYMD = topic.dueDate.split('T')[0];
              if (ymd === tYMD) {
                const isCompleted = completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name);
                const topId = `roadmap_topic_${assignment.id}_${topic.id}_${ymd}`;
                const exists = manualItems.some(m => m.id === topId) || autoHwItems.some(a => a.id === topId);
                if (!exists) {
                  autoHwItems.push({
                    id: topId,
                    roadmapAssignmentId: assignment.id,
                    isAutoHomework: true,
                    isRoadmapTask: true,
                    taskType: 'konu',
                    subject: `${plan.title} • ${subject.name}`,
                    topic: topic.name,
                    time: `Hedef: ${new Date(topic.dueDate).toLocaleDateString('tr-TR')}`,
                    done: isCompleted
                  });
                }
              }
            }
          });
        });
      });

      const rawDayItems = sortItemsByBookOrder([...autoHwItems, ...manualItems], books, bookTests);
      const seenDayIds = new Map();
      rawDayItems.forEach(item => {
        const cleanSubject = String(item.subject || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
        const cleanTitle = String(item.title || item.topic || item.testName || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
        const cleanBook = String(item.bookTitle || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');

        let key = '';
        if (item.testId) {
          key = `test_${String(item.testId).replace(/^bt_/, '')}`;
        } else if (item.hwId && !item.testId) {
          key = `hw_${item.hwId}`;
        } else if (cleanTitle && (cleanSubject || cleanBook)) {
          key = `content_${cleanBook}_${cleanSubject}_${cleanTitle}`;
        } else {
          key = String(item.id || '');
        }

        if (!key) return;
        const existing = seenDayIds.get(key);
        if (!existing || (!existing.done && item.done) || (!existing.testId && item.testId)) {
          seenDayIds.set(key, item);
        }
      });
      const dayItems = sortItemsByBookOrder(Array.from(seenDayIds.values()), books, bookTests);

      daysList.push({
        day,
        dateObj,
        ymd,
        dayKey,
        dayName: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][dayOfWeekIdx],
        isToday,
        items: dayItems
      });
    }

    return {
      year,
      monthIdx,
      monthName,
      monthTitle: `${monthName} ${year}`,
      daysList
    };
  }, [monthOffset, weeklyProgram, allHomeworks, currentUser, submissions, curData, books, bookTests, studyPlans, studyAssignments]);

  const filteredDays = useMemo(() => {
    if (!onlyWithTasks) return monthInfo.daysList;
    return monthInfo.daysList.filter(d => d.items.length > 0);
  }, [monthInfo, onlyWithTasks]);

  const monthTotalTasks = monthInfo.daysList.reduce((acc, d) => acc + d.items.length, 0);
  const monthDoneTasks = monthInfo.daysList.reduce((acc, d) => acc + d.items.filter(i => i.done).length, 0);
  const monthCompletionPct = monthTotalTasks > 0 ? Math.round((monthDoneTasks / monthTotalTasks) * 100) : 0;
  const [printOrientation, setPrintOrientation] = useState('landscape');

  const handlePrint = (orientation) => {
    setPrintOrientation(orientation);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <div className="printable-monthly-area">
      {/* Print & Mobile Specific CSS */}
      <style>{`
        .print-monthly-program-doc { display: none; }
        .monthly-day-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          transition: all 0.15s ease;
        }
        .monthly-date-box {
          min-width: 76px;
          text-align: center;
          padding: 0.55rem 0.75rem;
          border-radius: 0.85rem;
          color: white;
          flex-shrink: 0;
        }
        .monthly-items-wrap {
          flex: 1;
          min-width: 0;
          width: 100%;
        }
        @media (max-width: 640px) {
          .monthly-day-card {
            flex-direction: column !important;
            gap: 0.65rem !important;
            padding: 0.75rem 0.85rem !important;
          }
          .monthly-date-box {
            width: 100% !important;
            min-width: 100% !important;
            display: flex !important;
            align-items: center !important;
            justifyContent: space-between !important;
            padding: 0.45rem 0.85rem !important;
            text-align: left !important;
            box-sizing: border-box !important;
          }
          .monthly-date-box-left {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
          }
        }
        @media print {
          @page {
            size: ${printOrientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
            margin: 6mm 8mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body, #root, #root *, div, section, main, article, header, nav {
            background-color: #ffffff !important;
            background-image: none !important;
            color: #0f172a !important;
            box-shadow: none !important;
            text-shadow: none !important;
            backdrop-filter: none !important;
            font-family: 'Inter', -apple-system, sans-serif !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 8.2pt !important;
          }
          nav, header, footer, .no-print, button, select, input, .weekly-grid, .screen-only-agenda {
            display: none !important;
          }
          .printable-monthly-area {
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-monthly-program-doc {
            display: block !important;
            width: 100% !important;
          }
          .print-doc-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 5px !important;
            margin-bottom: 8px !important;
          }
          .print-doc-brand {
            font-size: 10.5pt !important;
            font-weight: 900 !important;
            color: #0f172a !important;
            letter-spacing: -0.02em !important;
          }
          .print-doc-title {
            font-size: 9pt !important;
            font-weight: 800 !important;
            color: #4338ca !important;
            margin-top: 1px !important;
          }
          .print-doc-header-right {
            text-align: right !important;
            font-size: 7.8pt !important;
            color: #334155 !important;
            line-height: 1.3 !important;
          }
          .print-doc-stat {
            font-weight: 800 !important;
            color: #15803d !important;
          }
          .print-doc-date {
            color: #64748b !important;
          }
          .print-doc-days-container {
            display: ${printOrientation === 'landscape' ? 'grid' : 'flex'} !important;
            ${printOrientation === 'landscape' ? 'grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important;' : 'flex-direction: column !important; gap: 6px !important;'}
          }
          .print-day-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid #cbd5e1 !important;
            border-left: 4px solid #4f46e5 !important;
            border-radius: 5px !important;
            background: #ffffff !important;
            padding: 4px 7px !important;
          }
          .print-day-title-bar {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding-bottom: 2px !important;
            margin-bottom: 3px !important;
          }
          .print-day-date {
            font-size: 8.5pt !important;
            font-weight: 900 !important;
            color: #0f172a !important;
          }
          .print-day-meta {
            font-size: 7.2pt !important;
            font-weight: 700 !important;
            color: #64748b !important;
          }
          .print-day-tasks-table {
            display: flex !important;
            flex-direction: column !important;
            gap: 2.5px !important;
          }
          .print-task-row {
            display: flex !important;
            align-items: flex-start !important;
            gap: 5px !important;
            padding: 2.5px 4px !important;
            border-radius: 3px !important;
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            line-height: 1.2 !important;
          }
          .print-task-row.is-done {
            background: #f0fdf4 !important;
            border-color: #bbf7d0 !important;
          }
          .print-task-col-check {
            flex-shrink: 0 !important;
            padding-top: 1px !important;
          }
          .print-check-box {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 12px !important;
            height: 12px !important;
            border: 1.5px solid #64748b !important;
            border-radius: 2.5px !important;
            font-size: 7pt !important;
            font-weight: 900 !important;
            color: #15803d !important;
            line-height: 1 !important;
            background: #ffffff !important;
          }
          .print-check-box.checked {
            border-color: #16a34a !important;
            background: #dcfce7 !important;
          }
          .print-task-col-info {
            flex: 1 !important;
            min-width: 0 !important;
          }
          .print-task-subject {
            font-size: 7.8pt !important;
            font-weight: 800 !important;
            color: #0f172a !important;
          }
          .print-task-topic {
            font-size: 7.2pt !important;
            color: #334155 !important;
            font-weight: 600 !important;
            margin-top: 1px !important;
          }
          .print-task-col-details {
            display: flex !important;
            align-items: center !important;
            gap: 3px !important;
            flex-shrink: 0 !important;
            font-size: 7pt !important;
          }
          .print-pill {
            background: #e2e8f0 !important;
            color: #334155 !important;
            padding: 1px 4px !important;
            border-radius: 3px !important;
            font-weight: 700 !important;
          }
          .print-pill-q {
            background: #e0f2fe !important;
            color: #0369a1 !important;
            font-weight: 800 !important;
          }
          .print-task-col-status {
            flex-shrink: 0 !important;
          }
          .print-status-tag {
            font-size: 6.8pt !important;
            font-weight: 800 !important;
            padding: 1px 4px !important;
            border-radius: 3px !important;
          }
          .print-status-tag.done {
            background: #dcfce7 !important;
            color: #15803d !important;
          }
          .print-status-tag.pending {
            background: #f1f5f9 !important;
            color: #64748b !important;
          }
          .print-doc-footer {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-top: 1.5px solid #cbd5e1 !important;
            padding-top: 6px !important;
            margin-top: 10px !important;
            font-size: 7.2pt !important;
            color: #475569 !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* FULL-DETAIL PRINTABLE MONTHLY PROGRAM (MULTI-PAGE A4) */}
      <div className="print-monthly-program-doc">
        {/* Document Header */}
        <div className="print-doc-header">
          <div>
            <div className="print-doc-brand">E-TEST EĞİTİM & KOÇLUK PLATFORMU</div>
            <div className="print-doc-title">Aylık Ders Çalışma Programı • {monthInfo.monthTitle}</div>
          </div>
          <div className="print-doc-header-right">
            <div>Öğrenci: <strong>{currentUser?.name || currentUser?.username || 'Öğrenci'}</strong></div>
            <div className="print-doc-stat">
              Tamamlanan: {monthDoneTasks} / {monthTotalTasks} Görev (%{monthCompletionPct})
            </div>
            <div className="print-doc-date">Tarih: {new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>

        {/* Days List (Full Detail, Clean & High-Density) */}
        <div className={`print-doc-days-container ${printOrientation}`}>
          {monthInfo.daysList.filter(d => d.items.length > 0).map(d => {
            const dayDoneCount = d.items.filter(i => i.done).length;
            return (
              <div key={d.ymd} className="print-day-card">
                <div className="print-day-title-bar">
                  <div className="print-day-date">
                    📅 {d.day} {monthInfo.monthName} {monthInfo.year}, {d.dayName}
                  </div>
                  <div className="print-day-meta">
                    {d.items.length} Görev {dayDoneCount > 0 ? `(${dayDoneCount} Tamamlandı)` : ''}
                  </div>
                </div>

                <div className="print-day-tasks-table">
                  {d.items.map((item, idx) => {
                    const bookInfo = resolveBookTestInfo(item, books, bookTests);
                    return (
                      <div key={item.id || idx} className={`print-task-row ${item.done ? 'is-done' : ''}`}>
                        <div className="print-task-col-check">
                          <span className={`print-check-box ${item.done ? 'checked' : ''}`}>
                            {item.done ? '✓' : ''}
                          </span>
                        </div>
                        <div className="print-task-col-info">
                          <div className="print-task-subject">
                            {bookInfo?.isBookTest ? bookInfo.subject : (item.bookName || item.subject || 'Ders Çalışması')}
                            {bookInfo?.isBookTest && bookInfo.bookTitle ? ` — 📖 ${bookInfo.bookTitle}` : ''}
                          </div>
                          {bookInfo?.isBookTest ? (
                            <div className="print-task-topic" style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 1 }}>
                              {bookInfo.unit && <span>📂 {bookInfo.unit}</span>}
                              {bookInfo.testName && <span>🎯 {bookInfo.testName}</span>}
                            </div>
                          ) : (
                            item.topic && item.topic !== item.subject && (
                              <div className="print-task-topic">
                                {item.topic}
                              </div>
                            )
                          )}
                        </div>
                        <div className="print-task-col-details">
                          {(bookInfo?.questionCount || item.questionCount) && (
                            <span className="print-pill print-pill-q">
                              ✏️ {String(bookInfo?.questionCount || item.questionCount).includes('soru') ? (bookInfo?.questionCount || item.questionCount) : `${bookInfo?.questionCount || item.questionCount} soru`}
                            </span>
                          )}
                          {(item.startTime || item.time || item.saat) && (
                            <span className="print-pill">
                              🕐 {item.startTime ? `${item.startTime}${item.endTime ? ` → ${item.endTime}` : ''}` : (item.time || item.saat)}
                            </span>
                          )}
                          {item.hours && (
                            <span className="print-pill">
                              ⏱️ {item.hours} sa
                            </span>
                          )}
                        </div>
                        <div className="print-task-col-status">
                          <span className={`print-status-tag ${item.done ? 'done' : 'pending'}`}>
                            {item.done ? 'Tamamlandı ✓' : 'Planlandı'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Document Footer */}
        <div className="print-doc-footer">
          <div>Öğrenci İmzası: ___________________</div>
          <div>Koç / Öğretmen İmzası: ___________________</div>
          <div>Veli İmzası: ___________________</div>
        </div>
      </div>

      {/* SCREEN VIEW (INTERACTIVE AGENDA WITH CONTROLS) */}
      <div className="screen-only-agenda">
        {/* Month Navigation & Controls Bar */}
        <div className="no-print" style={{
          background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)' : '#ffffff',
          border: isDark ? '1.5px solid rgba(255, 255, 255, 0.14)' : '1.5px solid #e2e8f0',
          borderRadius: '0.95rem',
          padding: isMobile ? '0.5rem 0.65rem' : '0.85rem 1.25rem',
          marginBottom: isMobile ? '0.75rem' : '1.25rem',
          boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 6 : '0.85rem'
        }}>
          {/* Row 1: Month Title & Arrows */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6
          }}>
            <button
              onClick={() => setMonthOffset(m => m - 1)}
              style={{
                padding: isMobile ? '0.35rem 0.55rem' : '0.45rem 0.85rem',
                borderRadius: '0.6rem',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                color: isDark ? '#ffffff' : '#334155',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3
              }}
              title="Önceki Ay"
            >
              <ChevronLeft size={16} />
              {!isMobile && <span>Önceki Ay</span>}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, padding: '0 4px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <span style={{ fontSize: isMobile ? '0.88rem' : '1.1rem', fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', lineHeight: 1.2 }}>
                  📆 {monthInfo.monthTitle}
                </span>
                {monthOffset !== 0 && (
                  <button
                    onClick={() => setMonthOffset(0)}
                    style={{
                      padding: '1px 6px',
                      borderRadius: 99,
                      background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                      color: 'white',
                      border: 'none',
                      fontWeight: 900,
                      fontSize: '0.62rem',
                      cursor: 'pointer'
                    }}
                  >
                    Bu Ay
                  </button>
                )}
              </div>
              <span style={{ fontSize: isMobile ? '0.66rem' : '0.74rem', color: isDark ? '#4ade80' : '#16a34a', fontWeight: 800, marginTop: 1 }}>
                {monthDoneTasks}/{monthTotalTasks} Tamamlandı (%{monthCompletionPct})
              </span>
            </div>

            <button
              onClick={() => setMonthOffset(m => m + 1)}
              style={{
                padding: isMobile ? '0.35rem 0.55rem' : '0.45rem 0.85rem',
                borderRadius: '0.6rem',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                color: isDark ? '#ffffff' : '#334155',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3
              }}
              title="Sonraki Ay"
            >
              {!isMobile && <span>Sonraki Ay</span>}
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Row 2: Filters & Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            flexWrap: 'wrap',
            paddingTop: 4,
            borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9'
          }}>
            <button
              onClick={() => setOnlyWithTasks(v => !v)}
              style={{
                padding: isMobile ? '0.25rem 0.6rem' : '0.35rem 0.75rem',
                borderRadius: 99,
                background: onlyWithTasks ? (isDark ? 'rgba(99,102,241,0.25)' : '#eef2ff') : (isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc'),
                border: onlyWithTasks ? '1.5px solid #818cf8' : (isDark ? '1px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0'),
                color: onlyWithTasks ? (isDark ? '#a5b4fc' : '#4f46e5') : (isDark ? 'rgba(255,255,255,0.7)' : '#64748b'),
                fontWeight: 800,
                fontSize: isMobile ? '0.7rem' : '0.75rem',
                cursor: 'pointer'
              }}
            >
              {onlyWithTasks ? '🔍 Sadece Görevli Günler' : '📋 Tüm Günler'}
            </button>

            {/* Print Buttons */}
            <div style={{ display: 'inline-flex', alignItems: 'center', background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', padding: 2, borderRadius: 99, border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1' }}>
              <button
                onClick={() => handlePrint('landscape')}
                style={{
                  padding: isMobile ? '0.25rem 0.55rem' : '0.35rem 0.75rem',
                  borderRadius: 99,
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.68rem' : '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
                }}
                title="A4 Yatay (Landscape) olarak yazdır / PDF kaydet"
              >
                <Printer size={12} /> {isMobile ? 'Yazdır' : '📄 Yatay Yazdır'}
              </button>
              {!isMobile && (
                <button
                  onClick={() => handlePrint('portrait')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: 99,
                    background: 'transparent',
                    border: 'none',
                    color: isDark ? '#ffffff' : '#334155',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                  title="A4 Dikey (Portrait) olarak yazdır / PDF kaydet"
                >
                  📄 Dikey
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Days Agenda List (Screen) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredDays.map(d => {
            const taskIcons = { konu: '📖', soru: '✏️', tekrar: '🔄', kitap: '📚', deneme: '📊', ödev: '📝', diger: '✨' };
            const theme = DAY_THEMES[d.dayKey] || DAY_THEMES['Pzt'];
            return (
              <div
                key={d.ymd}
                className="monthly-day-card"
                style={{
                  background: d.isToday ? (isDark ? 'linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(49, 46, 129, 0.95))' : 'linear-gradient(135deg, #ffffff, #f5f3ff)') : (isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)' : '#ffffff'),
                  border: d.isToday ? '2px solid #818cf8' : (isDark ? '1.5px solid rgba(255, 255, 255, 0.14)' : `1.5px solid ${theme.border}`),
                  borderLeft: `5px solid ${d.isToday ? '#818cf8' : theme.text}`,
                  borderRadius: '1rem',
                  padding: '0.85rem 1.1rem',
                  boxShadow: d.isToday ? (isDark ? '0 8px 30px rgba(99,102,241,0.35)' : '0 6px 20px rgba(99,102,241,0.15)') : (isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.03)'),
                  backdropFilter: isDark ? 'blur(20px)' : 'none'
                }}
              >
                {/* Date Box with Day Theme Gradient */}
                <div
                  className="monthly-date-box"
                  style={{
                    background: d.isToday ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : theme.gradient,
                    boxShadow: d.isToday ? '0 4px 14px rgba(79,70,229,0.35)' : '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <div className="monthly-date-box-left">
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1 }}>{d.day}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.95, marginTop: 2 }}>{d.dayName}</div>
                  </div>
                  {d.isToday && (
                    <div style={{ fontSize: '0.6rem', fontWeight: 900, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '2px 6px', borderRadius: 4, marginTop: 2 }}>
                      BUGÜN
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="monthly-items-wrap">
                  {d.items.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontWeight: 600, fontStyle: 'italic', padding: '0.35rem 0' }}>
                      Programlanan ders görevi yok
                    </div>
                  ) : (() => {
                    const isShowAllMonthTasks = !!expandedMonthDays[d.ymd] || !isMobile;
                    const MAX_MONTH_ITEMS = 4;
                    const shouldShowMoreBtn = isMobile && d.items.length > MAX_MONTH_ITEMS;
                    const displayedMonthItems = (shouldShowMoreBtn && !isShowAllMonthTasks) ? d.items.slice(0, MAX_MONTH_ITEMS) : d.items;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        {displayedMonthItems.map((item, idx) => {
                          const icon = taskIcons[item.taskType] || '📌';
                          const tt = TASK_TYPES.find(t => t.id === item.taskType);
                          const isClickable = Boolean(item.isAutoHomework || item.roadmapAssignmentId || item.testId || item.hwId);
                          const bookInfo = resolveBookTestInfo(item, books, bookTests);

                          // Deduplicate titles and extract page numbers
                          let rawTitle = bookInfo?.testName || item.topic || (bookInfo?.isBookTest ? 'Konu Testi' : (item.bookName || item.subject || 'Görev'));
                          let pageBadge = null;
                          const pageMatch = rawTitle.match(/^(\d+(?:[-–]\d+)?\.\s*(?:Sayfa|s\.)|\s*s\.\s*\d+(?:[-–]\d+)?)\s*/i);
                          if (pageMatch) {
                            pageBadge = pageMatch[0].trim();
                            rawTitle = rawTitle.substring(pageMatch[0].length).trim();
                          }

                          const rawBook = (bookInfo?.bookTitle || item.bookName || '')
                            .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
                            .replace(/\s*\(Tüm Kitap\)/gi, '')
                            .replace(/\s*\(Kendi Eklediğim\)/gi, '')
                            .trim();

                          const unitText = bookInfo?.unit && rawBook && bookInfo.unit.toLowerCase() !== rawBook.toLowerCase() && !rawBook.toLowerCase().includes(bookInfo.unit.toLowerCase())
                            ? bookInfo.unit
                            : null;

                          const subjectName = bookInfo?.subject || item.subject || 'Ders';

                          // Subject-based theme
                          const getSubjTheme = (sub) => {
                            const s = (sub || '').toLowerCase();
                            if (s.includes('türkçe') || s.includes('paragraf')) return { color: '#2563eb', bg: 'rgba(37,99,235,0.12)', border: 'rgba(59,130,246,0.3)' };
                            if (s.includes('matematik')) return { color: '#d97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(245,158,11,0.3)' };
                            if (s.includes('fen')) return { color: '#059669', bg: 'rgba(5,150,105,0.12)', border: 'rgba(16,185,129,0.3)' };
                            if (s.includes('sosyal') || s.includes('tarih')) return { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', border: 'rgba(139,92,246,0.3)' };
                            if (s.includes('ingilizce') || s.includes('dil')) return { color: '#db2777', bg: 'rgba(219,39,119,0.12)', border: 'rgba(236,72,153,0.3)' };
                            if (s.includes('din')) return { color: '#0891b2', bg: 'rgba(8,145,178,0.12)', border: 'rgba(6,182,212,0.3)' };
                            return { color: '#4f46e5', bg: 'rgba(79,70,229,0.12)', border: 'rgba(99,102,241,0.3)' };
                          };
                          const subjTheme = getSubjTheme(subjectName);

                          return (
                            <div
                              key={item.id || idx}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.45rem',
                                background: item.done ? (isDark ? 'rgba(5,150,105,0.12)' : '#f0fdf4') : (isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'),
                                border: item.done ? (isDark ? '1px solid rgba(52,211,153,0.3)' : '1px solid #bbf7d0') : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1.5px solid #e2e8f0'),
                                borderLeft: `4px solid ${item.done ? '#10b981' : subjTheme.color}`,
                                borderRadius: '0.75rem',
                                padding: isMobile ? '0.65rem 0.75rem' : '0.65rem 0.85rem',
                                boxShadow: item.done ? 'none' : (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.04)'),
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {/* Top Row: Checkbox + Badges + Title */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onToggle) onToggle(d.dayKey, item.id);
                                    }}
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: '50%',
                                      border: item.done ? 'none' : (isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid #cbd5e1'),
                                      background: item.done ? '#10b981' : 'transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      padding: 0,
                                      flexShrink: 0,
                                      marginTop: 1,
                                      boxShadow: item.done ? '0 2px 6px rgba(16,185,129,0.3)' : 'none',
                                      transition: 'all 0.15s ease'
                                    }}
                                    title={item.done ? 'Tamamlandı' : 'Tamamla'}
                                  >
                                    {item.done && <Check size={13} color="white" strokeWidth={3} />}
                                  </button>

                                  <div
                                    onClick={() => {
                                      if (isClickable && onOpenResult) {
                                        onOpenResult(item);
                                      } else if (onToggle) {
                                        onToggle(d.dayKey, item.id);
                                      }
                                    }}
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      cursor: isClickable || onToggle ? 'pointer' : 'default',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 3
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                      <span style={{
                                        fontSize: '0.64rem',
                                        fontWeight: 900,
                                        color: subjTheme.color,
                                        background: subjTheme.bg,
                                        border: `1px solid ${subjTheme.border}`,
                                        padding: '1px 6px',
                                        borderRadius: 5,
                                        flexShrink: 0
                                      }}>
                                        {subjectName}
                                      </span>

                                      {(item.type === 'remedialTest' || item.isTeacherRemedial || String(item.text || '').includes('Tekrar')) && (
                                        <span style={{
                                          fontSize: '0.64rem',
                                          fontWeight: 900,
                                          color: '#e11d48',
                                          background: isDark ? 'rgba(225,29,72,0.18)' : '#ffe4e6',
                                          border: '1px solid rgba(225,29,72,0.3)',
                                          padding: '1px 6px',
                                          borderRadius: 5,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 3,
                                          flexShrink: 0
                                        }}>
                                          ✂️ Telafi Testi {item.stage ? `(${item.stage}. Aşama)` : ''}
                                        </span>
                                      )}

                                      {pageBadge && (
                                        <span style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 800,
                                          color: isDark ? '#94a3b8' : '#475569',
                                          background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                          padding: '1px 5px',
                                          borderRadius: 5,
                                          flexShrink: 0
                                        }}>
                                          📄 {pageBadge}
                                        </span>
                                      )}

                                      <span style={{
                                        fontSize: isMobile ? '0.82rem' : '0.86rem',
                                        fontWeight: 800,
                                        lineHeight: 1.3,
                                        color: item.done ? (isDark ? '#4ade80' : '#166534') : (isDark ? '#ffffff' : '#0f172a'),
                                        textDecoration: item.done ? 'line-through' : 'none',
                                        wordBreak: 'break-word'
                                      }}>
                                        {rawTitle}
                                      </span>
                                    </div>

                                    {/* Meta info: Book, Unit, Question count */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', fontSize: '0.68rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontWeight: 600 }}>
                                      {rawBook && (
                                        <span style={{
                                          color: isDark ? 'rgba(255,255,255,0.85)' : '#334155',
                                          fontWeight: 700,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          maxWidth: isMobile ? 180 : 300,
                                          background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                                          padding: '1px 5px',
                                          borderRadius: 4,
                                          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
                                        }}>
                                          📖 {rawBook}
                                        </span>
                                      )}
                                      {unitText && (
                                        <span style={{ color: isDark ? '#93c5fd' : '#1d4ed8', fontWeight: 700 }}>
                                          📌 {unitText}
                                        </span>
                                      )}
                                      {(bookInfo?.questionCount || item.questionCount) && (
                                        <span style={{ background: isDark ? 'rgba(2,132,199,0.15)' : '#f0f9ff', color: '#0284c7', padding: '1px 5px', borderRadius: 4, border: isDark ? '1px solid rgba(2,132,199,0.25)' : '1px solid #bae6fd', fontWeight: 700 }}>
                                          {String(bookInfo?.questionCount || item.questionCount).includes('soru') ? (bookInfo?.questionCount || item.questionCount) : `${bookInfo?.questionCount || item.questionCount} soru`}
                                        </span>
                                      )}
                                      {(item.startTime || item.endTime || item.time || item.saat) && (
                                        <span style={{
                                          fontSize: '0.64rem',
                                          fontWeight: 800,
                                          color: isDark ? '#c7d2fe' : '#4f46e5',
                                          background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                                          border: isDark ? '1px solid rgba(165,180,252,0.3)' : '1px solid #c7d2fe',
                                          padding: '1px 5px',
                                          borderRadius: 4
                                        }}>
                                          🕐 {item.startTime ? `${item.startTime}${item.endTime ? ` → ${item.endTime}` : ''}` : (item.time || item.saat)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Actions on right */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                  {item.done ? (
                                    <span style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 900,
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: 6,
                                      background: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
                                      border: '1px solid rgba(16,185,129,0.3)',
                                      color: '#10b981',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      ✓ Tamam
                                    </span>
                                  ) : (
                                    <>
                                      {onStartStudy && (
                                        <button
                                          type="button"
                                          onClick={() => onStartStudy(item)}
                                          style={{
                                            background: isDark ? 'rgba(245,158,11,0.18)' : '#fef3c7',
                                            border: isDark ? '1px solid rgba(245,158,11,0.35)' : '1px solid #fde68a',
                                            cursor: 'pointer',
                                            color: '#d97706',
                                            padding: '0.3rem 0.5rem',
                                            borderRadius: 6,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 3,
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            whiteSpace: 'nowrap'
                                          }}
                                          title="Çalışma Odası"
                                        >
                                          <Play size={10} fill="#d97706" /> Oda
                                        </button>
                                      )}

                                      {isClickable && onOpenResult && (
                                        (() => {
                                          const lockStatus = getRemedialLockStatus(item, null, submissions, effectiveStudentId);
                                          if (lockStatus.isLocked) {
                                            return (
                                              <button
                                                type="button"
                                                onClick={() => alert(lockStatus.lockMessage)}
                                                style={{
                                                  background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
                                                  cursor: 'pointer',
                                                  color: isDark ? '#94a3b8' : '#64748b',
                                                  padding: '0.3rem 0.65rem',
                                                  borderRadius: 6,
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: 4,
                                                  fontSize: '0.72rem',
                                                  fontWeight: 900,
                                                  whiteSpace: 'nowrap'
                                                }}
                                                title={lockStatus.lockMessage}
                                              >
                                                <Lock size={12} color="#f59e0b" />
                                                <span>{lockStatus.daysLeft === 1 ? 'Yarın Açılacak' : lockStatus.formattedDate}</span>
                                              </button>
                                            );
                                          }
                                          return (
                                            <button
                                              type="button"
                                              onClick={() => onOpenResult(item)}
                                              style={{
                                                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#ffffff',
                                                padding: '0.3rem 0.65rem',
                                                borderRadius: 6,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3,
                                                fontSize: '0.72rem',
                                                fontWeight: 900,
                                                boxShadow: '0 2px 6px rgba(79,70,229,0.3)',
                                                whiteSpace: 'nowrap'
                                              }}
                                            >
                                              {item.isRemedial && item.stage > 1 ? <RotateCcw size={12} /> : <PlayCircle size={12} />} {item.isRemedial && item.stage > 1 ? `${item.stage}. Çözüm` : 'Çöz'}
                                            </button>
                                          );
                                        })()
                                      )}
                                    </>
                                  )}

                                  {canStudentDeleteItem(item, currentUser) && onEditClick && (
                                    <button
                                      type="button"
                                      onClick={() => onEditClick(d.dayKey, item)}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8',
                                        padding: 3,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                      title="Görevi Düzenle"
                                    >
                                      <Edit3 size={13} />
                                    </button>
                                  )}

                                  {canStudentDeleteItem(item, currentUser) && onDelete && (
                                    <button
                                      type="button"
                                      onClick={() => onDelete(d.dayKey, item.id)}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: isDark ? 'rgba(255,255,255,0.3)' : '#cbd5e1',
                                        padding: 3,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                      title="Görevi Sil"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {shouldShowMoreBtn && (
                          <div style={{ padding: '0.25rem 0' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedMonthDays(prev => ({ ...prev, [d.ymd]: !prev[d.ymd] }))}
                              style={{
                                width: '100%',
                                padding: '0.6rem 1rem',
                                borderRadius: '0.8rem',
                                background: isDark
                                  ? (isShowAllMonthTasks ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.15)')
                                  : (isShowAllMonthTasks ? '#f1f5f9' : 'rgba(99,102,241,0.08)'),
                                border: isDark
                                  ? '1px solid rgba(99,102,241,0.3)'
                                  : (isShowAllMonthTasks ? '1px solid #cbd5e1' : '1.5px solid rgba(99,102,241,0.25)'),
                                color: isDark ? '#a5b4fc' : '#4f46e5',
                                fontWeight: 900,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                boxShadow: '0 2px 8px rgba(99,102,241,0.08)',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {isShowAllMonthTasks ? (
                                <>
                                  <ChevronUp size={15} />
                                  <span>Daha Az Göster (İlk 4 Görev)</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={15} />
                                  <span>Diğer {d.items.length - MAX_MONTH_ITEMS} Görevi Göster</span>
                                  <span style={{ fontSize: '0.68rem', background: '#6366f1', color: 'white', padding: '1px 6px', borderRadius: 99, fontWeight: 900 }}>
                                    +{d.items.length - MAX_MONTH_ITEMS}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── ProgramCenter (Main shared component) ─── */
export default function ProgramCenter({
  weeklyProgram,
  setWeeklyProgram,
  topicPool,
  setTopicPool,
  isDark: propIsDark = false,
  studentId = null,
  targetStudent = null
}) {
  const { theme } = useTheme();
  const isDark = propIsDark || theme === 'dark';
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [programTab, setProgramTab] = useState('haftalik');
  const [addingToDay, setAddingToDay] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyPrintOrientation, setWeeklyPrintOrientation] = useState('landscape');
  const todayKey = getTodayKey();
  const [selectedDayFilter, setSelectedDayFilter] = useState(() => getTodayKey()); // 'all' | 'Pzt' | 'Sal' | 'Çrş' | 'Prş' | 'Cum' | 'Cts' | 'Paz' (Varsayılan: Bugün)
  const [weeklySubView, setWeeklySubView] = useState('agenda'); // default 'agenda' (Liste / Ajanda görünümü)
  const [collapsedAgendaDays, setCollapsedAgendaDays] = useState({});
  const [expandedDayTasks, setExpandedDayTasks] = useState({});
  const [daySearchQueries, setDaySearchQueries] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  const handlePrevDay = useCallback(() => {
    const currentIndex = DAYS.findIndex(d => d.key === selectedDayFilter);
    if (currentIndex > 0) {
      setSelectedDayFilter(DAYS[currentIndex - 1].key);
    } else if (currentIndex === 0) {
      setWeekOffset(w => w - 1);
      setSelectedDayFilter('Paz');
    }
  }, [selectedDayFilter]);

  const handleNextDay = useCallback(() => {
    const currentIndex = DAYS.findIndex(d => d.key === selectedDayFilter);
    if (currentIndex >= 0 && currentIndex < DAYS.length - 1) {
      setSelectedDayFilter(DAYS[currentIndex + 1].key);
    } else if (currentIndex === DAYS.length - 1) {
      setWeekOffset(w => w + 1);
      setSelectedDayFilter('Pzt');
    }
  }, [selectedDayFilter]);

  const handleWeeklyPrint = (orientation) => {
    setWeeklyPrintOrientation(orientation);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const hwContext = useHomework();
  const authContext = useAuth();
  const evalContext = useEvaluation();
  const currContext = useCurriculum();
  const trackedBooksContext = useTrackedBooks();
  const userContext = useUser();

  const allHomeworks = hwContext?.homeworks || [];
  const currentUser = authContext?.currentUser;
  const users = userContext?.users || [];

  // Effective Student (Supports teacher viewing student's program)
  const effectiveUser = useMemo(() => {
    if (targetStudent) return targetStudent;
    if (studentId) {
      const found = users.find(u => String(u.id) === String(studentId));
      if (found) return found;
      return { id: studentId, name: 'Öğrenci', username: 'student' };
    }
    return currentUser;
  }, [targetStudent, studentId, users, currentUser]);

  const effectiveStudentId = effectiveUser?.id;

  const submissions = evalContext?.submissions || [];
  const curData = currContext?.curriculumData;
  const bookTests = trackedBooksContext?.bookTests || [];
  const books = trackedBooksContext?.books || [];

  const studyPlanContext = useStudyPlan();
  const studyPlans = studyPlanContext?.studyPlans || [];
  const studyAssignments = studyPlanContext?.studyAssignments || [];

  const handleOpenTaskResult = useCallback((item) => {
    if (!item) return;
    const sId = effectiveStudentId;
    const fromPath = location.pathname || '/my-program';

    if (item.roadmapAssignmentId) {
      navigate(`/student/study-plan/${item.roadmapAssignmentId}`, { state: { from: fromPath } });
      return;
    }

    // 0. Dedicated Remedial Spaced Repetition Test Handling (Always opens solving screen in retake mode)
    const isRemedial = Boolean(
      item.type === 'remedialTest' ||
      item.isTeacherRemedial ||
      item.isRemedial ||
      item.isRemedialTest ||
      /telafi/i.test(item.text || item.title || '')
    );

    if (isRemedial) {
      const remedialTargetId = item.realTestId || item.testId || item.hwId || item.id;
      navigate(`/quiz/${remedialTargetId}${sId ? `?studentId=${sId}` : ''}&retake=true&mode=solve`, {
        state: { from: fromPath, retake: true, mode: 'solve' }
      });
      return;
    }

    // 1. Check explicit submissionId
    if (item.submissionId) {
      navigate(`/review/${item.submissionId}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
      return;
    }
    if (item.submission?.id) {
      navigate(`/review/${item.submission.id}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
      return;
    }

    const hwObj = item.hwId ? (allHomeworks || []).find(h => String(h.id) === String(item.hwId)) : null;
    const matchingBook = books?.find(b => String(b.id) === String(hwObj?.bookId || item.bookId));

    const targetBookTestId = item.bookTestId || item.testId || item.realTestId ||
      (item.taskType === 'kitap' && item.id && !String(item.id).startsWith('auto_hw') && !String(item.id).startsWith('hw_') ? item.id : null) ||
      (hwObj?.tests && hwObj.tests.length === 1 ? hwObj.tests[0] : null);

    const isBook = Boolean(
      item.isBookTask ||
      item.isBookAssignment ||
      item.taskType === 'kitap' ||
      item.sourceType === 'trackedBook' ||
      item.sourceType === 'bookTest' ||
      targetBookTestId
    );

    const isExam = !isBook && Boolean(
      item.isExamTask ||
      item.taskType === 'deneme' ||
      item.type === 'physicalExam' ||
      hwObj?.type === 'physicalExam' ||
      hwObj?.contentType === 'physicalExam' ||
      matchingBook?.bookType === 'exam' ||
      hwObj?.isPhysical ||
      (hwObj?.title && /deneme|sınav|hazır bulunuşluk|hazir bulunusluk/i.test(hwObj.title))
    );

    // 1. If item is marked completed or done -> open review
    if (item.done || item.isCompleted || item.status === 'completed') {
      if (item.submissionId) {
        navigate(`/review/${item.submissionId}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
        return;
      }
      if (item.submission?.id) {
        navigate(`/review/${item.submission.id}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
        return;
      }

      // Search for specific completed submission
      const matchedSub = (submissions || []).find(s => {
        if (s.status === 'in_progress' || s.status === 'draft') return false;
        const sStdId = String(s.studentId || s.student_id || s.userId || '');
        const isSt = sStdId === String(sId) || (sId && toUUID(sStdId) === toUUID(sId));
        if (!isSt) return false;

        if (targetBookTestId) {
          const sTid = String(s.testId || s.test_id || s.realTestId || s.bookTestId || '');
          return sTid === String(targetBookTestId) || (toUUID(sTid) && toUUID(sTid) === toUUID(targetBookTestId));
        }

        const candidateKeys = [item.testId, item.realTestId, item.hwId, item.id].filter(Boolean).map(String);
        const subKeys = [s.id, s.testId, s.realTestId, s.bookTestId, s.hwId, ...(s.bookTestIds || [])].filter(Boolean).map(String);
        return candidateKeys.some(ck => subKeys.includes(ck) || (toUUID(ck) && subKeys.includes(toUUID(ck))));
      });

      if (matchedSub) {
        navigate(`/review/${matchedSub.id}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
        return;
      }

      const reviewTarget = targetBookTestId || item.realTestId || item.testId || item.hwId || item.id;
      if (reviewTarget) {
        navigate(`/quiz-review/${reviewTarget}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
        return;
      }
    }

    // 2. Not completed -> Solve task
    // If it is a book test -> ALWAYS navigate to book-quiz
    if (targetBookTestId) {
      navigate(`/book-quiz/${targetBookTestId}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
      return;
    }

    if (isExam) {
      navigate(`/physical-exam/${item.hwId || item.realTestId || item.testId || item.id}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
      return;
    }

    if (item.hwId) {
      if (hwObj?.isBookAssignment && hwObj?.tests && hwObj.tests.length > 0) {
        navigate(`/book-quiz/${hwObj.tests[0]}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
      } else {
        navigate(`/quiz/${item.hwId}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
      }
      return;
    }

    if (item.id && String(item.id).startsWith('hw_')) {
      const cleanId = String(item.id).replace('hw_', '');
      navigate(`/quiz/${cleanId}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
      return;
    }

    if (item.id) {
      navigate(`/quiz/${item.id}${sId ? `?studentId=${sId}` : ''}`, { state: { from: fromPath } });
      return;
    }
  }, [navigate, effectiveStudentId, allHomeworks, books, submissions, location.pathname]);

  const handleStartInStudyRoom = useCallback((item) => {
    if (!item) return;

    let qCount = 20;
    const countStr = String(item.questionCount || item.targetQuestions || item.text || item.topic || '');
    const numMatch = countStr.match(/(\d+)\s*(?:soru|q|test)?/i);
    if (numMatch && parseInt(numMatch[1], 10) > 0) {
      qCount = parseInt(numMatch[1], 10);
    } else if (typeof item.questionCount === 'number' && item.questionCount > 0) {
      qCount = item.questionCount;
    }

    const itemText = String(item.text || item.topic || item.note || item.unit || '').trim();
    const itemBookName = String(item.bookName || item.title || '').trim();
    const itemSubject = String(item.subject || '').trim();

    // 1. Find book in tracked books (match by bookName or title or subject)
    let matchedBook = (books || []).find(b => {
      if (!b) return false;
      const bTitle = (b.title || '').toLowerCase();
      if (item.bookId && String(b.id) === String(item.bookId)) return true;
      if (itemBookName && (bTitle.includes(itemBookName.toLowerCase()) || itemBookName.toLowerCase().includes(bTitle))) return true;
      if (itemSubject && bTitle.includes(itemSubject.toLowerCase())) return true;
      return false;
    });

    // 2. Find matching test in bookTests
    let matchedTest = null;
    if (item.testId || item.bookTestId || item.realTestId) {
      const searchTid = String(item.testId || item.bookTestId || item.realTestId);
      matchedTest = (bookTests || []).find(t => String(t.id) === searchTid || toUUID(t.id) === searchTid);
    }

    if (!matchedTest && matchedBook) {
      const bookTestsList = (bookTests || []).filter(t => String(t.bookId) === String(matchedBook.id));
      if (bookTestsList.length > 0) {
        // Try matching test name or unit with itemText / topic / unit / note
        const searchTerms = [itemText, item.topic, item.unit, item.note].filter(Boolean).map(s => String(s).toLowerCase());
        for (const term of searchTerms) {
          const found = bookTestsList.find(t => {
            const tName = (t.name || t.title || '').toLowerCase();
            const tUnit = (t.unit || t.unitName || '').toLowerCase();
            const tTopic = (t.topic || t.topicName || '').toLowerCase();
            return tName.includes(term) || term.includes(tName) || tUnit.includes(term) || term.includes(tUnit) || tTopic.includes(term) || term.includes(tTopic);
          });
          if (found) {
            matchedTest = found;
            break;
          }
        }

        // If still not matched, find first unsolved test for this student in this book
        if (!matchedTest) {
          const unsolvedTest = bookTestsList.find(t => {
            return !checkIsTaskSolved({ testId: t.id, bookTestId: t.id, taskType: 'kitap' }, effectiveStudentId, submissions, allHomeworks, studyAssignments);
          });
          matchedTest = unsolvedTest || bookTestsList[0];
        }
      }
    }

    const finalSubject = matchedTest?.subject || matchedBook?.subject || item.subject || 'Genel';
    const finalUnit = matchedTest?.unit || matchedTest?.unitName || item.unit || '';
    const finalTopic = matchedTest?.topic || matchedTest?.topicName || item.topic || item.text || '';
    const finalBookTitle = matchedBook?.title || item.bookName || null;
    const finalTestName = matchedTest?.name || matchedTest?.title || (finalUnit ? `${finalUnit} Testi` : (item.taskType === 'kitap' ? `${finalBookTitle} Testi` : 'Ders Çalışması'));
    
    if (matchedTest && matchedTest.questionCount) {
      qCount = Number(matchedTest.questionCount) || qCount;
    } else if (matchedTest?.answerKey) {
      qCount = typeof matchedTest.answerKey === 'object' ? Object.keys(matchedTest.answerKey).length : qCount;
    }

    const isTaskOE = Boolean(
      matchedTest?.isOpenEnded === true ||
      matchedTest?.is_open_ended === true ||
      matchedTest?.questionType === 'acik_uclu' ||
      matchedTest?.question_type === 'acik_uclu' ||
      matchedTest?.type === 'acik_uclu' ||
      matchedTest?.type === 'gorsel_klasik' ||
      matchedTest?.answerKey?.__meta?.isOpenEnded === true ||
      matchedTest?.answerKey?.__meta?.questionType === 'acik_uclu' ||
      matchedTest?.answer_key?.__meta?.isOpenEnded === true ||
      matchedTest?.answer_key?.__meta?.questionType === 'acik_uclu' ||
      matchedBook?.bookType === 'open_ended' ||
      matchedBook?.book_type === 'open_ended' ||
      item.isOpenEnded === true ||
      item.is_open_ended === true ||
      item.questionType === 'acik_uclu' ||
      item.question_type === 'acik_uclu' ||
      (matchedTest?.name && /açık\s*uçlu|acik\s*uclu|problem/i.test(matchedTest.name)) ||
      (item.text && /açık\s*uçlu|acik\s*uclu|problem/i.test(item.text))
    );

    const taskPayload = {
      id: item.id,
      title: finalBookTitle ? `${finalBookTitle} — ${finalTestName}` : (finalUnit ? `${finalSubject} • ${finalUnit}` : `${finalSubject} Çalışması`),
      subject: finalSubject,
      unit: finalUnit,
      topic: finalTopic,
      text: item.text || '',
      bookTitle: finalBookTitle,
      testName: finalTestName,
      bookId: matchedBook?.id || null,
      questionCount: qCount,
      testId: matchedTest?.id || item.testId || item.realTestId || item.bookTestId || null,
      bookTestId: matchedTest?.id || item.bookTestId || item.testId || null,
      realTestId: matchedTest?.id || item.realTestId || item.testId || null,
      hwId: item.hwId || null,
      roadmapAssignmentId: item.roadmapAssignmentId || null,
      sourceType: item.roadmapAssignmentId ? 'roadmap' : (matchedTest || item.taskType === 'kitap') ? 'bookTest' : item.hwId ? 'homework' : 'program',
      sourceLabel: item.roadmapAssignmentId ? '🗺️ Yol Haritası' : (matchedTest || item.taskType === 'kitap') ? '📚 Kitap Testi' : item.hwId ? '📝 Atanmış Ödev' : '📅 Ders Programı',
      isOpenEnded: isTaskOE,
      questionType: isTaskOE ? 'acik_uclu' : 'coktan_secmeli',
      answerKey: matchedTest?.answerKey || item.answerKey || null,
      autoStart: true
    };

    try {
      localStorage.setItem('study_active_selected_task', JSON.stringify(taskPayload));
    } catch(e) {}

    navigate('/study-room', { state: { autoStartTask: taskPayload, autoStart: true } });
  }, [navigate, books, bookTests, effectiveStudentId, submissions, allHomeworks, studyAssignments]);

  const weekInfo = useMemo(() => {
    const MONTHS_TR = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    
    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weekOffset * 7);

    const currentDayIdx = baseDate.getDay();
    const mondayDiff = baseDate.getDate() - (currentDayIdx === 0 ? 6 : currentDayIdx - 1);
    const mondayDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), mondayDiff);

    const sundayDate = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + 6);

    const monMonthStr = MONTHS_TR[mondayDate.getMonth()];
    const sunMonthStr = MONTHS_TR[sundayDate.getMonth()];
    const yearStr = sundayDate.getFullYear();

    let monthTitle = '';
    if (monMonthStr === sunMonthStr) {
      monthTitle = `${monMonthStr} ${yearStr}`;
    } else {
      monthTitle = `${monMonthStr} - ${sunMonthStr} ${yearStr}`;
    }

    const rangeStr = `${mondayDate.getDate()} ${monMonthStr.slice(0, 3)} – ${sundayDate.getDate()} ${sunMonthStr.slice(0, 3)} ${yearStr}`;

    return {
      mondayDate,
      sundayDate,
      monthTitle,
      rangeStr
    };
  }, [weekOffset]);

  const processedWeeklyProgram = useMemo(() => {
    if (!weeklyProgram || !Array.isArray(weeklyProgram)) return [];

    const mondayDate = weekInfo.mondayDate;
    const dayDateMap = {};
    DAYS.forEach((dMeta, idx) => {
      const d = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + idx);
      const ymd = getLocalYMD(d);
      dayDateMap[dMeta.key] = {
        ymd,
        time: d.getTime(),
        dateLabel: `${d.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]}`
      };
    });

    if (!effectiveUser) {
      return weeklyProgram.map(dayObj => ({
        ...dayObj,
        dateLabel: dayDateMap[dayObj.day]?.dateLabel || ''
      }));
    }

    const studentId = effectiveUser.id;
    const studentIdStr = String(studentId || '');
    const studentUuidStr = String(toUUID(studentId) || '');

    const isMatchStudent = (s) => {
      if (!studentId) return true;
      const sId = String(s.studentId || s.student_id || s.user_id || '');
      return sId === studentIdStr || (studentUuidStr && sId === studentUuidStr) || (studentUuidStr && toUUID(sId) === studentUuidStr);
    };

    const solvedIdsSet = new Set();
    (submissions || []).forEach(s => {
      if (!s || !isMatchStudent(s) || s.status === 'in_progress' || s.status === 'draft') return;
      const ids = [s.id, s.testId, s.test_id, s.realTestId, s.bookTestId, s.hwId, s.homeworkId, s.homework_id, s.metadata?.realTestId, s.metadata?.bookTestId, s.metadata?.realId, s.metadata?.testId];
      if (Array.isArray(s.bookTestIds)) ids.push(...s.bookTestIds);
      ids.forEach(id => {
        if (!id) return;
        const str = String(id);
        const clean = str.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
        solvedIdsSet.add(str);
        solvedIdsSet.add(clean);
        solvedIdsSet.add(`bt_${clean}`);
        const u = toUUID(clean || str);
        if (u) solvedIdsSet.add(String(u));
      });
    });

    (allHomeworks || []).forEach(hw => {
      if (hw.submissions && Array.isArray(hw.submissions)) {
        hw.submissions.forEach(s => {
          if (!s || !isMatchStudent(s) || s.status === 'in_progress' || s.status === 'draft') return;
          const ids = [s.id, s.testId, s.test_id, s.bookTestId, s.realTestId];
          ids.forEach(id => {
            if (!id) return;
            const str = String(id);
            const clean = str.replace(/^bt_/, '').replace(/^q_/, '').replace(/^tbt_/, '');
            solvedIdsSet.add(str);
            solvedIdsSet.add(clean);
            solvedIdsSet.add(`bt_${clean}`);
            const u = toUUID(clean || str);
            if (u) solvedIdsSet.add(String(u));
          });
        });
      }
    });

    const studentGrades = curData?.grades || [];

    const studentHomeworks = (allHomeworks || []).filter(hw => {
      return isHomeworkForStudent(hw, effectiveUser, studentGrades);
    });

    const allDailyItems = [];
    (weeklyProgram || []).forEach(dObj => {
      (dObj.items || []).forEach(item => {
        if ((item.repeatType === 'daily' || item.isDaily) && !allDailyItems.some(i => i.id === item.id)) {
          allDailyItems.push(item);
        }
      });
    });

    return weeklyProgram.map(dayObj => {
      const dayInfo = dayDateMap[dayObj.day];
      if (!dayInfo) return dayObj;

      let manualItems = (dayObj.items || []).filter(item => {
        if (item.createdYMD && dayInfo.ymd < item.createdYMD) return false;
        if (item.repeatEndDate && dayInfo.ymd > item.repeatEndDate) return false;
        if (item.repeatType === 'none' || item.isRecurring === false) {
          const itemCreatedYMD = item.createdYMD || getLocalYMD(new Date());
          return isSameWeek(dayInfo.ymd, itemCreatedYMD);
        }
        return true;
      });

      allDailyItems.forEach(dItem => {
        if (dItem.createdYMD && dayInfo.ymd < dItem.createdYMD) return;
        if (dItem.repeatEndDate && dayInfo.ymd > dItem.repeatEndDate) return;
        if (!manualItems.some(i => i.id === dItem.id)) {
          manualItems.push(dItem);
        }
      });
      // Map manual items to dynamically reflect test/assignment completion
      manualItems = manualItems.map(item => {
        const isDone = Boolean(item.done || checkIsTaskSolved(item, studentId, submissions, allHomeworks, studyAssignments, solvedIdsSet, bookTests, books));
        return {
          ...item,
          done: isDone
        };
      });

      const autoHwItems = [];

      // A) Homeworks & Book Assignments
      studentHomeworks.forEach(hw => {
        const bookObj = books.find(b => String(b.id) === String(hw.bookId) || toUUID(b.id) === toUUID(hw.bookId));
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

        const isExam = Boolean(
          hw.type === 'physicalExam' ||
          hw.contentType === 'physicalExam' ||
          hw.raw_data?.type === 'physicalExam' ||
          hw.raw_data?.contentType === 'physicalExam' ||
          hw.bookType === 'exam' ||
          bookObj?.bookType === 'exam' ||
          hw.isPhysical ||
          hw.raw_data?.isPhysical ||
          (hw.title && (hw.title.toLowerCase().includes('deneme') || hw.title.toLowerCase().includes('sınav') || hw.title.toLowerCase().includes('hazır bulunuşluk') || hw.title.toLowerCase().includes('hazir bulunusluk')))
        );

        if (isExam) {
          const rawStart = hw.startDate || hw.assignedAt || hw.createdAt;
          const startYMD = rawStart ? new Date(rawStart).toISOString().split('T')[0] : null;
          const startTime = startYMD ? new Date(startYMD).getTime() : null;

          const rawDue = hw.dueDate || hw.due_date || hw.raw_data?.dueDate || hw.assignedDueDate;
          const dueYMD = rawDue ? new Date(rawDue).toISOString().split('T')[0] : null;
          const dueTime = dueYMD ? new Date(dueYMD).getTime() : null;

          let isForThisDay = dueYMD ? (dayInfo.ymd === dueYMD) : (!dueYMD && startTime ? dayInfo.time === startTime : false);

          if (isForThisDay) {
            const isHwDone = checkIsTaskSolved({
              hwId: hw.id,
              id: hw.id
            }, studentId, submissions, allHomeworks, studyAssignments, solvedIdsSet);

            let totalQ = hw.totalQuestions;
            if (!totalQ && hw.tests && Array.isArray(hw.tests)) {
              totalQ = hw.tests.reduce((acc, tid) => {
                const bt = (bookTests || []).find(b => String(b.id) === String(tid));
                return acc + (bt?.questionCount || 0);
              }, 0);
            }
            if (!totalQ) totalQ = (bookObj?.subjects || []).reduce((acc, s) => acc + (s.count || 20), 0) || 30;

            const exists = manualItems.some(m => m.id === `auto_hw_${hw.id}_${dayObj.day}` || m.hwId === hw.id);
            if (!exists) {
              autoHwItems.push({
                id: `auto_hw_${hw.id}_${dayObj.day}`,
                hwId: hw.id,
                isAutoHomework: true,
                isExamTask: true,
                taskType: 'deneme',
                subject: '📋 Deneme',
                topic: cleanBookTitle || hw.title || 'Deneme Sınavı',
                questionCount: `${totalQ} Soru`,
                time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
                done: isHwDone
              });
            }
          }
          return;
        }

        const isBook = Boolean(
          hw.isBookAssignment ||
          hw.sourceType === 'trackedBook' ||
          hw.bookId ||
          hw.book_id ||
          hw.raw_data?.bookId ||
          hw.raw_data?.isBookAssignment ||
          (hw.testDueDates && Object.keys(hw.testDueDates).length > 0) ||
          (hw.scheduleDates && Object.keys(hw.scheduleDates).length > 0) ||
          (hw.title && /kitap|seti|soru bankası|paragraf|atlı karınca|artıbir/i.test(hw.title))
        );

        // Helper to resolve accurate subject, unit/topic, and test names
        const resolveBookTestInfo = (testId) => {
          const tIdStr = String(testId || '');
          const tUuidStr = String(toUUID(tIdStr) || '');
          const tCleanId = tIdStr.replace(/^bt_/, '').replace(/^q_/, '');

          let currentBook = bookObj || (books || []).find(b => 
            String(b?.id) === String(hw?.bookId || hw?.book_id) || 
            (toUUID(b?.id) && String(toUUID(b?.id)) === String(toUUID(hw?.bookId || hw?.book_id))) ||
            (hw?.title && String(b?.title).toLowerCase().trim().includes(String(hw?.title).toLowerCase().replace(/\s*\(tüm kitap görevi\)/gi, '').trim())) ||
            (hw?.title && String(hw?.title).toLowerCase().trim().includes(String(b?.title).toLowerCase().trim()))
          );

          let tObj = (bookTests || []).find(b => {
            const bId = String(b?.id || '');
            return bId === tIdStr || 
              (tUuidStr && bId === tUuidStr) || 
              (tUuidStr && toUUID(bId) === tUuidStr) || 
              bId.replace(/^bt_/, '').replace(/^q_/, '') === tCleanId;
          });

          let subjObj = null;
          let topicObj = null;

          if (currentBook && currentBook.subjects) {
            for (const s of currentBook.subjects) {
              if (s.tests && Array.isArray(s.tests)) {
                const found = s.tests.find(t => String(t.id) === tIdStr || (tUuidStr && String(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '') === tCleanId);
                if (found) {
                  if (!tObj) tObj = found;
                  subjObj = s;
                  break;
                }
              }
              if (s.topics && Array.isArray(s.topics)) {
                for (const tp of s.topics) {
                  if (tp.tests && Array.isArray(tp.tests)) {
                    const found = tp.tests.find(t => String(t.id) === tIdStr || (tUuidStr && String(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '') === tCleanId);
                    if (found) {
                      if (!tObj) tObj = found;
                      subjObj = s;
                      topicObj = tp;
                      break;
                    }
                  }
                }
              }
              if (subjObj) break;
            }
          }

          if (!subjObj && (!tObj || !tObj.subjectId)) {
            for (const b of (books || [])) {
              if (!b.subjects) continue;
              for (const s of b.subjects) {
                if (s.tests) {
                  const found = s.tests.find(t => String(t.id) === tIdStr || (tUuidStr && String(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '') === tCleanId);
                  if (found) {
                    if (!tObj) tObj = found;
                    subjObj = s;
                    if (!currentBook) currentBook = b;
                    break;
                  }
                }
                if (s.topics) {
                  for (const tp of s.topics) {
                    if (tp.tests) {
                      const found = tp.tests.find(t => String(t.id) === tIdStr || (tUuidStr && String(t.id) === tUuidStr) || String(t.id).replace(/^bt_/, '') === tCleanId);
                      if (found) {
                        if (!tObj) tObj = found;
                        subjObj = s;
                        topicObj = tp;
                        if (!currentBook) currentBook = b;
                        break;
                      }
                    }
                  }
                }
                if (subjObj) break;
              }
              if (subjObj) break;
            }
          }

          if (tObj && !subjObj && currentBook) {
            subjObj = (currentBook.subjects || []).find(s => 
              String(s.id) === String(tObj.subjectId || tObj.subject_id) || 
              (toUUID(s.id) && toUUID(s.id) === toUUID(tObj.subjectId || tObj.subject_id)) || 
              (s.name && (tObj.subjectName || tObj.subject) && String(s.name).toLowerCase().trim() === String(tObj.subjectName || tObj.subject).toLowerCase().trim())
            );
            topicObj = (subjObj?.topics || []).find(tp => 
              String(tp.id) === String(tObj.topicId || tObj.topic_id) || 
              (toUUID(tp.id) && toUUID(tp.id) === toUUID(tObj.topicId || tObj.topic_id)) || 
              (tp.name && (tObj.topicName || tObj.topic) && String(tp.name).toLowerCase().trim() === String(tObj.topicName || tObj.topic).toLowerCase().trim())
            );
          }

          let subjectName = subjObj?.name || tObj?.subjectName || tObj?.subject;
          if (!subjectName || subjectName === 'Atlı Karınca' || subjectName === 'Artıbir' || subjectName === 'CUSTOM') {
            const rawToCheck = `${hw?.title || ''} ${hw?.subject || ''} ${currentBook?.title || ''}`;
            if (/matematik/i.test(rawToCheck)) subjectName = 'Matematik';
            else if (/turkce|türkçe|paragraf/i.test(rawToCheck)) subjectName = 'Türkçe';
            else if (/sosyal/i.test(rawToCheck)) subjectName = 'Sosyal Bilgiler';
            else if (/fen/i.test(rawToCheck)) subjectName = 'Fen Bilimleri';
            else if (/ingilizce/i.test(rawToCheck)) subjectName = 'İngilizce';
            else if (/din/i.test(rawToCheck)) subjectName = 'Din Kültürü';
            else subjectName = currentBook?.title ? currentBook.title.replace(/\s*\(Tüm Kitap Görevi\)/gi, '').trim() : 'Kitap Takibi';
          }

          const topicName = topicObj?.name || tObj?.topicName || tObj?.topic || '';
          const testName = tObj?.name || 'Test';
          const qCount = tObj?.questionCount || 12;
          const cleanTitle = (currentBook?.title || hw?.title || 'Kitap')
            .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
            .replace(/\s*\(Tüm Kitap\)/gi, '')
            .replace(/\s*\(Kendi Eklediğim\)/gi, '')
            .trim();

          return {
            tObj,
            subjObj,
            topicObj,
            subjectName,
            topicName,
            testName,
            qCount,
            cleanBookTitle: cleanTitle,
            currentBook
          };
        };

        let rawData = hw.raw_data;
        if (typeof rawData === 'string') {
          try { rawData = JSON.parse(rawData); } catch {}
        }
        const testDueDatesMap = hw.testDueDates || hw.scheduleDates || hw.test_due_dates || rawData?.testDueDates || rawData?.scheduleDates || rawData?.test_due_dates || hw.testDates || {};
        if (isBook && typeof testDueDatesMap === 'object' && Object.keys(testDueDatesMap).length > 0) {
          const processedCleanIds = new Set();
          Object.entries(testDueDatesMap).forEach(([testId, tDateStr]) => {
            if (!tDateStr) return;
            const tCleanId = String(testId).replace(/^bt_/, '').replace(/^q_/, '');
            if (processedCleanIds.has(tCleanId)) return;
            processedCleanIds.add(tCleanId);

            const tYMD = String(tDateStr).split('T')[0];
            if (dayInfo.ymd === tYMD) {
              const info = resolveBookTestInfo(testId);
              const testName = info.testName;
              const qCount = info.qCount;
              const subjectName = info.subjectName;
              const topicName = info.topicName;
              const cleanBookTitle = info.cleanBookTitle;

              const displayHeader = topicName ? `${subjectName} • ${topicName}` : subjectName;
              const displaySub = `${cleanBookTitle} — ${testName}`;

              const isSolved = checkIsTaskSolved({
                ...info.tObj,
                id: tCleanId,
                testId: tCleanId,
                bookTestId: tCleanId,
                hwId: hw.id,
                taskType: 'kitap',
                name: testName,
                testName: testName,
                title: testName,
                subject: subjectName,
                subjectName: subjectName,
                unit: topicName,
                unitName: topicName,
                unitTopic: topicName,
                bookTitle: cleanBookTitle
              }, studentId, submissions, allHomeworks, studyAssignments, solvedIdsSet, bookTests, books);

              const exists = manualItems.some(m => m.id === `book_test_${hw.id}_${tCleanId}_${dayObj.day}` || m.testId === testId || m.testId === tCleanId || m.bookTestId === testId || m.bookTestId === tCleanId) ||
                autoHwItems.some(a => a.testId === testId || a.testId === tCleanId || a.bookTestId === testId || a.bookTestId === tCleanId);

              if (!exists) {
                autoHwItems.push({
                  id: `book_test_${hw.id}_${tCleanId}_${dayObj.day}`,
                  hwId: hw.id,
                  testId: tCleanId,
                  bookTestId: tCleanId,
                  bookId: hw.bookId || info.currentBook?.id || null,
                  isAutoHomework: true,
                  isBookAssignment: true,
                  taskType: 'kitap',
                  name: testName,
                  testName: testName,
                  subject: subjectName,
                  unit: topicName || info.tObj?.unit || info.tObj?.unitName || '',
                  bookName: cleanBookTitle,
                  bookTitle: cleanBookTitle,
                  topic: displaySub,
                  questionCount: typeof qCount === 'string' && qCount.includes('soru') ? qCount : `${qCount} soru`,
                  time: `Hedef: ${new Date(tDateStr).toLocaleDateString('tr-TR')}`,
                  done: isSolved
                });
              }
            }
          });
          return;
        }

        const rawStart = hw.startDate || hw.assignedAt || hw.createdAt;
        const startYMD = rawStart ? new Date(rawStart).toISOString().split('T')[0] : null;
        const startTime = startYMD ? new Date(startYMD).getTime() : null;

        const rawDue = hw.dueDate || hw.due_date || hw.raw_data?.dueDate || hw.assignedDueDate;
        const dueYMD = rawDue ? new Date(rawDue).toISOString().split('T')[0] : null;
        const dueTime = dueYMD ? new Date(dueYMD).getTime() : null;

        let isForThisDay = false;
        if (dueTime && startTime) {
          isForThisDay = dayInfo.time >= startTime && dayInfo.time <= dueTime;
        } else if (dueTime) {
          isForThisDay = dayInfo.ymd === dueYMD || (dayInfo.time <= dueTime && dayInfo.time >= dueTime - 6 * 86400000);
        } else if (startTime) {
          isForThisDay = dayInfo.time === startTime;
        }

        if (isForThisDay) {
          if (isBook && (hw.totalQuestions > 50 || (typeof testDueDatesMap === 'object' && Object.keys(testDueDatesMap).length > 0) || /tüm kitap/i.test(hw.title || ''))) {
            return;
          }
          if (isBook) {
            if (dayInfo.ymd === dueYMD || (!dueYMD && startTime && dayInfo.time === startTime)) {
              const isHwDone = checkIsTaskSolved({
                hwId: hw.id,
                id: hw.id
              }, studentId, submissions, allHomeworks, studyAssignments, solvedIdsSet);

              const exists = manualItems.some(m => m.id === `hw_${hw.id}` || m.hwId === hw.id || (m.topic === (hw.title || hw.name)));
              if (!exists) {
                autoHwItems.push({
                  id: `auto_hw_${hw.id}_${dayObj.day}`,
                  hwId: hw.id,
                  isAutoHomework: true,
                  isBookAssignment: true,
                  bookId: hw.bookId || null,
                  bookName: cleanBookTitle || null,
                  bookTitle: cleanBookTitle || null,
                  taskType: 'kitap',
                  subject: hw.subject || 'Atanan Kitap',
                  topic: cleanBookTitle || hw.title || hw.name || 'Kitap Görevi',
                  questionCount: hw.totalQuestions ? (String(hw.totalQuestions).includes('soru') ? hw.totalQuestions : `${hw.totalQuestions} soru`) : null,
                  time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
                  done: isHwDone
                });
              }
            }
            return;
          }

          const isHwDone = checkIsTaskSolved({
            hwId: hw.id,
            id: hw.id
          }, studentId, submissions, allHomeworks, studyAssignments, solvedIdsSet);

          const exists = manualItems.some(m => m.id === `hw_${hw.id}` || m.hwId === hw.id || (m.topic === (hw.title || hw.name)));
          if (!exists) {
            autoHwItems.push({
              id: `auto_hw_${hw.id}_${dayObj.day}`,
              hwId: hw.id,
              isAutoHomework: true,
              isBookAssignment: Boolean(hw.isBookAssignment),
              bookId: hw.bookId || null,
              bookName: cleanBookTitle || null,
              bookTitle: cleanBookTitle || null,
              taskType: hw.isBookAssignment ? 'kitap' : 'ödev',
              subject: hw.subject || (hw.isBookAssignment ? 'Atanan Kitap' : 'Atanan Ödev'),
              topic: hw.title || hw.name || 'Ödev Görevi',
              questionCount: hw.totalQuestions ? (String(hw.totalQuestions).includes('soru') ? hw.totalQuestions : `${hw.totalQuestions} soru`) : null,
              time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
              done: isHwDone
            });
          }
        }
      });

      // A.3) Tüm Kitaplarda Tarih Girilmiş Testler (Direct Book Test Due Dates)
      (books || []).filter(b => b && b.bookType !== 'exam').forEach(b => {
        const cleanBookTitle = (b.title || 'Kitap')
          .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
          .replace(/\s*\(Tüm Kitap\)/gi, '')
          .replace(/\s*\(Kendi Eklediğim\)/gi, '')
          .trim();

        (b.subjects || []).forEach(subj => {
          const subjName = subj.name || 'Genel';
          
          (subj.tests || []).forEach(t => {
            const tDue = t.dueDate || t.testDueDate || t.due_date || t.date;
            if (!tDue) return;
            const tYMD = String(tDue).split('T')[0];
            if (tYMD === dayInfo.ymd) {
              const autoId = `book_test_direct_${b.id}_${t.id}_${dayObj.day}`;
              if (!manualItems.some(m => m.id === autoId || m.testId === t.id) && !autoHwItems.some(a => a.testId === t.id)) {
                const isSolved = checkIsTaskSolved({ testId: t.id, taskType: 'kitap' }, studentId, submissions, allHomeworks, studyAssignments, solvedIdsSet);
                autoHwItems.push({
                  id: autoId,
                  hwId: null,
                  testId: t.id,
                  bookTestId: t.id,
                  bookId: b.id,
                  isAutoHomework: true,
                  isBookAssignment: true,
                  taskType: 'kitap',
                  subject: subjName,
                  unit: '',
                  testName: t.name || 'Test',
                  bookName: cleanBookTitle,
                  bookTitle: cleanBookTitle,
                  topic: `${cleanBookTitle} — ${t.name || 'Test'}`,
                  questionCount: typeof t.questionCount === 'string' && t.questionCount.includes('soru') ? t.questionCount : `${t.questionCount || 12} soru`,
                  time: `Hedef: ${new Date(tDue).toLocaleDateString('tr-TR')}`,
                  done: isSolved
                });
              }
            }
          });

          (subj.topics || []).forEach(tp => {
            const tpName = tp.name || '';
            (tp.tests || []).forEach(t => {
              const tDue = t.dueDate || t.testDueDate || t.due_date || t.date;
              if (!tDue) return;
              const tYMD = String(tDue).split('T')[0];
              if (tYMD === dayInfo.ymd) {
                const autoId = `book_test_direct_${b.id}_${t.id}_${dayObj.day}`;
                if (!manualItems.some(m => m.id === autoId || m.testId === t.id) && !autoHwItems.some(a => a.testId === t.id)) {
                  const isSolved = checkIsTaskSolved({ testId: t.id, taskType: 'kitap' }, studentId, submissions, allHomeworks, studyAssignments, solvedIdsSet);
                  autoHwItems.push({
                    id: autoId,
                    hwId: null,
                    testId: t.id,
                    bookTestId: t.id,
                    bookId: b.id,
                    isAutoHomework: true,
                    isBookAssignment: true,
                    taskType: 'kitap',
                    subject: subjName,
                    unit: tpName,
                    testName: t.name || 'Test',
                    bookName: cleanBookTitle,
                    bookTitle: cleanBookTitle,
                    topic: `${cleanBookTitle} — ${t.name || 'Test'}`,
                    questionCount: typeof t.questionCount === 'string' && t.questionCount.includes('soru') ? t.questionCount : `${t.questionCount || 12} soru`,
                    time: `Hedef: ${new Date(tDue).toLocaleDateString('tr-TR')}`,
                    done: isSolved
                  });
                }
              }
            });
          });
        });
      });

      // A.4) bookTests içinde tarihi olan tüm testler (Supabase tracked_book_tests)
      (bookTests || []).forEach(bt => {
        if (!bt) return;
        const tDue = bt.dueDate || bt.testDueDate || bt.due_date || bt.date;
        if (!tDue) return;
        const tYMD = String(tDue).split('T')[0];
        if (tYMD === dayInfo.ymd) {
          const bId = String(bt.bookId || bt.book_id || '');
          const currentBook = (books || []).find(b => String(b.id) === bId || (toUUID(b.id) && toUUID(b.id) === toUUID(bId)));
          const cleanBookTitle = (currentBook?.title || 'Kitap')
            .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
            .replace(/\s*\(Tüm Kitap\)/gi, '')
            .replace(/\s*\(Kendi Eklediğim\)/gi, '')
            .trim();

          const autoId = `book_test_bt_${bt.id}_${dayObj.day}`;
          if (!manualItems.some(m => m.id === autoId || m.testId === bt.id || m.bookTestId === bt.id) && !autoHwItems.some(a => a.testId === bt.id || a.bookTestId === bt.id)) {
            const isSolved = checkIsTaskSolved({ testId: bt.id, taskType: 'kitap' }, studentId, submissions, allHomeworks, studyAssignments, solvedIdsSet);
            autoHwItems.push({
              id: autoId,
              hwId: null,
              testId: bt.id,
              bookTestId: bt.id,
              bookId: bId,
              isAutoHomework: true,
              isBookAssignment: true,
              taskType: 'kitap',
              subject: bt.subject || 'Kitap Testi',
              unit: '',
              testName: bt.name || 'Test',
              bookName: cleanBookTitle,
              bookTitle: cleanBookTitle,
              topic: `${cleanBookTitle} — ${bt.name || 'Test'}`,
              questionCount: typeof bt.questionCount === 'string' && bt.questionCount.includes('soru') ? bt.questionCount : `${bt.questionCount || 12} soru`,
              time: `Hedef: ${new Date(tDue).toLocaleDateString('tr-TR')}`,
              done: isSolved
            });
          }
        }
      });

      // B) Roadmap / Study Plan items with target dates (dueDate)
      const studentAssignments = (studyAssignments || []).filter(a => String(a.studentId) === String(studentId));
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

        // Check if all steps completed
        let totalPlanSteps = 0;
        let completedPlanSteps = 0;
        (plan.subjects || []).forEach(subject => {
          if (subject.dueDate) {
            totalPlanSteps++;
            if (completedTopicsSet.has(String(subject.id)) || completedTopicsSet.has(subject.name)) completedPlanSteps++;
          }
          (subject.topics || []).forEach(topic => {
            totalPlanSteps++;
            if (completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name)) completedPlanSteps++;
          });
        });

        if (totalPlanSteps > 0 && completedPlanSteps >= totalPlanSteps) {
          return;
        }

        (plan.subjects || []).forEach(subject => {
          const hasChildTopics = Array.isArray(subject.topics) && subject.topics.length > 0;
          const allChildTopicsDone = hasChildTopics && subject.topics.every(t => completedTopicsSet.has(String(t.id)) || completedTopicsSet.has(t.name));
          const isSubjectCompleted = completedTopicsSet.has(String(subject.id)) || completedTopicsSet.has(subject.name) || allChildTopicsDone;

          if (!hasChildTopics && subject.dueDate) {
            const sYMD = subject.dueDate.split('T')[0];
            if (dayInfo.ymd === sYMD) {
              const subId = `roadmap_sub_${assignment.id}_${subject.id}_${dayObj.day}`;
              const exists = manualItems.some(m => m.id === subId) || autoHwItems.some(a => a.id === subId);
              if (!exists) {
                autoHwItems.push({
                  id: subId,
                  roadmapAssignmentId: assignment.id,
                  isAutoHomework: true,
                  isRoadmapTask: true,
                  taskType: 'konu',
                  subject: `${plan.title} • ${subject.name}`,
                  topic: subject.name,
                  time: `Hedef: ${new Date(subject.dueDate).toLocaleDateString('tr-TR')}`,
                  done: isSubjectCompleted
                });
              }
            }
          }

          (subject.topics || []).forEach(topic => {
            if (topic.dueDate) {
              const tYMD = topic.dueDate.split('T')[0];
              if (dayInfo.ymd === tYMD) {
                const isCompleted = completedTopicsSet.has(String(topic.id)) || completedTopicsSet.has(topic.name);
                const topId = `roadmap_top_${assignment.id}_${topic.id}_${dayObj.day}`;
                const exists = manualItems.some(m => m.id === topId) || autoHwItems.some(a => a.id === topId);
                if (!exists) {
                  autoHwItems.push({
                    id: topId,
                    roadmapAssignmentId: assignment.id,
                    isAutoHomework: true,
                    isRoadmapTask: true,
                    taskType: 'konu',
                    subject: `${plan.title} • ${subject.name}`,
                    topic: topic.name,
                    time: `Hedef: ${new Date(topic.dueDate).toLocaleDateString('tr-TR')}`,
                    done: isCompleted
                  });
                }
              }
            }
          });
        });
      });

      const rawWeeklyItems = sortItemsByBookOrder([...autoHwItems, ...manualItems], books, bookTests);
      const seenWeeklyIds = new Map();
      rawWeeklyItems.forEach(item => {
        const cleanSubject = String(item.subject || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
        const cleanTitle = String(item.title || item.topic || item.testName || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
        const cleanBook = String(item.bookTitle || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');

        let key = '';
        if (item.testId) {
          key = `test_${String(item.testId).replace(/^bt_/, '')}`;
        } else if (item.hwId && !item.testId) {
          key = `hw_${item.hwId}`;
        } else if (cleanTitle && (cleanSubject || cleanBook)) {
          key = `content_${cleanBook}_${cleanSubject}_${cleanTitle}`;
        } else {
          key = String(item.id || '');
        }

        if (!key) return;
        const existing = seenWeeklyIds.get(key);
        if (!existing || (!existing.done && item.done) || (!existing.testId && item.testId)) {
          seenWeeklyIds.set(key, item);
        }
      });
      const dayItems = sortItemsByBookOrder(Array.from(seenWeeklyIds.values()), books, bookTests);

      return {
        ...dayObj,
        dateLabel: dayInfo.dateLabel,
        items: dayItems
      };
    });
  }, [weeklyProgram, allHomeworks, currentUser, submissions, curData, weekInfo, bookTests, books, studyPlans, studyAssignments]);

  const [editingItem, setEditingItem] = useState(null); // { dayKey, item }
  const [assigningTopic, setAssigningTopic] = useState(null); // { subject, topic, taskType }

  const handleToggle = useCallback((dayKey, itemId) => {
    setWeeklyProgram(prev => prev.map(d =>
      d.day === dayKey
        ? { ...d, items: d.items.map(item => item.id === itemId ? { ...item, done: !item.done } : item) }
        : d
    ));
  }, [setWeeklyProgram]);

    const handleDelete = useCallback((dayKey, itemId) => {
    setWeeklyProgram(prev => prev.map(d => {
      if (d.day !== dayKey) return d;
      const targetItem = d.items.find(item => item.id === itemId);
      if (targetItem && !canStudentDeleteItem(targetItem, currentUser)) {
        alert('Öğretmeniniz tarafından atanan görev ve testleri silemezsiniz.');
        return d;
      }
      return { ...d, items: d.items.filter(item => item.id !== itemId) };
    }));
  }, [setWeeklyProgram, currentUser]);

  const handleAddItem = useCallback((newItem, targetDayKey) => {
    const dayToUse = targetDayKey || addingToDay || getTodayKey();
    setWeeklyProgram(prev => prev.map(d =>
      d.day === dayToUse ? { ...d, items: [...d.items, newItem] } : d
    ));
    setAddingToDay(null);
    setAssigningTopic(null);
  }, [addingToDay, setWeeklyProgram]);

  const handleEditItem = useCallback((updatedItem, targetDayKey) => {
    if (!editingItem) return;
    const currentDayKey = editingItem.dayKey;
    const newDayKey = targetDayKey || currentDayKey;

    setWeeklyProgram(prev => {
      if (currentDayKey === newDayKey) {
        return prev.map(d =>
          d.day === currentDayKey
            ? { ...d, items: d.items.map(item => item.id === updatedItem.id ? updatedItem : item) }
            : d
        );
      } else {
        return prev.map(d => {
          if (d.day === currentDayKey) {
            return { ...d, items: d.items.filter(item => item.id !== updatedItem.id) };
          }
          if (d.day === newDayKey) {
            return { ...d, items: [...d.items, updatedItem] };
          }
          return d;
        });
      }
    });
    setEditingItem(null);
  }, [editingItem, setWeeklyProgram]);

  const totalItems = (processedWeeklyProgram || []).reduce((a, d) => a + (d.items?.length || 0), 0);
  const doneItems = (processedWeeklyProgram || []).reduce((a, d) => a + (d.items?.filter(i => i.done).length || 0), 0);
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Tabs Header Container */}
      <div className="no-print" style={{ marginBottom: isMobile ? '0.75rem' : '1.25rem' }}>
        {/* iOS-Style Segmented Tabs on Mobile / Clean Underline Tabs on Desktop */}
        {isMobile ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
            padding: 3,
            borderRadius: 12,
            gap: 3,
            marginBottom: '0.65rem'
          }}>
            {[
              { id: 'haftalik', label: '📅 Haftalık' },
              { id: 'aylik', label: '📆 Aylık' },
              { id: 'konular', label: '📚 Konular' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setProgramTab(tab.id)}
                style={{
                  padding: '0.45rem 0.2rem',
                  border: 'none',
                  borderRadius: 9,
                  background: programTab === tab.id ? (isDark ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#ffffff') : 'transparent',
                  fontWeight: programTab === tab.id ? 900 : 700,
                  fontSize: '0.76rem',
                  color: programTab === tab.id ? (isDark ? '#ffffff' : '#4f46e5') : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b'),
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: programTab === tab.id ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: isDark ? '2px solid rgba(255,255,255,0.12)' : '2px solid #e8ecf0',
            gap: '0.25rem',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            paddingBottom: 2
          }}>
            {[
              { id: 'haftalik', label: '📅 Haftalık Program' },
              { id: 'aylik', label: '📆 Aylık Görünüm' },
              { id: 'konular', label: '📚 Konu Havuzu' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setProgramTab(tab.id)}
                style={{
                  padding: '0.65rem 0.85rem',
                  border: 'none',
                  borderBottom: programTab === tab.id ? (isDark ? '3px solid #818cf8' : '3px solid #6366f1') : '3px solid transparent',
                  background: 'transparent',
                  fontWeight: programTab === tab.id ? 800 : 600,
                  fontSize: '0.82rem',
                  color: programTab === tab.id ? (isDark ? '#a5b4fc' : '#4f46e5') : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b'),
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                  marginBottom: -2,
                  flexShrink: 0
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Unified Slim Progress Bar (Weekly Tab Only) */}
        {totalItems > 0 && programTab === 'haftalik' && (
          <div style={{
            padding: '0.4rem 0.75rem',
            background: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
            borderRadius: '0.75rem',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.7)' : '#475569' }}>
                Haftalık:
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: isDark ? '#a5b4fc' : '#6366f1' }}>
                {doneItems}/{totalItems} ({pct}%)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 100, maxWidth: 200, marginLeft: 'auto' }}>
              <div style={{ flex: 1, height: 6, background: isDark ? 'rgba(255,255,255,0.1)' : '#e8ecf0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: pct === 100 ? '#22c55e' : 'linear-gradient(90deg, #6366f1, #a855f7)', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Program */}
      {programTab === 'haftalik' && (
        <div>
          {/* Week Navigation & Controls Bar (Unified Single Row) */}
          <div className="no-print" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)' : '#ffffff',
            border: isDark ? '1.5px solid rgba(255, 255, 255, 0.14)' : '1.5px solid #e2e8f0',
            borderRadius: '0.95rem',
            padding: isMobile ? '0.45rem 0.65rem' : '0.65rem 1rem',
            marginBottom: '0.75rem',
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
            gap: 6
          }}>
            {/* Left: Week Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setWeekOffset(w => w - 1)}
                style={{
                  padding: isMobile ? '0.35rem 0.5rem' : '0.42rem 0.75rem',
                  borderRadius: '0.6rem',
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                  color: isDark ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 800,
                  fontSize: '0.76rem'
                }}
                title="Önceki Hafta"
              >
                <ChevronLeft size={16} />
                {!isMobile && <span style={{ marginLeft: 3 }}>Önceki</span>}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: isMobile ? 110 : 150, padding: '0 4px' }}>
                <span style={{ fontSize: isMobile ? '0.78rem' : '0.92rem', fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a', lineHeight: 1.1 }}>
                  {weekInfo.monthTitle}
                </span>
                <span style={{ fontSize: isMobile ? '0.62rem' : '0.7rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontWeight: 700 }}>
                  {weekInfo.rangeStr}
                </span>
              </div>

              <button
                onClick={() => setWeekOffset(w => w + 1)}
                style={{
                  padding: isMobile ? '0.35rem 0.5rem' : '0.42rem 0.75rem',
                  borderRadius: '0.6rem',
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                  color: isDark ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 800,
                  fontSize: '0.76rem'
                }}
                title="Sonraki Hafta"
              >
                {!isMobile && <span style={{ marginRight: 3 }}>Sonraki</span>}
                <ChevronRight size={16} />
              </button>

              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  style={{
                    padding: isMobile ? '0.35rem 0.55rem' : '0.42rem 0.75rem',
                    borderRadius: '0.6rem',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(79,70,229,0.3)'
                  }}
                >
                  📍 Bugün
                </button>
              )}
            </div>

            {/* Right: View Mode Toggle & Print */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                padding: 2,
                borderRadius: 8,
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1'
              }}>
                <button
                  onClick={() => setWeeklySubView('agenda')}
                  style={{
                    padding: isMobile ? '0.3rem 0.55rem' : '0.35rem 0.75rem',
                    borderRadius: 6,
                    border: 'none',
                    background: weeklySubView === 'agenda' ? (isDark ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#ffffff') : 'transparent',
                    color: weeklySubView === 'agenda' ? (isDark ? '#ffffff' : '#4f46e5') : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b'),
                    fontWeight: weeklySubView === 'agenda' ? 900 : 700,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    boxShadow: weeklySubView === 'agenda' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
                  }}
                  title="Liste Görünümü"
                >
                  📋 {isMobile ? '' : 'Liste'}
                </button>
                <button
                  onClick={() => setWeeklySubView('cards')}
                  style={{
                    padding: isMobile ? '0.3rem 0.55rem' : '0.35rem 0.75rem',
                    borderRadius: 6,
                    border: 'none',
                    background: weeklySubView === 'cards' ? (isDark ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#ffffff') : 'transparent',
                    color: weeklySubView === 'cards' ? (isDark ? '#ffffff' : '#4f46e5') : (isDark ? 'rgba(255,255,255,0.6)' : '#64748b'),
                    fontWeight: weeklySubView === 'cards' ? 900 : 700,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    boxShadow: weeklySubView === 'cards' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
                  }}
                  title="Kartlar Görünümü"
                >
                  🗂️ {isMobile ? '' : 'Kartlar'}
                </button>
              </div>

              {/* Print Button */}
              <button
                onClick={() => handleWeeklyPrint('landscape')}
                style={{
                  padding: isMobile ? '0.32rem 0.55rem' : '0.38rem 0.75rem',
                  borderRadius: 8,
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                  color: isDark ? '#ffffff' : '#334155',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3
                }}
                title="Yazdır / PDF Olarak Kaydet"
              >
                <Printer size={13} /> {!isMobile && 'Yazdır'}
              </button>
            </div>
          </div>

          {/* Interactive Day Selector Strip */}
          <div className="no-print" style={{ marginBottom: '1rem' }}>
            <div style={{
              display: isMobile ? 'flex' : 'grid',
              gridTemplateColumns: isMobile ? 'none' : 'repeat(8, minmax(0, 1fr))',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 6,
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {/* All Days Card */}
              <button
                onClick={() => setSelectedDayFilter('all')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isMobile ? '0.45rem 0.35rem' : '0.55rem 0.35rem',
                  borderRadius: 14,
                  border: selectedDayFilter === 'all' ? '2px solid #6366f1' : (isDark ? '1px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0'),
                  background: selectedDayFilter === 'all' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : (isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'),
                  color: selectedDayFilter === 'all' ? '#ffffff' : (isDark ? '#cbd5e1' : '#334155'),
                  cursor: 'pointer',
                  minWidth: isMobile ? 54 : 48,
                  flex: isMobile ? '0 0 54px' : '1',
                  boxShadow: selectedDayFilter === 'all' ? '0 4px 12px rgba(99,102,241,0.35)' : '0 2px 5px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s'
                }}
              >
                <span style={{ fontSize: '0.66rem', fontWeight: 800, opacity: 0.9 }}>TÜMÜ</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 900, marginTop: 1 }}>🌟</span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  marginTop: 2,
                  background: selectedDayFilter === 'all' ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9'),
                  padding: '1px 5px',
                  borderRadius: 99
                }}>
                  {totalItems}
                </span>
              </button>

              {/* 7 Days Cards */}
              {(processedWeeklyProgram || []).map((dayObj, idx) => {
                const dayMeta = DAYS.find(d => d.key === dayObj.day) || DAYS[idx];
                const isSelected = selectedDayFilter === dayObj.day;
                const isDayToday = weekOffset === 0 && dayObj.day === todayKey;
                const dayItemCount = dayObj.items?.length || 0;
                const dayDoneCount = dayObj.items?.filter(i => i.done).length || 0;
                const theme = DAY_THEMES[dayObj.day] || DAY_THEMES['Pzt'];
                const dateNumber = dayObj.dateLabel ? dayObj.dateLabel.split(' ')[0] : (idx + 1);

                return (
                  <button
                    key={dayObj.day}
                    onClick={() => setSelectedDayFilter(isSelected ? 'all' : dayObj.day)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: isMobile ? '0.45rem 0.35rem' : '0.55rem 0.35rem',
                      borderRadius: 14,
                      border: isSelected
                        ? `2px solid ${theme.badgeBg || '#6366f1'}`
                        : (isDayToday ? '2px solid #f59e0b' : (isDark ? '1px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0')),
                      background: isSelected
                        ? (theme.gradient || 'linear-gradient(135deg, #6366f1, #4f46e5)')
                        : (isDayToday ? (isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb') : (isDark ? 'rgba(255,255,255,0.06)' : '#ffffff')),
                      color: isSelected ? '#ffffff' : (isDayToday ? (isDark ? '#fcd34d' : '#b45309') : (isDark ? '#cbd5e1' : '#334155')),
                      cursor: 'pointer',
                      minWidth: isMobile ? 58 : 48,
                      flex: isMobile ? '0 0 58px' : '1',
                      position: 'relative',
                      boxShadow: isSelected
                        ? '0 4px 14px rgba(0,0,0,0.18)'
                        : (isDayToday ? '0 2px 8px rgba(245,158,11,0.2)' : '0 2px 5px rgba(0,0,0,0.02)'),
                      transition: 'all 0.15s',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 1 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9 }}>
                        {dayMeta.key}
                      </span>
                      {isDayToday && (
                        <span style={{
                          background: isSelected ? 'rgba(255,255,255,0.3)' : '#f59e0b',
                          color: '#ffffff',
                          fontSize: '0.48rem',
                          fontWeight: 900,
                          padding: '1px 4px',
                          borderRadius: 99,
                          letterSpacing: '0.02em',
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                        }}>
                          BUGÜN
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '0.95rem', fontWeight: 900, marginTop: 1, lineHeight: 1.1 }}>
                      {dateNumber}
                    </span>
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: 900,
                      marginTop: 3,
                      background: isSelected
                        ? 'rgba(255,255,255,0.25)'
                        : (dayItemCount > 0 && dayDoneCount === dayItemCount ? (isDark ? '#065f46' : '#dcfce7') : (isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9')),
                      color: isSelected
                        ? '#ffffff'
                        : (dayItemCount > 0 && dayDoneCount === dayItemCount ? (isDark ? '#34d399' : '#15803d') : (isDark ? '#94a3b8' : '#64748b')),
                      padding: '1px 5px',
                      borderRadius: 99,
                      whiteSpace: 'nowrap'
                    }}>
                      {dayItemCount > 0 ? `${dayDoneCount}/${dayItemCount}` : '0'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Single Day Active Header for Desktop only (On mobile it is neatly integrated into the list) */}
            {!isMobile && selectedDayFilter !== 'all' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.9rem',
                background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))' : '#f8fafc',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0',
                borderRadius: '0.9rem',
                marginTop: 6
              }}>
                <button
                  type="button"
                  onClick={handlePrevDay}
                  style={{
                    padding: '0.35rem 0.7rem',
                    borderRadius: 8,
                    border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                    background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#334155',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  <ChevronLeft size={14} /> Önceki Gün
                </button>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 900, color: isDark ? '#ffffff' : '#0f172a' }}>
                    {processedWeeklyProgram.find(d => d.day === selectedDayFilter)?.dateLabel ? `${processedWeeklyProgram.find(d => d.day === selectedDayFilter)?.dateLabel} - ` : ''}
                    {DAYS.find(d => d.key === selectedDayFilter)?.long}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', marginTop: 1 }}>
                    {processedWeeklyProgram.find(d => d.day === selectedDayFilter)?.items?.length || 0} Görev
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextDay}
                  style={{
                    padding: '0.35rem 0.7rem',
                    borderRadius: 8,
                    border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                    background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#334155',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  Sonraki Gün <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          <style>{`
            .print-weekly-program-doc { display: none; }
            .weekly-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 1.1rem;
              align-items: start;
            }
            @media (min-width: 1500px) {
              .weekly-grid.all-days {
                grid-template-columns: repeat(7, 1fr);
                gap: 0.75rem;
              }
            }
            @media (max-width: 640px) {
              .weekly-grid {
                grid-template-columns: 1fr;
                gap: 0.9rem;
              }
            }
            @media print {
              @page {
                size: ${weeklyPrintOrientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
                margin: 6mm 8mm;
              }
              *, *::before, *::after {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
              }
              html, body, #root, #root *, div, section, main, article, header, nav {
                background-color: #ffffff !important;
                background-image: none !important;
                color: #0f172a !important;
                box-shadow: none !important;
                text-shadow: none !important;
                backdrop-filter: none !important;
                font-family: 'Inter', -apple-system, sans-serif !important;
              }
              body {
                margin: 0 !important;
                padding: 0 !important;
                font-size: 8.2pt !important;
              }
              nav, header, footer, .no-print, button, select, input, .weekly-screen-view {
                display: none !important;
              }
              .print-weekly-program-doc {
                display: block !important;
                width: 100% !important;
              }
              .print-wk-header {
                display: flex !important;
                justify-content: space-between !important;
                align-items: flex-start !important;
                border-bottom: 2px solid #0f172a !important;
                padding-bottom: 5px !important;
                margin-bottom: 8px !important;
              }
              .print-wk-brand {
                font-size: 10.5pt !important;
                font-weight: 900 !important;
                color: #0f172a !important;
                letter-spacing: -0.02em !important;
              }
              .print-wk-title {
                font-size: 9pt !important;
                font-weight: 800 !important;
                color: #4338ca !important;
                margin-top: 1px !important;
              }
              .print-wk-header-right {
                text-align: right !important;
                font-size: 7.8pt !important;
                color: #334155 !important;
                line-height: 1.3 !important;
              }
              .print-wk-stat {
                font-weight: 800 !important;
                color: #15803d !important;
              }
              .print-wk-days-container {
                display: ${weeklyPrintOrientation === 'landscape' ? 'grid' : 'flex'} !important;
                ${weeklyPrintOrientation === 'landscape' ? 'grid-template-columns: repeat(3, 1fr) !important; gap: 6px !important;' : 'flex-direction: column !important; gap: 6px !important;'}
              }
              .print-wk-day-card {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                border: 1px solid #cbd5e1 !important;
                border-left: 4px solid #4f46e5 !important;
                border-radius: 5px !important;
                background: #ffffff !important;
                padding: 4px 7px !important;
              }
              .print-wk-day-title-bar {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                border-bottom: 1px solid #e2e8f0 !important;
                padding-bottom: 2px !important;
                margin-bottom: 3px !important;
              }
              .print-wk-day-date {
                font-size: 8.5pt !important;
                font-weight: 900 !important;
                color: #0f172a !important;
              }
              .print-wk-day-meta {
                font-size: 7.2pt !important;
                font-weight: 700 !important;
                color: #64748b !important;
              }
              .print-wk-tasks-table {
                display: flex !important;
                flex-direction: column !important;
                gap: 2.5px !important;
              }
              .print-wk-task-row {
                display: flex !important;
                align-items: flex-start !important;
                gap: 5px !important;
                padding: 2.5px 4px !important;
                border-radius: 3px !important;
                background: #f8fafc !important;
                border: 1px solid #e2e8f0 !important;
                line-height: 1.2 !important;
              }
              .print-wk-task-row.is-done {
                background: #f0fdf4 !important;
                border-color: #bbf7d0 !important;
              }
              .print-wk-col-check {
                flex-shrink: 0 !important;
                padding-top: 1px !important;
              }
              .print-wk-check-box {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 12px !important;
                height: 12px !important;
                border: 1.5px solid #64748b !important;
                border-radius: 2.5px !important;
                font-size: 7pt !important;
                font-weight: 900 !important;
                color: #15803d !important;
                line-height: 1 !important;
                background: #ffffff !important;
              }
              .print-wk-check-box.checked {
                border-color: #16a34a !important;
                background: #dcfce7 !important;
              }
              .print-wk-col-info {
                flex: 1 !important;
                min-width: 0 !important;
              }
              .print-wk-subject {
                font-size: 7.8pt !important;
                font-weight: 800 !important;
                color: #0f172a !important;
              }
              .print-wk-topic {
                font-size: 7.2pt !important;
                color: #334155 !important;
                font-weight: 600 !important;
                margin-top: 1px !important;
              }
              .print-wk-col-details {
                display: flex !important;
                align-items: center !important;
                gap: 3px !important;
                flex-shrink: 0 !important;
                font-size: 7pt !important;
              }
              .print-wk-pill {
                background: #e2e8f0 !important;
                color: #334155 !important;
                padding: 1px 4px !important;
                border-radius: 3px !important;
                font-weight: 700 !important;
              }
              .print-wk-pill-q {
                background: #e0f2fe !important;
                color: #0369a1 !important;
                font-weight: 800 !important;
              }
              .print-wk-col-status {
                flex-shrink: 0 !important;
              }
              .print-wk-status-tag {
                font-size: 6.8pt !important;
                font-weight: 800 !important;
                padding: 1px 4px !important;
                border-radius: 3px !important;
              }
              .print-wk-status-tag.done {
                background: #dcfce7 !important;
                color: #15803d !important;
              }
              .print-wk-status-tag.pending {
                background: #f1f5f9 !important;
                color: #64748b !important;
              }
              .print-wk-footer {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                border-top: 1.5px solid #cbd5e1 !important;
                padding-top: 6px !important;
                margin-top: 10px !important;
                font-size: 7.2pt !important;
                color: #475569 !important;
                page-break-inside: avoid !important;
              }
            }
          `}</style>

          {/* FULL-DETAIL PRINTABLE WEEKLY PROGRAM (A4 DOCUMENT) */}
          <div className="print-weekly-program-doc">
            <div className="print-wk-header">
              <div>
                <div className="print-wk-brand">E-TEST EĞİTİM & KOÇLUK PLATFORMU</div>
                <div className="print-wk-title">Haftalık Ders Çalışma Programı • {weekInfo.monthTitle} ({weekInfo.rangeStr})</div>
              </div>
              <div className="print-wk-header-right">
                <div>Öğrenci: <strong>{currentUser?.name || currentUser?.username || 'Öğrenci'}</strong></div>
                <div className="print-wk-stat">Tamamlanan: {doneItems} / {totalItems} Görev (%{pct})</div>
                <div style={{ color: '#64748b' }}>Tarih: {new Date().toLocaleDateString('tr-TR')}</div>
              </div>
            </div>

            <div className={`print-wk-days-container ${weeklyPrintOrientation}`}>
              {(processedWeeklyProgram || []).map((dayObj, i) => {
                const dayMeta = DAYS.find(d => d.key === dayObj.day) || DAYS[i];
                const dayTasks = dayObj.items || [];
                const dayDoneTasks = dayTasks.filter(item => item.done).length;

                return (
                  <div key={dayObj.day} className="print-wk-day-card">
                    <div className="print-wk-day-title-bar">
                      <div className="print-wk-day-date">{dayObj.dateLabel || dayMeta.key}</div>
                      <div className="print-wk-day-meta">
                        {dayMeta.long} • {dayDoneTasks}/{dayTasks.length} Tamamlandı
                      </div>
                    </div>

                    <div className="print-wk-tasks-table">
                      {dayTasks.length === 0 ? (
                        <div style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '6.8pt', padding: '2px 0' }}>
                          Planlanan görev yok
                        </div>
                      ) : (
                        dayTasks.map(item => {
                          const bookInfo = resolveBookTestInfo(item, books, bookTests);
                          return (
                            <div key={item.id} className={`print-wk-task-row ${item.done ? 'is-done' : ''}`}>
                              <div className="print-wk-col-check">
                                <span className={`print-wk-check-box ${item.done ? 'checked' : ''}`}>
                                  {item.done ? '✓' : ''}
                                </span>
                              </div>
                              <div className="print-wk-col-info">
                                <div className="print-wk-subject">
                                  {bookInfo?.isBookTest ? (
                                    <>
                                      <span>📚 {bookInfo.subject}</span>
                                      {bookInfo.publisher && <span style={{ color: '#4f46e5', marginLeft: 4 }}>({bookInfo.publisher})</span>}
                                      {bookInfo.bookTitle && <div style={{ fontSize: '7.2pt', color: '#334155', fontWeight: 700, marginTop: 1 }}>📖 {bookInfo.bookTitle}</div>}
                                    </>
                                  ) : (
                                    item.bookName || item.subject
                                  )}
                                </div>
                                {bookInfo?.isBookTest ? (
                                  <div className="print-wk-topic" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
                                    {bookInfo.unit && <span>📂 {bookInfo.unit}</span>}
                                    {bookInfo.testName && <span>🎯 {bookInfo.testName}</span>}
                                  </div>
                                ) : (
                                  item.topic && (
                                    <div className="print-wk-topic">{item.topic}</div>
                                  )
                                )}
                              </div>
                              <div className="print-wk-col-details">
                                {item.taskType && (
                                  <span className="print-wk-pill">
                                    {TASK_TYPES.find(t => t.id === item.taskType)?.label || item.taskType}
                                  </span>
                                )}
                                {(bookInfo?.questionCount || item.questionCount) && (
                                  <span className="print-wk-pill print-wk-pill-q">
                                    ✏️ {String(bookInfo?.questionCount || item.questionCount).includes('soru') ? (bookInfo?.questionCount || item.questionCount) : `${bookInfo?.questionCount || item.questionCount} soru`}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="print-wk-footer">
              <div>Öğrenci İmzası: ___________________</div>
              <div>Koç / Öğretmen İmzası: ___________________</div>
              <div>Veli İmzası: ___________________</div>
            </div>
          </div>

          {/* SCREEN INTERACTIVE VIEW */}
          <div className="weekly-screen-view">
            {weeklySubView === 'cards' ? (
              <div className={`weekly-grid ${selectedDayFilter === 'all' ? 'all-days' : 'single-day'}`}>
                {(processedWeeklyProgram || [])
                  .filter(dayObj => selectedDayFilter === 'all' || dayObj.day === selectedDayFilter)
                  .map((dayObj, i) => {
                    const dayMeta = DAYS.find(d => d.key === dayObj.day) || DAYS[i];
                    return (
                      <DayCard key={dayObj.day} dayObj={dayObj} dayMeta={dayMeta}
                        isToday={weekOffset === 0 && dayObj.day === todayKey}
                        onToggle={handleToggle} onDelete={handleDelete}
                        onEditClick={(dayKey, item) => setEditingItem({ dayKey, item })}
                        onAddClick={d => setAddingToDay(d)}
                        onOpenResult={handleOpenTaskResult}
                        onStartStudy={handleStartInStudyRoom}
                        isDark={isDark} />
                    );
                  })}
              </div>
            ) : (
              /* AGENDA / LIST VIEW */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(processedWeeklyProgram || [])
                  .filter(dayObj => selectedDayFilter === 'all' || dayObj.day === selectedDayFilter)
                  .map((dayObj, i) => {
                    const dayMeta = DAYS.find(d => d.key === dayObj.day) || DAYS[i];
                    const theme = DAY_THEMES[dayObj.day] || DAY_THEMES['Pzt'];
                    const isDayToday = weekOffset === 0 && dayObj.day === todayKey;
                    const items = dayObj.items || [];
                    const doneCount = items.filter(it => it.done).length;
                    const isDayCollapsed = !!collapsedAgendaDays[dayObj.day];
                    const isShowAllTasks = !!expandedDayTasks[dayObj.day] || !isMobile;
                    const MAX_AGENDA_ITEMS = 3;
                    const shouldShowMoreBtn = isMobile && items.length > MAX_AGENDA_ITEMS;
                    const visibleItems = (shouldShowMoreBtn && !isShowAllTasks) ? items.slice(0, MAX_AGENDA_ITEMS) : items;

                    return (
                      <div key={dayObj.day} style={{
                        background: isDark ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)' : '#ffffff',
                        border: isDayToday ? (isDark ? '2px solid #818cf8' : '2px solid #6366f1') : (isDark ? '1.5px solid rgba(255,255,255,0.14)' : '1.5px solid #e2e8f0'),
                        borderRadius: '1.15rem',
                        overflow: 'hidden',
                        boxShadow: isDayToday ? '0 4px 20px rgba(99,102,241,0.15)' : '0 2px 10px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s ease'
                      }}>
                        {/* Day Row Header - Tap to collapse/expand entire day */}
                        <div
                          onClick={() => setCollapsedAgendaDays(p => ({ ...p, [dayObj.day]: !p[dayObj.day] }))}
                          style={{
                            padding: '0.75rem 1.1rem',
                            background: isDayToday ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : theme.gradient,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 6,
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 900, fontSize: '0.95rem' }}>
                              {dayObj.dateLabel ? `${dayObj.dateLabel} - ` : ''}{dayMeta.long}
                            </span>
                            {isDayToday && (
                              <span style={{ background: '#f59e0b', color: '#ffffff', fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', borderRadius: 99 }}>
                                BUGÜN
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 99 }}>
                              {doneCount}/{items.length} Tamamlandı
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddingToDay(dayObj.day);
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.25)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 8,
                                padding: '0.25rem 0.6rem',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                            >
                              <Plus size={12} /> Görev Ekle
                            </button>
                            <span style={{ color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center' }}>
                              {isDayCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                            </span>
                          </div>
                        </div>

                        {/* Tasks List */}
                        {!isDayCollapsed && (
                          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {items.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '1rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>
                                Bu gün için kayıtlı görev bulunmuyor.
                              </div>
                            ) : (
                              <>
                                {/* Quick Search Bar when a day has many tasks (e.g. > 6) */}
                                {items.length > 6 && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '0.35rem 0.65rem',
                                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                    borderRadius: '0.65rem',
                                    marginBottom: 4
                                  }}>
                                    <Search size={13} color={isDark ? '#94a3b8' : '#64748b'} />
                                    <input
                                      type="text"
                                      value={daySearchQueries[dayObj.day] || ''}
                                      onChange={(e) => setDaySearchQueries(prev => ({ ...prev, [dayObj.day]: e.target.value }))}
                                      placeholder={`Görevlerde veya testlerde ara... (${items.length} görev)`}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        fontSize: '0.74rem',
                                        color: isDark ? '#ffffff' : '#0f172a',
                                        outline: 'none',
                                        width: '100%',
                                        fontFamily: 'inherit'
                                      }}
                                    />
                                    {daySearchQueries[dayObj.day] && (
                                      <button
                                        type="button"
                                        onClick={() => setDaySearchQueries(prev => ({ ...prev, [dayObj.day]: '' }))}
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                                      >
                                        <X size={13} />
                                      </button>
                                    )}
                                  </div>
                                )}

                                {(() => {
                                  const q = (daySearchQueries[dayObj.day] || '').trim().toLowerCase();
                                  const searchedItems = q
                                    ? items.filter(it =>
                                        (it.bookName || '').toLowerCase().includes(q) ||
                                        (it.subject || '').toLowerCase().includes(q) ||
                                        (it.topic || '').toLowerCase().includes(q) ||
                                        (it.note || '').toLowerCase().includes(q)
                                      )
                                    : items;

                                  const isShowAllTasks = !!expandedDayTasks[dayObj.day] || !isMobile || q.length > 0;
                                  const MAX_AGENDA_ITEMS = 6;
                                  const shouldShowMoreBtn = isMobile && searchedItems.length > MAX_AGENDA_ITEMS && q.length === 0;
                                  const displayedItems = (shouldShowMoreBtn && !isShowAllTasks) ? searchedItems.slice(0, MAX_AGENDA_ITEMS) : searchedItems;

                                  if (searchedItems.length === 0) {
                                    return (
                                      <div style={{ textAlign: 'center', padding: '1rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize: '0.78rem' }}>
                                        "{q}" aramasına uygun görev bulunamadı.
                                      </div>
                                    );
                                  }

                                  return (
                                    <>
                                      {displayedItems.map(item => {
                                        const tt = TASK_TYPES.find(t => t.id === item.taskType);
                                        const isQuizTask = item.isAutoHomework || item.testId || item.hwId || item.roadmapAssignmentId || (item.id && String(item.id).startsWith('hw_'));
                                        const bookInfo = resolveBookTestInfo(item, books, bookTests);

                                        // Deduplicate titles and extract page numbers
                                        let rawTitle = bookInfo?.testName || item.topic || (bookInfo?.isBookTest ? 'Konu Testi' : (item.bookName || item.subject || 'Görev'));
                                        let pageBadge = null;
                                        const pageMatch = rawTitle.match(/^(\d+(?:[-–]\d+)?\.\s*(?:Sayfa|s\.)|\s*s\.\s*\d+(?:[-–]\d+)?)\s*/i);
                                        if (pageMatch) {
                                          pageBadge = pageMatch[0].trim();
                                          rawTitle = rawTitle.substring(pageMatch[0].length).trim();
                                        }

                                        const rawBook = (bookInfo?.bookTitle || item.bookName || '')
                                          .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
                                          .replace(/\s*\(Tüm Kitap\)/gi, '')
                                          .replace(/\s*\(Kendi Eklediğim\)/gi, '')
                                          .trim();

                                        const unitText = bookInfo?.unit && rawBook && bookInfo.unit.toLowerCase() !== rawBook.toLowerCase() && !rawBook.toLowerCase().includes(bookInfo.unit.toLowerCase())
                                          ? bookInfo.unit
                                          : null;

                                        const subjectName = bookInfo?.subject || item.subject || 'Ders';

                                        // Subject-based theme
                                        const getSubjTheme = (sub) => {
                                          const s = (sub || '').toLowerCase();
                                          if (s.includes('türkçe') || s.includes('paragraf')) return { color: '#2563eb', bg: 'rgba(37,99,235,0.12)', border: 'rgba(59,130,246,0.3)' };
                                          if (s.includes('matematik')) return { color: '#d97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(245,158,11,0.3)' };
                                          if (s.includes('fen')) return { color: '#059669', bg: 'rgba(5,150,105,0.12)', border: 'rgba(16,185,129,0.3)' };
                                          if (s.includes('sosyal') || s.includes('tarih')) return { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', border: 'rgba(139,92,246,0.3)' };
                                          if (s.includes('ingilizce') || s.includes('dil')) return { color: '#db2777', bg: 'rgba(219,39,119,0.12)', border: 'rgba(236,72,153,0.3)' };
                                          if (s.includes('din')) return { color: '#0891b2', bg: 'rgba(8,145,178,0.12)', border: 'rgba(6,182,212,0.3)' };
                                          return { color: '#4f46e5', bg: 'rgba(79,70,229,0.12)', border: 'rgba(99,102,241,0.3)' };
                                        };
                                        const subjTheme = getSubjTheme(subjectName);

                                        return (
                                          <div
                                            key={item.id}
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: 6,
                                              padding: isMobile ? '0.7rem 0.8rem' : '0.75rem 0.95rem',
                                              borderRadius: '0.9rem',
                                              background: item.done 
                                                ? (isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4') 
                                                : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
                                              border: item.done 
                                                ? (isDark ? '1px solid rgba(52,211,153,0.3)' : '1px solid #bbf7d0') 
                                                : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1.5px solid #e2e8f0'),
                                              borderLeft: `4px solid ${item.done ? '#10b981' : subjTheme.color}`,
                                              boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.02)',
                                              transition: 'all 0.15s ease'
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                                                {/* Checkbox */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggle(dayObj.day, item.id)}
                                                  style={{
                                                    width: 24,
                                                    height: 24,
                                                    marginTop: 1,
                                                    borderRadius: '50%',
                                                    border: item.done ? 'none' : `2px solid ${isDark ? 'rgba(255,255,255,0.3)' : '#cbd5e1'}`,
                                                    background: item.done ? '#10b981' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    flexShrink: 0,
                                                    boxShadow: item.done ? '0 2px 6px rgba(16,185,129,0.3)' : 'none',
                                                    transition: 'all 0.15s ease'
                                                  }}
                                                >
                                                  {item.done && <Check size={14} color="#ffffff" strokeWidth={3} />}
                                                </button>

                                                {/* Title & Badges */}
                                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                                    <span style={{
                                                      fontSize: '0.64rem',
                                                      fontWeight: 900,
                                                      color: subjTheme.color,
                                                      background: subjTheme.bg,
                                                      border: `1px solid ${subjTheme.border}`,
                                                      padding: '1px 6px',
                                                      borderRadius: 5,
                                                      flexShrink: 0
                                                    }}>
                                                      {subjectName}
                                                    </span>

                                                    {pageBadge && (
                                                      <span style={{
                                                        fontSize: '0.62rem',
                                                        fontWeight: 800,
                                                        color: isDark ? '#94a3b8' : '#475569',
                                                        background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                                        padding: '1px 5px',
                                                        borderRadius: 5,
                                                        flexShrink: 0
                                                      }}>
                                                        📄 {pageBadge}
                                                      </span>
                                                    )}

                                                    <span style={{
                                                      fontSize: isMobile ? '0.84rem' : '0.88rem',
                                                      fontWeight: 800,
                                                      color: item.done ? (isDark ? '#4ade80' : '#166534') : (isDark ? '#ffffff' : '#0f172a'),
                                                      textDecoration: item.done ? 'line-through' : 'none',
                                                      wordBreak: 'break-word',
                                                      lineHeight: 1.3
                                                    }}>
                                                      {rawTitle}
                                                    </span>
                                                  </div>

                                                  {/* Meta Row: Book, Unit, Question Count */}
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', fontSize: '0.68rem', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b', fontWeight: 600, marginTop: 1 }}>
                                                    {rawBook && (
                                                      <span style={{
                                                        color: isDark ? 'rgba(255,255,255,0.85)' : '#334155',
                                                        fontWeight: 700,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        maxWidth: isMobile ? 190 : 320,
                                                        background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                                                        padding: '1px 6px',
                                                        borderRadius: 4,
                                                        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
                                                      }}>
                                                        📖 {rawBook}
                                                      </span>
                                                    )}
                                                    {unitText && (
                                                      <span style={{ color: isDark ? '#93c5fd' : '#1d4ed8', fontWeight: 700 }}>
                                                        📌 {unitText}
                                                      </span>
                                                    )}
                                                    {(bookInfo?.questionCount || item.questionCount) && (
                                                      <span style={{ background: isDark ? 'rgba(2,132,199,0.15)' : '#f0f9ff', color: '#0284c7', padding: '1px 5px', borderRadius: 4, border: isDark ? '1px solid rgba(2,132,199,0.25)' : '1px solid #bae6fd', fontWeight: 700 }}>
                                                        {String(bookInfo?.questionCount || item.questionCount).includes('soru') ? (bookInfo?.questionCount || item.questionCount) : `${bookInfo?.questionCount || item.questionCount} soru`}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Action Buttons */}
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                                {item.done ? (
                                                  <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 900,
                                                    color: '#10b981',
                                                    background: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
                                                    border: '1px solid rgba(16,185,129,0.3)',
                                                    padding: '0.2rem 0.55rem',
                                                    borderRadius: 6,
                                                    whiteSpace: 'nowrap'
                                                  }}>
                                                    ✓ Tamam
                                                  </span>
                                                ) : (
                                                  <>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleStartInStudyRoom(item)}
                                                      style={{
                                                        background: isDark ? 'rgba(245,158,11,0.18)' : '#fef3c7',
                                                        color: '#d97706',
                                                        border: isDark ? '1px solid rgba(245,158,11,0.35)' : '1px solid #fde68a',
                                                        borderRadius: 7,
                                                        padding: '0.35rem 0.55rem',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 3,
                                                        whiteSpace: 'nowrap'
                                                      }}
                                                      title="Çalışma Odası"
                                                    >
                                                      <Play size={10} fill="#d97706" /> Oda
                                                    </button>

                                                    {isQuizTask && (
                                                      <button
                                                        type="button"
                                                        onClick={() => handleOpenTaskResult(item)}
                                                        style={{
                                                          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                                          color: '#ffffff',
                                                          border: 'none',
                                                          borderRadius: 7,
                                                          padding: '0.35rem 0.75rem',
                                                          fontSize: '0.74rem',
                                                          fontWeight: 900,
                                                          cursor: 'pointer',
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          gap: 3,
                                                          boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                                                          whiteSpace: 'nowrap'
                                                        }}
                                                      >
                                                        {item.isRemedial && item.stage > 1 ? <RotateCcw size={13} /> : <PlayCircle size={13} />} {item.isRemedial && item.stage > 1 ? `${item.stage}. Çözüm` : 'Çöz'}
                                                      </button>
                                                    )}
                                                  </>
                                                )}

                                                {canStudentDeleteItem(item, currentUser) && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDelete(dayObj.day, item.id)}
                                                    style={{
                                                      background: 'transparent',
                                                      border: 'none',
                                                      color: isDark ? 'rgba(255,255,255,0.3)' : '#cbd5e1',
                                                      cursor: 'pointer',
                                                      padding: 3,
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center'
                                                    }}
                                                    title="Görevi Sil"
                                                  >
                                                    <Trash2 size={13} />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}

                                      {shouldShowMoreBtn && (
                                        <div style={{ padding: '0.35rem 0' }}>
                                          <button
                                            type="button"
                                            onClick={() => setExpandedDayTasks(prev => ({ ...prev, [dayObj.day]: !prev[dayObj.day] }))}
                                            style={{
                                              width: '100%',
                                              padding: '0.65rem 1rem',
                                              borderRadius: '0.85rem',
                                              background: isDark
                                                ? (isShowAllTasks ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.15)')
                                                : (isShowAllTasks ? '#f1f5f9' : 'rgba(99,102,241,0.08)'),
                                              border: isDark
                                                ? '1px solid rgba(99,102,241,0.3)'
                                                : (isShowAllTasks ? '1px solid #cbd5e1' : '1.5px solid rgba(99,102,241,0.25)'),
                                              color: isDark ? '#a5b4fc' : '#4f46e5',
                                              fontWeight: 900,
                                              fontSize: '0.82rem',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: 8,
                                              boxShadow: '0 2px 8px rgba(99,102,241,0.08)',
                                              transition: 'all 0.2s ease'
                                            }}
                                          >
                                            {isShowAllTasks ? (
                                              <>
                                                <ChevronUp size={16} />
                                                <span>Daha Az Göster (İlk 6 Görev)</span>
                                              </>
                                            ) : (
                                              <>
                                                <ChevronDown size={16} />
                                                <span>Diğer {searchedItems.length - MAX_AGENDA_ITEMS} Görevi Göster</span>
                                                <span style={{ fontSize: '0.7rem', background: '#6366f1', color: 'white', padding: '1px 7px', borderRadius: 99, fontWeight: 900 }}>
                                                  +{searchedItems.length - MAX_AGENDA_ITEMS}
                                                </span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        )}

                        {isDayCollapsed && (
                          <div
                            onClick={() => setCollapsedAgendaDays(p => ({ ...p, [dayObj.day]: false }))}
                            style={{
                              padding: '0.65rem 1rem',
                              textAlign: 'center',
                              color: isDark ? '#94a3b8' : '#64748b',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc'
                            }}
                          >
                            📌 Bu gün için {items.length} görev kayıtlı · Görmek için dokunun
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {pct === 100 && totalItems > 0 && (
              <div style={{ marginTop: '1.5rem', background: isDark ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.6), rgba(6, 95, 70, 0.6))' : '#f0fdf4', border: isDark ? '1.5px solid rgba(52, 211, 153, 0.4)' : '1.5px solid #86efac', borderRadius: '1rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', backdropFilter: isDark ? 'blur(16px)' : 'none' }}>
                <CheckCircle2 size={24} color="#34d399" />
                <div>
                  <div style={{ fontWeight: 900, color: isDark ? '#ffffff' : '#166534' }}>Harika! Bu haftanın programı tamamlandı! 🎉</div>
                  <div style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600, marginTop: 2 }}>Tebrikler!</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly List View */}
      {programTab === 'aylik' && (
        <MonthlyListPanel
          weeklyProgram={weeklyProgram}
          allHomeworks={allHomeworks}
          currentUser={effectiveUser}
          submissions={submissions}
          curData={curData}
          books={books}
          bookTests={bookTests}
          studyPlans={studyPlans}
          studyAssignments={studyAssignments}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEditClick={(dayKey, item) => setEditingItem({ dayKey, item })}
          onOpenResult={handleOpenTaskResult}
          onStartStudy={handleStartInStudyRoom}
          isDark={isDark}
        />
      )}

      {/* Topic Pool */}
      {programTab === 'konular' && (
        <TopicPoolPanel
          topicPool={topicPool}
          setTopicPool={setTopicPool}
          onAssignTopic={({ subjectName, topicName, taskType }) => {
            setAssigningTopic({ subject: subjectName, topic: topicName, taskType });
          }}
          isDark={isDark}
        />
      )}

      {/* Add / Edit / Assign Modal */}
      {(addingToDay || editingItem || assigningTopic) && (
        <AddItemModal
          dayKey={addingToDay || editingItem?.dayKey || getTodayKey()}
          initialItem={editingItem?.item || (assigningTopic ? { subject: assigningTopic.subject, topic: assigningTopic.topic, taskType: assigningTopic.taskType } : null)}
          onAdd={handleAddItem}
          onEdit={handleEditItem}
          onClose={() => { setAddingToDay(null); setEditingItem(null); setAssigningTopic(null); }}
          topicPool={topicPool}
          isDark={isDark}
        />
      )}
    </div>
  );
}
