import type {
  GameLogic,
  StageConfig,
  Question,
  Verdict,
  Rng,
  Ability,
  Tier
} from '@funnygame/game-core';
import type {
  CalcPressureQuestionPayload,
  CalcPressureAnswerInput,
  ChainStep,
  MathExpression
} from './types.js';
import {
  getStageRules,
  generateInitialR0,
  pickQuestionPattern,
  generateSingleExpression,
  generateStepOnR,
  applyStep,
  generateThreeChoices,
  OP_ADD
} from './math-engine.js';
import { INTRO_CARDS } from './content.js';

export function calculateCalcPressureScore(
  operationCount: number,
  stage: number,
  remainingMs: number,
  timeLimitMs: number,
  currentCombo: number
): number {
  const n = operationCount;
  const ratio = Math.max(0, Math.min(1.0, remainingMs / timeLimitMs));
  const v = 1.0 + 0.5 * ratio;
  const k = currentCombo >= 10 ? 3 : currentCombo >= 5 ? 2 : 1;
  const m = stage <= 25 ? 1 + 0.10 * (stage - 1) : 3.4 + 0.15 * (stage - 25);

  return Math.round(50 * n * v * k * m);
}

export class CalcPressureLogic
  implements GameLogic<CalcPressureQuestionPayload, CalcPressureAnswerInput> {
  id = 'calc_pressure';
  ability: Ability = 'math';
  basePoints = 50;
  questionsPerStage = 5;

  stageConfig(stage: number): StageConfig {
    let tier: Tier = 'warmup';
    if (stage > 70) tier = 'endless';
    else if (stage >= 46) tier = 'legend';
    else if (stage >= 26) tier = 'expert';
    else if (stage >= 11) tier = 'hard';

    const rules = getStageRules(stage);

    return {
      stage,
      tier,
      timeLimitMs: Math.round(rules.unitTime * 1000),
      isBoss: rules.isBoss,
      params: {
        isBreathing: rules.isBreathing,
        hasCloseChoices: rules.hasCloseChoices,
        rMax: rules.rMax
      }
    };
  }

  generate(
    rng: Rng,
    cfg: StageConfig,
    index: number
  ): Question<CalcPressureQuestionPayload> {
    const stage = cfg.stage;
    const rules = getStageRules(stage);
    const qInStage = index % this.questionsPerStage;

    // Build stage-deterministic sequence of R
    let currentR = generateInitialR0(rng, stage);
    const initialR0 = stage >= 10 ? currentR : undefined;

    // Retry loop with solver verification
    let payload: CalcPressureQuestionPayload | null = null;
    let attempts = 0;

    while (attempts < 5 && !payload) {
      attempts++;
      const localRng = attempts === 1 ? rng : rng.fork();

      // Pick pattern
      const pattern = pickQuestionPattern(localRng, stage, rules.isBoss, rules.isBreathing);

      // Intro card on question 0 of new mechanics
      const introCardAr = qInStage === 0 ? INTRO_CARDS[stage] : undefined;

      // Target position for balanced 33.3% distribution: 0 (top), 1 (mid), 2 (bottom)
      const targetPos = (qInStage % 3) as 0 | 1 | 2;

      if (pattern === 'S') {
        const expr = generateSingleExpression(localRng, stage, true);
        const choices = generateThreeChoices(
          localRng,
          expr.result,
          targetPos,
          rules.hasCloseChoices,
          null,
          null,
          false
        );

        let eq = 0;
        if (rules.isBreathing) eq += 0.5;
        if (rules.hasCloseChoices) eq += 0.3;

        const rawTq = rules.unitTime * expr.cost + eq;
        const tqSec = Math.max(1.2, Math.round(rawTq * 10) / 10);
        const timeLimitMs = Math.round(tqSec * 1000);

        payload = {
          pattern: 'S',
          stage,
          introCardAr,
          guidanceTextAr: 'احسب العملية واختار الناتج الصحيح',
          initialR0,
          previousR: null,
          newR: null,
          hideR: false,
          singleExpr: expr.text,
          choices,
          correctAnswer: expr.result,
          correctChoiceIndex: targetPos,
          costTotal: expr.cost,
          operationCount: expr.operationCount,
          timeLimitMs,
          basePoints: 50 * expr.operationCount
        };
      } else if (pattern === 'C' || (pattern === 'H' && localRng.next() < 0.45)) {
        // C pattern (accumulated single step on R), or H version of C
        const isH = pattern === 'H';
        const prevR = currentR;
        const step = generateStepOnR(localRng, currentR, rules.rMax, stage);
        const newR = applyStep(currentR, step);

        const choices = generateThreeChoices(
          localRng,
          newR,
          targetPos,
          rules.hasCloseChoices,
          prevR,
          null,
          false
        );

        let eq = 0;
        if (rules.isBreathing) eq += 0.5;
        if (rules.hasCloseChoices) eq += 0.3;
        if (isH) eq += 0.5;

        const rawTq = rules.unitTime * step.cost + eq;
        const tqSec = Math.max(1.2, Math.round(rawTq * 10) / 10);
        const timeLimitMs = Math.round(tqSec * 1000);

        payload = {
          pattern: isH ? 'H' : 'C',
          subPattern: 'C',
          stage,
          introCardAr,
          guidanceTextAr: isH
            ? 'الناتج السابق في الذاكرة! طبّق عليه واختار الجديد'
            : 'طبّق العملية على الناتج السابق واختار الجديد',
          initialR0,
          previousR: prevR,
          newR,
          hideR: isH,
          rhoDurationMs: isH ? rules.rhoDurationMs : undefined,
          accumulatedStep: step,
          choices,
          correctAnswer: newR,
          correctChoiceIndex: targetPos,
          costTotal: step.cost,
          operationCount: 1,
          timeLimitMs,
          basePoints: 50
        };
      } else if (pattern === 'K' || pattern === 'H') {
        // K pattern (chain of 2 or 3 steps on R), or H version of K
        const isH = pattern === 'H';
        const prevR = currentR;

        // Steps count: 2 in stage 26, 3 from stage 27, 4 from 80, 5 from 90
        let stepCount = 3;
        if (stage === 26) stepCount = 2;
        else if (stage >= 90) stepCount = 5;
        else if (stage >= 80) stepCount = 4;

        const chainSteps: ChainStep[] = [];
        let runningR = currentR;
        let costTotal = 0;
        let intermediateR: number | null = null;

        for (let sIdx = 0; sIdx < stepCount; sIdx++) {
          const prevOp = chainSteps[sIdx - 1]?.op;
          const step = generateStepOnR(localRng, runningR, rules.rMax, stage, prevOp);
          if (sIdx === stepCount - 2) {
            intermediateR = runningR;
          }
          runningR = applyStep(runningR, step);
          chainSteps.push(step);
          costTotal += step.cost;
        }

        const newR = runningR;
        const choices = generateThreeChoices(
          localRng,
          newR,
          targetPos,
          rules.hasCloseChoices,
          prevR,
          intermediateR,
          false
        );

        let eq = 0;
        if (rules.isBreathing) eq += 0.5;
        if (rules.hasCloseChoices) eq += 0.3;
        if (isH) eq += 0.5;

        const rawTq = rules.unitTime * costTotal + eq;
        const tqSec = Math.max(1.2, Math.round(rawTq * 10) / 10);
        const timeLimitMs = Math.round(tqSec * 1000);

        payload = {
          pattern: isH ? 'H' : 'K',
          subPattern: 'K',
          stage,
          introCardAr,
          guidanceTextAr: isH
            ? 'سلسلة خطوات على الناتج المحفوظ في الذاكرة!'
            : 'سلسلة خطوات متتالية: احسب كل خطوة على اللي قبلها',
          initialR0,
          previousR: prevR,
          newR,
          hideR: isH,
          rhoDurationMs: isH ? rules.rhoDurationMs : undefined,
          chainSteps,
          choices,
          correctAnswer: newR,
          correctChoiceIndex: targetPos,
          costTotal,
          operationCount: stepCount,
          timeLimitMs,
          basePoints: 50 * stepCount
        };
      } else {
        // L pattern (Choose Larger between A and B)
        // Two sides A and B
        const hasDoubleOps = stage >= 32;
        let exprA: MathExpression;
        let exprB: MathExpression;

        // Stage 42+: difference between 1 and 3
        // Stage 28-41: difference between 6 and 40
        const minDiff = stage >= 42 ? 1 : 6;
        const maxDiff = stage >= 42 ? 3 : 40;

        let diff = 0;
        let lAttempts = 0;
        do {
          lAttempts++;
          exprA = generateSingleExpression(localRng, stage, hasDoubleOps);
          exprB = generateSingleExpression(localRng, stage, hasDoubleOps);
          diff = Math.abs(exprA.result - exprB.result);
        } while ((diff < minDiff || diff > maxDiff || exprA.text === exprB.text) && lAttempts < 15);

        // If after 15 attempts still outside range, calibrate manually
        if (diff === 0) {
          exprB.result = exprA.result + minDiff;
          exprB.text = `${exprA.result} + ${minDiff}`;
        }

        const maxResult = Math.max(exprA.result, exprB.result);
        const otherVal = Math.min(exprA.result, exprB.result);

        const choices = generateThreeChoices(
          localRng,
          maxResult,
          targetPos,
          false,
          null,
          null,
          true,
          otherVal
        );

        const costTotal = exprA.cost + exprB.cost;
        const totalOps = exprA.operationCount + exprB.operationCount;

        let eq = 0.4; // Compare L
        if (rules.hasCloseChoices) eq += 0.3;
        if (rules.isBreathing) eq += 0.5;

        const rawTq = rules.unitTime * costTotal + eq;
        const tqSec = Math.max(1.2, Math.round(rawTq * 10) / 10);
        const timeLimitMs = Math.round(tqSec * 1000);

        payload = {
          pattern: 'L',
          stage,
          introCardAr,
          guidanceTextAr: 'اختار الناتج الأكبر بين العمليتين',
          initialR0,
          previousR: currentR, // L does not change R
          newR: currentR,
          hideR: stage >= 46,
          lExprA: exprA.text,
          lExprB: exprB.text,
          lResultA: exprA.result,
          lResultB: exprB.result,
          choices,
          correctAnswer: maxResult,
          correctChoiceIndex: targetPos,
          costTotal,
          operationCount: totalOps,
          timeLimitMs,
          basePoints: 50 * totalOps
        };
      }
    }

    // Safe fallback if solver loop failed
    if (!payload) {
      const a = rng.nextInt(3, 9);
      const b = rng.nextInt(3, 9);
      const correct = a + b;
      payload = {
        pattern: 'S',
        stage,
        guidanceTextAr: 'احسب واختار الناتج الصحيح',
        previousR: null,
        newR: null,
        hideR: false,
        singleExpr: `${a} ${OP_ADD} ${b}`,
        choices: [correct, correct + 1, correct + 2],
        correctAnswer: correct,
        correctChoiceIndex: 0,
        costTotal: 1.0,
        operationCount: 1,
        timeLimitMs: 2000,
        basePoints: 50
      };
    }

    // Ensure correctChoiceIndex is strictly aligned with choices array
    payload.correctChoiceIndex = payload.choices.indexOf(payload.correctAnswer) as 0 | 1 | 2;

    return {
      index,
      stage,
      timeLimitMs: payload.timeLimitMs,
      payload
    };
  }

  evaluate(
    q: Question<CalcPressureQuestionPayload>,
    answer: CalcPressureAnswerInput | null
  ): Verdict {
    if (answer === null || answer === undefined) {
      return { correct: false, heartCost: 1, breaksCombo: true };
    }

    let isCorrect = false;
    if (typeof answer === 'number') {
      if (
        answer === q.payload.correctChoiceIndex ||
        answer === q.payload.correctAnswer
      ) {
        isCorrect = true;
      }
    } else if (typeof answer === 'object') {
      if (
        answer.choiceIndex === q.payload.correctChoiceIndex ||
        answer.value === q.payload.correctAnswer
      ) {
        isCorrect = true;
      }
    }

    return {
      correct: isCorrect,
      heartCost: isCorrect ? 0 : 1,
      breaksCombo: !isCorrect
    };
  }

  calculatePoints(
    q: Question<CalcPressureQuestionPayload>,
    answer: CalcPressureAnswerInput | null,
    reactionTimeMs: number,
    combo: number
  ): number {
    const verdict = this.evaluate(q, answer);
    if (!verdict.correct) return 0;

    const remMs = Math.max(0, q.timeLimitMs - reactionTimeMs);
    return calculateCalcPressureScore(
      q.payload.operationCount,
      q.stage,
      remMs,
      q.timeLimitMs,
      combo
    );
  }
}

export const calcPressureLogic = new CalcPressureLogic();
