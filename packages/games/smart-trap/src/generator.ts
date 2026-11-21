import type { Rng } from '@funnygame/game-core';
import type {
  StageRules,
  SmartTrapQuestionPayload,
  PuzzleChoice
} from './types.js';
import { PUZZLE_TEMPLATES, type PuzzleTemplate } from './templates.js';
import { INTRO_CARDS } from './content.js';

/**
 * Calculates stage progression and time rules strictly according to Section 4:
 * u(s) = max(0.40, 1.0 - 0.012 * (s - 1))
 * T_q = max(10.0, round_0.5(u(s) * C_logic + E_q))
 */
export function getStageRules(stage: number): StageRules {
  const isBoss = stage % 5 === 0;
  const isBreathing =
    (stage - 1) % 5 === 0 &&
    stage > 1 &&
    stage !== 11 &&
    stage !== 26 &&
    stage !== 46;

  let categoryAr = 'ألغاز خدعة كلاسيكية 🧠';
  let baseTimeSec = 25.0;

  if (stage >= 56) {
    categoryAr = 'شروط مركبة وتحدي متقدم ⚡';
    baseTimeSec = 55.0;
  } else if (stage >= 46) {
    categoryAr = 'جداول منطقية متقاطعة 📋';
    baseTimeSec = 50.0;
  } else if (stage >= 36) {
    categoryAr = 'الصادق والكاذب (3 أشخاص) 👥';
    baseTimeSec = 45.0;
  } else if (stage >= 26) {
    categoryAr = 'ترتيب واستبعاد 📏';
    baseTimeSec = 40.0;
  } else if (stage >= 21) {
    categoryAr = 'يقين واحتمالات في الظلام 🧦';
    baseTimeSec = 35.0;
  } else if (stage >= 15) {
    categoryAr = 'صادق وكاذب 🎭';
    baseTimeSec = 35.0;
  } else if (stage >= 12) {
    categoryAr = 'أعمار وعلاقات 🎂';
    baseTimeSec = 32.0;
  } else if (stage >= 7) {
    categoryAr = 'زمن ومعدلات وتضاعف ⏱️';
    baseTimeSec = 30.0;
  } else if (stage >= 5) {
    categoryAr = 'سباق ومواقع 🏃‍♂️';
    baseTimeSec = 28.0;
  }

  const extraTimeSec = isBreathing ? 4.0 : isBoss ? 3.0 : 0.0;
  const timeLimitSec = baseTimeSec + extraTimeSec;

  return {
    categoryAr,
    isBoss,
    isBreathing,
    cLogic: baseTimeSec,
    extraTimeSec,
    timeLimitSec
  };
}

/**
 * Deterministic pseudo-random number generator for stage template planning.
 * Uses SplitMix32 hash to produce consistent, well-distributed randomness from an integer seed.
 */
function createStageRand(seed: number): () => number {
  let h = seed >>> 0;
  return () => {
    h = (h + 0x9e3779b9) >>> 0;
    let z = h;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;
    return (z >>> 0) / 4294967296;
  };
}

/**
 * Returns a plan of 5 distinct puzzle templates for the 5 questions of a stage.
 * Guarantees NO duplicate templates within the same stage (0 to 4),
 * prioritizing the newest unlocked tier while blending in previous categories for maximum variety.
 */
export function getStagePlan(stage: number): PuzzleTemplate[] {
  const eligible = PUZZLE_TEMPLATES.filter((t) => t.minStage <= stage);
  if (eligible.length <= 5) {
    return eligible;
  }

  const rand = createStageRand(stage * 7919 + 1013);

  // Separate into current tier (unlocked in latest 5 stages) and legacy pool
  const minTierCutoff = Math.max(1, stage - 4);
  const currentTier = eligible.filter((t) => t.minStage >= minTierCutoff);
  const legacyTier = eligible.filter((t) => t.minStage < minTierCutoff);

  const selected: PuzzleTemplate[] = [];
  const selectedIds = new Set<string>();

  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = tmp;
    }
    return copy;
  }

  const shuffledCurrent = shuffle(currentTier);
  const shuffledLegacy = shuffle(legacyTier);

  // Try to pick 3 from current tier and 2 from legacy tier
  const targetCurrent = Math.min(3, shuffledCurrent.length);
  for (const t of shuffledCurrent) {
    if (selected.length < targetCurrent && !selectedIds.has(t.id)) {
      selected.push(t);
      selectedIds.add(t.id);
    }
  }

  for (const t of shuffledLegacy) {
    if (selected.length < 5 && !selectedIds.has(t.id)) {
      selected.push(t);
      selectedIds.add(t.id);
    }
  }

  // Backfill up to 5 if needed
  if (selected.length < 5) {
    for (const t of shuffle(eligible)) {
      if (selected.length >= 5) break;
      if (!selectedIds.has(t.id)) {
        selected.push(t);
        selectedIds.add(t.id);
      }
    }
  }

  // Shuffle selected templates for varied question ordering
  const finalPlan = shuffle(selected);

  // Avoid identical template between the end of stage S-1 and start of stage S
  if (stage > 1) {
    const prevPlan = getStagePlan(stage - 1);
    const lastPrevId = prevPlan[prevPlan.length - 1]?.id;
    if (finalPlan[0]?.id === lastPrevId && finalPlan.length > 1) {
      const temp = finalPlan[0]!;
      finalPlan[0] = finalPlan[1]!;
      finalPlan[1] = temp;
    }
  }

  return finalPlan;
}

/**
 * Generates a single parametric question for Smart Trap.
 */
export function generateSmartTrapQuestion(
  rng: Rng,
  stage: number,
  index: number
): SmartTrapQuestionPayload {
  const rules = getStageRules(stage);
  const plan = getStagePlan(stage);
  const template = plan[index % plan.length]!;

  const instance = template.generate(rng, stage);

  // Create 4 choices: 1 correct, 1 trap, 2 distractors
  const rawChoices = [
    { text: instance.correctAnswer, isCorrect: true, isTrap: false },
    { text: instance.trapAnswer, isCorrect: false, isTrap: true },
    { text: instance.distractors[0] || 'إجابة أخرى', isCorrect: false, isTrap: false },
    { text: instance.distractors[1] || 'غير محدد', isCorrect: false, isTrap: false }
  ];

  // Guarantee 100% distinct choice texts across all 4 choices
  const seenTexts = new Set<string>();
  seenTexts.add(rawChoices[0]!.text);

  for (let i = 1; i < rawChoices.length; i++) {
    let t = rawChoices[i]!.text;
    let counter = 1;
    while (seenTexts.has(t)) {
      t = `${rawChoices[i]!.text} (${counter})`;
      counter++;
    }
    rawChoices[i]!.text = t;
    seenTexts.add(t);
  }

  // Shuffle choices with rng
  for (let i = rawChoices.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const temp = rawChoices[i]!;
    rawChoices[i] = rawChoices[j]!;
    rawChoices[j] = temp;
  }

  const choices: PuzzleChoice[] = rawChoices.map((c, id) => ({
    id,
    text: c.text,
    isCorrect: c.isCorrect,
    isTrap: c.isTrap
  }));

  const correctChoiceIndex = choices.findIndex((c) => c.isCorrect);
  const trapChoiceIndex = choices.findIndex((c) => c.isTrap);

  return {
    stage,
    index,
    puzzleId: instance.id,
    categoryAr: instance.categoryAr,
    promptAr: instance.promptAr,
    choices,
    correctChoiceIndex,
    trapChoiceIndex,
    explanationAr: instance.explanationAr,
    timeLimitMs: rules.timeLimitSec * 1000,
    introCardAr: INTRO_CARDS[stage],
    isBoss: rules.isBoss,
    isBreathing: rules.isBreathing
  };
}
