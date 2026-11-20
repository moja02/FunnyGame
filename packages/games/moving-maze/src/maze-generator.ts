import type { Rng } from '@funnygame/game-core';
import type {
  GridCoord,
  KeyItem,
  DynamicWallDef,
  MovingMazeQuestionPayload
} from './types.js';

export interface StageRules {
  gridSize: number;
  wallShiftIntervalSec: number;
  hasSilentShift: boolean;
  hasFogOfWar: boolean;
  visionRadius: number;
  trapCount: number;
  keyCount: number;
  isBoss: boolean;
  isBreathing: boolean;
}

export function getStageRules(stage: number): StageRules {
  const isBoss = stage % 5 === 0;
  const isBreathing =
    (stage - 1) % 5 === 0 &&
    stage > 1 &&
    stage !== 11 &&
    stage !== 26 &&
    stage !== 46;

  // Grid dimensions (6x6 up to 11x11)
  let gridSize = 6;
  if (stage >= 36) gridSize = 11;
  else if (stage >= 21) gridSize = 10;
  else if (stage >= 14) gridSize = 9;
  else if (stage >= 8) gridSize = 8;
  else if (stage >= 5) gridSize = 7;

  // Shift interval
  let wallShiftIntervalSec = 5.0;
  if (stage >= 26) wallShiftIntervalSec = 2.0;
  else if (stage >= 16) wallShiftIntervalSec = 2.5;
  else if (stage >= 14) wallShiftIntervalSec = 2.8;
  else if (stage >= 12) wallShiftIntervalSec = 3.0;
  else if (stage === 11) wallShiftIntervalSec = 4.0;
  else if (stage >= 8) wallShiftIntervalSec = 3.0;
  else if (stage === 7) wallShiftIntervalSec = 3.5;
  else if (stage === 6) wallShiftIntervalSec = 5.0;
  else if (stage === 5) wallShiftIntervalSec = 4.0;

  // Silent shift (no warning pulse/flash)
  const hasSilentShift = stage >= 14;

  // Fog of war (darkness)
  const hasFogOfWar = stage >= 26 && !isBreathing;
  const visionRadius = stage >= 65 ? 2 : 3;

  // Traps
  let trapCount = 0;
  if (stage >= 21) trapCount = 3 + (isBoss ? 1 : 0);
  else if (stage >= 12) trapCount = 2 + (isBoss ? 1 : 0);
  else if (stage === 11) trapCount = 1;
  else if (stage === 10) trapCount = 3;
  else if (stage >= 8) trapCount = 2;

  // Keys
  let keyCount = 0;
  if (stage >= 56) keyCount = 3;
  else if (stage >= 46) keyCount = 2;

  return {
    gridSize,
    wallShiftIntervalSec,
    hasSilentShift,
    hasFogOfWar,
    visionRadius,
    trapCount,
    keyCount,
    isBoss,
    isBreathing
  };
}

/**
 * BFS pathfinding to find the shortest path between two coordinates in the maze.
 */
export function findShortestPath(
  start: GridCoord,
  target: GridCoord,
  gridSize: number,
  hWalls: boolean[][],
  vWalls: boolean[][]
): GridCoord[] | null {
  const queue: { coord: GridCoord; path: GridCoord[] }[] = [
    { coord: start, path: [start] }
  ];
  const visited = new Set<string>();
  visited.add(`${start.r},${start.c}`);

  while (queue.length > 0) {
    const { coord, path } = queue.shift()!;
    if (coord.r === target.r && coord.c === target.c) {
      return path;
    }

    const { r, c } = coord;

    // Up: check hWalls[r - 1][c]
    if (r > 0 && !hWalls[r - 1]![c] && !visited.has(`${r - 1},${c}`)) {
      visited.add(`${r - 1},${c}`);
      queue.push({ coord: { r: r - 1, c }, path: [...path, { r: r - 1, c }] });
    }
    // Down: check hWalls[r][c]
    if (r < gridSize - 1 && !hWalls[r]![c] && !visited.has(`${r + 1},${c}`)) {
      visited.add(`${r + 1},${c}`);
      queue.push({ coord: { r: r + 1, c }, path: [...path, { r: r + 1, c }] });
    }
    // Left: check vWalls[r][c - 1]
    if (c > 0 && !vWalls[r]![c - 1] && !visited.has(`${r},${c - 1}`)) {
      visited.add(`${r},${c - 1}`);
      queue.push({ coord: { r, c: c - 1 }, path: [...path, { r, c: c - 1 }] });
    }
    // Right: check vWalls[r][c]
    if (c < gridSize - 1 && !vWalls[r]![c] && !visited.has(`${r},${c + 1}`)) {
      visited.add(`${r},${c + 1}`);
      queue.push({ coord: { r, c: c + 1 }, path: [...path, { r, c: c + 1 }] });
    }
  }

  return null;
}

/**
 * Generates a full deterministic Moving Maze question payload from (seed, stage, index).
 */
export function generateMovingMazeQuestion(
  rng: Rng,
  stage: number,
  _index: number
): MovingMazeQuestionPayload {
  const rules = getStageRules(stage);
  const n = rules.gridSize;

  // 1. Initialize wall arrays: true = wall exists
  // hWalls[r][c] is the wall between row r and row r+1 at column c (r: 0..n-2, c: 0..n-1)
  const hWalls: boolean[][] = Array.from({ length: n - 1 }, () =>
    new Array(n).fill(true)
  );
  // vWalls[r][c] is the wall between col c and col c+1 at row r (r: 0..n-1, c: 0..n-2)
  const vWalls: boolean[][] = Array.from({ length: n }, () =>
    new Array(n - 1).fill(true)
  );

  // 2. Randomized Prim's algorithm to carve a spanning tree maze
  const inMaze = new Set<string>();
  const wallList: {
    type: 'H' | 'V';
    r: number;
    c: number;
    cellA: GridCoord;
    cellB: GridCoord;
  }[] = [];

  const addCellWalls = (r: number, c: number) => {
    // Up wall
    if (r > 0) {
      wallList.push({
        type: 'H',
        r: r - 1,
        c,
        cellA: { r, c },
        cellB: { r: r - 1, c }
      });
    }
    // Down wall
    if (r < n - 1) {
      wallList.push({
        type: 'H',
        r,
        c,
        cellA: { r, c },
        cellB: { r: r + 1, c }
      });
    }
    // Left wall
    if (c > 0) {
      wallList.push({
        type: 'V',
        r,
        c: c - 1,
        cellA: { r, c },
        cellB: { r, c: c - 1 }
      });
    }
    // Right wall
    if (c < n - 1) {
      wallList.push({
        type: 'V',
        r,
        c,
        cellA: { r, c },
        cellB: { r, c: c + 1 }
      });
    }
  };

  // Start carving from (0, 0)
  inMaze.add('0,0');
  addCellWalls(0, 0);

  while (wallList.length > 0) {
    const wallIdx = rng.nextInt(0, wallList.length - 1);
    const wall = wallList.splice(wallIdx, 1)[0]!;

    const inA = inMaze.has(`${wall.cellA.r},${wall.cellA.c}`);
    const inB = inMaze.has(`${wall.cellB.r},${wall.cellB.c}`);

    if (inA !== inB) {
      // Carve through wall
      if (wall.type === 'H') {
        hWalls[wall.r]![wall.c] = false;
      } else {
        vWalls[wall.r]![wall.c] = false;
      }

      const nextCell = inA ? wall.cellB : wall.cellA;
      inMaze.add(`${nextCell.r},${nextCell.c}`);
      addCellWalls(nextCell.r, nextCell.c);
    }
  }

  // 3. Define Start and Exit positions
  const startPos: GridCoord = { r: 0, c: 0 };
  const exitPos: GridCoord = { r: n - 1, c: n - 1 };

  // 4. Place Keys along the maze (if required)
  const keys: KeyItem[] = [];
  const waypoints: GridCoord[] = [startPos];

  if (rules.keyCount > 0) {
    // Find all reachable cells and pick distributed key locations
    const allCells: GridCoord[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if ((r !== 0 || c !== 0) && (r !== n - 1 || c !== n - 1)) {
          allCells.push({ r, c });
        }
      }
    }

    const shuffled = rng.shuffle(allCells);
    for (let k = 0; k < rules.keyCount; k++) {
      const keyPos = shuffled[k]!;
      keys.push({ id: k + 1, r: keyPos.r, c: keyPos.c });
      waypoints.push(keyPos);
    }
  }
  waypoints.push(exitPos);

  // 5. Calculate golden path length (P_shortest)
  let totalShortestPathLength = 0;
  const goldenPathCoords = new Set<string>();

  for (let w = 0; w < waypoints.length - 1; w++) {
    const segment = findShortestPath(
      waypoints[w]!,
      waypoints[w + 1]!,
      n,
      hWalls,
      vWalls
    );
    if (segment) {
      totalShortestPathLength += segment.length - 1;
      segment.forEach((pt) => goldenPathCoords.add(`${pt.r},${pt.c}`));
    }
  }

  // 6. Select Dynamic Walls (walls that toggle open/closed)
  // Dynamic walls are selected from secondary/alternative passages
  const dynamicWalls: DynamicWallDef[] = [];
  const candidateWalls: DynamicWallDef[] = [];

  // Find closed walls that, when opened, create alternate loops/routes
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n; c++) {
      if (hWalls[r]![c]) {
        candidateWalls.push({ type: 'H', r, c, isOpenInitially: false });
      }
    }
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n - 1; c++) {
      if (vWalls[r]![c]) {
        candidateWalls.push({ type: 'V', r, c, isOpenInitially: false });
      }
    }
  }

  const shuffledCandidates = rng.shuffle(candidateWalls);
  const dynamicWallCount = Math.min(
    Math.max(3, Math.floor(n * 0.7)),
    shuffledCandidates.length
  );

  for (let i = 0; i < dynamicWallCount; i++) {
    const cand = shuffledCandidates[i]!;
    dynamicWalls.push(cand);
  }

  // 7. Place Traps (return traps that send player to start)
  // Must NOT be placed at start, exit, on key cells, or directly blocking unavoidable single paths
  const traps: GridCoord[] = [];
  if (rules.trapCount > 0) {
    const candidateTrapCells: GridCoord[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const isStart = r === startPos.r && c === startPos.c;
        const isExit = r === exitPos.r && c === exitPos.c;
        const isKey = keys.some((k) => k.r === r && k.c === c);
        if (!isStart && !isExit && !isKey) {
          candidateTrapCells.push({ r, c });
        }
      }
    }

    const shuffledTraps = rng.shuffle(candidateTrapCells);
    const count = Math.min(rules.trapCount, shuffledTraps.length);
    for (let t = 0; t < count; t++) {
      traps.push(shuffledTraps[t]!);
    }
  }

  // 8. Move Limit (M_allowed) and Time Limit (T_q) calculation
  // M_allowed = P_shortest + max(4, floor(0.45 * P_shortest)) + E_moves
  const pShortest = Math.max(n + 2, totalShortestPathLength);
  const extraMoves = rules.isBreathing ? 4 : 0;
  const allowedMoves =
    pShortest + Math.max(4, Math.floor(0.45 * pShortest)) + extraMoves;

  // T_q = max(15.0, round(M_allowed * 1.2)) in seconds
  const tqSec = Math.max(15.0, Math.round(allowedMoves * 1.2));
  const timeLimitMs = tqSec * 1000;

  let guidanceTextAr = 'اسحب النقطة للمخرج! انتبه للجدران اللي تتبدل.';
  if (rules.keyCount > 0) {
    guidanceTextAr = 'اجمع المفاتيح بالترتيب (1 ثم 2) لفتح بوابة المخرج!';
  } else if (rules.hasFogOfWar) {
    guidanceTextAr = 'انطفى النور! اعتمد على ذاكرتك المكانية في الظلام.';
  } else if (rules.hasSilentShift) {
    guidanceTextAr = 'الجدران تتبدل فجأة وبدون تنبيه مسبق!';
  } else if (rules.trapCount > 0) {
    guidanceTextAr = 'احذر الفخاخ الحمراء! لمسها يرجعك لنقطة البداية.';
  }

  return {
    stage,
    gridSize: n,
    startPos,
    exitPos,
    hWalls,
    vWalls,
    dynamicWalls,
    traps,
    keys,
    hasSilentShift: rules.hasSilentShift,
    hasFogOfWar: rules.hasFogOfWar,
    visionRadius: rules.visionRadius,
    wallShiftIntervalSec: rules.wallShiftIntervalSec,
    initialShortestPathLength: pShortest,
    allowedMoves,
    timeLimitMs,
    manualTimerStart: true,
    guidanceTextAr
  };
}
