'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type {
  MovingMazeQuestionPayload,
  MovingMazeAnswerInput,
  GridCoord
} from './types.js';
import { calculateMovingMazeScore } from './logic.js';
import { findShortestPath } from './maze-generator.js';
import { sound, haptics } from '@funnygame/ui';

export const MovingMazeView: React.FC<
  GameViewProps<MovingMazeQuestionPayload, MovingMazeAnswerInput>
> = ({ question, onAnswer, locked }) => {
  const { payload } = question;
  const n = payload.gridSize;

  const [introDismissed, setIntroDismissed] = useState(!payload.introCardAr);
  const [playerPos, setPlayerPos] = useState<GridCoord>(payload.startPos);
  const [movesLeft, setMovesLeft] = useState<number>(payload.allowedMoves);
  const [movesUsed, setMovesUsed] = useState<number>(0);
  const [collectedKeyIds, setCollectedKeyIds] = useState<number[]>([]);
  const [remainingTimeMs, setRemainingTimeMs] = useState<number>(payload.timeLimitMs);
  const [dynamicWallCycle, setDynamicWallCycle] = useState<number>(0);
  const [shiftProgressRatio, setShiftProgressRatio] = useState<number>(0); // 0 to 1
  const [isBumping, setIsBumping] = useState<boolean>(false);
  const [bumpedWallDir, setBumpedWallDir] = useState<{ r: number; c: number; dir: string } | null>(null);
  const [hintPath, setHintPath] = useState<GridCoord[] | null>(null);
  const [hintsAvailable, setHintsAvailable] = useState<number>(1);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isSuccessFeedback, setIsSuccessFeedback] = useState<boolean>(false);

  // Dynamic wall toggle states: Map of "type-r-c" -> boolean (true if wall is active)
  const [activeDynamicWalls, setActiveDynamicWalls] = useState<Map<string, boolean>>(() => {
    const map = new Map<string, boolean>();
    payload.dynamicWalls.forEach((dw) => {
      map.set(`${dw.type}-${dw.r}-${dw.c}`, !dw.isOpenInitially);
    });
    return map;
  });

  const timerAnimFrameRef = useRef<number | null>(null);
  const shiftIntervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isResolvedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchStepTimeRef = useRef<number>(0);
  const comboStreakRef = useRef<number>(0);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Show a temporary banner message in the status bar
  const showNotice = useCallback((msg: string) => {
    setStatusNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setStatusNotice(null);
    }, 1800);
  }, []);

  // Synchronize intro card state
  useEffect(() => {
    if (!payload.introCardAr) {
      setIntroDismissed(true);
    } else {
      setIntroDismissed(false);
    }
  }, [payload.introCardAr]);

  const handleDismissIntro = useCallback(() => {
    setIntroDismissed(true);
    sound.countdown();
    haptics.light();
  }, []);

  // When question / stage changes, re-initialize state
  useEffect(() => {
    setPlayerPos(payload.startPos);
    setMovesLeft(payload.allowedMoves);
    setMovesUsed(0);
    setCollectedKeyIds([]);
    setRemainingTimeMs(payload.timeLimitMs);
    setDynamicWallCycle(0);
    setShiftProgressRatio(0);
    setIsBumping(false);
    setBumpedWallDir(null);
    setHintPath(null);
    setHintsAvailable(1);
    setStatusNotice(null);
    setIsSuccessFeedback(false);
    isResolvedRef.current = false;
    startTimeRef.current = Date.now();

    const map = new Map<string, boolean>();
    payload.dynamicWalls.forEach((dw) => {
      map.set(`${dw.type}-${dw.r}-${dw.c}`, !dw.isOpenInitially);
    });
    setActiveDynamicWalls(map);
  }, [question.index, question.stage, payload]);

  // Overall Question Timer countdown
  useEffect(() => {
    if (!introDismissed || isResolvedRef.current) return;

    startTimeRef.current = Date.now();
    const duration = payload.timeLimitMs;

    const tickTimer = () => {
      if (isResolvedRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const left = Math.max(0, duration - elapsed);
      setRemainingTimeMs(left);

      if (left <= 0) {
        // Timeout! Stage lost
        isResolvedRef.current = true;
        sound.wrong();
        haptics.error();
        comboStreakRef.current = 0;
        showNotice('انتهى الوقت! حاول مجدداً ⏱️');

        onAnswer({
          isSuccess: false,
          movesUsed,
          movesLeft: 0,
          durationMs: duration,
          collectedKeysCount: collectedKeyIds.length,
          trapsTriggeredCount: 0,
          totalPoints: 0
        });
      } else {
        timerAnimFrameRef.current = requestAnimationFrame(tickTimer);
      }
    };

    timerAnimFrameRef.current = requestAnimationFrame(tickTimer);

    return () => {
      if (timerAnimFrameRef.current) {
        cancelAnimationFrame(timerAnimFrameRef.current);
        timerAnimFrameRef.current = null;
      }
    };
  }, [introDismissed, payload.timeLimitMs, movesUsed, collectedKeyIds.length, showNotice, onAnswer]);

  // Dynamic Wall Shift Cycle Loop
  useEffect(() => {
    if (!introDismissed || isResolvedRef.current) return;

    const intervalMs = payload.wallShiftIntervalSec * 1000;
    let shiftStartTime = Date.now();

    const updateShiftProgress = () => {
      if (isResolvedRef.current) return;
      const elapsed = Date.now() - shiftStartTime;
      const ratio = Math.min(1.0, elapsed / intervalMs);
      setShiftProgressRatio(ratio);

      if (ratio >= 1.0) {
        // Wall shift triggers!
        shiftStartTime = Date.now();
        setShiftProgressRatio(0);
        setDynamicWallCycle((c) => c + 1);

        // Toggle dynamic walls
        setActiveDynamicWalls((prev) => {
          const next = new Map(prev);
          payload.dynamicWalls.forEach((dw) => {
            const key = `${dw.type}-${dw.r}-${dw.c}`;
            const currentState = next.get(key) ?? !dw.isOpenInitially;
            next.set(key, !currentState);
          });
          return next;
        });

        if (!payload.hasSilentShift) {
          sound.tap();
          haptics.light();
        }
      }
    };

    const intervalId = setInterval(updateShiftProgress, 100);
    shiftIntervalTimerRef.current = intervalId;

    return () => {
      clearInterval(intervalId);
      shiftIntervalTimerRef.current = null;
    };
  }, [introDismissed, payload.wallShiftIntervalSec, payload.dynamicWalls, payload.hasSilentShift]);

  // Check if a wall exists between two adjacent cells
  const getWallInfo = useCallback(
    (r1: number, c1: number, r2: number, c2: number): { hasWall: boolean; isDynamic: boolean } => {
      // Horizontal wall between (r, c) and (r+1, c)
      if (r1 !== r2 && c1 === c2) {
        const minR = Math.min(r1, r2);
        const isDynamic = payload.dynamicWalls.some((dw) => dw.type === 'H' && dw.r === minR && dw.c === c1);
        const dynKey = `H-${minR}-${c1}`;
        const hasWall = activeDynamicWalls.has(dynKey)
          ? activeDynamicWalls.get(dynKey)!
          : (payload.hWalls[minR]?.[c1] ?? true);
        return { hasWall, isDynamic };
      }
      // Vertical wall between (r, c) and (r, c+1)
      if (r1 === r2 && c1 !== c2) {
        const minC = Math.min(c1, c2);
        const isDynamic = payload.dynamicWalls.some((dw) => dw.type === 'V' && dw.r === r1 && dw.c === minC);
        const dynKey = `V-${r1}-${minC}`;
        const hasWall = activeDynamicWalls.has(dynKey)
          ? activeDynamicWalls.get(dynKey)!
          : (payload.vWalls[r1]?.[minC] ?? true);
        return { hasWall, isDynamic };
      }
      return { hasWall: true, isDynamic: false };
    },
    [payload.hWalls, payload.vWalls, payload.dynamicWalls, activeDynamicWalls]
  );

  const isWallBetween = useCallback(
    (r1: number, c1: number, r2: number, c2: number): boolean => {
      return getWallInfo(r1, c1, r2, c2).hasWall;
    },
    [getWallInfo]
  );

  // Check if target move direction is valid
  const canMove = useCallback(
    (from: GridCoord, dir: 'up' | 'down' | 'left' | 'right'): GridCoord | null => {
      let targetR = from.r;
      let targetC = from.c;

      if (dir === 'up') targetR -= 1;
      else if (dir === 'down') targetR += 1;
      else if (dir === 'left') targetC -= 1;
      else if (dir === 'right') targetC += 1;

      // Check grid boundaries
      if (targetR < 0 || targetR >= n || targetC < 0 || targetC >= n) {
        return null;
      }

      // Check wall between
      if (isWallBetween(from.r, from.c, targetR, targetC)) {
        return null;
      }

      return { r: targetR, c: targetC };
    },
    [n, isWallBetween]
  );

  // Execute Player Movement
  const movePlayer = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      if (!introDismissed || locked || isResolvedRef.current) return;

      const nextCoord = canMove(playerPos, dir);

      if (!nextCoord) {
        // Wall bump!
        setIsBumping(true);
        setBumpedWallDir({ r: playerPos.r, c: playerPos.c, dir });
        setTimeout(() => {
          setIsBumping(false);
          setBumpedWallDir(null);
        }, 150);
        sound.tap();
        haptics.light();
        return;
      }

      // Move player forward
      const newMovesUsed = movesUsed + 1;
      const newMovesLeft = movesLeft - 1;
      setMovesUsed(newMovesUsed);
      setMovesLeft(newMovesLeft);
      setPlayerPos(nextCoord);
      sound.tap();
      haptics.light();

      // 1. Check Traps (Return trap sends back to start)
      const hitTrap = payload.traps.some(
        (t) => t.r === nextCoord.r && t.c === nextCoord.c
      );
      if (hitTrap) {
        sound.wrong();
        haptics.error();
        comboStreakRef.current = 0;
        showNotice('أوباا! فخ رجعك لنقطة البداية 🔙');
        setPlayerPos(payload.startPos);
        return;
      }

      // 2. Check Keys (must collect in sequence 1 -> 2 -> 3)
      const nextNeededKeyId = collectedKeyIds.length + 1;
      const keyOnCell = payload.keys.find(
        (k) => k.r === nextCoord.r && k.c === nextCoord.c
      );

      let updatedKeys = collectedKeyIds;
      if (keyOnCell) {
        if (keyOnCell.id === nextNeededKeyId) {
          // Collected in order!
          updatedKeys = [...collectedKeyIds, keyOnCell.id];
          setCollectedKeyIds(updatedKeys);
          sound.correct();
          haptics.medium();

          if (updatedKeys.length === payload.keys.length) {
            showNotice('فتحت البوابة الخضراء! اذهب للمخرج 🚪✨');
          } else {
            showNotice(`أحسنت! اجمع المفتاح ${nextNeededKeyId + 1} 🔑`);
          }
        } else if (!collectedKeyIds.includes(keyOnCell.id)) {
          // Tried collecting out of order!
          sound.wrong();
          haptics.error();
          showNotice(`لازم تجمع المفتاح ${nextNeededKeyId} أولاً! 🔒`);
        }
      }

      // 3. Check Exit Gate
      const isAtExit =
        nextCoord.r === payload.exitPos.r && nextCoord.c === payload.exitPos.c;

      if (isAtExit) {
        const hasAllKeys =
          payload.keys.length === 0 ||
          updatedKeys.length === payload.keys.length;

        if (!hasAllKeys) {
          sound.wrong();
          haptics.error();
          showNotice('البوابة مقفلة! اجمع المفاتيح أولاً 🔑');
          return;
        }

        // SUCCESS! Stage Solved!
        isResolvedRef.current = true;
        setIsSuccessFeedback(true);
        sound.correct();
        haptics.success();
        comboStreakRef.current += 1;

        const durationMs = Math.max(50, Date.now() - startTimeRef.current);
        const earnedPoints = calculateMovingMazeScore(
          payload.stage,
          newMovesLeft,
          remainingTimeMs,
          payload.timeLimitMs,
          comboStreakRef.current
        );

        setTimeout(() => {
          onAnswer({
            isSuccess: true,
            movesUsed: newMovesUsed,
            movesLeft: newMovesLeft,
            durationMs,
            collectedKeysCount: updatedKeys.length,
            trapsTriggeredCount: 0,
            totalPoints: earnedPoints
          });
        }, 300);
        return;
      }

      // 4. Check Moves Exhaustion
      if (newMovesLeft <= 0) {
        isResolvedRef.current = true;
        sound.wrong();
        haptics.error();
        comboStreakRef.current = 0;
        showNotice('نفدت الخطوات! حاول مجدداً 💔');

        setTimeout(() => {
          onAnswer({
            isSuccess: false,
            movesUsed: newMovesUsed,
            movesLeft: 0,
            durationMs: Date.now() - startTimeRef.current,
            collectedKeysCount: updatedKeys.length,
            trapsTriggeredCount: 0,
            totalPoints: 0
          });
        }, 400);
        return;
      }
    },
    [
      introDismissed,
      locked,
      canMove,
      playerPos,
      movesUsed,
      movesLeft,
      payload,
      collectedKeyIds,
      remainingTimeMs,
      showNotice,
      onAnswer
    ]
  );

  // Controlled Touch / Swipe Handler for mobile (prevents rapid burning of moves)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const threshold = 24;
    const now = Date.now();

    if (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold) {
      if (now - lastTouchStepTimeRef.current >= 180) {
        if (Math.abs(dx) > Math.abs(dy)) {
          movePlayer(dx > 0 ? 'right' : 'left');
        } else {
          movePlayer(dy > 0 ? 'down' : 'up');
        }
        lastTouchStepTimeRef.current = now;
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // Keyboard navigation: Arrow keys & WASD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!introDismissed) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleDismissIntro();
        }
        return;
      }

      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault();
        movePlayer('up');
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        e.preventDefault();
        movePlayer('down');
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        movePlayer('left');
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        movePlayer('right');
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        handleUseHint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [introDismissed, handleDismissIntro, movePlayer]);

  // Use Hint (Draws shortest path to next target for 1.2s)
  const handleUseHint = useCallback(() => {
    if (hintsAvailable <= 0 || !introDismissed || isResolvedRef.current) return;

    setHintsAvailable(0);
    sound.tap();
    haptics.medium();

    // Determine next target: next uncollected key, or exit
    const nextKeyId = collectedKeyIds.length + 1;
    const nextKey = payload.keys.find((k) => k.id === nextKeyId);
    const targetCoord = nextKey ? { r: nextKey.r, c: nextKey.c } : payload.exitPos;

    // Convert active dynamic walls to full grid walls for BFS
    const curHWalls = payload.hWalls.map((row, r) =>
      row.map((wall, c) => {
        const dynKey = `H-${r}-${c}`;
        return activeDynamicWalls.has(dynKey) ? activeDynamicWalls.get(dynKey)! : wall;
      })
    );
    const curVWalls = payload.vWalls.map((row, r) =>
      row.map((wall, c) => {
        const dynKey = `V-${r}-${c}`;
        return activeDynamicWalls.has(dynKey) ? activeDynamicWalls.get(dynKey)! : wall;
      })
    );

    const path = findShortestPath(playerPos, targetCoord, n, curHWalls, curVWalls);
    if (path) {
      setHintPath(path);
      setTimeout(() => {
        setHintPath(null);
      }, 1200);
    }
  }, [
    hintsAvailable,
    introDismissed,
    collectedKeyIds,
    payload.keys,
    payload.exitPos,
    payload.hWalls,
    payload.vWalls,
    activeDynamicWalls,
    playerPos,
    n
  ]);

  // Fog of War (Darkness) calculation: determines if cell is visible
  const isCellVisible = useCallback(
    (r: number, c: number): boolean => {
      if (!payload.hasFogOfWar) return true;
      const dr = Math.abs(playerPos.r - r);
      const dc = Math.abs(playerPos.c - c);
      const dist = Math.max(dr, dc);
      return dist <= payload.visionRadius;
    },
    [payload.hasFogOfWar, payload.visionRadius, playerPos]
  );

  return (
    <div
      className="relative flex flex-col items-center justify-between w-full h-full max-w-md mx-auto select-none px-2 py-1 text-white overscroll-none"
      dir="rtl"
    >
      {/* Intro Modal */}
      {!introDismissed && payload.introCardAr && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md rounded-2xl animate-fade-in">
          <div className="flex flex-col items-center text-center p-5 bg-slate-900 border border-blue-500/40 rounded-2xl shadow-2xl max-w-xs w-full">
            <span className="text-4xl mb-2">🧭</span>
            <h3 className="text-xl font-bold text-blue-300 mb-2">متاهة تتحرك</h3>
            <p className="text-xs text-slate-200 mb-3 leading-relaxed">
              {payload.introCardAr}
            </p>
            <div className="text-[11px] text-slate-300 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 mb-4 leading-relaxed text-right w-full space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔵</span>
                <span className="font-bold text-white">أنت النقطة المضيئة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">🚪</span>
                <span className="font-bold text-emerald-400">هدفك: الوصول لباب المخرج</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">🎮</span>
                <span>تحرك بأزرار الأسهم أو السحب أو الكيبورد</span>
              </div>
            </div>
            <button
              onClick={handleDismissIntro}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black rounded-xl shadow-lg transition-transform cursor-pointer"
            >
              فهمت، ابدأ! 🚀
            </button>
            <span className="text-[11px] text-slate-400 mt-2">
              أو اضغط مسافة (Space)
            </span>
          </div>
        </div>
      )}

      {/* Top Header: Moves Counter & Shift Pulse */}
      <div className="w-full flex flex-col gap-1 pt-0.5">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          {/* Moves Left Counter */}
          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
            <span className="text-slate-400">الخطوات:</span>
            <span
              className={`px-2 py-0.5 rounded-lg border font-black transition-colors ${
                movesLeft <= 3
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse'
                  : movesLeft <= 6
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              }`}
            >
              {movesLeft}
            </span>
          </div>

          {/* Wall Shift Pulse Bar */}
          {!payload.hasSilentShift && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
              <span>تبدل الجدران:</span>
              <div className="w-14 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-100"
                  style={{ width: `${Math.min(100, shiftProgressRatio * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Hint Button */}
          <button
            onClick={handleUseHint}
            disabled={hintsAvailable <= 0 || !introDismissed || locked}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
              hintsAvailable > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.2)] cursor-pointer'
                : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            تلميح ({hintsAvailable}) 💡
          </button>
        </div>

        {/* Keys Tracker (if keys present) & Status Notice */}
        <div className="flex items-center justify-between px-2 text-xs">
          {payload.keys.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">المفاتيح:</span>
              <div className="flex items-center gap-1.5">
                {payload.keys.map((k) => {
                  const isCollected = collectedKeyIds.includes(k.id);
                  return (
                    <div
                      key={k.id}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-bold transition-all ${
                        isCollected
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      <span>🔑</span>
                      <span>{k.id}</span>
                      <span>{isCollected ? '✓' : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-bold text-slate-400">
              {payload.hasFogOfWar
                ? '🔦 الرؤية محصورة في الظلام'
                : '🧭 اعثر على أقصر طريق للمخرج'}
            </div>
          )}

          {/* Banner notification / Feedback */}
          {statusNotice && (
            <span className="text-[11px] font-bold text-amber-300 animate-pulse">
              {statusNotice}
            </span>
          )}
        </div>
      </div>

      {/* Main Maze Canvas Container - Explicit dir="ltr" to prevent horizontal flipping */}
      <div
        className="w-full flex items-center justify-center my-auto py-1 touch-none"
        dir="ltr"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`relative w-full max-w-[340px] sm:max-w-[380px] aspect-square p-1.5 bg-[#0e1117] rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-2xl ${
            isSuccessFeedback
              ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
              : 'border-slate-800'
          }`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${n}, minmax(0, 1fr))`
          }}
        >
          {/* Render Maze Grid Cells */}
          {Array.from({ length: n * n }).map((_, idx) => {
            const r = Math.floor(idx / n);
            const c = idx % n;
            const isVisible = isCellVisible(r, c);

            const isPlayer = playerPos.r === r && playerPos.c === c;
            const isExit = payload.exitPos.r === r && payload.exitPos.c === c;
            const isTrap = payload.traps.some((t) => t.r === r && t.c === c);
            const keyItem = payload.keys.find((k) => k.r === r && k.c === c);
            const isKeyCollected = keyItem ? collectedKeyIds.includes(keyItem.id) : false;
            const isNextKey = keyItem?.id === collectedKeyIds.length + 1;
            const isHint = hintPath?.some((pt) => pt.r === r && pt.c === c);

            // Wall inspection for each edge of this cell
            const topWall = r === 0 ? { hasWall: true, isDynamic: false } : getWallInfo(r, c, r - 1, c);
            const bottomWall = r === n - 1 ? { hasWall: true, isDynamic: false } : getWallInfo(r, c, r + 1, c);
            const leftWall = c === 0 ? { hasWall: true, isDynamic: false } : getWallInfo(r, c, r, c - 1);
            const rightWall = c === n - 1 ? { hasWall: true, isDynamic: false } : getWallInfo(r, c, r, c + 1);

            const isPulsingWall = !payload.hasSilentShift && shiftProgressRatio >= 0.70;

            const isCellBumped = isBumping && bumpedWallDir?.r === r && bumpedWallDir?.c === c;

            const formatBorder = (wall: { hasWall: boolean; isDynamic: boolean }, isEdgeBumped: boolean) => {
              if (!isVisible || !wall.hasWall) return 'none';
              if (isEdgeBumped) return '3px solid #f43f5e';
              if (wall.isDynamic) {
                return isPulsingWall ? '3px solid #38bdf8' : '2.5px solid #0284c7';
              }
              return '2px solid #334155';
            };

            return (
              <div
                key={idx}
                onClick={() => {
                  // Direct tap to adjacent cell
                  if (r === playerPos.r - 1 && c === playerPos.c) movePlayer('up');
                  else if (r === playerPos.r + 1 && c === playerPos.c) movePlayer('down');
                  else if (r === playerPos.r && c === playerPos.c - 1) movePlayer('left');
                  else if (r === playerPos.r && c === playerPos.c + 1) movePlayer('right');
                }}
                className={`relative flex items-center justify-center transition-colors duration-100 ${
                  !isVisible
                    ? 'bg-slate-950'
                    : isTrap
                    ? 'bg-rose-950/40'
                    : 'bg-slate-900/60'
                }`}
                style={{
                  borderTop: formatBorder(topWall, isCellBumped && bumpedWallDir?.dir === 'up'),
                  borderBottom: formatBorder(bottomWall, isCellBumped && bumpedWallDir?.dir === 'down'),
                  borderLeft: formatBorder(leftWall, isCellBumped && bumpedWallDir?.dir === 'left'),
                  borderRight: formatBorder(rightWall, isCellBumped && bumpedWallDir?.dir === 'right')
                }}
              >
                {/* Hint Breadcrumb Marker */}
                {isVisible && isHint && !isPlayer && !isExit && (
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                )}

                {/* Trap Icon */}
                {isVisible && isTrap && (
                  <span className="text-xs sm:text-sm animate-pulse text-rose-500 select-none">
                    ⚠️
                  </span>
                )}

                {/* Key Icon */}
                {isVisible && keyItem && !isKeyCollected && (
                  <div
                    className={`relative flex items-center justify-center ${
                      isNextKey ? 'animate-bounce' : 'opacity-70'
                    }`}
                  >
                    <span className="text-xs sm:text-base">🔑</span>
                    <span className="absolute -top-1 -right-1 text-[9px] font-black bg-amber-400 text-slate-950 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                      {keyItem.id}
                    </span>
                  </div>
                )}

                {/* Exit Gate */}
                {isVisible && isExit && (
                  <div
                    className={`relative flex items-center justify-center rounded-lg w-4/5 h-4/5 border transition-all ${
                      payload.keys.length === 0 || collectedKeyIds.length === payload.keys.length
                        ? 'bg-emerald-500/30 border-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse'
                        : 'bg-slate-800/80 border-slate-700 opacity-60'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">🚪</span>
                  </div>
                )}

                {/* Player Orb */}
                {isPlayer && (
                  <div
                    className={`w-4/5 h-4/5 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_15px_#38bdf8] flex items-center justify-center transition-transform ${
                      isBumping ? 'scale-125 animate-shake' : 'scale-100'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-white shadow-inner" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* On-screen Virtual D-Pad for Touch and Click controls */}
      <div className="flex flex-col items-center gap-1 my-1 touch-none select-none" dir="ltr">
        {/* Up Button */}
        <button
          type="button"
          onClick={() => movePlayer('up')}
          disabled={!introDismissed || locked || isResolvedRef.current}
          aria-label="تحرك للأعلى"
          className="w-14 h-10 sm:w-16 sm:h-11 flex items-center justify-center rounded-xl bg-slate-800/90 border border-slate-700 text-blue-300 active:bg-blue-600 active:text-white active:scale-95 shadow-md transition-all touch-manipulation cursor-pointer disabled:opacity-50"
        >
          <span className="text-xl font-bold">▲</span>
        </button>

        {/* Middle Row: Left, Down, Right */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => movePlayer('left')}
            disabled={!introDismissed || locked || isResolvedRef.current}
            aria-label="تحرك لليسار"
            className="w-14 h-10 sm:w-16 sm:h-11 flex items-center justify-center rounded-xl bg-slate-800/90 border border-slate-700 text-blue-300 active:bg-blue-600 active:text-white active:scale-95 shadow-md transition-all touch-manipulation cursor-pointer disabled:opacity-50"
          >
            <span className="text-xl font-bold">◀</span>
          </button>
          <button
            type="button"
            onClick={() => movePlayer('down')}
            disabled={!introDismissed || locked || isResolvedRef.current}
            aria-label="تحرك للأسفل"
            className="w-14 h-10 sm:w-16 sm:h-11 flex items-center justify-center rounded-xl bg-slate-800/90 border border-slate-700 text-blue-300 active:bg-blue-600 active:text-white active:scale-95 shadow-md transition-all touch-manipulation cursor-pointer disabled:opacity-50"
          >
            <span className="text-xl font-bold">▼</span>
          </button>
          <button
            type="button"
            onClick={() => movePlayer('right')}
            disabled={!introDismissed || locked || isResolvedRef.current}
            aria-label="تحرك لليمين"
            className="w-14 h-10 sm:w-16 sm:h-11 flex items-center justify-center rounded-xl bg-slate-800/90 border border-slate-700 text-blue-300 active:bg-blue-600 active:text-white active:scale-95 shadow-md transition-all touch-manipulation cursor-pointer disabled:opacity-50"
          >
            <span className="text-xl font-bold">▶</span>
          </button>
        </div>
      </div>

      {/* Footer Guidance */}
      <div className="w-full text-center pb-0.5">
        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
          {payload.guidanceTextAr}
        </p>
      </div>
    </div>
  );
};
