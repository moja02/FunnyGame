'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '@/lib/auth-context';
import {
  type MatchSize,
  type PlayerSide,
  type DuelRoundResult,
} from '@funnygame/game-core';
import {
  type DuelRoomState,
  type DuelPlayer,
  type DuelMode,
  createDuelRoom,
  joinDuelRoom,
  pickDraftGame,
  advanceToNextRound,
  rematchDuelRoom,
  subscribeToDuelRoom,
  broadcastDuelRoom,
  getDuelRoomLocal,
  normalizeRoomCode,
} from '@/lib/duel/duel-service';

const TOURNAMENT_GAMES = [
  { id: 'color-trap', title: 'ألوان خادعة', ability: 'السرعة والتركيز ⚡', icon: '🎨', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { id: 'dont-tap', title: 'لا تضغط!', ability: 'السرعة والتركيز ⚡', icon: '🛑', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { id: 'odd-one-out', title: 'الدخيل', ability: 'السرعة والتركيز ⚡', icon: '👁️', badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  { id: 'calc-pressure', title: 'حاسبة تحت الضغط', ability: 'الحساب والبديهة 🔢', icon: '🧮', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'math-bridge', title: 'الجسر الحسابي', ability: 'الحساب والبديهة 🔢', icon: '🌉', badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { id: 'number-hunt', title: 'صيد الرقم', ability: 'الحساب والبديهة 🔢', icon: '🎯', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { id: 'where-did-it-go', title: 'أين اختفت؟', ability: 'الذاكرة والاستدعاء 🧠', icon: '🔍', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'follow-pattern', title: 'اتبع النمط', ability: 'الذاكرة والاستدعاء 🧠', icon: '🧩', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
  { id: 'watch-and-judge', title: 'شاهد واحكم', ability: 'الذاكرة والاستدعاء 🧠', icon: '👁️', badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  { id: 'moving-maze', title: 'متاهة تتحرك', ability: 'الذكاء والمنطق 💡', icon: '🧭', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { id: 'tile-match', title: 'مطابقة الطبقات', ability: 'الذكاء والمنطق 💡', icon: '🍓', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  { id: 'smart-trap', title: 'الفخ الذكي', ability: 'الذكاء والمنطق 💡', icon: '🪤', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'complete-sequence', title: 'أكمل المتتالية', ability: 'الذكاء والمنطق 💡', icon: '🔢', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
];

const AVATAR_OPTIONS = ['🦁', '🦅', '🐺', '⚡', '👑', '🎯', '🚀', '🔥'];

function DuelTournamentContent() {
  const router = useRouter();
  const { profile } = useAuth();
  const searchParams = useSearchParams();

  // Active room state
  const [room, setRoom] = useState<DuelRoomState | null>(null);

  // Lobby form state
  const [selectedSize, setSelectedSize] = useState<MatchSize>(4);
  const [selectedMode, setSelectedMode] = useState<DuelMode>(profile.isGuest ? 'local' : 'online');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Local match players customization
  const [localP1Name, setLocalP1Name] = useState(profile.isGuest ? 'اللاعب 1' : profile.nickname);
  const [localP1Avatar, setLocalP1Avatar] = useState(profile.avatar || '🦁');
  const [localP2Name, setLocalP2Name] = useState('اللاعب 2');
  const [localP2Avatar, setLocalP2Avatar] = useState('🦅');

  // Draft phase timer
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-launch countdown for live round
  const [autoLaunchCount, setAutoLaunchCount] = useState<number | null>(null);

  // Player identity
  const currentPlayer: DuelPlayer = useMemo(
    () => ({
      id: profile.id,
      nickname: profile.nickname,
      avatar: profile.avatar,
      cityName: profile.cityName,
      isHost: true,
      isGuest: profile.isGuest,
    }),
    [profile]
  );

  const isLocalMode = room?.mode === 'local';
  const isHost = room?.host.id === currentPlayer.id;
  const mySide: PlayerSide = isHost ? 'host' : 'guest';
  const isMyTurn = room?.status === 'DRAFTING' && room.draft.currentTurn === mySide;
  const canPick = isLocalMode ? true : isMyTurn;

  // 1. Check URL for direct room invite (/duel/?room=LY-XXXX)
  useEffect(() => {
    const queryRoom = searchParams.get('room');
    if (queryRoom) {
      const code = normalizeRoomCode(queryRoom);

      // Check if room exists in local storage first (local pass-and-play or existing host)
      const local = getDuelRoomLocal(code);
      if (local) {
        setRoom(local);
        return;
      }

      // If joining online room and currently guest, require login
      if (profile.isGuest) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('fg_pending_duel_invite', code);
        }
        setJoinError(`تم استلام دعوتك للغرفة (${code})! يرجى تسجيل الدخول بحسابك أولاً للمشاركة.`);
        return;
      }

      setIsJoining(true);
      setJoinError(null);
      joinDuelRoom(code, { ...currentPlayer, isHost: false }, 6000)
        .then((joined) => {
          if (joined) {
            setRoom(joined);
          } else {
            setJoinError(`لم يتم العثور على الغرفة (${code}). تأكد أن المضيف فاتح اللعبة حالياً.`);
          }
        })
        .catch(() => {
          setJoinError('تعذر الاتصال بالغرفة عبر الإنترنت.');
        })
        .finally(() => {
          setIsJoining(false);
        });
    }
  }, [searchParams, currentPlayer, profile.isGuest]);

  // 2. Real-time Subscription to active room
  useEffect(() => {
    if (!room?.roomId) return;
    const unsubscribe = subscribeToDuelRoom(room.roomId, (updated) => {
      setRoom(updated);
    });
    return () => unsubscribe();
  }, [room?.roomId]);

  // 3. Draft 15-second Countdown & Auto-pick on timeout (Online mode only)
  useEffect(() => {
    if (room?.status !== 'DRAFTING' || room.mode === 'local') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const updateTimer = () => {
      const remainingMs = Math.max(0, room.draft.turnExpiresAt - Date.now());
      const sec = Math.ceil(remainingMs / 1000);
      setTimeLeft(sec);

      // Auto-pick when timer hits 0
      if (remainingMs <= 0 && isMyTurn) {
        const pickedIds = new Set(room.draft.pickedGames.map((p: { gameId: string }) => p.gameId));
        const unpicked = TOURNAMENT_GAMES.filter((g) => !pickedIds.has(g.id));
        if (unpicked.length > 0) {
          const randomPick = unpicked[Math.floor(Math.random() * unpicked.length)]!;
          const updated = pickDraftGame(room, randomPick.id, mySide);
          setRoom(updated);
        }
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room, isMyTurn, mySide]);

  // 4. Auto-launch countdown for live round (Online mode only)
  useEffect(() => {
    if (room?.status !== 'PLAYING_ROUND' || room.mode === 'local') {
      setAutoLaunchCount(null);
      return;
    }
    const cur = room.rounds[room.currentRoundIndex];
    if (!cur || !cur.gameId) return;

    const mySubmitted = mySide === 'host'
      ? cur.hostTimeMs > 0 || cur.hostRawScore > 0
      : cur.guestTimeMs > 0 || cur.guestRawScore > 0;

    if (mySubmitted) {
      setAutoLaunchCount(null);
      return;
    }

    // 3-second automatic countdown into game
    setAutoLaunchCount(3);
    const interval = setInterval(() => {
      setAutoLaunchCount((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          router.push(
            `/play/${cur.gameId}/?mode=duel&roomId=${room.roomId}&round=${cur.roundOrder}&seed=${cur.seed}&player=${mySide}`
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.status, room?.mode, room?.currentRoundIndex, mySide, router]);

  // Action: Create Room
  const handleCreateRoom = () => {
    setJoinError(null);
    if (selectedMode === 'local') {
      const p1: DuelPlayer = {
        id: profile.isGuest ? 'local_p1' : profile.id,
        nickname: localP1Name.trim() || (profile.isGuest ? 'اللاعب 1' : profile.nickname),
        avatar: localP1Avatar,
        cityName: profile.cityName,
        isHost: true,
        isGuest: profile.isGuest,
      };
      const p2: DuelPlayer = {
        id: 'local_p2',
        nickname: localP2Name.trim() || 'اللاعب 2',
        avatar: localP2Avatar,
        cityName: 'المنافس',
        isHost: false,
        isGuest: true,
      };
      const newRoom = createDuelRoom('local', selectedSize, p1, undefined, p2);
      setRoom(newRoom);
      return;
    }

    if (profile.isGuest) {
      setJoinError('يجب تسجيل الدخول بحسابك أولاً لإنشاء غرفة تحدي أونلاين.');
      return;
    }
    const newRoom = createDuelRoom(selectedMode, selectedSize, currentPlayer);
    setRoom(newRoom);
  };

  // Action: Join Room
  const handleJoinRoom = async () => {
    setJoinError(null);
    const code = normalizeRoomCode(joinCodeInput);
    if (!code) {
      setJoinError('يرجى كتابة رمز الغرفة (مثال: LY-XXXX أو الكود المباشر)');
      return;
    }

    if (profile.isGuest) {
      setJoinError('يجب تسجيل الدخول بحسابك أولاً للمشاركة في بطولة التحدي الثنائي.');
      return;
    }

    setIsJoining(true);
    try {
      const joined = await joinDuelRoom(code, { ...currentPlayer, isHost: false }, 6000);
      if (joined) {
        setRoom(joined);
      } else {
        setJoinError(`لم يتم العثور على الغرفة (${code}). تأكد أن المضيف فاتح اللعبة حالياً.`);
      }
    } catch {
      setJoinError('تعذر الاتصال بالغرفة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsJoining(false);
    }
  };

  // Helper to generate the exact full URL with GitHub Pages basePath and trailing slash
  const getInviteUrl = () => {
    if (!room) return '';
    const origin = window.location.origin;
    const path = window.location.pathname;
    const basePrefix = path.includes('/FunnyGame') ? '/FunnyGame' : '';
    return `${origin}${basePrefix}/duel/?room=${room.roomId}`;
  };

  // Action: Copy Invite Link
  const handleCopyInvite = async () => {
    const url = getInviteUrl();
    if (!url) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // ignore
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Action: Share via Web Share API (WhatsApp, Messenger, etc.)
  const handleShareInvite = async () => {
    const url = getInviteUrl();
    if (!url || !room) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'تحدي ثنائي في FunnyGame! ⚔️',
          text: `تعال تحدااني في بطولة التحدي الثنائي 1v1! رمز الغرفة: ${room.roomId}`,
          url,
        });
        return;
      } catch {
        // Fallback to copy if dismissed or cancelled
      }
    }
    handleCopyInvite();
  };

  // Action: Pick Game during Draft
  const handleSelectGame = (gameId: string) => {
    if (!room) return;
    if (!isLocalMode && !isMyTurn) return;
    const pickerSide = isLocalMode ? room.draft.currentTurn : mySide;
    const updated = pickDraftGame(room, gameId, pickerSide);
    setRoom(updated);
  };

  // Action: Next Round
  const handleNextRound = () => {
    if (!room) return;
    const updated = advanceToNextRound(room);
    setRoom(updated);
  };

  // Action: Rematch
  const handleRematch = () => {
    if (!room) return;
    const updated = rematchDuelRoom(room);
    setRoom(updated);
  };

  // -------------------------------------------------------------
  // VIEW: LOBBY
  // -------------------------------------------------------------
  if (!room) {
    return (
      <main className="flex-1 flex flex-col p-4 select-none pb-24 max-w-[480px] w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-2 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <div>
              <h1 className="text-xl font-black text-white">بطولة التحدي الثنائي</h1>
              <p className="text-[11px] text-amber-300 font-bold">تحديات 1v1 • مرحلة الـ Draft • بذور موحدة</p>
            </div>
          </div>
          <Link href="/" className="text-xs text-slate-400 hover:text-white underline">
            الرئيسية ✖
          </Link>
        </div>

        {/* Hero Card */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-purple-950/40 to-slate-950 border-2 border-indigo-400/50 shadow-2xl mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px]">
                نظام البطولات الرسمي
              </span>
              <span className="text-xs text-slate-300 font-bold">تكافؤ 100% 🎯</span>
            </div>
            <h2 className="text-lg font-black text-white">تنافس مباشر وتكتيك اختيار الألعاب</h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              اختر ألعابك بالتناوب ضد خصمك، والعبا نفس الأسئلة والمفاجآت بالضبط لحصد كأس البطولة!
            </p>
          </div>
        </div>

        {/* Mode Selector (Online vs Local) */}
        <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => setSelectedMode('online')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
              selectedMode === 'online'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌐</span>
            <span>تحدي أونلاين (عن بُعد)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedMode('local')}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
              selectedMode === 'local'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📱</span>
            <span>تحدي محلي (نفس الجهاز)</span>
          </button>
        </div>

        {/* Local Mode: Player 1 & Player 2 Customization */}
        {selectedMode === 'local' && (
          <div className="space-y-3 mb-5">
            {/* Player 1 Card */}
            <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-500/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                  <span>🔵</span>
                  <span>اللاعب الأول</span>
                </span>
                <span className="text-xl">{localP1Avatar}</span>
              </div>
              <input
                type="text"
                value={localP1Name}
                onChange={(e) => setLocalP1Name(e.target.value)}
                placeholder="اسم اللاعب الأول"
                maxLength={20}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400 mb-2"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setLocalP1Avatar(av)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 transition-transform ${
                      localP1Avatar === av
                        ? 'bg-blue-500 border border-white scale-110 shadow-md'
                        : 'bg-slate-900 border border-white/10 hover:border-white/30'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Player 2 Card */}
            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                  <span>🔴</span>
                  <span>اللاعب الثاني</span>
                </span>
                <span className="text-xl">{localP2Avatar}</span>
              </div>
              <input
                type="text"
                value={localP2Name}
                onChange={(e) => setLocalP2Name(e.target.value)}
                placeholder="اسم اللاعب الثاني"
                maxLength={20}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400 mb-2"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setLocalP2Avatar(av)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 transition-transform ${
                      localP2Avatar === av
                        ? 'bg-rose-500 border border-white scale-110 shadow-md'
                        : 'bg-slate-900 border border-white/10 hover:border-white/30'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Online Mode for Guest Warning OR Full Lobby */}
        {selectedMode === 'online' && profile.isGuest ? (
          <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-amber-400/50 shadow-2xl text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/20 border border-amber-400 flex items-center justify-center text-3xl mb-3 animate-pulse">
              🔒
            </div>
            <div className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] inline-block mb-2">
              مخصص للمستخدمين المسجلين
            </div>
            <h3 className="text-base font-black text-white mb-1">التحدي أونلاين يتطلب حساباً</h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto mb-4">
              لحفظ نقاطك في صدارة الأبطال والتنافس عن بُعد مع أصدقائك، يرجى تسجيل الدخول. أو العب محلياً على نفس الجهاز بدون تسجيل!
            </p>

            <div className="flex flex-col gap-2">
              <Link
                href="/profile"
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>تسجيل الدخول / إنشاء حساب</span>
                <span>⚡</span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedMode('local')}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>التبديل للتحدي المحلي (بدون تسجيل) 📱</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Match Size Selector */}
            <div className="mb-6">
              <label className="text-xs font-black text-slate-300 block mb-2">
                اختر حجم المباراة (عدد الجولات):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { size: 2 as MatchSize, title: 'خاطف', sub: 'جولتان (~3 د)' },
                  { size: 4 as MatchSize, title: 'قياسي', sub: '4 جولات (~6 د)' },
                  { size: 6 as MatchSize, title: 'ملحمي', sub: '6 جولات (~10 د)' },
                ].map((item) => (
                  <button
                    key={item.size}
                    type="button"
                    onClick={() => setSelectedSize(item.size)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      selectedSize === item.size
                        ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                        : 'bg-slate-950/60 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`text-sm font-black ${
                        selectedSize === item.size ? 'text-amber-300' : 'text-white'
                      }`}
                    >
                      {item.title}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action: Create Match */}
            <button
              type="button"
              onClick={handleCreateRoom}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-2xl shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 mb-4 cursor-pointer"
            >
              <span className="text-xl">⚔️</span>
              <span>{selectedMode === 'online' ? 'إنشاء غرفة تحدي جديدة' : 'بدء التحدي المحلي الآن'}</span>
            </button>

            {selectedMode === 'local' && (
              <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-[11px] font-bold text-amber-200 text-center leading-relaxed mb-6">
                📱 سيلعب كلاكما على نفس الجهاز بالتناوب (Pass & Play) بدون مؤقت ضاغط وبنفس الأسئلة والمفاجآت بالضبط!
              </div>
            )}

            {/* Online Room Join Section */}
            {selectedMode === 'online' && (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
                <h3 className="text-xs font-black text-slate-200 mb-2 flex items-center gap-1.5">
                  <span>🔑</span>
                  <span>عندك كود دعوة من صاحبك؟</span>
                </h3>
                {isJoining && (
                  <div className="p-2.5 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                    <span className="animate-spin text-base">⏳</span>
                    <span>جاري الاتصال بالغرفة عبر السيرفر...</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="LY-XXXX أو الكود المباشر"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    maxLength={30}
                    disabled={isJoining}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-center text-sm font-black text-amber-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 uppercase tracking-widest disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleJoinRoom}
                    disabled={isJoining}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl border border-white/10 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isJoining ? 'جاري الاتصال...' : 'انضمام'}
                  </button>
                </div>
                {joinError && (
                  <p className="text-[11px] font-bold text-rose-400 mt-2 text-center">{joinError}</p>
                )}
              </div>
            )}
          </>
        )}

        <BottomNav />
      </main>
    );
  }

  // -------------------------------------------------------------
  // VIEW: WAITING FOR OPPONENT (Online)
  // -------------------------------------------------------------
  if (room.status === 'WAITING_FOR_OPPONENT') {
    return (
      <main className="flex-1 flex flex-col p-4 select-none pb-24 max-w-[480px] w-full mx-auto justify-between min-h-screen">
        <div>
          <div className="flex items-center justify-between py-2 border-b border-white/10 mb-6">
            <span className="text-xs font-black text-amber-300">غرفة التحدي • {room.matchSize} جولات</span>
            <button
              onClick={() => setRoom(null)}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              إلغاء الغرفة ✖
            </button>
          </div>

          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-400/20 border-2 border-amber-400/50 flex items-center justify-center text-4xl mb-4 animate-pulse">
              ⏳
            </div>
            <h2 className="text-xl font-black text-white">في انتظار انضمام الخصم...</h2>
            <p className="text-xs text-slate-400 mt-1">شارك الكود أو الرابط مع منافسك لبدء مرحلة الـ Draft فوراً</p>
          </div>

          {/* Room Code Card */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-amber-400/60 shadow-2xl text-center mb-6">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              رمز الغرفة الرسمي
            </div>
            <div className="text-4xl font-black text-amber-300 tracking-wider font-mono my-2 select-all">
              {room.roomId}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                onClick={handleShareInvite}
                className="py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>📲</span>
                <span>مشاركة الرابط</span>
              </button>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{isCopied ? 'تم النسخ! ✅' : 'نسخ الرابط 🔗'}</span>
              </button>
            </div>
          </div>

          {/* Host identity */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{room.host.avatar}</span>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>{room.host.nickname}</span>
                  <span className="px-1.5 py-0.2 bg-blue-500 text-white text-[9px] font-black rounded-md">
                    المضيف 🔵
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">جاهز في انتظار الطرف الثاني</div>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-400">متصل 🟢</span>
          </div>
        </div>

        <BottomNav />
      </main>
    );
  }

  // -------------------------------------------------------------
  // VIEW: DRAFT PHASE
  // -------------------------------------------------------------
  if (room.status === 'DRAFTING') {
    const pickedIds = new Set(room.draft.pickedGames.map((p: { gameId: string }) => p.gameId));
    const currentRoundNum = room.draft.turnIndex + 1;
    const isHostTurn = room.draft.currentTurn === 'host';
    const activePlayerName = isHostTurn ? room.host.nickname : (room.guest?.nickname || 'اللاعب 2');

    return (
      <main className="flex-1 flex flex-col p-4 select-none pb-28 max-w-[480px] w-full mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between py-2 border-b border-white/10 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
              Draft Phase
            </span>
            <span className="text-xs text-white font-black">
              الجولة {currentRoundNum} من {room.matchSize}
            </span>
          </div>
          <div className="text-xs font-mono font-black text-amber-300">
            الغرفة: {room.roomId}
          </div>
        </div>

        {/* Turn & Timer Banner */}
        <div
          className={`p-3.5 rounded-2xl border-2 mb-4 flex items-center justify-between transition-all shadow-lg ${
            isLocalMode
              ? isHostTurn
                ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.25)]'
                : 'bg-rose-500/20 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
              : isMyTurn
              ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
              : 'bg-slate-900/70 border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{isLocalMode ? (isHostTurn ? '🔵' : '🔴') : isMyTurn ? '🎯' : '⏳'}</span>
            <div>
              <div
                className={`text-xs font-black ${
                  isLocalMode
                    ? isHostTurn ? 'text-blue-300' : 'text-rose-300'
                    : isMyTurn ? 'text-amber-300' : 'text-slate-300'
                }`}
              >
                {isLocalMode
                  ? `دور ${activePlayerName} للاختيار`
                  : isMyTurn
                  ? 'دورك الآن للاختيار!'
                  : `دور ${activePlayerName} يختار...`}
              </div>
              <div className="text-[10px] text-slate-400">
                {isHostTurn ? 'اختيار اللاعب الأزرق 🔵' : 'اختيار اللاعب الأحمر 🔴'}
              </div>
            </div>
          </div>

          {/* Animated 15s Timer OR Local No-Timer Badge */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-white/10">
            {isLocalMode ? (
              <span className="text-[11px] text-amber-300 font-bold">بدون وقت ⏱️</span>
            ) : (
              <>
                <span className="text-[11px] text-slate-400 font-bold">المتبقي:</span>
                <span
                  className={`text-base font-black font-mono tabular-nums ${
                    timeLeft <= 5 ? 'text-rose-400 animate-ping' : 'text-amber-300'
                  }`}
                >
                  {timeLeft}s
                </span>
              </>
            )}
          </div>
        </div>

        {/* 13 Games Selection Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {TOURNAMENT_GAMES.map((game) => {
            const isPicked = pickedIds.has(game.id);
            const pickRecord = room.draft.pickedGames.find((p: { gameId: string }) => p.gameId === game.id);

            return (
              <button
                key={game.id}
                type="button"
                disabled={isPicked || !canPick}
                onClick={() => handleSelectGame(game.id)}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between relative overflow-hidden ${
                  isPicked
                    ? pickRecord?.pickedBy === 'host'
                      ? 'bg-blue-950/40 border-blue-500/60 opacity-80 cursor-not-allowed'
                      : 'bg-rose-950/40 border-rose-500/60 opacity-80 cursor-not-allowed'
                    : canPick
                    ? 'bg-slate-900/90 border-white/15 hover:border-amber-400 active:scale-95 cursor-pointer shadow-md'
                    : 'bg-slate-950/40 border-white/10 opacity-70 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xl">{game.icon}</span>
                    {isPicked ? (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                          pickRecord?.pickedBy === 'host'
                            ? 'bg-blue-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {pickRecord?.pickedBy === 'host' ? 'الأزرق 🔵' : 'الأحمر 🔴'}
                      </span>
                    ) : (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${game.badgeColor}`}>
                        متاح
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-black text-white">{game.title}</h4>
                </div>
                <div className="text-[10px] text-slate-400 mt-2">{game.ability}</div>
              </button>
            );
          })}
        </div>

        {/* Bottom Duel Draft Tray */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-slate-950/95 backdrop-blur-md border-t border-white/15 p-3 z-50">
          <div className="flex justify-between items-center text-[10px] font-black text-slate-400 mb-1.5">
            <span className="text-blue-400">🔵 {room.host.nickname}</span>
            <span>الخيارات المثبتة</span>
            <span className="text-rose-400">🔴 {room.guest?.nickname || 'الخصم'}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Host picks */}
            <div className="flex-1 flex gap-1 justify-start">
              {room.draft.pickedGames
                .filter((p: { pickedBy: PlayerSide }) => p.pickedBy === 'host')
                .map((p: { gameId: string }) => {
                  const g = TOURNAMENT_GAMES.find((item) => item.id === p.gameId);
                  return (
                    <span
                      key={p.gameId}
                      className="px-2 py-1 rounded-lg bg-blue-500/20 border border-blue-400 text-blue-200 text-xs font-black flex items-center gap-1"
                    >
                      <span>{g?.icon}</span>
                      <span className="text-[10px] truncate max-w-[60px]">{g?.title}</span>
                    </span>
                  );
                })}
            </div>

            <span className="text-xs font-black text-slate-500">VS</span>

            {/* Guest picks */}
            <div className="flex-1 flex gap-1 justify-end">
              {room.draft.pickedGames
                .filter((p: { pickedBy: PlayerSide }) => p.pickedBy === 'guest')
                .map((p: { gameId: string }) => {
                  const g = TOURNAMENT_GAMES.find((item) => item.id === p.gameId);
                  return (
                    <span
                      key={p.gameId}
                      className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-400 text-rose-200 text-xs font-black flex items-center gap-1"
                    >
                      <span className="text-[10px] truncate max-w-[60px]">{g?.title}</span>
                      <span>{g?.icon}</span>
                    </span>
                  );
                })}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // VIEW: PLAYING ROUND LAUNCHER
  // -------------------------------------------------------------
  if (room.status === 'PLAYING_ROUND') {
    const curRound = room.rounds[room.currentRoundIndex];
    const game = TOURNAMENT_GAMES.find((g) => g.id === curRound?.gameId);
    const pickerName = curRound?.pickedBy === 'host' ? room.host.nickname : (room.guest?.nickname || 'الخصم');

    // ==========================================
    // LOCAL CHALLENGE: TRUE PASS & PLAY FLOW
    // ==========================================
    if (room.mode === 'local') {
      const hasHostPlayed = (curRound?.hostTimeMs ?? 0) > 0 || (curRound?.hostRawScore ?? 0) > 0;
      const hasGuestPlayed = (curRound?.guestTimeMs ?? 0) > 0 || (curRound?.guestRawScore ?? 0) > 0;

      // STEP 2: Player 1 has played, Player 2 has NOT yet -> Handover Screen!
      if (hasHostPlayed && !hasGuestPlayed) {
        const p2PlayUrl = curRound
          ? `/play/${curRound.gameId}/?mode=duel&roomId=${room.roomId}&round=${curRound.roundOrder}&seed=${curRound.seed}&player=guest`
          : '';

        return (
          <main className="flex-1 flex flex-col p-4 select-none pb-24 max-w-[480px] w-full mx-auto justify-between min-h-screen">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
                <span className="text-xs font-black text-amber-300">
                  الجولة {room.currentRoundIndex + 1} من {room.matchSize} • التحدي المحلي 📱
                </span>
                <span className="text-xs text-slate-400 font-mono">الغرفة: {room.roomId}</span>
              </div>

              {/* Handover Hero Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-950/60 via-slate-900 to-amber-950/40 border-2 border-rose-400 shadow-2xl text-center mb-5 relative overflow-hidden">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-4xl mb-3 shadow-[0_0_25px_rgba(244,63,94,0.3)] animate-pulse">
                  📱
                </div>
                <div className="px-3 py-1 rounded-full bg-rose-500 text-white font-black text-xs inline-block mb-3">
                  حان وقت التبديل!
                </div>
                <h2 className="text-2xl font-black text-white mb-1">
                  سلم الهاتف لـ {room.guest?.nickname || 'اللاعب 2'} 🔴
                </h2>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  أنهى <span className="font-black text-blue-400">{room.host.nickname} 🔵</span> دوره وسجل نتيجته، والآن الدور عليك!
                </p>

                {/* Score to Beat */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 mb-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    السكور المطلوب كسره 🎯
                  </div>
                  <div className="text-3xl font-black text-amber-300 font-mono">
                    {curRound?.hostRawScore.toLocaleString()} <span className="text-xs text-slate-400 font-normal">نقطة</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    الوقت المستغرق: {((curRound?.hostTimeMs ?? 0) / 1000).toFixed(1)} ثانية
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs font-bold text-amber-200 leading-relaxed mb-1">
                  💡 ستلعب نفس أسئلة ومفاجآت الجولة بالضبط وبنفس البذرة الموحدة #{curRound?.seed}، الفائز بالجولة يكسب +200 نقطة بونص!
                </div>
              </div>

              {/* Action Button: Start Player 2 turn */}
              {p2PlayUrl ? (
                <Link
                  href={p2PlayUrl}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black text-base rounded-2xl shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>جاهز يا {room.guest?.nickname || 'اللاعب 2'} 🔴! ابدأ التحدي</span>
                  <span className="text-lg">⚡</span>
                </Link>
              ) : null}
            </div>

            <BottomNav />
          </main>
        );
      }

      // STEP 1: Neither player has played yet (Player 1's turn)
      const p1PlayUrl = curRound
        ? `/play/${curRound.gameId}/?mode=duel&roomId=${room.roomId}&round=${curRound.roundOrder}&seed=${curRound.seed}&player=host`
        : '';

      return (
        <main className="flex-1 flex flex-col p-4 select-none pb-24 max-w-[480px] w-full mx-auto justify-between min-h-screen">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
              <span className="text-xs font-black text-amber-300">
                الجولة {room.currentRoundIndex + 1} من {room.matchSize} • التحدي المحلي 📱
              </span>
              <span className="text-xs text-slate-400 font-mono">الغرفة: {room.roomId}</span>
            </div>

            {/* Game Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-950/50 via-slate-900 to-slate-950 border-2 border-blue-400/60 shadow-2xl text-center mb-5">
              <div className="text-5xl mb-3 animate-bounce">{game?.icon || '🎮'}</div>
              <div className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">
                اختيار: {pickerName} {curRound?.pickedBy === 'host' ? '🔵' : '🔴'}
              </div>
              <h2 className="text-2xl font-black text-white mb-1">{game?.title}</h2>
              <p className="text-xs text-slate-300 mb-4">{game?.ability}</p>

              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-400/30 text-blue-200 text-xs font-bold mb-4">
                دور <span className="font-black text-white">{room.host.nickname} 🔵</span> يبدأ باللعب أولاً على هذا الجهاز
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-around text-xs text-slate-300">
                <div>
                  <div className="text-[10px] text-slate-400">بذرة موحدة</div>
                  <div className="font-mono font-black text-amber-300">#{curRound?.seed}</div>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div>
                  <div className="text-[10px] text-slate-400">بونص الفوز</div>
                  <div className="font-black text-emerald-400">+200 نقطة</div>
                </div>
              </div>
            </div>

            {/* Action Button: Start Player 1 turn */}
            {p1PlayUrl ? (
              <Link
                href={p1PlayUrl}
                className="w-full py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>ابدأ دور {room.host.nickname} 🔵</span>
                <span className="text-lg">⚡</span>
              </Link>
            ) : null}
          </div>

          <BottomNav />
        </main>
      );
    }

    // ==========================================
    // ONLINE CHALLENGE: SIMULTANEOUS RUN
    // ==========================================
    const targetPlayUrl = curRound
      ? `/play/${curRound.gameId}/?mode=duel&roomId=${room.roomId}&round=${curRound.roundOrder}&seed=${curRound.seed}&player=${mySide}`
      : '';

    const myScoreSubmitted = curRound
      ? mySide === 'host'
        ? curRound.hostTimeMs > 0 || curRound.hostRawScore > 0
        : curRound.guestTimeMs > 0 || curRound.guestRawScore > 0
      : false;

    const myScore = curRound
      ? mySide === 'host'
        ? curRound.hostRawScore
        : curRound.guestRawScore
      : 0;

    const opponentName = isHost ? (room.guest?.nickname || 'الخصم') : room.host.nickname;

    return (
      <main className="flex-1 flex flex-col p-4 select-none pb-24 max-w-[480px] w-full mx-auto justify-between min-h-screen">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between py-2 border-b border-white/10 mb-5">
            <span className="text-xs font-black text-amber-300">
              الجولة {room.currentRoundIndex + 1} من {room.matchSize}
            </span>
            <span className="text-xs text-slate-400 font-mono">الغرفة: {room.roomId}</span>
          </div>

          {/* If current player already finished their round, show waiting for opponent */}
          {myScoreSubmitted ? (
            <div className="p-6 rounded-3xl bg-slate-900/90 border-2 border-emerald-400/50 shadow-2xl text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-400/20 border border-emerald-400 flex items-center justify-center text-4xl mb-3 animate-pulse">
                ✅
              </div>
              <h2 className="text-xl font-black text-white mb-1">أنهيت جولتك بنجاح!</h2>
              <div className="text-3xl font-black text-emerald-300 font-mono my-2">
                {myScore.toLocaleString()} <span className="text-xs text-slate-400 font-normal">نقطة</span>
              </div>
              <div className="p-3.5 mt-3 rounded-2xl bg-slate-950/70 border border-amber-400/30 text-xs text-amber-300 font-bold flex items-center justify-center gap-2 animate-pulse">
                <span>⏳</span>
                <span>في انتظار إنهاء {opponentName} لجولته...</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                متصل بالسيرفر • ستظهر مقارنة النتائج تلقائياً فور انتهائه.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (room) {
                    broadcastDuelRoom(room);
                  }
                }}
                className="mt-3.5 px-4 py-2 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 mx-auto transition-all cursor-pointer shadow-md active:scale-95"
              >
                <span>تحديث ومزامنة فورية 🔄</span>
              </button>
            </div>
          ) : (
            <>
              {/* Round Card & Auto Launcher */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 border-2 border-amber-400/60 shadow-2xl text-center mb-6">
                <div className="text-5xl mb-3 animate-bounce">{game?.icon || '🎮'}</div>
                <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest mb-1">
                  اختيار: {pickerName} {curRound?.pickedBy === 'host' ? '🔵' : '🔴'}
                </div>
                <h2 className="text-2xl font-black text-white mb-1">{game?.title}</h2>
                <p className="text-xs text-slate-300 mb-4">{game?.ability}</p>

                {autoLaunchCount !== null && autoLaunchCount > 0 && (
                  <div className="mb-4 p-2.5 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black text-xs animate-pulse">
                    ⚡ الانطلاق التلقائي المباشر خلال {autoLaunchCount} ثوانٍ...
                  </div>
                )}

                <div className="pt-4 border-t border-white/10 flex items-center justify-around text-xs text-slate-300">
                  <div>
                    <div className="text-[10px] text-slate-400">بذرة موحدة</div>
                    <div className="font-mono font-black text-amber-300">#{curRound?.seed}</div>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div>
                    <div className="text-[10px] text-slate-400">بونص الفوز</div>
                    <div className="font-black text-emerald-400">+200 نقطة</div>
                  </div>
                </div>
              </div>

              {/* Direct Launch Button */}
              {targetPlayUrl && (
                <Link
                  href={targetPlayUrl}
                  className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 mb-4 cursor-pointer"
                >
                  <span>خوض الجولة بالبذرة الموحدة ⚡</span>
                  <span>◀</span>
                </Link>
              )}
            </>
          )}
        </div>

        <BottomNav />
      </main>
    );
  }

  // -------------------------------------------------------------
  // VIEW: ROUND RESULT MODAL / TRANSITION
  // -------------------------------------------------------------
  if (room.status === 'ROUND_RESULT') {
    const curRound = room.rounds[room.currentRoundIndex];
    const game = TOURNAMENT_GAMES.find((g) => g.id === curRound?.gameId);
    const isFinalRound = room.currentRoundIndex + 1 >= room.matchSize;

    const hostTotalNorm = curRound ? curRound.hostNormScore + curRound.hostBonusScore : 0;
    const guestTotalNorm = curRound ? curRound.guestNormScore + curRound.guestBonusScore : 0;

    return (
      <main className="flex-1 flex flex-col p-4 select-none pb-24 max-w-[480px] w-full mx-auto justify-between min-h-screen">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
            <span className="text-xs font-black text-amber-300">
              نتيجة الجولة {room.currentRoundIndex + 1} • {game?.title}
            </span>
            <span className="text-xs text-slate-400 font-mono">الغرفة: {room.roomId}</span>
          </div>

          {/* Comparative Head-to-Head Card */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-amber-400/50 shadow-2xl mb-4">
            <div className="text-center mb-3">
              <span className="text-3xl">{game?.icon}</span>
              <h3 className="text-base font-black text-white mt-1">{game?.title}</h3>
              <div className="text-[10px] text-slate-400 font-bold">
                اختيار: {curRound?.pickedBy === 'host' ? room.host.nickname : (room.guest?.nickname || 'الخصم')}
              </div>
            </div>

            {/* Side-by-side Score Matrix */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
              {/* Host Box */}
              <div
                className={`p-3 rounded-2xl border text-center ${
                  curRound?.winner === 'host'
                    ? 'bg-blue-500/20 border-blue-400 shadow-md'
                    : 'bg-slate-950/60 border-white/10'
                }`}
              >
                <div className="text-xs font-black text-blue-400 flex items-center justify-center gap-1 mb-1">
                  <span>🔵 {room.host.nickname}</span>
                  {curRound?.winner === 'host' && <span>👑</span>}
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {hostTotalNorm}
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">
                  خام: {curRound?.hostRawScore.toLocaleString()}
                </div>
                {curRound?.hostBonusScore ? (
                  <div className="text-[9px] font-black text-emerald-400 mt-0.5">
                    +{curRound.hostBonusScore} بونص فوز
                  </div>
                ) : null}
              </div>

              {/* Guest Box */}
              <div
                className={`p-3 rounded-2xl border text-center ${
                  curRound?.winner === 'guest'
                    ? 'bg-rose-500/20 border-rose-400 shadow-md'
                    : 'bg-slate-950/60 border-white/10'
                }`}
              >
                <div className="text-xs font-black text-rose-400 flex items-center justify-center gap-1 mb-1">
                  <span>🔴 {room.guest?.nickname || 'الخصم'}</span>
                  {curRound?.winner === 'guest' && <span>👑</span>}
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {guestTotalNorm}
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">
                  خام: {curRound?.guestRawScore.toLocaleString()}
                </div>
                {curRound?.guestBonusScore ? (
                  <div className="text-[9px] font-black text-emerald-400 mt-0.5">
                    +{curRound.guestBonusScore} بونص فوز
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Libyan Banter Commentary */}
          {curRound?.banterText && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/60 mb-5 flex items-start gap-2.5">
              <span className="text-xl">💬</span>
              <p className="text-xs font-bold text-amber-200 leading-relaxed">
                {curRound.banterText}
              </p>
            </div>
          )}

          {/* Action: Next Round or Podium */}
          <button
            type="button"
            onClick={handleNextRound}
            className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isFinalRound ? 'عرض التتويج النهائي والكأس 🏆' : 'الانتقال للجولة التالية ◀'}</span>
          </button>
        </div>

        <BottomNav />
      </main>
    );
  }

  // -------------------------------------------------------------
  // VIEW: FINAL VICTORY PODIUM & REMATCH
  // -------------------------------------------------------------
  if (room.status === 'COMPLETED' && room.summary) {
    const { summary } = room;
    const isHostWon = summary.winner === 'host';
    const winnerName = isHostWon ? room.host.nickname : (room.guest?.nickname || 'الخصم');
    const winnerAvatar = isHostWon ? room.host.avatar : (room.guest?.avatar || '⚡');

    return (
      <main className="flex-1 flex flex-col p-4 select-none pb-24 max-w-[480px] w-full mx-auto justify-between min-h-screen">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
            <span className="text-xs font-black text-amber-300">منصة التتويج الرسمية 🏆</span>
            <span className="text-xs text-slate-400 font-mono">الغرفة: {room.roomId}</span>
          </div>

          {/* 3D-styled Victory Podium */}
          <div className="py-6 px-4 rounded-3xl bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border-2 border-amber-400/70 shadow-2xl text-center mb-5 relative overflow-hidden">
            <div className="text-6xl mb-2 animate-bounce">🏆</div>
            <div className="text-3xl mb-1">{winnerAvatar}</div>
            <div className="text-xs font-black text-amber-300 uppercase tracking-widest">
              بطل التحدي الثنائي
            </div>
            <h2 className="text-2xl font-black text-white mt-0.5">{winnerName}</h2>

            {/* Banter Announcement */}
            <p className="text-xs font-bold text-amber-200 mt-2 px-4 leading-relaxed">
              {summary.banterText}
            </p>

            {/* Total Score Comparison */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-around">
              <div>
                <div className="text-[10px] text-blue-400 font-black">🔵 {room.host.nickname}</div>
                <div className="text-2xl font-black text-white font-mono mt-0.5">
                  {summary.hostTotalScore.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-bold">
                  {summary.hostRoundWins} جولات رابحة
                </div>
              </div>

              <div className="text-xs font-black text-slate-500">VS</div>

              <div>
                <div className="text-[10px] text-rose-400 font-black">
                  🔴 {room.guest?.nickname || 'الخصم'}
                </div>
                <div className="text-2xl font-black text-white font-mono mt-0.5">
                  {summary.guestTotalScore.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-bold">
                  {summary.guestRoundWins} جولات رابحة
                </div>
              </div>
            </div>
          </div>

          {/* Rounds Breakdown Table */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 mb-5">
            <h4 className="text-xs font-black text-slate-300 mb-2">تفاصيل جولات المباراة:</h4>
            <div className="flex flex-col gap-1.5">
              {room.rounds.map((r: DuelRoundResult) => {
                const g = TOURNAMENT_GAMES.find((item) => item.id === r.gameId);
                const hostTotal = r.hostNormScore + r.hostBonusScore;
                const guestTotal = r.guestNormScore + r.guestBonusScore;

                return (
                  <div
                    key={r.roundOrder}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span>{g?.icon}</span>
                      <span className="font-bold text-white">{g?.title}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono font-black text-[11px]">
                      <span className={r.winner === 'host' ? 'text-blue-400 font-bold' : 'text-slate-400'}>
                        {hostTotal}
                      </span>
                      <span className="text-slate-600">:</span>
                      <span className={r.winner === 'guest' ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {guestTotal}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rematch Button */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleRematch}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>طلب رد الاعتبار (Rematch) ⚔️</span>
            </button>
            <button
              type="button"
              onClick={() => setRoom(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
            >
              العودة للوبي التحديات 🏠
            </button>
          </div>
        </div>

        <BottomNav />
      </main>
    );
  }

  return null;
}

export default function DuelTournamentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-300 font-black p-4">
          جاري تحميل بطولة التحدي... ⚔️
        </div>
      }
    >
      <DuelTournamentContent />
    </Suspense>
  );
}
