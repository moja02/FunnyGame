import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { DontTapLogic } from './logic.js';
import type { DontTapQuestionPayload, DontTapAnswerInput } from './logic.js';
import { DontTapView } from './view.js';
import { dontTapContent } from './content.js';

export * from './logic.js';
export * from './shapes.js';
export * from './rules.js';
export * from './content.js';
export * from './view.js';

export const dontTapLogic = new DontTapLogic();

export const dontTapModule: GameModule<DontTapQuestionPayload, DontTapAnswerInput> = {
  logic: dontTapLogic,
  View: DontTapView,
  content: dontTapContent
};

// Register to server & client registries with both 'dont_tap' and 'dont-tap'
serverRegistry.register(dontTapLogic);
clientRegistry.register(dontTapModule);

// Register alias with 'dont_tap' id for API consistency
const snakeCaseLogic = Object.assign(Object.create(Object.getPrototypeOf(dontTapLogic)), dontTapLogic, {
  id: 'dont_tap'
});
const snakeCaseModule: GameModule<DontTapQuestionPayload, DontTapAnswerInput> = {
  logic: snakeCaseLogic,
  View: DontTapView,
  content: dontTapContent
};
serverRegistry.register(snakeCaseLogic);
clientRegistry.register(snakeCaseModule);
