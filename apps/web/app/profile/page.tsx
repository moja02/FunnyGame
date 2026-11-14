'use client';

import { useState } from 'react';
import Link from 'next/link';

const avatars = ['⚡', '👑', '🎯', '🦁', '🤖', '🐱', '🦊', '🚀', '🔥', '💎', '🌟', '🏆'];

export default function ProfilePage() {
  const [nickname, setNickname] = useState('بطل التحدي');
  const [selectedAvatar, setSelectedAvatar] = useState('⚡');
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const userId = 'usr_7f8a9b2';

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-4 select-none pb-20">
      {/* Header */}
      <header className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
        <Link href="/" className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1">
          <span>◀</span>
          <span>الرئيسية</span>
        </Link>
        <h1 className="font-heading text-xl font-black text-amber-400">الملف الشخصي 👤</h1>
        <div className="w-12" />
      </header>

      {/* Main Identity Card */}
      <div className="p-5 bg-gradient-to-br from-purple-950/60 to-slate-950 border-2 border-amber-400/40 rounded-3xl text-center mb-4 shadow-xl relative">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 font-bold">
            انضم في: نوفمبر 2026
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
            🟢 سحابي
          </span>
        </div>

        {/* Avatar Display */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-4xl mb-3 shadow-[0_0_20px_rgba(254,202,87,0.3)]">
          {selectedAvatar}
        </div>

        {/* Nickname Editor */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={18}
            className="w-44 px-3 py-1.5 bg-black/40 border border-white/20 rounded-xl text-center font-bold text-white text-base outline-none focus:border-amber-400"
          />
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors"
          >
            {isSaved ? 'تم ✔' : 'حفظ'}
          </button>
        </div>

        {/* Player ID with Copy Button */}
        <div className="inline-flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-full text-xs text-slate-400">
          <span>المعرف: <strong className="text-slate-200">#{userId}</strong></span>
          <button onClick={handleCopyId} className="text-amber-400 font-bold hover:underline">
            {copied ? '✔ تم النسخ' : '📋 نسخ'}
          </button>
        </div>
      </div>

      {/* Avatar Palette Selector */}
      <div className="p-4 bg-slate-900/70 border border-white/10 rounded-2xl mb-4">
        <div className="text-xs font-bold text-amber-400 mb-2.5 flex justify-between">
          <span>اختر صورتك الرمزية (الأفاتار):</span>
          <span className="text-slate-400 font-normal">اضغط للتغيير الفوري</span>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {avatars.map((av) => (
            <button
              key={av}
              onClick={() => setSelectedAvatar(av)}
              className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-transform active:scale-90 ${
                selectedAvatar === av
                  ? 'bg-amber-400/30 border-2 border-amber-400 scale-105'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              {av}
            </button>
          ))}
        </div>
      </div>

      {/* Personal Stats Grid */}
      <div className="mb-4">
        <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1">
          <span>📊</span>
          <span>إحصائياتك الشخصية</span>
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-2xl text-center">
            <div className="text-xs text-rose-300 font-bold">المباريات الملعوبة</div>
            <div className="text-2xl font-black text-white mt-1 tabular-nums">0</div>
          </div>
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-center">
            <div className="text-xs text-emerald-300 font-bold">مرات الفوز</div>
            <div className="text-2xl font-black text-white mt-1 tabular-nums">0</div>
          </div>
          <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/30 rounded-2xl text-center">
            <div className="text-xs text-cyan-300 font-bold">درجة العقل (Mind Score)</div>
            <div className="text-2xl font-black text-white mt-1 tabular-nums">0 / 1000</div>
          </div>
          <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-2xl text-center">
            <div className="text-xs text-amber-300 font-bold">سلسلة الأيام (Streak)</div>
            <div className="text-2xl font-black text-white mt-1 tabular-nums">🔥 0 يوم</div>
          </div>
        </div>
      </div>

      {/* Cloud Account Sync Card */}
      <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-between">
        <div>
          <div className="text-sm font-black text-white">حفظ حسابك في السحابة</div>
          <div className="text-xs text-slate-400 mt-0.5">اربط بـ Google لحفظ مستواك ونقاطك</div>
        </div>
        <button className="px-3.5 py-2 bg-white text-slate-950 rounded-xl font-bold text-xs shadow hover:bg-slate-100 transition-colors">
          🌐 ربط Google
        </button>
      </div>
    </main>
  );
}
