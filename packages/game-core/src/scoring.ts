/**
 * Central Scoring Engine for FunnyGame
 * All scoring constants, stage multipliers, and Mind Score calculations live exclusively here.
 */

/**
 * Stage Multiplier:
 * stageMult(s) = s <= 25 ? 1 + 0.10 * (s - 1) : 3.4 + 0.15 * (s - 25)
 */
export function getStageMultiplier(stage: number): number {
  const s = Math.max(1, stage);
  if (s <= 25) {
    return 1 + 0.10 * (s - 1);
  }
  return 3.4 + 0.15 * (s - 25);
}

/**
 * Speed Multiplier:
 * speedMult(r) = 1 + 0.5 * clamp(r, 0, 1)
 * where r = remainingTimeMs / totalTimeLimitMs
 */
export function getSpeedMultiplier(remainingMs: number, timeLimitMs: number): number {
  if (timeLimitMs <= 0) return 1;
  const ratio = Math.max(0, Math.min(1, remainingMs / timeLimitMs));
  return 1 + 0.5 * ratio;
}

/**
 * Combo Multiplier:
 * comboMult(k) = k >= 10 ? 3 : k >= 5 ? 2 : 1
 * where k = consecutive correct answers including current
 */
export function getComboMultiplier(combo: number): number {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}

/**
 * Single Question Score:
 * questionScore = round(basePoints * stageMult * speedMult * comboMult)
 */
export function calculateQuestionScore(
  basePoints: number,
  stage: number,
  remainingMs: number,
  timeLimitMs: number,
  currentCombo: number
): number {
  const stageMult = getStageMultiplier(stage);
  const speedMult = getSpeedMultiplier(remainingMs, timeLimitMs);
  const comboMult = getComboMultiplier(currentCombo);

  return Math.round(basePoints * stageMult * speedMult * comboMult);
}

/**
 * Daily Challenge Streak Bonus:
 * +5% per consecutive day, capped at 50% max.
 */
export function getDailyStreakBonus(streakDays: number): number {
  const streak = Math.max(0, streakDays);
  return Math.min(0.50, streak * 0.05);
}

/**
 * Applies streak bonus to raw daily score
 */
export function applyDailyStreakBonus(rawScore: number, streakDays: number): number {
  const bonusRate = getDailyStreakBonus(streakDays);
  return Math.round(rawScore * (1 + bonusRate));
}

/**
 * Mind Score (درجة العقل من 1000):
 * - Each ability score is average percentile rank of its games.
 * - Overall Mind Score = average of 4 abilities * 10 (range 0 to 1000).
 */
export function calculateMindScore(abilityPercentiles: {
  speed: number;
  math: number;
  memory: number;
  logic: number;
}): number {
  const s = Math.max(0, Math.min(100, abilityPercentiles.speed));
  const m = Math.max(0, Math.min(100, abilityPercentiles.math));
  const mem = Math.max(0, Math.min(100, abilityPercentiles.memory));
  const l = Math.max(0, Math.min(100, abilityPercentiles.logic));

  const averagePercentile = (s + m + mem + l) / 4;
  return Math.round(averagePercentile * 10);
}
