'use client';

import React, { useEffect, useState, useRef } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type { ColorTrapQuestionPayload } from './logic.js';
import { sound, haptics } from '@funnygame/ui';

export const ColorTrapView: React.FC<GameViewProps<ColorTrapQuestionPayload, string>> = ({
  question,
  onAnswer,
  locked,
  lastVerdict
}) => {
  const { payload } = question;
  const [currentHex, setCurrentHex] = useState(payload.wordHex);
  const [ruleAlert, setRuleAlert] = useState<string | null>(null);
  const answerSubmittedRef = useRef(false);
  const prevRuleRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);

  // Reset local state on new question
  useEffect(() => {
    setCurrentHex(payload.wordHex);
    answerSubmittedRef.current = false;

    // Detect rule change (skip first question of round)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevRuleRef.current = payload.rule;
    } else if (prevRuleRef.current !== null && prevRuleRef.current !== payload.rule) {
      setRuleAlert('تبدّلت القاعدة! اقرأ المطلوب ⚡');
      sound.countdown();
      haptics.light();
      prevRuleRef.current = payload.rule;

      const timer = setTimeout(() => {
        setRuleAlert(null);
      }, 1800);
      return () => clearTimeout(timer);
    }
    prevRuleRef.current = payload.rule;

    // Handle mid-presentation color shift (stages 51+)
    if (payload.shiftHex && payload.shiftDelayMs) {
      const timer = setTimeout(() => {
        if (!answerSubmittedRef.current) {
          setCurrentHex(payload.shiftHex!);
        }
      }, payload.shiftDelayMs);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [question.index, payload.rule, payload.wordHex, payload.shiftHex, payload.shiftDelayMs]);

  const handleChoice = (choiceId: string) => {
    if (locked || answerSubmittedRef.current) return;
    answerSubmittedRef.current = true;

    // Sound & Haptic immediate feedback
    if (choiceId === payload.correctAnswerId) {
      sound.correct();
      haptics.light();
    } else {
      sound.wrong();
      haptics.error();
    }

    onAnswer(choiceId);
  };

  // Keyboard shortcut listener (1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (locked || answerSubmittedRef.current) return;
      const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
      const index = keyMap[e.key];
      if (index !== undefined && payload.options[index]) {
        handleChoice(payload.options[index]!.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [locked, payload.options]);

  // Dynamic styling based on active rule type
  let ruleContainerTheme = 'border-amber-400/50 bg-slate-900/95 text-amber-300';
  let ruleBadgeTheme = 'bg-amber-400/20 text-amber-300 border-amber-400/30';

  if (payload.isSilentRule) {
    ruleContainerTheme = 'border-rose-500/60 bg-rose-950/40 text-rose-400';
    ruleBadgeTheme = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  } else if (payload.rule === 'INK_COLOR') {
    ruleContainerTheme = 'border-emerald-500/60 bg-slate-900/95 text-emerald-300';
    ruleBadgeTheme = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  } else if (payload.rule === 'WORD_MEANING') {
    ruleContainerTheme = 'border-cyan-500/60 bg-slate-900/95 text-cyan-300';
    ruleBadgeTheme = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  } else if (payload.rule === 'COMPOUND') {
    ruleContainerTheme = 'border-purple-500/60 bg-slate-900/95 text-purple-300';
    ruleBadgeTheme = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  }

  return (
    <div className="w-full flex-1 flex flex-col justify-between p-3 select-none touch-none">
      {/* 1. Rule Banner with prominent text & change alert */}
      <div
        className={`relative text-center py-3 sm:py-3.5 px-4 border-2 rounded-2xl mb-3 flex items-center justify-center shadow-lg shadow-black/40 transition-all duration-300 ${ruleContainerTheme} ${
          ruleAlert
            ? 'ring-4 ring-amber-400 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-pulse'
            : ''
        }`}
      >
        {/* Animated Pop Alert on Rule Switch */}
        {ruleAlert && (
          <div className="absolute -top-3.5 px-3 py-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 text-slate-950 text-xs sm:text-sm font-black rounded-full shadow-[0_4px_12px_rgba(245,158,11,0.6)] border border-white/50 flex items-center gap-1.5 animate-bounce z-20">
            <span className="text-base">🔄</span>
            <span>{ruleAlert}</span>
          </div>
        )}

        {!payload.isSilentRule ? (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span
              className={`text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-lg border ${ruleBadgeTheme}`}
            >
              القاعدة:
            </span>
            <span className="text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              {payload.ruleLabelAr}
            </span>
          </div>
        ) : (
          <span className="text-lg sm:text-xl font-black text-rose-400 mx-auto animate-pulse flex items-center justify-center gap-2">
            ⚠️ تبديل صامت! ركّز في المطلوب
          </span>
        )}
      </div>

      {/* 2. Main Center Playing Area (Contrast background #121212) */}
      <div
        className={`flex-1 min-h-[220px] rounded-3xl bg-[#121212] border-2 flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors ${
          lastVerdict?.correct === false ? 'border-red-500/80 animate-shake' : 'border-white/10'
        }`}
      >
        {/* Word 1 (Stroop Word) */}
        <div
          className={`font-black tracking-wider transition-all select-none ${
            payload.isMoving ? 'animate-bounce' : ''
          }`}
          style={{
            fontSize: payload.hasSecondWord ? '2.8rem' : '3.6rem',
            color: currentHex,
            textShadow: '0 4px 18px rgba(0,0,0,0.8)'
          }}
        >
          {payload.wordText}
        </div>

        {/* Word 2 (For Compound stages 26-35) */}
        {payload.hasSecondWord && payload.secondWordText && (
          <div
            className="font-black text-4xl tracking-wider select-none mt-2"
            style={{
              color: payload.secondWordHex,
              textShadow: '0 4px 18px rgba(0,0,0,0.8)'
            }}
          >
            {payload.secondWordText}
          </div>
        )}
      </div>

      {/* 3. 2x2 Grid of 4 Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-1">
        {payload.options.map((option) => {
          const bgStyle = option.deceptiveBgHex
            ? { backgroundColor: option.deceptiveBgHex }
            : { backgroundColor: '#242424' };

          return (
            <button
              key={`${question.index}-${option.id}`}
              onPointerDown={(e) => {
                e.preventDefault();
                handleChoice(option.id);
              }}
              disabled={locked}
              style={bgStyle}
              className="h-20 sm:h-24 min-h-[78px] rounded-3xl border-2 border-white/20 text-white font-black active:scale-95 active:brightness-110 transition-all flex items-center justify-center relative shadow-xl cursor-pointer overflow-hidden"
            >
              {/* Main color label: large, thick, clearly centered */}
              <span className="text-2xl sm:text-3xl font-black text-white px-4 text-center select-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                {option.labelAr}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
