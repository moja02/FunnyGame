import { serverRegistry, clientRegistry } from '@funnygame/game-core';
import type { GameModule } from '@funnygame/game-core';
import { whereDidItGoLogic } from './logic.js';
import type {
  WhereDidItGoQuestionPayload,
  WhereDidItGoAnswerInput
} from './types.js';
import { WhereDidItGoView } from './view.js';
import { whereDidItGoContent } from './content.js';

export * from './types.js';
export * from './icons.js';
export * from './grid-engine.js';
export * from './content.js';
export * from './logic.js';
export * from './view.js';

export const whereDidItGoModule: GameModule<
  WhereDidItGoQuestionPayload,
  WhereDidItGoAnswerInput
> = {
  logic: whereDidItGoLogic,
  View: WhereDidItGoView,
  content: whereDidItGoContent
};

// Register to server & client registries under 'where_did_it_go'
serverRegistry.register(whereDidItGoLogic);
clientRegistry.register(whereDidItGoModule);

// Register alias 'where-did-it-go' for kebab-case routing & URLs
const aliasLogic = Object.assign(
  Object.create(Object.getPrototypeOf(whereDidItGoLogic)),
  whereDidItGoLogic,
  {
    id: 'where-did-it-go'
  }
);

const aliasModule: GameModule<
  WhereDidItGoQuestionPayload,
  WhereDidItGoAnswerInput
> = {
  logic: aliasLogic,
  View: WhereDidItGoView,
  content: whereDidItGoContent
};

serverRegistry.register(aliasLogic);
clientRegistry.register(aliasModule);
