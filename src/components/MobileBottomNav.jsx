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
        background: 'linear-gradient(180deg, rgba(17, 28, 56, 0.92) 0%, rgba(22, 36, 71, 0.98) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1.5px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.35)',
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
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
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
                  background: 'linear-gradient(90deg, #38bdf8, #818cf8, #c084fc)',
                  boxShadow: '0 0 10px #818cf8'
                }}
              />
            )}

            {/* Icon Container with Luminous Glass Effect */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(168, 85, 247, 0.4) 100%)'
                  : 'rgba(255, 255, 255, 0.04)',
                border: isActive
                  ? '1.5px solid rgba(165, 180, 252, 0.65)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isActive
                  ? '0 4px 16px rgba(99, 102, 241, 0.45), inset 0 0 10px rgba(168, 85, 247, 0.25)'
                  : 'none',
                color: isActive ? '#ffffff' : '#94a3b8'
              }}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
                color={isActive ? '#ffffff' : '#cbd5e1'}
                style={{
                  filter: isActive ? 'drop-shadow(0 0 6px rgba(165, 180, 252, 0.8))' : 'none',
                  transition: 'all 0.25s ease'
                }}
              />
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: isActive ? 900 : 700,
                marginTop: '0.2rem',
                letterSpacing: '0.02em',
                transition: 'all 0.25s ease',
                color: isActive ? '#ffffff' : '#94a3b8',
                textShadow: isActive ? '0 0 8px rgba(165, 180, 252, 0.6)' : 'none'
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
