/**
 * SoundEngine - Web Audio API Synthesizer
 * Generates custom arcade sound effects in real-time without external audio files.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterEnabled = true;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.6;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) this.ctx = new AudioContextClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, duration, type = 'sine', baseGain = 0.25) {
    if (!this.masterEnabled || this.sfxVolume <= 0.01) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const finalGain = baseGain * this.sfxVolume;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(finalGain, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  countdown() {
    this.playTone(440, 0.15, 'triangle', 0.25);
  }

  go() {
    if (!this.masterEnabled || this.sfxVolume <= 0.01) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3 * this.sfxVolume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  }

  tap() {
    this.playTone(600, 0.08, 'sine', 0.15);
  }

  stop(pitch = 1) {
    if (!this.masterEnabled || this.sfxVolume <= 0.01) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320 * pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.35 * this.sfxVolume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch (e) {}
  }

  mystery() {
    this.playTone(240, 0.3, 'sine', 0.2);
  }

  roundWin() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => this.playTone(f, 0.18, 'triangle', 0.25), i * 75));
  }

  matchWin() {
    const notes = [440, 554, 659, 880, 740, 880];
    notes.forEach((f, i) => setTimeout(() => this.playTone(f, 0.25, 'sawtooth', 0.2), i * 100));
  }
}

export const sound = new SoundEngine();
