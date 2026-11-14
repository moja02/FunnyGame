/**
 * Core Types & Contracts for FunnyGame Platform
 * Strictly independent of any UI framework, DOM, or non-deterministic APIs.
 */

export type Ability = 'speed' | 'math' | 'memory' | 'logic';

export type Tier = 'warmup' | 'hard' | 'expert' | 'legend' | 'endless';

export interface StageConfig {
  stage: number;
  tier: Tier;               // 1-10 warmup, 11-25 hard, 26-45 expert, 46-70 legend, 71+ endless
  timeLimitMs: number;      // Floor is 800ms unless game spec states otherwise
  isBoss: boolean;          // Every 5 stages
  params: Record<string, number | string | boolean>;
}

export interface Question<P> {
  index: number;
  stage: number;
  timeLimitMs: number;
  payload: P;               // Everything the UI needs to render
}

export interface Verdict {
  correct: boolean;
  heartCost: number;        // Default 1 upon mistake, smart traps 2
  breaksCombo: boolean;
}

export interface Rng {
  next(): number;
  nextInt(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(array: T[]): T[];
  fork(): Rng;
}

export interface GameLogic<P, A> {
  id: string;
  ability: Ability;
  basePoints: number;
  questionsPerStage: number;                              // Default 5
  stageConfig(stage: number): StageConfig;
  generate(rng: Rng, cfg: StageConfig, index: number): Question<P>;   // Deterministic + guaranteed solution
  evaluate(q: Question<P>, answer: A | null): Verdict;                // answer = null upon timeout
}

export interface GameViewProps<P, A> {
  question: Question<P>;
  onAnswer: (answer: A) => void;
  remainingMs: number;
  locked: boolean;           // During question transitions
  lastVerdict?: Verdict;
}

export interface GameModule<P, A> {
  logic: GameLogic<P, A>;
  View: unknown;             // Concrete React component attached in client registry
  content: {
    tauntsLow: string[];
    tauntsMid: string[];
    tauntsHigh: string[];
    live: string[];
    howToPlay: string;
  };
}

/**
 * Run Submission and Server Replay Types
 */
export interface PlayerAnswerRecord<A = unknown> {
  questionIndex: number;
  stage: number;
  answer: A | null;
  reactionTimeMs: number;
  clientTimestamp: number;
}

export interface RunSubmissionPayload<A = unknown> {
  runId: string;
  gameId: string;
  seed: number;
  answers: PlayerAnswerRecord<A>[];
  startedAt: number;
  submittedAt: number;
}

export interface VerifiedRunResult {
  runId: string;
  gameId: string;
  score: number;
  stageReached: number;
  correctAnswersCount: number;
  totalQuestionsAnswered: number;
  isSuspicious: boolean;
  isValid: boolean;
  reason?: string;
}
