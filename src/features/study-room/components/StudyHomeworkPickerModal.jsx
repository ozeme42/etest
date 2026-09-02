import React from 'react';
import { Search, X, Calendar, BookOpen, CheckCircle, CheckCircle2, ChevronRight, Filter } from 'lucide-react';
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
  weekDaysConfig = [],
  allAssignedTasks = [],
  filteredTasksList = [],
  bookGroupedTests = [],
  onSelectTask
}) {
  if (!show) return null;

  // Program günü için filtrelenmiş görevler
  const programTasksForDay = allAssignedTasks.filter(t => {
    if (t.sourceType !== 'program') return false;
    if (hideCompletedTasks && t.isCompleted) return false;
    return t.dayKey === selectedProgramDay;
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '0.75rem' : '1.5rem'
    }}>
      <div style={{
        background: themeObj.cardBg,
        border: `1px solid ${themeObj.border}`,
        borderRadius: 24,
        width: '100%',
        maxWidth: 720,
        maxHeight: '90vh',
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
          background: themeObj.innerBg
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: themeObj.text }}>
              Çalışma Görevi veya Test Seç
            </h3>
            <div style={{ fontSize: '0.74rem', color: themeObj.subText, marginTop: 2 }}>
              Haftalık ders programından veya atanmış kitap testlerinden bir görev seç
            </div>
          </div>

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

        {/* Kaynak Sekmeleri (Program / Ödevler / Kitaplar) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          padding: '0.75rem 1.25rem 0.5rem',
          background: themeObj.cardBg
        }}>
          {[
            { id: 'program', label: 'Haftalık Program', icon: '📅' },
            { id: 'homework', label: 'Atanmış Ödevler', icon: '📝' },
            { id: 'bookTest', label: 'Kitap Testleri', icon: '📖' }
          ].map(tab => {
            const isActive = hwSourceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setHwSourceTab(tab.id)}
                style={{
                  padding: '0.55rem 0.6rem',
                  borderRadius: 12,
                  border: `1px solid ${isActive ? themeObj.accent : themeObj.border}`,
                  background: isActive ? (themeObj.accentGradient || themeObj.accent) : themeObj.innerBg,
                  color: isActive ? '#ffffff' : themeObj.text,
                  fontWeight: 800,
                  fontSize: isMobile ? '0.74rem' : '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  transition: 'all 0.15s'
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
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
            overflowX: 'auto'
          }}>
            {weekDaysConfig.map(day => {
              const isSelected = selectedProgramDay === day.key;
              const count = allAssignedTasks.filter(t => t.sourceType === 'program' && t.dayKey === day.key && (!hideCompletedTasks || !t.isCompleted)).length;
              return (
                <button
                  key={day.key}
                  onClick={() => setSelectedProgramDay(day.key)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 10,
                    border: `1px solid ${isSelected ? day.color : themeObj.border}`,
                    background: isSelected ? day.color : themeObj.innerBg,
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
                  {count > 0 && (
                    <span style={{
                      background: isSelected ? 'rgba(255,255,255,0.3)' : day.color,
                      color: '#ffffff',
                      fontSize: '0.62rem',
                      padding: '1px 5px',
                      borderRadius: 99,
                      fontWeight: 900
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Arama & Filtre Çubuğu */}
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
              placeholder="Test veya ders ara..."
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

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.74rem',
            color: themeObj.subText,
            fontWeight: 700,
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={hideCompletedTasks}
              onChange={e => setHideCompletedTasks(e.target.checked)}
            />
            <span>Bitenleri Gizle</span>
          </label>
        </div>

        {/* Görev Listesi Alanı */}
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
              <EmptyStateMessage message="Bu gün için planlanmış bir görev bulunmuyor." themeObj={themeObj} />
            )
          ) : filteredTasksList.length > 0 ? (
            filteredTasksList.map(task => (
              <TaskListItem
                key={task.id || task.dedupeKey}
                task={task}
                themeObj={themeObj}
                onSelectTask={onSelectTask}
              />
            ))
          ) : (
            <EmptyStateMessage message="Kriterlerinize uygun görev veya test bulunamadı." themeObj={themeObj} />
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
          {task.subject} · {task.questionCount || 12} Soru {task.bookTitle ? `· ${task.bookTitle}` : ''}
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
