import React, { useState } from 'react';
import { Routes, Route, NavLink, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  GraduationCap, Users, Settings, Menu, X, BookOpen, 
  Target, BarChart2, ClipboardCheck, Database, BookMarked, Map, AlertCircle, LogIn, LogOut, ListTree
} from 'lucide-react';

import Landing from './pages/Landing';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import HomeworkManager from './pages/HomeworkManager';
import EvaluationManager from './pages/EvaluationManager';
import QuestionBank from './pages/QuestionBank';
import QuizRunner from './pages/QuizRunner';
import BookQuizRunner from './pages/BookQuizRunner';
import QuizReview from './pages/QuizReview';
import BookManager from './pages/BookManager';
import BookContentManager from './pages/BookContentManager';
import StudyPlanManager from './pages/StudyPlanManager';
import StudyPlanDetail from './pages/StudyPlanDetail';
import StatisticsDashboard from './pages/StatisticsDashboard';
import GoalsAndSchedulePage from './pages/GoalsAndSchedulePage';
import StudentResultsPage from './pages/StudentResultsPage';
import StudentWrongAnswersPage from './pages/StudentWrongAnswersPage';
import StudentCoachingPage from './pages/StudentCoachingPage';
import PhysicalExamManager from './pages/PhysicalExamManager';
import PhysicalExamRunner from './pages/PhysicalExamRunner';
import LoginPage from './pages/LoginPage';
import { useAuth } from './context/AuthContext';
import './App.css';

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

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

      <nav className={`sidebar glass ${isOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div className="sidebar-header">
          <Link to="/" className="brand" onClick={closeSidebar}>
            <span className="brand-icon">✨</span>
            <span className="brand-text">E-Test</span>
          </Link>
        </div>

        {/* AUTH PROFILE STATUS BAR IN SIDEBAR */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(99,102,241,0.12)', padding: '0.65rem 0.85rem', borderRadius: '0.85rem', border: '1px solid rgba(99,102,241,0.25)' }}>
              <div style={{ width: '2.2rem', height: '2.2rem', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                {currentUser.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{currentUser.name}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', tracking: '0.05em' }}>{currentUser.role === 'student' ? 'Öğrenci' : currentUser.role === 'teacher' ? 'Öğretmen' : 'Yönetici'}</div>
              </div>
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
          {(currentUser?.role === 'student' || (!currentUser && true)) && (
            <>
              <NavLink to="/student" className="nav-link" onClick={closeSidebar}>
                <GraduationCap size={20} /> Öğrenci Paneli
              </NavLink>
              <NavLink to="/physical-exam" className="nav-link" onClick={closeSidebar}>
                <ClipboardCheck size={20} /> Fiziki Deneme Optik
              </NavLink>
              <NavLink to="/student-results" className="nav-link" onClick={closeSidebar}>
                <ListTree size={20} /> Sonuçlarım
              </NavLink>
              <NavLink to="/wrong-answers" className="nav-link" onClick={closeSidebar}>
                <AlertCircle size={20} /> Yanlışlarım
              </NavLink>
              <NavLink to="/goals" className="nav-link" onClick={closeSidebar}>
                <Target size={20} /> Hedefler & Program
              </NavLink>
            </>
          )}

          {/* Öğretmen ve Admin Paneli */}
          {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
            <NavLink to="/teacher" className="nav-link" onClick={closeSidebar}>
              <Users size={20} /> Öğretmen Paneli
            </NavLink>
          )}

          {/* Modüller: Sadece Öğretmen ve Admin Görebilir */}
          {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
            <>
              <div className="nav-section-title">Modüller</div>
              <NavLink to="/physical-exam" className="nav-link" onClick={closeSidebar}>
                <ClipboardCheck size={20} /> Fiziki Deneme & Optik
              </NavLink>
              <NavLink to="/statistics" className="nav-link" onClick={closeSidebar}>
                <BarChart2 size={20} /> İstatistik & Analiz
              </NavLink>
              <NavLink to="/homeworks" className="nav-link" onClick={closeSidebar}>
                <BookOpen size={20} /> Ödevler
              </NavLink>
              <NavLink to="/evaluations" className="nav-link" onClick={closeSidebar}>
                <ClipboardCheck size={20} /> Değerlendirmeler
              </NavLink>

              {/* Soru Bankası: Öğretmen ve Admin Görebilir */}
              {(currentUser?.role === 'teacher' || currentUser?.role === 'admin') && (
                <NavLink to="/questions" className="nav-link" onClick={closeSidebar}>
                  <Database size={20} /> Soru Bankası
                </NavLink>
              )}

              <NavLink to="/books" className="nav-link" onClick={closeSidebar}>
                <BookMarked size={20} /> Kitap Takibi
              </NavLink>
              <NavLink to="/study-plans" className="nav-link" onClick={closeSidebar}>
                <Map size={20} /> Yol Haritası
              </NavLink>
            </>
          )}

          {/* Admin Tuşu: Sadece Admin Görebilir */}
          {currentUser?.role === 'admin' && (
            <>
              <div className="nav-section-title">Yönetim</div>
              <NavLink to="/admin" className="nav-link" onClick={closeSidebar}>
                <Settings size={20} /> Admin
              </NavLink>
            </>
          )}
        </div>

        {/* LOGOUT BUTTON AT THE VERY BOTTOM FOR LOGGED IN USERS */}
        {currentUser && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.4)' }}>
            <button
              onClick={() => { logout(); closeSidebar(); navigate('/'); }}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                borderRadius: '0.85rem',
                background: 'rgba(244,63,94,0.12)',
                border: '1px solid rgba(244,63,94,0.25)',
                color: '#f43f5e',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(244,63,94,0.25)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(244,63,94,0.12)'}
            >
              <LogOut size={16} /> Oturumu Kapat (Çıkış Yap)
            </button>
          </div>
        )}
      </nav>
    </>
  );
}

function AppContent() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const hideSidebarRoutes = ['/quiz/', '/book-quiz/', '/review/', '/login', '/physical-exam/'];
  const shouldHideSidebar = !currentUser || hideSidebarRoutes.some(route => location.pathname.startsWith(route));

  return (
    <div className={`app-container ${shouldHideSidebar ? 'no-sidebar' : ''}`}>
      {!shouldHideSidebar && <Sidebar />}

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/homeworks" element={<HomeworkManager />} />
          <Route path="/evaluations" element={<EvaluationManager />} />
          <Route path="/questions" element={<QuestionBank />} />
          <Route path="/quiz/:testId" element={<QuizRunner />} />
          <Route path="/book-quiz/:testId" element={<BookQuizRunner />} />
          <Route path="/review/:submissionId" element={<QuizReview />} />
          <Route path="/books" element={<BookManager />} />
          <Route path="/books/:id" element={<BookContentManager />} />
          <Route path="/study-plans" element={<StudyPlanManager />} />
          <Route path="/study-plans/:id" element={<StudyPlanDetail />} />
          <Route path="/statistics" element={<StatisticsDashboard />} />
          <Route path="/goals" element={<GoalsAndSchedulePage />} />
          <Route path="/student-results" element={<StudentResultsPage />} />
          <Route path="/wrong-answers" element={<StudentWrongAnswersPage />} />
          <Route path="/coaching/:studentId" element={<StudentCoachingPage />} />
          <Route path="/physical-exam" element={<PhysicalExamManager />} />
          <Route path="/physical-exam/:hwId" element={<PhysicalExamRunner />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
