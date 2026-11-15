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
      <div className="text-center py-2.5 px-4 bg-slate-900/95 border border-amber-400/40 rounded-2xl mb-3 flex items-center justify-center shadow-lg shadow-black/40">
        {!payload.isSilentRule ? (
          <div className="text-base sm:text-lg font-black text-amber-300 tracking-wide flex items-center justify-center gap-1.5 drop-shadow">
            <span className="text-amber-400">القاعدة:</span>
            <span>{payload.ruleLabelAr}</span>
          </div>
        ) : (
          <span className="text-base sm:text-lg font-black text-rose-400 mx-auto animate-pulse flex items-center justify-center gap-1.5">
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
