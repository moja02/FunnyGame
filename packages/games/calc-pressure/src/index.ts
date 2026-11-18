import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { calcPressureLogic } from './logic.js';
import type { CalcPressureQuestionPayload, CalcPressureAnswerInput } from './types.js';
import { CalcPressureView } from './view.js';
import { calcPressureContent } from './content.js';

export * from './types.js';
export * from './math-engine.js';
export * from './content.js';
export * from './logic.js';
export * from './view.js';

export const calcPressureModule: GameModule<
  CalcPressureQuestionPayload,
  CalcPressureAnswerInput
> = {
  logic: calcPressureLogic,
  View: CalcPressureView,
  content: calcPressureContent
};

// Register to server & client registries with both snake_case and kebab-case
serverRegistry.register(calcPressureLogic);
clientRegistry.register(calcPressureModule);

// Register alias 'calc-pressure' for routing & URLs
const aliasLogic = Object.assign(
  Object.create(Object.getPrototypeOf(calcPressureLogic)),
  calcPressureLogic,
  {
    id: 'calc-pressure'
  }
);

const aliasModule: GameModule<
  CalcPressureQuestionPayload,
  CalcPressureAnswerInput
> = {
  logic: aliasLogic,
  View: CalcPressureView,
  content: calcPressureContent
};

serverRegistry.register(aliasLogic);
clientRegistry.register(aliasModule);
