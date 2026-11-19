'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type {
  FollowPatternQuestionPayload,
  FollowPatternAnswerInput,
  PatternButtonDef
} from './types.js';
import { patternAudio } from './audio.js';
import { sound, haptics } from '@funnygame/ui';

export const FollowPatternView: React.FC<
  GameViewProps<FollowPatternQuestionPayload, FollowPatternAnswerInput>
> = ({ question, onAnswer, locked, onStartTimer }) => {
  const { payload } = question;

  const [introDismissed, setIntroDismissed] = useState(!payload.introCardAr);
  const [phase, setPhase] = useState<'playback' | 'input'>('playback');
  const [activeFlashButtonId, setActiveFlashButtonId] = useState<number | null>(null);
  const [currentInputStep, setCurrentInputStep] = useState(0);
  const [pressedButtonIds, setPressedButtonIds] = useState<number[]>([]);
  const [hintsAvailable, setHintsAvailable] = useState(1);
  const [hintUsedThisQuestion, setHintUsedThisQuestion] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorButtonId, setErrorButtonId] = useState<number | null>(null);
  const [errorExpectedButtonId, setErrorExpectedButtonId] = useState<number | null>(null);
  const [currentPositions, setCurrentPositions] = useState<number[]>(() =>
    payload.buttons.map((b) => b.id)
  );
  const [isSwapping, setIsSwapping] = useState(false);

  const inputStartTimeRef = useRef<number>(0);
  const isAnsweredRef = useRef(false);
  const currentStageRef = useRef(payload.stage);
  const playbackAbortRef = useRef<boolean>(false);

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

  // Handle intro dismissal
  const handleDismissIntro = useCallback(() => {
    setIntroDismissed(true);
    sound.countdown();
    haptics.light();
  }, []);

  // Run playback sequence
  useEffect(() => {
    isAnsweredRef.current = false;
    playbackAbortRef.current = false;
    setPhase('playback');
    setActiveFlashButtonId(null);
    setCurrentInputStep(0);
    setPressedButtonIds([]);
    setIsSuccess(false);
    setErrorButtonId(null);
    setErrorExpectedButtonId(null);
    setHintUsedThisQuestion(false);
    setCurrentPositions(payload.buttons.map((b) => b.id));
    setIsSwapping(false);

    if (!introDismissed) return;

    let isCancelled = false;

    const runPlayback = async () => {
      // Small pause before sequence starts
      await new Promise((r) => setTimeout(r, 450));
      if (isCancelled || playbackAbortRef.current) return;

      const isAudioOnly =
        payload.ruleType === 'AUDIO_ONLY' ||
        payload.ruleType === 'AUDIO_ONLY_REVERSE';

      for (let i = 0; i < payload.shownSequence.length; i++) {
        if (isCancelled || playbackAbortRef.current) return;
        const step = payload.shownSequence[i]!;

        // 1. Flash and sound
        if (!isAudioOnly) {
          setActiveFlashButtonId(step.buttonId);
        }

        if (!step.isDistraction) {
          patternAudio.playButtonNote(step.buttonId, payload.flashDurationMs / 1000);
        }

        // Wait for flash duration
        await new Promise((r) => setTimeout(r, payload.flashDurationMs));
        if (isCancelled || playbackAbortRef.current) return;

        // 2. Off pause
        setActiveFlashButtonId(null);
        await new Promise((r) => setTimeout(r, payload.flashPauseMs));
        if (isCancelled || playbackAbortRef.current) return;
      }

      // Check if position swap should occur
      if (payload.swappedPairs && payload.swappedPairs.length > 0) {
        setIsSwapping(true);
        await new Promise((r) => setTimeout(r, 500));
        if (isCancelled || playbackAbortRef.current) return;
        setCurrentPositions([...payload.gridPositions]);
        setIsSwapping(false);
        await new Promise((r) => setTimeout(r, 250));
      }

      if (isCancelled || playbackAbortRef.current) return;

      // Transition to Input phase
      setPhase('input');
      inputStartTimeRef.current = Date.now();
      onStartTimer?.();
      sound.tap();
      haptics.light();
    };

    runPlayback();

    return () => {
      isCancelled = true;
      playbackAbortRef.current = true;
    };
  }, [
    question.stage,
    question.index,
    introDismissed,
    payload.shownSequence,
    payload.flashDurationMs,
    payload.flashPauseMs,
    payload.ruleType,
    payload.buttons,
    payload.swappedPairs,
    payload.gridPositions,
    onStartTimer
  ]);

  // Handle button tap
  const handleButtonPress = useCallback(
    (buttonId: number) => {
      if (
        phase !== 'input' ||
        locked ||
        isSuccess ||
        errorButtonId !== null ||
        isAnsweredRef.current
      ) {
        return;
      }

      // Flash feedback
      setActiveFlashButtonId(buttonId);
      setTimeout(() => {
        setActiveFlashButtonId((prev) => (prev === buttonId ? null : prev));
      }, 150);

      // Audio & haptic feedback
      patternAudio.playButtonNote(buttonId, 0.14);
      haptics.light();

      const expectedSequence = payload.expectedSequence;
      const expectedId = expectedSequence[currentInputStep];

      if (buttonId === expectedId) {
        // Correct step!
        const nextStep = currentInputStep + 1;
        const newPressed = [...pressedButtonIds, buttonId];

        if (nextStep === expectedSequence.length) {
          // Completed the entire sequence!
          isAnsweredRef.current = true;
          setIsSuccess(true);
          patternAudio.playSuccessChord();
          sound.correct();
          haptics.success();

          const totalInputMs = Math.max(50, Date.now() - inputStartTimeRef.current);
          onAnswer({
            pressedButtonIds: newPressed,
            totalInputMs,
            hintUsed: hintUsedThisQuestion,
            isComplete: true
          });
        } else {
          setCurrentInputStep(nextStep);
          setPressedButtonIds(newPressed);
        }
      } else {
        // Wrong button!
        isAnsweredRef.current = true;
        setErrorButtonId(buttonId);
        setErrorExpectedButtonId(expectedId ?? null);
        patternAudio.playError();
        sound.wrong();
        haptics.error();

        const totalInputMs = Math.max(50, Date.now() - inputStartTimeRef.current);
        onAnswer({
          pressedButtonIds: [...pressedButtonIds, buttonId],
          totalInputMs,
          hintUsed: hintUsedThisQuestion,
          isComplete: false
        });
      }
    },
    [
      phase,
      locked,
      isSuccess,
      errorButtonId,
      payload.expectedSequence,
      currentInputStep,
      pressedButtonIds,
      hintUsedThisQuestion,
      onAnswer
    ]
  );

  // Use hint
  const handleUseHint = useCallback(() => {
    if (
      hintsAvailable <= 0 ||
      phase !== 'input' ||
      locked ||
      isSuccess ||
      errorButtonId !== null ||
      isAnsweredRef.current
    ) {
      return;
    }

    const nextExpectedId = payload.expectedSequence[currentInputStep];
    if (nextExpectedId === undefined) return;

    setHintsAvailable(0);
    setHintUsedThisQuestion(true);
    haptics.medium();

    // Flash next expected button with note
    setActiveFlashButtonId(nextExpectedId);
    patternAudio.playButtonNote(nextExpectedId, 0.45);
    setTimeout(() => {
      setActiveFlashButtonId((prev) => (prev === nextExpectedId ? null : prev));
    }, 450);
  }, [
    hintsAvailable,
    phase,
    locked,
    isSuccess,
    errorButtonId,
    payload.expectedSequence,
    currentInputStep
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
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= currentPositions.length) {
        e.preventDefault();
        const targetBtnId = currentPositions[num - 1];
        if (targetBtnId !== undefined) {
          handleButtonPress(targetBtnId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    introDismissed,
    handleDismissIntro,
    handleUseHint,
    currentPositions,
    handleButtonPress
  ]);

  // Helper to find button definition
  const buttonMap = useRef(new Map<number, PatternButtonDef>());
  payload.buttons.forEach((b) => buttonMap.current.set(b.id, b));

  // Determine grid dimensions
  const buttonCount = payload.buttonCount;
  let gridLayoutClass = 'grid-cols-2';
  if (buttonCount === 8) {
    gridLayoutClass = 'grid-cols-2 sm:grid-cols-4';
  } else if (buttonCount === 6) {
    gridLayoutClass = 'grid-cols-2 sm:grid-cols-3';
  }

  return (
    <div
      className="relative flex flex-col items-center justify-between w-full h-full max-w-md mx-auto select-none px-3 py-2 text-white"
      dir="rtl"
    >
      {/* Intro Modal */}
      {!introDismissed && payload.introCardAr && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md rounded-2xl animate-fade-in">
          <div className="flex flex-col items-center text-center p-6 bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl max-w-xs w-full">
            <span className="text-4xl mb-3">🧠</span>
            <h3 className="text-xl font-bold text-purple-300 mb-2">اتبع النمط</h3>
            <p className="text-sm text-slate-200 mb-5 leading-relaxed">
              {payload.introCardAr}
            </p>
            <button
              onClick={handleDismissIntro}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-bold rounded-xl shadow-lg transition-transform"
            >
              فهمت، ابدأ! 🚀
            </button>
            <span className="text-xs text-slate-400 mt-2">
              أو اضغط مسافة (Space)
            </span>
          </div>
        </div>
      )}

      {/* Top Status & Guidance */}
      <div className="w-full flex flex-col gap-2 pt-1">
        {/* Phase / Rule Status Bar */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="flex items-center gap-2">
            {phase === 'playback' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                راقب النمط 👀
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                دورك الآن 👆
              </span>
            )}
            <span className="text-xs font-semibold text-slate-300">
              {payload.ruleTextAr}
            </span>
          </div>

          {/* Hint Button */}
          <button
            onClick={(e) => {
              (e.currentTarget as HTMLElement)?.blur();
              handleUseHint();
            }}
            disabled={
              hintsAvailable <= 0 ||
              phase !== 'input' ||
              locked ||
              isSuccess ||
              errorButtonId !== null
            }
            className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${
              hintsAvailable > 0 && phase === 'input'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            تلميح ({hintsAvailable}) 💡
          </button>
        </div>

        {/* Input Progress Dots */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {payload.expectedSequence.map((_, idx) => {
            const isFilled = idx < currentInputStep;
            const isCurrent = idx === currentInputStep && phase === 'input';
            return (
              <div
                key={idx}
                className={`transition-all duration-200 rounded-full ${
                  isFilled
                    ? 'w-2.5 h-2.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : isCurrent
                    ? 'w-3 h-3 bg-purple-400 border-2 border-white scale-110 animate-pulse'
                    : 'w-2 h-2 bg-slate-700/60'
                }`}
              />
            );
          })}
        </div>

        {/* Audio Only Notice */}
        {phase === 'playback' &&
          (payload.ruleType === 'AUDIO_ONLY' ||
            payload.ruleType === 'AUDIO_ONLY_REVERSE') && (
            <div className="text-center py-1 text-sm font-bold text-amber-300 animate-pulse">
              🎧 طفّينا الضي! اسمع النغمات وركّز...
            </div>
          )}

        {/* Position Swap Animation Notice */}
        {isSwapping && (
          <div className="text-center py-1 text-sm font-bold text-pink-400 animate-bounce">
            🔀 تبديل أماكن الأزرار! ركّز في اللون والرمز!
          </div>
        )}
      </div>

      {/* Button Grid (Interactive or Playback) */}
      <div
        className={`w-full grid ${gridLayoutClass} gap-3 my-auto py-2 transition-transform duration-300 ${
          isSuccess ? 'ring-2 ring-emerald-500/80 rounded-2xl p-1' : ''
        }`}
      >
        {currentPositions.map((btnId, slotIdx) => {
          const btn = buttonMap.current.get(btnId);
          if (!btn) return null;

          const isFlashing = activeFlashButtonId === btn.id;
          const isErrorTarget = errorButtonId === btn.id;
          const isExpectedReveal = errorExpectedButtonId === btn.id;

          let btnAppearance = `${btn.bgClass} ${btn.borderClass}`;
          if (isFlashing) {
            btnAppearance = `${btn.activeBgClass} ${btn.glowClass} ring-4 ring-white/50`;
          } else if (isErrorTarget) {
            btnAppearance =
              'bg-red-600 border-red-300 text-white shadow-[0_0_25px_rgba(239,68,68,0.9)] scale-[1.02] animate-shake';
          } else if (isExpectedReveal) {
            btnAppearance =
              'bg-emerald-500 border-emerald-200 text-white shadow-[0_0_25px_rgba(16,185,129,0.9)] scale-[1.03] animate-pulse';
          }

          return (
            <button
              key={`${btn.id}-${slotIdx}`}
              disabled={phase !== 'input' || locked || isSuccess || errorButtonId !== null}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement)?.blur();
                handleButtonPress(btn.id);
              }}
              className={`relative flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-2 transition-all duration-150 touch-manipulation select-none active:scale-95 ${btnAppearance} ${
                phase !== 'input' ? 'cursor-default pointer-events-none' : 'cursor-pointer'
              }`}
              style={{ minHeight: buttonCount === 8 ? '85px' : '105px' }}
            >
              {/* Keyboard Badge */}
              <span className="absolute top-2 right-2 text-[10px] sm:text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
                {slotIdx + 1}
              </span>

              {/* Geometric Symbol */}
              <span
                className={`text-3xl sm:text-4xl font-black mb-1 transition-transform ${
                  isFlashing ? 'scale-125' : ''
                }`}
              >
                {btn.shapeSymbol}
              </span>

              {/* Color Label */}
              <span className="text-xs sm:text-sm font-bold tracking-wide">
                {btn.colorName}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Info / Rule Guidance */}
      <div className="w-full text-center pb-2">
        <p className="text-xs text-slate-400 font-medium leading-relaxed">
          {payload.guidanceTextAr}
        </p>
      </div>
    </div>
  );
};
