import { GAMES_REGISTRY } from '../games/games-registry.js';
import { sound } from '../core/sound.js';

/**
 * CatalogView - Renders the 1:1 square games cards grid
 */
export class CatalogView {
  constructor(containerId, onSelectGame) {
    this.container = document.getElementById(containerId);
    this.onSelectGame = onSelectGame;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="games-grid">
        ${GAMES_REGISTRY.map(game => `
          <div class="square-game-card ${game.isActive ? 'active-card' : 'locked-card'}" data-game-id="${game.id}">
            <div style="width: 100%; display: flex; justify-content: flex-end;">
              <span class="badge-card" style="background: ${game.isActive ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255, 255, 255, 0.08)'}; color: ${game.statusColor};">
                ${game.status}
              </span>
            </div>

            <div style="font-size: 2.8rem; margin: 4px 0;">
              ${game.icon}
            </div>

            <div style="text-align: center;">
              <div style="font-size: 0.95rem; font-weight: 900; color: #fff;">${game.title}</div>
              <div style="font-size: 0.7rem; color: #8395a7;">${game.subtitle}</div>
            </div>

            <button class="arcade-btn" style="width: 100%; height: 32px; font-size: 0.75rem; border-radius: 10px; background: ${game.isActive ? '#ff4757' : 'rgba(255,255,255,0.08)'}; color: ${game.isActive ? '#fff' : '#888'};">
              ${game.isActive ? 'العب الآن ⚔️' : 'شرح اللعبة 📖'}
            </button>
          </div>
        `).join('')}
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    this.container.querySelectorAll('.square-game-card').forEach(card => {
      card.onclick = () => {
        sound.tap();
        const gameId = card.getAttribute('data-game-id');
        if (this.onSelectGame) this.onSelectGame(gameId);
      };
    });
  }
}
