import type {
  GameLogic,
  StageConfig,
  Question,
  Verdict,
  Rng,
  Tier
} from '@funnygame/game-core';
import { GAME_SHAPES, NON_SYMMETRIC_SHAPES, ShapeDefinition } from './shapes.js';
import { generateOddColor } from './color-science.js';

export type OddDiffType = 'SHAPE' | 'COLOR' | 'ROTATION' | 'DUAL_DISTRACTOR';
export type OddMotionMode = 'NONE' | 'WIGGLE' | 'SWAP';

export interface OddOneOutCell {
  id: string;
  gridIndex: number; // 0 or 1
  cellIndex: number;
  shapeId: string;
  colorHex: string;
  rotationDeg: number;
  isOdd: boolean;
}

export interface ScheduledSwap {
  tMs: number;
  gridIndex: number;
  cellA: number;
  cellB: number;
}

export interface OddOneOutQuestionPayload {
  stage: number;
  isBreather: boolean;
  isBoss: boolean;
  gridCount: 1 | 2;
  gridDim: number;
  totalCells: number;
  diffType: OddDiffType;
  motionMode: OddMotionMode;
  motionSpeedSec: number;
  hideAfterMs?: number;
  rhythmOrder: [number, number]; // [0, 1] = grid 0 then grid 1, [1, 0] = reverse
  guidanceTextAr: string;
  introCardAr?: string;

  // Cells grouped by grid
  grids: OddOneOutCell[][];
  targetOddIndices: { gridIndex: number; cellIndex: number }[];
  scheduledSwaps: ScheduledSwap[];
}

export interface OddOneOutAnswerInput {
  gridIndex: number;
  cellIndex: number;
  tMs: number;
  hintUsed?: boolean;
}

// Curated high-contrast palette suitable for dark backgrounds (#16181D)
export const BASE_PALETTE = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#10b981', // emerald
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16'  // lime
];

export class OddOneOutLogic implements GameLogic<OddOneOutQuestionPayload, OddOneOutAnswerInput> {
  id = 'odd_one_out';
  ability: 'speed' = 'speed';
  basePoints = 150;
  questionsPerStage = 5;

  /**
   * Calculates stage configuration according to 70+ stage specification
   */
  stageConfig(stage: number): StageConfig {
    const s = Math.max(1, stage);
    let tier: Tier = 'warmup';
    const isBoss = s % 5 === 0;

    if (s <= 10) tier = 'warmup';
    else if (s <= 25) tier = 'hard';
    else if (s <= 45) tier = 'expert';
    else if (s <= 70) tier = 'legend';
    else tier = 'endless';

    // Temporary base time, final time calculated per question via calculateTimeLimitMs
    const timeLimitMs = this.calculateQuestionTimeMs(s, 1);

    return {
      stage: s,
      tier,
      timeLimitMs,
      isBoss,
      params: {
        mechanics: this.getStageMechanicsDescription(s)
      }
    };
  }

  /**
   * Deterministic Question Generator
   */
  generate(rng: Rng, stageConfig: StageConfig, qIndex: number): Question<OddOneOutQuestionPayload> {
    const s = stageConfig.stage;
    const isBreather = s > 1 && (s - 1) % 5 === 0;
    const isBoss = stageConfig.isBoss;

    // 1. Determine Grid Dimensions and Dual-Grid Mode
    let gridCount: 1 | 2 = 1;
    let gridDim = 3;

    if (s <= 2) gridDim = 3;
    else if (s <= 6) gridDim = 4;
    else if (s <= 9) gridDim = 5;
    else if (s <= 16) gridDim = 6;
    else if (s <= 24) gridDim = 7;
    else if (s <= 45) gridDim = 8;
    else {
      // Stage 46+ Dual Grids
      gridCount = 2;
      if (s <= 50) gridDim = 4;
      else if (s <= 60) gridDim = 5;
      else gridDim = 6; // 61+ capped at 6x6 per grid for mobile touch targets >= 44px
    }

    // 2. Determine Difference Type & Parameters
    let diffType: OddDiffType = 'SHAPE';
    let deltaE = 24;
    let rotationAngleDeg = 30;

    if (s <= 4) {
      diffType = 'SHAPE';
    } else if (s <= 6) {
      diffType = 'COLOR';
      deltaE = 24;
    } else if (s <= 9) {
      diffType = 'ROTATION';
      rotationAngleDeg = 30;
    } else if (s <= 11) {
      // Mix of 3 types
      const pick = rng.nextInt(0, 2);
      diffType = pick === 0 ? 'SHAPE' : pick === 1 ? 'COLOR' : 'ROTATION';
      deltaE = 18;
      rotationAngleDeg = 20;
    } else if (s <= 14) {
      diffType = rng.next() > 0.5 ? 'COLOR' : 'ROTATION';
      deltaE = 14;
      rotationAngleDeg = 15;
    } else if (s <= 16) {
      diffType = 'SHAPE';
    } else if (s <= 20) {
      diffType = 'DUAL_DISTRACTOR';
    } else if (s <= 24) {
      diffType = 'COLOR';
      deltaE = 10;
    } else if (s <= 31) {
      diffType = 'COLOR';
      deltaE = 7.5;
    } else if (s <= 35) {
      diffType = 'ROTATION';
      rotationAngleDeg = 10;
    } else if (s <= 45) {
      diffType = 'COLOR';
      deltaE = 8.0;
    } else {
      // 46+
      const pick = rng.nextInt(0, 1);
      diffType = pick === 0 ? 'COLOR' : 'ROTATION';
      if (s <= 70) {
        deltaE = Math.max(5.0, 8.0 - (s - 46) * 0.1);
        rotationAngleDeg = Math.max(8, 15 - Math.floor((s - 46) / 4));
      } else {
        // Endless 71+
        deltaE = Math.max(4.5, 8.0 - 0.1 * (s - 70));
        rotationAngleDeg = Math.max(5, 10 - Math.floor((s - 70) / 5));
      }
    }

    // 3. Motion Mode
    let motionMode: OddMotionMode = 'NONE';
    if (!isBreather) {
      if (s >= 8 && s <= 10) motionMode = 'WIGGLE';
      else if (s >= 20 && s <= 20) motionMode = 'WIGGLE';
      else if (s >= 22 && s <= 24) motionMode = 'WIGGLE';
      else if (s >= 26 && s <= 30) motionMode = 'SWAP';
      else if (s >= 32 && s <= 35) motionMode = 'SWAP';
      else if (s >= 42 && s <= 45) motionMode = 'SWAP';
      else if (s >= 66 && s <= 70) motionMode = 'WIGGLE';
    }

    // 4. Flash / Hide Mode
    let hideAfterMs: number | undefined = undefined;
    if (s === 15 || s === 20) hideAfterMs = s === 15 ? 1000 : 1200;
    else if (s >= 37 && s <= 40) hideAfterMs = 800;
    else if (s >= 47) hideAfterMs = 500;

    // 5. Rhythm Order for Dual Grids (stages 56+)
    let rhythmOrder: [number, number] = [0, 1];
    if (gridCount === 2 && s >= 56) {
      // Alternate or random direction
      rhythmOrder = rng.next() > 0.5 ? [0, 1] : [1, 0];
    }

    // 6. Base Styling
    const baseColorHex = BASE_PALETTE[rng.nextInt(0, BASE_PALETTE.length - 1)]!;
    const baseShapeList = diffType === 'ROTATION' ? NON_SYMMETRIC_SHAPES : GAME_SHAPES;
    const baseShape = baseShapeList[rng.nextInt(0, baseShapeList.length - 1)]!;
    const baseRotation = (rng.nextInt(0, 3) * 90) % 360;

    // Secondary shape for dual distractor
    let secondaryShape: ShapeDefinition = GAME_SHAPES.find((sh) => sh.id !== baseShape.id) || GAME_SHAPES[0]!;

    // Odd Shape
    let oddShape: ShapeDefinition = GAME_SHAPES.find(
      (sh) => sh.id !== baseShape.id && sh.id !== secondaryShape.id
    ) || GAME_SHAPES[1]!;

    // Odd Color
    const { oddHex } = generateOddColor(
      baseColorHex,
      deltaE,
      rng.next() * Math.PI * 2,
      rng.next() * 2 - 1
    );

    // Odd Rotation
    const oddRotation = (baseRotation + rotationAngleDeg) % 360;

    // 7. Generate Grids
    const grids: OddOneOutCell[][] = [];
    const targetOddIndices: { gridIndex: number; cellIndex: number }[] = [];
    const scheduledSwaps: ScheduledSwap[] = [];

    const cellsPerGrid = gridDim * gridDim;

    for (let g = 0; g < gridCount; g++) {
      const oddPos = rng.nextInt(0, cellsPerGrid - 1);
      targetOddIndices.push({ gridIndex: g, cellIndex: oddPos });

      const gridCells: OddOneOutCell[] = [];

      for (let c = 0; c < cellsPerGrid; c++) {
        const isOdd = c === oddPos;
        let cShape = baseShape.id;
        let cColor = baseColorHex;
        let cRotation = baseRotation;

        if (isOdd) {
          if (diffType === 'SHAPE' || diffType === 'DUAL_DISTRACTOR') {
            cShape = oddShape.id;
          } else if (diffType === 'COLOR') {
            cColor = oddHex;
          } else if (diffType === 'ROTATION') {
            cRotation = oddRotation;
          }
        } else if (diffType === 'DUAL_DISTRACTOR') {
          // 50% base, 50% secondary distractor
          if (c % 2 === 1) {
            cShape = secondaryShape.id;
          }
        }

        gridCells.push({
          id: `cell_${g}_${c}`,
          gridIndex: g,
          cellIndex: c,
          shapeId: cShape,
          colorHex: cColor,
          rotationDeg: cRotation,
          isOdd
        });
      }

      grids.push(gridCells);

      // Schedule cell position swaps if SWAP motion mode is active
      if (motionMode === 'SWAP') {
        const totalDurationSec = 7;
        const swapIntervalMs = 800;
        const count = Math.floor((totalDurationSec * 1000) / swapIntervalMs);

        let currentOddPos = oddPos;
        for (let k = 1; k <= count; k++) {
          const tMs = k * swapIntervalMs;
          // Pick two random neighboring or random cells
          const cellA = rng.nextInt(0, cellsPerGrid - 1);
          let cellB = (cellA + 1) % cellsPerGrid;
          while (cellB === cellA) cellB = rng.nextInt(0, cellsPerGrid - 1);

          scheduledSwaps.push({ tMs, gridIndex: g, cellA, cellB });

          // Track position of odd cell
          if (cellA === currentOddPos) currentOddPos = cellB;
          else if (cellB === currentOddPos) currentOddPos = cellA;
        }
      }
    }

    // 8. Guidance & Intro Text
    let guidanceTextAr = 'ابحث عن الرمز المختلف';
    if (diffType === 'COLOR') guidanceTextAr = 'دقّق في درجة اللون';
    else if (diffType === 'ROTATION') guidanceTextAr = 'ركّز في زاوية الدوران';
    else if (diffType === 'DUAL_DISTRACTOR') guidanceTextAr = 'شكلان عاديان، طلع الرمز الثالث!';

    if (gridCount === 2) {
      guidanceTextAr =
        rhythmOrder[0] === 0
          ? 'الشبكة العلوية ثم السفلية ⬇️'
          : 'الشبكة السفلية ثم العلوية ⬆️';
    }

    const timeLimitMs = this.calculateQuestionTimeMs(s, gridCount * cellsPerGrid, diffType, motionMode, isBreather, hideAfterMs);

    const introCardAr = qIndex === 0 ? this.getIntroCardForStage(s) : undefined;

    return {
      index: qIndex,
      stage: s,
      timeLimitMs,
      payload: {
        stage: s,
        isBreather,
        isBoss,
        gridCount,
        gridDim,
        totalCells: gridCount * cellsPerGrid,
        diffType,
        motionMode,
        motionSpeedSec: motionMode === 'WIGGLE' ? 1.5 : 0.8,
        hideAfterMs,
        rhythmOrder,
        guidanceTextAr,
        introCardAr,
        grids,
        targetOddIndices,
        scheduledSwaps
      }
    };
  }

  /**
   * Calculates precise time limit Tq per equation in section 4
   */
  calculateQuestionTimeMs(
    stage: number,
    totalCells: number,
    diffType: OddDiffType = 'SHAPE',
    motionMode: OddMotionMode = 'NONE',
    isBreather: boolean = false,
    hideAfterMs?: number
  ): number {
    const s = Math.max(1, stage);

    // If flash / hide mode
    if (hideAfterMs) {
      const flashSec = hideAfterMs / 1000;
      let decisionSec = 2.5;
      if (s >= 71) {
        decisionSec = Math.max(1.4, 2.0 - 0.02 * (s - 70));
      }
      return Math.round((flashSec + decisionSec) * 1000);
    }

    // Visible equation: Tq = max(1.5, round0.1(u(s) * sqrt(Ncells) * Cdiff + Eq))
    const u_s = Math.max(0.35, 1.0 - 0.015 * (s - 1));

    let cDiff = 1.0;
    if (diffType === 'ROTATION') cDiff = 1.25;
    else if (diffType === 'COLOR') cDiff = 1.35;
    else if (diffType === 'DUAL_DISTRACTOR') cDiff = 1.2;

    if (motionMode !== 'NONE') cDiff = Math.max(cDiff, 1.5);

    let eq = 0;
    if (isBreather) eq += 0.6;
    if (motionMode === 'SWAP') eq += 0.4;

    const rawSec = u_s * Math.sqrt(totalCells) * cDiff + eq;
    const roundedSec = Math.max(1.5, Math.round(rawSec * 10) / 10);
    return Math.round(roundedSec * 1000);
  }

  /**
   * Verifies player answer and calculates score
   */
  /**
   * Pure evaluation of user answer satisfying GameLogic contract
   */
  evaluate(
    q: Question<OddOneOutQuestionPayload>,
    answer: OddOneOutAnswerInput | null
  ): Verdict {
    // Timeout
    if (!answer) {
      return {
        correct: false,
        heartCost: 1,
        breaksCombo: true
      };
    }

    const expectedOddPos = this.getOddPositionAtTime(q.payload, answer.gridIndex, answer.tMs);
    const isHit = answer.cellIndex === expectedOddPos;

    return {
      correct: isHit,
      heartCost: 0, // Wrong taps are penalized via time deduction (-2.0s) in UI
      breaksCombo: !isHit
    };
  }

  /**
   * Helper to calculate points for correct runs
   */
  calculatePoints(
    question: Question<OddOneOutQuestionPayload>,
    answer: OddOneOutAnswerInput,
    timeTakenMs: number
  ): number {
    const q = question.payload;
    const s = q.stage;
    const tRemaining = Math.max(0, question.timeLimitMs - timeTakenMs);
    const basePts = answer.hintUsed ? 150 : 200;
    const v = 1.0 + 0.5 * (tRemaining / question.timeLimitMs);
    const m_s = s <= 25 ? 1 + 0.1 * (s - 1) : 3.4 + 0.15 * (s - 25);
    return Math.round(basePts * v * m_s);
  }

  /**
   * Resolves the exact position of the odd cell at a specific timestamp tMs
   */
  getOddPositionAtTime(q: OddOneOutQuestionPayload, gridIndex: number, tMs: number): number {
    const initialTarget = q.targetOddIndices.find((t) => t.gridIndex === gridIndex);
    if (!initialTarget) return -1;

    let currentPos = initialTarget.cellIndex;
    if (!q.scheduledSwaps || q.scheduledSwaps.length === 0) return currentPos;

    // Apply swaps occurred up to tMs
    const relevantSwaps = q.scheduledSwaps
      .filter((sw) => sw.gridIndex === gridIndex && sw.tMs <= tMs)
      .sort((a, b) => a.tMs - b.tMs);

    for (const sw of relevantSwaps) {
      if (sw.cellA === currentPos) currentPos = sw.cellB;
      else if (sw.cellB === currentPos) currentPos = sw.cellA;
    }

    return currentPos;
  }

  private getStageMechanicsDescription(s: number): string {
    if (s <= 2) return 'شبكة 3×3 - اختلاف شكل واضح';
    if (s <= 4) return 'شبكة 4×4 - مسح بصري موسع';
    if (s === 5) return 'زعيم 4×4 - دخول اختلاف درجة اللون';
    if (s === 6) return 'مرحلة تنفس - وقت إضافي وثبات';
    if (s <= 9) return 'شبكة 5×5 - زوايا دوران وحركة';
    if (s === 10) return 'زعيم 6×6 - مزج الشكل واللون والدوران';
    if (s <= 14) return 'شبكة 6×6 - فروق بصرية أضيق';
    if (s === 15) return 'زعيم 6×6 - وضع الاختفاء 1.0 ثانية';
    if (s <= 19) return 'شبكة 7×7 - تشتت الأشكال الثنائي';
    if (s === 20) return 'زعيم 7×7 - حركة واختفاء';
    if (s === 25) return 'زعيم الكبار - شبكة 8×8';
    if (s <= 30) return 'شبكة 8×8 - لون وتبديل أماكن';
    if (s <= 35) return 'شبكة 8×8 - دوران وتبديل';
    if (s <= 40) return 'شبكة 8×8 - اختفاء خاطف 0.8 ثانية';
    if (s <= 45) return 'شبكة 8×8 - حركة بأقصى سرعة';
    if (s <= 50) return 'أسطوري - شبكتان متزامنتان 4×4';
    if (s <= 60) return 'أسطوري - شبكتان 5×5 وتغيير الإيقاع';
    return 'أسطوري - شبكتان 6×6 (72 خلية) وأقصى تحدي';
  }

  private getIntroCardForStage(s: number): string | undefined {
    if (s === 1) return 'اضغط على الرمز المختلف قبل ما يخلص الوقت.';
    if (s === 5) return 'المرة هذي الفرق في درجة اللون، دقّق!';
    if (s === 7) return 'ركز في اتجاه الرموز، واحد منهم مايل!';
    if (s === 8) return 'الرموز صارت تتحرك، لا تخليها تدوّخك.';
    if (s === 10) return 'شبكة أكبر وحركة أسرع!';
    if (s === 15) return 'احفظ مكانه في ثانية وحدة قبل ما يتغطى!';
    if (s === 17) return 'الشبكة فيها شكلين عاديين، طلع الثالث الغريب!';
    if (s === 25) return 'شبكة الكبار 8×8! افتح عيونك زين.';
    if (s === 26) return 'الألوان متقاربة والرموز تبدّل أماكنها!';
    if (s === 37) return 'لمحة 0.8 ثانية بس في شبكة 8×8!';
    if (s === 47) return 'شبكتين في نص ثانية! احفظ مكان الشاذ في كل وحدة بالترتيب.';
    if (s === 56) return 'انتبه للسهم! الترتيب المطلوب يتغير.';
    return undefined;
  }
}

export const oddOneOutLogic = new OddOneOutLogic();
