import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Layers, Award, User, ClipboardList, CheckSquare, BarChart3, Calendar } from 'lucide-react';
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
    { label: 'Programım', path: '/my-program', icon: Calendar },
    { label: 'Sonuçlarım', path: '/student-results', icon: BarChart3 },
  ];

  const teacherTabs = [
    { label: 'Ana Sayfa', path: '/teacher', icon: Home },
    { label: 'Ödevler', path: '/homeworks', icon: ClipboardList },
    { label: 'Soru Bankası', path: '/questions', icon: Layers },
    { label: 'Kitaplar', path: '/books', icon: BookOpen },
    { label: 'Denemeler', path: '/physical-exam', icon: Award },
  ];

  const tabs = role === 'student' ? studentTabs : teacherTabs;

  const handleTabClick = (path) => {
    triggerHapticFeedback('light');
    navigate(path);
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-2xl border-t border-slate-200/60 px-2 py-2 flex items-center justify-around shadow-[0_-8px_30px_rgb(0,0,0,0.06)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path || (tab.path !== '/student' && tab.path !== '/teacher' && location.pathname.startsWith(tab.path));

        return (
          <button
            key={tab.path}
            onClick={() => handleTabClick(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 py-0.5 transition-all duration-300 ${
              isActive ? 'text-indigo-600 -translate-y-0.5' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-1.5 rounded-2xl transition-all duration-300 relative ${isActive ? 'bg-indigo-50 shadow-sm shadow-indigo-100' : 'bg-transparent'}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={`transition-all duration-300 relative z-10 ${isActive ? 'text-indigo-600 scale-110' : 'text-slate-400'}`} />
            </div>
            <span className={`text-[10px] font-black mt-1 tracking-tight transition-all duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
