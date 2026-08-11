import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Layers, Award, User, ClipboardList, CheckSquare, BarChart3 } from 'lucide-react';
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
    { label: 'Ödevlerim', path: '/student/exams', icon: ClipboardList },
    { label: 'Kitaplarım', path: '/student/books', icon: BookOpen },
    { label: 'Hatalarım', path: '/student/wrong-answers', icon: CheckSquare },
    { label: 'Sonuçlarım', path: '/student-results', icon: BarChart3 },
  ];

  const teacherTabs = [
    { label: 'Ana Sayfa', path: '/teacher', icon: Home },
    { label: 'Ödevler', path: '/homework-manager', icon: ClipboardList },
    { label: 'Soru Bankası', path: '/question-bank', icon: Layers },
    { label: 'Kitap/İçerik', path: '/book-content-manager', icon: BookOpen },
    { label: 'Denemeler', path: '/exam-manager', icon: Award },
  ];

  const tabs = role === 'student' ? studentTabs : teacherTabs;

  const handleTabClick = (path) => {
    triggerHapticFeedback('light');
    navigate(path);
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path || (tab.path !== '/student' && tab.path !== '/teacher' && location.pathname.startsWith(tab.path));

        return (
          <button
            key={tab.path}
            onClick={() => handleTabClick(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 ${
              isActive ? 'text-emerald-400 scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-emerald-500/15' : 'bg-transparent'}`}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            </div>
            <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
