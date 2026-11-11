import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Trophy, Crown, Flame, Bot, User, CheckCircle2 } from 'lucide-react';
import { GameMode, BotDifficulty, GameState } from '../types';
import { sound, triggerHaptic } from '../utils/sound';

interface TimeDuelGameProps {
  mode: GameMode;
  botDifficulty?: BotDifficulty;
  onUpdateBestRecord: (diff: number) => void;
  onBackToMenu: () => void;
}

export const TimeDuelGame: React.FC<TimeDuelGameProps> = ({
  mode,
  botDifficulty = 'medium',
  onUpdateBestRecord,
}) => {
  // Game Configuration
  const TARGETS_POOL = [3.00, 4.00, 5.00, 5.50, 6.00, 7.00];
  const WINNING_SCORE = 3;

  // Round State
  const [gameState, setGameState] = useState<GameState>('idle');
  const [targetTime, setTargetTime] = useState<number>(5.00);
  const [currentTime, setCurrentTime] = useState<number>(0.00);
  const [isTimerHidden, setIsTimerHidden] = useState<boolean>(false);
  const [countdownNum, setCountdownNum] = useState<number | string>(3);
  const [roundNumber, setRoundNumber] = useState<number>(1);

  // Scores & Player Stops
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);

  const [p1StoppedTime, setP1StoppedTime] = useState<number | null>(null);
  const [p2StoppedTime, setP2StoppedTime] = useState<number | null>(null);

  const [p1Diff, setP1Diff] = useState<number | null>(null);
  const [p2Diff, setP2Diff] = useState<number | null>(null);

  const [roundWinner, setRoundWinner] = useState<'p1' | 'p2' | 'tie' | null>(null);
  const [matchWinner, setMatchWinner] = useState<'p1' | 'p2' | null>(null);

  // Animation & Timer Refs
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const botTimeoutRef = useRef<number | null>(null);

  // Randomize Target
  const getRandomTarget = () => {
    const randomIndex = Math.floor(Math.random() * TARGETS_POOL.length);
    return TARGETS_POOL[randomIndex];
  };

  // Start Countdown
  const startCountdown = useCallback(() => {
    const newTarget = getRandomTarget();
    setTargetTime(newTarget);
    setCurrentTime(0);
    setIsTimerHidden(false);
    setP1StoppedTime(null);
    setP2StoppedTime(null);
    setP1Diff(null);
    setP2Diff(null);
    setRoundWinner(null);

    setGameState('countdown');
    setCountdownNum(3);
    sound.playCountdown();

    let step = 3;
    const interval = setInterval(() => {
      step -= 1;
      if (step > 0) {
        setCountdownNum(step);
        sound.playCountdown();
      } else if (step === 0) {
        setCountdownNum('انطلق! 🚀');
        sound.playGo();
      } else {
        clearInterval(interval);
        startRunningTimer(newTarget);
      }
    }, 900);
  }, []);

  // Start the actual game timer
  const startRunningTimer = (target: number) => {
    setGameState('running');
    startTimeRef.current = performance.now();

    // Check when to hide timer (at 1.5 seconds)
    let hasHidden = false;

    const updateLoop = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

      // Hide timer after 1.5 seconds so players rely on internal clock!
      if (elapsed >= 1.5 && !hasHidden) {
        hasHidden = true;
        setIsTimerHidden(true);
        sound.playMystery();
      }

      // Auto-stop if time exceeds target by 3 seconds
      if (elapsed > target + 3.0) {
        // Force end
        handleForceStop();
        return;
      }

      animFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animFrameRef.current = requestAnimationFrame(updateLoop);

    // If playing against Bot, schedule bot stop
    if (mode === 'bot') {
      scheduleBotMove(target);
    }
  };

  // Schedule AI bot reaction
  const scheduleBotMove = (target: number) => {
    // Offset calculation based on difficulty
    let errorRange = 0.35; // easy
    if (botDifficulty === 'medium') errorRange = 0.16;
    if (botDifficulty === 'hard') errorRange = 0.05;

    // Random offset (-errorRange to +errorRange)
    const offset = (Math.random() * 2 - 1) * errorRange;
    const botStopTime = Math.max(0.5, target + offset);

    botTimeoutRef.current = window.setTimeout(() => {
      stopPlayer2(botStopTime);
    }, botStopTime * 1000);
  };

  // Stop Player 1 (Red / Bottom)
  const stopPlayer1 = () => {
    if (gameState !== 'running' || p1StoppedTime !== null) return;
    triggerHaptic(60);
    sound.playStop(1.1);

    const now = performance.now();
    const elapsed = (now - startTimeRef.current) / 1000;
    setP1StoppedTime(elapsed);

    // Check if both stopped
    if (p2StoppedTime !== null) {
      endRound(elapsed, p2StoppedTime);
    }
  };

  // Stop Player 2 (Cyan / Top or Bot)
  const stopPlayer2 = (forcedTime?: number) => {
    if (gameState !== 'running' || p2StoppedTime !== null) return;
    triggerHaptic(60);
    sound.playStop(0.9);

    const elapsed = forcedTime !== undefined ? forcedTime : (performance.now() - startTimeRef.current) / 1000;
    setP2StoppedTime(elapsed);

    // Check if both stopped
    if (p1StoppedTime !== null) {
      endRound(p1StoppedTime, elapsed);
    }
  };

  // Handle timeout if a player doesn't tap
  const handleForceStop = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const maxTime = targetTime + 3.0;
    const finalP1 = p1StoppedTime !== null ? p1StoppedTime : maxTime;
    const finalP2 = p2StoppedTime !== null ? p2StoppedTime : maxTime;
    setP1StoppedTime(finalP1);
    setP2StoppedTime(finalP2);
    endRound(finalP1, finalP2);
  };

  // End Round and compute winner
  const endRound = (time1: number, time2: number) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);

    const diff1 = Math.abs(time1 - targetTime);
    const diff2 = Math.abs(time2 - targetTime);

    setP1Diff(diff1);
    setP2Diff(diff2);

    // Record best for player 1 (and player 2 if human)
    onUpdateBestRecord(diff1);
    if (mode === 'pvp') onUpdateBestRecord(diff2);

    let winner: 'p1' | 'p2' | 'tie' = 'tie';
    let newP1Score = p1Score;
    let newP2Score = p2Score;

    if (Math.abs(diff1 - diff2) < 0.005) {
      winner = 'tie';
    } else if (diff1 < diff2) {
      winner = 'p1';
      newP1Score += 1;
      setP1Score(newP1Score);
    } else {
      winner = 'p2';
      newP2Score += 1;
      setP2Score(newP2Score);
    }

    setRoundWinner(winner);
    sound.playRoundWin();

    // Check for match victory
    if (newP1Score >= WINNING_SCORE) {
      setMatchWinner('p1');
      setGameState('match_ended');
      triggerConfetti();
      sound.playMatchWin();
    } else if (newP2Score >= WINNING_SCORE) {
      setMatchWinner('p2');
      setGameState('match_ended');
      triggerConfetti();
      sound.playMatchWin();
    } else {
      setGameState('round_ended');
    }
  };

  // Confetti Explosion
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // fallback
    }
  };

  // Next Round
  const nextRound = () => {
    sound.playTap();
    setRoundNumber((prev) => prev + 1);
    startCountdown();
  };

  // Reset Match
  const resetMatch = () => {
    sound.playTap();
    setP1Score(0);
    setP2Score(0);
    setRoundNumber(1);
    setMatchWinner(null);
    startCountdown();
  };

  // Start initial round on mount
  useEffect(() => {
    startCountdown();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex-1 w-full flex flex-col relative select-none overflow-hidden" style={{ background: '#0e081c' }}>
      
      {/* ====================================================================
          PLAYER 2 ZONE (TOP) - Flipped 180° in 2-Player mode!
          ==================================================================== */}
      <div className={`player-zone player-p2-bg ${mode === 'pvp' ? 'zone-p2-flipped' : ''}`}>
        
        {/* P2 Header Info */}
        <div className="w-full flex items-center justify-between px-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold" style={{
              background: 'linear-gradient(135deg, #00d2d3, #0abde3)',
              color: '#000'
            }}>
              {mode === 'bot' ? <Bot size={20} /> : <User size={20} />}
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#48dbfb' }}>
                {mode === 'bot' ? `الروبوت (${botDifficulty})` : 'اللاعب 2 (الأزرق)'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8395a7' }}>
                النقاط: {p2Score} / {WINNING_SCORE}
              </div>
            </div>
          </div>

          {/* Target Reminder for Player 2 */}
          <div className="badge-score" style={{ background: 'rgba(0, 210, 211, 0.2)', color: '#48dbfb' }}>
            الهدف: <span className="digital-font font-bold">{targetTime.toFixed(2)} ث</span>
          </div>
        </div>

        {/* P2 Result or Action Button */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {gameState === 'running' ? (
            <button
              onClick={() => stopPlayer2()}
              disabled={p2StoppedTime !== null || mode === 'bot'}
              className="slam-button slam-p2 arcade-btn"
            >
              {p2StoppedTime !== null ? (
                <>
                  <CheckCircle2 size={32} />
                  <span style={{ fontSize: '1.2rem' }}>تم التوقيف!</span>
                </>
              ) : (
                <>
                  <span>أوقف! 🛑</span>
                  <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>اضغط عند {targetTime.toFixed(2)} ث</span>
                </>
              )}
            </button>
          ) : (gameState === 'round_ended' || gameState === 'match_ended') && p2StoppedTime !== null ? (
            <div className="text-center pop-in p-4 rounded-3xl" style={{
              background: roundWinner === 'p2' ? 'rgba(0, 210, 211, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: roundWinner === 'p2' ? '2px solid #00d2d3' : '1px solid rgba(255,255,255,0.1)',
              boxShadow: roundWinner === 'p2' ? '0 0 25px rgba(0, 210, 211, 0.4)' : 'none'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#a4b0be', marginBottom: '2px' }}>
                توقيت التوقف:
              </div>
              <div className="digital-font" style={{ fontSize: '2.4rem', fontWeight: 900, color: '#48dbfb' }}>
                {p2StoppedTime.toFixed(3)} ث
              </div>
              <div style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: p2Diff! < 0.1 ? '#2ecc71' : p2Diff! < 0.25 ? '#feca57' : '#ff6b81'
              }}>
                الفارق: {p2StoppedTime >= targetTime ? `+${p2Diff?.toFixed(3)}` : `-${p2Diff?.toFixed(3)}`} ث
              </div>
              {roundWinner === 'p2' && (
                <div className="inline-flex items-center gap-1 mt-2 text-sm font-extrabold text-white bg-teal-600 px-3 py-1 rounded-full">
                  <Crown size={14} /> فائز بالجولة! 🎯
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 font-bold" style={{ fontSize: '1.1rem' }}>
              جاهز للتحدي... ⚡
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          CENTER STATUS & TIMER BAR
          ==================================================================== */}
      <div className="center-divider">
        <div className="flex items-center gap-2">
          <span className="badge-score text-xs" style={{ background: '#ff4757', color: 'white' }}>
            🔴 {p1Score}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#a4b0be' }}>
            الجولة {roundNumber}
          </span>
          <span className="badge-score text-xs" style={{ background: '#0abde3', color: 'white' }}>
            🔵 {p2Score}
          </span>
        </div>

        {/* Current Timer / Mystery Display */}
        <div className="flex items-center gap-1">
          {gameState === 'countdown' ? (
            <div className="digital-font font-black text-xl text-yellow-400 pulse-anim">
              {countdownNum}
            </div>
          ) : gameState === 'running' ? (
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: '0.75rem', color: '#a4b0be' }}>العداد:</span>
              <span className={`digital-font font-black text-xl ${isTimerHidden ? 'text-purple-400 pulse-anim' : 'text-yellow-400'}`}>
                {isTimerHidden ? '⏱️ ?.??' : `${currentTime.toFixed(2)} ث`}
              </span>
            </div>
          ) : (
            <span className="text-xs font-bold text-gray-300">
              الهدف: <strong className="text-yellow-400 digital-font text-sm">{targetTime.toFixed(2)} ث</strong>
            </span>
          )}
        </div>
      </div>

      {/* ====================================================================
          PLAYER 1 ZONE (BOTTOM) - Upright
          ==================================================================== */}
      <div className="player-zone player-p1-bg">
        {/* P1 Action Button or Result */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {gameState === 'running' ? (
            <button
              onClick={stopPlayer1}
              disabled={p1StoppedTime !== null}
              className="slam-button slam-p1 arcade-btn"
            >
              {p1StoppedTime !== null ? (
                <>
                  <CheckCircle2 size={32} />
                  <span style={{ fontSize: '1.2rem' }}>تم التوقيف!</span>
                </>
              ) : (
                <>
                  <span>أوقف! 🛑</span>
                  <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>اضغط عند {targetTime.toFixed(2)} ث</span>
                </>
              )}
            </button>
          ) : (gameState === 'round_ended' || gameState === 'match_ended') && p1StoppedTime !== null ? (
            <div className="text-center pop-in p-4 rounded-3xl" style={{
              background: roundWinner === 'p1' ? 'rgba(255, 71, 87, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: roundWinner === 'p1' ? '2px solid #ff4757' : '1px solid rgba(255,255,255,0.1)',
              boxShadow: roundWinner === 'p1' ? '0 0 25px rgba(255, 71, 87, 0.4)' : 'none'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#a4b0be', marginBottom: '2px' }}>
                توقيت التوقف:
              </div>
              <div className="digital-font" style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ff6b81' }}>
                {p1StoppedTime.toFixed(3)} ث
              </div>
              <div style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: p1Diff! < 0.1 ? '#2ecc71' : p1Diff! < 0.25 ? '#feca57' : '#ff6b81'
              }}>
                الفارق: {p1StoppedTime >= targetTime ? `+${p1Diff?.toFixed(3)}` : `-${p1Diff?.toFixed(3)}`} ث
              </div>
              {roundWinner === 'p1' && (
                <div className="inline-flex items-center gap-1 mt-2 text-sm font-extrabold text-white bg-rose-600 px-3 py-1 rounded-full">
                  <Crown size={14} /> فائز بالجولة! 🎯
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 font-bold" style={{ fontSize: '1.1rem' }}>
              ركّز واستعد... 🎯
            </div>
          )}
        </div>

        {/* P1 Header Info */}
        <div className="w-full flex items-center justify-between px-2 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold" style={{
              background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
              color: '#fff'
            }}>
              <User size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ff6b81' }}>
                اللاعب 1 (الأحمر)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8395a7' }}>
                النقاط: {p1Score} / {WINNING_SCORE}
              </div>
            </div>
          </div>

          <div className="badge-score" style={{ background: 'rgba(255, 71, 87, 0.2)', color: '#ff6b81' }}>
            الهدف: <span className="digital-font font-bold">{targetTime.toFixed(2)} ث</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          ROUND RESULT OVERLAY BUTTON (NEXT ROUND)
          ==================================================================== */}
      {gameState === 'round_ended' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-slate-900 border-2 border-yellow-400/40 rounded-3xl p-5 text-center pop-in shadow-2xl">
            <div className="text-3xl mb-1">
              {roundWinner === 'p1' ? '🔴' : roundWinner === 'p2' ? '🔵' : '🤝'}
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2">
              {roundWinner === 'tie'
                ? 'تعادل مذهل!'
                : roundWinner === 'p1'
                ? 'اللاعب 1 الأقرب للهدف!'
                : mode === 'bot'
                ? 'الروبوت كان الأقرب!'
                : 'اللاعب 2 الأقرب للهدف!'}
            </h3>

            <div className="bg-slate-800/80 rounded-2xl p-3 my-3 text-sm text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>فارق اللاعب 1:</span>
                <span className="digital-font font-bold text-rose-400">{p1Diff?.toFixed(3)} ث</span>
              </div>
              <div className="flex justify-between">
                <span>فارق {mode === 'bot' ? 'الروبوت' : 'اللاعب 2'}:</span>
                <span className="digital-font font-bold text-cyan-400">{p2Diff?.toFixed(3)} ث</span>
              </div>
            </div>

            <button
              onClick={nextRound}
              className="arcade-btn w-full py-3.5 px-4 text-lg font-bold text-black"
              style={{
                background: 'linear-gradient(135deg, #feca57 0%, #ff9f43 100%)',
                boxShadow: '0 5px 0 #ee5253'
              }}
            >
              <span>الجولة التالية ⚡</span>
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          MATCH VICTORY MODAL (FIRST TO 3)
          ==================================================================== */}
      {gameState === 'match_ended' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-gradient-to-b from-indigo-950 to-slate-950 border-2 border-yellow-400 rounded-3xl p-6 text-center pop-in shadow-2xl">
            <div className="text-5xl mb-2 animate-bounce">🏆</div>
            <h2 className="text-2xl font-black text-yellow-400 mb-1">
              مبروك الفوز بالمباراة!
            </h2>
            <p className="text-gray-300 text-sm mb-4">
              {matchWinner === 'p1'
                ? 'بطل الدقة: اللاعب 1 (الأحمر) 🔥'
                : mode === 'bot'
                ? 'فاز الروبوت! حاول مجدداً 🤖'
                : 'بطل الدقة: اللاعب 2 (الأزرق) ❄️'}
            </p>

            <div className="flex justify-center items-center gap-4 text-2xl font-black my-4">
              <span className="text-rose-500">{p1Score}</span>
              <span className="text-gray-500">-</span>
              <span className="text-cyan-400">{p2Score}</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={resetMatch}
                className="arcade-btn w-full py-3 px-4 font-bold text-black"
                style={{
                  background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
                  boxShadow: '0 4px 0 #1b7340'
                }}
              >
                <RotateCcw size={18} />
                <span>مباراة جديدة 🔁</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
