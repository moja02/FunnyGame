import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { smartTrapLogic } from './logic.js';
import type {
  SmartTrapQuestionPayload,
  SmartTrapAnswerInput
} from './types.js';
import { SmartTrapView } from './view.js';
import { smartTrapContent } from './content.js';

export * from './types.js';
export * from './templates.js';
export * from './generator.js';
export * from './content.js';
export * from './logic.js';
export * from './view.js';

export const smartTrapModule: GameModule<
  SmartTrapQuestionPayload,
  SmartTrapAnswerInput
> = {
  logic: smartTrapLogic,
  View: SmartTrapView,
  content: smartTrapContent
};

// Register under 'smart_trap'
serverRegistry.register(smartTrapLogic);
clientRegistry.register(smartTrapModule);

// Register alias 'smart-trap' for kebab-case routing & URLs
const aliasLogic = Object.assign(
  Object.create(Object.getPrototypeOf(smartTrapLogic)),
  smartTrapLogic,
  {
    id: 'smart-trap'
  }
);

const aliasModule: GameModule<
  SmartTrapQuestionPayload,
  SmartTrapAnswerInput
> = {
  logic: aliasLogic,
  View: SmartTrapView,
  content: smartTrapContent
};

serverRegistry.register(aliasLogic);
clientRegistry.register(aliasModule);
