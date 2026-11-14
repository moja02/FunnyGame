/**
 * Haptics - Vibration feedback helper
 */
export class HapticService {
  constructor() {
    this.enabled = true;
  }

  trigger(ms = 40) {
    if (this.enabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch (e) {}
    }
  }
}

export const haptics = new HapticService();
