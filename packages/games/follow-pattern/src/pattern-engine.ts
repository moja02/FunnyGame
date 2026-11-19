import type { Rng } from '@funnygame/game-core';
import type {
  PatternRuleType,
  PatternButtonDef,
  PatternStep,
  FollowPatternQuestionPayload
} from './types.js';
import { PENTATONIC_FREQUENCIES } from './audio.js';

export const PATTERN_BUTTONS: PatternButtonDef[] = [
  {
    id: 0,
    label: 'أخضر',
    colorName: 'أخضر',
    shapeSymbol: '▲',
    bgClass: 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400',
    activeBgClass: 'bg-emerald-500 border-emerald-200 text-white',
    borderClass: 'border-emerald-500',
    glowClass: 'shadow-[0_0_25px_rgba(16,185,129,0.85)] scale-[1.03]',
    textColorClass: 'text-emerald-400',
    frequencyHz: PENTATONIC_FREQUENCIES[0]!
  },
  {
    id: 1,
    label: 'أحمر',
    colorName: 'أحمر',
    shapeSymbol: '■',
    bgClass: 'bg-rose-950/50 border-rose-500/40 text-rose-400',
    activeBgClass: 'bg-rose-500 border-rose-200 text-white',
    borderClass: 'border-rose-500',
    glowClass: 'shadow-[0_0_25px_rgba(244,63,94,0.85)] scale-[1.03]',
    textColorClass: 'text-rose-400',
    frequencyHz: PENTATONIC_FREQUENCIES[1]!
  },
  {
    id: 2,
    label: 'أصفر',
    colorName: 'أصفر',
    shapeSymbol: '●',
    bgClass: 'bg-amber-950/50 border-amber-500/40 text-amber-400',
    activeBgClass: 'bg-amber-400 border-amber-200 text-slate-950',
    borderClass: 'border-amber-500',
    glowClass: 'shadow-[0_0_25px_rgba(251,191,36,0.85)] scale-[1.03]',
    textColorClass: 'text-amber-400',
    frequencyHz: PENTATONIC_FREQUENCIES[2]!
  },
  {
    id: 3,
    label: 'أزرق',
    colorName: 'أزرق',
    shapeSymbol: '◆',
    bgClass: 'bg-sky-950/50 border-sky-500/40 text-sky-400',
    activeBgClass: 'bg-sky-500 border-sky-200 text-white',
    borderClass: 'border-sky-500',
    glowClass: 'shadow-[0_0_25px_rgba(14,165,233,0.85)] scale-[1.03]',
    textColorClass: 'text-sky-400',
    frequencyHz: PENTATONIC_FREQUENCIES[3]!
  },
  {
    id: 4,
    label: 'بنفسجي',
    colorName: 'بنفسجي',
    shapeSymbol: '★',
    bgClass: 'bg-purple-950/50 border-purple-500/40 text-purple-400',
    activeBgClass: 'bg-purple-500 border-purple-200 text-white',
    borderClass: 'border-purple-500',
    glowClass: 'shadow-[0_0_25px_rgba(168,85,247,0.85)] scale-[1.03]',
    textColorClass: 'text-purple-400',
    frequencyHz: PENTATONIC_FREQUENCIES[4]!
  },
  {
    id: 5,
    label: 'برتقالي',
    colorName: 'برتقالي',
    shapeSymbol: '⬡',
    bgClass: 'bg-orange-950/50 border-orange-500/40 text-orange-400',
    activeBgClass: 'bg-orange-500 border-orange-200 text-white',
    borderClass: 'border-orange-500',
    glowClass: 'shadow-[0_0_25px_rgba(249,115,22,0.85)] scale-[1.03]',
    textColorClass: 'text-orange-400',
    frequencyHz: PENTATONIC_FREQUENCIES[5]!
  },
  {
    id: 6,
    label: 'وردي',
    colorName: 'وردي',
    shapeSymbol: '♥',
    bgClass: 'bg-pink-950/50 border-pink-500/40 text-pink-400',
    activeBgClass: 'bg-pink-500 border-pink-200 text-white',
    borderClass: 'border-pink-500',
    glowClass: 'shadow-[0_0_25px_rgba(236,72,153,0.85)] scale-[1.03]',
    textColorClass: 'text-pink-400',
    frequencyHz: PENTATONIC_FREQUENCIES[6]!
  },
  {
    id: 7,
    label: 'فيروزي',
    colorName: 'فيروزي',
    shapeSymbol: '✚',
    bgClass: 'bg-teal-950/50 border-teal-500/40 text-teal-400',
    activeBgClass: 'bg-teal-400 border-teal-200 text-slate-950',
    borderClass: 'border-teal-500',
    glowClass: 'shadow-[0_0_25px_rgba(45,212,191,0.85)] scale-[1.03]',
    textColorClass: 'text-teal-400',
    frequencyHz: PENTATONIC_FREQUENCIES[7]!
  }
];

export interface StagePatternRules {
  buttonCount: 4 | 6 | 8;
  sequenceLength: number;
  ruleType: PatternRuleType;
  hasDistraction: boolean;
  swapCount: number;
  skipColorId?: number;
  isBoss: boolean;
  isBreathing: boolean;
}

export function getStagePatternRules(stage: number): StagePatternRules {
  const isBoss = stage % 5 === 0;
  const isBreathing = (stage - 1) % 5 === 0 && stage > 1;

  let buttonCount: 4 | 6 | 8 = 4;
  if (stage >= 26) {
    buttonCount = 8;
  } else if (stage >= 15) {
    buttonCount = 6;
  }

  // Sequence length
  let sequenceLength = 3;
  if (stage >= 71) {
    sequenceLength = 12 + Math.floor((stage - 70) / 5);
  } else if (stage >= 61) {
    sequenceLength = 10 + Math.min(2, Math.floor((stage - 61) / 3));
  } else if (stage >= 56) {
    sequenceLength = 9 + Math.min(2, Math.floor((stage - 56) / 2));
  } else if (stage >= 51) {
    sequenceLength = 8 + Math.min(2, Math.floor((stage - 51) / 2));
  } else if (stage >= 46) {
    sequenceLength = 8 + Math.min(2, Math.floor((stage - 46) / 2));
  } else if (stage >= 41) {
    sequenceLength = 12;
  } else if (stage >= 36) {
    sequenceLength = 10 + Math.min(2, stage - 36);
  } else if (stage >= 26) {
    sequenceLength = 10 + Math.min(2, stage - 26);
  } else if (stage >= 21) {
    sequenceLength = 8 + Math.min(2, stage - 21);
  } else if (stage >= 17) {
    sequenceLength = 7 + Math.min(2, stage - 17);
  } else if (stage >= 15) {
    sequenceLength = 7;
  } else if (stage >= 12) {
    sequenceLength = 6 + (stage % 2 === 0 ? 1 : 0);
  } else if (stage >= 10) {
    sequenceLength = 6;
  } else if (stage >= 7) {
    sequenceLength = 6 + (stage - 7);
  } else if (stage >= 5) {
    sequenceLength = isBoss ? 7 : 6;
  } else {
    sequenceLength = 3 + (stage - 1); // 3, 4, 5, 6
  }

  // Determine Rule
  let ruleType: PatternRuleType = 'FORWARD';
  let hasDistraction = false;
  let swapCount = 0;
  let skipColorId: number | undefined = undefined;

  if (stage >= 71) {
    const cycle = (stage - 71) % 3;
    if (cycle === 0) {
      ruleType = 'REVERSE_SKIP_COLOR';
      skipColorId = 1; // red
    } else if (cycle === 1) {
      ruleType = 'AUDIO_ONLY_REVERSE';
    } else {
      ruleType = 'SWAP_AND_REVERSE';
      swapCount = Math.min(4, 1 + Math.floor((stage - 70) / 10));
    }
  } else if (stage >= 61) {
    ruleType = 'REVERSE_SKIP_COLOR';
    skipColorId = 1;
    swapCount = 1;
  } else if (stage >= 56) {
    ruleType = 'SWAP_POSITIONS';
    swapCount = 1;
  } else if (stage >= 51) {
    ruleType = 'SKIP_COLOR';
    skipColorId = 1; // skip red
  } else if (stage >= 46) {
    ruleType = 'AUDIO_ONLY';
  } else if (stage >= 41) {
    ruleType = 'REVERSE';
    hasDistraction = true;
  } else if (stage >= 36) {
    ruleType = 'FORWARD';
    hasDistraction = true;
  } else if (isBreathing) {
    // In stages 1-35, breathing returns to normal forward order
    ruleType = 'FORWARD';
  } else if (stage >= 20 && isBoss) {
    ruleType = 'REVERSE';
  } else if (stage >= 10 && (isBoss || stage === 10 || stage === 12 || stage === 14)) {
    ruleType = 'REVERSE';
  }

  return {
    buttonCount,
    sequenceLength,
    ruleType,
    hasDistraction,
    swapCount,
    skipColorId,
    isBoss,
    isBreathing
  };
}

export function calculatePlaybackTiming(stage: number, isBreathing: boolean): {
  flashDurationMs: number;
  flashPauseMs: number;
} {
  // Flash duration formula: max(0.25, 0.60 - 0.012 * (s - 1))
  let sec = Math.max(0.25, 0.60 - 0.012 * (stage - 1));
  if (isBreathing) sec += 0.10;

  const flashDurationMs = Math.round(sec * 1000);
  const flashPauseMs = Math.max(90, Math.round(flashDurationMs * 0.35));

  return { flashDurationMs, flashPauseMs };
}

export function calculateInputTimeLimit(
  stage: number,
  expectedLength: number,
  ruleType: PatternRuleType
): number {
  const uIn = Math.max(0.45, 0.85 - 0.01 * (stage - 1));
  const isComplexRule =
    ruleType === 'REVERSE' ||
    ruleType === 'SKIP_COLOR' ||
    ruleType === 'REVERSE_SKIP_COLOR' ||
    ruleType === 'SWAP_POSITIONS' ||
    ruleType === 'SWAP_AND_REVERSE';
  const eq = isComplexRule ? 0.8 : 0;

  const rawTq = expectedLength * uIn + eq;
  return Math.max(2.5, Math.round(rawTq * 10) / 10);
}

export function generateFollowPatternQuestion(
  rng: Rng,
  stage: number,
  _index: number
): FollowPatternQuestionPayload {
  const rules = getStagePatternRules(stage);
  const activeButtons = PATTERN_BUTTONS.slice(0, rules.buttonCount);
  const { flashDurationMs, flashPauseMs } = calculatePlaybackTiming(stage, rules.isBreathing);

  // 1. Generate shown sequence with max 3 consecutive identical buttons
  const shownSequence: PatternStep[] = [];
  let prevId = -1;
  let consecCount = 0;

  for (let i = 0; i < rules.sequenceLength; i++) {
    let nextId = rng.nextInt(0, rules.buttonCount - 1);
    let attempts = 0;
    while (nextId === prevId && consecCount >= 2 && attempts < 10) {
      nextId = rng.nextInt(0, rules.buttonCount - 1);
      attempts++;
    }

    if (nextId === prevId) {
      consecCount++;
    } else {
      consecCount = 1;
      prevId = nextId;
    }

    shownSequence.push({ buttonId: nextId });
  }

  // Ensure skip color requirement: at least 2 occurrences of skipColorId if active
  if (rules.skipColorId !== undefined) {
    let skipCount = shownSequence.filter((s) => s.buttonId === rules.skipColorId).length;
    if (skipCount < 2 && shownSequence.length >= 5) {
      const idx1 = rng.nextInt(1, Math.floor(shownSequence.length / 2));
      const idx2 = rng.nextInt(Math.floor(shownSequence.length / 2) + 1, shownSequence.length - 1);
      shownSequence[idx1]!.buttonId = rules.skipColorId;
      shownSequence[idx2]!.buttonId = rules.skipColorId;
    }
  }

  // Add visual distraction (ghost flash with no sound) in stages 36-45
  if (rules.hasDistraction && shownSequence.length >= 6) {
    const distractionIdx = rng.nextInt(2, shownSequence.length - 2);
    let dummyId = rng.nextInt(0, rules.buttonCount - 1);
    while (dummyId === shownSequence[distractionIdx]!.buttonId) {
      dummyId = rng.nextInt(0, rules.buttonCount - 1);
    }
    shownSequence.splice(distractionIdx, 0, {
      buttonId: dummyId,
      isDistraction: true
    });
  }

  // 2. Compute expected sequence
  let cleanSteps = shownSequence.filter((s) => !s.isDistraction);

  // Filter skip color if applicable
  if (
    rules.ruleType === 'SKIP_COLOR' ||
    rules.ruleType === 'REVERSE_SKIP_COLOR'
  ) {
    if (rules.skipColorId !== undefined) {
      cleanSteps = cleanSteps.filter((s) => s.buttonId !== rules.skipColorId);
    }
  }

  let expectedIds = cleanSteps.map((s) => s.buttonId);

  // Reverse if rule requires it
  if (
    rules.ruleType === 'REVERSE' ||
    rules.ruleType === 'REVERSE_SKIP_COLOR' ||
    rules.ruleType === 'AUDIO_ONLY_REVERSE' ||
    rules.ruleType === 'SWAP_AND_REVERSE'
  ) {
    expectedIds = [...expectedIds].reverse();
  }

  // Ensure minimum expected length of 3
  if (expectedIds.length < 3) {
    expectedIds = cleanSteps.map((s) => s.buttonId);
  }

  // 3. Grid position swapping
  const gridPositions = activeButtons.map((b) => b.id);
  const swappedPairs: [number, number][] = [];

  if (rules.swapCount > 0 && (rules.ruleType === 'SWAP_POSITIONS' || rules.ruleType === 'SWAP_AND_REVERSE')) {
    for (let sw = 0; sw < rules.swapCount; sw++) {
      const idxA = rng.nextInt(0, gridPositions.length - 1);
      let idxB = rng.nextInt(0, gridPositions.length - 1);
      while (idxB === idxA) {
        idxB = rng.nextInt(0, gridPositions.length - 1);
      }
      const tmp = gridPositions[idxA]!;
      gridPositions[idxA] = gridPositions[idxB]!;
      gridPositions[idxB] = tmp;
      swappedPairs.push([idxA, idxB]);
    }
  }

  // 4. Calculate timing
  const tqSec = calculateInputTimeLimit(stage, expectedIds.length, rules.ruleType);
  const timeLimitMs = Math.round(tqSec * 1000);

  // Rule text and guidance
  let ruleTextAr = 'بنفس الترتيب';
  let guidanceTextAr = 'احفظ ترتيب الإضاءة وعيده بنفس الترتيب!';

  if (rules.ruleType === 'REVERSE') {
    ruleTextAr = 'بالعكس 🔄';
    guidanceTextAr = 'اقلب الشريط! عيد السلسلة بالعكس من الآخر للأول.';
  } else if (rules.ruleType === 'AUDIO_ONLY') {
    ruleTextAr = 'الأصوات فقط 🎧';
    guidanceTextAr = 'طفّينا الضي! اسمع النغمات واعرف كل زر من صوته.';
  } else if (rules.ruleType === 'SKIP_COLOR') {
    ruleTextAr = 'تخطَّ الأحمر 🚫';
    guidanceTextAr = 'تخطّى اللون الأحمر! عيد السلسلة بدون ما تلمس الأحمر.';
  } else if (rules.ruleType === 'SWAP_POSITIONS') {
    ruleTextAr = 'الأزرار تبدلت 🔀';
    guidanceTextAr = 'الأزرار بدّلت أماكنها! تبع اللون والرمز مش المكان.';
  } else if (rules.ruleType === 'REVERSE_SKIP_COLOR') {
    ruleTextAr = 'تخطَّ الأحمر + بالعكس 🔄';
    guidanceTextAr = 'تخطّى الأحمر وعيد الباقي بالعكس من الآخر للأول!';
  } else if (rules.ruleType === 'SWAP_AND_REVERSE') {
    ruleTextAr = 'تبديل + بالعكس 🔀🔄';
    guidanceTextAr = 'الأزرار بدّلت أماكنها! عيد السلسلة بالعكس.';
  }

  return {
    stage,
    sequenceLength: rules.sequenceLength,
    buttonCount: rules.buttonCount,
    buttons: activeButtons,
    gridPositions,
    shownSequence,
    expectedSequence: expectedIds,
    ruleType: rules.ruleType,
    ruleTextAr,
    skipColorButtonId: rules.skipColorId,
    swappedPairs: swappedPairs.length > 0 ? swappedPairs : undefined,
    flashDurationMs,
    flashPauseMs,
    timeLimitMs,
    guidanceTextAr,
    manualTimerStart: true
  };
}
