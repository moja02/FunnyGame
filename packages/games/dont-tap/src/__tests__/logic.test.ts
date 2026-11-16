import { describe, it, expect } from 'vitest';
import { DontTapLogic } from '../logic.js';
import { createRng } from '@funnygame/game-core';
import { evaluateItemAgainstRule, type ActiveRule, type FallingItem } from '../rules.js';

describe("Don't Tap! Logic & Mechanics Verification", () => {
  const logic = new DontTapLogic();

  it('guarantees accurate T_fall, T_spawn, and T_stage equations and human limits', () => {
    // Stage 1
    const cfg1 = logic.stageConfig(1);
    expect(cfg1.params.fallDurationMs).toBe(3200);
    expect(cfg1.params.spawnIntervalMs).toBe(950);
    // T_stage = max(16.0, round_0.5(5 * 0.95 * 3.5 + 3.2 + 4.0)) = 24.0s = 24000ms
    expect(cfg1.timeLimitMs).toBe(24000);

    // Stage 8
    const cfg8 = logic.stageConfig(8);
    // 3.2 - 0.09 * 7 = 3.2 - 0.63 = 2.57s = 2570ms
    expect(cfg8.params.fallDurationMs).toBe(2570);

    // Stage 26+ (Floor limits: T_fall = 0.95s, T_spawn = 0.38s, T_stage = 16.0s)
    const cfg26 = logic.stageConfig(26);
    expect(cfg26.params.fallDurationMs).toBe(950);
    expect(cfg26.timeLimitMs).toBe(16000);

    const cfg70 = logic.stageConfig(70);
    expect(cfg70.params.fallDurationMs).toBe(950);
    expect(cfg70.params.spawnIntervalMs).toBe(380);
    expect(cfg70.timeLimitMs).toBe(16000);
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

  it('verifies scoring formula pts = Base * v * k * m(s) matching specification table', () => {
    const rng = createRng(12345);

    // Example 1: Stage 2, Early catch at height 75% (heightProgress = 0.25), combo 2
    // Base = 100, v = 1.0 + 0.5 * 0.75 = 1.375, k = 1, m = 1 + 0.1 * 1 = 1.1 -> 151 pts
    const cfg2 = logic.stageConfig(2);
    const q2 = logic.generate(rng, cfg2, 0);
    const ptsEarly = logic.calculatePoints(
      q2,
      {
        itemIndex: 0,
        action: 'TAP',
        reactionTimeMs: 500,
        heightProgress: 0.25,
        activeRuleId: q2.payload.initialRule.id
      },
      2
    );
    expect(ptsEarly).toBe(151);

    // Example 2: Stage 2, Late catch at height 20% (heightProgress = 0.80), combo 0
    // Base = 70, v = 1.0 + 0.5 * 0.20 = 1.100, k = 1, m = 1.1 -> 85 pts
    const ptsLate = logic.calculatePoints(
      q2,
      {
        itemIndex: 0,
        action: 'TAP',
        reactionTimeMs: 1800,
        heightProgress: 0.80,
        activeRuleId: q2.payload.initialRule.id
      },
      0
    );
    expect(ptsLate).toBe(85);

    // Example 3: Stage 32, Advanced catch at height 90% (heightProgress = 0.10), combo 15
    // Base = 100, v = 1.0 + 0.5 * 0.90 = 1.450, k = 3, m = 3.4 + 0.15 * 7 = 4.45 -> 1936 pts
    const cfg32 = logic.stageConfig(32);
    const q32 = logic.generate(rng, cfg32, 0);
    const ptsAdvanced = logic.calculatePoints(
      q32,
      {
        itemIndex: 0,
        action: 'TAP',
        reactionTimeMs: 200,
        heightProgress: 0.10,
        activeRuleId: q32.payload.initialRule.id
      },
      15
    );
    expect(ptsAdvanced).toBe(1936);

    // MISS returns -50 points
    const ptsMiss = logic.calculatePoints(
      q2,
      {
        itemIndex: 0,
        action: 'MISS',
        reactionTimeMs: 2000,
        heightProgress: 1.0,
        activeRuleId: q2.payload.initialRule.id
      }
    );
    expect(ptsMiss).toBe(-50);
  });

  it('verifies miss penalty rules and anti-AFK behavior', () => {
    const rng = createRng(54321);
    const cfg = logic.stageConfig(1);
    const q = logic.generate(rng, cfg, 0);

    // 1st miss: warning, breaks combo, costs 0 hearts
    const verdict1stMiss = logic.evaluate(q, {
      itemIndex: 0,
      action: 'MISS',
      reactionTimeMs: 3200,
      heightProgress: 1.0,
      activeRuleId: q.payload.initialRule.id,
      consecutiveMisses: 1,
      stageTotalMisses: 1,
      isStageFirstMiss: true
    });
    expect(verdict1stMiss.correct).toBe(false);
    expect(verdict1stMiss.breaksCombo).toBe(true);
    expect(verdict1stMiss.heartCost).toBe(0);

    // 2nd consecutive miss: costs 1 heart!
    const verdict2ndMiss = logic.evaluate(q, {
      itemIndex: 1,
      action: 'MISS',
      reactionTimeMs: 3200,
      heightProgress: 1.0,
      activeRuleId: q.payload.initialRule.id,
      consecutiveMisses: 2,
      stageTotalMisses: 2,
      isStageFirstMiss: false
    });
    expect(verdict2ndMiss.correct).toBe(false);
    expect(verdict2ndMiss.breaksCombo).toBe(true);
    expect(verdict2ndMiss.heartCost).toBe(1);

    // Stage timeout: costs 1 heart!
    const verdictTimeout = logic.evaluate(q, {
      itemIndex: 0,
      action: 'STAGE_TIMEOUT',
      reactionTimeMs: 12500,
      heightProgress: 1.0,
      activeRuleId: q.payload.initialRule.id
    });
    expect(verdictTimeout.correct).toBe(false);
    expect(verdictTimeout.breaksCombo).toBe(true);
    expect(verdictTimeout.heartCost).toBe(1);
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
