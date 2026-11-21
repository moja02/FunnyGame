import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { tileMatchLogic } from './logic.js';
import type {
  TileMatchQuestionPayload,
  TileMatchAnswerInput
} from './types.js';
import { TileMatchView } from './view.js';
import { tileMatchContent } from './content.js';

export * from './types.js';
export * from './generator.js';
export * from './content.js';
export * from './logic.js';
export * from './view.js';

export const tileMatchModule: GameModule<
  TileMatchQuestionPayload,
  TileMatchAnswerInput
> = {
  logic: tileMatchLogic,
  View: TileMatchView,
  content: tileMatchContent
};

// Register under 'tile_match'
serverRegistry.register(tileMatchLogic);
clientRegistry.register(tileMatchModule);

// Register alias 'tile-match' for kebab-case routing & URLs
const aliasLogic = Object.assign(
  Object.create(Object.getPrototypeOf(tileMatchLogic)),
  tileMatchLogic,
  {
    id: 'tile-match'
  }
);

const aliasModule: GameModule<
  TileMatchQuestionPayload,
  TileMatchAnswerInput
> = {
  logic: aliasLogic,
  View: TileMatchView,
  content: tileMatchContent
};

serverRegistry.register(aliasLogic);
clientRegistry.register(aliasModule);
