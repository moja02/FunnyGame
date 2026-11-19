import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { watchAndJudgeLogic } from './logic.js';
import type {
  WatchAndJudgeQuestionPayload,
  WatchAndJudgeAnswerInput
} from './types.js';
import { WatchAndJudgeView } from './view.js';
import { watchAndJudgeContent } from './content.js';

export * from './types.js';
export * from './palette.js';
export * from './scene-engine.js';
export * from './content.js';
export * from './logic.js';
export * from './view.js';

export const watchAndJudgeModule: GameModule<
  WatchAndJudgeQuestionPayload,
  WatchAndJudgeAnswerInput
> = {
  logic: watchAndJudgeLogic,
  View: WatchAndJudgeView,
  content: watchAndJudgeContent
};

// Register to server & client registries under 'watch_and_judge'
serverRegistry.register(watchAndJudgeLogic);
clientRegistry.register(watchAndJudgeModule);

// Register alias 'watch-and-judge' for kebab-case routing & URLs
const aliasLogic = Object.assign(
  Object.create(Object.getPrototypeOf(watchAndJudgeLogic)),
  watchAndJudgeLogic,
  {
    id: 'watch-and-judge'
  }
);

const aliasModule: GameModule<
  WatchAndJudgeQuestionPayload,
  WatchAndJudgeAnswerInput
> = {
  logic: aliasLogic,
  View: WatchAndJudgeView,
  content: watchAndJudgeContent
};

serverRegistry.register(aliasLogic);
clientRegistry.register(aliasModule);
