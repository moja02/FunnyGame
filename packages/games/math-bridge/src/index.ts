import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { mathBridgeLogic } from './logic.js';
import type { MathBridgeQuestionPayload, MathBridgeAnswerInput } from './types.js';
import { MathBridgeView } from './view.js';
import { mathBridgeContent } from './content.js';

export * from './types.js';
export * from './math-engine.js';
export * from './content.js';
export * from './logic.js';
export * from './view.js';

export const mathBridgeModule: GameModule<
  MathBridgeQuestionPayload,
  MathBridgeAnswerInput
> = {
  logic: mathBridgeLogic,
  View: MathBridgeView,
  content: mathBridgeContent
};

// Register to server & client registries under 'math_bridge'
serverRegistry.register(mathBridgeLogic);
clientRegistry.register(mathBridgeModule);

// Register alias 'math-bridge' for kebab-case routing & URLs
const aliasLogic = Object.assign(
  Object.create(Object.getPrototypeOf(mathBridgeLogic)),
  mathBridgeLogic,
  {
    id: 'math-bridge'
  }
);

const aliasModule: GameModule<
  MathBridgeQuestionPayload,
  MathBridgeAnswerInput
> = {
  logic: aliasLogic,
  View: MathBridgeView,
  content: mathBridgeContent
};

serverRegistry.register(aliasLogic);
clientRegistry.register(aliasModule);
