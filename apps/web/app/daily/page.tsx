import Link from 'next/link';

export default function DailyChallengePage() {
  return (
    <main className="flex-1 flex flex-col p-4 select-none pb-20">
      {/* Header */}
      <header className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
        <Link href="/" className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1">
          <span>◀</span>
          <span>الرئيسية</span>
        </Link>
        <h1 className="font-heading text-xl font-black text-amber-400">التحدي اليومي 🎯</h1>
        <div className="w-12" />
      </header>

      {/* Hero Daily Banner */}
      <div className="p-6 bg-gradient-to-br from-amber-500/20 via-orange-950/40 to-slate-950 border-2 border-amber-400 rounded-3xl text-center mb-5 shadow-2xl relative overflow-hidden">
        <div className="inline-block px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-xs font-black mb-3">
          تحدي اليوم الموحّد ⚔️
        </div>

        <h2 className="text-2xl font-black text-white mb-2">لعبة اليوم قيد التحضير</h2>
        <p className="text-xs text-amber-200/90 max-w-xs mx-auto leading-relaxed mb-4">
          نفس الأسئلة ونفس الترتيب لكل لاعبي ليبيا اليوم. عندك محاولة واحدة فقط، والتعادل يحسمه الأسرع بالمللي ثانية!
        </p>

        {/* Rules Badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          <span className="px-3 py-1 bg-black/40 border border-white/15 rounded-xl text-xs text-slate-200 font-bold">
            🔥 سلسلة الأيام: +5% يومياً
          </span>
          <span className="px-3 py-1 bg-black/40 border border-white/15 rounded-xl text-xs text-slate-200 font-bold">
            🏆 مكافأة الدوري: 100 نقطة للأول
          </span>
        </div>

        <button
          disabled
          className="w-full h-14 bg-amber-400/50 text-slate-950/60 font-black rounded-2xl text-base cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span>⏳</span>
          <span>في انتظار تركيب مواصفات الألعاب</span>
        </button>
      </div>

      {/* Leaderboard Preview */}
      <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl">
        <h3 className="text-sm font-black text-slate-200 mb-3 flex items-center gap-1.5">
          <span>🥇</span>
          <span>صدارة تحدي اليوم</span>
        </h3>
        <div className="text-center py-6 text-xs text-slate-400">
          يبدأ التحدي فور تركيب أول ألعاب المنظومة!
        </div>
      </div>
    </main>
  );
}
