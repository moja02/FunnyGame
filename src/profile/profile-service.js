import { PlayerProfile } from './profile-model.js';
import { StorageService } from '../core/storage.js';
import { getSupabase } from '../core/supabase.js';
import { LeaderboardService } from '../services/leaderboard-service.js';

/**
 * ProfileService - Manages local profile state and real-time Supabase Auth & Cloud Sync
 */
export class ProfileService {
  constructor() {
    this.currentProfile = null;
    this.userId = null;
    this.isCloudSynced = false;
    this.init();
  }

  async init() {
    // 1. Load Local Profile first for instant offline readiness
    const saved = StorageService.get('player_profile', null);
    if (saved) {
      this.currentProfile = new PlayerProfile(saved);
    } else {
      this.currentProfile = new PlayerProfile();
      this.saveLocal();
    }

    // 2. Initialize Supabase Auth in the background
    await this.initSupabaseAuth();
  }

  async initSupabaseAuth() {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // Check existing session
      const { data: { session } } = await supabase.auth.getSession();

      if (session && session.user) {
        this.userId = session.user.id;
        this.currentProfile.id = this.userId;
        await this.fetchCloudProfile();
      } else {
        // Sign in anonymously for seamless guest tracking
        const { data: authData, error: authErr } = await supabase.auth.signInAnonymously();
        if (!authErr && authData.user) {
          this.userId = authData.user.id;
          this.currentProfile.id = this.userId;
          await this.syncToCloud();
        }
      }

      // Listen for auth state changes (e.g. user logs in with Google)
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession && newSession.user) {
          this.userId = newSession.user.id;
          this.currentProfile.id = this.userId;
          await this.fetchCloudProfile();
        }
      });
    } catch (e) {
      console.warn('Supabase auth background init:', e);
    }
  }

  async fetchCloudProfile() {
    const supabase = getSupabase();
    if (!supabase || !this.userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.userId)
        .maybeSingle();

      if (data) {
        if (data.nickname) this.currentProfile.nickname = data.nickname;
        if (data.avatar) this.currentProfile.avatar = data.avatar;
        if (data.total_games > this.currentProfile.totalGames) this.currentProfile.totalGames = data.total_games;
        if (data.wins > this.currentProfile.wins) this.currentProfile.wins = data.wins;
        if (data.best_diff !== null) {
          if (this.currentProfile.bestTimeDuelDiff === null || data.best_diff < this.currentProfile.bestTimeDuelDiff) {
            this.currentProfile.bestTimeDuelDiff = parseFloat(data.best_diff);
          }
        }
        this.isCloudSynced = true;
        this.saveLocal();
      } else {
        // First time in cloud: push our local profile
        await this.syncToCloud();
      }
    } catch (e) {
      console.error('Error fetching cloud profile:', e);
    }
  }

  getProfile() {
    return this.currentProfile;
  }

  async updateProfile({ nickname, avatar }) {
    if (nickname !== undefined) this.currentProfile.nickname = nickname.trim() || 'لاعب مميز';
    if (avatar !== undefined) this.currentProfile.avatar = avatar;
    this.saveLocal();
    await this.syncToCloud();
    return this.currentProfile;
  }

  async recordMatch({ gameId, won = false, diff = null, target = 5.0, stopped = 5.0 }) {
    this.currentProfile.totalGames += 1;
    if (won) this.currentProfile.wins += 1;

    let isNewBest = false;
    if (diff !== null) {
      if (this.currentProfile.bestTimeDuelDiff === null || diff < this.currentProfile.bestTimeDuelDiff) {
        this.currentProfile.bestTimeDuelDiff = diff;
        isNewBest = true;
      }
    }

    this.saveLocal();

    // Async sync to Supabase
    if (this.userId) {
      LeaderboardService.submitTimeDuelScore({
        playerId: this.userId,
        targetTime: target,
        stoppedTime: stopped,
        diffSeconds: diff,
        gameMode: 'pvp'
      }).catch(() => {});

      this.syncToCloud().catch(() => {});
    }

    return this.currentProfile;
  }

  saveLocal() {
    StorageService.set('player_profile', this.currentProfile.toJSON());
  }

  async syncToCloud() {
    const supabase = getSupabase();
    if (!supabase || !this.userId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: this.userId,
          nickname: this.currentProfile.nickname,
          avatar: this.currentProfile.avatar,
          total_games: this.currentProfile.totalGames,
          wins: this.currentProfile.wins,
          best_diff: this.currentProfile.bestTimeDuelDiff,
          updated_at: new Date().toISOString()
        });

      if (!error) {
        this.isCloudSynced = true;
      }
    } catch (e) {
      console.warn('Sync to Supabase cloud warning:', e);
    }
  }

  async signInWithGoogle() {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
    } catch (e) {
      console.error('Google Sign In error:', e);
    }
  }
}

export const profileService = new ProfileService();
