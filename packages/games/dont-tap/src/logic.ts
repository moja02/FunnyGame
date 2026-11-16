/**
 * DontTapLogic - Pure Deterministic Engine for Don't Tap! (لا تضغط!)
 * Implements 70+ stages, falling speed, rule timelines, Stroop traps,
 * morphing, zig-zag lane switching, counting, and CIELAB-aligned scoring.
 */

import type {
  GameLogic,
  StageConfig,
  Question,
  Verdict,
  Rng,
  Tier,
  Ability
} from '@funnygame/game-core';
import { DONT_TAP_COLORS, DONT_TAP_SHAPES } from './shapes.js';
import {
  type FallingItem,
  type ActiveRule,
  evaluateItemAgainstRule
} from './rules.js';

export interface DontTapQuestionPayload {
  stage: number;
  tier: Tier;
  isBoss: boolean;
  fallDurationMs: number;
  spawnIntervalMs: number;
  ruleDurationMs: number;
  isSilentSwitch: boolean;
  introCardAr?: string;
  initialRule: ActiveRule;
  upcomingRules: ActiveRule[];
  preGeneratedItems: FallingItem[];
}

export interface DontTapAnswerInput {
  itemIndex: number;
  action: 'TAP' | 'MISS' | 'PASS' | 'STAGE_TIMEOUT';
  reactionTimeMs: number;
  heightProgress: number; // 0.0 at top, 1.0 at bottom
  activeRuleId: string;
  previousRuleId?: string;
  timeSinceRuleSwitchMs?: number;
  isStageFirstMiss?: boolean;
  consecutiveMisses?: number;
  stageTotalMisses?: number;
}

export class DontTapLogic
  implements GameLogic<DontTapQuestionPayload, DontTapAnswerInput>
{
  readonly id = 'dont-tap';
  readonly ability: Ability = 'speed';
  readonly basePoints = 100;
  readonly questionsPerStage = 5;
  readonly isContinuous = true;

  /**
   * Stage Configs (1 to 70+)
   */
  stageConfig(stage: number): StageConfig {
    const s = Math.max(1, stage);
    let tier: Tier = 'warmup';
    if (s <= 10) tier = 'warmup';
    else if (s <= 25) tier = 'hard';
    else if (s <= 45) tier = 'expert';
    else if (s <= 70) tier = 'legend';
    else tier = 'endless';

    const isBoss = s % 5 === 0;

    // T_fall = max(0.95, 3.2 - 0.09 * (s - 1))
    const fallDurationMs = Math.round(
      Math.max(0.95, 3.2 - 0.09 * (s - 1)) * 1000
    );

    // T_spawn = max(0.38, 0.95 - 0.02 * (s - 1))
    const spawnIntervalMs = Math.round(
      Math.max(0.38, 0.95 - 0.02 * (s - 1)) * 1000
    );

    // Rule duration T_rule
    let ruleDurationSec = 10.0;
    if (s <= 4) ruleDurationSec = 10.0;
    else if (s === 5) ruleDurationSec = 8.0;
    else if (s === 6) ruleDurationSec = 11.0;
    else if (s <= 9) ruleDurationSec = 9.0;
    else if (s === 10) ruleDurationSec = 7.0;
    else if (s === 11) ruleDurationSec = 10.0;
    else if (s <= 14) ruleDurationSec = 8.0;
    else if (s === 15) ruleDurationSec = 6.5;
    else if (s === 16) ruleDurationSec = 9.0;
    else if (s <= 19) ruleDurationSec = 6.5;
    else if (s === 20) ruleDurationSec = 6.0;
    else if (s <= 25) ruleDurationSec = 5.5;
    else if (s <= 35) ruleDurationSec = 4.5;
    else if (s <= 45) ruleDurationSec = 4.0;
    else if (s <= 55) ruleDurationSec = 4.5;
    else if (s <= 60) ruleDurationSec = 4.0;
    else if (s <= 70) ruleDurationSec = 3.8;
    else {
      // 71+ Endless
      ruleDurationSec = Math.max(2.8, 3.8 - 0.02 * (s - 70));
    }

    // Fair human stage duration: 5 targets * T_spawn * 3.5 + T_fall + human buffer
    const isBreathing = [6, 11, 16, 21, 31, 36, 41, 46].includes(s);
    const extraStageSec = isBreathing ? 4.0 : 0.0;
    const rawStageSec = 5 * (spawnIntervalMs / 1000) * 3.5 + (fallDurationMs / 1000) + 4.0 + extraStageSec;
    const stageDurationSec = Math.max(16.0, Math.round(rawStageSec * 2) / 2);
    const stageTimeLimitMs = Math.round(stageDurationSec * 1000);

    return {
      stage: s,
      tier,
      timeLimitMs: stageTimeLimitMs,
      isBoss,
      params: {
        fallDurationMs,
        spawnIntervalMs,
        stageTimeLimitMs,
        ruleDurationMs: Math.round(ruleDurationSec * 1000),
        isSilentSwitch: s >= 20
      }
    };
  }

  /**
   * Deterministic Question Generator
   */
  generate(
    rng: Rng,
    cfg: StageConfig,
    qIndex: number
  ): Question<DontTapQuestionPayload> {
    const s = cfg.stage;
    const fallDurationMs = Number(cfg.params.fallDurationMs || 3200);
    const spawnIntervalMs = Number(cfg.params.spawnIntervalMs || 950);
    const ruleDurationMs = Number(cfg.params.ruleDurationMs || 10000);
    const isSilentSwitch = s >= 20;

    // Intro Card definitions
    let introCardAr: string | undefined = undefined;
    if (qIndex === 0) {
      if (s === 1) introCardAr = 'اضغط على المطلوب بس، وسيّب الباقي ينزل!';
      else if (s === 5) introCardAr = 'القاعدة تتبدل أسرع، عينك فوق!';
      else if (s === 7) introCardAr = 'الشرط صار مزدوج: لازم يطابق اللون والشكل!';
      else if (s === 12) introCardAr = 'انتبه للنفي! اضغط كل شي عدا الممنوع.';
      else if (s === 17) introCardAr = 'لا تنخدع بالكلمة المكتوبة جوا الشكل!';
      else if (s === 20) introCardAr = 'من توّا القاعدة تتبدل بدون صوت أو تنبيه!';
      else if (s === 26) introCardAr = 'ثلاث شروط مع بعض، اقرأ القاعدة بدقة!';
      else if (s === 31) introCardAr = 'الأشكال صارت تغيّر مسارها في النص!';
      else if (s === 36) introCardAr = 'الشكل يتغير لونه في نص الطريق، احكم عليه بعد ما يتغير!';
      else if (s === 46) introCardAr = 'عدّ الأشكال! اضغط الثاني وسيّب الأول.';
      else if (s === 56) introCardAr = 'بالتناوب! مرة هذا ومرة هذا.';
    }

    // Generate Rules Sequence for this question/wave
    const rules = this.generateRuleSequence(rng, s, ruleDurationMs, 4);
    const initialRule = rules[0]!;
    const upcomingRules = rules.slice(1);

    // Generate a pool of falling items
    const preGeneratedItems = this.generateItems(
      rng,
      s,
      initialRule,
      fallDurationMs,
      spawnIntervalMs,
      25
    );

    return {
      index: qIndex,
      stage: s,
      timeLimitMs: cfg.timeLimitMs,
      payload: {
        stage: s,
        tier: cfg.tier,
        isBoss: cfg.isBoss,
        fallDurationMs,
        spawnIntervalMs,
        ruleDurationMs,
        isSilentSwitch,
        introCardAr,
        initialRule,
        upcomingRules,
        preGeneratedItems
      }
    };
  }

  /**
   * Generates deterministic sequence of rules matching stage difficulty
   */
  private generateRuleSequence(
    rng: Rng,
    stage: number,
    durationMs: number,
    count: number
  ): ActiveRule[] {
    const list: ActiveRule[] = [];
    let curTime = 0;

    for (let i = 0; i < count; i++) {
      const rule = this.createStageRule(rng, stage, curTime, curTime + durationMs, i);
      list.push(rule);
      curTime += durationMs;
    }

    return list;
  }

  /**
   * Factory for creating a single rule based on stage mechanics
   */
  private createStageRule(
    rng: Rng,
    s: number,
    startMs: number,
    endMs: number,
    ruleIndex: number
  ): ActiveRule {
    const ruleId = `rule_${s}_${ruleIndex}_${startMs}`;

    // Stages 1-6: Simple (color or shape)
    if (s <= 6) {
      const isColor = rng.next() > 0.5;
      if (isColor) {
        const color = rng.pick(DONT_TAP_COLORS);
        return {
          id: ruleId,
          type: 'SIMPLE_COLOR',
          labelAr: `اضغط على ${color.nameAr} فقط`,
          icon: color.icon,
          startTimeMs: startMs,
          endTimeMs: endMs,
          colorId: color.id
        };
      } else {
        const shape = rng.pick(DONT_TAP_SHAPES);
        return {
          id: ruleId,
          type: 'SIMPLE_SHAPE',
          labelAr: `اضغط على ${shape.nameAr} فقط`,
          icon: shape.icon,
          startTimeMs: startMs,
          endTimeMs: endMs,
          shapeId: shape.id
        };
      }
    }

    // Stages 7-11: Compound (color + shape)
    if (s <= 11) {
      const color = rng.pick(DONT_TAP_COLORS);
      const shape = rng.pick(DONT_TAP_SHAPES);
      return {
        id: ruleId,
        type: 'COMPOUND',
        labelAr: `${shape.nameAr} ${color.nameAr} فقط`,
        icon: `${color.icon}${shape.icon}`,
        startTimeMs: startMs,
        endTimeMs: endMs,
        colorId: color.id,
        shapeId: shape.id
      };
    }

    // Stages 12-16: Negation
    if (s <= 16) {
      if (s === 15) {
        // Compound Negation
        const color = rng.pick(DONT_TAP_COLORS);
        const shape = rng.pick(DONT_TAP_SHAPES);
        return {
          id: ruleId,
          type: 'NEGATION_COMPOUND',
          labelAr: `كل شي عدا ${shape.nameAr} ${color.nameAr}`,
          icon: `🚫${color.icon}${shape.icon}`,
          startTimeMs: startMs,
          endTimeMs: endMs,
          colorId: color.id,
          shapeId: shape.id
        };
      }
      const isColor = rng.next() > 0.5;
      if (isColor) {
        const color = rng.pick(DONT_TAP_COLORS);
        return {
          id: ruleId,
          type: 'NEGATION_COLOR',
          labelAr: `كل شي عدا ${color.nameAr}`,
          icon: `🚫${color.icon}`,
          startTimeMs: startMs,
          endTimeMs: endMs,
          colorId: color.id
        };
      } else {
        const shape = rng.pick(DONT_TAP_SHAPES);
        return {
          id: ruleId,
          type: 'NEGATION_SHAPE',
          labelAr: `كل شي عدا ${shape.nameAr}`,
          icon: `🚫${shape.icon}`,
          startTimeMs: startMs,
          endTimeMs: endMs,
          shapeId: shape.id
        };
      }
    }

    // Stages 17-25: Stroop & fast switching
    if (s <= 25) {
      const color = rng.pick(DONT_TAP_COLORS);
      const shape = rng.pick(DONT_TAP_SHAPES);
      return {
        id: ruleId,
        type: 'COMPOUND',
        labelAr: `${shape.nameAr} ${color.nameAr} فقط (انتبه للكلمة)`,
        icon: `${color.icon}${shape.icon}`,
        startTimeMs: startMs,
        endTimeMs: endMs,
        colorId: color.id,
        shapeId: shape.id
      };
    }

    // Stages 26-30: Triple condition
    if (s <= 30) {
      const col1 = rng.pick(DONT_TAP_COLORS);
      const col2 = rng.pick(DONT_TAP_COLORS.filter((c) => c.id !== col1.id));
      const forbidden = rng.pick(DONT_TAP_SHAPES);
      return {
        id: ruleId,
        type: 'TRIPLE_CONDITION',
        labelAr: `${col1.nameAr} أو ${col2.nameAr}، عدا ${forbidden.nameAr}`,
        icon: `${col1.icon}${col2.icon}🚫${forbidden.icon}`,
        startTimeMs: startMs,
        endTimeMs: endMs,
        allowedColorIds: [col1.id, col2.id],
        forbiddenShapeId: forbidden.id
      };
    }

    // Stages 46-55: Count rule
    if (s >= 46 && s <= 55) {
      const color = rng.pick(DONT_TAP_COLORS);
      const targetRank = s <= 50 ? 2 : 3;
      return {
        id: ruleId,
        type: 'COUNT_RULE',
        labelAr: `اضغط على ${targetRank === 2 ? 'ثاني' : 'ثالث'} شكل ${color.nameAr} فقط`,
        icon: `${targetRank === 2 ? '2️⃣' : '3️⃣'}${color.icon}`,
        startTimeMs: startMs,
        endTimeMs: endMs,
        colorId: color.id,
        countCategory: 'color',
        targetRank
      };
    }

    // Stages 56-60: Alternating
    if (s >= 56 && s <= 60) {
      const colA = rng.pick(DONT_TAP_COLORS);
      const colB = rng.pick(DONT_TAP_COLORS.filter((c) => c.id !== colA.id));
      return {
        id: ruleId,
        type: 'ALTERNATING',
        labelAr: `بالتناوب: ${colA.nameAr} ثم ${colB.nameAr}`,
        icon: `🔄${colA.icon}${colB.icon}`,
        startTimeMs: startMs,
        endTimeMs: endMs,
        alternatingColors: [colA.id, colB.id]
      };
    }

    // Default / High stages fallback: Compound with Negation
    const color = rng.pick(DONT_TAP_COLORS);
    const shape = rng.pick(DONT_TAP_SHAPES);
    return {
      id: ruleId,
      type: 'COMPOUND',
      labelAr: `${shape.nameAr} ${color.nameAr} فقط`,
      icon: `${color.icon}${shape.icon}`,
      startTimeMs: startMs,
      endTimeMs: endMs,
      colorId: color.id,
      shapeId: shape.id
    };
  }

  /**
   * Generates a batch of deterministic falling items
   */
  private generateItems(
    rng: Rng,
    stage: number,
    rule: ActiveRule,
    fallDurationMs: number,
    spawnIntervalMs: number,
    itemCount: number
  ): FallingItem[] {
    const items: FallingItem[] = [];
    const laneLastSpawnTime: [number, number, number] = [-9999, -9999, -9999];
    let spawnTime = 0;
    let consecutiveNonMatches = 0;

    for (let i = 0; i < itemCount; i++) {
      // Pick available lane respecting min 450ms gap
      const candidateLanes: (0 | 1 | 2)[] = ([0, 1, 2] as const).filter(
        (l) => spawnTime - (laneLastSpawnTime[l] ?? -9999) >= 450
      );
      const lane = candidateLanes.length > 0 ? rng.pick(candidateLanes) : (rng.nextInt(0, 2) as 0 | 1 | 2);
      laneLastSpawnTime[lane] = spawnTime;

      // 40% - 50% target matching density guarantee
      let shouldMatch = rng.next() < 0.45;
      if (consecutiveNonMatches >= 3) {
        shouldMatch = true;
      }

      let shape = rng.pick(DONT_TAP_SHAPES);
      let color = rng.pick(DONT_TAP_COLORS);

      // Enforce match or mismatch based on initial rule
      if (shouldMatch) {
        if (rule.colorId) {
          const matched = DONT_TAP_COLORS.find((c) => c.id === rule.colorId);
          if (matched) color = matched;
        }
        if (rule.shapeId) {
          const matched = DONT_TAP_SHAPES.find((s) => s.id === rule.shapeId);
          if (matched) shape = matched;
        }
        consecutiveNonMatches = 0;
      } else {
        // Enforce true distractor: must NOT match rule condition
        if (rule.colorId && !rule.shapeId) {
          const nonMatchingColors = DONT_TAP_COLORS.filter((c) => c.id !== rule.colorId);
          color = rng.pick(nonMatchingColors);
        } else if (rule.shapeId && !rule.colorId) {
          const nonMatchingShapes = DONT_TAP_SHAPES.filter((s) => s.id !== rule.shapeId);
          shape = rng.pick(nonMatchingShapes);
        } else if (rule.colorId && rule.shapeId) {
          if (rng.next() > 0.5) {
            const nonMatchingColors = DONT_TAP_COLORS.filter((c) => c.id !== rule.colorId);
            color = rng.pick(nonMatchingColors);
          } else {
            const nonMatchingShapes = DONT_TAP_SHAPES.filter((s) => s.id !== rule.shapeId);
            shape = rng.pick(nonMatchingShapes);
          }
        }
        consecutiveNonMatches++;
      }

      // Stroop distractor text for stages 17+
      let stroopText: string | undefined = undefined;
      let stroopColorHex: string | undefined = undefined;
      if (stage >= 17 && rng.next() > 0.4) {
        const falseColor = rng.pick(DONT_TAP_COLORS.filter((c) => c.id !== color.id));
        stroopText = falseColor.nameAr;
        stroopColorHex = '#FFFFFF';
      }

      // Zig-Zag lane switching for stages 31+
      let isZigZag = false;
      let zigzagTargetLane: 0 | 1 | 2 | undefined = undefined;
      if (stage >= 31 && rng.next() > 0.5) {
        isZigZag = true;
        const available = ([0, 1, 2] as (0 | 1 | 2)[]).filter((l) => l !== lane);
        zigzagTargetLane = rng.pick(available);
      }

      // Morphing for stages 36+
      let isMorphing = false;
      let morphedShapeId: string | undefined = undefined;
      let morphedColorId: string | undefined = undefined;
      let morphedColorHex: string | undefined = undefined;
      if (stage >= 36 && rng.next() > 0.4) {
        isMorphing = true;
        const nextShape = rng.pick(DONT_TAP_SHAPES.filter((s) => s.id !== shape.id));
        const nextColor = rng.pick(DONT_TAP_COLORS.filter((c) => c.id !== color.id));
        morphedShapeId = nextShape.id;
        morphedColorId = nextColor.id;
        morphedColorHex = nextColor.hex;
      }

      items.push({
        id: `item_${stage}_${i}`,
        itemIndex: i,
        spawnTimeMs: spawnTime,
        fallDurationMs,
        lane,
        shapeId: shape.id,
        colorId: color.id,
        colorHex: color.hex,
        stroopText,
        stroopColorHex,
        isZigZag,
        zigzagTargetLane,
        isMorphing,
        morphAtProgress: 0.5,
        morphedShapeId,
        morphedColorId,
        morphedColorHex
      });

      spawnTime += spawnIntervalMs;
    }

    return items;
  }

  /**
   * Evaluates Player's Input
   */
  evaluate(
    q: Question<DontTapQuestionPayload>,
    answer: DontTapAnswerInput | null
  ): Verdict {
    // If no answer input (unhandled event)
    if (!answer) {
      return {
        correct: false,
        heartCost: 0,
        breaksCombo: true
      };
    }

    // 0. STAGE_TIMEOUT action (player ran out of stage time T_stage without collecting 5 required targets)
    if (answer.action === 'STAGE_TIMEOUT') {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    // 1. MISS action (target item hit bottom miss line)
    if (answer.action === 'MISS') {
      // 1st miss: warning, breaks combo, -50 points, 0 heart cost.
      // 2nd consecutive miss OR 3rd miss in the same stage: costs 1 heart!
      const isSecondConsecutive = answer.consecutiveMisses !== undefined && answer.consecutiveMisses >= 2;
      const isThirdInStage = answer.stageTotalMisses !== undefined && answer.stageTotalMisses >= 3;
      const isHeartLoss =
        isSecondConsecutive ||
        isThirdInStage ||
        (answer.isStageFirstMiss === false && answer.consecutiveMisses === undefined);

      return {
        correct: false,
        heartCost: isHeartLoss ? 1 : 0,
        breaksCombo: true
      };
    }

    // 2. PASS action (distractor cleanly passed miss line)
    if (answer.action === 'PASS') {
      return {
        correct: true,
        heartCost: 0,
        breaksCombo: false
      };
    }

    // 3. TAP action
    const item = q.payload.preGeneratedItems.find((it) => it.itemIndex === answer.itemIndex);
    if (!item) {
      return { correct: false, heartCost: 1, breaksCombo: true };
    }

    const activeRule =
      q.payload.initialRule.id === answer.activeRuleId
        ? q.payload.initialRule
        : q.payload.upcomingRules.find((r) => r.id === answer.activeRuleId) || q.payload.initialRule;

    // Check 500ms grace window for recently switched rule
    if (
      answer.previousRuleId &&
      answer.timeSinceRuleSwitchMs !== undefined &&
      answer.timeSinceRuleSwitchMs <= 500
    ) {
      const prevRule =
        q.payload.initialRule.id === answer.previousRuleId
          ? q.payload.initialRule
          : q.payload.upcomingRules.find((r) => r.id === answer.previousRuleId);
      if (prevRule && evaluateItemAgainstRule(item, prevRule, answer.heightProgress)) {
        // Player tapped based on previous rule within 500ms grace window -> silently valid!
        return { correct: true, heartCost: 0, breaksCombo: false };
      }
    }

    const isMatch = evaluateItemAgainstRule(item, activeRule, answer.heightProgress);

    if (isMatch) {
      return {
        correct: true,
        heartCost: 0,
        breaksCombo: false
      };
    } else {
      // Wrong tap on distractor -> costs 1 heart and breaks combo
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }
  }

  /**
   * Unified Scoring Formula:
   * pts = Base * v * k * m(s)
   */
  calculatePoints(
    q: Question<DontTapQuestionPayload>,
    answer: DontTapAnswerInput,
    paramA?: number,
    paramB?: number
  ): number {
    if (answer.action === 'MISS') {
      return -50;
    }
    if (answer.action === 'STAGE_TIMEOUT' || answer.action === 'PASS') {
      return 0;
    }

    const s = q.stage;

    // Determine combo from parameters
    let combo = 1;
    if (typeof paramB === 'number') {
      combo = paramB;
    } else if (typeof paramA === 'number' && paramA <= 50) {
      combo = paramA;
    }

    // Base: 100 in upper two-thirds (heightProgress <= 0.67), 70 in lower third
    const isUpperTwoThirds = (answer.heightProgress || 0) <= 0.67;
    const base = isUpperTwoThirds ? 100 : 70;

    // v: Catch height multiplier (1.0 at bottom to 1.5 at top)
    const heightRatio = Math.max(0, Math.min(1.0, 1.0 - (answer.heightProgress || 0)));
    const v = 1.0 + 0.5 * heightRatio;

    // k: Combo multiplier (0-4: 1x, 5-9: 2x, 10+: 3x)
    let k = 1;
    if (combo >= 10) k = 3;
    else if (combo >= 5) k = 2;

    // m(s): Stage multiplier
    let m = 1 + 0.1 * (s - 1);
    if (s > 25) {
      m = 3.4 + 0.15 * (s - 25);
    }

    return Math.round(base * v * k * m);
  }
}
