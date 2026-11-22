'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type {
  CompleteSequencePayload,
  CompleteSequenceAnswerInput,
  SequenceItem,
  SequenceChoice
} from './types.js';
import { calculateCompleteSequenceScore } from './logic.js';
import { ShapeRenderer } from './shapes.js';

export const CompleteSequenceView: React.FC<
  GameViewProps<CompleteSequencePayload, CompleteSequenceAnswerInput>
> = ({ question, onAnswer, locked }) => {
  const payload = question.payload;

  const [introDismissed, setIntroDismissed] = useState<boolean>(!payload.introCardAr);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);
  const [internalLocked, setInternalLocked] = useState<boolean>(false);
  const [hintsAvailable, setHintsAvailable] = useState<number>(1);
  const [hintActive, setHintActive] = useState<boolean>(false);
  const [eliminatedChoiceIds, setEliminatedChoiceIds] = useState<number[]>([]);
  const [remainingTimeMs, setRemainingTimeMs] = useState<number>(payload.timeLimitMs);
  const [showRuleToast, setShowRuleToast] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [heartsLeft, setHeartsLeft] = useState<number>(3);

  const isResolvedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const comboStreakRef = useRef<number>(0);

  const isButtonLocked = locked || internalLocked;

  // Show a temporary banner notification
  const showNotice = useCallback((msg: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setStatusNotice(msg);
    noticeTimerRef.current = setTimeout(() => {
      setStatusNotice(null);
    }, 1500);
  }, []);

  const handleDismissIntro = useCallback(() => {
    setIntroDismissed(true);
    startTimeRef.current = Date.now();
  }, []);

  // Reset state per question
  useEffect(() => {
    setSelectedChoiceId(null);
    setInternalLocked(false);
    setHintActive(false);
    setEliminatedChoiceIds([]);
    setShowRuleToast(false);
    isResolvedRef.current = false;
    startTimeRef.current = Date.now();
    setRemainingTimeMs(payload.timeLimitMs);

    if (question.stage === 1 && question.index === 0) {
      setHeartsLeft(3);
    }

    if (question.index === 0) {
      setHintsAvailable(1);
      if (question.stage > 1) {
        showNotice(`مرحلة جديدة: ${payload.categoryAr}`);
      }
    }
  }, [question.index, question.stage, payload, showNotice]);

  // Smooth Countdown Timer
  useEffect(() => {
    if (!introDismissed) return;

    startTimeRef.current = Date.now();
    isResolvedRef.current = false;

    const timer = setInterval(() => {
      if (isResolvedRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, payload.timeLimitMs - elapsed);
      setRemainingTimeMs(remaining);

      if (remaining <= 0) {
        isResolvedRef.current = true;
        clearInterval(timer);
        handleTimeout();
      }
    }, 50);

    return () => clearInterval(timer);
  }, [introDismissed, question.index, question.stage, payload.timeLimitMs]);

  // Hint button handler
  const handleUseHint = useCallback(() => {
    if (hintsAvailable <= 0 || !introDismissed || isButtonLocked || hintActive) return;

    setHintsAvailable((prev: number) => Math.max(0, prev - 1));
    setHintActive(true);

    if (payload.sequenceType === 'shape') {
      // In shape sequences: eliminate 2 wrong choices
      const wrongIds = payload.choices
        .filter((c: SequenceChoice) => !c.isCorrect)
        .map((c: SequenceChoice) => c.id);

      const eliminated = wrongIds.slice(0, 2);
      setEliminatedChoiceIds(eliminated);
      showNotice('تم حذف خيارين خاطئين!');
    } else {
      showNotice(payload.ruleHintAr);
    }
  }, [hintsAvailable, introDismissed, isButtonLocked, hintActive, payload, showNotice]);

  // Handle timeout
  const handleTimeout = useCallback(() => {
    if (isResolvedRef.current && internalLocked) return;
    isResolvedRef.current = true;
    setInternalLocked(true);
    setShowRuleToast(true);

    comboStreakRef.current = 0;
    const nextHearts = heartsLeft - 1;
    setHeartsLeft(nextHearts);
    showNotice('انتهى الوقت! راح قلب 💔');

    setTimeout(() => {
      setShowRuleToast(false);
      onAnswer({
        choiceIndex: -1,
        isCorrect: false,
        durationMs: payload.timeLimitMs,
        hintUsed: hintActive,
        totalPoints: 0
      });
    }, 850);
  }, [internalLocked, heartsLeft, showNotice, payload.timeLimitMs, hintActive, onAnswer]);

  // Handle choice selection
  const handleSelectChoice = useCallback(
    (choiceId: number) => {
      if (isButtonLocked || isResolvedRef.current || !introDismissed) return;

      isResolvedRef.current = true;
      setInternalLocked(true);
      setSelectedChoiceId(choiceId);

      const durationMs = Math.max(100, Date.now() - startTimeRef.current);
      const remainingMs = Math.max(0, payload.timeLimitMs - durationMs);
      const chosen = payload.choices[choiceId];
      const isCorrect = !!chosen?.isCorrect;

      if (isCorrect) {
        comboStreakRef.current += 1;
        const pts = calculateCompleteSequenceScore(
          question.stage,
          remainingMs,
          payload.timeLimitMs,
          comboStreakRef.current,
          payload.isCompound
        );

        if (comboStreakRef.current >= 10) {
          showNotice('ذكاء خارق! كومبو ×3 مولّع 🔥');
        } else if (comboStreakRef.current >= 5) {
          showNotice('ما شاء الله! كومبو ×2 مضاعف ⚡');
        }

        setTimeout(() => {
          onAnswer({
            choiceIndex: choiceId,
            isCorrect: true,
            durationMs,
            hintUsed: hintActive,
            totalPoints: pts
          });
        }, 350);
      } else {
        // Wrong answer
        comboStreakRef.current = 0;
        setShowRuleToast(true);

        const nextHearts = heartsLeft - 1;
        setHeartsLeft(nextHearts);
        showNotice('مش هذا النمط! راح قلب 💔');

        setTimeout(() => {
          setShowRuleToast(false);
          onAnswer({
            choiceIndex: choiceId,
            isCorrect: false,
            durationMs,
            hintUsed: hintActive,
            totalPoints: 0
          });
        }, 850);
      }
    },
    [
      isButtonLocked,
      introDismissed,
      payload,
      question.stage,
      hintActive,
      heartsLeft,
      showNotice,
      onAnswer
    ]
  );

  // Keyboard navigation: 1, 2, 3, 4, H, Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!introDismissed) {
        if (e.code === 'Space' || e.key === 'Enter') {
          handleDismissIntro();
        }
        return;
      }

      if (e.key === '1' || e.code === 'Numpad1') handleSelectChoice(0);
      else if (e.key === '2' || e.code === 'Numpad2') handleSelectChoice(1);
      else if (e.key === '3' || e.code === 'Numpad3') handleSelectChoice(2);
      else if (e.key === '4' || e.code === 'Numpad4') handleSelectChoice(3);
      else if (e.key.toLowerCase() === 'h') handleUseHint();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [introDismissed, handleDismissIntro, handleSelectChoice, handleUseHint]);

  // Timer percentage for fluid bar
  const timerPercentage = Math.max(0, Math.min(100, (remainingTimeMs / payload.timeLimitMs) * 100));
  const timerColor =
    timerPercentage > 50
      ? 'bg-gradient-to-r from-teal-400 to-emerald-400'
      : timerPercentage > 25
      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
      : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse';

  const questionProgress = (question.index % 5) + 1;

  return (
    <div className="w-full flex justify-center items-start min-h-full py-1 sm:py-2 select-none overflow-x-hidden font-sans">
      <div className="w-full max-w-[480px] flex flex-col gap-2 relative px-2 sm:px-3 text-slate-100">
        {/* Sub Header Bar: Question Progress & Hint Button */}
        <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 shadow-lg">
          {/* Stage Progress Dots */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-400">السؤال:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((dot: number) => (
                <div
                  key={dot}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    dot <= questionProgress
                      ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] scale-110'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Category Badge */}
          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700 max-w-[50%] truncate">
            {payload.categoryAr}
          </span>

          {/* Hint Button */}
          <button
            onClick={handleUseHint}
            disabled={hintsAvailable <= 0 || !introDismissed || isButtonLocked || hintActive}
            title="يكشف الفرق بين أول عنصرين أو يحذف خيارين خاطئين!"
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
              hintsAvailable > 0 && !hintActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.2)] cursor-pointer'
                : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            <span>💡 تلميح ({hintsAvailable})</span>
          </button>
        </div>

        {/* Fluid Linear Timer Bar */}
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10 my-0.5 relative">
          <div
            className={`h-full ${timerColor} transition-[width] duration-75 ease-linear rounded-full`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>

        {/* Category & Status Banner */}
        <div className="flex items-center justify-between text-xs px-2 min-h-[24px]">
          <span className="font-bold text-slate-400 truncate max-w-[70%]">
            {payload.categoryAr}
          </span>
          {statusNotice ? (
            <span className="font-black text-amber-300 animate-pulse text-right">
              {statusNotice}
            </span>
          ) : hintActive ? (
            <span className="font-black text-amber-300 animate-fade-in text-right">
              💡 {payload.ruleHintAr}
            </span>
          ) : (
            <span className="text-slate-500 text-right">اكتشف القاعدة وأكمل المتتالية</span>
          )}
        </div>

        {/* Sequence Display Card */}
        <div className="w-full bg-[#14161A] border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col items-center justify-center gap-3 relative min-h-[140px]">
          {/* LTR Sequence Row */}
          <div
            dir="ltr"
            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap select-none overflow-x-auto py-2"
          >
            {payload.items.map((item: SequenceItem, idx: number) => (
              <React.Fragment key={item.id}>
                {idx > 0 && (
                  <span className="text-slate-500 font-bold text-sm sm:text-base select-none shrink-0">
                    →
                  </span>
                )}

                {item.isMissing ? (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-dashed border-amber-400/90 bg-amber-500/15 flex items-center justify-center text-amber-300 font-black text-lg sm:text-xl shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse shrink-0">
                    ?
                  </div>
                ) : item.type === 'number' ? (
                  <div className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-white font-black text-base sm:text-lg shrink-0 shadow-sm">
                    {item.numValue}
                  </div>
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-sm p-1">
                    {item.shapeValue && <ShapeRenderer data={item.shapeValue} size={36} />}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Rule Toast Display on Error / Timeout */}
          {showRuleToast && (
            <div className="w-full bg-amber-500/20 border border-amber-400/60 rounded-xl p-2 text-xs sm:text-sm font-black text-amber-200 text-center animate-fade-in flex items-center justify-center gap-2">
              <span>💡</span>
              <span>{payload.ruleSummaryAr}</span>
            </div>
          )}
        </div>

        {/* 2x2 Choices Grid */}
        <div className="grid grid-cols-2 gap-2.5 w-full mt-1">
          {payload.choices.map((choice: SequenceChoice, idx: number) => {
            const isEliminated = eliminatedChoiceIds.includes(choice.id);
            const isSelected = selectedChoiceId === choice.id;
            const isCorrect = choice.isCorrect;

            // All choices maintain the same uniform base background color
            let btnStyle = 'bg-slate-800/90 border-slate-700 text-white shadow-md';

            if (isButtonLocked) {
              if (isCorrect) {
                btnStyle =
                  'bg-slate-800/90 text-emerald-300 border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
              } else if (isSelected) {
                btnStyle =
                  'bg-slate-800/90 text-rose-300 border-rose-400 ring-2 ring-rose-400/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
              } else {
                btnStyle = 'bg-slate-800/90 text-slate-300 border-slate-700';
              }
            } else if (isEliminated) {
              btnStyle = 'bg-slate-900/30 text-slate-700 border-slate-900 cursor-not-allowed opacity-20';
            }

            return (
              <button
                key={`q-${question.index}-${choice.id}`}
                type="button"
                disabled={isButtonLocked || isEliminated || !introDismissed}
                onPointerDown={(e) => {
                  e.currentTarget.blur();
                  handleSelectChoice(choice.id);
                }}
                onClick={(e) => {
                  e.currentTarget.blur();
                }}
                className={`relative min-h-[64px] sm:min-h-[72px] rounded-2xl border-2 flex items-center justify-center font-black transition-all active:scale-[0.98] active:bg-slate-700/60 focus:outline-none focus:ring-0 ${btnStyle}`}
              >
                {/* Keyboard key badge */}
                <span className="absolute top-1.5 right-2 text-[10px] font-bold text-slate-400 bg-black/40 px-1.5 py-0.5 rounded">
                  {idx + 1}
                </span>

                {/* Choice Content */}
                {choice.type === 'number' ? (
                  <span dir="ltr" className="text-xl sm:text-2xl font-black tracking-wide">
                    {choice.numValue}
                  </span>
                ) : (
                  choice.shapeValue && <ShapeRenderer data={choice.shapeValue} size={40} />
                )}

                {/* Selection Indicator */}
                {isButtonLocked && isCorrect && (
                  <span className="absolute bottom-1.5 left-2 text-emerald-300 font-black text-sm">
                    ✓
                  </span>
                )}
                {isButtonLocked && isSelected && !isCorrect && (
                  <span className="absolute bottom-1.5 left-2 text-rose-300 font-black text-sm">
                    ✗
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Intro Modal Card */}
        {!introDismissed && payload.introCardAr && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-[380px] bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center gap-4 animate-scale-up">
              <span className="text-4xl">🔢</span>
              <h3 className="text-lg font-black text-amber-300">
                المرحلة {question.stage}: {payload.categoryAr}
              </h3>
              <p className="text-sm font-bold text-slate-200 leading-relaxed">
                {payload.introCardAr}
              </p>
              <button
                type="button"
                onClick={handleDismissIntro}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-2xl shadow-lg active:scale-95 transition-all text-sm cursor-pointer"
              >
                فهمت، ابدأ! 🚀
              </button>
              <span className="text-[11px] text-slate-400">أو اضغط مسافة (Space)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
