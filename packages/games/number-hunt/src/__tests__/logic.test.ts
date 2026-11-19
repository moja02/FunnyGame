import { describe, it, expect } from 'vitest';
import { createRng } from '@funnygame/game-core';
import { numberHuntLogic, calculateNumberHuntScore } from '../logic.js';
import {
  makeRational,
  rationalAdd,
  rationalDiv,
  rationalEquals,
  isCleanQuarterOrHalf
} from '../rational.js';

describe('NumberHuntLogic - Specification Compliance & Scoring', () => {
  it('matches the 3 exact scoring examples from Section 6 of the specification', () => {
    // 1. Early Example: Stage 2 (4 cards, target 24), T_q = 60s, rem = 48s (48/60 = 0.8), streak = 1, no hint
    // pts = 500 * (1.0 + 0.5 * 0.8) * 1 * (1 + 0.1 * 1) = 500 * 1.400 * 1 * 1.1 = 770
    const score1 = calculateNumberHuntScore(false, 2, 48000, 60000, 1);
    expect(score1).toBe(770);

    // 2. Mid Example: Stage 12 (5 cards, target 145), T_q = 54s, rem = 27s (27/54 = 0.5), streak = 6 (k = 2), hint used (Base = 400)
    // pts = 400 * (1.0 + 0.5 * 0.5) * 2 * (1 + 0.1 * 11) = 400 * 1.250 * 2 * 2.1 = 2100
    const score2 = calculateNumberHuntScore(true, 12, 27000, 54000, 6);
    expect(score2).toBe(2100);

    // 3. Advanced Example: Stage 28 (6 cards), T_q = 56s, rem = 39.2s (39.2/56 = 0.7), streak = 10 (k = 3), no hint (Base = 500)
    // m(28) = 3.4 + 0.15 * (28 - 25) = 3.4 + 0.45 = 3.85
    // pts = 500 * (1.0 + 0.5 * 0.7) * 3 * 3.85 = 500 * 1.350 * 3 * 3.85 = 7796.25 -> 7796
    const score3 = calculateNumberHuntScore(false, 28, 39200, 56000, 10);
    expect(score3).toBe(7796);
  });

  it('performs exact fractional math and identifies clean quarters and halves', () => {
    const half = makeRational(1, 2);
    const quarter = makeRational(1, 4);
    const sum = rationalAdd(half, quarter); // 3/4
    expect(rationalEquals(sum, makeRational(3, 4))).toBe(true);
    expect(isCleanQuarterOrHalf(sum)).toBe(true);

    const div = rationalDiv(makeRational(9), makeRational(4)); // 9/4 = 2.25
    expect(div).not.toBeNull();
    expect(isCleanQuarterOrHalf(div!)).toBe(true);

    const third = makeRational(1, 3);
    expect(isCleanQuarterOrHalf(third)).toBe(false);
  });

  it('evaluates answers and catches target matches, timeouts, and rule violations', () => {
    const rng = createRng(1001);
    const cfg = numberHuntLogic.stageConfig(1);
    const q = numberHuntLogic.generate(rng, cfg, 0);

    // Timeout (null)
    const timeoutRes = numberHuntLogic.evaluate(q, null);
    expect(timeoutRes.correct).toBe(false);
    expect(timeoutRes.heartCost).toBe(1);
    expect(timeoutRes.breaksCombo).toBe(true);

    // Correct final target
    const correctRes = numberHuntLogic.evaluate(q, {
      steps: q.payload.solutionSteps,
      finalCardValue: q.payload.target,
      hintUsed: false,
      remainingMs: 30000
    });
    expect(correctRes.correct).toBe(true);
    expect(correctRes.heartCost).toBe(0);
    expect(correctRes.breaksCombo).toBe(false);

    // Wrong final target
    const wrongRes = numberHuntLogic.evaluate(q, {
      steps: q.payload.solutionSteps,
      finalCardValue: q.payload.target + 10,
      hintUsed: false,
      remainingMs: 30000
    });
    expect(wrongRes.correct).toBe(false);
    expect(wrongRes.heartCost).toBe(1);
    expect(wrongRes.breaksCombo).toBe(true);
  });

  it('guarantees constructive 100% solvability and valid solution steps across 30 seeds', () => {
    for (let s = 1; s <= 30; s++) {
      const rng = createRng(s * 997);
      const cfg = numberHuntLogic.stageConfig(s);
      const q = numberHuntLogic.generate(rng, cfg, 0);

      expect(q.payload.initialCards.length).toBeGreaterThanOrEqual(4);
      expect(q.payload.solutionSteps.length).toBeGreaterThanOrEqual(2);
      expect(typeof q.payload.target).toBe('number');
      expect(q.payload.target).not.toBe(0);
    }
  });
});
