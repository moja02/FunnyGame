/**
 * TimeDuelBot - AI Simulator for single-player practice
 */
export class TimeDuelBot {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty; // 'easy' | 'medium' | 'hard'
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  calculateStop(targetTime) {
    let variance = 0.35; // Easy: +-0.35s
    if (this.difficulty === 'medium') variance = 0.16; // Medium: +-0.16s
    if (this.difficulty === 'hard') variance = 0.05;   // Hard: +-0.05s (Near-perfect instinct)

    const offset = (Math.random() * 2 - 1) * variance;
    const computedTime = Math.max(0.6, targetTime + offset);
    return computedTime;
  }
}
