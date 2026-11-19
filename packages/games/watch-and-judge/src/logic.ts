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
  WatchAndJudgeQuestionPayload,
  WatchAndJudgeAnswerInput
} from './types.js';
import {
  generateWatchAndJudgeQuestion,
  getStageRules
} from './scene-engine.js';
import { INTRO_CARDS } from './content.js';

/**
 * Calculates score according to Section 6 of the Watch and Judge specification:
 * pts = Base * v * k * m(s)
 * - Base = 150, or 225 for MINOR change or DOUBLE change (x1.5 bonus)
 * - v = 1.0 + 0.5 * (T_remaining / T_q)
 * - k = 1 (streak 0-4), 2 (streak 5-9), 3 (streak 10+)
 * - m(s) = 1 + 0.10 * (s - 1) for s <= 25, else 3.4 + 0.15 * (s - 25)
 */
export function calculateWatchAndJudgeRoundScore(
  stage: number,
  isMinorOrDouble: boolean,
  remainingMs: number,
  timeLimitMs: number,
  currentStreak: number
): number {
  const base = isMinorOrDouble ? 225 : 150;
  const ratio = Math.max(0, Math.min(1.0, remainingMs / timeLimitMs));
  const v = 1.0 + 0.5 * ratio;
  const k = currentStreak >= 10 ? 3 : currentStreak >= 5 ? 2 : 1;
  const m = stage <= 25 ? 1 + 0.10 * (stage - 1) : 3.4 + 0.15 * (stage - 25);

  return Math.round(base * v * k * m);
}

export class WatchAndJudgeLogic
  implements GameLogic<WatchAndJudgeQuestionPayload, WatchAndJudgeAnswerInput> {
  id = 'watch_and_judge';
  ability: Ability = 'memory';
  basePoints = 150;
  questionsPerStage = 1;
  manualTimerStart = true;

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
      timeLimitMs: rules.decisionTimeLimitMs,
      isBoss: rules.isBoss,
      params: {
        isBreathing: rules.isBreathing,
        itemCount: rules.itemCount,
        hasNoChangeButton: rules.hasNoChangeButton,
        allowDoubleChange: rules.allowDoubleChange
      }
    };
  }

  generate(
    rng: Rng,
    cfg: StageConfig,
    index: number
  ): Question<WatchAndJudgeQuestionPayload> {
    const stage = cfg.stage;
    const payload = generateWatchAndJudgeQuestion(rng, stage, index);

    // Intro card ONLY on question 0 at the very start of the match (Stage 1)
    if (index === 0 && stage === 1 && INTRO_CARDS[1]) {
      payload.introCardAr = INTRO_CARDS[1];
    }

    return {
      index,
      stage,
      timeLimitMs: payload.timeLimitMs,
      payload
    };
  }

  evaluate(
    question: Question<WatchAndJudgeQuestionPayload>,
    answer: WatchAndJudgeAnswerInput | null
  ): Verdict {
    if (!answer || !answer.isComplete || !Array.isArray(answer.rounds)) {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    const payload = question.payload;
    let correctCount = 0;

    for (let i = 0; i < payload.rounds.length; i++) {
      const roundDef = payload.rounds[i]!;
      const roundAns = answer.rounds[i];
      if (!roundAns) continue;

      let roundPassed = false;
      if (roundDef.isNoChange) {
        if (roundAns.clickedNoChange) {
          roundPassed = true;
        }
      } else if (roundDef.isDoubleChange) {
        if (
          roundAns.clickedCellIndex !== null &&
          roundAns.secondClickedCellIndex !== null &&
          roundAns.secondClickedCellIndex !== undefined
        ) {
          const clickedSet = new Set([
            roundAns.clickedCellIndex,
            roundAns.secondClickedCellIndex
          ]);
          if (
            clickedSet.size === 2 &&
            roundDef.validTargetIndices.every((idx) => clickedSet.has(idx))
          ) {
            roundPassed = true;
          }
        }
      } else {
        // Single target or Swap
        if (
          roundAns.clickedCellIndex !== null &&
          roundDef.validTargetIndices.includes(roundAns.clickedCellIndex)
        ) {
          roundPassed = true;
        }
      }

      if (roundPassed) {
        correctCount++;
      }
    }

    // Spec: Success requires answering at least 2 out of 3 rounds
    if (correctCount >= 2) {
      return {
        correct: true,
        heartCost: 0,
        breaksCombo: false
      };
    }

    return {
      correct: false,
      heartCost: 1,
      breaksCombo: true
    };
  }

  calculatePoints(
    _question: Question<WatchAndJudgeQuestionPayload>,
    answer: WatchAndJudgeAnswerInput | null,
    _reactionTimeMs: number,
    _currentCombo: number
  ): number {
    if (!answer || !answer.isComplete) return 0;
    return answer.totalPoints;
  }
}

export const watchAndJudgeLogic = new WatchAndJudgeLogic();
