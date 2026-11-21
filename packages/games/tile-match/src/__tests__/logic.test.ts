import { describe, it, expect } from 'vitest';
import { createRng } from '@funnygame/game-core';
import {
  TileMatchLogic,
  calculateTileMatchScore,
  tileMatchLogic
} from '../logic.js';
import {
  generateTileMatchQuestion,
  getStageRules,
  isCardCovered
} from '../generator.js';
import { getTaunt } from '../content.js';

describe('Tile Match Logic', () => {
  describe('Scoring Formula (Section 7)', () => {
    it('calculates score with base, speed, combo, and stage multipliers', () => {
      // Stage 1: base = 300 (6 triples * 50), remaining = 30s / 30s (v = 1.5), combo = 1 (k = 1), m(1) = 1.0
      // 300 * 1.5 * 1 * 1 = 450
      const scoreS1 = calculateTileMatchScore(1, 300, 30000, 30000, 1);
      expect(scoreS1).toBe(450);

      // Stage 10: base = 600, ratio = 0.5 (v = 1.25), combo = 3 (k = 2), m(10) = 1 + 0.08 * 9 = 1.72
      // 600 * 1.25 * 2 * 1.72 = 2580
      const scoreS10 = calculateTileMatchScore(10, 600, 20000, 40000, 3);
      expect(scoreS10).toBe(2580);

      // High combo multiplier (k = 3 for maxCombo >= 4)
      const scoreCombo = calculateTileMatchScore(5, 500, 20000, 40000, 4);
      // v = 1.25, k = 3, m = 1 + 0.08 * 4 = 1.32 -> 500 * 1.25 * 3 * 1.32 = 2475
      expect(scoreCombo).toBe(2475);
    });
  });

  describe('Stage Configuration & Progression Rules (Section 5)', () => {
    it('scales grid sizes, layers, and special mechanics properly', () => {
      const s1 = getStageRules(1);
      expect(s1.cardCount).toBe(18);
      expect(s1.cardCount % 3).toBe(0);
      expect(s1.typeCount).toBe(3);
      expect(s1.dockCapacity).toBe(7);
      expect(s1.hasMystery).toBe(false);
      expect(s1.hasFrozen).toBe(false);

      const s5 = getStageRules(5);
      expect(s5.isBoss).toBe(true);
      expect(s5.cardCount).toBe(36);
      expect(s5.layerCount).toBe(4);

      const s6 = getStageRules(6);
      expect(s6.isBreathing).toBe(true);
      expect(s6.cardCount).toBe(21);
      expect(s6.timeLimitSec).toBeGreaterThan(35);

      const s7 = getStageRules(7);
      expect(s7.hasMystery).toBe(true);

      const s15 = getStageRules(15);
      expect(s15.isBoss).toBe(true);
      expect(s15.dockCapacity).toBe(6); // Narrow dock in boss 15

      const s16 = getStageRules(16);
      expect(s16.hasFrozen).toBe(true);

      const s26 = getStageRules(26);
      expect(s26.hasMystery).toBe(true);
      expect(s26.hasFrozen).toBe(true);
      expect(s26.dockCapacity).toBe(6);

      const s45 = getStageRules(45);
      expect(s45.isBoss).toBe(true);
      expect(s45.dockCapacity).toBe(5); // 5 slots dock in legend boss

      const s56 = getStageRules(56);
      expect(s56.autoShuffleIntervalSec).toBe(30);
    });

    it('assigns correct tiers', () => {
      const logic = new TileMatchLogic();
      expect(logic.stageConfig(1).tier).toBe('warmup');
      expect(logic.stageConfig(10).tier).toBe('hard');
      expect(logic.stageConfig(25).tier).toBe('expert');
      expect(logic.stageConfig(45).tier).toBe('legend');
      expect(logic.stageConfig(60).tier).toBe('endless');
    });
  });

  describe('Generation & Structural Integrity', () => {
    it('guarantees valid card counts (multiples of 3) and types across various seeds', () => {
      const testStages = [1, 5, 6, 7, 10, 15, 16, 26, 45, 56];
      for (const stage of testStages) {
        for (let seed = 1; seed <= 5; seed++) {
          const rng = createRng(seed);
          const payload = generateTileMatchQuestion(rng, stage, 0);

          expect(payload.cards.length).toBeGreaterThanOrEqual(18);
          expect(payload.cards.length % 3).toBe(0);
          expect(payload.dockCapacity).toBeGreaterThanOrEqual(5);
          expect(payload.dockCapacity).toBeLessThanOrEqual(7);

          // Check that every card has valid coordinates and non-empty icon
          for (const card of payload.cards) {
            expect(card.x).toBeGreaterThanOrEqual(0);
            expect(card.y).toBeGreaterThanOrEqual(0);
            expect(card.layer).toBeGreaterThanOrEqual(0);
            expect(card.icon).toBeTruthy();
          }

          // Count type distributions: each type should occur as multiples of 3 in full sets
          const typeCounts: Record<number, number> = {};
          for (const card of payload.cards) {
            typeCounts[card.typeId] = (typeCounts[card.typeId] || 0) + 1;
          }
          for (const count of Object.values(typeCounts)) {
            expect(count % 3).toBe(0);
          }
        }
      }
    });

    it('correctly calculates card coverage in layers', () => {
      const c1 = { id: 0, typeId: 0, icon: '🍓', x: 50, y: 50, layer: 0, width: 46, height: 52 };
      const c2 = { id: 1, typeId: 1, icon: '🍌', x: 60, y: 60, layer: 1, width: 46, height: 52 };
      const c3 = { id: 2, typeId: 2, icon: '🍎', x: 200, y: 200, layer: 1, width: 46, height: 52 };

      // c2 covers c1 (c2 is layer 1 and overlaps c1 at 50,50)
      expect(isCardCovered(c1, [c1, c2, c3], new Set())).toBe(true);

      // c3 does not cover c1 (far away)
      expect(isCardCovered(c1, [c1, c3], new Set())).toBe(false);

      // Once c2 is removed, c1 is no longer covered
      expect(isCardCovered(c1, [c1, c2, c3], new Set([c2.id]))).toBe(false);
    });
  });

  describe('Game Evaluation & Taunts', () => {
    it('evaluates answers correctly', () => {
      const logic = tileMatchLogic;
      const question = logic.generate(createRng(1), logic.stageConfig(1), 0);

      const passVerdict = logic.evaluate(question, {
        isSuccess: true,
        triplesCleared: 6,
        durationMs: 15000,
        powerUpsUsed: { undo: 0, magnet: 0, shuffle: 0 },
        totalPoints: 500
      });
      expect(passVerdict.correct).toBe(true);
      expect(passVerdict.heartCost).toBe(0);

      const failVerdict = logic.evaluate(question, {
        isSuccess: false,
        triplesCleared: 2,
        durationMs: 30000,
        powerUpsUsed: { undo: 1, magnet: 1, shuffle: 0 },
        totalPoints: 0
      });
      expect(failVerdict.correct).toBe(false);
      expect(failVerdict.heartCost).toBe(1);
    });

    it('returns authentic Libyan Arabic taunts', () => {
      const taunt = getTaunt({ stage: 5, score: 1200 });
      expect(typeof taunt).toBe('string');
      expect(taunt.length).toBeGreaterThan(10);
    });
  });
});
