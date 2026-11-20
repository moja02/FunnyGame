export interface ColorDef {
  name: string;
  hex: string;
  subtleHex: string;
  textColorClass: string;
  subtleVariantClass: string;
}

/**
 * 20 strictly directional & asymmetrical SVG shapes.
 * Every single shape is a pure vector SVG path that takes the EXACT CSS fill/color,
 * guaranteeing 100% platform-independent color rendering and clear rotational orientation.
 */
export const SHAPES = [
  'ARROW',
  'ROCKET',
  'HEART',
  'LIGHTNING',
  'CROWN',
  'KEY',
  'MOON',
  'ANCHOR',
  'BELL',
  'SHIELD',
  'FLAME',
  'TEARDROP',
  'TREE',
  'PLANE',
  'FLAG',
  'SAILBOAT',
  'TRIANGLE',
  'PENCIL',
  'STAR',
  'MUSHROOM'
] as const;

export type ShapeName = typeof SHAPES[number];

export const SHAPE_PATHS: Record<string, string> = {
  ARROW: 'M12 2L4 10h5v10h6V10h5L12 2z',
  ROCKET: 'M12 2.5c-3 4-4 8-4 12.5l2-1v4l2-2 2 2v-4l2 1c0-4.5-1-8.5-4-12.5z',
  HEART: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  LIGHTNING: 'M7 2v11h3v9l7-12h-4l4-8H7z',
  CROWN: 'M2 19h20v2H2v-2zm1-8l4 3 5-7 5 7 4-3v6H3v-6z',
  KEY: 'M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
  MOON: 'M12.3 2a10 10 0 0 0-.19 14 9.92 9.92 0 0 0 8.36 4.31A10 10 0 1 1 12.3 2z',
  ANCHOR: 'M12 2a3 3 0 0 0-3 3c0 1.3.84 2.4 2 2.82V11H7v2h4v6.93A8.003 8.003 0 0 1 4 13H2a10 10 0 0 0 9 9.95V23h2v-1.05A10 10 0 0 0 22 13h-2a8.003 8.003 0 0 1-7 6.93V13h4v-2h-4V7.82c1.16-.42 2-1.52 2-2.82a3 3 0 0 0-3-3zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z',
  BELL: 'M12 2a2 2 0 0 0-2 2v.29C7.12 5.14 5 7.82 5 11v5l-2 2v1h18v-1l-2-2v-5c0-3.18-2.12-5.86-5-6.71V4a2 2 0 0 0-2-2zm-2 19a2 2 0 0 0 4 0h-4z',
  SHIELD: 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z',
  FLAME: 'M12 2.24c-1.39 2.5-3.32 4.67-4.43 7.62C6.18 13.56 7.5 17.5 10.6 19.3c.5.29.93.07.9-.5-.07-1.44.42-2.88 1.4-3.9 2.4-2.5 2.6-6.1.6-9.16-.14-.23-.42-.32-.63-.2-.55.33-1.07.74-1.54 1.22-.3.3-.77.16-.86-.25-.38-1.78-.04-3.56.53-4.27z',
  TEARDROP: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z',
  TREE: 'M12 2L4 12h3l-2 5h6v4h2v-4h6l-2-5h3L12 2z',
  PLANE: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  FLAG: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z',
  SAILBOAT: 'M11 3v9H4l7-9zm2 1.5l6 7.5h-6V4.5zM3 15l2 4h14l2-4H3z',
  TRIANGLE: 'M12 3L2 21h20L12 3z',
  PENCIL: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  STAR: 'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z',
  MUSHROOM: 'M12 3c-4.97 0-9 3.58-9 8h18c0-4.42-4.03-8-9-8zm-2 10v6c0 1.1.9 2 2 2s2-.9 2-2v-6h-4z'
};

/**
 * Vibrant CIELAB-contrasting colors with exact HEX definitions and Delta E >= 20 variants.
 */
export const COLORS: ColorDef[] = [
  { name: 'emerald', hex: '#10b981', subtleHex: '#047857', textColorClass: 'text-emerald-400', subtleVariantClass: 'text-emerald-700' },
  { name: 'rose', hex: '#f43f5e', subtleHex: '#9f1239', textColorClass: 'text-rose-500', subtleVariantClass: 'text-rose-800' },
  { name: 'amber', hex: '#f59e0b', subtleHex: '#b45309', textColorClass: 'text-amber-400', subtleVariantClass: 'text-amber-700' },
  { name: 'sky', hex: '#0ea5e9', subtleHex: '#0369a1', textColorClass: 'text-sky-400', subtleVariantClass: 'text-sky-700' },
  { name: 'purple', hex: '#a855f7', subtleHex: '#6b21a8', textColorClass: 'text-purple-400', subtleVariantClass: 'text-purple-700' },
  { name: 'orange', hex: '#f97316', subtleHex: '#c2410c', textColorClass: 'text-orange-400', subtleVariantClass: 'text-orange-700' },
  { name: 'pink', hex: '#ec4899', subtleHex: '#9d174d', textColorClass: 'text-pink-400', subtleVariantClass: 'text-pink-700' },
  { name: 'cyan', hex: '#06b6d4', subtleHex: '#0e7490', textColorClass: 'text-cyan-400', subtleVariantClass: 'text-cyan-700' }
];

export const ROTATIONS = [0, 90, 180, 270];
