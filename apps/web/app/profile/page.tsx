'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '@/lib/auth-context';

const avatars = ['⚡', '👑', '🎯', '🦁', '🤖', '🐱', '🦊', '🚀', '🔥', '💎', '🌟', '🏆'];

export default function ProfilePage() {
  const {
    user,
    profile,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    updateProfile,
  } = useAuth();

  const [nickname, setNickname] = useState(profile.nickname);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Auth form state
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [emailTab, setEmailTab] = useState<'register' | 'login'>('register');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Sync inputs with profile when profile changes
  useEffect(() => {
    setNickname(profile.nickname);
    setSelectedAvatar(profile.avatar);
  }, [profile.nickname, profile.avatar]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveNotice(null);
    const res = await updateProfile(nickname, selectedAvatar);
    setIsSaving(false);
    if (res.success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } else if (res.error) {
      setSaveNotice(res.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmittingAuth(true);
    setAuthNotice(null);
    setAuthSuccess(null);
    const { error } = await signInWithGoogle();
    setIsSubmittingAuth(false);

    if (error) {
      console.warn('Google sign-in attempt notice:', error.message);
      if (error.message.includes('missing OAuth secret') || error.message.includes('validation_failed')) {
        setAuthNotice(
          'مزوّد Google مفعل في Supabase لكن يحتاج Client ID و Client Secret من Google Cloud Console. يمكنك حالياً استخدام تسجيل البريد وكلمة المرور بالأسفل فوراً!'
        );
      } else if (error.message.includes('not enabled') || error.message.includes('provider')) {
        setAuthNotice('مزوّد قوقل يحتاج تفعيل في لوحة Supabase (Authentication -> Providers -> Google).');
      } else {
        setAuthNotice(`تعذر الاتصال بـ Google: ${error.message}`);
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setAuthNotice('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (passwordInput.length < 6) {
      setAuthNotice('كلمة المرور يجب أن لا تقل عن 6 أحرف');
      return;
    }

    setIsSubmittingAuth(true);
    setAuthNotice(null);
    setAuthSuccess(null);

    if (emailTab === 'register') {
      const res = await signUpWithPassword(emailInput, passwordInput, nickname);
      setIsSubmittingAuth(false);
      if (res.error) {
        setAuthNotice(res.error.message);
      } else if (res.needsEmailConfirmation) {
        setAuthSuccess(
          'تم إرسال رابط تأكيد إلى بريدك الإلكتروني! (ملاحظة: يمكنك تعطيل Confirm email في Supabase لجعل الدخول فورياً دون انتظار الإيميل).'
        );
      } else {
        setAuthSuccess('أهلاً بك! تم إنشاء حسابك بنجاح وتم ربطه باللوحة 🟢');
      }
    } else {
      const res = await signInWithPassword(emailInput, passwordInput);
      setIsSubmittingAuth(false);
      if (res.error) {
        setAuthNotice(res.error.message);
      } else {
        setAuthSuccess('أهلاً بعودتك! تم تسجيل الدخول بنجاح 🟢');
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
            نوفمبر 2026
          </span>

          {profile.isGuest ? (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-black">
              👤 وضع الزائر (غير مسجل)
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
        <div className="flex flex-col items-center justify-center gap-1.5 mb-2">
          <div className="flex items-center justify-center gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setSaveNotice(null);
              }}
              maxLength={16}
              placeholder="اسمك المميز في اللعبة"
              className="w-48 px-3 py-1.5 bg-black/40 border border-white/20 rounded-xl text-center font-bold text-white text-base outline-none focus:border-amber-400"
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors disabled:opacity-50"
            >
              {isSaved ? 'تم ✔' : isSaving ? '...' : 'حفظ'}
            </button>
          </div>

          {saveNotice && (
            <div className="text-[11px] font-bold text-rose-300 px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 rounded-lg">
              ⚠️ {saveNotice}
            </div>
          )}

          {nickname.startsWith('guest-') && (
            <div className="text-[10px] text-amber-300 font-bold px-2 py-0.5 bg-amber-400/10 rounded-lg border border-amber-400/20">
              💡 اسمك الحالي افتراضي، اكتب اسماً مميزاً واضغط حفظ ليظهر في الصدارة!
            </div>
          )}
        </div>

        {/* Player ID / Email */}
        <div className="flex flex-col items-center gap-1 mt-1">
          {user?.email && (
            <span className="text-[11px] font-bold text-emerald-300 dir-ltr bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
              {user.email}
            </span>
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
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-950/20 to-slate-900 border-2 border-amber-400/40 rounded-3xl mb-4 shadow-lg">
          <div className="mb-3">
            <div className="text-sm font-black text-white flex items-center gap-1.5">
              <span>🏆</span>
              <span>سجّل حسابك لتدخل لوحة الصدارة الرسمية</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              أنت الآن تلعب في <strong>وضع الزائر</strong>؛ نتيجتك على جهازك فقط. اربط حسابك لتسجيل أرقامك القياسية والمنافسة مع الأبطال!
            </p>
          </div>

          {/* Feedback Messages */}
          {authNotice && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold mb-3 leading-relaxed">
              ⚠️ {authNotice}
            </div>
          )}
          {authSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold mb-3 leading-relaxed">
              ✅ {authSuccess}
            </div>
          )}

          {/* Registration Method Switcher */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 mb-3">
            <button
              onClick={() => {
                setAuthMethod('google');
                setAuthNotice(null);
              }}
              className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                authMethod === 'google'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌐 Google (ضغطة واحدة)
            </button>
            <button
              onClick={() => {
                setAuthMethod('email');
                setAuthNotice(null);
              }}
              className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                authMethod === 'email'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ✉️ البريد الإلكتروني
            </button>
          </div>

          {/* Google Flow */}
          {authMethod === 'google' && (
            <button
              onClick={handleGoogleSignIn}
              disabled={isSubmittingAuth}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-950 rounded-xl font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
            >
              <span>🌐</span>
              <span>{isSubmittingAuth ? 'جاري الاتصال بـ Google...' : 'تسجيل الدخول عبر Google'}</span>
            </button>
          )}

          {/* Email / Password Flow */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-2.5">
              <div className="flex gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => setEmailTab('register')}
                  className={`text-xs font-bold pb-1 border-b-2 transition-all ${
                    emailTab === 'register'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  تسجيل حساب جديد
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTab('login')}
                  className={`text-xs font-bold pb-1 border-b-2 transition-all ${
                    emailTab === 'login'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  تسجيل الدخول
                </button>
              </div>

              <input
                type="email"
                required
                placeholder="البريد الإلكتروني (مثال: name@gmail.com)"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-xs text-white outline-none focus:border-amber-400 dir-ltr text-right"
              />

              <input
                type="password"
                required
                minLength={6}
                placeholder="كلمة المرور (6 أحرف على الأقل)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-xs text-white outline-none focus:border-amber-400 dir-ltr text-right"
              />

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl shadow active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmittingAuth
                  ? 'جاري المعالجة... ⏳'
                  : emailTab === 'register'
                  ? 'إنشاء الحساب وتفعيل الصدارة 🚀'
                  : 'تسجيل الدخول 🔑'}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="p-4 bg-slate-900/80 border border-emerald-500/30 rounded-2xl flex items-center justify-between mb-4 shadow">
          <div>
            <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
              <span>🟢</span>
              <span>حسابك مسجل وسحابي موثق</span>
            </div>
            <div className="text-xs text-slate-300 mt-0.5">اسمك في اللعبة: <strong className="text-white">{profile.nickname}</strong></div>
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
