/**
 * Visual Shapes & Colors for Don't Tap! (لا تضغط!)
 * Vector SVG paths (viewBox="0 0 100 100") + distinct accessible color palette.
 */

export interface DontTapShape {
  id: string;
  nameAr: string;
  svgPath: string;
  icon: string;
}

export interface DontTapColor {
  id: string;
  nameAr: string;
  hex: string;
  icon: string;
}

export const DONT_TAP_SHAPES: DontTapShape[] = [
  {
    id: 'circle',
    nameAr: 'دائرة',
    svgPath: 'M50 10 A40 40 0 1 0 50 90 A40 40 0 1 0 50 10 Z',
    icon: '⭕'
  },
  {
    id: 'square',
    nameAr: 'مربع',
    svgPath: 'M15 15 L85 15 L85 85 L15 85 Z',
    icon: '⬛'
  },
  {
    id: 'triangle',
    nameAr: 'مثلث',
    svgPath: 'M50 12 L90 88 L10 88 Z',
    icon: '🔺'
  },
  {
    id: 'star',
    nameAr: 'نجمة',
    svgPath:
      'M50 10 L62 36 L90 38 L68 56 L75 84 L50 69 L25 84 L32 56 L10 38 L38 36 Z',
    icon: '⭐'
  },
  {
    id: 'diamond',
    nameAr: 'معين',
    svgPath: 'M50 10 L90 50 L50 90 L10 50 Z',
    icon: '🔶'
  },
  {
    id: 'hexagon',
    nameAr: 'مسدس',
    svgPath: 'M50 12 L85 30 L85 70 L50 88 L15 70 L15 30 Z',
    icon: '⬡'
  }
];

export const DONT_TAP_COLORS: DontTapColor[] = [
  {
    id: 'red',
    nameAr: 'أحمر',
    hex: '#EF4444',
    icon: '🔴'
  },
  {
    id: 'blue',
    nameAr: 'أزرق',
    hex: '#3B82F6',
    icon: '🔵'
  },
  {
    id: 'green',
    nameAr: 'أخضر',
    hex: '#10B981',
    icon: '🟢'
  },
  {
    id: 'yellow',
    nameAr: 'أصفر',
    hex: '#FACC15',
    icon: '🟡'
  },
  {
    id: 'orange',
    nameAr: 'برتقالي',
    hex: '#F97316',
    icon: '🟠'
  },
  {
    id: 'purple',
    nameAr: 'بنفسجي',
    hex: '#A855F7',
    icon: '🟣'
  }
];
