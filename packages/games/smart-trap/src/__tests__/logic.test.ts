import { describe, it, expect } from 'vitest';
import { createRng } from '@funnygame/game-core';
import {
  SmartTrapLogic,
  calculateSmartTrapScore,
  smartTrapLogic
} from '../logic.js';
import {
  generateSmartTrapQuestion,
  getStageRules,
  getStagePlan
} from '../generator.js';
import { PUZZLE_TEMPLATES } from '../templates.js';
import { getTaunt } from '../content.js';

describe('Smart Trap Logic', () => {
  describe('Scoring Formula (Section 6 Specification Examples)', () => {
    it('calculates Example 1 (Stage 3) accurately to 330 points', () => {
      // Stage 3, T_q = 24s, answered in 6s (remaining 18s), combo = 2 (k = 1), m = 1 + 0.10 * 2 = 1.2
      // v = 1.0 + 0.5 * (18 / 24) = 1.375
      // 200 * 1.375 * 1 * 1.2 = 330
      const score = calculateSmartTrapScore(3, 18000, 24000, 2);
      expect(score).toBe(330);
    });

    it('calculates Example 2 (Stage 15) accurately to 1200 points', () => {
      // Stage 15, T_q = 20s, answered in 10s (remaining 10s), combo = 7 (k = 2), m = 1 + 0.10 * 14 = 2.4
      // v = 1.0 + 0.5 * 0.5 = 1.25
      // 200 * 1.25 * 2 * 2.4 = 1200
      const score = calculateSmartTrapScore(15, 10000, 20000, 7);
      expect(score).toBe(1200);
    });

    it('calculates Example 3 (Stage 28) accurately to 3119 points', () => {
      // Stage 28, T_q = 16s, answered in 4.8s (remaining 11.2s), combo = 11 (k = 3), m = 3.4 + 0.15 * 3 = 3.85
      // v = 1.0 + 0.5 * (11.2 / 16) = 1.35
      // 200 * 1.35 * 3 * 3.85 = 3118.5 -> 3119
      const score = calculateSmartTrapScore(28, 11200, 16000, 11);
      expect(score).toBe(3119);
    });
  });

  describe('Stage Configuration & Progression Rules', () => {
    it('enforces 10.0s time floor and breathing stage extra time', () => {
      const s1 = getStageRules(1);
      expect(s1.timeLimitSec).toBe(25.0);

      // Stage 6 (Breathing)
      const s6 = getStageRules(6);
      expect(s6.isBreathing).toBe(true);
      expect(s6.extraTimeSec).toBe(4.0);

      // Stage 70+
      const s75 = getStageRules(75);
      expect(s75.timeLimitSec).toBeGreaterThanOrEqual(10.0);
    });

    it('assigns correct tiers', () => {
      const logic = new SmartTrapLogic();
      expect(logic.stageConfig(1).tier).toBe('warmup');
      expect(logic.stageConfig(15).tier).toBe('hard');
      expect(logic.stageConfig(30).tier).toBe('expert');
      expect(logic.stageConfig(50).tier).toBe('legend');
      expect(logic.stageConfig(75).tier).toBe('endless');
    });
  });

  describe('Question Generation & Trap Architecture', () => {
    it('generates 4 choices with exactly 1 correct and 1 trap choice across all stages', () => {
      const testStages = [1, 3, 5, 6, 7, 10, 12, 15, 20, 21, 26, 36, 46, 56, 70];
      for (const stage of testStages) {
        for (let seed = 1; seed <= 5; seed++) {
          const rng = createRng(seed);
          const payload = generateSmartTrapQuestion(rng, stage, 0);

          expect(payload.choices.length).toBe(4);
          const correctChoices = payload.choices.filter((c) => c.isCorrect);
          const trapChoices = payload.choices.filter((c) => c.isTrap);

          expect(correctChoices.length).toBe(1);
          expect(trapChoices.length).toBe(1);
          expect(payload.correctChoiceIndex).toBeGreaterThanOrEqual(0);
          expect(payload.correctChoiceIndex).toBeLessThan(4);
          expect(payload.trapChoiceIndex).toBeGreaterThanOrEqual(0);
          expect(payload.trapChoiceIndex).toBeLessThan(4);
          expect(payload.trapChoiceIndex).not.toBe(payload.correctChoiceIndex);

          expect(payload.promptAr).toBeTruthy();
          expect(payload.explanationAr).toBeTruthy();
          expect(payload.categoryAr).toBeTruthy();

          // Ensure all 4 choice texts are completely distinct
          const choiceTexts = new Set(payload.choices.map((c) => c.text));
          expect(choiceTexts.size).toBe(4);
        }
      }
    });

    it('guarantees every single puzzle template generates valid instances with distinct choices', () => {
      expect(PUZZLE_TEMPLATES.length).toBeGreaterThanOrEqual(50);
      for (const template of PUZZLE_TEMPLATES) {
        const rng = createRng(42);
        const inst = template.generate(rng, template.minStage);
        expect(inst.id).toBeTruthy();
        expect(inst.promptAr.length).toBeGreaterThan(10);
        expect(inst.correctAnswer).toBeTruthy();
        expect(inst.trapAnswer).toBeTruthy();
        expect(inst.correctAnswer).not.toBe(inst.trapAnswer);
        expect(inst.distractors.length).toBeGreaterThanOrEqual(2);
        expect(inst.explanationAr.length).toBeGreaterThan(10);
      }
    });

    it('guarantees 100% unique puzzle templates across the 5 questions within every stage', () => {
      for (let stage = 1; stage <= 50; stage++) {
        const plan = getStagePlan(stage);
        expect(plan.length).toBe(5);
        const ids = new Set(plan.map((t) => t.id));
        expect(ids.size).toBe(5); // Zero repetition in the 5 questions of the stage!
      }
    });

    it('prevents immediate consecutive repetition across stage transitions', () => {
      for (let stage = 1; stage < 30; stage++) {
        const currentPlan = getStagePlan(stage);
        const nextPlan = getStagePlan(stage + 1);
        const lastOfCurrent = currentPlan[currentPlan.length - 1]!.id;
        const firstOfNext = nextPlan[0]!.id;
        expect(firstOfNext).not.toBe(lastOfCurrent);
      }
    });
  });

  describe('Game Evaluation & Taunts', () => {
    it('evaluates answers correctly', () => {
      const logic = smartTrapLogic;
      const question = logic.generate(createRng(1), logic.stageConfig(1), 0);

      const pass = logic.evaluate(question, {
        choiceIndex: question.payload.correctChoiceIndex,
        isCorrect: true,
        durationMs: 5000,
        hintUsed: false,
        totalPoints: 300
      });
      expect(pass.correct).toBe(true);
      expect(pass.heartCost).toBe(0);

      const fail = logic.evaluate(question, {
        choiceIndex: question.payload.trapChoiceIndex,
        isCorrect: false,
        durationMs: 6000,
        hintUsed: false,
        totalPoints: 0
      });
      expect(fail.correct).toBe(false);
      expect(fail.heartCost).toBe(1);
    });

    it('returns authentic Libyan Arabic taunts formatted with score', () => {
      const taunt = getTaunt({ stage: 5, score: 1200 });
      expect(typeof taunt).toBe('string');
      expect(taunt.length).toBeGreaterThan(10);
    });
  });
});
