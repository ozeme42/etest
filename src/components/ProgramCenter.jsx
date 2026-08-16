import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit3, Check, ChevronDown, ChevronRight, ChevronLeft, Calendar, CheckCircle2, X, BookOpen, Clock, GraduationCap, Printer, PlayCircle } from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useHomework } from '../context/HomeworkContext';
import { useAuth } from '../context/AuthContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { isHomeworkForStudent } from '../utils/testResolver';

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

/* ─── AddItemModal ─── */
export function AddItemModal({ dayKey, onAdd, onEdit, initialItem, onClose, topicPool }) {
  const [selectedDayKey, setSelectedDayKey] = useState(dayKey || getTodayKey());
  const [taskType, setTaskType] = useState(initialItem?.taskType || 'konu');
  const [subject, setSubject] = useState(initialItem?.subject || '');
  const [topic, setTopic] = useState(initialItem?.topic || '');
  const [hours, setHours] = useState(initialItem?.hours || '');
  const [questionCount, setQuestionCount] = useState(initialItem?.questionCount || '');
  const [bookName, setBookName] = useState(initialItem?.bookName || '');
  const [note, setNote] = useState(initialItem?.note || '');
  const [startTime, setStartTime] = useState(initialItem?.startTime || '');
  const [endTime, setEndTime] = useState(initialItem?.endTime || '');

  const initialRepeatMode = initialItem?.repeatType || (initialItem?.isDaily ? 'daily' : (initialItem?.isRecurring === false ? 'none' : 'weekly'));
  const [repeatType, setRepeatType] = useState(initialRepeatMode);
  const [repeatEndDate, setRepeatEndDate] = useState(initialItem?.repeatEndDate || '');

  const selectedType = TASK_TYPES.find(t => t.id === taskType);

  const poolTopicsForSubject = useMemo(() => {
    if (!subject) return [];
    const found = (topicPool || []).find(s => s.name === subject);
    return found ? found.topics.map(t => t.name) : [];
  }, [subject, topicPool]);

  const poolSubjects = (topicPool || []).map(s => s.name);
  const allSubjects = [...new Set([...poolSubjects, ...SUBJECTS])];

  const canAdd = (() => {
    if (taskType === 'kitap') return bookName.trim().length > 0;
    if (taskType === 'deneme') return subject.trim().length > 0 || note.trim().length > 0;
    if (taskType === 'diger') return note.trim().length > 0;
    return subject.trim().length > 0;
  })();

  const handleSave = () => {
    if (!canAdd) return;

    const isRecurring = repeatType !== 'none';
    const isDaily = repeatType === 'daily';

    const itemData = {
      id: initialItem?.id || uid(),
      taskType,
      subject: subject.trim(),
      topic: topic.trim(),
      hours: hours.trim(),
      questionCount: questionCount.trim(),
      bookName: bookName.trim(),
      note: note.trim(),
      startTime,
      endTime,
      isRecurring,
      repeatType,
      isDaily,
      repeatEndDate: repeatEndDate || null,
      createdYMD: initialItem?.createdYMD || getLocalYMD(new Date()),
      done: initialItem?.done || false,
    };

    if (initialItem?.id && onEdit) {
      onEdit(itemData, selectedDayKey);
    } else if (onAdd) {
      onAdd(itemData, selectedDayKey);
    }
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '1.25rem', width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.25)', animation: 'pcSlideUp 0.2s ease', maxHeight: '90vh', overflowY: 'auto' }}>
        <style>{`@keyframes pcSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: '1.25rem 1.25rem 0 0' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{initialItem?.id ? 'Görevi Düzenle' : 'Görev Ekle'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#64748b' }}>Hangi Gün:</span>
              <select
                value={selectedDayKey}
                onChange={e => setSelectedDayKey(e.target.value)}
                style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '0.55rem', padding: '2px 8px', background: '#f8fafc', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}
              >
                {DAYS.map(d => (
                  <option key={d.key} value={d.key}>{d.long}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {/* Task Type */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.55rem' }}>GÖREV TİPİ</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
              {TASK_TYPES.map(t => (
                <button key={t.id} onClick={() => setTaskType(t.id)}
                  style={{ padding: '0.55rem 0.4rem', border: taskType === t.id ? `2px solid ${t.color}` : '1.5px solid #e8ecf0', borderRadius: '0.65rem', background: taskType === t.id ? t.bg : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  <div style={{ fontSize: '1.15rem', marginBottom: 2 }}>{t.icon}</div>
                  <div style={{ fontSize: '0.67rem', fontWeight: 800, color: taskType === t.id ? t.color : '#64748b', lineHeight: 1.2 }}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {/* Book name or subject */}
            {taskType === 'kitap' ? (
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>KİTAP ADI *</label>
                <input value={bookName} onChange={e => setBookName(e.target.value)} placeholder="Örn: TYT Matematik Soru Bankası..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.65rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>DERS {taskType !== 'diger' && '*'}</label>
                <select value={subject} onChange={e => { setSubject(e.target.value); setTopic(''); }}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.65rem', fontSize: '0.88rem', outline: 'none', background: 'white', fontFamily: 'inherit' }}>
                  <option value="">-- Ders seçin --</option>
                  {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Topic */}
            {['konu', 'soru', 'tekrar'].includes(taskType) && subject && (
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>KONU</label>
                {poolTopicsForSubject.length > 0 ? (
                  <>
                    <select value={topic} onChange={e => setTopic(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.65rem', fontSize: '0.88rem', outline: 'none', background: 'white', fontFamily: 'inherit', marginBottom: 6 }}>
                      <option value="">-- Konu seçin (isteğe bağlı) --</option>
                      {poolTopicsForSubject.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {topic && taskType === 'konu' && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[{ type: 'konu', label: '📖 Konu Çalış' }, { type: 'soru', label: '✏️ Soru Çöz' }, { type: 'tekrar', label: '🔄 Tekrar' }].map(chip => (
                          <button key={chip.type} onClick={() => setTaskType(chip.type)}
                            style={{ padding: '4px 10px', border: '1.5px solid #c7d2fe', borderRadius: '99px', background: '#eef2ff', color: '#4f46e5', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Konu adı girin..."
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.65rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                )}
              </div>
            )}

            {/* Question count */}
            {taskType === 'soru' && (
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>SORU SAYISI</label>
                <input value={questionCount} onChange={e => setQuestionCount(e.target.value)} placeholder="Örn: 20 soru, 1 test..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.65rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            )}

            {/* Time */}
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 6 }}>SAAT (isteğe bağlı)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center' }}>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.65rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <span style={{ color: '#94a3b8', fontWeight: 800, textAlign: 'center' }}>→</span>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.65rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>SÜRE / HEDEF</label>
              <input value={hours} onChange={e => setHours(e.target.value)}
                placeholder={taskType === 'kitap' ? 'Örn: 30 sayfa...' : taskType === 'deneme' ? 'Örn: 180 soru...' : 'Örn: 1.5 saat...'}
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.65rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            {/* Note */}
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>NOT (isteğe bağlı)</label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ekstra not..."
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.65rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            {/* Tekrar Seçenekleri & Bitiş Tarihi */}
            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>
                TEKRAR DÜZENİ
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', marginBottom: '0.75rem' }}>
                {[
                  { id: 'weekly', label: '📅 Her Hafta', desc: 'Sadece bu gün' },
                  { id: 'daily', label: '🔁 Her Gün', desc: 'Haftanın 7 günü' },
                  { id: 'none', label: '🚫 Tek Sefer', desc: 'Sadece bu hafta' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setRepeatType(mode.id)}
                    style={{
                      padding: '0.5rem 0.35rem',
                      border: repeatType === mode.id ? '2px solid #6366f1' : '1px solid #cbd5e1',
                      borderRadius: '0.6rem',
                      background: repeatType === mode.id ? '#eef2ff' : 'white',
                      color: repeatType === mode.id ? '#4f46e5' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: '0.76rem', fontWeight: 800 }}>{mode.label}</div>
                    <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600, marginTop: 1 }}>{mode.desc}</div>
                  </button>
                ))}
              </div>

              {/* Bitiş Tarihi (Opsiyonel) */}
              {repeatType !== 'none' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569' }}>
                      BİTİŞ TARİHİ (İsteğe Bağlı)
                    </label>
                    {repeatEndDate && (
                      <button
                        type="button"
                        onClick={() => setRepeatEndDate('')}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={repeatEndDate}
                    onChange={e => setRepeatEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '0.6rem',
                      fontSize: '0.82rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      background: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, marginTop: 3 }}>
                    Belirlenen tarihten sonra görev takvimden otomatik kaldırılır.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {canAdd && (
            <div style={{ marginTop: '0.85rem', padding: '0.75rem 1rem', background: selectedType?.bg, borderRadius: '0.75rem', border: `1.5px solid ${selectedType?.color}22`, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{selectedType?.icon}</span>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: selectedType?.color }}>{selectedType?.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 600, marginTop: 1 }}>
                  {taskType === 'kitap' ? bookName : [subject, topic].filter(Boolean).join(' › ') || note}
                  {(startTime || hours || questionCount) && (
                    <span style={{ color: '#64748b' }}> · {startTime ? `${startTime}${endTime ? `→${endTime}` : ''}` : ''}{hours ? ` ${hours}` : ''}{questionCount ? ` ${questionCount}` : ''}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.1rem' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '0.7rem', background: '#f1f5f9', border: 'none', borderRadius: '0.75rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', color: '#64748b', fontFamily: 'inherit' }}>İptal</button>
            <button onClick={handleSave} disabled={!canAdd}
              style={{ flex: 2, padding: '0.7rem', background: canAdd ? `linear-gradient(135deg, ${selectedType?.color}, #7c3aed)` : '#e2e8f0', border: 'none', borderRadius: '0.75rem', fontWeight: 800, fontSize: '0.85rem', cursor: canAdd ? 'pointer' : 'not-allowed', color: canAdd ? 'white' : '#94a3b8', boxShadow: canAdd ? `0 4px 12px ${selectedType?.color}44` : 'none', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {initialItem ? '✏️ Değişiklikleri Kaydet' : `${selectedType?.icon} Görev Ekle`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── DayCard ─── */
export function DayCard({ dayObj, dayMeta, isToday, onToggle, onDelete, onEditClick, onAddClick, onOpenResult }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const items = dayObj.items || [];
  const done = items.filter(i => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const theme = DAY_THEMES[dayObj.day] || DAY_THEMES['Pzt'];

  const MAX_VISIBLE = 3;
  const shouldCollapse = items.length > MAX_VISIBLE;
  const visibleItems = (shouldCollapse && !isExpanded) ? items.slice(0, MAX_VISIBLE) : items;
  const hiddenCount = items.length - MAX_VISIBLE;

  return (
    <div style={{
      background: 'white',
      borderRadius: '1.1rem',
      border: isToday ? '2.5px solid #6366f1' : `1.5px solid ${theme.border}`,
      boxShadow: isToday ? '0 8px 30px rgba(99,102,241,0.22), 0 0 0 3px rgba(99,102,241,0.1)' : '0 4px 16px rgba(0,0,0,0.03)',
      overflow: 'hidden',
      minWidth: 0,
      position: 'relative',
      transition: 'all 0.2s ease'
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
      <div style={{ padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 65, background: '#fafafc' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1.25rem 0', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, fontStyle: 'italic' }}>
            Henüz ders yok
          </div>
        )}
        {visibleItems.map(item => {
          const tt = TASK_TYPES.find(t => t.id === item.taskType);
          const accentColor = item.done ? '#22c55e' : (tt?.color || theme.accent);
          const isQuizTask = item.isAutoHomework || item.testId || item.hwId || item.roadmapAssignmentId || (item.id && String(item.id).startsWith('hw_'));

          return (
            <div key={item.id}
              style={{
                background: item.done ? '#f0fdf4' : 'white',
                border: item.done ? '1px solid #bbf7d0' : '1px solid #e8ecf0',
                borderLeft: `4px solid ${accentColor}`,
                borderRadius: '0.65rem',
                padding: '0.55rem 0.65rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: item.done ? 'none' : '0 2px 6px rgba(0,0,0,0.02)',
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
              <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, background: item.done ? '#22c55e' : (tt?.bg || '#f1f5f9'), border: item.done ? 'none' : `1px solid ${tt?.color || '#cbd5e1'}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                {item.done ? <Check size={12} color="white" strokeWidth={3} /> : (tt?.icon || '📝')}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {item.taskType && (
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, color: tt?.color || '#64748b', background: tt?.bg || '#f8fafc', display: 'inline-block', padding: '1px 7px', borderRadius: '99px', marginBottom: 2, border: `1px solid ${tt?.color}22` }}>
                    {tt?.label}
                  </div>
                )}
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: item.done ? '#166534' : '#0f172a', textDecoration: item.done ? 'line-through' : 'none' }}>
                  {item.bookName || item.subject}
                </div>
                {item.topic && (
                  <div style={{ fontSize: '0.7rem', color: item.done ? '#22c55e' : '#475569', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.topic}
                  </div>
                )}
                {(item.startTime || item.endTime) && (
                  <div style={{ marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 3, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '99px', padding: '1px 7px' }}>
                    <span style={{ fontSize: '0.63rem', fontWeight: 800, color: '#4f46e5' }}>
                      🕐 {item.startTime}{item.endTime ? ` → ${item.endTime}` : ''}
                    </span>
                  </div>
                )}
                {(item.questionCount || item.hours || item.note) && (
                  <div style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {item.questionCount && <span style={{ color: '#0891b2', fontWeight: 700 }}>✏️ {item.questionCount}</span>}
                    {item.hours && <span><Clock size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {item.hours}</span>}
                    {item.note && <span style={{ color: '#8b5cf6' }}>· {item.note}</span>}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {isQuizTask && onOpenResult && (
                  <button
                    onClick={() => onOpenResult(item)}
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
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
                      boxShadow: '0 2px 6px rgba(79,70,229,0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Sınavı Çöz"
                  >
                    <PlayCircle size={11} /> Çöz
                  </button>
                )}
                {!item.isAutoHomework && onEditClick && (
                  <button onClick={() => onEditClick(dayObj.day, item)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    title="Görevi Düzenle">
                    <Edit3 size={12} />
                  </button>
                )}
                {!item.isAutoHomework && (
                  <button onClick={() => onDelete(dayObj.day, item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2, display: 'flex', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
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
              background: isExpanded ? '#f1f5f9' : 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
              border: isExpanded ? '1px solid #cbd5e1' : '1.5px solid #c7d2fe',
              color: '#4f46e5',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: '0.2rem',
              transition: 'all 0.15s ease',
              boxShadow: isExpanded ? 'none' : '0 2px 8px rgba(99,102,241,0.12)'
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
          style={{ width: '100%', padding: '0.45rem', border: '1.5px dashed #c7d2fe', borderRadius: '0.6rem', background: 'transparent', color: '#6366f1', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'}
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
export function TopicPoolPanel({ topicPool, setTopicPool, onAssignTopic }) {
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
          style={{ background: 'rgba(255, 255, 255, 0.5)', color: '#6366f1', border: '1.5px solid #c7d2fe', borderRadius: '0.65rem', padding: '0.4rem 0.8rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          📚 Şablon Yükle {showTemplates ? '▲' : '▼'}
        </button>
      </div>

      {showTemplates && (
        <div style={{ background: 'white', borderRadius: '1rem', border: '1.5px solid #e8ecf0', padding: '1rem', marginBottom: '1rem' }}>
          {selectedCurriculumPreview ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>
                  🏫 {selectedCurriculumPreview.grade.name} Müfredatı
                </div>
                <button onClick={() => setSelectedCurriculumPreview(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}><X size={16}/></button>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 10 }}>Havuza eklemek istediğiniz dersleri seçin:</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
                {selectedCurriculumPreview.subjects.map(sub => {
                  const isSelected = selectedSubjectsForImport.has(sub.id);
                  return (
                    <div key={sub.id} 
                      onClick={() => {
                        const next = new Set(selectedSubjectsForImport);
                        if (isSelected) next.delete(sub.id);
                        else next.add(sub.id);
                        setSelectedSubjectsForImport(next);
                      }}
                      style={{ padding: '0.5rem', border: isSelected ? `1.5px solid ${sub.color}` : '1.5px solid #e2e8f0', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: isSelected ? `${sub.color}15` : 'white' }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${isSelected ? sub.color : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? sub.color : 'white', flexShrink: 0 }}>
                        {isSelected && <Check size={10} color="white" />}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? sub.color : '#475569', lineHeight: 1.2 }}>{sub.name} <span style={{fontSize: '0.65rem', opacity: 0.7}}>({sub.topics.length})</span></div>
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
                }} style={{ padding: '0.45rem 0.8rem', borderRadius: '0.6rem', border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  {selectedSubjectsForImport.size === selectedCurriculumPreview.subjects.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                </button>
                <button onClick={confirmCurriculumImport} disabled={selectedSubjectsForImport.size === 0}
                  style={{ flex: 1, padding: '0.45rem 0.8rem', borderRadius: '0.6rem', border: 'none', background: selectedSubjectsForImport.size > 0 ? '#10b981' : '#94a3b8', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: selectedSubjectsForImport.size > 0 ? 'pointer' : 'not-allowed' }}>
                  Seçilenleri Ekle ({selectedSubjectsForImport.size})
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: 12 }}>✨ Hazır Şablon & Kayıtlı Müfredatlardan Yükle</div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 8 }}>📌 Sınav Hazırlık Şablonları:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.keys(TOPIC_TEMPLATES).map(tplKey => (
                    <button key={tplKey} onClick={() => loadTemplate(tplKey)}
                      style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: 'white', border: 'none', borderRadius: '0.6rem', padding: '0.45rem 0.8rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Plus size={14} /> {tplKey} Şablonu
                    </button>
                  ))}
                </div>
              </div>

              {curriculumData?.grades && curriculumData.grades.length > 0 && (
                <div style={{ paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 8 }}>🏫 Kayıtlı Sınıf Müfredatından Yükle:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {curriculumData.grades.map(grade => (
                      <button key={grade.id} onClick={() => previewGradeCurriculum(grade.id)}
                        style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: 'white', border: 'none', borderRadius: '0.6rem', padding: '0.45rem 0.8rem', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
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
            { label: 'Toplam Ders', value: pool.length, color: '#6366f1', bg: '#eef2ff' },
            { label: 'Toplam Konu', value: pool.reduce((a, s) => a + s.topics.length, 0), color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'Tamamlanan', value: pool.reduce((a, s) => a + s.topics.filter(t => t.status === 'Tamamlandı').length, 0), color: '#16a34a', bg: '#f0fdf4' },
          ].map(stat => (
            <div key={stat.label} style={{ background: stat.bg, borderRadius: '0.85rem', padding: '0.7rem 1.1rem', flex: '1 1 120px' }}>
              <div style={{ fontWeight: 900, fontSize: '1.3rem', color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {pool.map(subject => {
          const isOpen = expandedSubjects[subject.id];
          const doneCount = subject.topics.filter(t => t.status === 'Tamamlandı').length;
          const totalCount = subject.topics.length;
          return (
            <div key={subject.id} style={{ background: 'white', borderRadius: '1rem', border: '1.5px solid #e8ecf0', overflow: 'hidden' }}>
              <div onClick={() => toggleSubject(subject.id)} style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1rem', cursor: 'pointer', gap: '0.75rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: subject.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{subject.name}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', marginTop: 1 }}>{doneCount}/{totalCount} konu tamamlandı</div>
                </div>
                {totalCount > 0 && (
                  <div style={{ width: 48, height: 4, background: '#f1f5f9', borderRadius: 99 }}>
                    <div style={{ height: 4, borderRadius: 99, width: `${Math.round((doneCount / totalCount) * 100)}%`, background: subject.color }} />
                  </div>
                )}
                <button onClick={e => { e.stopPropagation(); deleteSubject(subject.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: 4, borderRadius: 6, display: 'flex' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#e2e8f0'}>
                  <Trash2 size={14} />
                </button>
                {isOpen ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
              </div>

              {isOpen && (
                <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.65rem' }}>
                    {subject.topics.map(topic => {
                      const sc = STATUS_COLORS[topic.status] || STATUS_COLORS['Başlanmadı'];
                      return (
                        <div key={topic.id} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.65rem', background: '#f8fafc', borderRadius: '0.6rem', border: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 110, fontSize: '0.83rem', fontWeight: 700, color: '#374151' }}>{topic.name}</div>
                          
                          {/* Quick Assign Action Chips */}
                          {onAssignTopic && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                              <button
                                title="Konu Çalışması Olarak Programa Ekle"
                                onClick={e => { e.stopPropagation(); onAssignTopic({ subjectName: subject.name, topicName: topic.name, taskType: 'konu' }); }}
                                style={{ padding: '3px 7px', border: '1px solid #c7d2fe', borderRadius: '0.4rem', background: '#eef2ff', color: '#4f46e5', fontSize: '0.67rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                              >
                                📖 Çalış
                              </button>
                              <button
                                title="Soru Çözümü Olarak Programa Ekle"
                                onClick={e => { e.stopPropagation(); onAssignTopic({ subjectName: subject.name, topicName: topic.name, taskType: 'soru' }); }}
                                style={{ padding: '3px 7px', border: '1px solid #fed7aa', borderRadius: '0.4rem', background: '#fff7ed', color: '#ea580c', fontSize: '0.67rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                              >
                                ✏️ Soru
                              </button>
                              <button
                                title="Tekrar Olarak Programa Ekle"
                                onClick={e => { e.stopPropagation(); onAssignTopic({ subjectName: subject.name, topicName: topic.name, taskType: 'tekrar' }); }}
                                style={{ padding: '3px 7px', border: '1px solid #bbf7d0', borderRadius: '0.4rem', background: '#f0fdf4', color: '#16a34a', fontSize: '0.67rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                              >
                                🔄 Tekrar
                              </button>
                            </div>
                          )}

                          <select value={topic.status} onChange={e => updateTopicStatus(subject.id, topic.id, e.target.value)} onClick={e => e.stopPropagation()}
                            style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 6px', border: `1.5px solid ${sc.border}`, borderRadius: '0.4rem', background: sc.bg, color: sc.text, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                            {TOPIC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={() => deleteTopic(subject.id, topic.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2, display: 'flex', borderRadius: 4, flexShrink: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                    <input value={newTopics[subject.id] || ''} onChange={e => setNewTopics(prev => ({ ...prev, [subject.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addTopic(subject.id)} placeholder="Yeni konu ekle..."
                      style={{ flex: 1, padding: '0.45rem 0.7rem', border: '1.5px solid #e2e8f0', borderRadius: '0.55rem', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }} />
                    <button onClick={() => addTopic(subject.id)}
                      style={{ padding: '0.45rem 0.8rem', background: (newTopics[subject.id] || '').trim() ? subject.color : '#e2e8f0', color: (newTopics[subject.id] || '').trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: '0.55rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>
                      Ekle
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ background: 'white', borderRadius: '1rem', border: '1.5px dashed #c7d2fe', padding: '1rem', marginTop: '0.75rem', display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
        <BookOpen size={18} color="#6366f1" style={{ flexShrink: 0 }} />
        <input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubject()}
          placeholder="Yeni ders ekle (Örn: Matematik)..."
          style={{ flex: 1, padding: '0.5rem 0.7rem', border: '1.5px solid #e2e8f0', borderRadius: '0.55rem', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }} />
        <button onClick={addSubject}
          style={{ padding: '0.5rem 1rem', background: newSubjectName.trim() ? 'linear-gradient(135deg,#6366f1,#7c3aed)' : '#e2e8f0', color: newSubjectName.trim() ? 'white' : '#94a3b8', border: 'none', borderRadius: '0.55rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Ders Ekle
        </button>
      </div>
    </div>
  );
}

/* ─── MonthlyListPanel Component ─── */
export function MonthlyListPanel({ weeklyProgram, allHomeworks, currentUser, submissions, curData, onEditClick }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [onlyWithTasks, setOnlyWithTasks] = useState(false);

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
      if (hw.isBookAssignment) return false;
      return isHomeworkForStudent(hw, currentUser, studentGrades);
    }).map(hw => {
      const sub = (hw.submissions || []).find(s => String(s.studentId) === String(studentId)) ||
        (submissions || []).find(s => (s.hwId === hw.id || s.testId === hw.id || String(s.testId) === String(hw.id)) && String(s.studentId) === String(studentId));
      return {
        ...hw,
        isDone: !!sub
      };
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
      let manualItems = rawManualItems.filter(item => {
        if (item.createdYMD && ymd < item.createdYMD) return false;
        if (item.repeatEndDate && ymd > item.repeatEndDate) return false;
        if (item.repeatType === 'none' || item.isRecurring === false) {
          const itemCreatedYMD = item.createdYMD || getLocalYMD(new Date());
          return isSameWeek(ymd, itemCreatedYMD);
        }
        return true;
      });

      allDailyItems.forEach(dItem => {
        if (dItem.createdYMD && ymd < dItem.createdYMD) return;
        if (dItem.repeatEndDate && ymd > dItem.repeatEndDate) return;
        if (!manualItems.some(i => i.id === dItem.id)) {
          manualItems.push(dItem);
        }
      });

      const dateTime = dateObj.getTime();
      const autoHwItems = [];

      studentHomeworks.forEach(hw => {
        const rawStart = hw.startDate || hw.assignedAt || hw.createdAt;
        const startYMD = rawStart ? new Date(rawStart).toISOString().split('T')[0] : null;
        const startTime = startYMD ? new Date(startYMD).getTime() : null;

        const rawDue = hw.dueDate || hw.assignedDueDate;
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
          const exists = manualItems.some(m => m.id === `hw_${hw.id}` || m.hwId === hw.id);
          if (!exists) {
            autoHwItems.push({
              id: `monthly_auto_hw_${hw.id}_${ymd}`,
              hwId: hw.id,
              isAutoHomework: true,
              taskType: 'ödev',
              subject: hw.subject || 'Atanan Ödev',
              topic: hw.title || hw.name || 'Ödev Görevi',
              questionCount: hw.totalQuestions ? `${hw.totalQuestions}` : null,
              time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
              done: hw.isDone
            });
          }
        }
      });

      const dayItems = [...autoHwItems, ...manualItems];

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
      monthName,
      monthTitle: `${monthName} ${year}`,
      daysList
    };
  }, [monthOffset, weeklyProgram, allHomeworks, currentUser, submissions, curData]);

  const filteredDays = useMemo(() => {
    if (!onlyWithTasks) return monthInfo.daysList;
    return monthInfo.daysList.filter(d => d.items.length > 0);
  }, [monthInfo, onlyWithTasks]);

  const monthTotalTasks = monthInfo.daysList.reduce((acc, d) => acc + d.items.length, 0);
  const monthDoneTasks = monthInfo.daysList.reduce((acc, d) => acc + d.items.filter(i => i.done).length, 0);

  return (
    <div className="printable-monthly-area">
      {/* Print Specific CSS */}
      <style>{`
        .print-only-header { display: none; }
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; color: #000 !important; font-family: sans-serif !important; }
          /* Hide non-printable UI elements */
          nav, header, footer, .no-print, button, select, input, .weekly-grid { display: none !important; }
          .printable-monthly-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-only-header {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 16px;
          }
          .print-day-card {
            page-break-inside: avoid !important;
            border: 1px solid #cbd5e1 !important;
            border-left: 4px solid #4f46e5 !important;
            box-shadow: none !important;
            background: white !important;
            margin-bottom: 10px !important;
          }
        }
      `}</style>

      {/* Print Only Header */}
      <div className="print-only-header">
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>E-TEST DERS TAKİP VE KOÇLUK PLATFORMU</h1>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#4f46e5', margin: '4px 0 0' }}>Öğrenci Aylık Ders Çalışma Programı — {monthInfo.monthTitle}</h2>
          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4 }}>
            Öğrenci: <strong>{currentUser?.name || currentUser?.username || 'Öğrenci'}</strong>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#64748b' }}>
          <div>Yazdırma Tarihi: {new Date().toLocaleDateString('tr-TR')}</div>
          <div style={{ fontWeight: 800, color: '#16a34a', marginTop: 2 }}>{monthDoneTasks}/{monthTotalTasks} Görev Tamamlandı</div>
        </div>
      </div>

      {/* Month Navigation & Stats Banner */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '1rem',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setMonthOffset(m => m - 1)}
            style={{
              padding: '0.45rem 0.85rem', borderRadius: '0.65rem',
              background: '#f1f5f9', border: '1px solid #cbd5e1',
              color: '#334155', fontWeight: 800, fontSize: '0.8rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <ChevronLeft size={16} /> Önceki Ay
          </button>

          {monthOffset !== 0 && (
            <button
              onClick={() => setMonthOffset(0)}
              style={{
                padding: '0.45rem 0.85rem', borderRadius: '0.65rem',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: 'white', border: 'none', fontWeight: 900, fontSize: '0.8rem',
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.3)'
              }}
            >
              📍 Bu Ay ({new Date().toLocaleDateString('tr-TR', { month: 'long' })})
            </button>
          )}

          <button
            onClick={() => setMonthOffset(m => m + 1)}
            style={{
              padding: '0.45rem 0.85rem', borderRadius: '0.65rem',
              background: '#f1f5f9', border: '1px solid #cbd5e1',
              color: '#334155', fontWeight: 800, fontSize: '0.8rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            Sonraki Ay <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={22} color="#4f46e5" />
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
              📆 {monthInfo.monthTitle}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setOnlyWithTasks(v => !v)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '99px',
                background: onlyWithTasks ? '#eef2ff' : '#f8fafc',
                border: onlyWithTasks ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
                color: onlyWithTasks ? '#4f46e5' : '#64748b',
                fontWeight: 800,
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              {onlyWithTasks ? '🔍 Sadece Görevli Günler' : '📋 Tüm Günler'}
            </button>

            <button
              onClick={() => window.print()}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '99px',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
              }}
              title="Aylık Programı Yazdır veya PDF olarak kaydet"
            >
              <Printer size={14} /> 🖨️ Yazdır / PDF İndir
            </button>

            <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 800, background: '#f0fdf4', padding: '0.25rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid #86efac' }}>
              {monthDoneTasks}/{monthTotalTasks} Tamamlandı
            </span>
          </div>
        </div>
      </div>

      {/* Days Agenda List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredDays.map(d => {
          const taskIcons = { konu: '📖', soru: '✏️', tekrar: '🔄', kitap: '📚', deneme: '📊', ödev: '📝', diger: '✨' };
          const theme = DAY_THEMES[d.dayKey] || DAY_THEMES['Pzt'];
          return (
            <div
              key={d.ymd}
              style={{
                background: d.isToday ? 'linear-gradient(135deg, #ffffff, #f5f3ff)' : '#ffffff',
                border: d.isToday ? '2px solid #6366f1' : `1.5px solid ${theme.border}`,
                borderLeft: `5px solid ${d.isToday ? '#6366f1' : theme.text}`,
                borderRadius: '1rem',
                padding: '0.85rem 1.1rem',
                boxShadow: d.isToday ? '0 6px 20px rgba(99,102,241,0.15)' : '0 2px 10px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                flexWrap: 'wrap',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Date Box with Day Theme Gradient */}
              <div style={{
                minWidth: 72,
                textAlign: 'center',
                padding: '0.5rem 0.65rem',
                borderRadius: '0.8rem',
                background: d.isToday ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : theme.gradient,
                color: 'white',
                boxShadow: d.isToday ? '0 4px 14px rgba(79,70,229,0.35)' : '0 2px 8px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1 }}>{d.day}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.95, marginTop: 2 }}>{d.dayName}</div>
                {d.isToday && (
                  <div style={{ fontSize: '0.55rem', fontWeight: 900, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '1px 5px', borderRadius: 4, marginTop: 3 }}>
                    BUGÜN
                  </div>
                )}
              </div>

              {/* Items List */}
              <div style={{ flex: 1, minWidth: 200 }}>
                {d.items.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, fontStyle: 'italic', paddingTop: 8 }}>
                    Programlanan ders görevi yok
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {d.items.map((item, idx) => {
                      const icon = taskIcons[item.taskType] || '📌';
                      const tt = TASK_TYPES.find(t => t.id === item.taskType);
                      const itemAccent = item.done ? '#22c55e' : (tt?.color || theme.text);
                      return (
                        <div
                          key={item.id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: item.done ? '#f0fdf4' : 'white',
                            border: item.done ? '1px solid #bbf7d0' : '1px solid #e8ecf0',
                            borderLeft: `4px solid ${itemAccent}`,
                            borderRadius: '0.65rem',
                            padding: '0.5rem 0.75rem',
                            gap: '0.75rem',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: '0.95rem' }}>{icon}</span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: item.done ? '#166534' : '#0f172a', textDecoration: item.done ? 'line-through' : 'none' }}>
                                {item.subject || item.topic || 'Ders Çalışması'}
                              </div>
                              {item.topic && item.subject && (
                                <div style={{ fontSize: '0.7rem', color: item.done ? '#22c55e' : '#475569', fontWeight: 600, marginTop: 1 }}>{item.topic}</div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                            {(item.startTime || item.endTime || item.time || item.saat) && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', border: '1px solid #c7d2fe', padding: '0.15rem 0.5rem', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                🕐 {item.startTime ? `${item.startTime}${item.endTime ? ` → ${item.endTime}` : ''}` : (item.time || item.saat)}
                              </span>
                            )}
                            {item.hours && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6366f1', background: '#eef2ff', padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                                ⏱️ {item.hours} sa
                              </span>
                            )}
                            {item.questionCount && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0891b2', background: '#ecfeff', padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                                ✏️ {item.questionCount} soru
                              </span>
                            )}
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 900,
                              padding: '0.15rem 0.55rem',
                              borderRadius: 99,
                              background: item.done ? '#dcfce7' : '#f1f5f9',
                              color: item.done ? '#15803d' : '#64748b'
                            }}>
                              {item.done ? 'Tamamlandı ✓' : 'Planlandı'}
                            </span>
                            {!item.isAutoHomework && onEditClick && (
                              <button onClick={() => onEditClick(d.dayKey, item)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', borderRadius: 4 }}
                                onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                title="Görevi Düzenle">
                                <Edit3 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ProgramCenter (Main shared component) ─── */
export default function ProgramCenter({ weeklyProgram, setWeeklyProgram, topicPool, setTopicPool }) {
  const [programTab, setProgramTab] = useState('haftalik');
  const [addingToDay, setAddingToDay] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const todayKey = getTodayKey();
  const navigate = useNavigate();

  const hwContext = useHomework();
  const authContext = useAuth();
  const evalContext = useEvaluation();
  const currContext = useCurriculum();
  const trackedBooksContext = useTrackedBooks();

  const allHomeworks = hwContext?.homeworks || [];
  const currentUser = authContext?.currentUser;
  const submissions = evalContext?.submissions || [];
  const curData = currContext?.curriculumData;
  const bookTests = trackedBooksContext?.bookTests || [];
  const books = trackedBooksContext?.books || [];

  const studyPlanContext = useStudyPlan();
  const studyPlans = studyPlanContext?.studyPlans || [];
  const studyAssignments = studyPlanContext?.studyAssignments || [];

  const handleOpenTaskResult = useCallback((item) => {
    if (!item) return;
    const sId = currentUser?.id;

    if (item.roadmapAssignmentId) {
      navigate(`/student/study-plan/${item.roadmapAssignmentId}`);
      return;
    }

    if (item.testId) {
      navigate(`/book-quiz/${item.testId}${sId ? `?studentId=${sId}` : ''}`);
      return;
    }

    if (item.hwId) {
      const hwObj = (allHomeworks || []).find(h => String(h.id) === String(item.hwId));
      if (hwObj?.type === 'physicalExam') {
        navigate(`/physical-exam/${item.hwId}${sId ? `?studentId=${sId}` : ''}`);
      } else if (hwObj?.isBookAssignment && hwObj?.tests && hwObj.tests.length > 0) {
        navigate(`/book-quiz/${hwObj.tests[0]}${sId ? `?studentId=${sId}` : ''}`);
      } else {
        navigate(`/quiz/${item.hwId}${sId ? `?studentId=${sId}` : ''}`);
      }
      return;
    }

    if (item.id && String(item.id).startsWith('hw_')) {
      const cleanId = String(item.id).replace('hw_', '');
      navigate(`/quiz/${cleanId}${sId ? `?studentId=${sId}` : ''}`);
      return;
    }
  }, [navigate, currentUser, allHomeworks]);

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

    if (!currentUser) {
      return weeklyProgram.map(dayObj => ({
        ...dayObj,
        dateLabel: dayDateMap[dayObj.day]?.dateLabel || ''
      }));
    }

    const studentId = currentUser.id;
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

    return weeklyProgram.map(dayObj => {
      const dayInfo = dayDateMap[dayObj.day];
      if (!dayInfo) return dayObj;

      const rawManualItems = dayObj.items || [];
      let manualItems = rawManualItems.filter(item => {
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
      const autoHwItems = [];

      // A) Homeworks & Book Assignments
      studentHomeworks.forEach(hw => {
        const isBook = hw.isBookAssignment || hw.sourceType === 'trackedBook' || hw.bookId;
        const bookObj = books.find(b => String(b.id) === String(hw.bookId));
        const cleanBookTitle = (bookObj?.title || hw.title || 'Kitap').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').trim();

        if (isBook && hw.testDueDates && typeof hw.testDueDates === 'object' && Object.keys(hw.testDueDates).length > 0) {
          Object.entries(hw.testDueDates).forEach(([testId, tDateStr]) => {
            if (!tDateStr) return;
            const tYMD = tDateStr.split('T')[0];
            if (dayInfo.ymd === tYMD) {
              const tObj = bookTests.find(b => String(b.id) === String(testId));
              const testName = tObj?.name || 'Test';
              const qCount = tObj?.questionCount || 20;

              const subjObj = (bookObj?.subjects || []).find(s => String(s.id) === String(tObj?.subjectId));
              const subjectName = subjObj?.name || hw.subject || cleanBookTitle;
              const topicObj = (subjObj?.topics || []).find(tp => String(tp.id) === String(tObj?.topicId));
              const topicName = topicObj?.name || tObj?.topicName || '';

              const displayHeader = topicName ? `${subjectName} • ${topicName}` : subjectName;
              const displaySub = `${cleanBookTitle} — ${testName}`;

              const tIdStr = String(testId);
              const tUuidStr = String(toUUID(testId) || '');

              const isSolved = submissions.some(s =>
                String(s.studentId) === String(studentId) &&
                s.status !== 'in_progress' && s.status !== 'draft' &&
                (String(s.testId) === tIdStr || String(s.realTestId) === tIdStr || String(s.bookTestId) === tIdStr || (tUuidStr && String(s.testId) === tUuidStr) || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr)))
              );

              // Exclude solved/completed tests so they disappear from the program view
              if (isSolved) return;

              const exists = manualItems.some(m => m.id === `book_test_${hw.id}_${testId}_${dayObj.day}`);
              if (!exists) {
                autoHwItems.push({
                  id: `book_test_${hw.id}_${testId}_${dayObj.day}`,
                  hwId: hw.id,
                  testId: testId,
                  isAutoHomework: true,
                  taskType: 'kitap',
                  subject: displayHeader,
                  topic: displaySub,
                  questionCount: `${qCount} soru`,
                  time: `Hedef: ${new Date(tDateStr).toLocaleDateString('tr-TR')}`,
                  done: false
                });
              }
            }
          });
          return;
        }

        const rawStart = hw.startDate || hw.assignedAt || hw.createdAt;
        const startYMD = rawStart ? new Date(rawStart).toISOString().split('T')[0] : null;
        const startTime = startYMD ? new Date(startYMD).getTime() : null;

        const rawDue = hw.dueDate || hw.assignedDueDate;
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
          if (Array.isArray(hw.tests) && hw.tests.length > 1) {
            hw.tests.forEach((testId, idx) => {
              const tIdStr = String(testId);
              const tUuidStr = String(toUUID(testId) || '');
              const isTestSolved = submissions.some(s =>
                String(s.studentId) === String(studentId) &&
                s.status !== 'in_progress' && s.status !== 'draft' &&
                (String(s.testId) === tIdStr || String(s.realTestId) === tIdStr || (tUuidStr && String(s.testId) === tUuidStr) || (s.bookTestIds && s.bookTestIds.some(tid => String(tid) === tIdStr)))
              );
              if (isTestSolved) return;

              const tObj = bookTests.find(b => String(b.id) === tIdStr);
              const testTitle = tObj?.name || `Test ${idx + 1}`;
              const exists = manualItems.some(m => m.id === `auto_hw_${hw.id}_${testId}_${dayObj.day}` || m.hwId === hw.id);
              if (!exists) {
                autoHwItems.push({
                  id: `auto_hw_${hw.id}_${testId}_${dayObj.day}`,
                  hwId: hw.id,
                  testId: testId,
                  isAutoHomework: true,
                  taskType: isBook ? 'kitap' : 'ödev',
                  subject: hw.subject || 'Atanan Kitap/Ödev',
                  topic: `${hw.title || 'Ödev'} — ${testTitle}`,
                  questionCount: tObj?.questionCount ? `${tObj.questionCount} soru` : null,
                  time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
                  done: false
                });
              }
            });
            return;
          }

          const sub = (hw.submissions || []).find(s => String(s.studentId) === String(studentId)) ||
            submissions.find(s => (s.hwId === hw.id || s.testId === hw.id || String(s.testId) === String(hw.id)) && String(s.studentId) === String(studentId));
          const isDone = !!sub;

          // Exclude completed standard homeworks so they disappear from the program view
          if (isDone) return;

          const exists = manualItems.some(m => m.id === `hw_${hw.id}` || m.hwId === hw.id || (m.topic === (hw.title || hw.name)));
          if (!exists) {
            autoHwItems.push({
              id: `auto_hw_${hw.id}_${dayObj.day}`,
              hwId: hw.id,
              isAutoHomework: true,
              taskType: hw.isBookAssignment ? 'kitap' : 'ödev',
              subject: hw.subject || 'Atanan Ödev',
              topic: hw.title || hw.name || 'Ödev Görevi',
              questionCount: hw.totalQuestions ? `${hw.totalQuestions}` : null,
              time: dueYMD ? `Son: ${new Date(rawDue).toLocaleDateString('tr-TR')}` : null,
              done: false
            });
          }
        }
      });

      // B) Roadmap / Study Plan items with target dates (dueDate)
      const studentAssignments = (studyAssignments || []).filter(a => String(a.studentId) === String(studentId));
      studentAssignments.forEach(assignment => {
        const plan = (studyPlans || []).find(p => String(p.id) === String(assignment.planId || assignment.studyPlanId));
        if (!plan) return;

        const completedTopicsSet = new Set(assignment.completedTopics || []);

        (plan.subjects || []).forEach(subject => {
          if (subject.dueDate) {
            const sYMD = subject.dueDate.split('T')[0];
            if (dayInfo.ymd === sYMD) {
              const isCompleted = completedTopicsSet.has(subject.id);
              if (!isCompleted) {
                const exists = manualItems.some(m => m.id === `roadmap_sub_${assignment.id}_${subject.id}_${dayObj.day}`);
                if (!exists) {
                  autoHwItems.push({
                    id: `roadmap_sub_${assignment.id}_${subject.id}_${dayObj.day}`,
                    roadmapAssignmentId: assignment.id,
                    isAutoHomework: true,
                    isRoadmapTask: true,
                    taskType: 'konu',
                    subject: `${plan.title} • ${subject.name}`,
                    topic: subject.name,
                    time: `Hedef: ${new Date(subject.dueDate).toLocaleDateString('tr-TR')}`,
                    done: false
                  });
                }
              }
            }
          }

          (subject.topics || []).forEach(topic => {
            if (topic.dueDate) {
              const tYMD = topic.dueDate.split('T')[0];
              if (dayInfo.ymd === tYMD) {
                const isCompleted = completedTopicsSet.has(topic.id);
                if (!isCompleted) {
                  const exists = manualItems.some(m => m.id === `roadmap_top_${assignment.id}_${topic.id}_${dayObj.day}`);
                  if (!exists) {
                    autoHwItems.push({
                      id: `roadmap_top_${assignment.id}_${topic.id}_${dayObj.day}`,
                      roadmapAssignmentId: assignment.id,
                      isAutoHomework: true,
                      isRoadmapTask: true,
                      taskType: 'konu',
                      subject: `${plan.title} • ${subject.name}`,
                      topic: topic.name,
                      time: `Hedef: ${new Date(topic.dueDate).toLocaleDateString('tr-TR')}`,
                      done: false
                    });
                  }
                }
              }
            }
          });
        });
      });

      return {
        ...dayObj,
        dateLabel: dayInfo.dateLabel,
        items: [...autoHwItems, ...manualItems]
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
    setWeeklyProgram(prev => prev.map(d =>
      d.day === dayKey ? { ...d, items: d.items.filter(item => item.id !== itemId) } : d
    ));
  }, [setWeeklyProgram]);

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
      <div style={{ marginBottom: '1.25rem' }}>
        {/* Scrollable Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '2px solid #e8ecf0',
          gap: '0.25rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
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
                borderBottom: programTab === tab.id ? '3px solid #6366f1' : '3px solid transparent',
                background: 'transparent',
                fontWeight: programTab === tab.id ? 800 : 600,
                fontSize: '0.82rem',
                color: programTab === tab.id ? '#4f46e5' : '#64748b',
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

        {/* Progress Bar & Badge (Underneath the Tabs) */}
        {totalItems > 0 && (
          <div style={{
            marginTop: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '0.45rem 0.85rem',
            background: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Haftalık İlerleme:</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#6366f1' }}>{doneItems}/{totalItems} Tamamlandı</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 140, maxWidth: 220, marginLeft: 'auto' }}>
              <div style={{ flex: 1, height: 6, background: '#e8ecf0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #6366f1, #7c3aed)', transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: pct === 100 ? '#16a34a' : '#6366f1', minWidth: 32, textAlign: 'right' }}>
                %{pct}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Program */}
      {programTab === 'haftalik' && (
        <div>
          {/* Week Navigation & Month Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '0.75rem 1.1rem',
            marginBottom: '1.25rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setWeekOffset(w => w - 1)}
                style={{
                  padding: '0.45rem 0.8rem', borderRadius: '0.65rem',
                  background: '#f1f5f9', border: '1px solid #cbd5e1',
                  color: '#334155', fontWeight: 800, fontSize: '0.8rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
                title="Önceki Hafta"
              >
                <ChevronLeft size={16} /> Önceki Hafta
              </button>

              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  style={{
                    padding: '0.45rem 0.85rem', borderRadius: '0.65rem',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: 'white', border: 'none', fontWeight: 900, fontSize: '0.8rem',
                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.3)'
                  }}
                >
                  📍 Bu Hafta (Bugün)
                </button>
              )}

              <button
                onClick={() => setWeekOffset(w => w + 1)}
                style={{
                  padding: '0.45rem 0.8rem', borderRadius: '0.65rem',
                  background: '#f1f5f9', border: '1px solid #cbd5e1',
                  color: '#334155', fontWeight: 800, fontSize: '0.8rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
                title="Sonraki Hafta"
              >
                Sonraki Hafta <ChevronRight size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={20} color="#4f46e5" />
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                  {weekInfo.monthTitle}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, background: '#f8fafc', padding: '0.25rem 0.75rem', borderRadius: '0.65rem', border: '1.5px solid #e2e8f0' }}>
                📅 {weekInfo.rangeStr}
              </span>
            </div>
          </div>
          <style>{`
            .weekly-grid {
              display: grid;
              grid-template-columns: repeat(12, 1fr);
              gap: 0.9rem;
            }
            .weekly-grid > div:nth-child(-n+4) {
              grid-column: span 3;
            }
            .weekly-grid > div:nth-child(n+5) {
              grid-column: span 4;
            }
            @media (max-width: 992px) {
              .weekly-grid {
                grid-template-columns: repeat(2, 1fr);
              }
              .weekly-grid > div:nth-child(n) {
                grid-column: span 1;
              }
            }
            @media (max-width: 640px) {
              .weekly-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
              }
              .weekly-grid > div:nth-child(n) {
                grid-column: span 1;
              }
            }
          `}</style>
          <div className="weekly-grid">
            {(processedWeeklyProgram || []).map((dayObj, i) => {
              const dayMeta = DAYS.find(d => d.key === dayObj.day) || DAYS[i];
              return (
                <DayCard key={dayObj.day} dayObj={dayObj} dayMeta={dayMeta}
                  isToday={weekOffset === 0 && dayObj.day === todayKey}
                  onToggle={handleToggle} onDelete={handleDelete}
                  onEditClick={(dayKey, item) => setEditingItem({ dayKey, item })}
                  onAddClick={d => setAddingToDay(d)}
                  onOpenResult={handleOpenTaskResult} />
              );
            })}
          </div>
          {pct === 100 && totalItems > 0 && (
            <div style={{ marginTop: '1.5rem', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '1rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={24} color="#16a34a" />
              <div>
                <div style={{ fontWeight: 900, color: '#166534' }}>Harika! Bu haftanın programı tamamlandı! 🎉</div>
                <div style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600, marginTop: 2 }}>Tebrikler!</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly List View */}
      {programTab === 'aylik' && (
        <MonthlyListPanel
          weeklyProgram={weeklyProgram}
          allHomeworks={allHomeworks}
          currentUser={currentUser}
          submissions={submissions}
          curData={curData}
          onEditClick={(dayKey, item) => setEditingItem({ dayKey, item })}
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
        />
      )}
    </div>
  );
}
