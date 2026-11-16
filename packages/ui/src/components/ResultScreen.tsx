import React from 'react';

export interface ResultScreenProps {
  score: number;
  stageReached: number;
  personalBestScore?: number;
  taunt: string;
  gameTitle: string;
  shareUrl?: string;
  onPlayAgain: () => void;
  onGoHome: () => void;
  onViewLeaderboard?: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  score,
  stageReached,
  personalBestScore,
  taunt,
  gameTitle,
  shareUrl,
  onPlayAgain,
  onGoHome,
  onViewLeaderboard
}) => {
  const isNewBest = personalBestScore !== undefined && score > personalBestScore;

  const handleShare = () => {
    let targetUrl = shareUrl;
    if (!targetUrl && typeof window !== 'undefined') {
      targetUrl = window.location.href;
    }
    if (!targetUrl) {
      targetUrl = 'https://moja02.github.io/FunnyGame/';
    }

    const shareText = `جبت ${score.toLocaleString('en-US')} نقطة في لعبة "${gameTitle}" في FunnyGame ⚡ ووصلت للمرحلة ${stageReached}! تقدر تفوتني ولا عقلك طافي؟ 🧠🔥\n\nتحداني والعب من هنا:\n${targetUrl}`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator.share({
        title: `نتيجتي في لعبة ${gameTitle}: ${score} نقطة`,
        text: shareText,
        url: targetUrl
      }).catch((err) => {
        if (err && err.name === 'AbortError') return;
        // Fallback to WhatsApp
        if (typeof window !== 'undefined') {
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        }
      });
    } else if (typeof window !== 'undefined') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-slate-950/95 border border-white/10 rounded-3xl text-center select-none shadow-2xl backdrop-blur">
      {/* Header Badge */}
      <div className="inline-block px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs font-black text-amber-400 mb-4">
        {isNewBest ? '🎉 رقم قياسي جديد شخصي!' : 'انتهت الجولة 🏁'}
      </div>

      {/* Main Score Display */}
      <div className="mb-4">
        <div className="text-xs font-bold text-slate-400 mb-1">مجموع النقاط المحققة</div>
        <div className="font-mono text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 tabular-nums">
          {score.toLocaleString('en-US')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 bg-purple-950/30 border border-purple-500/20 rounded-2xl">
          <div className="text-xs text-purple-300 font-bold">المرحلة التي وصلتها</div>
          <div className="text-2xl font-black text-white mt-1">المرحلة {stageReached}</div>
        </div>
        <div className="p-3 bg-teal-950/30 border border-teal-500/20 rounded-2xl">
          <div className="text-xs text-teal-300 font-bold">أفضل رقم سابق</div>
          <div className="text-2xl font-black text-white mt-1 tabular-nums">
            {(personalBestScore ?? score).toLocaleString('en-US')}
          </div>
        </div>
      </div>

      {/* Libyan Dialect Taunt Quote */}
      <div className="p-4 bg-slate-900 border border-amber-500/20 rounded-2xl mb-6 relative">
        <span className="text-2xl absolute -top-3 right-4">💬</span>
        <p className="text-sm font-bold text-amber-200/90 leading-relaxed pt-1">
          &ldquo;{taunt.replace(/\{stage\}/g, stageReached.toString()).replace(/\{score\}/g, score.toLocaleString('en-US'))}&rdquo;
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {/* Play Again (Primary CTA) */}
        <button
          onClick={onPlayAgain}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-lg shadow-[0_5px_0_#c2410c] active:translate-y-1 active:shadow-[0_2px_0_#c2410c] transition-all flex items-center justify-center gap-2"
        >
          <span>🔥</span>
          <span>مرة زيادة بس</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-[0_4px_0_#065f46] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
        >
          <span>📲</span>
          <span>تحدّى أصحابك على واتساب</span>
        </button>

        {/* Leaderboard Button */}
        {onViewLeaderboard && (
          <button
            onClick={onViewLeaderboard}
            className="w-full h-11 rounded-2xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>🏆</span>
            <span>لوحة صدارة اللعبة</span>
          </button>
        )}

        {/* Home Button */}
        <button
          onClick={onGoHome}
          className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-xs transition-colors"
        >
          العودة للرئيسية ◀
        </button>
      </div>
    </div>
  );
};
