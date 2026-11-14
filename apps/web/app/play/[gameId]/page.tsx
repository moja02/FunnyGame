'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Hud, TimerBar, ComboMeter, StageBanner, ResultScreen } from '@funnygame/ui';
import type { Tier } from '@funnygame/game-core';

interface PlayPageProps {
  params: {
    gameId: string;
  };
}

export default function PlayPage({ params }: PlayPageProps) {
  const { gameId } = params;

  const [gameState, setGameState] = useState<'briefing' | 'playing' | 'gameover'>('briefing');
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [stage, setStage] = useState(1);
  const [tier] = useState<Tier>('warmup');
  const [combo] = useState(0);
  const [remainingMs] = useState(2000);
  const [timeLimitMs] = useState(2000);

  const handleStartGame = () => {
    setScore(0);
    setHearts(3);
    setStage(1);
    setGameState('playing');
  };

  return (
    <main className="flex-1 flex flex-col justify-between select-none relative">
      {/* Active Game HUD */}
      {gameState === 'playing' && (
        <>
          <Hud hearts={hearts} stage={stage} score={score} isBoss={stage % 5 === 0} />
          <div className="px-4">
            <TimerBar remainingMs={remainingMs} totalMs={timeLimitMs} />
            <ComboMeter combo={combo} />
          </div>
        </>
      )}

      {/* Briefing Screen */}
      {gameState === 'briefing' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-4xl mb-4 shadow-[0_0_25px_rgba(254,202,87,0.3)]">
            🎮
          </div>
          <h2 className="text-2xl font-black text-white mb-2">لعبة: {gameId}</h2>
          <p className="text-xs text-slate-300 max-w-xs mb-6 leading-relaxed">
            جاهز للاختبار؟ ركّز كويس، كل ثانية محسوبة والغلط يخصم قلب ويصفّر الكومبو!
          </p>
          <div className="flex flex-col w-full max-w-xs gap-3">
            <button
              onClick={handleStartGame}
              className="w-full h-14 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black rounded-2xl text-lg shadow-[0_5px_0_#c2410c] active:translate-y-1 transition-all"
            >
              ابدأ الجولة ⚡
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

      {/* Live Game Container */}
      {gameState === 'playing' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <StageBanner stage={stage} tier={tier} isBoss={stage % 5 === 0} />
          <div className="my-8 p-6 bg-slate-900 border border-white/10 rounded-3xl max-w-sm w-full">
            <div className="text-sm font-black text-slate-200 mb-4">
              نواة اللعبة جاهزة وتنتظر تركيب ميكانيكية الأسئلة المحددة
            </div>
            <button
              onClick={() => setGameState('gameover')}
              className="px-4 py-2 bg-red-600/80 text-white rounded-xl text-xs font-bold"
            >
              إنهاء وتجربة شاشة النتيجة 🏁
            </button>
          </div>
        </div>
      )}

      {/* Game Over Result Screen */}
      {gameState === 'gameover' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <ResultScreen
            score={score}
            stageReached={stage}
            personalBestScore={0}
            taunt="محاولة باهية، لكن عقلك يبي شوية تسخين قبل ما تخش للرسمي! 🔥"
            gameTitle={gameId}
            onPlayAgain={handleStartGame}
            onGoHome={() => setGameState('briefing')}
          />
        </div>
      )}
    </main>
  );
}
