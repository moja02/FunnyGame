import type { GameLogic, RunSubmissionPayload, VerifiedRunResult } from './types.js';
import { createRng } from './rng.js';
import { calculateQuestionScore } from './scoring.js';

export interface RoundSimulatorOptions {
  initialHearts?: number;
  initialStage?: number;
  minHumanReactionMs?: number; // Suspicious threshold, default 150ms
  maxRunDurationMs?: number;   // 30 minutes = 1,800,000ms
}

/**
 * Replays and validates a run deterministically on the server
 */
export function replayAndVerifyRun<P, A>(
  game: GameLogic<P, A>,
  submission: RunSubmissionPayload<A>,
  options: RoundSimulatorOptions = {}
): VerifiedRunResult {
  const initialHearts = options.initialHearts ?? 3;
  const startStage = options.initialStage ?? 1;
  const minHumanReactionMs = options.minHumanReactionMs ?? 150;
  const maxRunDurationMs = options.maxRunDurationMs ?? 30 * 60 * 1000;

  const totalRunDuration = submission.submittedAt - submission.startedAt;

  // 1. Check max run duration (30 min timeout rule)
  if (totalRunDuration > maxRunDurationMs || totalRunDuration <= 0) {
    return {
      runId: submission.runId,
      gameId: submission.gameId,
      score: 0,
      stageReached: startStage,
      correctAnswersCount: 0,
      totalQuestionsAnswered: submission.answers.length,
      isSuspicious: true,
      isValid: false,
      reason: 'Run exceeded 30 minutes duration or has invalid timestamps'
    };
  }

  // 2. Sum of reaction times must not exceed elapsed real time
  const totalReactionTime = submission.answers.reduce((acc, a) => acc + Math.max(0, a.reactionTimeMs), 0);
  if (totalReactionTime > totalRunDuration + 2000) { // allow 2s margin for network latency
    return {
      runId: submission.runId,
      gameId: submission.gameId,
      score: 0,
      stageReached: startStage,
      correctAnswersCount: 0,
      totalQuestionsAnswered: submission.answers.length,
      isSuspicious: true,
      isValid: false,
      reason: 'Sum of reaction times exceeds real elapsed duration'
    };
  }

  // 3. Replay game deterministically using PRNG from identical seed
  const rng = createRng(submission.seed);
  let hearts = initialHearts;
  let combo = 0;
  let correctCount = 0;
  let score = 0;
  let stage = startStage;
  let suspiciousCount = 0;

  for (let qIdx = 0; qIdx < submission.answers.length; qIdx++) {
    // If hearts are depleted, subsequent answers are invalid
    if (hearts <= 0) {
      break;
    }

    const recorded = submission.answers[qIdx];
    if (!recorded) break;

    // Check suspicious superhuman reaction speed
    if (recorded.reactionTimeMs < minHumanReactionMs && recorded.answer !== null) {
      suspiciousCount++;
    }

    // Determine stage from correct count
    stage = startStage + Math.floor(correctCount / game.questionsPerStage);
    const cfg = game.stageConfig(stage);

    // Generate exact question deterministically
    const question = game.generate(rng, cfg, qIdx);

    // Evaluate answer with pure logic
    const verdict = game.evaluate(question, recorded.answer);

    if (verdict.correct) {
      combo += 1;
      correctCount += 1;

      // Calculate remaining ms from recorded reaction time
      const remainingMs = Math.max(0, question.timeLimitMs - recorded.reactionTimeMs);
      const qScore = calculateQuestionScore(
        game.basePoints,
        stage,
        remainingMs,
        question.timeLimitMs,
        combo
      );
      score += qScore;
    } else {
      // Mistake or timeout: lose hearts and reset combo
      hearts -= verdict.heartCost;
      if (verdict.breaksCombo) {
        combo = 0;
      }
    }
  }

  const isSuspicious = suspiciousCount >= 3;
  const isValid = !isSuspicious;

  return {
    runId: submission.runId,
    gameId: submission.gameId,
    score,
    stageReached: stage,
    correctAnswersCount: correctCount,
    totalQuestionsAnswered: submission.answers.length,
    isSuspicious,
    isValid,
    reason: isSuspicious ? 'Too many answers with < 150ms reaction time' : undefined
  };
}
