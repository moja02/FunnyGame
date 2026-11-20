import type { Rng } from '@funnygame/game-core';
import type {
  ChangeCategory,
  ChangeType,
  SceneItem,
  WatchAndJudgeRound,
  WatchAndJudgeQuestionPayload
} from './types.js';
import { SHAPES, COLORS, ROTATIONS } from './palette.js';

export interface StageRules {
  itemCount: number;
  hasNoChangeButton: boolean;
  hasDistractorScene: boolean;
  hasColorFlash: boolean;
  allowDoubleChange: boolean;
  preferMinor: boolean;
  viewDurationMs: number;
  decisionTimeLimitMs: number;
  isBoss: boolean;
  isBreathing: boolean;
}

export function getStageRules(stage: number): StageRules {
  const isBoss = stage % 5 === 0;
  const isBreathing = stage !== 26 && (stage - 1) % 5 === 0 && stage > 1;

  // Item count (6 to 25 items)
  let itemCount = 6;
  if (stage >= 26) {
    itemCount = 25;
  } else if (stage >= 21) {
    itemCount = 20 + Math.min(2, stage - 21);
  } else if (stage >= 20) {
    itemCount = 20;
  } else if (stage >= 16) {
    itemCount = 17 + Math.min(2, stage - 16);
  } else if (stage >= 15) {
    itemCount = 16;
  } else if (stage >= 12) {
    itemCount = 13 + Math.min(2, stage - 12);
  } else if (stage >= 10) {
    itemCount = 12;
  } else if (stage >= 7) {
    itemCount = 10 + Math.min(2, stage - 7);
  } else if (stage === 6) {
    itemCount = 8;
  } else if (stage === 5) {
    itemCount = 9;
  } else {
    itemCount = 6 + Math.min(2, stage - 1);
  }

  if (isBreathing && stage > 1) {
    if (stage === 31 || stage === 46) {
      itemCount = 20;
    } else if (stage === 51) {
      itemCount = 22;
    } else {
      itemCount = Math.max(8, itemCount - 4);
    }
  }

  // Feature flags
  const hasNoChangeButton = stage >= 10 && !isBreathing;
  const hasColorFlash = stage >= 36 && stage <= 45;
  const hasDistractorScene = stage >= 51;
  const allowDoubleChange = stage >= 46;
  const preferMinor = stage >= 7;

  // Timing formulas
  let viewSec = Math.max(1.5, 5.0 - 0.15 * (stage - 1));
  if (isBreathing) viewSec += 0.5;
  const viewDurationMs = Math.round(viewSec * 1000);

  const eq = isBreathing || stage >= 46 ? 0.6 : 0.0;
  const rawTq = 3.2 + itemCount * 0.04 - 0.04 * (stage - 1) + eq;
  const decisionTimeLimitMs = Math.round(Math.max(2.0, Math.round(rawTq * 10) / 10) * 1000);

  return {
    itemCount,
    hasNoChangeButton,
    hasDistractorScene,
    hasColorFlash,
    allowDoubleChange,
    preferMinor,
    viewDurationMs,
    decisionTimeLimitMs,
    isBoss,
    isBreathing
  };
}

export function calculateViewDuration(stage: number, isBreathing: boolean): number {
  let sec = Math.max(1.5, 5.0 - 0.15 * (stage - 1));
  if (isBreathing) sec += 0.5;
  return Math.round(sec * 100) / 100;
}

export function calculateDecisionTimeLimit(
  stage: number,
  itemCount: number,
  isBreathing: boolean
): number {
  const eq = isBreathing || stage >= 46 ? 0.6 : 0.0;
  const raw = 3.2 + itemCount * 0.04 - 0.04 * (stage - 1) + eq;
  return Math.max(2.0, Math.round(raw * 10) / 10);
}

function cloneScene(scene: (SceneItem | null)[]): (SceneItem | null)[] {
  return scene.map((item) => (item ? { ...item } : null));
}

export function generateSingleRound(
  rng: Rng,
  stage: number,
  roundIndex: number,
  rules: StageRules
): WatchAndJudgeRound {
  // 1. Choose which cells in the 5x5 grid are populated
  const totalCells = 25;
  const cellIndices: number[] = [];
  for (let i = 0; i < totalCells; i++) cellIndices.push(i);
  const shuffledCells = rng.shuffle(cellIndices);
  const occupiedIndices = shuffledCells.slice(0, rules.itemCount);

  // 2. Build Scene A
  const sceneA: (SceneItem | null)[] = new Array(totalCells).fill(null);
  for (const idx of occupiedIndices) {
    const shape = rng.pick(SHAPES);
    const color = rng.pick(COLORS);
    const rotationDeg = rng.pick([0, 90, 180, 270]);
    const scale = 1.0;

    sceneA[idx] = {
      id: idx,
      shape,
      colorName: color.name,
      textColorClass: color.textColorClass,
      colorHex: color.hex,
      rotationDeg,
      scale
    };
  }

  // 3. Determine Transition Type
  let transitionType: 'STANDARD' | 'COLOR_FLASH' | 'DISTRACTOR' = 'STANDARD';
  if (rules.hasDistractorScene) {
    transitionType = 'DISTRACTOR';
  } else if (rules.hasColorFlash) {
    transitionType = 'COLOR_FLASH';
  }

  // Generate Distractor scene if needed
  let distractorScene: (SceneItem | null)[] | undefined = undefined;
  if (transitionType === 'DISTRACTOR') {
    distractorScene = new Array(totalCells).fill(null);
    const distractorCount = rng.nextInt(10, 20);
    const dIndices = rng.shuffle([...cellIndices]).slice(0, distractorCount);
    for (const dIdx of dIndices) {
      const shape = rng.pick(SHAPES);
      const color = rng.pick(COLORS);
      distractorScene[dIdx] = {
        id: dIdx,
        shape,
        colorName: color.name,
        textColorClass: color.textColorClass,
        colorHex: color.hex,
        rotationDeg: rng.pick(ROTATIONS),
        scale: 1.0
      };
    }
  }

  // 4. Decide Change Type & Build Scene B
  const sceneB = cloneScene(sceneA);
  let isNoChange = false;
  let isDoubleChange = false;
  let changeCategory: ChangeCategory = 'MAJOR';
  let changeType: ChangeType = 'VANISH';
  let validTargetIndices: number[] = [];
  let basePoints: 150 | 225 = 150;

  // Probability of NO_CHANGE if enabled
  const noChangeProb = stage >= 31 ? 0.35 : 0.30;
  if (rules.hasNoChangeButton && rng.next() < noChangeProb) {
    isNoChange = true;
    changeCategory = 'NO_CHANGE';
    changeType = 'NO_CHANGE';
    validTargetIndices = [];
    basePoints = 150;
  } else if (rules.allowDoubleChange && rng.next() < 0.65) {
    // DOUBLE CHANGE (stages 46+)
    isDoubleChange = true;
    changeCategory = 'DOUBLE';
    changeType = 'DOUBLE_CHANGE';
    basePoints = 225;

    const targets = rng.shuffle([...occupiedIndices]).slice(0, 2);
    validTargetIndices = targets;

    // Apply modification to target 1 (180° rotation inversion)
    const t1 = targets[0]!;
    const item1 = sceneB[t1]!;
    item1.rotationDeg = (item1.rotationDeg + 180) % 360;

    // Apply modification to target 2 (distinct color)
    const t2 = targets[1]!;
    const item2 = sceneB[t2]!;
    const otherColors = COLORS.filter((c) => c.name !== item2.colorName);
    const newColor = rng.pick(otherColors);
    item2.colorName = newColor.name;
    item2.textColorClass = newColor.textColorClass;
    item2.colorHex = newColor.hex;
  } else {
    // Single Change
    const targetIdx = rng.pick(occupiedIndices);
    validTargetIndices = [targetIdx];

    // Determine change variety based on stage
    const candidateTypes: ChangeType[] = [];
    if (stage >= 15) {
      candidateTypes.push('COLOR_SHIFT_MINOR', 'ROTATION', 'SIZE_CHANGE');
    }
    if (stage >= 7) {
      candidateTypes.push('ROTATION', 'SIZE_CHANGE');
    }
    if (stage >= 5 && occupiedIndices.length >= 2) {
      candidateTypes.push('SWAP');
    }
    candidateTypes.push('VANISH', 'COLOR_SHIFT_MAJOR');

    changeType = rng.pick(candidateTypes);

    if (changeType === 'VANISH') {
      changeCategory = 'MAJOR';
      sceneB[targetIdx] = null; // empty in Scene B
      basePoints = 150;
    } else if (changeType === 'COLOR_SHIFT_MAJOR') {
      changeCategory = 'MAJOR';
      const item = sceneB[targetIdx]!;
      const otherColors = COLORS.filter((c) => c.name !== item.colorName);
      const newColor = rng.pick(otherColors);
      item.colorName = newColor.name;
      item.textColorClass = newColor.textColorClass;
      item.colorHex = newColor.hex;
      basePoints = 150;
    } else if (changeType === 'SWAP') {
      changeCategory = 'SWAP';
      // Pick a second target that is VISUALLY DIFFERENT from targetIdx (different shape or color)
      const otherOccupied = occupiedIndices.filter((idx) => {
        if (idx === targetIdx) return false;
        const a = sceneA[targetIdx]!;
        const b = sceneA[idx]!;
        return a.shape !== b.shape || a.colorName !== b.colorName;
      });

      if (otherOccupied.length > 0) {
        const secondTarget = rng.pick(otherOccupied);
        validTargetIndices = [targetIdx, secondTarget]; // Clicking either swapped target is correct!

        const temp = sceneB[targetIdx]!;
        sceneB[targetIdx] = sceneB[secondTarget]!;
        sceneB[secondTarget] = temp;
        basePoints = 150;
      } else {
        // Fallback: If all shapes & colors happen to be identical, do COLOR_SHIFT_MAJOR
        changeCategory = 'MAJOR';
        changeType = 'COLOR_SHIFT_MAJOR';
        const item = sceneB[targetIdx]!;
        const otherColors = COLORS.filter((c) => c.name !== item.colorName);
        const newColor = rng.pick(otherColors);
        item.colorName = newColor.name;
        item.textColorClass = newColor.textColorClass;
        item.colorHex = newColor.hex;
        basePoints = 150;
      }
    } else if (changeType === 'ROTATION') {
      changeCategory = 'MINOR';
      const item = sceneB[targetIdx]!;
      const originalRot = item.rotationDeg;
      // All shapes in SHAPES are strictly directional; rotating by 90°, 180°, or 270° is drastically distinct
      const deltaAngles = [90, 180, 270];
      const delta = rng.pick(deltaAngles);
      item.rotationDeg = (originalRot + delta) % 360;
      basePoints = 225;
    } else if (changeType === 'SIZE_CHANGE') {
      changeCategory = 'MINOR';
      const item = sceneB[targetIdx]!;
      // Obvious scale difference: 0.60 (very noticeably smaller) or 1.40 (very noticeably larger)
      item.scale = rng.next() < 0.5 ? 0.60 : 1.40;
      basePoints = 225;
    } else if (changeType === 'COLOR_SHIFT_MINOR') {
      changeCategory = 'MINOR';
      const item = sceneB[targetIdx]!;
      const colorDef = COLORS.find((c) => c.name === item.colorName) || COLORS[0]!;
      item.textColorClass = colorDef.subtleVariantClass;
      item.colorHex = colorDef.subtleHex;
      basePoints = 225;
    }
  }

  return {
    roundIndex,
    sceneA,
    sceneB,
    distractorScene,
    transitionType,
    changeCategory,
    changeType,
    validTargetIndices,
    isNoChange,
    isDoubleChange,
    viewDurationMs: rules.viewDurationMs,
    decisionTimeLimitMs: rules.decisionTimeLimitMs,
    basePoints
  };
}

export function generateWatchAndJudgeQuestion(
  rng: Rng,
  stage: number,
  _index: number
): WatchAndJudgeQuestionPayload {
  const rules = getStageRules(stage);

  // Generate 3 short rounds per stage
  const rounds: WatchAndJudgeRound[] = [
    generateSingleRound(rng, stage, 0, rules),
    generateSingleRound(rng, stage, 1, rules),
    generateSingleRound(rng, stage, 2, rules)
  ];

  let guidanceTextAr = 'احفظ أماكن الأشكال، واضغط على اللي تغيّر أو اختفى!';
  if (rules.allowDoubleChange) {
    guidanceTextAr = 'تغييرين في نفس اللحظة! المس العنصرين معاً.';
  } else if (rules.hasDistractorScene) {
    guidanceTextAr = 'مشهد مشتت في النص! ركّز في المشهد الأول وما تخليه ينسيك.';
  } else if (rules.hasColorFlash) {
    guidanceTextAr = 'وميض ألوان بين المشهدين! حافظ على صورتك الذهنية.';
  } else if (rules.hasNoChangeButton) {
    guidanceTextAr = 'مرات ما يتغير شي أصلاً! اضغط زر [ ما في تغيير ✓ ].';
  } else if (rules.isBoss) {
    guidanceTextAr = 'عنصرين بدّلوا أماكنهم! اضغط على واحد منهم.';
  }

  return {
    stage,
    itemCount: rules.itemCount,
    hasNoChangeButton: rules.hasNoChangeButton,
    rounds,
    timeLimitMs: rules.decisionTimeLimitMs,
    manualTimerStart: true,
    guidanceTextAr
  };
}
