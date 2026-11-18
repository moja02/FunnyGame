'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type { OddOneOutQuestionPayload, OddOneOutAnswerInput, OddOneOutCell } from './logic.js';
import { GAME_SHAPES } from './shapes.js';
import { sound, haptics } from '@funnygame/ui';

// Helper for dynamic tile and grid styling based on dimensions
const getGridStyles = (gridDim: number) => {
  if (gridDim <= 3) {
    return {
      gapClass: 'gap-3 sm:gap-4',
      cellRounded: 'rounded-2xl',
      svgScale: 'w-[72%] h-[72%]',
      cellBorder: 'border border-white/20',
      cellBg: 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 shadow-md',
      questionMarkSize: 'text-2xl font-black text-amber-300'
    };
  }
  if (gridDim === 4) {
    return {
      gapClass: 'gap-2 sm:gap-2.5',
      cellRounded: 'rounded-xl',
      svgScale: 'w-[75%] h-[75%]',
      cellBorder: 'border border-white/15',
      cellBg: 'bg-gradient-to-br from-slate-800/85 to-slate-900/85 shadow-sm',
      questionMarkSize: 'text-xl font-black text-amber-300'
    };
  }
  if (gridDim === 5) {
    return {
      gapClass: 'gap-1.5 sm:gap-2',
      cellRounded: 'rounded-lg',
      svgScale: 'w-[78%] h-[78%]',
      cellBorder: 'border border-white/15',
      cellBg: 'bg-slate-800/90 shadow-sm',
      questionMarkSize: 'text-base font-black text-amber-300'
    };
  }
  if (gridDim === 6) {
    return {
      gapClass: 'gap-1 sm:gap-1.5',
      cellRounded: 'rounded-md',
      svgScale: 'w-[82%] h-[82%]',
      cellBorder: 'border border-white/10',
      cellBg: 'bg-slate-800/90',
      questionMarkSize: 'text-sm font-black text-amber-300'
    };
  }
  // 7x7 and 8x8
  return {
    gapClass: 'gap-0.5 sm:gap-1',
    cellRounded: 'rounded-sm sm:rounded-md',
    svgScale: 'w-[86%] h-[86%]',
    cellBorder: 'border border-white/10',
    cellBg: 'bg-slate-800/90',
    questionMarkSize: 'text-xs font-black text-amber-300'
  };
};

export const OddOneOutView: React.FC<
  GameViewProps<OddOneOutQuestionPayload, OddOneOutAnswerInput>
> = ({ question, onAnswer, locked, onStartTimer }) => {
  const { payload } = question;

  // Local state
  const [cellsGrid0, setCellsGrid0] = useState<OddOneOutCell[]>(payload.grids[0] || []);
  const [cellsGrid1, setCellsGrid1] = useState<OddOneOutCell[]>(payload.grids[1] || []);
  const [isCovered, setIsCovered] = useState(false);
  const [activeDualGrid, setActiveDualGrid] = useState<number>(payload.rhythmOrder[0]);
  const [wrongCellKey, setWrongCellKey] = useState<string | null>(null);
  const [correctCellKey, setCorrectCellKey] = useState<string | null>(null);
  const [showPenaltyFlash, setShowPenaltyFlash] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(!payload.introCardAr);

  // Hint tracker (3 consecutive first-touch correct gives 1 hint)
  const [consecutiveFirstTouch, setConsecutiveFirstTouch] = useState(0);
  const [hintsAvailable, setHintsAvailable] = useState(0);
  const [hintActive, setHintActive] = useState(false);
  const hasWrongTapInQuestionRef = useRef(false);

  const questionStartTimeRef = useRef(Date.now());
  const isAnsweredRef = useRef(false);
  const dualGridHitsRef = useRef<number[]>([]);

  // Dismiss intro and trigger timer start
  const handleDismissIntro = useCallback(() => {
    setIntroDismissed(true);
    questionStartTimeRef.current = Date.now();
    sound.countdown();
    haptics.light();
    onStartTimer?.();
  }, [onStartTimer]);

  // 1. Reset & Setup on new question
  useEffect(() => {
    setCellsGrid0(payload.grids[0] || []);
    setCellsGrid1(payload.grids[1] || []);
    setIsCovered(false);
    setActiveDualGrid(payload.rhythmOrder[0]);
    setWrongCellKey(null);
    setCorrectCellKey(null);
    setShowPenaltyFlash(false);
    setHintActive(false);
    hasWrongTapInQuestionRef.current = false;
    isAnsweredRef.current = false;
    dualGridHitsRef.current = [];
    questionStartTimeRef.current = Date.now();

    // Intro card waits for user tap (no auto-dismiss)
    if (payload.introCardAr) {
      setIntroDismissed(false);
    } else {
      setIntroDismissed(true);
    }
  }, [question.index, payload]);

  // 2. Flash / Hide timer (Starts ONLY AFTER intro is dismissed!)
  useEffect(() => {
    if (!introDismissed || !payload.hideAfterMs) return undefined;

    const hideTimer = setTimeout(() => {
      setIsCovered(true);
    }, payload.hideAfterMs);

    return () => clearTimeout(hideTimer);
  }, [introDismissed, payload.hideAfterMs]);

  // 3. Handle Scheduled Cell Swaps (Starts ONLY AFTER intro is dismissed!)
  useEffect(() => {
    if (!introDismissed || !payload.scheduledSwaps || payload.scheduledSwaps.length === 0) return undefined;

    const timers: NodeJS.Timeout[] = [];
    payload.scheduledSwaps.forEach((sw) => {
      const timer = setTimeout(() => {
        if (sw.gridIndex === 0) {
          setCellsGrid0((prev) => {
            const copy = [...prev];
            const temp = copy[sw.cellA];
            copy[sw.cellA] = copy[sw.cellB]!;
            copy[sw.cellB] = temp!;
            return copy;
          });
        } else if (sw.gridIndex === 1) {
          setCellsGrid1((prev) => {
            const copy = [...prev];
            const temp = copy[sw.cellA];
            copy[sw.cellA] = copy[sw.cellB]!;
            copy[sw.cellB] = temp!;
            return copy;
          });
        }
      }, sw.tMs);
      timers.push(timer);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [introDismissed, payload.scheduledSwaps]);

  // 3. Pointer Down Tap Handler
  const handleCellTap = useCallback(
    (gridIdx: number, cellIdx: number, isOdd: boolean) => {
      if (locked || isAnsweredRef.current || !introDismissed) return;

      const now = Date.now();
      const tMs = now - questionStartTimeRef.current;
      const cellKey = `${gridIdx}_${cellIdx}`;

      // In dual grid mode, player must hit the active grid first
      if (payload.gridCount === 2 && gridIdx !== activeDualGrid) {
        sound.wrong();
        haptics.error();
        setWrongCellKey(cellKey);
        setShowPenaltyFlash(true);
        setTimeout(() => setWrongCellKey(null), 180);
        setTimeout(() => setShowPenaltyFlash(false), 800);
        return;
      }

      if (isOdd) {
        // HIT!
        sound.correct();
        haptics.light();
        setCorrectCellKey(cellKey);

        if (payload.gridCount === 2 && dualGridHitsRef.current.length === 0) {
          // First grid solved! Switch to second grid
          dualGridHitsRef.current.push(gridIdx);
          const nextGrid = payload.rhythmOrder.find((g) => g !== gridIdx) ?? 1;
          setActiveDualGrid(nextGrid);
          return;
        }

        // Entire question solved!
        isAnsweredRef.current = true;

        // Hint award calculation: 3 clean consecutive questions = 1 hint
        if (!hasWrongTapInQuestionRef.current && !hintActive) {
          const nextStreak = consecutiveFirstTouch + 1;
          if (nextStreak >= 3) {
            setHintsAvailable((h) => Math.min(1, h + 1));
            setConsecutiveFirstTouch(0);
          } else {
            setConsecutiveFirstTouch(nextStreak);
          }
        } else {
          setConsecutiveFirstTouch(0);
        }

        setTimeout(() => {
          onAnswer({
            gridIndex: gridIdx,
            cellIndex: cellIdx,
            tMs,
            hintUsed: hintActive
          });
        }, 200);
      } else {
        // WRONG CELL TOUCH: -2.0s penalty
        hasWrongTapInQuestionRef.current = true;
        setConsecutiveFirstTouch(0);
        sound.wrong();
        haptics.error();

        setWrongCellKey(cellKey);
        setShowPenaltyFlash(true);
        setTimeout(() => setWrongCellKey(null), 180);
        setTimeout(() => setShowPenaltyFlash(false), 800);
      }
    },
    [
      locked,
      introDismissed,
      payload.gridCount,
      activeDualGrid,
      payload.rhythmOrder,
      hintActive,
      consecutiveFirstTouch,
      onAnswer
    ]
  );

  // 4. Use Hint
  const handleUseHint = () => {
    if (hintsAvailable <= 0 || hintActive || locked || !introDismissed) return;
    setHintsAvailable((h) => Math.max(0, h - 1));
    setHintActive(true);
    sound.countdown();
  };

  // Keyboard shortcut listener (Space = hint, 1-9 for 3x3 cells)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (locked || isAnsweredRef.current) return;
      if (!introDismissed) {
        handleDismissIntro();
        return;
      }

      if (e.key === ' ' || e.key.toLowerCase() === 'h') {
        handleUseHint();
      } else if (payload.gridDim === 3 && payload.gridCount === 1) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          const target = cellsGrid0[num - 1];
          if (target) handleCellTap(0, num - 1, target.isOdd);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [locked, introDismissed, handleDismissIntro, cellsGrid0, payload.gridDim, payload.gridCount, handleCellTap]);

  return (
    <div className="w-full flex-1 flex flex-col justify-between select-none touch-none relative p-1 sm:p-2">
      {/* Intro Rule Card Modal (if new stage mechanic) */}
      {!introDismissed && payload.introCardAr && (
        <div
          onPointerDown={handleDismissIntro}
          onClick={handleDismissIntro}
          className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-3xl mb-3 animate-bounce">
            💡
          </div>
          <div className="text-xs font-bold text-amber-400 mb-1">آلية جديدة في المرحلة {payload.stage}</div>
          <h2 className="text-lg font-black text-white max-w-xs leading-relaxed mb-4">
            {payload.introCardAr}
          </h2>
          <div className="text-[11px] font-bold text-slate-400 px-3 py-1 bg-white/10 rounded-full">
            المس الشاشة للبدء ◀
          </div>
        </div>
      )}

      {/* 1. Rule & Guidance Bar */}
      <div className="py-2 px-3 bg-slate-900/95 border border-amber-400/30 rounded-2xl mb-2 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-lg">👁️</span>
          <div className="text-xs sm:text-sm font-black text-amber-300">
            {payload.guidanceTextAr}
          </div>
        </div>

        {/* Hint button & meter */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUseHint}
            disabled={hintsAvailable <= 0 || hintActive}
            className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
              hintsAvailable > 0 && !hintActive
                ? 'bg-amber-400 text-slate-950 shadow-md animate-pulse hover:bg-amber-300 cursor-pointer'
                : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
            }`}
          >
            <span>💡</span>
            <span>تلميح</span>
            <span className="text-[10px] px-1 rounded bg-black/20">
              {hintsAvailable > 0 ? '1' : `${consecutiveFirstTouch}/3`}
            </span>
          </button>
        </div>
      </div>

      {/* Floating Penalty Indicator (-2.0s) */}
      {showPenaltyFlash && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-3 py-1 bg-rose-600 text-white font-black text-sm rounded-full shadow-lg animate-bounce border border-rose-300">
          -2.0s ⏱️ خطأ!
        </div>
      )}

      {/* 2. Playing Area Container */}
      <div className="flex-1 w-full max-w-[540px] mx-auto flex flex-col items-center justify-center p-1 sm:p-2">
        {payload.gridCount === 1 ? (
          /* Single Grid (Stages 1 - 45) */
          <div
            className="w-full aspect-square max-w-[min(96vw,490px)] max-h-[min(65vh,490px)] p-3 sm:p-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 rounded-3xl border-2 border-slate-700/80 shadow-[0_10px_35px_rgba(0,0,0,0.7)] ring-1 ring-white/10 relative overflow-hidden flex items-center justify-center transition-all"
          >
            <div
              className={`w-full h-full grid ${getGridStyles(payload.gridDim).gapClass}`}
              style={{
                gridTemplateColumns: `repeat(${payload.gridDim}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${payload.gridDim}, minmax(0, 1fr))`
              }}
            >
              {cellsGrid0.map((cell) => {
                const cellKey = `0_${cell.cellIndex}`;
                const isWrong = wrongCellKey === cellKey;
                const isCorrect = correctCellKey === cellKey;
                const shapeDef = GAME_SHAPES.find((s) => s.id === cell.shapeId) || GAME_SHAPES[0]!;
                const isOddAndHinted = hintActive && cell.isOdd;
                const styles = getGridStyles(payload.gridDim);

                return (
                  <div
                    key={cell.id}
                    onPointerDown={() => handleCellTap(0, cell.cellIndex, cell.isOdd)}
                    className={`w-full h-full ${styles.cellRounded} ${styles.cellBorder} flex items-center justify-center relative cursor-pointer select-none transition-all active:scale-95 ${
                      isCovered
                        ? 'bg-slate-800 border-2 border-amber-400/40 animate-pulse'
                        : `${styles.cellBg} hover:bg-slate-750`
                    } ${isWrong ? 'bg-rose-950/90 border-2 border-rose-500 ring-2 ring-rose-500/50 animate-shake' : ''} ${
                      isCorrect ? 'bg-emerald-950 border-2 border-emerald-400 ring-2 ring-emerald-400/70 scale-105' : ''
                    } ${isOddAndHinted ? 'ring-4 ring-amber-400 border-2 border-amber-300 scale-105 animate-pulse' : ''} ${
                      payload.motionMode === 'WIGGLE' && !isCovered ? 'animate-pulse' : ''
                    }`}
                  >
                    {isCovered ? (
                      <span className={styles.questionMarkSize}>?</span>
                    ) : (
                      <svg
                        viewBox="0 0 100 100"
                        className={`${styles.svgScale} transition-transform pointer-events-none`}
                        style={{
                          transform: `rotate(${cell.rotationDeg}deg)`,
                          fill: cell.colorHex,
                          filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))'
                        }}
                      >
                        <path d={shapeDef.svgPath} />
                      </svg>
                    )}

                    {/* Feedback Overlays */}
                    {isWrong && (
                      <div className="absolute inset-0 flex items-center justify-center text-rose-400 font-black text-2xl drop-shadow-md">
                        ✗
                      </div>
                    )}
                    {isCorrect && (
                      <div className="absolute inset-0 flex items-center justify-center text-emerald-300 font-black text-2xl drop-shadow-md">
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Dual Grids (Stages 46+) */
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* Grid 0 (Left / First Grid) */}
            <div
              className={`w-full sm:w-1/2 aspect-square max-w-[260px] p-2 sm:p-2.5 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border-2 transition-all relative overflow-hidden flex items-center justify-center ${
                activeDualGrid === 0
                  ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)] ring-2 ring-amber-400/50'
                  : 'border-white/15 opacity-80'
              }`}
            >
              <div className="absolute top-1 right-2 text-[10px] font-bold text-amber-300 z-20">
                الشبكة 1 {activeDualGrid === 0 ? '👈 مطلوب الآن' : '✓ تم'}
              </div>

              <div
                className={`w-full h-full grid ${getGridStyles(payload.gridDim).gapClass}`}
                style={{
                  gridTemplateColumns: `repeat(${payload.gridDim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${payload.gridDim}, minmax(0, 1fr))`
                }}
              >
                {cellsGrid0.map((cell) => {
                  const cellKey = `0_${cell.cellIndex}`;
                  const isWrong = wrongCellKey === cellKey;
                  const isCorrect = correctCellKey === cellKey;
                  const shapeDef = GAME_SHAPES.find((s) => s.id === cell.shapeId) || GAME_SHAPES[0]!;
                  const isOddAndHinted = hintActive && cell.isOdd;
                  const styles = getGridStyles(payload.gridDim);

                  return (
                    <div
                      key={cell.id}
                      onPointerDown={() => handleCellTap(0, cell.cellIndex, cell.isOdd)}
                      className={`w-full h-full ${styles.cellRounded} ${styles.cellBorder} flex items-center justify-center relative cursor-pointer select-none transition-all active:scale-95 ${
                        isCovered
                          ? 'bg-slate-800 border-2 border-amber-400/40 animate-pulse'
                          : `${styles.cellBg} hover:bg-slate-750`
                      } ${isWrong ? 'bg-rose-950/90 border-2 border-rose-500 ring-2 ring-rose-500/50 animate-shake' : ''} ${
                        isCorrect ? 'bg-emerald-950 border-2 border-emerald-400 ring-2 ring-emerald-400/70 scale-105' : ''
                      } ${isOddAndHinted ? 'ring-4 ring-amber-400 border-2 border-amber-300 scale-105 animate-pulse' : ''} ${
                        payload.motionMode === 'WIGGLE' && !isCovered ? 'animate-pulse' : ''
                      }`}
                    >
                      {isCovered ? (
                        <span className={styles.questionMarkSize}>?</span>
                      ) : (
                        <svg
                          viewBox="0 0 100 100"
                          className={`${styles.svgScale} transition-transform pointer-events-none`}
                          style={{
                            transform: `rotate(${cell.rotationDeg}deg)`,
                            fill: cell.colorHex,
                            filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))'
                          }}
                        >
                          <path d={shapeDef.svgPath} />
                        </svg>
                      )}

                      {/* Feedback Overlays */}
                      {isWrong && (
                        <div className="absolute inset-0 flex items-center justify-center text-rose-400 font-black text-xl">
                          ✗
                        </div>
                      )}
                      {isCorrect && (
                        <div className="absolute inset-0 flex items-center justify-center text-emerald-300 font-black text-xl">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid 1 (Right / Second Grid) */}
            <div
              className={`w-full sm:w-1/2 aspect-square max-w-[260px] p-2 sm:p-2.5 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border-2 transition-all relative overflow-hidden flex items-center justify-center ${
                activeDualGrid === 1
                  ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)] ring-2 ring-amber-400/50'
                  : 'border-white/15 opacity-80'
              }`}
            >
              <div className="absolute top-1 right-2 text-[10px] font-bold text-amber-300 z-20">
                الشبكة 2 {activeDualGrid === 1 ? '👈 مطلوب الآن' : ''}
              </div>

              <div
                className={`w-full h-full grid ${getGridStyles(payload.gridDim).gapClass}`}
                style={{
                  gridTemplateColumns: `repeat(${payload.gridDim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${payload.gridDim}, minmax(0, 1fr))`
                }}
              >
                {cellsGrid1.map((cell) => {
                  const cellKey = `1_${cell.cellIndex}`;
                  const isWrong = wrongCellKey === cellKey;
                  const isCorrect = correctCellKey === cellKey;
                  const shapeDef = GAME_SHAPES.find((s) => s.id === cell.shapeId) || GAME_SHAPES[0]!;
                  const isOddAndHinted = hintActive && cell.isOdd;
                  const styles = getGridStyles(payload.gridDim);

                  return (
                    <div
                      key={cell.id}
                      onPointerDown={() => handleCellTap(1, cell.cellIndex, cell.isOdd)}
                      className={`w-full h-full ${styles.cellRounded} ${styles.cellBorder} flex items-center justify-center relative cursor-pointer select-none transition-all active:scale-95 ${
                        isCovered
                          ? 'bg-slate-800 border-2 border-amber-400/40 animate-pulse'
                          : `${styles.cellBg} hover:bg-slate-750`
                      } ${isWrong ? 'bg-rose-950/90 border-2 border-rose-500 ring-2 ring-rose-500/50 animate-shake' : ''} ${
                        isCorrect ? 'bg-emerald-950 border-2 border-emerald-400 ring-2 ring-emerald-400/70 scale-105' : ''
                      } ${isOddAndHinted ? 'ring-4 ring-amber-400 border-2 border-amber-300 scale-105 animate-pulse' : ''} ${
                        payload.motionMode === 'WIGGLE' && !isCovered ? 'animate-pulse' : ''
                      }`}
                    >
                      {isCovered ? (
                        <span className={styles.questionMarkSize}>?</span>
                      ) : (
                        <svg
                          viewBox="0 0 100 100"
                          className={`${styles.svgScale} transition-transform pointer-events-none`}
                          style={{
                            transform: `rotate(${cell.rotationDeg}deg)`,
                            fill: cell.colorHex,
                            filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))'
                          }}
                        >
                          <path d={shapeDef.svgPath} />
                        </svg>
                      )}

                      {/* Feedback Overlays */}
                      {isWrong && (
                        <div className="absolute inset-0 flex items-center justify-center text-rose-400 font-black text-xl">
                          ✗
                        </div>
                      )}
                      {isCorrect && (
                        <div className="absolute inset-0 flex items-center justify-center text-emerald-300 font-black text-xl">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
