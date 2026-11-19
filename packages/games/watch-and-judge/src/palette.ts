export interface ColorDef {
  name: string;
  textColorClass: string;
  subtleVariantClass: string;
}

export const SHAPES: string[] = [
  '▲', '■', '●', '◆', '★', '⬡', '♥', '✚', '⚡', '🌙',
  '🎯', '⚓', '🔔', '👑', '🚀', '🔑', '💎', '🍀', '🏹', '🧩'
];

export const COLORS: ColorDef[] = [
  { name: 'emerald', textColorClass: 'text-emerald-400', subtleVariantClass: 'text-teal-500' },
  { name: 'rose', textColorClass: 'text-rose-500', subtleVariantClass: 'text-red-600' },
  { name: 'amber', textColorClass: 'text-amber-400', subtleVariantClass: 'text-yellow-500' },
  { name: 'sky', textColorClass: 'text-sky-400', subtleVariantClass: 'text-blue-500' },
  { name: 'purple', textColorClass: 'text-purple-400', subtleVariantClass: 'text-violet-500' },
  { name: 'orange', textColorClass: 'text-orange-400', subtleVariantClass: 'text-amber-600' },
  { name: 'pink', textColorClass: 'text-pink-400', subtleVariantClass: 'text-fuchsia-500' },
  { name: 'cyan', textColorClass: 'text-cyan-400', subtleVariantClass: 'text-teal-400' }
];

export const ROTATIONS = [0, 45, 90, 180, 270];
export const SCALES = [1.0, 0.8, 1.25];
