import React, { useState, useMemo } from 'react';
import { Search, X, Calendar, BookOpen, CheckCircle, CheckCircle2, ChevronRight, Eye, EyeOff, BookMarked, Check, PlayCircle } from 'lucide-react';
import { STUDY_SUBJECTS } from '../constants/studyRoomConstants';
import { checkIsTaskSolved } from '../../../components/ProgramCenter';

export default function StudyHomeworkPickerModal({
  show,
  onClose,
  themeObj,
  isMobile,
  hwSourceTab = 'program',
  setHwSourceTab,
  hwFilterSubject = 'all',
  setHwFilterSubject,
  hwSearchQuery = '',
  setHwSearchQuery,
  hideCompletedTasks = true,
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
  const [selectedBookId, setSelectedBookId] = useState('all');

  if (!show) return null;

  // 1. Tüm kitaplardaki testleri derle
  const allBookTestsList = useMemo(() => {
    if (!books || !Array.isArray(books)) return [];

    const directTestsByBookId = new Map();
    (bookTests || []).forEach(bt => {
      if (!bt || bt.isDeleted || bt.deleted) return;
      const bId = String(bt.bookId || bt.book_id || '');
      if (!bId) return;
      if (!directTestsByBookId.has(bId)) directTestsByBookId.set(bId, []);
      directTestsByBookId.get(bId).push(bt);
      const cleanBId = bId.replace(/^b_/, '');
      if (!directTestsByBookId.has(cleanBId)) directTestsByBookId.set(cleanBId, []);
      directTestsByBookId.get(cleanBId).push(bt);
    });

    const gathered = [];
    const seenTestIds = new Set();

    books.forEach(book => {
      if (!book || book.isDeleted || book.deleted) return;
      const bId = String(book.id || '');
      const cleanBId = bId.replace(/^b_/, '');

      const directTests = directTestsByBookId.get(bId) || directTestsByBookId.get(cleanBId) || [];

      if (directTests.length > 0) {
        directTests.forEach(t => {
          const tId = String(t.id || '');
          const dedupeKey = `${bId}_${tId}`;
          if (seenTestIds.has(dedupeKey)) return;
          seenTestIds.add(dedupeKey);

          const isSolved = checkIsTaskSolved(
            { testId: t.id, bookTestId: t.id, taskType: 'kitap', bookTitle: book.title, subject: t.subject || book.subject },
            currentUserId,
            submissions,
            homeworks,
            studyAssignments,
            null,
            bookTests,
            books
          );

          const qCount = Number(t.questionCount || t.question_count) ||
            (t.answer_key ? Object.keys(t.answer_key).filter(k => !k.startsWith('_')).length : null) ||
            (t.answerKey ? Object.keys(t.answerKey).filter(k => !k.startsWith('_')).length : null) ||
            12;

          gathered.push({
            ...t,
            id: t.id,
            realTestId: t.id,
            bookTestId: t.id,
            bookId: book.id,
            bookTitle: book.title,
            bookSubject: book.subject || 'Genel',
            title: `${book.title} • ${t.name || t.title || 'Test'}`,
            name: t.name || t.title || 'Test',
            subject: t.subject || book.subject || 'Genel',
            unit: t.unit || t.unitName || '',
            topic: t.topic || t.topicName || '',
            questionCount: qCount,
            answerKey: t.answer_key || t.answerKey || t.correctAnswers,
            isCompleted: isSolved,
            sourceType: 'book',
            sourceLabel: '📚 Kitap Testi'
          });
        });
      } else if (Array.isArray(book.subjects)) {
        // Fallback: book.subjects -> tests & topics
        book.subjects.forEach(subj => {
          const sName = subj.name || book.subject || 'Genel';
          (subj.tests || []).forEach(t => {
            const tId = String(t.id || '');
            const dedupeKey = `${bId}_${tId}`;
            if (seenTestIds.has(dedupeKey)) return;
            seenTestIds.add(dedupeKey);

            const isSolved = checkIsTaskSolved(
              { testId: t.id, bookTestId: t.id, taskType: 'kitap', bookTitle: book.title, subject: sName },
              currentUserId,
              submissions,
              homeworks,
              studyAssignments,
              null,
              bookTests,
              books
            );

            const qCount = Number(t.questionCount || t.question_count) ||
              (t.answer_key ? Object.keys(t.answer_key).filter(k => !k.startsWith('_')).length : null) ||
              (t.answerKey ? Object.keys(t.answerKey).filter(k => !k.startsWith('_')).length : null) ||
              12;

            gathered.push({
              ...t,
              id: t.id,
              realTestId: t.id,
              bookTestId: t.id,
              bookId: book.id,
              bookTitle: book.title,
              bookSubject: book.subject || 'Genel',
              title: `${book.title} • ${t.name || t.title || 'Test'}`,
              name: t.name || t.title || 'Test',
              subject: sName,
              unit: sName,
              topic: '',
              questionCount: qCount,
              answerKey: t.answer_key || t.answerKey || t.correctAnswers,
              isCompleted: isSolved,
              sourceType: 'book',
              sourceLabel: '📚 Kitap Testi'
            });
          });

          (subj.topics || []).forEach(tp => {
            const tpName = tp.name || '';
            (tp.tests || []).forEach(t => {
              const tId = String(t.id || '');
              const dedupeKey = `${bId}_${tId}`;
              if (seenTestIds.has(dedupeKey)) return;
              seenTestIds.add(dedupeKey);

              const isSolved = checkIsTaskSolved(
                { testId: t.id, bookTestId: t.id, taskType: 'kitap', bookTitle: book.title, subject: sName },
                currentUserId,
                submissions,
                homeworks,
                studyAssignments,
                null,
                bookTests,
                books
              );

              const qCount = Number(t.questionCount || t.question_count) ||
                (t.answer_key ? Object.keys(t.answer_key).filter(k => !k.startsWith('_')).length : null) ||
                (t.answerKey ? Object.keys(t.answerKey).filter(k => !k.startsWith('_')).length : null) ||
                12;

              gathered.push({
                ...t,
                id: t.id,
                realTestId: t.id,
                bookTestId: t.id,
                bookId: book.id,
                bookTitle: book.title,
                bookSubject: book.subject || 'Genel',
                title: `${book.title} • ${t.name || t.title || 'Test'}`,
                name: t.name || t.title || 'Test',
                subject: sName,
                unit: sName,
                topic: tpName,
                questionCount: qCount,
                answerKey: t.answer_key || t.answerKey || t.correctAnswers,
                isCompleted: isSolved,
                sourceType: 'book',
                sourceLabel: '📚 Kitap Testi'
              });
            });
          });
        });
      }
    });

    return gathered;
  }, [books, bookTests, submissions, homeworks, studyAssignments, currentUserId]);

  // Filtre kontrolü
  const matchesFilter = (task) => {
    if (hideCompletedTasks && task.isCompleted) return false;
    if (hwFilterSubject !== 'all' && task.subject && !task.subject.toLowerCase().includes(hwFilterSubject.toLowerCase())) {
      return false;
    }
    if (hwSearchQuery.trim()) {
      const q = hwSearchQuery.toLowerCase();
      const match = (task.title || '').toLowerCase().includes(q) ||
                    (task.name || '').toLowerCase().includes(q) ||
                    (task.bookTitle || '').toLowerCase().includes(q) ||
                    (task.subtitle || '').toLowerCase().includes(q) ||
                    (task.subject || '').toLowerCase().includes(q) ||
                    (task.topic || '').toLowerCase().includes(q) ||
                    (task.unit || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  };

  // 1. Haftalık Program sekmesi için seçili günün görevleri
  const currentDayGroup = (weeklyProgramGrouped || []).find(g => g.key === selectedProgramDay) || weeklyProgramGrouped?.[0] || { tasks: [] };
  const programTasksForDay = (currentDayGroup.tasks || []).filter(matchesFilter);

  // 2. Ödevler sekmesi
  const homeworkTasks = allAssignedTasks.filter(t => t.sourceType === 'homework' && matchesFilter(t));

  // 3. Kitaplar sekmesi
  const filteredBookTests = allBookTestsList.filter(t => {
    if (selectedBookId !== 'all' && String(t.bookId) !== String(selectedBookId)) {
      return false;
    }
    return matchesFilter(t);
  });

  // Tab sayıları
  const programTotalCount = (weeklyProgramGrouped || []).reduce((acc, g) => {
    const valid = (g.tasks || []).filter(t => !hideCompletedTasks || !t.isCompleted);
    return acc + valid.length;
  }, 0);
  const homeworkTotalCount = allAssignedTasks.filter(t => t.sourceType === 'homework' && (!hideCompletedTasks || !t.isCompleted)).length;
  const booksTotalCount = allBookTestsList.filter(t => !hideCompletedTasks || !t.isCompleted).length;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.72)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
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
        maxWidth: 820,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Modal Başlığı */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: `1px solid ${themeObj.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: themeObj.innerBg,
          gap: 10
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: themeObj.text }}>
              Çalışma Görevi / Test Seç
            </h3>
            <div style={{ fontSize: '0.74rem', color: themeObj.subText, marginTop: 2 }}>
              Kütüphane kitaplarından, haftalık ders programından veya ödevlerden test seç
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
                padding: '0.35rem 0.65rem',
                fontSize: '0.72rem',
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

        {/* Ana Kaynak Sekmeleri (Tabs: Kitaplar, Program, Ödevler) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          padding: '0.75rem 1.25rem 0.5rem',
          background: themeObj.cardBg
        }}>
          {[
            { id: 'books', label: '📚 Kitaplarım', count: booksTotalCount },
            { id: 'program', label: '📅 Ders Programı', count: programTotalCount },
            { id: 'homework', label: '📝 Atanmış Ödevler', count: homeworkTotalCount }
          ].map(tab => {
            const isActive = hwSourceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setHwSourceTab(tab.id)}
                style={{
                  padding: '0.55rem 0.5rem',
                  borderRadius: 12,
                  border: `1px solid ${isActive ? themeObj.accent : themeObj.border}`,
                  background: isActive ? (themeObj.accentGradient || themeObj.accent) : themeObj.innerBg,
                  color: isActive ? '#ffffff' : themeObj.text,
                  fontWeight: 800,
                  fontSize: isMobile ? '0.72rem' : '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  transition: 'all 0.15s'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 900,
                  background: isActive ? 'rgba(255,255,255,0.25)' : themeObj.cardBg,
                  color: isActive ? '#ffffff' : themeObj.subText,
                  padding: '1px 6px',
                  borderRadius: 99
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 📚 Kitaplarım Seçiliyse: Kitap Seçim Şeridi */}
        {hwSourceTab === 'books' && (
          <div style={{
            display: 'flex',
            gap: 8,
            padding: '0.4rem 1.25rem 0.65rem',
            overflowX: 'auto',
            borderBottom: `1px solid ${themeObj.border}`
          }}>
            <button
              onClick={() => setSelectedBookId('all')}
              style={{
                padding: '0.45rem 0.8rem',
                borderRadius: 12,
                border: `1px solid ${selectedBookId === 'all' ? themeObj.accent : themeObj.border}`,
                background: selectedBookId === 'all' ? (themeObj.accentGradient || themeObj.accent) : themeObj.innerBg,
                color: selectedBookId === 'all' ? '#ffffff' : themeObj.text,
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>📚 Tüm Kitaplar</span>
              <span style={{
                background: selectedBookId === 'all' ? 'rgba(255,255,255,0.3)' : themeObj.cardBg,
                color: selectedBookId === 'all' ? '#ffffff' : themeObj.subText,
                fontSize: '0.62rem',
                padding: '1px 6px',
                borderRadius: 99,
                fontWeight: 900
              }}>
                {allBookTestsList.length}
              </span>
            </button>

            {books.map(book => {
              const isSelected = String(selectedBookId) === String(book.id);
              const bTests = allBookTestsList.filter(t => String(t.bookId) === String(book.id));
              const bSolved = bTests.filter(t => t.isCompleted).length;
              return (
                <button
                  key={book.id}
                  onClick={() => setSelectedBookId(book.id)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 12,
                    border: `1px solid ${isSelected ? themeObj.accent : themeObj.border}`,
                    background: isSelected ? (themeObj.accentGradient || themeObj.accent) : themeObj.innerBg,
                    color: isSelected ? '#ffffff' : themeObj.text,
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>📖 {book.title}</span>
                  <span style={{
                    background: isSelected ? 'rgba(255,255,255,0.3)' : themeObj.cardBg,
                    color: isSelected ? '#ffffff' : themeObj.subText,
                    fontSize: '0.62rem',
                    padding: '1px 6px',
                    borderRadius: 99,
                    fontWeight: 900
                  }}>
                    {bSolved}/{bTests.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 📅 Haftalık Program Seçiliyse: Günler Çubuğu */}
        {hwSourceTab === 'program' && (
          <div style={{
            display: 'flex',
            gap: 6,
            padding: '0.4rem 1.25rem 0.65rem',
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
                    padding: '0.45rem 0.75rem',
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
                  {day.dateLabel && <span style={{ opacity: 0.85, fontSize: '0.68rem' }}>({day.dateLabel})</span>}
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

        {/* Arama & Ders Filtresi */}
        <div style={{
          padding: '0.5rem 1.25rem',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          borderBottom: `1px solid ${themeObj.border}`
        }}>
          <div style={{
            flex: 1,
            minWidth: 160,
            background: themeObj.innerBg,
            borderRadius: 10,
            padding: '0.4rem 0.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: `1px solid ${themeObj.border}`
          }}>
            <Search size={14} color={themeObj.subText} />
            <input
              type="text"
              placeholder="Test, kitap, konu veya ünite ara..."
              value={hwSearchQuery}
              onChange={e => setHwSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: themeObj.text,
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>

          <select
            value={hwFilterSubject}
            onChange={e => setHwFilterSubject(e.target.value)}
            style={{
              background: themeObj.innerBg,
              border: `1px solid ${themeObj.border}`,
              color: themeObj.text,
              borderRadius: 10,
              padding: '0.4rem 0.65rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              outline: 'none'
            }}
          >
            <option value="all">Tüm Dersler</option>
            {STUDY_SUBJECTS.map(s => (
              <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
            ))}
          </select>
        </div>

        {/* Görev & Test Listesi */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          {hwSourceTab === 'books' ? (
            filteredBookTests.length > 0 ? (
              filteredBookTests.map(test => (
                <BookTestListItem
                  key={test.id || test.dedupeKey}
                  test={test}
                  themeObj={themeObj}
                  onSelectTask={onSelectTask}
                />
              ))
            ) : (
              <EmptyStateMessage
                message={books.length === 0 ? "Kütüphanenizde henüz kitap bulunamadı." : "Seçili filtreye uygun kitap testi bulunamadı."}
                themeObj={themeObj}
              />
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

function BookTestListItem({ test, themeObj, onSelectTask }) {
  return (
    <div
      onClick={() => onSelectTask(test)}
      style={{
        background: themeObj.innerBg,
        border: `1px solid ${themeObj.border}`,
        borderRadius: 14,
        padding: '0.8rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        gap: 12
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 800,
            background: 'rgba(168, 85, 247, 0.15)',
            color: '#c084fc',
            padding: '2px 7px',
            borderRadius: 6
          }}>
            📚 {test.bookTitle}
          </span>
          {test.subject && (
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              padding: '2px 7px',
              borderRadius: 6
            }}>
              {test.subject}
            </span>
          )}
          {test.isCompleted ? (
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '2px 7px',
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
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 99
            }}>
              ⏳ Çözülmedi
            </span>
          )}
        </div>

        <div style={{
          fontSize: '0.88rem',
          fontWeight: 900,
          color: themeObj.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {test.name || test.title}
        </div>

        <div style={{ fontSize: '0.72rem', color: themeObj.subText, fontWeight: 600, marginTop: 3 }}>
          {test.unit && <span>{test.unit} · </span>}
          {test.topic && <span>{test.topic} · </span>}
          <span>{test.questionCount || 12} Soru</span>
          {test.answerKey && <span style={{ marginLeft: 6, color: '#38bdf8' }}>• 🔑 Cevap Anahtarlı</span>}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectTask(test);
        }}
        style={{
          background: themeObj.accentGradient || themeObj.accent,
          color: '#ffffff',
          border: 'none',
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
        style={{
          background: themeObj.accentGradient || themeObj.accent,
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
      padding: '2.5rem 1rem',
      color: themeObj.subText,
      fontSize: '0.82rem',
      fontWeight: 600
    }}>
      {message}
    </div>
  );
}
