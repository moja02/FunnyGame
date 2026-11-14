'use client';

import { useState } from 'react';
import Link from 'next/link';

interface LeaderboardPageProps {
  params: {
    gameId: string;
  };
}

export default function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { gameId } = params;
  const [tab, setTab] = useState<'global' | 'city' | 'friends'>('global');

  return (
    <main className="flex-1 flex flex-col p-4 select-none pb-20">
      {/* Header */}
      <header className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
        <Link href="/" className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1">
          <span>◀</span>
          <span>الرئيسية</span>
        </Link>
        <h1 className="font-heading text-xl font-black text-amber-400">لوحة الصدارة 🏆</h1>
        <div className="w-12" />
      </header>

      {/* Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/10 mb-4">
        <button
          onClick={() => setTab('global')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            tab === 'global' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🌍 الكل (عالمي)
        </button>
        <button
          onClick={() => setTab('city')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            tab === 'city' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          🏙️ مدينتك
        </button>
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            tab === 'friends' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          👥 الأصدقاء
        </button>
      </div>

      {/* Leaderboard Table Card */}
      <div className="p-4 bg-slate-900/80 border border-white/10 rounded-2xl flex-1 flex flex-col">
        <div className="flex justify-between items-center text-xs text-slate-400 font-bold border-b border-white/10 pb-2 mb-3">
          <span>الترتيب واللاعب</span>
          <span>أفضل نتيجة</span>
        </div>

        <div className="flex-1 flex items-center justify-center text-center py-12 text-xs text-slate-400">
          تظهر النتائج هنا بمجرد بدء تسجيل الجولات الرسمية في لعبة {gameId}!
        </div>
      </div>
    </main>
  );
}
