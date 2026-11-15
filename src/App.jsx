import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, NavLink, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { initNativeApp } from './services/nativeMobileService';
import MobileBottomNav from './components/MobileBottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  GraduationCap, Users, Settings, Menu, X, BookOpen, 
  Target, BarChart2, ClipboardCheck, Database, BookMarked, Map, AlertCircle, LogIn, LogOut, ListTree, Award, AlertTriangle, Calendar,
  PanelLeftClose, PanelLeftOpen, Headphones, Search, Sparkles, Sun, Moon, Clock3, ShieldCheck, Scissors,
  Compass, Rocket, Flame, ChevronRight, LayoutGrid, ChevronDown, FileText
} from 'lucide-react';
import ToastContainer from './components/ui/Toast';
import CommandPalette from './components/CommandPalette';
import { useTheme } from './context/ThemeContext';
import { useMediaQuery } from './hooks/useMediaQuery';

import Landing from './pages/Landing';

// Code-split lazy loaded pages
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentBooksPage = lazy(() => import('./pages/StudentBooksPage'));
const ReadingTrackerPage = lazy(() => import('./pages/ReadingTrackerPage'));
const GoalsAndSchedulePage = lazy(() => import('./pages/GoalsAndSchedulePage'));
const StudentProgramPage = lazy(() => import('./pages/StudentProgramPage'));
const StudentResultsPage = lazy(() => import('./pages/StudentResultsPage'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Secondary / Heavy Lazy Loaded Pages
const StudentBookDetailsPage = lazy(() => import('./pages/StudentBookDetailsPage'));
const HomeworkManager = lazy(() => import('./pages/HomeworkManager'));
const RemedialTrackerPage = lazy(() => import('./pages/RemedialTrackerPage'));
const EvaluationManager = lazy(() => import('./pages/EvaluationManager'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));
const ModularQuizPage = lazy(() => import('./pages/ModularQuizPage'));
const ModularQuizReviewPage = lazy(() => import('./pages/ModularQuizReviewPage'));
const BookManager = lazy(() => import('./pages/BookManager'));
const BookContentManager = lazy(() => import('./pages/BookContentManager'));
const StudyPlanManager = lazy(() => import('./pages/StudyPlanManager'));
const StudyPlanDetail = lazy(() => import('./pages/StudyPlanDetail'));
const StatisticsDashboard = lazy(() => import('./pages/StatisticsDashboard'));
const StudentExamsPage = lazy(() => import('./pages/StudentExamsPage'));
const StudentWrongAnswersPage = lazy(() => import('./pages/StudentWrongAnswersPage'));
const StudentStudyPlanView = lazy(() => import("./pages/StudentStudyPlanView"));
const StudentCoachingPage = lazy(() => import('./pages/StudentCoachingPage'));
const MyCoachingPage = lazy(() => import('./pages/MyCoachingPage'));
const ExamManager = lazy(() => import('./pages/ExamManager'));
const ExamAnalysisPage = lazy(() => import('./pages/ExamAnalysisPage'));
const PhysicalExamRunner = lazy(() => import('./pages/PhysicalExamRunner'));
const TrackedBookQuizRunner = lazy(() => import('./pages/TrackedBookQuizRunner'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ScalePage = lazy(() => import('./pages/ScalePage'));
const SummaryManagerPage = lazy(() => import('./pages/SummaryManagerPage'));
const StudentSummaryPage = lazy(() => import('./pages/StudentSummaryPage'));
const StudentHomeworksPage = lazy(() => import('./pages/StudentHomeworksPage'));
const StudyRoomPage = lazy(() => import('./pages/StudyRoomPage'));
const PdfQuestionSlicerPage = lazy(() => import('./pages/PdfQuestionSlicerPage'));

// One-time automatic cache bust for clean database sync
const APP_CACHE_VERSION = 'v2026_08_30_clean_hw_v3';
try {
  if (localStorage.getItem('eTestAppCacheVersion') !== APP_CACHE_VERSION) {
    localStorage.removeItem('eTestTrackedBooks');
    localStorage.removeItem('eTestTrackedBookTests');
    localStorage.removeItem('eTestHomeworks');
    localStorage.removeItem('eTestDeletedHomeworks');
    localStorage.removeItem('eTestSubmissions');
    localStorage.removeItem('eTestDeletedSubmissions');
    localStorage.setItem('eTestAppCacheVersion', APP_CACHE_VERSION);
  }
} catch {}

function PageLoader() {
  return (
    <div style={{
      minHeight: '65vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      color: 'var(--color-primary, #818cf8)',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    }}>
      <div style={{
        width: 42,
        height: 42,
        border: '3.5px solid rgba(129, 140, 248, 0.2)',
        borderTopColor: '#818cf8',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite'
      }} />
      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--color-text-muted, rgba(255,255,255,0.75))', letterSpacing: '0.04em' }}>
        Yükleniyor…
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import { useAuth } from './context/AuthContext';
import { useCoaching } from './context/CoachingContext';
import { useEvaluation } from './context/EvaluationContext';
import { useHomework } from './context/HomeworkContext';
import { isHomeworkForStudent } from './utils/testResolver';
import { toUUID } from './services/supabaseService';
import './App.css';

// Sayfa JS dosyalarını kullanıcının rolüne göre arka planda sessizce önceden yükle
const preloadRolePages = (role) => {
  if (role === 'teacher') {
    setTimeout(() => { try { import('./pages/TeacherDashboard'); } catch {} }, 350);
    setTimeout(() => { try { import('./pages/HomeworkManager'); } catch {} }, 700);
  } else if (role === 'admin') {
    setTimeout(() => { try { import('./pages/AdminDashboard'); } catch {} }, 350);
    setTimeout(() => { try { import('./pages/TeacherDashboard'); } catch {} }, 700);
  } else {
    setTimeout(() => { try { import('./pages/StudentDashboard'); } catch {} }, 250);
    setTimeout(() => { try { import('./pages/ReadingTrackerPage'); } catch {} }, 450);
    setTimeout(() => { try { import('./pages/StudentBooksPage'); } catch {} }, 600);
    setTimeout(() => { try { import('./pages/StudentHomeworksPage'); } catch {} }, 1000);
  }
};

// Route guards: redirects to '/' if user is not logged in or doesn't have the required role
function RequireAuth({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RequireRole({ roles, children }) {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  if (!roles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

const Sidebar = React.memo(function Sidebar({ isCollapsed, setIsCollapsed }) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const { isStudentCoached, mockExams = [] } = useCoaching();
  const { submissions = [] } = useEvaluation();
  const { theme, isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsOpen(prev => !prev);
  const closeSidebar = () => setIsOpen(false);

  // Close sidebar on page change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);
  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try { 
        if (currentUser?.role) {
          localStorage.setItem(`sidebar_collapsed_${currentUser.role}`, JSON.stringify(next));
        }
        localStorage.setItem('sidebar_collapsed', JSON.stringify(next)); 
      } catch {}
      return next;
    });
  };

  const { homeworks = [] } = useHomework();

  const studentOverdueBadgeCount = React.useMemo(() => {
    if (!currentUser || currentUser.role !== 'student') return 0;
    const studentId = String(currentUser.id);
    const studentUuid = String(toUUID(currentUser.id) || '');
    const nowZero = new Date();
    nowZero.setHours(0, 0, 0, 0);

    // Pre-index student's solved test IDs in O(N) once, instead of nested O(N*M) .some() searches
    const solvedSet = new Set();
    (submissions || []).forEach(s => {
      if (!s) return;
      const sid = String(s.studentId || s.userId || '');
      if (sid !== studentId && (studentUuid && sid !== studentUuid) && (studentUuid && toUUID(sid) !== studentUuid)) return;
      if (s.status === 'in_progress' || s.status === 'draft') return;
      if (s.isManual && (s.approvalStatus === 'pending' || s.approvalStatus === 'rejected')) return;

      const ids = [s.testId, s.realTestId, s.bookTestId, s.homeworkId, s.hwId, s.id, s.supabaseId];
      ids.forEach(id => {
        if (id) {
          const str = String(id);
          solvedSet.add(str);
          solvedSet.add(str.replace(/^bt_/, '').replace(/^q_/, ''));
        }
      });
      if (Array.isArray(s.bookTestIds)) {
        s.bookTestIds.forEach(id => {
          if (id) {
            const str = String(id);
            solvedSet.add(str);
            solvedSet.add(str.replace(/^bt_/, '').replace(/^q_/, ''));
          }
        });
      }
    });

    const isTestSolved = (tId, hId) => {
      if (tId && (solvedSet.has(String(tId)) || solvedSet.has(String(tId).replace(/^bt_/, '').replace(/^q_/, '')))) return true;
      if (hId && (solvedSet.has(String(hId)) || solvedSet.has(String(hId).replace(/^hw_/, '')))) return true;
      return false;
    };

    let count = 0;
    const seen = new Set();

    (homeworks || []).forEach(hw => {
      if (!hw || !isHomeworkForStudent(hw, currentUser, [])) return;

      if (Array.isArray(hw.tests) && hw.tests.length > 0) {
        hw.tests.forEach(t => {
          const tDate = t.dueDate || hw.dueDate;
          if (!tDate) return;
          const dObj = new Date(tDate);
          if (isNaN(dObj.getTime()) || dObj >= nowZero) return;
          const tId = t.testId || t.id;
          if (!tId || isTestSolved(tId, hw.id)) return;
          const k = `t_${tId}`;
          if (!seen.has(k)) { seen.add(k); count++; }
        });
      } else {
        const dObj = hw.dueDate ? new Date(hw.dueDate) : null;
        if (!dObj || isNaN(dObj.getTime()) || dObj >= nowZero) return;
        const hwKey = `hw_${hw.id}`;
        if (!seen.has(hwKey) && !isTestSolved(hw.id, hw.id)) {
          seen.add(hwKey);
          count++;
        }
      }
    });

    return count;
  }, [currentUser, homeworks, submissions]);

  const pendingApprovalsCount = React.useMemo(() => {
    if (!currentUser || (currentUser.role !== 'teacher' && currentUser.role !== 'admin')) return 0;
    const manualTests = (submissions || []).filter(s => {
      if (!s || s.status === 'draft' || s.status === 'in_progress') return false;
      if (s.sourceType === 'trackedBook' || s.sourceType === 'online_quiz' || s.sourceType === 'modular_quiz' || s.sourceType === 'physical_exam' || s.sourceType === 'exam') return false;
      const isManual = Boolean(s.isManual === true || s.sourceType === 'manual_test' || String(s.id || '').startsWith('sub_manual') || String(s.testId || '').startsWith('sub_manual'));
      return isManual && (
        s.approvalStatus === 'pending' ||
        s.status === 'pending_approval' ||
        (s.isApproved === false && s.approvalStatus !== 'rejected')
      );
    }).length;

    const manualMocks = (mockExams || []).filter(m => {
      return m.approvalStatus === 'pending' || (m.createdBy === 'student' && m.approvalStatus !== 'approved' && m.approvalStatus !== 'rejected');
    }).length;

    return manualTests + manualMocks;
  }, [submissions, mockExams, currentUser]);

  const isMobile = useMediaQuery('(max-width: 1024px)');

  const openSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  };

  return (
    <>
      <div className="mobile-header">
        <Link to="/" className="tready-brand-link" onClick={closeSidebar}>
          <div className="tready-brand-logo" style={{ width: 36, height: 36, borderRadius: 11 }}>
            <Rocket size={18} color="#ffffff" />
          </div>
          <div className="tready-brand-info">
            <span className="tready-brand-title" style={{ fontSize: '1.1rem' }}>E-Test</span>
            <span className="tready-brand-sub" style={{ fontSize: '0.72rem' }}>5. Sınıf Maarif Modeli</span>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={toggleTheme}
            style={{
              background: 'var(--sidebar-card-bg)',
              border: '1px solid var(--sidebar-card-border)',
              color: isDark ? '#fbbf24' : '#6366f1',
              borderRadius: '0.65rem',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title={isDark ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="mobile-menu-btn" onClick={toggleSidebar}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={closeSidebar}></div>

      <nav className={`sidebar ${isOpen ? 'open' : ''} ${!isMobile && isCollapsed ? 'collapsed' : ''}`}>
        {/* TOP BRAND & SEARCH */}
        {!isMobile && isCollapsed ? (
          // RAIL HEADER (Left in image)
          <div className="tready-rail-header">
            <button 
              type="button" 
              onClick={toggleCollapse} 
              className="tready-brand-logo" 
              title="Menüyü Genişlet"
            >
              <Rocket size={22} color="#ffffff" />
            </button>
            <button 
              type="button"
              onClick={openSearch}
              className="tready-rail-search-btn"
              data-tooltip="Arama (Ctrl K)"
              title="Arama (Ctrl K)"
            >
              <Search size={18} />
            </button>
            <div className="tready-rail-dot" />
          </div>
        ) : (
          // EXPANDED HEADER (Right in image)
          <>
            <div className="tready-sidebar-header">
              <Link to="/" className="tready-brand-link" onClick={closeSidebar}>
                <div className="tready-brand-logo">
                  <GraduationCap size={22} color="#ffffff" />
                </div>
                <div className="tready-brand-info">
                  <div className="tready-brand-title">E-Test</div>
                  <div className="tready-brand-sub">
                    {currentUser?.role === 'student' ? 'Daha fazlasını öğren!' : currentUser?.role === 'teacher' ? 'Öğretmen Portalı' : 'Yönetim Paneli'}
                  </div>
                </div>
              </Link>
              <button 
                type="button"
                onClick={isMobile ? closeSidebar : toggleCollapse}
                className="tready-header-toggle-btn"
                title={isMobile ? "Menüyü Kapat" : "Menüyü Daralt"}
              >
                {isMobile ? <X size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {/* SEARCH BAR (Matching image: Search input + ⌘ F badge) */}
            <div 
              className="tready-search-bar"
              onClick={openSearch}
              title="Arama (Ctrl K)"
            >
              <div className="tready-search-inner">
                <Search size={16} className="tready-search-icon" />
                <span className="tready-search-placeholder">Search</span>
              </div>
              <kbd className="tready-search-kbd">⌘ F</kbd>
            </div>
          </>
        )}

        {/* NAVIGATION ITEMS */}
        <div className="tready-nav-container custom-scrollbar">
          {currentUser?.role === 'student' && (
            <>
              <div className="tready-section-title">MENÜ</div>
              <NavLink 
                to="/student" 
                end 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Ana Sayfa"
              >
                <div className="tready-nav-icon"><LayoutGrid size={19} /></div>
                <span className="tready-nav-label">Ana Sayfa</span>
              </NavLink>

              <NavLink 
                to="/my-program" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Çalışma Planım"
              >
                <div className="tready-nav-icon"><Calendar size={19} /></div>
                <span className="tready-nav-label">Çalışma Planım</span>
              </NavLink>

              <NavLink 
                to="/student/books" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Kitaplarım"
              >
                <div className="tready-nav-icon"><BookOpen size={19} /></div>
                <span className="tready-nav-label">Kitaplarım</span>
              </NavLink>

              <NavLink 
                to="/student/homeworks" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Ödevlerim"
              >
                <div className="tready-nav-icon"><BookMarked size={19} /></div>
                <span className="tready-nav-label">Ödevlerim</span>
                {studentOverdueBadgeCount > 0 && (
                  <span className="tready-nav-badge">🔥 {studentOverdueBadgeCount}</span>
                )}
              </NavLink>

              <NavLink 
                to="/student-results" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Sonuçlarım"
              >
                <div className="tready-nav-icon"><BarChart2 size={19} /></div>
                <span className="tready-nav-label">Sonuçlarım</span>
              </NavLink>

              <NavLink 
                to="/study-room" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Çalışma Odası"
              >
                <div className="tready-nav-icon"><Headphones size={19} /></div>
                <span className="tready-nav-label">Çalışma Odası</span>
                <span className="tready-nav-badge" style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#6366f1' }}>CANLI</span>
              </NavLink>

              <div className="tready-section-title">DİĞER MODÜLLER</div>

              <NavLink 
                to="/student/roadmap" 
                className={({ isActive }) => `tready-nav-link ${(isActive || location.pathname.startsWith('/student/study-plan')) ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Yol Haritası"
              >
                <div className="tready-nav-icon"><Compass size={19} /></div>
                <span className="tready-nav-label">Yol Haritası</span>
              </NavLink>

              {isStudentCoached(currentUser?.id) && (
                <NavLink 
                  to="/my-coaching" 
                  className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeSidebar}
                  data-tooltip="Koçluk Dosyam"
                >
                  <div className="tready-nav-icon"><Target size={19} /></div>
                  <span className="tready-nav-label">Koçluk Dosyam</span>
                </NavLink>
              )}

              <NavLink 
                to="/student/reading" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Kitap Okuma"
              >
                <div className="tready-nav-icon"><BookMarked size={19} /></div>
                <span className="tready-nav-label">Kitap Okuma</span>
              </NavLink>

              <NavLink 
                to="/student/summaries" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Ders Özetleri"
              >
                <div className="tready-nav-icon"><FileText size={19} /></div>
                <span className="tready-nav-label">Ders Özetleri</span>
              </NavLink>

              <NavLink 
                to="/student/exams" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Denemelerim"
              >
                <div className="tready-nav-icon"><Award size={19} /></div>
                <span className="tready-nav-label">Denemelerim</span>
              </NavLink>

              <NavLink 
                to="/wrong-answers" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Hatalarım &amp; Boşlarım"
              >
                <div className="tready-nav-icon"><AlertTriangle size={19} /></div>
                <span className="tready-nav-label">Hatalarım &amp; Boşlarım</span>
              </NavLink>
            </>
          )}

          {/* TEACHER / ADMIN */}
          {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
            <>
              <div className="tready-section-title">MAIN MENU</div>
              <NavLink 
                to="/teacher" 
                end 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Ana Sayfa"
              >
                <div className="tready-nav-icon"><LayoutGrid size={19} /></div>
                <span className="tready-nav-label">Ana Sayfa</span>
              </NavLink>

              <NavLink 
                to="/approvals" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Onay Merkezi"
              >
                <div className="tready-nav-icon"><ShieldCheck size={19} /></div>
                <span className="tready-nav-label">Onay Merkezi</span>
                {pendingApprovalsCount > 0 && (
                  <span className="tready-nav-badge" style={{ background: '#ff1493', color: 'white' }}>
                    {pendingApprovalsCount}
                  </span>
                )}
              </NavLink>

              <NavLink 
                to="/homeworks" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Ödev Yönetimi"
              >
                <div className="tready-nav-icon"><BookMarked size={19} /></div>
                <span className="tready-nav-label">Ödev Yönetimi</span>
              </NavLink>

              <NavLink 
                to="/remedials" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Telafi &amp; Ustalık"
              >
                <div className="tready-nav-icon"><Scissors size={19} /></div>
                <span className="tready-nav-label">Telafi &amp; Ustalık</span>
              </NavLink>

              <NavLink 
                to="/evaluations" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Değerlendirmeler"
              >
                <div className="tready-nav-icon"><ClipboardCheck size={19} /></div>
                <span className="tready-nav-label">Değerlendirmeler</span>
              </NavLink>

              <NavLink 
                to="/physical-exam" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Fiziki Deneme &amp; Optik"
              >
                <div className="tready-nav-icon"><ClipboardCheck size={19} /></div>
                <span className="tready-nav-label">Fiziki Deneme &amp; Optik</span>
              </NavLink>

              <div className="tready-section-title">İÇERİK &amp; HAVUZ</div>

              <NavLink 
                to="/questions" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Soru Bankası"
              >
                <div className="tready-nav-icon"><Database size={19} /></div>
                <span className="tready-nav-label">Soru Bankası</span>
              </NavLink>

              <NavLink 
                to="/books" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Kitap Takip"
              >
                <div className="tready-nav-icon"><BookOpen size={19} /></div>
                <span className="tready-nav-label">Kitap Takip</span>
              </NavLink>

              <NavLink 
                to="/summaries" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Ders Özetleri Editörü"
              >
                <div className="tready-nav-icon"><FileText size={19} /></div>
                <span className="tready-nav-label">Ders Özetleri</span>
              </NavLink>

              <NavLink 
                to="/reading" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Kitap Okuma"
              >
                <div className="tready-nav-icon"><BookMarked size={19} /></div>
                <span className="tready-nav-label">Kitap Okuma</span>
              </NavLink>

              <NavLink 
                to="/study-plans" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Yol Haritası"
              >
                <div className="tready-nav-icon"><Map size={19} /></div>
                <span className="tready-nav-label">Yol Haritası</span>
              </NavLink>

              <NavLink 
                to="/scales" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Ölçek &amp; Takip"
              >
                <div className="tready-nav-icon"><ListTree size={19} /></div>
                <span className="tready-nav-label">Ölçek &amp; Takip</span>
              </NavLink>

              <div className="tready-section-title">ANALİZ &amp; SİSTEM</div>

              <NavLink 
                to="/student-results" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="Tüm Sonuçlar &amp; Karne"
              >
                <div className="tready-nav-icon"><Award size={19} /></div>
                <span className="tready-nav-label">Tüm Sonuçlar</span>
              </NavLink>

              <NavLink 
                to="/statistics" 
                className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
                data-tooltip="İstatistik &amp; Analiz"
              >
                <div className="tready-nav-icon"><BarChart2 size={19} /></div>
                <span className="tready-nav-label">İstatistik</span>
              </NavLink>

              {currentUser?.role === 'admin' && (
                <NavLink 
                  to="/admin" 
                  className={({ isActive }) => `tready-nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeSidebar}
                  data-tooltip="Admin Kontrolü"
                >
                  <div className="tready-nav-icon"><Settings size={19} /></div>
                  <span className="tready-nav-label">Admin Kontrolü</span>
                </NavLink>
              )}
            </>
          )}
        </div>

        {/* BOTTOM USER / PROFILE & CONTROLS */}
        {!isMobile && isCollapsed ? (
          // RAIL FOOTER
          <div className="tready-sidebar-footer">
            <button 
              type="button"
              onClick={toggleTheme}
              className="tready-rail-btn"
              data-tooltip={isDark ? 'Açık Tema' : 'Koyu Tema'}
              title={isDark ? 'Açık Tema' : 'Koyu Tema'}
            >
              {isDark ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#cbd5e1" />}
            </button>
            <button 
              type="button"
              onClick={toggleCollapse}
              className="tready-rail-btn"
              data-tooltip="Menüyü Genişlet"
              title="Menüyü Genişlet"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          // EXPANDED FOOTER
          <div className="tready-sidebar-footer">
            {currentUser?.role === 'student' && (
              <div 
                style={{
                  margin: '4px 6px 12px',
                  padding: '16px 12px 14px',
                  background: isDark 
                    ? 'linear-gradient(180deg, rgba(30, 27, 75, 0.75) 0%, rgba(49, 46, 129, 0.6) 100%)' 
                    : 'linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%)',
                  borderRadius: 20,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  border: isDark ? '1.5px solid rgba(129, 140, 248, 0.35)' : '1.5px solid rgba(199, 210, 254, 0.8)',
                  boxShadow: isDark ? '0 10px 24px rgba(0,0,0,0.35)' : '0 10px 24px rgba(99, 102, 241, 0.08)'
                }}
              >
                <div style={{ width: 50, height: 50, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 4px 8px rgba(245, 158, 11, 0.4))' }}>🏆</span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isDark ? '#e0e7ff' : '#1e1b4b', lineHeight: 1.35 }}>
                  Hedeflerine odaklan, başaracaksın!
                </div>
              </div>
            )}

            {currentUser ? (
              <div className="tready-user-card">
                <div className="tready-user-avatar">
                  {currentUser.name?.charAt(0).toUpperCase()}
                </div>
                <div className="tready-user-meta">
                  <div className="tready-user-name">{currentUser.name}</div>
                  <div className="tready-user-role">
                    {currentUser.role === 'student' ? 'Öğrenci' : currentUser.role === 'teacher' ? 'Öğretmen' : 'Yönetici'}
                  </div>
                </div>
                <div className="tready-footer-actions">
                  <button 
                    type="button"
                    onClick={toggleTheme}
                    className="tready-footer-btn"
                    title={isDark ? 'Açık Tema' : 'Koyu Tema'}
                  >
                    {isDark ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#cbd5e1" />}
                  </button>
                  <button 
                    type="button"
                    onClick={async () => {
                      closeSidebar();
                      await logout();
                      navigate('/', { replace: true });
                    }}
                    className="tready-footer-btn logout"
                    title="Oturumu Kapat"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" onClick={closeSidebar} style={{ textDecoration: 'none' }}>
                <button style={{ width: '100%', padding: '0.65rem', borderRadius: '14px', background: 'linear-gradient(135deg, #ff1493, #db0074)', color: 'white', fontWeight: 700, fontSize: '0.84rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', boxShadow: '0 4px 16px rgba(240,24,138,0.4)' }}>
                  <LogIn size={15} /> Giriş Yap
                </button>
              </Link>
            )}
          </div>
        )}
      </nav>
    </>
  );
});

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) return JSON.parse(saved);
      // Öğrenci için masaüstünde de varsayılan olarak gizli (collapsed) gelsin
      return true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!currentUser) return;
    try {
      const roleKey = `sidebar_collapsed_${currentUser.role}`;
      const savedRolePref = localStorage.getItem(roleKey);
      if (savedRolePref !== null) {
        setIsSidebarCollapsed(JSON.parse(savedRolePref));
      } else {
        // Öğrenci için varsayılan gizli (collapsed), öğretmen/yönetici için varsayılan açık
        if (currentUser.role === 'student') {
          setIsSidebarCollapsed(true);
        } else {
          setIsSidebarCollapsed(false);
        }
      }
    } catch {}
  }, [currentUser?.role, currentUser?.id]);

  const hideSidebarRoutes = ['/quiz/', '/book-quiz/', '/review/', '/quiz-review/', '/login', '/physical-exam/', '/study-room', '/pdf-slicer', '/slicer', '/student/pdf-slicer'];
  const isLandingPage = location.pathname === '/' && !currentUser;
  const isLoginPage = location.pathname === '/login' || location.pathname === '/landing';
  const isQuizRoute = hideSidebarRoutes.some(route => location.pathname.startsWith(route));
  const shouldHideSidebar = !currentUser || isLandingPage || isLoginPage || isQuizRoute;
  const shouldShowBottomNav = Boolean(currentUser && !isLoginPage && !isLandingPage && !isQuizRoute);

  useEffect(() => {
    initNativeApp(navigate);
    // Kullanıcı giriş yaptıysa rolüne özel sayfaları arka planda yükle
    if (currentUser?.role) preloadRolePages(currentUser.role);

    const handleWidgetNavigate = (e) => {
      const targetUrl = e?.detail?.url;
      if (targetUrl) {
        navigate(targetUrl);
      }
    };
    window.addEventListener('widget_navigate', handleWidgetNavigate);

    // Auto-scroll inputs/textareas into view above mobile virtual keyboard
    const handleFocusIn = (e) => {
      const target = e.target;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        setTimeout(() => {
          try {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (ignored) {}
        }, 320);
      }
    };
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.removeEventListener('widget_navigate', handleWidgetNavigate);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [navigate]);

  return (
    <div className={`app-container ${shouldHideSidebar ? 'no-sidebar' : ''} ${shouldShowBottomNav ? 'has-bottom-nav' : 'no-bottom-nav'} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
              <Route path="/teacher" element={<RequireRole roles={['teacher', 'admin']}><TeacherDashboard /></RequireRole>} />
              <Route path="/student" element={<RequireRole roles={['student', 'admin', 'teacher']}><StudentDashboard /></RequireRole>} />
              <Route path="/student/homeworks" element={<RequireAuth><StudentHomeworksPage /></RequireAuth>} />
              <Route path="/study-room" element={<RequireAuth><StudyRoomPage /></RequireAuth>} />
              <Route path="/student/study-room" element={<RequireAuth><StudyRoomPage /></RequireAuth>} />
              <Route path="/student/summaries" element={<RequireAuth><StudentSummaryPage /></RequireAuth>} />
              <Route path="/summaries" element={<RequireRole roles={['teacher', 'admin']}><SummaryManagerPage /></RequireRole>} />
              <Route path="/student/reading" element={<RequireAuth><ReadingTrackerPage /></RequireAuth>} />
              <Route path="/reading" element={<RequireAuth><ReadingTrackerPage /></RequireAuth>} />
              <Route path="/student/books" element={<RequireAuth><StudentBooksPage /></RequireAuth>} />
              <Route path="/student/books/:bookId" element={<RequireAuth><StudentBookDetailsPage /></RequireAuth>} />
              <Route path="/book-details/:bookId" element={<RequireAuth><StudentBookDetailsPage /></RequireAuth>} />
              <Route path="/student/exams" element={<RequireAuth><StudentExamsPage /></RequireAuth>} />
              <Route path="/student/exams/:bookId" element={<RequireAuth><StudentBookDetailsPage /></RequireAuth>} />
              <Route path="/homeworks" element={<RequireRole roles={['teacher', 'admin']}><HomeworkManager /></RequireRole>} />
              <Route path="/remedials" element={<RequireRole roles={['teacher', 'admin']}><RemedialTrackerPage /></RequireRole>} />
              <Route path="/telafi-takip" element={<Navigate to="/remedials" replace />} />
              <Route path="/approvals" element={<RequireRole roles={['teacher', 'admin']}><ApprovalsPage /></RequireRole>} />
              <Route path="/onaylar" element={<Navigate to="/approvals" replace />} />
              <Route path="/evaluations" element={<RequireRole roles={['teacher', 'admin']}><EvaluationManager /></RequireRole>} />
              <Route path="/evaluation" element={<Navigate to="/evaluations" replace />} />
              <Route path="/questions" element={<RequireRole roles={['teacher', 'admin']}><QuestionBank /></RequireRole>} />
              <Route path="/quiz/:testId" element={<RequireAuth><ModularQuizPage /></RequireAuth>} />
              <Route path="/book-quiz/:testId" element={<RequireAuth><TrackedBookQuizRunner /></RequireAuth>} />
              <Route path="/quiz-review/:testId" element={<RequireAuth><ModularQuizReviewPage /></RequireAuth>} />
              <Route path="/review/:submissionId" element={<RequireAuth><ModularQuizReviewPage /></RequireAuth>} />
              <Route path="/books" element={<RequireRole roles={['teacher', 'admin']}><BookManager /></RequireRole>} />
              <Route path="/books/:id" element={<RequireRole roles={['teacher', 'admin']}><BookContentManager /></RequireRole>} />
              <Route path="/study-plans" element={<RequireRole roles={['teacher', 'admin']}><StudyPlanManager /></RequireRole>} />
              <Route path="/study-plans/:id" element={<RequireRole roles={['teacher', 'admin']}><StudyPlanDetail /></RequireRole>} />
              <Route path="/student/roadmap" element={<RequireAuth><StudentStudyPlanView /></RequireAuth>} />
              <Route path="/student/study-plan/:assignmentId" element={<RequireAuth><StudentStudyPlanView /></RequireAuth>} />
              <Route path="/student/study-plans" element={<Navigate to="/student/roadmap" replace />} />
              <Route path="/roadmap" element={<Navigate to="/student/roadmap" replace />} />
              <Route path="/statistics" element={<RequireRole roles={['teacher', 'admin']}><StatisticsDashboard /></RequireRole>} />
              <Route path="/goals" element={<RequireAuth><GoalsAndSchedulePage /></RequireAuth>} />
              <Route path="/student/goals" element={<RequireAuth><GoalsAndSchedulePage /></RequireAuth>} />
              <Route path="/student/results" element={<RequireAuth><StudentResultsPage /></RequireAuth>} />
              <Route path="/student-results" element={<RequireAuth><StudentResultsPage /></RequireAuth>} />
              <Route path="/results" element={<RequireAuth><StudentResultsPage /></RequireAuth>} />
              <Route path="/wrong-answers" element={<RequireAuth><StudentWrongAnswersPage /></RequireAuth>} />
              <Route path="/student/wrong-answers" element={<RequireAuth><StudentWrongAnswersPage /></RequireAuth>} />
              <Route path="/my-program" element={<RequireAuth><StudentProgramPage /></RequireAuth>} />
              <Route path="/student/program" element={<RequireAuth><StudentProgramPage /></RequireAuth>} />
              <Route path="/coaching/:studentId" element={<RequireRole roles={['teacher', 'admin']}><StudentCoachingPage /></RequireRole>} />
              <Route path="/student-program/:studentId" element={<RequireRole roles={['teacher', 'admin']}><StudentCoachingPage /></RequireRole>} />
              <Route path="/my-coaching" element={<RequireAuth><MyCoachingPage /></RequireAuth>} />
              <Route path="/physical-exam" element={<RequireRole roles={['teacher', 'admin']}><ExamManager /></RequireRole>} />
              <Route path="/scales" element={<RequireRole roles={['teacher', 'admin']}><ScalePage /></RequireRole>} />
              <Route path="/exam-analysis" element={<RequireRole roles={['teacher', 'admin']}><ExamAnalysisPage /></RequireRole>} />
              <Route path="/exam-analysis/:examId" element={<RequireRole roles={['teacher', 'admin']}><ExamAnalysisPage /></RequireRole>} />
              <Route path="/physical-exam/:hwId" element={<RequireAuth><PhysicalExamRunner /></RequireAuth>} />
              <Route path="/pdf-slicer" element={<RequireAuth><PdfQuestionSlicerPage /></RequireAuth>} />
              <Route path="/slicer" element={<RequireAuth><PdfQuestionSlicerPage /></RequireAuth>} />
              <Route path="/student/pdf-slicer" element={<RequireAuth><PdfQuestionSlicerPage /></RequireAuth>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      
      {shouldShowBottomNav && <MobileBottomNav />}
      <ToastContainer />
      <CommandPalette />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}