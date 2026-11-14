import { profileService } from './profile-service.js';
import { sound } from '../core/sound.js';

/**
 * ProfileView - UI Controller for Player Personal Profile Only
 * Dedicated strictly to personal identity, avatar customization, personal stats, and account settings.
 */
export class ProfileView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.avatars = ['⚡', '👑', '🎯', '🦁', '🤖', '🐱', '🦊', '🚀', '🔥', '💎', '🌟', '🏆'];
  }

  render() {
    if (!this.container) return;
    const profile = profileService.getProfile();
    const isGoogleLinked = profileService.userId && !profileService.userId.startsWith('user_');
    const displayId = profile.id ? (profile.id.length > 12 ? profile.id.substring(0, 8) + '...' : profile.id) : 'guest';
    const joinedDate = new Date(profile.createdAt || Date.now()).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    this.container.innerHTML = `
      <div class="pop-in" style="padding: 16px; width: 100%; max-width: 420px; margin: 0 auto;">
        
        <!-- Section Header -->
        <div style="text-align: center; margin-bottom: 16px;">
          <h2 style="font-size: 1.4rem; font-weight: 900; color: #fff;">الملف الشخصي 👤</h2>
          <p style="font-size: 0.8rem; color: #a4b0be; margin-top: 2px;">بياناتك وإحصائياتك الشخصية فقط</p>
        </div>

        <!-- 1. Main Personal Identity Card -->
        <div style="background: linear-gradient(145deg, #2a154c 0%, #150b28 100%); border: 2px solid rgba(254, 202, 87, 0.4); border-radius: 28px; padding: 22px 18px; text-align: center; margin-bottom: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.6); position: relative;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span class="badge-pill" style="font-size: 0.7rem; background: rgba(254, 202, 87, 0.15); color: #feca57; border-color: rgba(254, 202, 87, 0.3);">
              انضم في: ${joinedDate}
            </span>
            <span class="badge-pill" style="font-size: 0.7rem; background: ${isGoogleLinked ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255, 255, 255, 0.08)'}; color: ${isGoogleLinked ? '#2ecc71' : '#a4b0be'}; border-color: ${isGoogleLinked ? 'rgba(46, 204, 113, 0.4)' : 'rgba(255, 255, 255, 0.12)'};">
              ${isGoogleLinked ? '🟢 حساب موثق' : '⚪ حساب ضيف'}
            </span>
          </div>

          <!-- Avatar Display -->
          <div id="profile-current-avatar" style="width: 82px; height: 82px; border-radius: 26px; background: rgba(254, 202, 87, 0.18); border: 3px solid #feca57; display: flex; align-items: center; justify-content: center; font-size: 3.2rem; margin: 0 auto 12px; box-shadow: 0 8px 25px rgba(254, 202, 87, 0.25);">
            ${profile.avatar}
          </div>

          <!-- Nickname Editor -->
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
            <input id="profile-nickname-input" type="text" value="${profile.nickname}" maxlength="18" placeholder="اسمك المستعار"
              style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.25); border-radius: 14px; color: #fff; font-size: 1.15rem; font-weight: 800; text-align: center; padding: 8px 12px; width: 175px; font-family: inherit; outline: none;">
            <button id="btn-save-profile" class="arcade-btn" style="padding: 8px 14px; border-radius: 14px; font-size: 0.85rem; background: linear-gradient(135deg, #2ecc71, #27ae60); color: #fff; font-weight: 900; box-shadow: 0 3px 0 #1e8449;">
              حفظ ✔
            </button>
          </div>

          <!-- User ID with Copy -->
          <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.25); padding: 4px 12px; border-radius: 999px; font-size: 0.72rem; color: #8395a7; margin-top: 4px;">
            <span>المعرف: <strong style="color: #c8d6e5;">#${displayId}</strong></span>
            <button id="btn-copy-id" style="background: none; border: none; color: #feca57; cursor: pointer; font-size: 0.75rem; padding: 0 2px;" title="نسخ المعرف">
              📋 نسخ
            </button>
          </div>
        </div>

        <!-- 2. Avatar Selection Palette -->
        <div style="background: #180f2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 14px; margin-bottom: 16px;">
          <div style="font-size: 0.82rem; font-weight: 800; color: #feca57; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
            <span>اختر صورتك الرمزية (الأفاتار):</span>
            <span style="font-size: 0.7rem; color: #8395a7;">(اضغط للتغيير المباشر)</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
            ${this.avatars.map(a => `
              <button class="avatar-option-btn" data-avatar="${a}" style="width: 44px; height: 44px; border-radius: 14px; border: ${profile.avatar === a ? '2px solid #feca57' : '1px solid rgba(255,255,255,0.08)'}; background: ${profile.avatar === a ? 'rgba(254, 202, 87, 0.28)' : 'rgba(255,255,255,0.05)'}; font-size: 1.5rem; cursor: pointer; transition: transform 0.1s; display: flex; align-items: center; justify-content: center;">
                ${a}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 3. Player Personal Statistics -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.85rem; font-weight: 800; color: #48dbfb; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            <span>📊</span>
            <span>إحصائياتك الشخصية</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <div style="background: rgba(255, 71, 87, 0.12); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 20px; padding: 14px 10px; text-align: center;">
              <div style="font-size: 0.75rem; color: #ff6b81; font-weight: 700;">المباريات الملعوبة</div>
              <div class="digital-num" style="font-size: 1.7rem; color: #fff; font-weight: 900; margin-top: 4px;">${profile.totalGames}</div>
            </div>

            <div style="background: rgba(46, 204, 113, 0.12); border: 1px solid rgba(46, 204, 113, 0.3); border-radius: 20px; padding: 14px 10px; text-align: center;">
              <div style="font-size: 0.75rem; color: #2ecc71; font-weight: 700;">مرات الفوز</div>
              <div class="digital-num" style="font-size: 1.7rem; color: #fff; font-weight: 900; margin-top: 4px;">${profile.wins}</div>
            </div>

            <div style="background: rgba(0, 210, 211, 0.12); border: 1px solid rgba(0, 210, 211, 0.3); border-radius: 20px; padding: 14px 10px; text-align: center;">
              <div style="font-size: 0.75rem; color: #00d2d3; font-weight: 700;">نسبة الفوز</div>
              <div class="digital-num" style="font-size: 1.7rem; color: #fff; font-weight: 900; margin-top: 4px;">${profile.winRate}%</div>
            </div>

            <div style="background: rgba(254, 202, 87, 0.12); border: 1px solid rgba(254, 202, 87, 0.3); border-radius: 20px; padding: 14px 10px; text-align: center;">
              <div style="font-size: 0.75rem; color: #feca57; font-weight: 700;">أفضل رقم قياسي</div>
              <div class="digital-num" style="font-size: 1.5rem; color: #fff; font-weight: 900; margin-top: 4px;">
                ${profile.bestTimeDuelDiff !== null ? `${profile.bestTimeDuelDiff.toFixed(3)} ث` : '---'}
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Account & Cloud Backup -->
        <div style="background: #180f2e; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="text-align: right;">
              <div style="font-size: 0.9rem; font-weight: 800; color: #fff;">حفظ الحساب في السحابة</div>
              <div style="font-size: 0.75rem; color: #8395a7; margin-top: 2px;">
                ${isGoogleLinked ? 'حسابك مربوط ومحمي بسحابة Supabase' : 'اربط حسابك بـ Google لتستعيد بياناتك من أي هاتف'}
              </div>
            </div>
            ${!isGoogleLinked ? `
              <button id="btn-google-login" class="arcade-btn" style="padding: 8px 14px; border-radius: 14px; font-size: 0.8rem; background: #ffffff; color: #000; font-weight: 800; box-shadow: 0 3px 0 #bbb; white-space: nowrap;">
                🌐 ربط Google
              </button>
            ` : `
              <span class="badge-pill" style="background: rgba(46, 204, 113, 0.2); color: #2ecc71; font-size: 0.75rem;">
                ✔ محفوظ
              </span>
            `}
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
      saveBtn.onclick = async () => {
        sound.tap();
        const newName = input.value.trim() || 'بطل التحدي';
        await profileService.updateProfile({ nickname: newName });
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

    // Copy Player ID
    const copyBtn = document.getElementById('btn-copy-id');
    if (copyBtn) {
      copyBtn.onclick = () => {
        sound.tap();
        const profile = profileService.getProfile();
        if (navigator.clipboard && profile.id) {
          navigator.clipboard.writeText(profile.id);
          copyBtn.innerText = '✔ تم النسخ';
          setTimeout(() => { if (copyBtn) copyBtn.innerText = '📋 نسخ'; }, 2000);
        }
      };
    }

    // Google Sign-In
    const googleBtn = document.getElementById('btn-google-login');
    if (googleBtn) {
      googleBtn.onclick = () => {
        sound.tap();
        profileService.signInWithGoogle();
      };
    }
  }
}
