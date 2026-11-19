import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { numberHuntLogic } from './logic.js';
import type { NumberHuntQuestionPayload, NumberHuntAnswerInput } from './types.js';
import { NumberHuntView } from './view.js';
import { numberHuntContent } from './content.js';

export * from './types.js';
export * from './rational.js';
export * from './solver.js';
export * from './content.js';
export * from './logic.js';
export * from './view.js';

export const numberHuntModule: GameModule<
  NumberHuntQuestionPayload,
  NumberHuntAnswerInput
> = {
  logic: numberHuntLogic,
  View: NumberHuntView,
  content: numberHuntContent
};

// Register to server & client registries under 'number_hunt'
serverRegistry.register(numberHuntLogic);
clientRegistry.register(numberHuntModule);

// Register alias 'number-hunt' for kebab-case routing & URLs
const aliasLogic = Object.assign(
  Object.create(Object.getPrototypeOf(numberHuntLogic)),
  numberHuntLogic,
  {
    id: 'number-hunt'
  }
);

const aliasModule: GameModule<
  NumberHuntQuestionPayload,
  NumberHuntAnswerInput
> = {
  logic: aliasLogic,
  View: NumberHuntView,
  content: numberHuntContent
};

serverRegistry.register(aliasLogic);
clientRegistry.register(aliasModule);
