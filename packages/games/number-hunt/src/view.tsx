'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type {
  NumberHuntQuestionPayload,
  NumberHuntAnswerInput,
  NumberCard,
  NumberHuntOperator,
  MergeStep
} from './types.js';
import { executeOperation } from './solver.js';
import { sound, haptics } from '@funnygame/ui';

export const NumberHuntView: React.FC<
  GameViewProps<NumberHuntQuestionPayload, NumberHuntAnswerInput>
> = ({ question, onAnswer, locked, onStartTimer }) => {
  const { payload } = question;

  const [introDismissed, setIntroDismissed] = useState(!payload.introCardAr);
  const [cards, setCards] = useState<NumberCard[]>(payload.initialCards);
  const [history, setHistory] = useState<{ cards: NumberCard[]; steps: MergeStep[] }[]>([]);
  const [steps, setSteps] = useState<MergeStep[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<NumberHuntOperator | null>(null);
  const [shakingCardId, setShakingCardId] = useState<string | null>(null);
  const [hintsAvailable, setHintsAvailable] = useState<number>(1);
  const [hintUsedThisQuestion, setHintUsedThisQuestion] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hiddenCardActive, setHiddenCardActive] = useState(false);

  const isAnsweredRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const currentStageRef = useRef(payload.stage);

  // Reset hint when stage advances
  if (currentStageRef.current !== payload.stage) {
    currentStageRef.current = payload.stage;
    setHintsAvailable(1);
  }

  // Handle intro dismissal
  const handleDismissIntro = useCallback(() => {
    setIntroDismissed(true);
    sound.countdown();
    haptics.light();
    onStartTimer?.();
  }, [onStartTimer]);

  // Reset state on new question
  useEffect(() => {
    isAnsweredRef.current = false;
    startTimeRef.current = Date.now();
    setCards(payload.initialCards);
    setHistory([]);
    setSteps([]);
    setSelectedCardId(null);
    setSelectedOp(null);
    setShakingCardId(null);
    setHintUsedThisQuestion(false);
    setIsSuccess(false);
    setHiddenCardActive(false);

    if (payload.introCardAr) {
      setIntroDismissed(false);
    } else {
      setIntroDismissed(true);
    }

    // Handle memory hide card (stage 75+)
    if (payload.hideCardAfterMs) {
      const timer = setTimeout(() => {
        setHiddenCardActive(true);
      }, payload.hideCardAfterMs);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [question.index, payload]);

  // Check goal reached
  const checkGoalReached = useCallback(
    (currentCards: NumberCard[], currentSteps: MergeStep[]) => {
      if (isAnsweredRef.current) return;

      const targetVal = payload.target;
      const matchingCard = currentCards.find(
        (c) => Math.abs(c.value - targetVal) < 0.0001
      );

      if (!matchingCard) return;

      // Check require all numbers condition
      if (payload.requireAllNumbers) {
        if (currentCards.length > 1) {
          return; // Still has unused cards
        }
      }

      // Check golden lock condition
      if (payload.goldenLockCardId && currentSteps.length > 0) {
        const lastStep = currentSteps[currentSteps.length - 1]!;
        const goldenCard = payload.initialCards.find((c) => c.id === payload.goldenLockCardId);
        const usedInFinal =
          lastStep.cardAId === payload.goldenLockCardId ||
          lastStep.cardBId === payload.goldenLockCardId ||
          (goldenCard && (lastStep.cardAValue === goldenCard.value || lastStep.cardBValue === goldenCard.value));

        if (!usedInFinal) {
          return; // Golden lock card not used in final step
        }
      }

      // Reached goal!
      isAnsweredRef.current = true;
      setIsSuccess(true);
      sound.correct();
      haptics.success();

      const reactionTimeMs = Date.now() - startTimeRef.current;
      const remainingMs = Math.max(0, payload.timeLimitMs - reactionTimeMs);

      setTimeout(() => {
        onAnswer({
          steps: currentSteps,
          finalCardValue: matchingCard.value,
          hintUsed: hintUsedThisQuestion,
          remainingMs
        });
      }, 350);
    },
    [payload, hintUsedThisQuestion, onAnswer]
  );

  // Card click handler
  const handleCardClick = useCallback(
    (card: NumberCard) => {
      if (locked || isAnsweredRef.current || !introDismissed) return;

      // If no card selected yet, select this card
      if (!selectedCardId) {
        setSelectedCardId(card.id);
        sound.tap();
        haptics.light();
        return;
      }

      // If clicking same card, deselect
      if (selectedCardId === card.id) {
        setSelectedCardId(null);
        setSelectedOp(null);
        haptics.light();
        return;
      }

      // If clicking second card WITHOUT selecting an operator first, switch selection to second card
      if (!selectedOp) {
        setSelectedCardId(card.id);
        sound.tap();
        haptics.light();
        return;
      }

      // Both card 1, operator, and card 2 are selected -> execute merge!
      const cardA = cards.find((c) => c.id === selectedCardId);
      const cardB = card;

      if (!cardA) {
        setSelectedCardId(null);
        setSelectedOp(null);
        return;
      }

      const allowDecimals = payload.stage >= 46;
      const allowNegatives = payload.stage >= 56;
      const merged = executeOperation(cardA, cardB, selectedOp, allowDecimals, allowNegatives);

      if (!merged) {
        // Invalid operation (e.g. non-clean division in stages < 46 or division by zero)
        sound.wrong();
        haptics.error();
        setShakingCardId(cardB.id);
        setTimeout(() => setShakingCardId(null), 300);
        return;
      }

      // Save history for Undo
      setHistory((prev) => [...prev, { cards: [...cards], steps: [...steps] }]);

      const newStep: MergeStep = {
        cardAId: cardA.id,
        cardAValue: cardA.value,
        op: selectedOp,
        cardBId: cardB.id,
        cardBValue: cardB.value,
        resultId: merged.id,
        resultValue: merged.value
      };

      const nextCards = cards.filter((c) => c.id !== cardA.id && c.id !== cardB.id);
      nextCards.push(merged);

      const nextSteps = [...steps, newStep];
      setCards(nextCards);
      setSteps(nextSteps);
      setSelectedCardId(null);
      setSelectedOp(null);

      sound.tap();
      haptics.light();

      checkGoalReached(nextCards, nextSteps);
    },
    [
      cards,
      steps,
      selectedCardId,
      selectedOp,
      locked,
      introDismissed,
      payload.stage,
      checkGoalReached
    ]
  );

  // Operator select handler
  const handleOpClick = useCallback(
    (op: NumberHuntOperator) => {
      if (locked || isAnsweredRef.current || !introDismissed) return;
      if (payload.forbiddenOps.includes(op)) return;

      if (selectedOp === op) {
        setSelectedOp(null);
      } else {
        setSelectedOp(op);
        sound.tap();
        haptics.light();
      }
    },
    [locked, introDismissed, payload.forbiddenOps, selectedOp]
  );

  // Undo last step
  const handleUndo = useCallback(() => {
    if (locked || isAnsweredRef.current || !introDismissed || history.length === 0) return;

    const previousState = history[history.length - 1]!;
    setCards(previousState.cards);
    setSteps(previousState.steps);
    setHistory((prev) => prev.slice(0, -1));
    setSelectedCardId(null);
    setSelectedOp(null);
    sound.countdown();
    haptics.light();
  }, [history, locked, introDismissed]);

  // Clear all steps back to initial
  const handleClear = useCallback(() => {
    if (locked || isAnsweredRef.current || !introDismissed || steps.length === 0) return;

    setCards(payload.initialCards);
    setSteps([]);
    setHistory([]);
    setSelectedCardId(null);
    setSelectedOp(null);
    sound.countdown();
    haptics.light();
  }, [payload.initialCards, steps.length, locked, introDismissed]);

  // 💡 Hint Button: Executes first correct step
  const handleUseHint = useCallback(() => {
    if (
      hintsAvailable <= 0 ||
      hintUsedThisQuestion ||
      locked ||
      !introDismissed ||
      !payload.solutionSteps ||
      payload.solutionSteps.length === 0
    ) {
      return;
    }

    const firstStep = payload.solutionSteps[0]!;
    // Find matching cards in current cards
    const cardA = cards.find(
      (c) => c.id === firstStep.cardAId || Math.abs(c.value - firstStep.cardAValue) < 0.0001
    );
    const cardB = cards.find(
      (c) => c.id !== cardA?.id && (c.id === firstStep.cardBId || Math.abs(c.value - firstStep.cardBValue) < 0.0001)
    );

    if (!cardA || !cardB) {
      // If user has already manipulated cards, reset to initial and apply hint
      const initCardA = payload.initialCards.find(
        (c) => c.id === firstStep.cardAId || Math.abs(c.value - firstStep.cardAValue) < 0.0001
      );
      const initCardB = payload.initialCards.find(
        (c) => c.id !== initCardA?.id && (c.id === firstStep.cardBId || Math.abs(c.value - firstStep.cardBValue) < 0.0001)
      );

      if (initCardA && initCardB) {
        const merged = executeOperation(
          initCardA,
          initCardB,
          firstStep.op,
          payload.stage >= 46,
          payload.stage >= 56
        );
        if (merged) {
          const nextCards = payload.initialCards.filter(
            (c) => c.id !== initCardA.id && c.id !== initCardB.id
          );
          nextCards.push(merged);
          setCards(nextCards);
          setSteps([firstStep]);
          setHistory([{ cards: payload.initialCards, steps: [] }]);
          checkGoalReached(nextCards, [firstStep]);
        }
      }
    } else {
      const merged = executeOperation(
        cardA,
        cardB,
        firstStep.op,
        payload.stage >= 46,
        payload.stage >= 56
      );
      if (merged) {
        setHistory((prev) => [...prev, { cards: [...cards], steps: [...steps] }]);
        const nextCards = cards.filter((c) => c.id !== cardA.id && c.id !== cardB.id);
        nextCards.push(merged);
        const nextSteps = [...steps, firstStep];
        setCards(nextCards);
        setSteps(nextSteps);
        checkGoalReached(nextCards, nextSteps);
      }
    }

    sound.countdown();
    haptics.light();
    setHintsAvailable((prev) => Math.max(0, prev - 1));
    setHintUsedThisQuestion(true);
    setSelectedCardId(null);
    setSelectedOp(null);
  }, [
    hintsAvailable,
    hintUsedThisQuestion,
    locked,
    introDismissed,
    payload,
    cards,
    steps,
    checkGoalReached
  ]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (locked || isAnsweredRef.current) return;

      if (!introDismissed) {
        if (e.key === ' ' || e.key === 'Enter') handleDismissIntro();
        return;
      }

      // Numbers 1-6 for cards
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= cards.length) {
        const targetCard = cards[num - 1];
        if (targetCard) handleCardClick(targetCard);
        return;
      }

      // Operators
      if (e.key === '+') handleOpClick('+');
      else if (e.key === '-' || e.key === '−') handleOpClick('−');
      else if (e.key === '*' || e.key === '×') handleOpClick('×');
      else if (e.key === '/' || e.key === '÷') handleOpClick('÷');

      // Undo: Backspace or Z
      if (e.key === 'Backspace' || e.key.toLowerCase() === 'z') {
        handleUndo();
      }

      // Clear: Escape or C
      if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    locked,
    introDismissed,
    cards,
    handleDismissIntro,
    handleCardClick,
    handleOpClick,
    handleUndo,
    handleClear
  ]);

  return (
    <div className="w-full flex-1 flex flex-col select-none touch-none relative px-2 pt-1 pb-6 sm:pb-8 max-w-[480px] mx-auto h-full min-h-0 overflow-hidden">
      {/* 1. Intro Rule Card Modal (Only at start of match) */}
      {!introDismissed && payload.introCardAr && (
        <div
          onPointerDown={handleDismissIntro}
          onClick={handleDismissIntro}
          className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-3xl mb-3 animate-bounce">
            🎯
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

      {/* 2. Top Bar (Hint & Guidance) */}
      <div className="shrink-0 flex items-center justify-between px-2 py-0.5 min-h-[28px] text-xs mb-1">
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            handleUseHint();
          }}
          disabled={hintsAvailable <= 0 || hintUsedThisQuestion || locked || !introDismissed}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
            hintsAvailable > 0 && !hintUsedThisQuestion
              ? 'bg-amber-400/20 border-amber-400/40 text-amber-300 active:scale-95 cursor-pointer shadow-sm'
              : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-40 cursor-not-allowed'
          }`}
        >
          <span>💡</span>
          <span>تلميح ({hintsAvailable})</span>
        </button>

        <div className="text-[11px] font-bold text-slate-400 tracking-wide text-left truncate max-w-[240px]">
          {payload.guidanceTextAr}
        </div>
      </div>

      {/* 3. Target Card with Active Constraint Badges */}
      <div
        className={`w-full min-h-[100px] sm:min-h-[110px] max-h-[125px] rounded-2xl sm:rounded-3xl p-3 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl shrink-0 border-2 transition-all duration-300 ${
          isSuccess
            ? 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
            : 'bg-[#14161A] border-slate-800/80'
        }`}
      >
        {/* Constraint badges */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-center">
          {payload.forbiddenOps.map((op, idx) => (
            <span
              key={idx}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300"
            >
              ممنوع: {op}
            </span>
          ))}
          {payload.requireAllNumbers && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300">
              استعمل كل الأرقام 🔒
            </span>
          )}
          {payload.goldenLockCardId && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-yellow-500/20 border border-yellow-500/40 text-yellow-300">
              القفل الذهبي 🔑
            </span>
          )}
        </div>

        {/* Target display strictly LTR */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-slate-400">الهدف:</span>
          <span
            dir="ltr"
            style={{ unicodeBidi: 'isolate' }}
            className={`font-mono text-3xl sm:text-4xl font-black tracking-wider transition-all ${
              isSuccess ? 'text-emerald-300 scale-105' : 'text-amber-400'
            }`}
          >
            {payload.targetDisplay}
          </span>
          {isSuccess && <span className="text-2xl text-emerald-300 animate-scaleUp">✓</span>}
        </div>
      </div>

      {/* 4. Number Cards Grid */}
      <div className="flex-1 flex items-center justify-center min-h-0 py-2 sm:py-3">
        <div
          className={`grid gap-2.5 sm:gap-3 w-full max-w-[420px] justify-items-center ${
            cards.length <= 4
              ? 'grid-cols-2'
              : cards.length === 5
              ? 'grid-cols-3'
              : 'grid-cols-3'
          }`}
        >
          {cards.map((card, idx) => {
            const isSelected = selectedCardId === card.id;
            const isShaking = shakingCardId === card.id;
            const isGolden = card.isGoldenLocked;
            const isHidden = hiddenCardActive && idx === payload.hiddenCardIndex;

            let borderCls = 'border-slate-800 bg-[#161a23] text-white';
            if (isSelected) {
              borderCls = 'border-amber-400 ring-2 ring-amber-400/80 bg-amber-500/20 text-white -translate-y-1 shadow-lg shadow-amber-500/20';
            } else if (isGolden) {
              borderCls = 'border-yellow-500/80 bg-yellow-950/20 text-yellow-300 ring-1 ring-yellow-500/40';
            }

            return (
              <button
                key={`q-${question.index}-${card.id}`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleCardClick(card);
                }}
                disabled={locked || isAnsweredRef.current || !introDismissed}
                className={`w-[84px] h-[74px] sm:w-[94px] sm:h-[84px] rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-150 relative active:scale-95 cursor-pointer select-none focus:outline-none focus:ring-0 ${borderCls} ${
                  isShaking ? 'animate-shake' : ''
                }`}
              >
                {/* Digit hint badge */}
                <span className="absolute top-1 left-2 text-[10px] font-mono text-slate-500 font-bold pointer-events-none">
                  {idx + 1}
                </span>

                {/* Golden lock icon */}
                {isGolden && (
                  <span className="absolute top-1 right-2 text-xs text-yellow-400 pointer-events-none">
                    🔒
                  </span>
                )}

                {/* Card value */}
                <span
                  dir="ltr"
                  style={{ unicodeBidi: 'isolate' }}
                  className="font-mono text-2xl sm:text-3xl font-black tracking-normal text-center select-none"
                >
                  {isHidden ? '?' : card.displayValue}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Operators Bar (4 Buttons) */}
      <div className="grid grid-cols-4 gap-2 w-full shrink-0 mb-2">
        {(['+', '−', '×', '÷'] as NumberHuntOperator[]).map((op) => {
          const isForbidden = payload.forbiddenOps.includes(op);
          const isSelected = selectedOp === op;

          let opBg = 'bg-slate-900 border-slate-800 text-white active:bg-slate-800';
          if (isForbidden) {
            opBg = 'bg-slate-950/50 border-slate-900/60 text-slate-700 opacity-25 cursor-not-allowed';
          } else if (isSelected) {
            opBg = 'bg-sky-500/20 border-sky-400 text-sky-300 ring-2 ring-sky-400/70 -translate-y-0.5 shadow-md shadow-sky-500/20';
          }

          return (
            <button
              key={op}
              onClick={(e) => {
                e.currentTarget.blur();
                handleOpClick(op);
              }}
              disabled={locked || isAnsweredRef.current || !introDismissed || isForbidden}
              className={`h-[48px] sm:h-[54px] rounded-2xl border-2 flex items-center justify-center text-2xl sm:text-3xl font-black font-mono transition-all duration-150 active:scale-95 cursor-pointer select-none focus:outline-none focus:ring-0 ${opBg}`}
            >
              {isForbidden ? '🚫' : op}
            </button>
          );
        })}
      </div>

      {/* 6. Controls Bar (Undo & Clear) */}
      <div className="grid grid-cols-2 gap-2.5 w-full shrink-0">
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            handleUndo();
          }}
          disabled={locked || isAnsweredRef.current || !introDismissed || history.length === 0}
          className={`h-[46px] sm:h-[50px] rounded-2xl border-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-black transition-all active:scale-95 select-none focus:outline-none focus:ring-0 ${
            history.length > 0
              ? 'bg-slate-900 border-slate-700 text-slate-200 active:bg-slate-800 cursor-pointer shadow-sm'
              : 'bg-slate-950/40 border-slate-900/40 text-slate-600 opacity-40 cursor-not-allowed'
          }`}
        >
          <span>↩️</span>
          <span>تراجع (Undo)</span>
        </button>

        <button
          onClick={(e) => {
            e.currentTarget.blur();
            handleClear();
          }}
          disabled={locked || isAnsweredRef.current || !introDismissed || steps.length === 0}
          className={`h-[46px] sm:h-[50px] rounded-2xl border-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-black transition-all active:scale-95 select-none focus:outline-none focus:ring-0 ${
            steps.length > 0
              ? 'bg-rose-950/30 border-rose-900/60 text-rose-300 active:bg-rose-950/50 cursor-pointer shadow-sm'
              : 'bg-slate-950/40 border-slate-900/40 text-slate-600 opacity-40 cursor-not-allowed'
          }`}
        >
          <span>🗑️</span>
          <span>مسح (Clear)</span>
        </button>
      </div>
    </div>
  );
};
