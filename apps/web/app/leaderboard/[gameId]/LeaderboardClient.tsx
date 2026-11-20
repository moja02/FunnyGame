'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BottomNav } from '../../components/BottomNav';
import { CitySelectModal } from '../../components/CitySelectModal';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatar: string;
  city?: string;
  cityId?: string;
  bestScore: number;
  highestStage: number;
  isCurrentUser?: boolean;
}

const GAME_NAMES: Record<string, { title: string; ability: string; icon: string }> = {
  'color-trap': { title: 'ألوان خادعة', ability: 'السرعة والتركيز ⚡', icon: '🎨' },
  'calc-pressure': { title: 'حاسبة تحت الضغط', ability: 'الحساب والبديهة 🔢', icon: '🧮' },
  'calc_pressure': { title: 'حاسبة تحت الضغط', ability: 'الحساب والبديهة 🔢', icon: '🧮' },
  'math-bridge': { title: 'الجسر الحسابي', ability: 'الحساب والبديهة 🔢', icon: '🌉' },
  'math_bridge': { title: 'الجسر الحسابي', ability: 'الحساب والبديهة 🔢', icon: '🌉' },
  'number-hunt': { title: 'صيد الرقم', ability: 'الحساب والبديهة 🔢', icon: '🎯' },
  'number_hunt': { title: 'صيد الرقم', ability: 'الحساب والبديهة 🔢', icon: '🎯' },
  'follow-pattern': { title: 'اتبع النمط', ability: 'الذاكرة والاستدعاء 🧠', icon: '🧩' },
  'follow_pattern': { title: 'اتبع النمط', ability: 'الذاكرة والاستدعاء 🧠', icon: '🧩' },
  'where-did-it-go': { title: 'أين اختفت؟', ability: 'الذاكرة والاستدعاء 🧠', icon: '🔍' },
  'where_did_it_go': { title: 'أين اختفت؟', ability: 'الذاكرة والاستدعاء 🧠', icon: '🔍' },
  'watch-and-judge': { title: 'شاهد واحكم', ability: 'الذاكرة والاستدعاء 🧠', icon: '👁️' },
  'watch_and_judge': { title: 'شاهد واحكم', ability: 'الذاكرة والاستدعاء 🧠', icon: '👁️' },
  'moving-maze': { title: 'متاهة تتحرك', ability: 'الذكاء والمنطق 💡', icon: '🧭' },
  'moving_maze': { title: 'متاهة تتحرك', ability: 'الذكاء والمنطق 💡', icon: '🧭' },
  'dont-tap': { title: 'لا تضغط!', ability: 'السرعة والتركيز ⚡', icon: '🛑' },
  'dont_tap': { title: 'لا تضغط!', ability: 'السرعة والتركيز ⚡', icon: '🛑' },
  'odd-one-out': { title: 'الدخيل', ability: 'السرعة والتركيز ⚡', icon: '👁️' },
  'odd_one_out': { title: 'الدخيل', ability: 'السرعة والتركيز ⚡', icon: '👁️' },
  'speed-math': { title: 'حساب سريع', ability: 'الحساب والبديهة 🧮', icon: '⏱️' },
  'matrix-memory': { title: 'مصفوفة الذاكرة', ability: 'الذاكرة والاستدعاء 🧠', icon: '🔲' },
  'time-duel': { title: 'مواجهة الوقت', ability: 'الذكاء والمنطق 💡', icon: '⚔️' },
};

export default function LeaderboardClient({ gameId }: { gameId: string }) {
  const { profile, updateCity, addFriend } = useAuth();
  const [tab, setTab] = useState<'global' | 'city' | 'friends'>('global');
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // City modal state
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  // Friend adding state
  const [friendIdInput, setFriendIdInput] = useState('');
  const [friendNotice, setFriendNotice] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

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
          .limit(100);

        if (isMounted) {
          let list: LeaderboardEntry[] = [];

          if (data && data.length > 0 && !error) {
            list = data.map((item, idx) => ({
              rank: idx + 1,
              userId: item.user_id,
              nickname: item.nickname || 'guest-unknown',
              avatar: item.avatar || '⚡',
              city: item.city_name || item.city || undefined,
              cityId: item.city_id || undefined,
              bestScore: Number(item.best_score || 0),
              highestStage: Number(item.highest_stage || 1),
              isCurrentUser: item.user_id === profile.id,
            }));
          } else {
            // 2. Direct profiles fallback where registered players exist
            let profData: any[] | null = null;

            // Attempt 1: With city fields if migrated
            const resWithCity = await supabase
              .from('profiles')
              .select('id, nickname, avatar, city, city_name, city_id, wins, total_games')
              .order('wins', { ascending: false })
              .limit(100);

            if (!resWithCity.error && resWithCity.data && resWithCity.data.length > 0) {
              profData = resWithCity.data;
            } else {
              // Attempt 2: Basic profiles columns (guaranteed to exist in current schema)
              const resSimple = await supabase
                .from('profiles')
                .select('id, nickname, avatar, wins, total_games')
                .order('wins', { ascending: false })
                .limit(100);

              if (!resSimple.error && resSimple.data) {
                profData = resSimple.data;
              }
            }

            if (profData && profData.length > 0) {
              list = profData.map((item, idx) => ({
                rank: idx + 1,
                userId: item.id,
                nickname: item.nickname || 'guest-unknown',
                avatar: item.avatar || '⚡',
                city: item.city_name || item.city || undefined,
                cityId: item.city_id || undefined,
                bestScore: Number(item.wins || 0),
                highestStage: Math.max(1, Math.floor(Number(item.wins || 0) / 700)),
                isCurrentUser: item.id === profile.id,
              }));
            }
          }

          // 3. Ensure current user's local verified run and city are reflected
          if (!profile.isGuest && typeof window !== 'undefined') {
            const localPb = Number(localStorage.getItem(`fg_pb_${gameId}`) || 0);
            const userIndex = list.findIndex((e) => e.userId === profile.id);

            // If local high score is higher than remote score, push it to Supabase immediately
            if (localPb > 0 && profile.id) {
              const currentRemote = userIndex >= 0 ? list[userIndex]!.bestScore : 0;
              if (localPb > currentRemote) {
                supabase
                  .from('profiles')
                  .update({
                    wins: localPb,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', profile.id)
                  .then(() => {});

                supabase
                  .from('game_runs')
                  .insert({
                    user_id: profile.id,
                    game_id: gameId,
                    score: localPb,
                    stage_reached: Math.max(1, Math.floor(localPb / 700)),
                  })
                  .then(() => {});
              }
            }

            if (userIndex >= 0) {
              // Update with user's current city and local PB if higher
              list[userIndex]!.city = profile.cityName || list[userIndex]!.city;
              list[userIndex]!.cityId = profile.cityId || list[userIndex]!.cityId;
              list[userIndex]!.nickname = profile.nickname;
              if (localPb > list[userIndex]!.bestScore) {
                list[userIndex]!.bestScore = localPb;
                list[userIndex]!.highestStage = Math.max(1, Math.floor(localPb / 700));
              }
            } else if (localPb >= 0) {
              list.push({
                rank: list.length + 1,
                userId: profile.id,
                nickname: profile.nickname,
                avatar: profile.avatar,
                city: profile.cityName,
                cityId: profile.cityId,
                bestScore: localPb,
                highestStage: Math.max(1, Math.floor(localPb / 700)),
                isCurrentUser: true,
              });
            }

            list.sort((a, b) => b.bestScore - a.bestScore);
            list.forEach((e, idx) => {
              e.rank = idx + 1;
            });
          }

          setAllEntries(list);
        }
      } catch (err) {
        console.warn('Leaderboard fetch notice:', err);
        if (isMounted) {
          setAllEntries([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLeaderboard();
    return () => {
      isMounted = false;
    };
  }, [gameId, profile.id, profile.isGuest, profile.nickname, profile.avatar, profile.cityName, profile.cityId]);

  // Tab-filtered entries
  const displayedEntries = useMemo(() => {
    let filtered: LeaderboardEntry[] = [];

    if (tab === 'global') {
      // 1. All Libya local
      filtered = [...allEntries];
    } else if (tab === 'city') {
      // 2. City only
      if (!profile.cityName && !profile.cityId) {
        return [];
      }
      filtered = allEntries.filter(
        (e) =>
          (profile.cityName && e.city === profile.cityName) ||
          (profile.cityId && e.cityId === profile.cityId) ||
          (e.isCurrentUser && profile.cityName)
      );
    } else if (tab === 'friends') {
      // 3. Friends only
      const friendIds = profile.friends || [];
      filtered = allEntries.filter(
        (e) => friendIds.includes(e.userId) || e.isCurrentUser || e.userId === profile.id
      );
    }

    // Re-rank
    return filtered.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [tab, allEntries, profile.cityName, profile.cityId, profile.friends, profile.id]);

  // Top 3 Podium
  const rank1 = displayedEntries.find((e) => e.rank === 1);
  const rank2 = displayedEntries.find((e) => e.rank === 2);
  const rank3 = displayedEntries.find((e) => e.rank === 3);

  // Remaining entries (Rank 4+)
  const remaining = displayedEntries.filter((e) => e.rank > 3);

  // Current user's standing in this tab
  const currentUserEntry = displayedEntries.find((e) => e.isCurrentUser || e.userId === profile.id);

  // Handle Add Friend
  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendIdInput.trim()) return;

    setIsAddingFriend(true);
    setFriendNotice(null);
    setFriendSuccess(null);

    const res = await addFriend(friendIdInput.trim());
    setIsAddingFriend(false);

    if (res.success) {
      setFriendSuccess('تمت إضافة الصديق بنجاح إلى قائمتك! 👥');
      setFriendIdInput('');
      setTimeout(() => setFriendSuccess(null), 3000);
    } else if (res.error) {
      setFriendNotice(res.error);
    }
  };

  const handleCopyMyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(profile.id);
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    }
  };

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

      {/* 3 Core Streamlined Tabs */}
      <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-white/10 mb-4 shadow">
        <button
          onClick={() => setTab('global')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            tab === 'global' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          الكل (محلي) 🇱🇾
        </button>
        <button
          onClick={() => setTab('city')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            tab === 'city' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          {profile.cityName ? `${profile.cityName} 🏙️` : 'مدينتك 🏙️'}
        </button>
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            tab === 'friends' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          الأصدقاء 👥
        </button>
      </div>

      {/* Friends Tab Actions (Add Friend & Copy My ID) */}
      {tab === 'friends' && (
        <div className="mb-4 p-3.5 bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900 border border-purple-500/30 rounded-3xl shadow-lg flex flex-col gap-3">
          {/* Add Friend Form */}
          <form onSubmit={handleAddFriendSubmit} className="flex gap-2">
            <input
              type="text"
              value={friendIdInput}
              onChange={(e) => {
                setFriendIdInput(e.target.value);
                setFriendNotice(null);
              }}
              placeholder="ألصق معرّف صديقك (Player ID)"
              className="flex-1 px-3 py-1.5 bg-black/50 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 outline-none focus:border-amber-400 dir-ltr text-right"
            />
            <button
              type="submit"
              disabled={isAddingFriend}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow active:scale-95 transition-all disabled:opacity-50"
            >
              {isAddingFriend ? '...' : 'إضافة ➕'}
            </button>
          </form>

          {friendNotice && (
            <div className="text-[11px] font-bold text-rose-300 bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/30">
              ⚠️ {friendNotice}
            </div>
          )}
          {friendSuccess && (
            <div className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-center">
              {friendSuccess}
            </div>
          )}

          {/* Share My ID Card */}
          <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-400 text-[11px]">معرّفك الخاص:</span>
              <span className="font-mono text-slate-200 text-[11px] font-bold">#{profile.id.substring(0, 12)}...</span>
            </div>
            <button
              onClick={handleCopyMyId}
              className="text-amber-400 hover:text-amber-300 font-black text-xs whitespace-nowrap pl-2"
            >
              {idCopied ? '✔ تم النسخ' : '📋 نسخ المعرّف'}
            </button>
          </div>
        </div>
      )}

      {/* City Tab: No City Selected CTA */}
      {tab === 'city' && !profile.cityName && (
        <div className="p-6 text-center bg-slate-900/80 border-2 border-amber-400/40 rounded-3xl mb-4 shadow-xl">
          <div className="text-4xl mb-2">🏙️</div>
          <h3 className="text-base font-black text-white mb-1">من أي مدينة تلعب؟</h3>
          <p className="text-xs text-slate-300 mb-4 max-w-[260px] mx-auto leading-relaxed">
            اختار مدينتك باش تنافس ولاد بلادك وترفع اسمها في صدارة المدن الليبية!
          </p>
          <button
            onClick={() => setIsCityModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black rounded-xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            📍 تحديد مدينتي الآن
          </button>
        </div>
      )}

      {/* City Tab: Celebration banner if rank 1 */}
      {tab === 'city' && profile.cityName && rank1?.isCurrentUser && (
        <div className="p-3 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 border-2 border-amber-400 rounded-2xl mb-4 text-center shadow-lg animate-pulse">
          <span className="text-sm font-black text-amber-300">
            كفو! إنت الأول على مستوى {profile.cityName} حالياً 👑
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center bg-slate-900/60 border border-white/10 rounded-3xl my-4">
          <div className="text-3xl mb-3 animate-bounce">⏳</div>
          <div className="text-xs text-slate-300 font-bold">جاري تحميل لوحة الصدارة...</div>
        </div>
      ) : displayedEntries.length === 0 ? (
        /* Empty State (Zero Fake Bots) */
        <div className="p-8 text-center bg-slate-900/60 border border-white/10 rounded-3xl my-4 shadow-xl">
          <div className="w-18 h-18 mx-auto rounded-3xl bg-amber-400/10 border-2 border-amber-400/30 flex items-center justify-center text-3xl mb-3 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
            🏆
          </div>
          <h3 className="text-base font-black text-white mb-1.5">
            {tab === 'city'
              ? `لا يوجد متصدرون بعد في ${profile.cityName || 'مدينتك'}!`
              : tab === 'friends'
              ? 'لا يوجد نتائج لأصدقائك بعد!'
              : 'لا يوجد متصدرون مسجلون بعد!'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[280px] mx-auto mb-4">
            {tab === 'city'
              ? `كن أول لاعب يسجل رقماً قياسياً في لعبة ${gameInfo.title} ويتصدر قائمة ${profile.cityName}!`
              : tab === 'friends'
              ? 'أضف معرّف صديقك من الخانة أعلاه وشاركه معرّفك لتبدأ المنافسة بينكم!'
              : `تتضمن اللوحة اللاعبين الحقيقيين فقط. سجّل والعب لتكون أول بطل في ${gameInfo.title}!`}
          </p>
          <div className="flex flex-col gap-2 max-w-[220px] mx-auto">
            <Link
              href={`/play/${gameId}`}
              className="py-2.5 px-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black rounded-xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all text-center"
            >
              ⚡ العب الآن وكن الأول
            </Link>
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
                {rank2.city && <div className="text-[10px] text-slate-400">{rank2.city}</div>}
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
                {rank1.city && <div className="text-[11px] text-amber-300 font-bold">{rank1.city}</div>}
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
                {rank3.city && <div className="text-[10px] text-slate-400">{rank3.city}</div>}
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

          {/* Ranks 4 to 100 List */}
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
      ) : tab === 'city' && profile.cityName ? (
        <div className="p-3 bg-slate-900/90 border border-amber-400/40 rounded-2xl mb-4 flex items-center justify-between shadow">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏙️</span>
            <div>
              <div className="text-xs font-black text-white">
                ترتيبك في {profile.cityName}:{' '}
                <strong className="text-amber-300">
                  {currentUserEntry ? `#${currentUserEntry.rank}` : 'غير مصنف بعد'}
                </strong>
              </div>
              <div className="text-[10px] text-slate-400">
                من أصل {displayedEntries.length} لاعب في مدينتك
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsCityModalOpen(true)}
            className="text-[11px] font-bold text-amber-400 hover:underline"
          >
            تغيير المدينة
          </button>
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

      {/* City Selection Modal */}
      <CitySelectModal
        isOpen={isCityModalOpen}
        currentCityId={profile.cityId}
        onSelectCity={async (city) => {
          return await updateCity(city.id, city.name_ar);
        }}
        onClose={() => setIsCityModalOpen(false)}
      />

      {/* Bottom Sticky Navigation Bar */}
      <BottomNav />
    </main>
  );
}
