/**
 * Rule System & Evaluation Engine for Don't Tap! (لا تضغط!)
 */

export type RuleType =
  | 'SIMPLE_COLOR'
  | 'SIMPLE_SHAPE'
  | 'COMPOUND'
  | 'NEGATION_COLOR'
  | 'NEGATION_SHAPE'
  | 'NEGATION_COMPOUND'
  | 'TRIPLE_CONDITION'
  | 'COUNT_RULE'
  | 'ALTERNATING';

export interface FallingItem {
  id: string;
  itemIndex: number;
  spawnTimeMs: number;
  fallDurationMs: number;
  lane: 0 | 1 | 2;
  shapeId: string;
  colorId: string;
  colorHex: string;
  stroopText?: string;
  stroopColorHex?: string;
  isZigZag?: boolean;
  zigzagTargetLane?: 0 | 1 | 2;
  isMorphing?: boolean;
  morphAtProgress?: number; // 0.5 (midpoint)
  morphedShapeId?: string;
  morphedColorId?: string;
  morphedColorHex?: string;
}

export interface ActiveRule {
  id: string;
  type: RuleType;
  labelAr: string;
  icon: string;
  startTimeMs: number;
  endTimeMs: number;
  colorId?: string;
  shapeId?: string;
  forbiddenShapeId?: string;
  allowedColorIds?: string[];
  targetRank?: number; // for COUNT_RULE (e.g. 2nd red shape)
  countCategory?: 'color' | 'shape' | 'negation';
  alternatingColors?: [string, string]; // [colorA, colorB]
}

export function evaluateItemAgainstRule(
  item: FallingItem,
  rule: ActiveRule,
  currentProgress = 0, // 0 (spawn) to 1.0 (bottom)
  stateContext: {
    matchCountSoFar?: number;
    lastTappedColor?: string;
  } = {}
): boolean {
  // Determine actual shape and color considering morphing
  let activeShapeId = item.shapeId;
  let activeColorId = item.colorId;

  if (item.isMorphing && item.morphAtProgress !== undefined && currentProgress >= item.morphAtProgress) {
    if (item.morphedShapeId) activeShapeId = item.morphedShapeId;
    if (item.morphedColorId) activeColorId = item.morphedColorId;
  }

  switch (rule.type) {
    case 'SIMPLE_COLOR':
      return activeColorId === rule.colorId;

    case 'SIMPLE_SHAPE':
      return activeShapeId === rule.shapeId;

    case 'COMPOUND':
      return activeColorId === rule.colorId && activeShapeId === rule.shapeId;

    case 'NEGATION_COLOR':
      return activeColorId !== rule.colorId;

    case 'NEGATION_SHAPE':
      return activeShapeId !== rule.shapeId;

    case 'NEGATION_COMPOUND':
      return !(activeColorId === rule.colorId && activeShapeId === rule.shapeId);

    case 'TRIPLE_CONDITION':
      if (rule.allowedColorIds && !rule.allowedColorIds.includes(activeColorId)) {
        return false;
      }
      if (rule.forbiddenShapeId && activeShapeId === rule.forbiddenShapeId) {
        return false;
      }
      return true;

    case 'COUNT_RULE': {
      let isBaseMatch = false;
      if (rule.countCategory === 'color') {
        isBaseMatch = activeColorId === rule.colorId;
      } else if (rule.countCategory === 'shape') {
        isBaseMatch = activeShapeId === rule.shapeId;
      } else if (rule.countCategory === 'negation') {
        isBaseMatch = activeColorId !== rule.colorId;
      }
      if (!isBaseMatch) return false;

      const currentRank = (stateContext.matchCountSoFar ?? 0) + 1;
      return currentRank === (rule.targetRank ?? 2);
    }

    case 'ALTERNATING': {
      if (!rule.alternatingColors) return false;
      const [colA, colB] = rule.alternatingColors;
      const expectedNext =
        stateContext.lastTappedColor === colA ? colB : colA;
      return activeColorId === expectedNext;
    }

    default:
      return false;
  }
}
