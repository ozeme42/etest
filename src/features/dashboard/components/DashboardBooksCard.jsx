import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Search, X, CheckCircle2, ChevronRight, PlayCircle, Filter,
  ArrowRight, Folder, FolderOpen, ExternalLink, Sparkles, Check
} from 'lucide-react';
import { useTrackedBooks } from '../../../context/TrackedBookContext';
import { useEvaluation } from '../../../context/EvaluationContext';
import { useHomework } from '../../../context/HomeworkContext';
import { useAuth } from '../../../context/AuthContext';
import { checkIsTaskSolved, buildSolvedIndex } from '../../../components/ProgramCenter';
import { toUUID, legacyHexUUID } from '../../../services/supabaseService';

// ─── YALNIZCA FİZİKİ SORU BANKALARINI FİLTRELER ───
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
  const s = String(subj || '').toLowerCase();
  if (s.includes('türk') || s.includes('paragraf')) return '📘';
  if (s.includes('mat') || s.includes('problem')) return '📐';
  if (s.includes('fen')) return '🔬';
  if (s.includes('sosyal') || s.includes('tarih')) return '🌍';
  if (s.includes('ing')) return '🇬🇧';
  if (s.includes('din')) return '🕌';
  return '📚';
};

export default function DashboardBooksCard({
  isMobile,
  isDark = true,
  books: propBooks,
  bookTests: propBookTests,
  submissions: propSubmissions,
  homeworks: propHomeworks,
  currentUserId: propUserId,
  onNavigateBookDetail
}) {
  const navigate = useNavigate();
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
  const [selectedUnitForModal, setSelectedUnitForModal] = useState(null);

  // 1. O(1) Çözülen Testler İndeksi
  const precomputedSolvedIndex = useMemo(() => {
    return buildSolvedIndex(currentUserId, submissions, homeworks);
  }, [currentUserId, submissions, homeworks]);

  // 2. Yalnızca Fiziki Soru Bankaları
  const physicalBooks = useMemo(() => {
    return (books || []).filter(isPhysicalQuestionBook);
  }, [books]);

  // 3. Ders Filtresine Göre Kitaplar
  const visiblePhysicalBooks = useMemo(() => {
    if (selectedSubject === 'all') return physicalBooks;
    return physicalBooks.filter(b => {
      const bSubj = getBookSubject(b).toLowerCase();
      const targetSubj = selectedSubject.toLowerCase();
      return bSubj.includes(targetSubj) || targetSubj.includes(bSubj);
    });
  }, [physicalBooks, selectedSubject]);

  // 4. Kitap seçimini senkronize et
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

  // Kitap değişince konu modalını kapat
  useEffect(() => {
    setSelectedUnitForModal(null);
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

  // 5. Seçili Kitabın Üniteleri ve Testlerini Çıkarma
  const selectedBookData = useMemo(() => {
    if (!currentBook) return { units: [], allTests: [], totalTestsCount: 0, solvedCount: 0 };

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
    return {
      units,
      allTests,
      totalTestsCount: allTests.length,
      solvedCount,
      progressPct: allTests.length > 0 ? Math.round((solvedCount / allTests.length) * 100) : 0
    };
  }, [currentBook, bookTests, submissions, homeworks, currentUserId, precomputedSolvedIndex]);

  // Arama filtresi
  const searchMatchingTests = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return selectedBookData.allTests.filter(t => {
      const name = String(t.name || t.title || '').toLowerCase();
      const unit = String(t.unitName || '').toLowerCase();
      return name.includes(q) || unit.includes(q);
    });
  }, [selectedBookData.allTests, searchQuery]);

  // Test seçilip çalışma odasına yönlendirme
  const handleStartTest = (test) => {
    setSelectedUnitForModal(null);
    navigate('/study-room', { state: { startTask: test } });
  };

  // Renk teması
  const cardBg = isDark ? '#141c2e' : '#ffffff';
  const innerCardBg = isDark ? 'rgba(30, 41, 69, 0.75)' : '#f8fafc';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 22,
        border: `1px solid ${borderColor}`,
        boxShadow: isDark ? '0 12px 36px rgba(0, 0, 0, 0.45)' : '0 6px 24px rgba(0, 0, 0, 0.06)',
        padding: isMobile ? '1rem 0.85rem' : '1.35rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.1rem',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      {/* ── 1. DERS FİLTRE HAPLARI ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none'
        }}
      >
        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: subTextColor, marginRight: 2, flexShrink: 0 }}>
          Ders:
        </span>
        {[
          { id: 'all', label: 'Tüm Dersler', icon: '🎯' },
          { id: 'Türkçe', label: 'Türkçe', icon: '📘' },
          { id: 'Matematik', label: 'Matematik', icon: '📐' },
          { id: 'Fen Bilimleri', label: 'Fen Bilimleri', icon: '🔬' },
          { id: 'Sosyal Bilgiler', label: 'Sosyal Bilgiler', icon: '🌍' },
          { id: 'İngilizce', label: 'İngilizce', icon: '🇬🇧' },
          { id: 'Din Kültürü', label: 'Din Kültürü', icon: '🕌' }
        ].map(item => {
          const isSelected = selectedSubject === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedSubject(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '0.42rem 0.85rem',
                borderRadius: 999,
                fontSize: '0.76rem',
                fontWeight: 850,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                border: isSelected ? '1.5px solid #a855f7' : `1px solid ${borderColor}`,
                background: isSelected
                  ? 'linear-gradient(135deg, #a855f7, #6366f1)'
                  : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'),
                color: isSelected ? '#ffffff' : (isDark ? '#e2e8f0' : '#334155'),
                boxShadow: isSelected ? '0 4px 14px rgba(168, 85, 247, 0.35)' : 'none'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 2. FİZİKİ SORU BANKALARI LİSTESİ (SEÇİM HAPLARI) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none'
        }}
      >
        {visiblePhysicalBooks.map(book => {
          const isSelected = String(book.id) === String(selectedBookId);
          const subj = getBookSubject(book);
          const icon = getSubjectIcon(subj);

          return (
            <button
              key={book.id}
              type="button"
              onClick={() => setSelectedBookId(book.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.4rem 0.8rem',
                borderRadius: 10,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                border: isSelected
                  ? '1.5px solid #a855f7'
                  : `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'}`,
                background: isSelected
                  ? (isDark ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.28), rgba(99, 102, 241, 0.22))' : '#f3e8ff')
                  : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'),
                color: isSelected ? (isDark ? '#f3e8ff' : '#6b21a8') : textColor,
                boxShadow: isSelected ? '0 2px 10px rgba(168, 85, 247, 0.25)' : 'none',
                flexShrink: 0
              }}
            >
              <span style={{ fontSize: '0.92rem' }}>{icon}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>{book.title}</span>
            </button>
          );
        })}
      </div>

      {/* ── 3. SEÇİLİ KİTAP DETAY BAŞLIĞI & İLERLEME ── */}
      {currentBook ? (
        <div
          style={{
            background: innerCardBg,
            borderRadius: 16,
            padding: '1rem 1.15rem',
            border: `1px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          {/* Kitap Bilgisi & İlerleme */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  color: '#fff',
                  flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)'
                }}
              >
                {getSubjectIcon(getBookSubject(currentBook))}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.02rem', fontWeight: 900, color: textColor }}>
                    {currentBook.title}
                  </span>
                  <span
                    style={{
                      background: 'rgba(168, 85, 247, 0.18)',
                      color: isDark ? '#e9d5ff' : '#7c3aed',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 8
                    }}
                  >
                    Soru Bankası
                  </span>
                </div>
                {currentBook.publisher && (
                  <div style={{ fontSize: '0.74rem', color: subTextColor, fontWeight: 700, marginTop: 2 }}>
                    🏢 {currentBook.publisher}
                  </div>
                )}
              </div>
            </div>

            {/* Çözülen Test Sayısı & Oran */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#10b981' }}>
                  {selectedBookData.solvedCount} / {selectedBookData.totalTestsCount} Çözüldü
                </div>
                <div style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 700 }}>
                  %{selectedBookData.progressPct} Tamamlandı
                </div>
              </div>
              {onNavigateBookDetail && (
                <button
                  type="button"
                  onClick={() => onNavigateBookDetail(currentBook.id)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: `1px solid ${borderColor}`,
                    color: textColor,
                    borderRadius: 10,
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                  title="Kitabın haritasını ve detaylarını aç"
                >
                  <span>Haritayı Aç</span>
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          </div>

          {/* İlerleme Çubuğu */}
          <div style={{ height: 8, background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                width: `${selectedBookData.progressPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #6366f1 100%)',
                borderRadius: 99,
                transition: 'width 0.4s ease'
              }}
            />
          </div>

          {/* Test Arama Çubuğu */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: subTextColor }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`${currentBook.title} içinde test ara...`}
              style={{
                width: '100%',
                padding: '0.6rem 2.2rem 0.6rem 2.4rem',
                borderRadius: 12,
                border: `1px solid ${borderColor}`,
                background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#ffffff',
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
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: subTextColor, fontSize: '0.86rem' }}>
          Bu derse ait soru bankası bulunamadı.
        </div>
      )}

      {/* ── 4. ARAMA SONUÇLARI VEYA KONU / FASİKÜL KARTLARI ── */}
      {searchQuery.trim() ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 850, color: subTextColor }}>
            Arama Sonuçları ({searchMatchingTests.length} Test):
          </div>
          {searchMatchingTests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: subTextColor, fontSize: '0.82rem' }}>
              "{searchQuery}" ile eşleşen test bulunamadı.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 8 }}>
              {searchMatchingTests.map(test => (
                <TestCardItem
                  key={test.id}
                  test={test}
                  isDark={isDark}
                  onStartTest={handleStartTest}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 850, color: subTextColor }}>
              Konular & Fasiküller ({selectedBookData.units.length})
            </span>
            <span style={{ fontSize: '0.72rem', color: subTextColor }}>
              Testleri görmek için konuya dokunun
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: 10
            }}
          >
            {selectedBookData.units.map((unit, uIdx) => (
              <div
                key={unit.id || uIdx}
                onClick={() => setSelectedUnitForModal(unit)}
                style={{
                  background: innerCardBg,
                  borderRadius: 12,
                  border: `1px solid ${borderColor}`,
                  padding: '0.65rem 0.95rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="hover:scale-[1.005] hover:border-purple-500/50"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        background: unit.progressPct === 100
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'linear-gradient(135deg, #a855f7, #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.95rem',
                        color: '#fff',
                        flexShrink: 0
                      }}
                    >
                      {unit.progressPct === 100 ? '✓' : '📁'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          color: textColor,
                          lineHeight: 1.25,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {unit.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: subTextColor, fontWeight: 650, marginTop: 1 }}>
                        {unit.totalCount} Test • {unit.completedCount} Çözüldü
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
                      background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(168, 85, 247, 0.25)'
                    }}
                  >
                    <span>Testler</span>
                    <ArrowRight size={11} />
                  </button>
                </div>

                {/* Konu İlerleme Çubuğu */}
                <div style={{ height: 4, background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${unit.progressPct}%`,
                      height: '100%',
                      background: unit.progressPct === 100
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : 'linear-gradient(90deg, #a855f7, #6366f1)',
                      borderRadius: 99,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. KONUYA TIKLAYINCA AÇILAN TEST PENCERESİ (MODAL DİYALOG) ── */}
      {selectedUnitForModal && (
        <TopicTestsModal
          unit={selectedUnitForModal}
          bookTitle={currentBook?.title || ''}
          isDark={isDark}
          isMobile={isMobile}
          onClose={() => setSelectedUnitForModal(null)}
          onStartTest={handleStartTest}
        />
      )}
    </div>
  );
}

// ─── KONU TESTLERİ ÖZEL PENCERESİ (MODAL) ───
function TopicTestsModal({
  unit,
  bookTitle,
  isDark = true,
  isMobile,
  onClose,
  onStartTest
}) {
  const [topicSearch, setTopicSearch] = useState('');

  const filteredTests = useMemo(() => {
    if (!topicSearch.trim()) return unit.tests || [];
    const q = topicSearch.toLowerCase().trim();
    return (unit.tests || []).filter(t => {
      const name = String(t.name || t.title || '').toLowerCase();
      return name.includes(q);
    });
  }, [unit.tests, topicSearch]);

  const modalBg = isDark ? '#182238' : '#ffffff';
  const modalBorder = isDark ? 'rgba(255, 255, 255, 0.16)' : '#cbd5e1';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 7, 15, 0.75)',
        backdropFilter: 'blur(10px)',
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
          maxWidth: 680,
          maxHeight: '88vh',
          background: modalBg,
          borderRadius: 22,
          border: `1.5px solid ${modalBorder}`,
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalZoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <style>{`
          @keyframes modalZoomIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Modal Başlığı */}
        <div
          style={{
            padding: '1.1rem 1.35rem',
            background: isDark ? 'rgba(28, 39, 64, 0.95)' : '#f8fafc',
            borderBottom: `1px solid ${modalBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                color: '#fff',
                flexShrink: 0
              }}
            >
              📁
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: textColor, lineHeight: 1.25 }}>
                {unit.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: subTextColor, fontWeight: 700, marginTop: 2 }}>
                {bookTitle} • {unit.totalCount} Test ({unit.completedCount} Çözüldü)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
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

        {/* Konu İçi Arama Çubuğu */}
        <div style={{ padding: '0.75rem 1.35rem', borderBottom: `1px solid ${modalBorder}` }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: subTextColor }} />
            <input
              type="text"
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              placeholder="Bu konu içindeki testlerde ara..."
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.2rem',
                borderRadius: 10,
                border: `1px solid ${modalBorder}`,
                background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#ffffff',
                color: textColor,
                fontSize: '0.8rem',
                fontWeight: 650,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Testler Listesi */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem 1.35rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: '58vh'
          }}
        >
          {filteredTests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: subTextColor, fontSize: '0.84rem' }}>
              Test bulunamadı.
            </div>
          ) : (
            filteredTests.map((test, tIdx) => (
              <TestCardItem
                key={test.id || tIdx}
                test={test}
                isDark={isDark}
                onStartTest={onStartTest}
              />
            ))
          )}
        </div>

        {/* Modal Alt Çubuğu */}
        <div
          style={{
            padding: '0.85rem 1.35rem',
            background: isDark ? 'rgba(28, 39, 64, 0.95)' : '#f8fafc',
            borderTop: `1px solid ${modalBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '0.76rem', color: subTextColor, fontWeight: 700 }}>
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
              padding: '0.45rem 1rem',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Pencereyi Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TEKİL TEST KARTI (TIKLAYINCA ÇALIŞMA ODASINDA ÇÖZER) ───
function TestCardItem({ test, isDark = true, onStartTest }) {
  const isCompleted = test.isCompleted;

  return (
    <div
      onClick={() => onStartTest(test)}
      style={{
        background: isCompleted
          ? (isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4')
          : (isDark ? 'rgba(37, 50, 82, 0.75)' : '#ffffff'),
        border: isCompleted
          ? '1px solid rgba(16, 185, 129, 0.35)'
          : `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'}`,
        borderRadius: 14,
        padding: '0.8rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        gap: 12
      }}
      className="hover:scale-[1.01] hover:border-purple-500/60"
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
              padding: '1px 7px',
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
                padding: '1px 7px',
                borderRadius: 6
              }}
            >
              🔑 Cevap Anahtarlı
            </span>
          )}

          {isCompleted ? (
            <span
              style={{
                fontSize: '0.64rem',
                fontWeight: 900,
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                padding: '1px 7px',
                borderRadius: 99,
                display: 'flex',
                alignItems: 'center',
                gap: 3
              }}
            >
              <CheckCircle2 size={11} /> Çözüldü
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.64rem',
                fontWeight: 800,
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                color: isDark ? '#cbd5e1' : '#64748b',
                padding: '1px 7px',
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
            fontSize: '0.88rem',
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
            ? 'rgba(16, 185, 129, 0.25)'
            : 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
          color: isCompleted ? '#10b981' : '#ffffff',
          border: isCompleted ? '1px solid rgba(168, 85, 247, 0.45)' : 'none',
          borderRadius: 10,
          padding: '0.45rem 0.85rem',
          fontSize: '0.76rem',
          fontWeight: 900,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0,
          boxShadow: isCompleted ? 'none' : '0 4px 12px rgba(168, 85, 247, 0.35)'
        }}
      >
        <span>{isCompleted ? 'Yeniden Çöz 🔄' : 'Çöz & Başla 🚀'}</span>
        <ArrowRight size={13} />
      </button>
    </div>
  );
}
