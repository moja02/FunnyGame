import React from 'react';

export interface ComboMeterProps {
  combo: number;
}

export const ComboMeter: React.FC<ComboMeterProps> = ({ combo }) => {
  if (combo < 2) return null;

  const multiplier = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;

  return (
    <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-slate-900/90 rounded-full border border-amber-500/40 shadow-lg select-none">
      <span className="text-sm font-black text-amber-400">🔥 كومبو {combo}</span>
      {multiplier > 1 && (
        <span
          className={`text-xs font-black px-1.5 py-0.5 rounded-md text-slate-950 ${
            multiplier === 3 ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white animate-bounce' : 'bg-amber-400'
          }`}
        >
          {multiplier}x مضاعف
        </span>
      )}
    </div>
  );
};
