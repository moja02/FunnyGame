import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { colorTrapLogic } from './logic.js';
import type { ColorTrapQuestionPayload } from './logic.js';
import { ColorTrapView } from './view.js';
import { colorTrapContent } from './content.js';

export * from './logic.js';
export * from './content.js';
export * from './view.js';

export const colorTrapModule: GameModule<ColorTrapQuestionPayload, string> = {
  logic: colorTrapLogic,
  View: ColorTrapView,
  content: colorTrapContent
};

// Register to server & client registries automatically
serverRegistry.register(colorTrapLogic);
clientRegistry.register(colorTrapModule);
