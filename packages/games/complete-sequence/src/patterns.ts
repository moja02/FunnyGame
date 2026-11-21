import type { Rng } from '@funnygame/game-core';
import type { ShapeData, ShapeType, ShapeColor } from './types.js';
import {
  ALL_SHAPE_TYPES,
  ALL_SHAPE_COLORS,
  areShapesEqual
} from './shapes.js';

export interface GeneratedPattern {
  type: 'number' | 'shape';
  numbers?: number[];
  shapes?: ShapeData[];
  ruleSummaryAr: string;
  ruleHintAr: string;
  isCompound: boolean;
}

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];

function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng.next() * arr.length)]!;
}

// ----------------------------------------------------
// 1. Single Arithmetic Sequence (+d or -d)
// ----------------------------------------------------
export function generateArithmetic(rng: Rng, length = 6, allowNegative = false): GeneratedPattern {
  const d = 1 + Math.floor(rng.next() * 8); // 1 to 8
  const isAddition = allowNegative ? rng.next() > 0.5 : rng.next() > 0.3;
  const step = isAddition ? d : -d;

  let start = 1 + Math.floor(rng.next() * 20);
  if (!isAddition && !allowNegative) {
    start += d * (length + 2); // ensure positive
  } else if (!isAddition && allowNegative) {
    start = d * 2 + Math.floor(rng.next() * d); // will cross into negative!
  }

  const numbers: number[] = [];
  for (let i = 0; i < length; i++) {
    numbers.push(start + i * step);
  }

  const signStr = step > 0 ? `+${step}` : `${step}`;
  return {
    type: 'number',
    numbers,
    ruleSummaryAr: `النمط: إضافة (${signStr}) في كل خطوة`,
    ruleHintAr: `الفرق بين أول رقمين هو (${signStr})`,
    isCompound: false
  };
}

// ----------------------------------------------------
// 2. Simple Geometric Sequence (×2, ×3)
// ----------------------------------------------------
export function generateGeometric(rng: Rng, length = 6): GeneratedPattern {
  const ratio = rng.next() > 0.75 ? 3 : 2;
  const start = 1 + Math.floor(rng.next() * (ratio === 3 ? 3 : 4)); // 1 to 4

  const numbers: number[] = [];
  let curr = start;
  for (let i = 0; i < length; i++) {
    numbers.push(curr);
    curr *= ratio;
  }

  return {
    type: 'number',
    numbers,
    ruleSummaryAr: `النمط: الضرب في (×${ratio}) في كل خطوة`,
    ruleHintAr: `النسبة بين أول رقمين هي (×${ratio})`,
    isCompound: false
  };
}

// ----------------------------------------------------
// 3. Increasing Differences (+1, +2, +3, +4...)
// ----------------------------------------------------
export function generateIncreasingDiff(rng: Rng, length = 6): GeneratedPattern {
  const diffStart = 1 + Math.floor(rng.next() * 3); // 1 to 3
  const diffStep = pick(rng, [1, 2]); // +1 or +2
  const start = 1 + Math.floor(rng.next() * 10);

  const numbers: number[] = [start];
  let curr = start;
  let currDiff = diffStart;

  for (let i = 1; i < length; i++) {
    curr += currDiff;
    numbers.push(curr);
    currDiff += diffStep;
  }

  return {
    type: 'number',
    numbers,
    ruleSummaryAr: `النمط: فارق متزايد (+${diffStart}, +${diffStart + diffStep}, +${diffStart + 2 * diffStep}...)`,
    ruleHintAr: `الفرق بين أول رقمين هو (+${diffStart}) ويزيد بمقدار (+${diffStep})`,
    isCompound: false
  };
}

// ----------------------------------------------------
// 4. Two Alternating Operations (+a then ×b, or +a then -b)
// ----------------------------------------------------
export function generateAlternatingOps(rng: Rng, length = 6): GeneratedPattern {
  const configs = [
    { op1Name: '+2', op2Name: '×2', apply: (n: number, i: number) => (i % 2 === 0 ? n + 2 : n * 2), startMin: 1, startMax: 4 },
    { op1Name: '+3', op2Name: '×2', apply: (n: number, i: number) => (i % 2 === 0 ? n + 3 : n * 2), startMin: 1, startMax: 3 },
    { op1Name: '+5', op2Name: '-2', apply: (n: number, i: number) => (i % 2 === 0 ? n + 5 : n - 2), startMin: 2, startMax: 8 },
    { op1Name: '+4', op2Name: '-1', apply: (n: number, i: number) => (i % 2 === 0 ? n + 4 : n - 1), startMin: 3, startMax: 10 },
    { op1Name: '×2', op2Name: '-3', apply: (n: number, i: number) => (i % 2 === 0 ? n * 2 : n - 3), startMin: 4, startMax: 7 },
    { op1Name: '+6', op2Name: '-2', apply: (n: number, i: number) => (i % 2 === 0 ? n + 6 : n - 2), startMin: 1, startMax: 5 }
  ];

  const cfg = pick(rng, configs);
  const start = cfg.startMin + Math.floor(rng.next() * (cfg.startMax - cfg.startMin + 1));

  const numbers: number[] = [start];
  let curr = start;

  for (let i = 0; i < length - 1; i++) {
    curr = cfg.apply(curr, i);
    numbers.push(curr);
  }

  return {
    type: 'number',
    numbers,
    ruleSummaryAr: `النمط: بالتناوب (${cfg.op1Name} ثم ${cfg.op2Name})`,
    ruleHintAr: `العملية الأولى (${cfg.op1Name}) والعملية الثانية (${cfg.op2Name})`,
    isCompound: false
  };
}

// ----------------------------------------------------
// 5. Squares (n^2) and Cubes (n^3) and Shifted Squares
// ----------------------------------------------------
export function generateSquaresAndCubes(rng: Rng, length = 6): GeneratedPattern {
  const isCubes = rng.next() > 0.8;
  const offset = Math.floor(rng.next() * 3); // 0, 1, 2
  const startN = 1 + Math.floor(rng.next() * 3); // 1, 2, 3

  const numbers: number[] = [];
  for (let i = 0; i < length; i++) {
    const n = startN + i;
    if (isCubes) {
      numbers.push(n * n * n + offset);
    } else {
      numbers.push(n * n + offset);
    }
  }

  const desc = isCubes
    ? offset > 0 ? `مكعبات الأعداد زائد ${offset} (n³ + ${offset})` : 'مكعبات الأعداد المتتالية (n³)'
    : offset > 0 ? `مربعات الأعداد زائد ${offset} (n² + ${offset})` : 'مربعات الأعداد المتتالية (n²)';

  return {
    type: 'number',
    numbers,
    ruleSummaryAr: `النمط: ${desc}`,
    ruleHintAr: isCubes ? 'سلسلة مكعبات الأعداد (1, 8, 27...)' : 'سلسلة مربعات الأعداد (1, 4, 9, 16...)',
    isCompound: true // Base × 1.5
  };
}

// ----------------------------------------------------
// 6. Fibonacci Sequence (a_n = a_{n-1} + a_{n-2})
// ----------------------------------------------------
export function generateFibonacci(rng: Rng, length = 6, modified = false): GeneratedPattern {
  const startPairs = [
    [1, 1],
    [1, 2],
    [2, 3],
    [1, 3],
    [2, 4]
  ];
  const pair = pick(rng, startPairs);
  const modAdd = modified ? 1 : 0;

  const numbers: number[] = [pair[0]!, pair[1]!];
  for (let i = 2; i < length; i++) {
    const nextVal = numbers[i - 1]! + numbers[i - 2]! + modAdd;
    numbers.push(nextVal);
  }

  const summary = modified
    ? 'النمط: مجموع آخر رقمين + 1 (فيبوناتشي معدّلة)'
    : 'النمط: كل رقم هو حاصل جمع الرقمين السابقين (متتالية فيبوناتشي)';

  return {
    type: 'number',
    numbers,
    ruleSummaryAr: summary,
    ruleHintAr: modified ? 'اجمع آخر رقمين وأضف 1' : 'كل رقم = مجموع الرقمين السابقين له',
    isCompound: true // Base × 1.5
  };
}

// ----------------------------------------------------
// 7. Prime Numbers Sequence
// ----------------------------------------------------
export function generatePrimes(rng: Rng, length = 6): GeneratedPattern {
  const maxStart = PRIMES.length - length;
  const startIdx = Math.floor(rng.next() * Math.min(3, maxStart + 1));
  const numbers = PRIMES.slice(startIdx, startIdx + length);

  return {
    type: 'number',
    numbers,
    ruleSummaryAr: 'النمط: متتالية الأعداد الأولية (تقبل القسمة على نفسها و1 فقط)',
    ruleHintAr: 'سلسلة الأعداد الأولية المتتالية (2, 3, 5, 7, 11...)',
    isCompound: true // Base × 1.5
  };
}

// ----------------------------------------------------
// 8. Alternating Dual Sequences (Odd/Even Interleaved)
// ----------------------------------------------------
export function generateDualSequence(rng: Rng, length = 6): GeneratedPattern {
  const d1 = 2 + Math.floor(rng.next() * 5); // +2 to +6
  const d2 = pick(rng, [-2, -3, -4, 2, 3, 5]);

  let start1 = 2 + Math.floor(rng.next() * 10);
  let start2 = d2 < 0 ? 30 + Math.floor(rng.next() * 20) : 5 + Math.floor(rng.next() * 10);

  const seqA: number[] = [];
  const seqB: number[] = [];

  const halfLen = Math.ceil(length / 2);
  for (let i = 0; i < halfLen; i++) {
    seqA.push(start1 + i * d1);
    seqB.push(start2 + i * d2);
  }

  const numbers: number[] = [];
  for (let i = 0; i < length; i++) {
    if (i % 2 === 0) {
      numbers.push(seqA[Math.floor(i / 2)]!);
    } else {
      numbers.push(seqB[Math.floor(i / 2)]!);
    }
  }

  const sign2 = d2 > 0 ? `+${d2}` : `${d2}`;
  return {
    type: 'number',
    numbers,
    ruleSummaryAr: `النمط: متتاليتان متداخلتان (الفردية +${d1} والزوجية ${sign2})`,
    ruleHintAr: `الخانات الفردية تزيد (+${d1}) والخانات الزوجية (${sign2})`,
    isCompound: true // Base × 1.5
  };
}

// ----------------------------------------------------
// 9. Rotating / Color Changing Shape Sequence
// ----------------------------------------------------
export function generateRotatingShapes(rng: Rng, length = 6): GeneratedPattern {
  const shape = pick(rng, ['triangle', 'square', 'pentagon', 'diamond', 'star'] as ShapeType[]);
  const c1 = pick(rng, ALL_SHAPE_COLORS);
  let c2 = pick(rng, ALL_SHAPE_COLORS);
  while (c2 === c1) {
    c2 = pick(rng, ALL_SHAPE_COLORS);
  }

  const rotStep = pick(rng, [45, 90, 135]);
  const startRot = pick(rng, [0, 45, 90]);

  const shapes: ShapeData[] = [];
  for (let i = 0; i < length; i++) {
    shapes.push({
      shape,
      color: i % 2 === 0 ? c1 : c2,
      rotationDeg: (startRot + i * rotStep) % 360
    });
  }

  return {
    type: 'shape',
    shapes,
    ruleSummaryAr: `النمط: دوران بزاوية (+${rotStep}°) مع تناوب اللونين`,
    ruleHintAr: `الشكل يدور بمقدار (${rotStep}°) في كل خطوة`,
    isCompound: false
  };
}

// ----------------------------------------------------
// 10. Evolving Polygon Sides Sequence
// ----------------------------------------------------
export function generateEvolvingPolygonShapes(rng: Rng, length = 6): GeneratedPattern {
  const order: ShapeType[] = ['triangle', 'square', 'pentagon', 'hexagon'];
  const color = pick(rng, ALL_SHAPE_COLORS);
  const rotStep = 45;

  const shapes: ShapeData[] = [];
  for (let i = 0; i < length; i++) {
    shapes.push({
      shape: order[i % order.length]!,
      color,
      rotationDeg: (i * rotStep) % 360
    });
  }

  return {
    type: 'shape',
    shapes,
    ruleSummaryAr: 'النمط: زيادة عدد أضلاع الشكل الهندسية مع دوران 45°',
    ruleHintAr: 'عدد الأضلاع يزيد في كل خطوة: مثلث (3) ← مربع (4) ← خماسي (5)...',
    isCompound: false
  };
}

// ----------------------------------------------------
// 11. Three-Attribute Shapes (Shape + Color + Dots)
// ----------------------------------------------------
export function generateThreeAttributeShapes(rng: Rng, length = 6): GeneratedPattern {
  const shapesPool: ShapeType[] = ['square', 'circle', 'triangle', 'diamond'];
  const colorsPool: ShapeColor[] = ['emerald', 'cyan', 'amber', 'rose'];

  const s1 = pick(rng, shapesPool);
  let s2 = pick(rng, shapesPool);
  while (s2 === s1) s2 = pick(rng, shapesPool);

  const c1 = pick(rng, colorsPool);
  let c2 = pick(rng, colorsPool);
  while (c2 === c1) c2 = pick(rng, colorsPool);

  const shapes: ShapeData[] = [];
  for (let i = 0; i < length; i++) {
    shapes.push({
      shape: i % 2 === 0 ? s1 : s2,
      color: i % 2 === 0 ? c1 : c2,
      rotationDeg: (i * 90) % 360,
      dots: (i % 3) + 1 // 1, 2, 3, 1, 2, 3...
    });
  }

  return {
    type: 'shape',
    shapes,
    ruleSummaryAr: 'النمط: تناوب الشكل واللون مع تزايد النقاط الداخلية (1، 2، 3)',
    ruleHintAr: 'راقب عدد النقاط الداخلية (1 ثم 2 ثم 3)',
    isCompound: true // Base × 1.5
  };
}
