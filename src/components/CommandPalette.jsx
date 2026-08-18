import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, BookOpen, BookMarked, ClipboardCheck, GraduationCap, 
  Users, Award, AlertTriangle, Headphones, Calendar, ArrowRight, X, Sparkles, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { SUBJECT_THEMES, getSubjectTheme } from '../config/subjectThemes';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { currentUser } = useAuth();
  const { data: curData } = useCurriculum();
  const { tests = [] } = useQuestionBank();
  const { books = [] } = useTrackedBooks();
  const { users = [] } = useUser();
  const { theme, isDark, toggleTheme } = useTheme();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Build searchable items based on role
  const isStudent = currentUser?.role === 'student';
  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  const searchableItems = React.useMemo(() => {
    const items = [];

    // Global Theme Toggle Action
    items.push({
      id: 'action-theme-toggle',
      title: isDark ? 'Temayı Açık Yap (Gündüz Modu ☀️)' : 'Temayı Koyu Yap (Gece Modu 🌙)',
      subtitle: isDark ? 'Ferah açık pastel tema renklerine geç' : 'Göz yormayan koyu temaya geç',
      category: 'Eylemler & Temalar',
      action: () => toggleTheme(),
      icon: isDark ? Sun : Moon,
      color: isDark ? '#fbbf24' : '#6366f1'
    });

    // Core Pages for Student
    if (isStudent) {
      items.push(
        { id: 'p-dash', title: 'Öğrenci Paneli', category: 'Sayfalar', url: '/student', icon: GraduationCap },
        { id: 'p-hw', title: 'Ödevlerim', category: 'Sayfalar', url: '/student/homeworks', icon: BookMarked },
        { id: 'p-study', title: 'Çalışma Odası', category: 'Sayfalar', url: '/study-room', icon: Headphones },
        { id: 'p-sum', title: 'Ders Özetleri', category: 'Sayfalar', url: '/student/summaries', icon: BookOpen },
        { id: 'p-books', title: 'Kitaplarım', category: 'Sayfalar', url: '/student/books', icon: BookMarked },
        { id: 'p-exams', title: 'Denemelerim', category: 'Sayfalar', url: '/student/exams', icon: ClipboardCheck },
        { id: 'p-res', title: 'Sınav Sonuçlarım', category: 'Sayfalar', url: '/student-results', icon: Award },
        { id: 'p-wrong', title: 'Hatalarım ve Boşlarım', category: 'Sayfalar', url: '/wrong-answers', icon: AlertTriangle },
        { id: 'p-prog', title: 'Ders Programım', category: 'Sayfalar', url: '/my-program', icon: Calendar }
      );
    }

    // Core Pages for Teacher/Admin
    if (isTeacherOrAdmin) {
      items.push(
        { id: 'p-tdash', title: 'Öğretmen Paneli', category: 'Sayfalar', url: '/teacher', icon: Users },
        { id: 'p-thw', title: 'Ödev Takip & Yönetim', category: 'Sayfalar', url: '/homeworks', icon: BookMarked },
        { id: 'p-teval', title: 'Değerlendirmeler & Raporlar', category: 'Sayfalar', url: '/evaluations', icon: ClipboardCheck },
        { id: 'p-tq', title: 'Soru Bankası & Testler', category: 'Sayfalar', url: '/questions', icon: BookOpen },
        { id: 'p-tbooks', title: 'Kitap Takip Merkezi', category: 'Sayfalar', url: '/books', icon: BookMarked },
        { id: 'p-tscales', title: 'Gözlem & Değerlendirme Ölçekleri', category: 'Sayfalar', url: '/scales', icon: Award },
        { id: 'p-toptik', title: 'Fiziki Deneme & Optik', category: 'Sayfalar', url: '/physical-exam', icon: Award },
        { id: 'p-tstats', title: 'İstatistik & Analiz', category: 'Sayfalar', url: '/statistics', icon: Award }
      );
      if (currentUser?.role === 'admin') {
        items.push({ id: 'p-admin', title: 'Admin Kontrol Merkezi', category: 'Sayfalar', url: '/admin', icon: Users });
      }

      // Teachers can search students
      users.filter(u => u.role === 'student').forEach(std => {
        items.push({
          id: `std-${std.id}`,
          title: std.name || 'İsimsiz Öğrenci',
          subtitle: std.email || std.grade || '',
          category: 'Öğrenciler',
          url: `/coaching/${std.id}`,
          icon: Users
        });
      });
    }

    // Subjects in Curriculum
    (curData?.subjects || []).forEach(sub => {
      const theme = getSubjectTheme(sub.name);
      items.push({
        id: `sub-${sub.id || sub.name}`,
        title: sub.name,
        subtitle: 'Ders ve Konu Müfredatı',
        category: 'Dersler',
        url: isStudent ? '/student/summaries' : '/questions',
        icon: theme.icon || BookOpen,
        color: theme.color
      });
    });

    // Books
    (books || []).slice(0, 15).forEach(b => {
      items.push({
        id: `book-${b.id}`,
        title: b.title,
        subtitle: b.publisher || b.subject || 'Kaynak Kitap',
        category: 'Kitaplar',
        url: isStudent ? `/student/books/${b.id}` : `/books/${b.id}`,
        icon: BookMarked
      });
    });

    // Tests
    (tests || []).slice(0, 20).forEach(t => {
      items.push({
        id: `test-${t.id}`,
        title: t.title,
        subtitle: `${t.subject || ''} · ${t.questions || 0} Soru`,
        category: 'Testler',
        url: isStudent ? `/quiz/${t.id}` : `/questions`,
        icon: ClipboardCheck
      });
    });

    return items;
  }, [isStudent, isTeacherOrAdmin, currentUser, curData, books, tests, users]);

  // Filter items
  const filtered = React.useMemo(() => {
    if (!query.trim()) return searchableItems.slice(0, 8);
    const q = query.toLowerCase().trim();
    return searchableItems
      .filter(item => 
        item.title?.toLowerCase().includes(q) || 
        item.subtitle?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [query, searchableItems]);

  const handleSelect = (item) => {
    setIsOpen(false);
    if (item.action) {
      item.action();
    } else if (item.url) {
      navigate(item.url);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={() => setIsOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'var(--color-modal-overlay)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        paddingLeft: '1rem',
        paddingRight: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'var(--color-surface)',
          borderRadius: '1.25rem',
          border: '1.5px solid var(--color-border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Search Input Box */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.15rem', borderBottom: '1.5px solid var(--color-border)', gap: '0.75rem' }}>
          <Search size={20} color="#6366f1" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Ders, ödev, kitap, sınav, tema veya sayfa ara... (Ctrl + K)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              background: 'transparent'
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
            >
              <X size={16} />
            </button>
          )}
          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)' }}>
            ESC
          </span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '0.5rem' }} className="custom-scrollbar">
          {filtered.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.86rem', fontWeight: 600 }}>
              <Search size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.35 }} />
              Sonuç bulunamadı
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon || BookOpen;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--color-surface-hover)' : 'transparent',
                    border: isSelected ? '1px solid var(--color-border-input)' : '1px solid transparent',
                    transition: 'all 0.1s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '0.5rem',
                        background: isSelected ? (isDark ? '#312e81' : '#dbeafe') : 'var(--color-surface-hover)',
                        color: item.color || (isSelected ? (isDark ? '#a5b4fc' : '#2563eb') : 'var(--color-text-secondary)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: isSelected ? (isDark ? '#818cf8' : '#1d4ed8') : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: 99, background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)' }}>
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight size={14} color={isDark ? '#818cf8' : '#2563eb'} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 1rem', background: 'var(--color-surface-hover)', borderTop: '1px solid var(--color-border)', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          <span>Gezinmek için <strong>↑ ↓</strong> tuşlarını kullanın</span>
          <span>Seçmek için <strong>Enter ↵</strong></span>
        </div>
      </div>
    </div>
  );
}
