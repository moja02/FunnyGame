import { describe, it, expect } from 'vitest';
import { createRng } from '@funnygame/game-core';
import {
  CompleteSequenceLogic,
  calculateCompleteSequenceScore,
  completeSequenceLogic
} from '../logic.js';
import {
  generateCompleteSequenceQuestion,
  getStageRules
} from '../generator.js';
import { getTaunt } from '../content.js';

describe('Complete Sequence Logic', () => {
  describe('Scoring Formula (Section 6 Specification Examples)', () => {
    it('calculates Example 1 (Stage 3) accurately to 248 points', () => {
      // Stage 3, Base = 150, T_q = 19.5s, remaining 14.625s, combo = 2 (k = 1), m = 1 + 0.10 * 2 = 1.2
      // v = 1.0 + 0.5 * (14.625 / 19.5) = 1.375
      // 150 * 1.375 * 1 * 1.2 = 247.5 -> 248
      const score = calculateCompleteSequenceScore(3, 14625, 19500, 2, false);
      expect(score).toBe(248);
    });

    it('calculates Example 2 (Stage 15) accurately to 900 points', () => {
      // Stage 15, Base = 150, T_q = 17.5s, remaining 8.75s, combo = 7 (k = 2), m = 1 + 0.10 * 14 = 2.4
      // v = 1.0 + 0.5 * 0.5 = 1.25
      // 150 * 1.25 * 2 * 2.4 = 900
      const score = calculateCompleteSequenceScore(15, 8750, 17500, 7, false);
      expect(score).toBe(900);
    });

    it('calculates Example 3 (Stage 28) accurately to 3508 points', () => {
      // Stage 28, Base = 225 (Compound), T_q = 12.0s, remaining 8.4s, combo = 12 (k = 3), m = 3.4 + 0.15 * 3 = 3.85
      // v = 1.0 + 0.5 * (8.4 / 12) = 1.35
      // 225 * 1.35 * 3 * 3.85 = 3508.3125 -> 3508
      const score = calculateCompleteSequenceScore(28, 8400, 12000, 12, true);
      expect(score).toBe(3508);
    });
  });

  describe('Stage Configuration & Progression Rules', () => {
    it('enforces 6.0s time floor and breathing stage extra time', () => {
      const s1 = getStageRules(1);
      expect(s1.timeLimitSec).toBe(20.0);

      // Stage 6 (Breathing: +2.0s)
      const s6 = getStageRules(6);
      expect(s6.isBreathing).toBe(true);
      expect(s6.extraTimeSec).toBeGreaterThanOrEqual(2.0);

      // Stage 15 (Middle missing: +1.5s)
      const s15 = getStageRules(15);
      expect(s15.timeLimitSec).toBe(17.5);

      // Stage 70+ (Floor 6.0s)
      const s75 = getStageRules(75);
      expect(s75.timeLimitSec).toBeGreaterThanOrEqual(6.0);
    });

    it('assigns correct tiers', () => {
      const logic = new CompleteSequenceLogic();
      expect(logic.stageConfig(1).tier).toBe('warmup');
      expect(logic.stageConfig(15).tier).toBe('hard');
      expect(logic.stageConfig(30).tier).toBe('expert');
      expect(logic.stageConfig(50).tier).toBe('legend');
      expect(logic.stageConfig(75).tier).toBe('endless');
    });
  });

  describe('Question Generation & Choices Architecture', () => {
    it('generates 4 choices with exactly 1 correct choice and valid items across all stages', () => {
      const testStages = [1, 3, 5, 6, 7, 10, 12, 15, 16, 20, 21, 26, 36, 46, 56, 66, 70];
      for (const stage of testStages) {
        for (let seed = 1; seed <= 5; seed++) {
          const rng = createRng(seed);
          const payload = generateCompleteSequenceQuestion(rng, stage, 0);

          expect(payload.choices.length).toBe(4);
          const correctChoices = payload.choices.filter((c) => c.isCorrect);
          expect(correctChoices.length).toBe(1);
          expect(payload.correctChoiceIndex).toBeGreaterThanOrEqual(0);
          expect(payload.correctChoiceIndex).toBeLessThan(4);

          // Sequence items integrity
          expect(payload.items.length).toBeGreaterThanOrEqual(6);
          const missingItems = payload.items.filter((item) => item.isMissing);
          expect(missingItems.length).toBe(1);
          expect(payload.items[payload.missingIndex]!.isMissing).toBe(true);

          if (payload.sequenceType === 'number') {
            // Ascending order guarantee for numbers
            const nums = payload.choices.map((c) => c.numValue!);
            for (let i = 0; i < nums.length - 1; i++) {
              expect(nums[i]!).toBeLessThan(nums[i + 1]!);
            }
          }

          expect(payload.ruleHintAr).toBeTruthy();
          expect(payload.ruleSummaryAr).toBeTruthy();
          expect(payload.categoryAr).toBeTruthy();
        }
      }
    });
  });

  describe('Game Evaluation & Taunts', () => {
    it('evaluates answers correctly', () => {
      const logic = completeSequenceLogic;
      const question = logic.generate(createRng(1), logic.stageConfig(1), 0);

      const pass = logic.evaluate(question, {
        choiceIndex: question.payload.correctChoiceIndex,
        isCorrect: true,
        durationMs: 4000,
        hintUsed: false,
        totalPoints: 248
      });
      expect(pass.correct).toBe(true);
      expect(pass.heartCost).toBe(0);

      const wrongIdx = (question.payload.correctChoiceIndex + 1) % 4;
      const fail = logic.evaluate(question, {
        choiceIndex: wrongIdx,
        isCorrect: false,
        durationMs: 5000,
        hintUsed: false,
        totalPoints: 0
      });
      expect(fail.correct).toBe(false);
      expect(fail.heartCost).toBe(1);
    });

    it('returns authentic Libyan Arabic taunts formatted with score', () => {
      const taunt = getTaunt({ stage: 5, score: 1500 });
      expect(typeof taunt).toBe('string');
      expect(taunt.length).toBeGreaterThan(10);
    });
  });
});
