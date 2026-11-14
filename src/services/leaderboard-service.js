import { getSupabase } from '../core/supabase.js';

/**
 * LeaderboardService - Fetches real-time rankings from Supabase PostgreSQL View
 */
export class LeaderboardService {
  static async getTopPlayers(limit = 50) {
    const supabase = getSupabase();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('leaderboard_top')
        .select('*')
        .limit(limit);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Leaderboard fetch exception:', e);
      return [];
    }
  }

  static async submitTimeDuelScore({ playerId, targetTime, stoppedTime, diffSeconds, gameMode = 'pvp' }) {
    const supabase = getSupabase();
    if (!supabase || !playerId) return null;

    try {
      const { data, error } = await supabase
        .from('time_duel_scores')
        .insert({
          player_id: playerId,
          target_time: parseFloat(targetTime.toFixed(2)),
          stopped_time: parseFloat(stoppedTime.toFixed(3)),
          diff_seconds: parseFloat(diffSeconds.toFixed(3)),
          game_mode: gameMode
        });

      if (error) {
        console.error('Error submitting score to Supabase:', error);
      }
      return data;
    } catch (e) {
      console.error('Score submission exception:', e);
      return null;
    }
  }
}
