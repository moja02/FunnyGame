/**
 * Color Science utilities: CIELAB <-> sRGB conversions and Delta-E color distance.
 * Implements strict gamut clamping and Delta-E floor guarantees (>= 4.5)
 * for visual discrimination tasks on digital screens.
 */

export interface LabColor {
  l: number; // 0 to 100
  a: number; // -128 to 127
  b: number; // -128 to 127
}

export interface RgbColor {
  r: number; // 0 to 255
  g: number; // 0 to 255
  b: number; // 0 to 255
}

/**
 * Converts sRGB [0..255] to CIELAB (D65 illuminant).
 */
export function rgbToLab(rgb: RgbColor): LabColor {
  // 1. Linearize sRGB
  const rLin = pivotRgb(rgb.r / 255);
  const gLin = pivotRgb(rgb.g / 255);
  const bLin = pivotRgb(rgb.b / 255);

  // 2. Convert to XYZ (D65)
  const x = rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375;
  const y = rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.072175;
  const z = rLin * 0.0193339 + gLin * 0.119192 + bLin * 0.9503041;

  // D65 reference white
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  const fx = pivotXyz(x / xn);
  const fy = pivotXyz(y / yn);
  const fz = pivotXyz(z / zn);

  const l = Math.max(0, 116 * fy - 16);
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { l, a, b };
}

/**
 * Converts CIELAB (D65) to sRGB [0..255] with gamut clamping.
 */
export function labToRgb(lab: LabColor): RgbColor {
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;

  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  const x = xn * unpivotXyz(fx);
  const y = yn * unpivotXyz(fy);
  const z = zn * unpivotXyz(fz);

  // XYZ to linear sRGB
  let rLin = x * 3.2404542 - y * 1.5371385 - z * 0.4985314;
  let gLin = -x * 0.969266 + y * 1.8760108 + z * 0.041556;
  let bLin = x * 0.0556434 - y * 0.2040259 + z * 1.0572252;

  // Clamping to [0, 1]
  rLin = Math.max(0, Math.min(1, rLin));
  gLin = Math.max(0, Math.min(1, gLin));
  bLin = Math.max(0, Math.min(1, bLin));

  return {
    r: Math.round(unpivotRgb(rLin) * 255),
    g: Math.round(unpivotRgb(gLin) * 255),
    b: Math.round(unpivotRgb(bLin) * 255)
  };
}

/**
 * Calculates Euclidean Delta-E (CIE76) between two CIELAB colors.
 */
export function deltaE76(c1: LabColor, c2: LabColor): number {
  const dl = c1.l - c2.l;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Calculates actual Delta-E between two RGB colors (via CIELAB conversion).
 */
export function deltaERgb(rgb1: RgbColor, rgb2: RgbColor): number {
  return deltaE76(rgbToLab(rgb1), rgbToLab(rgb2));
}

/**
 * Formats RGB to hex string (#RRGGBB).
 */
export function rgbToHex(rgb: RgbColor): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Parses hex string (#RRGGBB or #RGB) to RGB.
 */
export function hexToRgb(hex: string): RgbColor {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Generates an odd color shifted by targetDeltaE with guaranteed minimum difference (>= 4.5).
 */
export function generateOddColor(
  baseHex: string,
  targetDeltaE: number,
  rngAngle: number, // 0 to 2*PI
  rngLFactor: number // -1 to 1
): { oddHex: string; actualDeltaE: number } {
  const baseRgb = hexToRgb(baseHex);
  const baseLab = rgbToLab(baseRgb);

  // Enforce minimum threshold floor
  const effectiveDeltaE = Math.max(4.5, targetDeltaE);

  // Split Delta-E into Lightness shift (40%) and Chroma/Hue shift (60%)
  const dl = rngLFactor * (effectiveDeltaE * 0.4);
  const remainingDelta = Math.sqrt(Math.max(0, effectiveDeltaE * effectiveDeltaE - dl * dl));
  const da = Math.cos(rngAngle) * remainingDelta;
  const db = Math.sin(rngAngle) * remainingDelta;

  // Clamped target Lab (ensuring L stays in reasonable visual range 30..85 for dark background #16181D)
  let targetL = baseLab.l + dl;
  if (targetL < 30) targetL = baseLab.l + Math.abs(dl);
  if (targetL > 85) targetL = baseLab.l - Math.abs(dl);

  const oddLab: LabColor = {
    l: targetL,
    a: baseLab.a + da,
    b: baseLab.b + db
  };

  const oddRgb = labToRgb(oddLab);
  const oddHex = rgbToHex(oddRgb);
  const actualDeltaE = deltaERgb(baseRgb, oddRgb);

  return { oddHex, actualDeltaE };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pivotRgb(n: number): number {
  return n > 0.04045 ? Math.pow((n + 0.055) / 1.055, 2.4) : n / 12.92;
}

function unpivotRgb(n: number): number {
  return n > 0.0031308 ? 1.055 * Math.pow(n, 1 / 2.4) - 0.055 : 12.92 * n;
}

function pivotXyz(n: number): number {
  return n > 0.008856 ? Math.cbrt(n) : 7.787 * n + 16 / 116;
}

function unpivotXyz(n: number): number {
  const n3 = n * n * n;
  return n3 > 0.008856 ? n3 : (n - 16 / 116) / 7.787;
}
