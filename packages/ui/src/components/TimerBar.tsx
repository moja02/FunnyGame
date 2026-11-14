import React from 'react';

export interface TimerBarProps {
  remainingMs: number;
  totalMs: number;
}

export const TimerBar: React.FC<TimerBarProps> = ({ remainingMs, totalMs }) => {
  const percentage = totalMs > 0 ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;
  const isCritical = percentage < 25;

  return (
    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10 my-2 relative">
      <div
        className={`h-full transition-all duration-75 ease-linear rounded-full ${
          isCritical
            ? 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]'
            : percentage < 50
            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
            : 'bg-gradient-to-r from-teal-400 to-emerald-400'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
