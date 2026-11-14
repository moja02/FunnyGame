/**
 * Reference Scores for Early Stage Leaderboard & Mind Score Calibration
 * Used before the platform reaches 500 active weekly players.
 */

export interface ScoreDistribution {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p99: number;
}

export const referenceScoresByAbility: Record<string, ScoreDistribution> = {
  speed: {
    p10: 800,
    p25: 1800,
    p50: 3500,
    p75: 6000,
    p90: 9500,
    p99: 15000
  },
  math: {
    p10: 600,
    p25: 1500,
    p50: 3200,
    p75: 5500,
    p90: 8800,
    p99: 14000
  },
  memory: {
    p10: 500,
    p25: 1400,
    p50: 3000,
    p75: 5200,
    p90: 8500,
    p99: 13500
  },
  logic: {
    p10: 700,
    p25: 1600,
    p50: 3400,
    p75: 5800,
    p90: 9200,
    p99: 14500
  }
};

/**
 * Calculates estimated percentile [0 - 100] based on reference distribution
 */
export function getEstimatedPercentile(ability: string, score: number): number {
  const dist = referenceScoresByAbility[ability] ?? referenceScoresByAbility['speed']!;
  if (score <= 0) return 0;
  if (score < dist.p10) return Math.max(1, Math.round((score / dist.p10) * 10));
  if (score < dist.p25) return 10 + Math.round(((score - dist.p10) / (dist.p25 - dist.p10)) * 15);
  if (score < dist.p50) return 25 + Math.round(((score - dist.p25) / (dist.p50 - dist.p25)) * 25);
  if (score < dist.p75) return 50 + Math.round(((score - dist.p50) / (dist.p75 - dist.p50)) * 25);
  if (score < dist.p90) return 75 + Math.round(((score - dist.p75) / (dist.p90 - dist.p75)) * 15);
  if (score < dist.p99) return 90 + Math.round(((score - dist.p90) / (dist.p99 - dist.p90)) * 9);
  return 99;
}
