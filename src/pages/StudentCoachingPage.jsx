import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, AlertTriangle, BookOpen, Calendar,
  MessageSquare, Plus, CheckCircle2, Award, Clock,
  FileText, ArrowRight, Zap, Target, Send, ChevronRight, Check,
  User, Sparkles, TrendingUp, Trash2, CalendarDays, Edit3, UserCheck,
  Printer, Folder, Bookmark, Phone, Heart, Brain, GraduationCap
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useUser } from '../context/UserContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useHomework } from '../context/HomeworkContext';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useSchedule } from '../context/ScheduleContext';
import { useCoaching } from '../context/CoachingContext';
import { useAuth } from '../context/AuthContext';

const DAYS = [
  { id: 'Pazartesi', label: 'Pazartesi' },
  { id: 'Salı', label: 'Salı' },
  { id: 'Çarşamba', label: 'Çarşamba' },
  { id: 'Perşembe', label: 'Perşembe' },
  { id: 'Cuma', label: 'Cuma' },
  { id: 'Cumartesi', label: 'Cumartesi' },
  { id: 'Pazar', label: 'Pazar' },
];

const TIME_SLOTS = ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'];

export default function StudentCoachingPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { users } = useUser();
  const { currentUser } = useAuth();
  const { data: curriculumData } = useCurriculum();
  const { submissions } = useEvaluation();
  const { homeworks, addHomework } = useHomework();
  const { studyAssignments, addStudyAssignment } = useStudyPlan();
  const { schedules, addSchedule, deleteSchedule } = useSchedule();
  const {
    saveCoachingNote,
    getCoachingNoteForStudent,
    getCoachingProfileForStudent,
    saveCoachingProfile,
    mockExams,
    addMockExam,
    deleteMockExam,
    getMockExamsForStudent,
    addCoachingMeeting,
    getMeetingsForStudent
  } = useCoaching();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'analytics' | 'mock_exams' | 'weaknesses' | 'timetable' | 'meetings' | 'notes'

  // Find target student
  const student = users.find(u => String(u.id) === String(studentId));
  const teacherId = currentUser?.id || 'teacher_1';

  // --- FORM STATES ---
  // 1. Profile / Dossier Info Form
  const existingProfile = getCoachingProfileForStudent(studentId) || {};
  const [targetSchool, setTargetSchool] = useState(existingProfile.targetSchool || '');
  const [targetNet, setTargetNet] = useState(existingProfile.targetNet || '90');
  const [learningStyle, setLearningStyle] = useState(existingProfile.learningStyle || 'Görsel Öğrenen');
  const [parentName, setParentName] = useState(existingProfile.parentName || '');
  const [parentPhone, setParentPhone] = useState(existingProfile.parentPhone || '');
  const [parentNotes, setParentNotes] = useState(existingProfile.parentNotes || '');
  const [strengths, setStrengths] = useState(existingProfile.strengths || '');
  const [hobbies, setHobbies] = useState(existingProfile.hobbies || '');
  const [isProfileSaved, setIsProfileSaved] = useState(false);

  // 2. Study assignment form
  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [newDueDate, setNewDueDate] = useState('');

  // 3. Coaching Note & Goals
  const existingNote = getCoachingNoteForStudent(studentId) || {};
  const [coachingNoteText, setCoachingNoteText] = useState(existingNote.note || '');
  const [weeklyFocusText, setWeeklyFocusText] = useState(existingNote.weeklyFocus || '');
  const [noteGoals, setNoteGoals] = useState(existingNote.goals || []);
  const [newGoalText, setNewGoalText] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // 4. Mock Exam form
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [netTurkce, setNetTurkce] = useState('');
  const [netMat, setNetMat] = useState('');
  const [netFen, setNetFen] = useState('');
  const [netSosyal, setNetSosyal] = useState('');
  const [netIng, setNetIng] = useState('');

  // 5. Meeting Form
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingTopic, setMeetingTopic] = useState('Genel Haftalık Değerlendirme');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [nextAppointmentDate, setNextAppointmentDate] = useState('');

  // 6. Timetable slot Form
  const [slotDay, setSlotDay] = useState('Pazartesi');
  const [slotTime, setSlotTime] = useState('18:00');
  const [slotSubject, setSlotSubject] = useState('Matematik');
  const [slotTitle, setSlotTitle] = useState('');

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

  // --- DATA COMPUTATIONS ---
  const studentSubs = submissions.filter(s => String(s.studentId) === String(student.id));
  const studentMockExams = getMockExamsForStudent(student.id);
  const studentMeetings = getMeetingsForStudent(student.id);
  const studentSchedules = schedules.filter(s => String(s.studentId) === String(student.id));
  const studentAssignments = studyAssignments.filter(a => String(a.studentId) === String(student.id));

  // Analytics computation
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

  // Weak topics list
  const weakTopics = Object.entries(wrongTopicStats)
    .map(([topic, d]) => ({ topic, subject: d.subject, wrongCount: d.wrongCount }))
    .sort((a, b) => b.wrongCount - a.wrongCount);

  // Mock Exam Chart Data
  const chartData = useMemo(() => {
    return studentMockExams.map((m, idx) => ({
      name: m.title || `Deneme ${idx + 1}`,
      ToplamNet: m.totalNet || 0,
      Türkçe: m.scores?.Turkce || 0,
      Matematik: m.scores?.Matematik || 0,
      Fen: m.scores?.Fen || 0
    }));
  }, [studentMockExams]);

  const latestMockNet = studentMockExams.length > 0 ? studentMockExams[studentMockExams.length - 1].totalNet : 0;
  const netGap = Math.max(0, Number(targetNet) - latestMockNet);

  // --- HANDLERS ---
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await saveCoachingProfile({
      studentId: student.id,
      targetSchool,
      targetNet: Number(targetNet) || 0,
      learningStyle,
      parentName,
      parentPhone,
      parentNotes,
      strengths,
      hobbies
    });
    setIsProfileSaved(true);
    setTimeout(() => setIsProfileSaved(false), 2000);
  };

  const handleAddMockExam = async (e) => {
    e.preventDefault();
    if (!examTitle) return;
    const tN = Number(netTurkce) || 0;
    const mN = Number(netMat) || 0;
    const fN = Number(netFen) || 0;
    const sN = Number(netSosyal) || 0;
    const iN = Number(netIng) || 0;
    const totalN = Number((tN + mN + fN + sN + iN).toFixed(2));

    await addMockExam({
      studentId: student.id,
      title: examTitle,
      date: examDate,
      scores: { Turkce: tN, Matematik: mN, Fen: fN, Sosyal: sN, Ingilizce: iN },
      totalNet: totalN
    });

    setExamTitle(''); setNetTurkce(''); setNetMat(''); setNetFen(''); setNetSosyal(''); setNetIng('');
  };

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

    setNewTopic(''); setNewDueDate('');
  };

  const handleAutoAssignWeakness = async (w) => {
    await addStudyAssignment({
      studentId: student.id,
      subject: w.subject,
      topic: `${w.topic} (Eksik Konu Tekrarı)`,
      durationMinutes: 45,
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      assignedBy: teacherId
    });

    await addHomework({
      title: `⚡ Özel Koçluk Testi: ${w.topic}`,
      subject: w.subject,
      targetType: 'student',
      targetIds: [student.id],
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      totalQuestions: 15,
      timePerQuestion: 2
    });

    alert(`"${w.topic}" konusu için çalışma görevi ve özel test başarıyla öğrenciye atandı!`);
  };

  const handleAddScheduleSlot = async (e) => {
    e.preventDefault();
    if (!slotTitle) return;
    await addSchedule({
      studentId: student.id,
      day: slotDay,
      time: slotTime,
      title: `${slotSubject}: ${slotTitle}`,
      assignedBy: teacherId
    });
    setSlotTitle('');
  };

  const handleAddMeeting = async (e) => {
    e.preventDefault();
    if (!meetingNotes) return;
    await addCoachingMeeting({
      teacherId,
      studentId: student.id,
      date: meetingDate,
      topic: meetingTopic,
      notes: meetingNotes,
      nextMeetingDate: nextAppointmentDate
    });
    setMeetingNotes(''); setNextAppointmentDate('');
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
    <div className="coaching-dossier-page" style={{ minHeight: '100vh', background: '#e2e8f0', padding: 'clamp(1rem,3vw,2rem)', fontFamily: 'inherit' }}>

      {/* TOP CONTROL BAR (Hidden on Print) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          onClick={() => navigate('/teacher')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '0.85rem', padding: '0.6rem 1.25rem', color: '#334155', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        >
          <ArrowLeft size={16} /> Öğretmen Paneline Dön
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg,#0284c7,#0369a1)', color: 'white', border: 'none', borderRadius: '0.85rem', padding: '0.65rem 1.4rem', fontWeight: 900, fontSize: '0.84rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(2,132,199,0.3)' }}
          >
            <Printer size={18} /> Koçluk Dosyasını Yazdır / PDF
          </button>
        </div>
      </div>

      {/* PHYSICAL DOSSIER BINDER CONTAINER */}
      <div style={{
        background: '#fcfaf6',
        borderRadius: '1.5rem',
        border: '3px solid #cbd5e1',
        boxShadow: '0 20px 50px rgba(0,0,0,0.12), inset 0 0 100px rgba(0,0,0,0.02)',
        overflow: 'hidden',
        position: 'relative'
      }}>

        {/* BINDER DOSSIER TOP BAND */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '1.5rem 2rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '4px solid #f59e0b', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.5rem', boxShadow: '0 4px 16px rgba(245,158,11,0.4)', border: '2px solid white' }}>
              {student.name?.charAt(0) || 'Ö'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ background: '#f59e0b', color: '#0f172a', padding: '0.15rem 0.6rem', borderRadius: 4, fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>RESMİ KOÇLUK DOSYASI</span>
                <span style={{ color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 700 }}>Dosya No: KCK-{student.id?.slice(0,6)}</span>
              </div>
              <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>{student.name} · Öğrenci Rehberlik & Gelişim Portfolyosu</h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Sınıf Düzeyi</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: 'white' }}>{gradeName}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Öğrenme Stili</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#f59e0b' }}>{learningStyle}</div>
            </div>
          </div>
        </div>

        {/* FOLDER TABS NAVIGATION (Hidden on Print) */}
        <div className="no-print" style={{ display: 'flex', background: '#e2e8f0', padding: '0.5rem 1rem 0', gap: '0.4rem', overflowX: 'auto', borderBottom: '2px solid #cbd5e1' }}>
          {[
            { id: 'profile', label: '📁 1. Öğrenci Künyesi & Hedefler', icon: User },
            { id: 'analytics', label: '📊 2. Akademik Performans', icon: BarChart3 },
            { id: 'mock_exams', label: '📈 3. Deneme Net Takibi', icon: TrendingUp, badge: studentMockExams.length },
            { id: 'weaknesses', label: '⚠️ 4. Eksik Haritası & Ödev', icon: AlertTriangle, badge: weakTopics.length },
            { id: 'timetable', label: '📅 5. Çalışma Programı', icon: CalendarDays },
            { id: 'meetings', label: '📝 6. Görüşme Tutanakları', icon: Edit3, badge: studentMeetings.length },
            { id: 'notes', label: '🎯 7. Koçluk Notları', icon: MessageSquare }
          ].map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.1rem',
                border: '2px solid #cbd5e1', borderBottom: 'none', borderRadius: '0.85rem 0.85rem 0 0',
                background: active ? '#fcfaf6' : '#cbd5e1', color: active ? '#0f172a' : '#475569',
                fontWeight: active ? 900 : 700, fontSize: '0.82rem', cursor: 'pointer',
                marginBottom: active ? -2 : 0, zIndex: active ? 10 : 1, transition: 'all 0.15s', whiteSpace: 'nowrap'
              }}>
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span style={{ background: active ? '#4f46e5' : '#94a3b8', color: 'white', borderRadius: 99, padding: '0.1rem 0.45rem', fontSize: '0.65rem', fontWeight: 800 }}>{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* DOSSIER INNER SHEET CONTENT */}
        <div style={{ padding: '2rem', background: '#fcfaf6', minHeight: '600px' }}>

          {/* TAB 1: STUDENT PROFILE & IDENTITY */}
          {(activeTab === 'profile' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <User size={20} color="#4f46e5" /> Öğrenci Kimlik & Veli İletişim Formu
                </h3>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Hedeflenen Lise / Üniversite & Bölüm</label>
                      <input
                        type="text"
                        placeholder="Örn: Galatasaray Lisesi / İTÜ Bilgisayar Müh."
                        value={targetSchool}
                        onChange={e => setTargetSchool(e.target.value)}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Hedeflenen Toplam Net</label>
                      <input
                        type="number"
                        placeholder="Örn: 85 Net"
                        value={targetNet}
                        onChange={e => setTargetNet(e.target.value)}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Öğrenme Stili Tespiti</label>
                      <select value={learningStyle} onChange={e => setLearningStyle(e.target.value)} style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                        <option value="Görsel Öğrenen">👁️ Görsel Öğrenen (Şema/Grafik Destekli)</option>
                        <option value="İşitsel Öğrenen">🎧 İşitsel Öğrenen (Anlatım & Soru Tartışmalı)</option>
                        <option value="Kinestetik Öğrenen">✍️ Kinestetik (Yazarak & Uygulamalı)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Veli Adı Soyadı</label>
                      <input
                        type="text"
                        placeholder="Örn: Mehmet Yılmaz (Baba)"
                        value={parentName}
                        onChange={e => setParentName(e.target.value)}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Veli İletişim Telefonu</label>
                      <input
                        type="text"
                        placeholder="Örn: 0532 000 00 00"
                        value={parentPhone}
                        onChange={e => setParentPhone(e.target.value)}
                        style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Veli Görüşme & İletişim Notları</label>
                      <textarea
                        rows="3"
                        placeholder="Örn: Veli ile 2 haftada bir telefon görüşmesi yapılacak. Evde çalışma ortamı sağlandı..."
                        value={parentNotes}
                        onChange={e => setParentNotes(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Güçlü Yönleri & İlgi Alanları</label>
                      <textarea
                        rows="3"
                        placeholder="Örn: Problem çözme hızı yüksek. Resim ve Basketbol ile ilgileniyor..."
                        value={strengths}
                        onChange={e => setStrengths(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {isProfileSaved ? (
                      <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={18} /> Öğrenci Künye Bilgileri Kaydedildi!
                      </span>
                    ) : <span />}
                    <button type="submit" style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.75rem 1.75rem', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>
                      Künye Bilgilerini Güncelle
                    </button>
                  </div>
                </form>
              </div>

              {/* TARGET VS CURRENT NET GAP DASHBOARD */}
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#1d4ed8', textTransform: 'uppercase' }}>🎯 Hedeflenen Okul & Net</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e40af', marginTop: 4 }}>{targetSchool || 'Belirtilmedi'}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563eb', marginTop: 2 }}>{targetNet} Net Hedef</div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#166534', textTransform: 'uppercase' }}>📈 Son Deneme Neti</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#15803d', marginTop: 4 }}>{latestMockNet} Net</div>
                </div>

                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#c2410c', textTransform: 'uppercase' }}>⚡ Hedefe Kalan Net Farkı</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ea580c', marginTop: 4 }}>{netGap.toFixed(1)} Net</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANALYTICS */}
          {(activeTab === 'analytics' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '1.1rem', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Genel Doğruluk Oranı</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#15803d', marginTop: 4 }}>%{overallSuccessRate}</div>
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '1.1rem', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Çözülen Sınav Sayısı</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1d4ed8', marginTop: 4 }}>{studentSubs.length}</div>
                </div>
                <div style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: '1.1rem', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#86198f', textTransform: 'uppercase' }}>Girilen Deneme</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#701a75', marginTop: 4 }}>{studentMockExams.length}</div>
                </div>
              </div>

              {chartData.length > 0 && (
                <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={20} color="#4f46e5" /> Deneme Sınavları Toplam Net Gelişim Çizelgesi
                  </h3>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="ToplamNet" stroke="#4f46e5" strokeWidth={3} dot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Matematik" stroke="#3b82f6" strokeWidth={2} />
                        <Line type="monotone" dataKey="Türkçe" stroke="#f97316" strokeWidth={2} />
                        <Line type="monotone" dataKey="Fen" stroke="#10b981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={20} color="#4f46e5" /> Soru Bankası & Test Performansı
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
            </div>
          )}

          {/* TAB 3: MOCK EXAMS */}
          {(activeTab === 'mock_exams' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div className="no-print" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={20} color="#7c3aed" /> Yeni Deneme Sınavı & Net Girişi Yapın
                </h3>
                <form onSubmit={handleAddMockExam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <input
                      type="text"
                      placeholder="Deneme Adı (Örn: Özdebir LGS Deneme 2)"
                      value={examTitle}
                      onChange={e => setExamTitle(e.target.value)}
                      style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                      required
                    />
                    <input
                      type="date"
                      value={examDate}
                      onChange={e => setExamDate(e.target.value)}
                      style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                      required
                    />
                  </div>

                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginTop: 4 }}>Ders Bazlı Netler:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                    <input type="number" step="0.25" placeholder="Türkçe Net" value={netTurkce} onChange={e => setNetTurkce(e.target.value)} style={{ padding: '0.6rem 0.8rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontSize: '0.82rem' }} />
                    <input type="number" step="0.25" placeholder="Matematik Net" value={netMat} onChange={e => setNetMat(e.target.value)} style={{ padding: '0.6rem 0.8rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontSize: '0.82rem' }} />
                    <input type="number" step="0.25" placeholder="Fen Net" value={netFen} onChange={e => setNetFen(e.target.value)} style={{ padding: '0.6rem 0.8rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontSize: '0.82rem' }} />
                    <input type="number" step="0.25" placeholder="Sosyal Net" value={netSosyal} onChange={e => setNetSosyal(e.target.value)} style={{ padding: '0.6rem 0.8rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontSize: '0.82rem' }} />
                    <input type="number" step="0.25" placeholder="İngilizce Net" value={netIng} onChange={e => setNetIng(e.target.value)} style={{ padding: '0.6rem 0.8rem', borderRadius: '0.65rem', border: '1.5px solid #cbd5e1', fontSize: '0.82rem' }} />
                  </div>

                  <button type="submit" style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.7rem 1.5rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={18} /> Deneme Sonucunu Kaydet
                  </button>
                </form>
              </div>

              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Kayıtlı Deneme Sınavları ({studentMockExams.length})
                </h3>
                {studentMockExams.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Henüz eklenmiş deneme sınavı yok.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {studentMockExams.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: '#f8fafc', borderRadius: '0.9rem', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#0f172a' }}>{m.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{m.date}</div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 6, flexWrap: 'wrap' }}>
                            {Object.entries(m.scores || {}).map(([s, val]) => (
                              <span key={s} style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.15rem 0.5rem', borderRadius: 99, fontWeight: 700 }}>
                                {s}: {val} Net
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Toplam Net</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4f46e5' }}>{m.totalNet}</div>
                          </div>
                          <button className="no-print" onClick={() => deleteMockExam(m.id)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '0.45rem', borderRadius: '0.6rem', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: WEAKNESSES */}
          {(activeTab === 'weaknesses' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#fff7ed', border: '1.5px solid #ffedd5', borderRadius: '1.25rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <AlertTriangle size={28} color="#f97316" />
                <div>
                  <h4 style={{ margin: 0, color: '#c2410c', fontSize: '0.95rem', fontWeight: 800 }}>Otomatik Eksik Tespiti & Akıllı Ödevlendirme Motoru</h4>
                  <p style={{ margin: '0.2rem 0 0', color: '#9a3412', fontSize: '0.8rem' }}>Öğrencinin en çok yanlış yaptığı konular tespit edilmiştir. Tek tıkla çalışma görevi ve özel test ödevi atayabilirsiniz.</p>
                </div>
              </div>

              {weakTopics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: 'white', borderRadius: '1.25rem', border: '1.5px solid #e2e8f0' }}>
                  <CheckCircle2 size={48} color="#22c55e" style={{ margin: '0 auto 0.75rem' }} />
                  <h3 style={{ margin: 0, color: '#16a34a', fontWeight: 900 }}>Eksik Konu Bulunmuyor!</h3>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem' }}>Öğrenci tüm testlerde yüksek doğruluk oranına sahip.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.1rem' }}>
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
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{w.topic}</h4>
                      </div>

                      <button
                        className="no-print"
                        onClick={() => handleAutoAssignWeakness(w)}
                        style={{ marginTop: '1.25rem', background: 'linear-gradient(135deg,#dc2626,#ea580c)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.65rem 0.9rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <Zap size={15} /> Otomatik Ödev & Test Oluşturup Ata
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TIMETABLE MATRIX */}
          {(activeTab === 'timetable' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div className="no-print" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CalendarDays size={20} color="#4f46e5" /> Haftalık Çalışma Programına Yeni Saat Bloğu Ekle
                </h3>
                <form onSubmit={handleAddScheduleSlot} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <select value={slotDay} onChange={e => setSlotDay(e.target.value)} style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                    {DAYS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>

                  <select value={slotTime} onChange={e => setSlotTime(e.target.value)} style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

                  <select value={slotSubject} onChange={e => setSlotSubject(e.target.value)} style={{ padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                    <option value="Matematik">Matematik</option>
                    <option value="Fen Bilimleri">Fen Bilimleri</option>
                    <option value="Türkçe">Türkçe</option>
                    <option value="Sosyal Bilgiler">Sosyal Bilgiler</option>
                    <option value="İngilizce">İngilizce</option>
                    <option value="Genel Deneme">Genel Deneme</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Çalışma Açıklaması (Örn: 50 Problem Soru Çözümü)"
                    value={slotTitle}
                    onChange={e => setSlotTitle(e.target.value)}
                    style={{ flex: '1 1 220px', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    required
                  />

                  <button type="submit" style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.7rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={18} /> Programa Ekle
                  </button>
                </form>
              </div>

              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem', overflowX: 'auto' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Haftalık Görsel Çalışma Çizelgesi Matrisi
                </h3>

                <div style={{ minWidth: '700px', display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#64748b', padding: '0.5rem' }}>Saat</div>
                  {DAYS.map(d => (
                    <div key={d.id} style={{ fontWeight: 900, fontSize: '0.78rem', color: '#0f172a', background: '#f8fafc', padding: '0.5rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                      {d.label}
                    </div>
                  ))}

                  {TIME_SLOTS.map(t => (
                    <React.Fragment key={t}>
                      <div style={{ fontWeight: 800, fontSize: '0.72rem', color: '#64748b', padding: '0.5rem 0', display: 'flex', alignItems: 'center' }}>
                        {t}
                      </div>
                      {DAYS.map(d => {
                        const slots = studentSchedules.filter(s => s.day === d.id && s.time === t);
                        return (
                          <div key={`${d.id}_${t}`} style={{ background: slots.length > 0 ? '#f0f4ff' : '#fafafa', border: '1px solid #f1f5f9', borderRadius: '0.5rem', padding: '0.4rem', minHeight: '60px' }}>
                            {slots.map(slot => (
                              <div key={slot.id} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.4rem', padding: '0.35rem', fontSize: '0.68rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, position: 'relative' }}>
                                <div>{slot.title}</div>
                                <button className="no-print" onClick={() => deleteSchedule(slot.id)} style={{ position: 'absolute', top: 2, right: 2, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MEETINGS LOG */}
          {(activeTab === 'meetings' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div className="no-print" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit3 size={20} color="#7c3aed" /> Birebir Koçluk Görüşme Kaydı & Randevu Oluştur
                </h3>
                <form onSubmit={handleAddMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Görüşme Tarihi</label>
                      <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }} required />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Görüşme Konusu</label>
                      <input type="text" placeholder="Örn: Haftalık Net Değerlendirmesi & Ders Çalışma Disiplini" value={meetingTopic} onChange={e => setMeetingTopic(e.target.value)} style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} required />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Bir Sonraki Koçluk Randevusu</label>
                      <input type="date" value={nextAppointmentDate} onChange={e => setNextAppointmentDate(e.target.value)} style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Görüşme Notları & Alınan Kararlar</label>
                    <textarea rows="3" placeholder="Örn: Matematik soru çözümleri artırılacak. Cuma gününe kadar 2 deneme netleri kontrol edilecek..." value={meetingNotes} onChange={e => setMeetingNotes(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }} required />
                  </div>

                  <button type="submit" style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.7rem 1.5rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={18} /> Görüşme Kaydını İşle & Randevuyu Al
                  </button>
                </form>
              </div>

              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Görüşme Günlüğü & Geçmiş Mentorluk Notları ({studentMeetings.length})
                </h3>
                {studentMeetings.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Henüz kaydedilmiş koçluk görüşmesi yok.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {studentMeetings.map(m => (
                      <div key={m.id} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', background: '#eff6ff', padding: '0.2rem 0.65rem', borderRadius: 99 }}>
                            📅 {m.date}
                          </span>
                          {m.nextMeetingDate && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7e22ce', background: '#f3e8ff', padding: '0.2rem 0.65rem', borderRadius: 99 }}>
                              📌 Sonraki Randevu: {m.nextMeetingDate}
                            </span>
                          )}
                        </div>
                        <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>{m.topic}</h4>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>{m.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: COACHING NOTES & ADVICE */}
          {(activeTab === 'notes' || window.matchMedia('print').matches) && (
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

              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Haftalık Özel Koçluk Hedefleri ({noteGoals.length})
                </h3>
                <div className="no-print" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
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
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: '0.65rem 1rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => handleToggleGoal(g.id)}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid #6366f1', background: g.done ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                          {g.done && <Check size={14} />}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: g.done ? '#94a3b8' : '#0f172a', textDecoration: g.done ? 'line-through' : 'none' }}>{g.text}</span>
                      </div>
                      <button type="button" className="no-print" onClick={() => handleRemoveGoal(g.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
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

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          .no-print, nav, header, sidebar { display: none !important; }
          body, .coaching-dossier-page { background: white !important; padding: 0 !important; }
          .coaching-dossier-page > div { border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
