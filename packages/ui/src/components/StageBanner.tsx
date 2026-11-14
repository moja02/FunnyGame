import React from 'react';
import type { Tier } from '@funnygame/game-core';

export interface StageBannerProps {
  stage: number;
  tier: Tier;
  isBoss: boolean;
  message?: string;
}

const tierNamesAr: Record<Tier, string> = {
  warmup: 'إحماء وتجهيز',
  hard: 'المستوى الصعب',
  expert: 'مستوى المحترفين',
  legend: 'مستوى الأساطير',
  endless: 'تحدي اللانهاية'
};

export const StageBanner: React.FC<StageBannerProps> = ({ stage, tier, isBoss, message }) => {
  return (
    <div
      className={`w-full text-center py-2 px-4 rounded-2xl mb-3 border select-none transition-all ${
        isBoss
          ? 'bg-gradient-to-r from-red-950/80 via-amber-950/80 to-red-950/80 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
          : 'bg-purple-950/50 border-purple-500/30'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm font-black text-amber-400">
          {isBoss ? '👑 مواجهة الزعيم!' : `المرحلة ${stage}`}
        </span>
        <span className="text-xs text-slate-400 font-bold">• {tierNamesAr[tier]}</span>
      </div>
      {message && <p className="text-xs text-slate-300 mt-1">{message}</p>}
    </div>
  );
};
