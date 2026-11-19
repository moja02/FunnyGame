import { describe, it, expect } from 'vitest';
import { createRng } from '@funnygame/game-core';
import { whereDidItGoLogic, calculateWhereDidItGoScore } from '../logic.js';
import {
  generateWhereDidItGoQuestion,
  getStageRules,
  calculatePreviewDuration,
  calculateSearchTimeLimit
} from '../grid-engine.js';
import { getTaunt, INTRO_CARDS } from '../content.js';

describe('WhereDidItGoLogic - Specification Compliance & Scoring', () => {
  it('matches the 3 exact scoring examples from Section 6 of the specification', () => {
    // 1. Early Example: Stage 3 (3x3, 1 card, preview 2.8s), T_q = 4.2s, found in 1.05s (rem = 3.15s), streak = 2 (k = 1)
    // Base = 100 * 1 = 100
    // v = 1.0 + 0.5 * (3.15 / 4.2) = 1.375
    // k = 1
    // m(3) = 1 + 0.10 * 2 = 1.2
    // pts = 100 * 1.375 * 1 * 1.2 = 165
    const score1 = calculateWhereDidItGoScore(3, 1, 2.8, 3150, 4200, 2);
    expect(score1).toBe(165);

    // 2. Mid Example: Stage 15 (5x5, 3 cards, preview 1.8s), T_q = 6.0s, found in 3.0s (rem = 3.0s), streak = 7 (k = 2)
    // Base = 100 * 3 = 300
    // v = 1.0 + 0.5 * (3.0 / 6.0) = 1.250
    // k = 2
    // m(15) = 1 + 0.10 * 14 = 2.4
    // pts = 300 * 1.250 * 2 * 2.4 = 1800
    const score2 = calculateWhereDidItGoScore(15, 3, 1.8, 3000, 6000, 7);
    expect(score2).toBe(1800);

    // 3. Advanced Example: Stage 30 (6x6, 2 cards, preview 0.7s -> +50 bonus per card), T_q = 5.0s, found in 1.5s (rem = 3.5s), streak = 12 (k = 3)
    // Base = (100 + 50) * 2 = 300
    // v = 1.0 + 0.5 * (3.5 / 5.0) = 1.350
    // k = 3
    // m(30) = 3.4 + 0.15 * (30 - 25) = 4.15
    // pts = 300 * 1.350 * 3 * 4.15 = 5042.25 -> 5042
    const score3 = calculateWhereDidItGoScore(30, 2, 0.7, 3500, 5000, 12);
    expect(score3).toBe(5042);
  });

  it('scales grid dimensions, mistake allowance, and rules across stages', () => {
    // Stage 1: 3x3, 2 allowed mistakes
    const r1 = getStageRules(1);
    expect(r1.gridDimension).toBe(3);
    expect(r1.allowedMistakes).toBe(2);
    expect(r1.targetCount).toBe(1);

    // Stage 5 Boss: 3x3, 2 targets unordered
    const r5 = getStageRules(5);
    expect(r5.gridDimension).toBe(3);
    expect(r5.targetCount).toBe(2);
    expect(r5.isOrdered).toBe(false);

    // Stage 6 Breathing: 4x4, 1 allowed mistake, 0 swaps
    const r6 = getStageRules(6);
    expect(r6.gridDimension).toBe(4);
    expect(r6.allowedMistakes).toBe(1);
    expect(r6.swapCount).toBe(0);

    // Stage 10 Boss: 4x4, 2 targets ordered, 1 swap
    const r10 = getStageRules(10);
    expect(r10.targetCount).toBe(2);
    expect(r10.isOrdered).toBe(true);
    expect(r10.swapCount).toBe(1);

    // Stage 14: 5x5, 0 allowed mistakes
    const r14 = getStageRules(14);
    expect(r14.gridDimension).toBe(5);
    expect(r14.allowedMistakes).toBe(0);

    // Stage 26: 6x6
    const r26 = getStageRules(26);
    expect(r26.gridDimension).toBe(6);

    // Stage 46: 5x5, Mid-flip swap tier
    const r46 = getStageRules(46);
    expect(r46.gridDimension).toBe(5);
  });

  it('correctly calculates preview and search timing curves', () => {
    // Stage 1: preview 3.0s
    expect(calculatePreviewDuration(1, false)).toBe(3.0);
    // Stage 30: floor 0.7s
    expect(calculatePreviewDuration(30, false)).toBe(0.7);
    // Stage 50: remains at floor 0.7s
    expect(calculatePreviewDuration(50, false)).toBe(0.7);

    // Breathing adds +0.4s to preview
    expect(calculatePreviewDuration(6, true)).toBeCloseTo(3.0);

    // Search time limit is at least 2.5s
    expect(calculateSearchTimeLimit(1, 1, false, 0)).toBeGreaterThanOrEqual(2.5);
    expect(calculateSearchTimeLimit(70, 3, false, 4)).toBeGreaterThanOrEqual(2.5);
  });

  it('guarantees unique target placement in the grid across 30 seeds', () => {
    for (let s = 1; s <= 30; s++) {
      const rng = createRng(3000 + s);
      const stage = (s % 70) + 1;
      const q = generateWhereDidItGoQuestion(rng, stage, 0);

      expect(q.initialCards.length).toBe(q.totalCards);
      expect(q.targets.length).toBeGreaterThanOrEqual(1);

      // Verify Unique Target Guarantee:
      // Each target icon must appear in EXACTLY ONE cell in initialCards
      for (const target of q.targets) {
        const matches = q.initialCards.filter((card) => card.icon === target.icon);
        expect(matches.length).toBe(1);
        expect(target.finalCellIndex).toBeGreaterThanOrEqual(0);
        expect(target.finalCellIndex).toBeLessThan(q.totalCards);
      }
    }
  });

  it('evaluates answers and handles exact matches, timeouts, and wrong cells', () => {
    const rng = createRng(4444);
    const cfg = whereDidItGoLogic.stageConfig(10);
    const q = whereDidItGoLogic.generate(rng, cfg, 0);

    // Timeout (null)
    const timeoutRes = whereDidItGoLogic.evaluate(q, null);
    expect(timeoutRes.correct).toBe(false);
    expect(timeoutRes.heartCost).toBe(1);
    expect(timeoutRes.breaksCombo).toBe(true);

    // Correct expected sequence of targets
    const correctCells = q.payload.targets.map((t) => t.finalCellIndex);
    const correctRes = whereDidItGoLogic.evaluate(q, {
      flippedCellIndices: correctCells,
      totalSearchMs: 1500,
      mistakesMade: 0,
      hintUsed: false,
      isComplete: true
    });
    expect(correctRes.correct).toBe(true);
    expect(correctRes.heartCost).toBe(0);
    expect(correctRes.breaksCombo).toBe(false);

    // Wrong cell
    const wrongCells = [...correctCells];
    wrongCells[0] = (wrongCells[0]! + 1) % q.payload.totalCards;
    const wrongRes = whereDidItGoLogic.evaluate(q, {
      flippedCellIndices: wrongCells,
      totalSearchMs: 800,
      mistakesMade: 1,
      hintUsed: false,
      isComplete: false
    });
    expect(wrongRes.correct).toBe(false);
    expect(wrongRes.heartCost).toBe(1);
  });

  it('provides intro cards and anti-repeating Libyan taunts', () => {
    expect(INTRO_CARDS[1]).toBeDefined();
    expect(INTRO_CARDS[10]).toContain('الترتيب');

    const tauntLow = getTaunt(150, 2);
    expect(typeof tauntLow).toBe('string');
    expect(tauntLow.length).toBeGreaterThan(5);

    const tauntHigh = getTaunt(6000, 28);
    expect(typeof tauntHigh).toBe('string');
  });
});
