import { describe, it, expect } from 'vitest';
import { createRng } from '@funnygame/game-core';
import { mathBridgeLogic, calculateMathBridgeScore } from '../logic.js';
import { evaluateExpression } from '../math-engine.js';

describe('MathBridgeLogic - Specification Compliance & Scoring', () => {
  it('matches the 3 exact scoring examples from Section 6 of the specification', () => {
    // 1. Early Example: Stage 3 (single op), T_q = 7.6s, rem = 5.7s, streak = 2
    // pts = 150 * (1.0 + 0.5 * (5.7 / 7.6)) * 1 * 1.2 = 150 * 1.375 * 1 * 1.2 = 247.5 -> 248
    const score1 = calculateMathBridgeScore(150, 3, 5700, 7600, 2);
    expect(score1).toBe(248);

    // 2. Mid Example: Stage 14 (double op + parentheses), T_q = 5.4s, rem = 2.7s, streak = 7
    // pts = 225 * (1.0 + 0.5 * (2.7 / 5.4)) * 2 * 2.3 = 225 * 1.25 * 2 * 2.3 = 1293.75 -> 1294
    const score2 = calculateMathBridgeScore(225, 14, 2700, 5400, 7);
    expect(score2).toBe(1294);

    // 3. Advanced Example: Stage 32 (3 slots + roots), T_q = 4.2s, rem = 2.94s, streak = 12
    // pts = 225 * (1.0 + 0.5 * (2.94 / 4.2)) * 3 * 4.45 = 225 * 1.35 * 3 * 4.45 = 4055.06 -> 4055
    const score3 = calculateMathBridgeScore(225, 32, 2940, 4200, 12);
    expect(score3).toBe(4055);
  });

  it('correctly evaluates standard arithmetic expressions with precedence and roots', () => {
    expect(evaluateExpression('7 + 3')).toBe(10);
    expect(evaluateExpression('14 − 6')).toBe(8);
    expect(evaluateExpression('4 × 5')).toBe(20);
    expect(evaluateExpression('24 ÷ 3')).toBe(8);
    expect(evaluateExpression('17 % 5')).toBe(2);
    expect(evaluateExpression('(4 + 5) × 2')).toBe(18);
    expect(evaluateExpression('4 + 5 × 2')).toBe(14); // Mul before add
    expect(evaluateExpression('√16 + 5')).toBe(9);
    expect(evaluateExpression('3^2 + 4')).toBe(13);
    expect(evaluateExpression('5 − 9')).toBe(-4);
  });

  it('evaluates answers and tracks heart penalties correctly', () => {
    const rng = createRng(4242);
    const cfg = mathBridgeLogic.stageConfig(1);
    const q = mathBridgeLogic.generate(rng, cfg, 0);

    // Correct by index
    const correctRes = mathBridgeLogic.evaluate(q, {
      choiceIndex: q.payload.correctChoiceIndex,
      choiceValue: q.payload.correctChoiceValue
    });
    expect(correctRes.correct).toBe(true);
    expect(correctRes.heartCost).toBe(0);
    expect(correctRes.breaksCombo).toBe(false);

    // Wrong answer
    const wrongIdx = (q.payload.correctChoiceIndex + 1) % 4;
    const wrongRes = mathBridgeLogic.evaluate(q, {
      choiceIndex: wrongIdx,
      choiceValue: q.payload.choices[wrongIdx]!
    });
    expect(wrongRes.correct).toBe(false);
    expect(wrongRes.heartCost).toBe(1);
    expect(wrongRes.breaksCombo).toBe(true);

    // Timeout (null)
    const timeoutRes = mathBridgeLogic.evaluate(q, null);
    expect(timeoutRes.correct).toBe(false);
    expect(timeoutRes.heartCost).toBe(1);
    expect(timeoutRes.breaksCombo).toBe(true);
  });

  it('guarantees 100% solvability and 4 unique choices across 50 random seeds and stages', () => {
    for (let s = 1; s <= 50; s++) {
      const rng = createRng(s * 31337);
      for (const stage of [1, 5, 10, 15, 20, 26, 31, 36, 46, 61, 70]) {
        const cfg = mathBridgeLogic.stageConfig(stage);
        const q = mathBridgeLogic.generate(rng, cfg, s % 5);
        const p = q.payload;

        // Exactly 4 choices
        expect(p.choices.length).toBe(4);

        // All 4 choices are distinct
        const set = new Set(p.choices);
        expect(set.size).toBe(4);

        // Correct choice is at correctChoiceIndex
        expect(p.choices[p.correctChoiceIndex]).toBe(p.correctChoiceValue);

        // Time limit >= 2.0s
        expect(q.timeLimitMs).toBeGreaterThanOrEqual(2000);
      }
    }
  });
});
