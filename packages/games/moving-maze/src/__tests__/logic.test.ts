import { describe, it, expect } from 'vitest';
import { createRng } from '@funnygame/game-core';
import {
  MovingMazeLogic,
  calculateMovingMazeScore,
  movingMazeLogic
} from '../logic.js';
import {
  generateMovingMazeQuestion,
  getStageRules,
  findShortestPath
} from '../maze-generator.js';

describe('Moving Maze Logic', () => {
  describe('Scoring Formula (Section 6 Specification Examples)', () => {
    it('calculates Example 1 (Stage 3) accurately to 908 points', () => {
      // Stage 3, movesLeft = 5, ratio = 15s / 20s = 0.75 (v = 1.375), streak = 3 (k = 1), m = 1.2
      // (500 + 50) * 1.375 * 1 * 1.2 = 907.5 -> 908
      const score = calculateMovingMazeScore(3, 5, 15000, 20000, 3);
      expect(score).toBe(908);
    });

    it('calculates Example 2 (Stage 14) accurately to 3048 points', () => {
      // Stage 14, movesLeft = 3, ratio = 12.5s / 25s = 0.5 (v = 1.25), streak = 6 (k = 2), m = 2.3
      // (500 + 30) * 1.25 * 2 * 2.3 = 3047.5 -> 3048
      const score = calculateMovingMazeScore(14, 3, 12500, 25000, 6);
      expect(score).toBe(3048);
    });

    it('calculates Example 3 (Stage 30) accurately to 9076 points', () => {
      // Stage 30, movesLeft = 4, ratio = 21s / 30s = 0.7 (v = 1.35), streak = 12 (k = 3), m = 4.15
      // (500 + 40) * 1.35 * 3 * 4.15 = 9076.05 -> 9076
      const score = calculateMovingMazeScore(30, 4, 21000, 30000, 12);
      expect(score).toBe(9076);
    });
  });

  describe('Stage Configuration & Progression Rules', () => {
    it('scales grid sizes and mechanics properly across stages', () => {
      const s1 = getStageRules(1);
      expect(s1.gridSize).toBe(6);
      expect(s1.trapCount).toBe(0);
      expect(s1.keyCount).toBe(0);
      expect(s1.hasSilentShift).toBe(false);
      expect(s1.hasFogOfWar).toBe(false);

      const s8 = getStageRules(8);
      expect(s8.trapCount).toBeGreaterThanOrEqual(1);

      const s14 = getStageRules(14);
      expect(s14.hasSilentShift).toBe(true);

      const s26 = getStageRules(26);
      expect(s26.hasFogOfWar).toBe(true);

      const s46 = getStageRules(46);
      expect(s46.keyCount).toBeGreaterThanOrEqual(1);

      // Breathing stage check (stage right after boss, e.g. stage 6)
      const s6 = getStageRules(6);
      expect(s6.isBreathing).toBe(true);
      expect(s6.hasFogOfWar).toBe(false);
    });

    it('assigns correct tiers', () => {
      const logic = new MovingMazeLogic();
      expect(logic.stageConfig(1).tier).toBe('warmup');
      expect(logic.stageConfig(15).tier).toBe('hard');
      expect(logic.stageConfig(30).tier).toBe('expert');
      expect(logic.stageConfig(50).tier).toBe('legend');
      expect(logic.stageConfig(75).tier).toBe('endless');
    });
  });

  describe('100% Solvability Guarantee (BFS Pathfinding)', () => {
    it('guarantees every generated question has a valid path from start to keys to exit', () => {
      const testStages = [1, 5, 8, 10, 14, 20, 26, 35, 46, 50];
      for (const stage of testStages) {
        for (let seed = 100; seed < 105; seed++) {
          const rng = createRng(seed);
          const payload = generateMovingMazeQuestion(rng, stage, 0);

          // Test BFS solvability through all keys to exit
          const waypoints = [payload.startPos, ...payload.keys, payload.exitPos];
          for (let w = 0; w < waypoints.length - 1; w++) {
            const segment = findShortestPath(
              waypoints[w]!,
              waypoints[w + 1]!,
              payload.gridSize,
              payload.hWalls,
              payload.vWalls
            );
            expect(segment).not.toBeNull();
            expect(segment!.length).toBeGreaterThan(1);
          }

          expect(payload.initialShortestPathLength).toBeGreaterThan(0);
          expect(payload.allowedMoves).toBeGreaterThanOrEqual(payload.initialShortestPathLength);
        }
      }
    });

    it('calculates allowed moves with the exact mathematical buffer', () => {
      const rng = createRng(42);
      const payload = generateMovingMazeQuestion(rng, 3, 0);
      const P = payload.initialShortestPathLength;
      const expectedBuffer = Math.max(4, Math.floor(0.45 * P)); // Non-breathing stage has extraMoves = 0
      expect(payload.allowedMoves).toBe(P + expectedBuffer);
    });
  });

  describe('Evaluation & Verdicts', () => {
    it('evaluates successful maze run', () => {
      const logic = movingMazeLogic;
      const cfg = logic.stageConfig(1);
      const rng = createRng(1);
      const question = logic.generate(rng, cfg, 0);

      const verdict = logic.evaluate(question, {
        isSuccess: true,
        movesUsed: 10,
        movesLeft: 5,
        durationMs: 8000,
        collectedKeysCount: 0,
        trapsTriggeredCount: 0,
        totalPoints: 1200
      });

      expect(verdict.correct).toBe(true);
      expect(verdict.heartCost).toBe(0);
      expect(verdict.breaksCombo).toBe(false);

      const pts = logic.calculatePoints(
        question,
        {
          isSuccess: true,
          movesUsed: 10,
          movesLeft: 5,
          durationMs: 8000,
          collectedKeysCount: 0,
          trapsTriggeredCount: 0,
          totalPoints: 1200
        },
        8000,
        1
      );

      expect(pts).toBe(1200);
    });

    it('evaluates failed maze run (out of moves or timeout)', () => {
      const logic = movingMazeLogic;
      const cfg = logic.stageConfig(1);
      const rng = createRng(1);
      const question = logic.generate(rng, cfg, 0);

      const verdict = logic.evaluate(question, {
        isSuccess: false,
        movesUsed: 15,
        movesLeft: 0,
        durationMs: 25000,
        collectedKeysCount: 0,
        trapsTriggeredCount: 1,
        totalPoints: 0
      });

      expect(verdict.correct).toBe(false);
      expect(verdict.heartCost).toBe(1);
      expect(verdict.breaksCombo).toBe(true);

      const pts = logic.calculatePoints(question, null, 25000, 1);
      expect(pts).toBe(0);
    });
  });
});
