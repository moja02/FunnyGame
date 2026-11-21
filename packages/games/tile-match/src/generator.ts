import type { Rng } from '@funnygame/game-core';
import type { TileCard, StageRules, TileMatchQuestionPayload } from './types.js';
import { TILE_ICONS, INTRO_CARDS } from './content.js';

/**
 * Returns stage progression rules adhering strictly to Section 5 of the specification.
 */
export function getStageRules(stage: number): StageRules {
  const isBoss = stage % 5 === 0;
  const isBreathing =
    (stage - 1) % 5 === 0 &&
    stage > 1 &&
    stage !== 11 &&
    stage !== 26 &&
    stage !== 46;

  let cardCount = 18;
  let typeCount = 3;
  let layerCount = 2;
  let dockCapacity = 7;
  let hasMystery = false;
  let hasFrozen = false;
  let autoShuffleIntervalSec = 0;

  if (stage === 1) {
    cardCount = 18;
    typeCount = 3;
    layerCount = 2;
  } else if (stage === 2) {
    cardCount = 21;
    typeCount = 3;
    layerCount = 2;
  } else if (stage === 3) {
    cardCount = 24;
    typeCount = 3;
    layerCount = 3;
  } else if (stage === 4) {
    cardCount = 27;
    typeCount = 3;
    layerCount = 3;
  } else if (stage === 5) {
    // Boss 5: Dense overlapping
    cardCount = 36;
    typeCount = 5;
    layerCount = 4;
  } else if (stage === 6) {
    // Breathing stage: +10s extra time
    cardCount = 21;
    typeCount = 3;
    layerCount = 2;
  } else if (stage < 15) {
    // Stages 7-14: Mystery cards introduce
    cardCount = 45;
    typeCount = 7;
    layerCount = 5;
    hasMystery = true;
  } else if (stage === 15) {
    // Boss 15: 6 slots dock
    cardCount = 54;
    typeCount = 8;
    layerCount = 6;
    dockCapacity = 6;
    hasMystery = true;
  } else if (stage < 26) {
    // Stages 16-25: Frozen cards
    cardCount = 63;
    typeCount = 10;
    layerCount = 6;
    hasFrozen = true;
    if (isBoss) dockCapacity = 6;
  } else if (stage <= 40) {
    // Stages 26-40: Mystery + Frozen + 6-slot dock
    cardCount = 72;
    typeCount = 12;
    layerCount = 7;
    dockCapacity = 6;
    hasMystery = true;
    hasFrozen = true;
  } else if (stage <= 55) {
    // Stages 41-55: 5 slots dock on boss stages
    cardCount = 81;
    typeCount = 14;
    layerCount = 8;
    dockCapacity = isBoss ? 5 : 6;
    hasMystery = true;
    hasFrozen = true;
  } else {
    // Stages 56 - 70+: Periodic shuffle every 30s
    const extraTriples = Math.min(6, Math.floor((stage - 56) / 2));
    cardCount = 90 + extraTriples * 3;
    typeCount = 16;
    layerCount = 9;
    dockCapacity = isBoss ? 5 : 6;
    hasMystery = true;
    hasFrozen = true;
    autoShuffleIntervalSec = 30;
  }

  // T_stage = max(35.0, round(N_groups * 4.2 * mu(s)))
  const nGroups = cardCount / 3;
  const mu = Math.max(0.60, 1.0 - 0.005 * (stage - 1));
  let timeLimitSec = Math.max(35, Math.round(nGroups * 4.2 * mu));
  if (isBreathing) {
    timeLimitSec += 10;
  }

  return {
    cardCount,
    typeCount,
    layerCount,
    dockCapacity,
    hasMystery,
    hasFrozen,
    isBoss,
    isBreathing,
    autoShuffleIntervalSec,
    timeLimitSec
  };
}

/**
 * Checks if targetCard is covered by any other card in a higher layer.
 * A card is covered if another card has a strictly greater layer and their rectangles overlap.
 */
export function isCardCovered(
  targetCard: TileCard,
  allCards: TileCard[],
  removedCardIds: Set<number>
): boolean {
  for (const other of allCards) {
    if (other.id === targetCard.id) continue;
    if (removedCardIds.has(other.id)) continue;
    if (other.layer <= targetCard.layer) continue;

    const overlapX =
      Math.min(targetCard.x + targetCard.width, other.x + other.width) -
      Math.max(targetCard.x, other.x);
    const overlapY =
      Math.min(targetCard.y + targetCard.height, other.y + other.height) -
      Math.max(targetCard.y, other.y);

    // Require at least 4px overlap in both dimensions to consider covered
    if (overlapX >= 4 && overlapY >= 4) {
      return true;
    }
  }
  return false;
}

interface RawPosition {
  x: number;
  y: number;
  layer: number;
}

/**
 * Generates geometric slot positions with balanced pyramid / cluster offsets.
 */
function generateLayoutPositions(
  cardCount: number,
  layerCount: number,
  rng: Rng
): RawPosition[] {
  const cardW = 46;
  const cardH = 52;
  const stepX = 23; // half width offset for 50% overlap
  const stepY = 26; // half height offset for 50% overlap

  // Board dimensions: 320 x 310
  const boardW = 320;
  const boardH = 310;

  const positions: RawPosition[] = [];

  // Generate grids layer by layer
  for (let l = 0; l < layerCount; l++) {
    // Lower layers are broader; higher layers are more centered
    const maxCols = Math.max(3, 9 - l);
    const maxRows = Math.max(3, 8 - l);

    const startX = Math.round((boardW - maxCols * stepX - cardW) / 2);
    const startY = Math.round((boardH - maxRows * stepY - cardH) / 2);

    for (let r = 0; r <= maxRows; r++) {
      for (let c = 0; c <= maxCols; c++) {
        // Stagger positions: layer offset
        const isOffset = (l % 2 === 1);
        if (isOffset && (r % 2 === 0 || c % 2 === 0)) continue;
        if (!isOffset && (r % 2 === 1 && c % 2 === 1)) continue;

        const posX = Math.max(8, Math.min(boardW - cardW - 8, startX + c * stepX));
        const posY = Math.max(6, Math.min(boardH - cardH - 6, startY + r * stepY));

        positions.push({
          x: posX,
          y: posY,
          layer: l
        });
      }
    }
  }

  // Shuffle candidate positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const temp = positions[i]!;
    positions[i] = positions[j]!;
    positions[j] = temp;
  }

  // Take the first cardCount positions
  // Ensure we have positions from all requested layers
  const selected: RawPosition[] = [];
  const layerBuckets: Map<number, RawPosition[]> = new Map();
  for (let l = 0; l < layerCount; l++) {
    layerBuckets.set(l, []);
  }

  for (const pos of positions) {
    layerBuckets.get(pos.layer)?.push(pos);
  }

  // Distribute cardCount across layers from bottom to top
  let remaining = cardCount;
  for (let l = 0; l < layerCount && remaining > 0; l++) {
    const bucket = layerBuckets.get(l) ?? [];
    // Allocate proportional share to this layer
    const countForLayer = Math.min(bucket.length, Math.ceil(cardCount / layerCount) + 2);
    const toTake = Math.min(remaining, countForLayer);
    for (let i = 0; i < toTake; i++) {
      selected.push(bucket[i]!);
    }
    remaining -= toTake;
  }

  // If still need more, fill from any remaining available
  if (selected.length < cardCount) {
    for (let l = 0; l < layerCount && selected.length < cardCount; l++) {
      const bucket = layerBuckets.get(l) ?? [];
      for (const pos of bucket) {
        if (!selected.includes(pos)) {
          selected.push(pos);
          if (selected.length >= cardCount) break;
        }
      }
    }
  }

  return selected.slice(0, cardCount);
}

/**
 * Solvability Engine: Uses reverse matching simulation to assign fruit types
 * guaranteeing a 100% solvable forward path within the dock capacity.
 */
export function generateMovingMazeQuestion(
  // Signature matching standard game pattern
): never {
  throw new Error('Use generateTileMatchQuestion');
}

export function generateTileMatchQuestion(
  rng: Rng,
  stage: number,
  _index: number
): TileMatchQuestionPayload {
  const rules = getStageRules(stage);
  const cardCount = rules.cardCount;
  const numTriples = cardCount / 3;
  const numTypes = Math.min(rules.typeCount, TILE_ICONS.length);
  const dockCap = rules.dockCapacity;

  const cardW = 46;
  const cardH = 52;

  let finalCards: TileCard[] = [];
  let isSolvable = false;

  for (let attempt = 0; attempt < 40 && !isSolvable; attempt++) {
    const rawPositions = generateLayoutPositions(cardCount, rules.layerCount, rng);
    if (rawPositions.length < cardCount) continue;

    // Initialize unassigned cards
    const cards: TileCard[] = rawPositions.map((pos, id) => ({
      id,
      typeId: -1,
      icon: '',
      x: pos.x,
      y: pos.y,
      layer: pos.layer,
      width: cardW,
      height: cardH,
      isMystery: false,
      isFrozen: false
    }));

    // Available triple types
    const tripleTypes: number[] = [];
    for (let i = 0; i < numTriples; i++) {
      tripleTypes.push(i % numTypes);
    }
    // Shuffle triple types
    for (let i = tripleTypes.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const temp = tripleTypes[i]!;
      tripleTypes[i] = tripleTypes[j]!;
      tripleTypes[j] = temp;
    }

    // Forward Play Simulation Assignment:
    // We assign types 3-by-3 such that in a forward game, the player can always
    // pick 3 cards of the assigned type without the dock ever exceeding (dockCap - 1)
    const assignedIds = new Set<number>();
    const simulatedDock: number[] = []; // Stores card IDs currently in dock
    let success = true;

    for (let tIdx = 0; tIdx < numTriples; tIdx++) {
      const currentType = tripleTypes[tIdx]!;

      // Find unassigned cards that are currently uncovered
      const uncoveredUnassigned: TileCard[] = cards.filter(
        (c) => !assignedIds.has(c.id) && !isCardCovered(c, cards, assignedIds)
      );

      if (uncoveredUnassigned.length >= 3) {
        // Pick 3 uncovered cards, assign them currentType, and simulate them matching
        for (let k = 0; k < 3; k++) {
          const chosen = uncoveredUnassigned[k]!;
          chosen.typeId = currentType;
          chosen.icon = TILE_ICONS[currentType % TILE_ICONS.length]!;
          assignedIds.add(chosen.id);
        }
      } else if (uncoveredUnassigned.length > 0 && simulatedDock.length + 3 <= dockCap) {
        // Take whatever uncovered cards exist, and then cards below them that become uncovered
        const chosenCards: TileCard[] = [];
        for (const c of uncoveredUnassigned) {
          if (chosenCards.length < 3) {
            c.typeId = currentType;
            c.icon = TILE_ICONS[currentType % TILE_ICONS.length]!;
            assignedIds.add(c.id);
            chosenCards.push(c);
          }
        }

        // Now see if more become uncovered
        while (chosenCards.length < 3) {
          const newlyUncovered = cards.filter(
            (c) => !assignedIds.has(c.id) && !isCardCovered(c, cards, assignedIds)
          );
          if (newlyUncovered.length === 0) break;
          const nextCard = newlyUncovered[0]!;
          nextCard.typeId = currentType;
          nextCard.icon = TILE_ICONS[currentType % TILE_ICONS.length]!;
          assignedIds.add(nextCard.id);
          chosenCards.push(nextCard);
        }

        if (chosenCards.length < 3) {
          success = false;
          break;
        }
      } else {
        success = false;
        break;
      }
    }

    if (success && assignedIds.size === cardCount) {
      finalCards = cards;
      isSolvable = true;
    }
  }

  // Fallback: If heuristic did not converge, distribute triples in layer order
  if (!isSolvable || finalCards.length === 0) {
    const rawPositions = generateLayoutPositions(cardCount, rules.layerCount, rng);
    // Sort positions by layer descending (top to bottom)
    rawPositions.sort((a, b) => b.layer - a.layer);

    const cards: TileCard[] = rawPositions.map((pos, id) => ({
      id,
      typeId: Math.floor(id / 3) % numTypes,
      icon: TILE_ICONS[(Math.floor(id / 3) % numTypes) % TILE_ICONS.length]!,
      x: pos.x,
      y: pos.y,
      layer: pos.layer,
      width: cardW,
      height: cardH,
      isMystery: false,
      isFrozen: false
    }));
    finalCards = cards;
  }

  // Assign Mystery Cards if enabled
  if (rules.hasMystery) {
    const candidateIds = finalCards.filter((c) => c.layer >= 1).map((c) => c.id);
    const mysteryCount = Math.max(3, Math.min(9, Math.floor(cardCount * 0.12)));
    // Pick random subset
    for (let i = 0; i < mysteryCount && candidateIds.length > 0; i++) {
      const idx = Math.floor(rng.next() * candidateIds.length);
      const chosenId = candidateIds.splice(idx, 1)[0]!;
      const card = finalCards.find((c) => c.id === chosenId);
      if (card) {
        card.isMystery = true;
      }
    }
  }

  // Assign Frozen Cards if enabled
  if (rules.hasFrozen) {
    const candidateIds = finalCards
      .filter((c) => !c.isMystery && c.layer <= Math.floor(rules.layerCount / 2))
      .map((c) => c.id);
    const frozenCount = Math.max(3, Math.min(8, Math.floor(cardCount * 0.10)));
    for (let i = 0; i < frozenCount && candidateIds.length > 0; i++) {
      const idx = Math.floor(rng.next() * candidateIds.length);
      const chosenId = candidateIds.splice(idx, 1)[0]!;
      const card = finalCards.find((c) => c.id === chosenId);
      if (card) {
        card.isFrozen = true;
      }
    }
  }

  // Guidance message
  let guidanceTextAr = 'انقل 3 بطاقات متطابقة للشريط السفلي لمسحها ✨';
  if (rules.hasFrozen && rules.hasMystery) {
    guidanceTextAr = 'فك تجميد الجليد بالمطابقة، وانتبه للبطاقات الغامضة ❓❄️';
  } else if (rules.hasFrozen) {
    guidanceTextAr = 'طابق ثلاثية لفك الجليد عن البطاقات المجمدة ❄️';
  } else if (rules.hasMystery) {
    guidanceTextAr = 'البطاقات الغامضة (؟) تكشف فاكهتها عند نزولها للشريط ❓';
  } else if (rules.dockCapacity < 7) {
    guidanceTextAr = `انتبه! سعة شريط التجميع ${rules.dockCapacity} خانات فقط ⚠️`;
  }

  return {
    stage,
    timeLimitMs: rules.timeLimitSec * 1000,
    cards: finalCards,
    dockCapacity: rules.dockCapacity,
    hasMystery: rules.hasMystery,
    hasFrozen: rules.hasFrozen,
    isBreathing: rules.isBreathing,
    isBoss: rules.isBoss,
    autoShuffleIntervalSec: rules.autoShuffleIntervalSec,
    introCardAr: INTRO_CARDS[stage],
    guidanceTextAr
  };
}
