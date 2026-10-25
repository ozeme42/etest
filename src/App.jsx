import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, NavLink, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { initNativeApp } from './services/nativeMobileService';
import MobileBottomNav from './components/MobileBottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  GraduationCap, Users, Settings, Menu, X, BookOpen, 
  Target, BarChart2, ClipboardCheck, Database, BookMarked, Map, AlertCircle, LogIn, LogOut, ListTree, Award, AlertTriangle, Calendar,
  PanelLeftClose, PanelLeftOpen, Headphones, Search, Sparkles, Sun, Moon, Clock3, ShieldCheck, Scissors,
  Compass, Rocket, Flame, ChevronRight
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

  return (
    <>
      <div className="mobile-header">
        <Link to="/" className="sidebar-brand-link" onClick={closeSidebar}>
          <div className="sidebar-brand-avatar" style={{ width: 34, height: 34, borderRadius: 10 }}>
            <Rocket size={18} />
          </div>
          <div>
            <span className="sidebar-brand-title" style={{ fontSize: '1.15rem' }}>E-Test</span>
            <span className="sidebar-brand-sub" style={{ fontSize: '0.58rem' }}>5. Sınıf Maarif Modeli</span>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={toggleTheme}
            style={{
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border-input)',
              color: isDark ? '#fbbf24' : '#6366f1',
              borderRadius: '0.65rem',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}
            title={isDark ? 'Açık Temaya Geç (Light)' : 'Koyu Temaya Geç (Dark)'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="mobile-menu-btn" onClick={toggleSidebar}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={closeSidebar}></div>

      {/* FLOATING TOGGLE BUTTON (VISIBLE WHEN SIDEBAR IS COLLAPSED ON DESKTOP ONLY - NEVER ON MOBILE) */}
      {!isMobile && isCollapsed && (
        <button
          onClick={toggleCollapse}
          className="sidebar-floating-toggle-btn"
          title="Menüyü Aç"
        >
          <PanelLeftOpen size={18} />
          <span className="floating-btn-text">Menü</span>
        </button>
      )}

      <nav className={`sidebar glass ${isOpen ? 'open' : ''} ${!isMobile && isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand-link" onClick={closeSidebar}>
            <div className="sidebar-brand-avatar">
              <Rocket size={20} />
            </div>
            <div>
              <span className="sidebar-brand-title">E-Test</span>
              <span className="sidebar-brand-sub">
                {currentUser?.role === 'student' ? '5. Sınıf Maarif Modeli' : currentUser?.role === 'teacher' ? 'Öğretmen Portalı' : 'Yönetim Paneli'}
              </span>
            </div>
          </Link>
          <button 
            onClick={isMobile ? closeSidebar : toggleCollapse}
            className="sidebar-collapse-toggle-btn"
            title={isMobile ? "Menüyü Kapat" : "Menüyü Gizle"}
          >
            {isMobile ? <X size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* AUTH PROFILE STATUS BAR IN SIDEBAR */}
        <div className="sidebar-profile-bento">
          {currentUser ? (
            <div className="sidebar-user-box">
              <div className="sidebar-user-avatar">
                {currentUser.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <div className="sidebar-user-name">{currentUser.name}</div>
                <div className="sidebar-user-role">
                  <Sparkles size={10} />
                  <span>{currentUser.role === 'student' ? 'Öğrenci' : currentUser.role === 'teacher' ? 'Öğretmen' : 'Yönetici'}</span>
                </div>
              </div>
              <button 
                onClick={async () => { 
                  closeSidebar(); 
                  await logout(); 
                  navigate('/', { replace: true }); 
                }}
                title="Oturumu Kapat"
                style={{ 
                  width: '2rem', height: '2rem', borderRadius: '10px', 
                  background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', 
                  border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #fecaca', 
                  color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                }}
                className="hover:scale-105 active:scale-95"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link to="/login" onClick={closeSidebar} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '0.6rem', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', fontWeight: 800, fontSize: '0.82rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', boxShadow: '0 4px 14px rgba(79,70,229,0.35)' }}>
                <LogIn size={15} /> Giriş Yap / Kayıt Ol
              </button>
            </Link>
          )}

          {/* Quick Search & Theme Switch Row */}
          <div style={{ marginTop: '0.55rem', display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0.65rem',
                borderRadius: '11px',
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                flex: 1,
                boxSizing: 'border-box',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Search size={13} color="#6366f1" /> Arama
              </span>
              <kbd style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '5px', padding: '1px 5px', fontSize: '0.62rem', color: 'var(--color-text-muted)', fontWeight: 800 }}>Ctrl K</kbd>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.65rem',
                borderRadius: '11px',
                background: isDark ? 'linear-gradient(135deg, #1e1b4b, #312e81)' : 'linear-gradient(135deg, #fef3c7, #fef08a)',
                border: isDark ? '1.5px solid #4338ca' : '1.5px solid #fde047',
                color: isDark ? '#c7d2fe' : '#b45309',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              title={isDark ? 'Açık Temaya Geç (Light)' : 'Koyu Temaya Geç (Dark)'}
            >
              {isDark ? <Sun size={14} color="#fbbf24" /> : <Moon size={14} color="#6366f1" />}
              <span>{isDark ? 'Açık' : 'Koyu'}</span>
            </button>
          </div>
        </div>
        
        <div className="nav-links custom-scrollbar">
          
          {/* ═════════ ÖĞRENCİ MENÜ GRUPLARI ═════════ */}
          {currentUser?.role === 'student' && (
            <>
              {/* Grup 1: Aktif Görevler */}
              <div className="nav-section-title">⚡ Görev &amp; Çalışma</div>
              <NavLink to="/study-room" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                  <Headphones size={16} color="white" />
                </div>
                <span>Çalışma Odası</span>
                <span className="nav-hot-badge" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>CANLI</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/student" end className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)' }}>
                  <GraduationCap size={16} color="white" />
                </div>
                <span>Ana Panel</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/student/homeworks" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
                  <BookMarked size={16} color="white" />
                </div>
                <span>Ödevlerim</span>
                {studentOverdueBadgeCount > 0 && (
                  <span className="nav-hot-badge">
                    🔥 {studentOverdueBadgeCount}
                  </span>
                )}
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/my-program" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #9333ea, #c084fc)' }}>
                  <Calendar size={16} color="white" />
                </div>
                <span>Ders Programım</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink 
                to="/student/roadmap" 
                className={({ isActive }) => (isActive || location.pathname.startsWith('/student/study-plan') || location.pathname === '/student/roadmap') ? 'nav-link active' : 'nav-link'} 
                onClick={closeSidebar}
              >
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                  <Compass size={16} color="white" />
                </div>
                <span>Yol Haritası</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              {isStudentCoached(currentUser?.id) && (
                <NavLink to="/my-coaching" className="nav-link" onClick={closeSidebar}>
                  <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                    <Target size={16} color="white" />
                  </div>
                  <span>Koçluk Dosyam</span>
                  <ChevronRight size={13} className="nav-chevron" />
                </NavLink>
              )}

              {/* Grup 2: Kütüphane & İçerik */}
              <div className="nav-section-title">📚 Kütüphane &amp; İçerik</div>
              <NavLink to="/student/reading" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}>
                  <BookOpen size={16} color="white" />
                </div>
                <span>Kitap Okuma</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/student/summaries" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  <BookOpen size={16} color="white" />
                </div>
                <span>Ders Özetleri</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/student/books" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
                  <BookMarked size={16} color="white" />
                </div>
                <span>Kitaplarım (Soru Bankası)</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/student/exams" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }}>
                  <ClipboardCheck size={16} color="white" />
                </div>
                <span>Denemelerim</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>

              {/* Grup 3: Gelişim & Analiz */}
              <div className="nav-section-title">📊 Gelişim &amp; Takip</div>
              <NavLink to="/student-results" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  <Award size={16} color="white" />
                </div>
                <span>Sonuçlarım</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/wrong-answers" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #e11d48, #f43f5e)' }}>
                  <AlertTriangle size={16} color="white" />
                </div>
                <span>Hatalarım &amp; Boşlarım</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
            </>
          )}

          {/* ═════════ ÖĞRETMEN & ADMİN MENÜ GRUPLARI ═════════ */}
          {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
            <>
              {/* Grup 1: Yönetim & Akış */}
              <div className="nav-section-title">⚡ Yönetim &amp; Takip</div>
              <NavLink to="/teacher" end className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                  <Users size={16} color="white" />
                </div>
                <span>Öğretmen Paneli</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/approvals" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                  <ShieldCheck size={16} color="white" />
                </div>
                <span>Onay Merkezi</span>
                {pendingApprovalsCount > 0 && (
                  <span className="nav-hot-badge" style={{ background: '#7c3aed', color: 'white' }}>
                    {pendingApprovalsCount}
                  </span>
                )}
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/homeworks" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
                  <BookMarked size={16} color="white" />
                </div>
                <span>Ödev Yönetimi</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/remedials" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
                  <Scissors size={16} color="white" />
                </div>
                <span>Telafi &amp; Ustalık Takibi</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/evaluations" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <ClipboardCheck size={16} color="white" />
                </div>
                <span>Değerlendirmeler</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/physical-exam" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
                  <ClipboardCheck size={16} color="white" />
                </div>
                <span>Fiziki Deneme &amp; Optik</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>

              {/* Grup 2: İçerik & Havuz */}
              <div className="nav-section-title">📚 İçerik &amp; Soru Havuzu</div>
              <NavLink to="/summaries" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  <BookOpen size={16} color="white" />
                </div>
                <span>Ders Özetleri Editörü</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/questions" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
                  <Database size={16} color="white" />
                </div>
                <span>Soru Bankası</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/reading" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}>
                  <BookOpen size={16} color="white" />
                </div>
                <span>Kitap Okuma</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/books" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8)' }}>
                  <BookMarked size={16} color="white" />
                </div>
                <span>Kitap Takip (Soru Bankası)</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/study-plans" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)' }}>
                  <Map size={16} color="white" />
                </div>
                <span>Yol Haritası</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/scales" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #db2777, #f43f5e)' }}>
                  <ListTree size={16} color="white" />
                </div>
                <span>Ölçek &amp; Takip</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>

              {/* Grup 3: İstatistik & Admin */}
              <div className="nav-section-title">📊 Analiz &amp; Sistem</div>
              <NavLink to="/student-results" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  <Award size={16} color="white" />
                </div>
                <span>Tüm Sonuçlar &amp; Karne</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              <NavLink to="/statistics" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
                  <BarChart2 size={16} color="white" />
                </div>
                <span>İstatistik &amp; Analiz</span>
                <ChevronRight size={13} className="nav-chevron" />
              </NavLink>
              {currentUser?.role === 'admin' && (
                <NavLink to="/admin" className="nav-link" onClick={closeSidebar}>
                  <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #475569, #64748b)' }}>
                    <Settings size={16} color="white" />
                  </div>
                  <span>Admin Kontrolü</span>
                  <ChevronRight size={13} className="nav-chevron" />
                </NavLink>
              )}
            </>
          )}
        </div>

        {/* BOTTOM GAMIFIED CARD FOR STUDENT */}
        {currentUser?.role === 'student' && (
          <Link to="/study-room" className="sidebar-focus-card" onClick={closeSidebar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, boxShadow: '0 2px 8px rgba(245,158,11,0.35)' }}>
                <Flame size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)', fontFamily: 'Outfit, sans-serif' }}>Odak Odası</div>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#f59e0b' }}>⚡ +50 XP Kazan</div>
              </div>
            </div>
            <ChevronRight size={15} color="var(--color-text-muted)" />
          </Link>
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