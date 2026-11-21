'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type {
  SmartTrapQuestionPayload,
  SmartTrapAnswerInput
} from './types.js';
import { calculateSmartTrapScore } from './logic.js';
import { INTRO_CARDS } from './content.js';
import { sound, haptics } from '@funnygame/ui';

export const SmartTrapView: React.FC<
  GameViewProps<SmartTrapQuestionPayload, SmartTrapAnswerInput>
> = ({ question, onAnswer, locked }) => {
  const { payload } = question;

  const [introDismissed, setIntroDismissed] = useState(!payload.introCardAr);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);
  const [eliminatedChoiceIds, setEliminatedChoiceIds] = useState<number[]>([]);
  const [hintsAvailable, setHintsAvailable] = useState<number>(1);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [remainingTimeMs, setRemainingTimeMs] = useState<number>(payload.timeLimitMs);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [heartsLeft, setHeartsLeft] = useState<number>(3);

  const isResolvedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const comboStreakRef = useRef<number>(0);
  const pendingAnswerRef = useRef<SmartTrapAnswerInput | null>(null);

  // Show a temporary banner notification
  const showNotice = useCallback((msg: string) => {
    setStatusNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setStatusNotice(null);
    }, 1800);
  }, []);

  // Sync intro card state
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

  // Reset state on new question
  useEffect(() => {
    setSelectedChoiceId(null);
    setEliminatedChoiceIds([]);
    setHintUsed(false);
    setShowExplanation(false);
    pendingAnswerRef.current = null;
    isResolvedRef.current = false;
    startTimeRef.current = Date.now();
    setRemainingTimeMs(payload.timeLimitMs);

    // Reset hearts to 3 at beginning of run
    if (question.stage === 1 && question.index === 0) {
      setHeartsLeft(3);
    }

    // Replenish 1 hint on each new stage (or +1 on boss stages)
    if (question.index === 0) {
      setHintsAvailable((h) => Math.min(3, h + 1));
    }

    // Show non-blocking notification for new mechanic introduction
    if (question.stage > 1 && INTRO_CARDS[question.stage] && question.index === 0) {
      showNotice(INTRO_CARDS[question.stage]!);
    } else {
      setStatusNotice(null);
    }
  }, [question.index, question.stage, payload, showNotice]);

  // Smooth, reliable Question Countdown Timer
  useEffect(() => {
    if (!introDismissed || isResolvedRef.current) return;

    startTimeRef.current = Date.now();
    const duration = payload.timeLimitMs;

    const timerId = setInterval(() => {
      if (isResolvedRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const left = Math.max(0, duration - elapsed);
      setRemainingTimeMs(left);

      if (left <= 0) {
        // Time expired! Freeze timer, reveal explanation and wait for player to proceed
        isResolvedRef.current = true;
        clearInterval(timerId);
        sound.wrong();
        haptics.error();
        comboStreakRef.current = 0;
        setShowExplanation(true);
        setHeartsLeft((h) => Math.max(0, h - 1));
        showNotice('انتهى الوقت! طحت في الفخ ⏱️');

        pendingAnswerRef.current = {
          choiceIndex: -1,
          isCorrect: false,
          durationMs: duration,
          hintUsed,
          totalPoints: 0
        };
      }
    }, 50);

    return () => clearInterval(timerId);
  }, [introDismissed, question.index, question.stage, payload.timeLimitMs, hintUsed, showNotice]);

  // Proceed to next question manually when player taps the button
  const handleProceedNext = useCallback(() => {
    if (!pendingAnswerRef.current) return;
    const ans = pendingAnswerRef.current;
    pendingAnswerRef.current = null;
    setShowExplanation(false);
    sound.tap();
    haptics.light();
    onAnswer(ans);
  }, [onAnswer]);

  // Smart Hint: Eliminates 2 wrong choices, ALWAYS including the trap choice!
  const handleUseHint = useCallback(() => {
    if (hintsAvailable <= 0 || !introDismissed || locked || isResolvedRef.current) {
      sound.wrong();
      haptics.error();
      showNotice('لا توجد تلميحات متبقية! تكسب تلميحاً مع كل مرحلة 💡');
      return;
    }

    if (eliminatedChoiceIds.length > 0) {
      showNotice('تم تفعيل التلميح مسبقاً لهذا السؤال!');
      return;
    }

    setHintsAvailable((h) => Math.max(0, h - 1));
    setHintUsed(true);
    sound.tap();
    haptics.medium();

    // Find wrong choices
    // Choice 1 to eliminate: THE TRAP CHOICE!
    const toEliminate: number[] = [payload.trapChoiceIndex];

    // Choice 2 to eliminate: one of the other distractors (not correct, not trap)
    const otherDistractors = payload.choices
      .filter((c) => !c.isCorrect && !c.isTrap)
      .map((c) => c.id);

    if (otherDistractors.length > 0) {
      toEliminate.push(otherDistractors[0]!);
    }

    setEliminatedChoiceIds(toEliminate);
    showNotice('💡 تم حذف الفخ البديهي وخيار خاطئ آخر!');
  }, [
    hintsAvailable,
    introDismissed,
    locked,
    eliminatedChoiceIds.length,
    payload.trapChoiceIndex,
    payload.choices,
    showNotice
  ]);

  // Choice Selection
  const handleSelectChoice = useCallback(
    (choiceId: number) => {
      if (!introDismissed || locked || isResolvedRef.current) return;
      if (eliminatedChoiceIds.includes(choiceId)) return;

      const chosen = payload.choices.find((c) => c.id === choiceId);
      if (!chosen) return;

      isResolvedRef.current = true;
      setSelectedChoiceId(choiceId);
      const durationMs = Math.max(50, Date.now() - startTimeRef.current);

      if (chosen.isCorrect) {
        // Correct Answer!
        sound.correct();
        haptics.success();
        comboStreakRef.current += 1;

        const earnedPoints = calculateSmartTrapScore(
          payload.stage,
          remainingTimeMs,
          payload.timeLimitMs,
          comboStreakRef.current
        );

        setTimeout(() => {
          onAnswer({
            choiceIndex: choiceId,
            isCorrect: true,
            durationMs,
            hintUsed,
            totalPoints: earnedPoints
          });
        }, 350);
      } else {
        // Wrong Answer (fell into trap or picked distractor)
        sound.wrong();
        haptics.error();
        comboStreakRef.current = 0;
        setShowExplanation(true);
        setHeartsLeft((h) => Math.max(0, h - 1));

        if (chosen.isTrap) {
          showNotice('طحت في الفخ البديهي! 🪤');
        } else {
          showNotice('إجابة غير صحيحة! 💔');
        }

        // Store pending answer and let player read explanation at leisure, then click Next
        pendingAnswerRef.current = {
          choiceIndex: choiceId,
          isCorrect: false,
          durationMs,
          hintUsed,
          totalPoints: 0
        };
      }
    },
    [
      introDismissed,
      locked,
      eliminatedChoiceIds,
      payload.choices,
      payload.stage,
      payload.timeLimitMs,
      remainingTimeMs,
      hintUsed,
      showNotice,
      onAnswer
    ]
  );

  // Keyboard navigation: 1, 2, 3, 4 for choices, H for hint, Space/Enter for Next / Intro
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showExplanation) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleProceedNext();
        }
        return;
      }

      if (!introDismissed) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleDismissIntro();
        }
        return;
      }

      if (e.key === '1') handleSelectChoice(0);
      else if (e.key === '2') handleSelectChoice(1);
      else if (e.key === '3') handleSelectChoice(2);
      else if (e.key === '4') handleSelectChoice(3);
      else if (e.key.toLowerCase() === 'h') handleUseHint();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showExplanation,
    introDismissed,
    handleDismissIntro,
    handleProceedNext,
    handleSelectChoice,
    handleUseHint
  ]);

  // Calculate timer percentage for fluid smooth bar
  const timerPercentage = Math.max(0, Math.min(100, (remainingTimeMs / payload.timeLimitMs) * 100));
  const timerColor =
    timerPercentage > 50
      ? 'bg-gradient-to-r from-teal-400 to-emerald-400'
      : timerPercentage > 25
      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
      : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse';

  const questionProgress = (question.index % 5) + 1;

  return (
    <div
      className="relative flex flex-col items-center justify-between w-full h-full max-w-md mx-auto select-none px-2 py-1 text-white overscroll-none"
      dir="rtl"
    >
      {/* Intro Modal */}
      {!introDismissed && payload.introCardAr && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md rounded-2xl animate-fade-in">
          <div className="flex flex-col items-center text-center p-5 bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl max-w-xs w-full">
            <span className="text-4xl mb-2">🪤</span>
            <h3 className="text-xl font-bold text-amber-300 mb-2">الفخ الذكي</h3>
            <p className="text-xs text-slate-200 mb-3 leading-relaxed">
              {payload.introCardAr}
            </p>
            <div className="text-[11px] text-slate-300 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 mb-4 leading-relaxed text-right w-full space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">🧠</span>
                <span className="font-bold text-white">اقرأ اللغز بحذر وفكك معطياته</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span className="font-bold text-amber-400">تجنب الإجابة البديهية المتسرعة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span>زر التلميح يحذف الفخ البديهي وخياراً آخر</span>
              </div>
            </div>
            <button
              onClick={handleDismissIntro}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black rounded-xl shadow-lg transition-transform cursor-pointer"
            >
              فهمت، ابدأ! 🚀
            </button>
            <span className="text-[11px] text-slate-400 mt-2">
              أو اضغط مسافة (Space)
            </span>
          </div>
        </div>
      )}

      {/* Top Header: Progress Dots & Hint Button */}
      <div className="w-full flex flex-col gap-1 pt-0.5">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          {/* Progress in current stage (1 of 5) */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-400">السؤال:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((dot) => (
                <div
                  key={dot}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    dot === questionProgress
                      ? 'bg-amber-400 scale-125 shadow-[0_0_8px_#f59e0b]'
                      : dot < questionProgress
                      ? 'bg-emerald-400'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Category Badge */}
          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700">
            {payload.categoryAr}
          </span>

          {/* Hint Button */}
          <button
            onClick={handleUseHint}
            disabled={hintsAvailable <= 0 || !introDismissed || locked || eliminatedChoiceIds.length > 0 || showExplanation}
            title="يحذف خيارين خاطئين بما في ذلك الفخ البديهي!"
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
              hintsAvailable > 0 && eliminatedChoiceIds.length === 0 && !showExplanation
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.2)] cursor-pointer'
                : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            تلميح ({hintsAvailable}) 💡
          </button>
        </div>

        {/* Fluid Linear Timer Bar */}
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10 my-1 relative">
          <div
            className={`h-full ${timerColor} transition-[width] duration-75 ease-linear rounded-full`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>

        {/* Live message / Feedback toast */}
        <div className="min-h-[18px] text-center">
          {statusNotice && (
            <span className="text-xs font-black text-amber-300 animate-pulse">
              {statusNotice}
            </span>
          )}
        </div>
      </div>

      {/* Main Puzzle Card */}
      <div className="w-full my-auto flex flex-col justify-center">
        <div className="relative p-4 sm:p-5 bg-[#14161A] border-2 border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center text-center">
          <span className="text-xs font-bold text-slate-400 mb-1">
            {payload.isBoss ? '👑 لغز الزعيم' : payload.isBreathing ? '☕ لغز استراحة' : 'لغز منطقي'}
          </span>
          <p className="text-base sm:text-lg font-bold text-slate-100 leading-relaxed max-w-sm">
            {payload.promptAr}
          </p>

          {/* Logical Explanation Box with Manual Next Question button */}
          {showExplanation && (
            <div className="mt-3 p-3 w-full bg-amber-500/15 border-2 border-amber-400/80 rounded-2xl text-xs sm:text-sm font-bold text-amber-200 animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-3 text-right shadow-xl">
              <div className="flex items-start gap-2 flex-1">
                <span className="text-2xl leading-none">💡</span>
                <div className="flex flex-col text-right">
                  <span className="text-xs font-black text-amber-300">التفسير المنطقي:</span>
                  <span className="leading-relaxed text-amber-100 text-xs sm:text-sm">
                    {payload.explanationAr}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleProceedNext}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>{heartsLeft <= 0 ? 'عرض النتيجة' : 'السؤال التالي'}</span>
                <span className="text-base font-black">◀</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4 Vertical Option Buttons */}
      <div className="w-full flex flex-col gap-2 pb-2">
        {payload.choices.map((choice, idx) => {
          const isEliminated = eliminatedChoiceIds.includes(choice.id);
          const isSelected = selectedChoiceId === choice.id;
          const isCorrect = choice.isCorrect;
          const showAnswerState = selectedChoiceId !== null || showExplanation;

          let btnStyle = 'bg-slate-900/90 border-slate-700 text-slate-100 hover:bg-slate-800 active:scale-98';
          if (isEliminated) {
            btnStyle = 'opacity-25 pointer-events-none line-through border-slate-900 bg-slate-950/40 text-slate-600';
          } else if (showAnswerState) {
            if (isCorrect) {
              btnStyle = 'bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse';
            } else if (isSelected) {
              btnStyle = 'bg-rose-500/30 border-rose-500 text-rose-200';
            } else {
              btnStyle = 'opacity-40 border-slate-800 bg-slate-950/40 text-slate-500';
            }
          }

          return (
            <button
              key={choice.id}
              onClick={() => handleSelectChoice(choice.id)}
              disabled={isEliminated || showAnswerState || !introDismissed || locked}
              className={`w-full min-h-[50px] p-2.5 rounded-2xl border-2 flex items-center justify-between transition-all duration-150 cursor-pointer ${btnStyle}`}
            >
              {/* Number key badge (1, 2, 3, 4) */}
              <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-xs font-black text-slate-400 flex items-center justify-center">
                {idx + 1}
              </span>

              {/* Choice Text */}
              <span className="flex-1 text-center font-bold text-xs sm:text-sm px-2">
                {choice.text}
              </span>

              {/* Status Indicator */}
              <span className="w-6 flex items-center justify-center text-sm font-black">
                {showAnswerState && isCorrect && '✓'}
                {showAnswerState && isSelected && !isCorrect && '✗'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
