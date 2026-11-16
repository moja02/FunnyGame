'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  clientRegistry,
  createRng,
  calculateQuestionScore,
  type Rng,
  type Question,
  type Verdict,
  type PlayerAnswerRecord,
  type GameModule,
  type GameViewProps
} from '@funnygame/game-core';
import {
  Hud,
  TimerBar,
  ComboMeter,
  StageBanner,
  ResultScreen,
  sound,
  haptics
} from '@funnygame/ui';
import '@funnygame/game-color-trap';
import '@funnygame/game-dont-tap';
import '@funnygame/game-odd-one-out';

interface PlayClientProps {
  gameId: string;
}

export default function PlayClient({ gameId }: PlayClientProps) {
  const router = useRouter();
  const { profile, user } = useAuth();

  // Retrieve game module from client registry
  const [module, setModule] = useState<GameModule<any, any> | undefined>(undefined);

  useEffect(() => {
    const mod = clientRegistry.get(gameId);
    setModule(mod);
  }, [gameId]);

  // Round lifecycle state
  const [gameState, setGameState] = useState<'briefing' | 'countdown' | 'playing' | 'gameover'>('briefing');
  const [countdownNum, setCountdownNum] = useState(3);

  // Live round metrics
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [stage, setStage] = useState(1);
  const [combo, setCombo] = useState(0);
  const [personalBest, setPersonalBest] = useState(0);

  // Current question & timer
  const [currentQuestion, setCurrentQuestion] = useState<Question<any> | null>(null);
  const [timeLimitMs, setTimeLimitMs] = useState(3000);
  const [remainingMs, setRemainingMs] = useState(3000);
  const [isLocked, setIsLocked] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<Verdict | null>(null);

  // Refs for deterministic state & loop control
  const rngRef = useRef<Rng | null>(null);
  const seedRef = useRef<number>(12345);
  const runIdRef = useRef<string>('');
  const startedAtRef = useRef<number>(0);
  const answersRef = useRef<PlayerAnswerRecord<any>[]>([]);
  const correctCountRef = useRef(0);
  const qIndexRef = useRef(0);
  const streakRef = useRef(0);
  const questionStartTimeRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Synchronized refs for stale-free loop execution
  const heartsRef = useRef(3);
  const scoreRef = useRef(0);
  const stageRef = useRef(1);
  const currentQuestionRef = useRef<Question<any> | null>(null);
  const isLockedRef = useRef(false);
  const handleAnswerRef = useRef<(answer: any | null) => void>(() => {});

  // Load personal best on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`fg_pb_${gameId}`);
      if (stored) {
        setPersonalBest(Number(stored));
      }
    }
  }, [gameId]);

  // Stop timer animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Submit verified run to server
  const submitRun = useCallback(async (finalScore: number) => {
    const submittedAt = Date.now();

    // Update local personal best
    if (finalScore > personalBest) {
      setPersonalBest(finalScore);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`fg_pb_${gameId}`, finalScore.toString());
      }
    }

    // Submit verified run to server if registered cloud user
    const activeUserId = user?.id || (profile.isGuest ? null : profile.id);
    if (!profile.isGuest && activeUserId) {
      // 1. Try server API route (when running with Next server)
      try {
        await fetch('/api/runs/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: runIdRef.current || `local_${Date.now()}`,
            gameId,
            seed: seedRef.current,
            answers: answersRef.current,
            startedAt: startedAtRef.current,
            submittedAt
          })
        });
      } catch {
        // Expected when statically hosted on GitHub Pages
      }

      // 2. Direct Supabase sync (for static GitHub Pages hosting)
      const supabase = getSupabaseBrowserClient();

      // ALWAYS update profiles with high score in wins column and total games count
      try {
        const { data: currentProf } = await supabase
          .from('profiles')
          .select('total_games, wins')
          .eq('id', activeUserId)
          .maybeSingle();

        const currentTotal = Number(currentProf?.total_games || 0);
        const currentBest = Number(currentProf?.wins || 0);
        const newBest = Math.max(currentBest, finalScore);

        await supabase
          .from('profiles')
          .update({
            total_games: currentTotal + 1,
            wins: newBest,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeUserId);
      } catch (profErr) {
        console.warn('Profile score sync notice:', profErr);
      }

      // Also record to game_runs table
      try {
        const { error: fullErr } = await supabase.from('game_runs').insert({
          user_id: activeUserId,
          game_id: gameId,
          mode: 'free',
          seed: seedRef.current,
          score: finalScore,
          stage_reached: stageRef.current,
          answers_json: answersRef.current,
          validated: true,
        });

        // Fallback to essential columns existing in current schema if new columns not yet migrated
        if (fullErr) {
          await supabase.from('game_runs').insert({
            user_id: activeUserId,
            game_id: gameId,
            score: finalScore,
            stage_reached: stageRef.current,
          });
        }
      } catch (err) {
        console.warn('game_runs insert notice:', err);
      }
    }
  }, [gameId, personalBest, profile.id, profile.isGuest, user?.id]);

  // Load and present next question
  const loadQuestion = useCallback(() => {
    if (!module || !rngRef.current) return;

    const logic = module.logic;
    const currentCorrect = correctCountRef.current;
    const currentStage = 1 + Math.floor(currentCorrect / logic.questionsPerStage);
    stageRef.current = currentStage;
    setStage(currentStage);

    const cfg = logic.stageConfig(currentStage);
    const q = logic.generate(rngRef.current, cfg, qIndexRef.current);

    currentQuestionRef.current = q;
    setCurrentQuestion(q);
    setTimeLimitMs(q.timeLimitMs);
    setRemainingMs(q.timeLimitMs);
    setLastVerdict(null);
    isLockedRef.current = false;
    setIsLocked(false);

    const now = Date.now();
    questionStartTimeRef.current = now;

    // Start requestAnimationFrame timer
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const duration = q.timeLimitMs;
    const tick = () => {
      const elapsed = Date.now() - now;
      const left = Math.max(0, duration - elapsed);
      setRemainingMs(left);

      if (left <= 0) {
        // Timeout reached! Deduct heart & feedback
        if (!isLockedRef.current) {
          handleAnswerRef.current(null);
        }
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [module]);

  // Answer handler
  const handleAnswer = useCallback((answer: any | null) => {
    const q = currentQuestionRef.current;
    if (!module || !q) return;

    const logic = module.logic;
    const isContinuous = !!(logic as any).isContinuous;

    if (!isContinuous && isLockedRef.current) return;

    if (!isContinuous) {
      isLockedRef.current = true;
      setIsLocked(true);

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }

    const now = Date.now();
    const reactionTimeMs = Math.min(
      q.timeLimitMs,
      Math.max(10, now - questionStartTimeRef.current)
    );

    // Record answer
    answersRef.current.push({
      questionIndex: q.index,
      stage: stageRef.current,
      answer,
      reactionTimeMs,
      clientTimestamp: now
    });

    const verdict = logic.evaluate(q, answer);
    setLastVerdict(verdict);

    if (verdict.correct) {
      sound.correct();
      haptics.light();
      correctCountRef.current += 1;
      streakRef.current += 1;
      setCombo(streakRef.current);

      const remMs = Math.max(0, q.timeLimitMs - reactionTimeMs);
      let earned = 0;
      if (typeof (logic as any).calculatePoints === 'function') {
        earned = (logic as any).calculatePoints(q, answer, reactionTimeMs, streakRef.current);
      } else {
        earned = calculateQuestionScore(
          logic.basePoints,
          stageRef.current,
          remMs,
          q.timeLimitMs,
          streakRef.current
        );
      }
      scoreRef.current += earned;
      setScore(scoreRef.current);

      // Check if stage should advance in continuous games
      if (isContinuous) {
        const nextStage = 1 + Math.floor(correctCountRef.current / logic.questionsPerStage);
        if (nextStage > stageRef.current) {
          stageRef.current = nextStage;
          setStage(nextStage);
          sound.levelUp();
          loadQuestion();
        }
      }
    } else {
      // Wrong answer OR timeout
      sound.wrong();
      haptics.error();

      if (verdict.breaksCombo) {
        streakRef.current = 0;
        setCombo(0);
      }

      if (verdict.heartCost > 0) {
        heartsRef.current = Math.max(0, heartsRef.current - verdict.heartCost);
        setHearts(heartsRef.current);
      }
    }

    // In continuous action games, don't unmount or freeze view between hits
    if (isContinuous) {
      if (heartsRef.current <= 0) {
        sound.gameOver();
        setGameState('gameover');
        submitRun(scoreRef.current);
      }
      return;
    }

    // Step to next question or trigger gameover for turn-based games
    setTimeout(() => {
      if (heartsRef.current <= 0) {
        sound.gameOver();
        setGameState('gameover');
        submitRun(scoreRef.current);
      } else {
        qIndexRef.current += 1;
        loadQuestion();
      }
    }, 220);
  }, [module, submitRun, loadQuestion]);

  // Keep ref synchronized
  useEffect(() => {
    handleAnswerRef.current = handleAnswer;
  }, [handleAnswer]);

  // Initiate new game
  const handleStartGame = async () => {
    // Reset metrics
    scoreRef.current = 0;
    setScore(0);
    heartsRef.current = 3;
    setHearts(3);
    stageRef.current = 1;
    setStage(1);
    streakRef.current = 0;
    setCombo(0);
    isLockedRef.current = false;
    setIsLocked(false);
    setLastVerdict(null);
    answersRef.current = [];
    correctCountRef.current = 0;
    qIndexRef.current = 0;

    // Fetch start seed from server if registered, otherwise play seamlessly offline
    let generatedSeed = Math.floor(Math.random() * 2147483647) + 1;
    let runId = `local_${Date.now()}`;
    const startedAt = Date.now();

    if (!profile.isGuest && user?.id) {
      try {
        const res = await fetch('/api/runs/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId,
            userId: user.id,
            mode: 'free'
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.seed) generatedSeed = data.seed;
          if (data.runId) runId = data.runId;
        }
      } catch {
        // Offline fallback
      }
    }

    seedRef.current = generatedSeed;
    runIdRef.current = runId;
    startedAtRef.current = startedAt;
    rngRef.current = createRng(generatedSeed);

    // 3, 2, 1 Countdown
    setGameState('countdown');
    setCountdownNum(3);
    sound.countdown();

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNum(count);
        sound.countdown();
      } else {
        clearInterval(interval);
        setGameState('playing');
        loadQuestion();
      }
    }, 600);
  };

  // Select taunt based on performance
  const getTaunt = (): string => {
    if (!module?.content) {
      return 'محاولة باهية، لكن عقلك يبي شوية تسخين! عاود وجيب سكور أحسن 🔥';
    }
    const { tauntsLow, tauntsMid, tauntsHigh } = module.content;
    let pool = tauntsLow;
    if (stage >= 25 && tauntsHigh?.length) {
      pool = tauntsHigh;
    } else if (stage >= 10 && tauntsMid?.length) {
      pool = tauntsMid;
    }
    if (!pool || pool.length === 0) return 'أداء قوي! عاود توا واكسر رقمك القياسي ⚡';
    const chosen = pool[Math.floor(Math.random() * pool.length)] || '';
    return chosen
      .replace(/\{stage\}/g, stage.toString())
      .replace(/\{score\}/g, score.toLocaleString('en-US')) || 'أداء قوي! عاود توا واكسر رقمك القياسي ⚡';
  };

  // Unknown or uninstalled game fallback
  if (!module) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-4xl mb-4">
          ⏳
        </div>
        <h2 className="text-2xl font-black text-white mb-2">لعبة: {gameId}</h2>
        <p className="text-sm text-slate-300 max-w-xs mb-6">
          اللعبة هادي قاعدة في مرحلة التطوير والتركيب، تفقد لعبة ألوان خادعة حالياً!
        </p>
        <Link
          href="/play/color-trap"
          className="h-12 px-6 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center shadow-lg"
        >
          العب ألوان خادعة ⚡
        </Link>
      </main>
    );
  }

  const GameViewComponent = module.View as React.ComponentType<GameViewProps<any, any>>;
  const stageCfg = module.logic.stageConfig(stage);
  const titleAr = (module.content as { title?: string }).title || 'ألوان خادعة';
  const descriptionAr = module.content.howToPlay;

  return (
    <main className="flex-1 flex flex-col justify-between select-none relative pb-4 sm:pb-6 max-w-[540px] w-full mx-auto px-2 sm:px-3">
      {/* 1. Active Game HUD & Bars */}
      {gameState === 'playing' && (
        <>
          <Hud hearts={hearts} stage={stage} score={score} isBoss={stageCfg.isBoss} />
          <div className="px-4 mt-1">
            <TimerBar remainingMs={remainingMs} totalMs={timeLimitMs} />
            <ComboMeter combo={combo} />
          </div>
        </>
      )}

      {/* 2. Briefing Screen */}
      {gameState === 'briefing' && (
        <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-5xl mb-4 shadow-[0_0_35px_rgba(254,202,87,0.35)]">
            🎨
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              السرعة والتركيز ⚡
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              70+ مرحلة
            </span>
          </div>

          <h1 className="text-3xl font-heading font-black text-white mb-2">
            {titleAr}
          </h1>

          <p className="text-xs text-slate-300 max-w-xs mb-4 leading-relaxed">
            {descriptionAr}
          </p>

          {/* Quick rules box */}
          <div className="w-full max-w-xs bg-slate-900/90 border border-white/10 rounded-2xl p-3 text-right mb-5 text-xs text-slate-300 space-y-1.5 shadow-md">
            <div className="font-black text-amber-300 flex items-center gap-1.5 pb-1 border-b border-white/10">
              <span>⚠️</span>
              <span>قواعد الجولة:</span>
            </div>
            <div>• عندك 3 قلوب بس، كل غلطة أو نفاد وقت يطير قلب.</div>
            <div>• الإجابة الصح تزيد الكومبو ($x1, x2, x3$) وتضاعف النقاط.</div>
            <div>• كل 5 أسئلة تطلع مرحلة أصعب وأسرع.</div>
          </div>

          {personalBest > 0 && (
            <div className="mb-4 text-xs font-bold text-amber-400">
              أعلى رقم ليك: {personalBest.toLocaleString('en-US')} نقطة 🏆
            </div>
          )}

          <div className="flex flex-col w-full max-w-xs gap-2.5">
            <button
              onClick={handleStartGame}
              className="w-full h-14 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 font-black rounded-2xl text-lg shadow-[0_5px_0_#9a3412] active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>ابدأ الجولة</span>
              <span>⚡</span>
            </button>
            <Link
              href={`/leaderboard/${gameId}`}
              className="w-full h-11 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>🏆</span>
              <span>لوحة صدارة {titleAr}</span>
            </Link>
            <Link
              href="/"
              className="w-full h-10 rounded-xl bg-white/5 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center transition-colors"
            >
              رجوع للرئيسية ◀
            </Link>
          </div>
        </div>
      )}

      {/* 3. 3-2-1 Countdown Screen */}
      {gameState === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-8xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 animate-pulse scale-125 transition-transform">
            {countdownNum}
          </div>
          <div className="text-sm font-bold text-slate-300 mt-4">
            ركّز وصوابعك على الشاشة! 🔥
          </div>
        </div>
      )}

      {/* 4. Live Game Interactive Container */}
      {gameState === 'playing' && currentQuestion && (
        <div className="flex-1 flex flex-col justify-between p-2">
          <StageBanner
            stage={stage}
            tier={stageCfg.tier}
            isBoss={stageCfg.isBoss}
          />

          <GameViewComponent
            question={currentQuestion}
            onAnswer={handleAnswer}
            remainingMs={remainingMs}
            locked={isLocked}
            lastVerdict={lastVerdict ?? undefined}
          />
        </div>
      )}

      {/* 5. Game Over Result Screen */}
      {gameState === 'gameover' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <ResultScreen
            score={score}
            stageReached={stage}
            personalBestScore={personalBest}
            taunt={getTaunt()}
            gameTitle={titleAr}
            shareUrl={
              typeof window !== 'undefined'
                ? `${window.location.origin}${window.location.pathname.startsWith('/FunnyGame') ? '/FunnyGame' : ''}/play/${gameId}`
                : `https://moja02.github.io/FunnyGame/play/${gameId}`
            }
            onPlayAgain={handleStartGame}
            onGoHome={() => router.push('/')}
            onViewLeaderboard={() => router.push(`/leaderboard/${gameId}`)}
          />
        </div>
      )}
    </main>
  );
}
