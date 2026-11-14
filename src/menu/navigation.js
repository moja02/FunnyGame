import { sound } from '../core/sound.js';

/**
 * ScreenNavigator - Handles screen transitions and header state
 */
export class ScreenNavigator {
  constructor() {
    this.currentScreen = 'home';
    this.screenHistory = ['home'];
    this.screens = ['home', 'catalog', 'settings', 'instructions', 'profile', 'duel'];
    this.onScreenChange = null;
  }

  navigateTo(screenName, options = {}) {
    sound.tap();

    // Hide all view screens
    this.screens.forEach(s => {
      const el = document.getElementById(`${s}-view`);
      if (el) el.classList.add('hidden');
    });

    // Hide all modals
    const modals = ['round-modal', 'match-modal', 'duel-options-modal'];
    modals.forEach(m => {
      const el = document.getElementById(m);
      if (el) el.classList.add('hidden');
    });

    // Show target screen
    const targetEl = document.getElementById(`${screenName}-view`);
    if (targetEl) targetEl.classList.remove('hidden');

    // Update Header
    const backBtn = document.getElementById('btn-back');
    const headerTitle = document.getElementById('header-title');

    if (screenName === 'home') {
      if (backBtn) backBtn.classList.add('hidden');
      if (headerTitle) headerTitle.innerText = 'FunnyGame ⚡';
      this.screenHistory = ['home'];
    } else {
      if (backBtn) backBtn.classList.remove('hidden');
      if (this.screenHistory[this.screenHistory.length - 1] !== screenName) {
        this.screenHistory.push(screenName);
      }

      if (headerTitle) {
        if (screenName === 'catalog') headerTitle.innerText = 'الألعاب المتوفرة 🎮';
        else if (screenName === 'settings') headerTitle.innerText = 'الإعدادات ⚙️';
        else if (screenName === 'instructions') headerTitle.innerText = 'تعليمات الألعاب 📖';
        else if (screenName === 'profile') headerTitle.innerText = 'الملف الشخصي 👤';
        else if (screenName === 'duel') headerTitle.innerText = 'لعبة الفارق الزمني ⏱️';
      }
    }

    this.currentScreen = screenName;
    if (this.onScreenChange) this.onScreenChange(screenName, options);
  }

  goBack() {
    sound.tap();
    if (this.screenHistory.length > 1) {
      this.screenHistory.pop();
      const prevScreen = this.screenHistory[this.screenHistory.length - 1] || 'home';
      this.navigateTo(prevScreen);
    } else {
      this.navigateTo('home');
    }
  }
}

export const navigator = new ScreenNavigator();
