import { TimeDuelLogic } from './time-duel-logic.js';
import { TimeDuelBot } from './time-duel-bot.js';
import { sound } from '../../core/sound.js';
import { haptics } from '../../core/haptics.js';
import { profileService } from '../../profile/profile-service.js';

/**
 * TimeDuelView - UI & Interaction Controller for Time Duel Game
 */
export class TimeDuelView {
  constructor({ containerId, confettiEngine, onBackToMenu }) {
    this.container = document.getElementById(containerId);
    this.confetti = confettiEngine;
    this.onBackToMenu = onBackToMenu;

    this.logic = new TimeDuelLogic();
    this.bot = new TimeDuelBot('medium');

    this.mode = 'pvp'; // 'pvp' | 'bot'
    this.gameState = 'idle'; // 'idle' | 'countdown' | 'running' | 'round_ended' | 'match_ended'
    this.startTime = 0;
    this.p1Stop = null;
    this.p2Stop = null;
    this.hasHiddenTimer = false;
    this.animFrame = null;
    this.botTimeout = null;

    this.initDOM();
  }

  initDOM() {
    if (!this.container) return;

    this.container.innerHTML = `
      <!-- Player 2 Zone (Top) - Inverted 180° in 2-Player mode -->
      <div id="zone-p2" class="player-zone zone-p2 flipped">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 38px; height: 38px; border-radius: 14px; background: linear-gradient(135deg, #00d2d3, #0abde3); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #000;">
              <span id="p2-avatar">👤</span>
            </div>
            <div>
              <div id="p2-name" style="font-size: 0.95rem; font-weight: 900; color: #48dbfb;">اللاعب 2 (الأزرق)</div>
              <div id="p2-score-sub" style="font-size: 0.75rem; color: #8395a7;">النقاط: 0 / 3</div>
            </div>
          </div>
          <div class="badge-pill" style="background: rgba(0, 210, 211, 0.2); color: #48dbfb;">
            الهدف: <span id="p2-target-display" class="digital-num">5.00 ث</span>
          </div>
        </div>

        <div id="p2-center-container" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
          <button id="btn-stop-p2" class="slam-button slam-p2 arcade-btn">
            <span>أوقف! 🛑</span>
            <span style="font-size: 0.9rem; opacity: 0.9;">اضغط عند الهدف</span>
          </button>

          <div id="p2-result-card" class="pop-in hidden" style="text-align: center; padding: 14px 24px; border-radius: 24px; background: rgba(0, 210, 211, 0.15); border: 2px solid #00d2d3;">
            <div style="font-size: 0.8rem; color: #a4b0be;">توقيت التوقف:</div>
            <div id="p2-stopped-val" class="digital-num" style="font-size: 2.2rem; color: #48dbfb; font-weight: 900;">0.000 ث</div>
            <div id="p2-diff-val" style="font-size: 1rem; font-weight: 800; color: #2ecc71;">الفارق: +0.000 ث</div>
          </div>
        </div>

        <div style="font-size: 0.75rem; color: #636e72; font-weight: 700;">
          تحكم اللاعب 2 (الشاشة العلوية)
        </div>
      </div>

      <!-- Center Divider Bar (Target, Scores, Timer) -->
      <div class="center-bar">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="badge-pill" style="background: #ff4757; color: white;">🔴 <span id="score-p1-bar">0</span></span>
          <span id="round-bar-text" style="font-size: 0.8rem; font-weight: 800; color: #a4b0be;">الجولة 1</span>
          <span class="badge-pill" style="background: #0abde3; color: white;">🔵 <span id="score-p2-bar">0</span></span>
        </div>

        <div id="timer-display-box" style="display: flex; align-items: center; gap: 6px;">
          <span id="timer-label" style="font-size: 0.75rem; color: #a4b0be;">العداد:</span>
          <span id="timer-value" class="digital-num" style="font-size: 1.25rem; font-weight: 900; color: #feca57;">
            0.00 ث
          </span>
        </div>
      </div>

      <!-- Player 1 Zone (Bottom) -->
      <div id="zone-p1" class="player-zone zone-p1">
        <div id="p1-center-container" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
          <button id="btn-stop-p1" class="slam-button slam-p1 arcade-btn">
            <span>أوقف! 🛑</span>
            <span style="font-size: 0.9rem; opacity: 0.9;">اضغط عند الهدف</span>
          </button>

          <div id="p1-result-card" class="pop-in hidden" style="text-align: center; padding: 14px 24px; border-radius: 24px; background: rgba(255, 71, 87, 0.15); border: 2px solid #ff4757;">
            <div style="font-size: 0.8rem; color: #a4b0be;">توقيت التوقف:</div>
            <div id="p1-stopped-val" class="digital-num" style="font-size: 2.2rem; color: #ff6b81; font-weight: 900;">0.000 ث</div>
            <div id="p1-diff-val" style="font-size: 1rem; font-weight: 800; color: #2ecc71;">الفارق: +0.000 ث</div>
          </div>
        </div>

        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div id="p1-avatar-box" style="width: 38px; height: 38px; border-radius: 14px; background: linear-gradient(135deg, #ff4757, #ff6b81); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #fff;">
              👤
            </div>
            <div>
              <div id="p1-name" style="font-size: 0.95rem; font-weight: 900; color: #ff6b81;">اللاعب 1 (الأحمر)</div>
              <div id="p1-score-sub" style="font-size: 0.75rem; color: #8395a7;">النقاط: 0 / 3</div>
            </div>
          </div>
          <div class="badge-pill" style="background: rgba(255, 71, 87, 0.2); color: #ff6b81;">
            الهدف: <span id="p1-target-display" class="digital-num">5.00 ث</span>
          </div>
        </div>
      </div>
    `;

    // Bind Stop Buttons
    const btnP1 = document.getElementById('btn-stop-p1');
    const btnP2 = document.getElementById('btn-stop-p2');
    if (btnP1) btnP1.onclick = () => this.stopPlayer1();
    if (btnP2) btnP2.onclick = () => this.stopPlayer2();
  }

  launch(mode = 'pvp', botDifficulty = 'medium') {
    this.cleanup();
    this.mode = mode;
    this.bot.setDifficulty(botDifficulty);
    this.logic.reset();

    const profile = profileService.getProfile();
    const p1Name = document.getElementById('p1-name');
    const p1Avatar = document.getElementById('p1-avatar-box');
    if (p1Name) p1Name.innerText = profile.nickname || 'اللاعب 1 (الأحمر)';
    if (p1Avatar) p1Avatar.innerText = profile.avatar || '⚡';

    const zoneP2 = document.getElementById('zone-p2');
    const p2Avatar = document.getElementById('p2-avatar');
    const p2Name = document.getElementById('p2-name');

    if (mode === 'pvp') {
      if (zoneP2) zoneP2.classList.add('flipped');
      if (p2Avatar) p2Avatar.innerText = '👤';
      if (p2Name) p2Name.innerText = 'اللاعب 2 (الأزرق)';
    } else {
      if (zoneP2) zoneP2.classList.remove('flipped');
      if (p2Avatar) p2Avatar.innerText = '🤖';
      const diffLabel = botDifficulty === 'easy' ? 'سهل' : botDifficulty === 'medium' ? 'متوسط' : 'مستحيل';
      if (p2Name) p2Name.innerText = `الروبوت (${diffLabel})`;
    }

    this.updateScoreDisplays();
    this.startRound();
  }

  startRound() {
    this.cleanup();
    const target = this.logic.generateTarget();

    document.getElementById('p1-target-display').innerText = target.toFixed(2) + ' ث';
    document.getElementById('p2-target-display').innerText = target.toFixed(2) + ' ث';

    this.p1Stop = null;
    this.p2Stop = null;
    this.hasHiddenTimer = false;

    document.getElementById('p1-result-card').classList.add('hidden');
    document.getElementById('p2-result-card').classList.add('hidden');

    const btnP1 = document.getElementById('btn-stop-p1');
    const btnP2 = document.getElementById('btn-stop-p2');

    btnP1.classList.remove('hidden');
    btnP2.classList.remove('hidden');
    btnP1.disabled = true;
    btnP2.disabled = true;
    btnP1.innerHTML = '<span>استعد... 🎯</span>';
    btnP2.innerHTML = '<span>استعد... 🎯</span>';

    document.getElementById('round-modal').classList.add('hidden');

    this.gameState = 'countdown';
    let count = 3;
    const timerVal = document.getElementById('timer-value');
    const timerLbl = document.getElementById('timer-label');
    timerLbl.innerText = 'الاستعداد:';
    timerVal.innerText = count;
    sound.countdown();

    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        timerVal.innerText = count;
        sound.countdown();
      } else if (count === 0) {
        timerVal.innerText = 'انطلق! 🚀';
        sound.go();
      } else {
        clearInterval(countInterval);
        this.beginRunning();
      }
    }, 850);
  }

  beginRunning() {
    this.gameState = 'running';
    this.startTime = performance.now();

    const btnP1 = document.getElementById('btn-stop-p1');
    const btnP2 = document.getElementById('btn-stop-p2');

    btnP1.disabled = false;
    btnP1.innerHTML = `<span>أوقف! 🛑</span><span style="font-size: 0.9rem; opacity:0.9;">اضغط عند ${this.logic.currentTarget.toFixed(2)} ث</span>`;

    if (this.mode === 'pvp') {
      btnP2.disabled = false;
      btnP2.innerHTML = `<span>أوقف! 🛑</span><span style="font-size: 0.9rem; opacity:0.9;">اضغط عند ${this.logic.currentTarget.toFixed(2)} ث</span>`;
    } else {
      btnP2.disabled = true;
      btnP2.innerHTML = '<span>يفكر الروبوت... 🤖</span>';
      this.scheduleBot();
    }

    const timerLbl = document.getElementById('timer-label');
    const timerVal = document.getElementById('timer-value');
    timerLbl.innerText = 'العداد:';

    const loop = () => {
      if (this.gameState !== 'running') return;
      const elapsed = (performance.now() - this.startTime) / 1000;

      if (elapsed >= 1.5 && !this.hasHiddenTimer) {
        this.hasHiddenTimer = true;
        timerVal.innerText = '⏱️ ?.??';
        timerVal.style.color = '#ff9ff3';
        sound.mystery();
      } else if (!this.hasHiddenTimer) {
        timerVal.innerText = elapsed.toFixed(2) + ' ث';
        timerVal.style.color = '#feca57';
      }

      if (elapsed > this.logic.currentTarget + 3.0) {
        this.handleTimeout();
        return;
      }

      this.animFrame = requestAnimationFrame(loop);
    };

    this.animFrame = requestAnimationFrame(loop);
  }

  scheduleBot() {
    const botTime = this.bot.calculateStop(this.logic.currentTarget);
    this.botTimeout = setTimeout(() => {
      this.stopPlayer2(botTime);
    }, botTime * 1000);
  }

  stopPlayer1() {
    if (this.gameState !== 'running' || this.p1Stop !== null) return;
    haptics.trigger(60);
    sound.stop(1.1);
    this.p1Stop = (performance.now() - this.startTime) / 1000;

    const btnP1 = document.getElementById('btn-stop-p1');
    btnP1.disabled = true;
    btnP1.innerHTML = '<span>✔ تم الإيقاف</span>';

    if (this.p2Stop !== null) {
      this.evaluateRound();
    }
  }

  stopPlayer2(forcedTime) {
    if (this.gameState !== 'running' || this.p2Stop !== null) return;
    haptics.trigger(60);
    sound.stop(0.9);
    this.p2Stop = forcedTime !== undefined ? forcedTime : (performance.now() - this.startTime) / 1000;

    const btnP2 = document.getElementById('btn-stop-p2');
    btnP2.disabled = true;
    btnP2.innerHTML = '<span>✔ تم الإيقاف</span>';

    if (this.p1Stop !== null) {
      this.evaluateRound();
    }
  }

  handleTimeout() {
    this.cleanup();
    const maxTime = this.logic.currentTarget + 3.0;
    if (this.p1Stop === null) this.p1Stop = maxTime;
    if (this.p2Stop === null) this.p2Stop = maxTime;
    this.evaluateRound();
  }

  evaluateRound() {
    this.cleanup();
    this.gameState = 'round_ended';

    const result = this.logic.evaluateStops(this.p1Stop, this.p2Stop);

    // Update Result Cards
    document.getElementById('btn-stop-p1').classList.add('hidden');
    const cardP1 = document.getElementById('p1-result-card');
    cardP1.classList.remove('hidden');
    document.getElementById('p1-stopped-val').innerText = this.p1Stop.toFixed(3) + ' ث';
    const p1Sign = this.p1Stop >= result.currentTarget ? '+' : '-';
    document.getElementById('p1-diff-val').innerText = `الفارق: ${p1Sign}${result.diff1.toFixed(3)} ث`;

    document.getElementById('btn-stop-p2').classList.add('hidden');
    const cardP2 = document.getElementById('p2-result-card');
    cardP2.classList.remove('hidden');
    document.getElementById('p2-stopped-val').innerText = this.p2Stop.toFixed(3) + ' ث';
    const p2Sign = this.p2Stop >= result.currentTarget ? '+' : '-';
    document.getElementById('p2-diff-val').innerText = `الفارق: ${p2Sign}${result.diff2.toFixed(3)} ث`;

    this.updateScoreDisplays();
    sound.roundWin();

    // Check if new personal record achieved
    profileService.recordMatch({
      gameId: 'time-duel',
      won: result.winner === 'p1',
      diff: result.diff1
    });

    setTimeout(() => {
      if (result.isMatchOver) {
        this.showMatchVictory(result.matchWinner);
      } else {
        this.showRoundModal(result.winner, result.diff1, result.diff2);
      }
    }, 900);
  }

  showRoundModal(winner, diff1, diff2) {
    const modal = document.getElementById('round-modal');
    const winnerText = document.getElementById('modal-round-winner');
    const profile = profileService.getProfile();

    if (winner === 'tie') {
      winnerText.innerText = 'تعادل مذهل في التوقيت! 🤝';
    } else if (winner === 'p1') {
      winnerText.innerText = `${profile.nickname || 'اللاعب 1'} الأقرب للهدف! 🎯`;
    } else {
      winnerText.innerText = this.mode === 'bot' ? 'الروبوت كان الأقرب للهدف! 🤖' : 'اللاعب 2 (الأزرق) الأقرب للهدف! 🎯';
    }

    document.getElementById('modal-p1-diff').innerText = diff1.toFixed(3) + ' ث';
    document.getElementById('modal-p2-label').innerText = this.mode === 'bot' ? 'فارق الروبوت:' : 'فارق اللاعب 2:';
    document.getElementById('modal-p2-diff').innerText = diff2.toFixed(3) + ' ث';

    modal.classList.remove('hidden');
  }

  showMatchVictory(winner) {
    this.gameState = 'match_ended';
    sound.matchWin();
    if (this.confetti) this.confetti.explode();

    const matchModal = document.getElementById('match-modal');
    const sub = document.getElementById('modal-match-sub');
    const profile = profileService.getProfile();

    if (winner === 'p1') {
      sub.innerText = `فاز باللقب: ${profile.nickname || 'اللاعب 1'} بطل الدقة! 🔥`;
    } else {
      sub.innerText = this.mode === 'bot' ? 'فاز الروبوت بالمباراة! تدرب أكثر وحاول مجدداً 🤖' : 'فاز باللقب: اللاعب 2 (الأزرق) بطل الدقة! ❄️';
    }

    document.getElementById('match-score-p1').innerText = this.logic.p1Score;
    document.getElementById('match-score-p2').innerText = this.logic.p2Score;

    matchModal.classList.remove('hidden');
  }

  updateScoreDisplays() {
    document.getElementById('score-p1-bar').innerText = this.logic.p1Score;
    document.getElementById('score-p2-bar').innerText = this.logic.p2Score;
    document.getElementById('p1-score-sub').innerText = `النقاط: ${this.logic.p1Score} / ${this.logic.winningScore}`;
    document.getElementById('p2-score-sub').innerText = `النقاط: ${this.logic.p2Score} / ${this.logic.winningScore}`;
    document.getElementById('round-bar-text').innerText = `الجولة ${this.logic.round}`;
  }

  nextRound() {
    sound.tap();
    document.getElementById('round-modal').classList.add('hidden');
    this.logic.nextRound();
    this.updateScoreDisplays();
    this.startRound();
  }

  resetMatch() {
    sound.tap();
    document.getElementById('match-modal').classList.add('hidden');
    this.logic.reset();
    this.updateScoreDisplays();
    this.startRound();
  }

  cleanup() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.botTimeout) clearTimeout(this.botTimeout);
  }
}
