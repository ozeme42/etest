import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, X, Calendar, BookOpen, CheckCircle2, ChevronRight, ChevronDown, ChevronUp,
  Eye, EyeOff, Check, PlayCircle, ArrowLeft, Filter, Sparkles, Clock, HelpCircle,
  Layers, Bookmark, ArrowRight, Award, Hash, Zap, FolderOpen, Folder, ExternalLink
} from 'lucide-react';
import { checkIsTaskSolved, buildSolvedIndex } from '../../../components/ProgramCenter';
import { toUUID, legacyHexUUID } from '../../../services/supabaseService';

// Yalnızca fiziki soru bankalarını filtreler (Denemeler, hazır bulunuşluk ve okuma kitaplarını ayıklar)
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

const getSubjectGradient = (subj) => {
  const s = String(subj || '').toLowerCase();
  if (s.includes('türk')) return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
  if (s.includes('mat')) return 'linear-gradient(135deg, #8b5cf6, #6366f1)';
  if (s.includes('fen')) return 'linear-gradient(135deg, #10b981, #059669)';
  if (s.includes('sosyal')) return 'linear-gradient(135deg, #06b6d4, #0891b2)';
  if (s.includes('ing')) return 'linear-gradient(135deg, #f59e0b, #d97706)';
  if (s.includes('din')) return 'linear-gradient(135deg, #ec4899, #be185d)';
  return 'linear-gradient(135deg, #6366f1, #4f46e5)';
};

export default React.memo(function StudyHomeworkPickerModal({
  show,
  onClose,
  themeObj,
  isMobile,
  hwSourceTab = 'books',
  setHwSourceTab,
  hwFilterSubject = 'all',
  setHwFilterSubject,
  hwSearchQuery = '',
  setHwSearchQuery,
  hideCompletedTasks = false,
  setHideCompletedTasks,
  selectedProgramDay,
  setSelectedProgramDay,
  weeklyProgramGrouped = [],
  allAssignedTasks = [],
  books = [],
  bookTests = [],
  submissions = [],
  homeworks = [],
  studyAssignments = [],
  currentUserId = null,
  onSelectTask
}) {
  if (!show) return null;

  const [selectedBookId, setSelectedBookId] = useState(null);
  // KONUYA TIKLAYINCA AÇILACAK TEST PENCERESİ STATE'İ
  const [selectedUnitForModal, setSelectedUnitForModal] = useState(null);
  const [mobileActiveStep, setMobileActiveStep] = useState('books'); // 'books' or 'topics' on mobile
  const searchInputRef = useRef(null);

  // ESC tuşuyla pencere veya tam sayfayı kapatma
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedUnitForModal) {
          setSelectedUnitForModal(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, selectedUnitForModal, onClose]);

  // Kitap değiştiğinde konu penceresini sıfırla
  useEffect(() => {
    setSelectedUnitForModal(null);
  }, [selectedBookId]);

  // 1. O(1) Hızlı İndeks: Çözülen testlerin Set indeksini tek seferde oluşturur
  const precomputedSolvedIndex = useMemo(() => {
    return buildSolvedIndex(currentUserId, submissions, homeworks);
  }, [currentUserId, submissions, homeworks]);

  // 2. Sadece fiziki soru bankaları (8 adet)
  const physicalBooks = useMemo(() => {
    return (books || []).filter(isPhysicalQuestionBook);
  }, [books]);

  // 3. Seçili derse göre filtrelenmiş soru bankaları
  const visiblePhysicalBooks = useMemo(() => {
    if (hwFilterSubject === 'all') return physicalBooks;
    return physicalBooks.filter(b => {
      const bSubj = getBookSubject(b).toLowerCase();
      const targetSubj = hwFilterSubject.toLowerCase();
      return bSubj.includes(targetSubj) || targetSubj.includes(bSubj);
    });
  }, [physicalBooks, hwFilterSubject]);

  // 4. Kitap seçimini otomatik senkronize et
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

  const currentBook = useMemo(() => {
    if (!visiblePhysicalBooks.length) return null;
    return visiblePhysicalBooks.find(b => String(b.id) === String(selectedBookId)) || visiblePhysicalBooks[0];
  }, [visiblePhysicalBooks, selectedBookId]);

  // 5. Seçili kitabın Ünitelerini ve Testlerini çıkarma (Kanonik ve DB testlerini eksiksiz birleştirir)
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

          // Konuya ait DB testleri
          const dbTopicTests = testsInBook.filter(t => {
            const tTpId = String(t.topicId || t.topic_id || '');
            return tTpId === tpId || tTpId === String(tp.id) || (toUUID(tTpId) && toUUID(tTpId) === toUUID(tpId));
          });

          // Konunun kanonik testleri (kitap şemasındaki 138 test)
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

            // Ekstra DB testlerini ekle
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
            // Varsayılan testler
            for (let i = 1; i <= 5; i++) {
              combinedRawTests.push({
                id: `tbt_${bId}_${subj.id || sIdx}_${tpId}_${i}`,
                name: i <= 3 ? `Test-${i}` : (i === 4 ? 'Yeni Nesil 1' : 'Yeni Nesil 2'),
                questionCount: 20,
                answerKey: {}
              });
            }
          }

          const formattedTests = combinedRawTests.map((t, tIdx) => {
            const matchedDbTest = directTestMap.get(String(t.id)) ||
                                  directTestMap.get(String(t.id).replace(/^bt_|^tbt_/, '')) ||
                                  t;

            const tName = matchedDbTest.name || matchedDbTest.title || t.name || t.title || `Test ${t.test_order || (tIdx + 1)}`;
            const cleanTitle = `${currentBook.title} • ${tName}`;
            const testId = String(t.id || matchedDbTest.id || `t_${tpId}_${tIdx}`);

            const isSolved = checkIsTaskSolved(
              {
                id: testId,
                testId: testId,
                bookTestId: testId,
                realTestId: testId,
                taskType: 'kitap',
                bookId: currentBook.id,
                bookTitle: currentBook.title,
                subject: sName,
                subjectName: sName,
                unit: tpName,
                topic: tpName,
                unitTopic: tpName,
                topicId: tpId,
                name: tName,
                testName: tName,
                title: cleanTitle
              },
              currentUserId,
              submissions,
              homeworks,
              studyAssignments,
              precomputedSolvedIndex,
              bookTests,
              books
            );

            const qCount = Number(matchedDbTest.questionCount || matchedDbTest.question_count || t.questionCount || t.question_count) ||
              (matchedDbTest.answer_key ? Object.keys(matchedDbTest.answer_key).filter(k => !k.startsWith('_')).length : null) ||
              (matchedDbTest.answerKey ? Object.keys(matchedDbTest.answerKey).filter(k => !k.startsWith('_')).length : null) ||
              (t.answer_key ? Object.keys(t.answer_key).filter(k => !k.startsWith('_')).length : null) ||
              (t.answerKey ? Object.keys(t.answerKey).filter(k => !k.startsWith('_')).length : null) ||
              12;

            return {
              ...matchedDbTest,
              id: testId,
              realTestId: testId,
              bookTestId: testId,
              bookId: currentBook.id,
              bookTitle: currentBook.title,
              title: cleanTitle,
              name: tName,
              subject: sName,
              unit: tpName,
              unitId: tpId,
              topic: tpName,
              topicId: tpId,
              orderIndex: t.test_order || (tIdx + 1),
              questionCount: qCount,
              answerKey: matchedDbTest.answer_key || matchedDbTest.answerKey || t.answer_key || t.answerKey,
              isCompleted: isSolved,
              sourceType: 'book',
              sourceLabel: '📚 Kitap Testi'
            };
          });

          allTests = allTests.concat(formattedTests);
          units.push({
            id: tpId,
            name: tpName,
            subjectName: sName,
            tests: formattedTests,
            completedCount: formattedTests.filter(t => t.isCompleted).length,
            totalCount: formattedTests.length
          });
        });
      } else {
        const dbSubjTests = testsInBook.filter(t => String(t.subjectId || t.subject_id) === String(subj.id));
        const canonicalSubjTests = Array.isArray(subj.tests) ? subj.tests : [];

        const seenTestIds = new Set();
        const seenTestNames = new Set();
        const combinedSubjRawTests = [];

        if (canonicalSubjTests.length > 0) {
          canonicalSubjTests.forEach((ct, ctIdx) => {
            if (!ct) return;
            const ctId = String(ct.id || `ct_s_${sIdx}_${ctIdx}`);
            const ctClean = ctId.replace(/^bt_|^tbt_/, '');
            const ctName = String(ct.name || ct.title || `Test ${ctIdx + 1}`).trim();
            const ctNameKey = ctName.toLowerCase();

            const matchedDb = directTestMap.get(ctId) ||
                              directTestMap.get(ctClean) ||
                              (toUUID(ctClean) ? directTestMap.get(String(toUUID(ctClean))) : null) ||
                              directTestMap.get(ctNameKey) ||
                              dbSubjTests.find(dt => {
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

            combinedSubjRawTests.push({
              ...ct,
              ...(matchedDb || {}),
              id: ct.id || matchedDb?.id || ctId,
              name: ctName,
              test_order: ct.test_order ?? ct.order ?? ct.orderIndex ?? (ctIdx + 1)
            });
          });

          dbSubjTests.forEach((dt, dtIdx) => {
            if (!dt) return;
            const dtId = String(dt.id || `dt_s_${sIdx}_${dtIdx}`);
            const dtClean = dtId.replace(/^bt_|^tbt_/, '');
            const dtName = String(dt.name || dt.title || '').trim();
            const dtNameKey = dtName.toLowerCase();

            if (!seenTestIds.has(dtId) && !seenTestIds.has(dtClean) && (!dtNameKey || !seenTestNames.has(dtNameKey))) {
              seenTestIds.add(dtId);
              seenTestIds.add(dtClean);
              if (dtNameKey) seenTestNames.add(dtNameKey);
              combinedSubjRawTests.push(dt);
            }
          });
        } else if (dbSubjTests.length > 0) {
          combinedSubjRawTests.push(...dbSubjTests);
        } else {
          for (let i = 1; i <= 5; i++) {
            combinedSubjRawTests.push({
              id: `tbt_${bId}_${subj.id || sIdx}_${i}`,
              name: i <= 3 ? `Test-${i}` : (i === 4 ? 'Yeni Nesil 1' : 'Yeni Nesil 2'),
              questionCount: 20,
              answerKey: {}
            });
          }
        }

        const formattedTests = combinedSubjRawTests.map((t, tIdx) => {
          const matchedDbTest = directTestMap.get(String(t.id)) || directTestMap.get(String(t.id).replace(/^bt_|^tbt_/, '')) || t;
          const tName = matchedDbTest.name || matchedDbTest.title || t.name || t.title || `Test ${t.test_order || (tIdx + 1)}`;
          const testId = String(t.id || matchedDbTest.id || `t_s_${sIdx}_${tIdx}`);
          const cleanTitle = `${currentBook.title} • ${tName}`;

          const isSolved = checkIsTaskSolved(
            {
              id: testId,
              testId: testId,
              bookTestId: testId,
              realTestId: testId,
              taskType: 'kitap',
              bookId: currentBook.id,
              bookTitle: currentBook.title,
              subject: sName,
              subjectName: sName,
              unit: sName,
              topic: '',
              name: tName,
              testName: tName,
              title: cleanTitle
            },
            currentUserId,
            submissions,
            homeworks,
            studyAssignments,
            precomputedSolvedIndex,
            bookTests,
            books
          );

          const qCount = Number(matchedDbTest.questionCount || matchedDbTest.question_count || t.questionCount || t.question_count) || 12;

          return {
            ...matchedDbTest,
            id: testId,
            realTestId: testId,
            bookTestId: testId,
            bookId: currentBook.id,
            bookTitle: currentBook.title,
            title: cleanTitle,
            name: tName,
            subject: sName,
            unit: sName,
            unitId: String(subj.id || sIdx),
            topic: '',
            orderIndex: t.test_order || (tIdx + 1),
            questionCount: qCount,
            answerKey: matchedDbTest.answer_key || matchedDbTest.answerKey || t.answer_key || t.answerKey,
            isCompleted: isSolved,
            sourceType: 'book',
            sourceLabel: '📚 Kitap Testi'
          };
        });

        allTests = allTests.concat(formattedTests);
        units.push({
          id: String(subj.id || sIdx),
          name: sName,
          subjectName: sName,
          tests: formattedTests,
          completedCount: formattedTests.filter(t => t.isCompleted).length,
          totalCount: formattedTests.length
        });
      }
    });

    const solvedCount = allTests.filter(t => t.isCompleted).length;
    return {
      units,
      allTests,
      totalTestsCount: allTests.length,
      solvedCount
    };
  }, [currentBook, bookTests, submissions, homeworks, studyAssignments, currentUserId, books, precomputedSolvedIndex]);

  // Arama & bitenler filtresi
  const matchesTestFilter = (test) => {
    if (hideCompletedTasks && test.isCompleted) return false;
    if (hwSearchQuery.trim()) {
      const q = hwSearchQuery.toLowerCase();
      const match = (test.title || '').toLowerCase().includes(q) ||
                    (test.name || '').toLowerCase().includes(q) ||
                    (test.unit || '').toLowerCase().includes(q) ||
                    (test.topic || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  };

  // Haftalık Program & Ödev filtreleri
  const matchesFilter = (task) => {
    if (hideCompletedTasks && task.isCompleted) return false;
    if (hwFilterSubject !== 'all' && task.subject && !task.subject.toLowerCase().includes(hwFilterSubject.toLowerCase())) {
      return false;
    }
    if (hwSearchQuery.trim()) {
      const q = hwSearchQuery.toLowerCase();
      const match = (task.title || '').toLowerCase().includes(q) ||
                    (task.name || '').toLowerCase().includes(q) ||
                    (task.subtitle || '').toLowerCase().includes(q) ||
                    (task.subject || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  };

  // Doğrudan arama yapılıyorsa eşleşen testler
  const searchMatchingTests = useMemo(() => {
    if (!hwSearchQuery.trim()) return [];
    return selectedBookData.allTests.filter(matchesTestFilter);
  }, [selectedBookData.allTests, hwSearchQuery, hideCompletedTasks]);

  const currentDayGroup = (weeklyProgramGrouped || []).find(g => g.key === selectedProgramDay) || weeklyProgramGrouped?.[0] || { tasks: [] };
  const programTasksForDay = (currentDayGroup.tasks || []).filter(matchesFilter);
  const homeworkTasks = allAssignedTasks.filter(t => t.sourceType === 'homework' && matchesFilter(t));

  // Tab sayıları
  const programTotalCount = (weeklyProgramGrouped || []).reduce((acc, g) => {
    const valid = (g.tasks || []).filter(t => !hideCompletedTasks || !t.isCompleted);
    return acc + valid.length;
  }, 0);
  const homeworkTotalCount = allAssignedTasks.filter(t => t.sourceType === 'homework' && (!hideCompletedTasks || !t.isCompleted)).length;
  const physicalBooksCount = physicalBooks.length;

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #182238 0%, #1a243c 50%, #151d30 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Outfit', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* ─── 1. ÜST HEADER BAR (TAM SAYFA KONTROLÜ) ─── */}
      <header
        style={{
          height: 64,
          flexShrink: 0,
          background: 'rgba(28, 39, 64, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          gap: 12
        }}
      >
        {/* Sol: Geri / Çıkış butonu & Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f1f5f9',
              borderRadius: 12,
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={16} />
            <span>Çalışma Odasına Dön</span>
          </button>

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
              <span style={{ fontSize: '1.1rem' }}>🎯</span>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ffffff' }}>
                  Çalışma Görevi & Test Seçimi
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                  Kitaplardan, programından veya ödevlerinden bir test seç
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orta: 3 Ana Kaynak Sekmesi (Kitaplarım, Program, Ödevler) */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', padding: 4, borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)' }}>
          {[
            { id: 'books', label: isMobile ? '📚 Kitaplarım' : '📚 Kitaplarım (Soru Bankası)', count: physicalBooksCount },
            { id: 'program', label: isMobile ? '📅 Program' : '📅 Ders Programı', count: programTotalCount },
            { id: 'homework', label: isMobile ? '📝 Ödevler' : '📝 Atanmış Ödevler', count: homeworkTotalCount }
          ].map(tab => {
            const isActive = hwSourceTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setHwSourceTab(tab.id);
                  if (tab.id === 'books') setMobileActiveStep('books');
                }}
                style={{
                  padding: isMobile ? '0.4rem 0.65rem' : '0.45rem 1rem',
                  borderRadius: 10,
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  fontWeight: 850,
                  fontSize: isMobile ? '0.74rem' : '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 4px 14px rgba(168, 85, 247, 0.35)' : 'none'
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: 99
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sağ: Bitenler Filtresi & Kapat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setHideCompletedTasks(!hideCompletedTasks)}
            title={hideCompletedTasks ? 'Biten testleri göster' : 'Biten testleri gizle'}
            style={{
              background: hideCompletedTasks ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${hideCompletedTasks ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
              color: hideCompletedTasks ? '#10b981' : '#f1f5f9',
              borderRadius: 10,
              padding: '0.42rem 0.75rem',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s ease'
            }}
          >
            {hideCompletedTasks ? <EyeOff size={14} color="#10b981" /> : <Eye size={14} />}
            {!isMobile && <span>{hideCompletedTasks ? 'Bitenler Gizli' : 'Bitenleri Göster'}</span>}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f1f5f9',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ─── 2. ANA ÇALIŞMA ALANI ─── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ========================================================================= */}
        {/* SEKME 1: KİTAPLARIM (SORU BANKASI) - SOLDA KİTAPLAR, SAĞDA KONULAR        */}
        {/* ========================================================================= */}
        {hwSourceTab === 'books' && (
          <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* SOL SÜTUN: DERS FİLTRELERİ & KİTAP LİSTESİ */}
            <div
              style={{
                width: isMobile ? '100%' : 370,
                flexShrink: 0,
                background: 'rgba(24, 33, 54, 0.95)',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                display: isMobile && mobileActiveStep === 'topics' ? 'none' : 'flex',
                flexDirection: 'column',
                overflowY: 'auto'
              }}
            >
              {/* 1. Ders Filtre Çipleri */}
              <div style={{ padding: '0.9rem 1rem 0.6rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  Ders Filtresi
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { id: 'all', name: 'Tüm Dersler', icon: '🎯' },
                    { id: 'Türkçe', name: 'Türkçe', icon: '📘' },
                    { id: 'Matematik', name: 'Matematik', icon: '📐' },
                    { id: 'Fen Bilimleri', name: 'Fen Bilimleri', icon: '🔬' },
                    { id: 'Sosyal Bilgiler', name: 'Sosyal', icon: '🌍' }
                  ].map(subj => {
                    const isSelected = hwFilterSubject === subj.id;
                    return (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => {
                          setHwFilterSubject(subj.id);
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 99,
                          border: isSelected ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.12)',
                          background: isSelected ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                          color: isSelected ? '#ffffff' : '#e2e8f0',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{subj.icon}</span>
                        <span>{subj.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Soru Bankası Kitapları Listesi */}
              <div style={{ padding: '0.8rem 1rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Soru Bankaları ({visiblePhysicalBooks.length})
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    Seçmek için dokunun
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {visiblePhysicalBooks.map(book => {
                    const isSelected = String(currentBook?.id) === String(book.id);
                    const bSubj = getBookSubject(book);
                    const icon = getSubjectIcon(bSubj);
                    const gradient = getSubjectGradient(bSubj);

                    return (
                      <div
                        key={book.id}
                        onClick={() => {
                          setSelectedBookId(book.id);
                          if (isMobile) setMobileActiveStep('topics');
                        }}
                        style={{
                          padding: '0.8rem 1rem',
                          borderRadius: 14,
                          background: isSelected ? 'rgba(168, 85, 247, 0.25)' : 'rgba(37, 50, 80, 0.65)',
                          border: isSelected ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          boxShadow: isSelected ? '0 4px 18px rgba(168, 85, 247, 0.25)' : 'none'
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.15rem',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                          }}
                        >
                          {icon}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {book.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{bSubj}</span>
                            <span>•</span>
                            <span style={{ color: '#c084fc', fontWeight: 700 }}>
                              {book.publisher || 'Soru Bankası'}
                            </span>
                          </div>
                        </div>

                        <ChevronRight size={16} color={isSelected ? '#a855f7' : '#94a3b8'} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SAĞ SÜTUN: KONULAR / FASİKÜLLER KARTLARI (TIKLAYINCA TESTLER PENCEREDE AÇILIR) */}
            <div
              style={{
                flex: 1,
                display: isMobile && mobileActiveStep === 'books' ? 'none' : 'flex',
                flexDirection: 'column',
                background: 'rgba(20, 27, 45, 0.98)',
                overflow: 'hidden'
              }}
            >
              {!currentBook ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.9rem' }}>
                  Lütfen sol menüden bir soru bankası seçin.
                </div>
              ) : (
                <>
                  {/* Kitap Bilgi & Arama Çubuğu */}
                  <div
                    style={{
                      padding: '0.9rem 1.25rem',
                      background: 'rgba(28, 39, 64, 0.92)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      flexShrink: 0
                    }}
                  >
                    {/* Üst Satır: Mobil Geri + Kitap Başlığı + İstatistik */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        {isMobile && (
                          <button
                            type="button"
                            onClick={() => setMobileActiveStep('books')}
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              border: 'none',
                              color: '#cbd5e1',
                              borderRadius: 8,
                              padding: '4px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.74rem'
                            }}
                          >
                            <ArrowLeft size={14} /> Kitaplar
                          </button>
                        )}
                        <span style={{ fontSize: '1.25rem' }}>{getSubjectIcon(getBookSubject(currentBook))}</span>
                        <div style={{ minWidth: 0 }}>
                          <h2 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 900, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentBook.title}
                          </h2>
                          <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: 1 }}>
                            {selectedBookData.units.length} Fasikül / Ünite • Toplam {selectedBookData.totalTestsCount} Test
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <div
                          style={{
                            background: 'rgba(168, 85, 247, 0.2)',
                            border: '1px solid rgba(168, 85, 247, 0.35)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: 10,
                            fontSize: '0.76rem',
                            fontWeight: 900,
                            color: '#e9d5ff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <CheckCircle2 size={13} color="#10b981" />
                          <span>{selectedBookData.solvedCount} / {selectedBookData.totalTestsCount} Çözüldü</span>
                        </div>
                      </div>
                    </div>

                    {/* Arama Kutusu */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div
                        style={{
                          flex: 1,
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: 12,
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          padding: '0.45rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <Search size={15} color="#cbd5e1" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder={`${currentBook.title} içinde test ara (örn: Öğrendiğini Kanıtla, Test 3)...`}
                          value={hwSearchQuery}
                          onChange={e => setHwSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.82rem',
                            outline: 'none',
                            fontWeight: 600
                          }}
                        />
                        {hwSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setHwSearchQuery('')}
                            style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 🌟 KONULAR LİSTESİ ALANI (TIKLANINCA PENCEREDE AÇILIR) */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    {/* Arama yapılmışsa doğrudan arama sonuçlarını göster */}
                    {hwSearchQuery.trim() ? (
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#e9d5ff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Search size={15} />
                          <span>"{hwSearchQuery}" ile eşleşen testler ({searchMatchingTests.length})</span>
                        </div>

                        {searchMatchingTests.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#cbd5e1' }}>
                            <div style={{ fontSize: '2rem', marginBottom: 6 }}>🔍</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Eşleşen test bulunamadı.</div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: 10 }}>
                            {searchMatchingTests.map(test => (
                              <TestCardItem key={test.id} test={test} onSelectTask={onSelectTask} />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Normal Görünüm: Konu / Fasikül Kartları */
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>📚</span>
                              <span>Fasiküller ve Konular ({selectedBookData.units.length})</span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: 2 }}>
                              Testleri görmek ve çözmek için istediğiniz konuya dokunun; testler ayrı pencerede açılacaktır.
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))',
                            gap: 12
                          }}
                        >
                          {selectedBookData.units.map((unit, uIdx) => {
                            const isDone = unit.completedCount === unit.totalCount && unit.totalCount > 0;
                            const pct = unit.totalCount > 0 ? Math.round((unit.completedCount / unit.totalCount) * 100) : 0;

                            return (
                              <div
                                key={unit.id}
                                onClick={() => setSelectedUnitForModal(unit)}
                                style={{
                                  background: 'rgba(37, 50, 82, 0.75)',
                                  border: isDone ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                                  borderRadius: 16,
                                  padding: '1.1rem 1.25rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 12,
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
                                }}
                                className="hover:border-purple-500 hover:bg-slate-700/60"
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div
                                      style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 12,
                                        background: isDone
                                          ? 'linear-gradient(135deg, #10b981, #059669)'
                                          : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem',
                                        color: '#ffffff',
                                        fontWeight: 900,
                                        flexShrink: 0,
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
                                      }}
                                    >
                                      {uIdx + 1}
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.3 }}>
                                        {unit.name}
                                      </div>
                                      <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 600, marginTop: 3 }}>
                                        {unit.totalCount} Test • {unit.completedCount} Çözüldü
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.08)',
                                      borderRadius: 10,
                                      padding: '0.4rem 0.75rem',
                                      fontSize: '0.74rem',
                                      fontWeight: 850,
                                      color: '#c084fc',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      flexShrink: 0
                                    }}
                                  >
                                    <span>Testleri Aç</span>
                                    <ChevronRight size={14} />
                                  </div>
                                </div>

                                {/* İlerleme Çubuğu */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ flex: 1, height: 6, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 99, overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        width: `${pct}%`,
                                        height: '100%',
                                        background: isDone
                                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                                          : 'linear-gradient(90deg, #a855f7, #6366f1)',
                                        borderRadius: 99,
                                        transition: 'width 0.3s ease'
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isDone ? '#10b981' : '#cbd5e1' }}>
                                    %{pct}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEKME 2: HAFTALIK DERS PROGRAMI                                            */}
        {/* ========================================================================= */}
        {hwSourceTab === 'program' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
            {/* Gün Seçici Çubuğu */}
            <div
              style={{
                padding: '0.75rem 1.25rem',
                background: 'rgba(28, 39, 64, 0.92)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                flexShrink: 0
              }}
            >
              {weeklyProgramGrouped.map(day => {
                const isSelected = selectedProgramDay === day.key;
                const count = (day.tasks || []).filter(t => !hideCompletedTasks || !t.isCompleted).length;
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedProgramDay(day.key)}
                    style={{
                      padding: '0.55rem 1rem',
                      borderRadius: 12,
                      border: isSelected ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.12)',
                      background: isSelected ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'rgba(255, 255, 255, 0.06)',
                      color: isSelected ? '#ffffff' : '#e2e8f0',
                      fontSize: '0.8rem',
                      fontWeight: 850,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span>{day.icon}</span>
                    <span>{day.long}</span>
                    <span
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        fontSize: '0.66rem',
                        padding: '1px 6px',
                        borderRadius: 99,
                        fontWeight: 900
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Günün Görevleri */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {programTasksForDay.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
                  {programTasksForDay.map(task => (
                    <ProgramTaskCard key={task.id || task.dedupeKey} task={task} onSelectTask={onSelectTask} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#cbd5e1' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>📅</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    {currentDayGroup.long || 'Bu gün'} için kayıtlı görev bulunamadı.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEKME 3: ATANMIŞ ÖDEVLER                                                  */}
        {/* ========================================================================= */}
        {hwSourceTab === 'homework' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
            {/* Ödev Filtre Çubuğu */}
            <div
              style={{
                padding: '0.75rem 1.25rem',
                background: 'rgba(28, 39, 64, 0.92)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '0.45rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Search size={15} color="#cbd5e1" />
                <input
                  type="text"
                  placeholder="Ödev başlığı veya ders ara..."
                  value={hwSearchQuery}
                  onChange={e => setHwSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    fontWeight: 600
                  }}
                />
              </div>
            </div>

            {/* Ödevler Listesi */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {homeworkTasks.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
                  {homeworkTasks.map(task => (
                    <ProgramTaskCard key={task.id || task.dedupeKey} task={task} onSelectTask={onSelectTask} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#cbd5e1' }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>📝</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    Atanmış ödev bulunamadı.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. KONU TESTLERİ PENCERESİ (MODAL DIALOG) ─── */}
      {selectedUnitForModal && (
        <TopicTestsModal
          unit={selectedUnitForModal}
          bookTitle={currentBook?.title || 'Soru Bankası'}
          onClose={() => setSelectedUnitForModal(null)}
          onSelectTask={onSelectTask}
          hideCompletedTasks={hideCompletedTasks}
          isMobile={isMobile}
        />
      )}
    </div>
  );
});

// ─── 📂 KONUYA TIKLAYINCA AÇILAN TESTLER PENCERESİ ───
function TopicTestsModal({ unit, bookTitle, onClose, onSelectTask, hideCompletedTasks, isMobile }) {
  const [localSearch, setLocalSearch] = useState('');

  const filteredTests = useMemo(() => {
    return (unit.tests || []).filter(t => {
      if (hideCompletedTasks && t.isCompleted) return false;
      if (localSearch.trim()) {
        const q = localSearch.toLowerCase();
        const match = (t.name || '').toLowerCase().includes(q) ||
                      (t.title || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [unit.tests, hideCompletedTasks, localSearch]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100010,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '0.75rem' : '1.5rem'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 960,
          maxHeight: '88vh',
          background: 'linear-gradient(135deg, #1c2742 0%, #172036 100%)',
          border: '1.5px solid rgba(168, 85, 247, 0.35)',
          borderRadius: 22,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        {/* Pencere Başlığı */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(30, 42, 68, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              📂
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {unit.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: 1 }}>
                {bookTitle} • {unit.totalCount} Test • {unit.completedCount} Çözüldü
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f1f5f9',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Arama ve Sayaç Şeridi */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            background: 'rgba(24, 33, 54, 0.85)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '0.45rem 0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Search size={14} color="#cbd5e1" />
            <input
              type="text"
              placeholder={`${unit.name} içinde test ara...`}
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                outline: 'none',
                fontWeight: 600
              }}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ fontSize: '0.76rem', color: '#c084fc', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {filteredTests.length} Test Gösteriliyor
          </div>
        </div>

        {/* Testler Grid Alanı */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: 10,
            alignContent: 'flex-start'
          }}
        >
          {filteredTests.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem 1rem', color: '#cbd5e1' }}>
              <div style={{ fontSize: '2rem', marginBottom: 6 }}>🔍</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Eşleşen test bulunamadı.</div>
            </div>
          ) : (
            filteredTests.map(test => (
              <TestCardItem key={test.id} test={test} onSelectTask={onSelectTask} />
            ))
          )}
        </div>

        {/* Pencere Altı */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            background: 'rgba(28, 39, 64, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: 700 }}>
            {unit.totalCount} testten {unit.completedCount} tanesi çözüldü
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
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

// ─── TEKİL TEST KARTI (TIKLAYINCA ODAYA ALIR) ───
function TestCardItem({ test, onSelectTask }) {
  return (
    <div
      onClick={() => onSelectTask(test)}
      style={{
        background: test.isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(37, 50, 82, 0.75)',
        border: test.isCompleted
          ? '1px solid rgba(16, 185, 129, 0.35)'
          : '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 14,
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        gap: 12
      }}
      className="hover:border-purple-500/60 hover:bg-slate-700/60"
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        {/* Üst Rozetler */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 900,
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#93c5fd',
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
                background: 'rgba(168, 85, 247, 0.2)',
                color: '#e9d5ff',
                padding: '1px 7px',
                borderRadius: 6
              }}
            >
              🔑 Cevap Anahtarlı
            </span>
          )}

          {test.isCompleted ? (
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
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
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
            color: test.isCompleted ? '#a7f3d0' : '#ffffff',
            lineHeight: 1.3
          }}
        >
          {test.name || test.title}
        </div>
      </div>

      {/* Odaya Al Butonu */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectTask(test);
        }}
        style={{
          background: test.isCompleted
            ? 'rgba(16, 185, 129, 0.25)'
            : 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
          color: test.isCompleted ? '#10b981' : '#ffffff',
          border: test.isCompleted ? '1px solid rgba(16, 185, 129, 0.45)' : 'none',
          borderRadius: 10,
          padding: '0.5rem 0.9rem',
          fontSize: '0.78rem',
          fontWeight: 900,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0,
          boxShadow: test.isCompleted ? 'none' : '0 4px 12px rgba(168, 85, 247, 0.35)'
        }}
      >
        <span>{test.isCompleted ? 'Yeniden Çöz' : 'Odaya Al'}</span>
        <ArrowRight size={13} />
      </button>
    </div>
  );
}

// ─── YARDIMCI GÖREV KARTI (DERS PROGRAMI & ÖDEVLER İÇİN) ───
function ProgramTaskCard({ task, onSelectTask }) {
  const isReading = task.isReadingTask ||
    task.taskType === 'okuma' ||
    task.subject === 'Kitap Okuma' ||
    (task.title && task.title.toLowerCase().includes('kitap okuma'));

  return (
    <div
      onClick={() => onSelectTask(task)}
      style={{
        background: 'rgba(37, 50, 82, 0.75)',
        border: task.isCompleted ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 14,
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        gap: 12,
        transition: 'all 0.15s ease'
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              background: 'rgba(99, 102, 241, 0.25)',
              color: '#a5b4fc',
              padding: '1px 6px',
              borderRadius: 6
            }}
          >
            {task.subject || 'Ders'}
          </span>

          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              padding: '1px 6px',
              borderRadius: 6
            }}
          >
            {isReading ? '📖 Okuma Görevi' : `${task.questionCount || 12} Soru`}
          </span>

          {task.isCompleted && (
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
          )}
        </div>

        <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#ffffff', lineHeight: 1.3 }}>
          {task.title || task.name || (isReading ? 'Kitap Okuma' : 'Test')}
        </div>

        {(task.bookTitle || task.unit || task.topic) && (
          <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {task.bookTitle ? `${task.bookTitle} • ` : ''}{task.unit || task.topic}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectTask(task);
        }}
        style={{
          background: task.isCompleted
            ? 'rgba(16, 185, 129, 0.25)'
            : 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
          color: task.isCompleted ? '#10b981' : '#ffffff',
          border: task.isCompleted ? '1px solid rgba(16, 185, 129, 0.45)' : 'none',
          borderRadius: 10,
          padding: '0.45rem 0.85rem',
          fontSize: '0.76rem',
          fontWeight: 850,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0
        }}
      >
        <span>{task.isCompleted ? 'Yeniden Çöz' : 'Odaya Al'}</span>
        <ArrowRight size={13} />
      </button>
    </div>
  );
}
