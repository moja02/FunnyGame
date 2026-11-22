'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

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

interface DailyLeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatar: string;
  city?: string;
  score: number;
  stage: number;
  isCurrentUser: boolean;
}

export default function DailyChallengePage() {
  const { profile } = useAuth();
  const [todayStr, setTodayStr] = useState<string>('');
  const [dailySeed, setDailySeed] = useState<number>(1337);
  const [todayGame, setTodayGame] = useState<DailyGameInfo>(AVAILABLE_DAILY_GAMES[0]!);
  const [todayResult, setTodayResult] = useState<DailyResult | null>(null);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [countdown, setCountdown] = useState<string>('--:--:--');
  const [dailyLeaderboard, setDailyLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(true);

  useEffect(() => {
    // Current date calculation
    const now = new Date();
    const dateFormatted = now.toISOString().split('T')[0] || '';
    setTodayStr(dateFormatted);

    // Deterministic game selection by date
    const dateNum = parseInt(dateFormatted.replace(/-/g, ''), 10) || 20261122;
    const gameIdx = Math.abs(dateNum % AVAILABLE_DAILY_GAMES.length);
    const selected = AVAILABLE_DAILY_GAMES[gameIdx] || AVAILABLE_DAILY_GAMES[0]!;
    setTodayGame(selected);

    // Deterministic seed for today's challenge
    const seed = ((dateNum * 16807) % 2147483647) || 12345;
    setDailySeed(seed);

    // Read stored streak & today's result
    let storedRes: DailyResult | null = null;
    if (typeof window !== 'undefined') {
      const storedStreak = Number(localStorage.getItem('fg_streak_days') || 0);
      setStreakDays(storedStreak);

      const rawResult = localStorage.getItem(`fg_daily_result_${dateFormatted}`);
      if (rawResult) {
        try {
          storedRes = JSON.parse(rawResult);
          setTodayResult(storedRes);
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

    // Fetch REAL registered users from Supabase for today's challenge
    async function loadRealDailyLeaderboard() {
      setIsLeaderboardLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Query game_runs for mode = 'daily' recorded today
        const { data: runs, error } = await supabase
          .from('game_runs')
          .select('id, user_id, score, stage_reached, created_at')
          .eq('mode', 'daily')
          .eq('game_id', selected.id)
          .gte('created_at', startOfToday.toISOString())
          .order('score', { ascending: false })
          .limit(50);

        let list: DailyLeaderboardEntry[] = [];

        if (runs && runs.length > 0 && !error) {
          const userIds = Array.from(new Set(runs.map((r) => r.user_id)));
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, nickname, avatar, city_name, city')
            .in('id', userIds);

          const profMap = new Map((profs || []).map((p) => [p.id, p]));

          // Deduplicate: best score per user today
          const userBestMap = new Map<string, { score: number; stage: number }>();
          for (const run of runs) {
            const existing = userBestMap.get(run.user_id);
            if (!existing || run.score > existing.score) {
              userBestMap.set(run.user_id, {
                score: run.score,
                stage: run.stage_reached || 1
              });
            }
          }

          const sorted = Array.from(userBestMap.entries())
            .map(([uId, data]) => {
              const p = profMap.get(uId);
              return {
                userId: uId,
                nickname: p?.nickname || 'بطل مسجل',
                avatar: p?.avatar || '⚡',
                city: p?.city_name || p?.city,
                score: data.score,
                stage: data.stage,
                isCurrentUser: uId === profile.id
              };
            })
            .sort((a, b) => b.score - a.score);

          list = sorted.map((item, idx) => ({
            ...item,
            rank: idx + 1
          }));
        }

        // If current user is registered, has played today, but their entry isn't in DB yet:
        if (!profile.isGuest && storedRes) {
          const exists = list.some((item) => item.userId === profile.id);
          if (!exists) {
            list.push({
              rank: list.length + 1,
              userId: profile.id,
              nickname: profile.nickname,
              avatar: profile.avatar || '⚡',
              city: profile.cityName,
              score: storedRes.score,
              stage: storedRes.stage,
              isCurrentUser: true
            });
            list.sort((a, b) => b.score - a.score);
            list = list.map((item, idx) => ({ ...item, rank: idx + 1 }));
          }
        }

        setDailyLeaderboard(list);
      } catch (err) {
        console.warn('Real daily leaderboard fetch notice:', err);
        setDailyLeaderboard([]);
      } finally {
        setIsLeaderboardLoading(false);
      }
    }

    loadRealDailyLeaderboard();

    return () => clearInterval(timer);
  }, [profile.id, profile.isGuest, profile.nickname, profile.avatar, profile.cityName]);

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

      {/* Guest vs Registered Leaderboard Explanation Notice */}
      {profile.isGuest ? (
        <div className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-950/20 to-slate-900 border-2 border-amber-400/40 rounded-3xl mb-4 shadow-lg text-right">
          <div className="flex items-center gap-2 text-amber-300 font-black text-xs mb-1">
            <span className="text-base">🏆</span>
            <span>كيف تظهر في صدارة تحدي اليوم الموحد؟</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
            صدارة تحدي اليوم مخصصة <strong>للحسابات المسجلة فقط</strong> لضمان المنافسة النزيهة بين أبطال ليبيا. أنت الآن في <strong>وضع الزائر</strong>؛ نتيجتك مسجلة على جهازك فقط. سجّل حسابك مجاناً لتنافس رسمياً باسمك ومدينتك!
          </p>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow transition-transform"
          >
            <span>سجّل حسابك لتدخل الصدارة 👤</span>
            <span>◀</span>
          </Link>
        </div>
      ) : (
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl mb-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
            <span>🟢</span>
            <span>حسابك مسجل ومؤهل رسمياً لدخول صدارة أبطال ليبيا!</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">
            {profile.cityName ? `📍 ${profile.cityName}` : 'بدون مدينة'}
          </span>
        </div>
      )}

      {/* Real Registered Daily Leaderboard */}
      <div className="p-4 bg-slate-900/90 border border-white/10 rounded-3xl shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-black text-slate-200 flex items-center gap-1.5">
              <span>🏆</span>
              <span>صدارة تحدي اليوم الموحد</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">
              حسابات مسجلة رسمياً • لعبة: {todayGame.title}
            </span>
          </div>
          <span className="text-[11px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
            {dailyLeaderboard.length} أبطال
          </span>
        </div>

        {isLeaderboardLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            جاري فحص نتائج الأبطال المسجلين لليوم... ⏳
          </div>
        ) : dailyLeaderboard.length === 0 ? (
          <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
            <span className="text-3xl">⏳</span>
            <div className="text-xs font-black text-white">
              لا توجد نتائج مسجلة لتحدي اليوم حتى الآن
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
              كن أول لاعب مسجل يكمل تحدي اليوم ويفتتح الصدارة باسمه ومدينته! 🚀
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {dailyLeaderboard.map((entry) => {
              const isTop1 = entry.rank === 1;
              const isTop2 = entry.rank === 2;
              const isTop3 = entry.rank === 3;

              let rankBadge = (
                <span className="text-xs font-bold text-slate-400 w-6 text-center">
                  #{entry.rank}
                </span>
              );
              if (isTop1) rankBadge = <span className="text-xl">🥇</span>;
              else if (isTop2) rankBadge = <span className="text-xl">🥈</span>;
              else if (isTop3) rankBadge = <span className="text-xl">🥉</span>;

              return (
                <div
                  key={entry.userId}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    entry.isCurrentUser
                      ? 'bg-amber-500/15 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/40'
                      : isTop1
                      ? 'bg-slate-950/70 border-amber-400/40'
                      : 'bg-slate-950/50 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {rankBadge}
                    <span className="text-xl">{entry.avatar || '⚡'}</span>
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{entry.nickname}</span>
                        {entry.isCurrentUser && (
                          <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-black rounded-md">
                            أنت 🟢
                          </span>
                        )}
                        {entry.city && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            📍 {entry.city}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        المرحلة {entry.stage}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm font-black text-amber-300 tabular-nums">
                    {entry.score.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Sticky Navigation Bar */}
      <BottomNav />
    </main>
  );
}
