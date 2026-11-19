import type { Rng } from '@funnygame/game-core';
import type {
  GridDimension,
  CardItem,
  SwapMove,
  WhereDidItGoTarget,
  WhereDidItGoQuestionPayload
} from './types.js';
import { DISTINCT_ICONS, SIMILAR_ICON_SETS } from './icons.js';

export interface StageRules {
  gridDimension: GridDimension;
  targetCount: number;
  isOrdered: boolean;
  swapCount: number;
  isMidFlipSwap: boolean;
  useSimilarIcons: boolean;
  allowedMistakes: number;
  isBoss: boolean;
  isBreathing: boolean;
}

export function getStageRules(stage: number): StageRules {
  const isBoss = stage % 5 === 0;
  const isBreathing = (stage - 1) % 5 === 0 && stage > 1;

  // Grid Dimension
  let gridDimension: GridDimension = 3;
  if (stage >= 56) {
    gridDimension = 6;
  } else if (stage >= 46) {
    gridDimension = 5; // Mid-flip swap tier in 5x5
  } else if (stage >= 26) {
    gridDimension = 6;
  } else if (stage >= 14) {
    gridDimension = 5;
  } else if (stage >= 6) {
    gridDimension = 4;
  }

  // Allowed mistakes
  let allowedMistakes = 0;
  if (gridDimension === 3) {
    allowedMistakes = 2;
  } else if (gridDimension === 4) {
    allowedMistakes = 1;
  }

  // Target count & ordering
  let targetCount = 1;
  let isOrdered = false;

  if (stage >= 71) {
    targetCount = Math.min(5, 3 + Math.floor((stage - 70) / 15));
    isOrdered = true;
  } else if (stage >= 56) {
    targetCount = 3;
    isOrdered = true;
  } else if (stage >= 46) {
    targetCount = isBoss ? 3 : 2;
    isOrdered = true;
  } else if (stage >= 36) {
    targetCount = 3;
    isOrdered = true;
  } else if (stage >= 26) {
    targetCount = isBoss ? 3 : 2;
    isOrdered = true;
  } else if (stage >= 21) {
    targetCount = isBoss ? 3 : 2;
    isOrdered = true;
  } else if (stage >= 16) {
    targetCount = isBoss ? 3 : 2;
    isOrdered = true;
  } else if (stage >= 12) {
    targetCount = 3;
    isOrdered = true;
  } else if (stage >= 10) {
    targetCount = 2;
    isOrdered = true;
  } else if (stage >= 7) {
    targetCount = 1;
    isOrdered = false;
  } else if (stage === 6) {
    targetCount = 1;
    isOrdered = false;
  } else if (stage === 5) {
    targetCount = 2;
    isOrdered = false; // Stage 5: 2 targets unordered
  } else {
    targetCount = 1;
    isOrdered = false;
  }

  // Similar icons
  let useSimilarIcons = false;
  if (!isBreathing) {
    if (stage >= 56) {
      useSimilarIcons = true;
    } else if (stage >= 46) {
      useSimilarIcons = false;
    } else if (stage >= 36) {
      useSimilarIcons = true;
    } else if (stage >= 21 && stage <= 25) {
      useSimilarIcons = true;
    } else if (stage >= 12 && stage <= 15) {
      useSimilarIcons = true;
    }
  }

  // Swap count
  let swapCount = 0;
  if (isBreathing) {
    swapCount = 0; // Breathing stages pause swaps
  } else if (stage >= 71) {
    swapCount = Math.min(8, 4 + Math.floor((stage - 70) / 10));
  } else if (stage >= 56) {
    swapCount = 4;
  } else if (stage >= 46) {
    swapCount = isBoss ? 3 : 2;
  } else if (stage >= 36) {
    swapCount = 3;
  } else if (stage >= 26) {
    swapCount = 2;
  } else if (stage >= 21) {
    swapCount = isBoss ? 3 : 2;
  } else if (stage >= 17) {
    swapCount = isBoss ? 4 : 2;
  } else if (stage === 15) {
    swapCount = 3;
  } else if (stage >= 12) {
    swapCount = 2;
  } else if (stage >= 7) {
    swapCount = 1;
  }

  const isMidFlipSwap = stage >= 46 && swapCount > 0;

  return {
    gridDimension,
    targetCount,
    isOrdered,
    swapCount,
    isMidFlipSwap,
    useSimilarIcons,
    allowedMistakes,
    isBoss,
    isBreathing
  };
}

export function calculatePreviewDuration(stage: number, isBreathing: boolean): number {
  let sec = Math.max(0.7, 3.0 - 0.08 * (stage - 1));
  if (isBreathing) {
    sec += 0.4;
  }
  return Math.round(sec * 100) / 100;
}

export function calculateSearchTimeLimit(
  stage: number,
  targetCount: number,
  isBreathing: boolean,
  swapCount: number
): number {
  const eq = isBreathing || swapCount > 0 ? 1.0 : 0.0;
  const raw = 3.0 + targetCount * 1.2 - 0.04 * (stage - 1) + eq;
  return Math.max(2.5, Math.round(raw * 10) / 10);
}

export const getStageConfigRules = getStageRules;

export function generateWhereDidItGoQuestion(
  rng: Rng,
  stage: number,
  _index: number
): WhereDidItGoQuestionPayload {
  const rules = getStageRules(stage);
  const totalCards = rules.gridDimension * rules.gridDimension;

  // 1. Select icon palette
  let targetIcons: string[] = [];
  let fillerPool: string[] = [];

  if (rules.useSimilarIcons) {
    // Pick one set from SIMILAR_ICON_SETS
    const setIdx = rng.nextInt(0, SIMILAR_ICON_SETS.length - 1);
    const chosenSet = [...SIMILAR_ICON_SETS[setIdx]!];
    // Shuffle the set
    const shuffledSet = rng.shuffle(chosenSet);
    targetIcons = shuffledSet.slice(0, rules.targetCount);
    fillerPool = shuffledSet.filter((icon) => !targetIcons.includes(icon));
    // If filler pool is small, supplement from DISTINCT_ICONS
    if (fillerPool.length < 4) {
      fillerPool.push(...DISTINCT_ICONS.filter((i) => !targetIcons.includes(i)));
    }
  } else {
    // Distinct icons
    const shuffled = rng.shuffle([...DISTINCT_ICONS]);
    targetIcons = shuffled.slice(0, rules.targetCount);
    fillerPool = shuffled.slice(rules.targetCount);
  }

  // 2. Place target icons at unique random cell indices
  const cellIndices: number[] = [];
  for (let i = 0; i < totalCards; i++) cellIndices.push(i);
  const shuffledCells = rng.shuffle(cellIndices);

  const targetCellPositions: number[] = shuffledCells.slice(0, rules.targetCount);
  const initialCards: CardItem[] = new Array(totalCards);

  // Place targets
  for (let t = 0; t < rules.targetCount; t++) {
    const pos = targetCellPositions[t]!;
    initialCards[pos] = {
      id: pos,
      icon: targetIcons[t]!
    };
  }

  // Place filler icons in remaining cells (ensuring target icons never repeat!)
  let fillerIdx = 0;
  for (let c = 0; c < totalCards; c++) {
    if (!initialCards[c]) {
      const icon = fillerPool[fillerIdx % fillerPool.length]!;
      fillerIdx++;
      initialCards[c] = {
        id: c,
        icon
      };
    }
  }

  // 3. Generate Swap moves and track final positions
  // positions[cellIndex] = cardId initially
  const currentPositions: number[] = [];
  for (let i = 0; i < totalCards; i++) currentPositions.push(i);

  const swaps: SwapMove[] = [];
  for (let s = 0; s < rules.swapCount; s++) {
    const fromIdx = rng.nextInt(0, totalCards - 1);
    let toIdx = rng.nextInt(0, totalCards - 1);
    while (toIdx === fromIdx) {
      toIdx = rng.nextInt(0, totalCards - 1);
    }

    // Swap positions
    const temp = currentPositions[fromIdx]!;
    currentPositions[fromIdx] = currentPositions[toIdx]!;
    currentPositions[toIdx] = temp;

    swaps.push({ fromIndex: fromIdx, toIndex: toIdx });
  }

  // 4. Determine final cell index for each target
  // Find which cell index now holds the cardId that has targetIcons[t]
  const targets: WhereDidItGoTarget[] = targetIcons.map((icon, orderIdx) => {
    // Find the original cardId for this icon
    const origCardId = initialCards.findIndex((card) => card.icon === icon);
    // Find where origCardId is located in currentPositions
    const finalCell = currentPositions.indexOf(origCardId);
    return {
      icon,
      finalCellIndex: finalCell,
      orderIndex: orderIdx
    };
  });

  // 5. Calculate timings
  const previewSec = calculatePreviewDuration(stage, rules.isBreathing);
  const searchSec = calculateSearchTimeLimit(
    stage,
    rules.targetCount,
    rules.isBreathing,
    rules.swapCount
  );

  const previewDurationMs = Math.round(previewSec * 1000);
  const searchTimeLimitMs = Math.round(searchSec * 1000);

  // Guidance text
  let guidanceTextAr = 'احفظ أماكن الصور قبل ما تنقلب البطاقات!';
  if (rules.isMidFlipSwap) {
    guidanceTextAr = 'انتبه! البطاقات تتبدل وهي تنقلب في نفس اللحظة!';
  } else if (rules.swapCount > 0 && rules.isOrdered) {
    guidanceTextAr = 'البطاقات تبدّلت أماكنها! افتح الصور بالترتيب المطلوب فوق.';
  } else if (rules.swapCount > 0) {
    guidanceTextAr = 'انتبه! البطاقات تبدّل أماكنها بعد ما تنقلب.';
  } else if (rules.isOrdered) {
    guidanceTextAr = 'افتح البطاقات المطلوبة بالترتيب المحدد من اليمين لليسار!';
  } else if (rules.targetCount > 1) {
    guidanceTextAr = 'مطلوب إيجاد بطاقتين! افتحهم بأي ترتيب.';
  }

  return {
    stage,
    gridDimension: rules.gridDimension,
    totalCards,
    initialCards,
    finalPositions: currentPositions,
    swaps,
    targets,
    isOrdered: rules.isOrdered,
    allowedMistakes: rules.allowedMistakes,
    isMidFlipSwap: rules.isMidFlipSwap,
    previewDurationMs,
    searchTimeLimitMs,
    timeLimitMs: searchTimeLimitMs,
    manualTimerStart: true,
    guidanceTextAr
  };
}
