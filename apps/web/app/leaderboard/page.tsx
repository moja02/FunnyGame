'use client';

import Link from 'next/link';
import { BottomNav } from '../components/BottomNav';

const readyGames = [
  {
    id: 'dont-tap',
    title: 'لا تضغط!',
    ability: 'السرعة والتركيز ⚡',
    icon: '🛑',
    description: 'أشكال تتساقط عبر 3 مسارات. اضغط على المطلوب بس، وسيّب الباقي ينزل!',
    color: 'from-red-500/20 to-rose-700/30 border-red-500/50 text-red-300'
  },
  {
    id: 'odd-one-out',
    title: 'الشاذ الغريب',
    ability: 'السرعة والتركيز ⚡',
    icon: '👁️',
    description: 'اكتشف الرمز الوحيد المختلف في الشكل أو اللون أو الزاوية!',
    color: 'from-amber-500/20 to-orange-600/30 border-amber-400/50 text-amber-300'
  },
  {
    id: 'color-trap',
    title: 'ألوان خادعة',
    ability: 'السرعة والتركيز ⚡',
    icon: '🎨',
    description: 'اكبح ردة فعلك التلقائية واضغط الزر حسب المطلوب!',
    color: 'from-rose-500/20 to-red-600/30 border-red-500/40 text-rose-300'
  }
];

export default function LeaderboardIndexPage() {
  return (
    <main className="flex-1 flex flex-col p-4 select-none pb-24 max-w-[480px] w-full mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
        <Link href="/" className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1">
          <span>◀</span>
          <span>الرئيسية</span>
        </Link>
        <h1 className="font-heading text-xl font-black text-amber-400 flex items-center gap-1.5">
          <span>🏆</span>
          <span>لوحات الصدارة</span>
        </h1>
        <div className="w-12" />
      </header>

      {/* Intro Banner */}
      <div className="p-4 bg-gradient-to-br from-amber-500/15 via-orange-600/10 to-purple-900/20 border border-amber-400/40 rounded-3xl mb-5 shadow-lg text-center">
        <span className="text-3xl mb-1 block">🥇</span>
        <h2 className="text-base font-black text-white">ترتيب أبطال ليبيا</h2>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          اختر اللعبة لمشاهدة الترتيب العام، وترتيب مدينتك، ومنافسة الأصدقاء.
        </p>
      </div>

      {/* Ready Games List */}
      <div className="flex flex-col gap-3">
        {readyGames.map((game) => (
          <Link
            key={game.id}
            href={`/leaderboard/${game.id}`}
            className={`p-4 rounded-2xl bg-gradient-to-br border ${game.color} backdrop-blur shadow-md flex items-center justify-between hover:scale-[1.01] active:scale-95 transition-all`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl">
                {game.icon}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="text-base font-black text-white">{game.title}</h3>
                  <span className="px-2 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                    صدارة حية ⚡
                  </span>
                </div>
                <p className="text-xs text-slate-300">{game.ability}</p>
              </div>
            </div>
            <div className="text-amber-400 text-sm font-black pr-2">◀</div>
          </Link>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
