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
  CheckCircle, Repeat, CheckLine, AlertCircle
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

const WEEK_SHORT_DAYS = ['Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts', 'Paz'];
const SUBJECT_NAMES = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'];

const DEFAULT_SUBJECT_ANALYSIS = {
  'Türkçe': {
    topics: 'Paragraf Taktikleri, Sözel Mantık, Cümlede Anlam, Yazım Kuralları',
    weaknesses: 'Sözel mantık sorularında süre kaybı ve paragrafta çabuk sıkılma',
    mockNet: '18.5',
    errorType: 'Dikkat / Okuma Hatası',
    reviewDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    notes: 'Haftada en az 30 paragraf sorusu zaman tutarak çözülecek.'
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
    { id: 'tm4', name: 'Veri Analizi', started: true, learned: false, solved: false, reviewed: false, completed: false },
    { id: 'tm5', name: 'Basit Olayların Olma Olasılığı', started: false, learned: false, solved: false, reviewed: false, completed: false },
    { id: 'tm6', name: 'Cebirsel İfadeler ve Özdeşlikler', started: false, learned: false, solved: false, reviewed: false, completed: false }
  ],
  'Türkçe': [
    { id: 'tt1', name: 'Fiilimsiler (Eylemsiler)', started: true, learned: true, solved: true, reviewed: true, completed: true },
    { id: 'tt2', name: 'Sözcükte Anlam', started: true, learned: true, solved: true, reviewed: true, completed: true },
    { id: 'tt3', name: 'Cümlede Anlam', started: true, learned: true, solved: true, reviewed: false, completed: false },
    { id: 'tt4', name: 'Paragrafta Yapı & Anlam Taktikleri', started: true, learned: true, solved: true, reviewed: true, completed: false },
    { id: 'tt5', name: 'Sözel Mantık & Akıl Yürütme', started: true, learned: false, solved: false, reviewed: false, completed: false }
  ],
  'Fen Bilimleri': [
    { id: 'tf1', name: 'Mevsimler ve İklim', started: true, learned: true, solved: true, reviewed: true, completed: true },
    { id: 'tf2', name: 'DNA ve Genetik Kod', started: true, learned: true, solved: true, reviewed: false, completed: false },
    { id: 'tf3', name: 'Basınç (Katı, Sıvı, Gaz)', started: true, learned: false, solved: false, reviewed: false, completed: false }
  ],
  'Sosyal Bilgiler': [
    { id: 'ts1', name: 'Bir Kahraman Doğuyor', started: true, learned: true, solved: true, reviewed: true, completed: true },
    { id: 'ts2', name: 'Milli Uyanış: Bağımsızlık Yolunda Atılan Adımlar', started: true, learned: true, solved: false, reviewed: false, completed: false }
  ],
  'İngilizce': [
    { id: 'ti1', name: 'Friendship', started: true, learned: true, solved: true, reviewed: true, completed: true },
    { id: 'ti2', name: 'Teen Life', started: true, learned: true, solved: false, reviewed: false, completed: false }
  ]
};

const DEFAULT_QUESTION_LOGS = [
  { id: 'ql1', date: new Date().toISOString().split('T')[0], targetCount: 150, solvedCount: 140, hardestSubject: 'Matematik', notes: 'Yeni nesil EBOB sorularında 10 soru eksik kaldı.' },
  { id: 'ql2', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], targetCount: 150, solvedCount: 150, hardestSubject: 'Türkçe', notes: 'Sözel mantık sorularının tamamı çözüldü ✅' }
];

const DEFAULT_ERROR_LOGS = [
  { id: 'el1', topic: 'Matematik - Çarpanlar ve Katlar', whyWrong: 'EBOB-EKOK problemi sorusunda en az yerine en fazla okudum.', correctSolution: 'Soru en küçük ortak kat istediği için EKOK(15,20)=60 alındı.', reviewDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] }
];

const DEFAULT_COACH_MEETINGS = [
  { id: 'cm1', date: new Date().toISOString().split('T')[0], duration: '45 dk', weeklyEvaluation: 'Bu hafta ders çalışma disiplini yüksekti. Paragraf netlerinde artış gözlendi.', strengths: 'Zamanı verimli kullanması ve problem sorularında pes etmemesi.', areasToImprove: 'Fen bilimleri kalıtım çaprazlama konuları tekrar edilecek.', nextWeekGoals: 'Haftada 400 soru + 2 Adet Branş Denemesi çözümü.' }
];

const DEFAULT_PARENT_MEETINGS = [
  { id: 'pm1', date: new Date().toISOString().split('T')[0], topics: 'Evde çalışma ortamı, telefon kullanımı ve deneme netleri', parentFeedback: 'Veli, akşam 20:00-22:00 arası evde sessiz ortam sağlandığını belirtti.', decisions: 'Telefon çalışma saatlerinde salon dolabına bırakılacak, hafta sonu 1 deneme birlikte kontrol edilecek.' }
];

const DEFAULT_HABITS = [
  { id: 'h1', title: 'Erken Kalktım (07:00) 🌅', days: { Pzt: true, Sal: true, Çrş: true, Prş: false, Cum: true, Cts: false, Paz: false } },
  { id: 'h2', title: 'Plan Yaptım & Masada Çalıştım 📋', days: { Pzt: true, Sal: true, Çrş: true, Prş: true, Cum: true, Cts: true, Paz: false } },
  { id: 'h3', title: 'Kitap Okudum (En az 30 dk) 📖', days: { Pzt: true, Sal: false, Çrş: true, Prş: true, Cum: false, Cts: true, Paz: true } },
  { id: 'h4', title: 'Spor & Egzersiz Yaptım 🏃', days: { Pzt: false, Sal: true, Çrş: false, Prş: true, Cum: false, Cts: true, Paz: false } },
  { id: 'h5', title: 'Telefon / Ekran Süresi < 2 Saat 📱', days: { Pzt: true, Sal: true, Çrş: false, Prş: true, Cum: true, Cts: false, Paz: false } }
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
    addMockExam,
    deleteMockExam,
    getMockExamsForStudent,
    addCoachingMeeting,
    getMeetingsForStudent
  } = useCoaching();

  // Active Dossier Tab State
  const [activeTab, setActiveTab] = useState('info'); 

  // Target Student
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
  const [targetScore, setTargetScore] = useState(existingProfile.targetScore || '485');
  const [targetNet, setTargetNet] = useState(existingProfile.targetNet || '90');
  const [monthlyGoals, setMonthlyGoals] = useState(existingProfile.monthlyGoals || '');
  const [weeklyGoals, setWeeklyGoals] = useState(existingProfile.weeklyGoals || '');
  const [dailyGoals, setDailyGoals] = useState(existingProfile.dailyGoals || '');

  // Page 4: Ders Analizi State (Per subject data)
  const [subjectAnalyses, setSubjectAnalyses] = useState(existingProfile.subjectAnalyses || DEFAULT_SUBJECT_ANALYSIS);
  const [activeSubjectTab, setActiveSubjectTab] = useState('Türkçe');

  // Page 5: Haftalık Program State
  const [weeklyProgram, setWeeklyProgram] = useState(existingProfile.weeklyProgram || DEFAULT_WEEKLY_PROGRAM);
  const [newProgDay, setNewProgDay] = useState('Pazartesi');
  const [newProgSubject, setNewProgSubject] = useState('Matematik');
  const [newProgTime, setNewProgTime] = useState('18:00 - 19:30');
  const [newProgContent, setNewProgContent] = useState('');

  // Page 6: Günlük Çalışma Takibi State
  const [dailyLogs, setDailyLogs] = useState(existingProfile.dailyLogs || DEFAULT_DAILY_LOGS);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logDuration, setLogDuration] = useState('180');
  const [logQuestions, setLogQuestions] = useState('120');
  const [logReview, setLogReview] = useState('');
  const [logVideo, setLogVideo] = useState('');
  const [logBook, setLogBook] = useState('');
  const [logSport, setLogSport] = useState('');
  const [logSleep, setLogSleep] = useState('23:00 - 07:00 (8 Saat)');

  // Page 7: Deneme Takibi & Yanlış Analizi State
  const [mockExamLogs, setMockExamLogs] = useState(existingProfile.mockExamLogs || DEFAULT_MOCK_EXAM_LOGS);
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
  const [mTitle, setMTitle] = useState('');
  const [mTurkce, setMTurkce] = useState('');
  const [mMat, setMMat] = useState('');
  const [mFen, setMFen] = useState('');
  const [mSosyal, setMSosyal] = useState('');
  const [mReason, setMReason] = useState('İşlem Hatası');

  // Page 8: Konu Takip Çizelgesi State
  const [topicChecklist, setTopicChecklist] = useState(existingProfile.topicChecklist || DEFAULT_TOPIC_CHECKLIST);
  const [activeChecklistSubject, setActiveChecklistSubject] = useState('Matematik');
  const [newTopicName, setNewTopicName] = useState('');

  // Page 9: Soru Takip Formu State
  const [questionTrackerLogs, setQuestionTrackerLogs] = useState(existingProfile.questionTrackerLogs || DEFAULT_QUESTION_LOGS);
  const [qDate, setQDate] = useState(new Date().toISOString().split('T')[0]);
  const [qTarget, setQTarget] = useState('150');
  const [qSolved, setQSolved] = useState('130');
  const [qHardestSubject, setQHardestSubject] = useState('Matematik');
  const [qNotes, setQNotes] = useState('');

  // Page 10: Hata Defteri State
  const [errorNotebookLogs, setErrorNotebookLogs] = useState(existingProfile.errorNotebookLogs || DEFAULT_ERROR_LOGS);
  const [errTopic, setErrTopic] = useState('');
  const [errWhy, setErrWhy] = useState('');
  const [errCorrect, setErrCorrect] = useState('');
  const [errReviewDate, setErrReviewDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);

  // Page 11: Koç Görüşme Formu State
  const [coachMeetingLogs, setCoachMeetingLogs] = useState(existingProfile.coachMeetingLogs || DEFAULT_COACH_MEETINGS);
  const [cmDate, setCmDate] = useState(new Date().toISOString().split('T')[0]);
  const [cmDuration, setCmDuration] = useState('45 dk');
  const [cmWeeklyEval, setCmWeeklyEval] = useState('');
  const [cmStrengths, setCmStrengths] = useState('');
  const [cmAreasToImprove, setCmAreasToImprove] = useState('');
  const [cmNextGoals, setCmNextGoals] = useState('');

  // Page 12: Veli Görüşme Formu State
  const [parentMeetingLogs, setParentMeetingLogs] = useState(existingProfile.parentMeetingLogs || DEFAULT_PARENT_MEETINGS);
  const [pmDate, setPmDate] = useState(new Date().toISOString().split('T')[0]);
  const [pmTopics, setPmTopics] = useState('');
  const [pmParentFeedback, setPmParentFeedback] = useState('');
  const [pmDecisions, setPmDecisions] = useState('');

  // Page 13: Motivasyon Sayfası State
  const [quoteOfWeek, setQuoteOfWeek] = useState(existingProfile.quoteOfWeek || 'Başarı, her gün tekrarlanan küçük çabaların toplamıdır.');
  const [myAchievements, setMyAchievements] = useState(existingProfile.myAchievements || '• Matematik deneme netimi 16 üzerine çıkardım.\n• Bu hafta 500 soru hedefini aştım.');
  const [noteToSelf, setNoteToSelf] = useState(existingProfile.noteToSelf || 'Zorlandığım anlarda pes etmek yerine 5 dakika mola verip soruya yeniden odaklanacağım.');
  const [rewardSystem, setRewardSystem] = useState(existingProfile.rewardSystem || 'Haftalık 500 soru ve 2 deneme hedefine ulaştığımda Pazar günü sevdiğim filmi izleyeceğim 🎬');

  // Page 14: Alışkanlık Takibi State
  const [habitTracker, setHabitTracker] = useState(existingProfile.habitTracker || DEFAULT_HABITS);
  const [newHabitTitle, setNewHabitTitle] = useState('');

  // Page 15: Aylık Değerlendirme State
  const [monthWhatILearned, setMonthWhatILearned] = useState(existingProfile.monthWhatILearned || '• Matematik Çarpanlar ve EKOK problemleri kavrandı.\n• Paragrafta olumsuz soru köklerinde taktik geliştirildi.');
  const [monthBiggestSuccess, setMonthBiggestSuccess] = useState(existingProfile.monthBiggestSuccess || 'Genel deneme netimi 64.25 üzerine çıkararak kişisel rekor kırdım.');
  const [monthBiggestMistake, setMonthBiggestMistake] = useState(existingProfile.monthBiggestMistake || 'Hafta içi geç saatlerde ders çalışıp sabah yorgun uyanmak.');
  const [monthNextGoal, setMonthNextGoal] = useState(existingProfile.monthNextGoal || 'Gelecek ay Matematik netini 18 üzerine çıkarmak ve 2000 soru barajını aşmak.');
  const [monthNetStart, setMonthNetStart] = useState(existingProfile.monthNetStart || '52.0');
  const [monthNetEnd, setMonthNetEnd] = useState(existingProfile.monthNetEnd || '64.25');

  // Page 16: Serbest Koç Notları State
  const [coachObservations, setCoachObservations] = useState(existingProfile.coachObservations || '• Öğrenci ders çalışırken odaklanma süresini artırdı.\n• Matematik korkusunu aştı, soruları çözmeye istekli.');
  const [coachPsychState, setCoachPsychState] = useState(existingProfile.coachPsychState || 'Dengeli ve istekli. Sınav kaygısı kontrol edilebilir seviyede.');
  const [coachMotivationChange, setCoachMotivationChange] = useState(existingProfile.coachMotivationChange || '📈 Yükselişte (%85). Net artışı öğrencinin özgüvenini artırdı.');
  const [coachParentMeetingsSummary, setCoachParentMeetingsSummary] = useState(existingProfile.coachParentMeetingsSummary || 'Veli ile 2 haftada bir görüşüldü. Evde televizyon ve telefon kısıtlaması uygulandı.');
  const [coachRecommendations, setCoachRecommendations] = useState(existingProfile.coachRecommendations || '1. Günlük 20 Paragraf zaman tutularak çözülmeye devam edilecek.\n2. Yanlış analiz kartları her pazar akşamı gözden geçirilecek.');

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

      if (existingProfile.subjectAnalyses) setSubjectAnalyses(existingProfile.subjectAnalyses);
      if (existingProfile.weeklyProgram) setWeeklyProgram(existingProfile.weeklyProgram);
      if (existingProfile.dailyLogs) setDailyLogs(existingProfile.dailyLogs);

      if (existingProfile.mockExamLogs) setMockExamLogs(existingProfile.mockExamLogs);
      if (existingProfile.topicChecklist) setTopicChecklist(existingProfile.topicChecklist);
      if (existingProfile.questionTrackerLogs) setQuestionTrackerLogs(existingProfile.questionTrackerLogs);

      if (existingProfile.errorNotebookLogs) setErrorNotebookLogs(existingProfile.errorNotebookLogs);
      if (existingProfile.coachMeetingLogs) setCoachMeetingLogs(existingProfile.coachMeetingLogs);
      if (existingProfile.parentMeetingLogs) setParentMeetingLogs(existingProfile.parentMeetingLogs);

      if (existingProfile.quoteOfWeek) setQuoteOfWeek(existingProfile.quoteOfWeek);
      if (existingProfile.myAchievements) setMyAchievements(existingProfile.myAchievements);
      if (existingProfile.noteToSelf) setNoteToSelf(existingProfile.noteToSelf);
      if (existingProfile.rewardSystem) setRewardSystem(existingProfile.rewardSystem);

      if (existingProfile.habitTracker) setHabitTracker(existingProfile.habitTracker);
      if (existingProfile.monthWhatILearned) setMonthWhatILearned(existingProfile.monthWhatILearned);
      if (existingProfile.monthBiggestSuccess) setMonthBiggestSuccess(existingProfile.monthBiggestSuccess);
      if (existingProfile.monthBiggestMistake) setMonthBiggestMistake(existingProfile.monthBiggestMistake);
      if (existingProfile.monthNextGoal) setMonthNextGoal(existingProfile.monthNextGoal);
      if (existingProfile.monthNetStart) setMonthNetStart(existingProfile.monthNetStart);
      if (existingProfile.monthNetEnd) setMonthNetEnd(existingProfile.monthNetEnd);

      if (existingProfile.coachObservations) setCoachObservations(existingProfile.coachObservations);
      if (existingProfile.coachPsychState) setCoachPsychState(existingProfile.coachPsychState);
      if (existingProfile.coachMotivationChange) setCoachMotivationChange(existingProfile.coachMotivationChange);
      if (existingProfile.coachParentMeetingsSummary) setCoachParentMeetingsSummary(existingProfile.coachParentMeetingsSummary);
      if (existingProfile.coachRecommendations) setCoachRecommendations(existingProfile.coachRecommendations);
    }
  }, [existingProfile]);

  // --- OTHER FORM STATES ---
  const existingNote = getCoachingNoteForStudent(studentId) || {};
  const [coachingNoteText, setCoachingNoteText] = useState(existingNote.note || '');
  const [weeklyFocusText, setWeeklyFocusText] = useState(existingNote.weeklyFocus || '');
  const [noteGoals, setNoteGoals] = useState(existingNote.goals || []);
  const [newGoalText, setNewGoalText] = useState('');

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
    return mockExamLogs.map((m, idx) => ({
      name: m.title || `Deneme ${idx + 1}`,
      ToplamNet: m.totalNet || 0,
      Türkçe: m.turkce || 0,
      Matematik: m.mat || 0,
      Fen: m.fen || 0
    }));
  }, [mockExamLogs]);

  const latestMockNet = mockExamLogs.length > 0 ? mockExamLogs[0].totalNet : 0;
  const netGap = Math.max(0, Number(targetNet) - latestMockNet);

  // Totals for Daily Tracker Logs
  const totalLogDuration = useMemo(() => dailyLogs.reduce((acc, l) => acc + (Number(l.durationMinutes) || 0), 0), [dailyLogs]);
  const totalLogQuestions = useMemo(() => dailyLogs.reduce((acc, l) => acc + (Number(l.questionCount) || 0), 0), [dailyLogs]);

  // --- HANDLERS ---
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    await saveCoachingProfile({
      studentId: student.id,
      // Pages 1-6
      schoolName, studentNumber, birthDate, parentName, parentPhone, parentNotes,
      studentPhone, studentEmail, targetSchool, strengths, areasToImprove, hobbies,
      studentExpectations, familyExpectations, motivationLevel, studyHabits, timeManagement,
      attentionSpan, anxietyLevel, learningStyle, swotStrengths, swotWeaknesses, swotOpportunities, swotThreats,
      examGoalType, targetDepartment, targetScore, targetNet: Number(targetNet) || 0,
      monthlyGoals, weeklyGoals, dailyGoals, subjectAnalyses, weeklyProgram, dailyLogs,

      // Pages 7, 8, 9
      mockExamLogs, topicChecklist, questionTrackerLogs,

      // Pages 10-13
      errorNotebookLogs, coachMeetingLogs, parentMeetingLogs,
      quoteOfWeek, myAchievements, noteToSelf, rewardSystem,

      // Pages 14-16
      habitTracker,
      monthWhatILearned, monthBiggestSuccess, monthBiggestMistake, monthNextGoal, monthNetStart, monthNetEnd,
      coachObservations, coachPsychState, coachMotivationChange, coachParentMeetingsSummary, coachRecommendations
    });
    setIsProfileSaved(true);
    setTimeout(() => setIsProfileSaved(false), 2500);
  };

  // Helper for updating Subject Analysis field
  const updateSubjectAnalysisField = (sub, field, value) => {
    setSubjectAnalyses(prev => ({
      ...prev,
      [sub]: {
        ...(prev[sub] || {}),
        [field]: value
      }
    }));
  };

  // Helpers for Weekly Program
  const handleToggleWeeklyItem = (id) => {
    const next = weeklyProgram.map(w => w.id === id ? { ...w, completed: !w.completed } : w);
    setWeeklyProgram(next);
  };

  const handleDeleteWeeklyItem = (id) => {
    const next = weeklyProgram.filter(w => w.id !== id);
    setWeeklyProgram(next);
  };

  const handleAddWeeklyItem = (e) => {
    e.preventDefault();
    if (!newProgContent.trim()) return;
    const newItem = {
      id: `w_${Date.now()}`,
      day: newProgDay,
      subject: newProgSubject,
      time: newProgTime,
      content: newProgContent.trim(),
      completed: false
    };
    setWeeklyProgram(prev => [...prev, newItem]);
    setNewProgContent('');
  };

  // Helpers for Daily Tracker Logs
  const handleAddDailyLog = (e) => {
    e.preventDefault();
    const newLog = {
      id: `dl_${Date.now()}`,
      date: logDate,
      durationMinutes: Number(logDuration) || 0,
      questionCount: Number(logQuestions) || 0,
      reviewSummary: logReview.trim() || 'Genel Konu Tekrarı Yapıldı',
      videoSummary: logVideo.trim() || 'Ders Anlatım Videosu İzlendi',
      bookReading: logBook.trim() || 'Kitap Okundu',
      sportActivity: logSport.trim() || 'Egzersiz Yapıldı',
      sleepSchedule: logSleep.trim() || 'Düzenli Uyku'
    };
    setDailyLogs(prev => [newLog, ...prev]);
    setLogReview(''); setLogVideo(''); setLogBook(''); setLogSport('');
  };

  const handleDeleteDailyLog = (id) => {
    setDailyLogs(prev => prev.filter(l => l.id !== id));
  };

  // Page 7: Mock Exam Log Handlers
  const handleAddMockLog = (e) => {
    e.preventDefault();
    if (!mTitle.trim()) return;
    const tN = Number(mTurkce) || 0;
    const mN = Number(mMat) || 0;
    const fN = Number(mFen) || 0;
    const sN = Number(mSosyal) || 0;
    const tot = Number((tN + mN + fN + sN).toFixed(2));

    const newLog = {
      id: `ml_${Date.now()}`,
      date: mDate,
      title: mTitle.trim(),
      turkce: tN,
      mat: mN,
      fen: fN,
      sosyal: sN,
      totalNet: tot,
      errorReason: mReason
    };

    setMockExamLogs(prev => [newLog, ...prev]);
    setMTitle(''); setMTurkce(''); setMMat(''); setMFen(''); setMSosyal('');
  };

  const handleDeleteMockLog = (id) => {
    setMockExamLogs(prev => prev.filter(m => m.id !== id));
  };

  // Page 8: Topic Checklist Stage Toggle Handler
  const handleToggleTopicStage = (subject, topicId, stageKey) => {
    setTopicChecklist(prev => {
      const list = prev[subject] || [];
      const updated = list.map(t => {
        if (t.id === topicId) {
          const nextVal = !t[stageKey];
          const newTopic = { ...t, [stageKey]: nextVal };
          if (stageKey === 'completed' && nextVal) {
            newTopic.started = true;
            newTopic.learned = true;
            newTopic.solved = true;
            newTopic.reviewed = true;
          }
          return newTopic;
        }
        return t;
      });
      return { ...prev, [subject]: updated };
    });
  };

  const handleAddCustomTopic = (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    const newT = {
      id: `top_${Date.now()}`,
      name: newTopicName.trim(),
      started: false,
      learned: false,
      solved: false,
      reviewed: false,
      completed: false
    };
    setTopicChecklist(prev => ({
      ...prev,
      [activeChecklistSubject]: [...(prev[activeChecklistSubject] || []), newT]
    }));
    setNewTopicName('');
  };

  const handleDeleteTopic = (subject, topicId) => {
    setTopicChecklist(prev => ({
      ...prev,
      [subject]: (prev[subject] || []).filter(t => t.id !== topicId)
    }));
  };

  // Page 9: Question Tracker Handlers
  const handleAddQuestionLog = (e) => {
    e.preventDefault();
    const tCount = Number(qTarget) || 0;
    const sCount = Number(qSolved) || 0;
    const newQLog = {
      id: `ql_${Date.now()}`,
      date: qDate,
      targetCount: tCount,
      solvedCount: sCount,
      hardestSubject: qHardestSubject,
      notes: qNotes.trim()
    };
    setQuestionTrackerLogs(prev => [newQLog, ...prev]);
    setQNotes('');
  };

  const handleDeleteQuestionLog = (id) => {
    setQuestionTrackerLogs(prev => prev.filter(q => q.id !== id));
  };

  // Page 10: Hata Defteri Handlers
  const handleAddErrorLog = (e) => {
    e.preventDefault();
    if (!errTopic.trim() || !errWhy.trim()) return;
    const newErr = {
      id: `el_${Date.now()}`,
      topic: errTopic.trim(),
      whyWrong: errWhy.trim(),
      correctSolution: errCorrect.trim() || 'Doğru çözüm adımı yazıldı.',
      reviewDate: errReviewDate
    };
    setErrorNotebookLogs(prev => [newErr, ...prev]);
    setErrTopic(''); setErrWhy(''); setErrCorrect('');
  };

  const handleDeleteErrorLog = (id) => {
    setErrorNotebookLogs(prev => prev.filter(e => e.id !== id));
  };

  // Page 11: Koç Görüşme Formu Handlers
  const handleAddCoachMeetingLog = (e) => {
    e.preventDefault();
    if (!cmWeeklyEval.trim()) return;
    const newCM = {
      id: `cm_${Date.now()}`,
      date: cmDate,
      duration: cmDuration,
      weeklyEvaluation: cmWeeklyEval.trim(),
      strengths: cmStrengths.trim(),
      areasToImprove: cmAreasToImprove.trim(),
      nextWeekGoals: cmNextGoals.trim()
    };
    setCoachMeetingLogs(prev => [newCM, ...prev]);
    setCmWeeklyEval(''); setCmStrengths(''); setCmAreasToImprove(''); setCmNextGoals('');
  };

  const handleDeleteCoachMeetingLog = (id) => {
    setCoachMeetingLogs(prev => prev.filter(m => m.id !== id));
  };

  // Page 12: Veli Görüşme Formu Handlers
  const handleAddParentMeetingLog = (e) => {
    e.preventDefault();
    if (!pmTopics.trim()) return;
    const newPM = {
      id: `pm_${Date.now()}`,
      date: pmDate,
      topics: pmTopics.trim(),
      parentFeedback: pmParentFeedback.trim(),
      decisions: pmDecisions.trim()
    };
    setParentMeetingLogs(prev => [newPM, ...prev]);
    setPmTopics(''); setPmParentFeedback(''); setPmDecisions('');
  };

  const handleDeleteParentMeetingLog = (id) => {
    setParentMeetingLogs(prev => prev.filter(m => m.id !== id));
  };

  // Page 14: Habit Tracker Handlers
  const handleToggleHabitDay = (habitId, dayKey) => {
    setHabitTracker(prev => prev.map(h => {
      if (h.id === habitId) {
        return {
          ...h,
          days: {
            ...h.days,
            [dayKey]: !h.days[dayKey]
          }
        };
      }
      return h;
    }));
  };

  const handleAddCustomHabit = (e) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    const newH = {
      id: `h_${Date.now()}`,
      title: newHabitTitle.trim(),
      days: { Pzt: false, Sal: false, Çrş: false, Prş: false, Cum: false, Cts: false, Paz: false }
    };
    setHabitTracker(prev => [...prev, newH]);
    setNewHabitTitle('');
  };

  const handleDeleteHabit = (habitId) => {
    setHabitTracker(prev => prev.filter(h => h.id !== habitId));
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
  const currSubAnalysis = subjectAnalyses[activeSubjectTab] || {};
  const currentChecklist = topicChecklist[activeChecklistSubject] || [];

  // Calculate Topic Mastery Rate for activeChecklistSubject
  const topicMasteryRate = useMemo(() => {
    if (currentChecklist.length === 0) return 0;
    const completedCount = currentChecklist.filter(t => t.completed).length;
    return Math.round((completedCount / currentChecklist.length) * 100);
  }, [currentChecklist]);

  const monthNetDiff = (Number(monthNetEnd) || 0) - (Number(monthNetStart) || 0);

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
            { id: 'info', label: '📄 1. Bilgi Formu', icon: UserCheck },
            { id: 'intake', label: '🧠 2. İlk Tanışma', icon: Brain },
            { id: 'goals', label: '🎯 3. Hedef Belirleme', icon: Target },
            { id: 'subject_analysis', label: '📚 4. Ders Analizi', icon: BookOpen },
            { id: 'weekly_program', label: '📅 5. Haftalık Program', icon: CalendarDays },
            { id: 'daily_tracker', label: '⏱️ 6. Günlük Takip', icon: Flame },
            { id: 'mock_tracking', label: '📈 7. Deneme Takibi', icon: TrendingUp, badge: mockExamLogs.length },
            { id: 'topic_checklist', label: '📋 8. Konu Çizelgesi', icon: CheckSquare },
            { id: 'question_tracker', label: '📊 9. Soru Takip Formu', icon: PieChart },
            { id: 'error_notebook', label: '📘 10. Hata Defteri', icon: BookOpenCheck, badge: errorNotebookLogs.length },
            { id: 'coach_meetings', label: '📝 11. Koç Görüşme Formu', icon: Edit3, badge: coachMeetingLogs.length },
            { id: 'parent_meetings', label: '👨‍👩‍👧 12. Veli Görüşme Formu', icon: Users, badge: parentMeetingLogs.length },
            { id: 'motivation', label: '🌟 13. Motivasyon & Ödül', icon: Sparkles },
            { id: 'habit_tracker', label: '🔄 14. Alışkanlık Takibi', icon: Repeat },
            { id: 'monthly_evaluation', label: '📅 15. Aylık Değerlendirme', icon: Calendar },
            { id: 'notes', label: '💬 16. Koç Notları (Serbest)', icon: MessageSquare },
            { id: 'analytics', label: '📊 17. Performans Grafikleri', icon: BarChart3 },
            { id: 'weaknesses', label: '⚠️ 18. Eksik Haritası', icon: AlertTriangle, badge: weakTopics.length }
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
                    Sayfa 1 / 16
                  </span>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

          {/* PAGE 2: İLK TANIŞMA ANALİZİ */}
          {(activeTab === 'intake' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Brain size={24} color="#7c3aed" /> 2. İlk Tanışma Analizi, Çalışma Alışkanlıkları & SWOT
                  </h3>
                  <span style={{ background: '#f3e8ff', color: '#6b21a8', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 2 / 16
                  </span>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '1rem', padding: '1.25rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <User size={18} color="#7c3aed" /> Öğrencinin Beklentileri
                      </label>
                      <textarea
                        rows="4"
                        placeholder="Örn: LGS'de %1'lik dilime girmek, Matematik dersindeki ön yargımı kırmak..."
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
                        placeholder="Örn: Evde ders çalışırken masa başında kalmasını sağlamak, sınav kaygısını yönetmek..."
                        value={familyExpectations}
                        onChange={e => setFamilyExpectations(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #fdba74', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>
                  </div>

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

                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={20} color="#7c3aed" /> SWOT Analiz Matrisi
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                      <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '1rem', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#15803d' }}>🟢 GÜÇLÜ YÖNLER (Strengths)</span>
                          <span style={{ background: '#22c55e', color: 'white', fontWeight: 900, fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 4 }}>S</span>
                        </div>
                        <textarea
                          rows="4"
                          placeholder="Örn: Analitik düşünme gücü, pes etmeyen yapısı..."
                          value={swotStrengths}
                          onChange={e => setSwotStrengths(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid #86efac', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                        />
                      </div>

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

                      <div style={{ background: '#fefce8', border: '2px solid #fef08a', borderRadius: '1rem', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#a16207' }}>🟡 FIRSATLAR (Opportunities)</span>
                          <span style={{ background: '#eab308', color: 'white', fontWeight: 900, fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 4 }}>O</span>
                        </div>
                        <textarea
                          rows="4"
                          placeholder="Örn: İlgili ve destekleyici aile ortamı, özel koçluk takibi..."
                          value={swotOpportunities}
                          onChange={e => setSwotOpportunities(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1.5px solid #fde047', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '1rem', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1d4ed8' }}>🔵 TEHDİTLER (Threats)</span>
                          <span style={{ background: '#3b82f6', color: 'white', fontWeight: 900, fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 4 }}>T</span>
                        </div>
                        <textarea
                          rows="4"
                          placeholder="Örn: Telefon ve oyun alışkanlığı, yetersiz uyku düzeni..."
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
                    Sayfa 3 / 16
                  </span>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

                  <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '1.25rem', padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', fontWeight: 900, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={20} color="#2563eb" /> 📅 Orta Vadeli Hedefler (Aylık Aşama & Konu Hedefleri)
                    </h4>
                    <textarea
                      rows="3"
                      placeholder="Örn: 1. Ay Matematik Çarpanlar konusunu tamamla..."
                      value={monthlyGoals}
                      onChange={e => setMonthlyGoals(e.target.value)}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #93c5fd', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div style={{ background: '#fefce8', border: '1.5px solid #fef08a', borderRadius: '1.25rem', padding: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', fontWeight: 900, color: '#a16207', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ListTodo size={20} color="#d97706" /> ⚡ Kısa Vadeli Haftalık Hedefler
                      </h4>
                      <textarea
                        rows="4"
                        placeholder="Örn: Haftalık 400 soru çözmek..."
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
                        placeholder="Örn: Günlük 20 Paragraf sorusu..."
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

          {/* PAGE 4: DERS ANALİZİ */}
          {(activeTab === 'subject_analysis' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BookOpen size={24} color="#d97706" /> 4. Ders Analizi & Konu Bazlı Takip Ekranı
                  </h3>
                  <span style={{ background: '#fef3c7', color: '#b45309', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 4 / 16
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {SUBJECT_NAMES.map(sub => {
                    const active = activeSubjectTab === sub;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setActiveSubjectTab(sub)}
                        style={{
                          padding: '0.65rem 1.25rem',
                          borderRadius: '0.75rem',
                          border: active ? '2px solid #d97706' : '1.5px solid #cbd5e1',
                          background: active ? '#fef3c7' : 'white',
                          color: active ? '#92400e' : '#475569',
                          fontWeight: active ? 900 : 700,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span>{sub === 'Türkçe' ? '📖' : sub === 'Matematik' ? '📐' : sub === 'Fen Bilimleri' ? '🧪' : sub === 'Sosyal Bilgiler' ? '🌍' : '🗣️'}</span>
                        <span>{sub}</span>
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '1.25rem', padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 900, color: '#92400e' }}>
                      {activeSubjectTab} Derse Özel Detaylı Takip Formu
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 900, color: '#78350f', display: 'block', marginBottom: 4 }}>📌 Takip Edilen Konular</label>
                        <textarea
                          rows="3"
                          value={currSubAnalysis.topics || ''}
                          onChange={e => updateSubjectAnalysisField(activeSubjectTab, 'topics', e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #fcd34d', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 900, color: '#991b1b', display: 'block', marginBottom: 4 }}>⚠️ Eksikler / Zorlanılan Alanlar</label>
                        <textarea
                          rows="3"
                          value={currSubAnalysis.weaknesses || ''}
                          onChange={e => updateSubjectAnalysisField(activeSubjectTab, 'weaknesses', e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #fca5a5', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: '#fef2f2' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#78350f', display: 'block', marginBottom: 4 }}>📈 Son Deneme Net Ortalama</label>
                        <input
                          type="text"
                          value={currSubAnalysis.mockNet || ''}
                          onChange={e => updateSubjectAnalysisField(activeSubjectTab, 'mockNet', e.target.value)}
                          style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #fcd34d', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#78350f', display: 'block', marginBottom: 4 }}>🎯 Baskın Hata Türü</label>
                        <select
                          value={currSubAnalysis.errorType || 'Dikkat / Okuma Hatası'}
                          onChange={e => updateSubjectAnalysisField(activeSubjectTab, 'errorType', e.target.value)}
                          style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #fcd34d', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                        >
                          <option value="Bilgi Eksikliği">🔴 Bilgi Eksikliği (Konu Kavranmamış)</option>
                          <option value="Dikkat / Okuma Hatası">🟡 Dikkat / İşlem & Okuma Hatası</option>
                          <option value="Zaman Yetiştirememe">⏳ Zaman Yetiştirememe (Süre Baskısı)</option>
                          <option value="Soru Kökünü Yanlış Anlama">👁️ Soru Kökünü Yanlış Okuma</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#78350f', display: 'block', marginBottom: 4 }}>🗓️ Planlanan Tekrar Tarihi</label>
                        <input
                          type="date"
                          value={currSubAnalysis.reviewDate || ''}
                          onChange={e => updateSubjectAnalysisField(activeSubjectTab, 'reviewDate', e.target.value)}
                          style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.75rem', border: '1.5px solid #fcd34d', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 900, color: '#78350f', display: 'block', marginBottom: 4 }}>📝 Ders Özel Koç Tavsiyesi & Notu</label>
                      <textarea
                        rows="3"
                        value={currSubAnalysis.notes || ''}
                        onChange={e => updateSubjectAnalysisField(activeSubjectTab, 'notes', e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1.5px solid #fcd34d', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>
                  </div>

                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                    {isProfileSaved ? (
                      <span style={{ color: '#16a34a', fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={20} /> Ders Analizi Kaydedildi!
                      </span>
                    ) : <span />}
                    <button type="submit" style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.85rem 2rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer' }}>
                      <Save size={18} /> Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PAGE 5: HAFTALIK PROGRAM */}
          {(activeTab === 'weekly_program' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CalendarDays size={24} color="#0284c7" /> 5. Haftalık Çalışma Programı & Görev Takibi
                  </h3>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 5 / 16
                  </span>
                </div>

                <div className="no-print" style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '1.1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 900, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={18} /> Program Çizelgesine Yeni Görev Ekle
                  </h4>

                  <form onSubmit={handleAddWeeklyItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', display: 'block', marginBottom: 4 }}>Gün</label>
                      <select value={newProgDay} onChange={e => setNewProgDay(e.target.value)} style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid #7dd3fc', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                        {DAYS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', display: 'block', marginBottom: 4 }}>Ders</label>
                      <select value={newProgSubject} onChange={e => setNewProgSubject(e.target.value)} style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid #7dd3fc', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                        <option value="Matematik">Matematik</option>
                        <option value="Türkçe">Türkçe</option>
                        <option value="Fen Bilimleri">Fen Bilimleri</option>
                        <option value="Sosyal Bilgiler">Sosyal Bilgiler</option>
                        <option value="İngilizce">İngilizce</option>
                        <option value="Paragraf & Problem">Paragraf & Problem</option>
                        <option value="Genel Deneme">Genel Deneme</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', display: 'block', marginBottom: 4 }}>Saat Aralığı</label>
                      <input
                        type="text"
                        placeholder="Örn: 18:00 - 19:30"
                        value={newProgTime}
                        onChange={e => setNewProgTime(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid #7dd3fc', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', display: 'block', marginBottom: 4 }}>Çalışma İçeriği & Soru Hedefi</label>
                      <input
                        type="text"
                        placeholder="Örn: Çarpanlar ve Katlar 40 Yeni Nesil Soru"
                        value={newProgContent}
                        onChange={e => setNewProgContent(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid #7dd3fc', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                        required
                      />
                    </div>

                    <div>
                      <button type="submit" style={{ width: '100%', background: '#0284c7', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.65rem 1rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                        <Plus size={16} /> Görevi Ekle
                      </button>
                    </div>
                  </form>
                </div>

                <div style={{ background: 'white', borderRadius: '1rem', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 140px 1fr 120px 60px', padding: '0.85rem 1.25rem', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', fontWeight: 900, fontSize: '0.78rem', color: '#475569', textTransform: 'uppercase' }}>
                    <span>Gün</span>
                    <span>Ders</span>
                    <span>Saat</span>
                    <span>Çalışma İçeriği</span>
                    <span style={{ textAlign: 'center' }}>Tamamlandı</span>
                    <span style={{ textAlign: 'center' }} className="no-print">Sil</span>
                  </div>

                  {weeklyProgram.map((item, idx) => (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '120px 140px 140px 1fr 120px 60px', padding: '0.9rem 1.25rem', alignItems: 'center', borderBottom: '1px solid #f1f5f9', background: item.completed ? '#f0fdf4' : (idx % 2 === 0 ? 'white' : '#fafafa') }}>
                      <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0f172a' }}>{item.day}</span>
                      <div>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 99 }}>{item.subject}</span>
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>{item.time}</span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: item.completed ? '#166534' : '#1e293b', textDecoration: item.completed ? 'line-through' : 'none' }}>{item.content}</span>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button type="button" onClick={() => handleToggleWeeklyItem(item.id)} style={{ background: item.completed ? '#22c55e' : 'white', color: item.completed ? 'white' : '#94a3b8', border: item.completed ? 'none' : '2px solid #cbd5e1', borderRadius: '0.6rem', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer' }}>
                          {item.completed ? 'Evet' : 'Hayır'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }} className="no-print">
                        <button type="button" onClick={() => handleDeleteWeeklyItem(item.id)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '0.35rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PAGE 6: GÜNLÜK TAKİP */}
          {(activeTab === 'daily_tracker' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Flame size={24} color="#dc2626" /> 6. Günlük Çalışma & Yaşam Rutini Takip Logları
                  </h3>
                  <span style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 6 / 16
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#991b1b', textTransform: 'uppercase' }}>⏱️ Toplam Çalışma Süresi</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#dc2626', marginTop: 4 }}>{totalLogDuration} Dakika</div>
                  </div>

                  <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#166534', textTransform: 'uppercase' }}>📊 Toplam Çözülen Soru</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a', marginTop: 4 }}>{totalLogQuestions} Soru</div>
                  </div>
                </div>

                <div className="no-print" style={{ background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: '1.1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <form onSubmit={handleAddDailyLog} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                      <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} style={{ padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid #fca5a5', fontSize: '0.85rem' }} required />
                      <input type="number" placeholder="Süre (dk)" value={logDuration} onChange={e => setLogDuration(e.target.value)} style={{ padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid #fca5a5', fontSize: '0.85rem' }} required />
                      <input type="number" placeholder="Soru Sayısı" value={logQuestions} onChange={e => setLogQuestions(e.target.value)} style={{ padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid #fca5a5', fontSize: '0.85rem' }} required />
                      <input type="text" placeholder="Uyku Düzeni" value={logSleep} onChange={e => setLogSleep(e.target.value)} style={{ padding: '0.65rem', borderRadius: '0.65rem', border: '1.5px solid #fca5a5', fontSize: '0.85rem' }} />
                    </div>
                    <button type="submit" style={{ alignSelf: 'flex-end', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.7rem 1.5rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <Plus size={16} /> Günlük Log Ekle
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 7: DENEME TAKİBİ */}
          {(activeTab === 'mock_tracking' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TrendingUp size={24} color="#0891b2" /> 7. Deneme Sınavları Takip Tablosu & Yanlış Nedeni Teşhisi
                </h3>
                <div style={{ background: 'white', borderRadius: '1rem', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px 90px 90px 90px 110px 180px 50px', padding: '0.85rem 1.25rem', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', fontWeight: 900, fontSize: '0.78rem' }}>
                    <span>Tarih</span><span>Deneme Adı</span><span style={{ textAlign: 'center' }}>Türkçe</span><span style={{ textAlign: 'center' }}>Matematik</span><span style={{ textAlign: 'center' }}>Fen</span><span style={{ textAlign: 'center' }}>Sosyal</span><span style={{ textAlign: 'center' }}>Toplam Net</span><span>Yanlış Nedeni</span><span style={{ textAlign: 'center' }} className="no-print">Sil</span>
                  </div>
                  {mockExamLogs.map(m => (
                    <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px 90px 90px 90px 110px 180px 50px', padding: '0.9rem 1.25rem', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{m.date}</span>
                      <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>{m.title}</span>
                      <span style={{ textAlign: 'center', fontWeight: 800 }}>{m.turkce}</span>
                      <span style={{ textAlign: 'center', fontWeight: 800 }}>{m.mat}</span>
                      <span style={{ textAlign: 'center', fontWeight: 800 }}>{m.fen}</span>
                      <span style={{ textAlign: 'center', fontWeight: 800 }}>{m.sosyal}</span>
                      <span style={{ textAlign: 'center', fontWeight: 900, color: '#0e7490' }}>{m.totalNet} Net</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991b1b' }}>{m.errorReason}</span>
                      <div style={{ display: 'flex', justifyContent: 'center' }} className="no-print">
                        <button onClick={() => handleDeleteMockLog(m.id)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '0.35rem', borderRadius: '0.5rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PAGE 8: KONU TAKİP ÇİZELGESİ */}
          {(activeTab === 'topic_checklist' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckSquare size={24} color="#7c3aed" /> 8. Konu Takip Çizelgesi (5 Aşamalı Hakimiyet Matrix)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 110px 110px 110px 50px', padding: '0.85rem 1.25rem', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', fontWeight: 900, fontSize: '0.78rem' }}>
                  <span>Konu Adı</span><span style={{ textAlign: 'center' }}>🟡 Başlandı</span><span style={{ textAlign: 'center' }}>🔵 Öğrenildi</span><span style={{ textAlign: 'center' }}>🟣 Soru Çözüldü</span><span style={{ textAlign: 'center' }}>🟢 Tekrar Yapıldı</span><span style={{ textAlign: 'center' }}>✅ Tamamlandı</span><span style={{ textAlign: 'center' }} className="no-print">Sil</span>
                </div>
                {currentChecklist.map(t => (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 110px 110px 110px 50px', padding: '0.85rem 1.25rem', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{t.name}</span>
                    {['started', 'learned', 'solved', 'reviewed', 'completed'].map(stKey => (
                      <div key={stKey} style={{ display: 'flex', justifyContent: 'center' }}>
                        <button type="button" onClick={() => handleToggleTopicStage(activeChecklistSubject, t.id, stKey)} style={{ background: t[stKey] ? '#22c55e' : '#f1f5f9', color: t[stKey] ? 'white' : '#cbd5e1', border: 'none', borderRadius: 6, padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900 }}>
                          {t[stKey] ? '✓' : '—'}
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'center' }} className="no-print">
                      <button onClick={() => handleDeleteTopic(activeChecklistSubject, t.id)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '0.35rem', borderRadius: '0.5rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAGE 9: SORU TAKİP FORMU */}
          {(activeTab === 'question_tracker' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PieChart size={24} color="#16a34a" /> 9. Soru Takip Formu (Hedef vs Çözülen vs Eksik Kalan)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 120px 120px 120px 160px 1fr 50px', padding: '0.85rem 1.25rem', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', fontWeight: 900, fontSize: '0.78rem' }}>
                  <span>Tarih</span><span style={{ textAlign: 'center' }}>Günlük Hedef</span><span style={{ textAlign: 'center' }}>Çözülen Soru</span><span style={{ textAlign: 'center' }}>Eksik Kalan</span><span>En Zorlanılan Ders</span><span>Not</span><span style={{ textAlign: 'center' }} className="no-print">Sil</span>
                </div>
                {questionTrackerLogs.map(q => (
                  <div key={q.id} style={{ display: 'grid', gridTemplateColumns: '110px 120px 120px 120px 160px 1fr 50px', padding: '0.9rem 1.25rem', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.82rem' }}>{q.date}</span>
                    <span style={{ textAlign: 'center', fontWeight: 800 }}>{q.targetCount} Soru</span>
                    <span style={{ textAlign: 'center', fontWeight: 900, color: '#16a34a' }}>{q.solvedCount} Soru</span>
                    <span style={{ textAlign: 'center', fontWeight: 900, color: '#dc2626' }}>{Math.max(0, q.targetCount - q.solvedCount)} Soru Eksik</span>
                    <span>{q.hardestSubject}</span>
                    <span style={{ fontSize: '0.82rem', color: '#475569' }}>{q.notes || '—'}</span>
                    <div style={{ display: 'flex', justifyContent: 'center' }} className="no-print">
                      <button onClick={() => handleDeleteQuestionLog(q.id)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '0.35rem', borderRadius: '0.5rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAGE 10: HATA DEFTERİ */}
          {(activeTab === 'error_notebook' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BookOpenCheck size={24} color="#2563eb" /> 10. Hata Defteri (Konu, Yanlış Neden Oldu, Doğrusu & Tekrar Tarihi)
                </h3>
                {errorNotebookLogs.map(err => (
                  <div key={err.id} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 900, padding: '0.2rem 0.75rem', borderRadius: 99 }}>📌 {err.topic}</span>
                      <span style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 800 }}>🗓️ Tekrar Tarihi: {err.reviewDate}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                      <div style={{ background: '#fef2f2', padding: '0.85rem', borderRadius: '0.75rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#b91c1c' }}>❌ Yanlış Neden Oldu?</span>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d', fontWeight: 700 }}>{err.whyWrong}</p>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '0.85rem', borderRadius: '0.75rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#15803d' }}>✅ Doğrusu & Çözüm Mantığı</span>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#14532d', fontWeight: 700 }}>{err.correctSolution}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAGE 11: KOÇ GÖRÜŞME FORMU */}
          {(activeTab === 'coach_meetings' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Edit3 size={24} color="#7c3aed" /> 11. Birebir Koç Görüşme Formu
                </h3>
                {coachMeetingLogs.map(m => (
                  <div key={m.id} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 900, color: '#6b21a8' }}>🗓️ {m.date} Koç Görüşmesi ({m.duration})</span>
                    </div>
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.88rem' }}>{m.weeklyEvaluation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAGE 12: VELİ GÖRÜŞME FORMU */}
          {(activeTab === 'parent_meetings' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Users size={24} color="#059669" /> 12. Veli Görüşme Formu (Görüşme Tarihi, Konular & Alınan Kararlar)
                </h3>
                {parentMeetingLogs.map(m => (
                  <div key={m.id} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 900, color: '#15803d' }}>👨‍👩‍👧 {m.date} Veli Görüşmesi</span>
                    <p style={{ margin: '0.4rem 0 0', fontWeight: 800 }}>Konular: {m.topics}</p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>Geri Bildirim: {m.parentFeedback}</p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#0369a1', fontWeight: 800 }}>Kararlar: {m.decisions}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAGE 13: MOTİVASYON */}
          {(activeTab === 'motivation' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={24} color="#f59e0b" /> 13. Motivasyon, Başarılar, Kendime Not & Ödül Sistemi
                </h3>
                <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#b45309' }}>✨ HAFTANIN SÖZÜ</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#92400e', marginTop: 4 }}>"{quoteOfWeek}"</div>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 14: ALIŞKANLIK TAKİBİ */}
          {(activeTab === 'habit_tracker' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Repeat size={24} color="#7c3aed" /> 14. Haftalık Alışkanlık Takip Matrisi
                  </h3>
                  <span style={{ background: '#f3e8ff', color: '#6b21a8', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 14 / 16
                  </span>
                </div>

                {/* ADD CUSTOM HABIT FORM */}
                <form onSubmit={handleAddCustomHabit} className="no-print" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    placeholder="+ Takip edilecek yeni kişisel alışkanlık ekleyin..."
                    value={newHabitTitle}
                    onChange={e => setNewHabitTitle(e.target.value)}
                    style={{ flex: 1, padding: '0.7rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                  <button type="submit" style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.7rem 1.5rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={16} /> Alışkanlık Ekle
                  </button>
                </form>

                {/* HABIT TRACKER TABLE */}
                <div style={{ background: 'white', borderRadius: '1rem', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 70px) 50px', padding: '0.85rem 1.25rem', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', fontWeight: 900, fontSize: '0.78rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span>Alışkanlık Başlığı</span>
                    {WEEK_SHORT_DAYS.map(day => (
                      <span key={day} style={{ textAlign: 'center' }}>{day}</span>
                    ))}
                    <span style={{ textAlign: 'center' }} className="no-print">Sil</span>
                  </div>

                  {habitTracker.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>Alışkanlık bulunmuyor.</div>
                  ) : (
                    habitTracker.map((h, idx) => (
                      <div
                        key={h.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr repeat(7, 70px) 50px',
                          padding: '0.9rem 1.25rem',
                          alignItems: 'center',
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? 'white' : '#fafafa'
                        }}
                      >
                        <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>{h.title}</span>

                        {WEEK_SHORT_DAYS.map(day => {
                          const done = h.days?.[day];
                          return (
                            <div key={day} style={{ display: 'flex', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleHabitDay(h.id, day)}
                                style={{
                                  background: done ? '#22c55e' : 'white',
                                  color: done ? 'white' : '#cbd5e1',
                                  border: done ? 'none' : '2px solid #cbd5e1',
                                  borderRadius: 8,
                                  width: 32,
                                  height: 32,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontWeight: 900,
                                  fontSize: '0.85rem'
                                }}
                              >
                                {done ? <Check size={18} /> : ''}
                              </button>
                            </div>
                          );
                        })}

                        <div style={{ display: 'flex', justifyContent: 'center' }} className="no-print">
                          <button
                            type="button"
                            onClick={() => handleDeleteHabit(h.id)}
                            style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '0.35rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px solid #f1f5f9' }}>
                  {isProfileSaved ? (
                    <span style={{ color: '#16a34a', fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={20} /> Alışkanlık Takip Verileri Kaydedildi!
                    </span>
                  ) : <span />}
                  <button type="button" onClick={handleSaveProfile} style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.85rem 2rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Save size={18} /> Alışkanlık Tablosunu Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 15: AYLIK DEĞERLENDİRME */}
          {(activeTab === 'monthly_evaluation' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={24} color="#0284c7" /> 15. Aylık Genel Gelişim & Performans Değerlendirmesi
                  </h3>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 15 / 16
                  </span>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* MONTHLY NET DIFF CARDS */}
                  <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '1.25rem', padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 900, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={20} color="#0284c7" /> 📈 Aylık Net Değişimi & Gelişim Özeti
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', display: 'block', marginBottom: 4 }}>Ay Başı Net Ortalama</label>
                        <input
                          type="number" step="0.25"
                          placeholder="Örn: 52.0 Net"
                          value={monthNetStart}
                          onChange={e => setMonthNetStart(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #7dd3fc', fontSize: '0.9rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', display: 'block', marginBottom: 4 }}>Ay Sonu Net Ortalama</label>
                        <input
                          type="number" step="0.25"
                          placeholder="Örn: 64.25 Net"
                          value={monthNetEnd}
                          onChange={e => setMonthNetEnd(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.95rem', borderRadius: '0.75rem', border: '1.5px solid #7dd3fc', fontSize: '0.9rem', outline: 'none', background: 'white' }}
                        />
                      </div>

                      <div style={{ background: 'white', padding: '0.85rem 1.25rem', borderRadius: '0.75rem', border: '1.5px solid #7dd3fc', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#0369a1', textTransform: 'uppercase' }}>Net Farkı / İlerleme</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: monthNetDiff >= 0 ? '#16a34a' : '#dc2626', marginTop: 2 }}>
                          {monthNetDiff >= 0 ? `+${monthNetDiff.toFixed(2)} Net 🚀` : `${monthNetDiff.toFixed(2)} Net 🔻`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#1e40af', display: 'block', marginBottom: 6 }}>📚 Bu Ay Öğrendiklerim & Kazanımlarım</label>
                      <textarea
                        rows="4"
                        placeholder="Örn: Bu ay Matematik Çarpanlar ve EKOK problemleri kavrandı, Paragrafta olumsuz soru köklerinde taktik geliştirildi..."
                        value={monthWhatILearned}
                        onChange={e => setMonthWhatILearned(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#15803d', display: 'block', marginBottom: 6 }}>🏆 En Büyük Başarım</label>
                      <textarea
                        rows="4"
                        placeholder="Örn: Genel deneme netimi 64.25 üzerine çıkararak kişisel rekor kırdım..."
                        value={monthBiggestSuccess}
                        onChange={e => setMonthBiggestSuccess(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #86efac', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: '#f0fdf4' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#b91c1c', display: 'block', marginBottom: 6 }}>⚠️ En Büyük Hatam / Ders Çıkarılan Konu</label>
                      <textarea
                        rows="4"
                        placeholder="Örn: Hafta içi geç saatlerde ders çalışıp sabah yorgun uyanmak..."
                        value={monthBiggestMistake}
                        onChange={e => setMonthBiggestMistake(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #fca5a5', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: '#fef2f2' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#6b21a8', display: 'block', marginBottom: 6 }}>🎯 Gelecek Ayın Ana Hedefi</label>
                      <textarea
                        rows="4"
                        placeholder="Örn: Gelecek ay Matematik netini 18 üzerine çıkarmak ve 2000 soru barajını aşmak..."
                        value={monthNextGoal}
                        onChange={e => setMonthNextGoal(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #d8b4fe', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: '#faf5ff' }}
                      />
                    </div>
                  </div>

                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #f1f5f9' }}>
                    {isProfileSaved ? (
                      <span style={{ color: '#16a34a', fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={20} /> Aylık Değerlendirme Kaydedildi!
                      </span>
                    ) : <span />}
                    <button type="submit" style={{ background: 'linear-gradient(135deg,#0284c7,#0369a1)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.85rem 2rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(2,132,199,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Save size={18} /> Aylık Değerlendirmeyi Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PAGE 16: KOÇ NOTLARI (SERBEST NOT ALANI) */}
          {(activeTab === 'notes' || window.matchMedia('print').matches) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MessageSquare size={24} color="#db2777" /> 16. Koç Notları (Serbest Gözlem & Tavsiye Dosyası)
                  </h3>
                  <span style={{ background: '#fce7f3', color: '#be185d', fontWeight: 800, fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 99 }}>
                    Sayfa 16 / 16
                  </span>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', display: 'block', marginBottom: 6 }}>📌 Önemli Gözlemler & Gelişim Analizi</label>
                      <textarea
                        rows="4"
                        placeholder="Örn: Öğrenci ders çalışırken odaklanma süresini artırdı. Matematik korkusunu aştı, soruları çözmeye istekli..."
                        value={coachObservations}
                        onChange={e => setCoachObservations(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', display: 'block', marginBottom: 6 }}>🧠 Psikolojik Durum & Sınav Algısı</label>
                      <textarea
                        rows="4"
                        placeholder="Örn: Dengeli ve istekli. Sınav kaygısı kontrol edilebilir seviyede..."
                        value={coachPsychState}
                        onChange={e => setCoachPsychState(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', display: 'block', marginBottom: 6 }}>📈 Motivasyon Değişimi & Eğilim</label>
                      <textarea
                        rows="4"
                        placeholder="Örn: Yükselişte (%85). Net artışı öğrencinin özgüvenini artırdı..."
                        value={coachMotivationChange}
                        onChange={e => setCoachMotivationChange(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', display: 'block', marginBottom: 6 }}>👨‍👩‍👧 Aile ile Görüşmeler Özeti</label>
                      <textarea
                        rows="4"
                        placeholder="Örn: Veli ile 2 haftada bir görüşüldü. Evde televizyon ve telefon kısıtlaması uygulandı..."
                        value={coachParentMeetingsSummary}
                        onChange={e => setCoachParentMeetingsSummary(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 900, color: '#db2777', display: 'block', marginBottom: 6 }}>💡 Özel Öneriler & Aksiyon Planı</label>
                    <textarea
                      rows="4"
                      placeholder="Örn:&#10;1. Günlük 20 Paragraf zaman tutularak çözülmeye devam edilecek.&#10;2. Yanlış analiz kartları her pazar akşamı gözden geçirilecek..."
                      value={coachRecommendations}
                      onChange={e => setCoachRecommendations(e.target.value)}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', border: '1.5px solid #f472b6', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', background: '#fdf2f8' }}
                    />
                  </div>

                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #f1f5f9' }}>
                    {isProfileSaved ? (
                      <span style={{ color: '#16a34a', fontWeight: 900, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={20} /> Serbest Koç Notları Kaydedildi!
                      </span>
                    ) : <span />}
                    <button type="submit" style={{ background: 'linear-gradient(135deg,#db2777,#be185d)', color: 'white', border: 'none', borderRadius: '0.75rem', padding: '0.85rem 2rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(219,39,119,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Save size={18} /> Koç Notlarını Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PAGE 17: AKADEMİK PERFORMANS */}
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
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#701a75', marginTop: 4 }}>{mockExamLogs.length}</div>
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

          {/* PAGE 18: EKSİK HARİTASI */}
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
