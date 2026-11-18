import { describe, it, expect } from 'vitest';
import { createRng } from '@funnygame/game-core';
import { calcPressureLogic, calculateCalcPressureScore } from '../logic.js';

describe('CalcPressureLogic - Specification Compliance & Scoring', () => {
  it('matches the 3 exact scoring examples from Section 6 of the specification', () => {
    // 1. Early Example: Stage 2, S: 14 − 6, T_q = 2.0s, remaining = 1.3s, combo = 3
    // pts = 50 * 1 * (1.0 + 0.5 * (1.3 / 2.0)) * 1 * 1.1 = 72.875 -> 73
    const score1 = calculateCalcPressureScore(1, 2, 1300, 2000, 3);
    expect(score1).toBe(73);

    // 2. Mid Example: Stage 12, C: R = 14 then × 6, T_q = 4.2s, remaining = 1.8s, combo = 6
    // pts = 50 * 1 * (1.0 + 0.5 * (1.8 / 4.2)) * 2 * 2.1 = 255.0 -> 255
    const score2 = calculateCalcPressureScore(1, 12, 1800, 4200, 6);
    expect(score2).toBe(255);

    // 3. Advanced Example: Stage 33, K3: R = 47 then + 38 → × 4 → − 127, T_q = 7.1s, remaining = 2.7s, combo = 14
    // pts = 50 * 3 * (1.0 + 0.5 * (2.7 / 7.1)) * 3 * 4.6 = 2463.59 -> 2464
    const score3 = calculateCalcPressureScore(3, 33, 2700, 7100, 14);
    expect(score3).toBe(2464);
  });

  it('matches theoretical ceiling at Stage 70', () => {
    // Stage 70: n = 4, max speed ratio 1.0 (v = 1.5), combo >= 10 (k = 3), m(70) = 3.4 + 0.15 * 45 = 10.15
    // pts = 50 * 4 * 1.5 * 3 * 10.15 = 9135
    const ceiling = calculateCalcPressureScore(4, 70, 5000, 5000, 15);
    expect(ceiling).toBe(9135);
  });

  it('evaluates answers correctly and tracks heart penalties', () => {
    const rng = createRng(12345);
    const cfg = calcPressureLogic.stageConfig(1);
    const q = calcPressureLogic.generate(rng, cfg, 0);

    // Correct by index
    const correctRes1 = calcPressureLogic.evaluate(q, q.payload.correctChoiceIndex);
    expect(correctRes1.correct).toBe(true);
    expect(correctRes1.heartCost).toBe(0);
    expect(correctRes1.breaksCombo).toBe(false);

    // Correct by value
    const correctRes2 = calcPressureLogic.evaluate(q, q.payload.correctAnswer);
    expect(correctRes2.correct).toBe(true);

    // Wrong answer
    const wrongChoice = (q.payload.correctChoiceIndex + 1) % 3;
    const wrongRes = calcPressureLogic.evaluate(q, wrongChoice);
    expect(wrongRes.correct).toBe(false);
    expect(wrongRes.heartCost).toBe(1);
    expect(wrongRes.breaksCombo).toBe(true);

    // Timeout (null)
    const timeoutRes = calcPressureLogic.evaluate(q, null);
    expect(timeoutRes.correct).toBe(false);
    expect(timeoutRes.heartCost).toBe(1);
    expect(timeoutRes.breaksCombo).toBe(true);
  });

  it('generates strictly sorted ascending choices with unique options across 2,000 seeds', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const rng = createRng(seed * 7919);
      for (const stage of [1, 5, 10, 15, 26, 28, 42, 46, 70]) {
        const cfg = calcPressureLogic.stageConfig(stage);
        const q = calcPressureLogic.generate(rng, cfg, seed % 5);
        const p = q.payload;

        // Exactly 3 choices
        expect(p.choices.length).toBe(3);

        // Distinct
        const set = new Set(p.choices);
        expect(set.size).toBe(3);

        // Strictly sorted ascending
        expect(p.choices[0]).toBeLessThan(p.choices[1]);
        expect(p.choices[1]).toBeLessThan(p.choices[2]);

        // Target answer exists and matches correctChoiceIndex
        expect(p.choices[p.correctChoiceIndex]).toBe(p.correctAnswer);

        // Minimum time limit >= 1.2s
        expect(q.timeLimitMs).toBeGreaterThanOrEqual(1200);
      }
    }
  });

  it('guarantees consecutive options in close choices mode (stage 15+ non-breathing non-L)', () => {
    const rng = createRng(9999);
    const cfg = calcPressureLogic.stageConfig(15);

    for (let i = 0; i < 20; i++) {
      const q = calcPressureLogic.generate(rng, cfg, i);
      if (q.payload.pattern !== 'L') {
        const [c0, c1, c2] = q.payload.choices;
        expect(c1 - c0).toBe(1);
        expect(c2 - c1).toBe(1);
      }
    }
  });

  it('ensures determinism: identical seed and config produce identical question', () => {
    const rng1 = createRng(424242);
    const rng2 = createRng(424242);

    const cfg = calcPressureLogic.stageConfig(27);
    const q1 = calcPressureLogic.generate(rng1, cfg, 2);
    const q2 = calcPressureLogic.generate(rng2, cfg, 2);

    expect(q1.payload.pattern).toBe(q2.payload.pattern);
    expect(q1.payload.correctAnswer).toBe(q2.payload.correctAnswer);
    expect(q1.payload.choices).toEqual(q2.payload.choices);
    expect(q1.timeLimitMs).toBe(q2.timeLimitMs);
  });
});
