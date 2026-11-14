import { sound } from './core/sound.js';
import { ConfettiEngine } from './core/confetti.js';
import { navigator } from './menu/navigation.js';
import { SettingsController } from './menu/settings-view.js';
import { CatalogView } from './menu/catalog-view.js';
import { ProfileView } from './profile/profile-view.js';
import { profileService } from './profile/profile-service.js';
import { TimeDuelView } from './games/time-duel/time-duel-view.js';

/**
 * Master Application Bootstrapper
 */
class Application {
  constructor() {
    this.confetti = new ConfettiEngine('confetti-canvas');
    this.settings = new SettingsController();
    this.profileView = new ProfileView('profile-view');
    this.selectedBotDiff = 'medium';

    this.timeDuelView = new TimeDuelView({
      containerId: 'duel-view',
      confettiEngine: this.confetti,
      onBackToMenu: () => navigator.navigateTo('catalog')
    });

    this.catalogView = new CatalogView('catalog-cards-container', (gameId) => {
      this.handleGameSelected(gameId);
    });

    this.initHeader();
    this.initHomeHeroButtons();
    this.initDuelOptionsModal();
    this.initRoundAndVictoryModals();

    // Prevent double tap zooms on arcade buttons
    document.querySelectorAll('.arcade-btn').forEach(btn => {
      btn.addEventListener('touchstart', () => {}, { passive: true });
    });
  }

  initHeader() {
    // Back Button
    const backBtn = document.getElementById('btn-back');
    if (backBtn) backBtn.onclick = () => navigator.goBack();

    // Sound Toggle in Header
    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
      soundBtn.onclick = () => {
        this.settings.toggleMasterSound();
      };
    }

    // Desktop Simulator / Fullscreen Toggle
    const screenBtn = document.getElementById('btn-screen');
    const wrapper = document.getElementById('app-wrapper');
    if (screenBtn && wrapper) {
      screenBtn.onclick = () => {
        sound.tap();
        const isFull = wrapper.classList.contains('fullscreen-mode');
        if (isFull) {
          wrapper.classList.remove('fullscreen-mode');
          wrapper.classList.add('simulator-mode');
          screenBtn.innerText = '📱';
        } else {
          wrapper.classList.remove('simulator-mode');
          wrapper.classList.add('fullscreen-mode');
          screenBtn.innerText = '🖥️';
        }
        this.confetti.resize();
      };
    }
  }

  initHomeHeroButtons() {
    // 1. Play Button -> Open Catalog
    const btnPlay = document.getElementById('btn-hero-play');
    if (btnPlay) btnPlay.onclick = () => navigator.navigateTo('catalog');

    // 2. Leaderboard Button -> Open Profile & Leaderboard
    const btnLeaderboard = document.getElementById('btn-hero-leaderboard');
    if (btnLeaderboard) {
      btnLeaderboard.onclick = () => {
        this.profileView.render();
        navigator.navigateTo('profile');
      };
    }

    // 3. Profile Button -> Open Profile
    const btnProfile = document.getElementById('btn-hero-profile');
    if (btnProfile) {
      btnProfile.onclick = () => {
        this.profileView.render();
        navigator.navigateTo('profile');
      };
    }

    // 3. Settings Button -> Open Settings
    const btnSettings = document.getElementById('btn-hero-settings');
    if (btnSettings) btnSettings.onclick = () => navigator.navigateTo('settings');

    // 4. Instructions Button -> Open Instructions
    const btnInstructions = document.getElementById('btn-hero-instructions');
    if (btnInstructions) btnInstructions.onclick = () => navigator.navigateTo('instructions');

    // Fast-launch banner button
    const btnDirectDuel = document.getElementById('btn-direct-duel');
    if (btnDirectDuel) {
      btnDirectDuel.onclick = () => this.openDuelOptionsModal();
    }
  }

  initDuelOptionsModal() {
    // 2-Player Button
    const btnPvp = document.getElementById('btn-modal-pvp');
    if (btnPvp) {
      btnPvp.onclick = () => {
        this.closeDuelOptionsModal();
        navigator.navigateTo('duel');
        this.timeDuelView.launch('pvp');
      };
    }

    // Bot Launch Button
    const btnBot = document.getElementById('btn-modal-bot');
    if (btnBot) {
      btnBot.onclick = () => {
        this.closeDuelOptionsModal();
        navigator.navigateTo('duel');
        this.timeDuelView.launch('bot', this.selectedBotDiff);
      };
    }

    // Bot Difficulty Selectors
    ['easy', 'medium', 'hard'].forEach(diff => {
      const btn = document.getElementById(`diff-${diff}`);
      if (btn) {
        btn.onclick = () => {
          sound.tap();
          this.selectedBotDiff = diff;
          ['easy', 'medium', 'hard'].forEach(d => {
            const b = document.getElementById(`diff-${d}`);
            if (b) {
              b.style.background = d === diff ? '#54a0ff' : 'rgba(255,255,255,0.08)';
              b.style.color = d === diff ? '#000' : '#888';
            }
          });
        };
      }
    });

    // Close Options Modal
    const btnClose = document.getElementById('btn-close-options');
    if (btnClose) btnClose.onclick = () => this.closeDuelOptionsModal();
  }

  initRoundAndVictoryModals() {
    // Next Round Button
    const btnNextRound = document.getElementById('btn-next-round');
    if (btnNextRound) {
      btnNextRound.onclick = () => this.timeDuelView.nextRound();
    }

    // Reset Match Button
    const btnResetMatch = document.getElementById('btn-reset-match');
    if (btnResetMatch) {
      btnResetMatch.onclick = () => this.timeDuelView.resetMatch();
    }

    // Back to Catalog from Victory Modal
    const btnVictoryCatalog = document.getElementById('btn-victory-catalog');
    if (btnVictoryCatalog) {
      btnVictoryCatalog.onclick = () => {
        document.getElementById('match-modal').classList.add('hidden');
        navigator.navigateTo('catalog');
      };
    }
  }

  handleGameSelected(gameId) {
    if (gameId === 'time-duel') {
      this.openDuelOptionsModal();
    } else {
      navigator.navigateTo('instructions');
    }
  }

  openDuelOptionsModal() {
    sound.tap();
    const modal = document.getElementById('duel-options-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeDuelOptionsModal() {
    sound.tap();
    const modal = document.getElementById('duel-options-modal');
    if (modal) modal.classList.add('hidden');
  }
}

// Bootstrap application on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new Application();
});
