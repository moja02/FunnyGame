import { profileService } from './profile-service.js';
import { LeaderboardService } from '../services/leaderboard-service.js';
import { sound } from '../core/sound.js';

/**
 * ProfileView - UI Controller for Player Profile and Global Leaderboard
 */
export class ProfileView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.avatars = ['⚡', '👑', '🎯', '🦁', '🤖', '🐱', '🦊', '🚀', '🔥', '💎'];
    this.leaderboard = [];
    this.isLoadingLeaderboard = false;
  }

  async render() {
    if (!this.container) return;
    const profile = profileService.getProfile();

    this.container.innerHTML = `
      <div class="pop-in" style="padding: 16px; width: 100%; max-width: 420px; margin: 0 auto;">
        
        <!-- Profile Card Header -->
        <div style="background: linear-gradient(145deg, #2a154c 0%, #150b28 100%); border: 2px solid rgba(254, 202, 87, 0.4); border-radius: 28px; padding: 20px 16px; text-align: center; margin-bottom: 14px; box-shadow: 0 15px 35px rgba(0,0,0,0.6);">
          
          <div style="display: flex; justify-content: flex-end; margin-bottom: 2px;">
            <span class="badge-pill" style="font-size: 0.7rem; background: rgba(46, 204, 113, 0.15); color: #2ecc71; border-color: rgba(46, 204, 113, 0.4);">
              🟢 سحابي (Supabase Cloud)
            </span>
          </div>

          <div id="profile-current-avatar" style="width: 72px; height: 72px; border-radius: 24px; background: rgba(254, 202, 87, 0.2); border: 2px solid #feca57; display: flex; align-items: center; justify-content: center; font-size: 2.6rem; margin: 0 auto 10px; box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
            ${profile.avatar}
          </div>

          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px;">
            <input id="profile-nickname-input" type="text" value="${profile.nickname}" maxlength="20"
              style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; color: #fff; font-size: 1.15rem; font-weight: 800; text-align: center; padding: 6px 12px; width: 170px; font-family: inherit;">
            <button id="btn-save-profile" class="arcade-btn" style="padding: 8px 14px; border-radius: 12px; font-size: 0.85rem; background: #2ecc71; color: #000;">
              حفظ ✔
            </button>
          </div>
          <span style="font-size: 0.75rem; color: #8395a7;">اضغط على الاسم لتعديله وحفظه فوراً في السحابة</span>
        </div>

        <!-- Avatar Selection -->
        <div style="background: #180f2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 22px; padding: 12px; margin-bottom: 14px;">
          <div style="font-size: 0.8rem; font-weight: 800; color: #feca57; margin-bottom: 8px; text-align: right;">
            اختر صورتك الرمزية (الأفاتار):
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">
            ${this.avatars.map(a => `
              <button class="avatar-option-btn" data-avatar="${a}" style="width: 42px; height: 42px; border-radius: 12px; border: ${profile.avatar === a ? '2px solid #feca57' : '1px solid rgba(255,255,255,0.1)'}; background: ${profile.avatar === a ? 'rgba(254, 202, 87, 0.25)' : 'rgba(255,255,255,0.06)'}; font-size: 1.4rem; cursor: pointer; transition: 0.1s;">
                ${a}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Player Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px;">
          <div style="background: rgba(255, 71, 87, 0.12); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 20px; padding: 12px; text-align: center;">
            <div style="font-size: 0.75rem; color: #ff6b81; font-weight: 700;">المباريات الملعوبة</div>
            <div class="digital-num" style="font-size: 1.6rem; color: #fff; font-weight: 900; margin-top: 4px;">${profile.totalGames}</div>
          </div>

          <div style="background: rgba(46, 204, 113, 0.12); border: 1px solid rgba(46, 204, 113, 0.3); border-radius: 20px; padding: 12px; text-align: center;">
            <div style="font-size: 0.75rem; color: #2ecc71; font-weight: 700;">الانتصارات</div>
            <div class="digital-num" style="font-size: 1.6rem; color: #fff; font-weight: 900; margin-top: 4px;">${profile.wins}</div>
          </div>

          <div style="background: rgba(0, 210, 211, 0.12); border: 1px solid rgba(0, 210, 211, 0.3); border-radius: 20px; padding: 12px; text-align: center;">
            <div style="font-size: 0.75rem; color: #00d2d3; font-weight: 700;">نسبة الفوز</div>
            <div class="digital-num" style="font-size: 1.6rem; color: #fff; font-weight: 900; margin-top: 4px;">${profile.winRate}%</div>
          </div>

          <div style="background: rgba(254, 202, 87, 0.12); border: 1px solid rgba(254, 202, 87, 0.3); border-radius: 20px; padding: 12px; text-align: center;">
            <div style="font-size: 0.75rem; color: #feca57; font-weight: 700;">أفضل رقم قياسي</div>
            <div class="digital-num" style="font-size: 1.4rem; color: #fff; font-weight: 900; margin-top: 4px;">
              ${profile.bestTimeDuelDiff !== null ? `${profile.bestTimeDuelDiff.toFixed(3)} ث` : '---'}
            </div>
          </div>
        </div>

        <!-- Google Link Option -->
        <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 12px 16px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
          <div style="text-align: right;">
            <div style="font-size: 0.85rem; font-weight: 800; color: #eee;">ربط الحساب بـ Google</div>
            <div style="font-size: 0.7rem; color: #888;">لحفظ نقاطك ومنافستك من أي جهاز</div>
          </div>
          <button id="btn-google-login" class="arcade-btn" style="padding: 7px 14px; border-radius: 12px; font-size: 0.8rem; background: #ffffff; color: #000; box-shadow: 0 3px 0 #bbb;">
            <span>🌐 Google</span>
          </button>
        </div>

        <!-- Global Leaderboard (Live from Supabase) -->
        <div style="background: #180f2e; border: 1px solid rgba(254, 202, 87, 0.3); border-radius: 24px; padding: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 1.3rem;">🏆</span>
              <span style="font-size: 1rem; font-weight: 900; color: #feca57;">لوحة الشرف العالمية</span>
            </div>
            <button id="btn-refresh-leaderboard" class="arcade-btn" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 10px; background: rgba(254, 202, 87, 0.15); color: #feca57;">
              تحديث 🔄
            </button>
          </div>

          <div id="leaderboard-list-container">
            <div style="text-align: center; padding: 16px; color: #888; font-size: 0.85rem;">
              جاري تحميل قائمة الأبطال من السحابة...
            </div>
          </div>
        </div>

      </div>
    `;

    this.attachEvents();
    this.loadLeaderboard();
  }

  attachEvents() {
    // Save Nickname
    const saveBtn = document.getElementById('btn-save-profile');
    const input = document.getElementById('profile-nickname-input');
    if (saveBtn && input) {
      saveBtn.onclick = async () => {
        sound.tap();
        await profileService.updateProfile({ nickname: input.value });
        saveBtn.innerText = 'تم ✔';
        setTimeout(() => { if (saveBtn) saveBtn.innerText = 'حفظ ✔'; }, 1500);
      };
    }

    // Avatar Selection Buttons
    this.container.querySelectorAll('.avatar-option-btn').forEach(btn => {
      btn.onclick = async () => {
        sound.tap();
        const avatar = btn.getAttribute('data-avatar');
        await profileService.updateProfile({ avatar });
        this.render();
      };
    });

    // Google Sign-In
    const googleBtn = document.getElementById('btn-google-login');
    if (googleBtn) {
      googleBtn.onclick = () => {
        sound.tap();
        profileService.signInWithGoogle();
      };
    }

    // Refresh Leaderboard
    const refreshBtn = document.getElementById('btn-refresh-leaderboard');
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        sound.tap();
        this.loadLeaderboard();
      };
    }
  }

  async loadLeaderboard() {
    const listEl = document.getElementById('leaderboard-list-container');
    if (!listEl) return;

    listEl.innerHTML = `
      <div style="text-align: center; padding: 14px; color: #a4b0be; font-size: 0.85rem;">
        ⏳ جاري جلب لوحة الشرف...
      </div>
    `;

    const players = await LeaderboardService.getTopPlayers(15);

    if (!players || players.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 18px 10px; color: #8395a7; font-size: 0.85rem;">
          <div style="font-size: 2rem; margin-bottom: 4px;">🎯</div>
          كن أول من يسجل رقماً قياسياً في لوحة الشرف العالمية! العب الآن في لعبة الفارق الزمني لتتصدر القائمة.
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${players.map((p, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
          const isCurrentUser = profileService.userId && p.id === profileService.userId;
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 14px; background: ${isCurrentUser ? 'rgba(254, 202, 87, 0.2)' : 'rgba(255, 255, 255, 0.04)'}; border: 1px solid ${isCurrentUser ? '#feca57' : 'rgba(255, 255, 255, 0.08)'};">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 900; font-size: 1.1rem; width: 28px; text-align: center;">${medal}</span>
                <span style="font-size: 1.3rem;">${p.avatar || '👤'}</span>
                <div>
                  <div style="font-size: 0.9rem; font-weight: 800; color: ${isCurrentUser ? '#feca57' : '#fff'};">
                    ${p.nickname || 'بطل التحدي'} ${isCurrentUser ? ' (أنت)' : ''}
                  </div>
                  <div style="font-size: 0.7rem; color: #888;">الانتصارات: ${p.wins || 0}</div>
                </div>
              </div>

              <div class="digital-num" style="font-size: 1rem; color: #2ecc71; font-weight: 900;">
                ${p.best_diff !== null ? `${parseFloat(p.best_diff).toFixed(3)} ث` : '---'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}
