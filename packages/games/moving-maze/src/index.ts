import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { movingMazeLogic } from './logic.js';
import type {
  MovingMazeQuestionPayload,
  MovingMazeAnswerInput
} from './types.js';
import { MovingMazeView } from './view.js';
import { movingMazeContent } from './content.js';

export * from './types.js';
export * from './maze-generator.js';
export * from './content.js';
export * from './logic.js';
export * from './view.js';

export const movingMazeModule: GameModule<
  MovingMazeQuestionPayload,
  MovingMazeAnswerInput
> = {
  logic: movingMazeLogic,
  View: MovingMazeView,
  content: movingMazeContent
};

// Register under 'moving_maze'
serverRegistry.register(movingMazeLogic);
clientRegistry.register(movingMazeModule);

// Register alias 'moving-maze' for kebab-case routing & URLs
const aliasLogic = Object.assign(
  Object.create(Object.getPrototypeOf(movingMazeLogic)),
  movingMazeLogic,
  {
    id: 'moving-maze'
  }
);

const aliasModule: GameModule<
  MovingMazeQuestionPayload,
  MovingMazeAnswerInput
> = {
  logic: aliasLogic,
  View: MovingMazeView,
  content: movingMazeContent
};

serverRegistry.register(aliasLogic);
clientRegistry.register(aliasModule);
