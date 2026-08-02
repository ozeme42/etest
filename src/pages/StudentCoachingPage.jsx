import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, AlertTriangle, BookOpen, Calendar,
  MessageSquare, Plus, CheckCircle2, Award, Clock,
  FileText, ArrowRight, Zap, Target, Send, ChevronRight, Check,
  User, Sparkles, TrendingUp, Trash2, CalendarDays, Edit3, UserCheck,
  Printer, Folder, Bookmark, Phone, Heart, Brain, GraduationCap,
  Building, Mail, ShieldAlert, Compass, HelpCircle, Activity, Flame,
  Sliders, PieChart, ListTodo, Save, Eye, Layers
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
    coachingProfiles,
    mockExams,
    addMockExam,
    deleteMockExam,
    getMockExamsForStudent,
    addCoachingMeeting,
    getMeetingsForStudent
  } = useCoaching();

  // Primary Dossier Tab State (Page 1: Info, Page 2: Intake, Page 3: Goals)
  const [activeTab, setActiveTab] = useState('info'); 

  // Find target student
  const student = users.find(u => String(u.id) === String(studentId));
  const teacherId = currentUser?.id || 'teacher_1';

  // Fetch existing profile data
  const existingProfile = useMemo(() => getCoachingProfileForStudent(studentId) || {}, [studentId, coachingProfiles]);

  // --- FORM STATES FOR DOSSIER PAGES ---
  // Page 1: Öğrenci Bilgi Formu
  const [schoolName, setSchoolName] = useState(existingProfile.schoolName || '');
  const [studentNumber, setStudentNumber] = useState(existingProfile.studentNumber || '');
  const [birthDate, setBirthDate] = useState(existingProfile.birthDate || '');
  const [parentName, setParentName] = useState(existingProfile.parentName || '');
  const [parentPhone, setParentPhone] = useState(existingProfile.parentPhone || '');
  const [parentNotes, setParentNotes] = useState(existingProfile.parentNotes || '');
  const [studentPhone, setStudentPhone] = useState(existingProfile.studentPhone || '');
  const [studentEmail, setStudentEmail] = useState(existingProfile.studentEmail || student?.email || '');
  const [targetSchool, setTargetSchool] = useState(existingProfile.targetSchool || '');
  const [strengths, setStrengths] = useState(existingProfile.strengths || '');
  const [areasToImprove, setAreasToImprove] = useState(existingProfile.areasToImprove || '');
  const [hobbies, setHobbies] = useState(existingProfile.hobbies || '');

  // Page 2: İlk Tanışma Analizi
  const [studentExpectations, setStudentExpectations] = useState(existingProfile.studentExpectations || '');
  const [familyExpectations, setFamilyExpectations] = useState(existingProfile.familyExpectations || '');
  const [motivationLevel, setMotivationLevel] = useState(existingProfile.motivationLevel || 'Yüksek (%85)');
  const [studyHabits, setStudyHabits] = useState(existingProfile.studyHabits || 'Düzenli & Masada Çalışma');
  const [timeManagement, setTimeManagement] = useState(existingProfile.timeManagement || 'Orta Düzey (Pomodoro İhtiyacı)');
  const [attentionSpan, setAttentionSpan] = useState(existingProfile.attentionSpan || '35-45 Dakika Odaklanma');
  const [anxietyLevel, setAnxietyLevel] = useState(existingProfile.anxietyLevel || 'Düşük / Kontrollü Sınav Kaygısı');
  const [learningStyle, setLearningStyle] = useState(existingProfile.learningStyle || 'Görsel Öğrenen');

  // SWOT Analizi
  const [swotStrengths, setSwotStrengths] = useState(existingProfile.swotStrengths || '');
  const [swotWeaknesses, setSwotWeaknesses] = useState(existingProfile.swotWeaknesses || '');
  const [swotOpportunities, setSwotOpportunities] = useState(existingProfile.swotOpportunities || '');
  const [swotThreats, setSwotThreats] = useState(existingProfile.swotThreats || '');

  // Page 3: Hedef Belirleme
  const [examGoalType, setExamGoalType] = useState(existingProfile.examGoalType || 'LGS 2026');
  const [targetDepartment, setTargetDepartment] = useState(existingProfile.targetDepartment || '');
  const [targetScore, setTargetScore] = useState(existingProfile.targetScore || '480');
  const [targetNet, setTargetNet] = useState(existingProfile.targetNet || '90');
  const [monthlyGoals, setMonthlyGoals] = useState(existingProfile.monthlyGoals || '');
  const [weeklyGoals, setWeeklyGoals] = useState(existingProfile.weeklyGoals || '');
  const [dailyGoals, setDailyGoals] = useState(existingProfile.dailyGoals || '');

  const [isProfileSaved, setIsProfileSaved] = useState(false);

  // Sync state if profile loads dynamically
  useEffect(() => {
    if (existingProfile) {
      if (existingProfile.schoolName) setSchoolName(existingProfile.schoolName);
      if (existingProfile.studentNumber) setStudentNumber(existingProfile.studentNumber);
      if (existingProfile.birthDate) setBirthDate(existingProfile.birthDate);
      if (existingProfile.parentName) setParentName(existingProfile.parentName);
      if (existingProfile.parentPhone) setParentPhone(existingProfile.parentPhone);
      if (existingProfile.parentNotes) setParentNotes(existingProfile.parentNotes);
      if (existingProfile.studentPhone) setStudentPhone(existingProfile.studentPhone);
      if (existingProfile.studentEmail) setStudentEmail(existingProfile.studentEmail);
      if (existingProfile.targetSchool) setTargetSchool(existingProfile.targetSchool);
      if (existingProfile.strengths) setStrengths(existingProfile.strengths);
      if (existingProfile.areasToImprove) setAreasToImprove(existingProfile.areasToImprove);
      if (existingProfile.hobbies) setHobbies(existingProfile.hobbies);

      if (existingProfile.studentExpectations) setStudentExpectations(existingProfile.studentExpectations);
      if (existingProfile.familyExpectations) setFamilyExpectations(existingProfile.familyExpectations);
      if (existingProfile.motivationLevel) setMotivationLevel(existingProfile.motivationLevel);
      if (existingProfile.studyHabits) setStudyHabits(existingProfile.studyHabits);
      if (existingProfile.timeManagement) setTimeManagement(existingProfile.timeManagement);
      if (existingProfile.attentionSpan) setAttentionSpan(existingProfile.attentionSpan);
      if (existingProfile.anxietyLevel) setAnxietyLevel(existingProfile.anxietyLevel);
      if (existingProfile.learningStyle) setLearningStyle(existingProfile.learningStyle);

      if (existingProfile.swotStrengths) setSwotStrengths(existingProfile.swotStrengths);
      if (existingProfile.swotWeaknesses) setSwotWeaknesses(existingProfile.swotWeaknesses);
      if (existingProfile.swotOpportunities) setSwotOpportunities(existingProfile.swotOpportunities);
      if (existingProfile.swotThreats) setSwotThreats(existingProfile.swotThreats);

      if (existingProfile.examGoalType) setExamGoalType(existingProfile.examGoalType);
      if (existingProfile.targetDepartment) setTargetDepartment(existingProfile.targetDepartment);
      if (existingProfile.targetScore) setTargetScore(existingProfile.targetScore);
      if (existingProfile.targetNet) setTargetNet(existingProfile.targetNet);
      if (existingProfile.monthlyGoals) setMonthlyGoals(existingProfile.monthlyGoals);
      if (existingProfile.weeklyGoals) setWeeklyGoals(existingProfile.weeklyGoals);
      if (existingProfile.dailyGoals) setDailyGoals(existingProfile.dailyGoals);
    }
  }, [existingProfile]);

  // --- OTHER FORM STATES ---
  // Study assignment form
  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [newDueDate, setNewDueDate] = useState('');

  // Coaching Note & Goals
  const existingNote = getCoachingNoteForStudent(studentId) || {};
  const [coachingNoteText, setCoachingNoteText] = useState(existingNote.note || '');
  const [weeklyFocusText, setWeeklyFocusText] = useState(existingNote.weeklyFocus || '');
  const [noteGoals, setNoteGoals] = useState(existingNote.goals || []);
  const [newGoalText, setNewGoalText] = useState('');

  // Mock Exam form
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [netTurkce, setNetTurkce] = useState('');
  const [netMat, setNetMat] = useState('');
  const [netFen, setNetFen] = useState('');
  const [netSosyal, setNetSosyal] = useState('');
  const [netIng, setNetIng] = useState('');

  // Meeting Form
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingTopic, setMeetingTopic] = useState('Genel Haftalık Değerlendirme');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [nextAppointmentDate, setNextAppointmentDate] = useState('');

  // Timetable slot Form
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
    if (e) e.preventDefault();
    await saveCoachingProfile({
      studentId: student.id,
      // Page 1
      schoolName,
      studentNumber,
      birthDate,
      parentName,
      parentPhone,
      parentNotes,
      studentPhone,
      studentEmail,
      targetSchool,
      strengths,
      areasToImprove,
      hobbies,

      // Page 2
      studentExpectations,
      familyExpectations,
      motivationLevel,
      studyHabits,
      timeManagement,
      attentionSpan,
      anxietyLevel,
      learningStyle,
      swotStrengths,
      swotWeaknesses,
      swotOpportunities,
      swotThreats,

      // Page 3
      examGoalType,
      targetDepartment,
      targetScore,
      targetNet: Number(targetNet) || 0,
      monthlyGoals,
      weeklyGoals,
      dailyGoals
    });
    setIsProfileSaved(true);
    setTimeout(() => setIsProfileSaved(false), 2500);
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
      studentId: student.id,
      teacherId,
      note: coachingNoteText,
      weeklyFocus: weeklyFocusText,
      goals: noteGoals
    });
    alert('Koçluk notu ve haftalık hedefler başarıyla kaydedildi!');
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
            <Printer size={18} /> Tüm Koçluk Dosyasını Yazdır / PDF
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
                <span style={{ background: '#f59e0b', color: '#0f172a', padding: '0.15rem 0.6rem', borderRadius: 4, fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>KAPSAMLI ÖĞRENCİ KOÇLUK DOSYASI</span>
                <span style={{ color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 700 }}>Dosya No: KCK-{student.id?.slice(0,6)}</span>
              </div>
              <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>{student.name} · Öğrenci Rehberlik & Gelişim Takip Dosyası</h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Sınıf Düzeyi</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: 'white' }}>{gradeName}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Hedef Sınav</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#38bdf8' }}>{examGoalType}</div>
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
            { id: 'info', label: '📄 1. Öğrenci Bilgi Formu', icon: UserCheck, color: '#2563eb' },
            { id: 'intake', label: '🧠 2. İlk Tanışma Analizi', icon: Brain, color: '#7c3aed' },
            { id: 'goals', label: '🎯 3. Hedef Belirleme', icon: Target, color: '#059669' },
            { id: 'analytics', label: '📊 4. Akademik Performans', icon: BarChart3, color: '#d97706' },
            { id: 'mock_exams', label: '📈 5. Deneme Net Takibi', icon: TrendingUp, badge: studentMockExams.length, color: '#0284c7' },
            { id: 'weaknesses', label: '⚠️ 6. Eksik Haritası & Ödev', icon: AlertTriangle, badge: weakTopics.length, color: '#dc2626' },
            { id: 'timetable', label: '📅 7. Çalışma Programı', icon: CalendarDays, color: '#4f46e5' },
            { id: 'meetings', label: '📝 8. Görüşme Tutanakları', icon: Edit3, badge: studentMeetings.length, color: '#0891b2' },
            { id: 'notes', label: '💬 9. Koçluk Notları', icon: MessageSquare, color: '#db2777' }
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

          {/* PAGE 1: ÖĞRENCİ BİLGİ FORMU */}
          {(activeTab === 'info' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UserCheck size={24} color="#2563eb" /> 1. Öğrenci Bilgi Formu & Künye Kaydı
                  </h3>
                  <span style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 1 / 3
                  </span>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Readonly identity banner */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', padding: '1.25rem', borderRadius: '1rem', border: '1.5px solid #bfdbfe' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Öğrenci Adı Soyadı</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{student.name}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sınıf / Düzey</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1d4ed8', marginTop: 2 }}>{gradeName}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sistem Rolü</span>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#3b82f6', marginTop: 2 }}>Öğrenci Kütük Kaydı</div>
                    </div>
                  </div>

                  {/* Personal identity fields */}
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#334155', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building size={18} color="#4f46e5" /> Okul ve Kişisel Bilgiler
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Okul Adı</label>
                        <input
                          type="text"
                          placeholder="Örn: Atatürk Ortaokulu / Fen Lisesi"
                          value={schoolName}
                          onChange={e => setSchoolName(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Öğrenci / Okul Numarası</label>
                        <input
                          type="text"
                          placeholder="Örn: 1042"
                          value={studentNumber}
                          onChange={e => setStudentNumber(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Doğum Tarihi</label>
                        <input
                          type="date"
                          value={birthDate}
                          onChange={e => setBirthDate(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: 'white' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Student contact details */}
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#334155', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={18} color="#059669" /> İletişim Bilgileri
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Öğrenci Telefon Numarası</label>
                        <input
                          type="text"
                          placeholder="Örn: 0555 111 22 33"
                          value={studentPhone}
                          onChange={e => setStudentPhone(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Öğrenci E-Posta Adresi</label>
                        <input
                          type="email"
                          placeholder="Örn: ogrenci@gmail.com"
                          value={studentEmail}
                          onChange={e => setStudentEmail(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: 'white' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Parent information */}
                  <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1.5px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#334155', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Heart size={18} color="#dc2626" /> Veli Bilgileri & İrtibat Notları
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Veli Adı Soyadı & Yakınlığı</label>
                        <input
                          type="text"
                          placeholder="Örn: Ayşe Yılmaz (Anne)"
                          value={parentName}
                          onChange={e => setParentName(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Veli İletişim Telefonu</label>
                        <input
                          type="text"
                          placeholder="Örn: 0532 000 00 00"
                          value={parentPhone}
                          onChange={e => setParentPhone(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: 'white' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Veli Görüşme & İşbirliği Notları</label>
                      <textarea
                        rows="3"
                        placeholder="Örn: Veli ile 2 haftada bir telefon görüşmesi yapılacak. Evde sessiz çalışma alanı sağlandı..."
                        value={parentNotes}
                        onChange={e => setParentNotes(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>
                  </div>

                  {/* Profile strengths, weaknesses & goals summary */}
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#334155', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Compass size={18} color="#7c3aed" /> Hedef Okul, Güçlü ve Geliştirilmesi Gereken Yönler
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Hedeflediği Okul / Bölüm</label>
                        <input
                          type="text"
                          placeholder="Örn: Galatasaray Lisesi / İTÜ Bilgisayar Müh."
                          value={targetSchool}
                          onChange={e => setTargetSchool(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>💪 Güçlü Yönleri</label>
                        <textarea
                          rows="3"
                          placeholder="Örn: Problem çözme hızı yüksek, fen bilimleri dersine meraklı, odaklanma kabiliyeti iyi..."
                          value={strengths}
                          onChange={e => setStrengths(e.target.value)}
                          style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #bbf7d0', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: '#f0fdf4' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b91c1c', display: 'block', marginBottom: 4 }}>🎯 Geliştirilmesi Gereken Yönleri</label>
                        <textarea
                          rows="3"
                          placeholder="Örn: Paragraf sorularında işlem hatası yapıyor, sınav zamanını son 10 dakikada yetiştirmekte zorlanıyor..."
                          value={areasToImprove}
                          onChange={e => setAreasToImprove(e.target.value)}
                          style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #fca5a5', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: '#fef2f2' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #f1f5f9' }}>
                    {isProfileSaved ? (
                      <span style={{ color: '#16a34a', fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={20} /> 1. Öğrenci Bilgi Formu Başarıyla Kaydedildi!
                      </span>
                    ) : <span />}
                    <button type="submit" style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.85rem 2rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Save size={18} /> Öğrenci Bilgi Formunu Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PAGE 2: İLK TANIŞMA ANALİZİ & SWOT */}
          {(activeTab === 'intake' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Brain size={24} color="#7c3aed" /> 2. İlk Tanışma Analizi, Çalışma Alışkanlıkları & SWOT
                  </h3>
                  <span style={{ background: '#f3e8ff', color: '#6b21a8', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 2 / 3
                  </span>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Expectations section */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '1rem', padding: '1.25rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <User size={18} color="#7c3aed" /> Öğrencinin Beklentileri
                      </label>
                      <textarea
                        rows="4"
                        placeholder="Örn: LGS'de %1'lik dilime girmek, Matematik dersindeki ön yargımı kırmak, düzenli koç takibi istiyorum..."
                        value={studentExpectations}
                        onChange={e => setStudentExpectations(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #d8b4fe', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>

                    <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '1rem', padding: '1.25rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#9a3412', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Heart size={18} color="#ea580c" /> Ailenin Beklentileri
                      </label>
                      <textarea
                        rows="4"
                        placeholder="Örn: Evde ders çalışırken masa başında kalmasını sağlamak, sınav kaygısını yönetmesine yardımcı olmak..."
                        value={familyExpectations}
                        onChange={e => setFamilyExpectations(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #fdba74', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>
                  </div>

                  {/* Behavioral & psychological assessment selectors */}
                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sliders size={18} color="#4f46e5" /> Çalışma Davranışları & Psikolojik Profil Tespitleri
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Motivasyon Düzeyi</label>
                        <select value={motivationLevel} onChange={e => setMotivationLevel(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                          <option value="Yüksek (%85+)">🚀 Yüksek (Aşırı İstekli & Kararlı)</option>
                          <option value="Orta Düzey (%60)">⚖️ Orta Düzey (Teşvikle Harekete Geçiyor)</option>
                          <option value="Düşük (%30)">⚠️ Düşük (Sürekli Dış Motivasyon İhtiyacı)</option>
                          <option value="Dalgalı / Değişken">🌊 Dalgalı (Netlere Göre Değişiyor)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Ders Çalışma Alışkanlığı</label>
                        <select value={studyHabits} onChange={e => setStudyHabits(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                          <option value="Düzenli & Masada Çalışma">📚 Düzenli & Masada Planlı Çalışma</option>
                          <option value="Düzensiz / Dağınık">🌪️ Düzensiz (Rastgele Konu Çözümü)</option>
                          <option value="Son Gün Çalışanı">⏳ Sınav Öncesi Odaklı Çalışma</option>
                          <option value="Yalnızca Ödev Takibiyle">🛡️ Sadece Verilen Ödev Kadar</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Zaman Yönetimi Becerisi</label>
                        <select value={timeManagement} onChange={e => setTimeManagement(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                          <option value="Çok İyi ⏱️">⏱️ Çok İyi (Süreye Tam Uyuyor)</option>
                          <option value="Orta Düzey ⏳">⏳ Orta (Pomodoro & Kronometre İhtiyacı)</option>
                          <option value="Zayıf / Erteleme Eğilimli 🛑">🛑 Zayıf (Ders Süresini Yetiştiremiyor)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Dikkat & Odaklanma Süresi</label>
                        <select value={attentionSpan} onChange={e => setAttentionSpan(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                          <option value="50+ Dakika (Uzun Odak) 🎯">🎯 50+ Dakika (Uzun Soluklu Odak)</option>
                          <option value="35-45 Dakika (Standart) ⌛">⌛ 35-45 Dakika (Standart Blok)</option>
                          <option value="15-20 Dakika (Çabuk Dağılır) ⚡">⚡ 15-20 Dakika (Çabuk Çeldirilir)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Sınav Kaygı Düzeyi</label>
                        <select value={anxietyLevel} onChange={e => setAnxietyLevel(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                          <option value="Düşük / Kontrollü 🟢">🟢 Düşük / Kontrollü Sınav Kaygısı</option>
                          <option value="Orta (Zaman Baskılı) 🟡">🟡 Orta Düzey (Zaman Baskısında Heyecan)</option>
                          <option value="Yüksek / Sınav Stresi 🔴">🔴 Yüksek Kaygı (Sınav Anında Panik)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>Dominant Öğrenme Stili</label>
                        <select value={learningStyle} onChange={e => setLearningStyle(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                          <option value="Görsel Öğrenen">👁️ Görsel (Şema, Harita & Renkli Notlar)</option>
                          <option value="İşitsel Öğrenen">🎧 İşitsel (Anlatım, Soru Tartışması)</option>
                          <option value="Kinestetik Öğrenen">✍️ Kinestetik (Yazarak & Uygulamalı)</option>
                          <option value="Karma Öğrenen">🔄 Karma (Görsel & İşitsel Dengeli)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SWOT MATRIX GRID */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={20} color="#7c3aed" /> SWOT Analiz Matrisi (Güçlü, Zayıf Yönler, Fırsat ve Tehditler)
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                      {/* S: STRENGTHS */}
                      <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '1rem', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#15803d' }}>🟢 GÜÇLÜ YÖNLER (Strengths)</span>
                          <span style={{ background: '#22c55e', color: 'white', fontWeight: 900, fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 4 }}>S</span>
                        </div>
                        <textarea
                          rows="4"
                          placeholder="Örn: Analitik düşünme gücü, pes etmeyen yapısı, Fen bilgisi netlerinin yüksekliği..."
                          value={swotStrengths}
                          onChange={e => setSwotStrengths(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid #86efac', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                        />
                      </div>

                      {/* W: WEAKNESSES */}
                      <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '1rem', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#b91c1c' }}>🔴 ZAYIF YÖNLER (Weaknesses)</span>
                          <span style={{ background: '#ef4444', color: 'white', fontWeight: 900, fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 4 }}>W</span>
                        </div>
                        <textarea
                          rows="4"
                          placeholder="Örn: Matematikte işlem hatası yapma, uzun paragraf sorularında çabuk sıkılma..."
                          value={swotWeaknesses}
                          onChange={e => setSwotWeaknesses(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid #fca5a5', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                        />
                      </div>

                      {/* O: OPPORTUNITIES */}
                      <div style={{ background: '#fefce8', border: '2px solid #fef08a', borderRadius: '1rem', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#a16207' }}>🟡 FIRSATLAR (Opportunities)</span>
                          <span style={{ background: '#eab308', color: 'white', fontWeight: 900, fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 4 }}>O</span>
                        </div>
                        <textarea
                          rows="4"
                          placeholder="Örn: İlgili ve destekleyici aile ortamı, özel koçluk takibi, geniş online test kütüphanesi..."
                          value={swotOpportunities}
                          onChange={e => setSwotOpportunities(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid #fde047', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                        />
                      </div>

                      {/* T: THREATS */}
                      <div style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '1rem', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1d4ed8' }}>🔵 TEHDİTLER (Threats)</span>
                          <span style={{ background: '#3b82f6', color: 'white', fontWeight: 900, fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 4 }}>T</span>
                        </div>
                        <textarea
                          rows="4"
                          placeholder="Örn: Telefon ve oyun alışkanlığı, yetersiz uyku düzeni, okul ödevlerinin çakışması..."
                          value={swotThreats}
                          onChange={e => setSwotThreats(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid #93c5fd', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #f1f5f9' }}>
                    {isProfileSaved ? (
                      <span style={{ color: '#16a34a', fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={20} /> İlk Tanışma & SWOT Analizi Başarıyla Kaydedildi!
                      </span>
                    ) : <span />}
                    <button type="submit" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.85rem 2rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Save size={18} /> Tanışma Analizini Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PAGE 3: HEDEF BELİRLEME */}
          {(activeTab === 'goals' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Target size={24} color="#059669" /> 3. Hedef Belirleme (Uzun, Orta & Kısa Vadeli Hedefler)
                  </h3>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 3 / 3
                  </span>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* UZUN VADELİ HEDEFLER */}
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '1.25rem', padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 900, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <GraduationCap size={20} color="#059669" /> 🏛️ Uzun Vadeli Hedefler (Sınav, Okul, Puan & Net)
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>Hedef Sınav Türü</label>
                        <select value={examGoalType} onChange={e => setExamGoalType(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #86efac', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                          <option value="LGS 2026">🎓 LGS (Liselere Geçiş Sınavı)</option>
                          <option value="YKS (TYT/AYT) 2026">🏛️ YKS (TYT & AYT Sınavı)</option>
                          <option value="Ara Sınıf Başarı">📊 Ara Sınıf Takip & Takdir Hedefi</option>
                          <option value="Bursluluk Sınavı">🏆 İOKBS Bursluluk Sınavı</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>İstenen Okul & Bölüm</label>
                        <input
                          type="text"
                          placeholder="Örn: Kabataş Erkek Lisesi / Boğaziçi Müh."
                          value={targetSchool}
                          onChange={e => setTargetSchool(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #86efac', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>Puan Hedefi</label>
                        <input
                          type="text"
                          placeholder="Örn: 485 Puan"
                          value={targetScore}
                          onChange={e => setTargetScore(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #86efac', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>Net Hedefi (Toplam Net)</label>
                        <input
                          type="number"
                          placeholder="Örn: 90 Net"
                          value={targetNet}
                          onChange={e => setTargetNet(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #86efac', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                        />
                      </div>
                    </div>

                    {/* LIVE CALCULATED TARGET vs CURRENT GAP DASHBOARD */}
                    <div style={{ background: 'white', border: '1.5px solid #a7f3d0', borderRadius: '1rem', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase' }}>🎯 Hedeflenen Net</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a', marginTop: 2 }}>{targetNet} Net</div>
                      </div>

                      <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #bfdbfe' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#1e40af', textTransform: 'uppercase' }}>📈 Son Deneme Neti</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2563eb', marginTop: 2 }}>{latestMockNet} Net</div>
                      </div>

                      <div style={{ background: '#fff7ed', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #fed7aa' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#c2410c', textTransform: 'uppercase' }}>⚡ Kalan Net Farkı</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ea580c', marginTop: 2 }}>{netGap.toFixed(1)} Net</div>
                      </div>
                    </div>
                  </div>

                  {/* ORTA VADELİ HEDEFLER (AYLIK) */}
                  <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '1.25rem', padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', fontWeight: 900, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={20} color="#2563eb" /> 📅 Orta Vadeli Hedefler (Aylık Aşama & Konu Hedefleri)
                    </h4>
                    <textarea
                      rows="3"
                      placeholder="Örn:&#10;• 1. Ay: Matematik Çarpanlar ve Katlar konusunu tamamla (500 Soru).&#10;• 2. Ay: Türkçe Paragraf çözüm süresini 25 dakikaya düşür.&#10;• 3. Ay: Genel deneme netlerini 80 üzerine çıkar..."
                      value={monthlyGoals}
                      onChange={e => setMonthlyGoals(e.target.value)}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #93c5fd', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                    />
                  </div>

                  {/* KISA VADELİ HEDEFLER (HAFTALIK & GÜNLÜK) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div style={{ background: '#fefce8', border: '1.5px solid #fef08a', borderRadius: '1.25rem', padding: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', fontWeight: 900, color: '#a16207', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ListTodo size={20} color="#d97706" /> ⚡ Kısa Vadeli Haftalık Hedefler
                      </h4>
                      <textarea
                        rows="4"
                        placeholder="Örn:&#10;• Haftalık 400 soru çözmek&#10;• 2 Adet Genel Deneme analizi yapmak&#10;• Fen Bilimleri eksik ödevlerini bitirmek..."
                        value={weeklyGoals}
                        onChange={e => setWeeklyGoals(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #fde047', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>

                    <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '1.25rem', padding: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', fontWeight: 900, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Flame size={20} color="#7c3aed" /> 🔥 Günlük Çalışma Rutini & Soru Hedefleri
                      </h4>
                      <textarea
                        rows="4"
                        placeholder="Örn:&#10;• Günlük 20 Paragraf sorusu&#10;• Günlük 20 Yeni Nesil Problem&#10;• 30 Dakika Kitap okuma & Not çıkarma..."
                        value={dailyGoals}
                        onChange={e => setDailyGoals(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #d8b4fe', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>
                  </div>

                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #f1f5f9' }}>
                    {isProfileSaved ? (
                      <span style={{ color: '#16a34a', fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={20} /> Hedef Belirleme Formu Başarıyla Kaydedildi!
                      </span>
                    ) : <span />}
                    <button type="submit" style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.85rem 2rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Save size={18} /> Akademik Hedefleri Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PAGE 4: AKADEMİK PERFORMANS */}
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

          {/* PAGE 5: DENEME NET TAKİBİ */}
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

          {/* PAGE 6: EKSİK HARİTASI */}
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

          {/* PAGE 7: ÇALIŞMA PROGRAMI */}
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

          {/* PAGE 8: GÖRÜŞME TUTANAKLARI */}
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

          {/* PAGE 9: KOÇLUK NOTLARI */}
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
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
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

              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.85rem 2rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Save size={18} /> Koçluk Notlarını ve Odak Noktasını Kaydet
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, .coaching-dossier-page { background: white !important; padding: 0 !important; }
          .coaching-dossier-page > div { border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
