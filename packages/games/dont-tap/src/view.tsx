'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { GameViewProps } from '@funnygame/game-core';
import type { DontTapQuestionPayload, DontTapAnswerInput } from './logic.js';
import { type FallingItem, type ActiveRule, evaluateItemAgainstRule } from './rules.js';
import { DONT_TAP_SHAPES } from './shapes.js';
import { sound, haptics } from '@funnygame/ui';

interface ActiveFallingEntity extends FallingItem {
  spawnEpochMs: number;
  spawnRuleId: string;
  spawnRuleTarget: boolean; // Was this item evaluated as a target when it spawned?
  currentYRatio: number; // 0.0 to 1.0
  currentLane: 0 | 1 | 2;
  hasMorphed: boolean;
  isHit?: boolean;
  isWrong?: boolean;
  isMissed?: boolean;
  hitEpochMs?: number;
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
  const [stageMissCountDisplay, setStageMissCountDisplay] = useState(0);
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
  const targetHitsRef = useRef(0);

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
    targetHitsRef.current = 0;
    setStageMissCountDisplay(0);
    setStageTargetHits(0);

    // Initial entity spawn
    entitiesRef.current = [];
    setFallingEntities([]);
  }, [question.index, payload]);

  // Auto-dismiss intro card after 2.0s
  useEffect(() => {
    if (!introDismissed && payload.introCardAr) {
      const t = setTimeout(() => {
        setIntroDismissed(true);
        ruleSwitchTimeRef.current = Date.now();
        lastSpawnEpochRef.current = Date.now();
      }, 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [introDismissed, payload.introCardAr]);

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

      // Check if we need to spawn next item - keep spawning continuously as long as stage target quota (5) is not reached!
      if (
        targetHitsRef.current < 5 &&
        now - lastSpawnEpochRef.current >= payload.spawnIntervalMs
      ) {
        const pool = payload.preGeneratedItems;
        if (pool.length > 0) {
          const spawnIndex = nextItemSpawnIndexRef.current;
          const templateIndex = spawnIndex % pool.length;
          const itemTemplate = pool[templateIndex]!;
          nextItemSpawnIndexRef.current += 1;
          lastSpawnEpochRef.current = now;

          const spawnRuleTarget = evaluateItemAgainstRule(itemTemplate, activeRuleRef.current, 0);

          const newEntity: ActiveFallingEntity = {
            ...itemTemplate,
            id: `${itemTemplate.id}_${spawnIndex}`,
            itemIndex: spawnIndex,
            spawnEpochMs: now,
            spawnRuleId: activeRuleRef.current.id,
            spawnRuleTarget,
            currentYRatio: 0,
            currentLane: itemTemplate.lane,
            hasMorphed: false
          };

          entitiesRef.current.push(newEntity);
        }
      }

      // Update positions & check bottom miss line (Y >= 1.0)
      const currentEntities = entitiesRef.current;
      const remaining: ActiveFallingEntity[] = [];

      for (const ent of currentEntities) {
        if (ent.isHit) {
          // Instant disappearance: show micro-burst for only 120ms, then remove immediately!
          if (ent.hitEpochMs && now - ent.hitEpochMs < 120) {
            remaining.push(ent);
          }
          continue;
        }

        if (ent.isWrong) {
          // Wrong tap shake: vanish in 200ms
          if (ent.hitEpochMs && now - ent.hitEpochMs < 200) {
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
          // If stage target quota (5) was already reached, all remaining shapes pass safely!
          if (targetHitsRef.current >= 5) {
            continue;
          }

          // Determine if this item was genuinely a required target for the player:
          // If it spawned under an older rule, it is ONLY a miss if it was ALREADY a target when it spawned!
          // This completely prevents distractors from turning into phantom misses when rules switch!
          let isMissedTarget = false;
          if (ent.spawnRuleId !== activeRuleRef.current.id) {
            isMissedTarget = ent.spawnRuleTarget && evaluateItemAgainstRule(ent, activeRuleRef.current, 1.0);
          } else {
            isMissedTarget = evaluateItemAgainstRule(ent, activeRuleRef.current, 1.0);
          }

          if (isMissedTarget) {
            // MISS: Required target shape reached bottom without being tapped!
            ent.isMissed = true;
            consecutiveMissesRef.current += 1;
            stageMissCountRef.current += 1;
            const currentStageMisses = stageMissCountRef.current;

            setMissFlash(true);
            setTimeout(() => setMissFlash(false), 500);

            // Specification Update 2:
            // 1. Miss 1 or 2 in stage: breaks combo only, updates miss indicator (1/3 then 2/3), no heart loss, no point deduction.
            // 2. Miss 3 in same stage (consecutive or dispersed): loses 1 heart immediately, resets stage miss counter to 0/3.
            const isHeartLoss = currentStageMisses >= 3;

            if (isHeartLoss) {
              sound.wrong();
              haptics.error();
              consecutiveMissesRef.current = 0; // Reset consecutive counter
              stageMissCountRef.current = 0; // Reset stage miss counter to 0/3
              setStageMissCountDisplay(0);
              setLiveNotice('فاتك 3 أشكال! طار قلب 💔');
            } else {
              sound.wrong();
              haptics.light();
              setStageMissCountDisplay(currentStageMisses);
              setLiveNotice('فاتك المطلوب! طار الكومبو 💨');
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
              consecutiveMisses: consecutiveMissesRef.current,
              stageTotalMisses: currentStageMisses,
              isStageFirstMiss: currentStageMisses === 1
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

      isInputLockedRef.current = true;
      setTimeout(() => {
        isInputLockedRef.current = false;
      }, 35);

      const now = Date.now();
      const reactionTime = Math.max(10, now - entity.spawnEpochMs);
      const timeSinceSwitch = now - ruleSwitchTimeRef.current;

      // Evaluate match (including 600ms grace window for previous rule)
      let isMatch = evaluateItemAgainstRule(
        entity,
        activeRuleRef.current,
        entity.currentYRatio
      );

      if (!isMatch && previousRuleRef.current && timeSinceSwitch <= 600) {
        if (evaluateItemAgainstRule(entity, previousRuleRef.current, entity.currentYRatio)) {
          isMatch = true; // Grace window salvation!
        }
      }

      if (isMatch) {
        // Correct Hit!
        entity.isHit = true;
        entity.hitEpochMs = now;
        sound.correct();
        haptics.light();

        // Reset consecutive misses
        consecutiveMissesRef.current = 0;
        targetHitsRef.current += 1;
        setStageTargetHits(Math.min(5, targetHitsRef.current));

        onAnswer({
          itemIndex: entity.itemIndex,
          action: 'TAP',
          reactionTimeMs: reactionTime,
          heightProgress: entity.currentYRatio,
          activeRuleId: activeRuleRef.current.id,
          previousRuleId: previousRuleRef.current?.id,
          timeSinceRuleSwitchMs: timeSinceSwitch
        });
      } else {
        // Wrong Tap on Distractor!
        entity.isWrong = true;
        entity.hitEpochMs = now;
        sound.wrong();
        haptics.error();

        consecutiveMissesRef.current = 0;
        setLiveNotice('قلنالك لا تضغط! راح قلب 💔');
        setTimeout(() => setLiveNotice(null), 1500);

        onAnswer({
          itemIndex: entity.itemIndex,
          action: 'TAP',
          reactionTimeMs: reactionTime,
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
          onClick={() => {
            setIntroDismissed(true);
            ruleSwitchTimeRef.current = Date.now();
            lastSpawnEpochRef.current = Date.now();
          }}
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

            {/* Miss Warning Strike (Specification Update 2: 0/3, 1/3, 2/3) */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-black transition-all ${
                stageMissCountDisplay === 0
                  ? 'text-slate-400 bg-white/5'
                  : stageMissCountDisplay === 1
                  ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30'
                  : 'text-rose-400 bg-rose-500/20 border border-rose-500/40 animate-pulse'
              }`}
            >
              <span>⚠️ تفويت:</span>
              <span className="font-mono">{stageMissCountDisplay}/3</span>
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

        {/* Miss Line at Bottom (88% height) - Glowing & Pulsing per Spec Update 2 */}
        <div
          style={{ top: '88%' }}
          className={`absolute left-0 right-0 -translate-y-1/2 border-b-2 transition-all duration-200 z-10 flex items-center justify-between px-3 pointer-events-none ${
            missFlash
              ? 'border-rose-400 bg-rose-500/25 shadow-[0_0_30px_rgba(244,63,94,0.9)]'
              : 'border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
          }`}
        >
          <div className="flex items-center gap-2 text-[10px] font-black text-rose-400">
            <span>خط التفويت ⛔</span>
            {missFlash && (
              <span className="text-amber-300 font-extrabold animate-bounce text-xs bg-rose-950/90 px-2 py-0.5 rounded-md border border-amber-400/50">
                طار الكومبو 💨
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold text-rose-400/80 uppercase tracking-widest">
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
                } ${ent.isHit ? 'scale-125 opacity-30 transition-all duration-100' : ''} ${
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
                  <div className="absolute inset-0 flex items-center justify-center text-emerald-300 font-black text-3xl animate-ping pointer-events-none">
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
