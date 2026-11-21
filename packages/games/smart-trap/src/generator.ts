import type { Rng } from '@funnygame/game-core';
import type {
  StageRules,
  SmartTrapQuestionPayload,
  PuzzleChoice
} from './types.js';
import { PUZZLE_TEMPLATES } from './templates.js';
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
  if (stage >= 56) categoryAr = 'شروط مركبة وتحدي متقدم ⚡';
  else if (stage >= 46) categoryAr = 'جداول منطقية متقاطعة 📋';
  else if (stage >= 36) categoryAr = 'الصادق والكاذب (3 أشخاص) 👥';
  else if (stage >= 26) categoryAr = 'ترتيب واستبعاد 📏';
  else if (stage >= 21) categoryAr = 'يقين واحتمالات في الظلام 🧦';
  else if (stage >= 15) categoryAr = 'صادق وكاذب 🎭';
  else if (stage >= 12) categoryAr = 'أعمار وعلاقات 🎂';
  else if (stage >= 7) categoryAr = 'زمن ومعدلات وتضاعف ⏱️';
  else if (stage >= 5) categoryAr = 'سباق ومواقع 🏃‍♂️';

  const u = Math.max(0.40, 1.0 - 0.012 * (stage - 1));
  const cLogic = 25.0;
  const extraTimeSec = isBreathing ? 4.0 : 0.0;

  // round to nearest 0.5s, minimum 10.0s floor
  const rawTime = u * cLogic + extraTimeSec;
  const timeLimitSec = Math.max(10.0, Math.round(rawTime * 2) / 2);

  return {
    categoryAr,
    isBoss,
    isBreathing,
    cLogic,
    extraTimeSec,
    timeLimitSec
  };
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

  // Eligible templates: minStage <= stage
  let eligible = PUZZLE_TEMPLATES.filter((t) => t.minStage <= stage);
  if (eligible.length === 0) {
    eligible = PUZZLE_TEMPLATES;
  }

  // Weight templates towards higher/newer ones for the stage
  const sorted = [...eligible].sort((a, b) => b.minStage - a.minStage);
  const topHalf = sorted.slice(0, Math.max(3, Math.ceil(sorted.length * 0.6)));

  const template = topHalf[Math.floor(rng.next() * topHalf.length)]!;
  const instance = template.generate(rng, stage);

  // Create 4 choices:
  // 1 correct, 1 trap, 2 distractors
  const rawChoices = [
    { text: instance.correctAnswer, isCorrect: true, isTrap: false },
    { text: instance.trapAnswer, isCorrect: false, isTrap: true },
    { text: instance.distractors[0] || 'إجابة أخرى', isCorrect: false, isTrap: false },
    { text: instance.distractors[1] || 'غير محدد', isCorrect: false, isTrap: false }
  ];

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
