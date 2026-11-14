'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  sound
} from '@funnygame/ui';
import '@funnygame/game-color-trap';

interface PlayPageProps {
  params: {
    gameId: string;
  };
}

export default function PlayPage({ params }: PlayPageProps) {
  const { gameId } = params;
  const router = useRouter();

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
    } catch (err) {
      console.warn('Run submit notice:', err);
    }
  }, [gameId, personalBest]);

  // Load and present next question
  const loadQuestion = useCallback(() => {
    if (!module || !rngRef.current) return;

    const logic = module.logic;
    const currentCorrect = correctCountRef.current;
    const currentStage = 1 + Math.floor(currentCorrect / logic.questionsPerStage);
    setStage(currentStage);

    const cfg = logic.stageConfig(currentStage);
    const q = logic.generate(rngRef.current, cfg, qIndexRef.current);

    setCurrentQuestion(q);
    setTimeLimitMs(q.timeLimitMs);
    setRemainingMs(q.timeLimitMs);
    setLastVerdict(null);
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
        // Timeout
        handleAnswer(null);
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [module]);

  // Answer handler
  const handleAnswer = useCallback((answer: any | null) => {
    if (!module || !currentQuestion || isLocked) return;
    setIsLocked(true);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const logic = module.logic;
    const now = Date.now();
    const reactionTimeMs = Math.min(
      currentQuestion.timeLimitMs,
      Math.max(10, now - questionStartTimeRef.current)
    );

    // Record answer
    answersRef.current.push({
      questionIndex: currentQuestion.index,
      stage,
      answer,
      reactionTimeMs,
      clientTimestamp: now
    });

    const verdict = logic.evaluate(currentQuestion, answer);
    setLastVerdict(verdict);

    let nextHearts = hearts;
    let nextScore = score;

    if (verdict.correct) {
      correctCountRef.current += 1;
      streakRef.current += 1;
      setCombo(streakRef.current);

      const remMs = Math.max(0, currentQuestion.timeLimitMs - reactionTimeMs);
      const earned = calculateQuestionScore(
        logic.basePoints,
        stage,
        remMs,
        currentQuestion.timeLimitMs,
        streakRef.current
      );
      nextScore += earned;
      setScore(nextScore);
    } else {
      streakRef.current = 0;
      setCombo(0);
      nextHearts = Math.max(0, hearts - verdict.heartCost);
      setHearts(nextHearts);
    }

    // Step to next question or trigger gameover
    setTimeout(() => {
      if (nextHearts <= 0) {
        sound.gameOver();
        setGameState('gameover');
        submitRun(nextScore);
      } else {
        qIndexRef.current += 1;
        loadQuestion();
      }
    }, 180);
  }, [module, currentQuestion, isLocked, hearts, score, stage, submitRun, loadQuestion]);

  // Initiate new game
  const handleStartGame = async () => {
    // Reset metrics
    setScore(0);
    setHearts(3);
    setStage(1);
    setCombo(0);
    setLastVerdict(null);
    answersRef.current = [];
    correctCountRef.current = 0;
    qIndexRef.current = 0;
    streakRef.current = 0;

    // Fetch start seed from server
    let generatedSeed = Math.floor(Math.random() * 2147483647) + 1;
    let runId = `run_${Date.now()}`;
    const startedAt = Date.now();

    try {
      const res = await fetch('/api/runs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          userId: 'usr_guest_' + (typeof window !== 'undefined' ? (localStorage.getItem('fg_uid') || 'local') : 'guest'),
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
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return chosen ?? 'أداء قوي! عاود توا واكسر رقمك القياسي ⚡';
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
    <main className="flex-1 flex flex-col justify-between select-none relative pb-6 max-w-[480px] w-full mx-auto">
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
              className="w-full h-14 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 font-black rounded-2xl text-lg shadow-[0_5px_0_#9a3412] active:translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <span>ابدأ الجولة</span>
              <span>⚡</span>
            </button>
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
            onPlayAgain={handleStartGame}
            onGoHome={() => router.push('/')}
          />
        </div>
      )}
    </main>
  );
}
