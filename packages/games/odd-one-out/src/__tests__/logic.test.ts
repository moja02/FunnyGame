import { describe, it, expect } from 'vitest';
import { createRng } from '@funnygame/game-core';
import { oddOneOutLogic } from '../logic.js';
import { GAME_SHAPES } from '../shapes.js';

describe('OddOneOutLogic - Architectural Solvability & Rules', () => {
  it('guarantees 100% solvability and single unique odd cell across 1,000 consecutive seeds and stages', () => {
    for (let s = 1; s <= 75; s++) {
      const cfg = oddOneOutLogic.stageConfig(s);

      for (let i = 0; i < 15; i++) {
        const seed = 100000 + s * 100 + i;
        const rng = createRng(seed);
        const q = oddOneOutLogic.generate(rng, cfg, i);

        expect(q.payload.grids.length).toBe(q.payload.gridCount);

        for (let g = 0; g < q.payload.gridCount; g++) {
          const grid = q.payload.grids[g]!;
          const oddCells = grid.filter((c) => c.isOdd);

          // Exactly 1 odd cell per grid
          expect(oddCells.length).toBe(1);

          const odd = oddCells[0]!;

          // If rotation mode, shape MUST NOT be rotationally symmetric
          if (q.payload.diffType === 'ROTATION') {
            const shapeDef = GAME_SHAPES.find((sh) => sh.id === odd.shapeId);
            expect(shapeDef).toBeDefined();
            expect(shapeDef?.isRotationallySymmetric).toBe(false);
          }
        }
      }
    }
  });

  it('calculates correct time limit according to section 4 specifications', () => {
    // Stage 1: 3x3 shape -> 3.0s (3000ms)
    const t1 = oddOneOutLogic.calculateQuestionTimeMs(1, 9, 'SHAPE', 'NONE', false);
    expect(t1).toBe(3000);

    // Stage 15 (Boss): flash mode 1.0s -> 3500ms
    const t15 = oddOneOutLogic.calculateQuestionTimeMs(15, 36, 'SHAPE', 'NONE', false, 1000);
    expect(t15).toBe(3500);

    // Dual grid flash stage 46+ -> 0.5s flash + 2.5s decision = 3000ms
    const t47 = oddOneOutLogic.calculateQuestionTimeMs(47, 32, 'COLOR', 'NONE', false, 500);
    expect(t47).toBe(3000);
  });

  it('correctly tracks odd cell position during scheduled swaps', () => {
    const rng = createRng(42);
    const cfg = oddOneOutLogic.stageConfig(28); // Stage 28 has SWAP motion mode
    const q = oddOneOutLogic.generate(rng, cfg, 0);

    const initialOdd = q.payload.targetOddIndices[0]!;
    const posAtStart = oddOneOutLogic.getOddPositionAtTime(q.payload, 0, 0);
    expect(posAtStart).toBe(initialOdd.cellIndex);

    // Later timestamp accounts for swaps
    const posLater = oddOneOutLogic.getOddPositionAtTime(q.payload, 0, 5000);
    expect(posLater).toBeGreaterThanOrEqual(0);
    expect(posLater).toBeLessThan(q.payload.gridDim * q.payload.gridDim);
  });

  it('properly scores correct hits and assesses wrong cell penalties without immediate heart cost', () => {
    const rng = createRng(12345);
    const cfg = oddOneOutLogic.stageConfig(1);
    const q = oddOneOutLogic.generate(rng, cfg, 0);
    const targetOdd = q.payload.targetOddIndices[0]!;

    // 1. Correct tap
    const correctVerdict = oddOneOutLogic.evaluate(q, {
      gridIndex: 0,
      cellIndex: targetOdd.cellIndex,
      tMs: 500,
      hintUsed: false
    });

    expect(correctVerdict.correct).toBe(true);
    expect(correctVerdict.heartCost).toBe(0);
    expect(correctVerdict.breaksCombo).toBe(false);

    const pts = oddOneOutLogic.calculatePoints(
      q,
      {
        gridIndex: 0,
        cellIndex: targetOdd.cellIndex,
        tMs: 500,
        hintUsed: false
      },
      500
    );
    expect(pts).toBeGreaterThan(0);

    // 2. Wrong tap (not the odd cell)
    const wrongCellIndex = (targetOdd.cellIndex + 1) % 9;
    const wrongVerdict = oddOneOutLogic.evaluate(q, {
      gridIndex: 0,
      cellIndex: wrongCellIndex,
      tMs: 500
    });

    expect(wrongVerdict.correct).toBe(false);
    expect(wrongVerdict.heartCost).toBe(0); // 0 heart cost: penalty is deducted from time in UI
    expect(wrongVerdict.breaksCombo).toBe(true);

    // 3. Timeout
    const timeoutVerdict = oddOneOutLogic.evaluate(q, null);
    expect(timeoutVerdict.correct).toBe(false);
    expect(timeoutVerdict.heartCost).toBe(1); // Times out costs 1 heart
    expect(timeoutVerdict.breaksCombo).toBe(true);
  });
});
