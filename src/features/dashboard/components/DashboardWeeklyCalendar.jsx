import React, { memo } from 'react';
import { Calendar, CalendarDays, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default memo(function DashboardWeeklyCalendar({
  isMobile = false,
  isDark = false,
  daysOfWeek = [],
  activeDayKey = 'Pzt',
  todayDayKey = 'Pzt',
  weekTasksCountMap = {},
  weekInfo = { dayDateMap: {} },
  onSelectDay
}) {
  const navigate = useNavigate();

  return (
    <div>
      {/* Üst Başlık & Program Butonu */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={15} color="#6366f1" />
          </div>
          <div>
            <span style={{ fontSize: isMobile ? '0.88rem' : '0.95rem', fontWeight: 900, color: 'var(--color-text)' }}>
              Haftalık Çalışma & Görev Takvimi
            </span>
            {!isMobile && (
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, marginLeft: 8 }}>
                (Günü seçerek o günkü görevleri gör)
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeDayKey !== todayDayKey && (
            <button
              type="button"
              onClick={() => onSelectDay && onSelectDay(todayDayKey)}
              style={{
                background: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7',
                border: '1px solid #f59e0b',
                color: '#b45309',
                borderRadius: 8,
                padding: '0.25rem 0.55rem',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              ● Bugün
            </button>
          )}
          <button
            onClick={() => navigate('/my-program')}
            className="sd-btn"
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              border: 'none',
              color: '#ffffff',
              borderRadius: 8,
              padding: isMobile ? '0.3rem 0.65rem' : '0.4rem 0.9rem',
              fontSize: isMobile ? '0.7rem' : '0.75rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)'
            }}
          >
            <CalendarDays size={12} /> {isMobile ? 'Program' : 'Programı Düzenle'} <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* 7-Day Week Buttons Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: isMobile ? 4 : 8,
          width: '100%',
          boxSizing: 'border-box',
          overflowX: isMobile ? 'auto' : 'visible',
          scrollbarWidth: 'none',
          paddingBottom: 2
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
                flexShrink: 0,
                background: isSelected
                  ? `linear-gradient(135deg, ${day.color || '#4f46e5'}, #3730a3)`
                  : isCurrentToday
                  ? (isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb')
                  : (isDark ? 'rgba(255,255,255,0.03)' : (day.bg || '#f8fafc')),
                border: `2px solid ${isSelected ? (day.color || '#4f46e5') : isCurrentToday ? '#f59e0b' : 'var(--color-border)'}`,
                borderRadius: isMobile ? 12 : 14,
                padding: isMobile ? '0.45rem 0.15rem' : '0.75rem 0.5rem',
                color: isSelected ? '#ffffff' : isCurrentToday ? (isDark ? '#fcd34d' : '#b45309') : 'var(--color-text)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? 2 : 4,
                boxShadow: isSelected
                  ? `0 6px 18px ${day.color || '#4f46e5'}45`
                  : isCurrentToday
                  ? '0 3px 10px rgba(245,158,11,0.25)'
                  : 'none',
                transition: 'all 0.15s ease',
                minWidth: 0,
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <span style={{ fontSize: isMobile ? '1rem' : '1.25rem', lineHeight: 1 }}>
                {day.icon || '📅'}
              </span>

              <span style={{ fontSize: isMobile ? '0.72rem' : '0.86rem', fontWeight: 900, lineHeight: 1.1 }}>
                {isMobile ? day.short : day.name}
              </span>

              <span style={{
                fontSize: isMobile ? '0.62rem' : '0.72rem',
                fontWeight: 800,
                color: isSelected ? '#ffffff' : isCurrentToday ? '#b45309' : 'var(--color-text-muted)',
                background: isSelected ? 'rgba(255,255,255,0.22)' : 'var(--color-surface)',
                padding: isMobile ? '1px 4px' : '1px 6px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
                lineHeight: 1.1,
                border: isSelected ? 'none' : '1px solid var(--color-border)'
              }}>
                {dateNumber} {monthName}
              </span>

              {isCurrentToday ? (
                <span style={{
                  fontSize: isMobile ? '0.52rem' : '0.6rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  padding: isMobile ? '1px 4px' : '2px 6px',
                  borderRadius: 6,
                  letterSpacing: '0.03em',
                  boxShadow: '0 2px 6px rgba(245,158,11,0.35)',
                  marginTop: 1
                }}>
                  BUGÜN
                </span>
              ) : taskCount > 0 ? (
                <span style={{
                  fontSize: isMobile ? '0.54rem' : '0.62rem',
                  fontWeight: 900,
                  color: isSelected ? '#ffffff' : day.color,
                  background: isSelected ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(255,255,255,0.08)' : '#ffffff'),
                  padding: isMobile ? '1px 5px' : '2px 7px',
                  borderRadius: 99,
                  border: isSelected ? 'none' : `1px solid ${day.color}40`,
                  marginTop: 1
                }}>
                  {taskCount} görev
                </span>
              ) : (
                <span style={{ fontSize: isMobile ? '0.52rem' : '0.6rem', opacity: 0.35, marginTop: 1 }}>
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
