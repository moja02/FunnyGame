import type { Rng } from '@funnygame/game-core';
import type {
  StageRules,
  CompleteSequencePayload,
  SequenceItem,
  SequenceChoice,
  ShapeData,
  ShapeType,
  ShapeColor
} from './types.js';
import {
  generateArithmetic,
  generateGeometric,
  generateIncreasingDiff,
  generateAlternatingOps,
  generateSquaresAndCubes,
  generateFibonacci,
  generatePrimes,
  generateDualSequence,
  generateRotatingShapes,
  generateEvolvingPolygonShapes,
  generateThreeAttributeShapes,
  type GeneratedPattern
} from './patterns.js';
import { ALL_SHAPE_TYPES, ALL_SHAPE_COLORS, areShapesEqual } from './shapes.js';
import { INTRO_CARDS } from './content.js';

export function getStageRules(stage: number): StageRules {
  const isBoss = stage % 5 === 0;
  const isBreathing = (stage - 1) % 5 === 0 && stage > 1;

  let categoryAr = 'متتالية أرقام خطية 🔢';
  let cSeq = 20.0;
  let isCompound = false;

  const isMiddleMissingStage =
    stage === 15 ||
    stage === 16 ||
    (stage >= 21 && stage <= 25) ||
    (stage >= 41 && stage <= 45) ||
    (stage >= 51 && stage <= 55) ||
    stage >= 66;

  if (stage >= 66) {
    categoryAr = 'تحدي المتتاليات الأسطوري ⚡';
    cSeq = 18.0;
    isCompound = true;
  } else if (stage >= 61) {
    categoryAr = 'متتاليتان متداخلتان (فيبوناتشي وحسابية) 🌀';
    cSeq = 18.0;
    isCompound = true;
  } else if (stage >= 56) {
    categoryAr = 'متتاليتان متداخلتان (أرقام وأشكال) 🔀';
    cSeq = 18.0;
    isCompound = true;
  } else if (stage >= 46) {
    categoryAr = 'متتاليتان متداخلتان (فردية وزوجية) 👥';
    cSeq = 18.0;
    isCompound = true;
  } else if (stage >= 36) {
    categoryAr = 'أعداد أولية وأشكال مركبة 🌟';
    cSeq = 18.0;
    isCompound = true;
  } else if (stage >= 26) {
    categoryAr = 'قواعد مركبة (فيبوناتشي ومربعات) 📐';
    cSeq = 18.0;
    isCompound = true;
  } else if (stage >= 20) {
    categoryAr = 'متتاليات وأعداد سالبة ❄️';
    cSeq = 19.0;
  } else if (stage >= 15) {
    categoryAr = 'الناقص في المنتصف 🎯';
    cSeq = 19.23;
  } else if (stage >= 12) {
    categoryAr = 'متتاليات أشكال مركبة 🔷';
    cSeq = 20.0;
  } else if (stage >= 10) {
    categoryAr = 'متتاليات أشكال هندسية 🔄';
    cSeq = 20.0;
  } else if (stage >= 7) {
    categoryAr = 'فروق متزايدة وقواعد مخلوطة 📈';
    cSeq = 19.5;
  } else if (stage >= 5) {
    categoryAr = 'قاعدتان مخلوطتان بالتناوب ⚡';
    cSeq = 19.0;
  }

  const u = Math.max(0.55, 1.0 - 0.012 * (stage - 1));
  const breathingExtra = isBreathing ? 2.0 : 0.0;
  const middleExtra = isMiddleMissingStage ? 1.5 : 0.0;
  const extraTimeSec = breathingExtra + middleExtra;

  // round to nearest 0.5s, minimum 6.0s floor
  const rawTime = u * cSeq + extraTimeSec;
  const timeLimitSec = Math.max(6.0, Math.round(rawTime * 2) / 2);

  return {
    categoryAr,
    isBoss,
    isBreathing,
    cSeq,
    extraTimeSec,
    timeLimitSec,
    isCompound
  };
}

export function generateCompleteSequenceQuestion(
  rng: Rng,
  stage: number,
  index: number
): CompleteSequencePayload {
  const rules = getStageRules(stage);
  const length = stage >= 66 ? 7 : 6;

  // Decide pattern family based on stage
  let pattern: GeneratedPattern;

  if (rules.isBreathing) {
    pattern = generateArithmetic(rng, length, false);
  } else if (stage >= 66) {
    pattern = rng.next() > 0.5 ? generateDualSequence(rng, length) : generateFibonacci(rng, length, true);
  } else if (stage >= 61) {
    pattern = generateDualSequence(rng, length);
  } else if (stage >= 56) {
    pattern = rng.next() > 0.5 ? generateRotatingShapes(rng, length) : generateDualSequence(rng, length);
  } else if (stage >= 46) {
    pattern = generateDualSequence(rng, length);
  } else if (stage >= 36) {
    pattern = rng.next() > 0.5 ? generatePrimes(rng, length) : generateThreeAttributeShapes(rng, length);
  } else if (stage >= 31) {
    pattern = rng.next() > 0.5 ? generateFibonacci(rng, length, true) : generateSquaresAndCubes(rng, length);
  } else if (stage >= 26) {
    pattern = rng.next() > 0.5 ? generateFibonacci(rng, length, false) : generateSquaresAndCubes(rng, length);
  } else if (stage >= 21) {
    pattern = generateAlternatingOps(rng, length);
  } else if (stage >= 20) {
    pattern = generateArithmetic(rng, length, true);
  } else if (stage >= 17) {
    pattern = rng.next() > 0.5 ? generateRotatingShapes(rng, length) : generateIncreasingDiff(rng, length);
  } else if (stage >= 15) {
    pattern = rng.next() > 0.5 ? generateArithmetic(rng, length, false) : generateGeometric(rng, length);
  } else if (stage >= 12) {
    pattern = generateEvolvingPolygonShapes(rng, length);
  } else if (stage >= 10) {
    pattern = generateRotatingShapes(rng, length);
  } else if (stage >= 7) {
    pattern = rng.next() > 0.5 ? generateIncreasingDiff(rng, length) : generateAlternatingOps(rng, length);
  } else if (stage >= 5) {
    pattern = generateAlternatingOps(rng, length);
  } else {
    pattern = rng.next() > 0.7 ? generateGeometric(rng, length) : generateArithmetic(rng, length, false);
  }

  // Determine missing index
  const isMiddleStage =
    stage === 15 ||
    stage === 16 ||
    (stage >= 21 && stage <= 25) ||
    (stage >= 41 && stage <= 45) ||
    (stage >= 51 && stage <= 55) ||
    stage >= 66 ||
    (stage >= 17 && stage <= 19 && rng.next() > 0.5);

  let missingIndex = length - 1; // default at the end
  if (isMiddleStage) {
    // Pick middle index 2, 3, or 4
    const middleChoices = [2, 3];
    if (length > 6) middleChoices.push(4);
    missingIndex = middleChoices[Math.floor(rng.next() * middleChoices.length)]!;
  }

  // Build SequenceItems and Choices
  if (pattern.type === 'number') {
    const numbers = pattern.numbers!;
    const correctVal = numbers[missingIndex]!;

    const items: SequenceItem[] = numbers.map((n, i) => ({
      id: i,
      type: 'number',
      numValue: n,
      isMissing: i === missingIndex
    }));

    // Generate 3 smart distractors
    const candidateSet = new Set<number>();
    candidateSet.add(correctVal);

    // Distractor 1: Step behind or ahead
    const prevVal = missingIndex > 0 ? numbers[missingIndex - 1]! : correctVal - 2;
    const diff = correctVal - prevVal;
    if (diff !== 0 && !candidateSet.has(correctVal + diff)) {
      candidateSet.add(correctVal + diff);
    }

    // Distractor 2: Reversed difference
    if (diff !== 0 && !candidateSet.has(correctVal - diff)) {
      candidateSet.add(correctVal - diff);
    }

    // Distractor 3: Near neighbors
    for (const offset of [1, -1, 2, -2, 3, -3, 4, -4]) {
      if (candidateSet.size >= 4) break;
      const cand = correctVal + offset;
      if (!candidateSet.has(cand)) {
        candidateSet.add(cand);
      }
    }

    // Convert set to array of 4 numbers and shuffle with rng so correct answer is uniformly distributed among 1, 2, 3, 4
    const fourNumbers = Array.from(candidateSet).slice(0, 4);
    for (let i = fourNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const temp = fourNumbers[i]!;
      fourNumbers[i] = fourNumbers[j]!;
      fourNumbers[j] = temp;
    }

    const choices: SequenceChoice[] = fourNumbers.map((val, id) => ({
      id,
      type: 'number',
      numValue: val,
      text: `${val}`,
      isCorrect: val === correctVal
    }));

    const correctChoiceIndex = choices.findIndex((c) => c.isCorrect);

    return {
      stage,
      index,
      sequenceType: 'number',
      categoryAr: rules.categoryAr,
      items,
      missingIndex,
      choices,
      correctChoiceIndex,
      ruleHintAr: pattern.ruleHintAr,
      ruleSummaryAr: pattern.ruleSummaryAr,
      timeLimitMs: rules.timeLimitSec * 1000,
      introCardAr: INTRO_CARDS[stage],
      isBoss: rules.isBoss,
      isBreathing: rules.isBreathing,
      isCompound: rules.isCompound || pattern.isCompound
    };
  } else {
    // Shape pattern
    const shapes = pattern.shapes!;
    const correctShape = shapes[missingIndex]!;

    const items: SequenceItem[] = shapes.map((s, i) => ({
      id: i,
      type: 'shape',
      shapeValue: s,
      isMissing: i === missingIndex
    }));

    // Generate 3 distinct shape distractors
    const shapeChoices: ShapeData[] = [correctShape];

    // D1: Wrong rotation
    const d1Rot = (correctShape.rotationDeg + 45) % 360;
    const s1: ShapeData = { ...correctShape, rotationDeg: d1Rot };
    if (!areShapesEqual(s1, correctShape)) shapeChoices.push(s1);

    // D2: Wrong color
    const otherColors = ALL_SHAPE_COLORS.filter((c) => c !== correctShape.color);
    const d2Color = otherColors[Math.floor(rng.next() * otherColors.length)]!;
    const s2: ShapeData = { ...correctShape, color: d2Color };
    if (!shapeChoices.some((sc) => areShapesEqual(sc, s2))) shapeChoices.push(s2);

    // D3: Wrong shape type
    const otherShapes = ALL_SHAPE_TYPES.filter((st) => st !== correctShape.shape);
    const d3Shape = otherShapes[Math.floor(rng.next() * otherShapes.length)]!;
    const s3: ShapeData = { ...correctShape, shape: d3Shape };
    if (!shapeChoices.some((sc) => areShapesEqual(sc, s3))) shapeChoices.push(s3);

    // Backfill if needed
    for (const st of ALL_SHAPE_TYPES) {
      if (shapeChoices.length >= 4) break;
      for (const col of ALL_SHAPE_COLORS) {
        if (shapeChoices.length >= 4) break;
        const cand: ShapeData = { ...correctShape, shape: st, color: col };
        if (!shapeChoices.some((sc) => areShapesEqual(sc, cand))) {
          shapeChoices.push(cand);
        }
      }
    }

    // Shuffle shape choices with rng
    const rawChoices = shapeChoices.slice(0, 4).map((s) => ({
      shape: s,
      isCorrect: areShapesEqual(s, correctShape)
    }));

    for (let i = rawChoices.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const temp = rawChoices[i]!;
      rawChoices[i] = rawChoices[j]!;
      rawChoices[j] = temp;
    }

    const choices: SequenceChoice[] = rawChoices.map((c, id) => ({
      id,
      type: 'shape',
      shapeValue: c.shape,
      isCorrect: c.isCorrect
    }));

    const correctChoiceIndex = choices.findIndex((c) => c.isCorrect);

    return {
      stage,
      index,
      sequenceType: 'shape',
      categoryAr: rules.categoryAr,
      items,
      missingIndex,
      choices,
      correctChoiceIndex,
      ruleHintAr: pattern.ruleHintAr,
      ruleSummaryAr: pattern.ruleSummaryAr,
      timeLimitMs: rules.timeLimitSec * 1000,
      introCardAr: INTRO_CARDS[stage],
      isBoss: rules.isBoss,
      isBreathing: rules.isBreathing,
      isCompound: rules.isCompound || pattern.isCompound
    };
  }
}
