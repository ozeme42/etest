import { useRef, useCallback } from 'react';

/**
 * Custom hook to handle touch swipe gestures (left, right, up, down).
 * @param {Object} options - { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 45 }
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 45
} = {}) {
  const touchCoords = useRef({ startX: 0, startY: 0, startTime: 0 });

  const onTouchStart = useCallback((e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchCoords.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startTime: Date.now()
    };
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchCoords.current.startX;
    const diffY = endY - touchCoords.current.startY;
    const duration = Date.now() - touchCoords.current.startTime;

    // Fast swipe gesture (under 500ms)
    if (duration > 600) return;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      if (Math.abs(diffX) >= threshold) {
        if (diffX > 0 && typeof onSwipeRight === 'function') {
          onSwipeRight();
        } else if (diffX < 0 && typeof onSwipeLeft === 'function') {
          onSwipeLeft();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(diffY) >= threshold) {
        if (diffY > 0 && typeof onSwipeDown === 'function') {
          onSwipeDown();
        } else if (diffY < 0 && typeof onSwipeUp === 'function') {
          onSwipeUp();
        }
      }
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  return {
    onTouchStart,
    onTouchEnd
  };
}
