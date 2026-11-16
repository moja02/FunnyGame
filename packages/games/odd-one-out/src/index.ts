import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { oddOneOutLogic } from './logic.js';
import type { OddOneOutQuestionPayload, OddOneOutAnswerInput } from './logic.js';
import { OddOneOutView } from './view.js';
import { oddOneOutContent } from './content.js';

export * from './logic.js';
export * from './shapes.js';
export * from './color-science.js';
export * from './content.js';
export * from './view.js';

export const oddOneOutModule: GameModule<OddOneOutQuestionPayload, OddOneOutAnswerInput> = {
  logic: oddOneOutLogic,
  View: OddOneOutView,
  content: oddOneOutContent
};

// Register to server & client registries with both snake_case and kebab-case
serverRegistry.register(oddOneOutLogic);
clientRegistry.register(oddOneOutModule);

// Also register with 'odd-one-out' alias for routing and url paths
const aliasLogic = Object.assign(Object.create(Object.getPrototypeOf(oddOneOutLogic)), oddOneOutLogic, {
  id: 'odd-one-out'
});
const aliasModule: GameModule<OddOneOutQuestionPayload, OddOneOutAnswerInput> = {
  logic: aliasLogic,
  View: OddOneOutView,
  content: oddOneOutContent
};
serverRegistry.register(aliasLogic);
clientRegistry.register(aliasModule);
