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

    // Example 2: Stage 14, Middle catch at height 80% (heightProgress = 0.20), combo 8
    // Base = 100, v = 1.0 + 0.5 * 0.80 = 1.400, k = 2, m = 1 + 0.1 * 13 = 2.3 -> 644 pts
    const cfg14 = logic.stageConfig(14);
    const q14 = logic.generate(rng, cfg14, 0);
    const ptsMiddle = logic.calculatePoints(
      q14,
      {
        itemIndex: 0,
        action: 'TAP',
        reactionTimeMs: 400,
        heightProgress: 0.20,
        activeRuleId: q14.payload.initialRule.id
      },
      8
    );
    expect(ptsMiddle).toBe(644);

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

    // MISS returns 0 points (Spec 2: لا يوجد خصم نقاط عند التفويت)
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
    expect(ptsMiss).toBe(0);
  });

  it('verifies miss penalty rules and anti-AFK behavior (Spec Update 2)', () => {
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

    // 2nd miss in stage: breaks combo only, costs 0 hearts!
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
    expect(verdict2ndMiss.heartCost).toBe(0);

    // 3rd miss in stage: costs 1 heart!
    const verdict3rdMiss = logic.evaluate(q, {
      itemIndex: 2,
      action: 'MISS',
      reactionTimeMs: 3200,
      heightProgress: 1.0,
      activeRuleId: q.payload.initialRule.id,
      consecutiveMisses: 3,
      stageTotalMisses: 3,
      isStageFirstMiss: false
    });
    expect(verdict3rdMiss.correct).toBe(false);
    expect(verdict3rdMiss.breaksCombo).toBe(true);
    expect(verdict3rdMiss.heartCost).toBe(1);

    // 600ms grace window on rule switch
    const matchingPrevItem = q.payload.preGeneratedItems.find((it) =>
      evaluateItemAgainstRule(it, q.payload.initialRule, 0.3)
    )!;
    const verdictGrace = logic.evaluate(q, {
      itemIndex: matchingPrevItem.itemIndex,
      action: 'TAP',
      reactionTimeMs: 250,
      heightProgress: 0.3,
      activeRuleId: 'other_rule',
      previousRuleId: q.payload.initialRule.id,
      timeSinceRuleSwitchMs: 580 // within 600ms
    });
    expect(verdictGrace.correct).toBe(true);
    expect(verdictGrace.heartCost).toBe(0);

    // Stage timeout: costs 1 heart!
    const verdictTimeout = logic.evaluate(q, {
      itemIndex: 0,
      action: 'STAGE_TIMEOUT',
      reactionTimeMs: 24000,
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
