import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Award, CheckCircle2, AlertCircle, Clock, Search,
  ChevronRight, RotateCcw, Eye, Zap, Calendar, TrendingUp,
  Filter, BookOpen, Layers, Check, ArrowRight, UserCheck,
  Edit3, Trash2, Save, X, Plus, CalendarDays, RefreshCw
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

const SUBJECT_OPTIONS = [
  'Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler',
  'İnkılap Tarihi', 'İngilizce', 'Din Kültürü', 'Biyoloji',
  'Fizik', 'Kimya', 'Geometri', 'Edebiyat', 'Coğrafya', 'Tarih', 'Felsefe'
];

/**
 * Modal to edit remedial test metadata, dates/intervals, answer key and study program sync.
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
  const [intervals, setIntervals] = useState(() => testItem?.intervals || [1, 3, 7, 15]);
  const [customIntervalsStr, setCustomIntervalsStr] = useState(() => (testItem?.intervals || [1, 3, 7, 15]).join(', '));
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [syncToProgram, setSyncToProgram] = useState(true);
  const [keepMasteryTracking, setKeepMasteryTracking] = useState(true);
  const [answerKey, setAnswerKey] = useState(() => {
    const raw = testItem?.rawTest?.answerKey;
    if (raw && typeof raw === 'object') return { ...raw };
    if (Array.isArray(raw)) {
      const obj = {};
      raw.forEach((ans, i) => { obj[i + 1] = ans; });
      return obj;
    }
    const qList = testItem?.rawTest?.questionsList;
    if (Array.isArray(qList)) {
      const obj = {};
      qList.forEach((q, i) => { obj[i + 1] = q.correctAnswer || 'A'; });
      return obj;
    }
    return {};
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Compute preview dates for repetition intervals
  const stageDatesPreview = useMemo(() => {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return [];

    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'];

    return intervals.map((days, idx) => {
      const target = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      const dateFormatted = `${target.getDate()} ${monthNames[target.getMonth()]} ${target.getFullYear()} (${dayNames[target.getDay()]})`;
      return {
        stage: idx + 1,
        days,
        dateFormatted
      };
    });
  }, [startDate, intervals]);

  if (!isOpen || !testItem) return null;

  const handlePresetSelect = (presetKey) => {
    setSchedulePreset(presetKey);
    if (presetKey === 'standard_leitner') {
      setIntervals([1, 3, 7, 15]);
      setCustomIntervalsStr('1, 3, 7, 15');
    } else if (presetKey === 'fast') {
      setIntervals([1, 2, 4, 7]);
      setCustomIntervalsStr('1, 2, 4, 7');
    } else if (presetKey === 'weekly') {
      setIntervals([2, 5, 10, 20]);
      setCustomIntervalsStr('2, 5, 10, 20');
    } else if (presetKey === 'today') {
      setIntervals([1, 2]);
      setCustomIntervalsStr('1, 2');
    }
  };

  const handleCustomIntervalsChange = (val) => {
    setCustomIntervalsStr(val);
    const parsed = val.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
    if (parsed.length > 0) {
      setIntervals(parsed);
    }
  };

  const handleOptionChange = (qNo, opt) => {
    setAnswerKey(prev => ({
      ...prev,
      [qNo]: opt
    }));
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
      const targetStudent = studentId || testItem.studentId || null;

      // Update question list if present
      let updatedQuestionsList = raw.questionsList;
      if (Array.isArray(updatedQuestionsList)) {
        updatedQuestionsList = updatedQuestionsList.map((q, idx) => ({
          ...q,
          correctAnswer: answerKey[idx + 1] || q.correctAnswer || 'A'
        }));
      }

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
        questionsList: updatedQuestionsList,
        isRemedial: true,
        isRemedialTest: true,
        isTeacherRemedial: true,
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

      // 4. Sync to student's weekly study program
      if (syncToProgram && targetStudent && saveCoachingProfile) {
        const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
        const currentProfile = coachingProfiles.find(p => String(p.studentId) === String(targetStudent)) || {
          studentId: targetStudent,
          weeklyProgram: DAYS_LIST.map(d => ({ day: d, items: [] }))
        };

        // Clean previous instances of this test
        const cleanedProg = (currentProfile.weeklyProgram || []).map(dObj => ({
          ...dObj,
          items: (dObj.items || []).filter(it => it.testId !== testItem.testId && it.hwId !== testItem.testId)
        }));

        const updatedProg = scheduleRemedialTestInProgram({
          currentWeeklyProgram: cleanedProg,
          testItem: {
            id: testItem.testId,
            hwId: raw.id || testItem.testId,
            title: title.trim(),
            subject: subject,
            questionCount: testItem.totalQuestions || 1
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

  const totalQuestions = testItem.totalQuestions || Object.keys(answerKey).length || 1;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(5px)',
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
        maxWidth: 680,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
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
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Telafi Testini ve Tarihlerini Düzenle
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Test bilgilerini, aralıklı tekrar tarihlerini ve haftalık programı güncelleyin
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

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
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

          {/* Test Title */}
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

          {/* Subject & Student Selection */}
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

          {/* Spaced Repetition Settings */}
          <div style={{
            background: isDark ? 'rgba(30,41,59,0.5)' : '#f8fafc',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={16} className="text-indigo-500" />
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)' }}>
                  🧠 Aralıklı Tekrar (Leitner) &amp; Tarih Planı
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, marginRight: 6 }}>
                  Başlangıç:
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
            </div>

            {/* Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
              {[
                { id: 'standard_leitner', label: 'Standart (1, 3, 7, 15g)', icon: '🧠' },
                { id: 'fast', label: 'Hızlı (1, 2, 4, 7g)', icon: '⚡' },
                { id: 'weekly', label: 'Haftalık (2, 5, 10, 20g)', icon: '📅' },
                { id: 'today', label: 'Hemen (1, 2g)', icon: '🚀' },
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

            {schedulePreset === 'custom' && (
              <div>
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
            )}

            {/* Live Dates Table Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                🗓️ Hesaplanmış Tekrar Tarihleri:
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

          {/* Answer Key Editor */}
          {totalQuestions > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>
                🎯 Soru Cevap Anahtarını Düzenle ({totalQuestions} Soru):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
                {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(qNo => {
                  const currentAns = answerKey[qNo] || 'A';
                  return (
                    <div
                      key={qNo}
                      style={{
                        background: isDark ? 'rgba(30,41,59,0.5)' : '#f8fafc',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '4px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--color-text)' }}>
                        S.{qNo}
                      </span>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {['A', 'B', 'C', 'D', 'E'].map(opt => {
                          const isSel = currentAns === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleOptionChange(qNo, opt)}
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                border: 'none',
                                background: isSel ? '#10b981' : (isDark ? '#1e293b' : '#e2e8f0'),
                                color: isSel ? '#ffffff' : 'var(--color-text)',
                                fontSize: '0.66rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                padding: 0
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
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc'
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
            <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet & Senkronize Et'}</span>
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
  const { homeworks = [], deleteHomework } = useHomework();
  const { coachingProfiles = [], saveCoachingProfile } = useCoaching();
  const { submissions = [] } = useEvaluation();
  const { users = [], students = [] } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('Tümü');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all' | 'in_progress' | 'mastered'

  // Modal State
  const [editingTest, setEditingTest] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Identify all remedial tests assigned by or for students
  const remedialMasteryList = useMemo(() => {
    const allItems = [...tests, ...questions, ...homeworks];
    const candidateTests = allItems.filter(t => {
      if (!t) return false;
      return t.isRemedialTest === true ||
             t.isRemedial === true ||
             t.isTeacherRemedial === true ||
             t.sourceType === 'pdfSlicer' ||
             t.sourceType === 'pdfSlicerRemedial' ||
             t.type === 'remedial' ||
             t.type === 'remedialTest' ||
             (t.title && (t.title.includes('Telafi') || t.title.includes('Kırpılmış')));
    });

    // Deduplicate by ID
    const uniqueTests = Array.from(new Map(candidateTests.map(t => [String(t.id), t])).values());
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
      const testSubs = (submissions || []).filter(s => {
        if (!s) return false;
        return String(s.testId) === String(t.id) || String(s.realTestId) === String(t.id) || String(s.hwId) === String(t.id);
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
          const statusInfo = getRemedialTestMasteryStatus(t, studentSubs.length > 0 ? studentSubs : submissions);

          rows.push({
            ...statusInfo,
            studentId: sid,
            studentName,
            studentObj,
            rawTest: t
          });
        });
      } else {
        const statusInfo = getRemedialTestMasteryStatus(t, submissions);
        rows.push({
          ...statusInfo,
          studentId: null,
          studentName: '🏢 Genel Telafi Havuzu',
          studentObj: null,
          rawTest: t
        });
      }
    });

    return rows;
  }, [tests, questions, homeworks, submissions, users, students]);

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
    });
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
    if (!item || !item.studentId || !saveCoachingProfile) return;
    try {
      const DAYS_LIST = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
      const currentProfile = coachingProfiles.find(p => String(p.studentId) === String(item.studentId)) || {
        studentId: item.studentId,
        weeklyProgram: DAYS_LIST.map(d => ({ day: d, items: [] }))
      };

      const intervals = item.intervals || [1, 3, 7, 15];

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

      showToast(`✓ "${item.title}" haftalık çalışma programına eklendi!`);
    } catch (err) {
      console.error('Programa ekleme hatası:', err);
      showToast(`❌ Programa eklenirken hata oluştu.`);
    }
  };

  // Delete remedial test
  const handleDeleteTest = async (item) => {
    if (!window.confirm(`"${item.title}" telafi testini silmek istediğinize emin misiniz?`)) return;

    try {
      if (deleteHomework) await deleteHomework(item.testId);
      if (deleteQuestion) await deleteQuestion(item.testId);
      await dbRecordDeletedItem(item.testId, 'remedial_test');

      // Remove from coaching profile
      if (item.studentId && saveCoachingProfile) {
        const currentProfile = coachingProfiles.find(p => String(p.studentId) === String(item.studentId));
        if (currentProfile && Array.isArray(currentProfile.weeklyProgram)) {
          const updatedProg = currentProfile.weeklyProgram.map(dObj => ({
            ...dObj,
            items: (dObj.items || []).filter(it => it.testId !== item.testId && it.hwId !== item.testId)
          }));
          await saveCoachingProfile({ ...currentProfile, weeklyProgram: updatedProg });
        }
      }

      showToast(`✓ "${item.title}" başarıyla silindi.`);
    } catch (err) {
      console.error('Silme hatası:', err);
      showToast(`❌ Test silinirken hata oluştu.`);
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
              Telafi testlerini düzenleyin, aralıklı tekrar tarihlerini güncelleyin ve haftalık ders programında canlı takip edin.
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
                    title="Testi, Tarihleri ve Cevap Anahtarını Düzenle"
                  >
                    <Edit3 size={12} /> <span>✏️ Düzenle &amp; Tarihler</span>
                  </button>

                  {/* Sync to Program Quick Button */}
                  <button
                    type="button"
                    onClick={() => handleQuickSyncToProgram(item)}
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
                    title="Öğrencinin Haftalık Takvimine Ekle/Senkronize Et"
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
    </div>
  );
}
