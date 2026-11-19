import type { Rng } from '@funnygame/game-core';
import type {
  NumberHuntOperator,
  NumberCard,
  MergeStep,
  NumberHuntQuestionPayload
} from './types.js';
import {
  makeRational,
  rationalAdd,
  rationalSub,
  rationalMul,
  rationalDiv,
  rationalToNumber,
  isRationalInteger,
  isCleanQuarterOrHalf,
  formatRational
} from './rational.js';

export const ALL_OPERATORS: NumberHuntOperator[] = ['+', '−', '×', '÷'];

export interface StageRules {
  numCards: number;
  forbiddenOps: NumberHuntOperator[];
  requireAllNumbers: boolean;
  hasGoldenLock: boolean;
  allowDecimals: boolean;
  allowNegatives: boolean;
  targetMin: number;
  targetMax: number;
  isBoss: boolean;
  isBreathing: boolean;
  hideCardAfterMs?: number;
}

export function getStageRules(stage: number): StageRules {
  const isBoss = stage % 5 === 0;
  const isBreathing = (stage - 1) % 5 === 0 && stage > 1;

  let numCards = 4;
  if (stage >= 26) {
    numCards = (stage >= 46 && stage <= 50 && isBreathing) ? 5 : 6;
  } else if (stage >= 12) {
    numCards = 5;
  }

  const forbiddenOps: NumberHuntOperator[] = [];
  if (!isBreathing) {
    if (stage >= 26) {
      // 2 forbidden ops
      forbiddenOps.push('×', '÷');
    } else if (stage >= 8) {
      // 1 forbidden op
      forbiddenOps.push(stage % 2 === 0 ? '×' : '÷');
    }
  }

  const requireAllNumbers = stage >= 36 && !isBreathing;
  const hasGoldenLock = (stage === 20 || stage === 25) && !isBreathing;
  const allowDecimals = stage >= 46;
  const allowNegatives = stage >= 56;

  // Target ranges
  let targetMin = 15;
  let targetMax = 40;

  if (stage >= 71) {
    targetMin = 200;
    targetMax = Math.min(999, 300 + (stage - 70) * 15);
  } else if (stage >= 66) {
    targetMin = 100;
    targetMax = 400;
  } else if (stage >= 56) {
    targetMin = -150;
    targetMax = -10;
  } else if (stage >= 46) {
    targetMin = 10;
    targetMax = 120;
  } else if (stage >= 41) {
    targetMin = 250;
    targetMax = 600;
  } else if (stage >= 36) {
    targetMin = 200;
    targetMax = 450;
  } else if (stage >= 26) {
    targetMin = 150;
    targetMax = 350;
  } else if (stage >= 15) {
    targetMin = 120;
    targetMax = 200;
  } else if (stage >= 12) {
    targetMin = 80;
    targetMax = 160;
  } else if (stage >= 8) {
    targetMin = 50;
    targetMax = 110;
  } else if (stage >= 5) {
    targetMin = isBoss ? 50 : 30;
    targetMax = isBoss ? 80 : 55;
  }

  const hideCardAfterMs = stage >= 75 ? 3000 : undefined;

  return {
    numCards,
    forbiddenOps,
    requireAllNumbers,
    hasGoldenLock,
    allowDecimals,
    allowNegatives,
    targetMin,
    targetMax,
    isBoss,
    isBreathing,
    hideCardAfterMs
  };
}

export function calculateTimeLimit(stage: number, rules: StageRules): number {
  if (stage <= 4) {
    return Math.max(45, 60 - (stage - 1) * 4); // 60s, 56s, 52s, 48s
  }

  const u = Math.max(0.65, 1.0 - 0.008 * (stage - 1));

  let cHunt = 0;
  if (rules.allowDecimals || rules.allowNegatives) {
    cHunt = 12;
  } else if (rules.forbiddenOps.length >= 2 || rules.requireAllNumbers) {
    cHunt = 10;
  } else if (rules.forbiddenOps.length === 1) {
    cHunt = 5;
  }

  const eq = rules.isBreathing ? 10 : 0;
  const cardsDiff = rules.numCards - 4;
  const rawTq = u * (45 + cardsDiff * 8 + cHunt) + eq;

  return Math.max(35, Math.round(rawTq));
}

export function executeOperation(
  a: NumberCard,
  b: NumberCard,
  op: NumberHuntOperator,
  allowDecimals: boolean,
  allowNegatives: boolean
): NumberCard | null {
  let resRational = makeRational(0);

  if (op === '+') {
    resRational = rationalAdd(a.rational, b.rational);
  } else if (op === '−') {
    resRational = rationalSub(a.rational, b.rational);
  } else if (op === '×') {
    resRational = rationalMul(a.rational, b.rational);
  } else if (op === '÷') {
    const divRes = rationalDiv(a.rational, b.rational);
    if (!divRes) return null; // Divide by zero
    resRational = divRes;
  }

  const numVal = rationalToNumber(resRational);

  // Negative check
  if (!allowNegatives && numVal < 0) {
    return null;
  }

  // Decimal check: in stages < 46, must be integer
  if (!allowDecimals) {
    if (!isRationalInteger(resRational)) return null;
  } else {
    // In stages >= 46, if not integer, must be clean .25, .5, .75
    if (!isCleanQuarterOrHalf(resRational)) return null;
  }

  const resultId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  return {
    id: resultId,
    value: numVal,
    displayValue: formatRational(resRational),
    rational: resRational,
    sourceCardIds: [...(a.sourceCardIds || [a.id]), ...(b.sourceCardIds || [b.id])]
  };
}

export function generateNumberHuntQuestion(
  rng: Rng,
  stage: number,
  _index: number
): NumberHuntQuestionPayload {
  const rules = getStageRules(stage);
  const timeLimitMs = calculateTimeLimit(stage, rules) * 1000;

  const allowedOps = ALL_OPERATORS.filter((op) => !rules.forbiddenOps.includes(op));

  // Small numbers pool
  const smallPool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  // Large numbers pool (for stages 12+)
  const largePool = [25, 50, 75, 100];

  let bestPayload: NumberHuntQuestionPayload | null = null;
  let attempts = 0;

  while (attempts < 80 && !bestPayload) {
    attempts++;
    const localRng = attempts === 1 ? rng : rng.fork();

    // 1. Generate initial numbers
    const initialValues: number[] = [];
    const hasLarge = rules.numCards >= 5 && localRng.next() < 0.7;

    if (hasLarge) {
      initialValues.push(localRng.pick(largePool));
    }

    while (initialValues.length < rules.numCards) {
      initialValues.push(localRng.pick(smallPool));
    }

    // Shuffle initial values
    for (let i = initialValues.length - 1; i > 0; i--) {
      const j = localRng.nextInt(0, i);
      const tmp = initialValues[i]!;
      initialValues[i] = initialValues[j]!;
      initialValues[j] = tmp;
    }

    // Golden lock card
    const goldenLockIdx = rules.hasGoldenLock ? localRng.nextInt(0, rules.numCards - 1) : -1;

    let cards: NumberCard[] = initialValues.map((v, idx) => ({
      id: `card_${idx}`,
      value: v,
      displayValue: String(v),
      rational: makeRational(v),
      isGoldenLocked: idx === goldenLockIdx,
      sourceCardIds: [`card_${idx}`]
    }));

    const goldenLockCardId = goldenLockIdx >= 0 ? cards[goldenLockIdx]!.id : undefined;
    const initialCardsCopy = cards.map((c) => ({ ...c }));

    // 2. Build constructive solution tree
    const steps: MergeStep[] = [];
    const minSteps = rules.requireAllNumbers ? rules.numCards - 1 : Math.max(2, rules.numCards - 2);
    let failedToBuild = false;

    for (let s = 0; s < minSteps; s++) {
      if (cards.length < 2) break;

      // Filter available candidates
      let candidateAIdx = localRng.nextInt(0, cards.length - 1);
      let candidateBIdx = localRng.nextInt(0, cards.length - 1);
      while (candidateBIdx === candidateAIdx) {
        candidateBIdx = localRng.nextInt(0, cards.length - 1);
      }

      // If golden lock is present, do not use golden lock card until the last step
      if (rules.hasGoldenLock && s < minSteps - 1 && goldenLockCardId) {
        let retries = 0;
        while (
          (cards[candidateAIdx]!.sourceCardIds?.includes(goldenLockCardId) ||
            cards[candidateBIdx]!.sourceCardIds?.includes(goldenLockCardId)) &&
          retries < 10
        ) {
          candidateAIdx = localRng.nextInt(0, cards.length - 1);
          candidateBIdx = localRng.nextInt(0, cards.length - 1);
          while (candidateBIdx === candidateAIdx) {
            candidateBIdx = localRng.nextInt(0, cards.length - 1);
          }
          retries++;
        }
      }

      const cardA = cards[candidateAIdx]!;
      const cardB = cards[candidateBIdx]!;

      // Try operations
      const shuffledOps = [...allowedOps];
      for (let i = shuffledOps.length - 1; i > 0; i--) {
        const j = localRng.nextInt(0, i);
        const tmp = shuffledOps[i]!;
        shuffledOps[i] = shuffledOps[j]!;
        shuffledOps[j] = tmp;
      }

      let merged: NumberCard | null = null;
      let usedOp: NumberHuntOperator = '+';

      for (const op of shuffledOps) {
        // Try A op B
        let m = executeOperation(cardA, cardB, op, rules.allowDecimals, rules.allowNegatives);
        if (m && Math.abs(m.value) <= 1500 && m.value !== 0) {
          merged = m;
          usedOp = op;
          break;
        }
        // Try B op A (for subtraction or division)
        if (op === '−' || op === '÷') {
          m = executeOperation(cardB, cardA, op, rules.allowDecimals, rules.allowNegatives);
          if (m && Math.abs(m.value) <= 1500 && m.value !== 0) {
            merged = m;
            usedOp = op;
            // swap
            const tmpCard = cardA;
            (cards as any)[candidateAIdx] = cardB;
            (cards as any)[candidateBIdx] = tmpCard;
            break;
          }
        }
      }

      if (!merged) {
        failedToBuild = true;
        break;
      }

      const stepA = cards[candidateAIdx]!;
      const stepB = cards[candidateBIdx]!;

      steps.push({
        cardAId: stepA.id,
        cardAValue: stepA.value,
        op: usedOp,
        cardBId: stepB.id,
        cardBValue: stepB.value,
        resultId: merged.id,
        resultValue: merged.value
      });

      // Remove A and B from working cards and add merged
      const higherIdx = Math.max(candidateAIdx, candidateBIdx);
      const lowerIdx = Math.min(candidateAIdx, candidateBIdx);
      cards.splice(higherIdx, 1);
      cards.splice(lowerIdx, 1);
      cards.push(merged);
    }

    if (failedToBuild || steps.length < 2) continue;

    const targetCard = cards[cards.length - 1]!;
    const targetVal = targetCard.value;

    // Reject target if it directly equals any initial card
    if (initialValues.includes(targetVal)) continue;

    // Check golden lock satisfaction in solution
    if (rules.hasGoldenLock && goldenLockCardId) {
      const lastStep = steps[steps.length - 1]!;
      const usedInLast =
        lastStep.cardAId === goldenLockCardId ||
        lastStep.cardBId === goldenLockCardId ||
        initialCardsCopy.find((c) => c.id === goldenLockCardId)?.value === lastStep.cardAValue ||
        initialCardsCopy.find((c) => c.id === goldenLockCardId)?.value === lastStep.cardBValue;
      if (!usedInLast) continue;
    }

    // Check target bounds
    const isWithinBounds =
      rules.allowNegatives
        ? targetVal <= rules.targetMax && targetVal >= rules.targetMin
        : targetVal >= rules.targetMin && targetVal <= rules.targetMax;

    if (isWithinBounds || attempts >= 40) {
      const guidance = rules.requireAllNumbers
        ? 'ادمج كل الأرقام بدون ما تفضل ولا بطاقة للوصول للهدف!'
        : rules.hasGoldenLock
        ? 'الرقم المقفل بالذهبي لازم يكون في آخر خطوة!'
        : rules.forbiddenOps.length > 0
        ? `ادمج الأرقام للوصول للهدف (ممنوع: ${rules.forbiddenOps.join(' ، ')})`
        : 'ادمج الأرقام بالعمليات الحسابية للوصول للهدف بالضبط!';

      bestPayload = {
        stage,
        target: targetVal,
        targetDisplay: formatRational(targetCard.rational),
        initialCards: initialCardsCopy,
        forbiddenOps: rules.forbiddenOps,
        requireAllNumbers: rules.requireAllNumbers,
        goldenLockCardId,
        hideCardAfterMs: rules.hideCardAfterMs,
        hiddenCardIndex: rules.hideCardAfterMs ? localRng.nextInt(0, initialCardsCopy.length - 1) : undefined,
        solutionSteps: steps,
        timeLimitMs,
        guidanceTextAr: guidance
      };
    }
  }

  if (!bestPayload) {
    // Robust fallback question that strictly satisfies rules
    const fallbackCards: NumberCard[] = [
      { id: 'c0', value: 3, displayValue: '3', rational: makeRational(3), sourceCardIds: ['c0'] },
      { id: 'c1', value: 4, displayValue: '4', rational: makeRational(4), sourceCardIds: ['c1'] },
      { id: 'c2', value: 2, displayValue: '2', rational: makeRational(2), sourceCardIds: ['c2'] },
      { id: 'c3', value: 5, displayValue: '5', rational: makeRational(5), sourceCardIds: ['c3'] }
    ];
    const step1: MergeStep = {
      cardAId: 'c0',
      cardAValue: 3,
      op: '+',
      cardBId: 'c1',
      cardBValue: 4,
      resultId: 'res1',
      resultValue: 7
    };
    const step2: MergeStep = {
      cardAId: 'res1',
      cardAValue: 7,
      op: '×',
      cardBId: 'c2',
      cardBValue: 2,
      resultId: 'res2',
      resultValue: 14
    };

    bestPayload = {
      stage,
      target: 14,
      targetDisplay: '14',
      initialCards: fallbackCards,
      forbiddenOps: [],
      requireAllNumbers: false,
      solutionSteps: [step1, step2],
      timeLimitMs: 60000,
      guidanceTextAr: 'ادمج الأرقام بالعمليات الحسابية للوصول للهدف بالضبط!'
    };
  }

  return bestPayload;
}
