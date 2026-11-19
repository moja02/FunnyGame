import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { followPatternLogic } from './logic.js';
import type {
  FollowPatternQuestionPayload,
  FollowPatternAnswerInput
} from './types.js';
import { FollowPatternView } from './view.js';
import { followPatternContent } from './content.js';

export * from './types.js';
export * from './audio.js';
export * from './pattern-engine.js';
export * from './content.js';
export * from './logic.js';
export * from './view.js';

export const followPatternModule: GameModule<
  FollowPatternQuestionPayload,
  FollowPatternAnswerInput
> = {
  logic: followPatternLogic,
  View: FollowPatternView,
  content: followPatternContent
};

// Register to server & client registries under 'follow_pattern'
serverRegistry.register(followPatternLogic);
clientRegistry.register(followPatternModule);

// Register alias 'follow-pattern' for kebab-case routing & URLs
const aliasLogic = Object.assign(
  Object.create(Object.getPrototypeOf(followPatternLogic)),
  followPatternLogic,
  {
    id: 'follow-pattern'
  }
);

const aliasModule: GameModule<
  FollowPatternQuestionPayload,
  FollowPatternAnswerInput
> = {
  logic: aliasLogic,
  View: FollowPatternView,
  content: followPatternContent
};

serverRegistry.register(aliasLogic);
clientRegistry.register(aliasModule);
