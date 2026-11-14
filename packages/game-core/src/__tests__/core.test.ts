import { describe, it, expect } from 'vitest';
import {
  createRng,
  getStageMultiplier,
  getSpeedMultiplier,
  getComboMultiplier,
  calculateQuestionScore,
  getDailyStreakBonus,
  calculateMindScore,
  replayAndVerifyRun
} from '../index.js';
import type { GameLogic, StageConfig, Question, Verdict, Rng } from '../index.js';

describe('DeterministicRng', () => {
  it('produces identical sequences given identical seeds', () => {
    const rng1 = createRng(12345);
    const rng2 = createRng(12345);

    const seq1 = [rng1.next(), rng1.next(), rng1.nextInt(1, 100)];
    const seq2 = [rng2.next(), rng2.next(), rng2.nextInt(1, 100)];

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences given different seeds', () => {
    const rng1 = createRng(100);
    const rng2 = createRng(200);

    expect(rng1.next()).not.toEqual(rng2.next());
  });

  it('nextInt adheres strictly to bounds inclusive', () => {
    const rng = createRng(999);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextInt(5, 15);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(15);
    }
  });

  it('shuffle preserves all elements deterministically', () => {
    const rng = createRng(42);
    const array = [1, 2, 3, 4, 5, 6, 7];
    const shuffled = rng.shuffle(array);

    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('Scoring Engine', () => {
  it('calculates stage multiplier accurately according to specification', () => {
    // stage <= 25: 1 + 0.10 * (s - 1)
    expect(getStageMultiplier(1)).toBe(1);
    expect(getStageMultiplier(2)).toBeCloseTo(1.1);
    expect(getStageMultiplier(25)).toBeCloseTo(3.4);

    // stage > 25: 3.4 + 0.15 * (s - 25)
    expect(getStageMultiplier(26)).toBeCloseTo(3.55);
    expect(getStageMultiplier(30)).toBeCloseTo(4.15);
  });

  it('calculates speed multiplier with clamping', () => {
    // 100% time remaining -> ratio 1 -> 1.5x
    expect(getSpeedMultiplier(1000, 1000)).toBeCloseTo(1.5);
    // 50% time remaining -> ratio 0.5 -> 1.25x
    expect(getSpeedMultiplier(500, 1000)).toBeCloseTo(1.25);
    // 0% time remaining -> ratio 0 -> 1.0x
    expect(getSpeedMultiplier(0, 1000)).toBe(1.0);
    // Out of bounds time remaining is clamped
    expect(getSpeedMultiplier(2000, 1000)).toBeCloseTo(1.5);
    expect(getSpeedMultiplier(-500, 1000)).toBe(1.0);
  });

  it('calculates combo multiplier tiers', () => {
    expect(getComboMultiplier(0)).toBe(1);
    expect(getComboMultiplier(4)).toBe(1);
    expect(getComboMultiplier(5)).toBe(2);
    expect(getComboMultiplier(9)).toBe(2);
    expect(getComboMultiplier(10)).toBe(3);
    expect(getComboMultiplier(20)).toBe(3);
  });

  it('calculates question score correctly as integer', () => {
    // base 100, stage 1 (1.0), remaining 1000/1000 (1.5), combo 10 (3.0)
    // 100 * 1.0 * 1.5 * 3.0 = 450
    const score = calculateQuestionScore(100, 1, 1000, 1000, 10);
    expect(score).toBe(450);
  });

  it('caps daily streak bonus at 50%', () => {
    expect(getDailyStreakBonus(0)).toBe(0);
    expect(getDailyStreakBonus(5)).toBeCloseTo(0.25);
    expect(getDailyStreakBonus(10)).toBeCloseTo(0.50);
    expect(getDailyStreakBonus(20)).toBe(0.50);
  });

  it('calculates Mind Score in 0-1000 range', () => {
    const perfect = calculateMindScore({ speed: 100, math: 100, memory: 100, logic: 100 });
    expect(perfect).toBe(1000);

    const average = calculateMindScore({ speed: 50, math: 50, memory: 50, logic: 50 });
    expect(average).toBe(500);

    const zero = calculateMindScore({ speed: 0, math: 0, memory: 0, logic: 0 });
    expect(zero).toBe(0);
  });
});

describe('Round Engine & Anti-Cheat', () => {
  // Mock game implementation for replay testing
  const mockGame: GameLogic<number, number> = {
    id: 'mock-tap',
    ability: 'speed',
    basePoints: 100,
    questionsPerStage: 5,
    stageConfig: (s: number): StageConfig => ({
      stage: s,
      tier: 'warmup',
      timeLimitMs: 2000,
      isBoss: s % 5 === 0,
      params: {}
    }),
    generate: (rng: Rng, cfg: StageConfig, idx: number): Question<number> => ({
      index: idx,
      stage: cfg.stage,
      timeLimitMs: cfg.timeLimitMs,
      payload: rng.nextInt(1, 10)
    }),
    evaluate: (q: Question<number>, a: number | null): Verdict => ({
      correct: a === q.payload,
      heartCost: 1,
      breaksCombo: a !== q.payload
    })
  };

  it('replays a valid run accurately with deterministic scoring', () => {
    const seed = 777;
    const rng = createRng(seed);

    // Generate expected answers
    const answers = [
      { questionIndex: 0, stage: 1, answer: rng.nextInt(1, 10), reactionTimeMs: 400, clientTimestamp: 1000 },
      { questionIndex: 1, stage: 1, answer: rng.nextInt(1, 10), reactionTimeMs: 450, clientTimestamp: 2000 },
      { questionIndex: 2, stage: 1, answer: rng.nextInt(1, 10), reactionTimeMs: 500, clientTimestamp: 3000 }
    ];

    const result = replayAndVerifyRun(mockGame, {
      runId: 'run-1',
      gameId: 'mock-tap',
      seed,
      answers,
      startedAt: 10000,
      submittedAt: 15000
    });

    expect(result.isValid).toBe(true);
    expect(result.isSuspicious).toBe(false);
    expect(result.correctAnswersCount).toBe(3);
    expect(result.score).toBeGreaterThan(0);
  });

  it('rejects runs that exceed 30 minutes', () => {
    const result = replayAndVerifyRun(mockGame, {
      runId: 'run-timeout',
      gameId: 'mock-tap',
      seed: 123,
      answers: [],
      startedAt: 1000,
      submittedAt: 1000 + 31 * 60 * 1000 // 31 minutes
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('exceeded 30 minutes');
  });

  it('flags superhuman reaction speeds (<150ms)', () => {
    const answers = [
      { questionIndex: 0, stage: 1, answer: 1, reactionTimeMs: 50, clientTimestamp: 100 },
      { questionIndex: 1, stage: 1, answer: 1, reactionTimeMs: 60, clientTimestamp: 200 },
      { questionIndex: 2, stage: 1, answer: 1, reactionTimeMs: 70, clientTimestamp: 300 }
    ];

    const result = replayAndVerifyRun(mockGame, {
      runId: 'run-bot',
      gameId: 'mock-tap',
      seed: 456,
      answers,
      startedAt: 10000,
      submittedAt: 15000
    });

    expect(result.isSuspicious).toBe(true);
    expect(result.isValid).toBe(false);
  });
});
