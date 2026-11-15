'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '@/lib/auth-context';

const avatars = ['⚡', '👑', '🎯', '🦁', '🤖', '🐱', '🦊', '🚀', '🔥', '💎', '🌟', '🏆'];

export default function ProfilePage() {
  const { user, profile, signInWithGoogle, signOut, updateProfile } = useAuth();

  const [nickname, setNickname] = useState(profile.nickname);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Sync inputs with profile when profile changes
  useEffect(() => {
    setNickname(profile.nickname);
    setSelectedAvatar(profile.avatar);
  }, [profile.nickname, profile.avatar]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateProfile(nickname, selectedAvatar);
    setIsSaving(false);
    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthNotice(null);
    const { error } = await signInWithGoogle();
    setIsSigningIn(false);

    if (error) {
      console.warn('Google sign-in attempt notice:', error.message);
      // Friendly Libyan explanation for user
      if (error.message.includes('not enabled') || error.message.includes('provider')) {
        setAuthNotice('مزوّد قوقل يحتاج تفعيل في لوحة Supabase (Authentication -> Providers -> Google).');
      } else {
        setAuthNotice(`تعذر الاتصال بـ Google: ${error.message}`);
      }
    }
  };

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(profile.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-4 select-none pb-24 max-w-[480px] w-full mx-auto">
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
        <div className="flex justify-between items-center text-xs mb-3">
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10 font-bold">
            انضم في: نوفمبر 2026
          </span>

          {profile.isGuest ? (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-black">
              👤 وضع الزائر
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black flex items-center gap-1">
              <span>🟢</span>
              <span>سحابي موثق</span>
            </span>
          )}
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
            placeholder="اسمك في اللعبة"
            className="w-44 px-3 py-1.5 bg-black/40 border border-white/20 rounded-xl text-center font-bold text-white text-base outline-none focus:border-amber-400"
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors disabled:opacity-50"
          >
            {isSaved ? 'تم ✔' : isSaving ? '...' : 'حفظ'}
          </button>
        </div>

        {/* Player ID / Email */}
        <div className="flex flex-col items-center gap-1">
          {user?.email && (
            <span className="text-[11px] font-bold text-slate-300 dir-ltr">{user.email}</span>
          )}
          <div className="inline-flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-full text-xs text-slate-400">
            <span>
              المعرف: <strong className="text-slate-200">#{profile.id.substring(0, 10)}</strong>
            </span>
            <button onClick={handleCopyId} className="text-amber-400 font-bold hover:underline">
              {copied ? '✔ تم' : '📋 نسخ'}
            </button>
          </div>
        </div>
      </div>

      {/* Cloud Account Sync Card / Sign Out */}
      {profile.isGuest ? (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-950/20 to-slate-900 border-2 border-amber-400/40 rounded-2xl mb-4 shadow-lg">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="text-sm font-black text-white flex items-center gap-1.5">
                <span>🌐</span>
                <span>سجل بحساب Google لتدخل لوحة الصدارة</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                أنت الآن كـ <strong>زائر</strong>؛ نتيجتك تُحفظ على جهازك فقط. اربط حسابك لتوثيق أرقامك القياسية والمنافسة في الدوري الأسبوعي!
              </p>
            </div>
          </div>

          {authNotice && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold mb-3 leading-relaxed">
              ⚠️ {authNotice}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-950 rounded-xl font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
          >
            <span>🌐</span>
            <span>{isSigningIn ? 'جاري الاتصال بـ Google...' : 'تسجيل الدخول عبر Google'}</span>
          </button>
        </div>
      ) : (
        <div className="p-4 bg-slate-900/80 border border-emerald-500/30 rounded-2xl flex items-center justify-between mb-4 shadow">
          <div>
            <div className="text-xs text-emerald-400 font-bold">حسابك مسجل وسحابي 🟢</div>
            <div className="text-sm font-black text-white mt-0.5">أرقامك تدخل لوحة الصدارة تلقائياً</div>
          </div>
          <button
            onClick={signOut}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 text-slate-300 font-bold text-xs transition-colors"
          >
            🚪 تسجيل خروج
          </button>
        </div>
      )}

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
            <div className="text-xs text-rose-300 font-bold">حالة الصدارة</div>
            <div className="text-base font-black text-white mt-1">
              {profile.isGuest ? 'غير مصنف (زائر)' : 'مؤهل للمنافسة 🏆'}
            </div>
          </div>
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-center">
            <div className="text-xs text-emerald-300 font-bold">الألعاب الملعوبة</div>
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

      {/* Bottom Sticky Navigation Bar */}
      <BottomNav />
    </main>
  );
}
