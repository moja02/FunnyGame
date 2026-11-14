import type { GameLogic } from './types.js';

/**
 * Server Registry - Holds pure GameLogic instances
 * Zero UI, zero React, safe for Node.js Route Handlers and server replays.
 */
class ServerRegistry {
  private games = new Map<string, GameLogic<unknown, unknown>>();

  register<P, A>(game: GameLogic<P, A>): void {
    if (this.games.has(game.id)) {
      console.warn(`ServerRegistry: Overwriting existing game '${game.id}'`);
    }
    this.games.set(game.id, game as unknown as GameLogic<unknown, unknown>);
  }

  get<P = unknown, A = unknown>(gameId: string): GameLogic<P, A> | undefined {
    return this.games.get(gameId) as unknown as GameLogic<P, A> | undefined;
  }

  getAll(): GameLogic<unknown, unknown>[] {
    return Array.from(this.games.values());
  }

  has(gameId: string): boolean {
    return this.games.has(gameId);
  }
}

export const serverRegistry = new ServerRegistry();
