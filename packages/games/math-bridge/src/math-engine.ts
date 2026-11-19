import type { Rng } from '@funnygame/game-core';
import type { MathBridgePattern, MathBridgeQuestionPayload } from './types.js';

// Unicode symbols
export const OP_ADD = '+';
export const OP_SUB = '−'; // U+2212
export const OP_MUL = '×'; // U+00D7
export const OP_DIV = '÷'; // U+00F7
export const OP_MOD = '%';

export const BASIC_OPS = [OP_ADD, OP_SUB, OP_MUL, OP_DIV];
export const ALL_OPS = [OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_MOD];

/**
 * Evaluates a simple arithmetic expression safely following standard precedence:
 * Parentheses -> Square roots & Exponents -> Mul, Div, Mod -> Add, Sub.
 * Returns null if calculation is invalid (division by zero, fractional division, negative root).
 */
export function evaluateExpression(exprStr: string): number | null {
  try {
    let clean = exprStr.trim();

    // 1. Resolve parentheses recursively
    while (clean.includes('(')) {
      const match = clean.match(/\(([^()]+)\)/);
      if (!match || match.index === undefined) break;
      const subVal = evaluateExpression(match[1]!);
      if (subVal === null) return null;
      clean =
        clean.slice(0, match.index) +
        (subVal < 0 ? `~${Math.abs(subVal)}` : `${subVal}`) +
        clean.slice(match.index + match[0].length);
    }

    // 2. Resolve square roots (e.g. √16 -> 4)
    clean = clean.replace(/√(\d+)/g, (_, nStr) => {
      const n = parseInt(nStr, 10);
      const sqrt = Math.sqrt(n);
      return Number.isInteger(sqrt) ? String(sqrt) : 'INVALID';
    });
    if (clean.includes('INVALID')) return null;

    // 3. Resolve exponents (e.g. 3^2 -> 9, 2^3 -> 8)
    clean = clean.replace(/(\d+)\^(\d+)/g, (_, baseStr, expStr) => {
      const b = parseInt(baseStr, 10);
      const e = parseInt(expStr, 10);
      return String(Math.pow(b, e));
    });

    // 4. Tokenize
    // Replace negative numbers in parentheses e.g. (-4) with ~4 for tokenizer
    clean = clean.replace(/\(-(\d+)\)/g, '~$1');

    // Normalize operators
    clean = clean
      .replace(/−/g, '-')
      .replace(/×/g, '*')
      .replace(/÷/g, '/');

    // Split tokens by spaces or operators
    const rawTokens = clean.match(/~?\d+|[-+*/%]/g);
    if (!rawTokens || rawTokens.length === 0) return null;

    const tokens: (number | string)[] = rawTokens.map((t) => {
      if (t.startsWith('~')) {
        return -parseInt(t.slice(1), 10);
      }
      if (/^\d+$/.test(t)) {
        return parseInt(t, 10);
      }
      return t;
    });

    // Handle leading negative number
    if (tokens[0] === '-' && typeof tokens[1] === 'number') {
      tokens.splice(0, 2, -tokens[1]);
    }

    // 5. First pass: *, /, % (left to right)
    let i = 0;
    while (i < tokens.length) {
      const op = tokens[i];
      if (op === '*' || op === '/' || op === '%') {
        const left = tokens[i - 1];
        const right = tokens[i + 1];
        if (typeof left !== 'number' || typeof right !== 'number') return null;

        let res = 0;
        if (op === '*') {
          res = left * right;
        } else if (op === '/') {
          if (right === 0 || left % right !== 0) return null;
          res = Math.trunc(left / right);
        } else if (op === '%') {
          if (right === 0) return null;
          res = left % right;
        }

        tokens.splice(i - 1, 3, res);
        i -= 1;
      } else {
        i++;
      }
    }

    // 6. Second pass: +, - (left to right)
    i = 0;
    while (i < tokens.length) {
      const op = tokens[i];
      if (op === '+' || op === '-') {
        const left = tokens[i - 1];
        const right = tokens[i + 1];
        if (typeof left !== 'number' || typeof right !== 'number') return null;

        const res = op === '+' ? left + right : left - right;
        tokens.splice(i - 1, 3, res);
        i -= 1;
      } else {
        i++;
      }
    }

    if (tokens.length === 1 && typeof tokens[0] === 'number') {
      return tokens[0];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Calculates cognitive equation cost C_eq
 */
export function getEquationCost(pattern: MathBridgePattern): number {
  switch (pattern) {
    case 'single_op':
      return 2.5;
    case 'missing_num':
      return 4.2;
    case 'double_op':
      return 4.6;
    case 'parentheses':
      return 4.4;
    case 'negative_res':
      return 4.2;
    case 'triple_exponents':
    case 'square_roots':
    case 'modulo':
      return 4.8;
    case 'linked_eq':
      return 5.5;
    default:
      return 2.5;
  }
}

/**
 * Computes speed factor u(s) and time limit T_q
 */
export function calculateTimeLimit(
  stage: number,
  pattern: MathBridgePattern,
  isBreathing: boolean,
  hasNegatives: boolean
): number {
  let rawTq: number;

  if (pattern === 'single_op') {
    // Fast, snappy start for single operations (Stages 1-4: 5.0s down to 4.2s)
    const baseSingleTime = Math.max(2.5, 5.0 - 0.25 * (stage - 1));
    rawTq = baseSingleTime;
  } else {
    // Compound operations (double op, parentheses, exponents, roots, linked eq)
    // require significant mental calculation and AST parsing.
    // They start generous (7.5s - 8.5s) and decay very gently.
    const cost = getEquationCost(pattern);
    // Base speed factor for compound: begins around 1.65 and decreases slowly (-0.015 per stage)
    const u = Math.max(0.9, 1.65 - 0.015 * Math.max(0, stage - 5));

    // Cognitive buffer for complex multi-slot/algebra operations
    let buffer = 0;
    if (pattern === 'linked_eq') buffer += 1.2;
    else if (pattern === 'double_op' || pattern === 'parentheses') buffer += 0.5;

    rawTq = u * cost + buffer;
  }

  let eq = 0;
  if (isBreathing) eq += 0.8;
  if (hasNegatives) eq += 0.4;

  const totalTq = rawTq + eq;

  // Floors: compound operations never drop below 4.0s (4.5s for linked_eq)
  const floor = pattern === 'single_op' ? 2.0 : pattern === 'linked_eq' ? 4.5 : 4.0;
  return Math.max(floor, Math.round(totalTq * 10) / 10);
}

/**
 * Determines question pattern based on stage
 */
export function pickPatternForStage(
  rng: Rng,
  stage: number,
  isBoss: boolean,
  isBreathing: boolean
): MathBridgePattern {
  // Breathing stages return to simpler, lighter mechanics
  if (isBreathing) {
    if (stage >= 46) return 'linked_eq';
    if (stage >= 26) return 'double_op';
    if (stage >= 16) return 'missing_num';
    return 'single_op';
  }

  // Boss stages mix the most advanced mechanics unlocked
  if (isBoss) {
    if (stage >= 65) return 'linked_eq';
    if (stage >= 50) return 'linked_eq';
    if (stage >= 40) return rng.pick(['modulo', 'triple_exponents', 'square_roots']);
    if (stage >= 30) return rng.pick(['triple_exponents', 'square_roots']);
    if (stage >= 20) return rng.pick(['negative_res', 'parentheses', 'missing_num']);
    if (stage >= 15) return 'missing_num';
    if (stage >= 10) return 'parentheses';
    if (stage >= 5) return 'double_op';
  }

  // Standard stage tier progression
  if (stage >= 46) return 'linked_eq';
  if (stage >= 36) return rng.next() < 0.6 ? 'modulo' : 'triple_exponents';
  if (stage >= 31) return rng.next() < 0.6 ? 'square_roots' : 'triple_exponents';
  if (stage >= 26) return 'triple_exponents';
  if (stage >= 20) return rng.next() < 0.5 ? 'negative_res' : 'parentheses';
  if (stage >= 15) return rng.next() < 0.5 ? 'missing_num' : 'double_op';
  if (stage >= 10) return rng.next() < 0.6 ? 'parentheses' : 'double_op';
  if (stage >= 5) return 'double_op';

  return 'single_op';
}

/**
 * Generates a valid Math Bridge question with 100% solver verification
 */
export function generateMathBridgeQuestion(
  rng: Rng,
  stage: number,
  _qIndex: number
): MathBridgeQuestionPayload {
  const isBoss = stage % 5 === 0;
  const isBreathing = (stage - 1) % 5 === 0 && stage > 1;
  const pattern = pickPatternForStage(rng, stage, isBoss, isBreathing);

  const cost = getEquationCost(pattern);
  const basePoints = cost >= 3.6 ? 225 : 150;
  const hasNegatives = pattern === 'negative_res' || stage >= 20;

  const tqSec = calculateTimeLimit(stage, pattern, isBreathing, hasNegatives);
  const timeLimitMs = Math.round(tqSec * 1000);

  // Generate equation with 100% uniqueness verification (at most 25 attempts)
  for (let attempt = 0; attempt < 25; attempt++) {
    const localRng = attempt === 0 ? rng : rng.fork();
    const candidate = buildCandidateQuestion(localRng, pattern, stage);
    if (!candidate) continue;

    // Verify Uniqueness: Evaluate each choice in equation template.
    // Exactly ONE choice must yield the target result!
    let validCount = 0;
    for (let c = 0; c < candidate.choices.length; c++) {
      const choice = candidate.choices[c]!;
      const evaluated = candidate.evalChoice(choice);
      if (evaluated === candidate.targetResult) {
        validCount++;
      }
    }

    if (validCount === 1) {
      // Uniqueness confirmed!
      return {
        pattern,
        stage,
        isBoss,
        isBreathing,
        guidanceTextAr: candidate.guidanceTextAr,
        equationText: candidate.equationText,
        linkedEquationText: candidate.linkedEquationText,
        hideFirstEquationAfterMs: candidate.hideFirstEquationAfterMs,
        choices: candidate.choices,
        correctChoiceIndex: candidate.correctChoiceIndex,
        correctChoiceValue: candidate.correctChoiceValue,
        cost,
        timeLimitMs,
        basePoints
      };
    }
  }

  // Fallback: guaranteed unique 1-op question
  const fbA = rng.nextInt(6, 12);
  const fbB = rng.nextInt(2, 5);
  const target = fbA + fbB;
  const choices = [OP_ADD, OP_SUB, OP_MUL, OP_DIV];
  return {
    pattern: 'single_op',
    stage,
    isBoss,
    isBreathing,
    guidanceTextAr: 'اختر العملية الحسابية الصحيحة',
    equationText: `${fbA} [ ? ] ${fbB} = ${target}`,
    choices,
    correctChoiceIndex: 0,
    correctChoiceValue: OP_ADD,
    cost: 2.0,
    timeLimitMs,
    basePoints: 150
  };
}

interface InternalCandidate {
  guidanceTextAr: string;
  equationText: string;
  linkedEquationText?: string;
  hideFirstEquationAfterMs?: number;
  choices: string[];
  correctChoiceIndex: 0 | 1 | 2 | 3;
  correctChoiceValue: string;
  targetResult: number;
  evalChoice: (choice: string) => number | null;
}

function buildCandidateQuestion(
  rng: Rng,
  pattern: MathBridgePattern,
  stage: number
): InternalCandidate | null {
  const targetSlotPos = rng.nextInt(0, 3) as 0 | 1 | 2 | 3;

  switch (pattern) {
    case 'single_op': {
      // A [ ? ] B = C
      const op = rng.pick(BASIC_OPS);
      let a = 0;
      let b = 0;
      let target = 0;

      if (op === OP_ADD) {
        a = rng.nextInt(3, 15);
        b = rng.nextInt(3, 15);
        target = a + b;
      } else if (op === OP_SUB) {
        a = rng.nextInt(8, 20);
        b = rng.nextInt(2, a - 2);
        target = a - b;
      } else if (op === OP_MUL) {
        a = rng.nextInt(3, 9);
        b = rng.nextInt(3, 9);
        target = a * b;
      } else {
        // DIV
        b = rng.nextInt(2, 8);
        const q = rng.nextInt(2, 8);
        a = b * q;
        target = q;
      }

      // Avoid known ambiguous pairs
      if (a === 2 && b === 2) return null; // 2+2 == 2*2 == 4
      if (b === 1) return null; // A*1 == A/1, A+1 == A-(-1)
      if (b === 0) return null;

      const choices = [OP_ADD, OP_SUB, OP_MUL, OP_DIV];
      // Shuffle choices keeping track of target index
      const otherOps = choices.filter((o) => o !== op);
      const shuffled: string[] = [];
      let otherIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === targetSlotPos) {
          shuffled.push(op);
        } else {
          shuffled.push(otherOps[otherIdx++]!);
        }
      }

      return {
        guidanceTextAr: 'اختر العملية اللي تكمّل المعادلة صح',
        equationText: `${a} [ ? ] ${b} = ${target}`,
        choices: shuffled,
        correctChoiceIndex: targetSlotPos,
        correctChoiceValue: op,
        targetResult: target,
        evalChoice: (ch) => evaluateExpression(`${a} ${ch} ${b}`)
      };
    }

    case 'double_op': {
      // A [ ?1 ] B [ ?2 ] C = D
      const op1 = rng.pick(BASIC_OPS);
      const op2 = rng.pick(BASIC_OPS);
      const a = rng.nextInt(3, 12);
      const b = rng.nextInt(2, 8);
      const c = rng.nextInt(2, 6);

      const target = evaluateExpression(`${a} ${op1} ${b} ${op2} ${c}`);
      if (target === null || target <= 0 || target > 99) return null;

      const correctPair = `${op1} , ${op2}`;
      const candidatePairs = new Set<string>([correctPair]);

      // Distractor pairs
      const allPairs: string[] = [];
      for (const o1 of BASIC_OPS) {
        for (const o2 of BASIC_OPS) {
          allPairs.push(`${o1} , ${o2}`);
        }
      }

      const shuffledAll = rng.shuffle(allPairs);
      for (const p of shuffledAll) {
        if (candidatePairs.size >= 4) break;
        candidatePairs.add(p);
      }

      const choicesArr = Array.from(candidatePairs);
      if (choicesArr.length < 4) return null;

      const shuffled: string[] = [];
      const others = choicesArr.filter((p) => p !== correctPair);
      let oIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === targetSlotPos) {
          shuffled.push(correctPair);
        } else {
          shuffled.push(others[oIdx++]!);
        }
      }

      return {
        guidanceTextAr: 'خانتين فارغتين! اختر الزوج الصحيح',
        equationText: `${a} [ ?1 ] ${b} [ ?2 ] ${c} = ${target}`,
        choices: shuffled,
        correctChoiceIndex: targetSlotPos,
        correctChoiceValue: correctPair,
        targetResult: target,
        evalChoice: (ch) => {
          const [c1, c2] = ch.split(' , ');
          if (!c1 || !c2) return null;
          return evaluateExpression(`${a} ${c1} ${b} ${c2} ${c}`);
        }
      };
    }

    case 'parentheses': {
      // (A [ ?1 ] B) [ ?2 ] C = D
      const op1 = rng.pick([OP_ADD, OP_SUB]);
      const op2 = rng.pick([OP_MUL, OP_DIV]);
      const a = rng.nextInt(3, 15);
      const b = rng.nextInt(2, 8);
      const c = rng.nextInt(2, 6);

      const target = evaluateExpression(`(${a} ${op1} ${b}) ${op2} ${c}`);
      if (target === null || target <= 0 || target > 150) return null;

      const correctPair = `${op1} , ${op2}`;
      const distractors = [
        `${op2} , ${op1}`,
        `${op1 === OP_ADD ? OP_SUB : OP_ADD} , ${op2}`,
        `${op1} , ${op2 === OP_MUL ? OP_DIV : OP_MUL}`
      ];

      const shuffled: string[] = [];
      let dIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === targetSlotPos) {
          shuffled.push(correctPair);
        } else {
          shuffled.push(distractors[dIdx++]!);
        }
      }

      return {
        guidanceTextAr: 'انتبه للأقواس وأولويات العمليات!',
        equationText: `(${a} [ ?1 ] ${b}) [ ?2 ] ${c} = ${target}`,
        choices: shuffled,
        correctChoiceIndex: targetSlotPos,
        correctChoiceValue: correctPair,
        targetResult: target,
        evalChoice: (ch) => {
          const [c1, c2] = ch.split(' , ');
          if (!c1 || !c2) return null;
          return evaluateExpression(`(${a} ${c1} ${b}) ${c2} ${c}`);
        }
      };
    }

    case 'missing_num': {
      // e.g. A × [ ? ] − B = C
      const op1 = rng.pick([OP_MUL, OP_ADD]);
      const op2 = rng.pick([OP_SUB, OP_ADD]);
      const a = rng.nextInt(3, 9);
      const correctNum = rng.nextInt(2, 9);
      const b = rng.nextInt(2, 9);

      const target = evaluateExpression(`${a} ${op1} ${correctNum} ${op2} ${b}`);
      if (target === null || target <= 0) return null;

      const correctStr = String(correctNum);
      const distSet = new Set<string>();

      // Distractor 1: ±1
      distSet.add(String(correctNum + 1));
      if (correctNum > 2) distSet.add(String(correctNum - 1));
      distSet.add(String(correctNum + 2));
      distSet.add(String(Math.max(1, correctNum + 3)));

      const distArr = Array.from(distSet).filter((s) => s !== correctStr);
      const shuffled: string[] = [];
      let dIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === targetSlotPos) {
          shuffled.push(correctStr);
        } else {
          shuffled.push(distArr[dIdx++]!);
        }
      }

      return {
        guidanceTextAr: 'الرقم هو المجهول هالمرة، احسبه!',
        equationText: `${a} ${op1} [ ? ] ${op2} ${b} = ${target}`,
        choices: shuffled,
        correctChoiceIndex: targetSlotPos,
        correctChoiceValue: correctStr,
        targetResult: target,
        evalChoice: (ch) => evaluateExpression(`${a} ${op1} ${ch} ${op2} ${b}`)
      };
    }

    case 'negative_res': {
      // e.g. A [ ? ] B = -C
      const a = rng.nextInt(3, 9);
      const b = rng.nextInt(a + 2, a + 12);
      const target = a - b; // strictly negative

      const choices = [OP_SUB, OP_ADD, OP_MUL, OP_DIV];
      const otherOps = choices.filter((o) => o !== OP_SUB);
      const shuffled: string[] = [];
      let oIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === targetSlotPos) {
          shuffled.push(OP_SUB);
        } else {
          shuffled.push(otherOps[oIdx++]!);
        }
      }

      return {
        guidanceTextAr: 'الناتج بالسالب! ركّز في الإشارة',
        equationText: `${a} [ ? ] ${b} = ${target}`,
        choices: shuffled,
        correctChoiceIndex: targetSlotPos,
        correctChoiceValue: OP_SUB,
        targetResult: target,
        evalChoice: (ch) => evaluateExpression(`${a} ${ch} ${b}`)
      };
    }

    case 'triple_exponents': {
      // e.g. 3^2 [ ?1 ] 4 [ ?2 ] 2 [ ?3 ] 1 = Target
      const base = rng.pick([2, 3]);
      const exp = base === 2 ? rng.pick([2, 3]) : 2; // 2^2=4, 2^3=8, 3^2=9
      const op1 = rng.pick([OP_ADD, OP_SUB]);
      const op2 = rng.pick([OP_MUL, OP_ADD]);
      const b = rng.nextInt(2, 6);
      const c = rng.nextInt(2, 4);

      const target = evaluateExpression(`${base}^${exp} ${op1} ${b} ${op2} ${c}`);
      if (target === null || target <= 0 || target > 99) return null;

      const correctPair = `${op1} , ${op2}`;
      const distractors = [
        `${op1 === OP_ADD ? OP_SUB : OP_ADD} , ${op2}`,
        `${op1} , ${op2 === OP_MUL ? OP_ADD : OP_MUL}`,
        `${op2} , ${op1}`
      ];

      const shuffled: string[] = [];
      let dIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === targetSlotPos) {
          shuffled.push(correctPair);
        } else {
          shuffled.push(distractors[dIdx++]!);
        }
      }

      return {
        guidanceTextAr: 'الأسس دخلت المعادلة! احسب الأس أولاً',
        equationText: `${base}^${exp} [ ?1 ] ${b} [ ?2 ] ${c} = ${target}`,
        choices: shuffled,
        correctChoiceIndex: targetSlotPos,
        correctChoiceValue: correctPair,
        targetResult: target,
        evalChoice: (ch) => {
          const [c1, c2] = ch.split(' , ');
          if (!c1 || !c2) return null;
          return evaluateExpression(`${base}^${exp} ${c1} ${b} ${c2} ${c}`);
        }
      };
    }

    case 'square_roots': {
      // e.g. √16 [ ? ] 5 = 9
      const rootBase = rng.pick([4, 5, 6, 7, 8, 9]); // 16, 25, 36, 49, 64, 81
      const sq = rootBase * rootBase;
      const op = rng.pick([OP_ADD, OP_MUL, OP_SUB]);
      const b = rng.nextInt(2, 6);

      const target = evaluateExpression(`√${sq} ${op} ${b}`);
      if (target === null || target <= 0) return null;

      const choices = [OP_ADD, OP_SUB, OP_MUL, OP_DIV];
      const otherOps = choices.filter((o) => o !== op);
      const shuffled: string[] = [];
      let oIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === targetSlotPos) {
          shuffled.push(op);
        } else {
          shuffled.push(otherOps[oIdx++]!);
        }
      }

      return {
        guidanceTextAr: 'الجذور التربيعية دخلت المعادلة!',
        equationText: `√${sq} [ ? ] ${b} = ${target}`,
        choices: shuffled,
        correctChoiceIndex: targetSlotPos,
        correctChoiceValue: op,
        targetResult: target,
        evalChoice: (ch) => evaluateExpression(`√${sq} ${ch} ${b}`)
      };
    }

    case 'modulo': {
      // A [ ? ] B = remainder
      const b = rng.nextInt(3, 7);
      const q = rng.nextInt(2, 5);
      const rem = rng.nextInt(1, b - 1);
      const a = b * q + rem; // e.g. 17 % 5 = 2

      const target = rem;
      const choices = [OP_MOD, OP_DIV, OP_SUB, OP_ADD];
      const otherOps = choices.filter((o) => o !== OP_MOD);
      const shuffled: string[] = [];
      let oIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === targetSlotPos) {
          shuffled.push(OP_MOD);
        } else {
          shuffled.push(otherOps[oIdx++]!);
        }
      }

      return {
        guidanceTextAr: 'باقي القسمة (%) صار من الخيارات!',
        equationText: `${a} [ ? ] ${b} = ${target}`,
        choices: shuffled,
        correctChoiceIndex: targetSlotPos,
        correctChoiceValue: OP_MOD,
        targetResult: target,
        evalChoice: (ch) => evaluateExpression(`${a} ${ch} ${b}`)
      };
    }

    case 'linked_eq': {
      // Equation 1: X = A op B (e.g. X = 4 × 3 − 2 = 10)
      const a1 = rng.nextInt(2, 6);
      const b1 = rng.nextInt(2, 5);
      const xVal = a1 * b1;
      const linkedEq = `X = ${a1} × ${b1}`;

      // Equation 2: X op C = D
      const op = rng.pick([OP_ADD, OP_SUB, OP_MUL]);
      const c2 = rng.nextInt(2, 5);
      const target = evaluateExpression(`${xVal} ${op} ${c2}`);
      if (target === null || target <= 0) return null;

      const choices = [OP_ADD, OP_SUB, OP_MUL, OP_DIV];
      const otherOps = choices.filter((o) => o !== op);
      const shuffled: string[] = [];
      let oIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === targetSlotPos) {
          shuffled.push(op);
        } else {
          shuffled.push(otherOps[oIdx++]!);
        }
      }

      const isMemoryFlash = stage >= 61;

      return {
        guidanceTextAr: isMemoryFlash
          ? 'المعادلة الأولى تختفي بعد ثانية، احفظ X وعوّض!'
          : 'احسب قيمة X من الأولى وعوّض بيها في الثانية!',
        linkedEquationText: linkedEq,
        equationText: `X [ ? ] ${c2} = ${target}`,
        hideFirstEquationAfterMs: isMemoryFlash ? 1000 : undefined,
        choices: shuffled,
        correctChoiceIndex: targetSlotPos,
        correctChoiceValue: op,
        targetResult: target,
        evalChoice: (ch) => evaluateExpression(`${xVal} ${ch} ${c2}`)
      };
    }

    default:
      return null;
  }
}
