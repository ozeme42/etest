import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Trash2, Check, ChevronDown, ChevronRight, ChevronLeft, Calendar, CheckCircle2, X, BookOpen, Clock, GraduationCap } from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useHomework } from '../context/HomeworkContext';
import { useAuth } from '../context/AuthContext';
import { useEvaluation } from '../context/EvaluationContext';
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
  { id: 'kitap',  label: 'Kitap Okuma',     icon: '📚', color: '#059669', bg: '#f0fdf4' },
  { id: 'deneme', label: 'Deneme Sınavı',   icon: '📊', color: '#d97706', bg: '#fffbeb' },
  { id: 'diger',  label: 'Diğer',           icon: '✨', color: '#64748b', bg: '#f8fafc' },
];

export const uid = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function getTodayKey() {
  const d = new Date();
  const map = [6, 0, 1, 2, 3, 4, 5];
  return DAYS[map[d.getDay()]]?.key || 'Pzt';
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
export function AddItemModal({ dayKey, onAdd, onClose, topicPool }) {
  const [taskType, setTaskType] = useState('konu');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [hours, setHours] = useState('');
  const [questionCount, setQuestionCount] = useState('');
  const [bookName, setBookName] = useState('');
  const [note, setNote] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);

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

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({
      id: uid(),
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
      done: false,
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '1.25rem', width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.25)', animation: 'pcSlideUp 0.2s ease', maxHeight: '90vh', overflowY: 'auto' }}>
        <style>{`@keyframes pcSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: '1.25rem 1.25rem 0 0' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Görev Ekle</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{DAYS.find(d => d.key === dayKey)?.long}</div>
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

            {/* Recurring */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem', background: '#f8fafc', borderRadius: '0.65rem', cursor: 'pointer', border: '1px solid #f1f5f9' }}
              onClick={() => setIsRecurring(!isRecurring)}>
              <div style={{ width: 20, height: 20, borderRadius: 5, border: isRecurring ? 'none' : '2px solid #cbd5e1', background: isRecurring ? '#6366f1' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isRecurring && <Check size={12} color="white" strokeWidth={3} />}
              </div>
              <div>
                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#374151' }}>Her hafta tekrar et</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Haftalık programınıza otomatik eklenir</div>
              </div>
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
            <button onClick={handleAdd} disabled={!canAdd}
              style={{ flex: 2, padding: '0.7rem', background: canAdd ? `linear-gradient(135deg, ${selectedType?.color}, #7c3aed)` : '#e2e8f0', border: 'none', borderRadius: '0.75rem', fontWeight: 800, fontSize: '0.85rem', cursor: canAdd ? 'pointer' : 'not-allowed', color: canAdd ? 'white' : '#94a3b8', boxShadow: canAdd ? `0 4px 12px ${selectedType?.color}44` : 'none', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {selectedType?.icon} Görev Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── DayCard ─── */
export function DayCard({ dayObj, dayMeta, isToday, onToggle, onDelete, onAddClick }) {
  const items = dayObj.items || [];
  const done = items.filter(i => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ background: 'white', borderRadius: '1rem', border: isToday ? '2px solid #6366f1' : '1.5px solid #e8ecf0', boxShadow: isToday ? '0 0 0 4px rgba(99,102,241,0.1), 0 4px 20px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
      {/* Day Header */}
      <div style={{ padding: '0.75rem 1rem 0.6rem', borderBottom: '1px solid #f1f5f9', background: isToday ? 'linear-gradient(135deg, #eef2ff, #f5f3ff)' : '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '0.95rem', color: isToday ? '#4f46e5' : '#0f172a' }}>
              {dayObj.dateLabel ? `${dayObj.dateLabel}` : dayMeta.key}
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', marginTop: 1 }}>{dayMeta.long}</div>
          </div>
          {isToday && <span style={{ background: '#6366f1', color: 'white', fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: '99px' }}>BUGÜN</span>}
        </div>
        {total > 0 && (
          <div style={{ marginTop: '0.55rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>{done}/{total}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: pct === 100 ? '#16a34a' : '#6366f1' }}>%{pct}</span>
            </div>
            <div style={{ height: 4, background: '#e8ecf0', borderRadius: 99 }}>
              <div style={{ height: 4, borderRadius: 99, width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#6366f1,#7c3aed)', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', minHeight: 60 }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1rem 0', color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 600 }}>Henüz ders yok</div>
        )}
        {items.map(item => {
          const tt = TASK_TYPES.find(t => t.id === item.taskType);
          return (
            <div key={item.id}
              style={{ background: item.done ? '#f0fdf4' : '#f8fafc', border: item.done ? '1px solid #bbf7d0' : '1px solid #e8ecf0', borderRadius: '0.6rem', padding: '0.5rem 0.65rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.15s' }}
              onClick={() => onToggle(dayObj.day, item.id)}>
              {/* Icon */}
              <div style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, marginTop: 1, background: item.done ? '#22c55e' : (tt?.bg || 'white'), border: item.done ? 'none' : `1.5px solid ${tt?.color || '#cbd5e1'}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', transition: 'all 0.15s' }}>
                {item.done ? <Check size={12} color="white" strokeWidth={3} /> : (tt?.icon || '📝')}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {item.taskType && (
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, color: tt?.color || '#64748b', background: tt?.bg || '#f8fafc', display: 'inline-block', padding: '1px 6px', borderRadius: '99px', marginBottom: 2 }}>
                    {tt?.label}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: item.done ? '#166534' : '#374151', textDecoration: item.done ? 'line-through' : 'none' }}>
                  {item.bookName || item.subject}
                </div>
                {item.topic && (
                  <div style={{ fontSize: '0.7rem', color: item.done ? '#4ade80' : '#64748b', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                  <div style={{ fontSize: '0.67rem', color: '#94a3b8', fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {item.questionCount && <span>✏️ {item.questionCount}</span>}
                    {item.hours && <span><Clock size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {item.hours}</span>}
                    {item.note && <span style={{ color: '#a78bfa' }}>· {item.note}</span>}
                  </div>
                )}
              </div>

              {/* Delete */}
              <button onClick={e => { e.stopPropagation(); onDelete(dayObj.day, item.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: 2, flexShrink: 0, display: 'flex', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#e2e8f0'}>
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
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
export function TopicPoolPanel({ topicPool, setTopicPool }) {
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
                        <div key={topic.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.65rem', background: '#f8fafc', borderRadius: '0.6rem', border: '1px solid #f1f5f9' }}>
                          <div style={{ flex: 1, fontSize: '0.83rem', fontWeight: 700, color: '#374151' }}>{topic.name}</div>
                          <select value={topic.status} onChange={e => updateTopicStatus(subject.id, topic.id, e.target.value)} onClick={e => e.stopPropagation()}
                            style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 6px', border: `1.5px solid ${sc.border}`, borderRadius: '0.4rem', background: sc.bg, color: sc.text, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                            {TOPIC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={() => deleteTopic(subject.id, topic.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: 2, display: 'flex', borderRadius: 4 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#e2e8f0'}>
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
export function MonthlyListPanel({ weeklyProgram, allHomeworks, currentUser, submissions, curData }) {
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

    const todayYMD = new Date().toISOString().split('T')[0];

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

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, monthIdx, day);
      const ymd = dateObj.toISOString().split('T')[0];
      const dayOfWeekIdx = dateObj.getDay();
      const dayKey = DAYS_SHORT[dayOfWeekIdx];
      const isToday = ymd === todayYMD;

      const dayProg = (weeklyProgram || []).find(r => r.day === dayKey);
      const manualItems = dayProg?.items || [];

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
    <div>
      {/* Month Navigation & Stats Banner */}
      <div style={{
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={22} color="#4f46e5" />
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
              📆 {monthInfo.monthTitle}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          return (
            <div
              key={d.ymd}
              style={{
                background: d.isToday ? 'linear-gradient(135deg, #ffffff, #f5f3ff)' : '#ffffff',
                border: d.isToday ? '2px solid #6366f1' : '1.5px solid #e2e8f0',
                borderRadius: '1rem',
                padding: '0.85rem 1.1rem',
                boxShadow: d.isToday ? '0 4px 16px rgba(99,102,241,0.1)' : '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              {/* Date Box */}
              <div style={{
                minWidth: 70,
                textAlign: 'center',
                padding: '0.4rem 0.6rem',
                borderRadius: '0.75rem',
                background: d.isToday ? '#4f46e5' : '#f8fafc',
                color: d.isToday ? 'white' : '#1e293b',
                border: d.isToday ? 'none' : '1px solid #e2e8f0',
                flexShrink: 0
              }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1 }}>{d.day}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, marginTop: 2 }}>{d.dayName}</div>
                {d.isToday && <div style={{ fontSize: '0.55rem', fontWeight: 900, background: 'rgba(255,255,255,0.25)', padding: '1px 4px', borderRadius: 4, marginTop: 3 }}>BUGÜN</div>}
              </div>

              {/* Items List */}
              <div style={{ flex: 1, minWidth: 200 }}>
                {d.items.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, fontStyle: 'italic', paddingTop: 6 }}>
                    Programlanan ders görevi yok
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {d.items.map((item, idx) => {
                      const icon = taskIcons[item.taskType] || '📌';
                      return (
                        <div
                          key={item.id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: item.done ? '#f8fafc' : item.isAutoHomework ? '#f0fdf4' : '#fafafa',
                            border: item.done ? '1px solid #e2e8f0' : item.isAutoHomework ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                            borderRadius: '0.65rem',
                            padding: '0.45rem 0.75rem',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: '0.9rem' }}>{icon}</span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: item.done ? '#64748b' : '#0f172a', textDecoration: item.done ? 'line-through' : 'none' }}>
                                {item.subject || item.topic || 'Ders Çalışması'}
                              </div>
                              {item.topic && item.subject && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{item.topic}</div>
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

  const hwContext = useHomework();
  const authContext = useAuth();
  const evalContext = useEvaluation();
  const currContext = useCurriculum();

  const allHomeworks = hwContext?.homeworks || [];
  const currentUser = authContext?.currentUser;
  const submissions = evalContext?.submissions || [];
  const curData = currContext?.curriculumData;

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
      const ymd = d.toISOString().split('T')[0];
      dayDateMap[dMeta.key] = {
        ymd,
        time: new Date(ymd).getTime(),
        dateLabel: `${d.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]}`
      };
    });

    if (!currentUser || !allHomeworks.length) {
      return weeklyProgram.map(dayObj => ({
        ...dayObj,
        dateLabel: dayDateMap[dayObj.day]?.dateLabel || ''
      }));
    }

    const studentId = currentUser.id;
    const studentGrades = curData?.grades || [];

    const studentHomeworks = allHomeworks.filter(hw => {
      if (hw.isBookAssignment) return false;
      return isHomeworkForStudent(hw, currentUser, studentGrades);
    }).map(hw => {
      const sub = (hw.submissions || []).find(s => String(s.studentId) === String(studentId)) ||
        submissions.find(s => (s.hwId === hw.id || s.testId === hw.id || String(s.testId) === String(hw.id)) && String(s.studentId) === String(studentId));
      return {
        ...hw,
        isDone: !!sub
      };
    });

    return weeklyProgram.map(dayObj => {
      const dayInfo = dayDateMap[dayObj.day];
      if (!dayInfo) return dayObj;

      const manualItems = dayObj.items || [];
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
          isForThisDay = dayInfo.time >= startTime && dayInfo.time <= dueTime;
        } else if (dueTime) {
          isForThisDay = dayInfo.ymd === dueYMD || (dayInfo.time <= dueTime && dayInfo.time >= dueTime - 6 * 86400000);
        } else if (startTime) {
          isForThisDay = dayInfo.time === startTime;
        }

        if (isForThisDay) {
          const exists = manualItems.some(m => m.id === `hw_${hw.id}` || m.hwId === hw.id || (m.topic === (hw.title || hw.name)));
          if (!exists) {
            autoHwItems.push({
              id: `auto_hw_${hw.id}_${dayObj.day}`,
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

      return {
        ...dayObj,
        dateLabel: dayInfo.dateLabel,
        items: [...autoHwItems, ...manualItems]
      };
    });
  }, [weeklyProgram, allHomeworks, currentUser, submissions, curData, weekInfo]);

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

  const handleAddItem = useCallback((newItem) => {
    setWeeklyProgram(prev => prev.map(d =>
      d.day === addingToDay ? { ...d, items: [...d.items, newItem] } : d
    ));
  }, [addingToDay, setWeeklyProgram]);

  const totalItems = (processedWeeklyProgram || []).reduce((a, d) => a + (d.items?.length || 0), 0);
  const doneItems = (processedWeeklyProgram || []).reduce((a, d) => a + (d.items?.filter(i => i.done).length || 0), 0);
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #e8ecf0', marginBottom: '1.25rem' }}>
        {[
          { id: 'haftalik', label: '📅 Haftalık Program' },
          { id: 'aylik', label: '📆 Aylık Görünüm' },
          { id: 'konular', label: '📚 Konu Havuzu' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setProgramTab(tab.id)}
            style={{ padding: '0.75rem 1.1rem', border: 'none', borderBottom: programTab === tab.id ? '3px solid #6366f1' : '3px solid transparent', background: 'transparent', fontWeight: programTab === tab.id ? 800 : 600, fontSize: '0.85rem', color: programTab === tab.id ? '#4f46e5' : '#64748b', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', fontFamily: 'inherit', marginBottom: -2 }}>
            {tab.label}
          </button>
        ))}
        {totalItems > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '0 0.5rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>{doneItems}/{totalItems}</div>
            <div style={{ width: 60, height: 5, background: '#e8ecf0', borderRadius: 99 }}>
              <div style={{ height: 5, borderRadius: 99, width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#6366f1', transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: pct === 100 ? '#16a34a' : '#6366f1' }}>%{pct}</div>
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
              grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
              gap: 0.85rem;
            }
            @media (max-width: 640px) {
              .weekly-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
              }
            }
          `}</style>
          <div className="weekly-grid">
            {(processedWeeklyProgram || []).map((dayObj, i) => {
              const dayMeta = DAYS.find(d => d.key === dayObj.day) || DAYS[i];
              return (
                <DayCard key={dayObj.day} dayObj={dayObj} dayMeta={dayMeta}
                  isToday={dayObj.day === todayKey}
                  onToggle={handleToggle} onDelete={handleDelete}
                  onAddClick={d => setAddingToDay(d)} />
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
        />
      )}

      {/* Topic Pool */}
      {programTab === 'konular' && (
        <TopicPoolPanel topicPool={topicPool} setTopicPool={setTopicPool} />
      )}

      {/* Add Modal */}
      {addingToDay && (
        <AddItemModal dayKey={addingToDay} onAdd={handleAddItem} onClose={() => setAddingToDay(null)} topicPool={topicPool} />
      )}
    </div>
  );
}
