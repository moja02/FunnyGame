import { profileService } from './profile-service.js';
import { sound } from '../core/sound.js';

/**
 * ProfileView - UI Controller for Player Profile screen
 */
export class ProfileView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.avatars = ['⚡', '👑', '🎯', '🦁', '🤖', '🐱', '🦊', '🚀', '🔥', '💎'];
  }

  render() {
    if (!this.container) return;
    const profile = profileService.getProfile();

    this.container.innerHTML = `
      <div class="pop-in" style="padding: 16px; width: 100%; max-width: 400px; margin: 0 auto;">
        
        <!-- Profile Card Header -->
        <div style="background: linear-gradient(145deg, #2a154c 0%, #150b28 100%); border: 2px solid rgba(254, 202, 87, 0.4); border-radius: 28px; padding: 22px 18px; text-align: center; margin-bottom: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.6);">
          <div id="profile-current-avatar" style="width: 72px; height: 72px; border-radius: 24px; background: rgba(254, 202, 87, 0.2); border: 2px solid #feca57; display: flex; align-items: center; justify-content: center; font-size: 2.6rem; margin: 0 auto 10px; box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
            ${profile.avatar}
          </div>

          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px;">
            <input id="profile-nickname-input" type="text" value="${profile.nickname}" maxlength="20"
              style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; color: #fff; font-size: 1.15rem; font-weight: 800; text-align: center; padding: 6px 12px; width: 180px; font-family: inherit;">
            <button id="btn-save-profile" class="arcade-btn" style="padding: 8px 14px; border-radius: 12px; font-size: 0.85rem; background: #2ecc71; color: #000;">
              حفظ ✔
            </button>
          </div>
          <span style="font-size: 0.75rem; color: #8395a7;">اضغط على الاسم لتعديله وحفظه</span>
        </div>

        <!-- Avatar Selection -->
        <div style="background: #180f2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 14px; margin-bottom: 16px;">
          <div style="font-size: 0.85rem; font-weight: 800; color: #feca57; margin-bottom: 10px; text-align: right;">
            اختر صورتك الرمزية (الأفاتار):
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
            ${this.avatars.map(a => `
              <button class="avatar-option-btn" data-avatar="${a}" style="width: 44px; height: 44px; border-radius: 14px; border: ${profile.avatar === a ? '2px solid #feca57' : '1px solid rgba(255,255,255,0.1)'}; background: ${profile.avatar === a ? 'rgba(254, 202, 87, 0.25)' : 'rgba(255,255,255,0.06)'}; font-size: 1.5rem; cursor: pointer; transition: 0.1s;">
                ${a}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Player Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;">
          <div style="background: rgba(255, 71, 87, 0.12); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 20px; padding: 14px; text-align: center;">
            <div style="font-size: 0.75rem; color: #ff6b81; font-weight: 700;">المباريات الملعوبة</div>
            <div class="digital-num" style="font-size: 1.8rem; color: #fff; font-weight: 900; margin-top: 4px;">${profile.totalGames}</div>
          </div>

          <div style="background: rgba(46, 204, 113, 0.12); border: 1px solid rgba(46, 204, 113, 0.3); border-radius: 20px; padding: 14px; text-align: center;">
            <div style="font-size: 0.75rem; color: #2ecc71; font-weight: 700;">الانتصارات والبطولات</div>
            <div class="digital-num" style="font-size: 1.8rem; color: #fff; font-weight: 900; margin-top: 4px;">${profile.wins}</div>
          </div>

          <div style="background: rgba(0, 210, 211, 0.12); border: 1px solid rgba(0, 210, 211, 0.3); border-radius: 20px; padding: 14px; text-align: center;">
            <div style="font-size: 0.75rem; color: #00d2d3; font-weight: 700;">نسبة الفوز</div>
            <div class="digital-num" style="font-size: 1.8rem; color: #fff; font-weight: 900; margin-top: 4px;">${profile.winRate}%</div>
          </div>

          <div style="background: rgba(254, 202, 87, 0.12); border: 1px solid rgba(254, 202, 87, 0.3); border-radius: 20px; padding: 14px; text-align: center;">
            <div style="font-size: 0.75rem; color: #feca57; font-weight: 700;">أفضل رقم (الفارق)</div>
            <div class="digital-num" style="font-size: 1.5rem; color: #fff; font-weight: 900; margin-top: 4px;">
              ${profile.bestTimeDuelDiff !== null ? `${profile.bestTimeDuelDiff.toFixed(3)} ث` : '---'}
            </div>
          </div>
        </div>

      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    // Save Nickname
    const saveBtn = document.getElementById('btn-save-profile');
    const input = document.getElementById('profile-nickname-input');
    if (saveBtn && input) {
      saveBtn.onclick = () => {
        sound.tap();
        profileService.updateProfile({ nickname: input.value });
        saveBtn.innerText = 'تم ✔';
        setTimeout(() => { if (saveBtn) saveBtn.innerText = 'حفظ ✔'; }, 1500);
      };
    }

    // Avatar Selection Buttons
    this.container.querySelectorAll('.avatar-option-btn').forEach(btn => {
      btn.onclick = () => {
        sound.tap();
        const avatar = btn.getAttribute('data-avatar');
        profileService.updateProfile({ avatar });
        this.render();
      };
    });
  }
}
