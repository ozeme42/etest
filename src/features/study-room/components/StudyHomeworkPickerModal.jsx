import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Calendar, BookOpen, CheckCircle2, ChevronRight, ChevronDown, ChevronUp, Eye, EyeOff, Check, PlayCircle } from 'lucide-react';
import { STUDY_SUBJECTS } from '../constants/studyRoomConstants';
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
  if (t.includes('türkçe')) return 'Türkçe';
  if (t.includes('matematik')) return 'Matematik';
  if (t.includes('fen')) return 'Fen Bilimleri';
  if (t.includes('sosyal')) return 'Sosyal Bilgiler';
  if (t.includes('ingilizce') || t.includes('ing')) return 'İngilizce';
  if (t.includes('din')) return 'Din Kültürü';
  return 'Genel';
};

const getSubjectIcon = (subj) => {
  const s = String(subj || '').toLowerCase();
  if (s.includes('türk')) return '📘';
  if (s.includes('mat')) return '📐';
  if (s.includes('fen')) return '🔬';
  if (s.includes('sosyal')) return '🌍';
  if (s.includes('ing')) return '🇬🇧';
  if (s.includes('din')) return '🕌';
  return '📚';
};

export default function StudyHomeworkPickerModal({
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
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [openUnitIds, setOpenUnitIds] = useState({});

  const precomputedSolvedIndex = useMemo(() => {
    return buildSolvedIndex(currentUserId, submissions, homeworks);
  }, [currentUserId, submissions, homeworks]);

  // 1. Sadece fiziki soru bankaları (8 adet)
  const physicalBooks = useMemo(() => {
    return (books || []).filter(isPhysicalQuestionBook);
  }, [books]);

  // 2. Seçili derse göre filtrelenmiş kitaplar
  const visiblePhysicalBooks = useMemo(() => {
    if (hwFilterSubject === 'all') return physicalBooks;
    return physicalBooks.filter(b => {
      const bSubj = getBookSubject(b).toLowerCase();
      const targetSubj = hwFilterSubject.toLowerCase();
      return bSubj.includes(targetSubj) || targetSubj.includes(bSubj);
    });
  }, [physicalBooks, hwFilterSubject]);

  // 3. Seçili kitap: Filtredeki ilk kitaba otomatik odaklan
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

  // 4. Seçili kitabın Ünitelerini ve Testlerini çıkarma
  const selectedBookData = useMemo(() => {
    if (!currentBook) return { units: [], allTests: [] };

    const bId = String(currentBook.id || '');
    const cleanBId = bId.replace(/^b_/, '');
    const bUuid = String(toUUID(bId) || '');
    const bLegacyUuid = String(legacyHexUUID(bId) || '');
    const normBookTitle = String(currentBook.title || '').toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '').trim();

    // bookTests içindeki bu kitaba ait testler
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

          // 1. Bu konuya ait db testleri
          const dbTopicTests = testsInBook.filter(t => {
            const tTpId = String(t.topicId || t.topic_id || '');
            return tTpId === tpId || tTpId === String(tp.id) || (toUUID(tTpId) && toUUID(tTpId) === toUUID(tpId));
          });

          // 2. Konunun canonical testleri (kitabın json / subject verisindeki testler)
          const canonicalTests = Array.isArray(tp.tests) ? tp.tests : [];

          // 3. Merged test list: Canonical testleri temel alarak db testleriyle zenginleştir
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

            // Canonical listede olmayan ama dbTopicTests içinde bulunan ekstra testleri ekle
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
            // Hiç test yoksa 5 adet standart test üret
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
              topic: tpName,
              topicId: tpId,
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
            tests: formattedTests
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
            topic: '',
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
          tests: formattedTests
        });
      }
    });

    return { units, allTests };
  }, [currentBook, bookTests, submissions, homeworks, studyAssignments, currentUserId, books, precomputedSolvedIndex]);

  // İlk üniteyi otomatik açık getir
  useEffect(() => {
    if (selectedBookData.units.length > 0) {
      const firstUnitId = selectedBookData.units[0].id;
      setOpenUnitIds(prev => {
        if (!prev || Object.keys(prev).length === 0) {
          return { [firstUnitId]: true };
        }
        return prev;
      });
    }
  }, [selectedBookId, selectedBookData.units]);

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

  // Modal kapalıysa hiçbir şey render etme (TÜM HOOK'LARIN ARDINDAN ÇAĞRILIR)
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.78)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '0.5rem' : '1.5rem'
    }}>
      <div style={{
        background: themeObj.cardBg,
        border: `1px solid ${themeObj.border}`,
        borderRadius: 24,
        width: '100%',
        maxWidth: 860,
        height: '92vh',
        maxHeight: 880,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)',
        overflow: 'hidden'
      }}>
        {/* Modal Başlığı */}
        <div style={{
          flexShrink: 0,
          padding: '1rem 1.25rem',
          borderBottom: `1px solid ${themeObj.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: themeObj.innerBg,
          gap: 10
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: themeObj.text, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span>🎯</span>
              <span>Çalışma Görevi / Test Seç</span>
            </h3>
            <div style={{ fontSize: '0.74rem', color: themeObj.subText, marginTop: 2 }}>
              Fiziki soru bankalarından, ders programından veya ödevlerden bir test seç
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setHideCompletedTasks(!hideCompletedTasks)}
              style={{
                background: hideCompletedTasks ? 'rgba(16, 185, 129, 0.15)' : themeObj.innerBg,
                border: `1px solid ${hideCompletedTasks ? '#10b981' : themeObj.border}`,
                color: hideCompletedTasks ? '#10b981' : themeObj.subText,
                borderRadius: 10,
                padding: '0.4rem 0.75rem',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              {hideCompletedTasks ? <EyeOff size={13} color="#10b981" /> : <Eye size={13} />}
              <span>{hideCompletedTasks ? 'Bitenler Gizli' : 'Bitenleri Göster'}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: themeObj.subText,
                cursor: 'pointer',
                padding: 4,
                borderRadius: 8
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Ana Kaynak Sekmeleri (Kitaplarım, Ders Programı, Ödevler) */}
        <div style={{
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          padding: '0.75rem 1.25rem 0.5rem',
          background: themeObj.cardBg,
          borderBottom: `1px solid ${themeObj.border}`
        }}>
          {[
            { id: 'books', label: '📚 Kitaplarım (Soru Bankası)', count: physicalBooksCount },
            { id: 'program', label: '📅 Ders Programı', count: programTotalCount },
            { id: 'homework', label: '📝 Atanmış Ödevler', count: homeworkTotalCount }
          ].map(tab => {
            const isActive = hwSourceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setHwSourceTab(tab.id)}
                style={{
                  padding: '0.6rem 0.5rem',
                  borderRadius: 12,
                  border: `1.5px solid ${isActive ? (themeObj.accent || '#a855f7') : themeObj.border}`,
                  background: isActive ? (themeObj.accentGradient || themeObj.accent || '#a855f7') : themeObj.innerBg,
                  color: isActive ? '#ffffff' : themeObj.text,
                  fontWeight: 850,
                  fontSize: isMobile ? '0.72rem' : '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  background: isActive ? 'rgba(255,255,255,0.25)' : themeObj.cardBg,
                  color: isActive ? '#ffffff' : themeObj.subText,
                  padding: '1px 7px',
                  borderRadius: 99
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 📚 KİTAPLARIM SEKMESİ: DERS SEÇİMİ & FİZİKİ KİTAP SEKMELERİ */}
        {hwSourceTab === 'books' && (
          <div style={{
            flexShrink: 0,
            background: 'rgba(0, 0, 0, 0.12)',
            borderBottom: `1px solid ${themeObj.border}`,
            padding: '0.65rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            {/* 1. Ders Filtre Çipleri (Aynı Soru Bankası Sayfası Gibi) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 2,
              scrollbarWidth: 'none'
            }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: themeObj.subText, whiteSpace: 'nowrap', marginRight: 4 }}>
                Ders:
              </span>
              {[
                { id: 'all', name: 'Tüm Dersler', icon: '🎯' },
                { id: 'Türkçe', name: 'Türkçe', icon: '📘' },
                { id: 'Matematik', name: 'Matematik', icon: '📐' },
                { id: 'Fen Bilimleri', name: 'Fen Bilimleri', icon: '🔬' },
                { id: 'Sosyal Bilgiler', name: 'Sosyal Bilgiler', icon: '🌍' }
              ].map(subj => {
                const isSelected = hwFilterSubject === subj.id;
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => setHwFilterSubject(subj.id)}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: 99,
                      border: `1.5px solid ${isSelected ? (themeObj.accent || '#a855f7') : themeObj.border}`,
                      background: isSelected ? (themeObj.accentGradient || themeObj.accent || '#a855f7') : themeObj.innerBg,
                      color: isSelected ? '#ffffff' : themeObj.text,
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
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

            {/* 2. Fiziki Kitap Sekmeleri (Asla sıkışmaz, tam görünür) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              minHeight: 46
            }}>
              {visiblePhysicalBooks.map(book => {
                const isSelected = String(currentBook?.id) === String(book.id);
                const bSubj = getBookSubject(book);
                const icon = getSubjectIcon(bSubj);
                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => setSelectedBookId(book.id)}
                    style={{
                      flexShrink: 0,
                      padding: '0.55rem 0.95rem',
                      borderRadius: 14,
                      border: `1.5px solid ${isSelected ? (themeObj.accent || '#a855f7') : themeObj.border}`,
                      background: isSelected ? 'rgba(168, 85, 247, 0.25)' : themeObj.innerBg,
                      color: isSelected ? '#ffffff' : themeObj.text,
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      boxShadow: isSelected ? '0 4px 16px rgba(168, 85, 247, 0.35)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '0.9rem' }}>{icon}</span>
                    <span>{book.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 📅 HAFTALIK PROGRAM GÜN ÇUBUĞU */}
        {hwSourceTab === 'program' && (
          <div style={{
            flexShrink: 0,
            display: 'flex',
            gap: 6,
            padding: '0.5rem 1.25rem',
            overflowX: 'auto',
            borderBottom: `1px solid ${themeObj.border}`
          }}>
            {weeklyProgramGrouped.map(day => {
              const isSelected = selectedProgramDay === day.key;
              const count = (day.tasks || []).filter(t => !hideCompletedTasks || !t.isCompleted).length;
              return (
                <button
                  key={day.key}
                  onClick={() => setSelectedProgramDay(day.key)}
                  style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: 12,
                    border: `1px solid ${isSelected ? (day.color || themeObj.accent) : themeObj.border}`,
                    background: isSelected ? (day.color || themeObj.accent) : themeObj.innerBg,
                    color: isSelected ? '#ffffff' : themeObj.text,
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <span>{day.icon}</span>
                  <span>{day.long}</span>
                  <span style={{
                    background: isSelected ? 'rgba(255,255,255,0.3)' : (count > 0 ? (day.color || themeObj.accent) : 'transparent'),
                    color: isSelected ? '#ffffff' : (count > 0 ? '#ffffff' : themeObj.subText),
                    fontSize: '0.62rem',
                    padding: '1px 5px',
                    borderRadius: 99,
                    fontWeight: 900
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ARAMA VE TEST SAYISI BİLGİ ŞERİDİ */}
        <div style={{
          flexShrink: 0,
          padding: '0.5rem 1.25rem',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          borderBottom: `1px solid ${themeObj.border}`,
          background: themeObj.cardBg
        }}>
          <div style={{
            flex: 1,
            background: themeObj.innerBg,
            borderRadius: 12,
            padding: '0.45rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: `1px solid ${themeObj.border}`
          }}>
            <Search size={15} color={themeObj.subText} />
            <input
              type="text"
              placeholder={hwSourceTab === 'books' && currentBook ? `${currentBook.title} içinde test ara...` : "Test veya konu ara..."}
              value={hwSearchQuery}
              onChange={e => setHwSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: themeObj.text,
                fontSize: '0.82rem',
                outline: 'none',
                fontWeight: 600
              }}
            />
            {hwSearchQuery && (
              <button
                type="button"
                onClick={() => setHwSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: themeObj.subText, cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {hwSourceTab === 'books' && currentBook && (
            <div style={{ fontSize: '0.75rem', color: themeObj.subText, fontWeight: 800, whiteSpace: 'nowrap' }}>
              <span>{selectedBookData.allTests.filter(t => t.isCompleted).length}</span> / <span>{selectedBookData.allTests.length} Çözüldü</span>
            </div>
          )}
        </div>

        {/* ANA İÇERİK ALANI */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {hwSourceTab === 'books' ? (
            !currentBook ? (
              <EmptyStateMessage
                message="Seçili derse ait fiziki soru bankası bulunamadı."
                themeObj={themeObj}
              />
            ) : selectedBookData.units.length === 0 ? (
              <EmptyStateMessage
                message={`${currentBook.title} için henüz kayıtlı test bulunamadı.`}
                themeObj={themeObj}
              />
            ) : (
              /* 📂 KİTAP İÇERİĞİ: FASİKÜLLER & ÜNİTELER (Aynı Soru Bankası Sayfası Gibi Düzenli) */
              selectedBookData.units.map((unit) => {
                const isOpen = Boolean(openUnitIds[unit.id]) || Boolean(hwSearchQuery.trim());
                const visibleTests = unit.tests.filter(matchesTestFilter);
                const completedCount = unit.tests.filter(t => t.isCompleted).length;

                return (
                  <div
                    key={unit.id}
                    style={{
                      background: themeObj.innerBg,
                      border: `1px solid ${themeObj.border}`,
                      borderRadius: 16,
                      overflow: 'hidden',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Ünite / Fasikül Başlığı */}
                    <div
                      onClick={() => setOpenUnitIds(prev => ({ ...prev, [unit.id]: !prev[unit.id] }))}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderBottom: !isOpen ? 'none' : `1px solid ${themeObj.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.05rem' }}>📂</span>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 900, color: themeObj.text }}>
                            {unit.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: themeObj.subText, fontWeight: 700, marginTop: 1 }}>
                            {unit.tests.length} Test · {completedCount} Çözüldü
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {completedCount === unit.tests.length && unit.tests.length > 0 && (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 99
                          }}>
                            ✓ Tamamlandı
                          </span>
                        )}
                        <span style={{ color: themeObj.subText }}>
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </span>
                      </div>
                    </div>

                    {/* Ünitenin Testleri */}
                    {isOpen && (
                      <div style={{ padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {visibleTests.length > 0 ? (
                          visibleTests.map(test => (
                            <div
                              key={test.id}
                              onClick={() => onSelectTask(test)}
                              style={{
                                background: themeObj.cardBg,
                                border: `1px solid ${test.isCompleted ? 'rgba(16, 185, 129, 0.35)' : themeObj.border}`,
                                borderRadius: 12,
                                padding: '0.65rem 0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                gap: 12
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    color: '#60a5fa',
                                    padding: '1px 6px',
                                    borderRadius: 6
                                  }}>
                                    {test.questionCount || 12} Soru
                                  </span>

                                  {test.answerKey && (
                                    <span style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      background: 'rgba(168, 85, 247, 0.15)',
                                      color: '#c084fc',
                                      padding: '1px 6px',
                                      borderRadius: 6
                                    }}>
                                      🔑 Cevap Anahtarlı
                                    </span>
                                  )}

                                  {test.isCompleted ? (
                                    <span style={{
                                      background: 'rgba(16, 185, 129, 0.15)',
                                      color: '#10b981',
                                      fontSize: '0.64rem',
                                      fontWeight: 800,
                                      padding: '1px 7px',
                                      borderRadius: 99,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 3
                                    }}>
                                      <CheckCircle2 size={11} /> Çözüldü
                                    </span>
                                  ) : (
                                    <span style={{
                                      background: 'rgba(255, 255, 255, 0.06)',
                                      color: themeObj.subText,
                                      fontSize: '0.64rem',
                                      fontWeight: 700,
                                      padding: '1px 7px',
                                      borderRadius: 99
                                    }}>
                                      ⏳ Çözülmedi
                                    </span>
                                  )}
                                </div>

                                <div style={{
                                  fontSize: '0.88rem',
                                  fontWeight: 850,
                                  color: themeObj.text,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {test.name || test.title}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectTask(test);
                                }}
                                style={{
                                  background: test.isCompleted
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : (themeObj.accentGradient || themeObj.accent || '#a855f7'),
                                  color: test.isCompleted ? '#10b981' : '#ffffff',
                                  border: test.isCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
                                  borderRadius: 10,
                                  padding: '0.45rem 0.85rem',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  flexShrink: 0
                                }}
                              >
                                <span>{test.isCompleted ? 'Yeniden Çöz' : 'Odaya Al'}</span>
                                <ChevronRight size={13} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div style={{
                            padding: '1rem',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            color: themeObj.subText,
                            fontWeight: 700,
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: 10
                          }}>
                            {hideCompletedTasks && completedCount > 0
                              ? '✓ Bu ünitedeki tüm testler tamamlandı. (Bitenleri görmek için sağ üstteki "Bitenler Gizli" filtresine tıklayabilirsiniz)'
                              : 'Bu ünitede kriterlere uygun test bulunamadı.'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : hwSourceTab === 'program' ? (
            programTasksForDay.length > 0 ? (
              programTasksForDay.map(task => (
                <TaskListItem
                  key={task.id || task.dedupeKey}
                  task={task}
                  themeObj={themeObj}
                  onSelectTask={onSelectTask}
                />
              ))
            ) : (
              <EmptyStateMessage message={`${currentDayGroup.long || 'Bu gün'} için kayıtlı görev bulunamadı.`} themeObj={themeObj} />
            )
          ) : (
            homeworkTasks.length > 0 ? (
              homeworkTasks.map(task => (
                <TaskListItem
                  key={task.id || task.dedupeKey}
                  task={task}
                  themeObj={themeObj}
                  onSelectTask={onSelectTask}
                />
              ))
            ) : (
              <EmptyStateMessage message="Atanmış ödev bulunamadı." themeObj={themeObj} />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function TaskListItem({ task, themeObj, onSelectTask }) {
  const isReading = task.isReadingTask ||
    task.taskType === 'okuma' ||
    task.subject === 'Kitap Okuma' ||
    (task.title && task.title.toLowerCase().includes('kitap okuma'));

  return (
    <div
      onClick={() => onSelectTask(task)}
      style={{
        background: themeObj.innerBg,
        border: `1px solid ${themeObj.border}`,
        borderRadius: 14,
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
    >
      <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.86rem', fontWeight: 900, color: themeObj.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {task.title || task.name || (isReading ? 'Kitap Okuma' : 'Test')}
          </span>
          {task.isCompleted && (
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: 99
            }}>
              Tamamlandı
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.7rem', color: themeObj.subText, fontWeight: 600, marginTop: 2 }}>
          {task.subject} · {isReading ? '📖 Okuma Görevi' : `${task.questionCount || 12} Soru`}
          {task.bookTitle && ` · ${task.bookTitle}`}
          {task.sourceLabel && ` · ${task.sourceLabel}`}
        </div>
      </div>

      <button
        type="button"
        style={{
          background: themeObj.accentGradient || themeObj.accent || '#a855f7',
          color: '#ffffff',
          border: 'none',
          borderRadius: 10,
          padding: '0.4rem 0.8rem',
          fontSize: '0.76rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        <span>Seç</span>
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

function EmptyStateMessage({ message, themeObj }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '3rem 1rem',
      color: themeObj.subText,
      fontSize: '0.84rem',
      fontWeight: 700
    }}>
      {message}
    </div>
  );
}
