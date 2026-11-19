'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type { MathBridgeQuestionPayload, MathBridgeAnswerInput } from './types.js';
import { sound, haptics } from '@funnygame/ui';

export const MathBridgeView: React.FC<
  GameViewProps<MathBridgeQuestionPayload, MathBridgeAnswerInput>
> = ({ question, onAnswer, locked, onStartTimer }) => {
  const { payload } = question;

  const [introDismissed, setIntroDismissed] = useState(!payload.introCardAr);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [hintsAvailable, setHintsAvailable] = useState<number>(1);
  const [disabledChoices, setDisabledChoices] = useState<Set<number>>(new Set());
  const [hintUsedThisQuestion, setHintUsedThisQuestion] = useState(false);
  const [hideLinkedEquation, setHideLinkedEquation] = useState(false);

  const isAnsweredRef = useRef(false);
  const currentStageRef = useRef(payload.stage);

  // Reset hints when stage changes
  if (currentStageRef.current !== payload.stage) {
    currentStageRef.current = payload.stage;
    setHintsAvailable(1);
  }

  // Dismiss intro and trigger timer
  const handleDismissIntro = useCallback(() => {
    setIntroDismissed(true);
    sound.countdown();
    haptics.light();
    onStartTimer?.();
  }, [onStartTimer]);

  // Reset state on new question
  useEffect(() => {
    isAnsweredRef.current = false;
    setSelectedChoice(null);
    setDisabledChoices(new Set());
    setHintUsedThisQuestion(false);
    setHideLinkedEquation(false);

    if (payload.introCardAr) {
      setIntroDismissed(false);
    } else {
      setIntroDismissed(true);
    }

    // Handle memory flash for linked equations (stages 61+)
    if (payload.hideFirstEquationAfterMs) {
      const timer = setTimeout(() => {
        setHideLinkedEquation(true);
      }, payload.hideFirstEquationAfterMs);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [question.index, payload]);

  // Answer handler
  const handleSelect = useCallback(
    (choiceIndex: number, choiceValue: string) => {
      if (
        locked ||
        isAnsweredRef.current ||
        !introDismissed ||
        disabledChoices.has(choiceIndex)
      ) {
        return;
      }

      isAnsweredRef.current = true;
      setSelectedChoice(choiceIndex);

      onAnswer({
        choiceIndex,
        choiceValue,
        hintUsed: hintUsedThisQuestion
      });
    },
    [locked, introDismissed, disabledChoices, hintUsedThisQuestion, onAnswer]
  );

  // 50/50 Hint button handler
  const handleUseHint = useCallback(() => {
    if (hintsAvailable <= 0 || hintUsedThisQuestion || locked || !introDismissed) {
      return;
    }

    const wrongIndices = [0, 1, 2, 3].filter(
      (idx) => idx !== payload.correctChoiceIndex
    );

    // Pick 2 wrong indices to disable
    const toDisable = new Set<number>();
    while (toDisable.size < 2 && wrongIndices.length > 0) {
      const pick = wrongIndices.splice(
        Math.floor(Math.random() * wrongIndices.length),
        1
      )[0]!;
      toDisable.add(pick);
    }

    sound.countdown();
    haptics.light();
    setDisabledChoices(toDisable);
    setHintsAvailable((prev) => Math.max(0, prev - 1));
    setHintUsedThisQuestion(true);
  }, [hintsAvailable, hintUsedThisQuestion, locked, introDismissed, payload.correctChoiceIndex]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (locked || isAnsweredRef.current) return;

      if (!introDismissed) {
        if (e.key === ' ' || e.key === 'Enter') {
          handleDismissIntro();
        }
        return;
      }

      // Hint key (H)
      if (e.key === 'h' || e.key === 'H') {
        handleUseHint();
        return;
      }

      // Digit keys 1, 2, 3, 4
      const digitMap: Record<string, number> = {
        '1': 0,
        '2': 1,
        '3': 2,
        '4': 3
      };
      if (digitMap[e.key] !== undefined) {
        const idx = digitMap[e.key]!;
        if (payload.choices[idx] !== undefined && !disabledChoices.has(idx)) {
          handleSelect(idx, payload.choices[idx]!);
          return;
        }
      }

      // Direct operator keys for single_op (+, -, *, /)
      if (payload.pattern === 'single_op' || payload.pattern === 'negative_res') {
        let opChar: string | null = null;
        if (e.key === '+') opChar = '+';
        else if (e.key === '-') opChar = '−';
        else if (e.key === '*' || e.key === 'x' || e.key === 'X') opChar = '×';
        else if (e.key === '/') opChar = '÷';
        else if (e.key === '%') opChar = '%';

        if (opChar) {
          const matchIdx = payload.choices.indexOf(opChar);
          if (matchIdx !== -1 && !disabledChoices.has(matchIdx)) {
            handleSelect(matchIdx, opChar);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    locked,
    introDismissed,
    disabledChoices,
    payload.choices,
    payload.pattern,
    handleDismissIntro,
    handleSelect,
    handleUseHint
  ]);

  // Format equation with highlighted [ ? ] slot
  const renderEquationText = () => {
    const raw = payload.equationText;
    const parts = raw.split(/(\[\s*\?\d*\s*\])/g);

    return (
      <div
        dir="ltr"
        style={{ unicodeBidi: 'isolate' }}
        className="font-mono text-2xl sm:text-3xl font-black text-white tracking-wider flex items-center justify-center flex-wrap gap-2 text-center"
      >
        {parts.map((part, idx) => {
          if (/^\[\s*\?\d*\s*\]$/.test(part)) {
            let slotContent: React.ReactNode = '?';
            let slotBg = 'bg-amber-400/20 border-amber-400/60 text-amber-300 animate-pulse';

            if (selectedChoice !== null) {
              const isCorrect = selectedChoice === payload.correctChoiceIndex;
              slotContent = payload.correctChoiceValue;
              slotBg = isCorrect
                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                : 'bg-rose-500/30 border-rose-400 text-rose-300';
            }

            return (
              <span
                key={idx}
                className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-xl border-2 font-mono text-xl sm:text-2xl font-black shadow-inner min-w-[42px] ${slotBg}`}
              >
                {slotContent}
              </span>
            );
          }

          return (
            <span key={idx} className="drop-shadow-sm">
              {part}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full flex-1 flex flex-col select-none touch-none relative px-2 pt-1 pb-6 sm:pb-8 max-w-[420px] mx-auto h-full min-h-0 overflow-hidden">
      {/* 1. Intro Rule Card Modal */}
      {!introDismissed && payload.introCardAr && (
        <div
          onPointerDown={handleDismissIntro}
          onClick={handleDismissIntro}
          className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-3xl mb-3 animate-bounce">
            🌉
          </div>
          <div className="text-xs font-bold text-amber-400 mb-1">
            {payload.stage === 1 ? 'طريقة اللعب' : `آلية جديدة في المرحلة ${payload.stage}`}
          </div>
          <h2 className="text-xl font-black text-white max-w-xs leading-relaxed mb-4">
            {payload.introCardAr}
          </h2>
          <div className="text-[11px] font-bold text-slate-400 px-3 py-1 bg-white/10 rounded-full">
            المس الشاشة للبدء ◀
          </div>
        </div>
      )}

      {/* 2. Top Info & Hint Bar */}
      <div className="shrink-0 flex items-center justify-between px-2 py-0.5 min-h-[28px] text-xs mb-1">
        <button
          onClick={handleUseHint}
          disabled={hintsAvailable <= 0 || hintUsedThisQuestion || locked || !introDismissed}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
            hintsAvailable > 0 && !hintUsedThisQuestion
              ? 'bg-amber-400/20 border-amber-400/40 text-amber-300 hover:bg-amber-400/30 active:scale-95 cursor-pointer shadow-sm'
              : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-40 cursor-not-allowed'
          }`}
        >
          <span>💡</span>
          <span>تلميح ({hintsAvailable})</span>
        </button>

        <div className="text-[11px] font-bold text-slate-400 tracking-wide text-left">
          {payload.guidanceTextAr}
        </div>
      </div>

      {/* 3. Centered Content (Card & Buttons) */}
      <div className="flex-1 flex flex-col justify-center gap-3 sm:gap-4 min-h-0 my-auto">
        {/* Equation Card */}
        <div className="w-full min-h-[125px] sm:min-h-[145px] max-h-[165px] bg-[#14161A] border-2 border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl shrink-0">
          {/* Subtle corner badge */}
          <div className="absolute top-2.5 right-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
            {payload.pattern === 'linked_eq'
              ? 'مترابطة'
              : payload.pattern === 'modulo'
              ? 'باقي قسمة'
              : payload.pattern === 'square_roots'
              ? 'جذور'
              : payload.pattern === 'triple_exponents'
              ? 'أسس'
              : payload.pattern === 'missing_num'
              ? 'رقم مجهول'
              : payload.pattern === 'parentheses'
              ? 'أقواس'
              : payload.pattern === 'double_op'
              ? 'خانتين'
              : 'معادلة'}
          </div>

          {/* Linked Equation X = ... if applicable */}
          {payload.linkedEquationText && (
            <div
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
              className={`font-mono text-sm sm:text-base font-bold text-amber-300/90 mb-2 px-3 py-1 bg-amber-400/10 border border-amber-400/30 rounded-xl transition-opacity duration-300 ${
                hideLinkedEquation ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {payload.linkedEquationText}
            </div>
          )}

          {/* Target Equation */}
          {renderEquationText()}
        </div>

        {/* 4. 2x2 Grid of 4 Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 w-full shrink-0">
          {payload.choices.map((choiceVal, idx) => {
            const isSelected = selectedChoice === idx;
            const isCorrectChoice = idx === payload.correctChoiceIndex;
            const hasAnswered = selectedChoice !== null;
            const isDisabled = disabledChoices.has(idx);

            let btnBg = 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-white';
            if (isDisabled) {
              btnBg = 'bg-slate-950/40 border-slate-900/40 text-slate-700 opacity-20 pointer-events-none';
            } else if (hasAnswered) {
              if (isCorrectChoice) {
                btnBg =
                  'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-[1.02]';
              } else if (isSelected) {
                btnBg =
                  'bg-rose-600 border-rose-400 text-white animate-shake shadow-[0_0_15px_rgba(244,63,94,0.4)]';
              } else {
                btnBg = 'bg-slate-950/60 border-slate-800/40 text-slate-500 opacity-40';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx, choiceVal)}
                disabled={locked || isAnsweredRef.current || !introDismissed || isDisabled}
                className={`h-[54px] sm:h-[60px] min-h-[48px] rounded-2xl border-2 flex items-center justify-between px-4 sm:px-5 transition-all duration-150 relative active:scale-95 cursor-pointer shadow-md ${btnBg}`}
              >
                {/* Keyboard digit hint */}
                <span className="text-xs font-mono font-bold text-slate-400/80 px-2 py-0.5 rounded-lg bg-black/25">
                  {idx + 1}
                </span>

                {/* Choice Text (strictly LTR) */}
                <span
                  dir="ltr"
                  style={{ unicodeBidi: 'isolate' }}
                  className="font-mono text-xl sm:text-2xl font-black tracking-wider text-center flex-1"
                >
                  {choiceVal}
                </span>

                {/* Feedback icon */}
                <div className="w-5 flex items-center justify-center">
                  {hasAnswered && isCorrectChoice && (
                    <span className="text-lg animate-scaleUp text-white">✓</span>
                  )}
                  {hasAnswered && isSelected && !isCorrectChoice && (
                    <span className="text-lg animate-scaleUp text-white">✗</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
