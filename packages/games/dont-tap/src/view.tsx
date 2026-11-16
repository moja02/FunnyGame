'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type { DontTapQuestionPayload, DontTapAnswerInput } from './logic.js';
import { type FallingItem, type ActiveRule, evaluateItemAgainstRule } from './rules.js';
import { DONT_TAP_SHAPES } from './shapes.js';
import { sound, haptics } from '@funnygame/ui';

interface ActiveFallingEntity extends FallingItem {
  spawnEpochMs: number;
  currentYRatio: number; // 0.0 to 1.0
  currentLane: 0 | 1 | 2;
  hasMorphed: boolean;
  isHit?: boolean;
  isWrong?: boolean;
  isMissed?: boolean;
}

export const DontTapView: React.FC<
  GameViewProps<DontTapQuestionPayload, DontTapAnswerInput>
> = ({ question, onAnswer, locked }) => {
  const { payload } = question;

  // Active Game State
  const [activeRule, setActiveRule] = useState<ActiveRule>(payload.initialRule);
  const [ruleProgressRatio, setRuleProgressRatio] = useState(1.0);

  // Entities & Animation
  const [fallingEntities, setFallingEntities] = useState<ActiveFallingEntity[]>([]);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [introDismissed, setIntroDismissed] = useState(!payload.introCardAr);

  // Miss & Penalty States
  const [missFlash, setMissFlash] = useState(false);
  const [consecutiveMissDisplay, setConsecutiveMissDisplay] = useState(0);
  const [stageTargetHits, setStageTargetHits] = useState(0);

  // Hint State
  const [hintActive, setHintActive] = useState(false);
  const [hintsAvailable, setHintsAvailable] = useState(1);

  // Refs for real-time game loop
  const animFrameRef = useRef<number | null>(null);
  const entitiesRef = useRef<ActiveFallingEntity[]>([]);
  const activeRuleRef = useRef<ActiveRule>(payload.initialRule);
  const previousRuleRef = useRef<ActiveRule | null>(null);
  const ruleSwitchTimeRef = useRef(Date.now());
  const nextItemSpawnIndexRef = useRef(0);
  const lastSpawnEpochRef = useRef(Date.now());
  const isInputLockedRef = useRef(false);
  const nextRuleIndexRef = useRef(0);

  // Miss tracking refs
  const consecutiveMissesRef = useRef(0);
  const stageMissCountRef = useRef(0);

  // Sync ref with state
  useEffect(() => {
    activeRuleRef.current = activeRule;
  }, [activeRule]);

  // 1. Setup / Reset on new Question / Stage
  useEffect(() => {
    activeRuleRef.current = payload.initialRule;
    setActiveRule(payload.initialRule);
    previousRuleRef.current = null;
    ruleSwitchTimeRef.current = Date.now();
    nextItemSpawnIndexRef.current = 0;
    nextRuleIndexRef.current = 0;
    setIntroDismissed(!payload.introCardAr);
    setHintActive(false);

    // Reset miss counters for the stage
    consecutiveMissesRef.current = 0;
    stageMissCountRef.current = 0;
    setConsecutiveMissDisplay(0);
    setStageTargetHits(0);

    // Initial entity spawn
    entitiesRef.current = [];
    setFallingEntities([]);
  }, [question.index, payload]);

  // 2. Rule Transition Scheduler
  useEffect(() => {
    if (locked || !introDismissed) return undefined;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedInRule = now - ruleSwitchTimeRef.current;
      const progress = Math.max(0, 1.0 - elapsedInRule / payload.ruleDurationMs);
      setRuleProgressRatio(progress);

      if (elapsedInRule >= payload.ruleDurationMs) {
        // Switch to next rule
        const nextIdx = nextRuleIndexRef.current;
        const nextRule = payload.upcomingRules[nextIdx];
        if (nextRule) {
          previousRuleRef.current = activeRuleRef.current;
          activeRuleRef.current = nextRule;
          setActiveRule(nextRule);
          ruleSwitchTimeRef.current = now;
          nextRuleIndexRef.current += 1;

          // Sound & Haptic (muted in silent switch stages 20+)
          if (!payload.isSilentSwitch) {
            sound.countdown();
            haptics.light();
          }

          setLiveNotice('تبدلت القاعدة! اقرأ فوق 🔄');
          setTimeout(() => setLiveNotice(null), 1200);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [locked, introDismissed, payload.ruleDurationMs, payload.upcomingRules, payload.isSilentSwitch]);

  // 3. Main Falling Animation & Spawner Loop
  useEffect(() => {
    if (locked || !introDismissed) return undefined;

    const tick = () => {
      const now = Date.now();

      // Check if we need to spawn next item
      if (
        now - lastSpawnEpochRef.current >= payload.spawnIntervalMs &&
        nextItemSpawnIndexRef.current < payload.preGeneratedItems.length
      ) {
        const itemTemplate = payload.preGeneratedItems[nextItemSpawnIndexRef.current]!;
        nextItemSpawnIndexRef.current += 1;
        lastSpawnEpochRef.current = now;

        const newEntity: ActiveFallingEntity = {
          ...itemTemplate,
          spawnEpochMs: now,
          currentYRatio: 0,
          currentLane: itemTemplate.lane,
          hasMorphed: false
        };

        entitiesRef.current.push(newEntity);
      }

      // Update positions & check bottom miss line (Y >= 1.0)
      const currentEntities = entitiesRef.current;
      const remaining: ActiveFallingEntity[] = [];

      for (const ent of currentEntities) {
        if (ent.isHit || ent.isWrong) {
          // Keep showing hit/wrong effect briefly
          if (now - ent.spawnEpochMs < ent.fallDurationMs + 400) {
            remaining.push(ent);
          }
          continue;
        }

        const elapsed = now - ent.spawnEpochMs;
        const progress = Math.min(1.0, elapsed / ent.fallDurationMs);
        ent.currentYRatio = progress;

        // Zig-zag lane switch at midpoint
        if (ent.isZigZag && ent.zigzagTargetLane !== undefined && progress >= 0.5) {
          ent.currentLane = ent.zigzagTargetLane;
        }

        // Morphing at midpoint
        if (ent.isMorphing && progress >= 0.5 && !ent.hasMorphed) {
          ent.hasMorphed = true;
          if (ent.morphedShapeId) ent.shapeId = ent.morphedShapeId;
          if (ent.morphedColorId) ent.colorId = ent.morphedColorId;
          if (ent.morphedColorHex) ent.colorHex = ent.morphedColorHex;
        }

        if (progress >= 1.0) {
          // Hit Miss Line!
          const isTarget = evaluateItemAgainstRule(
            ent,
            activeRuleRef.current,
            1.0
          );

          // Check transition grace (500ms): if recently switched and not target under previous rule, pass cleanly
          const isWithinSwitchGrace = (now - ruleSwitchTimeRef.current) <= 500;
          const wasDistractorInPrevious = previousRuleRef.current
            ? !evaluateItemAgainstRule(ent, previousRuleRef.current, 1.0)
            : false;

          if (isTarget && !(isWithinSwitchGrace && wasDistractorInPrevious)) {
            // MISS: Required target shape reached bottom without being tapped!
            ent.isMissed = true;
            consecutiveMissesRef.current += 1;
            stageMissCountRef.current += 1;

            setConsecutiveMissDisplay(Math.min(2, consecutiveMissesRef.current));
            setMissFlash(true);
            setTimeout(() => setMissFlash(false), 500);

            const isSecondConsecutive = consecutiveMissesRef.current >= 2;
            const isThirdInStage = stageMissCountRef.current >= 3;
            const isHeartLoss = isSecondConsecutive || isThirdInStage;

            if (isHeartLoss) {
              sound.wrong();
              haptics.error();
              consecutiveMissesRef.current = 0; // Reset consecutive counter after heart cost
              setConsecutiveMissDisplay(0);
              setLiveNotice('فاتك المطلوب! طار قلب 💔');
            } else {
              sound.wrong();
              haptics.light();
              setLiveNotice('فاتك المطلوب! -50 نقطة وطارت السلسلة 💨');
            }
            setTimeout(() => setLiveNotice(null), 1500);

            onAnswer({
              itemIndex: ent.itemIndex,
              action: 'MISS',
              reactionTimeMs: ent.fallDurationMs,
              heightProgress: 1.0,
              activeRuleId: activeRuleRef.current.id,
              previousRuleId: previousRuleRef.current?.id,
              timeSinceRuleSwitchMs: now - ruleSwitchTimeRef.current,
              consecutiveMisses: isHeartLoss ? 2 : 1,
              stageTotalMisses: stageMissCountRef.current,
              isStageFirstMiss: !isHeartLoss
            });
          } else {
            // PASS: Distractor cleanly passed miss line -> correct behaviour!
            onAnswer({
              itemIndex: ent.itemIndex,
              action: 'PASS',
              reactionTimeMs: ent.fallDurationMs,
              heightProgress: 1.0,
              activeRuleId: activeRuleRef.current.id
            });
          }
        } else {
          remaining.push(ent);
        }
      }

      entitiesRef.current = remaining;
      setFallingEntities([...remaining]);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [locked, introDismissed, payload, onAnswer]);

  // 4. Tap Handler (Pointerdown & Keyboard)
  const handleItemTap = useCallback(
    (entity: ActiveFallingEntity) => {
      if (locked || isInputLockedRef.current || entity.isHit || entity.isWrong) return;

      const now = Date.now();
      const reactionTime = now - entity.spawnEpochMs;

      // Anti-Auto-Clicker: Reject superhuman clicks (< 150ms from spawn)
      if (reactionTime < 150) return;

      isInputLockedRef.current = true;
      setTimeout(() => {
        isInputLockedRef.current = false;
      }, 70);

      const timeSinceSwitch = now - ruleSwitchTimeRef.current;

      // Evaluate match (including 500ms grace window for previous rule)
      let isMatch = evaluateItemAgainstRule(
        entity,
        activeRuleRef.current,
        entity.currentYRatio
      );

      if (!isMatch && previousRuleRef.current && timeSinceSwitch <= 500) {
        if (evaluateItemAgainstRule(entity, previousRuleRef.current, entity.currentYRatio)) {
          isMatch = true; // Grace window salvation!
        }
      }

      if (isMatch) {
        // Correct Hit!
        entity.isHit = true;
        sound.correct();
        haptics.light();

        // Reset consecutive miss warning upon any correct hit
        consecutiveMissesRef.current = 0;
        setConsecutiveMissDisplay(0);
        setStageTargetHits((h) => Math.min(5, h + 1));

        onAnswer({
          itemIndex: entity.itemIndex,
          action: 'TAP',
          reactionTimeMs: Math.max(10, reactionTime),
          heightProgress: entity.currentYRatio,
          activeRuleId: activeRuleRef.current.id,
          previousRuleId: previousRuleRef.current?.id,
          timeSinceRuleSwitchMs: timeSinceSwitch
        });
      } else {
        // Wrong Tap on Distractor!
        entity.isWrong = true;
        sound.wrong();
        haptics.error();

        consecutiveMissesRef.current = 0;
        setConsecutiveMissDisplay(0);
        setLiveNotice('قلنالك لا تضغط! راح قلب 💔');
        setTimeout(() => setLiveNotice(null), 1500);

        onAnswer({
          itemIndex: entity.itemIndex,
          action: 'TAP',
          reactionTimeMs: Math.max(10, reactionTime),
          heightProgress: entity.currentYRatio,
          activeRuleId: activeRuleRef.current.id,
          previousRuleId: previousRuleRef.current?.id,
          timeSinceRuleSwitchMs: timeSinceSwitch
        });
      }

      setFallingEntities([...entitiesRef.current]);
    },
    [locked, onAnswer]
  );

  // 5. Hint Activation
  const handleUseHint = () => {
    if (hintsAvailable <= 0 || hintActive || locked) return;
    setHintsAvailable((h) => Math.max(0, h - 1));
    setHintActive(true);
    sound.countdown();
    setTimeout(() => {
      setHintActive(false);
    }, 5000);
  };

  // 6. Keyboard Listener (1, 2, 3 or Arrows for lanes; Space for hint)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (locked || !introDismissed) return;

      if (e.key === ' ' || e.key.toLowerCase() === 'h') {
        handleUseHint();
        return;
      }

      let targetLane: 0 | 1 | 2 | null = null;
      if (e.key === '1' || e.key === 'ArrowLeft') targetLane = 0;
      else if (e.key === '2' || e.key === 'ArrowDown') targetLane = 1;
      else if (e.key === '3' || e.key === 'ArrowRight') targetLane = 2;

      if (targetLane !== null) {
        // Find lowest unhit entity in that lane
        const laneEntities = entitiesRef.current
          .filter((ent) => ent.currentLane === targetLane && !ent.isHit && !ent.isWrong)
          .sort((a, b) => b.currentYRatio - a.currentYRatio);

        if (laneEntities[0]) {
          handleItemTap(laneEntities[0]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [locked, introDismissed, handleItemTap]);

  return (
    <div className="w-full flex-1 flex flex-col justify-between select-none touch-none relative p-2 max-w-[540px] mx-auto h-full">
      {/* Intro Rule Card Modal */}
      {!introDismissed && payload.introCardAr && (
        <div
          onClick={() => setIntroDismissed(true)}
          className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-3xl mb-3 animate-bounce">
            💡
          </div>
          <div className="text-xs font-bold text-amber-400 mb-1">
            آلية جديدة في المرحلة {payload.stage}
          </div>
          <h2 className="text-lg font-black text-white max-w-xs leading-relaxed mb-4">
            {payload.introCardAr}
          </h2>
          <div className="text-[11px] font-bold text-slate-400 px-3 py-1 bg-white/10 rounded-full">
            المس الشاشة للبدء ◀
          </div>
        </div>
      )}

      {/* 1. Rule Bar */}
      <div className="w-full py-2.5 px-3 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-400/50 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeRule.icon}</span>
            <span className="text-sm sm:text-base font-black text-amber-300">
              {activeRule.labelAr}
            </span>
          </div>

          {/* Hint Button */}
          <button
            onClick={handleUseHint}
            disabled={hintsAvailable <= 0 || hintActive}
            className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
              hintsAvailable > 0 && !hintActive
                ? 'bg-amber-400 text-slate-950 shadow-md animate-pulse hover:bg-amber-300 cursor-pointer'
                : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
            }`}
          >
            <span>💡</span>
            <span>تلميح</span>
          </button>
        </div>

        {/* Rule Duration Progress Bar (Hidden from Stage 20+ for Silent Switch) */}
        {!payload.isSilentSwitch && (
          <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-75"
              style={{ width: `${ruleProgressRatio * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* 2. Dedicated Message & Status Bar (Fixed 32px - Never shifts or compresses the game frame) */}
      <div className="w-full h-8 min-h-[32px] max-h-[32px] flex items-center justify-between px-3 my-1 rounded-xl bg-slate-950/70 border border-white/5 relative overflow-hidden">
        {liveNotice ? (
          <div className="flex items-center justify-center w-full gap-1.5 text-xs font-black text-amber-300 animate-fadeIn">
            <span>{liveNotice}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-[11px] font-bold text-slate-400">
            {/* Stage Targets Progress */}
            <div className="flex items-center gap-1.5">
              <span>الهدف:</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((dotIdx) => (
                  <span
                    key={dotIdx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      dotIdx < stageTargetHits
                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] scale-110'
                        : 'bg-white/15'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Miss Warning Strike */}
            <div
              className={`flex items-center gap-1 transition-colors ${
                consecutiveMissDisplay > 0
                  ? 'text-rose-400 font-black animate-pulse'
                  : 'text-slate-500'
              }`}
            >
              <span>⚠️ إنذار التفويت:</span>
              <span className="font-mono">{consecutiveMissDisplay}/2</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Enlarged Falling Play Area (3 Lanes, Stable Geometry) */}
      <div className="flex-1 w-full min-h-[520px] max-h-[min(78vh, 720px)] bg-gradient-to-b from-slate-950/95 via-slate-900/80 to-slate-950/95 rounded-3xl border-2 border-slate-700/80 shadow-[0_0_35px_rgba(0,0,0,0.8)] relative overflow-hidden flex">
        {/* 3 Vertical Lanes */}
        {[0, 1, 2].map((laneIdx) => (
          <div
            key={laneIdx}
            className={`w-1/3 h-full relative ${
              laneIdx < 2 ? 'border-r border-white/5' : ''
            }`}
          >
            {/* Lane Keyboard Indicator at bottom */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-600/60">
              {laneIdx + 1}
            </div>
          </div>
        ))}

        {/* Miss Line at Bottom (88% height) */}
        <div
          className={`absolute bottom-8 left-0 right-0 border-b-2 transition-all duration-200 z-10 flex items-center justify-between px-3 pointer-events-none ${
            missFlash
              ? 'border-rose-500 bg-rose-500/15 shadow-[0_0_25px_rgba(244,63,94,0.8)]'
              : 'border-dashed border-rose-500/40'
          }`}
        >
          <div className="flex items-center gap-2 text-[10px] font-black text-rose-400">
            <span>خط التفويت ⛔</span>
            {missFlash && (
              <span className="text-rose-300 font-extrabold animate-bounce text-xs bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/50">
                -50
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold text-rose-400/60 uppercase tracking-wider">
            MISS LINE
          </span>
        </div>

        {/* Falling Entities */}
        {fallingEntities.map((ent) => {
          const shapeDef =
            DONT_TAP_SHAPES.find((s) => s.id === ent.shapeId) || DONT_TAP_SHAPES[0]!;

          // Calculate visual coordinates
          // Lane center: Lane 0 = 16.6%, Lane 1 = 50%, Lane 2 = 83.3%
          const laneCenterPercent = 16.66 + ent.currentLane * 33.33;
          const topPercent = ent.currentYRatio * 88; // 88% is the miss line

          const isMatching = evaluateItemAgainstRule(
            ent,
            activeRuleRef.current,
            ent.currentYRatio
          );
          const isHintGlow = hintActive && isMatching && !ent.isHit && !ent.isWrong;

          return (
            <div
              key={ent.id}
              onPointerDown={() => handleItemTap(ent)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none transition-transform active:scale-95 z-20"
              style={{
                left: `${laneCenterPercent}%`,
                top: `${topPercent}%`,
                width: '84px',
                height: '84px'
              }}
            >
              {/* Hitbox area with inner visual shape */}
              <div
                className={`w-full h-full flex items-center justify-center relative rounded-full ${
                  isHintGlow
                    ? 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.8)] animate-pulse'
                    : ''
                } ${ent.isHit ? 'scale-125 animate-ping' : ''} ${
                  ent.isWrong ? 'animate-shake' : ''
                }`}
              >
                {/* SVG Visual Shape */}
                <svg
                  viewBox="0 0 100 100"
                  className="w-[60px] h-[60px] pointer-events-none drop-shadow-lg transition-colors"
                  style={{ fill: ent.colorHex }}
                >
                  <path d={shapeDef.svgPath} />
                </svg>

                {/* Conflicting Stroop Text inside Shape */}
                {ent.stroopText && !ent.isHit && !ent.isWrong && (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-xs font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] pointer-events-none"
                    style={{ color: ent.stroopColorHex || '#FFFFFF' }}
                  >
                    {ent.stroopText}
                  </span>
                )}

                {/* Hit Feedback */}
                {ent.isHit && (
                  <div className="absolute inset-0 flex items-center justify-center text-emerald-300 font-black text-3xl drop-shadow-md">
                    ✓
                  </div>
                )}

                {/* Wrong Tap Feedback */}
                {ent.isWrong && (
                  <div className="absolute inset-0 flex items-center justify-center text-rose-500 font-black text-3xl drop-shadow-md">
                    ✗
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
