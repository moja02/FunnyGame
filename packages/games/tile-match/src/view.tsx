'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type {
  TileMatchQuestionPayload,
  TileMatchAnswerInput,
  TileCard
} from './types.js';
import { calculateTileMatchScore } from './logic.js';
import { isCardCovered } from './generator.js';
import { INTRO_CARDS, TILE_ICONS } from './content.js';
import { sound, haptics } from '@funnygame/ui';

export const TileMatchView: React.FC<
  GameViewProps<TileMatchQuestionPayload, TileMatchAnswerInput>
> = ({ question, onAnswer, locked }) => {
  const { payload } = question;

  // Intro modal dismissal
  const [introDismissed, setIntroDismissed] = useState(!payload.introCardAr);

  // Cards on board
  const [boardCards, setBoardCards] = useState<TileCard[]>(() => payload.cards);
  const [removedCardIds, setRemovedCardIds] = useState<Set<number>>(new Set());

  // Dock items (cards transferred from board to dock)
  const [dockCards, setDockCards] = useState<TileCard[]>([]);
  // Holding shelf items (cards moved out by Magnet tool)
  const [shelfCards, setShelfCards] = useState<TileCard[]>([]);

  // Move history stack for Undo tool
  const [moveHistory, setMoveHistory] = useState<TileCard[]>([]);

  // Power-up charges (starts with 1 each, rewarded on boss stages)
  const [powerUps, setPowerUps] = useState<{ undo: number; magnet: number; shuffle: number }>({
    undo: 1,
    magnet: 1,
    shuffle: 1
  });

  // Track power-ups used this round
  const powerUpsUsedRef = useRef({ undo: 0, magnet: 0, shuffle: 0 });

  // Triple clear animation tracking (card IDs currently glowing gold)
  const [matchingCardIds, setMatchingCardIds] = useState<number[]>([]);

  // Timer & Combo states
  const [remainingTimeMs, setRemainingTimeMs] = useState<number>(payload.timeLimitMs);
  const [comboCount, setComboCount] = useState<number>(0);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const lastMatchTimeRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const triplesClearedRef = useRef<number>(0);
  const basePointsAccumulatedRef = useRef<number>(0);
  const isResolvedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const lastClickTimeRef = useRef<number>(0);
  const timerAnimFrameRef = useRef<number | null>(null);
  const autoShuffleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Show a temporary banner notification
  const showNotice = useCallback((msg: string) => {
    setStatusNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setStatusNotice(null);
    }, 1800);
  }, []);

  // Sync intro card
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

  // When question / stage changes, reset stage state
  useEffect(() => {
    setBoardCards(payload.cards);
    setRemovedCardIds(new Set());
    setDockCards([]);
    setShelfCards([]);
    setMoveHistory([]);
    setMatchingCardIds([]);
    setRemainingTimeMs(payload.timeLimitMs);
    setComboCount(0);
    isResolvedRef.current = false;
    startTimeRef.current = Date.now();
    lastMatchTimeRef.current = 0;
    maxComboRef.current = 0;
    triplesClearedRef.current = 0;
    basePointsAccumulatedRef.current = 0;
    powerUpsUsedRef.current = { undo: 0, magnet: 0, shuffle: 0 };

    // Reset power-ups at stage 1, or grant +1 on boss stages (stages 6, 11, 16, 21...)
    if (question.stage === 1 && question.index === 0) {
      setPowerUps({ undo: 1, magnet: 1, shuffle: 1 });
    } else if (question.index === 0 && (question.stage - 1) % 5 === 0) {
      setPowerUps((prev) => ({
        undo: Math.min(3, prev.undo + 1),
        magnet: Math.min(3, prev.magnet + 1),
        shuffle: Math.min(3, prev.shuffle + 1)
      }));
      showNotice('مكافأة اجتياز الزعيم: شحنات أدوات إضافية! 🎁');
    }

    // Show non-blocking notice for mechanics introduction
    if (question.stage > 1 && INTRO_CARDS[question.stage]) {
      showNotice(INTRO_CARDS[question.stage]!);
    } else if (!(question.index === 0 && (question.stage - 1) % 5 === 0)) {
      setStatusNotice(null);
    }
  }, [question.index, question.stage, payload, showNotice]);

  // Overall Timer countdown
  useEffect(() => {
    if (!introDismissed || isResolvedRef.current) return;

    startTimeRef.current = Date.now();
    const duration = payload.timeLimitMs;

    const tick = () => {
      if (isResolvedRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const left = Math.max(0, duration - elapsed);
      setRemainingTimeMs(left);

      if (left <= 0) {
        // Time expired! Stage lost
        isResolvedRef.current = true;
        sound.wrong();
        haptics.error();
        showNotice('انتهى الوقت! حاول مجدداً ⏱️');

        onAnswer({
          isSuccess: false,
          triplesCleared: triplesClearedRef.current,
          durationMs: duration,
          powerUpsUsed: powerUpsUsedRef.current,
          totalPoints: 0
        });
      } else {
        timerAnimFrameRef.current = requestAnimationFrame(tick);
      }
    };

    timerAnimFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerAnimFrameRef.current) {
        cancelAnimationFrame(timerAnimFrameRef.current);
        timerAnimFrameRef.current = null;
      }
    };
  }, [introDismissed, payload.timeLimitMs, onAnswer, showNotice]);

  // Auto-shuffle periodic timer (Stages 56+)
  useEffect(() => {
    if (!introDismissed || isResolvedRef.current || payload.autoShuffleIntervalSec <= 0) return;

    const intervalMs = payload.autoShuffleIntervalSec * 1000;
    autoShuffleTimerRef.current = setInterval(() => {
      if (isResolvedRef.current) return;
      handleShuffle(true);
      showNotice('خلط تلقائي دوري للبطاقات! 🔀');
    }, intervalMs);

    return () => {
      if (autoShuffleTimerRef.current) {
        clearInterval(autoShuffleTimerRef.current);
        autoShuffleTimerRef.current = null;
      }
    };
  }, [introDismissed, payload.autoShuffleIntervalSec]);

  // Check if each card on the board is covered
  const coveredCardIdSet = useMemo(() => {
    const set = new Set<number>();
    for (const card of boardCards) {
      if (removedCardIds.has(card.id)) continue;
      if (isCardCovered(card, boardCards, removedCardIds)) {
        set.add(card.id);
      }
    }
    return set;
  }, [boardCards, removedCardIds]);

  // Check for Triple Match inside the dock
  const checkDockMatches = useCallback(
    (currentDock: TileCard[], currentRemoved: Set<number>) => {
      // Group by typeId
      const typeCounts: Record<number, TileCard[]> = {};
      for (const card of currentDock) {
        if (!typeCounts[card.typeId]) typeCounts[card.typeId] = [];
        typeCounts[card.typeId]!.push(card);
      }

      // Check if any type has >= 3 cards
      for (const typeStr of Object.keys(typeCounts)) {
        const typeId = Number(typeStr);
        const group = typeCounts[typeId]!;
        if (group.length >= 3) {
          const matchedThree = group.slice(0, 3);
          const matchedIds = matchedThree.map((c) => c.id);

          setMatchingCardIds(matchedIds);
          sound.correct();
          haptics.medium();

          // Calculate Combo multiplier
          const now = Date.now();
          if (now - lastMatchTimeRef.current <= 3000) {
            setComboCount((c) => {
              const next = c + 1;
              maxComboRef.current = Math.max(maxComboRef.current, next);
              return next;
            });
          } else {
            setComboCount(1);
            maxComboRef.current = Math.max(maxComboRef.current, 1);
          }
          lastMatchTimeRef.current = now;

          // Points calculation
          const hasSpecial = matchedThree.some((c) => c.isMystery || c.isFrozen);
          const baseEarned = hasSpecial ? 100 : 50;
          basePointsAccumulatedRef.current += baseEarned;
          triplesClearedRef.current += 1;

          // Thaw frozen cards on the board
          setBoardCards((prev) =>
            prev.map((c) => (c.isFrozen ? { ...c, isFrozen: false } : c))
          );

          // Remove matched 3 from dock after 150ms
          setTimeout(() => {
            setDockCards((prevDock) => {
              const newDock = prevDock.filter((c) => !matchedIds.includes(c.id));
              setMatchingCardIds([]);

              // Check Win Condition: All cards removed and dock empty
              if (currentRemoved.size === boardCards.length && newDock.length === 0) {
                if (!isResolvedRef.current) {
                  isResolvedRef.current = true;
                  sound.correct();
                  haptics.success();

                  const durationMs = Math.max(50, Date.now() - startTimeRef.current);
                  const totalPoints = calculateTileMatchScore(
                    payload.stage,
                    basePointsAccumulatedRef.current,
                    remainingTimeMs,
                    payload.timeLimitMs,
                    maxComboRef.current
                  );

                  setTimeout(() => {
                    onAnswer({
                      isSuccess: true,
                      triplesCleared: triplesClearedRef.current,
                      durationMs,
                      powerUpsUsed: powerUpsUsedRef.current,
                      totalPoints
                    });
                  }, 300);
                }
              }

              return newDock;
            });
          }, 160);

          return true; // Match found
        }
      }

      // No match found: check if dock is completely full -> Loss!
      if (currentDock.length >= payload.dockCapacity) {
        if (!isResolvedRef.current) {
          isResolvedRef.current = true;
          sound.wrong();
          haptics.error();
          showNotice('امتلأ الشريط دون مطابقة! 💔');

          setTimeout(() => {
            onAnswer({
              isSuccess: false,
              triplesCleared: triplesClearedRef.current,
              durationMs: Date.now() - startTimeRef.current,
              powerUpsUsed: powerUpsUsedRef.current,
              totalPoints: 0
            });
          }, 450);
        }
      }

      return false;
    },
    [
      boardCards.length,
      payload.dockCapacity,
      payload.stage,
      payload.timeLimitMs,
      remainingTimeMs,
      showNotice,
      onAnswer
    ]
  );

  // Click a Card on the Board to move it into the dock
  const handleCardClick = useCallback(
    (card: TileCard) => {
      if (!introDismissed || locked || isResolvedRef.current) return;
      if (matchingCardIds.length > 0) return; // Wait for current triple animation

      // Anti-autoclicker throttle (min 70ms)
      const now = Date.now();
      if (now - lastClickTimeRef.current < 70) return;
      lastClickTimeRef.current = now;

      // Card must not be covered and not frozen
      if (coveredCardIdSet.has(card.id)) {
        sound.tap();
        haptics.light();
        return;
      }

      if (card.isFrozen) {
        sound.wrong();
        haptics.error();
        showNotice('البطاقة متجمدة! حقق ثلاثية لفك الجليد عنها ❄️');
        return;
      }

      // Check if dock has room
      if (dockCards.length >= payload.dockCapacity) {
        sound.wrong();
        haptics.error();
        showNotice('الشريط ممتلئ! استخدم أداة السحب أو انتظر ⚠️');
        return;
      }

      sound.tap();
      haptics.light();

      // Reveal mystery card upon entering dock
      const dockCard: TileCard = {
        ...card,
        isMystery: false
      };

      // Auto-group in dock: insert next to existing cards of same typeId
      const newDock = [...dockCards];
      let insertIndex = -1;
      for (let i = newDock.length - 1; i >= 0; i--) {
        if (newDock[i]!.typeId === dockCard.typeId) {
          insertIndex = i + 1;
          break;
        }
      }
      if (insertIndex !== -1) {
        newDock.splice(insertIndex, 0, dockCard);
      } else {
        newDock.push(dockCard);
      }

      const nextRemoved = new Set(removedCardIds);
      nextRemoved.add(card.id);

      setDockCards(newDock);
      setRemovedCardIds(nextRemoved);
      setMoveHistory((prev) => [...prev, card]);

      // Trigger matching check
      checkDockMatches(newDock, nextRemoved);
    },
    [
      introDismissed,
      locked,
      matchingCardIds.length,
      coveredCardIdSet,
      dockCards,
      payload.dockCapacity,
      removedCardIds,
      checkDockMatches,
      showNotice
    ]
  );

  // Move a card from the Holding Shelf back into the dock
  const handleShelfCardClick = useCallback(
    (card: TileCard) => {
      if (!introDismissed || locked || isResolvedRef.current) return;
      if (dockCards.length >= payload.dockCapacity) {
        sound.wrong();
        haptics.error();
        showNotice('الشريط ممتلئ! لا يوجد مكان لنقل البطاقة ⚠️');
        return;
      }

      sound.tap();
      haptics.light();

      // Remove from shelf
      setShelfCards((prev) => prev.filter((c) => c.id !== card.id));

      // Auto-group into dock
      const newDock = [...dockCards];
      let insertIndex = -1;
      for (let i = newDock.length - 1; i >= 0; i--) {
        if (newDock[i]!.typeId === card.typeId) {
          insertIndex = i + 1;
          break;
        }
      }
      if (insertIndex !== -1) {
        newDock.splice(insertIndex, 0, card);
      } else {
        newDock.push(card);
      }

      setDockCards(newDock);
      checkDockMatches(newDock, removedCardIds);
    },
    [
      introDismissed,
      locked,
      dockCards,
      payload.dockCapacity,
      removedCardIds,
      checkDockMatches,
      showNotice
    ]
  );

  // 1. Tool: Undo (التراجع)
  const handleUndo = useCallback(() => {
    if (!introDismissed || locked || isResolvedRef.current) return;
    if (powerUps.undo <= 0) {
      sound.wrong();
      haptics.error();
      showNotice('لا توجد شحنات تراجع متبقية! 💡');
      return;
    }
    if (moveHistory.length === 0 || dockCards.length === 0) {
      showNotice('لا توجد بطاقات في الشريط للتراجع عنها!');
      return;
    }

    sound.tap();
    haptics.medium();
    setPowerUps((p) => ({ ...p, undo: p.undo - 1 }));
    powerUpsUsedRef.current.undo += 1;

    // Pop last card from history
    const lastCard = moveHistory[moveHistory.length - 1]!;
    setMoveHistory((prev) => prev.slice(0, prev.length - 1));

    // Remove from dock
    setDockCards((prev) => {
      const idx = prev.findIndex((c) => c.id === lastCard.id);
      if (idx !== -1) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return prev;
    });

    // Unmark as removed
    setRemovedCardIds((prev) => {
      const next = new Set(prev);
      next.delete(lastCard.id);
      return next;
    });

    showNotice('تم التراجع عن آخر بطاقة ↩️');
  }, [introDismissed, locked, powerUps.undo, moveHistory, dockCards.length, showNotice]);

  // 2. Tool: Magnet / Move Out (سحب 3 بطاقات للرف المؤقت)
  const handleMagnet = useCallback(() => {
    if (!introDismissed || locked || isResolvedRef.current) return;
    if (powerUps.magnet <= 0) {
      sound.wrong();
      haptics.error();
      showNotice('لا توجد شحنات سحب متبقية! 💡');
      return;
    }
    if (dockCards.length === 0) {
      showNotice('الشريط فارغ بالفعل!');
      return;
    }

    sound.tap();
    haptics.medium();
    setPowerUps((p) => ({ ...p, magnet: p.magnet - 1 }));
    powerUpsUsedRef.current.magnet += 1;

    // Take up to 3 cards from dock to holding shelf
    const toExtract = dockCards.slice(0, 3);
    const remainingDock = dockCards.slice(3);

    setShelfCards((prev) => [...prev, ...toExtract]);
    setDockCards(remainingDock);
    showNotice('تم سحب 3 بطاقات إلى رف الانتظار المؤقت 🧲');
  }, [introDismissed, locked, powerUps.magnet, dockCards, showNotice]);

  // 3. Tool: Shuffle (خلط البطاقات المتبقية على اللوحة)
  const handleShuffle = useCallback(
    (isAutomatic = false) => {
      if (!introDismissed || locked || isResolvedRef.current) return;
      if (!isAutomatic) {
        if (powerUps.shuffle <= 0) {
          sound.wrong();
          haptics.error();
          showNotice('لا توجد شحنات خلط متبقية! 💡');
          return;
        }
        setPowerUps((p) => ({ ...p, shuffle: p.shuffle - 1 }));
        powerUpsUsedRef.current.shuffle += 1;
      }

      sound.tap();
      haptics.medium();

      // Extract types & icons of unremoved cards
      const activeCards = boardCards.filter((c) => !removedCardIds.has(c.id));
      const types = activeCards.map((c) => ({ typeId: c.typeId, icon: c.icon }));

      // Permute types
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = types[i]!;
        types[i] = types[j]!;
        types[j] = temp;
      }

      let tIdx = 0;
      setBoardCards((prev) =>
        prev.map((c) => {
          if (removedCardIds.has(c.id)) return c;
          const assigned = types[tIdx++]!;
          return {
            ...c,
            typeId: assigned.typeId,
            icon: assigned.icon
          };
        })
      );

      if (!isAutomatic) {
        showNotice('تم خلط بطاقات اللوحة عشوائياً 🔀');
      }
    },
    [introDismissed, locked, powerUps.shuffle, boardCards, removedCardIds, showNotice]
  );

  const remainingCardsCount = boardCards.length - removedCardIds.size;

  return (
    <div
      className="relative flex flex-col items-center justify-between w-full h-full max-w-md mx-auto select-none px-2 py-1 text-white overscroll-none"
      dir="rtl"
    >
      {/* Intro Modal */}
      {!introDismissed && payload.introCardAr && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md rounded-2xl animate-fade-in">
          <div className="flex flex-col items-center text-center p-5 bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl max-w-xs w-full">
            <span className="text-4xl mb-2">🍓</span>
            <h3 className="text-xl font-bold text-amber-300 mb-2">مطابقة الطبقات</h3>
            <p className="text-xs text-slate-200 mb-3 leading-relaxed">
              {payload.introCardAr}
            </p>
            <div className="text-[11px] text-slate-300 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 mb-4 leading-relaxed text-right w-full space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">👆</span>
                <span className="font-bold text-white">المس البطاقات المكشوفة لنقلها للشريط</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">✨</span>
                <span className="font-bold text-amber-400">طابق 3 بطاقات متشابهة لتفريغ الخانات</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span>لا تدع الشريط يمتلئ بالكامل دون تطابق!</span>
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

      {/* Top Header: Remaining Cards & Status notice */}
      <div className="w-full flex flex-col gap-1 pt-0.5">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          {/* Cards remaining tracker */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-400">البطاقات:</span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black">
              {remainingCardsCount} / {boardCards.length}
            </span>
          </div>

          {/* Combo indicator */}
          {comboCount > 1 && (
            <div className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full animate-bounce">
              <span>🔥</span>
              <span>{comboCount}x</span>
            </div>
          )}

          {/* Time indicator */}
          <div className="flex items-center gap-1 text-xs font-bold text-slate-300">
            <span>⏱️</span>
            <span>{Math.ceil(remainingTimeMs / 1000)}s</span>
          </div>
        </div>

        {/* Status guidance / notification banner */}
        <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 min-h-[20px]">
          <span>{payload.guidanceTextAr}</span>
          {statusNotice && (
            <span className="text-amber-300 font-black animate-pulse">
              {statusNotice}
            </span>
          )}
        </div>
      </div>

      {/* Main Board Stack Area (Z-Index Layers) */}
      <div className="relative w-full flex-1 min-h-[300px] max-h-[340px] flex items-center justify-center my-1 select-none touch-manipulation">
        <div
          className="relative w-[320px] h-[310px] bg-slate-950/40 rounded-2xl border border-slate-800/80 shadow-inner overflow-hidden"
          dir="ltr"
        >
          {boardCards.map((card) => {
            const isRemoved = removedCardIds.has(card.id);
            if (isRemoved) return null;

            const isCovered = coveredCardIdSet.has(card.id);
            const isSelectable = !isCovered && !card.isFrozen;

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                style={{
                  position: 'absolute',
                  left: `${card.x}px`,
                  top: `${card.y}px`,
                  width: `${card.width}px`,
                  height: `${card.height}px`,
                  zIndex: card.layer * 10 + 5
                }}
                className={`flex items-center justify-center rounded-xl border-2 transition-all duration-150 select-none ${
                  isSelectable
                    ? 'bg-gradient-to-b from-slate-700 to-slate-800 border-amber-400/80 shadow-[0_4px_0_#1e293b] hover:scale-105 active:scale-95 cursor-pointer text-2xl'
                    : card.isFrozen
                    ? 'bg-sky-950/80 border-sky-400/80 shadow-[0_3px_0_#0369a1] text-2xl cursor-not-allowed opacity-90'
                    : 'bg-slate-900/90 border-slate-800/90 opacity-60 brightness-60 text-xl cursor-not-allowed shadow-none'
                }`}
              >
                {/* Card Icon */}
                {card.isMystery ? (
                  <span className="font-black text-amber-400 text-lg select-none">
                    ❓
                  </span>
                ) : (
                  <span className="select-none leading-none">{card.icon}</span>
                )}

                {/* Frozen Ice overlay icon */}
                {card.isFrozen && (
                  <span className="absolute -top-1 -right-1 text-xs select-none animate-pulse">
                    ❄️
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Holding Shelf for Magnet tool (if active cards exist in shelf) */}
      {shelfCards.length > 0 && (
        <div className="w-full flex flex-col items-center gap-1 mb-1 animate-fade-in" dir="ltr">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/40 border border-amber-500/40 rounded-xl">
            <span className="text-xs text-amber-300 font-bold">رف الانتظار 🧲:</span>
            <div className="flex items-center gap-2">
              {shelfCards.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleShelfCardClick(c)}
                  title="المس للعودة إلى الشريط"
                  className="w-10 h-11 flex items-center justify-center rounded-lg bg-slate-800 border-2 border-amber-400/70 text-xl shadow hover:scale-105 active:scale-95 cursor-pointer"
                >
                  {c.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7-Slot Collection Dock */}
      <div className="w-full flex flex-col items-center gap-1 mb-2" dir="ltr">
        <div className="w-full max-w-[340px] p-2 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border-2 border-slate-700/80 shadow-2xl flex items-center justify-center gap-1.5 min-h-[68px]">
          {Array.from({ length: payload.dockCapacity }).map((_, slotIdx) => {
            const card = dockCards[slotIdx];
            const isMatching = card && matchingCardIds.includes(card.id);

            return (
              <div
                key={slotIdx}
                className={`w-11 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-150 ${
                  card
                    ? isMatching
                      ? 'bg-amber-400 border-amber-200 text-slate-950 scale-110 shadow-[0_0_15px_#f59e0b] animate-bounce'
                      : 'bg-gradient-to-b from-slate-700 to-slate-800 border-amber-400/60 shadow-md text-2xl'
                    : 'bg-slate-950/60 border-dashed border-slate-800'
                }`}
              >
                {card && (
                  <span className="select-none leading-none">
                    {card.icon}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Power-up Assistance Tools (Undo, Magnet, Shuffle) */}
      <div className="w-full flex items-center justify-around px-4 py-1" dir="rtl">
        {/* Undo Tool */}
        <button
          onClick={handleUndo}
          disabled={powerUps.undo <= 0 || moveHistory.length === 0 || !introDismissed || locked}
          className={`flex flex-col items-center justify-center w-[52px] h-[52px] rounded-2xl border transition-all ${
            powerUps.undo > 0 && moveHistory.length > 0
              ? 'bg-slate-800/90 border-blue-500/50 text-blue-300 hover:bg-blue-600/30 active:scale-95 cursor-pointer shadow-lg'
              : 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
          }`}
          title="تراجع عن آخر بطاقة نقلتها للشريط"
        >
          <span className="text-lg">↩️</span>
          <span className="text-[10px] font-black">{powerUps.undo}</span>
        </button>

        {/* Magnet / Move Out Tool */}
        <button
          onClick={handleMagnet}
          disabled={powerUps.magnet <= 0 || dockCards.length === 0 || !introDismissed || locked}
          className={`flex flex-col items-center justify-center w-[52px] h-[52px] rounded-2xl border transition-all ${
            powerUps.magnet > 0 && dockCards.length > 0
              ? 'bg-slate-800/90 border-amber-500/50 text-amber-300 hover:bg-amber-600/30 active:scale-95 cursor-pointer shadow-lg'
              : 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
          }`}
          title="سحب 3 بطاقات إلى رف الانتظار لتفريغ مساحة"
        >
          <span className="text-lg">🧲</span>
          <span className="text-[10px] font-black">{powerUps.magnet}</span>
        </button>

        {/* Shuffle Tool */}
        <button
          onClick={() => handleShuffle(false)}
          disabled={powerUps.shuffle <= 0 || !introDismissed || locked}
          className={`flex flex-col items-center justify-center w-[52px] h-[52px] rounded-2xl border transition-all ${
            powerUps.shuffle > 0
              ? 'bg-slate-800/90 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30 active:scale-95 cursor-pointer shadow-lg'
              : 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
          }`}
          title="خلط عشوائي لبطاقات اللوحة المتبقية"
        >
          <span className="text-lg">🔀</span>
          <span className="text-[10px] font-black">{powerUps.shuffle}</span>
        </button>
      </div>
    </div>
  );
};
