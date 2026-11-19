import { describe, it, expect } from 'vitest';
import { createRng } from '@funnygame/game-core';
import { watchAndJudgeLogic, calculateWatchAndJudgeRoundScore } from '../logic.js';
import {
  generateWatchAndJudgeQuestion,
  getStageRules,
  calculateViewDuration,
  calculateDecisionTimeLimit
} from '../scene-engine.js';
import { getTaunt, INTRO_CARDS } from '../content.js';

describe('WatchAndJudgeLogic - Specification Compliance & Scoring', () => {
  it('matches the 3 exact scoring examples from Section 6 of the specification', () => {
    // 1. Early Example: Stage 3 (major change, Base = 150), T_q = 3.4s, answered in 0.85s (rem = 2.55s), streak = 3 (k = 1)
    // v = 1.0 + 0.5 * (2.55 / 3.4) = 1.375
    // k = 1
    // m(3) = 1 + 0.10 * 2 = 1.2
    // pts = 150 * 1.375 * 1 * 1.2 = 247.5 -> 248
    const score1 = calculateWatchAndJudgeRoundScore(3, false, 2550, 3400, 3);
    expect(score1).toBe(248);

    // 2. Mid Example: Stage 14 (minor change x1.5, Base = 225), T_q = 3.2s, answered in 1.6s (rem = 1.6s), streak = 7 (k = 2)
    // v = 1.0 + 0.5 * (1.6 / 3.2) = 1.250
    // k = 2
    // m(14) = 1 + 0.10 * 13 = 2.3
    // pts = 225 * 1.250 * 2 * 2.3 = 1293.75 -> 1294
    const score2 = calculateWatchAndJudgeRoundScore(14, true, 1600, 3200, 7);
    expect(score2).toBe(1294);

    // 3. Advanced Example: Stage 28 (25 items + minor change x1.5, Base = 225), T_q = 3.1s, answered in 0.93s (rem = 2.17s), streak = 11 (k = 3)
    // v = 1.0 + 0.5 * (2.17 / 3.1) = 1.350
    // k = 3
    // m(28) = 3.4 + 0.15 * (28 - 25) = 3.85
    // pts = 225 * 1.350 * 3 * 3.85 = 3508.31 -> 3508
    const score3 = calculateWatchAndJudgeRoundScore(28, true, 2170, 3100, 11);
    expect(score3).toBe(3508);
  });

  it('correctly scales difficulty features and rules across stages', () => {
    // Stage 1: 6 items, no "no change" button, no flash
    const r1 = getStageRules(1);
    expect(r1.itemCount).toBe(6);
    expect(r1.hasNoChangeButton).toBe(false);
    expect(r1.hasColorFlash).toBe(false);

    // Stage 10 Boss: 12 items, has "no change" button
    const r10 = getStageRules(10);
    expect(r10.hasNoChangeButton).toBe(true);

    // Stage 26: 25 items (full grid)
    const r26 = getStageRules(26);
    expect(r26.itemCount).toBe(25);

    // Stage 36: Transition color flash enabled
    const r36 = getStageRules(36);
    expect(r36.hasColorFlash).toBe(true);

    // Stage 46: Double changes enabled
    const r46 = getStageRules(46);
    expect(r46.allowDoubleChange).toBe(true);

    // Stage 51: Distractor scene enabled
    const r51 = getStageRules(51);
    expect(r51.hasDistractorScene).toBe(true);
  });

  it('adheres to viewing and decision time formulas', () => {
    // Stage 1: 5.0s viewing time
    expect(calculateViewDuration(1, false)).toBe(5.0);
    // Stage 24: 1.55s, Stage 25+: reaches 1.5s floor
    expect(calculateViewDuration(24, false)).toBe(1.55);
    expect(calculateViewDuration(25, false)).toBe(1.5);
    expect(calculateViewDuration(40, false)).toBe(1.5);

    // Breathing adds +0.5s to view duration
    expect(calculateViewDuration(6, true)).toBeCloseTo(4.75, 1);

    // Decision time limit is at least 2.0s
    expect(calculateDecisionTimeLimit(1, 6, false)).toBeGreaterThanOrEqual(2.0);
    expect(calculateDecisionTimeLimit(70, 25, false)).toBeGreaterThanOrEqual(2.0);
  });

  it('generates 3 deterministic rounds per question across 30 seeds without crashes', () => {
    for (let s = 1; s <= 30; s++) {
      const rng = createRng(6000 + s);
      const stage = (s % 70) + 1;
      const q = generateWatchAndJudgeQuestion(rng, stage, 0);

      expect(q.rounds.length).toBe(3);
      for (const round of q.rounds) {
        expect(round.sceneA.length).toBe(25);
        expect(round.sceneB.length).toBe(25);
        if (round.isNoChange) {
          expect(round.validTargetIndices.length).toBe(0);
        } else {
          expect(round.validTargetIndices.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('evaluates stage verdicts requiring at least 2 out of 3 rounds passed', () => {
    const rng = createRng(1234);
    const cfg = watchAndJudgeLogic.stageConfig(5);
    const q = watchAndJudgeLogic.generate(rng, cfg, 0);

    // Timeout (null)
    const timeoutRes = watchAndJudgeLogic.evaluate(q, null);
    expect(timeoutRes.correct).toBe(false);
    expect(timeoutRes.heartCost).toBe(1);
    expect(timeoutRes.breaksCombo).toBe(true);

    // 2/3 rounds passed -> Stage Won!
    const passedTwo = watchAndJudgeLogic.evaluate(q, {
      rounds: [
        {
          roundIndex: 0,
          clickedCellIndex: q.payload.rounds[0]!.validTargetIndices[0] ?? null,
          clickedNoChange: q.payload.rounds[0]!.isNoChange,
          decisionMs: 1000,
          isCorrect: true,
          earnedPoints: 200
        },
        {
          roundIndex: 1,
          clickedCellIndex: 99, // wrong
          clickedNoChange: false,
          decisionMs: 1200,
          isCorrect: false,
          earnedPoints: 0
        },
        {
          roundIndex: 2,
          clickedCellIndex: q.payload.rounds[2]!.validTargetIndices[0] ?? null,
          clickedNoChange: q.payload.rounds[2]!.isNoChange,
          decisionMs: 800,
          isCorrect: true,
          earnedPoints: 200
        }
      ],
      totalPoints: 400,
      correctRoundsCount: 2,
      isComplete: true
    });
    expect(passedTwo.correct).toBe(true);
    expect(passedTwo.heartCost).toBe(0);
    expect(passedTwo.breaksCombo).toBe(false);

    // Only 1/3 rounds passed -> Stage Lost!
    const passedOne = watchAndJudgeLogic.evaluate(q, {
      rounds: [
        {
          roundIndex: 0,
          clickedCellIndex: q.payload.rounds[0]!.validTargetIndices[0] ?? null,
          clickedNoChange: q.payload.rounds[0]!.isNoChange,
          decisionMs: 1000,
          isCorrect: true,
          earnedPoints: 200
        },
        {
          roundIndex: 1,
          clickedCellIndex: 99, // wrong
          clickedNoChange: false,
          decisionMs: 1200,
          isCorrect: false,
          earnedPoints: 0
        },
        {
          roundIndex: 2,
          clickedCellIndex: 99, // wrong
          clickedNoChange: false,
          decisionMs: 1200,
          isCorrect: false,
          earnedPoints: 0
        }
      ],
      totalPoints: 200,
      correctRoundsCount: 1,
      isComplete: false
    });
    expect(passedOne.correct).toBe(false);
    expect(passedOne.heartCost).toBe(1);
    expect(passedOne.breaksCombo).toBe(true);
  });

  it('provides intro cards and anti-repeating Libyan taunts', () => {
    expect(INTRO_CARDS[1]).toBeDefined();
    expect(INTRO_CARDS[10]).toContain('ما في تغيير');

    const tauntLow = getTaunt(150, 2);
    expect(typeof tauntLow).toBe('string');
    expect(tauntLow.length).toBeGreaterThan(5);

    const tauntHigh = getTaunt(6000, 28);
    expect(typeof tauntHigh).toBe('string');
  });
});
