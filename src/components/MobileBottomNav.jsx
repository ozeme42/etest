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
      className="mobile-bottom-nav sm:hidden fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
      style={{
        background: isDark ? 'rgba(9, 7, 26, 0.88)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(226, 232, 240, 0.85)',
        boxShadow: isDark ? '0 -10px 40px rgba(0, 0, 0, 0.65)' : '0 -4px 20px rgba(0, 0, 0, 0.06)',
      }}
    >
      <div
        className="relative flex items-stretch justify-around px-1 pt-1.5"
        style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 8px) + 0.35rem)' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isTabActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => handleTabClick(tab.path)}
              type="button"
              className="group relative flex flex-col items-center justify-center w-full py-1 cursor-pointer transition-all duration-200 outline-none"
              style={{
                background: 'transparent',
                border: 'none',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Aktiflik Üst Işık Çizgisi */}
              {isActive && (
                <span
                  className="absolute top-0 w-11 h-[3px] rounded-b-full transition-all duration-300"
                  style={{
                    background: isDark ? '#22d3ee' : '#0284c7',
                    boxShadow: isDark
                      ? '0 0 12px rgba(34, 211, 238, 0.9), 0 0 4px rgba(34, 211, 238, 0.6)'
                      : '0 0 10px rgba(2, 132, 199, 0.5)',
                  }}
                />
              )}

              {/* İkon Kutusu */}
              <div
                className="relative p-1.5 rounded-xl transition-all duration-300"
                style={{
                  transform: isActive ? 'translateY(-2px)' : 'none',
                  background: isActive
                    ? (isDark ? 'rgba(6, 182, 212, 0.14)' : 'rgba(2, 132, 199, 0.1)')
                    : 'transparent',
                }}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-full blur-md"
                    style={{ background: isDark ? 'rgba(34, 211, 238, 0.3)' : 'rgba(2, 132, 199, 0.18)' }}
                  />
                )}
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    color: isActive
                      ? (isDark ? '#22d3ee' : '#0284c7')
                      : (isDark ? '#64748b' : '#94a3b8'),
                    transition: 'color 0.2s ease',
                  }}
                />
              </div>

              {/* Etiket */}
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: isActive ? 900 : 600,
                  marginTop: '0.15rem',
                  letterSpacing: '0.02em',
                  color: isActive
                    ? (isDark ? '#cffafe' : '#0284c7')
                    : (isDark ? '#64748b' : '#94a3b8'),
                  transition: 'color 0.2s ease',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
