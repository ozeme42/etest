import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import confetti from 'canvas-confetti';

/**
 * Triggers vibration haptic feedback across native Capacitor and mobile browsers.
 */
export async function triggerHaptic(type = 'light') {
  try {
    if (type === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (type === 'warning') {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (type === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    } else if (type === 'heavy') {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else if (type === 'medium') {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch (err) {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      try {
        if (type === 'success') navigator.vibrate([40, 60, 80]);
        else if (type === 'warning' || type === 'error') navigator.vibrate([100, 50, 100]);
        else navigator.vibrate(25);
      } catch (e) {
        // Silently ignore browser permission restrictions
      }
    }
  }
}

/**
 * High energy celebration confetti for test completion, high score, and level ups.
 */
export function triggerCelebrationConfetti(options = {}) {
  try {
    triggerHaptic('success');

    const count = options.particleCount || 120;
    const defaults = {
      origin: { y: 0.65 },
      zIndex: 999999,
      colors: ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'],
      ...options
    };

    confetti({
      ...defaults,
      particleCount: Math.floor(count * 0.6),
      spread: 65,
      startVelocity: 45
    });

    confetti({
      ...defaults,
      particleCount: Math.floor(count * 0.4),
      spread: 100,
      decay: 0.91,
      scalar: 0.9
    });
  } catch (e) {
    console.warn('Confetti effect unavailable:', e);
  }
}

/**
 * Subtle sparkle confetti for single correct answer or quick milestone.
 */
export function triggerSparkleConfetti(x = 0.5, y = 0.5) {
  try {
    triggerHaptic('light');
    confetti({
      particleCount: 30,
      spread: 45,
      origin: { x, y },
      zIndex: 99999,
      scalar: 0.75,
      colors: ['#10b981', '#34d399', '#6ee7b7', '#fef08a']
    });
  } catch (e) {
    // ignore
  }
}
