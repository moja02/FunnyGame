import Link from 'next/link';

interface GameCategory {
  id: string;
  name: string;
  ability: string;
  icon: string;
  color: string;
  description: string;
  gamesCount: number;
}

const categories: GameCategory[] = [
  {
    id: 'speed',
    name: 'السرعة والتركيز',
    ability: 'speed',
    icon: '⚡',
    color: 'from-rose-500/20 to-red-600/30 border-red-500/40 text-rose-400',
    description: 'ردود فعل خاطفة واختبار الانتباه تحت الضغط',
    gamesCount: 4,
  },
  {
    id: 'math',
    name: 'الحساب والبديهة',
    ability: 'math',
    icon: '🧮',
    color: 'from-amber-500/20 to-yellow-600/30 border-yellow-500/40 text-amber-300',
    description: 'عمليات رياضية ومعادلات سريعة مع فخاخ ذكية',
    gamesCount: 4,
  },
  {
    id: 'memory',
    name: 'الذاكرة والاستدعاء',
    ability: 'memory',
    icon: '🧠',
    color: 'from-purple-500/20 to-indigo-600/30 border-purple-500/40 text-purple-300',
    description: 'تذكر الأنماط، المواقع، والتسلسلات المعقدة',
    gamesCount: 4,
  },
  {
    id: 'logic',
    name: 'الذكاء والمنطق',
    ability: 'logic',
    icon: '🧩',
    color: 'from-teal-500/20 to-emerald-600/30 border-emerald-500/40 text-teal-300',
    description: 'ألغاز استنتاجية وسرعة معالجة للمعلومات المتناقضة',
    gamesCount: 4,
  },
];

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col p-4 select-none pb-20">
      {/* Top Bar */}
      <header className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <h1 className="font-heading text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-400">
            FunnyGame
          </h1>
        </div>

        <Link
          href="/profile"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/15 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors"
        >
          <span>👤</span>
          <span>الملف الشخصي</span>
        </Link>
      </header>

      {/* Hero Mind Score & Daily Challenge Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        {/* Daily Challenge Card */}
        <Link
          href="/daily"
          className="p-4 bg-gradient-to-br from-amber-500/15 via-orange-600/10 to-red-600/20 border-2 border-amber-400/50 rounded-2xl flex items-center justify-between shadow-lg hover:scale-[1.01] transition-transform"
        >
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                تحدي اليوم 🎯
              </span>
              <span className="text-xs text-amber-300 font-bold">محاولة واحدة</span>
            </div>
            <h3 className="text-base font-black text-white">تحدّ أبطال ليبيا اليوم</h3>
            <p className="text-xs text-slate-300 mt-0.5">نفس الأسئلة للجميع، من الأسرع؟</p>
          </div>
          <div className="text-4xl pr-2">🏆</div>
        </Link>

        {/* Weekly League Card */}
        <Link
          href="/league"
          className="p-4 bg-gradient-to-br from-purple-500/15 via-indigo-600/10 to-purple-900/30 border-2 border-purple-400/40 rounded-2xl flex items-center justify-between shadow-lg hover:scale-[1.01] transition-transform"
        >
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-500 text-white">
                الدوري الأسبوعي ⚔️
              </span>
              <span className="text-xs text-purple-200 font-bold">مجموعات 30 لاعب</span>
            </div>
            <h3 className="text-base font-black text-white">صعود أول 10 وهبوط 5</h3>
            <p className="text-xs text-slate-300 mt-0.5">يغلق الجمعة 23:59 بتوقيت طرابلس</p>
          </div>
          <div className="text-4xl pr-2">🥇</div>
        </Link>
      </div>

      {/* Abilities Section */}
      <div className="mb-4">
        <h2 className="text-base font-black text-slate-200 mb-2 flex items-center gap-2">
          <span>🧠</span>
          <span>القدرات العقلية الأربع (16 لعبة)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`p-4 rounded-2xl bg-gradient-to-br border ${cat.color} backdrop-blur shadow-md flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-white">
                    {cat.gamesCount} ألعاب
                  </span>
                </div>
                <h3 className="text-base font-black text-white mb-1">{cat.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{cat.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold">
                <span className="text-amber-300/80">تدرّج من 1 لـ 70+</span>
                {cat.id === 'speed' ? (
                  <Link href="/play/color-trap" className="px-2 py-1 rounded bg-rose-500 text-white text-[11px] hover:bg-rose-600 transition-colors">
                    ألوان خادعة ⚡
                  </Link>
                ) : (
                  <span className="text-slate-400">قيد التركيب ⏳</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Sticky Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] lg:max-w-6xl mx-auto bg-slate-950/90 backdrop-blur border-t border-white/10 px-4 py-2.5 flex items-center justify-around z-50">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-amber-400 text-xs font-bold">
          <span className="text-lg">🎮</span>
          <span>الرئيسية</span>
        </Link>
        <Link href="/daily" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-white text-xs font-bold">
          <span className="text-lg">🎯</span>
          <span>اليومي</span>
        </Link>
        <Link href="/league" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-white text-xs font-bold">
          <span className="text-lg">🏆</span>
          <span>الدوري</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-white text-xs font-bold">
          <span className="text-lg">👤</span>
          <span>حسابي</span>
        </Link>
      </nav>
    </main>
  );
}
