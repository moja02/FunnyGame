/**
 * Shape definitions for Odd One Out game.
 * Uses scalable SVG path data (viewBox="0 0 100 100").
 * Strictly flags rotational symmetry so ROTATION differences
 * never use symmetric shapes like circles or squares.
 */

export interface ShapeDefinition {
  id: string;
  nameAr: string;
  svgPath: string;
  isRotationallySymmetric: boolean;
}

export const GAME_SHAPES: ShapeDefinition[] = [
  // 1. Non-symmetric shapes (Fully valid for ROTATION, SHAPE, and COLOR)
  {
    id: 'arrow',
    nameAr: 'سهم',
    svgPath: 'M50 10 L85 45 L65 45 L65 90 L35 90 L35 45 L15 45 Z',
    isRotationallySymmetric: false
  },
  {
    id: 'crescent',
    nameAr: 'هلال',
    svgPath: 'M50 10 C28 10 10 28 10 50 C10 72 28 90 50 90 C34 78 30 52 42 32 C46 25 52 18 60 14 C57 11 53 10 50 10 Z',
    isRotationallySymmetric: false
  },
  {
    id: 'triangle_iso',
    nameAr: 'مثلث',
    svgPath: 'M50 12 L90 88 L10 88 Z',
    isRotationallySymmetric: false
  },
  {
    id: 'letter_t',
    nameAr: 'حرف T',
    svgPath: 'M15 15 L85 15 L85 35 L60 35 L60 85 L40 85 L40 35 L15 35 Z',
    isRotationallySymmetric: false
  },
  {
    id: 'heart',
    nameAr: 'قلب',
    svgPath: 'M50 85 C50 85 15 60 15 35 C15 20 28 10 42 18 C46 20 50 25 50 25 C50 25 54 20 58 18 C72 10 85 20 85 35 C85 60 50 85 50 85 Z',
    isRotationallySymmetric: false
  },
  {
    id: 'lightning',
    nameAr: 'برق',
    svgPath: 'M55 10 L20 52 L48 52 L35 90 L80 44 L52 44 Z',
    isRotationallySymmetric: false
  },
  {
    id: 'teardrop',
    nameAr: 'قطرة',
    svgPath: 'M50 10 C50 10 20 48 20 65 C20 81 33 90 50 90 C67 90 80 81 80 65 C80 48 50 10 50 10 Z',
    isRotationallySymmetric: false
  },
  {
    id: 'key',
    nameAr: 'مفتاح',
    svgPath: 'M35 15 C22 15 12 25 12 38 C12 49 20 58 30 60 L30 85 L45 85 L45 75 L55 75 L55 65 L45 65 L45 59 C52 56 58 48 58 38 C58 25 48 15 35 15 Z M35 28 C30 28 26 32 26 38 C26 44 30 48 35 48 C40 48 44 44 44 38 C44 32 40 28 35 28 Z',
    isRotationallySymmetric: false
  },

  // 2. Symmetric shapes (Valid ONLY for SHAPE and COLOR modes)
  {
    id: 'circle',
    nameAr: 'دائرة',
    svgPath: 'M50 10 A40 40 0 1 0 50 90 A40 40 0 1 0 50 10 Z',
    isRotationallySymmetric: true
  },
  {
    id: 'square',
    nameAr: 'مربع',
    svgPath: 'M15 15 L85 15 L85 85 L15 85 Z',
    isRotationallySymmetric: true
  },
  {
    id: 'diamond',
    nameAr: 'معين',
    svgPath: 'M50 10 L90 50 L50 90 L10 50 Z',
    isRotationallySymmetric: true
  }
];

export const NON_SYMMETRIC_SHAPES = GAME_SHAPES.filter((s) => !s.isRotationallySymmetric);
