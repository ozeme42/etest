import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, NavLink, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { initNativeApp } from './services/nativeMobileService';
import MobileBottomNav from './components/MobileBottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  GraduationCap, Users, Settings, Menu, X, BookOpen, 
  Target, BarChart2, ClipboardCheck, Database, BookMarked, Map, AlertCircle, LogIn, LogOut, ListTree, Award, AlertTriangle, Calendar,
  PanelLeftClose, PanelLeftOpen, Headphones
} from 'lucide-react';

// Lazy Loaded Pages
const Landing = lazy(() => import('./pages/Landing'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentBooksPage = lazy(() => import('./pages/StudentBooksPage'));
const StudentBookDetailsPage = lazy(() => import('./pages/StudentBookDetailsPage'));
const HomeworkManager = lazy(() => import('./pages/HomeworkManager'));
const EvaluationManager = lazy(() => import('./pages/EvaluationManager'));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));
const ModularQuizPage = lazy(() => import('./pages/ModularQuizPage'));
const ModularQuizReviewPage = lazy(() => import('./pages/ModularQuizReviewPage'));
const BookManager = lazy(() => import('./pages/BookManager'));
const BookContentManager = lazy(() => import('./pages/BookContentManager'));
const StudyPlanManager = lazy(() => import('./pages/StudyPlanManager'));
const StudyPlanDetail = lazy(() => import('./pages/StudyPlanDetail'));
const StatisticsDashboard = lazy(() => import('./pages/StatisticsDashboard'));
const GoalsAndSchedulePage = lazy(() => import('./pages/GoalsAndSchedulePage'));
const StudentResultsPage = lazy(() => import('./pages/StudentResultsPage'));
const StudentExamsPage = lazy(() => import('./pages/StudentExamsPage'));
const StudentWrongAnswersPage = lazy(() => import('./pages/StudentWrongAnswersPage'));
const StudentStudyPlanView = lazy(() => import("./pages/StudentStudyPlanView"));
const StudentCoachingPage = lazy(() => import('./pages/StudentCoachingPage'));
const MyCoachingPage = lazy(() => import('./pages/MyCoachingPage'));
const ExamManager = lazy(() => import('./pages/ExamManager'));
const ExamAnalysisPage = lazy(() => import('./pages/ExamAnalysisPage'));
const PhysicalExamRunner = lazy(() => import('./pages/PhysicalExamRunner'));
const TrackedBookQuizRunner = lazy(() => import('./pages/TrackedBookQuizRunner'));
const StudentProgramPage = lazy(() => import('./pages/StudentProgramPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ScalePage = lazy(() => import('./pages/ScalePage'));
const SummaryManagerPage = lazy(() => import('./pages/SummaryManagerPage'));
const StudentSummaryPage = lazy(() => import('./pages/StudentSummaryPage'));
const StudentHomeworksPage = lazy(() => import('./pages/StudentHomeworksPage'));
const StudyRoomPage = lazy(() => import('./pages/StudyRoomPage'));

function PageLoader() {
  return (
    <div style={{
      minHeight: '65vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      color: '#818cf8',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      <div style={{
        width: 42,
        height: 42,
        border: '3.5px solid rgba(129, 140, 248, 0.2)',
        borderTopColor: '#818cf8',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite'
      }} />
      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em' }}>
        Yükleniyor…
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import { useAuth } from './context/AuthContext';
import { useCoaching } from './context/CoachingContext';
import './App.css';

// Route guard: redirects to '/' if user doesn't have the required role
function RequireRole({ roles, children }) {
  const { currentUser } = useAuth();
  if (!currentUser || !roles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function Sidebar({ isCollapsed, setIsCollapsed }) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const { isStudentCoached } = useCoaching();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);
  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar_collapsed', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const hasCoach = currentUser?.role === 'student' ? isStudentCoached(currentUser?.id) : true;

  return (
    <>
      <div className="mobile-header">
        <Link to="/" className="brand" onClick={closeSidebar}>
          <span className="brand-icon">✨</span>
          <span className="brand-text" style={{ fontSize: '1.2rem' }}>E-Test Premium</span>
        </Link>
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={closeSidebar}></div>

      {/* FLOATING TOGGLE BUTTON (VISIBLE WHEN SIDEBAR IS COLLAPSED ON DESKTOP/TABLET) */}
      {isCollapsed && (
        <button
          onClick={toggleCollapse}
          className="sidebar-floating-toggle-btn"
          title="Menüyü Aç"
        >
          <PanelLeftOpen size={18} />
          <span className="floating-btn-text">Menü</span>
        </button>
      )}

      <nav className={`sidebar glass ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" className="brand" onClick={closeSidebar}>
            <span className="brand-icon">✨</span>
            <span className="brand-text">E-Test</span>
          </Link>
          <button 
            onClick={toggleCollapse}
            className="sidebar-collapse-toggle-btn"
            title="Menüyü Gizle"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* AUTH PROFILE STATUS BAR IN SIDEBAR */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(168,85,247,0.18) 100%)', padding: '0.65rem 0.75rem', borderRadius: '0.95rem', border: '1.5px solid rgba(165,180,252,0.35)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              <div style={{ width: '2.2rem', height: '2.2rem', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
                {currentUser.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{currentUser.name}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{currentUser.role === 'student' ? 'Öğrenci' : currentUser.role === 'teacher' ? 'Öğretmen' : 'Yönetici'}</div>
              </div>
              <button 
                onClick={() => { logout(); closeSidebar(); navigate('/'); }}
                title="Oturumu Kapat"
                style={{ 
                  width: '2rem', height: '2rem', borderRadius: '50%', 
                  background: 'rgba(244,63,94,0.15)', border: 'none', 
                  color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                }}
                className="hover:scale-105 active:scale-95"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" onClick={closeSidebar} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '0.65rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 900, fontSize: '0.82rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                <LogIn size={16} /> Giriş Yap / Kayıt Ol
              </button>
            </Link>
          )}
        </div>
        
        <div className="nav-links custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="nav-section-title">Kullanıcı Panelleri</div>
          
          {/* Öğrenciye Özel Menüler (Öğretmen ve Admin Göremez) */}
          {currentUser?.role === 'student' && (
            <>
              <NavLink to="/study-room" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', boxShadow: '0 2px 10px rgba(168,85,247,0.4)' }}>
                  <Headphones size={16} color="white" />
                </div>
                <span>Çalışma Odası</span>
                <span className="nav-hot-badge">YENİ</span>
              </NavLink>
              <NavLink to="/student" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}>
                  <GraduationCap size={16} color="white" />
                </div>
                <span>Öğrenci Paneli</span>
              </NavLink>
              <NavLink to="/student/homeworks" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', boxShadow: '0 2px 10px rgba(239,68,68,0.35)' }}>
                  <BookMarked size={16} color="white" />
                </div>
                <span>Ödevlerim</span>
              </NavLink>
              <NavLink to="/student/summaries" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 10px rgba(16,185,129,0.35)' }}>
                  <BookOpen size={16} color="white" />
                </div>
                <span>Ders Özetleri</span>
              </NavLink>
              <NavLink to="/student/books" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 2px 10px rgba(8,145,178,0.35)' }}>
                  <BookMarked size={16} color="white" />
                </div>
                <span>Kitaplarım</span>
              </NavLink>
              <NavLink to="/student/exams" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', boxShadow: '0 2px 10px rgba(124,58,237,0.35)' }}>
                  <ClipboardCheck size={16} color="white" />
                </div>
                <span>Denemelerim</span>
              </NavLink>
              <NavLink to="/student-results" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 2px 10px rgba(79,70,229,0.35)' }}>
                  <Award size={16} color="white" />
                </div>
                <span>Sonuçlarım</span>
              </NavLink>
              <NavLink to="/wrong-answers" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #e11d48, #f43f5e)', boxShadow: '0 2px 10px rgba(225,29,72,0.35)' }}>
                  <AlertTriangle size={16} color="white" />
                </div>
                <span>Hatalarım</span>
              </NavLink>
              <NavLink to="/my-program" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #9333ea, #c084fc)', boxShadow: '0 2px 10px rgba(147,51,234,0.35)' }}>
                  <Calendar size={16} color="white" />
                </div>
                <span>Programım</span>
              </NavLink>
              <NavLink to="/goals" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)', boxShadow: '0 2px 10px rgba(234,88,12,0.35)' }}>
                  <Target size={16} color="white" />
                </div>
                <span>Hedefler & Program</span>
              </NavLink>
              {currentUser?.role === 'student' && isStudentCoached(currentUser?.id) && (
                <NavLink to="/my-coaching" className="nav-link" onClick={closeSidebar}>
                  <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 2px 10px rgba(217,119,6,0.35)', fontSize: '1rem' }}>
                    📂
                  </div>
                  <span>Koçluk Dosyam</span>
                </NavLink>
              )}
            </>
          )}

          {/* Öğretmen ve Admin Paneli */}
          {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
            <NavLink to="/teacher" className="nav-link" onClick={closeSidebar}>
              <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}>
                <Users size={16} color="white" />
              </div>
              <span>Öğretmen Paneli</span>
            </NavLink>
          )}

          {/* Modüller: Sadece Öğretmen ve Admin Görebilir */}
          {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
            <>
              <div className="nav-section-title">Modüller</div>
              <NavLink to="/summaries" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 10px rgba(16,185,129,0.35)' }}>
                  <BookOpen size={16} color="white" />
                </div>
                <span>Ders Özetleri</span>
              </NavLink>
              <NavLink to="/physical-exam" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 2px 10px rgba(124,58,237,0.35)' }}>
                  <ClipboardCheck size={16} color="white" />
                </div>
                <span>Fiziki Deneme & Optik</span>
              </NavLink>
              <NavLink to="/statistics" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 2px 10px rgba(8,145,178,0.35)' }}>
                  <BarChart2 size={16} color="white" />
                </div>
                <span>İstatistik & Analiz</span>
              </NavLink>
              <NavLink to="/homeworks" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)', boxShadow: '0 2px 10px rgba(234,88,12,0.35)' }}>
                  <BookMarked size={16} color="white" />
                </div>
                <span>Ödevler</span>
              </NavLink>
              <NavLink to="/evaluations" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 10px rgba(16,185,129,0.35)' }}>
                  <ClipboardCheck size={16} color="white" />
                </div>
                <span>Değerlendirmeler</span>
              </NavLink>
              <NavLink to="/questions" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 2px 10px rgba(79,70,229,0.35)' }}>
                  <Database size={16} color="white" />
                </div>
                <span>Soru Bankası</span>
              </NavLink>
              <NavLink to="/books" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8)', boxShadow: '0 2px 10px rgba(2,132,199,0.35)' }}>
                  <BookMarked size={16} color="white" />
                </div>
                <span>Kitap Takibi</span>
              </NavLink>
              <NavLink to="/study-plans" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', boxShadow: '0 2px 10px rgba(139,92,246,0.35)' }}>
                  <Map size={16} color="white" />
                </div>
                <span>Yol Haritası</span>
              </NavLink>
              <NavLink to="/scales" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #db2777, #f43f5e)', boxShadow: '0 2px 10px rgba(219,39,119,0.35)' }}>
                  <ListTree size={16} color="white" />
                </div>
                <span>Ölçek & Takip</span>
              </NavLink>
            </>
          )}

          {/* Admin Tuşu: Sadece Admin Görebilir */}
          {currentUser?.role === 'admin' && (
            <>
              <div className="nav-section-title">Yönetim</div>
              <NavLink to="/admin" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #475569, #64748b)', boxShadow: '0 2px 10px rgba(71,85,105,0.35)' }}>
                  <Settings size={16} color="white" />
                </div>
                <span>Admin</span>
              </NavLink>
            </>
          )}
        </div>

      </nav>
    </>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const hideSidebarRoutes = ['/quiz/', '/book-quiz/', '/review/', '/login', '/physical-exam/', '/study-room'];
  const isLandingPage = location.pathname === '/';
  const isQuizRoute = hideSidebarRoutes.some(route => location.pathname.startsWith(route));
  const shouldHideSidebar = !currentUser || isLandingPage || isQuizRoute;

  useEffect(() => {
    initNativeApp(navigate);
  }, []);

  return (
    <div className={`app-container ${shouldHideSidebar ? 'no-sidebar' : ''} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {!shouldHideSidebar && (
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          setIsCollapsed={setIsSidebarCollapsed} 
        />
      )}

      <main className="main-content">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={
                currentUser ? (
                  currentUser.role === 'admin' ? <Navigate to="/admin" replace /> :
                  currentUser.role === 'teacher' ? <Navigate to="/teacher" replace /> :
                  <Navigate to="/student" replace />
                ) : <Landing />
              } />
              <Route path="/landing" element={<Landing />} />
              <Route path="/admin" element={<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>} />
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/homeworks" element={<StudentHomeworksPage />} />
              <Route path="/study-room" element={<StudyRoomPage />} />
              <Route path="/student/study-room" element={<StudyRoomPage />} />
              <Route path="/student/summaries" element={<StudentSummaryPage />} />
              <Route path="/summaries" element={<SummaryManagerPage />} />
              <Route path="/student/books" element={<StudentBooksPage />} />
              <Route path="/student/books/:bookId" element={<StudentBookDetailsPage />} />
              <Route path="/book-details/:bookId" element={<StudentBookDetailsPage />} />
              <Route path="/student/exams" element={<StudentExamsPage />} />
              <Route path="/student/exams/:bookId" element={<StudentBookDetailsPage />} />
              <Route path="/homeworks" element={<HomeworkManager />} />
              <Route path="/evaluations" element={<EvaluationManager />} />
              <Route path="/questions" element={<QuestionBank />} />
              <Route path="/quiz/:testId" element={<ModularQuizPage />} />
              <Route path="/book-quiz/:testId" element={<TrackedBookQuizRunner />} />
              <Route path="/quiz-review/:testId" element={<ModularQuizReviewPage />} />
              <Route path="/review/:submissionId" element={<ModularQuizReviewPage />} />
              <Route path="/books" element={<BookManager />} />
              <Route path="/books/:id" element={<BookContentManager />} />
              <Route path="/study-plans" element={<StudyPlanManager />} />
              <Route path="/study-plans/:id" element={<StudyPlanDetail />} />
              <Route path="/student/study-plan/:assignmentId" element={<StudentStudyPlanView />} />
              <Route path="/statistics" element={<StatisticsDashboard />} />
              <Route path="/goals" element={<GoalsAndSchedulePage />} />
              <Route path="/student/goals" element={<GoalsAndSchedulePage />} />
              <Route path="/student/results" element={<StudentResultsPage />} />
              <Route path="/student-results" element={<StudentResultsPage />} />
              <Route path="/results" element={<StudentResultsPage />} />
              <Route path="/wrong-answers" element={<StudentWrongAnswersPage />} />
              <Route path="/student/wrong-answers" element={<StudentWrongAnswersPage />} />
              <Route path="/my-program" element={<StudentProgramPage />} />
              <Route path="/student/program" element={<StudentProgramPage />} />
              <Route path="/coaching/:studentId" element={<StudentCoachingPage />} />
              <Route path="/my-coaching" element={<MyCoachingPage />} />
              <Route path="/physical-exam" element={<ExamManager />} />
              <Route path="/scales" element={<ScalePage />} />
              <Route path="/exam-analysis/:examId" element={<ExamAnalysisPage />} />
              <Route path="/physical-exam/:hwId" element={<PhysicalExamRunner />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      
      {!shouldHideSidebar && <MobileBottomNav />}
    </div>
  );
}

export default function App() {
  return <AppContent />;
}