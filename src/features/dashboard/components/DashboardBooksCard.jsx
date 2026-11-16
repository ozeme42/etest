import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Search, X, CheckCircle2, ChevronRight, PlayCircle, Filter,
  ArrowRight, Folder, FolderOpen, ExternalLink, Sparkles, Check,
  Zap, Trophy, Flame, Layers, Compass, BarChart3, Clock, ArrowUpRight,
  HelpCircle, BookMarked, RefreshCw, Award
} from 'lucide-react';
import { useTrackedBooks } from '../../../context/TrackedBookContext';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { checkIsTaskSolved, buildSolvedIndex } from '../../../components/ProgramCenter';
import { toUUID, legacyHexUUID } from '../../../services/supabaseService';

// ─── 🎨 6 BRANŞ İKON & RENK PROFİLLERİ ─────────────────────────────
const SUBJECT_CONFIGS = {
  'Türkçe': {
    title: 'Türkçe',
    iconUrl: '/assets/dashboard/icon_turkce.png',
    fallbackEmoji: '📖',
    color: '#f43f5e',
    from: '#f43f5e',
    to: '#be123c',
    glow: 'rgba(244, 63, 94, 0.35)',
    badgeBg: 'rgba(244, 63, 94, 0.12)',
    badgeBorder: 'rgba(244, 63, 94, 0.3)'
  },
  'Matematik': {
    title: 'Matematik',
    iconUrl: '/assets/dashboard/icon_matematik.png',
    fallbackEmoji: '📐',
    color: '#3b82f6',
    from: '#3b82f6',
    to: '#1d4ed8',
    glow: 'rgba(59, 130, 246, 0.35)',
    badgeBg: 'rgba(59, 130, 246, 0.12)',
    badgeBorder: 'rgba(59, 130, 246, 0.3)'
  },
  'Fen Bilimleri': {
    title: 'Fen Bilimleri',
    iconUrl: '/assets/dashboard/icon_fen.png',
    fallbackEmoji: '🧪',
    color: '#10b981',
    from: '#10b981',
    to: '#047857',
    glow: 'rgba(16, 185, 129, 0.35)',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeBorder: 'rgba(16, 185, 129, 0.3)'
  },
  'Sosyal Bilgiler': {
    title: 'Sosyal Bilgiler',
    iconUrl: '/assets/dashboard/icon_sosyal.png',
    fallbackEmoji: '🌍',
    color: '#f59e0b',
    from: '#f59e0b',
    to: '#b45309',
    glow: 'rgba(245, 158, 11, 0.35)',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    badgeBorder: 'rgba(245, 158, 11, 0.3)'
  },
  'İngilizce': {
    title: 'İngilizce',
    iconUrl: '/assets/dashboard/icon_ingilizce.png',
    fallbackEmoji: '🇬🇧',
    color: '#8b5cf6',
    from: '#8b5cf6',
    to: '#6d28d9',
    glow: 'rgba(139, 92, 246, 0.35)',
    badgeBg: 'rgba(139, 92, 246, 0.12)',
    badgeBorder: 'rgba(139, 92, 246, 0.3)'
  },
  'Din Kültürü': {
    title: 'Din Kültürü',
    iconUrl: '/assets/dashboard/icon_din.png',
    fallbackEmoji: '🕌',
    color: '#06b6d4',
    from: '#06b6d4',
    to: '#0e7490',
    glow: 'rgba(6, 182, 212, 0.35)',
    badgeBg: 'rgba(6, 182, 212, 0.12)',
    badgeBorder: 'rgba(6, 182, 212, 0.3)'
  },
  'Genel': {
    title: 'Genel',
    fallbackEmoji: '📚',
    color: '#6366f1',
    from: '#6366f1',
    to: '#4f46e5',
    glow: 'rgba(99, 102, 241, 0.35)',
    badgeBg: 'rgba(99, 102, 241, 0.12)',
    badgeBorder: 'rgba(99, 102, 241, 0.3)'
  }
};

const getSubjectConfig = (subj) => {
  if (!subj) return SUBJECT_CONFIGS['Genel'];
  const s = String(subj).toLowerCase();
  if (s.includes('türk') || s.includes('paragraf') || s.includes('edebiyat')) return SUBJECT_CONFIGS['Türkçe'];
  if (s.includes('mat') || s.includes('problem') || s.includes('geometri')) return SUBJECT_CONFIGS['Matematik'];
  if (s.includes('fen') || s.includes('fizik') || s.includes('kimya') || s.includes('biyo')) return SUBJECT_CONFIGS['Fen Bilimleri'];
  if (s.includes('sosyal') || s.includes('tarih') || s.includes('inkılap') || s.includes('coğrafya')) return SUBJECT_CONFIGS['Sosyal Bilgiler'];
  if (s.includes('ing')) return SUBJECT_CONFIGS['İngilizce'];
  if (s.includes('din')) return SUBJECT_CONFIGS['Din Kültürü'];
  return SUBJECT_CONFIGS['Genel'];
};

// ─── YALNIZCA FİZİKİ SORU BANKALARINI FİLTRELER ───────────────────
const isPhysicalQuestionBook = (b) => {
  if (!b || b.isDeleted || b.deleted) return false;
  const title = String(b.title || '').trim().toLowerCase();
  const raw = b.raw_data || {};

  // 1. Denemeler ve genel sınavlar
  if (
    title.startsWith('deneme') ||
    title.includes('deneme -') ||
    title.includes('deneme sınavı') ||
    title.includes('hazır bulunuşluk') ||
    title.includes('kolejlere hazırlama') ||
    title.includes('lgs deneme') ||
    title.includes('bursluluk')
  ) {
    return false;
  }

  // 2. Sınav tipleri
  if (
    b.bookType === 'exam' ||
    b.book_type === 'exam' ||
    raw.bookType === 'exam' ||
    b.isExam ||
    raw.isExam ||
    b.isExamBook ||
    raw.isExamBook ||
    b.isPhysicalExam === true ||
    raw.isPhysicalExam === true ||
    b.contentType === 'physicalExam' ||
    raw.contentType === 'physicalExam'
  ) {
    return false;
  }

  // 3. Okuma kitapları
  if (
    b.bookType === 'reading' ||
    b.book_type === 'reading' ||
    raw.bookType === 'reading' ||
    b.isReadingBook === true ||
    title.includes('kitap okuma')
  ) {
    return false;
  }

  return true;
};

// Kitabın ait olduğu ana dersi belirler
const getBookSubject = (b) => {
  if (b.subject && String(b.subject).trim() !== '' && b.subject !== 'Genel') return b.subject;
  if (b.subjects && b.subjects[0]?.name) return b.subjects[0].name;
  const t = String(b.title || '').toLowerCase();
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('paragraf')) return 'Türkçe';
  if (t.includes('matematik') || t.includes('mat') || t.includes('problem')) return 'Matematik';
  if (t.includes('fen')) return 'Fen Bilimleri';
  if (t.includes('sosyal') || t.includes('inkılap') || t.includes('tarih')) return 'Sosyal Bilgiler';
  if (t.includes('ingilizce') || t.includes('ing')) return 'İngilizce';
  if (t.includes('din')) return 'Din Kültürü';
  return 'Genel';
};

const getSubjectIcon = (subj) => {
  const cfg = getSubjectConfig(subj);
  return cfg.fallbackEmoji || '📚';
};

export default function DashboardBooksCard({
  isMobile = false,
  isDark = true,
  books: propBooks,
  bookTests: propBookTests,
  submissions: propSubmissions,
  homeworks: propHomeworks,
  currentUserId: propUserId,
  onNavigateBookDetail,
  onNavigateBooks,
  onStartStudyRoom
}) {
  const navigate = useNavigate();
  const themeContext = useTheme ? useTheme() : null;
  const isDarkEffective = Boolean(isDark ?? themeContext?.isDark ?? true);

  const authContext = useAuth();
  const trackedBooksContext = useTrackedBooks();
  const evalContext = useEvaluation();
  const hwContext = useHomework();

  // Props veya Context fallback
  const books = propBooks || trackedBooksContext?.books || [];
  const bookTests = propBookTests || trackedBooksContext?.bookTests || [];
  const submissions = propSubmissions || evalContext?.submissions || [];
  const homeworks = propHomeworks || hwContext?.homeworks || [];
  const currentUserId = propUserId || authContext?.currentUser?.id || null;

  // State'ler
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [testStatusFilter, setTestStatusFilter] = useState('all'); // 'all' | 'unsolved' | 'solved'
  const [selectedUnitForModal, setSelectedUnitForModal] = useState(null);

  // 1. O(1) Çözülen Testler İndeksi
  const precomputedSolvedIndex = useMemo(() => {
    return buildSolvedIndex(currentUserId, submissions, homeworks);
  }, [currentUserId, submissions, homeworks]);

  // 2. Yalnızca Fiziki Soru Bankaları
  const physicalBooks = useMemo(() => {
    return (books || []).filter(isPhysicalQuestionBook);
  }, [books]);

  // 3. Branş Bazında Kitap Sayıları
  const subjectBookCounts = useMemo(() => {
    const counts = { all: physicalBooks.length };
    physicalBooks.forEach(b => {
      const subj = getBookSubject(b);
      counts[subj] = (counts[subj] || 0) + 1;
    });
    return counts;
  }, [physicalBooks]);

  // 4. Ders Filtresine Göre Kitaplar
  const visiblePhysicalBooks = useMemo(() => {
    if (selectedSubject === 'all') return physicalBooks;
    return physicalBooks.filter(b => {
      const bSubj = getBookSubject(b).toLowerCase();
      const targetSubj = selectedSubject.toLowerCase();
      return bSubj.includes(targetSubj) || targetSubj.includes(bSubj);
    });
  }, [physicalBooks, selectedSubject]);

  // 5. Kitap seçimini senkronize et
  useEffect(() => {
    if (visiblePhysicalBooks.length > 0) {
      const exists = visiblePhysicalBooks.some(b => String(b.id) === String(selectedBookId));
      if (!exists) {
        setSelectedBookId(visiblePhysicalBooks[0].id);
      }
    } else {
      setSelectedBookId(null);
    }
  }, [visiblePhysicalBooks, selectedBookId]);

  // Kitap değişince konu modalını kapat ve aramayı sıfırla
  useEffect(() => {
    setSelectedUnitForModal(null);
    setSearchQuery('');
  }, [selectedBookId]);

  // ESC ile konu modalını kapat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedUnitForModal) {
        setSelectedUnitForModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUnitForModal]);

  const currentBook = useMemo(() => {
    if (!visiblePhysicalBooks.length) return null;
    return visiblePhysicalBooks.find(b => String(b.id) === String(selectedBookId)) || visiblePhysicalBooks[0];
  }, [visiblePhysicalBooks, selectedBookId]);

  // 6. Seçili Kitabın Üniteleri ve Testlerini Çıkarma
  const selectedBookData = useMemo(() => {
    if (!currentBook) {
      return { units: [], allTests: [], totalTestsCount: 0, solvedCount: 0, progressPct: 0, nextUnsolvedTest: null };
    }

    const bId = String(currentBook.id || '');
    const cleanBId = bId.replace(/^b_/, '');
    const bUuid = String(toUUID(bId) || '');
    const bLegacyUuid = String(legacyHexUUID(bId) || '');
    const normBookTitle = String(currentBook.title || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '').trim();

    // Bu kitaba ait DB testleri
    const testsInBook = (bookTests || []).filter(t => {
      if (!t || t.isDeleted || t.deleted) return false;
      const tBId = String(t.bookId || t.book_id || '');
      if (tBId === bId || tBId === cleanBId) return true;
      if (bUuid && tBId === bUuid) return true;
      if (bLegacyUuid && tBId === bLegacyUuid) return true;
      if (toUUID(tBId) && toUUID(tBId) === bUuid) return true;
      const tBTitle = String(t.bookTitle || t.book_title || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '').trim();
      if (tBTitle && normBookTitle && tBTitle === normBookTitle) return true;
      return false;
    });

    const directTestMap = new Map();
    testsInBook.forEach(t => {
      directTestMap.set(String(t.id), t);
      const cl = String(t.id).replace(/^bt_|^tbt_/, '');
      if (cl) directTestMap.set(cl, t);
      const u = toUUID(cl || t.id);
      if (u) directTestMap.set(String(u), t);
      if (t.name) directTestMap.set(String(t.name).trim().toLowerCase(), t);
    });

    const units = [];
    let allTests = [];

    const rawSubjects = (currentBook.subjects && Array.isArray(currentBook.subjects) && currentBook.subjects.length > 0
      ? currentBook.subjects
      : (currentBook.raw_data?.subjects || [{ id: 'genel', name: getBookSubject(currentBook), topics: [], tests: [] }]))
      .filter(s => s && s.id !== '__book_meta__' && !s.__meta && (s.name || (s.topics && s.topics.length > 0)));

    rawSubjects.forEach((subj, sIdx) => {
      const sName = subj.name || getBookSubject(currentBook);
      const subjTopics = subj.topics && Array.isArray(subj.topics) ? subj.topics : [];

      if (subjTopics.length > 0) {
        subjTopics.forEach((tp, tpIdx) => {
          const tpId = String(tp.id || `tp_${tpIdx}`);
          const tpName = tp.name || `${tpIdx + 1}. Fasikül / Ünite`;

          const dbTopicTests = testsInBook.filter(t => {
            const tTpId = String(t.topicId || t.topic_id || '');
            return tTpId === tpId || tTpId === String(tp.id) || (toUUID(tTpId) && toUUID(tTpId) === toUUID(tpId));
          });

          const canonicalTests = Array.isArray(tp.tests) ? tp.tests : [];
          const seenTestIds = new Set();
          const seenTestNames = new Set();
          const combinedRawTests = [];

          if (canonicalTests.length > 0) {
            canonicalTests.forEach((ct, ctIdx) => {
              if (!ct) return;
              const ctId = String(ct.id || `ct_${tpId}_${ctIdx}`);
              const ctClean = ctId.replace(/^bt_|^tbt_/, '');
              const ctName = String(ct.name || ct.title || `Test ${ctIdx + 1}`).trim();
              const ctNameKey = ctName.toLowerCase();

              const matchedDb = directTestMap.get(ctId) ||
                                directTestMap.get(ctClean) ||
                                (toUUID(ctClean) ? directTestMap.get(String(toUUID(ctClean))) : null) ||
                                directTestMap.get(ctNameKey) ||
                                dbTopicTests.find(dt => {
                                  const dtName = String(dt.name || dt.title || '').trim().toLowerCase();
                                  return dtName === ctNameKey;
                                });

              seenTestIds.add(ctId);
              seenTestIds.add(ctClean);
              if (ctNameKey) seenTestNames.add(ctNameKey);
              if (matchedDb?.id) {
                seenTestIds.add(String(matchedDb.id));
                seenTestIds.add(String(matchedDb.id).replace(/^bt_|^tbt_/, ''));
              }

              combinedRawTests.push({
                ...ct,
                ...(matchedDb || {}),
                id: ct.id || matchedDb?.id || ctId,
                name: ctName,
                test_order: ct.test_order ?? ct.order ?? ct.orderIndex ?? (ctIdx + 1)
              });
            });

            dbTopicTests.forEach((dt, dtIdx) => {
              if (!dt) return;
              const dtId = String(dt.id || `dt_${tpId}_${dtIdx}`);
              const dtClean = dtId.replace(/^bt_|^tbt_/, '');
              const dtName = String(dt.name || dt.title || '').trim();
              const dtNameKey = dtName.toLowerCase();

              if (!seenTestIds.has(dtId) && !seenTestIds.has(dtClean) && (!dtNameKey || !seenTestNames.has(dtNameKey))) {
                seenTestIds.add(dtId);
                seenTestIds.add(dtClean);
                if (dtNameKey) seenTestNames.add(dtNameKey);
                combinedRawTests.push(dt);
              }
            });
          } else if (dbTopicTests.length > 0) {
            combinedRawTests.push(...dbTopicTests);
          } else {
            for (let i = 1; i <= 5; i++) {
              combinedRawTests.push({
                id: `v_${tpId}_${i}`,
                name: `${tpName} - Test ${i}`,
                questionCount: 12
              });
            }
          }

          const processedTests = combinedRawTests.map((t, tIdx) => {
            const isCompleted = checkIsTaskSolved(t, currentUserId, submissions, homeworks, precomputedSolvedIndex);
            return {
              ...t,
              id: t.id || `gen_t_${tpId}_${tIdx}`,
              name: t.name || t.title || `Test ${tIdx + 1}`,
              title: t.name || t.title || `Test ${tIdx + 1}`,
              bookId: currentBook.id,
              bookTitle: currentBook.title,
              bookPublisher: currentBook.publisher,
              unitName: tpName,
              subjectName: sName,
              isCompleted,
              questionCount: t.questionCount || (Array.isArray(t.questions) && t.questions.length) || 12,
              answerKey: t.answerKey || t.answer_key || null
            };
          });

          const completedCount = processedTests.filter(t => t.isCompleted).length;

          units.push({
            id: tpId,
            name: tpName,
            subjectName: sName,
            totalCount: processedTests.length,
            completedCount,
            progressPct: processedTests.length > 0 ? Math.round((completedCount / processedTests.length) * 100) : 0,
            tests: processedTests
          });

          allTests.push(...processedTests);
        });
      } else {
        const uId = String(subj.id || `subj_${sIdx}`);
        const uName = sName;
        const fallbackTests = (testsInBook.length > 0 ? testsInBook : [1, 2, 3, 4, 5].map(i => ({ id: `ft_${i}`, name: `${uName} Test ${i}`, questionCount: 12 })))
          .map((t, tIdx) => {
            const isCompleted = checkIsTaskSolved(t, currentUserId, submissions, homeworks, precomputedSolvedIndex);
            return {
              ...t,
              id: t.id || `ft_${uId}_${tIdx}`,
              name: t.name || t.title || `Test ${tIdx + 1}`,
              title: t.name || t.title || `Test ${tIdx + 1}`,
              bookId: currentBook.id,
              bookTitle: currentBook.title,
              bookPublisher: currentBook.publisher,
              unitName: uName,
              subjectName: sName,
              isCompleted,
              questionCount: t.questionCount || (Array.isArray(t.questions) && t.questions.length) || 12,
              answerKey: t.answerKey || t.answer_key || null
            };
          });

        const completedCount = fallbackTests.filter(t => t.isCompleted).length;

        units.push({
          id: uId,
          name: uName,
          subjectName: sName,
          totalCount: fallbackTests.length,
          completedCount,
          progressPct: fallbackTests.length > 0 ? Math.round((completedCount / fallbackTests.length) * 100) : 0,
          tests: fallbackTests
        });

        allTests.push(...fallbackTests);
      }
    });

    const solvedCount = allTests.filter(t => t.isCompleted).length;
    const nextUnsolvedTest = allTests.find(t => !t.isCompleted) || null;

    return {
      units,
      allTests,
      totalTestsCount: allTests.length,
      solvedCount,
      progressPct: allTests.length > 0 ? Math.round((solvedCount / allTests.length) * 100) : 0,
      nextUnsolvedTest
    };
  }, [currentBook, bookTests, submissions, homeworks, currentUserId, precomputedSolvedIndex]);

  // 7. Genel Kütüphane İstatistikleri (Tüm Kitapların Hızlı Özeti)
  const overallLibraryStats = useMemo(() => {
    let totalTests = 0;
    let totalSolved = 0;
    let totalQuestions = 0;

    physicalBooks.forEach(b => {
      const bId = String(b.id || '');
      const cleanBId = bId.replace(/^b_/, '');
      const bUuid = String(toUUID(bId) || '');
      const bLegacyUuid = String(legacyHexUUID(bId) || '');
      const normBookTitle = String(b.title || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '').trim();

      const testsInBook = (bookTests || []).filter(t => {
        if (!t || t.isDeleted || t.deleted) return false;
        const tBId = String(t.bookId || t.book_id || '');
        if (tBId === bId || tBId === cleanBId) return true;
        if (bUuid && tBId === bUuid) return true;
        if (bLegacyUuid && tBId === bLegacyUuid) return true;
        if (toUUID(tBId) && toUUID(tBId) === bUuid) return true;
        const tBTitle = String(t.bookTitle || t.book_title || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '').trim();
        if (tBTitle && normBookTitle && tBTitle === normBookTitle) return true;
        return false;
      });

      const rawSubjects = (b.subjects && Array.isArray(b.subjects) && b.subjects.length > 0
        ? b.subjects
        : (b.raw_data?.subjects || []))
        .filter(s => s && s.id !== '__book_meta__' && !s.__meta);

      let bookTestsCount = 0;
      let bookSolvedCount = 0;

      if (rawSubjects.length > 0) {
        rawSubjects.forEach(subj => {
          const subjTopics = subj.topics && Array.isArray(subj.topics) ? subj.topics : [];
          if (subjTopics.length > 0) {
            subjTopics.forEach(tp => {
              const cTests = Array.isArray(tp.tests) ? tp.tests : [];
              if (cTests.length > 0) {
                cTests.forEach(ct => {
                  bookTestsCount++;
                  totalQuestions += (ct.questionCount || 12);
                  if (checkIsTaskSolved(ct, currentUserId, submissions, homeworks, precomputedSolvedIndex)) {
                    bookSolvedCount++;
                  }
                });
              }
            });
          }
        });
      }

      if (bookTestsCount === 0 && testsInBook.length > 0) {
        bookTestsCount = testsInBook.length;
        testsInBook.forEach(t => {
          totalQuestions += (t.questionCount || 12);
          if (checkIsTaskSolved(t, currentUserId, submissions, homeworks, precomputedSolvedIndex)) {
            bookSolvedCount++;
          }
        });
      } else if (bookTestsCount === 0) {
        bookTestsCount = 8;
        totalQuestions += 96;
      }

      totalTests += bookTestsCount;
      totalSolved += bookSolvedCount;
    });

    const completionPct = totalTests > 0 ? Math.round((totalSolved / totalTests) * 100) : 0;
    const activeSubjects = Object.keys(subjectBookCounts).filter(k => k !== 'all').length;

    return {
      totalBooks: physicalBooks.length,
      activeSubjects,
      totalTests,
      totalSolved,
      totalQuestions,
      completionPct
    };
  }, [physicalBooks, bookTests, submissions, homeworks, currentUserId, precomputedSolvedIndex, subjectBookCounts]);

  // 8. Test Arama ve Durum Filtresi
  const filteredTestsList = useMemo(() => {
    let list = selectedBookData.allTests;

    if (testStatusFilter === 'unsolved') {
      list = list.filter(t => !t.isCompleted);
    } else if (testStatusFilter === 'solved') {
      list = list.filter(t => t.isCompleted);
    } else if (testStatusFilter === 'withKey') {
      list = list.filter(t => Boolean(t.answerKey));
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(t => {
      const name = String(t.name || t.title || '').toLowerCase();
      const unit = String(t.unitName || '').toLowerCase();
      return name.includes(q) || unit.includes(q);
    });
  }, [selectedBookData.allTests, searchQuery, testStatusFilter]);

  // Test seçilip çalışma odasında başlatma
  const handleStartTest = (test) => {
    setSelectedUnitForModal(null);
    if (onStartStudyRoom) {
      onStartStudyRoom(test);
    } else {
      navigate('/study-room', { state: { startTask: test } });
    }
  };

  const currentSubjectConfig = currentBook ? getSubjectConfig(getBookSubject(currentBook)) : SUBJECT_CONFIGS['Genel'];

  // Tema Renkleri (Arena & Telafi uyumlu)
  const cardBg = isDarkEffective ? 'linear-gradient(145deg, #0d1424 0%, #0a0f1d 100%)' : '#ffffff';
  const innerCardBg = isDarkEffective ? 'rgba(20, 28, 48, 0.75)' : '#f8fafc';
  const borderColor = isDarkEffective ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';
  const textColor = isDarkEffective ? '#ffffff' : '#0f172a';
  const subTextColor = isDarkEffective ? '#94a3b8' : '#64748b';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>

      {/* ══════════════════════════════════════════════════════════════
          1. 📊 ULTRA LÜKS KPI METRİK KARTLARI (4 KART GRID)
      ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? '0.75rem' : '1rem',
          width: '100%'
        }}
      >
        {/* KPI 1: Toplam Soru Bankası */}
        <div
          style={{
            background: isDarkEffective ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
            backdropFilter: 'blur(16px)',
            borderRadius: 18,
            padding: isMobile ? '0.85rem 0.95rem' : '1.15rem 1.25rem',
            border: isDarkEffective ? '1px solid rgba(59, 130, 246, 0.28)' : '1px solid #e2e8f0',
            boxShadow: isDarkEffective ? '0 10px 28px -6px rgba(0,0,0,0.5)' : '0 4px 18px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 10 : 14,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 4,
              height: '100%',
              background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
            }}
          />
          <div
            style={{
              width: isMobile ? 40 : 46,
              height: isMobile ? 40 : 46,
              borderRadius: 14,
              background: 'rgba(59, 130, 246, 0.14)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
              flexShrink: 0
            }}
          >
            <BookOpen size={isMobile ? 20 : 24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isMobile ? '0.66rem' : '0.72rem', fontWeight: 800, color: subTextColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Kütüphane Kaynağı
            </div>
            <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 900, color: textColor, lineHeight: 1.15, marginTop: 2 }}>
              {overallLibraryStats.totalBooks} <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>Kitap</span>
            </div>
            <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', color: subTextColor, fontWeight: 650, marginTop: 2 }}>
              {overallLibraryStats.activeSubjects} Farklı Branşta
            </div>
          </div>
        </div>

        {/* KPI 2: Toplam Test & Soru Hacmi */}
        <div
          style={{
            background: isDarkEffective ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
            backdropFilter: 'blur(16px)',
            borderRadius: 18,
            padding: isMobile ? '0.85rem 0.95rem' : '1.15rem 1.25rem',
            border: isDarkEffective ? '1px solid rgba(139, 92, 246, 0.28)' : '1px solid #e2e8f0',
            boxShadow: isDarkEffective ? '0 10px 28px -6px rgba(0,0,0,0.5)' : '0 4px 18px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 10 : 14,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 4,
              height: '100%',
              background: 'linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)'
            }}
          />
          <div
            style={{
              width: isMobile ? 40 : 46,
              height: isMobile ? 40 : 46,
              borderRadius: 14,
              background: 'rgba(139, 92, 246, 0.14)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
              flexShrink: 0
            }}
          >
            <Layers size={isMobile ? 20 : 24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isMobile ? '0.66rem' : '0.72rem', fontWeight: 800, color: subTextColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Toplam Test Hacmi
            </div>
            <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 900, color: textColor, lineHeight: 1.15, marginTop: 2 }}>
              {overallLibraryStats.totalTests} <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c084fc' }}>Test</span>
            </div>
            <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', color: subTextColor, fontWeight: 650, marginTop: 2 }}>
              ~{overallLibraryStats.totalQuestions} Soru Kapasitesi
            </div>
          </div>
        </div>

        {/* KPI 3: Çözülen Testler & Tamamlanma */}
        <div
          style={{
            background: isDarkEffective ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
            backdropFilter: 'blur(16px)',
            borderRadius: 18,
            padding: isMobile ? '0.85rem 0.95rem' : '1.15rem 1.25rem',
            border: isDarkEffective ? '1px solid rgba(16, 185, 129, 0.28)' : '1px solid #e2e8f0',
            boxShadow: isDarkEffective ? '0 10px 28px -6px rgba(0,0,0,0.5)' : '0 4px 18px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 10 : 14,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 4,
              height: '100%',
              background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
            }}
          />
          <div
            style={{
              width: isMobile ? 40 : 46,
              height: isMobile ? 40 : 46,
              borderRadius: 14,
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={isMobile ? 20 : 24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isMobile ? '0.66rem' : '0.72rem', fontWeight: 800, color: subTextColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Tamamlanan Testler
            </div>
            <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 900, color: '#10b981', lineHeight: 1.15, marginTop: 2 }}>
              {overallLibraryStats.totalSolved} <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399' }}>Çözüldü</span>
            </div>
            <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', color: subTextColor, fontWeight: 650, marginTop: 2 }}>
              %{overallLibraryStats.completionPct} Genel Bitirme Oranı
            </div>
          </div>
        </div>

        {/* KPI 4: Seçili Kitap İlerlemesi */}
        <div
          style={{
            background: isDarkEffective ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
            backdropFilter: 'blur(16px)',
            borderRadius: 18,
            padding: isMobile ? '0.85rem 0.95rem' : '1.15rem 1.25rem',
            border: isDarkEffective ? `1px solid ${currentSubjectConfig.badgeBorder}` : '1px solid #e2e8f0',
            boxShadow: isDarkEffective ? '0 10px 28px -6px rgba(0,0,0,0.5)' : '0 4px 18px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 10 : 14,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 4,
              height: '100%',
              background: `linear-gradient(180deg, ${currentSubjectConfig.from} 0%, ${currentSubjectConfig.to} 100%)`
            }}
          />
          <div
            style={{
              width: isMobile ? 40 : 46,
              height: isMobile ? 40 : 46,
              borderRadius: 14,
              background: currentSubjectConfig.badgeBg,
              border: `1px solid ${currentSubjectConfig.badgeBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: currentSubjectConfig.color,
              flexShrink: 0
            }}
          >
            <Zap size={isMobile ? 20 : 24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isMobile ? '0.66rem' : '0.72rem', fontWeight: 800, color: subTextColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Aktif Kitap Durumu
            </div>
            <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 900, color: currentSubjectConfig.color, lineHeight: 1.15, marginTop: 2 }}>
              %{selectedBookData.progressPct} <span style={{ fontSize: '0.8rem', fontWeight: 700, color: subTextColor }}>Bitti</span>
            </div>
            <div style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', color: subTextColor, fontWeight: 650, marginTop: 2 }}>
              {selectedBookData.solvedCount} / {selectedBookData.totalTestsCount} Test Çözüldü
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. 🎛️ ULTRA LÜKS DİJİTAL KÜTÜPHANE KOKPİTİ (HERO BANNER)
      ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: isDarkEffective
            ? 'linear-gradient(145deg, #0d1424 0%, #0a0f1d 100%)'
            : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: 24,
          border: isDarkEffective ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: isDarkEffective
            ? '0 20px 48px -12px rgba(0, 0, 0, 0.65)'
            : '0 12px 32px -8px rgba(15, 23, 42, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          padding: isMobile ? '1.15rem 1rem' : '1.5rem 1.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        {/* Üst Neon Işıma Çizgisi */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)'
          }}
        />

        {/* Kokpit Başlığı & Hızlı Aksiyon Butonları */}
        <div
          style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 12,
            position: 'relative',
            zIndex: 1
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(139, 92, 246, 0.25))',
                  border: '1px solid rgba(59, 130, 246, 0.45)',
                  color: isDarkEffective ? '#93c5fd' : '#2563eb',
                  padding: '3px 10px',
                  borderRadius: 99,
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <span>🎒</span> DİJİTAL KÜTÜPHANE & SORU BANKASI KOKPİTİ
              </span>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#10b981',
                  padding: '2px 8px',
                  borderRadius: 99,
                  fontSize: '0.64rem',
                  fontWeight: 800
                }}
              >
                ⚡ Akıllı Fasikül Eşleştirmeli
              </span>
            </div>
            <div style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: 900, color: textColor, marginTop: 6 }}>
              Soru Bankaları, Fasiküller & Anında Çözüm Modu
            </div>
          </div>

          {/* Kokpit Aksiyon Butonları */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            {currentBook && onNavigateBookDetail && (
              <button
                type="button"
                onClick={() => onNavigateBookDetail(currentBook.id)}
                style={{
                  background: isDarkEffective ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  color: isDarkEffective ? '#bfdbfe' : '#1d4ed8',
                  borderRadius: 12,
                  padding: '0.5rem 0.95rem',
                  fontSize: '0.76rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  flex: isMobile ? 1 : 'none',
                  justifyContent: 'center'
                }}
                className="hover:scale-[1.02]"
                title="Bu kitabın tüm haritasını ve ayrıntılı fasikül sayfasını aç"
              >
                <Compass size={14} />
                <span>Kitap Haritası</span>
              </button>
            )}

            {onNavigateBooks && (
              <button
                type="button"
                onClick={onNavigateBooks}
                style={{
                  background: isDarkEffective ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  borderRadius: 12,
                  padding: '0.5rem 0.95rem',
                  fontSize: '0.76rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  flex: isMobile ? 1 : 'none',
                  justifyContent: 'center'
                }}
                className="hover:scale-[1.02]"
                title="Tüm kütüphane envanterini aç"
              >
                <BookMarked size={14} />
                <span>Tüm Kitaplar</span>
              </button>
            )}
          </div>
        </div>

        {/* ── SEÇİLİ KİTAP VİTRİNİ & İLERLEME PANELİ ── */}
        {currentBook ? (
          <div
            style={{
              background: innerCardBg,
              borderRadius: 20,
              padding: isMobile ? '1rem 0.95rem' : '1.25rem 1.45rem',
              border: isDarkEffective ? `1px solid ${currentSubjectConfig.badgeBorder}` : `1px solid ${borderColor}`,
              boxShadow: isDarkEffective ? `0 8px 30px ${currentSubjectConfig.glow}` : '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: isMobile ? 48 : 56,
                    height: isMobile ? 48 : 56,
                    borderRadius: 16,
                    background: `linear-gradient(135deg, ${currentSubjectConfig.from} 0%, ${currentSubjectConfig.to} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '1.5rem' : '1.85rem',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: `0 8px 24px ${currentSubjectConfig.glow}`,
                    border: '1.5px solid rgba(255, 255, 255, 0.25)'
                  }}
                >
                  {currentSubjectConfig.iconUrl ? (
                    <img
                      src={currentSubjectConfig.iconUrl}
                      alt={getBookSubject(currentBook)}
                      style={{ width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline';
                      }}
                    />
                  ) : null}
                  <span style={{ display: currentSubjectConfig.iconUrl ? 'none' : 'inline' }}>
                    {getSubjectIcon(getBookSubject(currentBook))}
                  </span>
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: isMobile ? '1.05rem' : '1.25rem',
                        fontWeight: 900,
                        color: textColor,
                        lineHeight: 1.25
                      }}
                    >
                      {currentBook.title}
                    </h2>
                    <span
                      style={{
                        background: currentSubjectConfig.badgeBg,
                        color: currentSubjectConfig.color,
                        border: `1px solid ${currentSubjectConfig.badgeBorder}`,
                        fontSize: '0.68rem',
                        fontWeight: 850,
                        padding: '2px 8px',
                        borderRadius: 8
                      }}
                    >
                      {getBookSubject(currentBook)}
                    </span>
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 8
                      }}
                    >
                      Fiziki Soru Bankası
                    </span>
                  </div>

                  {currentBook.publisher && (
                    <div style={{ fontSize: '0.78rem', color: subTextColor, fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>🏢</span> {currentBook.publisher}
                    </div>
                  )}
                </div>
              </div>

              {/* Kitap Çözüm İstatistiği */}
              <div style={{ textAlign: isMobile ? 'left' : 'right', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: isMobile ? '1.1rem' : '1.28rem', fontWeight: 900, color: '#10b981' }}>
                  {selectedBookData.solvedCount} / {selectedBookData.totalTestsCount} Test Çözüldü
                </div>
                <div style={{ fontSize: '0.76rem', color: subTextColor, fontWeight: 700 }}>
                  %{selectedBookData.progressPct} Tamamlanma • {selectedBookData.totalTestsCount - selectedBookData.solvedCount} Kalan
                </div>
              </div>
            </div>

            {/* Büyük İlerleme Çubuğu */}
            <div>
              <div
                style={{
                  height: 10,
                  background: isDarkEffective ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  borderRadius: 99,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    width: `${selectedBookData.progressPct}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, #10b981 0%, #34d399 50%, ${currentSubjectConfig.color} 100%)`,
                    borderRadius: 99,
                    transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)'
                  }}
                />
              </div>
            </div>

            {/* Sıradaki Önerilen Test Bannerı (Varsa Anında Çözme Fırsatı) */}
            {selectedBookData.nextUnsolvedTest && (
              <div
                style={{
                  background: isDarkEffective
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.16) 0%, rgba(139, 92, 246, 0.16) 100%)'
                    : 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)',
                  borderRadius: 14,
                  border: isDarkEffective ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid #ddd6fe',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}
                  >
                    ⚡
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: isDarkEffective ? '#c084fc' : '#7c3aed', textTransform: 'uppercase' }}>
                      Sıradaki Önerilen Test
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900, color: textColor, lineHeight: 1.25 }}>
                      {selectedBookData.nextUnsolvedTest.name}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartTest(selectedBookData.nextUnsolvedTest)}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '0.45rem 1rem',
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover:scale-[1.03]"
                >
                  <PlayCircle size={14} />
                  <span>Hemen Çöz & Başla</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              color: subTextColor,
              fontSize: '0.92rem',
              fontWeight: 700
            }}
          >
            Bu derse ait soru bankası bulunamadı. Lütfen yukarıdan "Tüm Dersler" filtresini seçin.
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          3. 🧭 DERS SEÇİM HAPLARI (SUBJECT FILTER PILLS)
      ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <span style={{ fontSize: '0.76rem', fontWeight: 900, color: subTextColor, marginRight: 2, flexShrink: 0 }}>
          Branş:
        </span>
        {[
          { id: 'all', label: 'Tüm Dersler', icon: '🎯' },
          { id: 'Türkçe', label: 'Türkçe', icon: '📖' },
          { id: 'Matematik', label: 'Matematik', icon: '📐' },
          { id: 'Fen Bilimleri', label: 'Fen Bilimleri', icon: '🧪' },
          { id: 'Sosyal Bilgiler', label: 'Sosyal Bilgiler', icon: '🌍' },
          { id: 'İngilizce', label: 'İngilizce', icon: '🇬🇧' },
          { id: 'Din Kültürü', label: 'Din Kültürü', icon: '🕌' }
        ].map(item => {
          const isSelected = selectedSubject === item.id;
          const count = subjectBookCounts[item.id] || 0;
          const sCfg = getSubjectConfig(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedSubject(item.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.45rem 0.95rem',
                borderRadius: 999,
                fontSize: '0.76rem',
                fontWeight: 850,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
                border: isSelected
                  ? `1.5px solid ${sCfg.color}`
                  : `1px solid ${borderColor}`,
                background: isSelected
                  ? `linear-gradient(135deg, ${sCfg.from}, ${sCfg.to})`
                  : (isDarkEffective ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9'),
                color: isSelected ? '#ffffff' : (isDarkEffective ? '#cbd5e1' : '#334155'),
                boxShadow: isSelected ? `0 4px 16px ${sCfg.glow}` : 'none',
                flexShrink: 0
              }}
              className="hover:scale-[1.02]"
            >
              <span style={{ fontSize: '0.9rem' }}>{item.icon}</span>
              <span>{item.label}</span>
              {count > 0 && (
                <span
                  style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.25)' : (isDarkEffective ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'),
                    color: isSelected ? '#ffffff' : subTextColor,
                    borderRadius: 999,
                    padding: '1px 6px',
                    fontSize: '0.66rem',
                    fontWeight: 900
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          4. 📚 KİTAP SEÇİM RAFI (MODERN INTERACTIVE BOOK SHELF)
      ══════════════════════════════════════════════════════════════ */}
      {visiblePhysicalBooks.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 6,
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {visiblePhysicalBooks.map(book => {
            const isSelected = String(book.id) === String(selectedBookId);
            const subj = getBookSubject(book);
            const icon = getSubjectIcon(subj);
            const sCfg = getSubjectConfig(subj);

            return (
              <div
                key={book.id}
                onClick={() => setSelectedBookId(book.id)}
                style={{
                  background: isSelected
                    ? (isDarkEffective ? 'linear-gradient(135deg, rgba(30, 41, 69, 0.95), rgba(15, 23, 42, 0.95))' : '#f0fdf4')
                    : (isDarkEffective ? 'rgba(20, 28, 48, 0.65)' : '#ffffff'),
                  border: isSelected
                    ? `2px solid ${sCfg.color}`
                    : `1px solid ${borderColor}`,
                  borderRadius: 16,
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: isMobile ? 180 : 210,
                  maxWidth: 240,
                  flexShrink: 0,
                  boxShadow: isSelected
                    ? `0 8px 24px ${sCfg.glow}`
                    : (isDarkEffective ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.03)'),
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative'
                }}
                className="hover:scale-[1.02]"
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${sCfg.from}, ${sCfg.to})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.15rem',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: isSelected ? `0 4px 14px ${sCfg.glow}` : 'none'
                  }}
                >
                  {icon}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 850,
                      color: isSelected ? (isDarkEffective ? '#ffffff' : '#0f172a') : textColor,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {book.title}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: subTextColor, fontWeight: 700, marginTop: 2 }}>
                    {subj} {book.publisher ? `• ${book.publisher}` : ''}
                  </div>
                </div>

                {isSelected && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: sCfg.color,
                      boxShadow: `0 0 8px ${sCfg.color}`,
                      flexShrink: 0
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          5. 🔍 AKILLI TEST ARAMA VE DURUM FİLTRESİ
      ══════════════════════════════════════════════════════════════ */}
      {currentBook && (
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: 10,
            background: innerCardBg,
            borderRadius: 16,
            padding: '0.75rem 1rem',
            border: `1px solid ${borderColor}`
          }}
        >
          {/* Arama Kutusu */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: subTextColor }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`${currentBook.title} içinde test veya konu ara...`}
              style={{
                width: '100%',
                padding: '0.6rem 2.2rem 0.6rem 2.4rem',
                borderRadius: 12,
                border: `1px solid ${borderColor}`,
                background: isDarkEffective ? 'rgba(15, 23, 42, 0.8)' : '#ffffff',
                color: textColor,
                fontSize: '0.82rem',
                fontWeight: 650,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: subTextColor,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Durum Filtre Butonları */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              { id: 'all', label: 'Tümü', count: selectedBookData.allTests.length },
              { id: 'unsolved', label: '⏳ Kalan', count: selectedBookData.totalTestsCount - selectedBookData.solvedCount },
              { id: 'solved', label: '✓ Çözülen', count: selectedBookData.solvedCount }
            ].map(tab => {
              const isActive = testStatusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTestStatusFilter(tab.id)}
                  style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: 10,
                    fontSize: '0.74rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: isActive
                      ? `1.5px solid ${currentSubjectConfig.color}`
                      : `1px solid ${borderColor}`,
                    background: isActive
                      ? (isDarkEffective ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff')
                      : (isDarkEffective ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'),
                    color: isActive ? currentSubjectConfig.color : subTextColor,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          6. 🗂️ ARAMA SONUÇLARI VEYA KONULAR & FASİKÜLLER
      ══════════════════════════════════════════════════════════════ */}
      {searchQuery.trim() || testStatusFilter !== 'all' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 850, color: subTextColor }}>
              Filtrelenen Testler ({filteredTestsList.length} Test):
            </span>
            {(searchQuery.trim() || testStatusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTestStatusFilter('all');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentSubjectConfig.color,
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Filtreleri Temizle ✕
              </button>
            )}
          </div>

          {filteredTestsList.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1.5rem',
                background: innerCardBg,
                borderRadius: 16,
                border: `1px solid ${borderColor}`,
                color: subTextColor,
                fontSize: '0.85rem'
              }}
            >
              Filtrelere uygun test bulunamadı.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                gap: 10
              }}
            >
              {filteredTestsList.map(test => (
                <TestCardItem
                  key={test.id}
                  test={test}
                  isDark={isDarkEffective}
                  subjectConfig={currentSubjectConfig}
                  onStartTest={handleStartTest}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* KONULAR & FASİKÜLLER KARTLARI */
        currentBook && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: textColor }}>
                  Fasiküller ve Konular ({selectedBookData.units.length})
                </span>
                <span
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    fontSize: '0.66rem',
                    fontWeight: 850,
                    padding: '2px 8px',
                    borderRadius: 99
                  }}
                >
                  {selectedBookData.totalTestsCount} Test
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700 }}>
                Testleri listelemek için konuya dokunun
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                gap: 12
              }}
            >
              {selectedBookData.units.map((unit, uIdx) => {
                const isUnitComplete = unit.progressPct === 100 && unit.totalCount > 0;

                return (
                  <div
                    key={unit.id || uIdx}
                    onClick={() => setSelectedUnitForModal(unit)}
                    style={{
                      background: innerCardBg,
                      borderRadius: 18,
                      border: isUnitComplete
                        ? '1px solid rgba(16, 185, 129, 0.35)'
                        : `1px solid ${borderColor}`,
                      padding: '1rem 1.15rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      position: 'relative',
                      boxShadow: isDarkEffective ? '0 4px 16px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}
                    className="hover:scale-[1.01] hover:border-purple-500/50"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: isUnitComplete
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : `linear-gradient(135deg, ${currentSubjectConfig.from} 0%, ${currentSubjectConfig.to} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            color: '#fff',
                            flexShrink: 0,
                            boxShadow: isUnitComplete ? '0 4px 14px rgba(16, 185, 129, 0.35)' : `0 4px 14px ${currentSubjectConfig.glow}`
                          }}
                        >
                          {isUnitComplete ? '✓' : '📁'}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 900,
                              color: textColor,
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {unit.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 700, marginTop: 2 }}>
                            {unit.totalCount} Test • {unit.completedCount} Çözüldü (%{unit.progressPct})
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUnitForModal(unit);
                        }}
                        style={{
                          background: `linear-gradient(135deg, ${currentSubjectConfig.from} 0%, ${currentSubjectConfig.to} 100%)`,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 10,
                          padding: '0.42rem 0.85rem',
                          fontSize: '0.74rem',
                          fontWeight: 850,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          flexShrink: 0,
                          boxShadow: `0 2px 10px ${currentSubjectConfig.glow}`
                        }}
                      >
                        <span>Testler</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    {/* Konu İlerleme Çubuğu */}
                    <div style={{ height: 6, background: isDarkEffective ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${unit.progressPct}%`,
                          height: '100%',
                          background: isUnitComplete
                            ? 'linear-gradient(90deg, #10b981, #059669)'
                            : `linear-gradient(90deg, ${currentSubjectConfig.from}, ${currentSubjectConfig.to})`,
                          borderRadius: 99,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* ══════════════════════════════════════════════════════════════
          7. 🪟 KONU TESTLERİ ÖZEL DİYALOG PENCERESİ (MODAL)
      ══════════════════════════════════════════════════════════════ */}
      {selectedUnitForModal && (
        <TopicTestsModal
          unit={selectedUnitForModal}
          bookTitle={currentBook?.title || ''}
          subjectConfig={currentSubjectConfig}
          isDark={isDarkEffective}
          isMobile={isMobile}
          onClose={() => setSelectedUnitForModal(null)}
          onStartTest={handleStartTest}
        />
      )}
    </div>
  );
}

// ─── KONU TESTLERİ ÖZEL DİYALOG PENCERESİ (MODAL) ─────────────────
function TopicTestsModal({
  unit,
  bookTitle,
  subjectConfig,
  isDark = true,
  isMobile,
  onClose,
  onStartTest
}) {
  const [topicSearch, setTopicSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unsolved' | 'solved'

  const filteredTests = useMemo(() => {
    let list = unit.tests || [];
    if (filterMode === 'unsolved') {
      list = list.filter(t => !t.isCompleted);
    } else if (filterMode === 'solved') {
      list = list.filter(t => t.isCompleted);
    }
    if (!topicSearch.trim()) return list;
    const q = topicSearch.toLowerCase().trim();
    return list.filter(t => {
      const name = String(t.name || t.title || '').toLowerCase();
      return name.includes(q);
    });
  }, [unit.tests, topicSearch, filterMode]);

  const modalBg = isDark ? '#141d30' : '#ffffff';
  const modalBorder = isDark ? 'rgba(255, 255, 255, 0.16)' : '#cbd5e1';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 7, 15, 0.82)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          background: modalBg,
          borderRadius: 24,
          border: `1.5px solid ${modalBorder}`,
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalZoomIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <style>{`
          @keyframes modalZoomIn {
            from { opacity: 0; transform: scale(0.96) translateY(12px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Modal Başlığı */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: isDark ? 'rgba(24, 34, 56, 0.95)' : '#f8fafc',
            borderBottom: `1px solid ${modalBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${subjectConfig.from} 0%, ${subjectConfig.to} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                color: '#fff',
                flexShrink: 0,
                boxShadow: `0 4px 16px ${subjectConfig.glow}`
              }}
            >
              📁
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: textColor, lineHeight: 1.25 }}>
                {unit.name}
              </div>
              <div style={{ fontSize: '0.76rem', color: subTextColor, fontWeight: 700, marginTop: 2 }}>
                {bookTitle} • {unit.totalCount} Test ({unit.completedCount} Çözüldü • %{unit.progressPct})
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              border: 'none',
              color: textColor,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="hover:bg-red-500/20 hover:text-red-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Arama ve Filtre Çubuğu */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderBottom: `1px solid ${modalBorder}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: subTextColor }} />
            <input
              type="text"
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              placeholder="Bu fasiküldeki testlerde ara..."
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.2rem',
                borderRadius: 10,
                border: `1px solid ${modalBorder}`,
                background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
                color: textColor,
                fontSize: '0.8rem',
                fontWeight: 650,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'unsolved', label: '⏳ Kalan' },
              { id: 'solved', label: '✓ Çözülen' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 8,
                  fontSize: '0.72rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  border: filterMode === tab.id
                    ? `1.5px solid ${subjectConfig.color}`
                    : `1px solid ${modalBorder}`,
                  background: filterMode === tab.id
                    ? (isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff')
                    : 'transparent',
                  color: filterMode === tab.id ? subjectConfig.color : subTextColor
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Testler Listesi */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.15rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxHeight: '58vh'
          }}
        >
          {filteredTests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: subTextColor, fontSize: '0.88rem' }}>
              Test bulunamadı.
            </div>
          ) : (
            filteredTests.map((test, tIdx) => (
              <TestCardItem
                key={test.id || tIdx}
                test={test}
                isDark={isDark}
                subjectConfig={subjectConfig}
                onStartTest={onStartTest}
              />
            ))
          )}
        </div>

        {/* Modal Alt Çubuğu */}
        <div
          style={{
            padding: '0.95rem 1.5rem',
            background: isDark ? 'rgba(24, 34, 56, 0.95)' : '#f8fafc',
            borderTop: `1px solid ${modalBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '0.78rem', color: subTextColor, fontWeight: 700 }}>
            {unit.totalCount} testten {unit.completedCount} tanesi çözüldü
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
              border: `1px solid ${modalBorder}`,
              color: textColor,
              borderRadius: 10,
              padding: '0.45rem 1.15rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TEKİL TEST KARTI (TIKLAYINCA ÇALIŞMA ODASINDA ÇÖZER) ───────────
function TestCardItem({ test, isDark = true, subjectConfig, onStartTest }) {
  const isCompleted = test.isCompleted;

  return (
    <div
      onClick={() => onStartTest(test)}
      style={{
        background: isCompleted
          ? (isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4')
          : (isDark ? 'rgba(30, 42, 69, 0.75)' : '#ffffff'),
        border: isCompleted
          ? '1px solid rgba(16, 185, 129, 0.35)'
          : `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'}`,
        borderRadius: 16,
        padding: '0.85rem 1.15rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        gap: 12,
        boxShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.2)' : '0 2px 6px rgba(0, 0, 0, 0.03)'
      }}
      className="hover:scale-[1.01] hover:border-blue-500/60"
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        {/* Üst Rozetler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 900,
              background: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
              color: isDark ? '#93c5fd' : '#2563eb',
              padding: '1px 8px',
              borderRadius: 6
            }}
          >
            {test.questionCount || 12} Soru
          </span>

          {test.answerKey && (
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 900,
                background: isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff',
                color: isDark ? '#e9d5ff' : '#7c3aed',
                padding: '1px 8px',
                borderRadius: 6
              }}
            >
              🔑 Cevap Anahtarlı
            </span>
          )}

          {isCompleted ? (
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 900,
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                padding: '1px 8px',
                borderRadius: 99,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <CheckCircle2 size={11} /> Çözüldü
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                color: isDark ? '#cbd5e1' : '#64748b',
                padding: '1px 8px',
                borderRadius: 99
              }}
            >
              ⏳ Çözülmedi
            </span>
          )}
        </div>

        {/* Test Adı */}
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 850,
            color: isCompleted ? '#10b981' : (isDark ? '#ffffff' : '#0f172a'),
            lineHeight: 1.3
          }}
        >
          {test.name || test.title}
        </div>
      </div>

      {/* Çalışma Odasında Çöz Butonu */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStartTest(test);
        }}
        style={{
          background: isCompleted
            ? 'rgba(16, 185, 129, 0.2)'
            : `linear-gradient(135deg, ${subjectConfig?.from || '#3b82f6'} 0%, ${subjectConfig?.to || '#1d4ed8'} 100%)`,
          color: isCompleted ? '#10b981' : '#ffffff',
          border: isCompleted ? '1px solid rgba(16, 185, 129, 0.45)' : 'none',
          borderRadius: 12,
          padding: '0.48rem 0.95rem',
          fontSize: '0.76rem',
          fontWeight: 900,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          boxShadow: isCompleted ? 'none' : `0 4px 14px ${subjectConfig?.glow || 'rgba(59, 130, 246, 0.35)'}`,
          transition: 'all 0.15s ease'
        }}
        className="hover:scale-[1.03]"
      >
        <span>{isCompleted ? 'Yeniden Çöz 🔄' : '⚡ Çöz & Başla'}</span>
        <ArrowRight size={13} />
      </button>
    </div>
  );
}
