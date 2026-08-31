import React, { useTransition } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Layers, Award, ClipboardList, BarChart3, Calendar, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { triggerHapticFeedback } from '../services/nativeMobileService';

// Parmak değer değmez chunk yuklemeye basla - tiklayinca hazir olur
const PAGE_PRELOADS = {
  '/student': () => import('../pages/StudentDashboard'),
  '/goals': () => import('../pages/GoalsAndSchedulePage'),
  '/student/books': () => import('../pages/StudentBooksPage'),
  '/student/program': () => import('../pages/StudentProgramPage'),
  '/my-program': () => import('../pages/StudentProgramPage'),
  '/student-results': () => import('../pages/StudentResultsPage'),
  '/teacher': () => import('../pages/TeacherDashboard'),
  '/admin': () => import('../pages/AdminDashboard'),
  '/homeworks': () => import('../pages/HomeworkManager'),
  '/questions': () => import('../pages/QuestionBank'),
  '/books': () => import('../pages/BookManager'),
  '/physical-exam': () => import('../pages/PhysicalExamRunner'),
};

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const [, startTransition] = useTransition();

  if (!currentUser) return null;

  const role = currentUser.role || 'student';

  const studentTabs = [
    { label: 'Ana Sayfa', path: '/student', icon: Home },
    { label: 'Hedefler', path: '/goals', icon: Target },
    { label: 'Kitaplarım', path: '/student/books', icon: BookOpen },
    { label: 'Programım', path: '/student/program', icon: Calendar },
    { label: 'Sonuçlar', path: '/student-results', icon: BarChart3 },
  ];

  const teacherTabs = [
    { label: 'Ana Sayfa', path: role === 'admin' ? '/admin' : '/teacher', icon: Home },
    { label: 'Ödevler', path: '/homeworks', icon: ClipboardList },
    { label: 'Sorular', path: '/questions', icon: Layers },
    { label: 'Kitaplar', path: '/books', icon: BookOpen },
    { label: 'Denemeler', path: '/physical-exam', icon: Award },
  ];

  const tabs = role === 'student' ? studentTabs : teacherTabs;

  const isTabActive = (tabPath) => {
    const current = location.pathname;
    if (tabPath === '/student') return current === '/student' || current === '/';
    if (tabPath === '/admin') return current === '/admin';
    if (tabPath === '/teacher') return current === '/teacher';
    if (tabPath === '/student/program' || tabPath === '/my-program') return current === '/student/program' || current === '/my-program';
    if (tabPath === '/student-results' || tabPath === '/results') return current === '/student-results' || current === '/results' || current === '/student/results';
    if (tabPath === '/goals' || tabPath === '/student/goals') return current === '/goals' || current === '/student/goals';
    return current.startsWith(tabPath);
  };

  // Dokunmaya basinca chunk yukle, tiklayinca navigate et (startTransition = eski sayfa kaybolmaz, yeni sayfa arka planda hazirlanir)
  const handlePreload = (path) => { try { PAGE_PRELOADS[path]?.(); } catch {} };
  const handleTabClick = (path) => {
    triggerHapticFeedback('light');
    startTransition(() => navigate(path));
  };

  return (
    <nav
      className="mobile-bottom-nav sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: isDark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)',
        borderTop: isDark ? '1.5px solid rgba(51, 65, 85, 0.7)' : '1.5px solid rgba(226, 232, 240, 0.9)',
        boxShadow: isDark ? '0 -4px 16px rgba(0,0,0,0.4)' : '0 -2px 12px rgba(0,0,0,0.06)',
        paddingTop: '0.45rem',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 18px) + 0.45rem)',
        paddingLeft: '0.5rem',
        paddingRight: '0.5rem',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = isTabActive(tab.path);
        return (
          <button
            key={tab.path}
            onTouchStart={() => handlePreload(tab.path)}
            onClick={() => handleTabClick(tab.path)}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '0.2rem 0',
              cursor: 'pointer',
              position: 'relative',
              outline: 'none',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              transform: isActive ? 'translateY(-2px)' : 'none',
            }}
          >
            {isActive && (
              <div style={{ position: 'absolute', top: -8, width: 24, height: 3, borderRadius: 99, background: isDark ? '#818cf8' : '#6366f1' }} />
            )}
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive ? (isDark ? 'linear-gradient(135deg,#818cf8,#6366f1)' : 'linear-gradient(135deg,#6366f1,#4f46e5)') : 'transparent',
              boxShadow: isActive ? (isDark ? '0 4px 14px rgba(99,102,241,0.55)' : '0 3px 10px rgba(99,102,241,0.35)') : 'none',
            }}>
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} color={isActive ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')} />
            </div>
            <span style={{
              fontSize: '0.65rem', fontWeight: isActive ? 900 : 700,
              marginTop: '0.2rem', letterSpacing: '0.02em',
              color: isActive ? (isDark ? '#a5b4fc' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b')
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
