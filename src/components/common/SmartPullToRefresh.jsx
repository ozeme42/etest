import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, ArrowDown, Check } from 'lucide-react';

import { triggerHapticFeedback } from '../../services/nativeMobileService';

const THRESHOLD = 65; // Pull distance to trigger refresh
const MAX_PULL = 110; // Max visual displacement

/**
 * Smart Pull-to-Refresh Wrapper for Dashboards & List Pages.
 * Activates exclusively on non-quiz pages and only when at top of page.
 */
export default function SmartPullToRefresh({
  children,
  onRefresh,
  disabled = false,
  className = ''
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  const startY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef(null);

  const triggerHaptic = useCallback(async () => {
    try {
      await triggerHapticFeedback('light');
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch {}
  }, []);

  const handleTouchStart = (e) => {
    if (disabled || isRefreshing) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollY <= 2) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
      setHasTriggeredHaptic(false);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling.current || disabled || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (diff > 0 && scrollY <= 2) {
      // Apply rubber-band damping resistance
      const damped = Math.min(MAX_PULL, diff * 0.45);
      setPullDistance(damped);

      if (damped >= THRESHOLD && !hasTriggeredHaptic) {
        setHasTriggeredHaptic(true);
        triggerHaptic();
      }
    } else {
      setPullDistance(0);
      isPulling.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || disabled || isRefreshing) return;
    isPulling.current = false;

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(48); // Stay at indicator height during refresh
      triggerHaptic();

      try {
        if (typeof onRefresh === 'function') {
          await onRefresh();
        } else {
          // Default fallback: reload page or trigger sync
          window.location.reload();
        }
      } catch (err) {
        console.warn('[SmartPullToRefresh] error:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
  };

  const progress = Math.min(1, pullDistance / THRESHOLD);
  const isReady = pullDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={className}
      style={{
        position: 'relative',
        minHeight: '100%',
        width: '100%'
      }}
    >
      {/* PULL TO REFRESH INDICATOR PILL */}
      <div
        style={{
          position: 'fixed',
          top: 14,
          left: '50%',
          transform: `translateX(-50%) translateY(${pullDistance > 0 ? pullDistance * 0.8 : -80}px)`,
          opacity: pullDistance > 10 ? Math.min(1, pullDistance / 35) : 0,
          zIndex: 9999,
          pointerEvents: 'none',
          transition: isPulling.current ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease'
        }}
      >
        <div
          style={{
            background: isReady ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-surface, #ffffff)',
            color: isReady ? '#ffffff' : 'var(--color-text, #0f172a)',
            border: isReady ? '1.5px solid #818cf8' : '1.5px solid var(--color-border, #e2e8f0)',
            borderRadius: 999,
            padding: '0.45rem 0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.18)',
            fontSize: '0.78rem',
            fontWeight: 800
          }}
        >
          {isRefreshing ? (
            <>
              <RefreshCw size={14} className="animate-spin" color={isReady ? '#ffffff' : '#6366f1'} />
              <span>Yenileniyor...</span>
            </>
          ) : isReady ? (
            <>
              <Check size={14} color="#ffffff" />
              <span>Bırakın ve Yenilensin</span>
            </>
          ) : (
            <>
              <ArrowDown
                size={14}
                style={{
                  transform: `rotate(${progress * 180}deg)`,
                  transition: 'transform 0.15s ease',
                  color: '#6366f1'
                }}
              />
              <span>Yenilemek İçin Çekin</span>
            </>
          )}
        </div>
      </div>

      {/* CONTENT WITH SUBTLE SPRING OFFSET */}
      <div
        style={{
          transform: isPulling.current ? `translateY(${pullDistance * 0.35}px)` : 'none',
          transition: isPulling.current ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        {children}
      </div>
    </div>
  );
}
