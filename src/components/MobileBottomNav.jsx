import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Layers, Award, ClipboardList, BarChart3, Calendar, Target, Headphones } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { triggerHapticFeedback } from '../services/nativeMobileService';

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const role = currentUser.role || 'student';

  const studentTabs = [
    { label: 'Ana Sayfa', path: '/student', icon: Home },
    { label: 'Hedefler', path: '/goals', icon: Target },
    { label: 'Kitaplarım', path: '/student/books', icon: BookOpen },
    { label: 'Programım', path: '/my-program', icon: Calendar },
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

  const handleTabClick = (path) => {
    triggerHapticFeedback('light');
    navigate(path);
  };

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1.5px solid #e2e8f0',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
        paddingTop: '0.45rem',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.45rem)',
        paddingLeft: '0.5rem',
        paddingRight: '0.5rem'
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          location.pathname === tab.path ||
          (tab.path !== '/student' && tab.path !== '/teacher' && tab.path !== '/admin' && location.pathname.startsWith(tab.path));

        return (
          <button
            key={tab.path}
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
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isActive ? 'translateY(-2px)' : 'none',
              outline: 'none'
            }}
          >
            {/* Active Top Glow Indicator */}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: -8,
                  width: 24,
                  height: 3,
                  borderRadius: 99,
                  background: '#6366f1',
                  boxShadow: '0 0 8px rgba(99, 102, 241, 0.6)'
                }}
              />
            )}

            {/* Icon Container */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isActive
                  ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                  : 'transparent',
                boxShadow: isActive
                  ? '0 3px 10px rgba(99, 102, 241, 0.35)'
                  : 'none',
                color: isActive ? '#ffffff' : '#64748b'
              }}
            >
              <Icon
                size={19}
                strokeWidth={isActive ? 2.5 : 2}
                color={isActive ? '#ffffff' : '#64748b'}
              />
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: isActive ? 900 : 700,
                marginTop: '0.2rem',
                letterSpacing: '0.02em',
                transition: 'all 0.2s ease',
                color: isActive ? '#4f46e5' : '#64748b'
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
