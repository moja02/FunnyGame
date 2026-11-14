import type { GameModule } from './types.js';

/**
 * Client Registry - Holds full GameModules (Logic + React View + Content)
 * Used on the browser client for rendering and interactive gameplay.
 */
class ClientRegistry {
  private modules = new Map<string, GameModule<unknown, unknown>>();

  register<P, A>(module: GameModule<P, A>): void {
    if (this.modules.has(module.logic.id)) {
      console.warn(`ClientRegistry: Overwriting existing module '${module.logic.id}'`);
    }
    this.modules.set(module.logic.id, module as unknown as GameModule<unknown, unknown>);
  }

  get<P = unknown, A = unknown>(gameId: string): GameModule<P, A> | undefined {
    return this.modules.get(gameId) as unknown as GameModule<P, A> | undefined;
  }

  getAll(): GameModule<unknown, unknown>[] {
    return Array.from(this.modules.values());
  }

  has(gameId: string): boolean {
    return this.modules.has(gameId);
  }
}

export const clientRegistry = new ClientRegistry();
