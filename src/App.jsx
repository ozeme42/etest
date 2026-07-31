import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import QuestionBank from './pages/QuestionBank';
import QuizRunner from './pages/QuizRunner';
import BookQuizRunner from './pages/BookQuizRunner';
import QuizReview from './pages/QuizReview';
import HomeworkManager from './pages/HomeworkManager';
import EvaluationManager from './pages/EvaluationManager';
import BookManager from './pages/BookManager';
import BookContentManager from './pages/BookContentManager';
import StudyPlanManager from './pages/StudyPlanManager';
import StudyPlanDetail from './pages/StudyPlanDetail';
import StatisticsDashboard from './pages/StatisticsDashboard';
import StudyPage from './pages/StudyPage';
import GoalsAndSchedulePage from './pages/GoalsAndSchedulePage';
import StudentResultsPage from './pages/StudentResultsPage';
import StudentWrongAnswersPage from './pages/StudentWrongAnswersPage';
import LoginPage from './pages/LoginPage';
import { useAuth } from './context/AuthContext';
import { Settings, Database, BookOpen, ClipboardCheck, BookMarked, Map, Menu, X, Home, Users, GraduationCap, BarChart2, Target, ListTree, AlertCircle, LogIn, LogOut, Shield } from 'lucide-react';
import './App.css';

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();

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

      <nav className={`sidebar glass ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="brand" onClick={closeSidebar}>
            <span className="brand-icon">✨</span>
            <span className="brand-text">E-Test</span>
          </Link>
        </div>

        {/* AUTH PROFILE STATUS BAR IN SIDEBAR */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99,102,241,0.12)', padding: '0.6rem 0.8rem', borderRadius: '0.75rem', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#6366f1', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
                  {currentUser.name?.charAt(0)}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{currentUser.name}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase' }}>{currentUser.role}</div>
                </div>
              </div>
              <button onClick={logout} title="Çıkış Yap" style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.2rem' }}>
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" onClick={closeSidebar} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '0.6rem', borderRadius: '0.75rem', background: '#6366f1', color: 'white', fontWeight: 900, fontSize: '0.8rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <LogIn size={16} /> Giriş Yap / Kayıt Ol
              </button>
            </Link>
          )}
        </div>
        
        <div className="nav-links custom-scrollbar">
          <div className="nav-section-title">Kullanıcı Panelleri</div>
          <NavLink to="/student" className="nav-link" onClick={closeSidebar}>
            <GraduationCap size={20} /> Öğrenci Paneli
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
          <NavLink to="/teacher" className="nav-link" onClick={closeSidebar}>
            <Users size={20} /> Öğretmen Paneli
          </NavLink>

          <div className="nav-section-title">Modüller</div>
          <NavLink to="/statistics" className="nav-link" onClick={closeSidebar}>
            <BarChart2 size={20} /> İstatistik & Analiz
          </NavLink>
          <NavLink to="/homeworks" className="nav-link" onClick={closeSidebar}>
            <BookOpen size={20} /> Ödevler
          </NavLink>
          <NavLink to="/evaluations" className="nav-link" onClick={closeSidebar}>
            <ClipboardCheck size={20} /> Değerlendirmeler
          </NavLink>
          <NavLink to="/questions" className="nav-link" onClick={closeSidebar}>
            <Database size={20} /> Soru Bankası
          </NavLink>
          <NavLink to="/books" className="nav-link" onClick={closeSidebar}>
            <BookMarked size={20} /> Kitap Takibi
          </NavLink>
          <NavLink to="/study-plans" className="nav-link" onClick={closeSidebar}>
            <Map size={20} /> Yol Haritası
          </NavLink>

          <div className="nav-section-title">Hesap & Yönetim</div>
          <NavLink to="/login" className="nav-link" onClick={closeSidebar}>
            <LogIn size={20} /> Giriş / Kayıt Ol
          </NavLink>
          <NavLink to="/admin" className="nav-link" onClick={closeSidebar}>
            <Settings size={20} /> Admin
          </NavLink>
        </div>
      </nav>
    </>
  );
}

function AppContent() {
  const location = useLocation();
  const hideSidebarRoutes = ['/quiz/', '/book-quiz/', '/review/', '/login'];
  const shouldHideSidebar = hideSidebarRoutes.some(route => location.pathname.startsWith(route));

  return (
    <div className={`app-container ${shouldHideSidebar ? 'no-sidebar' : ''}`}>
      {!shouldHideSidebar && <Sidebar />}
      <main className="main-content" style={shouldHideSidebar ? { marginLeft: 0, paddingLeft: 0, width: '100%', maxWidth: '100%' } : {}}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student-results" element={<StudentResultsPage />} />
          <Route path="/wrong-answers" element={<StudentWrongAnswersPage />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/homeworks" element={<HomeworkManager />} />
          <Route path="/evaluations" element={<EvaluationManager />} />
          <Route path="/questions" element={<QuestionBank />} />
          <Route path="/books" element={<BookManager />} />
          <Route path="/books/:id" element={<BookContentManager />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/quiz/:id" element={<QuizRunner />} />
          <Route path="/book-quiz/:id" element={<BookQuizRunner />} />
          <Route path="/review/:id" element={<QuizReview />} />
          <Route path="/study-plans" element={<StudyPlanManager />} />
          <Route path="/study-plans/:id" element={<StudyPlanDetail />} />
          <Route path="/statistics" element={<StatisticsDashboard />} />
          <Route path="/study-page" element={<StudyPage />} />
          <Route path="/goals" element={<GoalsAndSchedulePage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
