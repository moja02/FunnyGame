'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BottomNav } from '../../components/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatar: string;
  city?: string;
  bestScore: number;
  highestStage: number;
  isCurrentUser?: boolean;
}

const GAME_NAMES: Record<string, { title: string; ability: string; icon: string }> = {
  'color-trap': { title: 'ألوان خادعة', ability: 'السرعة والتركيز ⚡', icon: '🎨' },
  'speed-math': { title: 'حساب سريع', ability: 'الحساب والبديهة 🧮', icon: '⏱️' },
  'matrix-memory': { title: 'مصفوفة الذاكرة', ability: 'الذاكرة والاستدعاء 🧠', icon: '🔲' },
  'time-duel': { title: 'مواجهة الوقت', ability: 'الذكاء والمنطق 💡', icon: '⚔️' },
};

export default function LeaderboardClient({ gameId }: { gameId: string }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'global' | 'city' | 'friends'>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const gameInfo = GAME_NAMES[gameId] || { title: gameId, ability: 'تحدي القدرات', icon: '🎮' };

  useEffect(() => {
    let isMounted = true;

    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();

        // 1. Query view_leaderboard_global for real registered scores
        const { data, error } = await supabase
          .from('view_leaderboard_global')
          .select('*')
          .eq('game_id', gameId)
          .order('best_score', { ascending: false })
          .limit(50);

        if (isMounted) {
          if (data && data.length > 0 && !error) {
            const mapped: LeaderboardEntry[] = data.map((item, idx) => ({
              rank: idx + 1,
              userId: item.user_id,
              nickname: item.nickname || 'بطل التحدي',
              avatar: item.avatar || '⚡',
              city: item.city || undefined,
              bestScore: Number(item.best_score || 0),
              highestStage: Number(item.highest_stage || 1),
              isCurrentUser: item.user_id === profile.id,
            }));
            setEntries(mapped);
          } else if (gameId === 'time-duel') {
            // For time-duel fallback: check leaderboard_top view if available
            const { data: duelData } = await supabase
              .from('leaderboard_top')
              .select('*')
              .limit(50);

            if (duelData && duelData.length > 0) {
              const mapped: LeaderboardEntry[] = duelData.map((item, idx) => ({
                rank: idx + 1,
                userId: item.id,
                nickname: item.nickname || 'بطل التحدي',
                avatar: item.avatar || '⚡',
                bestScore: Math.round(Math.max(0, (1 - Number(item.best_diff || 1)) * 10000)),
                highestStage: Number(item.wins || 1),
                isCurrentUser: item.id === profile.id,
              }));
              setEntries(mapped);
            } else {
              setEntries([]);
            }
          } else {
            // No fake bots - strictly real registered users only
            setEntries([]);
          }
        }
      } catch (err) {
        console.warn('Leaderboard fetch notice:', err);
        if (isMounted) {
          setEntries([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLeaderboard();
    return () => {
      isMounted = false;
    };
  }, [gameId, profile.id]);

  // Top 3 Podium
  const rank1 = entries.find((e) => e.rank === 1);
  const rank2 = entries.find((e) => e.rank === 2);
  const rank3 = entries.find((e) => e.rank === 3);

  // Remaining entries (Rank 4+)
  const remaining = entries.filter((e) => e.rank > 3);

  // Current user's standing
  const currentUserEntry = entries.find((e) => e.isCurrentUser || e.userId === profile.id);

  return (
    <main className="flex-1 flex flex-col p-4 select-none pb-28 max-w-[480px] w-full mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
        <Link href="/games" className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1">
          <span>◀</span>
          <span>كل الألعاب</span>
        </Link>
        <div className="text-center">
          <h1 className="font-heading text-lg font-black text-amber-400 flex items-center gap-1.5 justify-center">
            <span>{gameInfo.icon}</span>
            <span>لوحة صدارة: {gameInfo.title}</span>
          </h1>
          <span className="text-[11px] font-bold text-slate-400">{gameInfo.ability}</span>
        </div>
        <div className="w-10" />
      </header>

      {/* Scope Filter Tabs */}
      <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-white/10 mb-5 shadow">
        <button
          onClick={() => setTab('global')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            tab === 'global' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          🌍 الكل (عالمي)
        </button>
        <button
          onClick={() => setTab('city')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            tab === 'city' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          🏙️ مدينتك
        </button>
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            tab === 'friends' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          👥 الأصدقاء
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center bg-slate-900/60 border border-white/10 rounded-3xl my-4">
          <div className="text-3xl mb-3 animate-bounce">⏳</div>
          <div className="text-xs text-slate-300 font-bold">جاري تحميل لوحة الصدارة الموثقة...</div>
        </div>
      ) : entries.length === 0 ? (
        /* Empty State (Zero Fake Bots) */
        <div className="p-8 text-center bg-slate-900/60 border border-white/10 rounded-3xl my-4 shadow-xl">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-400/10 border-2 border-amber-400/30 flex items-center justify-center text-4xl mb-4 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
            🏆
          </div>
          <h3 className="text-lg font-black text-white mb-2">لا يوجد متصدرون مسجلون بعد!</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[280px] mx-auto mb-5">
            تتضمن لوحة الصدارة اللاعبين الحقيقيين المسجلين فقط. سجّل حسابك والعب الآن لتكون أول بطل يتصدر قائمة{' '}
            <strong className="text-amber-300">{gameInfo.title}</strong>!
          </p>
          <div className="flex flex-col gap-2 max-w-[240px] mx-auto">
            <Link
              href={`/play/${gameId}`}
              className="py-3 px-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black rounded-xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all text-center"
            >
              ⚡ العب الآن وكن الأول
            </Link>
            {profile.isGuest && (
              <Link
                href="/profile"
                className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-slate-200 font-bold rounded-xl text-xs border border-white/10 transition-colors text-center"
              >
                👤 سجّل حسابك لتوثيق رقمك
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 3D Visual Podium (Top 3) */}
          <div className="flex items-end justify-center gap-2 pt-6 pb-4 mb-4">
            {/* 2nd Place (Silver) */}
            {rank2 ? (
              <div className="flex-1 flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-300 flex items-center justify-center text-3xl shadow-lg">
                    {rank2.avatar}
                  </div>
                  <span className="absolute -top-2.5 -right-2 px-1.5 py-0.5 rounded-full bg-slate-300 text-slate-950 text-[10px] font-black border border-white">
                    🥈 2
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate max-w-[85px]">{rank2.nickname}</div>
                <div className="text-xs font-black text-amber-300 font-mono mt-0.5">
                  {rank2.bestScore.toLocaleString('en-US')}
                </div>
                <div className="w-full h-20 bg-gradient-to-t from-slate-900 to-slate-800/80 border-t-4 border-slate-300 rounded-t-2xl mt-2 flex items-center justify-center font-heading font-black text-slate-400 text-lg">
                  2
                </div>
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {/* 1st Place (Gold) - Elevated */}
            {rank1 && (
              <div className="flex-1 flex flex-col items-center -mt-6 z-10">
                <div className="relative mb-2">
                  <span className="text-2xl absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce">👑</span>
                  <div className="w-18 h-18 rounded-3xl bg-amber-500/20 border-3 border-amber-400 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(251,191,36,0.5)]">
                    {rank1.avatar}
                  </div>
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black border border-white">
                    🥇 1
                  </span>
                </div>
                <div className="text-sm font-black text-white truncate max-w-[100px]">{rank1.nickname}</div>
                <div className="text-sm font-black text-amber-400 font-mono mt-0.5">
                  {rank1.bestScore.toLocaleString('en-US')}
                </div>
                <div className="w-full h-28 bg-gradient-to-t from-amber-950/60 to-amber-900/40 border-t-4 border-amber-400 rounded-t-2xl mt-2 flex items-center justify-center font-heading font-black text-amber-300 text-2xl shadow-xl">
                  1
                </div>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {rank3 ? (
              <div className="flex-1 flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border-2 border-amber-700 flex items-center justify-center text-3xl shadow-lg">
                    {rank3.avatar}
                  </div>
                  <span className="absolute -top-2.5 -right-2 px-1.5 py-0.5 rounded-full bg-amber-700 text-white text-[10px] font-black border border-amber-500">
                    🥉 3
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate max-w-[85px]">{rank3.nickname}</div>
                <div className="text-xs font-black text-amber-300 font-mono mt-0.5">
                  {rank3.bestScore.toLocaleString('en-US')}
                </div>
                <div className="w-full h-16 bg-gradient-to-t from-slate-900 to-amber-950/40 border-t-4 border-amber-700 rounded-t-2xl mt-2 flex items-center justify-center font-heading font-black text-amber-600 text-lg">
                  3
                </div>
              </div>
            ) : (
              <div className="flex-1" />
            )}
          </div>

          {/* Ranks 4 to 50 List */}
          {remaining.length > 0 && (
            <div className="p-3 bg-slate-900/80 border border-white/10 rounded-3xl mb-4 shadow-xl">
              <div className="flex justify-between items-center text-xs text-slate-400 font-bold border-b border-white/10 pb-2 px-2 mb-2">
                <span>الترتيب واللاعب</span>
                <span>المرحلة والنقاط</span>
              </div>

              <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
                {remaining.map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                      entry.isCurrentUser
                        ? 'bg-amber-400/20 border border-amber-400/50 shadow-md ring-1 ring-amber-400/30'
                        : 'bg-white/5 border border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-400 w-6 text-center">
                        #{entry.rank}
                      </span>
                      <span className="text-2xl">{entry.avatar}</span>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{entry.nickname}</span>
                          {entry.isCurrentUser && (
                            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full">
                              أنت
                            </span>
                          )}
                        </div>
                        {entry.city && <span className="text-[10px] text-slate-400">{entry.city}</span>}
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="font-mono text-xs font-black text-amber-300">
                        {entry.bestScore.toLocaleString('en-US')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        مرحلة {entry.highestStage}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sticky User Status Footer */}
      {profile.isGuest ? (
        <div className="p-3 bg-gradient-to-r from-amber-500/20 to-orange-950/40 border border-amber-400/40 rounded-2xl mb-4 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-xs font-black text-white">أنت تلعب كزائر 👤</div>
            <div className="text-[11px] text-slate-300">سجل حسابك ليظهر رقمك في لوحة الصدارة!</div>
          </div>
          <Link
            href="/profile"
            className="px-3 py-1.5 bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow hover:bg-amber-300 transition-colors"
          >
            سجل الآن
          </Link>
        </div>
      ) : currentUserEntry ? (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl mb-4 flex items-center justify-between shadow">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{profile.avatar}</span>
            <div>
              <div className="text-xs font-black text-white">ترتيبك الحالي: #{currentUserEntry.rank}</div>
              <div className="text-[11px] text-emerald-300">أفضل نتيجة: {currentUserEntry.bestScore.toLocaleString('en-US')} نقطة</div>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-black border border-emerald-500/40">
            🟢 معتمد
          </span>
        </div>
      ) : (
        <div className="p-3 bg-slate-900/80 border border-emerald-500/30 rounded-2xl mb-4 flex items-center justify-between shadow">
          <div>
            <div className="text-xs font-bold text-emerald-400">حسابك سحابي موثق 🟢</div>
            <div className="text-[11px] text-slate-300">العب الآن لتسجيل رقمك في قائمة المتصدرين!</div>
          </div>
          <Link
            href={`/play/${gameId}`}
            className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs shadow hover:bg-emerald-400 transition-colors"
          >
            العب الآن
          </Link>
        </div>
      )}

      {/* Floating CTA Button */}
      <Link
        href={`/play/${gameId}`}
        className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 font-black rounded-2xl text-center text-sm shadow-[0_4px_0_#9a3412] active:translate-y-1 transition-all flex items-center justify-center gap-2"
      >
        <span>العب وتحدّ الأبطال</span>
        <span>⚡</span>
      </Link>

      {/* Bottom Sticky Navigation Bar */}
      <BottomNav />
    </main>
  );
}
