'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DuelClientProps {
  gameId: string;
}

export default function DuelClient({ gameId }: DuelClientProps) {
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [round, setRound] = useState(1);

  const handleP1Score = () => {
    setP1Score((s) => s + 1);
    setRound((r) => r + 1);
  };

  const handleP2Score = () => {
    setP2Score((s) => s + 1);
    setRound((r) => r + 1);
  };

  return (
    <main className="w-full h-screen flex flex-col justify-between overflow-hidden bg-black select-none">
      {/* Player 2 Zone (Top - Inverted 180° for head-to-head faceoff) */}
      <div className="flex-1 rotate-180 flex flex-col justify-between p-4 bg-gradient-to-b from-cyan-950/40 to-slate-950 border-b border-cyan-500/20">
        <div className="flex justify-between items-center text-cyan-400 font-bold text-xs">
          <span>اللاعب 2 (الأزرق)</span>
          <span>النقاط: {p2Score} / 3</span>
        </div>
        <div className="flex items-center justify-center">
          <button
            onClick={handleP2Score}
            className="w-48 h-20 bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black text-2xl rounded-3xl shadow-lg active:scale-95 transition-transform"
          >
            اضغط! 🛑
          </button>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>تحكم اللاعب 2</span>
          <Link href="/" className="text-slate-400 hover:text-white underline">خروج ✖</Link>
        </div>
      </div>

      {/* Center Dividing Bar */}
      <div className="h-12 bg-slate-950 border-y border-white/20 flex items-center justify-between px-4 z-10 shrink-0">
        <div className="text-xs font-black text-rose-400">🔴 {p1Score}</div>
        <div className="text-xs font-bold text-slate-300">الجولة {round} • لعبة {gameId}</div>
        <div className="text-xs font-black text-cyan-400">🔵 {p2Score}</div>
      </div>

      {/* Player 1 Zone (Bottom - Upright) */}
      <div className="flex-1 flex flex-col justify-between p-4 bg-gradient-to-b from-slate-950 to-rose-950/40 border-t border-rose-500/20">
        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>تحكم اللاعب 1</span>
          <Link href="/" className="text-slate-400 hover:text-white underline">خروج ✖</Link>
        </div>
        <div className="flex items-center justify-center">
          <button
            onClick={handleP1Score}
            className="w-48 h-20 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-2xl rounded-3xl shadow-lg active:scale-95 transition-transform"
          >
            اضغط! 🛑
          </button>
        </div>
        <div className="flex justify-between items-center text-rose-400 font-bold text-xs">
          <span>اللاعب 1 (الأحمر)</span>
          <span>النقاط: {p1Score} / 3</span>
        </div>
      </div>
    </main>
  );
}
