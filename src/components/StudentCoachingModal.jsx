import { useState } from 'react';
import {
  X, BarChart3, AlertTriangle, BookOpen, Calendar,
  MessageSquare, Plus, CheckCircle2, Award, Clock,
  FileText, ArrowRight, Zap, Target, Send, ChevronRight, Check
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useCoaching } from '../context/CoachingContext';

export default function StudentCoachingModal({ student, teacherId, onClose }) {
  const { data: curriculumData } = useCurriculum();
  const { submissions } = useEvaluation();
  const { homeworks } = useHomework();
  const { studyAssignments, addStudyAssignment } = useStudyPlan();
  const { saveCoachingNote, getCoachingNoteForStudent } = useCoaching();

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'weaknesses' | 'study_plan' | 'notes'

  // Form states for adding study assignment
  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [newDueDate, setNewDueDate] = useState('');

  // Form states for coaching notes & goals
  const existingNote = getCoachingNoteForStudent(student.id) || {};
  const [coachingNoteText, setCoachingNoteText] = useState(existingNote.note || '');
  const [weeklyFocusText, setWeeklyFocusText] = useState(existingNote.weeklyFocus || '');
  const [noteGoals, setNoteGoals] = useState(existingNote.goals || []);
  const [newGoalText, setNewGoalText] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Data processing for Student
  const studentSubs = submissions.filter(s => s.studentId === student.id);
  const totalSolved = studentSubs.length;

  let totalCorrect = 0;
  let totalWrong = 0;
  let totalBlank = 0;
  const subjectStats = {};
  const wrongTopicStats = {};

  studentSubs.forEach(s => {
    totalCorrect += s.correctCount || 0;
    totalWrong += s.wrongCount || 0;
    totalBlank += s.emptyCount || 0;

    const subName = s.subject || 'Genel';
    if (!subjectStats[subName]) {
      subjectStats[subName] = { correct: 0, wrong: 0, total: 0 };
    }
    subjectStats[subName].correct += s.correctCount || 0;
    subjectStats[subName].wrong += s.wrongCount || 0;
    subjectStats[subName].total += (s.correctCount || 0) + (s.wrongCount || 0) + (s.emptyCount || 0);

    // Process wrong answers for topic analysis
    if (s.answers && Array.isArray(s.answers)) {
      s.answers.forEach(ans => {
        if (ans.isCorrect === false) {
          const topicName = ans.topic || ans.topicName || s.subject || 'Genel Konu';
          if (!wrongTopicStats[topicName]) {
            wrongTopicStats[topicName] = { subject: s.subject || 'Genel', wrongCount: 0 };
          }
          wrongTopicStats[topicName].wrongCount += 1;
        }
      });
    }
  });

  const grandTotalQuestions = totalCorrect + totalWrong + totalBlank;
  const overallSuccessRate = grandTotalQuestions > 0 ? Math.round((totalCorrect / grandTotalQuestions) * 100) : 0;

  // Sorted list of top weak topics
  const weakTopics = Object.entries(wrongTopicStats)
    .map(([topic, d]) => ({ topic, subject: d.subject, wrongCount: d.wrongCount }))
    .sort((a, b) => b.wrongCount - a.wrongCount);

  // Student's study assignments
  const studentAssignments = studyAssignments.filter(a => a.studentId === student.id);

  // Handlers
  const handleAddAssignment = async (e) => {
    e.preventDefault();
    if (!newSubject || !newTopic) return;

    await addStudyAssignment({
      studentId: student.id,
      subject: newSubject,
      topic: newTopic,
      durationMinutes: Number(newDuration) || 30,
      dueDate: newDueDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      assignedBy: teacherId
    });

    setNewTopic('');
    setNewDueDate('');
  };

  const handleAddGoal = () => {
    if (!newGoalText.trim()) return;
    setNoteGoals(prev => [...prev, { id: `g_${Date.now()}`, text: newGoalText.trim(), done: false }]);
    setNewGoalText('');
  };

  const handleToggleGoal = (id) => {
    setNoteGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  };

  const handleRemoveGoal = (id) => {
    setNoteGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    await saveCoachingNote({
      teacherId,
      studentId: student.id,
      note: coachingNoteText,
      weeklyFocus: weeklyFocusText,
      goals: noteGoals
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const gradeName = curriculumData?.grades?.find(g => g.id === student.gradeId)?.name || 'Öğrenci';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '880px', maxHeight: '92vh', background: 'white', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.25)' }}>

        {/* --- HEADER --- */}
        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '1.25rem 1.75rem', color: 'white', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'white', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
              {student.name?.charAt(0) || 'Ö'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>{student.name}</h2>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.6rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800 }}>{gradeName}</span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>🎯 Özel Öğrenci Koçluk & Gelişim Takip Dosyası</p>
            </div>
          </div>

          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '0.6rem', width: 36, height: 36, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* --- TABS BAR --- */}
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', padding: '0 1rem', overflowX: 'auto' }}>
          {[
            { id: 'analytics', label: 'Başarı & Test Analizi', icon: BarChart3 },
            { id: 'weaknesses', label: 'Eksik Konu Analizi', icon: AlertTriangle, badge: weakTopics.length },
            { id: 'study_plan', label: 'Ders Planı & Görevler', icon: BookOpen, badge: studentAssignments.filter(a => a.status !== 'completed').length },
            { id: 'notes', label: 'Koçluk Notları & Tavsiye', icon: MessageSquare }
          ].map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 1.1rem', border: 'none', background: 'transparent',
                fontWeight: active ? 800 : 700, fontSize: '0.82rem', color: active ? '#4f46e5' : '#64748b', cursor: 'pointer',
                borderBottom: active ? '3px solid #4f46e5' : '3px solid transparent', transition: 'all 0.15s', whiteSpace: 'nowrap'
              }}>
                <Icon size={16} color={active ? '#4f46e5' : '#64748b'} />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span style={{ background: active ? '#4f46e5' : '#e2e8f0', color: active ? 'white' : '#475569', borderRadius: 99, padding: '0.1rem 0.45rem', fontSize: '0.65rem', fontWeight: 800 }}>{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* --- TAB CONTENT --- */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* TAB 1: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Top stat metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Genel Başarı Oranı</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#15803d', marginTop: 4 }}>%{overallSuccessRate}</div>
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Çözülen Sınav Sayısı</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1d4ed8', marginTop: 4 }}>{totalSolved}</div>
                </div>
                <div style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#86198f', textTransform: 'uppercase' }}>Doğru / Yanlış / Boş</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#701a75', marginTop: 8 }}>
                    <span style={{ color: '#16a34a' }}>{totalCorrect}D</span> · <span style={{ color: '#dc2626' }}>{totalWrong}Y</span> · <span style={{ color: '#64748b' }}>{totalBlank}B</span>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={18} color="#4f46e5" /> Ders Bazlı Performans
                </h3>
                {Object.keys(subjectStats).length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>Henüz çözülmüş sınav verisi bulunmuyor.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {Object.entries(subjectStats).map(([sub, stat]) => {
                      const rate = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                      return (
                        <div key={sub}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                            <span>{sub}</span>
                            <span style={{ color: rate >= 70 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626' }}>%{rate} Başarı ({stat.correct}D / {stat.wrong}Y)</span>
                          </div>
                          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${rate}%`, background: rate >= 70 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 99, transition: 'width 0.8s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Solved Test History */}
              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={18} color="#0284c7" /> Çözülen Son Sınavlar
                </h3>
                {studentSubs.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>Henüz sınav çözülmemiş.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {studentSubs.slice(0, 5).map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{s.title || 'Sınav'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>{s.subject || 'Genel'} · {new Date(s.createdAt || Date.now()).toLocaleDateString('tr-TR')}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.9rem', color: (s.score || 0) >= 70 ? '#16a34a' : '#dc2626' }}>%{Math.round(s.score || 0)}</span>
                          <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: 99, fontWeight: 700 }}>
                            {s.correctCount || 0}D / {s.wrongCount || 0}Y
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WEAKNESSES */}
          {activeTab === 'weaknesses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '1rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={24} color="#f97316" />
                <div>
                  <h4 style={{ margin: 0, color: '#c2410c', fontSize: '0.88rem', fontWeight: 800 }}>Otomatik Yanlış & Eksik Konu Analizi</h4>
                  <p style={{ margin: '0.15rem 0 0', color: '#9a3412', fontSize: '0.75rem' }}>Öğrencinin çözdüğü tüm testlerde en çok yanlış yaptığı konular öncelik sırasına göre listelenmiştir.</p>
                </div>
              </div>

              {weakTopics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <CheckCircle2 size={40} color="#22c55e" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Harika! Öğrencinin biriken eksik veya yanlış konusu bulunmuyor.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
                  {weakTopics.map((w, idx) => (
                    <div key={idx} style={{ background: 'white', border: '1.5px solid #fee2e2', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#fef2f2', color: '#991b1b', padding: '0.15rem 0.5rem', borderRadius: 99, textTransform: 'uppercase' }}>
                            {w.subject}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#dc2626', background: '#fee2e2', padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                            {w.wrongCount} Yanlış
                          </span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{w.topic}</h4>
                      </div>
                      <button
                        onClick={() => {
                          setNewSubject(w.subject);
                          setNewTopic(w.topic);
                          setActiveTab('study_plan');
                        }}
                        style={{ marginTop: '1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.6rem', padding: '0.4rem 0.75rem', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyBetween: 'center', gap: 4 }}
                      >
                        <Plus size={14} /> Bu Konuyu Ders Planına Ekle
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STUDY PLAN ASSIGNMENT */}
          {activeTab === 'study_plan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Assign Form */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={18} color="#4f46e5" /> Öğrenciye Özel Konu Çalışma Görevi Atayın
                </h3>
                <form onSubmit={handleAddAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    <select value={newSubject} onChange={e => setNewSubject(e.target.value)} style={{ padding: '0.6rem 0.8rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: 'white' }} required>
                      <option value="">Ders Seçin...</option>
                      {curriculumData?.subjects?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      <option value="Matematik">Matematik</option>
                      <option value="Fen Bilimleri">Fen Bilimleri</option>
                      <option value="Türkçe">Türkçe</option>
                      <option value="Sosyal Bilgiler">Sosyal Bilgiler</option>
                      <option value="İngilizce">İngilizce</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Konu Adı (Örn: Çarpanlar ve Katlar)"
                      value={newTopic}
                      onChange={e => setNewTopic(e.target.value)}
                      style={{ padding: '0.6rem 0.8rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: 'white' }}
                      required
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '0.65rem', padding: '0 0.8rem' }}>
                      <Clock size={14} color="#64748b" />
                      <input
                        type="number"
                        placeholder="Süre (dk)"
                        value={newDuration}
                        onChange={e => setNewDuration(e.target.value)}
                        style={{ width: '100%', border: 'none', outline: 'none', padding: '0.6rem 0', fontSize: '0.82rem' }}
                      />
                    </div>

                    <input
                      type="date"
                      value={newDueDate}
                      onChange={e => setNewDueDate(e.target.value)}
                      style={{ padding: '0.6rem 0.8rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: 'white' }}
                    />
                  </div>

                  <button type="submit" style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1.25rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={16} /> Görev Atayıp Öğrenciye Gönder
                  </button>
                </form>
              </div>

              {/* Current Assigned List */}
              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                  Atanmış Çalışma Görevleri ({studentAssignments.length})
                </h3>
                {studentAssignments.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>Henüz atanmış ders çalışma görevi yok.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {studentAssignments.map(a => {
                      const isDone = a.status === 'completed';
                      return (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: isDone ? '#f0fdf4' : '#f8fafc', borderRadius: '0.75rem', border: `1px solid ${isDone ? '#bbf7d0' : '#f1f5f9'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDone ? '#22c55e' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={16} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a', textDecoration: isDone ? 'line-through' : 'none' }}>{a.topic}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{a.subject} · {a.durationMinutes || 30} Dakika · Son Tarih: {a.dueDate || 'Belirtilmedi'}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isDone ? '#16a34a' : '#d97706', background: isDone ? '#dcfce7' : '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
                            {isDone ? 'Tamamlandı' : 'Devam Ediyor'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: COACHING NOTES & ADVICE */}
          {activeTab === 'notes' && (
            <form onSubmit={handleSaveNotes} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={18} color="#7c3aed" /> Öğrenciye Özel Koçluk Notu & Tavsiye
                </h3>
                <p style={{ margin: '0 0 0.85rem', fontSize: '0.75rem', color: '#64748b' }}>Bu not öğrenci giriş yaptığında kendi panelinde en üstte görüntülenecektir.</p>
                <textarea
                  rows="4"
                  placeholder="Örn: Bu hafta Matematik soru çözümlerine ağırlık verilmeli. Yanlış analizlerini mutlaka incele..."
                  value={coachingNoteText}
                  onChange={e => setCoachingNoteText(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Weekly Focus */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={18} color="#f59e0b" /> Haftalık Ana Odak Noktası
                </h3>
                <input
                  type="text"
                  placeholder="Örn: Paragraf Çözüm Hızını Artırma & Problem Teknikleri"
                  value={weeklyFocusText}
                  onChange={e => setWeeklyFocusText(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              {/* Actionable Goals Checklist */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                  Haftalık Özel Koçluk Hedefleri ({noteGoals.length})
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <input
                    type="text"
                    placeholder="Yeni koçluk hedefi ekle (Örn: Cuma gününe kadar 2 deneme bitir)..."
                    value={newGoalText}
                    onChange={e => setNewGoalText(e.target.value)}
                    style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                  <button type="button" onClick={handleAddGoal} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.6rem 1rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
                    Ekle
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {noteGoals.map(g => (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.85rem', background: 'white', borderRadius: '0.6rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => handleToggleGoal(g.id)}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid #6366f1', background: g.done ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                          {g.done && <Check size={12} />}
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: g.done ? '#94a3b8' : '#0f172a', textDecoration: g.done ? 'line-through' : 'none' }}>{g.text}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveGoal(g.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                {isSaved ? (
                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={16} /> Koçluk Notları Başarıyla Kaydedildi!
                  </span>
                ) : <span />}
                <button type="submit" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.75rem 1.75rem', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Send size={16} /> Koçluk Notunu Kaydet & Öğrenciye İlet
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}