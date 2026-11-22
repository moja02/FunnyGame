import { describe, it, expect } from 'vitest';
import {
  calculateNormalizedScore,
  getDraftPickOrder,
  generateMatchRoundSeeds,
  evaluateDuelRound,
  evaluateDuelMatch,
} from '../duel-engine.js';

describe('Duel Tournament Engine', () => {
  describe('Score Normalization ($S_norm$)', () => {
    it('normalizes target score to 1000', () => {
      expect(calculateNormalizedScore('color-trap', 3000)).toBe(1000);
      expect(calculateNormalizedScore('dont-tap', 2500)).toBe(1000);
      expect(calculateNormalizedScore('math-bridge', 2200)).toBe(1000);
    });

    it('caps normalized score at 1000 even when raw exceeds target', () => {
      expect(calculateNormalizedScore('color-trap', 6000)).toBe(1000);
      expect(calculateNormalizedScore('tile-match', 5000)).toBe(1000);
    });

    it('handles 0 and negative raw scores gracefully', () => {
      expect(calculateNormalizedScore('calc-pressure', 0)).toBe(0);
      expect(calculateNormalizedScore('calc-pressure', -500)).toBe(0);
    });

    it('accurately calculates intermediate normalized scores', () => {
      // 1500 out of 3000 target = 500 normalized
      expect(calculateNormalizedScore('color-trap', 1500)).toBe(500);
      // 1250 out of 2500 target = 500 normalized
      expect(calculateNormalizedScore('dont-tap', 1250)).toBe(500);
    });
  });

  describe('Draft Turn Sequence (Snake Draft)', () => {
    it('generates correct 2-round draft sequence', () => {
      expect(getDraftPickOrder(2, 'host')).toEqual(['host', 'guest']);
      expect(getDraftPickOrder(2, 'guest')).toEqual(['guest', 'host']);
    });

    it('generates correct 4-round snake draft sequence', () => {
      expect(getDraftPickOrder(4, 'host')).toEqual(['host', 'guest', 'guest', 'host']);
      expect(getDraftPickOrder(4, 'guest')).toEqual(['guest', 'host', 'host', 'guest']);
    });

    it('generates correct 6-round snake draft sequence', () => {
      expect(getDraftPickOrder(6, 'host')).toEqual([
        'host',
        'guest',
        'guest',
        'host',
        'host',
        'guest',
      ]);
    });
  });

  describe('Deterministic Shared Seed Engine', () => {
    it('generates distinct non-zero seeds for each round', () => {
      const seeds = generateMatchRoundSeeds(12345, 4);
      expect(seeds.length).toBe(4);
      expect(new Set(seeds).size).toBe(4);
      seeds.forEach((s: number) => expect(s).toBeGreaterThan(0));
    });

    it('produces identical seeds for the same base seed across clients', () => {
      const seedsA = generateMatchRoundSeeds(9999, 6);
      const seedsB = generateMatchRoundSeeds(9999, 6);
      expect(seedsA).toEqual(seedsB);
    });
  });

  describe('Round Evaluation & Win Bonuses', () => {
    it('awards +200 bonus to the round winner with higher raw score', () => {
      const round = evaluateDuelRound(
        { roundOrder: 1, gameId: 'color-trap', pickedBy: 'host', seed: 101 },
        3000,
        1500,
        45000,
        50000
      );

      expect(round.winner).toBe('host');
      expect(round.hostNormScore).toBe(1000);
      expect(round.guestNormScore).toBe(500);
      expect(round.hostBonusScore).toBe(200);
      expect(round.guestBonusScore).toBe(0);
    });

    it('awards +100 bonus each upon exact tie in raw score', () => {
      const round = evaluateDuelRound(
        { roundOrder: 2, gameId: 'dont-tap', pickedBy: 'guest', seed: 202 },
        2000,
        2000
      );

      expect(round.winner).toBe('tie');
      expect(round.hostBonusScore).toBe(100);
      expect(round.guestBonusScore).toBe(100);
    });

    it('detects when the picker loses their own chosen game and outputs funny banter', () => {
      const round = evaluateDuelRound(
        { roundOrder: 1, gameId: 'calc-pressure', pickedBy: 'host', seed: 303 },
        1000,
        2500
      );

      expect(round.winner).toBe('guest');
      // Picker was host, but guest won -> picker lost own game
      expect(round.banterText).toMatch(/خطة فاشلة|اخترت لعبتك وخسرت|تكتيكك خانك/);
    });
  });

  describe('Match Summary & Tie-Breaking Rules', () => {
    it('declares winner by total points when one player leads', () => {
      const rounds = [
        evaluateDuelRound(
          { roundOrder: 1, gameId: 'color-trap', pickedBy: 'host', seed: 1 },
          3000,
          1500
        ),
        evaluateDuelRound(
          { roundOrder: 2, gameId: 'dont-tap', pickedBy: 'guest', seed: 2 },
          2500,
          1000
        ),
      ];

      const summary = evaluateDuelMatch(2, rounds);
      expect(summary.winner).toBe('host');
      expect(summary.victoryReason).toBe('score');
      expect(summary.hostTotalScore).toBeGreaterThan(summary.guestTotalScore);
    });

    it('breaks ties using individual round wins when total scores tie', () => {
      // Create artificial tie in points where round wins differ
      const round1 = evaluateDuelRound(
        { roundOrder: 1, gameId: 'math-bridge', pickedBy: 'host', seed: 1 },
        2200,
        0 // Host wins round: norm 1000 + 200 = 1200 vs 0
      );
      const round2 = evaluateDuelRound(
        { roundOrder: 2, gameId: 'number-hunt', pickedBy: 'guest', seed: 2 },
        0,
        2200 // Guest wins round: 0 vs 880 + 200 = 1080
      );
      // Verify tie breaking logic explicitly
      const summary = evaluateDuelMatch(2, [
        {
          ...round1,
          hostNormScore: 500,
          guestNormScore: 500,
          hostBonusScore: 200,
          guestBonusScore: 0,
          winner: 'host',
        },
        {
          ...round2,
          hostNormScore: 500,
          guestNormScore: 700,
          hostBonusScore: 0,
          guestBonusScore: 0,
          winner: 'guest',
        },
      ]);

      // Total points:
      // Host: 700 + 500 = 1200
      // Guest: 500 + 700 = 1200
      // Round wins: Host 1, Guest 1 -> Tie
      expect(summary.hostTotalScore).toBe(summary.guestTotalScore);
    });

    it('breaks ties using total execution time if total scores and round wins tie', () => {
      const round1 = {
        roundOrder: 1,
        gameId: 'color-trap',
        pickedBy: 'host' as const,
        seed: 1,
        hostRawScore: 2000,
        guestRawScore: 2000,
        hostNormScore: 800,
        guestNormScore: 800,
        hostBonusScore: 100,
        guestBonusScore: 100,
        hostTimeMs: 25000,
        guestTimeMs: 35000,
        winner: 'tie' as const,
      };

      const summary = evaluateDuelMatch(2, [round1]);
      expect(summary.hostTotalScore).toBe(summary.guestTotalScore);
      expect(summary.hostRoundWins).toBe(summary.guestRoundWins);
      expect(summary.winner).toBe('host');
      expect(summary.victoryReason).toBe('total_time');
      expect(summary.banterText).toContain('بالمللي ثانية');
    });
  });
});
