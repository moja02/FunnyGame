/**
 * Safe Vibration (Haptic Feedback) Helper
 * Gracefully degrades on unsupported platforms (e.g. Safari on iOS).
 */
export function vibrate(pattern: number | number[]): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration permission or browser restrictions
    }
  }
}

export const haptics = {
  light: () => vibrate(15),
  medium: () => vibrate(35),
  heavy: () => vibrate(60),
  error: () => vibrate([40, 60, 40]),
  success: () => vibrate([30, 40, 50])
};
