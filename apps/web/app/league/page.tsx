import Link from 'next/link';

export default function LeaguePage() {
  return (
    <main className="flex-1 flex flex-col p-4 select-none pb-20">
      {/* Header */}
      <header className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
        <Link href="/" className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1">
          <span>◀</span>
          <span>الرئيسية</span>
        </Link>
        <h1 className="font-heading text-xl font-black text-amber-400">الدوري الأسبوعي ⚔️</h1>
        <div className="w-12" />
      </header>

      {/* League Banner */}
      <div className="p-5 bg-gradient-to-br from-purple-900/40 via-indigo-950/40 to-slate-950 border-2 border-purple-500/50 rounded-3xl mb-5 shadow-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-xs font-black">
            دوري البرونز (المجموعة #1)
          </span>
          <span className="text-xs text-slate-400 font-bold">
            الإغلاق: الجمعة 23:59
          </span>
        </div>

        <h2 className="text-xl font-black text-white mt-2">منافسة الأسبوع بين 30 لاعباً</h2>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          أعلى 10 لاعبين يصعدون للدوري الأعلى (الفضة)، وآخر 5 يهبطون. اجمع النقاط عبر لعب الألعاب والتحدي اليومي!
        </p>

        {/* Promotion / Demotion Rules */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-1 text-emerald-400 font-bold">
            <span>🟢</span>
            <span>المراتب 1 - 10: صعود مباشر</span>
          </div>
          <div className="flex items-center gap-1 text-rose-400 font-bold">
            <span>🔴</span>
            <span>المراتب 26 - 30: هبوط</span>
          </div>
        </div>
      </div>

      {/* Cohort 30 Standings Placeholder */}
      <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl">
        <h3 className="text-sm font-black text-slate-200 mb-3 flex items-center gap-1.5">
          <span>📊</span>
          <span>ترتيب مجموعتك هذا الأسبوع</span>
        </h3>
        <div className="text-center py-8 text-xs text-slate-400">
          يبدأ أول موسم للدوري مع إطلاق أول الألعاب التنافسية!
        </div>
      </div>
    </main>
  );
}
