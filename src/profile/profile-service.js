import { PlayerProfile } from './profile-model.js';
import { StorageService } from '../core/storage.js';

/**
 * ProfileService - Manages local profile state and future Supabase sync
 */
export class ProfileService {
  constructor() {
    this.currentProfile = null;
    this.init();
  }

  init() {
    const saved = StorageService.get('player_profile', null);
    if (saved) {
      this.currentProfile = new PlayerProfile(saved);
    } else {
      this.currentProfile = new PlayerProfile();
      this.save();
    }
  }

  getProfile() {
    return this.currentProfile;
  }

  updateProfile({ nickname, avatar }) {
    if (nickname !== undefined) this.currentProfile.nickname = nickname.trim() || 'لاعب مميز';
    if (avatar !== undefined) this.currentProfile.avatar = avatar;
    this.save();
    return this.currentProfile;
  }

  recordMatch({ gameId, won = false, diff = null }) {
    this.currentProfile.totalGames += 1;
    if (won) this.currentProfile.wins += 1;

    if (diff !== null && (this.currentProfile.bestTimeDuelDiff === null || diff < this.currentProfile.bestTimeDuelDiff)) {
      this.currentProfile.bestTimeDuelDiff = diff;
    }

    this.save();
    // Future integration point: sync to Supabase remote database
    this.syncToCloud();
    return this.currentProfile;
  }

  save() {
    StorageService.set('player_profile', this.currentProfile.toJSON());
  }

  syncToCloud() {
    // Hook ready for Supabase sync:
    // supabase.from('players').upsert(this.currentProfile.toJSON());
  }
}

export const profileService = new ProfileService();
