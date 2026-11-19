import { describe, it, expect } from 'vitest';
import { createRng } from '@funnygame/game-core';
import { followPatternLogic, calculateFollowPatternScore } from '../logic.js';
import {
  generateFollowPatternQuestion,
  getStagePatternRules,
  calculatePlaybackTiming,
  calculateInputTimeLimit,
  PATTERN_BUTTONS
} from '../pattern-engine.js';
import { getTaunt, INTRO_CARDS } from '../content.js';

describe('FollowPatternLogic - Specification Compliance & Scoring', () => {
  it('matches the 3 exact scoring examples from Section 6 of the specification', () => {
    // 1. Early Example: Stage 3 (L = 5), T_q = 4.0s, rem = 3.0s, streak = 2 (k = 1)
    // Base = 50 * 5 = 250
    // v = 1.0 + 0.5 * (3.0 / 4.0) = 1.375
    // k = 1
    // m(3) = 1 + 0.10 * 2 = 1.2
    // pts = 250 * 1.375 * 1 * 1.2 = 412.5 -> 413
    const score1 = calculateFollowPatternScore(3, 5, 3000, 4000, 2);
    expect(score1).toBe(413);

    // 2. Mid Example: Stage 12 (L = 7, reverse), T_q = 5.6s, rem = 2.8s, streak = 6 (k = 2)
    // Base = 50 * 7 = 350
    // v = 1.0 + 0.5 * (2.8 / 5.6) = 1.250
    // k = 2
    // m(12) = 1 + 0.10 * 11 = 2.1
    // pts = 350 * 1.250 * 2 * 2.1 = 1837.5 -> 1838
    const score2 = calculateFollowPatternScore(12, 7, 2800, 5600, 6);
    expect(score2).toBe(1838);

    // 3. Advanced Example: Stage 30 (L = 12 on 8 buttons), T_q = 9.6s, rem = 5.76s (input in 3.84s), streak = 11 (k = 3)
    // Base = 50 * 12 = 600
    // v = 1.0 + 0.5 * (5.76 / 9.6) = 1.300
    // k = 3
    // m(30) = 3.4 + 0.15 * (30 - 25) = 4.15
    // pts = 600 * 1.300 * 3 * 4.15 = 9711
    const score3 = calculateFollowPatternScore(30, 12, 5760, 9600, 11);
    expect(score3).toBe(9711);
  });

  it('correctly scales button counts, rules, and timings across stages', () => {
    // Stage 1: 4 buttons, forward order
    const r1 = getStagePatternRules(1);
    expect(r1.buttonCount).toBe(4);
    expect(r1.ruleType).toBe('FORWARD');

    // Stage 10: 4 buttons, reverse rule
    const r10 = getStagePatternRules(10);
    expect(r10.buttonCount).toBe(4);
    expect(r10.ruleType).toBe('REVERSE');

    // Stage 15: 6 buttons
    const r15 = getStagePatternRules(15);
    expect(r15.buttonCount).toBe(6);

    // Stage 26: 8 buttons
    const r26 = getStagePatternRules(26);
    expect(r26.buttonCount).toBe(8);

    // Stage 36: Distraction enabled
    const r36 = getStagePatternRules(36);
    expect(r36.hasDistraction).toBe(true);

    // Stage 46: Audio only mode
    const r46 = getStagePatternRules(46);
    expect(r46.ruleType).toBe('AUDIO_ONLY');

    // Stage 51: Skip red button
    const r51 = getStagePatternRules(51);
    expect(r51.ruleType).toBe('SKIP_COLOR');
    expect(r51.skipColorId).toBe(1);

    // Stage 56: Position swap
    const r56 = getStagePatternRules(56);
    expect(r56.ruleType).toBe('SWAP_POSITIONS');
    expect(r56.swapCount).toBeGreaterThan(0);
  });

  it('verifies timing formulas for playback and input limit', () => {
    const tPlay1 = calculatePlaybackTiming(1, false);
    // 0.60s flash duration, max(90, 0.35 * 600 = 210ms)
    expect(tPlay1.flashDurationMs).toBe(600);
    expect(tPlay1.flashPauseMs).toBe(210);

    const tPlayEndless = calculatePlaybackTiming(70, false);
    expect(tPlayEndless.flashDurationMs).toBe(250);

    const tIn = calculateInputTimeLimit(1, 3, 'FORWARD');
    expect(tIn).toBeGreaterThanOrEqual(2.5);
  });

  it('generates deterministic questions across 30 random seeds without crashes', () => {
    for (let s = 1; s <= 30; s++) {
      const rng = createRng(5000 + s);
      const stage = (s % 70) + 1;
      const q = generateFollowPatternQuestion(rng, stage, 0);

      expect(q.buttons.length).toBe(q.buttonCount);
      expect(q.shownSequence.length).toBeGreaterThanOrEqual(3);
      expect(q.expectedSequence.length).toBeGreaterThanOrEqual(3);
      expect(q.timeLimitMs).toBeGreaterThan(0);

      // Verify that no shown sequence has 4+ consecutive identical buttons
      let consec = 1;
      for (let i = 1; i < q.shownSequence.length; i++) {
        if (q.shownSequence[i]!.buttonId === q.shownSequence[i - 1]!.buttonId) {
          consec++;
          expect(consec).toBeLessThanOrEqual(3);
        } else {
          consec = 1;
        }
      }
    }
  });

  it('correctly reverses expected sequence in reverse stages', () => {
    const rng = createRng(8888);
    const q10 = generateFollowPatternQuestion(rng, 10, 0);
    expect(q10.ruleType).toBe('REVERSE');

    const cleanShown = q10.shownSequence.filter((s) => !s.isDistraction).map((s) => s.buttonId);
    expect(q10.expectedSequence).toEqual([...cleanShown].reverse());
  });

  it('correctly skips red button in SKIP_COLOR stages', () => {
    const rng = createRng(9999);
    const q51 = generateFollowPatternQuestion(rng, 51, 0);
    expect(q51.ruleType).toBe('SKIP_COLOR');
    // Ensure red (id 1) is not present in expected sequence
    expect(q51.expectedSequence.includes(1)).toBe(false);
  });

  it('evaluates answers and catches exact matches, wrong buttons, and missing steps', () => {
    const rng = createRng(777);
    const cfg = followPatternLogic.stageConfig(1);
    const q = followPatternLogic.generate(rng, cfg, 0);

    // Timeout (null)
    const timeoutRes = followPatternLogic.evaluate(q, null);
    expect(timeoutRes.correct).toBe(false);
    expect(timeoutRes.heartCost).toBe(1);
    expect(timeoutRes.breaksCombo).toBe(true);

    // Correct full sequence
    const correctRes = followPatternLogic.evaluate(q, {
      pressedButtonIds: q.payload.expectedSequence,
      totalInputMs: 1200,
      hintUsed: false,
      isComplete: true
    });
    expect(correctRes.correct).toBe(true);
    expect(correctRes.heartCost).toBe(0);
    expect(correctRes.breaksCombo).toBe(false);

    // Incomplete sequence
    const incompleteRes = followPatternLogic.evaluate(q, {
      pressedButtonIds: q.payload.expectedSequence.slice(0, -1),
      totalInputMs: 800,
      hintUsed: false,
      isComplete: false
    });
    expect(incompleteRes.correct).toBe(false);
    expect(incompleteRes.heartCost).toBe(1);

    // Wrong button
    const wrongPressed = [...q.payload.expectedSequence];
    wrongPressed[0] = (wrongPressed[0]! + 1) % q.payload.buttonCount;
    const wrongRes = followPatternLogic.evaluate(q, {
      pressedButtonIds: wrongPressed,
      totalInputMs: 500,
      hintUsed: false,
      isComplete: false
    });
    expect(wrongRes.correct).toBe(false);
    expect(wrongRes.heartCost).toBe(1);
  });

  it('provides intro cards and anti-repeating Libyan taunts', () => {
    expect(INTRO_CARDS[1]).toBeDefined();
    expect(INTRO_CARDS[10]).toContain('اقلب الشريط');
    expect(INTRO_CARDS[15]).toContain('6 أزرار');

    const tauntLow = getTaunt(200, 3);
    expect(typeof tauntLow).toBe('string');
    expect(tauntLow.length).toBeGreaterThan(5);

    const tauntHigh = getTaunt(9000, 30);
    expect(typeof tauntHigh).toBe('string');
  });

  it('contains 8 distinct accessible buttons with symbols and frequencies', () => {
    expect(PATTERN_BUTTONS.length).toBe(8);
    const symbols = new Set(PATTERN_BUTTONS.map((b) => b.shapeSymbol));
    expect(symbols.size).toBe(8);
    const freqs = new Set(PATTERN_BUTTONS.map((b) => b.frequencyHz));
    expect(freqs.size).toBe(8);
  });
});
