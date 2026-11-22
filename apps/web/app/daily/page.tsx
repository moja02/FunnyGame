'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '@/lib/auth-context';

interface DailyGameInfo {
  id: string;
  title: string;
  ability: string;
  icon: string;
  gradient: string;
  borderColor: string;
  accentBg: string;
  description: string;
}

const AVAILABLE_DAILY_GAMES: DailyGameInfo[] = [
  {
    id: 'color-trap',
    title: 'ألوان خادعة',
    ability: 'السرعة والتركيز ⚡',
    icon: '🎨',
    gradient: 'from-rose-500/20 via-orange-950/40 to-slate-950',
    borderColor: 'border-rose-400',
    accentBg: 'bg-rose-500',
    description: 'اكبح ردة فعلك التلقائية واقرأ المطلوب بسرعة وتفادَ فخاخ الألوان!'
  },
  {
    id: 'calc-pressure',
    title: 'حاسبة تحت الضغط',
    ability: 'الحساب والبديهة 🧮',
    icon: '🧮',
    gradient: 'from-amber-500/20 via-yellow-950/40 to-slate-950',
    borderColor: 'border-amber-400',
    accentBg: 'bg-amber-400',
    description: 'عمليات رياضية متتالية وسريعة تتحدى سرعة بديهتك ودقتك الذهنية!'
  },
  {
    id: 'smart-trap',
    title: 'الفخ الذكي',
    ability: 'الذكاء والمنطق 🧩',
    icon: '🪤',
    gradient: 'from-teal-500/20 via-emerald-950/40 to-slate-950',
    borderColor: 'border-teal-400',
    accentBg: 'bg-teal-400',
    description: 'ألغاز استنباطية ممتعة، اكبح الاستجابة المتسرعة لتفادي الفخ البديهي!'
  },
  {
    id: 'dont-tap',
    title: 'لا تضغط!',
    ability: 'السرعة والتركيز ⚡',
    icon: '🛑',
    gradient: 'from-rose-500/20 via-red-950/40 to-slate-950',
    borderColor: 'border-rose-400',
    accentBg: 'bg-rose-500',
    description: 'أشكال تتساقط عبر 3 مسارات. اضغط على المطلوب بس وسيّب الباقي ينزل!'
  },
  {
    id: 'math-bridge',
    title: 'الجسر الحسابي',
    ability: 'الحساب والبديهة 🧮',
    icon: '🌉',
    gradient: 'from-amber-500/20 via-orange-950/40 to-slate-950',
    borderColor: 'border-amber-400',
    accentBg: 'bg-amber-400',
    description: 'معادلات رياضية ناقصة! اختر الرقم أو العملية الصحيحة لإكمال الجسر.'
  },
  {
    id: 'odd-one-out',
    title: 'الدخيل',
    ability: 'السرعة والتركيز ⚡',
    icon: '👁️',
    gradient: 'from-rose-500/20 via-purple-950/40 to-slate-950',
    borderColor: 'border-rose-400',
    accentBg: 'bg-rose-500',
    description: 'امسح الشبكة بسرعة فائقة واكتشف الرمز الشاذ والمختلف قبل نفاد الوقت!'
  },
  {
    id: 'complete-sequence',
    title: 'أكمل المتتالية',
    ability: 'الذكاء والمنطق 🧩',
    icon: '🔢',
    gradient: 'from-teal-500/20 via-cyan-950/40 to-slate-950',
    borderColor: 'border-teal-400',
    accentBg: 'bg-teal-400',
    description: 'اكتشف القاعدة المنطقية بين المتتاليات الرياضية والبصرية واختر المكمل!'
  },
  {
    id: 'where-did-it-go',
    title: 'أين اختفت؟',
    ability: 'الذاكرة والاستدعاء 🧠',
    icon: '🔍',
    gradient: 'from-purple-500/20 via-indigo-950/40 to-slate-950',
    borderColor: 'border-purple-400',
    accentBg: 'bg-purple-400',
    description: 'احفظ أماكن الرموز قبل ما تنقلب البطاقات وتتبدل أماكنها بسرعة!'
  },
  {
    id: 'number-hunt',
    title: 'صيد الرقم',
    ability: 'الحساب والبديهة 🧮',
    icon: '🎯',
    gradient: 'from-amber-500/20 via-emerald-950/40 to-slate-950',
    borderColor: 'border-amber-400',
    accentBg: 'bg-amber-400',
    description: 'ادمج بطاقات الأرقام والعمليات الحسابية بدقة لصيد الرقم المطلوب!'
  },
  {
    id: 'follow-pattern',
    title: 'اتبع النمط',
    ability: 'الذاكرة والاستدعاء 🧠',
    icon: '🧩',
    gradient: 'from-purple-500/20 via-violet-950/40 to-slate-950',
    borderColor: 'border-purple-400',
    accentBg: 'bg-purple-400',
    description: 'احفظ تسلسل الإضاءات والنغمات وأعد تكرارها بدون أي تردد!'
  },
  {
    id: 'tile-match',
    title: 'مطابقة الطبقات',
    ability: 'الذكاء والمنطق 🧩',
    icon: '🍓',
    gradient: 'from-teal-500/20 via-emerald-950/40 to-slate-950',
    borderColor: 'border-teal-400',
    accentBg: 'bg-teal-400',
    description: 'انقل البطاقات المكشوفة وطابق ثلاثيات الفواكه لتفريغ اللوحة.'
  },
  {
    id: 'watch-and-judge',
    title: 'شاهد واحكم',
    ability: 'الذاكرة والاستدعاء 🧠',
    icon: '👁️',
    gradient: 'from-purple-500/20 via-indigo-950/40 to-slate-950',
    borderColor: 'border-purple-400',
    accentBg: 'bg-purple-400',
    description: 'احفظ المشهد الأول واكتشف ما الذي تغير في المشهد الثاني بدقة خاطفة!'
  },
  {
    id: 'moving-maze',
    title: 'متاهة تتحرك',
    ability: 'الذكاء والمنطق 🧩',
    icon: '🧭',
    gradient: 'from-teal-500/20 via-cyan-950/40 to-slate-950',
    borderColor: 'border-teal-400',
    accentBg: 'bg-teal-400',
    description: 'تنقل في المتاهة المتحركة بذكاء، اجمع المفاتيح وتفادَ الفخاخ وصولاً للمخرج!'
  }
];

interface DailyResult {
  gameId: string;
  score: number;
  stage: number;
  date: string;
  timestamp: number;
}

export default function DailyChallengePage() {
  const { profile } = useAuth();
  const [todayStr, setTodayStr] = useState<string>('');
  const [dailySeed, setDailySeed] = useState<number>(1337);
  const [todayGame, setTodayGame] = useState<DailyGameInfo>(AVAILABLE_DAILY_GAMES[0]!);
  const [todayResult, setTodayResult] = useState<DailyResult | null>(null);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [countdown, setCountdown] = useState<string>('--:--:--');

  useEffect(() => {
    // Current date calculation
    const now = new Date();
    const dateFormatted = now.toISOString().split('T')[0]!;
    setTodayStr(dateFormatted);

    // Deterministic game selection by date
    const dateNum = parseInt(dateFormatted.replace(/-/g, ''), 10);
    const gameIdx = Math.abs(dateNum % AVAILABLE_DAILY_GAMES.length);
    const selected = AVAILABLE_DAILY_GAMES[gameIdx] || AVAILABLE_DAILY_GAMES[0]!;
    setTodayGame(selected);

    // Deterministic seed for today's challenge
    const seed = ((dateNum * 16807) % 2147483647) || 12345;
    setDailySeed(seed);

    // Read stored streak & today's result
    if (typeof window !== 'undefined') {
      const storedStreak = Number(localStorage.getItem('fg_streak_days') || 0);
      setStreakDays(storedStreak);

      const storedResult = localStorage.getItem(`fg_daily_result_${dateFormatted}`);
      if (storedResult) {
        try {
          setTodayResult(JSON.parse(storedResult));
        } catch {
          setTodayResult(null);
        }
      }
    }

    // Live countdown to midnight Tripoli time (UTC+2)
    const updateCountdown = () => {
      const cur = new Date();
      const tomorrow = new Date(cur);
      tomorrow.setHours(24, 0, 0, 0);
      const diffMs = tomorrow.getTime() - cur.getTime();
      if (diffMs > 0) {
        const h = Math.floor(diffMs / (1000 * 60 * 60));
        const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diffMs % (1000 * 60)) / 1000);
        setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="flex-1 flex flex-col p-4 select-none pb-24 max-w-[480px] w-full mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
        <Link href="/" className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1">
          <span>◀</span>
          <span>الرئيسية</span>
        </Link>
        <h1 className="font-heading text-xl font-black text-amber-400">تحدي اليوم 🎯</h1>
        <div className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 text-white">
          {todayStr || 'اليوم'}
        </div>
      </header>

      {/* Main Challenge Card */}
      <div className={`p-5 sm:p-6 bg-gradient-to-br ${todayGame.gradient} border-2 ${todayGame.borderColor} rounded-3xl text-center mb-5 shadow-2xl relative overflow-hidden`}>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-xs font-black shadow">
            تحدي اليوم الموحّد ⚔️
          </span>
          <span className="text-xs text-amber-300 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10">
            ⏳ ينتهي خلال: {countdown}
          </span>
        </div>

        {/* Game Icon & Title */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-4xl mb-3 shadow-inner">
          {todayGame.icon}
        </div>

        <h2 className="text-2xl font-black text-white mb-1">
          لعبة اليوم: {todayGame.title}
        </h2>
        <span className="inline-block text-xs font-bold text-amber-300 mb-2">
          {todayGame.ability}
        </span>
        <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed mb-4">
          {todayGame.description}
        </p>

        {/* Rules & Bonuses */}
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          <span className="px-3 py-1 bg-black/40 border border-white/15 rounded-xl text-xs text-amber-200 font-bold">
            🔥 سلسلة الأيام: {streakDays > 0 ? `${streakDays} يوم` : 'ابدأ اليوم!'} (+5%)
          </span>
          <span className="px-3 py-1 bg-black/40 border border-white/15 rounded-xl text-xs text-slate-200 font-bold">
            🎯 محاولة واحدة رسمية
          </span>
        </div>

        {/* Action Button: Play or Show Result */}
        {todayResult ? (
          <div className="p-4 bg-black/50 border border-emerald-500/40 rounded-2xl text-center animate-fade-in">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs mb-2">
              <span>✔</span>
              <span>أكملت تحدي اليوم بنجاح!</span>
            </div>
            <div className="text-3xl font-black text-amber-300 mb-1 tabular-nums">
              {todayResult.score.toLocaleString()} نقطة
            </div>
            <div className="text-xs text-slate-400 mb-4">
              وصلت إلى المرحلة {todayResult.stage} • محاولتك مسجلة في الصدارة
            </div>

            <Link
              href={`/play/${todayGame.id}`}
              className="inline-flex items-center justify-center gap-2 w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition-all"
            >
              <span>تدرب في الوضع الحر بدون تأثير على التحدي 🎮</span>
              <span>◀</span>
            </Link>
          </div>
        ) : (
          <Link
            href={`/play/${todayGame.id}?mode=daily&seed=${dailySeed}`}
            className="w-full h-14 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 hover:brightness-110 active:scale-95 text-slate-950 font-black rounded-2xl text-base shadow-xl flex items-center justify-center gap-2 transition-transform"
          >
            <span>ابدأ تحدي اليوم الآن 🚀</span>
            <span>(محاولة واحدة)</span>
          </Link>
        )}
      </div>

      {/* Today's Leaderboard Preview */}
      <div className="p-4 bg-slate-900/90 border border-white/10 rounded-3xl shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-200 flex items-center gap-1.5">
            <span>🏆</span>
            <span>صدارة تحدي اليوم الموحد</span>
          </h3>
          <span className="text-[11px] font-bold text-amber-400">
            {todayGame.title}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {/* Top 3 Daily Champions */}
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-amber-400/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🥇</span>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>الصقر_الليبي</span>
                  <span className="text-[10px] text-slate-400 font-normal">📍 طرابلس</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-bold">المرحلة 9 • سلسلة 5 أيام 🔥</div>
              </div>
            </div>
            <div className="text-sm font-black text-amber-300 tabular-nums">
              4,820
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🥈</span>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>برق_بنغازي</span>
                  <span className="text-[10px] text-slate-400 font-normal">📍 بنغازي</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-bold">المرحلة 8 • سلسلة 3 أيام 🔥</div>
              </div>
            </div>
            <div className="text-sm font-black text-slate-200 tabular-nums">
              4,150
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🥉</span>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>الداهية_مصراتة</span>
                  <span className="text-[10px] text-slate-400 font-normal">📍 مصراتة</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-bold">المرحلة 7 • سلسلة يومين 🔥</div>
              </div>
            </div>
            <div className="text-sm font-black text-amber-600/90 tabular-nums">
              3,690
            </div>
          </div>

          {/* Current User Row */}
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-bold text-slate-300 px-2">
            <div className="flex items-center gap-2">
              <span className="text-base">{profile.avatar || '⚡'}</span>
              <span>أنت ({profile.nickname})</span>
            </div>
            <div className="text-amber-300 font-black">
              {todayResult ? `${todayResult.score.toLocaleString()} نقطة` : 'لم تلعب بعد ⏳'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Navigation Bar */}
      <BottomNav />
    </main>
  );
}
