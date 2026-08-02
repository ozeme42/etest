import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, AlertTriangle, BookOpen, Calendar,
  MessageSquare, Plus, CheckCircle2, Award, Clock,
  FileText, ArrowRight, Zap, Target, Send, ChevronRight, Check,
  User, Sparkles, TrendingUp, Trash2, CalendarDays, Edit3, UserCheck,
  Printer, Folder, Bookmark, Phone, Heart, Brain, GraduationCap,
  Building, Mail, ShieldAlert, Compass, HelpCircle, Activity, Flame,
  Sliders, PieChart, ListTodo, Save, Eye, Layers, BookMarked, Monitor,
  Dumbbell, Moon, CheckSquare, Square, Filter, Gift, Smile, Users, BookOpenCheck,
  CheckCircle, Repeat, CheckLine, AlertCircle, X, RefreshCw
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
import { useGoal } from '../context/GoalContext';

const DAYS = [
  { id: 'Pazartesi', label: 'Pazartesi' },
  { id: 'Salı', label: 'Salı' },
  { id: 'Çarşamba', label: 'Çarşamba' },
  { id: 'Perşembe', label: 'Perşembe' },
  { id: 'Cuma', label: 'Cuma' },
  { id: 'Cumartesi', label: 'Cumartesi' },
  { id: 'Pazar', label: 'Pazar' },
];

const WEEK_SHORT_DAYS = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
const SUBJECT_NAMES = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'];

/* Helper to parse goal list into checkable items */
const parseCheckableGoalList = (val, defaultItems = []) => {
  if (Array.isArray(val) && val.length > 0) return val;
  if (typeof val === 'string' && val.trim()) {
    return val.split('\n').filter(Boolean).map((line, i) => ({
      id: `chk_${i}_${Date.now()}`,
      text: line.replace(/^[•\-\*\d\.\s]+/, '').trim(),
      done: false
    }));
  }
  return defaultItems;
};

const DEFAULT_SUBJECT_ANALYSIS = {
  'Türkçe': {
    topics: 'Paragraf Taktikleri, Sözel Mantık, Cümlede Anlam, Yazım Kuralları',
    weaknesses: 'Sözel mantık sorularında süre kaybı ve paragrafta çabuk sıkılma',
    mockNet: '18.5',
    errorType: 'Dikkat / Okuma Hatası',
    reviewDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    notes: 'Haftada en az 30 paragraf sorusu zaman tutularak çözülecek.'
  },
  'Matematik': {
    topics: 'Çarpanlar ve Katlar, Üslü İfadeler, Kareköklü İfadeler, Veri Analizi',
    weaknesses: 'EBOB-EKOK yeni nesil problem kalıpları',
    mockNet: '15.5',
    errorType: 'İşlem Hatası & Bilgi Eksikliği',
    reviewDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    notes: 'Günde 20 adet yeni nesil soru ve yanlış analiz kartı hazırlanacak.'
  },
  'Fen Bilimleri': {
    topics: 'Mevsimler ve İklim, DNA ve Genetik Kod, Basınç',
    weaknesses: 'Çaprazlama ve kalıtım olasılık soruları',
    mockNet: '19.0',
    errorType: 'Bilgi Eksikliği',
    reviewDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    notes: 'Konu özet şeması ve biyoloji terim kartları gözden geçirilecek.'
  },
  'Sosyal Bilgiler': {
    topics: 'Bir Kahraman Doğuyor, Milli Uyanış, Ya İstiklal Ya Ölüm',
    weaknesses: 'İnkılap Tarihi kavram soruları (Misak-ı Milli, Amasya Genelgesi)',
    mockNet: '9.5',
    errorType: 'Süre Yönetimi',
    reviewDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    notes: 'Kavram haritası çıkarılacak.'
  },
  'İngilizce': {
    topics: 'Friendship, Teen Life, In The Kitchen',
    weaknesses: 'Kelime bilgisi ve synonym (eş anlamlı) eşleştirmeleri',
    mockNet: '9.0',
    errorType: 'Bilgi Eksikliği',
    reviewDate: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
    notes: 'Günlük 15 İngilizce kelime kartı hazırlanıp tekrar edilecek.'
  }
};

const DEFAULT_WEEKLY_PROGRAM = [
  { id: 'w1', day: 'Pazartesi', subject: 'Türkçe', time: '18:00 - 19:30', content: 'Paragraf Taktikleri (30 Soru) + Konu Tekrarı', completed: true },
  { id: 'w2', day: 'Pazartesi', subject: 'Matematik', time: '20:00 - 21:30', content: 'Çarpanlar ve Katlar Yeni Nesil (40 Soru)', completed: false },
  { id: 'w3', day: 'Salı', subject: 'Fen Bilimleri', time: '18:00 - 19:30', content: 'Mevsimler ve İklim Deneme Sınavı', completed: true },
  { id: 'w4', day: 'Çarşamba', subject: 'Matematik', time: '19:00 - 20:30', content: 'EBOB-EKOK Özel Problem Çözümleri', completed: false },
  { id: 'w5', day: 'Perşembe', subject: 'Sosyal Bilgiler', time: '18:00 - 19:00', content: 'Milli Uyanış Kavram Kartları Tekrarı', completed: true },
  { id: 'w6', day: 'Cuma', subject: 'İngilizce', time: '19:00 - 20:00', content: 'Friendship Kelime Testi (20 Soru)', completed: false },
  { id: 'w7', day: 'Cumartesi', subject: 'Genel Deneme', time: '10:00 - 13:00', content: 'Kapsamlı LGS/YKS Deneme Sınavı 1', completed: false },
];

const DEFAULT_DAILY_LOGS = [
  {
    id: 'dl1',
    date: new Date().toISOString().split('T')[0],
    durationMinutes: 210,
    questionCount: 160,
    reviewSummary: 'Matematik Çarpanlar & Fen Mevsimler Konu Tekrarı Yapıldı ✅',
    videoSummary: 'YouTube Paragraf Çözüm Taktikleri (2 Video)',
    bookReading: '40 Sayfa (Kitap Okundu)',
    sportActivity: '30 dk Yürüyüş & Egzersiz',
    sleepSchedule: '23:00 - 07:00 (8 Saat Verimli Uyku)'
  }
];

const DEFAULT_MOCK_EXAM_LOGS = [
  { id: 'ml1', date: new Date().toISOString().split('T')[0], title: 'Özdebir LGS Genel Deneme 1', turkce: 18.75, mat: 16.5, fen: 19.0, sosyal: 10.0, totalNet: 64.25, errorReason: 'İşlem Hatası & Süre Yönetimi' },
  { id: 'ml2', date: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0], title: 'Kurumsal Tarama Denemesi 2', turkce: 17.5, mat: 14.0, fen: 18.0, sosyal: 9.0, totalNet: 58.5, errorReason: 'Dikkat Hatası & Bilgi Eksikliği' }
];

const DEFAULT_TOPIC_CHECKLIST = {
  'Matematik': [
    { id: 'tm1', name: 'Çarpanlar ve Katlar', started: true, learned: true, solved: true, reviewed: true, completed: true },
    { id: 'tm2', name: 'Üslü İfadeler', started: true, learned: true, solved: true, reviewed: false, completed: false },
    { id: 'tm3', name: 'Kareköklü İfadeler', started: true, learned: true, solved: false, reviewed: false, completed: false },
    { id: 'tm4', name: 'Veri Analizi', started: true, learned: false, solved: false, reviewed: false, completed: false }
  ],
  'Türkçe': [
    { id: 'tt1', name: 'Fiilimsiler (Eylemsiler)', started: true, learned: true, solved: true, reviewed: true, completed: true },
    { id: 'tt2', name: 'Sözcükte Anlam', started: true, learned: true, solved: true, reviewed: true, completed: true }
  ]
};

const DEFAULT_QUESTION_LOGS = [
  { id: 'ql1', date: new Date().toISOString().split('T')[0], targetCount: 150, solvedCount: 140, hardestSubject: 'Matematik', notes: 'Yeni nesil EBOB sorularında 10 soru eksik kaldı.' }
];

const DEFAULT_ERROR_LOGS = [
  { id: 'el1', topic: 'Matematik - Çarpanlar ve Katlar', whyWrong: 'EBOB-EKOK problemi sorusunda en az yerine en fazla okudum.', correctSolution: 'Soru en küçük ortak kat istediği için EKOK(15,20)=60 alındı.', reviewDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] }
];

const DEFAULT_COACH_MEETINGS = [
  { id: 'cm1', date: new Date().toISOString().split('T')[0], duration: '45 dk', weeklyEvaluation: 'Bu hafta ders çalışma disiplini yüksekti.', strengths: 'Zamanı verimli kullanması.', areasToImprove: 'Fen bilimleri kalıtım çaprazlama.', nextWeekGoals: 'Haftada 400 soru + 2 Adet Branş Denemesi.' }
];

const DEFAULT_PARENT_MEETINGS = [
  { id: 'pm1', date: new Date().toISOString().split('T')[0], topics: 'Evde çalışma ortamı, telefon kullanımı', parentFeedback: 'Veli, akşam 20:00-22:00 arası sessiz ortam sağlandığını belirtti.', decisions: 'Telefon salon dolabına bırakılacak.' }
];

const DEFAULT_HABITS = [
  { id: 'h1', title: 'Erken Kalktım (07:00) 🌅', days: { Pzt: true, Sal: true, Çrş: true, Prş: false, Cum: true, Cts: false, Paz: false } },
  { id: 'h2', title: 'Plan Yaptım & Masada Çalıştım 📋', days: { Pzt: true, Sal: true, Çrş: true, Prş: true, Cum: true, Cts: true, Paz: false } },
  { id: 'h3', title: 'Kitap Okudum (En az 30 dk) 📖', days: { Pzt: true, Sal: false, Çrş: true, Prş: true, Cum: false, Cts: true, Paz: true } }
];

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
    getMockExamsForStudent,
    getMeetingsForStudent
  } = useCoaching();

  const { goals, addGoal, updateGoalProgress, deleteGoal } = useGoal();

  const [activeTab, setActiveTab] = useState('info'); 

  const student = users.find(u => String(u.id) === String(studentId));
  const teacherId = currentUser?.id || 'teacher_1';

  const studentGoals = useMemo(() => {
    if (!student) return [];
    return goals.filter(g => String(g.studentId) === String(student.id));
  }, [goals, student]);

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalType, setNewGoalType] = useState('Soru');
  const [newGoalPeriod, setNewGoalPeriod] = useState('Günlük');
  const [newGoalTarget, setNewGoalTarget] = useState('100');

  const existingProfile = useMemo(() => getCoachingProfileForStudent(studentId) || {}, [studentId, coachingProfiles]);

  // Page 1
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

  // Page 2
  const [studentExpectations, setStudentExpectations] = useState(existingProfile.studentExpectations || '');
  const [familyExpectations, setFamilyExpectations] = useState(existingProfile.familyExpectations || '');
  const [motivationLevel, setMotivationLevel] = useState(existingProfile.motivationLevel || 'Yüksek (%85)');
  const [studyHabits, setStudyHabits] = useState(existingProfile.studyHabits || 'Düzenli & Masada Çalışma');
  const [timeManagement, setTimeManagement] = useState(existingProfile.timeManagement || 'Orta Düzey');
  const [attentionSpan, setAttentionSpan] = useState(existingProfile.attentionSpan || '35-45 Dakika Odaklanma');
  const [anxietyLevel, setAnxietyLevel] = useState(existingProfile.anxietyLevel || 'Düşük / Kontrollü Kaygı');
  const [learningStyle, setLearningStyle] = useState(existingProfile.learningStyle || 'Görsel Öğrenen');

  const [swotStrengths, setSwotStrengths] = useState(existingProfile.swotStrengths || '');
  const [swotWeaknesses, setSwotWeaknesses] = useState(existingProfile.swotWeaknesses || '');
  const [swotOpportunities, setSwotOpportunities] = useState(existingProfile.swotOpportunities || '');
  const [swotThreats, setSwotThreats] = useState(existingProfile.swotThreats || '');

  // Page 3: Hedef Belirleme & Checkable Lists
  const [examGoalType, setExamGoalType] = useState(existingProfile.examGoalType || 'LGS 2026');
  const [targetDepartment, setTargetDepartment] = useState(existingProfile.targetDepartment || '');
  const [targetScore, setTargetScore] = useState(existingProfile.targetScore || '485');
  const [targetNet, setTargetNet] = useState(existingProfile.targetNet || '90');

  const [monthlyItems, setMonthlyItems] = useState(() => parseCheckableGoalList(existingProfile.monthlyGoals, [
    { id: 'm1', text: 'Matematik Çarpanlar ve EKOK problemleri tamamlanacak', done: false },
    { id: 'm2', text: 'Türkçe Paragraf taktikleri ve 400 soru çözümü', done: true }
  ]));

  const [weeklyItems, setWeeklyItems] = useState(() => parseCheckableGoalList(existingProfile.weeklyGoals, [
    { id: 'w1', text: 'Haftada 400 soru + 2 deneme çözümü', done: true },
    { id: 'w2', text: 'Matematik yeni nesil problem kartları tekrarı', done: false }
  ]));

  const [dailyItems, setDailyItems] = useState(() => parseCheckableGoalList(existingProfile.dailyGoals, [
    { id: 'd1', text: 'Günlük 20 Paragraf sorusu (zaman tutularak)', done: true },
    { id: 'd2', text: 'Günlük 20 Matematik yeni nesil problem', done: false }
  ]));

  const [newMonthlyText, setNewMonthlyText] = useState('');
  const [newWeeklyText, setNewWeeklyText] = useState('');
  const [newDailyText, setNewDailyText] = useState('');

  // Page 4: Ders Analizi
  const [subjectAnalyses, setSubjectAnalyses] = useState(existingProfile.subjectAnalyses || DEFAULT_SUBJECT_ANALYSIS);
  const [activeSubjectTab, setActiveSubjectTab] = useState('Türkçe');

  // Page 5: Haftalık Program
  const [weeklyProgram, setWeeklyProgram] = useState(existingProfile.weeklyProgram || DEFAULT_WEEKLY_PROGRAM);

  // Page 6: Günlük Takip
  const [dailyLogs, setDailyLogs] = useState(existingProfile.dailyLogs || DEFAULT_DAILY_LOGS);

  // Page 7: Deneme Takibi
  const [mockExamLogs, setMockExamLogs] = useState(existingProfile.mockExamLogs || DEFAULT_MOCK_EXAM_LOGS);

  // Page 8: Konu Çizelgesi
  const [topicChecklist, setTopicChecklist] = useState(existingProfile.topicChecklist || DEFAULT_TOPIC_CHECKLIST);
  const [activeChecklistSubject, setActiveChecklistSubject] = useState('Matematik');

  // Page 9: Soru Takip Formu
  const [questionTrackerLogs, setQuestionTrackerLogs] = useState(existingProfile.questionTrackerLogs || DEFAULT_QUESTION_LOGS);

  // Page 10: Hata Defteri
  const [errorNotebookLogs, setErrorNotebookLogs] = useState(existingProfile.errorNotebookLogs || DEFAULT_ERROR_LOGS);

  // Page 11: Koç Görüşme
  const [coachMeetingLogs, setCoachMeetingLogs] = useState(existingProfile.coachMeetingLogs || DEFAULT_COACH_MEETINGS);

  // Page 12: Veli Görüşme
  const [parentMeetingLogs, setParentMeetingLogs] = useState(existingProfile.parentMeetingLogs || DEFAULT_PARENT_MEETINGS);

  // Page 13: Motivasyon
  const [quoteOfWeek, setQuoteOfWeek] = useState(existingProfile.quoteOfWeek || 'Başarı, her gün tekrarlanan küçük çabaların toplamıdır.');
  const [myAchievements, setMyAchievements] = useState(existingProfile.myAchievements || '• Matematik deneme netimi 16 üzerine çıkardım.');
  const [noteToSelf, setNoteToSelf] = useState(existingProfile.noteToSelf || 'Zorlandığım anlarda pes etmek yerine mola verip yeniden odaklanacağım.');
  const [rewardSystem, setRewardSystem] = useState(existingProfile.rewardSystem || 'Haftalık 500 soru çözdüğümde Pazar günü film izleyeceğim 🎬');

  // Page 14: Alışkanlık
  const [habitTracker, setHabitTracker] = useState(existingProfile.habitTracker || DEFAULT_HABITS);

  // Page 15: Aylık Değerlendirme
  const [monthWhatILearned, setMonthWhatILearned] = useState(existingProfile.monthWhatILearned || '• Matematik Çarpanlar ve EKOK problemleri kavrandı.');
  const [monthBiggestSuccess, setMonthBiggestSuccess] = useState(existingProfile.monthBiggestSuccess || 'Genel deneme netimi 64.25 üzerine çıkardım.');
  const [monthBiggestMistake, setMonthBiggestMistake] = useState(existingProfile.monthBiggestMistake || 'Hafta içi geç uyanmak.');
  const [monthNextGoal, setMonthNextGoal] = useState(existingProfile.monthNextGoal || 'Gelecek ay Matematik netini 18 üzerine çıkarmak.');
  const [monthNetStart, setMonthNetStart] = useState(existingProfile.monthNetStart || '52.0');
  const [monthNetEnd, setMonthNetEnd] = useState(existingProfile.monthNetEnd || '64.25');

  // Page 16: Koç Notları
  const [coachObservations, setCoachObservations] = useState(existingProfile.coachObservations || '• Odaklanma süresi arttı.');
  const [coachPsychState, setCoachPsychState] = useState(existingProfile.coachPsychState || 'Dengeli ve istekli.');
  const [coachMotivationChange, setCoachMotivationChange] = useState(existingProfile.coachMotivationChange || 'Yükselişte (%85).');
  const [coachParentMeetingsSummary, setCoachParentMeetingsSummary] = useState(existingProfile.coachParentMeetingsSummary || 'Veli ile düzenli görüşüldü.');
  const [coachRecommendations, setCoachRecommendations] = useState(existingProfile.coachRecommendations || '1. Günlük 20 Paragraf çözülecek.');

  const [isProfileSaved, setIsProfileSaved] = useState(false);

  useEffect(() => {
    if (existingProfile) {
      if (existingProfile.schoolName) setSchoolName(existingProfile.schoolName);
      if (existingProfile.studentNumber) setStudentNumber(existingProfile.studentNumber);
      if (existingProfile.birthDate) setBirthDate(existingProfile.birthDate);
      if (existingProfile.parentName) setParentName(existingProfile.parentName);
      if (existingProfile.parentPhone) setParentPhone(existingProfile.parentPhone);

      if (existingProfile.examGoalType) setExamGoalType(existingProfile.examGoalType);
      if (existingProfile.targetSchool) setTargetSchool(existingProfile.targetSchool);
      if (existingProfile.targetScore) setTargetScore(existingProfile.targetScore);
      if (existingProfile.targetNet) setTargetNet(existingProfile.targetNet);

      setMonthlyItems(parseCheckableGoalList(existingProfile.monthlyGoals, [
        { id: 'm1', text: 'Matematik Çarpanlar ve EKOK problemleri tamamlanacak', done: false },
        { id: 'm2', text: 'Türkçe Paragraf taktikleri ve 400 soru çözümü', done: true }
      ]));
      setWeeklyItems(parseCheckableGoalList(existingProfile.weeklyGoals, [
        { id: 'w1', text: 'Haftada 400 soru + 2 deneme çözümü', done: true },
        { id: 'w2', text: 'Matematik yeni nesil problem kartları tekrarı', done: false }
      ]));
      setDailyItems(parseCheckableGoalList(existingProfile.dailyGoals, [
        { id: 'd1', text: 'Günlük 20 Paragraf sorusu (zaman tutularak)', done: true },
        { id: 'd2', text: 'Günlük 20 Matematik yeni nesil problem', done: false }
      ]));
    }
  }, [existingProfile]);

  if (!student) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Öğrenci Bulunamadı</h2>
        <button onClick={() => navigate('/teacher')} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.65rem', fontWeight: 800, cursor: 'pointer', marginTop: '1rem' }}>
          Öğretmen Paneline Dön
        </button>
      </div>
    );
  }

  const latestMockNet = mockExamLogs.length > 0 ? mockExamLogs[0].totalNet : 0;
  const netGap = Math.max(0, Number(targetNet) - latestMockNet);

  const saveAllWithLists = async (mList, wList, dList) => {
    await saveCoachingProfile({
      studentId: student.id,
      schoolName, studentNumber, birthDate, parentName, parentPhone, parentNotes,
      studentPhone, studentEmail, targetSchool, strengths, areasToImprove, hobbies,
      studentExpectations, familyExpectations, motivationLevel, studyHabits, timeManagement,
      attentionSpan, anxietyLevel, learningStyle, swotStrengths, swotWeaknesses, swotOpportunities, swotThreats,
      examGoalType, targetDepartment, targetScore, targetNet: Number(targetNet) || 0,
      monthlyGoals: mList,
      weeklyGoals: wList,
      dailyGoals: dList,
      subjectAnalyses, weeklyProgram, dailyLogs, mockExamLogs, topicChecklist, questionTrackerLogs,
      errorNotebookLogs, coachMeetingLogs, parentMeetingLogs, quoteOfWeek, myAchievements, noteToSelf, rewardSystem,
      habitTracker, monthWhatILearned, monthBiggestSuccess, monthBiggestMistake, monthNextGoal, monthNetStart, monthNetEnd,
      coachObservations, coachPsychState, coachMotivationChange, coachParentMeetingsSummary, coachRecommendations
    });
    setIsProfileSaved(true);
    setTimeout(() => setIsProfileSaved(false), 2000);
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    saveAllWithLists(monthlyItems, weeklyItems, dailyItems);
  };

  const handleToggleMonthlyItem = (id) => {
    const next = monthlyItems.map(i => i.id === id ? { ...i, done: !i.done } : i);
    setMonthlyItems(next);
    saveAllWithLists(next, weeklyItems, dailyItems);
  };
  const handleAddMonthlyItem = (e) => {
    e.preventDefault();
    if (newMonthlyText.trim()) {
      const next = [...monthlyItems, { id: `m_${Date.now()}`, text: newMonthlyText.trim(), done: false }];
      setMonthlyItems(next);
      setNewMonthlyText('');
      saveAllWithLists(next, weeklyItems, dailyItems);
    }
  };
  const handleDeleteMonthlyItem = (id) => {
    const next = monthlyItems.filter(i => i.id !== id);
    setMonthlyItems(next);
    saveAllWithLists(next, weeklyItems, dailyItems);
  };

  const handleToggleWeeklyItem = (id) => {
    const next = weeklyItems.map(i => i.id === id ? { ...i, done: !i.done } : i);
    setWeeklyItems(next);
    saveAllWithLists(monthlyItems, next, dailyItems);
  };
  const handleAddWeeklyItem = (e) => {
    e.preventDefault();
    if (newWeeklyText.trim()) {
      const next = [...weeklyItems, { id: `w_${Date.now()}`, text: newWeeklyText.trim(), done: false }];
      setWeeklyItems(next);
      setNewWeeklyText('');
      saveAllWithLists(monthlyItems, next, dailyItems);
    }
  };
  const handleDeleteWeeklyItem = (id) => {
    const next = weeklyItems.filter(i => i.id !== id);
    setWeeklyItems(next);
    saveAllWithLists(monthlyItems, next, dailyItems);
  };

  const handleToggleDailyItem = (id) => {
    const next = dailyItems.map(i => i.id === id ? { ...i, done: !i.done } : i);
    setDailyItems(next);
    saveAllWithLists(monthlyItems, weeklyItems, next);
  };
  const handleAddDailyItem = (e) => {
    e.preventDefault();
    if (newDailyText.trim()) {
      const next = [...dailyItems, { id: `d_${Date.now()}`, text: newDailyText.trim(), done: false }];
      setDailyItems(next);
      setNewDailyText('');
      saveAllWithLists(monthlyItems, weeklyItems, next);
    }
  };
  const handleDeleteDailyItem = (id) => {
    const next = dailyItems.filter(i => i.id !== id);
    setDailyItems(next);
    saveAllWithLists(monthlyItems, weeklyItems, next);
  };

  const handleAddStudentGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalTarget) return;
    await addGoal({
      studentId: student.id,
      title: newGoalTitle.trim(),
      type: newGoalType,
      period: newGoalPeriod,
      target: Number(newGoalTarget) || 50,
      current: 0
    });
    setNewGoalTitle('');
    setNewGoalTarget('100');
  };

  const gradeName = curriculumData?.grades?.find(g => g.id === student.gradeId)?.name || 'Öğrenci';

  return (
    <div className="coaching-dossier-page" style={{ minHeight: '100vh', background: '#e2e8f0', padding: 'clamp(1rem,3vw,2rem)', fontFamily: 'inherit' }}>
      
      {/* CONTROL BAR */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={() => navigate('/teacher')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '0.85rem', padding: '0.6rem 1.25rem', color: '#334155', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <ArrowLeft size={16} /> Öğretmen Paneline Dön
        </button>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg,#0284c7,#0369a1)', color: 'white', border: 'none', borderRadius: '0.85rem', padding: '0.65rem 1.4rem', fontWeight: 900, fontSize: '0.84rem', cursor: 'pointer' }}>
          <Printer size={18} /> Tüm Koçluk Dosyasını Yazdır / PDF
        </button>
      </div>

      {/* BINDER CONTAINER */}
      <div style={{ background: '#fcfaf6', borderRadius: '1.5rem', border: '3px solid #cbd5e1', boxShadow: '0 20px 50px rgba(0,0,0,0.12)', overflow: 'hidden' }}>

        {/* TOP BAND */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '1.5rem 2rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '4px solid #f59e0b', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.5rem' }}>
              {student.name?.charAt(0) || 'Ö'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ background: '#f59e0b', color: '#0f172a', padding: '0.15rem 0.6rem', borderRadius: 4, fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase' }}>KAPSAMLI ÖĞRENCİ KOÇLUK DOSYASI</span>
              </div>
              <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>{student.name} · Öğrenci Rehberlik & Gelişim Takip Dosyası</h1>
            </div>
          </div>
        </div>

        {/* DOSSIER TABS */}
        <div className="no-print" style={{ display: 'flex', background: '#e2e8f0', padding: '0.5rem 1rem 0', gap: '0.4rem', overflowX: 'auto', borderBottom: '2px solid #cbd5e1' }}>
          {[
            { id: 'info', label: '📄 1. Bilgi Formu' },
            { id: 'intake', label: '🧠 2. İlk Tanışma' },
            { id: 'goals', label: '🎯 3. Hedef Belirleme (Canlı Sync)' },
            { id: 'subject_analysis', label: '📚 4. Ders Analizi' },
            { id: 'weekly_program', label: '📅 5. Haftalık Program' },
            { id: 'daily_tracker', label: '⏱️ 6. Günlük Takip' },
            { id: 'mock_tracking', label: '📈 7. Deneme Takibi' },
            { id: 'topic_checklist', label: '📋 8. Konu Çizelgesi' },
            { id: 'question_tracker', label: '📊 9. Soru Takip Formu' },
            { id: 'error_notebook', label: '📘 10. Hata Defteri' },
            { id: 'coach_meetings', label: '📝 11. Koç Görüşme Formu' },
            { id: 'parent_meetings', label: '👨‍👩‍👧 12. Veli Görüşme Formu' },
            { id: 'motivation', label: '🌟 13. Motivasyon & Ödül' },
            { id: 'habit_tracker', label: '🔄 14. Alışkanlık Takibi' },
            { id: 'monthly_evaluation', label: '📅 15. Aylık Değerlendirme' },
            { id: 'notes', label: '💬 16. Koç Notları' }
          ].map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '0.75rem 1.1rem', border: '2px solid #cbd5e1', borderBottom: 'none', borderRadius: '0.85rem 0.85rem 0 0',
                background: active ? '#fcfaf6' : '#cbd5e1', color: active ? '#0f172a' : '#475569',
                fontWeight: active ? 900 : 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap'
              }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* PAGE CONTENT */}
        <div style={{ padding: '2rem', background: '#fcfaf6', minHeight: '600px' }}>

          {/* PAGE 3: HEDEF BELİRLEME & INTERACTIVE CHECKABLE LISTS */}
          {(activeTab === 'goals' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Target size={24} color="#059669" /> 3. Hedef Belirleme & İnteraktif Kontrol Listeleri
                  </h3>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 3 / 16
                  </span>
                </div>

                {/* UZUN VADELİ HEDEFLER */}
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '1.25rem', padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 900, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <GraduationCap size={20} color="#059669" /> 🏛️ Uzun Vadeli Sınav & Okul Hedefleri (Sınav, Okul, Puan & Net)
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>Hedef Sınav Türü</label>
                        <select value={examGoalType} onChange={e => setExamGoalType(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #86efac', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                          <option value="LGS 2026">🎓 LGS (Liselere Geçiş Sınavı)</option>
                          <option value="YKS (TYT/AYT) 2026">🏛️ YKS (TYT & AYT Sınavı)</option>
                          <option value="Ara Sınıf Başarı">📊 Ara Sınıf Takip & Takdir Hedefi</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>İstenen Okul & Bölüm</label>
                        <input
                          type="text"
                          placeholder="Örn: Kabataş Erkek Lisesi / İTÜ Müh."
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
                  </div>
                </form>

                {/* 📅 ORTA VADELİ HEDEFLER (AYLIK KAZANIMLAR CHECKLIST) */}
                <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '1.25rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Trophy size={20} color="#2563eb" /> 📅 ORTA VADELİ HEDEFLER (AYLIK KAZANIMLAR)
                    </h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8' }}>
                      {monthlyItems.filter(i => i.done).length}/{monthlyItems.length} Tamamlandı
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                    {monthlyItems.map(item => (
                      <div key={item.id} onClick={() => handleToggleMonthlyItem(item.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.9rem', background: item.done ? '#dbeafe' : 'white', borderRadius: '0.75rem', border: item.done ? '1.5px solid #93c5fd' : '1px solid #cbd5e1', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, border: item.done ? 'none' : '2px solid #94a3b8', background: item.done ? '#2563eb' : 'white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem' }}>
                            {item.done && <Check size={16} />}
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: item.done ? '#1e3a8a' : '#0f172a', textDecoration: item.done ? 'line-through' : 'none' }}>
                            {item.text}
                          </span>
                        </div>
                        <button type="button" className="no-print" onClick={(e) => { e.stopPropagation(); handleDeleteMonthlyItem(item.id); }} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddMonthlyItem} className="no-print" style={{ display: 'flex', gap: '0.6rem' }}>
                    <input
                      type="text"
                      placeholder="+ Yeni aylık hedef maddesi ekle..."
                      value={newMonthlyText}
                      onChange={e => setNewMonthlyText(e.target.value)}
                      style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid #93c5fd', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.65rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <Plus size={16} /> Ekle
                    </button>
                  </form>
                </div>

                {/* ⚡ KISA VADELİ HEDEFLER (HAFTALIK HEDEFLER CHECKLIST) */}
                <div style={{ background: '#fefce8', border: '1.5px solid #fef08a', borderRadius: '1.25rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#a16207', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ListTodo size={20} color="#d97706" /> ⚡ KISA VADELİ HEDEFLER (HAFTALIK)
                    </h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309' }}>
                      {weeklyItems.filter(i => i.done).length}/{weeklyItems.length} Tamamlandı
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                    {weeklyItems.map(item => (
                      <div key={item.id} onClick={() => handleToggleWeeklyItem(item.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.9rem', background: item.done ? '#fef3c7' : 'white', borderRadius: '0.75rem', border: item.done ? '1.5px solid #fde047' : '1px solid #cbd5e1', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, border: item.done ? 'none' : '2px solid #94a3b8', background: item.done ? '#d97706' : 'white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem' }}>
                            {item.done && <Check size={16} />}
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: item.done ? '#78350f' : '#0f172a', textDecoration: item.done ? 'line-through' : 'none' }}>
                            {item.text}
                          </span>
                        </div>
                        <button type="button" className="no-print" onClick={(e) => { e.stopPropagation(); handleDeleteWeeklyItem(item.id); }} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddWeeklyItem} className="no-print" style={{ display: 'flex', gap: '0.6rem' }}>
                    <input
                      type="text"
                      placeholder="+ Yeni haftalık hedef maddesi ekle (Örn: Haftada 400 soru + 2 deneme)..."
                      value={newWeeklyText}
                      onChange={e => setNewWeeklyText(e.target.value)}
                      style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid #fde047', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button type="submit" style={{ background: '#d97706', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.65rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <Plus size={16} /> Ekle
                    </button>
                  </form>
                </div>

                {/* 🔥 GÜNLÜK ÇALIŞMA RUTİNİ (CHECKLIST) */}
                <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '1.25rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Flame size={20} color="#7c3aed" /> 🔥 GÜNLÜK ÇALIŞMA RUTİNİ (CHECKLIST)
                    </h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6b21a8' }}>
                      {dailyItems.filter(i => i.done).length}/{dailyItems.length} Tamamlandı
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                    {dailyItems.map(item => (
                      <div key={item.id} onClick={() => handleToggleDailyItem(item.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.9rem', background: item.done ? '#f3e8ff' : 'white', borderRadius: '0.75rem', border: item.done ? '1.5px solid #d8b4fe' : '1px solid #cbd5e1', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, border: item.done ? 'none' : '2px solid #94a3b8', background: item.done ? '#7c3aed' : 'white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem' }}>
                            {item.done && <Check size={16} />}
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: item.done ? '#581c87' : '#0f172a', textDecoration: item.done ? 'line-through' : 'none' }}>
                            {item.text}
                          </span>
                        </div>
                        <button type="button" className="no-print" onClick={(e) => { e.stopPropagation(); handleDeleteDailyItem(item.id); }} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddDailyItem} className="no-print" style={{ display: 'flex', gap: '0.6rem' }}>
                    <input
                      type="text"
                      placeholder="+ Yeni günlük rutin maddesi ekle (Örn: Günlük 20 Paragraf sorusu)..."
                      value={newDailyText}
                      onChange={e => setNewDailyText(e.target.value)}
                      style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1.5px solid #d8b4fe', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.65rem 1.25rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <Plus size={16} /> Ekle
                    </button>
                  </form>
                </div>

                <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #f1f5f9' }}>
                  {isProfileSaved ? (
                    <span style={{ color: '#16a34a', fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={20} /> Hedef Belirleme Kontrol Listeleri Başarıyla Kaydedildi!
                    </span>
                  ) : <span />}
                  <button onClick={handleSaveProfile} style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.85rem 2rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Save size={18} /> Tüm Hedefleri Kaydet & Senkronize Et
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 4: DERS ANALİZİ */}
          {(activeTab === 'subject_analysis' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>4. Ders Analizi & Konu Bazlı Takip Ekranı</h3>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
