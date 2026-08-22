import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, NavLink, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { initNativeApp } from './services/nativeMobileService';
import MobileBottomNav from './components/MobileBottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  GraduationCap, Users, Settings, Menu, X, BookOpen, 
  Target, BarChart2, ClipboardCheck, Database, BookMarked, Map, AlertCircle, LogIn, LogOut, ListTree, Award, AlertTriangle, Calendar,
  PanelLeftClose, PanelLeftOpen, Headphones, Search, Sparkles, Sun, Moon, Clock3, ShieldCheck
} from 'lucide-react';
import ToastContainer from './components/ui/Toast';
import CommandPalette from './components/CommandPalette';
import { useTheme } from './context/ThemeContext';
import { useMediaQuery } from './hooks/useMediaQuery';

// Lazy Loaded Pages
const Landing = lazy(() => import('./pages/Landing'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentBooksPage = lazy(() => import('./pages/StudentBooksPage'));
const StudentBookDetailsPage = lazy(() => import('./pages/StudentBookDetailsPage'));
const HomeworkManager = lazy(() => import('./pages/HomeworkManager'));
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
import './App.css';

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

function Sidebar({ isCollapsed, setIsCollapsed }) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const { isStudentCoached, mockExams = [] } = useCoaching();
  const { submissions = [] } = useEvaluation();
  const { theme, isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);
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
        <Link to="/" className="brand" onClick={closeSidebar}>
          <span className="brand-icon">✨</span>
          <span className="brand-text" style={{ fontSize: '1.2rem' }}>E-Test Premium</span>
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
        <div style={{ padding: '0.55rem 0.8rem', borderBottom: '1.5px solid var(--color-border)', background: 'var(--color-bg)' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-surface)', padding: '0.45rem 0.65rem', borderRadius: '0.75rem', border: '1.5px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '1.9rem', height: '1.9rem', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
                {currentUser.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{currentUser.name}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{currentUser.role === 'student' ? 'Öğrenci' : currentUser.role === 'teacher' ? 'Öğretmen' : 'Yönetici'}</div>
              </div>
              <button 
                onClick={async () => { 
                  closeSidebar(); 
                  await logout(); 
                  navigate('/', { replace: true }); 
                }}
                title="Oturumu Kapat"
                style={{ 
                  width: '1.8rem', height: '1.8rem', borderRadius: '50%', 
                  background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2', border: isDark ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #fecaca', 
                  color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                }}
                className="hover:scale-105 active:scale-95"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <Link to="/login" onClick={closeSidebar} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '0.5rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 900, fontSize: '0.8rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                <LogIn size={15} /> Giriş Yap / Kayıt Ol
              </button>
            </Link>
          )}

          {/* Quick Search & Theme Switch Row */}
          <div style={{ marginTop: '0.45rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.55rem',
                borderRadius: '0.65rem',
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                flex: 1,
                boxSizing: 'border-box',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Search size={13} color="#6366f1" /> Arama
              </span>
              <kbd style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', borderRadius: '4px', padding: '1px 4px', fontSize: '0.6rem', color: 'var(--color-text-muted)', fontWeight: 800 }}>Ctrl K</kbd>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.55rem',
                borderRadius: '0.65rem',
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
        
        <div className="nav-links custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
          
          {/* ═════════ ÖĞRENCİ MENÜ GRUPLARI ═════════ */}
          {currentUser?.role === 'student' && (
            <>
              {/* Grup 1: Aktif Görevler */}
              <div className="nav-section-title">⚡ Görev &amp; Çalışma</div>
              <NavLink to="/study-room" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', boxShadow: '0 2px 10px rgba(168,85,247,0.4)' }}>
                  <Headphones size={16} color="white" />
                </div>
                <span>Çalışma Odası</span>
                <span className="nav-hot-badge">CANLI</span>
              </NavLink>
              <NavLink to="/student" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}>
                  <GraduationCap size={16} color="white" />
                </div>
                <span>Ana Panel</span>
              </NavLink>
              <NavLink to="/student/homeworks" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', boxShadow: '0 2px 10px rgba(239,68,68,0.35)' }}>
                  <BookMarked size={16} color="white" />
                </div>
                <span>Ödevlerim</span>
              </NavLink>
              <NavLink to="/my-program" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #9333ea, #c084fc)', boxShadow: '0 2px 10px rgba(147,51,234,0.35)' }}>
                  <Calendar size={16} color="white" />
                </div>
                <span>Ders Programım</span>
              </NavLink>
              {isStudentCoached(currentUser?.id) && (
                <NavLink to="/my-coaching" className="nav-link" onClick={closeSidebar}>
                  <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 2px 10px rgba(217,119,6,0.35)', fontSize: '1rem' }}>
                    📂
                  </div>
                  <span>Koçluk Dosyam</span>
                </NavLink>
              )}

              {/* Grup 2: Kütüphane & İçerik */}
              <div className="nav-section-title">📚 Kütüphane &amp; İçerik</div>
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

              {/* Grup 3: Gelişim & Analiz */}
              <div className="nav-section-title">📊 Gelişim &amp; Takip</div>
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
                <span>Hatalarım &amp; Boşlarım</span>
              </NavLink>
            </>
          )}

          {/* ═════════ ÖĞRETMEN & ADMİN MENÜ GRUPLARI ═════════ */}
          {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
            <>
              {/* Grup 1: Yönetim & Akış */}
              <div className="nav-section-title">⚡ Yönetim &amp; Takip</div>
              <NavLink to="/teacher" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}>
                  <Users size={16} color="white" />
                </div>
                <span>Öğretmen Paneli</span>
              </NavLink>
              <NavLink to="/approvals" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 2px 10px rgba(124,58,237,0.35)' }}>
                  <ShieldCheck size={16} color="white" />
                </div>
                <span>Onay Merkezi</span>
                {pendingApprovalsCount > 0 && (
                  <span className="nav-hot-badge" style={{ background: '#7c3aed', color: 'white', fontWeight: 900 }}>
                    {pendingApprovalsCount}
                  </span>
                )}
              </NavLink>
              <NavLink to="/homeworks" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)', boxShadow: '0 2px 10px rgba(234,88,12,0.35)' }}>
                  <BookMarked size={16} color="white" />
                </div>
                <span>Ödev Yönetimi</span>
              </NavLink>
              <NavLink to="/evaluations" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 10px rgba(16,185,129,0.35)' }}>
                  <ClipboardCheck size={16} color="white" />
                </div>
                <span>Değerlendirmeler</span>
              </NavLink>
              <NavLink to="/physical-exam" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 2px 10px rgba(79,70,229,0.35)' }}>
                  <ClipboardCheck size={16} color="white" />
                </div>
                <span>Fiziki Deneme &amp; Optik</span>
              </NavLink>

              {/* Grup 2: İçerik & Havuz */}
              <div className="nav-section-title">📚 İçerik &amp; Soru Havuzu</div>
              <NavLink to="/summaries" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 10px rgba(16,185,129,0.35)' }}>
                  <BookOpen size={16} color="white" />
                </div>
                <span>Ders Özetleri Editörü</span>
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
                <span>Kitap Takip</span>
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
                <span>Ölçek &amp; Takip</span>
              </NavLink>

              {/* Grup 3: İstatistik & Admin */}
              <div className="nav-section-title">📊 Analiz &amp; Sistem</div>
              <NavLink to="/statistics" className="nav-link" onClick={closeSidebar}>
                <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 2px 10px rgba(8,145,178,0.35)' }}>
                  <BarChart2 size={16} color="white" />
                </div>
                <span>İstatistik &amp; Analiz</span>
              </NavLink>
              {currentUser?.role === 'admin' && (
                <NavLink to="/admin" className="nav-link" onClick={closeSidebar}>
                  <div className="nav-icon-badge" style={{ background: 'linear-gradient(135deg, #475569, #64748b)', boxShadow: '0 2px 10px rgba(71,85,105,0.35)' }}>
                    <Settings size={16} color="white" />
                  </div>
                  <span>Admin Kontrolü</span>
                </NavLink>
              )}
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

  const hideSidebarRoutes = ['/quiz/', '/book-quiz/', '/review/', '/quiz-review/', '/login', '/physical-exam/', '/study-room'];
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
              <Route path="/teacher" element={<RequireRole roles={['teacher', 'admin']}><TeacherDashboard /></RequireRole>} />
              <Route path="/student" element={<RequireRole roles={['student', 'admin', 'teacher']}><StudentDashboard /></RequireRole>} />
              <Route path="/student/homeworks" element={<RequireAuth><StudentHomeworksPage /></RequireAuth>} />
              <Route path="/study-room" element={<RequireAuth><StudyRoomPage /></RequireAuth>} />
              <Route path="/student/study-room" element={<RequireAuth><StudyRoomPage /></RequireAuth>} />
              <Route path="/student/summaries" element={<RequireAuth><StudentSummaryPage /></RequireAuth>} />
              <Route path="/summaries" element={<RequireAuth><SummaryManagerPage /></RequireAuth>} />
              <Route path="/student/books" element={<RequireAuth><StudentBooksPage /></RequireAuth>} />
              <Route path="/student/books/:bookId" element={<RequireAuth><StudentBookDetailsPage /></RequireAuth>} />
              <Route path="/book-details/:bookId" element={<RequireAuth><StudentBookDetailsPage /></RequireAuth>} />
              <Route path="/student/exams" element={<RequireAuth><StudentExamsPage /></RequireAuth>} />
              <Route path="/student/exams/:bookId" element={<RequireAuth><StudentBookDetailsPage /></RequireAuth>} />
              <Route path="/homeworks" element={<RequireAuth><HomeworkManager /></RequireAuth>} />
              <Route path="/approvals" element={<RequireRole roles={['teacher', 'admin']}><ApprovalsPage /></RequireRole>} />
              <Route path="/onaylar" element={<Navigate to="/approvals" replace />} />
              <Route path="/evaluations" element={<RequireRole roles={['teacher', 'admin']}><EvaluationManager /></RequireRole>} />
              <Route path="/evaluation" element={<Navigate to="/evaluations" replace />} />
              <Route path="/questions" element={<RequireAuth><QuestionBank /></RequireAuth>} />
              <Route path="/quiz/:testId" element={<RequireAuth><ModularQuizPage /></RequireAuth>} />
              <Route path="/book-quiz/:testId" element={<RequireAuth><TrackedBookQuizRunner /></RequireAuth>} />
              <Route path="/quiz-review/:testId" element={<RequireAuth><ModularQuizReviewPage /></RequireAuth>} />
              <Route path="/review/:submissionId" element={<RequireAuth><ModularQuizReviewPage /></RequireAuth>} />
              <Route path="/books" element={<RequireAuth><BookManager /></RequireAuth>} />
              <Route path="/books/:id" element={<RequireAuth><BookContentManager /></RequireAuth>} />
              <Route path="/study-plans" element={<RequireAuth><StudyPlanManager /></RequireAuth>} />
              <Route path="/study-plans/:id" element={<RequireAuth><StudyPlanDetail /></RequireAuth>} />
              <Route path="/student/study-plan/:assignmentId" element={<RequireAuth><StudentStudyPlanView /></RequireAuth>} />
              <Route path="/statistics" element={<RequireAuth><StatisticsDashboard /></RequireAuth>} />
              <Route path="/goals" element={<RequireAuth><GoalsAndSchedulePage /></RequireAuth>} />
              <Route path="/student/goals" element={<RequireAuth><GoalsAndSchedulePage /></RequireAuth>} />
              <Route path="/student/results" element={<RequireAuth><StudentResultsPage /></RequireAuth>} />
              <Route path="/student-results" element={<RequireAuth><StudentResultsPage /></RequireAuth>} />
              <Route path="/results" element={<RequireAuth><StudentResultsPage /></RequireAuth>} />
              <Route path="/wrong-answers" element={<RequireAuth><StudentWrongAnswersPage /></RequireAuth>} />
              <Route path="/student/wrong-answers" element={<RequireAuth><StudentWrongAnswersPage /></RequireAuth>} />
              <Route path="/my-program" element={<RequireAuth><StudentProgramPage /></RequireAuth>} />
              <Route path="/student/program" element={<RequireAuth><StudentProgramPage /></RequireAuth>} />
              <Route path="/coaching/:studentId" element={<RequireAuth><StudentCoachingPage /></RequireAuth>} />
              <Route path="/my-coaching" element={<RequireAuth><MyCoachingPage /></RequireAuth>} />
              <Route path="/physical-exam" element={<RequireAuth><ExamManager /></RequireAuth>} />
              <Route path="/scales" element={<RequireAuth><ScalePage /></RequireAuth>} />
              <Route path="/exam-analysis" element={<RequireAuth><ExamAnalysisPage /></RequireAuth>} />
              <Route path="/exam-analysis/:examId" element={<RequireAuth><ExamAnalysisPage /></RequireAuth>} />
              <Route path="/physical-exam/:hwId" element={<RequireAuth><PhysicalExamRunner /></RequireAuth>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      
      {!shouldHideSidebar && <MobileBottomNav />}
      <ToastContainer />
      <CommandPalette />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}