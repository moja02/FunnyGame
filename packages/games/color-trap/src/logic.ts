import type { GameLogic, StageConfig, Question, Verdict, Rng, Tier } from '@funnygame/game-core';

export interface ColorItem {
  id: string;
  nameAr: string;
  hex: string;
  similarTo?: string;
}

export const ALL_COLORS: ColorItem[] = [
  { id: 'red', nameAr: 'أحمر', hex: '#ff4757', similarTo: 'orange' },
  { id: 'blue', nameAr: 'أزرق', hex: '#2e86de', similarTo: 'cyan' },
  { id: 'green', nameAr: 'أخضر', hex: '#10ac84', similarTo: 'lime' },
  { id: 'yellow', nameAr: 'أصفر', hex: '#feca57', similarTo: 'gold' },
  { id: 'purple', nameAr: 'بنفسجي', hex: '#8854d0' },
  { id: 'cyan', nameAr: 'سماوي', hex: '#48dbfb', similarTo: 'blue' },
  { id: 'orange', nameAr: 'برتقالي', hex: '#ee5253', similarTo: 'red' },
  { id: 'lime', nameAr: 'ليموني', hex: '#1dd1a1', similarTo: 'green' }
];

export type ColorTrapRule = 'INK_COLOR' | 'WORD_MEANING' | 'COMPOUND' | 'OPPOSITE_PREV';

export interface ColorTrapOption {
  id: string;
  labelAr: string;
  deceptiveBgHex?: string;
}

export interface ColorTrapQuestionPayload {
  rule: ColorTrapRule;
  ruleLabelAr: string;
  isSilentRule: boolean;

  // Single word
  wordText: string;
  wordHex: string;

  // Color shift
  shiftHex?: string;
  shiftDelayMs?: number;

  // Moving word
  isMoving: boolean;
  moveSpeedPxSec?: number;

  // Two words mode
  hasSecondWord?: boolean;
  secondWordText?: string;
  secondWordHex?: string;

  // 4 Choices
  options: ColorTrapOption[];
  correctAnswerId: string;
}

export class ColorTrapLogic implements GameLogic<ColorTrapQuestionPayload, string> {
  id = 'color-trap';
  ability: 'speed' = 'speed';
  basePoints = 100;
  questionsPerStage = 5;

  /**
   * Computes stage configuration according to 70+ stage specification
   */
  stageConfig(stage: number): StageConfig {
    const s = Math.max(1, stage);
    let tier: Tier = 'warmup';
    let timeLimitMs = 3000;
    const isBoss = s % 5 === 0;

    // 1. Tier determination
    if (s <= 10) tier = 'warmup';
    else if (s <= 25) tier = 'hard';
    else if (s <= 45) tier = 'expert';
    else if (s <= 70) tier = 'legend';
    else tier = 'endless';

    // 2. Time limit calculation (floor is 800ms reached at stage 23)
    if (s <= 22) {
      timeLimitMs = Math.max(800, 3000 - (s - 1) * 100);
    } else {
      timeLimitMs = 800;
    }

    // Two-word stages (26-40) grant +200ms visual scanning buffer
    if (s >= 26 && s <= 35) {
      timeLimitMs = 1000;
    } else if (s >= 36 && s <= 40) {
      timeLimitMs = 900;
    }

    // 3. Color pool size
    let poolSize = 4;
    if (s >= 6 && s <= 9) poolSize = 5;
    else if (s >= 10 && s <= 15) poolSize = 6;
    else if (s >= 16 && s <= 24) poolSize = 7;
    else if (s >= 25) poolSize = 8;

    // 4. Determine active rule type
    let ruleType: ColorTrapRule = 'INK_COLOR';
    if (s === 5) {
      ruleType = 'WORD_MEANING';
    } else if (s >= 6 && s <= 9) {
      ruleType = s % 2 === 0 ? 'INK_COLOR' : 'WORD_MEANING';
    } else if (s >= 10 && s <= 19) {
      ruleType = s % 2 === 0 ? 'WORD_MEANING' : 'INK_COLOR';
    } else if (s >= 20 && s <= 25) {
      ruleType = s % 2 === 0 ? 'INK_COLOR' : 'WORD_MEANING';
    } else if (s >= 26 && s <= 35) {
      ruleType = 'COMPOUND';
    } else if (s >= 36 && s <= 45) {
      ruleType = s % 2 === 0 ? 'INK_COLOR' : 'WORD_MEANING';
    } else if (s >= 56) {
      ruleType = 'OPPOSITE_PREV';
    }

    // Special mechanics flags
    const shuffleButtons = s >= 10;
    const deceptiveButtons = (s >= 20 && s <= 25) || (s >= 41 && s <= 45);
    const hasTwoWords = s >= 26 && s <= 35;
    const isMoving = s >= 46;
    const hasColorShift = (s >= 51 && s <= 55) || s >= 61;
    const isSilentRule = s >= 36 && s <= 40;

    let moveSpeed = 0;
    let shiftDelayMs = 0;

    if (isMoving) {
      moveSpeed = s >= 71 ? Math.min(600, 250 + (s - 70) * 10) : 250 + (s - 46) * 15;
    }

    if (hasColorShift) {
      shiftDelayMs = s >= 71 ? Math.max(150, Math.round((0.30 - (s - 70) * 0.005) * 1000)) : 250;
    }

    return {
      stage: s,
      tier,
      timeLimitMs,
      isBoss,
      params: {
        poolSize,
        ruleType,
        shuffleButtons,
        deceptiveButtons,
        hasTwoWords,
        isMoving,
        moveSpeed,
        hasColorShift,
        shiftDelayMs,
        isSilentRule
      }
    };
  }

  /**
   * Generates a deterministic, 100% solvable question
   */
  generate(rng: Rng, cfg: StageConfig, index: number): Question<ColorTrapQuestionPayload> {
    const poolSize = Number(cfg.params['poolSize'] ?? 4);
    const activePool = ALL_COLORS.slice(0, poolSize);

    let ruleType = String(cfg.params['ruleType'] ?? 'INK_COLOR') as ColorTrapRule;
    if (ruleType === 'OPPOSITE_PREV') {
      ruleType = index % 2 === 0 ? 'INK_COLOR' : 'WORD_MEANING';
    }

    // 1. Pick word meaning (the text) and ink color (the visual color)
    const wordColor = rng.pick(activePool);

    // 90% Stroop conflict (ink != word), 10% matching
    let inkColor = rng.pick(activePool);
    const forceConflict = rng.next() < 0.90;
    if (forceConflict && activePool.length > 1) {
      while (inkColor.id === wordColor.id) {
        inkColor = rng.pick(activePool);
      }
    }

    // Mid-presentation color shift
    const hasColorShift = Boolean(cfg.params['hasColorShift']);
    const shiftDelayMs = Number(cfg.params['shiftDelayMs'] ?? 250);
    let shiftHex: string | undefined = undefined;

    if (hasColorShift) {
      let initialColor = rng.pick(activePool);
      while (initialColor.id === inkColor.id && activePool.length > 1) {
        initialColor = rng.pick(activePool);
      }
      shiftHex = inkColor.hex; // Shifts to final ink color
      // Initial visual is initialColor
    }

    // 2. Determine correct answer
    let correctAnswerId = '';
    let trapAnswerId = '';

    if (ruleType === 'INK_COLOR') {
      correctAnswerId = inkColor.id;
      trapAnswerId = wordColor.id;
    } else if (ruleType === 'WORD_MEANING') {
      correctAnswerId = wordColor.id;
      trapAnswerId = inkColor.id;
    } else {
      // COMPOUND: color of first word
      correctAnswerId = inkColor.id;
      trapAnswerId = wordColor.id;
    }

    // 3. Build 4 options:
    // Mandatory 1: Correct Answer (Solvability guarantee)
    // Mandatory 2: Trap Answer (Stroop trap)
    // Options 3 & 4: Distinct fillers from active pool
    const selectedIds = new Set<string>();
    selectedIds.add(correctAnswerId);
    if (trapAnswerId !== correctAnswerId) {
      selectedIds.add(trapAnswerId);
    }

    // Fill remaining to 4
    for (const color of activePool) {
      if (selectedIds.size >= 4) break;
      selectedIds.add(color.id);
    }

    // In case poolSize was 4 and trap == correct, pick from ALL_COLORS
    if (selectedIds.size < 4) {
      for (const color of ALL_COLORS) {
        if (selectedIds.size >= 4) break;
        selectedIds.add(color.id);
      }
    }

    const deceptiveButtons = Boolean(cfg.params['deceptiveButtons']);
    const shuffleButtons = Boolean(cfg.params['shuffleButtons']);

    let optionsList: ColorTrapOption[] = Array.from(selectedIds).map((id) => {
      const colorObj = ALL_COLORS.find((c) => c.id === id)!;
      let deceptiveBgHex: string | undefined = undefined;

      if (deceptiveButtons) {
        // Pick a background color different from the label text
        const otherColor = rng.pick(activePool);
        deceptiveBgHex = otherColor.hex;
      }

      return {
        id: colorObj.id,
        labelAr: colorObj.nameAr,
        deceptiveBgHex
      };
    });

    if (shuffleButtons) {
      optionsList = rng.shuffle(optionsList);
    }

    // Rule human label in Arabic
    let ruleLabelAr = 'اضغط لون الخط 🎨';
    if (ruleType === 'WORD_MEANING') {
      ruleLabelAr = 'اضغط معنى الكلمة 🔤';
    } else if (ruleType === 'COMPOUND') {
      ruleLabelAr = 'اضغط لون الكلمة الأولى ☝️';
    }

    const isSilentRule = Boolean(cfg.params['isSilentRule']);
    const isMoving = Boolean(cfg.params['isMoving']);
    const moveSpeedPxSec = Number(cfg.params['moveSpeed'] ?? 0);

    const hasSecondWord = Boolean(cfg.params['hasTwoWords']);
    let secondWordText: string | undefined;
    let secondWordHex: string | undefined;

    if (hasSecondWord) {
      const w2Word = rng.pick(activePool);
      const w2Ink = rng.pick(activePool);
      secondWordText = w2Word.nameAr;
      secondWordHex = w2Ink.hex;
    }

    return {
      index,
      stage: cfg.stage,
      timeLimitMs: cfg.timeLimitMs,
      payload: {
        rule: ruleType,
        ruleLabelAr,
        isSilentRule,
        wordText: wordColor.nameAr,
        wordHex: inkColor.hex,
        shiftHex,
        shiftDelayMs,
        isMoving,
        moveSpeedPxSec,
        hasSecondWord,
        secondWordText,
        secondWordHex,
        options: optionsList,
        correctAnswerId
      }
    };
  }

  /**
   * Evaluates user answer purely and deterministically
   */
  evaluate(q: Question<ColorTrapQuestionPayload>, answer: string | null): Verdict {
    // Timeout or missing answer
    if (answer === null || answer === undefined) {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    const isCorrect = answer === q.payload.correctAnswerId;

    return {
      correct: isCorrect,
      heartCost: isCorrect ? 0 : 1,
      breaksCombo: !isCorrect
    };
  }
}

export const colorTrapLogic = new ColorTrapLogic();
