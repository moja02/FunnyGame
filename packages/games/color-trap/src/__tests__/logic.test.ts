import { describe, it, expect } from 'vitest';
import { colorTrapLogic } from '../logic.js';
import { createRng } from '@funnygame/game-core';

describe('ColorTrapLogic - Strict Architectural Solvability & Rules', () => {
  it('guarantees 100% solvability across 10,000 consecutive seeds', () => {
    // 10,000 Seeds Verification
    const SEED_COUNT = 10000;

    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const rng = createRng(seed);
      // Sample stages from warmup (1) up to endless (120)
      const stage = (seed % 100) + 1;
      const cfg = colorTrapLogic.stageConfig(stage);
      const question = colorTrapLogic.generate(rng, cfg, seed);

      const { payload } = question;

      // 1. Must always produce exactly 4 options
      expect(payload.options).toHaveLength(4);

      // 2. All 4 option IDs must be strictly unique (no duplicate choices)
      const uniqueIds = new Set(payload.options.map((o) => o.id));
      expect(uniqueIds.size).toBe(4);

      // 3. Correct answer must always be present in the 4 options
      const hasCorrectAnswer = payload.options.some((o) => o.id === payload.correctAnswerId);
      expect(hasCorrectAnswer).toBe(true);

      // 4. Evaluating correct answer must produce correct: true
      const correctVerdict = colorTrapLogic.evaluate(question, payload.correctAnswerId);
      expect(correctVerdict.correct).toBe(true);
      expect(correctVerdict.heartCost).toBe(0);
      expect(correctVerdict.breaksCombo).toBe(false);

      // 5. Evaluating any other option must produce correct: false, heartCost: 1
      const wrongOption = payload.options.find((o) => o.id !== payload.correctAnswerId)!;
      const wrongVerdict = colorTrapLogic.evaluate(question, wrongOption.id);
      expect(wrongVerdict.correct).toBe(false);
      expect(wrongVerdict.heartCost).toBe(1);
      expect(wrongVerdict.breaksCombo).toBe(true);

      // 6. Evaluating timeout (null) must produce correct: false, heartCost: 1
      const timeoutVerdict = colorTrapLogic.evaluate(question, null);
      expect(timeoutVerdict.correct).toBe(false);
      expect(timeoutVerdict.heartCost).toBe(1);
      expect(timeoutVerdict.breaksCombo).toBe(true);
    }
  });

  it('strictly adheres to time limit floor (800ms) at stage 23 and beyond', () => {
    expect(colorTrapLogic.stageConfig(1).timeLimitMs).toBe(3000);
    expect(colorTrapLogic.stageConfig(2).timeLimitMs).toBe(2900);
    expect(colorTrapLogic.stageConfig(22).timeLimitMs).toBe(900);
    expect(colorTrapLogic.stageConfig(23).timeLimitMs).toBe(800);
    expect(colorTrapLogic.stageConfig(24).timeLimitMs).toBe(800);
    expect(colorTrapLogic.stageConfig(25).timeLimitMs).toBe(800);

    // Two-word reading buffer in stages 26-35
    expect(colorTrapLogic.stageConfig(26).timeLimitMs).toBe(1000);
    expect(colorTrapLogic.stageConfig(35).timeLimitMs).toBe(1000);
    expect(colorTrapLogic.stageConfig(36).timeLimitMs).toBe(900);

    // 800ms maintained in legend and endless
    expect(colorTrapLogic.stageConfig(46).timeLimitMs).toBe(800);
    expect(colorTrapLogic.stageConfig(70).timeLimitMs).toBe(800);
    expect(colorTrapLogic.stageConfig(150).timeLimitMs).toBe(800);
  });

  it('marks every multiple of 5 as a Boss stage', () => {
    expect(colorTrapLogic.stageConfig(5).isBoss).toBe(true);
    expect(colorTrapLogic.stageConfig(10).isBoss).toBe(true);
    expect(colorTrapLogic.stageConfig(15).isBoss).toBe(true);
    expect(colorTrapLogic.stageConfig(20).isBoss).toBe(true);
    expect(colorTrapLogic.stageConfig(25).isBoss).toBe(true);
    expect(colorTrapLogic.stageConfig(70).isBoss).toBe(true);

    // Breathing stages are not boss
    expect(colorTrapLogic.stageConfig(6).isBoss).toBe(false);
    expect(colorTrapLogic.stageConfig(11).isBoss).toBe(false);
    expect(colorTrapLogic.stageConfig(21).isBoss).toBe(false);
  });
});
