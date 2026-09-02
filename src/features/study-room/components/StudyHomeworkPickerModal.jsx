import React from 'react';
import { Search, X, Calendar, BookOpen, CheckCircle, CheckCircle2, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { STUDY_SUBJECTS } from '../constants/studyRoomConstants';

export default function StudyHomeworkPickerModal({
  show,
  onClose,
  themeObj,
  isMobile,
  hwSourceTab,
  setHwSourceTab,
  hwFilterSubject,
  setHwFilterSubject,
  hwSearchQuery,
  setHwSearchQuery,
  hideCompletedTasks,
  setHideCompletedTasks,
  selectedProgramDay,
  setSelectedProgramDay,
  weeklyProgramGrouped = [],
  allAssignedTasks = [],
  onSelectTask
}) {
  if (!show) return null;

  // 1. Haftalık Program sekmesi için seçili günün görevleri
  const currentDayGroup = (weeklyProgramGrouped || []).find(g => g.key === selectedProgramDay) || weeklyProgramGrouped?.[0] || { tasks: [] };

  const matchesFilter = (task) => {
    if (hideCompletedTasks && task.isCompleted) return false;
    if (hwFilterSubject !== 'all' && task.subject && !task.subject.toLowerCase().includes(hwFilterSubject.toLowerCase())) {
      return false;
    }
    if (hwSearchQuery.trim()) {
      const q = hwSearchQuery.toLowerCase();
      const match = (task.title || '').toLowerCase().includes(q) ||
                    (task.subtitle || '').toLowerCase().includes(q) ||
                    (task.subject || '').toLowerCase().includes(q) ||
                    (task.topic || '').toLowerCase().includes(q) ||
                    (task.unit || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  };

  const programTasksForDay = (currentDayGroup.tasks || []).filter(matchesFilter);
  const homeworkTasks = allAssignedTasks.filter(t => t.sourceType === 'homework' && matchesFilter(t));
  const bookTasks = allAssignedTasks.filter(t => t.sourceType === 'bookTest' && matchesFilter(t));
  const allTasks = allAssignedTasks.filter(matchesFilter);

  // Tab sayıları
  const programTotalCount = (weeklyProgramGrouped || []).reduce((acc, g) => {
    const valid = (g.tasks || []).filter(t => !hideCompletedTasks || !t.isCompleted);
    return acc + valid.length;
  }, 0);
  const homeworkTotalCount = allAssignedTasks.filter(t => t.sourceType === 'homework' && (!hideCompletedTasks || !t.isCompleted)).length;
  const bookTotalCount = allAssignedTasks.filter(t => t.sourceType === 'bookTest' && (!hideCompletedTasks || !t.isCompleted)).length;
  const allTotalCount = allAssignedTasks.filter(t => !hideCompletedTasks || !t.isCompleted).length;

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
        maxWidth: 780,
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
              Haftalık ders programından veya atanmış ödevlerden bir test seç
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

        {/* Ana Kaynak Sekmeleri (Tabs) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
          padding: '0.75rem 1.25rem 0.5rem',
          background: themeObj.cardBg
        }}>
          {[
            { id: 'program', label: '📅 Program', count: programTotalCount },
            { id: 'homework', label: '📝 Ödevler', count: homeworkTotalCount },
            { id: 'bookTest', label: '📖 Kitaplar', count: bookTotalCount },
            { id: 'all', label: '🌟 Tümü', count: allTotalCount }
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

        {/* Haftalık Program Seçiliyse: Günler Çubuğu */}
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
              placeholder="Test, ders veya konu ara..."
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

        {/* Görev Listesi */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          {hwSourceTab === 'program' ? (
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
          ) : hwSourceTab === 'homework' ? (
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
          ) : hwSourceTab === 'bookTest' ? (
            bookTasks.length > 0 ? (
              bookTasks.map(task => (
                <TaskListItem
                  key={task.id || task.dedupeKey}
                  task={task}
                  themeObj={themeObj}
                  onSelectTask={onSelectTask}
                />
              ))
            ) : (
              <EmptyStateMessage message="Kitap testi bulunamadı." themeObj={themeObj} />
            )
          ) : (
            allTasks.length > 0 ? (
              allTasks.map(task => (
                <TaskListItem
                  key={task.id || task.dedupeKey}
                  task={task}
                  themeObj={themeObj}
                  onSelectTask={onSelectTask}
                />
              ))
            ) : (
              <EmptyStateMessage message="Kriterlere uygun görev veya test bulunamadı." themeObj={themeObj} />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function TaskListItem({ task, themeObj, onSelectTask }) {
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
            {task.title || task.name || 'Test'}
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
          {task.subject} · {task.questionCount || 12} Soru
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
