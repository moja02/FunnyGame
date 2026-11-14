import { sound } from '../core/sound.js';
import { haptics } from '../core/haptics.js';
import { StorageService } from '../core/storage.js';

/**
 * SettingsController - Manages audio and vibration preferences
 */
export class SettingsController {
  constructor() {
    this.init();
  }

  init() {
    // Load SFX Volume
    const savedSfx = StorageService.getNumber('sfx_vol', 80);
    sound.sfxVolume = savedSfx / 100;
    const sfxSlider = document.getElementById('sfx-slider');
    const sfxText = document.getElementById('sfx-vol-text');
    if (sfxSlider) sfxSlider.value = savedSfx;
    if (sfxText) sfxText.innerText = `${savedSfx}%`;

    // Load Music Volume
    const savedMusic = StorageService.getNumber('music_vol', 60);
    sound.musicVolume = savedMusic / 100;
    const musicSlider = document.getElementById('music-slider');
    const musicText = document.getElementById('music-vol-text');
    if (musicSlider) musicSlider.value = savedMusic;
    if (musicText) musicText.innerText = `${savedMusic}%`;

    // Load Vibration
    const savedVibe = StorageService.getBoolean('vibration', true);
    haptics.enabled = savedVibe;
    this.updateVibrationBtn();

    this.attachEvents();
  }

  attachEvents() {
    const sfxSlider = document.getElementById('sfx-slider');
    if (sfxSlider) {
      sfxSlider.oninput = (e) => {
        const val = parseInt(e.target.value);
        sound.sfxVolume = val / 100;
        document.getElementById('sfx-vol-text').innerText = `${val}%`;
        StorageService.setNumber('sfx_vol', val);
      };
      sfxSlider.onchange = () => sound.tap();
    }

    const musicSlider = document.getElementById('music-slider');
    if (musicSlider) {
      musicSlider.oninput = (e) => {
        const val = parseInt(e.target.value);
        sound.musicVolume = val / 100;
        document.getElementById('music-vol-text').innerText = `${val}%`;
        StorageService.setNumber('music_vol', val);
      };
    }

    const vibeBtn = document.getElementById('btn-vibrate-toggle');
    if (vibeBtn) {
      vibeBtn.onclick = () => {
        haptics.enabled = !haptics.enabled;
        StorageService.setBoolean('vibration', haptics.enabled);
        this.updateVibrationBtn();
        if (haptics.enabled) haptics.trigger(60);
      };
    }

    const masterMute = document.getElementById('btn-master-mute');
    if (masterMute) {
      masterMute.onclick = () => this.toggleMasterSound();
    }
  }

  toggleMasterSound() {
    sound.masterEnabled = !sound.masterEnabled;
    const icon = sound.masterEnabled ? '🔊' : '🔇';
    const topSoundBtn = document.getElementById('btn-sound');
    if (topSoundBtn) topSoundBtn.innerText = icon;

    const muteBtn = document.getElementById('btn-master-mute');
    if (muteBtn) {
      muteBtn.innerText = sound.masterEnabled ? 'مُفعل ✔' : 'مكتوم ✖';
      muteBtn.style.background = sound.masterEnabled ? '#2ecc71' : '#ff4757';
      muteBtn.style.color = sound.masterEnabled ? '#000' : '#fff';
    }

    if (sound.masterEnabled) sound.tap();
  }

  updateVibrationBtn() {
    const btn = document.getElementById('btn-vibrate-toggle');
    if (btn) {
      btn.innerText = haptics.enabled ? 'مُفعل ✔' : 'معطل ✖';
      btn.style.background = haptics.enabled ? '#2ecc71' : '#718093';
      btn.style.color = haptics.enabled ? '#000' : '#fff';
    }
  }
}
