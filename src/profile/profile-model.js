/**
 * Player Profile Data Model
 */
export class PlayerProfile {
  constructor({
    id = null,
    nickname = 'بطل التحدي',
    avatar = '⚡',
    totalGames = 0,
    wins = 0,
    bestTimeDuelDiff = null,
    createdAt = Date.now()
  } = {}) {
    this.id = id || `user_${Math.random().toString(36).substring(2, 9)}`;
    this.nickname = nickname;
    this.avatar = avatar;
    this.totalGames = totalGames;
    this.wins = wins;
    this.bestTimeDuelDiff = bestTimeDuelDiff;
    this.createdAt = createdAt;
  }

  get winRate() {
    if (this.totalGames === 0) return 0;
    return Math.round((this.wins / this.totalGames) * 100);
  }

  toJSON() {
    return {
      id: this.id,
      nickname: this.nickname,
      avatar: this.avatar,
      totalGames: this.totalGames,
      wins: this.wins,
      bestTimeDuelDiff: this.bestTimeDuelDiff,
      createdAt: this.createdAt
    };
  }
}
