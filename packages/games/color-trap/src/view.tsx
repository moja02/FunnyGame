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
  const answerSubmittedRef = useRef(false);

  // Reset local state on new question
  useEffect(() => {
    setCurrentHex(payload.wordHex);
    answerSubmittedRef.current = false;

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
  }, [question.index, payload.wordHex, payload.shiftHex, payload.shiftDelayMs]);

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

  return (
    <div className="w-full flex-1 flex flex-col justify-between p-3 select-none touch-none">
      {/* 1. Rule Banner */}
      <div className="text-center py-1.5 px-3 bg-slate-900/90 border border-white/10 rounded-xl mb-2 flex items-center justify-between">
        {!payload.isSilentRule ? (
          <span className="text-xs font-black text-amber-400 mx-auto tracking-wide">
            القاعدة: {payload.ruleLabelAr}
          </span>
        ) : (
          <span className="text-xs font-black text-rose-400 mx-auto animate-pulse">
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
        {payload.options.map((option, idx) => {
          const keyLabel = idx + 1;
          const bgStyle = option.deceptiveBgHex
            ? { backgroundColor: option.deceptiveBgHex }
            : { backgroundColor: '#2A2A2A' };

          return (
            <button
              key={`${question.index}-${option.id}`}
              onPointerDown={(e) => {
                e.preventDefault();
                handleChoice(option.id);
              }}
              disabled={locked}
              style={bgStyle}
              className="h-16 min-h-[64px] rounded-2xl border-2 border-white/15 text-white font-black text-lg active:scale-95 active:brightness-125 transition-transform flex items-center justify-center relative shadow-lg cursor-pointer"
            >
              <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {option.labelAr}
              </span>
              {/* Keyboard indicator */}
              <span className="hidden sm:inline-block absolute top-1.5 left-2 text-[10px] text-white/50 font-mono">
                [{keyLabel}]
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
