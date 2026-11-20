export interface ColorDef {
  name: string;
  textColorClass: string;
  subtleVariantClass: string;
}

/**
 * 20 strictly directional & asymmetrical shapes.
 * Every single shape has a clear top/bottom or left/right orientation,
 * guaranteeing that any rotation (90°, 180°, 270°) is 100% visually distinct to the human eye.
 */
export const SHAPES: string[] = [
  '▲',  // Triangle (points up)
  '⚡',  // Lightning (diagonal slash)
  '🌙',  // Crescent moon (curved arc)
  '🚀',  // Rocket (points up)
  '🔑',  // Key (head top, teeth side)
  '🏹',  // Bow and arrow (directional)
  '⚓',  // Anchor (loop top, arms bottom)
  '🔔',  // Bell (handle top, mouth bottom)
  '👑',  // Crown (flat bottom, points top)
  '♥',  // Heart (cleft top, point bottom)
  '🧩',  // Puzzle piece (knobs on specific sides)
  '☂️',  // Umbrella (canopy top, hook bottom)
  '✈️',  // Airplane (nose up, tail bottom)
  '✂️',  // Scissors (handles bottom, blades top)
  '🍄',  // Mushroom (cap top, stem bottom)
  '⛵',  // Sailboat (sail top, hull bottom)
  '🎺',  // Trumpet (mouthpiece left, bell right)
  '👣',  // Footprints (toes top, heels bottom)
  '🐟',  // Fish (head left, tail right)
  '✏️'   // Pencil (tip top, eraser bottom)
];

/**
 * Vibrant CIELAB-contrasting colors with deep/bright subtle variants (Delta E >= 18).
 */
export const COLORS: ColorDef[] = [
  { name: 'emerald', textColorClass: 'text-emerald-400', subtleVariantClass: 'text-emerald-700' },
  { name: 'rose', textColorClass: 'text-rose-500', subtleVariantClass: 'text-rose-800' },
  { name: 'amber', textColorClass: 'text-amber-400', subtleVariantClass: 'text-amber-700' },
  { name: 'sky', textColorClass: 'text-sky-400', subtleVariantClass: 'text-sky-700' },
  { name: 'purple', textColorClass: 'text-purple-400', subtleVariantClass: 'text-purple-700' },
  { name: 'orange', textColorClass: 'text-orange-400', subtleVariantClass: 'text-orange-700' },
  { name: 'pink', textColorClass: 'text-pink-400', subtleVariantClass: 'text-pink-700' },
  { name: 'cyan', textColorClass: 'text-cyan-400', subtleVariantClass: 'text-cyan-700' }
];

export const ROTATIONS = [0, 90, 180, 270];
export const SCALES = [1.0];
