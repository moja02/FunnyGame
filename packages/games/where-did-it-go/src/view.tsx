'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type {
  WhereDidItGoQuestionPayload,
  WhereDidItGoAnswerInput,
  CardItem
} from './types.js';
import { sound, haptics } from '@funnygame/ui';

export const WhereDidItGoView: React.FC<
  GameViewProps<WhereDidItGoQuestionPayload, WhereDidItGoAnswerInput>
> = ({ question, onAnswer, locked, onStartTimer }) => {
  const { payload } = question;

  const [introDismissed, setIntroDismissed] = useState(!payload.introCardAr);
  const [phase, setPhase] = useState<'preview' | 'swapping' | 'search'>('preview');
  const [cellCards, setCellCards] = useState<CardItem[]>(() => [...payload.initialCards]);
  const [revealedCells, setRevealedCells] = useState<Set<number>>(new Set());
  const [wrongCell, setWrongCell] = useState<{ index: number; icon: string } | null>(null);
  const [foundTargets, setFoundTargets] = useState<string[]>([]);
  const [foundCellIndices, setFoundCellIndices] = useState<number[]>([]);
  const [mistakesRemaining, setMistakesRemaining] = useState(payload.allowedMistakes);
  const [hintsAvailable, setHintsAvailable] = useState(1);
  const [hintUsedThisQuestion, setHintUsedThisQuestion] = useState(false);
  const [dimmedCells, setDimmedCells] = useState<Set<number>>(new Set());
  const [isSuccess, setIsSuccess] = useState(false);
  const [swappingIndices, setSwappingIndices] = useState<[number, number] | null>(null);

  const searchStartTimeRef = useRef<number>(0);
  const isAnsweredRef = useRef(false);
  const currentStageRef = useRef(payload.stage);
  const abortControllerRef = useRef(false);

  // Reset hint when stage advances
  if (currentStageRef.current !== payload.stage) {
    currentStageRef.current = payload.stage;
    setHintsAvailable(1);
  }

  // Ensure intro card dismissal state matches current question
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

  // 1. Lifecycle: Preview -> Swapping -> Search
  useEffect(() => {
    isAnsweredRef.current = false;
    abortControllerRef.current = false;
    setPhase('preview');
    setCellCards([...payload.initialCards]);
    setWrongCell(null);
    setFoundTargets([]);
    setFoundCellIndices([]);
    setMistakesRemaining(payload.allowedMistakes);
    setHintUsedThisQuestion(false);
    setDimmedCells(new Set());
    setIsSuccess(false);
    setSwappingIndices(null);

    // In preview phase, all cells are revealed
    const allCells = new Set<number>();
    for (let i = 0; i < payload.totalCards; i++) allCells.add(i);
    setRevealedCells(allCells);

    if (!introDismissed) return;

    let isCancelled = false;

    const runPhases = async () => {
      // 1. Preview Phase
      await new Promise((r) => setTimeout(r, payload.previewDurationMs));
      if (isCancelled || abortControllerRef.current) return;

      // 2. Flip Down
      setPhase('swapping');
      setRevealedCells(new Set());
      await new Promise((r) => setTimeout(r, 200));
      if (isCancelled || abortControllerRef.current) return;

      // 3. Swaps Execution
      const currentGridCards = [...payload.initialCards];

      if (payload.swaps.length > 0) {
        if (payload.isMidFlipSwap) {
          // Mid-Flip Swap: swap immediately with minimal delay
          for (const move of payload.swaps) {
            const temp = currentGridCards[move.fromIndex]!;
            currentGridCards[move.fromIndex] = currentGridCards[move.toIndex]!;
            currentGridCards[move.toIndex] = temp;
          }
          setCellCards([...currentGridCards]);
          await new Promise((r) => setTimeout(r, 250));
        } else {
          // Visually sliding swaps
          for (const move of payload.swaps) {
            if (isCancelled || abortControllerRef.current) return;
            setSwappingIndices([move.fromIndex, move.toIndex]);
            sound.tap();

            await new Promise((r) => setTimeout(r, 320));
            if (isCancelled || abortControllerRef.current) return;

            const temp = currentGridCards[move.fromIndex]!;
            currentGridCards[move.fromIndex] = currentGridCards[move.toIndex]!;
            currentGridCards[move.toIndex] = temp;
            setCellCards([...currentGridCards]);

            setSwappingIndices(null);
            await new Promise((r) => setTimeout(r, 100));
          }
        }
      }

      if (isCancelled || abortControllerRef.current) return;

      // 4. Enter Search Phase
      setPhase('search');
      searchStartTimeRef.current = Date.now();
      onStartTimer?.();
      sound.tap();
      haptics.light();
    };

    runPhases();

    return () => {
      isCancelled = true;
      abortControllerRef.current = true;
    };
  }, [
    question.stage,
    question.index,
    introDismissed,
    payload.previewDurationMs,
    payload.initialCards,
    payload.totalCards,
    payload.swaps,
    payload.isMidFlipSwap,
    payload.allowedMistakes,
    onStartTimer
  ]);

  // Anti-cheat: Screenshot protection on visibility change during preview or swap
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && phase !== 'search' && !isAnsweredRef.current) {
        isAnsweredRef.current = true;
        abortControllerRef.current = true;
        setRevealedCells(new Set());
        onAnswer({
          flippedCellIndices: [],
          totalSearchMs: 0,
          mistakesMade: 99,
          hintUsed: false,
          isComplete: false
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [phase, onAnswer]);

  // Handle cell click in search phase
  const handleCellClick = useCallback(
    (cellIndex: number) => {
      if (
        phase !== 'search' ||
        locked ||
        isSuccess ||
        wrongCell !== null ||
        isAnsweredRef.current ||
        revealedCells.has(cellIndex) ||
        dimmedCells.has(cellIndex)
      ) {
        return;
      }

      const card = cellCards[cellIndex];
      if (!card) return;

      // Determine expected target(s)
      const isOrdered = payload.isOrdered;
      let isCorrect = false;

      if (isOrdered) {
        const nextTarget = payload.targets[foundTargets.length];
        if (nextTarget && card.icon === nextTarget.icon) {
          isCorrect = true;
        }
      } else {
        // Unordered: must match any target not yet found
        const remainingTargetIcons = payload.targets
          .map((t) => t.icon)
          .filter((icon) => !foundTargets.includes(icon));
        if (remainingTargetIcons.includes(card.icon)) {
          isCorrect = true;
        }
      }

      if (isCorrect) {
        // Correct Card Match!
        const newFoundTargets = [...foundTargets, card.icon];
        const newFoundCellIndices = [...foundCellIndices, cellIndex];

        setFoundTargets(newFoundTargets);
        setFoundCellIndices(newFoundCellIndices);
        setRevealedCells((prev) => new Set([...prev, cellIndex]));
        sound.tap();
        haptics.light();

        // Check if all targets have been found
        if (newFoundTargets.length === payload.targets.length) {
          isAnsweredRef.current = true;
          setIsSuccess(true);
          sound.correct();
          haptics.success();

          const totalSearchMs = Math.max(50, Date.now() - searchStartTimeRef.current);
          setTimeout(() => {
            onAnswer({
              flippedCellIndices: newFoundCellIndices,
              totalSearchMs,
              mistakesMade: payload.allowedMistakes - mistakesRemaining,
              hintUsed: hintUsedThisQuestion,
              isComplete: true
            });
          }, 300);
        }
      } else {
        // Wrong Card!
        haptics.error();
        sound.wrong();
        setWrongCell({ index: cellIndex, icon: card.icon });

        const newMistakes = mistakesRemaining - 1;
        setMistakesRemaining(Math.max(0, newMistakes));

        setTimeout(() => {
          setWrongCell(null);
        }, 450);

        if (newMistakes < 0) {
          // Exhausted allowed mistakes -> Fail stage
          isAnsweredRef.current = true;
          const totalSearchMs = Math.max(50, Date.now() - searchStartTimeRef.current);
          setTimeout(() => {
            onAnswer({
              flippedCellIndices: [...foundCellIndices, cellIndex],
              totalSearchMs,
              mistakesMade: payload.allowedMistakes + 1,
              hintUsed: hintUsedThisQuestion,
              isComplete: false
            });
          }, 450);
        }
      }
    },
    [
      phase,
      locked,
      isSuccess,
      wrongCell,
      revealedCells,
      dimmedCells,
      cellCards,
      payload.isOrdered,
      payload.targets,
      payload.allowedMistakes,
      foundTargets,
      foundCellIndices,
      mistakesRemaining,
      hintUsedThisQuestion,
      onAnswer
    ]
  );

  // Use hint
  const handleUseHint = useCallback(() => {
    if (
      hintsAvailable <= 0 ||
      phase !== 'search' ||
      locked ||
      isSuccess ||
      wrongCell !== null ||
      isAnsweredRef.current
    ) {
      return;
    }

    setHintsAvailable(0);
    setHintUsedThisQuestion(true);
    haptics.medium();

    // Find non-target cells that are not revealed yet
    const targetIcons = payload.targets.map((t) => t.icon);
    const nonTargetCellIndices: number[] = [];

    cellCards.forEach((c, idx) => {
      if (!targetIcons.includes(c.icon) && !revealedCells.has(idx)) {
        nonTargetCellIndices.push(idx);
      }
    });

    // Dim 50% of the non-target cells
    const countToDim = Math.ceil(nonTargetCellIndices.length * 0.5);
    const toDim = nonTargetCellIndices.slice(0, countToDim);
    setDimmedCells(new Set(toDim));
  }, [
    hintsAvailable,
    phase,
    locked,
    isSuccess,
    wrongCell,
    payload.targets,
    cellCards,
    revealedCells
  ]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!introDismissed) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleDismissIntro();
        }
        return;
      }

      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        handleUseHint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [introDismissed, handleDismissIntro, handleUseHint]);

  // Grid styling based on dimensions
  const dim = payload.gridDimension;
  let gridColsClass = 'grid-cols-3';
  if (dim === 4) gridColsClass = 'grid-cols-4';
  else if (dim === 5) gridColsClass = 'grid-cols-5';
  else if (dim === 6) gridColsClass = 'grid-cols-6';

  let iconSizeClass = 'text-3xl sm:text-4xl';
  if (dim === 5) iconSizeClass = 'text-2xl sm:text-3xl';
  else if (dim === 6) iconSizeClass = 'text-xl sm:text-2xl';

  return (
    <div
      className="relative flex flex-col items-center justify-between w-full h-full max-w-md mx-auto select-none px-2 py-1 text-white"
      dir="rtl"
    >
      {/* Intro Modal */}
      {!introDismissed && payload.introCardAr && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md rounded-2xl animate-fade-in">
          <div className="flex flex-col items-center text-center p-6 bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl max-w-xs w-full">
            <span className="text-4xl mb-3">🔍</span>
            <h3 className="text-xl font-bold text-amber-300 mb-2">أين اختفت؟</h3>
            <p className="text-sm text-slate-200 mb-5 leading-relaxed">
              {payload.introCardAr}
            </p>
            <button
              onClick={handleDismissIntro}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 active:scale-95 text-slate-950 font-black rounded-xl shadow-lg transition-transform"
            >
              فهمت، ابدأ! 🚀
            </button>
            <span className="text-xs text-slate-400 mt-2">
              أو اضغط مسافة (Space)
            </span>
          </div>
        </div>
      )}

      {/* Top Target Bar & Status */}
      <div className="w-full flex flex-col gap-1.5 pt-1">
        {/* Phase & Targets Container */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          {/* Target Cards to find */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">
              {payload.isOrdered ? 'المطلوب بالترتيب:' : 'المطلوب:'}
            </span>
            <div className="flex items-center gap-1.5">
              {payload.targets.map((target, idx) => {
                const isFound = foundTargets.includes(target.icon);
                const isCurrent =
                  payload.isOrdered &&
                  idx === foundTargets.length &&
                  phase === 'search';

                return (
                  <div
                    key={idx}
                    className={`relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 transition-all ${
                      isFound
                        ? 'bg-emerald-950/60 border-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-amber-500/20 border-amber-400 scale-110 shadow-[0_0_12px_rgba(251,191,36,0.5)] animate-pulse'
                        : 'bg-slate-800/60 border-slate-700 opacity-60'
                    }`}
                  >
                    <span className="text-lg sm:text-xl">{target.icon}</span>
                    {payload.isOrdered && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-950 border border-slate-700 text-[10px] font-mono flex items-center justify-center text-slate-300">
                        {idx + 1}
                      </span>
                    )}
                    {isFound && (
                      <span className="absolute inset-0 flex items-center justify-center bg-emerald-950/70 text-emerald-400 font-black text-sm rounded-md">
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hint Button */}
          <button
            onClick={(e) => {
              (e.currentTarget as HTMLElement)?.blur();
              handleUseHint();
            }}
            disabled={
              hintsAvailable <= 0 ||
              phase !== 'search' ||
              locked ||
              isSuccess ||
              wrongCell !== null
            }
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
              hintsAvailable > 0 && phase === 'search'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            تلميح ({hintsAvailable}) 💡
          </button>
        </div>

        {/* Phase Indicator & Mistake Counter */}
        <div className="flex items-center justify-between px-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold">
            {phase === 'preview' ? (
              <span className="inline-flex items-center gap-1 text-sky-400 animate-pulse">
                <span>👀</span>
                <span>احفظ أماكن البطاقات...</span>
              </span>
            ) : phase === 'swapping' ? (
              <span className="inline-flex items-center gap-1 text-amber-400 animate-bounce">
                <span>🔀</span>
                <span>تبديل الأماكن...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span>👆</span>
                <span>ابحث عن المطلوب!</span>
              </span>
            )}
          </div>

          {/* Allowed Mistakes */}
          {payload.allowedMistakes > 0 && phase === 'search' && (
            <div className="text-slate-400 text-[11px]">
              أخطاء مسموحة: <span className="font-bold text-amber-300">{mistakesRemaining}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Grid Container */}
      <div className="w-full flex items-center justify-center my-auto py-2">
        <div
          className={`grid ${gridColsClass} gap-1.5 sm:gap-2 w-full max-w-[420px] aspect-square p-2 bg-slate-900/60 rounded-2xl border border-slate-800/80 shadow-2xl ${
            isSuccess ? 'ring-2 ring-emerald-500/80' : ''
          }`}
        >
          {cellCards.map((card, idx) => {
            const isRevealed = revealedCells.has(idx);
            const isDimmed = dimmedCells.has(idx);
            const isWrong = wrongCell?.index === idx;
            const isSwapping =
              swappingIndices &&
              (swappingIndices[0] === idx || swappingIndices[1] === idx);

            return (
              <button
                key={idx}
                disabled={phase !== 'search' || locked || isSuccess || isRevealed || isDimmed}
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLElement)?.blur();
                  handleCellClick(idx);
                }}
                className={`relative flex items-center justify-center rounded-xl border-2 transition-all duration-200 select-none touch-manipulation ${
                  isWrong
                    ? 'bg-rose-950/80 border-rose-500 scale-105 animate-shake shadow-[0_0_15px_rgba(244,63,94,0.7)]'
                    : isRevealed
                    ? 'bg-slate-800/90 border-emerald-500/80 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : isDimmed
                    ? 'bg-slate-900/30 border-slate-800/40 opacity-20 pointer-events-none'
                    : isSwapping
                    ? 'bg-indigo-950 border-amber-400 scale-105 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                    : phase === 'search'
                    ? 'bg-slate-800/80 border-slate-700 hover:border-amber-400/50 active:scale-95 cursor-pointer shadow-md'
                    : 'bg-slate-800/80 border-slate-700 cursor-default'
                }`}
              >
                {/* Face Up Content */}
                {isRevealed && (
                  <span className={`${iconSizeClass} animate-fade-in`}>
                    {card.icon}
                  </span>
                )}

                {/* Wrong Card Temporary Flash */}
                {isWrong && (
                  <div className="flex flex-col items-center justify-center">
                    <span className={iconSizeClass}>{wrongCell.icon}</span>
                    <span className="absolute top-1 text-xs text-rose-400 font-black">
                      ✗
                    </span>
                  </div>
                )}

                {/* Face Down Content */}
                {!isRevealed && !isWrong && (
                  <div className="flex items-center justify-center w-full h-full text-slate-600/60">
                    <span className="text-xs sm:text-sm font-black">؟</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Guidance */}
      <div className="w-full text-center pb-1">
        <p className="text-xs text-slate-400 font-medium leading-relaxed">
          {payload.guidanceTextAr}
        </p>
      </div>
    </div>
  );
};
