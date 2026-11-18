import type { Rng } from '@funnygame/game-core';
import type {
  QuestionPattern,
  ChainStep,
  MathExpression
} from './types.js';

// Unicode symbols as specified in the document
export const OP_SUB = '−'; // U+2212
export const OP_MUL = '×'; // U+00D7
export const OP_DIV = '÷'; // U+00F7
export const OP_ADD = '+';

export interface StageRules {
  stage: number;
  isBoss: boolean;
  isBreathing: boolean;
  unitTime: number; // u(s)
  rMax: number;
  hasCloseChoices: boolean;
  rhoDurationMs: number;
}

/**
 * Computes stage difficulty configuration and timing parameters
 */
export function getStageRules(stage: number): StageRules {
  const isBoss = stage % 5 === 0;
  const isBreathing = (stage - 1) % 5 === 0 && stage > 1;

  // u(s): calibrated comfortably for mental calculation
  // u(1) = 3.5s, scaling down smoothly down to min 1.0s
  const unitTime = Math.max(1.0, 3.5 - 0.04 * (stage - 1));

  // R max: 99 until stage 18, 999 from 19, 9999 from 37
  let rMax = 99;
  if (stage >= 37) {
    rMax = 9999;
  } else if (stage >= 19) {
    rMax = 999;
  }

  // Close choices: enabled from stage 15 onwards, except in breathing stages
  const hasCloseChoices = stage >= 15 && !isBreathing;

  // Flash duration rho for H mode (from stage 46)
  let rhoDurationMs = 800; // 0.8s
  if (stage >= 56) {
    // 0.6s at stage 56-70, decreasing 0.05 every 5 stages down to 0.4s
    const steps = Math.floor((stage - 56) / 5);
    rhoDurationMs = Math.max(400, 600 - steps * 50);
  }

  return {
    stage,
    isBoss,
    isBreathing,
    unitTime,
    rMax,
    hasCloseChoices,
    rhoDurationMs
  };
}

/**
 * Generates initial R0 for stages with C, K, or H
 */
export function generateInitialR0(rng: Rng, stage: number): number {
  if (stage < 10) return 0;
  if (stage < 20) {
    return rng.nextInt(5, 40);
  } else if (stage < 37) {
    return rng.nextInt(-50, 200);
  } else {
    return rng.nextInt(-300, 999);
  }
}

/**
 * Determines question pattern (S, C, K, L, H) for a given stage
 */
export function pickQuestionPattern(rng: Rng, stage: number, isBoss: boolean, isBreathing: boolean): QuestionPattern {
  // Breathing stages: S and C with light steps, K2 (25%) from 26, H from 46
  if (isBreathing) {
    if (stage >= 46) return 'H';
    if (stage >= 26) {
      const roll = rng.next();
      if (roll < 0.25) return 'K';
      if (roll < 0.60) return 'C';
      return 'S';
    }
    if (stage >= 10) {
      return rng.next() < 0.5 ? 'C' : 'S';
    }
    return 'S';
  }

  // Boss stages: equal mix of all unlocked patterns
  if (isBoss) {
    const unlocked: QuestionPattern[] = ['S'];
    if (stage >= 10) unlocked.push('C');
    if (stage >= 26) unlocked.push('K');
    if (stage >= 28) unlocked.push('L');
    if (stage >= 46) unlocked.push('H');
    return rng.pick(unlocked);
  }

  // From stage 46: C and K are hidden (H), while S and L remain visible
  if (stage >= 46) {
    const roll = rng.next();
    // 10% S, 25% C(as H), 35% K(as H), 30% L
    if (roll < 0.10) return 'S';
    if (roll < 0.40) return 'L';
    return 'H';
  }

  if (stage >= 28) {
    // 20% S, 25% C, 30% K, 25% L
    const roll = rng.next();
    if (roll < 0.20) return 'S';
    if (roll < 0.45) return 'C';
    if (roll < 0.75) return 'K';
    return 'L';
  }

  if (stage >= 27) {
    // 30% S, 40% C, 30% K
    const roll = rng.next();
    if (roll < 0.30) return 'S';
    if (roll < 0.70) return 'C';
    return 'K';
  }

  if (stage === 26) {
    return rng.next() < 0.5 ? 'K' : 'C';
  }

  if (stage >= 10) {
    // 40% S, 60% C
    return rng.next() < 0.40 ? 'S' : 'C';
  }

  return 'S';
}

/**
 * Generates an isolated single mathematical expression (for S or L sides)
 */
export function generateSingleExpression(
  rng: Rng,
  stage: number,
  allowPriority: boolean = false
): MathExpression {
  // Decide if Priority P2 should be generated
  const canP2 = allowPriority && stage >= 14;
  const p2Chance = stage >= 26 ? 0.40 : stage >= 14 ? 0.25 : 0;
  if (canP2 && rng.next() < p2Chance) {
    return generatePriorityExpression(rng, stage);
  }

  // Operation selection based on stage
  let canMultiplyDivide = stage >= 5;
  let multDivWeight = 0;
  if (stage === 5) multDivWeight = 0.50;
  else if (stage <= 8) multDivWeight = 0.40;
  else if (stage <= 19) multDivWeight = 0.50;
  else if (stage >= 20) multDivWeight = 0.60;

  const isMultDiv = canMultiplyDivide && rng.next() < multDivWeight;

  if (isMultDiv) {
    // Pick Multiplication or Division
    const isMult = rng.next() < 0.5;
    if (isMult) {
      // Pick M1, M2, or M3
      let mType: 'M1' | 'M2' | 'M3' = 'M1';
      if (stage >= 18) {
        const roll = rng.next();
        mType = roll < 0.40 ? 'M1' : roll < 0.80 ? 'M2' : 'M3';
      } else if (stage >= 9) {
        mType = rng.next() < 0.50 ? 'M1' : 'M2';
      }

      if (mType === 'M3') {
        const a = rng.nextInt(12, 50);
        const b = rng.pick([10, 11, 12, 15, 20, 25]);
        return {
          text: `${a} ${OP_MUL} ${b}`,
          result: a * b,
          cost: 3.0,
          operationCount: 1
        };
      } else if (mType === 'M2') {
        const a = rng.nextInt(11, 49);
        const b = rng.nextInt(3, 9);
        return {
          text: `${a} ${OP_MUL} ${b}`,
          result: a * b,
          cost: 2.5,
          operationCount: 1
        };
      } else {
        // M1
        const a = rng.nextInt(2, 9);
        const b = rng.nextInt(2, 9);
        return {
          text: `${a} ${OP_MUL} ${b}`,
          result: a * b,
          cost: 1.5,
          operationCount: 1
        };
      }
    } else {
      // Division: D1, D2, or D3
      let dType: 'D1' | 'D2' | 'D3' = 'D1';
      if (stage >= 37) {
        const roll = rng.next();
        dType = roll < 0.40 ? 'D1' : roll < 0.80 ? 'D2' : 'D3';
      } else if (stage >= 12) {
        dType = rng.next() < 0.60 ? 'D1' : 'D2';
      }

      if (dType === 'D3') {
        const b = rng.nextInt(3, 9);
        const quotient = rng.nextInt(25, 120);
        const dividend = quotient * b;
        return {
          text: `${dividend} ${OP_DIV} ${b}`,
          result: quotient,
          cost: 3.0,
          operationCount: 1
        };
      } else if (dType === 'D2') {
        const b = rng.nextInt(2, 9);
        const quotient = rng.nextInt(11, 45);
        const dividend = quotient * b;
        return {
          text: `${dividend} ${OP_DIV} ${b}`,
          result: quotient,
          cost: 2.0,
          operationCount: 1
        };
      } else {
        // D1 table
        const b = rng.nextInt(2, 9);
        const quotient = rng.nextInt(2, 9);
        const dividend = quotient * b;
        return {
          text: `${dividend} ${OP_DIV} ${b}`,
          result: quotient,
          cost: 1.5,
          operationCount: 1
        };
      }
    }
  }

  // Addition & Subtraction
  const isSub = stage >= 2 && rng.next() < 0.5;
  const allowNegative =
    stage >= 17 ? rng.next() < 0.40 : stage >= 8 ? rng.next() < 0.25 : false;

  // Decide category A1, A2, A3
  let maxNum = 20;
  let cost = 1.0;
  if (stage >= 37) {
    maxNum = 2500;
    cost = 2.5;
  } else if (stage >= 13) {
    maxNum = 450;
    cost = 2.5;
  } else if (stage >= 4) {
    maxNum = 99;
    cost = 1.5;
  } else if (stage >= 3) {
    maxNum = 45;
    cost = 1.5;
  } else {
    // stage 1 or 2
    maxNum = 15;
    cost = 1.0;
  }

  if (isSub) {
    let a: number;
    let b: number;
    if (stage <= 2) {
      a = rng.nextInt(4, 15);
      b = rng.nextInt(2, a - 1);
    } else if (allowNegative) {
      b = rng.nextInt(Math.floor(maxNum / 3), maxNum);
      a = rng.nextInt(2, b - 1);
    } else {
      a = rng.nextInt(Math.floor(maxNum / 2), maxNum);
      b = rng.nextInt(2, a - 1);
    }
    const res = a - b;
    return {
      text: `${a} ${OP_SUB} ${b}`,
      result: res,
      cost,
      operationCount: 1
    };
  } else {
    // Addition
    let a: number;
    let b: number;
    if (stage <= 2) {
      a = rng.nextInt(2, 10);
      b = rng.nextInt(2, 10);
    } else {
      a = rng.nextInt(5, Math.floor(maxNum * 0.6));
      b = rng.nextInt(5, Math.floor(maxNum * 0.4));
    }
    return {
      text: `${a} ${OP_ADD} ${b}`,
      result: a + b,
      cost,
      operationCount: 1
    };
  }
}

/**
 * Generates an order-of-operations expression P2 (e.g. 7 + 6 × 8)
 */
function generatePriorityExpression(rng: Rng, _stage: number): MathExpression {
  // Multiply or divide paired with add or sub
  const isMult = rng.next() < 0.7;
  const isAdd = rng.next() < 0.6;
  const multFirst = rng.next() < 0.5;

  let mulA = rng.nextInt(3, 9);
  let mulB = rng.nextInt(3, 9);
  let mulRes = mulA * mulB;

  let otherNum = rng.nextInt(4, 25);

  let text = '';
  let result = 0;

  if (isMult) {
    if (multFirst) {
      if (isAdd) {
        text = `${mulA} ${OP_MUL} ${mulB} ${OP_ADD} ${otherNum}`;
        result = mulRes + otherNum;
      } else {
        text = `${mulA} ${OP_MUL} ${mulB} ${OP_SUB} ${otherNum}`;
        result = mulRes - otherNum;
      }
    } else {
      if (isAdd) {
        text = `${otherNum} ${OP_ADD} ${mulA} ${OP_MUL} ${mulB}`;
        result = otherNum + mulRes;
      } else {
        text = `${otherNum} ${OP_SUB} ${mulA} ${OP_MUL} ${mulB}`;
        result = otherNum - mulRes;
      }
    }
  } else {
    // Division
    const divB = rng.nextInt(2, 7);
    const divQuot = rng.nextInt(3, 9);
    const divDividend = divB * divQuot;

    if (multFirst) {
      text = `${divDividend} ${OP_DIV} ${divB} ${isAdd ? OP_ADD : OP_SUB} ${otherNum}`;
      result = isAdd ? divQuot + otherNum : divQuot - otherNum;
    } else {
      text = `${otherNum} ${isAdd ? OP_ADD : OP_SUB} ${divDividend} ${OP_DIV} ${divB}`;
      result = isAdd ? otherNum + divQuot : otherNum - divQuot;
    }
  }

  return {
    text,
    result,
    cost: 1.5 + 1.5 + 0.5, // P2 = sum of two operations + 0.5
    operationCount: 2
  };
}

/**
 * Generates a valid step to apply on accumulator R
 */
export function generateStepOnR(
  rng: Rng,
  currentR: number,
  rMax: number,
  stage: number,
  prevStepOp?: string
): ChainStep {
  // Valid operators for this step
  const operators: Array<'+' | '−' | '×' | '÷'> = ['+', '−'];

  // Multiply available if stage >= 5 and |currentR| is reasonable
  if (stage >= 5 && Math.abs(currentR) <= Math.floor(rMax / 3) && Math.abs(currentR) >= 2) {
    operators.push('×');
  }

  // Division available if stage >= 5 and currentR has a clean factor in [2..9]
  const validDivisors: number[] = [];
  if (stage >= 5 && Math.abs(currentR) > 1) {
    for (let d = 2; d <= 9; d++) {
      if (Math.abs(currentR) % d === 0) {
        validDivisors.push(d);
      }
    }
    if (validDivisors.length > 0) {
      operators.push('÷');
    }
  }

  // Pick operator (avoid exact duplicate or immediate cancel)
  let chosenOp = rng.pick(operators);
  if (prevStepOp === '+' && chosenOp === '−' && operators.length > 2) {
    chosenOp = rng.pick(operators.filter((o) => o !== '−'));
  } else if (prevStepOp === '×' && chosenOp === '÷' && operators.length > 2) {
    chosenOp = rng.pick(operators.filter((o) => o !== '÷'));
  }

  if (chosenOp === '÷' && validDivisors.length > 0) {
    const divisor = rng.pick(validDivisors);
    const cost = Math.abs(currentR) >= 100 ? 3.0 : 2.0;
    return {
      op: '÷',
      operand: divisor,
      text: `${OP_DIV} ${divisor}`,
      cost
    };
  }

  if (chosenOp === '×') {
    // Choose multiplier such that |currentR * m| <= rMax
    const maxM = Math.min(stage >= 18 ? 12 : 9, Math.floor(rMax / Math.max(1, Math.abs(currentR))));
    if (maxM >= 2) {
      const multiplier = rng.nextInt(2, maxM);
      const cost = Math.abs(currentR) >= 10 ? 2.5 : 1.5;
      return {
        op: '×',
        operand: multiplier,
        text: `${OP_MUL} ${multiplier}`,
        cost
      };
    }
    // Fallback to addition or subtraction if multiplier not feasible
    chosenOp = rng.next() < 0.5 ? '+' : '−';
  }

  // Addition or Subtraction step
  let deltaMax = stage >= 37 ? 250 : stage >= 19 ? 85 : stage >= 10 ? 35 : 15;
  const delta = rng.nextInt(2, deltaMax);

  if (chosenOp === '+') {
    // Ensure we don't overshoot rMax
    if (currentR + delta > rMax) {
      return {
        op: '−',
        operand: delta,
        text: `${OP_SUB} ${delta}`,
        cost: delta > 20 ? 1.5 : 1.0
      };
    }
    return {
      op: '+',
      operand: delta,
      text: `${OP_ADD} ${delta}`,
      cost: delta > 20 ? 1.5 : 1.0
    };
  } else {
    // Subtraction
    // Ensure we don't undershoot -rMax
    if (currentR - delta < -rMax) {
      return {
        op: '+',
        operand: delta,
        text: `${OP_ADD} ${delta}`,
        cost: delta > 20 ? 1.5 : 1.0
      };
    }
    return {
      op: '−',
      operand: delta,
      text: `${OP_SUB} ${delta}`,
      cost: delta > 20 ? 1.5 : 1.0
    };
  }
}

/**
 * Applies a chain step on a number and returns the new value
 */
export function applyStep(r: number, step: ChainStep): number {
  switch (step.op) {
    case '+':
      return r + step.operand;
    case '−':
      return r - step.operand;
    case '×':
      return r * step.operand;
    case '÷':
      return Math.trunc(r / step.operand);
  }
}

/**
 * Generates 3 strictly sorted ascending choices with cognitive traps
 */
export function generateThreeChoices(
  rng: Rng,
  correctAnswer: number,
  targetPos: 0 | 1 | 2, // 0: top, 1: middle, 2: bottom
  hasCloseChoices: boolean,
  prevR: number | null,
  intermediateR: number | null,
  isLMode: boolean,
  otherLVal?: number
): [number, number, number] {
  // If close choices mode is active: 3 consecutive numbers
  if (hasCloseChoices && !isLMode) {
    if (targetPos === 0) {
      return [correctAnswer, correctAnswer + 1, correctAnswer + 2];
    } else if (targetPos === 1) {
      return [correctAnswer - 1, correctAnswer, correctAnswer + 1];
    } else {
      return [correctAnswer - 2, correctAnswer - 1, correctAnswer];
    }
  }

  // If L mode: choices include both A and B, plus a third close distractor
  if (isLMode && otherLVal !== undefined) {
    const smaller = Math.min(correctAnswer, otherLVal);
    const larger = Math.max(correctAnswer, otherLVal);

    if (targetPos === 2) {
      // Correct at bottom: third < smaller < larger
      const lowThird = smaller - (rng.next() < 0.5 ? 1 : 2);
      return [lowThird, smaller, larger];
    } else {
      // Correct in middle: smaller < larger < third
      let highThird = larger + (rng.next() < 0.5 ? 1 : 2);
      if (highThird <= larger) highThird = larger + 1;
      return [smaller, larger, highThird];
    }
  }

  // Standard distractor generation pool
  const distractors = new Set<number>();

  // 1. Trap: forgot to apply operation (R itself)
  if (prevR !== null && prevR !== correctAnswer && rng.next() < 0.40) {
    distractors.add(prevR);
  }

  // 2. Trap: forgot last step in K
  if (intermediateR !== null && intermediateR !== correctAnswer && rng.next() < 0.50) {
    distractors.add(intermediateR);
  }

  // 3. Off-by-ten / carrying error
  if (rng.next() < 0.6) {
    distractors.add(correctAnswer + 10);
    distractors.add(correctAnswer - 10);
  }

  // 4. Close offsets
  distractors.add(correctAnswer + 1);
  distractors.add(correctAnswer - 1);
  distractors.add(correctAnswer + 2);
  distractors.add(correctAnswer - 2);

  // 5. Digit transposition (e.g. 47 <-> 74)
  if (Math.abs(correctAnswer) >= 12 && Math.abs(correctAnswer) <= 99) {
    const sign = correctAnswer < 0 ? -1 : 1;
    const abs = Math.abs(correctAnswer);
    const tens = Math.floor(abs / 10);
    const units = abs % 10;
    if (tens !== units && units !== 0) {
      distractors.add(sign * (units * 10 + tens));
    }
  }

  // 6. Sign flip
  if (correctAnswer !== 0 && Math.abs(correctAnswer) <= 50) {
    distractors.add(-correctAnswer);
  }

  // Filter out correctAnswer from distractors
  distractors.delete(correctAnswer);

  const distractorList = Array.from(distractors);
  const smallerAsc = distractorList.filter((d) => d < correctAnswer).sort((a, b) => a - b);
  const largerAsc = distractorList.filter((d) => d > correctAnswer).sort((a, b) => a - b);

  // Generate candidates satisfying target position:
  if (targetPos === 0) {
    const d1 = largerAsc.length > 0 ? largerAsc[0]! : correctAnswer + 1;
    let d2 = largerAsc.length > 1 ? largerAsc[1]! : d1 + 1;
    if (d2 <= d1) d2 = d1 + 1;
    return [correctAnswer, d1, d2];
  } else if (targetPos === 1) {
    const d1 = smallerAsc.length > 0 ? smallerAsc[smallerAsc.length - 1]! : correctAnswer - 1;
    const d2 = largerAsc.length > 0 ? largerAsc[0]! : correctAnswer + 1;
    return [d1, correctAnswer, d2];
  } else {
    const d2 = smallerAsc.length > 0 ? smallerAsc[smallerAsc.length - 1]! : correctAnswer - 1;
    let d1 = smallerAsc.length > 1 ? smallerAsc[smallerAsc.length - 2]! : d2 - 1;
    if (d1 >= d2) d1 = d2 - 1;
    return [d1, d2, correctAnswer];
  }
}
