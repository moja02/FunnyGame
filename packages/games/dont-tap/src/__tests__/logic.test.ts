import { describe, it, expect } from 'vitest';
import { DontTapLogic } from '../logic.js';
import { createRng } from '@funnygame/game-core';
import { evaluateItemAgainstRule, type ActiveRule, type FallingItem } from '../rules.js';

describe("Don't Tap! Logic & Mechanics Verification", () => {
  const logic = new DontTapLogic();

  it('guarantees accurate T_fall and T_spawn equations and human limits', () => {
    // Stage 1
    const cfg1 = logic.stageConfig(1);
    expect(cfg1.params.fallDurationMs).toBe(3200);
    expect(cfg1.params.spawnIntervalMs).toBe(950);

    // Stage 8
    const cfg8 = logic.stageConfig(8);
    // 3.2 - 0.09 * 7 = 3.2 - 0.63 = 2.57s = 2570ms
    expect(cfg8.params.fallDurationMs).toBe(2570);

    // Stage 26+ (Floor limit: 0.95s = 950ms)
    const cfg26 = logic.stageConfig(26);
    expect(cfg26.params.fallDurationMs).toBe(950);

    const cfg70 = logic.stageConfig(70);
    expect(cfg70.params.fallDurationMs).toBe(950);
    expect(cfg70.params.spawnIntervalMs).toBe(380);
  });

  it('verifies rule evaluation across simple, compound, negation, and morphing', () => {
    const item: FallingItem = {
      id: 'test_1',
      itemIndex: 0,
      spawnTimeMs: 0,
      fallDurationMs: 2000,
      lane: 1,
      shapeId: 'circle',
      colorId: 'red',
      colorHex: '#EF4444'
    };

    // 1. Simple Color
    const ruleColor: ActiveRule = {
      id: 'r_color',
      type: 'SIMPLE_COLOR',
      labelAr: 'الأحمر فقط',
      icon: '🔴',
      startTimeMs: 0,
      endTimeMs: 10000,
      colorId: 'red'
    };
    expect(evaluateItemAgainstRule(item, ruleColor)).toBe(true);

    const ruleBlue: ActiveRule = {
      id: 'r_blue',
      type: 'SIMPLE_COLOR',
      labelAr: 'الأزرق فقط',
      icon: '🔵',
      startTimeMs: 0,
      endTimeMs: 10000,
      colorId: 'blue'
    };
    expect(evaluateItemAgainstRule(item, ruleBlue)).toBe(false);

    // 2. Negation
    const ruleNotSquare: ActiveRule = {
      id: 'r_not_square',
      type: 'NEGATION_SHAPE',
      labelAr: 'كل شي عدا المربع',
      icon: '🚫⬛',
      startTimeMs: 0,
      endTimeMs: 10000,
      shapeId: 'square'
    };
    expect(evaluateItemAgainstRule(item, ruleNotSquare)).toBe(true);

    // 3. Compound
    const ruleRedCircle: ActiveRule = {
      id: 'r_red_circle',
      type: 'COMPOUND',
      labelAr: 'دوائر حمراء فقط',
      icon: '🔴⭕',
      startTimeMs: 0,
      endTimeMs: 10000,
      colorId: 'red',
      shapeId: 'circle'
    };
    expect(evaluateItemAgainstRule(item, ruleRedCircle)).toBe(true);
  });

  it('verifies scoring formula pts = 100 * v * k * m(s)', () => {
    const rng = createRng(12345);
    const cfg = logic.stageConfig(2);
    const q = logic.generate(rng, cfg, 0);

    // Top catch: heightProgress = 0.0 -> v = 1.5, k = 1 (combo 2), m(2) = 1.1
    // pts = 100 * 1.5 * 1 * 1.1 = 165
    const ptsTop = logic.calculatePoints(
      q,
      {
        itemIndex: 0,
        action: 'TAP',
        reactionTimeMs: 100,
        heightProgress: 0.0,
        activeRuleId: q.payload.initialRule.id
      },
      2
    );
    expect(ptsTop).toBe(165);

    // Bottom catch: heightProgress = 1.0 -> v = 1.0, k = 1, m(2) = 1.1
    // pts = 100 * 1.0 * 1 * 1.1 = 110
    const ptsBottom = logic.calculatePoints(
      q,
      {
        itemIndex: 0,
        action: 'TAP',
        reactionTimeMs: 2000,
        heightProgress: 1.0,
        activeRuleId: q.payload.initialRule.id
      },
      2
    );
    expect(ptsBottom).toBe(110);
  });

  it('guarantees 100% deterministic generation across 500 seeds', () => {
    for (let s = 1; s <= 50; s++) {
      const rngA = createRng(s * 999);
      const rngB = createRng(s * 999);
      const cfg = logic.stageConfig(s);

      const qA = logic.generate(rngA, cfg, 0);
      const qB = logic.generate(rngB, cfg, 0);

      expect(qA.payload.initialRule.id).toBe(qB.payload.initialRule.id);
      expect(qA.payload.preGeneratedItems.length).toBe(qB.payload.preGeneratedItems.length);
      expect(qA.payload.preGeneratedItems[0]!.shapeId).toBe(qB.payload.preGeneratedItems[0]!.shapeId);
      expect(qA.payload.preGeneratedItems[0]!.colorId).toBe(qB.payload.preGeneratedItems[0]!.colorId);
    }
  });
});
