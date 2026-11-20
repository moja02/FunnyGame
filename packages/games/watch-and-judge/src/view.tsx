'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type {
  WatchAndJudgeQuestionPayload,
  WatchAndJudgeAnswerInput,
  RoundAnswerRecord,
  SceneItem
} from './types.js';
import { calculateWatchAndJudgeRoundScore } from './logic.js';
import { SHAPE_PATHS } from './palette.js';
import { sound, haptics } from '@funnygame/ui';

export const WatchAndJudgeView: React.FC<
  GameViewProps<WatchAndJudgeQuestionPayload, WatchAndJudgeAnswerInput>
> = ({ question, onAnswer, locked }) => {
  const { payload } = question;

  const [introDismissed, setIntroDismissed] = useState(!payload.introCardAr);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [step, setStep] = useState<'scene_a' | 'transition' | 'scene_b' | 'feedback'>('scene_a');
  const [sceneARemainingMs, setSceneARemainingMs] = useState(0);
  const [decisionRemainingMs, setDecisionRemainingMs] = useState(0);
  const [roundOutcomes, setRoundOutcomes] = useState<('correct' | 'wrong' | 'pending')[]>([
    'pending',
    'pending',
    'pending'
  ]);
  const [roundRecords, setRoundRecords] = useState<RoundAnswerRecord[]>([]);

  // Feedback visual states
  const [highlightedCorrectCells, setHighlightedCorrectCells] = useState<number[]>([]);
  const [highlightedWrongCell, setHighlightedWrongCell] = useState<number | null>(null);
  const [firstDoubleClickedCell, setFirstDoubleClickedCell] = useState<number | null>(null);

  // Hint
  const [hintsAvailable, setHintsAvailable] = useState(1);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [highlightedQuadrant, setHighlightedQuadrant] = useState<number | null>(null); // 0: TL, 1: TR, 2: BL, 3: BR

  // Random color flash matrix for transition (stages 36-45)
  const [flashColors, setFlashColors] = useState<string[]>([]);

  const animFrameRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const decisionStartTimeRef = useRef<number>(0);
  const isRoundResolvedRef = useRef(false);
  const isStageEndedRef = useRef(false);
  const streakRef = useRef<number>(0);
  const handleTimeoutRef = useRef<() => void>(() => {});

  // Clean cancellation of all active timers
  const cancelAllTimers = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (transitionTimerRef.current !== null) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  // Synchronize intro card dismissal state
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

  // When stage or question advances, reset entire stage state cleanly
  useEffect(() => {
    cancelAllTimers();
    setCurrentRoundIdx(0);
    setRoundOutcomes(['pending', 'pending', 'pending']);
    setRoundRecords([]);
    isStageEndedRef.current = false;
    isRoundResolvedRef.current = false;
    streakRef.current = 0;
    setHintsAvailable(1);
    setHintMessage(null);
    setHighlightedQuadrant(null);
    setFirstDoubleClickedCell(null);
    setHighlightedCorrectCells([]);
    setHighlightedWrongCell(null);
    setStep('scene_a');
  }, [question.index, question.stage, cancelAllTimers]);

  const currentRound = payload.rounds[currentRoundIdx] || payload.rounds[0]!;

  // Handle stage completion or progression after round feedback
  const proceedToNextRound = useCallback(
    (newOutcome: 'correct' | 'wrong', record: RoundAnswerRecord) => {
      const nextOutcomes = [...roundOutcomes];
      nextOutcomes[currentRoundIdx] = newOutcome;
      setRoundOutcomes(nextOutcomes);

      const nextRecords = [...roundRecords, record];
      setRoundRecords(nextRecords);

      const correctCount = nextOutcomes.filter((o) => o === 'correct').length;
      const failCount = nextOutcomes.filter((o) => o === 'wrong').length;

      const isLastRound = currentRoundIdx === 2;
      const alreadyFailed = failCount >= 2;

      const feedbackDelay = newOutcome === 'correct' ? 250 : 650;

      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null;
        if (isLastRound || alreadyFailed) {
          isStageEndedRef.current = true;
          const passed = correctCount >= 2;
          const totalPoints = nextRecords.reduce((sum, r) => sum + r.earnedPoints, 0);

          onAnswer({
            rounds: nextRecords,
            totalPoints,
            correctRoundsCount: correctCount,
            isComplete: passed
          });
        } else {
          setCurrentRoundIdx((prev) => prev + 1);
        }
      }, feedbackDelay);
    },
    [currentRoundIdx, roundOutcomes, roundRecords, onAnswer]
  );

  // Handle Round Decision Timeout
  const handleRoundTimeout = useCallback(() => {
    cancelAllTimers();
    if (isRoundResolvedRef.current || isStageEndedRef.current) return;

    isRoundResolvedRef.current = true;
    setStep('feedback');
    sound.wrong();
    haptics.error();

    // Reset streak on timeout
    streakRef.current = 0;

    // Highlight the real changed cell in alert amber
    setHighlightedCorrectCells(currentRound.validTargetIndices);

    proceedToNextRound('wrong', {
      roundIndex: currentRoundIdx,
      clickedCellIndex: null,
      clickedNoChange: false,
      secondClickedCellIndex: null,
      decisionMs: currentRound.decisionTimeLimitMs,
      isCorrect: false,
      earnedPoints: 0
    });
  }, [cancelAllTimers, currentRound, currentRoundIdx, proceedToNextRound]);

  // Keep ref up to date
  useEffect(() => {
    handleTimeoutRef.current = handleRoundTimeout;
  }, [handleRoundTimeout]);

  // Round execution lifecycle: Scene A -> Transition -> Scene B
  useEffect(() => {
    if (!introDismissed || isStageEndedRef.current) return;

    cancelAllTimers();
    isRoundResolvedRef.current = false;
    setStep('scene_a');
    setHighlightedCorrectCells([]);
    setHighlightedWrongCell(null);
    setFirstDoubleClickedCell(null);
    setHintMessage(null);
    setHighlightedQuadrant(null);

    const roundDef = payload.rounds[currentRoundIdx] || payload.rounds[0]!;
    const viewDuration = roundDef.viewDurationMs;
    const decisionDuration = roundDef.decisionTimeLimitMs;

    setSceneARemainingMs(viewDuration);
    setDecisionRemainingMs(decisionDuration);

    // 1. Scene A: Memorization phase with blue progress countdown
    const sceneAStart = Date.now();
    const tickSceneA = () => {
      const elapsed = Date.now() - sceneAStart;
      const left = Math.max(0, viewDuration - elapsed);
      setSceneARemainingMs(left);

      if (left <= 0) {
        animFrameRef.current = null;
        setStep('transition');

        let transDuration = 300;
        if (roundDef.transitionType === 'COLOR_FLASH') {
          transDuration = 400;
          const colors = [
            'bg-rose-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500',
            'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500'
          ];
          setFlashColors(
            Array.from({ length: 25 }, () => colors[Math.floor(Math.random() * colors.length)]!)
          );
        } else if (roundDef.transitionType === 'DISTRACTOR') {
          transDuration = 800;
        }

        transitionTimerRef.current = setTimeout(() => {
          transitionTimerRef.current = null;
          setStep('scene_b');
          sound.tap();
          haptics.light();
          decisionStartTimeRef.current = Date.now();

          // 2. Scene B: Decision phase countdown
          const tickSceneB = () => {
            if (isRoundResolvedRef.current || isStageEndedRef.current) return;
            const decElapsed = Date.now() - decisionStartTimeRef.current;
            const decLeft = Math.max(0, decisionDuration - decElapsed);
            setDecisionRemainingMs(decLeft);

            if (decLeft <= 0) {
              animFrameRef.current = null;
              handleTimeoutRef.current();
            } else {
              animFrameRef.current = requestAnimationFrame(tickSceneB);
            }
          };

          animFrameRef.current = requestAnimationFrame(tickSceneB);
        }, transDuration);
      } else {
        animFrameRef.current = requestAnimationFrame(tickSceneA);
      }
    };

    animFrameRef.current = requestAnimationFrame(tickSceneA);

    return () => {
      cancelAllTimers();
    };
  }, [
    question.stage,
    question.index,
    currentRoundIdx,
    introDismissed,
    payload.rounds,
    cancelAllTimers
  ]);

  // Anti-cheat: Visibility change during Scene A, Transition, or Scene B
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isStageEndedRef.current) {
        isStageEndedRef.current = true;
        cancelAllTimers();
        onAnswer({
          rounds: [],
          totalPoints: 0,
          correctRoundsCount: 0,
          isComplete: false
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [cancelAllTimers, onAnswer]);

  // Handle Decision (Cell Click or "No Change" Click)
  const handleDecision = useCallback(
    (clickedIdx: number | null, isNoChangeClick: boolean) => {
      if (
        step !== 'scene_b' ||
        locked ||
        isRoundResolvedRef.current ||
        isStageEndedRef.current
      ) {
        return;
      }

      // Handle Double Change in stages 46+
      if (currentRound.isDoubleChange && clickedIdx !== null) {
        if (firstDoubleClickedCell === null) {
          // First tap recorded, await second tap
          setFirstDoubleClickedCell(clickedIdx);
          sound.tap();
          haptics.light();
          return;
        }
        if (firstDoubleClickedCell === clickedIdx) {
          // Can't click the same cell twice
          return;
        }
      }

      cancelAllTimers();
      isRoundResolvedRef.current = true;
      setStep('feedback');

      const decisionMs = Math.max(50, Date.now() - decisionStartTimeRef.current);
      const remainingMs = Math.max(0, currentRound.decisionTimeLimitMs - decisionMs);

      let isCorrect = false;

      if (currentRound.isNoChange) {
        if (isNoChangeClick) isCorrect = true;
      } else if (currentRound.isDoubleChange) {
        const pair = [firstDoubleClickedCell!, clickedIdx!];
        if (
          pair.every((idx) => currentRound.validTargetIndices.includes(idx)) &&
          pair[0] !== pair[1]
        ) {
          isCorrect = true;
        }
      } else {
        // Single target or swap (touching either swapped cell is correct)
        if (clickedIdx !== null && currentRound.validTargetIndices.includes(clickedIdx)) {
          isCorrect = true;
        }
      }

      if (isCorrect) {
        sound.correct();
        haptics.light();
        streakRef.current += 1;

        if (clickedIdx !== null) {
          setHighlightedCorrectCells(
            currentRound.isDoubleChange
              ? [firstDoubleClickedCell!, clickedIdx]
              : [clickedIdx]
          );
        }

        const isMinorOrDouble =
          currentRound.changeCategory === 'MINOR' ||
          currentRound.changeCategory === 'DOUBLE';
        const earnedPoints = calculateWatchAndJudgeRoundScore(
          payload.stage,
          isMinorOrDouble,
          remainingMs,
          currentRound.decisionTimeLimitMs,
          streakRef.current
        );

        proceedToNextRound('correct', {
          roundIndex: currentRoundIdx,
          clickedCellIndex: clickedIdx,
          clickedNoChange: isNoChangeClick,
          secondClickedCellIndex: firstDoubleClickedCell,
          decisionMs,
          isCorrect: true,
          earnedPoints
        });
      } else {
        sound.wrong();
        haptics.error();
        streakRef.current = 0;

        if (clickedIdx !== null) {
          setHighlightedWrongCell(clickedIdx);
        }
        // Highlight real correct change targets in alert amber/red
        setHighlightedCorrectCells(currentRound.validTargetIndices);

        proceedToNextRound('wrong', {
          roundIndex: currentRoundIdx,
          clickedCellIndex: clickedIdx,
          clickedNoChange: isNoChangeClick,
          secondClickedCellIndex: firstDoubleClickedCell,
          decisionMs,
          isCorrect: false,
          earnedPoints: 0
        });
      }
    },
    [
      step,
      locked,
      currentRound,
      firstDoubleClickedCell,
      cancelAllTimers,
      payload.stage,
      currentRoundIdx,
      proceedToNextRound
    ]
  );

  // Use Hint
  const handleUseHint = useCallback(() => {
    if (
      hintsAvailable <= 0 ||
      step !== 'scene_b' ||
      locked ||
      isRoundResolvedRef.current ||
      isStageEndedRef.current
    ) {
      return;
    }

    setHintsAvailable(0);
    haptics.medium();

    if (currentRound.isNoChange) {
      setHintMessage('لا يوجد أي تغيير في هذا المشهد! اضغط (ما في تغيير)');
    } else {
      const targetIdx = currentRound.validTargetIndices[0]!;
      const row = Math.floor(targetIdx / 5);
      const col = targetIdx % 5;

      // Determine quadrant: 0: Top-Left, 1: Top-Right, 2: Bottom-Left, 3: Bottom-Right
      let quad = 0;
      if (row < 3 && col >= 2) quad = 1;
      else if (row >= 2 && col < 3) quad = 2;
      else if (row >= 2 && col >= 2) quad = 3;

      setHighlightedQuadrant(quad);
    }
  }, [hintsAvailable, step, locked, currentRound]);

  // Keyboard support: Space/0 for No Change, H for Hint, Enter for Intro
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
      } else if (e.key === ' ' || e.key === '0') {
        if (payload.hasNoChangeButton && step === 'scene_b' && !isRoundResolvedRef.current) {
          e.preventDefault();
          handleDecision(null, true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [introDismissed, handleDismissIntro, handleUseHint, handleDecision, payload.hasNoChangeButton, step]);

  // Which scene is active
  const displayedScene: (SceneItem | null)[] =
    step === 'scene_a'
      ? currentRound.sceneA
      : step === 'transition' && currentRound.transitionType === 'DISTRACTOR'
      ? currentRound.distractorScene || []
      : currentRound.sceneB;

  return (
    <div
      className="relative flex flex-col items-center justify-between w-full h-full max-w-md mx-auto select-none px-2 py-1 text-white"
      dir="rtl"
    >
      {/* Intro Modal */}
      {!introDismissed && payload.introCardAr && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md rounded-2xl animate-fade-in">
          <div className="flex flex-col items-center text-center p-6 bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl max-w-xs w-full">
            <span className="text-4xl mb-3">👁️</span>
            <h3 className="text-xl font-bold text-purple-300 mb-2">شاهد واحكم</h3>
            <p className="text-sm text-slate-200 mb-5 leading-relaxed">
              {payload.introCardAr}
            </p>
            <button
              onClick={handleDismissIntro}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-black rounded-xl shadow-lg transition-transform cursor-pointer"
            >
              فهمت، ابدأ! 🚀
            </button>
            <span className="text-xs text-slate-400 mt-2">
              أو اضغط مسافة (Space)
            </span>
          </div>
        </div>
      )}

      {/* Dual-Phase Timer Bar (Blue for Scene A, Multi-color for Scene B) */}
      <div className="w-full max-w-[420px] px-1 pt-1 pb-0.5">
        <div className="relative w-full h-2.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden shadow-inner">
          {step === 'scene_a' && (
            <div
              className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(56,189,248,0.7)]"
              style={{
                width: `${Math.max(0, Math.min(100, (sceneARemainingMs / currentRound.viewDurationMs) * 100))}%`
              }}
            />
          )}
          {step === 'transition' && (
            <div className="h-full w-full bg-purple-600/40 animate-pulse" />
          )}
          {step === 'scene_b' && (
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                decisionRemainingMs / currentRound.decisionTimeLimitMs > 0.5
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                  : decisionRemainingMs / currentRound.decisionTimeLimitMs > 0.25
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                  : 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse'
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, (decisionRemainingMs / currentRound.decisionTimeLimitMs) * 100))}%`
              }}
            />
          )}
          {step === 'feedback' && (
            <div className="h-full w-full bg-slate-800/40" />
          )}
        </div>
      </div>

      {/* Top Header & Rounds Indicator */}
      <div className="w-full flex flex-col gap-1 pt-0.5">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          {/* Rounds Progress Pips (✓ ✗ ○) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">الجولات:</span>
            <div className="flex items-center gap-1.5">
              {roundOutcomes.map((outcome, idx) => {
                const isCurrent = idx === currentRoundIdx;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs border transition-all ${
                      outcome === 'correct'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                        : outcome === 'wrong'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500'
                        : isCurrent
                        ? 'bg-purple-500/20 text-purple-300 border-purple-400 animate-pulse'
                        : 'bg-slate-800 text-slate-600 border-slate-700'
                    }`}
                  >
                    {outcome === 'correct' ? '✓' : outcome === 'wrong' ? '✗' : idx + 1}
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
              step !== 'scene_b' ||
              locked ||
              isRoundResolvedRef.current
            }
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
              hintsAvailable > 0 && step === 'scene_b'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.2)] cursor-pointer'
                : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            تلميح ({hintsAvailable}) 💡
          </button>
        </div>

        {/* Status Prompt & Live Time Notification */}
        <div className="flex items-center justify-between px-2 text-xs">
          <div className="font-bold">
            {step === 'scene_a' ? (
              <span className="inline-flex items-center gap-1.5 text-sky-400 animate-pulse">
                <span>👀</span>
                <span>احفظ المشهد الأول... ({(sceneARemainingMs / 1000).toFixed(1)} ث)</span>
              </span>
            ) : step === 'transition' ? (
              <span className="inline-flex items-center gap-1.5 text-purple-400">
                <span>⏳</span>
                <span>ركّز في الصورة الذهنية...</span>
              </span>
            ) : step === 'scene_b' ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <span>🔍</span>
                <span>شنو تغيّر؟ اضغط على الخلية ({(decisionRemainingMs / 1000).toFixed(1)} ث)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span>✨</span>
                <span>النتيجة...</span>
              </span>
            )}
          </div>

          {/* Double Change Notice */}
          {currentRound.isDoubleChange && step === 'scene_b' && (
            <span className="text-[11px] font-bold text-amber-300 animate-pulse">
              {firstDoubleClickedCell === null ? 'المس التغيير الأول' : 'المس التغيير الثاني!'}
            </span>
          )}
        </div>

        {/* Hint text banner */}
        {hintMessage && (
          <div className="w-full text-center py-1 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-fade-in">
            💡 {hintMessage}
          </div>
        )}
      </div>

      {/* 5x5 Scene Grid */}
      <div className="w-full flex items-center justify-center my-auto py-1">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full max-w-[420px] aspect-square p-2 bg-[#16181D] rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
          {/* Color flash overlay during transition (stages 36-45) */}
          {step === 'transition' && currentRound.transitionType === 'COLOR_FLASH' && (
            <div className="absolute inset-0 grid grid-cols-5 gap-1.5 p-2 bg-slate-950 z-20">
              {flashColors.map((colorClass, cIdx) => (
                <div key={cIdx} className={`rounded-xl ${colorClass} opacity-80 animate-pulse`} />
              ))}
            </div>
          )}

          {/* Grid Cells */}
          {Array.from({ length: 25 }, (_, idx) => {
            const item = displayedScene[idx];
            const isClickable = step === 'scene_b' && !locked && !isRoundResolvedRef.current;
            const isFirstDouble = firstDoubleClickedCell === idx;
            const isHighlightedCorrect = highlightedCorrectCells.includes(idx);
            const isHighlightedWrong = highlightedWrongCell === idx;

            // Quadrant shading for hint
            const row = Math.floor(idx / 5);
            const col = idx % 5;
            let cellQuad = 0;
            if (row < 3 && col >= 2) cellQuad = 1;
            else if (row >= 2 && col < 3) cellQuad = 2;
            else if (row >= 2 && col >= 2) cellQuad = 3;

            const isDimmedByHint =
              highlightedQuadrant !== null && highlightedQuadrant !== cellQuad;

            return (
              <button
                key={idx}
                disabled={!isClickable}
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLElement)?.blur();
                  handleDecision(idx, false);
                }}
                className={`relative flex items-center justify-center rounded-xl border-2 transition-all duration-150 select-none touch-manipulation ${
                  isHighlightedCorrect && !isHighlightedWrong
                    ? step === 'feedback' && highlightedWrongCell !== null
                      ? 'bg-amber-950/90 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)] scale-105 animate-pulse'
                      : 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] scale-105'
                    : isHighlightedWrong
                    ? 'bg-rose-950/80 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-shake'
                    : isFirstDouble
                    ? 'bg-amber-950/80 border-amber-400 scale-105 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                    : isDimmedByHint
                    ? 'bg-slate-900/20 border-slate-900/30 opacity-20'
                    : isClickable
                    ? 'bg-slate-800/40 border-slate-700/60 hover:border-purple-400/50 active:scale-95 cursor-pointer'
                    : 'bg-slate-800/40 border-slate-700/40 cursor-default'
                }`}
              >
                {item && (
                  <svg
                    viewBox="0 0 24 24"
                    fill={item.colorHex || 'currentColor'}
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-150 drop-shadow-sm ${item.textColorClass}`}
                    style={{
                      transform: `rotate(${item.rotationDeg}deg) scale(${item.scale})`
                    }}
                  >
                    <path d={SHAPE_PATHS[item.shape] || SHAPE_PATHS['ARROW']!} />
                  </svg>
                )}

                {/* Vanish Target Indicator on feedback */}
                {!item && isHighlightedCorrect && (
                  <span
                    className={`text-xs font-black ${
                      highlightedWrongCell !== null ? 'text-amber-300' : 'text-emerald-400'
                    }`}
                  >
                    {highlightedWrongCell !== null ? 'اختفى هنا ⚠️' : '✓ اختفى'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom "No Change" Button (Stages 10+) */}
      {payload.hasNoChangeButton && (
        <div className="w-full max-w-[420px] px-1 pb-1">
          <button
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement)?.blur();
              handleDecision(null, true);
            }}
            disabled={step !== 'scene_b' || locked || isRoundResolvedRef.current}
            className={`w-full py-3.5 rounded-xl border font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
              step === 'scene_b' && !locked && !isRoundResolvedRef.current
                ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-200 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <span>[ ما في تغيير ✓ ]</span>
            <span className="text-xs text-slate-400">(مسافة / 0)</span>
          </button>
        </div>
      )}

      {/* Footer Guidance */}
      <div className="w-full text-center pb-1">
        <p className="text-xs text-slate-400 font-medium leading-relaxed">
          {payload.guidanceTextAr}
        </p>
      </div>
    </div>
  );
};
