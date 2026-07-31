import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, AlertTriangle, BookOpen, Calendar,
  MessageSquare, Plus, CheckCircle2, Award, Clock,
  FileText, ArrowRight, Zap, Target, Send, ChevronRight, Check,
  User, Sparkles
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useCoaching } from '../context/CoachingContext';
import { useAuth } from '../context/AuthContext';

export default function StudentCoachingPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { users } = useUser();
  const { currentUser } = useAuth();
  const { data: curriculumData } = useCurriculum();
  const { submissions } = useEvaluation();
  const { homeworks } = useHomework();
  const { studyAssignments, addStudyAssignment } = useStudyPlan();
  const { saveCoachingNote, getCoachingNoteForStudent } = useCoaching();

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'weaknesses' | 'study_plan' | 'notes'

  // Find target student
  const student = users.find(u => String(u.id) === String(studentId));
  const teacherId = currentUser?.id || 'teacher_1';

  // Form states for adding study assignment
  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [newDueDate, setNewDueDate] = useState('');

  // Form states for coaching notes & goals
  const existingNote = getCoachingNoteForStudent(studentId) || {};
  const [coachingNoteText, setCoachingNoteText] = useState(existingNote.note || '');
  const [weeklyFocusText, setWeeklyFocusText] = useState(existingNote.weeklyFocus || '');
  const [noteGoals, setNoteGoals] = useState(existingNote.goals || []);
  const [newGoalText, setNewGoalText] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!student) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Öğrenci Bulunamadı</h2>
        <p style={{ color: '#64748b' }}>Aradığınız öğrenci sistemde bulunamadı.</p>
        <button onClick={() => navigate('/teacher')} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.65rem', fontWeight: 800, cursor: 'pointer', marginTop: '1rem' }}>
          Öğretmen Paneline Dön
        </button>
      </div>
    );
  }

  // Data processing for Student
  const studentSubs = submissions.filter(s => String(s.studentId) === String(student.id));
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
  const studentAssignments = studyAssignments.filter(a => String(a.studentId) === String(student.id));

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#f0f4ff 0%,#fafafa 60%,#f5f3ff 100%)', padding: 'clamp(1rem,3vw,2rem)', fontFamily: 'inherit' }}>

      {/* TOP NAV BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/teacher')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '0.85rem', padding: '0.55rem 1.1rem', color: '#334155', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.15s' }}
        >
          <ArrowLeft size={16} /> Öğretmen Paneline Dön
        </button>

        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
          🎯 Birebir Öğrenci Koçluk & Analiz Sayfası
        </span>
      </div>

      {/* MAIN CONTAINER */}
      <div style={{ background: 'white', borderRadius: '1.5rem', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}>

        {/* --- HEADER --- */}
        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '1.75rem 2rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'white', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', flexShrink: 0 }}>
              {student.name?.charAt(0) || 'Ö'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>{student.name}</h1>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.7rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800 }}>{gradeName}</span>
              </div>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.84rem', color: 'rgba(255,255,255,0.85)' }}>{student.email} · Özel Öğrenci Koçluk & Gelişim Takip Dosyası</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '1rem', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>Genel Başarı</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>%{overallSuccessRate}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '1rem', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>Çözülen Sınav</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>{totalSolved}</div>
            </div>
          </div>
        </div>

        {/* --- TABS BAR --- */}
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', padding: '0 1.5rem', overflowX: 'auto' }}>
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
                display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '1rem 1.35rem', border: 'none', background: 'transparent',
                fontWeight: active ? 800 : 700, fontSize: '0.85rem', color: active ? '#4f46e5' : '#64748b', cursor: 'pointer',
                borderBottom: active ? '3px solid #4f46e5' : '3px solid transparent', transition: 'all 0.15s', whiteSpace: 'nowrap'
              }}>
                <Icon size={17} color={active ? '#4f46e5' : '#64748b'} />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span style={{ background: active ? '#4f46e5' : '#e2e8f0', color: active ? 'white' : '#475569', borderRadius: 99, padding: '0.12rem 0.5rem', fontSize: '0.68rem', fontWeight: 800 }}>{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* --- TAB CONTENT --- */}
        <div style={{ padding: '2rem' }}>

          {/* TAB 1: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* Top stat metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '1.1rem', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Genel Başarı Oranı</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#15803d', marginTop: 4 }}>%{overallSuccessRate}</div>
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '1.1rem', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Çözülen Sınav Sayısı</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1d4ed8', marginTop: 4 }}>{totalSolved}</div>
                </div>
                <div style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: '1.1rem', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#86198f', textTransform: 'uppercase' }}>Doğru / Yanlış / Boş</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#701a75', marginTop: 8 }}>
                    <span style={{ color: '#16a34a' }}>{totalCorrect}D</span> · <span style={{ color: '#dc2626' }}>{totalWrong}Y</span> · <span style={{ color: '#64748b' }}>{totalBlank}B</span>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={20} color="#4f46e5" /> Ders Bazlı Performans & Başarı Grafiği
                </h3>
                {Object.keys(subjectStats).length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Henüz çözülmüş sınav verisi bulunmuyor.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.entries(subjectStats).map(([sub, stat]) => {
                      const rate = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                      return (
                        <div key={sub}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                            <span>{sub}</span>
                            <span style={{ color: rate >= 70 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626' }}>%{rate} Başarı ({stat.correct}D / {stat.wrong}Y)</span>
                          </div>
                          <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${rate}%`, background: rate >= 70 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 99, transition: 'width 0.8s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Solved Test History */}
              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={20} color="#0284c7" /> Çözülen Son Sınavlar
                </h3>
                {studentSubs.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Henüz sınav çözülmemiş.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {studentSubs.slice(0, 8).map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.1rem', background: '#f8fafc', borderRadius: '0.85rem', border: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{s.title || 'Sınav'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{s.subject || 'Genel'} · {new Date(s.createdAt || Date.now()).toLocaleDateString('tr-TR')}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontWeight: 900, fontSize: '1rem', color: (s.score || 0) >= 70 ? '#16a34a' : '#dc2626' }}>%{Math.round(s.score || 0)}</span>
                          <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.65rem', borderRadius: 99, fontWeight: 800 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#fff7ed', border: '1.5px solid #ffedd5', borderRadius: '1.25rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <AlertTriangle size={28} color="#f97316" />
                <div>
                  <h4 style={{ margin: 0, color: '#c2410c', fontSize: '0.95rem', fontWeight: 800 }}>Otomatik Yanlış & Eksik Konu Analizi</h4>
                  <p style={{ margin: '0.2rem 0 0', color: '#9a3412', fontSize: '0.8rem' }}>Öğrencinin çözdüğü tüm testlerde en çok yanlış yaptığı konular öncelik sırasına göre listelenmiştir.</p>
                </div>
              </div>

              {weakTopics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: 'white', borderRadius: '1.25rem', border: '1.5px solid #e2e8f0' }}>
                  <CheckCircle2 size={48} color="#22c55e" style={{ margin: '0 auto 0.75rem' }} />
                  <h3 style={{ margin: 0, color: '#16a34a', fontWeight: 900 }}>Harika Durum!</h3>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem' }}>Öğrencinin biriken eksik veya yanlış konusu bulunmuyor.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {weakTopics.map((w, idx) => (
                    <div key={idx} style={{ background: 'white', border: '1.5px solid #fee2e2', borderRadius: '1.1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#fef2f2', color: '#991b1b', padding: '0.2rem 0.6rem', borderRadius: 99, textTransform: 'uppercase' }}>
                            {w.subject}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#dc2626', background: '#fee2e2', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
                            {w.wrongCount} Yanlış
                          </span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{w.topic}</h4>
                      </div>
                      <button
                        onClick={() => {
                          setNewSubject(w.subject);
                          setNewTopic(w.topic);
                          setActiveTab('study_plan');
                        }}
                        style={{ marginTop: '1.25rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem', padding: '0.55rem 0.85rem', color: '#1d4ed8', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <Plus size={15} /> Bu Konuyu Ders Planına Ekle
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STUDY PLAN ASSIGNMENT */}
          {activeTab === 'study_plan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* Assign Form */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={20} color="#4f46e5" /> Öğrenciye Özel Konu Çalışma Görevi Atayın
                </h3>
                <form onSubmit={handleAddAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <select value={newSubject} onChange={e => setNewSubject(e.target.value)} style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }} required>
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
                      style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                      required
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '0.75rem', padding: '0 0.9rem' }}>
                      <Clock size={16} color="#64748b" />
                      <input
                        type="number"
                        placeholder="Süre (dk)"
                        value={newDuration}
                        onChange={e => setNewDuration(e.target.value)}
                        style={{ width: '100%', border: 'none', outline: 'none', padding: '0.7rem 0', fontSize: '0.85rem' }}
                      />
                    </div>

                    <input
                      type="date"
                      value={newDueDate}
                      onChange={e => setNewDueDate(e.target.value)}
                      style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                    />
                  </div>

                  <button type="submit" style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.7rem 1.5rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>
                    <Plus size={18} /> Görev Atayıp Öğrenciye Gönder
                  </button>
                </form>
              </div>

              {/* Current Assigned List */}
              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Atanmış Çalışma Görevleri ({studentAssignments.length})
                </h3>
                {studentAssignments.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Henüz atanmış ders çalışma görevi yok.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {studentAssignments.map(a => {
                      const isDone = a.status === 'completed';
                      return (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.1rem', background: isDone ? '#f0fdf4' : '#f8fafc', borderRadius: '0.85rem', border: `1px solid ${isDone ? '#bbf7d0' : '#f1f5f9'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: isDone ? '#22c55e' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', textDecoration: isDone ? 'line-through' : 'none' }}>{a.topic}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{a.subject} · {a.durationMinutes || 30} Dakika · Son Tarih: {a.dueDate || 'Belirtilmedi'}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isDone ? '#16a34a' : '#d97706', background: isDone ? '#dcfce7' : '#fef3c7', padding: '0.25rem 0.75rem', borderRadius: 99 }}>
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
            <form onSubmit={handleSaveNotes} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={20} color="#7c3aed" /> Öğrenciye Özel Koçluk Notu & Tavsiye
                </h3>
                <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#64748b' }}>Bu not öğrenci giriş yaptığında kendi panelinde en üstte görüntülenecektir.</p>
                <textarea
                  rows="4"
                  placeholder="Örn: Bu hafta Matematik soru çözümlerine ağırlık verilmeli. Yanlış analizlerini mutlaka incele..."
                  value={coachingNoteText}
                  onChange={e => setCoachingNoteText(e.target.value)}
                  style={{ width: '100%', padding: '0.9rem', borderRadius: '0.85rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Weekly Focus */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={20} color="#f59e0b" /> Haftalık Ana Odak Noktası
                </h3>
                <input
                  type="text"
                  placeholder="Örn: Paragraf Çözüm Hızını Artırma & Problem Teknikleri"
                  value={weeklyFocusText}
                  onChange={e => setWeeklyFocusText(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              {/* Actionable Goals Checklist */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Haftalık Özel Koçluk Hedefleri ({noteGoals.length})
                </h3>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Yeni koçluk hedefi ekle (Örn: Cuma gününe kadar 2 deneme bitir)..."
                    value={newGoalText}
                    onChange={e => setNewGoalText(e.target.value)}
                    style={{ flex: 1, padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                  <button type="button" onClick={handleAddGoal} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.7rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Ekle
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {noteGoals.map(g => (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => handleToggleGoal(g.id)}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid #6366f1', background: g.done ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                          {g.done && <Check size={14} />}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: g.done ? '#94a3b8' : '#0f172a', textDecoration: g.done ? 'line-through' : 'none' }}>{g.text}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveGoal(g.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                {isSaved ? (
                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={18} /> Koçluk Notları Başarıyla Kaydedildi!
                  </span>
                ) : <span />}
                <button type="submit" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: 'white', border: 'none', borderRadius: '0.85rem', padding: '0.85rem 2rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 18px rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Send size={18} /> Koçluk Notunu Kaydet & Öğrenciye İlet
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
