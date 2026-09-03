import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Award, CheckCircle2, AlertCircle, Clock, Search,
  ChevronRight, RotateCcw, Eye, Zap, Calendar, TrendingUp,
  Filter, BookOpen, Layers, Check, ArrowRight, UserCheck,
  Edit3, Trash2, Save, X, Plus, CalendarDays, RefreshCw,
  ZoomIn, ChevronLeft, Image as ImageIcon, CheckSquare
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useQuestionBank } from '../../context/QuestionBankContext';
import { useEvaluation } from '../../context/EvaluationContext';
import { useHomework } from '../../context/HomeworkContext';
import { useCoaching } from '../../context/CoachingContext';
import { useUser } from '../../context/UserContext';
import {
  getRemedialTestMasteryStatus,
  scheduleRemedialTestInProgram,
  REPETITION_PRESETS
} from '../../services/remedialSpacedRepetitionService';
import { toUUID, dbSaveRemedialRepetition, dbRecordDeletedItem } from '../../services/supabaseService';
import { idbGetPayload, idbDeletePayload } from '../../services/indexedDbService';

const SUBJECT_OPTIONS = [
  'Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler',
  'İnkılap Tarihi', 'İngilizce', 'Din Kültürü', 'Biyoloji',
  'Fizik', 'Kimya', 'Geometri', 'Edebiyat', 'Coğrafya', 'Tarih', 'Felsefe'
];

/**
 * Interactive Mini Month Calendar to directly click and select repetition dates
 */
function InteractiveRepetitionCalendar({
  startDate,
  intervals = [],
  onToggleInterval,
  isDark
}) {
  const [viewDate, setViewDate] = useState(() => {
    if (startDate) {
      const parts = startDate.split('-');
      if (parts.length === 3) return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    }
    return new Date();
  });

  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const dayShortNames = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Start date object
  const startObj = useMemo(() => {
    if (!startDate) return new Date();
    const parts = startDate.split('-');
    if (parts.length !== 3) return new Date();
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
  }, [startDate]);

  // First day of month offset (0 = Pzt, 6 = Paz)
  const firstDay = new Date(year, month, 1);
  const startDayIdx = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonthToday = today.getFullYear() === year && today.getMonth() === month;

  // Build map of selected dates to stage index
  const intervalMap = useMemo(() => {
    const map = new Map(); // key: "YYYY-MM-DD" -> { stage: 1, days: 3 }
    intervals.forEach((days, idx) => {
      const target = new Date(startObj.getFullYear(), startObj.getMonth(), startObj.getDate() + days, 12, 0, 0);
      const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
      map.set(key, { stage: idx + 1, days });
    });
    return map;
  }, [startObj, intervals]);

  const startDateKey = `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, '0')}-${String(startObj.getDate()).padStart(2, '0')}`;

  const handleDateClick = (dayNumber) => {
    const clicked = new Date(year, month, dayNumber, 12, 0, 0);
    const diffTime = clicked.getTime() - startObj.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      onToggleInterval(diffDays);
    }
  };

  // Calendar cells
  const cells = [];
  for (let i = 0; i < startDayIdx; i++) {
    cells.push({ type: 'empty', key: `empty_${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = isCurrentMonthToday && today.getDate() === d;
    const isStart = dateKey === startDateKey;
    const selectedInfo = intervalMap.get(dateKey);

    cells.push({
      type: 'day',
      key: `day_${d}`,
      dayNumber: d,
      dateKey,
      isToday,
      isStart,
      isSelected: Boolean(selectedInfo),
      stage: selectedInfo?.stage,
      days: selectedInfo?.days
    });
  }

  return (
    <div style={{
      background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
      borderRadius: 14,
      border: isDark ? '1.5px solid #334155' : '1.5px solid #e2e8f0',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }}>
      {/* Month Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{
            background: isDark ? '#1e293b' : '#f1f5f9',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            borderRadius: 8,
            width: 30,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '1rem'
          }}
          title="Önceki Ay"
        >
          ‹
        </button>

        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text)' }}>
          {monthNames[month]} {year}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          style={{
            background: isDark ? '#1e293b' : '#f1f5f9',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            borderRadius: 8,
            width: 30,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '1rem'
          }}
          title="Sonraki Ay"
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        textAlign: 'center'
      }}>
        {dayShortNames.map(wd => (
          <div key={wd} style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', padding: '2px 0' }}>
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4
      }}>
        {cells.map(cell => {
          if (cell.type === 'empty') {
            return <div key={cell.key} style={{ minHeight: 40 }} />;
          }

          let bg = isDark ? '#1e293b' : '#f8fafc';
          let borderColor = 'transparent';
          let textColor = 'var(--color-text)';
          let boxShadow = 'none';

          if (cell.isSelected) {
            bg = 'linear-gradient(135deg, #10b981, #059669)';
            textColor = '#ffffff';
            boxShadow = '0 3px 8px rgba(16, 185, 129, 0.4)';
          } else if (cell.isStart) {
            bg = isDark ? 'rgba(99, 102, 241, 0.25)' : '#e0e7ff';
            borderColor = '#6366f1';
            textColor = isDark ? '#a5b4fc' : '#4338ca';
          } else if (cell.isToday) {
            borderColor = isDark ? '#94a3b8' : '#cbd5e1';
          }

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => handleDateClick(cell.dayNumber)}
              style={{
                minHeight: 40,
                borderRadius: 9,
                background: bg,
                border: cell.isSelected ? 'none' : `1.5px solid ${borderColor}`,
                color: textColor,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '2px 0',
                position: 'relative',
                boxShadow,
                transform: cell.isSelected ? 'scale(1.03)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title={
                cell.isSelected
                  ? `${cell.stage}. Tekrar (${cell.days === 0 ? 'Bugün' : '+' + cell.days + ' Gün'}) — Kaldırmak için tıkla`
                  : cell.isStart
                    ? 'Başlangıç Günü (Bugün) — 1. Tekrarı bugüne eklemek için tıkla'
                    : 'Takvime tıklayarak tekrar günü olarak ekle'
              }
            >
              <span style={{ fontSize: '0.82rem', fontWeight: cell.isSelected || cell.isStart ? 900 : 700 }}>
                {cell.dayNumber}
              </span>

              {cell.isSelected && (
                <span style={{
                  fontSize: '0.56rem',
                  fontWeight: 900,
                  opacity: 0.95,
                  lineHeight: 1
                }}>
                  {cell.stage}. Tekrar {cell.days === 0 ? '(Bugün)' : `(+${cell.days}g)`}
                </span>
              )}

              {cell.isStart && !cell.isSelected && (
                <span style={{
                  fontSize: '0.55rem',
                  fontWeight: 800,
                  opacity: 0.9,
                  lineHeight: 1
                }}>
                  Başlangıç
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend & Instructions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
        fontWeight: 700,
        paddingTop: 6,
        borderTop: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: 6
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: '#6366f1' }} />
            <span>Başlangıç</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: '#10b981' }} />
            <span>Tekrar Günü (Sıralı)</span>
          </div>
        </div>
        <span style={{ color: '#10b981', fontWeight: 800 }}>
          💡 +15g, başlangıçtan 15 gün sonrasıdır (örn: 2 Eyl + 15g = 17 Eyl). İster takvime tıklayarak doğrudan gün seçin, ister şablon kullanın.
        </span>
      </div>
    </div>
  );
}

/**
 * Modal to edit remedial test metadata, view/preview questions, dates/intervals, and sync to study program.
 */
function EditRemedialModal({
  isOpen,
  onClose,
  testItem,
  studentsList = [],
  isDark,
  onSaveSuccess
}) {
  const { addHomework } = useHomework();
  const { addQuestion } = useQuestionBank();
  const { coachingProfiles = [], saveCoachingProfile } = useCoaching();

  const [title, setTitle] = useState(() => testItem?.title || '');
  const [subject, setSubject] = useState(() => testItem?.subject || 'Türkçe');
  const [studentId, setStudentId] = useState(() => testItem?.studentId || '');
  const [schedulePreset, setSchedulePreset] = useState(() => 'standard_leitner');
  const [plannerMode, setPlannerMode] = useState('calendar'); // 'calendar' | 'presets'
  const [intervals, setIntervals] = useState(() => testItem?.intervals || [0, 3, 7, 15]);
  const [customIntervalsStr, setCustomIntervalsStr] = useState(() => (testItem?.intervals || [0, 3, 7, 15]).join(', '));
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [syncToProgram, setSyncToProgram] = useState(true);
  const [keepMasteryTracking, setKeepMasteryTracking] = useState(true);
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'schedule' | 'general'
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Initialize questions list with images and answers
  const [questionsList, setQuestionsList] = useState(() => {
    const raw = testItem?.rawTest;
    if (Array.isArray(raw?.questionsList) && raw.questionsList.length > 0) {
      return raw.questionsList.map((q, idx) => ({
        ...q,
        id: q.id || `q_${idx}_${Date.now()}`,
        questionNo: q.questionNo || idx + 1,
        title: q.title || q.questionText || `${idx + 1}. Soru`,
        imageUrl: q.imageUrl || q.contentPayload || (Array.isArray(raw.imageUrls) ? raw.imageUrls[idx] : '') || '',
        contentPayload: q.contentPayload || q.imageUrl || (Array.isArray(raw.imageUrls) ? raw.imageUrls[idx] : '') || '',
        correctAnswer: q.correctAnswer || (raw.answerKey ? raw.answerKey[idx + 1] : 'A') || 'A'
      }));
    }
    if (Array.isArray(raw?.imageUrls) && raw.imageUrls.length > 0) {
      return raw.imageUrls.map((img, idx) => ({
        id: `q_${idx}_${Date.now()}`,
        questionNo: idx + 1,
        title: `${idx + 1}. Soru`,
        imageUrl: img,
        contentPayload: img,
        correctAnswer: (raw.answerKey ? raw.answerKey[idx + 1] : 'A') || 'A'
      }));
    }
    if (raw?.contentPayload && typeof raw.contentPayload === 'string') {
      const parts = raw.contentPayload.split(/\n\n|\n|\|/).filter(s => s.trim().length > 0);
      if (parts.length > 0 && (parts[0].startsWith('data:') || parts[0].startsWith('http'))) {
        return parts.map((img, idx) => ({
          id: `q_${idx}_${Date.now()}`,
          questionNo: idx + 1,
          title: `${idx + 1}. Soru`,
          imageUrl: img,
          contentPayload: img,
          correctAnswer: (raw.answerKey ? raw.answerKey[idx + 1] : 'A') || 'A'
        }));
      }
    }
    const qCount = testItem?.totalQuestions || 1;
    return Array.from({ length: qCount }, (_, idx) => ({
      id: `q_${idx}_${Date.now()}`,
      questionNo: idx + 1,
      title: `${idx + 1}. Soru`,
      imageUrl: '',
      correctAnswer: (raw?.answerKey ? raw.answerKey[idx + 1] : 'A') || 'A'
    }));
  });

  const [answerKey, setAnswerKey] = useState(() => {
    const raw = testItem?.rawTest?.answerKey;
    if (raw && typeof raw === 'object') return { ...raw };
    if (Array.isArray(raw)) {
      const obj = {};
      raw.forEach((ans, i) => { obj[i + 1] = ans; });
      return obj;
    }
    const obj = {};
    questionsList.forEach((q, i) => { obj[i + 1] = q.correctAnswer || 'A'; });
    return obj;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Restore images from IndexedDB if stored as placeholder
  useEffect(() => {
    async function restoreImages() {
      const raw = testItem?.rawTest;
      if (!raw) return;

      const restoredList = await Promise.all(questionsList.map(async (q, idx) => {
        let img = q.imageUrl || q.contentPayload;
        const isMissing = !img || (typeof img === 'string' && (img.includes('[STORED_IN_INDEXEDDB]') || img.includes('[LOCALSTORAGE_CACHE]')));
        if (isMissing) {
          const fromIdb = await idbGetPayload(q.id) ||
                          await idbGetPayload(String(q.id).replace(/^q_?/, '')) ||
                          await idbGetPayload(testItem.testId) ||
                          await idbGetPayload(raw.id) ||
                          await idbGetPayload(toUUID(raw.id));
          if (fromIdb) {
            img = fromIdb;
          }
        }
        return {
          ...q,
          imageUrl: img || q.imageUrl,
          contentPayload: img || q.contentPayload
        };
      }));

      setQuestionsList(restoredList);
    }

    restoreImages();
  }, [testItem?.testId]);

  // Compute preview dates for repetition intervals
  const stageDatesPreview = useMemo(() => {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return [];

    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];

    return intervals.map((days, idx) => {
      const target = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      const dateFormatted = `${target.getDate()} ${monthNames[target.getMonth()]} ${target.getFullYear()} (${dayNames[target.getDay()]})`;
      const diffLabel = days === 0 ? 'Bugün (Başlangıç)' : days === 1 ? 'Yarın (+1g)' : `+${days} Gün`;
      return {
        stage: idx + 1,
        days,
        diffLabel,
        dateFormatted
      };
    });
  }, [startDate, intervals]);

  if (!isOpen || !testItem) return null;

  const handlePresetSelect = (presetKey) => {
    setSchedulePreset(presetKey);
    if (presetKey === 'standard_leitner') {
      setIntervals([0, 3, 7, 15]);
      setCustomIntervalsStr('0, 3, 7, 15');
    } else if (presetKey === 'fast') {
      setIntervals([0, 1, 3, 7]);
      setCustomIntervalsStr('0, 1, 3, 7');
    } else if (presetKey === 'weekly') {
      setIntervals([0, 5, 10, 20]);
      setCustomIntervalsStr('0, 5, 10, 20');
    } else if (presetKey === 'tomorrow') {
      setIntervals([1, 3, 7, 15]);
      setCustomIntervalsStr('1, 3, 7, 15');
    } else if (presetKey === 'clear') {
      setIntervals([]);
      setCustomIntervalsStr('');
    }
  };

  const handleToggleInterval = (dayDiff) => {
    setIntervals(prev => {
      let next;
      if (prev.includes(dayDiff)) {
        next = prev.filter(d => d !== dayDiff);
      } else {
        next = [...prev, dayDiff].sort((a, b) => a - b);
      }
      setCustomIntervalsStr(next.join(', '));
      setSchedulePreset('custom');
      return next;
    });
  };

  const handleCustomIntervalsChange = (val) => {
    setCustomIntervalsStr(val);
    const parsed = val.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 0);
    if (parsed.length > 0) {
      setIntervals(parsed);
    }
  };

  const handleOptionChange = (qNo, opt) => {
    setAnswerKey(prev => ({
      ...prev,
      [qNo]: opt
    }));
    setQuestionsList(prev => prev.map((q, i) => (i + 1 === qNo ? { ...q, correctAnswer: opt } : q)));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('Lütfen geçerli bir test başlığı giriniz.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const raw = testItem.rawTest || {};
      const targetStudent = studentId && studentId.trim() !== '' ? studentId.trim() : null;

      // Update question list if present
      const updatedQuestionsList = questionsList.map((q, idx) => ({
        ...q,
        questionNo: idx + 1,
        title: q.title || `${idx + 1}. Soru`,
        correctAnswer: answerKey[idx + 1] || q.correctAnswer || 'A'
      }));

      const updatedPayload = {
        ...raw,
        title: title.trim(),
        testTitle: title.trim(),
        subject: subject,
        targetStudentId: targetStudent,
        studentId: targetStudent,
        assignedStudentId: targetStudent,
        targetStudentIds: targetStudent ? [targetStudent] : [],
        repetitionIntervals: intervals,
        answerKey: answerKey,
        questionCount: updatedQuestionsList.length,
        totalQuestions: updatedQuestionsList.length,
        questionsList: updatedQuestionsList,
        imageUrls: updatedQuestionsList.map(q => q.imageUrl || q.contentPayload).filter(Boolean),
        isRemedial: true,
        isRemedialTest: true,
        isTeacherRemedial: Boolean(targetStudent),
        keepMasteryTracking,
        targetMasteryPct: keepMasteryTracking ? 100 : null
      };

      // 1. Save to HomeworkContext
      if (addHomework) {
        await addHomework(updatedPayload);
      }

      // 2. Save to QuestionBankContext
      if (addQuestion) {
        await addQuestion(updatedPayload);
      }

      // 3. Save to Supabase remedial_spaced_repetition
      if (targetStudent && intervals.length > 0) {
        await dbSaveRemedialRepetition({
          studentId: targetStudent,
          testId: testItem.testId,
          homeworkId: raw.id || testItem.testId,
          intervals,
          keepMasteryTracking,
          startDate: new Date(startDate)
        });
      }

      // 4. Clean up previous student weekly program if student changed
      if (testItem.studentId && String(testItem.studentId) !== String(targetStudent) && saveCoachingProfile && Array.isArray(coachingProfiles)) {
        const oldProfile = coachingProfiles.find(p => String(p.studentId) === String(testItem.studentId));
        if (oldProfile && Array.isArray(oldProfile.weeklyProgram)) {
          const cleanedOldProg = oldProfile.weeklyProgram.map(dObj => ({
            ...dObj,
            items: (dObj.items || []).filter(it => it.testId !== testItem.testId && it.hwId !== testItem.testId && it.id !== testItem.testId)
          }));
          await saveCoachingProfile({ ...oldProfile, weeklyProgram: cleanedOldProg });
        }
      }

      // 5. Sync to student's weekly study program if target student specified
      if (syncToProgram && targetStudent && saveCoachingProfile) {
        const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
        const currentProfile = coachingProfiles.find(p => String(p.studentId) === String(targetStudent)) || {
          studentId: targetStudent,
          weeklyProgram: DAYS_LIST.map(d => ({ day: d, items: [] }))
        };

        // Clean previous instances of this test
        const cleanedProg = (currentProfile.weeklyProgram || []).map(dObj => ({
          ...dObj,
          items: (dObj.items || []).filter(it => it.testId !== testItem.testId && it.hwId !== testItem.testId && it.id !== testItem.testId)
        }));

        const updatedProg = scheduleRemedialTestInProgram({
          currentWeeklyProgram: cleanedProg,
          testItem: {
            id: testItem.testId,
            hwId: raw.id || testItem.testId,
            title: title.trim(),
            subject: subject,
            questionCount: updatedQuestionsList.length || 1
          },
          intervals,
          startDate: new Date(startDate),
          studentId: targetStudent
        });

        await saveCoachingProfile({
          ...currentProfile,
          studentId: targetStudent,
          weeklyProgram: updatedProg
        });
      }

      if (onSaveSuccess) onSaveSuccess(title.trim());
      onClose();
    } catch (err) {
      console.error('Telafi güncelleme hatası:', err);
      setErrorMsg('Güncelleme kaydedilirken hata oluştu: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const currentQ = questionsList[activeQuestionIdx] || questionsList[0] || {};
  const currentQNo = activeQuestionIdx + 1;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: isDark ? '#0f172a' : '#ffffff',
        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        borderRadius: '1.25rem',
        width: '100%',
        maxWidth: 820,
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}>
              ✏️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Telafi Testini Düzenle &amp; Soruları İncele
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Kırpılmış soruları görüntüleyin, şıkları değiştirin, tarih ve takvimi güncelleyin
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#ffffff',
          padding: '0 1rem'
        }}>
          {[
            { id: 'questions', label: `📸 Sorular & Cevaplar (${questionsList.length})`, icon: ImageIcon },
            { id: 'schedule', label: '🧠 Tekrar Planı & Tarihler', icon: CalendarDays },
            { id: 'general', label: '⚙️ Test Bilgileri', icon: Edit3 }
          ].map(tab => {
            const isSel = activeTab === tab.id;
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  borderBottom: isSel ? '3px solid #6366f1' : '3px solid transparent',
                  background: 'transparent',
                  color: isSel ? '#6366f1' : 'var(--color-text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <IconComponent size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {errorMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
              color: '#dc2626',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {/* TAB 1: QUESTIONS & VISUAL PREVIEW */}
          {activeTab === 'questions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Question Step Pills */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 4
              }}>
                {questionsList.map((q, idx) => {
                  const isSel = activeQuestionIdx === idx;
                  const curAns = answerKey[idx + 1] || q.correctAnswer || 'A';
                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => setActiveQuestionIdx(idx)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: isSel ? '2px solid #6366f1' : '1px solid var(--color-border)',
                        background: isSel ? (isDark ? 'rgba(99,102,241,0.25)' : '#e0e7ff') : (isDark ? '#1e293b' : '#f8fafc'),
                        color: isSel ? '#6366f1' : 'var(--color-text)',
                        fontSize: '0.76rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0
                      }}
                    >
                      <span>S.{idx + 1}</span>
                      <span style={{
                        background: '#10b981',
                        color: '#ffffff',
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        padding: '1px 5px',
                        borderRadius: 4
                      }}>
                        {curAns}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Question Display Card */}
              <div style={{
                background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc',
                border: '1.5px solid var(--color-border)',
                borderRadius: 14,
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#ffffff',
                      fontSize: '0.76rem',
                      fontWeight: 900,
                      padding: '3px 9px',
                      borderRadius: 6
                    }}>
                      Soru {currentQNo} / {questionsList.length}
                    </span>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--color-text)' }}>
                      {currentQ.title || `${currentQNo}. Soru`}
                    </span>
                  </div>

                  {currentQ.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setLightboxImage(currentQ.imageUrl)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        background: isDark ? '#0f172a' : '#ffffff',
                        color: 'var(--color-text)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <ZoomIn size={13} /> <span>Büyüt</span>
                    </button>
                  )}
                </div>

                {/* Question Image Preview */}
                <div style={{
                  background: isDark ? '#020617' : '#ffffff',
                  border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 220,
                  maxHeight: 400,
                  overflowY: 'auto'
                }}>
                  {currentQ.imageUrl ? (
                    <img
                      src={currentQ.imageUrl}
                      alt={`Soru ${currentQNo}`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: 360,
                        objectFit: 'contain',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                      onClick={() => setLightboxImage(currentQ.imageUrl)}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
                      <ImageIcon size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700 }}>
                        {currentQ.questionText || `${currentQNo}. Soru Metni`}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.72rem' }}>
                        (Görsel yüklenmedi veya metin tabanlı soru)
                      </p>
                    </div>
                  )}
                </div>

                {/* Option / Answer Key Selector for Current Question */}
                <div style={{
                  background: isDark ? '#0f172a' : '#ffffff',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckSquare size={16} className="text-emerald-500" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)' }}>
                      Bu Sorunun Doğru Cevabı:
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {['A', 'B', 'C', 'D', 'E'].map(opt => {
                      const isSelected = (answerKey[currentQNo] || currentQ.correctAnswer || 'A') === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleOptionChange(currentQNo, opt)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            border: isSelected ? '2px solid #059669' : '1px solid var(--color-border)',
                            background: isSelected ? '#10b981' : (isDark ? '#1e293b' : '#f1f5f9'),
                            color: isSelected ? '#ffffff' : 'var(--color-text)',
                            fontSize: '0.88rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isSelected ? '0 4px 10px rgba(16,185,129,0.3)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Previous / Next Question Navigation Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <button
                    type="button"
                    disabled={activeQuestionIdx === 0}
                    onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: isDark ? '#0f172a' : '#ffffff',
                      color: activeQuestionIdx === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: activeQuestionIdx === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      opacity: activeQuestionIdx === 0 ? 0.5 : 1
                    }}
                  >
                    <ChevronLeft size={14} /> <span>Önceki Soru</span>
                  </button>

                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                    {currentQNo} / {questionsList.length} Soru
                  </span>

                  <button
                    type="button"
                    disabled={activeQuestionIdx === questionsList.length - 1}
                    onClick={() => setActiveQuestionIdx(prev => Math.min(questionsList.length - 1, prev + 1))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: isDark ? '#0f172a' : '#ffffff',
                      color: activeQuestionIdx === questionsList.length - 1 ? 'var(--color-text-muted)' : 'var(--color-text)',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: activeQuestionIdx === questionsList.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      opacity: activeQuestionIdx === questionsList.length - 1 ? 0.5 : 1
                    }}
                  >
                    <span>Sonraki Soru</span> <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPICED REPETITION & DATES */}
          {activeTab === 'schedule' && (
            <div style={{
              background: isDark ? 'rgba(30,41,59,0.5)' : '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CalendarDays size={16} className="text-indigo-500" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    🧠 Aralıklı Tekrar Düzeni Seçimi
                  </span>
                </div>

                {/* View Switcher Tabs */}
                <div style={{
                  display: 'flex',
                  background: isDark ? '#1e293b' : '#f1f5f9',
                  borderRadius: 8,
                  padding: 2,
                  border: '1px solid var(--color-border)'
                }}>
                  <button
                    type="button"
                    onClick={() => setPlannerMode('calendar')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: plannerMode === 'calendar' ? '#6366f1' : 'transparent',
                      color: plannerMode === 'calendar' ? '#ffffff' : 'var(--color-text-muted)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Calendar size={11} /> <span>📆 Takvimden Tıkla-Seç</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlannerMode('presets')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: plannerMode === 'presets' ? '#6366f1' : 'transparent',
                      color: plannerMode === 'presets' ? '#ffffff' : 'var(--color-text-muted)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Zap size={11} /> <span>🧠 Şablonlar &amp; Aralıklar</span>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, marginRight: 6 }}>
                  Başlangıç Tarihi:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: 'var(--color-text)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              {/* 1. CALENDAR VIEW */}
              {plannerMode === 'calendar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <InteractiveRepetitionCalendar
                    startDate={startDate}
                    intervals={intervals}
                    onToggleInterval={handleToggleInterval}
                    isDark={isDark}
                  />

                  {/* Quick Presets under Calendar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Hızlı Şablon:</span>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect('standard_leitner')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      🧠 Standart (1, 3, 7, 15g)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect('fast')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Hızlı (1, 2, 4, 7g)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect('weekly')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      📅 Haftalık (2, 5, 10, 20g)
                    </button>
                    {intervals.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handlePresetSelect('clear')}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginLeft: 'auto'
                        }}
                      >
                        🗑️ Temizle
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 2. PRESETS VIEW */}
              {plannerMode === 'presets' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
                    {[
                      { id: 'standard_leitner', label: 'Standart (1, 3, 7, 15g)', icon: '🧠' },
                      { id: 'fast', label: 'Hızlı (1, 2, 4, 7g)', icon: '⚡' },
                      { id: 'weekly', label: 'Haftalık (2, 5, 10, 20g)', icon: '📅' },
                      { id: 'custom', label: 'Özel Aralık', icon: '✏️' }
                    ].map(p => {
                      const isSel = schedulePreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handlePresetSelect(p.id)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 8,
                            border: isSel ? '1.5px solid #6366f1' : '1px solid var(--color-border)',
                            background: isSel ? (isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff') : (isDark ? '#0f172a' : '#ffffff'),
                            color: isSel ? '#6366f1' : 'var(--color-text)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <span>{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 6 }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      Virgülle ayırarak günleri giriniz (Örn: 1, 3, 7, 14, 30):
                    </label>
                    <input
                      type="text"
                      value={customIntervalsStr}
                      onChange={(e) => handleCustomIntervalsChange(e.target.value)}
                      placeholder="1, 3, 7, 15"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        background: isDark ? '#0f172a' : '#ffffff',
                        color: 'var(--color-text)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Live Dates Table Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                  🗓️ Hesaplanmış Tekrar Tarihleri ({intervals.length} Aşama):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 }}>
                  {stageDatesPreview.map(s => (
                    <div
                      key={s.stage}
                      style={{
                        background: isDark ? '#0f172a' : '#ffffff',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '5px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                      }}
                    >
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#6366f1' }}>
                        {s.stage}. Tekrar ({s.days}. Gün)
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text)' }}>
                        {s.dateFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sync to Study Program Checkbox */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                marginTop: 6,
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--color-text)'
              }}>
                <input
                  type="checkbox"
                  checked={syncToProgram}
                  onChange={(e) => setSyncToProgram(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <span>📅 Öğrencinin Haftalık Çalışma Programına (Pzt-Paz) Otomatik Yerleştir</span>
              </label>
            </div>
          )}

          {/* TAB 3: GENERAL INFO */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 5 }}>
                  📝 Telafi Testi Başlığı
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: 1. Ünite Telafi Testi"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: isDark ? '#1e293b' : '#f8fafc',
                    color: 'var(--color-text)',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 5 }}>
                    📚 Ders
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: isDark ? '#1e293b' : '#f8fafc',
                      color: 'var(--color-text)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 5 }}>
                    👤 Atanan Öğrenci
                  </label>
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: isDark ? '#1e293b' : '#f8fafc',
                      color: 'var(--color-text)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="">🏢 Genel Havuz (Tüm Öğrenciler)</option>
                    {studentsList.map(st => (
                      <option key={st.id} value={st.id}>{st.name || st.fullName || 'Öğrenci'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lightbox Zoom Modal */}
        {lightboxImage && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 11000,
              background: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
            onClick={() => setLightboxImage(null)}
          >
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                style={{
                  position: 'absolute',
                  top: -40,
                  right: 0,
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
              <img
                src={lightboxImage}
                alt="Büyütülmüş Soru"
                style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc'
        }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
            Toplam: {questionsList.length} Soru
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Vazgeç
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 900,
                cursor: isSaving ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet &amp; Senkronize Et'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive Modal to pick start date, choose/customize repetition intervals,
 * see live schedule dates preview, and sync to student's weekly study program.
 */
function AddToProgramModal(props) {
  if (!props.isOpen || !props.testItem) return null;
  return <AddToProgramModalContent {...props} />;
}

function AddToProgramModalContent({
  isOpen,
  onClose,
  testItem,
  studentsList = [],
  coachingProfiles = [],
  saveCoachingProfile,
  addHomework,
  onSuccess,
  isDark
}) {
  // Selected student
  const [studentId, setStudentId] = useState(() => testItem.studentId || (studentsList[0]?.id || ''));
  // Start date in YYYY-MM-DD
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  // Repetition intervals in days
  const [intervals, setIntervals] = useState(() => (testItem.intervals && testItem.intervals.length > 0) ? testItem.intervals : [0, 3, 7, 15]);
  const [customIntervalsStr, setCustomIntervalsStr] = useState(() => ((testItem.intervals && testItem.intervals.length > 0) ? testItem.intervals : [0, 3, 7, 15]).join(', '));
  const [schedulePreset, setSchedulePreset] = useState('standard_leitner');
  const [plannerMode, setPlannerMode] = useState('calendar'); // 'calendar' | 'presets'
  const [keepMasteryTracking, setKeepMasteryTracking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Quick Start Date Buttons
  const setQuickDate = (type) => {
    const d = new Date();
    if (type === 'today') {
      // today
    } else if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (type === 'next_monday') {
      const day = d.getDay(); // 0 is Sun, 1 is Mon
      const daysUntilMonday = (8 - day) % 7 || 7;
      d.setDate(d.getDate() + daysUntilMonday);
    }
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setStartDate(formatted);
  };

  const handlePresetSelect = (presetKey) => {
    setSchedulePreset(presetKey);
    if (presetKey === 'standard_leitner') {
      setIntervals([0, 3, 7, 15]);
      setCustomIntervalsStr('0, 3, 7, 15');
    } else if (presetKey === 'fast') {
      setIntervals([0, 1, 3, 7]);
      setCustomIntervalsStr('0, 1, 3, 7');
    } else if (presetKey === 'weekly') {
      setIntervals([0, 5, 10, 20]);
      setCustomIntervalsStr('0, 5, 10, 20');
    } else if (presetKey === 'intensive') {
      setIntervals([0, 1, 2, 3]);
      setCustomIntervalsStr('0, 1, 2, 3');
    } else if (presetKey === 'tomorrow') {
      setIntervals([1, 3, 7, 15]);
      setCustomIntervalsStr('1, 3, 7, 15');
    } else if (presetKey === 'clear') {
      setIntervals([]);
      setCustomIntervalsStr('');
    }
  };

  const handleToggleInterval = (dayDiff) => {
    setIntervals(prev => {
      let next;
      if (prev.includes(dayDiff)) {
        next = prev.filter(d => d !== dayDiff);
      } else {
        next = [...prev, dayDiff].sort((a, b) => a - b);
      }
      setCustomIntervalsStr(next.join(', '));
      setSchedulePreset('custom');
      return next;
    });
  };

  const handleCustomIntervalsChange = (val) => {
    setCustomIntervalsStr(val);
    const parsed = val.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 0);
    if (parsed.length > 0) {
      setIntervals(parsed);
    }
  };

  const addIntervalDay = (dayNum) => {
    if (intervals.includes(dayNum)) return;
    const next = [...intervals, dayNum].sort((a, b) => a - b);
    setIntervals(next);
    setCustomIntervalsStr(next.join(', '));
    setSchedulePreset('custom');
  };

  const removeIntervalIdx = (idx) => {
    if (intervals.length <= 1) return;
    const next = intervals.filter((_, i) => i !== idx);
    setIntervals(next);
    setCustomIntervalsStr(next.join(', '));
    setSchedulePreset('custom');
  };

  // Live schedule preview calculation
  const stageDatesPreview = useMemo(() => {
    if (!startDate) return [];
    const parts = startDate.split('-');
    if (parts.length !== 3) return [];
    const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    if (isNaN(start.getTime())) return [];

    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

    return intervals.map((days, idx) => {
      const target = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days, 12, 0, 0);
      const dateFormatted = `${target.getDate()} ${monthNames[target.getMonth()]} ${target.getFullYear()}, ${dayNames[target.getDay()]}`;
      const diffLabel = days === 0 ? 'Bugün (Başlangıç Günü)' : days === 1 ? 'Yarın (+1 Gün)' : `+${days} Gün Sonra`;
      return {
        stage: idx + 1,
        days,
        diffLabel,
        dateFormatted
      };
    });
  }, [startDate, intervals]);

  const handleConfirmSchedule = async () => {
    if (!studentId) {
      setErrorMsg('Lütfen hedef öğrenciyi seçiniz.');
      return;
    }
    if (intervals.length === 0) {
      setErrorMsg('Lütfen takvimden veya şablonlardan en az bir tekrar tarihi belirleyiniz.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
      const targetSid = String(studentId);
      const targetUuid = String(toUUID(targetSid) || '');

      const currentProfile = coachingProfiles.find(p => {
        if (!p) return false;
        const pSid = String(p.studentId || p.userId || p.id || '');
        const pUuid = String(toUUID(pSid) || '');
        return pSid === targetSid || (targetUuid && pSid === targetUuid) || (pUuid && (pUuid === targetSid || pUuid === targetUuid));
      }) || {
        studentId: targetSid,
        weeklyProgram: DAYS_LIST.map(d => ({ day: d, items: [] }))
      };

      // 1. Remove previous instances of this test from weekly program
      const cleanedProg = (currentProfile.weeklyProgram || []).map(dObj => ({
        ...dObj,
        items: (dObj.items || []).filter(it => it.testId !== testItem.testId && it.hwId !== testItem.testId && it.id !== testItem.testId)
      }));

      // 2. Schedule test in weekly program using chosen start date and intervals
      const parts = startDate.split('-');
      const sDateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);

      const updatedProg = scheduleRemedialTestInProgram({
        currentWeeklyProgram: cleanedProg,
        testItem: {
          id: testItem.testId,
          hwId: testItem.rawTest?.id || testItem.testId,
          title: testItem.title,
          subject: testItem.subject,
          questionCount: testItem.totalQuestions || 1
        },
        intervals,
        startDate: sDateObj,
        studentId: targetSid
      });

      if (saveCoachingProfile) {
        await saveCoachingProfile({
          ...currentProfile,
          studentId: targetSid,
          weeklyProgram: updatedProg
        });
      }

      // 3. Ensure test is registered in Homeworks for target student
      if (addHomework) {
        const raw = testItem.rawTest || {};
        await addHomework({
          ...raw,
          id: testItem.testId,
          title: testItem.title,
          testTitle: testItem.title,
          subject: testItem.subject,
          studentId: targetSid,
          targetStudentId: targetSid,
          assignedStudentId: targetSid,
          targetStudentIds: [targetSid],
          targetIds: [targetSid],
          targetType: 'student',
          repetitionIntervals: intervals,
          isRemedial: true,
          isRemedialTest: true,
          isTeacherRemedial: true,
          keepMasteryTracking,
          targetMasteryPct: keepMasteryTracking ? 100 : null
        });
      }

      // 4. Save to Supabase repetition table
      await dbSaveRemedialRepetition({
        studentId: targetSid,
        testId: testItem.testId,
        homeworkId: testItem.rawTest?.id || testItem.testId,
        intervals,
        keepMasteryTracking,
        startDate: sDateObj
      });

      const matchedStudent = studentsList.find(s => String(s.id) === targetSid);
      const studentName = matchedStudent?.name || testItem.studentName || 'Öğrenci';

      if (onSuccess) {
        onSuccess(testItem.title, studentName, intervals.length);
      }
      onClose();
    } catch (err) {
      console.error('Error saving schedule to program:', err);
      setErrorMsg('Program kaydedilirken bir hata oluştu: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }} onClick={onClose}>
      <div style={{
        background: isDark ? '#0f172a' : '#ffffff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 600,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div style={{
          padding: '1.2rem 1.4rem',
          borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? 'rgba(15, 23, 42, 0.95)' : '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <CalendarDays size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Haftalık Programa Ekle &amp; Tekrar Planı
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {testItem.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '1.25rem 1.4rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {errorMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Target Student Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>
              👤 Hedef Öğrenci
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '0.86rem',
                fontWeight: 700,
                outline: 'none'
              }}
            >
              {studentsList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.grade ? `(${s.grade}. Sınıf)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Selection with Quick Pills */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)' }}>
                🚀 Başlangıç Tarihi
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setQuickDate('today')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Bugün
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('tomorrow')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Yarın
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('next_monday')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Pazartesi
                </button>
              </div>
            </div>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '0.86rem',
                fontWeight: 700,
                outline: 'none'
              }}
            />
          </div>

          {/* Repetition Mode Switcher (Interactive Calendar vs Presets) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)' }}>
                🧠 Aralıklı Tekrar Düzeni Seçimi
              </label>

              {/* View Switcher Tabs */}
              <div style={{
                display: 'flex',
                background: isDark ? '#1e293b' : '#f1f5f9',
                borderRadius: 8,
                padding: 2,
                border: '1px solid var(--color-border)'
              }}>
                <button
                  type="button"
                  onClick={() => setPlannerMode('calendar')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: plannerMode === 'calendar' ? '#10b981' : 'transparent',
                    color: plannerMode === 'calendar' ? '#ffffff' : 'var(--color-text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Calendar size={12} /> <span>📆 Takvimden Tıkla-Seç</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlannerMode('presets')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: plannerMode === 'presets' ? '#10b981' : 'transparent',
                    color: plannerMode === 'presets' ? '#ffffff' : 'var(--color-text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Zap size={12} /> <span>🧠 Şablonlar &amp; Aralıklar</span>
                </button>
              </div>
            </div>

            {/* 1. INTERACTIVE CALENDAR VIEW */}
            {plannerMode === 'calendar' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <InteractiveRepetitionCalendar
                  startDate={startDate}
                  intervals={intervals}
                  onToggleInterval={handleToggleInterval}
                  isDark={isDark}
                />

                {/* Quick Presets for Calendar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Hızlı Şablon:</span>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('standard_leitner')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🧠 Standart (Bugün, 3, 7, 15g)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('fast')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Hızlı (Bugün, 1, 3, 7g)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('weekly')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📅 Haftalık (Bugün, 5, 10, 20g)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('tomorrow')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🎯 Yarından Başla (1, 3, 7, 15g)
                  </button>
                  {intervals.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePresetSelect('clear')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      🗑️ Temizle
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 2. PRESETS & CUSTOM INTERVALS VIEW */}
            {plannerMode === 'presets' && (
              <div>
                {/* Presets Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {[
                    { id: 'standard_leitner', label: 'Standart Leitner', sub: 'Bugün, 3, 7, 15 Gün', icon: '🧠' },
                    { id: 'fast', label: 'Hızlı Pekiştirme', sub: 'Bugün, 1, 3, 7 Gün', icon: '⚡' },
                    { id: 'weekly', label: 'Haftalık Tekrar', sub: 'Bugün, 5, 10, 20 Gün', icon: '📅' },
                    { id: 'tomorrow', label: 'Yarından Başla', sub: '1, 3, 7, 15 Gün', icon: '🎯' }
                  ].map(p => {
                    const isSelected = schedulePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePresetSelect(p.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: isSelected ? '2px solid #10b981' : '1px solid var(--color-border)',
                          background: isSelected ? (isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5') : 'var(--color-surface)',
                          color: isSelected ? '#059669' : 'var(--color-text)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{p.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{p.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Add Day Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Hızlı Gün Ekle:</span>
                  {[0, 1, 2, 3, 5, 7, 10, 14, 21, 30].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => addIntervalDay(d)}
                      disabled={intervals.includes(d)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        background: intervals.includes(d) ? 'rgba(16,185,129,0.1)' : 'var(--color-surface)',
                        color: intervals.includes(d) ? '#10b981' : 'var(--color-text-muted)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: intervals.includes(d) ? 'default' : 'pointer',
                        opacity: intervals.includes(d) ? 0.6 : 1
                      }}
                    >
                      {d === 0 ? '+0g (Bugün)' : d === 1 ? '+1g (Yarın)' : `+${d}g`}
                    </button>
                  ))}
                </div>

                {/* Custom Comma Input */}
                <div style={{ marginTop: 6 }}>
                  <input
                    type="text"
                    value={customIntervalsStr}
                    onChange={(e) => handleCustomIntervalsChange(e.target.value)}
                    placeholder="Örn: 0, 3, 7, 15"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Interval Chips Summary (Always shown) */}
            <div style={{
              marginTop: 10,
              padding: '8px 10px',
              borderRadius: 10,
              background: isDark ? 'rgba(30,41,59,0.5)' : '#f8fafc',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                  Seçilen Tekrar Sırası:
                </span>
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}>
                  {intervals.length} Tekrar Aşaması
                </span>
              </div>

              {intervals.length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  Henüz bir tekrar tarihi seçilmedi. Lütfen takvime tıklayarak günleri seçiniz.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {intervals.map((dayNum, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 7,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span>
                        {idx + 1}. Aşama: {dayNum === 0 ? 'Bugün (0g)' : dayNum === 1 ? 'Yarın (+1g)' : `+${dayNum}g`}
                      </span>
                      <span
                        onClick={() => removeIntervalIdx(idx)}
                        style={{ cursor: 'pointer', opacity: 0.8, fontSize: '0.85rem' }}
                        title="Bu aşamayı kaldır"
                      >
                        ×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live Schedule Timeline Preview */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>
              📅 Canlı Takvim &amp; Tekrar Çizelgesi Önizlemesi
            </label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              maxHeight: 160,
              overflowY: 'auto'
            }}>
              {stageDatesPreview.map((step) => (
                <div
                  key={step.stage}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
                    border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {step.stage}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)' }}>
                        {step.dateFormatted}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                        {step.stage}. Tekrar ({step.diffLabel})
                      </div>
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    fontSize: '0.68rem',
                    fontWeight: 800
                  }}>
                    +{step.days} Gün
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mastery Tracking Option */}
          <div style={{
            padding: '10px 12px',
            borderRadius: 12,
            background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <input
              type="checkbox"
              id="keepMasteryTrack"
              checked={keepMasteryTracking}
              onChange={(e) => setKeepMasteryTracking(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }}
            />
            <label htmlFor="keepMasteryTrack" style={{ fontSize: '0.76rem', color: 'var(--color-text)', fontWeight: 700, cursor: 'pointer' }}>
              🏆 %100 Ustalık Modu (Öğrenci testi sıfır yanlışla bitirene kadar tekrarlara devam edilsin)
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={handleConfirmSchedule}
            disabled={isSaving}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 900,
              cursor: isSaving ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <CalendarDays size={14} />}
            <span>{isSaving ? 'Kaydediliyor...' : '🚀 Programa Ekle ve Başlat'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeacherRemedialTracker({ isDark: propIsDark, targetStudentId = null }) {
  const themeContext = useTheme();
  const isDark = propIsDark !== undefined ? propIsDark : themeContext?.isDark;
  const navigate = useNavigate();

  const { tests = [], questions = [], deleteQuestion } = useQuestionBank();
  const { homeworks = [], addHomework, deleteHomework } = useHomework();
  const { coachingProfiles = [], saveCoachingProfile } = useCoaching();
  const { submissions = [] } = useEvaluation();
  const { users = [], students = [] } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('Tümü');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all' | 'in_progress' | 'mastered'

  // Modal State
  const [editingTest, setEditingTest] = useState(null);
  const [schedulingTest, setSchedulingTest] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [deletedIdsSet, setDeletedIdsSet] = useState(() => {
    try {
      const saved = localStorage.getItem('eTestDeletedRemedialTests');
      const parsed = saved ? JSON.parse(saved) : [];
      return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      return new Set();
    }
  });

  const allDeletedIdentifiers = useMemo(() => {
    const combined = new Set(deletedIdsSet);
    try {
      const hwDel = localStorage.getItem('eTestDeletedHomeworks');
      if (hwDel) {
        const parsed = JSON.parse(hwDel);
        if (Array.isArray(parsed)) parsed.forEach(id => combined.add(String(id)));
      }
    } catch {}
    try {
      const qDel = localStorage.getItem('eTestDeletedQuestions');
      if (qDel) {
        const parsed = JSON.parse(qDel);
        if (Array.isArray(parsed)) parsed.forEach(id => combined.add(String(id)));
      }
    } catch {}
    return combined;
  }, [deletedIdsSet]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Identify all remedial tests assigned by or for students
  const remedialMasteryList = useMemo(() => {
    const allItems = [...tests, ...questions, ...homeworks];
    const candidateTests = allItems.filter(t => {
      if (!t) return false;
      const tId = String(t.id || '');
      const tUuid = String(toUUID(t.id) || '');
      const tClean = tId.replace(/^hw_/, '').replace(/^q_/, '');
      if (
        allDeletedIdentifiers.has(tId) ||
        (tUuid && allDeletedIdentifiers.has(tUuid)) ||
        (tClean && allDeletedIdentifiers.has(tClean))
      ) {
        return false;
      }

      return t.isRemedialTest === true ||
             t.isRemedial === true ||
             t.isTeacherRemedial === true ||
             t.sourceType === 'pdfSlicer' ||
             t.sourceType === 'pdfSlicerRemedial' ||
             t.type === 'remedial' ||
             t.type === 'remedialTest' ||
             (t.title && (t.title.includes('Telafi') || t.title.includes('Kırpılmış')));
    });

    // Deduplicate: Merge matching questions and homeworks of the same remedial test
    const mergedMap = new Map();
    candidateTests.forEach(t => {
      const cleanTitle = (t.title || t.name || '').trim().toLowerCase();
      const cleanSubj = (t.subject || '').trim().toLowerCase();
      const groupKey = cleanTitle ? `${cleanTitle}__${cleanSubj}` : String(t.id);

      if (!mergedMap.has(groupKey)) {
        mergedMap.set(groupKey, {
          ...t,
          allIds: [String(t.id), t.hwId, t.testId, t.questionId, t.supabaseId].filter(Boolean)
        });
      } else {
        const existing = mergedMap.get(groupKey);
        const combinedIds = Array.from(new Set([...(existing.allIds || []), String(t.id), t.hwId, t.testId, t.questionId, t.supabaseId].filter(Boolean)));
        mergedMap.set(groupKey, {
          ...existing,
          ...t,
          id: existing.id || t.id,
          hwId: existing.hwId || t.hwId || (String(existing.id).startsWith('hw_') ? existing.id : (String(t.id).startsWith('hw_') ? t.id : null)),
          questionId: existing.questionId || t.questionId || (String(existing.id).startsWith('q_') ? existing.id : (String(t.id).startsWith('q_') ? t.id : null)),
          targetStudentId: existing.targetStudentId || t.targetStudentId || existing.studentId || t.studentId,
          studentId: existing.studentId || t.studentId || existing.targetStudentId || t.targetStudentId,
          questionsList: (existing.questionsList && existing.questionsList.length > 0) ? existing.questionsList : t.questionsList,
          imageUrls: (existing.imageUrls && existing.imageUrls.length > 0) ? existing.imageUrls : t.imageUrls,
          allIds: combinedIds,
          rawTest: t
        });
      }
    });

    const uniqueTests = Array.from(mergedMap.values());
    const rows = [];

    uniqueTests.forEach(t => {
      const targetStudentIds = new Set();
      if (t.studentId && t.studentId !== 'teacher') targetStudentIds.add(String(t.studentId));
      if (t.assignedStudentId && t.assignedStudentId !== 'teacher') targetStudentIds.add(String(t.assignedStudentId));
      if (t.targetStudentId && t.targetStudentId !== 'teacher') targetStudentIds.add(String(t.targetStudentId));
      if (t.targetStudent && t.targetStudent !== 'teacher') targetStudentIds.add(String(t.targetStudent));
      if (t.raw_data?.targetStudentId && t.raw_data.targetStudentId !== 'teacher') targetStudentIds.add(String(t.raw_data.targetStudentId));
      if (t.raw_data?.studentId && t.raw_data.studentId !== 'teacher') targetStudentIds.add(String(t.raw_data.studentId));
      if (Array.isArray(t.targetIds)) t.targetIds.forEach(id => id && id !== 'teacher' && targetStudentIds.add(String(id)));
      if (Array.isArray(t.studentIds)) t.studentIds.forEach(id => id && id !== 'teacher' && targetStudentIds.add(String(id)));
      if (Array.isArray(t.targetStudentIds)) t.targetStudentIds.forEach(id => id && id !== 'teacher' && targetStudentIds.add(String(id)));

      // Also check submissions for this test
      const tIds = new Set((t.allIds || [t.id]).flatMap(id => [String(id), String(id).replace(/^bt_|^q_|^hw_/, ''), toUUID(id) ? String(toUUID(id)) : null]).filter(Boolean));
      const cleanTTitle = (t.title || t.name || '').trim().toLowerCase();

      const testSubs = (submissions || []).filter(s => {
        if (!s) return false;
        const sId = String(s.id || '');
        const suId = String(s.supabaseId || '');
        const answersArr = Array.isArray(s.answers) ? s.answers : [];
        const meta = answersArr.find(a => a?.type === 'metadata') || {};
        const realId = String(meta.realId || s.realId || '');
        
        if (s.status === 'in_progress' || s.status === 'draft' || meta.status === 'in_progress') return false;
        if (sId.startsWith('draft_') || sId.startsWith('64726166') || suId.startsWith('64726166') || realId.startsWith('draft_')) return false;

        const subFields = [
          s.testId,
          s.test_id,
          s.realTestId,
          s.hwId,
          s.homeworkId,
          s.bookTestId,
          s.id,
          s.supabaseId,
          meta.realTestId,
          meta.bookTestId,
          meta.hwId,
          meta.realId,
          meta.testId
        ].filter(Boolean).map(String);

        const subMatch = subFields.some(sf => tIds.has(sf) || tIds.has(sf.replace(/^bt_|^q_|^hw_/, '')));
        const subTitle = (s.testTitle || s.title || s.test_title || meta.testTitle || '').trim().toLowerCase();
        const titleMatch = Boolean(cleanTTitle && subTitle && subTitle === cleanTTitle);

        return subMatch || titleMatch;
      });

      testSubs.forEach(s => {
        const sid = s.studentId || s.userId || s.student_id;
        if (sid && sid !== 'teacher') targetStudentIds.add(String(sid));
      });

      if (targetStudentIds.size > 0) {
        targetStudentIds.forEach(sid => {
          const studentObj = (students.length > 0 ? students : users).find(u => String(u.id) === sid || (toUUID(u.id) && String(toUUID(u.id)) === String(toUUID(sid))));
          const studentName = studentObj?.name || studentObj?.fullName || 'Öğrenci';
          const studentSubs = testSubs.filter(s => String(s.studentId || s.userId || s.student_id) === sid || (toUUID(s.studentId) && String(toUUID(s.studentId)) === String(toUUID(sid))));
          const statusInfo = getRemedialTestMasteryStatus(t, studentSubs);

          rows.push({
            ...statusInfo,
            studentId: sid,
            studentName,
            studentObj,
            allIds: t.allIds || [t.id],
            rawTest: t
          });
        });
      } else {
        const statusInfo = getRemedialTestMasteryStatus(t, testSubs);
        rows.push({
          ...statusInfo,
          studentId: null,
          studentName: '🏢 Genel Telafi Havuzu',
          studentObj: null,
          allIds: t.allIds || [t.id],
          rawTest: t
        });
      }
    });

    return rows;
  }, [tests, questions, homeworks, submissions, users, students, allDeletedIdentifiers]);

  // Filtered List
  const scopedList = useMemo(() => {
    if (!targetStudentId || targetStudentId === 'all') return remedialMasteryList;
    const targetStr = String(targetStudentId);
    const targetUuid = String(toUUID(targetStudentId) || '');
    return remedialMasteryList.filter(item => {
      if (!item.studentId) return false;
      const sid = String(item.studentId);
      return sid === targetStr || (targetUuid && (sid === targetUuid || toUUID(sid) === targetUuid));
    });
  }, [remedialMasteryList, targetStudentId]);

  // Filtered List
  const filteredList = useMemo(() => {
    return scopedList.filter(item => {
      const matchSearch = !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase());

      const matchSubject = selectedSubjectFilter === 'Tümü' || item.subject === selectedSubjectFilter;

      const matchStatus = selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'mastered' && item.isMastered) ||
        (selectedStatusFilter === 'in_progress' && !item.isMastered);

      return matchSearch && matchSubject && matchStatus;
    }).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true, sensitivity: 'base' }));
  }, [scopedList, searchQuery, selectedSubjectFilter, selectedStatusFilter]);

  // Overview KPIs
  const stats = useMemo(() => {
    const total = scopedList.length;
    const mastered = scopedList.filter(i => i.isMastered).length;
    const inProgress = total - mastered;
    const totalSolves = scopedList.reduce((acc, i) => acc + i.solveCount, 0);

    return { total, mastered, inProgress, totalSolves };
  }, [scopedList]);

  // Quick sync to weekly program
  const handleQuickSyncToProgram = async (item) => {
    if (!item) return;
    if (!item.studentId) {
      setEditingTest(item);
      showToast('⚠️ Bu telafi testini programa eklemek için lütfen önce bir öğrenci seçiniz.');
      return;
    }
    try {
      const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
      const targetSid = String(item.studentId);
      const targetUuid = String(toUUID(targetSid) || '');

      const currentProfile = coachingProfiles.find(p => {
        if (!p) return false;
        const pSid = String(p.studentId || p.userId || p.id || '');
        const pUuid = String(toUUID(pSid) || '');
        return pSid === targetSid || (targetUuid && pSid === targetUuid) || (pUuid && (pUuid === targetSid || pUuid === targetUuid));
      }) || {
        studentId: item.studentId,
        weeklyProgram: DAYS_LIST.map(d => ({ day: d, items: [] }))
      };

      const intervals = item.intervals && item.intervals.length > 0 ? item.intervals : [1, 3, 7, 15];

      // Remove existing items for this test
      const cleanedProg = (currentProfile.weeklyProgram || []).map(dObj => ({
        ...dObj,
        items: (dObj.items || []).filter(it => it.testId !== item.testId && it.hwId !== item.testId)
      }));

      const updatedProg = scheduleRemedialTestInProgram({
        currentWeeklyProgram: cleanedProg,
        testItem: {
          id: item.testId,
          hwId: item.rawTest?.id || item.testId,
          title: item.title,
          subject: item.subject,
          questionCount: item.totalQuestions || 1
        },
        intervals,
        startDate: new Date(),
        studentId: item.studentId
      });

      await saveCoachingProfile({
        ...currentProfile,
        studentId: item.studentId,
        weeklyProgram: updatedProg
      });

      // Also ensure it is registered in homeworks with target student
      if (addHomework) {
        const raw = item.rawTest || {};
        await addHomework({
          ...raw,
          id: item.testId,
          title: item.title,
          testTitle: item.title,
          subject: item.subject,
          studentId: item.studentId,
          targetStudentId: item.studentId,
          assignedStudentId: item.studentId,
          targetStudentIds: [item.studentId],
          targetIds: [item.studentId],
          targetType: 'student',
          isRemedial: true,
          isRemedialTest: true,
          isTeacherRemedial: true
        });
      }

      showToast(`✓ "${item.title}" öğrencisi (${item.studentName}) için haftalık programa ve ödevlere eklendi!`);
    } catch (err) {
      console.error('Programa ekleme hatası:', err);
      showToast(`❌ Programa eklenirken hata oluştu.`);
    }
  };

  // Delete remedial test completely
  const handleDeleteTest = async (item) => {
    const testTitle = item.title || item.rawTest?.title || 'Bu telafi testini';
    if (!window.confirm(`"${testTitle}" telafi testini ve ilişkili tüm kayıtları tamamen silmek istediğinize emin misiniz?`)) return;

    try {
      const idsToDelete = new Set();
      if (item.testId) idsToDelete.add(String(item.testId));
      if (item.id) idsToDelete.add(String(item.id));
      if (item.hwId) idsToDelete.add(String(item.hwId));
      if (item.questionId) idsToDelete.add(String(item.questionId));
      if (item.rawTest?.id) idsToDelete.add(String(item.rawTest.id));
      if (item.rawTest?.hwId) idsToDelete.add(String(item.rawTest.hwId));
      if (item.rawTest?.testId) idsToDelete.add(String(item.rawTest.testId));
      if (item.rawTest?.supabaseId) idsToDelete.add(String(item.rawTest.supabaseId));
      if (item.rawTest?.questionId) idsToDelete.add(String(item.rawTest.questionId));
      // Expand UUIDs and stripped prefixes
      const arrayIds = Array.from(idsToDelete);
      arrayIds.forEach(id => {
        const u = toUUID(id);
        if (u) idsToDelete.add(String(u));
        const clean = id.replace(/^hw_/, '').replace(/^q_/, '');
        if (clean) idsToDelete.add(clean);
      });

      // 1. Instantly update deleted state so the card vanishes immediately
      setDeletedIdsSet(prev => {
        const next = new Set(prev);
        idsToDelete.forEach(id => next.add(id));
        try {
          localStorage.setItem('eTestDeletedRemedialTests', JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });

      // 2. Add to eTestDeletedHomeworks & eTestDeletedQuestions
      try {
        const hwDelSaved = localStorage.getItem('eTestDeletedHomeworks');
        const hwDel = new Set(hwDelSaved ? JSON.parse(hwDelSaved) : []);
        idsToDelete.forEach(id => hwDel.add(id));
        localStorage.setItem('eTestDeletedHomeworks', JSON.stringify(Array.from(hwDel)));
      } catch {}

      try {
        const qDelSaved = localStorage.getItem('eTestDeletedQuestions');
        const qDel = new Set(qDelSaved ? JSON.parse(qDelSaved) : []);
        idsToDelete.forEach(id => qDel.add(id));
        localStorage.setItem('eTestDeletedQuestions', JSON.stringify(Array.from(qDel)));
      } catch {}

      // 3. Delete from HomeworkContext & QuestionBankContext & IndexedDB & Supabase
      for (const id of idsToDelete) {
        try { if (deleteHomework) await deleteHomework(id); } catch (e) { console.warn('deleteHomework:', e); }
        try { if (deleteQuestion) await deleteQuestion(id); } catch (e) { console.warn('deleteQuestion:', e); }
        try { await idbDeletePayload(id); } catch (e) {}
        try { await dbRecordDeletedItem(id, 'remedial_test'); } catch (e) {}
      }

      // 4. Clean up from all coaching profiles
      if (saveCoachingProfile && Array.isArray(coachingProfiles)) {
        for (const prof of coachingProfiles) {
          if (prof && Array.isArray(prof.weeklyProgram)) {
            const hasMatch = prof.weeklyProgram.some(d => (d.items || []).some(it => 
              idsToDelete.has(String(it.testId)) || 
              idsToDelete.has(String(it.hwId)) || 
              idsToDelete.has(String(it.id)) ||
              (normTitle && ((it.text && it.text.toLowerCase().includes(normTitle)) || (it.topic && it.topic.toLowerCase().includes(normTitle))))
            ));
            if (hasMatch) {
              const updatedProg = prof.weeklyProgram.map(dObj => ({
                ...dObj,
                items: (dObj.items || []).filter(it => 
                  !idsToDelete.has(String(it.testId)) && 
                  !idsToDelete.has(String(it.hwId)) && 
                  !idsToDelete.has(String(it.id)) &&
                  !(normTitle && ((it.text && it.text.toLowerCase().includes(normTitle)) || (it.topic && it.topic.toLowerCase().includes(normTitle))))
                )
              }));
              await saveCoachingProfile({ ...prof, weeklyProgram: updatedProg });
            }
          }
        }
      }

      showToast(`✓ "${testTitle}" başarıyla silindi.`);
    } catch (err) {
      console.error('Silme hatası:', err);
      showToast(`❌ Test silinirken bir hata oluştu.`);
    }
  };

  if (remedialMasteryList.length === 0) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px dashed var(--color-border)',
        borderRadius: 20,
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        margin: '1.25rem 0'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✂️</div>
        <h4 style={{ margin: '0 0 6px', fontWeight: 900, color: 'var(--color-text)', fontSize: '1.05rem' }}>
          Henüz Atanmış Telafi Testi Bulunmuyor
        </h4>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: 450, marginInline: 'auto', lineHeight: 1.4 }}>
          Öğrencilerinizin yanlış yaptığı sorulardan PDF Soru Kırpıcı veya Hatalar Havuzundan aralıklı tekrar telafi testleri oluşturup atayabilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1.5px solid var(--color-border)',
      borderRadius: 20,
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 10000,
          background: isDark ? '#10b981' : '#059669',
          color: '#ffffff',
          padding: '0.65rem 1.25rem',
          borderRadius: 10,
          fontSize: '0.84rem',
          fontWeight: 900,
          boxShadow: '0 10px 25px -5px rgba(16,185,129,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        paddingBottom: '0.9rem',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            fontSize: '1.25rem'
          }}>
            🎯
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-text)' }}>
              ✂️ Atanan Telafi Testleri & %100 Ustalık Takip Paneli
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Telafi testlerini düzenleyin, soruları inceleyin, aralıklı tekrar tarihlerini güncelleyin ve haftalık ders programında canlı takip edin.
            </p>
          </div>
        </div>

        {/* Top KPI Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 99,
            background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
            color: '#6366f1',
            border: '1px solid rgba(99,102,241,0.3)'
          }}>
            📝 {stats.total} Toplam Telafi
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 99,
            background: isDark ? 'rgba(16,185,129,0.18)' : '#d1fae5',
            color: '#059669',
            border: '1px solid rgba(16,185,129,0.3)'
          }}>
            🏆 {stats.mastered} Mezun / %100 Tamamlanan
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 99,
            background: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
            color: '#d97706',
            border: '1px solid rgba(245,158,11,0.3)'
          }}>
            🌱 {stats.inProgress} Devam Eden
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        flexWrap: 'wrap',
        marginBottom: '1rem'
      }}>
        <div style={{
          flex: '1 1 200px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Öğrenci adı, test başlığı veya ders ara..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: isDark ? '#1e293b' : '#f8fafc',
              color: 'var(--color-text)',
              fontSize: '0.78rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: isDark ? '#1e293b' : '#f8fafc',
            color: 'var(--color-text)',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <option value="all">Tüm Durumlar</option>
          <option value="in_progress">🌱 Devam Edenler</option>
          <option value="mastered">🏆 %100 Ustalaşanlar</option>
        </select>
      </div>

      {/* Remedial List Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
        gap: '0.85rem'
      }}>
        {filteredList.map(item => {
          return (
            <div
              key={`${item.testId}_${item.studentId || 'pool'}`}
              style={{
                background: isDark ? 'rgba(30,41,59,0.7)' : '#ffffff',
                border: item.isMastered
                  ? '1.5px solid rgba(16,185,129,0.5)'
                  : '1.5px solid var(--color-border)',
                borderRadius: 14,
                padding: '0.95rem 1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.65rem',
                boxShadow: item.isMastered
                  ? '0 4px 14px rgba(16,185,129,0.1)'
                  : '0 2px 8px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                {/* Student & Mastery Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {item.studentName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 900, fontSize: '0.84rem', color: 'var(--color-text)' }}>
                      {item.studentName}
                    </span>
                  </div>

                  {item.isMastered ? (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5',
                      color: '#059669',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      <CheckCircle2 size={11} /> %100 Ustalaştı 🏆
                    </span>
                  ) : item.isSolved ? (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7',
                      color: '#d97706'
                    }}>
                      🌱 Aşama {item.stageLevel} (%{item.currentScorePct})
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2',
                      color: '#dc2626'
                    }}>
                      ⏳ Henüz Çözülmedi
                    </span>
                  )}
                </div>

                {/* Test Title & Subject */}
                <h4 style={{
                  margin: '0 0 4px',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  color: 'var(--color-text)',
                  lineHeight: 1.3
                }}>
                  {item.title}
                </h4>

                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>📚 {item.subject}</span>
                  <span>•</span>
                  <span>📝 {item.totalQuestions} Soru</span>
                  <span>•</span>
                  <span>🔁 {item.solveCount} Kez Çözüldü</span>
                  {item.intervals && item.intervals.length > 0 && (
                    <>
                      <span>•</span>
                      <span style={{ color: '#6366f1', fontWeight: 800 }}>
                        🗓️ {item.intervals.join(', ')} Günlük Plan
                      </span>
                    </>
                  )}
                </div>

                {/* Score & Progression Bar */}
                {item.isSolved && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      marginBottom: 3
                    }}>
                      <span style={{ color: '#16a34a' }}>✓ {item.latestCorrect} Doğru</span>
                      <span style={{ color: '#dc2626' }}>✗ {item.latestWrong} Yanlış</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>— {item.latestBlank} Boş</span>
                      <span style={{ color: item.isMastered ? '#059669' : '#6366f1', fontWeight: 900 }}>
                        Başarı: %{item.currentScorePct}
                      </span>
                    </div>

                    <div style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 99,
                      background: isDark ? '#334155' : '#e2e8f0',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${item.currentScorePct}%`,
                        height: '100%',
                        borderRadius: 99,
                        background: item.isMastered
                          ? 'linear-gradient(90deg, #10b981, #059669)'
                          : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => setEditingTest(item)}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: 8,
                      background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                      border: '1px solid rgba(99,102,241,0.3)',
                      color: '#6366f1',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                    title="Testi, Soruları, Tarihleri ve Cevap Anahtarını Düzenle"
                  >
                    <Edit3 size={12} /> <span>✏️ Soruları &amp; Planı Düzenle</span>
                  </button>

                  {/* Sync to Program Button */}
                  <button
                    type="button"
                    onClick={() => setSchedulingTest(item)}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: 8,
                      background: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
                      border: '1px solid rgba(16,185,129,0.3)',
                      color: '#059669',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                    title="Aralıklı Tekrar Tarihlerini Belirle ve Haftalık Programa Ekle"
                  >
                    <CalendarDays size={12} /> <span>📅 Programa Ekle</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {/* View Solution (if solved) */}
                  {item.submissions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const latestSub = item.submissions[item.submissions.length - 1];
                        navigate(`/quiz-review/${item.testId}?studentId=${item.studentId}&submissionId=${latestSub.id}&teacher=true`, {
                          state: { from: '/teacher', isTeacher: true }
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        borderRadius: 8,
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <Eye size={12} /> <span>Son Çözüm</span>
                    </button>
                  )}

                  {/* Go to student coaching page */}
                  {item.studentId && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/coaching/${item.studentId}`);
                      }}
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        borderRadius: 8,
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                      title="Öğrencinin Haftalık Koçluk & Çalışma Programını Aç"
                    >
                      <Calendar size={12} /> <span>Programı Aç</span>
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteTest(item)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 8,
                      background: isDark ? 'rgba(239,68,68,0.12)' : '#fee2e2',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#dc2626',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Testi Tamamen Sil"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Remedial Modal */}
      {editingTest && (
        <EditRemedialModal
          isOpen={Boolean(editingTest)}
          testItem={editingTest}
          onClose={() => setEditingTest(null)}
          isDark={isDark}
          studentsList={students.length > 0 ? students : users.filter(u => u.role === 'student')}
          onSaveSuccess={(newTitle) => showToast(`✓ "${newTitle}" başarıyla güncellendi!`)}
        />
      )}

      {/* Add To Weekly Program & Schedule Modal */}
      {schedulingTest && (
        <AddToProgramModal
          isOpen={Boolean(schedulingTest)}
          testItem={schedulingTest}
          onClose={() => setSchedulingTest(null)}
          studentsList={students.length > 0 ? students : users.filter(u => u.role === 'student')}
          coachingProfiles={coachingProfiles}
          saveCoachingProfile={saveCoachingProfile}
          addHomework={addHomework}
          isDark={isDark}
          onSuccess={(title, sName, count) => {
            showToast(`✓ "${title}" ${count} aşamalı tekrar olarak ${sName} öğrencisinin haftalık programına eklendi!`);
          }}
        />
      )}
    </div>
  );
}
