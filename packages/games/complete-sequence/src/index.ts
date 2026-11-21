import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { completeSequenceLogic } from './logic.js';
import type {
  CompleteSequencePayload,
  CompleteSequenceAnswerInput
} from './types.js';
import { CompleteSequenceView } from './view.js';
import { completeSequenceContent } from './content.js';

export * from './types.js';
export * from './shapes.js';
export * from './patterns.js';
export * from './generator.js';
export * from './content.js';
export * from './logic.js';
export * from './view.js';

export const completeSequenceModule: GameModule<
  CompleteSequencePayload,
  CompleteSequenceAnswerInput
> = {
  logic: completeSequenceLogic,
  View: CompleteSequenceView,
  content: completeSequenceContent
};

// Register under 'complete_sequence'
serverRegistry.register(completeSequenceLogic);
clientRegistry.register(completeSequenceModule);

// Register alias 'complete-sequence' for kebab-case routing & URLs
const aliasLogic = Object.assign(
  Object.create(Object.getPrototypeOf(completeSequenceLogic)),
  completeSequenceLogic,
  {
    id: 'complete-sequence'
  }
);

const aliasModule: GameModule<
  CompleteSequencePayload,
  CompleteSequenceAnswerInput
> = {
  logic: aliasLogic,
  View: CompleteSequenceView,
  content: completeSequenceContent
};

serverRegistry.register(aliasLogic);
clientRegistry.register(aliasModule);
