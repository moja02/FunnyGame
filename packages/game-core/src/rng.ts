import type { Rng } from './types.js';

/**
 * Deterministic 32-bit PRNG (Mulberry32)
 * Ensures identical question sequences across client and server when initialized with the same seed.
 */
export class DeterministicRng implements Rng {
  private state: number;

  constructor(seed: number) {
    // Normalize to 32-bit unsigned integer
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 0x6d2b79f5;
    }
  }

  /**
   * Generates next float in range [0, 1)
   */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates an integer in range [min, max] inclusive
   */
  nextInt(min: number, max: number): number {
    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }
    const range = max - min + 1;
    return min + Math.floor(this.next() * range);
  }

  /**
   * Picks a random element from a non-empty array
   */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('DeterministicRng.pick cannot pick from an empty array');
    }
    const idx = this.nextInt(0, items.length - 1);
    const item = items[idx];
    if (item === undefined) {
      throw new Error(`DeterministicRng.pick index ${idx} out of range`);
    }
    return item;
  }

  /**
   * Shuffles an array in place (Fisher-Yates) and returns it
   */
  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const temp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = temp;
    }
    return copy;
  }

  /**
   * Forks a deterministic child generator branching off current state
   */
  fork(): Rng {
    const childSeed = this.nextInt(1, 2147483647);
    return new DeterministicRng(childSeed);
  }
}

/**
 * Factory helper
 */
export function createRng(seed: number): Rng {
  return new DeterministicRng(seed);
}
