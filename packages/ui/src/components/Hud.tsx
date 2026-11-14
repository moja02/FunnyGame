import React from 'react';

export interface HudProps {
  hearts: number;
  maxHearts?: number;
  stage: number;
  score: number;
  isBoss?: boolean;
}

export const Hud: React.FC<HudProps> = ({
  hearts,
  maxHearts = 3,
  stage,
  score,
  isBoss = false
}) => {
  return (
    <header className="w-full flex items-center justify-between px-4 py-2 bg-slate-950/80 backdrop-blur border-b border-white/10 select-none">
      {/* Hearts */}
      <div className="flex items-center gap-1 text-xl" aria-label={`القلوب: ${hearts} من ${maxHearts}`}>
        {Array.from({ length: maxHearts }).map((_, idx) => (
          <span
            key={idx}
            className={`transition-transform duration-200 ${idx < hearts ? 'scale-100 text-red-500' : 'scale-90 opacity-25 grayscale'}`}
          >
            ❤️
          </span>
        ))}
      </div>

      {/* Stage Badge */}
      <div className="flex items-center gap-2">
        <span
          className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
            isBoss
              ? 'bg-amber-500/20 text-amber-300 border-amber-400 animate-pulse'
              : 'bg-purple-900/30 text-purple-200 border-purple-500/30'
          }`}
        >
          {isBoss ? '👑 مرحلة الزعيم' : `المرحلة ${stage}`}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-center gap-1.5 font-black text-amber-400">
        <span className="text-xs text-slate-400 font-bold">النقاط:</span>
        <span className="font-mono text-lg tracking-wider tabular-nums">{score.toLocaleString('en-US')}</span>
      </div>
    </header>
  );
};
