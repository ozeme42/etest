import React, { memo } from 'react';
import { Calendar, CalendarDays, ChevronRight, Plus, Sparkles, Zap, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default memo(function DashboardWeeklyCalendar({
  isMobile = false,
  isDark = false,
  daysOfWeek = [],
  activeDayKey = 'Pzt',
  todayDayKey = 'Pzt',
  weekTasksCountMap = {},
  weekInfo = { dayDateMap: {} },
  onSelectDay,
  onAddTask,
  onPrint,
  showProgramButton = true
}) {
  const navigate = useNavigate();

  return (
    <div
      className="game-card-elevated"
      style={{
        padding: isMobile ? '1.1rem 0.95rem' : '1.35rem 1.6rem',
        borderRadius: 22,
        boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(99, 102, 241, 0.08)'
      }}
    >
      {/* ── Üst Başlık & Eylemler ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.1rem',
        flexWrap: 'wrap',
        gap: '0.65rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: isMobile ? 38 : 44,
            height: isMobile ? 38 : 44,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            flexShrink: 0
          }}>
            <Calendar size={isMobile ? 18 : 22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{
                margin: 0,
                fontSize: isMobile ? '1.02rem' : '1.25rem',
                fontWeight: 900,
                color: 'var(--color-text)',
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.02em'
              }}>
                Haftalık Çalışma & Görev Takvimi
              </h3>
              {activeDayKey === todayDayKey && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                }}>
                  BUGÜN
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Günü seçerek o günün ders programını ve testlerini görüntüle
            </p>
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 8,
          flexWrap: 'wrap',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'flex-end'
        }}>
          {activeDayKey !== todayDayKey && (
            <button
              type="button"
              onClick={() => onSelectDay && onSelectDay(todayDayKey)}
              className="game-btn-3d"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: isMobile ? '0.45rem 0.65rem' : '0.5rem 1rem',
                fontSize: isMobile ? '0.74rem' : '0.8rem',
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: isMobile ? '1 1 auto' : undefined,
                gap: 5,
                boxShadow: '0 3px 10px rgba(245, 158, 11, 0.35)'
              }}
            >
              <Zap size={14} fill="#ffffff" />
              <span>Bugün</span>
            </button>
          )}

          {onAddTask && (
            <button
              type="button"
              onClick={onAddTask}
              className="game-btn-3d game-btn-emerald"
              style={{
                borderRadius: 12,
                padding: isMobile ? '0.45rem 0.65rem' : '0.5rem 1rem',
                fontSize: isMobile ? '0.74rem' : '0.8rem',
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: isMobile ? '1 1 auto' : undefined,
                gap: 5
              }}
            >
              <Plus size={15} strokeWidth={2.8} />
              <span>{isMobile ? 'Ekle' : 'Görev Ekle'}</span>
            </button>
          )}

          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="game-btn-3d"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.18)' : '1.5px solid #cbd5e1',
                borderRadius: 12,
                padding: isMobile ? '0.45rem 0.65rem' : '0.5rem 1rem',
                fontSize: isMobile ? '0.74rem' : '0.8rem',
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: isMobile ? '1 1 auto' : undefined,
                gap: 5,
                color: isDark ? '#ffffff' : '#334155',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
              title="Haftalık Programı Yazdır / PDF İndir"
            >
              <Printer size={15} />
              <span>{isMobile ? 'Yazdır' : 'Haftalık Yazdır'}</span>
            </button>
          )}

          {showProgramButton && (
            <button
              type="button"
              onClick={() => navigate('/my-program')}
              className="game-btn-3d game-btn-primary"
              style={{
                borderRadius: 12,
                padding: isMobile ? '0.45rem 0.75rem' : '0.5rem 1.05rem',
                fontSize: isMobile ? '0.74rem' : '0.8rem',
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: isMobile ? '1 1 auto' : undefined,
                gap: 5
              }}
            >
              <CalendarDays size={15} />
              <span>{isMobile ? 'Program' : 'Haftalık Tam Program'}</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── 7 Günlük Modern Bento Şeridi ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(7, minmax(64px, 1fr))' : 'repeat(7, minmax(0, 1fr))',
          gap: isMobile ? 8 : 10,
          width: '100%',
          boxSizing: 'border-box',
          overflowX: isMobile ? 'auto' : 'visible',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingBottom: isMobile ? 6 : 4
        }}
      >
        {daysOfWeek.map(day => {
          const isSelected = activeDayKey === day.key;
          const isCurrentToday = todayDayKey === day.key;
          const taskCount = weekTasksCountMap[day.key] || 0;
          const dayDate = weekInfo.dayDateMap?.[day.key];
          const dateNumber = dayDate?.dateLabel ? dayDate.dateLabel.split(' ')[0] : '';
          const monthName = dayDate?.dateLabel ? dayDate.dateLabel.split(' ')[1] : '';

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDay && onSelectDay(day.key)}
              style={{
                background: isSelected
                  ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                  : isCurrentToday
                  ? (isDark ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.15))' : '#fffbeb')
                  : 'var(--color-surface)',
                border: isSelected
                  ? '2px solid #818cf8'
                  : isCurrentToday
                  ? '2px solid #f59e0b'
                  : '1.5px solid var(--color-border)',
                borderRadius: isMobile ? 14 : 18,
                padding: isMobile ? '0.65rem 0.35rem' : '0.95rem 0.6rem',
                color: isSelected ? '#ffffff' : isCurrentToday ? (isDark ? '#fcd34d' : '#b45309') : 'var(--color-text)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? 3 : 5,
                boxShadow: isSelected
                  ? '0 8px 22px rgba(79, 70, 229, 0.45)'
                  : isCurrentToday
                  ? '0 4px 14px rgba(245, 158, 11, 0.22)'
                  : '0 2px 8px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
                minWidth: isMobile ? 64 : 0,
                width: '100%',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Gün İkonu */}
              <span style={{ fontSize: isMobile ? '1.15rem' : '1.45rem', lineHeight: 1 }}>
                {day.icon || '📅'}
              </span>

              {/* Gün İsmi */}
              <span style={{
                fontSize: isMobile ? '0.74rem' : '0.88rem',
                fontWeight: 900,
                lineHeight: 1.1,
                fontFamily: "'Outfit', sans-serif"
              }}>
                {isMobile ? day.short : day.name}
              </span>

              {/* Tarih Etiketi */}
              <span style={{
                fontSize: isMobile ? '0.64rem' : '0.72rem',
                fontWeight: 800,
                color: isSelected ? '#ffffff' : isCurrentToday ? '#b45309' : 'var(--color-text-muted)',
                background: isSelected ? 'rgba(255, 255, 255, 0.22)' : 'var(--color-surface-hover)',
                padding: isMobile ? '1px 5px' : '2px 8px',
                borderRadius: 8,
                whiteSpace: 'nowrap',
                lineHeight: 1.1,
                border: isSelected ? 'none' : '1px solid var(--color-border)'
              }}>
                {dateNumber} {monthName}
              </span>

              {/* Görev Sayacı / Durum Rozeti */}
              {isCurrentToday ? (
                <span style={{
                  fontSize: isMobile ? '0.54rem' : '0.64rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  padding: isMobile ? '2px 6px' : '2px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.04em',
                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)',
                  marginTop: 3,
                  whiteSpace: 'nowrap'
                }}>
                  BUGÜN ⚡
                </span>
              ) : taskCount > 0 ? (
                <span style={{
                  fontSize: isMobile ? '0.56rem' : '0.66rem',
                  fontWeight: 900,
                  color: isSelected ? '#ffffff' : '#6366f1',
                  background: isSelected ? 'rgba(255, 255, 255, 0.25)' : (isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff'),
                  padding: isMobile ? '2px 6px' : '2px 8px',
                  borderRadius: 99,
                  border: isSelected ? 'none' : '1px solid rgba(99, 102, 241, 0.25)',
                  marginTop: 3,
                  whiteSpace: 'nowrap'
                }}>
                  {taskCount} görev
                </span>
              ) : (
                <span style={{ fontSize: isMobile ? '0.54rem' : '0.64rem', opacity: 0.35, marginTop: 3 }}>
                  -
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
