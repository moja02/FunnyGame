'use client';

import React from 'react';
import type { ShapeData, ShapeColor, ShapeType } from './types.js';

export const SHAPE_COLORS: Record<ShapeColor, { fill: string; stroke: string }> = {
  emerald: { fill: '#10b981', stroke: '#34d399' },
  cyan: { fill: '#06b6d4', stroke: '#38bdf8' },
  amber: { fill: '#f59e0b', stroke: '#fbbf24' },
  rose: { fill: '#f43f5e', stroke: '#fb7185' },
  violet: { fill: '#8b5cf6', stroke: '#a78bfa' },
  indigo: { fill: '#6366f1', stroke: '#818cf8' }
};

export const ALL_SHAPE_TYPES: ShapeType[] = [
  'circle',
  'triangle',
  'square',
  'pentagon',
  'hexagon',
  'star',
  'diamond'
];

export const ALL_SHAPE_COLORS: ShapeColor[] = [
  'emerald',
  'cyan',
  'amber',
  'rose',
  'violet',
  'indigo'
];

export function areShapesEqual(a: ShapeData, b: ShapeData): boolean {
  return (
    a.shape === b.shape &&
    a.color === b.color &&
    (a.rotationDeg % 360) === (b.rotationDeg % 360) &&
    (a.dots || 0) === (b.dots || 0)
  );
}

export const ShapeRenderer: React.FC<{
  data: ShapeData;
  size?: number;
  className?: string;
}> = ({ data, size = 40, className = '' }) => {
  const { shape, color, rotationDeg, dots } = data;
  const col = SHAPE_COLORS[color] || SHAPE_COLORS.emerald;

  const renderShapePath = () => {
    switch (shape) {
      case 'circle':
        return <circle cx="24" cy="24" r="16" fill={col.fill} stroke={col.stroke} strokeWidth="2.5" />;
      case 'triangle':
        return (
          <polygon
            points="24,7 41,37 7,37"
            fill={col.fill}
            stroke={col.stroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        );
      case 'square':
        return (
          <rect
            x="9"
            y="9"
            width="30"
            height="30"
            rx="4"
            fill={col.fill}
            stroke={col.stroke}
            strokeWidth="2.5"
          />
        );
      case 'diamond':
        return (
          <polygon
            points="24,7 41,24 24,41 7,24"
            fill={col.fill}
            stroke={col.stroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        );
      case 'pentagon':
        return (
          <polygon
            points="24,7 40,19 34,38 14,38 8,19"
            fill={col.fill}
            stroke={col.stroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        );
      case 'hexagon':
        return (
          <polygon
            points="24,7 39,15 39,33 24,41 9,33 9,15"
            fill={col.fill}
            stroke={col.stroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        );
      case 'star':
        return (
          <polygon
            points="24,6 29,17 41,18 32,27 35,39 24,33 13,39 16,27 7,18 19,17"
            fill={col.fill}
            stroke={col.stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        );
      default:
        return <circle cx="24" cy="24" r="16" fill={col.fill} stroke={col.stroke} strokeWidth="2.5" />;
    }
  };

  const renderDots = () => {
    if (!dots || dots <= 0) return null;
    const dotFill = '#ffffff';

    if (dots === 1) {
      return <circle cx="24" cy="24" r="3" fill={dotFill} />;
    }
    if (dots === 2) {
      return (
        <>
          <circle cx="20" cy="24" r="2.5" fill={dotFill} />
          <circle cx="28" cy="24" r="2.5" fill={dotFill} />
        </>
      );
    }
    return (
      <>
        <circle cx="24" cy="19" r="2.2" fill={dotFill} />
        <circle cx="19" cy="28" r="2.2" fill={dotFill} />
        <circle cx="29" cy="28" r="2.2" fill={dotFill} />
      </>
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={`inline-block select-none overflow-visible ${className}`}
      style={{
        transform: `rotate(${rotationDeg}deg)`,
        transformOrigin: 'center center',
        transition: 'transform 0.2s ease-out'
      }}
    >
      {renderShapePath()}
      {renderDots()}
    </svg>
  );
};
