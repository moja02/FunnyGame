import type { RationalNumber } from './types.js';

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export function simplifyRational(r: RationalNumber): RationalNumber {
  if (r.d === 0) {
    throw new Error('Denominator cannot be zero in RationalNumber');
  }
  if (r.n === 0) {
    return { n: 0, d: 1 };
  }
  const divisor = gcd(r.n, r.d);
  let n = Math.round(r.n / divisor);
  let d = Math.round(r.d / divisor);
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return { n, d };
}

export function makeRational(n: number, d = 1): RationalNumber {
  return simplifyRational({ n, d });
}

export function rationalAdd(a: RationalNumber, b: RationalNumber): RationalNumber {
  return simplifyRational({
    n: a.n * b.d + b.n * a.d,
    d: a.d * b.d
  });
}

export function rationalSub(a: RationalNumber, b: RationalNumber): RationalNumber {
  return simplifyRational({
    n: a.n * b.d - b.n * a.d,
    d: a.d * b.d
  });
}

export function rationalMul(a: RationalNumber, b: RationalNumber): RationalNumber {
  return simplifyRational({
    n: a.n * b.n,
    d: a.d * b.d
  });
}

export function rationalDiv(a: RationalNumber, b: RationalNumber): RationalNumber | null {
  if (b.n === 0) return null;
  return simplifyRational({
    n: a.n * b.d,
    d: a.d * b.n
  });
}

export function rationalEquals(a: RationalNumber, b: RationalNumber): boolean {
  return a.n === b.n && a.d === b.d;
}

export function rationalToNumber(r: RationalNumber): number {
  return r.n / r.d;
}

export function isRationalInteger(r: RationalNumber): boolean {
  return r.d === 1;
}

export function isCleanQuarterOrHalf(r: RationalNumber): boolean {
  return r.d === 1 || r.d === 2 || r.d === 4;
}

export function formatRational(r: RationalNumber): string {
  if (r.d === 1) {
    return String(r.n);
  }
  const val = rationalToNumber(r);
  return Number.isInteger(val) ? String(val) : String(Math.round(val * 100) / 100);
}
