import React from 'react';
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

  const handleTabClick = (path) => {
    if (isTabActive(path)) return;
    try { triggerHapticFeedback('light'); } catch {}
    navigate(path);
  };

  return (
    <nav
      className="mobile-bottom-nav sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: isDark ? '0 -4px 20px rgba(0,0,0,0.45)' : '0 -2px 14px rgba(0,0,0,0.06)',
        paddingTop: '0.3rem',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.35rem)',
        paddingLeft: '0.4rem',
        paddingRight: '0.4rem',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = isTabActive(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => handleTabClick(tab.path)}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '0.15rem 0',
              cursor: 'pointer',
              position: 'relative',
              outline: 'none',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.18s ease'
            }}
          >
            <div style={{
              width: 44,
              height: 28,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isActive
                ? (isDark ? 'linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.22))' : 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(79,70,229,0.12))')
                : 'transparent',
              border: isActive
                ? (isDark ? '1px solid rgba(165,180,252,0.35)' : '1px solid rgba(99,102,241,0.25)')
                : '1px solid transparent',
              boxShadow: isActive
                ? (isDark ? '0 2px 8px rgba(99,102,241,0.35)' : '0 2px 8px rgba(99,102,241,0.15)')
                : 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 1.8}
                color={isActive ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b')}
              />
            </div>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: isActive ? 900 : 600,
              marginTop: '0.15rem',
              letterSpacing: '0.01em',
              lineHeight: 1.1,
              color: isActive ? (isDark ? '#c7d2fe' : '#4338ca') : (isDark ? '#94a3b8' : '#64748b'),
              transition: 'color 0.15s ease'
            }}>
              {tab.label}
            </span>
            {isActive && (
              <div style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: isDark ? '#818cf8' : '#4f46e5',
                marginTop: 2,
                boxShadow: isDark ? '0 0 6px #818cf8' : '0 0 4px rgba(79,70,229,0.5)'
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
