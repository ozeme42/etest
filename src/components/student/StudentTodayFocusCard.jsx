import React from 'react';
import { Target, ArrowRight, CheckCircle2, Sparkles, SlidersHorizontal, Flame, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

export default function StudentTodayFocusCard({
  studentName = 'Öğrenci',
  dayProgramInfo = { totalCount: 0, completedCount: 0, items: [] },
  catchUpTasks = [],
  focusModeOnly = false,
  onToggleFocusMode = () => {},
  onStartFirstPendingTask = () => {},
  isMobile = false,
  isDark = false
}) {
  const firstName = studentName.split(' ')[0] || 'Öğrenci';
  const total = dayProgramInfo.totalCount || 0;
  const completed = dayProgramInfo.completedCount || 0;
  const pending = Math.max(0, total - completed);
  const remedialCount = catchUpTasks.length || 0;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : (remedialCount === 0 ? 100 : 0);
  const isAllDone = total > 0 ? (pending === 0 && remedialCount === 0) : remedialCount === 0;

  const firstPendingItem = (dayProgramInfo.items || []).find(t => !t.done) || catchUpTasks[0] || null;
  const pendingTitle = firstPendingItem
    ? (firstPendingItem.title || firstPendingItem.testTitle || firstPendingItem.subject || 'Sıradaki Test')
    : 'Göreve Başla';

  return (
    <div
      style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))'
          : 'linear-gradient(135deg, #ffffff, #f8fafc)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 20,
        padding: isMobile ? '1rem 0.95rem' : '1.25rem 1.45rem',
        boxShadow: isDark
          ? '0 8px 24px rgba(0, 0, 0, 0.35)'
          : '0 8px 24px rgba(99, 102, 241, 0.08)',
        marginBottom: 0,
        height: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Subtle background glow effect */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: isAllDone
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.25), transparent 70%)'
            : 'radial-gradient(circle, rgba(99, 102, 241, 0.25), transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
        {/* Left header tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: isAllDone
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 3px 10px rgba(99, 102, 241, 0.3)'
            }}
          >
            {isAllDone ? <CheckCircle2 size={18} /> : <Target size={18} />}
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: isAllDone ? '#10b981' : (pending === 0 && remedialCount > 0 ? '#f59e0b' : '#6366f1') }}>
              {isAllDone ? '🌟 Günlük Hedef Tamam' : (pending === 0 && remedialCount > 0 ? '🔥 Telafi Görevleri Bekliyor' : '🎯 Bugünün Odak Modu')}
            </div>
            <h3 style={{ margin: 0, fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, color: 'var(--color-text)' }}>
              Merhaba, {firstName}! {isAllDone ? '🎉' : '👋'}
            </h3>
          </div>
        </div>

        {/* Right action: Focus mode toggle */}
        <button
          type="button"
          onClick={onToggleFocusMode}
          style={{
            padding: '0.38rem 0.8rem',
            borderRadius: 99,
            background: focusModeOnly
              ? 'rgba(99, 102, 241, 0.15)'
              : 'var(--color-surface-hover)',
            border: focusModeOnly
              ? '1.5px solid #6366f1'
              : '1.5px solid var(--color-border)',
            color: focusModeOnly ? '#6366f1' : 'var(--color-text-muted)',
            fontWeight: 800,
            fontSize: '0.72rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title={focusModeOnly ? 'Tüm paneli göster' : 'Dikkat dağıtıcı bölümleri gizle'}
        >
          <SlidersHorizontal size={12} />
          <span>{focusModeOnly ? 'Sade Mod: Açık' : 'Sade Odak Modu'}</span>
        </button>
      </div>

      {/* Main summary message */}
      <p style={{ margin: '0 0 0.85rem 0', fontSize: isMobile ? '0.82rem' : '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.45, fontWeight: 600 }}>
        {isAllDone ? (
          <span>Harika iş çıkardın! Bugün planlanan tüm çalışma hedeflerini tamamladın. Kendine ödül verebilir veya serbest soru çözebilirsin.</span>
        ) : pending === 0 && remedialCount > 0 ? (
          <span>
            Bugünün planlanan görevleri tamamlandı, ancak geçmişten kalan <strong style={{ color: '#ef4444' }}>{remedialCount} telafi testi</strong> seni bekliyor.
          </span>
        ) : (
          <span>
            Bugün hedefine yaklaşmak için <strong style={{ color: 'var(--color-text)' }}>{pending} görev</strong>
            {remedialCount > 0 ? ` ve ` : ''}
            {remedialCount > 0 && <strong style={{ color: '#ef4444' }}>{remedialCount} telafi testi</strong>} seni bekliyor.
          </span>
        )}
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
          <span>Günün İlerlemesi</span>
          <span style={{ color: isAllDone ? '#10b981' : '#6366f1' }}>
            {completed}/{total} Görev (%{completionPct})
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'var(--color-surface-hover)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, completionPct)}%`,
              borderRadius: 99,
              background: isAllDone
                ? 'linear-gradient(90deg, #10b981, #059669)'
                : 'linear-gradient(90deg, #6366f1, #a855f7)',
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </div>
      </div>

      {/* CTA Button */}
      {!isAllDone && firstPendingItem && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size={isMobile ? 'sm' : 'md'}
            onClick={() => onStartFirstPendingTask(firstPendingItem)}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              boxShadow: '0 4px 16px rgba(79, 70, 229, 0.35)',
              fontWeight: 900
            }}
          >
            <Sparkles size={16} />
            <span>{pending === 0 && remedialCount > 0 ? 'Telafi Çöz: ' : 'Güne Başla: '}{pendingTitle.length > 26 ? pendingTitle.slice(0, 26) + '…' : pendingTitle}</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}

