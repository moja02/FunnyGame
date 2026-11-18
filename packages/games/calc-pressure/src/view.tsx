'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type { CalcPressureQuestionPayload, CalcPressureAnswerInput } from './types.js';
import { sound, haptics } from '@funnygame/ui';

export const CalcPressureView: React.FC<
  GameViewProps<CalcPressureQuestionPayload, CalcPressureAnswerInput>
> = ({ question, onAnswer, locked, lastVerdict, onStartTimer }) => {
  const { payload } = question;

  // Local state
  const [introDismissed, setIntroDismissed] = useState(!payload.introCardAr);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showFlashR, setShowFlashR] = useState(false);
  const [revealedR, setRevealedR] = useState<number | null>(null);
  const [revealedRIsError, setRevealedRIsError] = useState(false);
  const [liveTaunt, setLiveTaunt] = useState<string | null>(null);

  const isAnsweredRef = useRef(false);
  const questionStartTimeRef = useRef(Date.now());

  // Dismiss intro and trigger timer
  const handleDismissIntro = useCallback(() => {
    setIntroDismissed(true);
    questionStartTimeRef.current = Date.now();
    sound.countdown();
    haptics.light();
    onStartTimer?.();
  }, [onStartTimer]);

  // Reset state on new question
  useEffect(() => {
    isAnsweredRef.current = false;
    setSelectedChoice(null);
    questionStartTimeRef.current = Date.now();

    if (payload.introCardAr) {
      setIntroDismissed(false);
    } else {
      setIntroDismissed(true);
    }

    // In H mode: flash R momentarily if requested
    if (payload.pattern === 'H' && payload.previousR !== null) {
      setShowFlashR(true);
      const timer = setTimeout(() => {
        setShowFlashR(false);
      }, payload.rhoDurationMs || 800);
      return () => clearTimeout(timer);
    } else {
      setShowFlashR(false);
    }

    if (payload.stage % 5 === 0 && payload.stage > 1) {
      setLiveTaunt('زعيم! الأرقام كلها مع بعضها 😈');
      const tauntTimer = setTimeout(() => setLiveTaunt(null), 1400);
      return () => clearTimeout(tauntTimer);
    }

    return undefined;
  }, [question.index, payload]);

  // Handle wrong verdict in H mode: reveal correct R in green
  useEffect(() => {
    if (lastVerdict && !lastVerdict.correct && payload.pattern === 'H' && payload.newR !== null) {
      setRevealedR(payload.newR);
      setRevealedRIsError(true);
      const timer = setTimeout(() => {
        setRevealedR(null);
        setRevealedRIsError(false);
      }, (payload.rhoDurationMs || 800) + 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lastVerdict, payload.pattern, payload.newR, payload.rhoDurationMs]);

  // Handle Choice Selection
  const handleSelect = useCallback(
    (choiceIndex: number, choiceValue: number) => {
      if (locked || isAnsweredRef.current || !introDismissed) return;

      isAnsweredRef.current = true;
      setSelectedChoice(choiceIndex);

      onAnswer({ choiceIndex, value: choiceValue });
    },
    [locked, introDismissed, onAnswer]
  );

  // Keyboard shortcut listener (1, 2, 3 and Numpad 1, 2, 3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (locked || isAnsweredRef.current) return;

      if (!introDismissed) {
        if (e.key === ' ' || e.key === 'Enter') {
          handleDismissIntro();
        }
        return;
      }

      let choiceIndex: number | null = null;
      if (e.key === '1') choiceIndex = 0;
      else if (e.key === '2') choiceIndex = 1;
      else if (e.key === '3') choiceIndex = 2;

      if (choiceIndex !== null && payload.choices[choiceIndex] !== undefined) {
        handleSelect(choiceIndex, payload.choices[choiceIndex]!);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [locked, introDismissed, handleDismissIntro, handleSelect, payload.choices]);

  // Previous R display formatting
  const renderPreviousRBadge = () => {
    if (payload.pattern === 'S') return null;

    if (payload.pattern === 'L') {
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs font-black text-amber-300">
          <span>⚖️</span>
          <span>مقارنة ناتجين: اختار الأكبر</span>
        </div>
      );
    }

    if (payload.pattern === 'H') {
      if (showFlashR || revealedR !== null) {
        const val = revealedR !== null ? revealedR : payload.previousR;
        return (
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black animate-pulse ${
              revealedRIsError
                ? 'bg-emerald-500/30 border border-emerald-400 text-emerald-200'
                : 'bg-amber-400/25 border border-amber-400/50 text-amber-200'
            }`}
          >
            <span>🧠</span>
            <span>الناتج في الذاكرة:</span>
            <span className="font-mono text-sm font-black text-white px-1.5 py-0.5 bg-black/40 rounded">
              {val}
            </span>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-black text-slate-300">
          <span>🧠</span>
          <span>الناتج السابق:</span>
          <span className="font-mono text-sm font-black text-amber-400 px-2 py-0.5 bg-slate-900 rounded">
            ؟
          </span>
        </div>
      );
    }

    // Pattern C or K
    return (
      <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/90 border border-amber-500/40 rounded-xl text-xs font-black text-amber-300 shadow-sm">
        <span>🔢</span>
        <span>الناتج السابق:</span>
        <span className="font-mono text-base font-black text-white px-2 py-0.5 bg-black/40 rounded">
          {payload.previousR}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between select-none touch-none relative p-2 max-w-[480px] mx-auto h-full">
      {/* 1. Intro Rule Card Modal */}
      {!introDismissed && payload.introCardAr && (
        <div
          onPointerDown={handleDismissIntro}
          onClick={handleDismissIntro}
          className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-3xl mb-3 animate-bounce">
            🧮
          </div>
          <div className="text-xs font-bold text-amber-400 mb-1">
            آلية جديدة في المرحلة {payload.stage}
          </div>
          <h2 className="text-xl font-black text-white max-w-xs leading-relaxed mb-4">
            {payload.introCardAr}
          </h2>
          <div className="text-[11px] font-bold text-slate-400 px-3 py-1 bg-white/10 rounded-full">
            المس الشاشة للبدء ◀
          </div>
        </div>
      )}

      {/* 2. Top Info / Guidance Bar */}
      <div className="h-[7%] min-h-[38px] flex items-center justify-between px-2 mb-1">
        <div className="flex items-center">
          {liveTaunt ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs font-black text-amber-200 animate-fadeIn">
              <span>💬</span>
              <span>{liveTaunt}</span>
            </div>
          ) : (
            renderPreviousRBadge()
          )}
        </div>
        <div className="text-[11px] font-bold text-slate-400 tracking-wide text-left">
          {payload.guidanceTextAr}
        </div>
      </div>

      {/* 3. Center Operation Card (30% Height) */}
      <div className="h-[32%] min-h-[160px] bg-[#121212] border-2 border-slate-800/80 rounded-3xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
        {/* Subtle corner badge */}
        <div className="absolute top-2.5 right-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
          {payload.pattern === 'L'
            ? 'مقارنة'
            : payload.pattern === 'K'
            ? 'سلسلة'
            : payload.pattern === 'H'
            ? 'ذاكرة'
            : payload.pattern === 'C'
            ? 'متراكم'
            : 'عملية'}
        </div>

        {/* Math expression rendered strictly LTR */}
        <div
          dir="ltr"
          style={{ unicodeBidi: 'isolate' }}
          className="w-full flex items-center justify-center font-mono font-black select-none"
        >
          {/* Pattern S */}
          {payload.pattern === 'S' && (
            <div className="text-4xl sm:text-5xl font-black text-white tracking-wider whitespace-nowrap drop-shadow-md">
              {payload.singleExpr}
            </div>
          )}

          {/* Pattern C */}
          {payload.pattern === 'C' && payload.accumulatedStep && (
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-3xl font-light">R</span>
              <span className="text-4xl sm:text-5xl font-black text-amber-300 tracking-wider">
                {payload.accumulatedStep.text}
              </span>
            </div>
          )}

          {/* Pattern K */}
          {payload.pattern === 'K' && payload.chainSteps && (
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-full">
              <div className="px-3 py-1 bg-slate-800 rounded-xl text-slate-300 font-bold text-lg">
                R ({payload.previousR})
              </div>
              {payload.chainSteps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <span className="text-amber-400 text-lg">→</span>
                  <div className="px-3 py-1.5 bg-amber-400/15 border border-amber-400/30 rounded-xl text-xl sm:text-2xl font-black text-amber-200 shadow-sm">
                    {step.text}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Pattern H */}
          {payload.pattern === 'H' && (
            <div className="flex flex-col items-center gap-2">
              {payload.subPattern === 'K' && payload.chainSteps ? (
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-full">
                  <div className="px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-xl text-amber-400 font-black text-lg">
                    R (؟)
                  </div>
                  {payload.chainSteps.map((step, idx) => (
                    <React.Fragment key={idx}>
                      <span className="text-amber-400 text-lg">→</span>
                      <div className="px-3 py-1.5 bg-amber-400/20 border border-amber-400/40 rounded-xl text-xl sm:text-2xl font-black text-amber-100 shadow-sm">
                        {step.text}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              ) : payload.accumulatedStep ? (
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 text-3xl font-bold">R (؟)</span>
                  <span className="text-4xl sm:text-5xl font-black text-amber-300 tracking-wider">
                    {payload.accumulatedStep.text}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Pattern L */}
          {payload.pattern === 'L' && (
            <div className="w-full flex flex-col gap-2.5 max-w-xs">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-2xl">
                <span className="text-xs font-bold text-slate-400">طرف A:</span>
                <span className="text-2xl font-black text-white tracking-wider">
                  {payload.lExprA}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-2xl">
                <span className="text-xs font-bold text-slate-400">طرف B:</span>
                <span className="text-2xl font-black text-white tracking-wider">
                  {payload.lExprB}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="h-[2%]" />

      {/* 4. Three Vertical Choice Buttons (40% Height) */}
      <div className="h-[48%] flex flex-col justify-between gap-2.5 mb-2">
        {payload.choices.map((choiceVal, idx) => {
          const isSelected = selectedChoice === idx;
          const isCorrectChoice = idx === payload.correctChoiceIndex;
          const hasAnswered = selectedChoice !== null;

          let btnBg = 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-white';
          if (hasAnswered) {
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
              disabled={locked || isAnsweredRef.current || !introDismissed}
              className={`w-full flex-1 min-h-[58px] rounded-2xl border-2 flex items-center justify-between px-6 transition-all duration-150 relative active:scale-95 cursor-pointer shadow-lg ${btnBg}`}
            >
              {/* Keyboard digit hint */}
              <span className="text-xs font-mono font-bold text-slate-400/80 px-2 py-0.5 rounded-lg bg-black/25">
                {idx + 1}
              </span>

              {/* Number strictly LTR */}
              <span
                dir="ltr"
                style={{ unicodeBidi: 'isolate' }}
                className="font-mono text-3xl sm:text-4xl font-black tracking-wider text-center flex-1"
              >
                {choiceVal}
              </span>

              {/* Feedback icon */}
              <div className="w-6 flex items-center justify-center">
                {hasAnswered && isCorrectChoice && (
                  <span className="text-xl animate-scaleUp">✓</span>
                )}
                {hasAnswered && isSelected && !isCorrectChoice && (
                  <span className="text-xl animate-scaleUp">✗</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
