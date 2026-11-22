/**
 * Core Duel Tournament & Draft Engine
 * Implements 1v1 draft logic, snake pick ordering, shared seed generation,
 * score normalization ($S_norm$), bonus calculations, and tie breaking.
 */

export type MatchSize = 2 | 4 | 6; // 2: Flash, 4: Standard, 6: Epic

export type PlayerSide = 'host' | 'guest';

export interface DuelRoundConfig {
  roundOrder: number; // 1 to N
  gameId: string;
  pickedBy: PlayerSide;
  seed: number;
}

export interface DuelRoundResult extends DuelRoundConfig {
  hostRawScore: number;
  guestRawScore: number;
  hostNormScore: number;
  guestNormScore: number;
  hostBonusScore: number;
  guestBonusScore: number;
  hostTimeMs: number;
  guestTimeMs: number;
  winner: PlayerSide | 'tie';
  banterText?: string;
}

export interface DuelMatchSummary {
  matchSize: MatchSize;
  hostTotalScore: number;
  guestTotalScore: number;
  hostRoundWins: number;
  guestRoundWins: number;
  hostTotalTimeMs: number;
  guestTotalTimeMs: number;
  winner: PlayerSide | 'tie';
  victoryReason: 'score' | 'round_wins' | 'total_time' | 'tie';
  banterText: string;
}

/**
 * Calibrated Target Benchmark Scores ($S_target$) for all 13 Games.
 * A score equal to target translates to 1000 normalized points.
 */
export const DUEL_TARGET_SCORES: Record<string, number> = {
  'color-trap': 3000,
  'dont-tap': 2500,
  'odd-one-out': 2500,
  'calc-pressure': 3000,
  'calc_pressure': 3000,
  'math-bridge': 2200,
  'math_bridge': 2200,
  'number-hunt': 2500,
  'number_hunt': 2500,
  'where-did-it-go': 2200,
  'where_did_it_go': 2200,
  'follow-pattern': 2500,
  'follow_pattern': 2500,
  'watch-and-judge': 2200,
  'watch_and_judge': 2200,
  'moving-maze': 2500,
  'moving_maze': 2500,
  'tile-match': 2500,
  'tile_match': 2500,
  'smart-trap': 2500,
  'smart_trap': 2500,
  'complete-sequence': 2500,
  'complete_sequence': 2500,
};

/**
 * Normalizes raw score to [0 - 1000] based on target reference score.
 * Formula: S_norm = min(1000, round(1000 * S_raw / S_target))
 */
export function calculateNormalizedScore(gameId: string, rawScore: number): number {
  if (rawScore <= 0) return 0;
  const target = DUEL_TARGET_SCORES[gameId] || 2500;
  const normalized = Math.round((1000 * rawScore) / target);
  return Math.min(1000, Math.max(0, normalized));
}

/**
 * Generates the alternating draft turn sequence (Snake Draft).
 * Examples:
 * - 2 Rounds: [host, guest] (or guest, host)
 * - 4 Rounds: [P1, P2, P2, P1]
 * - 6 Rounds: [P1, P2, P2, P1, P1, P2]
 */
export function getDraftPickOrder(
  matchSize: MatchSize,
  startingPlayer: PlayerSide = 'host'
): PlayerSide[] {
  const otherPlayer: PlayerSide = startingPlayer === 'host' ? 'guest' : 'host';

  if (matchSize === 2) {
    return [startingPlayer, otherPlayer];
  }

  if (matchSize === 4) {
    return [startingPlayer, otherPlayer, otherPlayer, startingPlayer];
  }

  // 6 Rounds
  return [
    startingPlayer,
    otherPlayer,
    otherPlayer,
    startingPlayer,
    startingPlayer,
    otherPlayer,
  ];
}

/**
 * Generates deterministic shared seeds for each round of a match.
 */
export function generateMatchRoundSeeds(baseSeed: number, matchSize: MatchSize): number[] {
  const seeds: number[] = [];
  let s = Math.abs(baseSeed) || 1337;
  for (let i = 0; i < matchSize; i++) {
    // Linear congruential derivation
    s = (s * 16807 + (i + 1) * 7919) % 2147483647;
    seeds.push(Math.abs(s) || (1000 + i * 7));
  }
  return seeds;
}

/**
 * Evaluates a single duel round:
 * - Normalizes both raw scores
 * - Awards +200 win bonus (+100 each for tie)
 * - Identifies round winner
 * - Assigns contextual Libyan banter
 */
export function evaluateDuelRound(
  roundConfig: DuelRoundConfig,
  hostRawScore: number,
  guestRawScore: number,
  hostTimeMs: number = 0,
  guestTimeMs: number = 0
): DuelRoundResult {
  const hostNormScore = calculateNormalizedScore(roundConfig.gameId, hostRawScore);
  const guestNormScore = calculateNormalizedScore(roundConfig.gameId, guestRawScore);

  let winner: PlayerSide | 'tie' = 'tie';
  let hostBonus = 0;
  let guestBonus = 0;

  if (hostRawScore > guestRawScore) {
    winner = 'host';
    hostBonus = 200;
  } else if (guestRawScore > hostRawScore) {
    winner = 'guest';
    guestBonus = 200;
  } else {
    // Tie in raw score
    winner = 'tie';
    hostBonus = 100;
    guestBonus = 100;
  }

  const banterText = getRoundBanter(roundConfig.pickedBy, winner, hostRawScore, guestRawScore);

  return {
    ...roundConfig,
    hostRawScore,
    guestRawScore,
    hostNormScore,
    guestNormScore,
    hostBonusScore: hostBonus,
    guestBonusScore: guestBonus,
    hostTimeMs,
    guestTimeMs,
    winner,
    banterText,
  };
}

/**
 * Calculates overall match summary and applies strict tie-breaking logic:
 * 1. Highest total normalized + bonus points
 * 2. Most individual round wins
 * 3. Least total execution time
 */
export function evaluateDuelMatch(
  matchSize: MatchSize,
  rounds: DuelRoundResult[]
): DuelMatchSummary {
  let hostTotalScore = 0;
  let guestTotalScore = 0;
  let hostRoundWins = 0;
  let guestRoundWins = 0;
  let hostTotalTimeMs = 0;
  let guestTotalTimeMs = 0;

  for (const r of rounds) {
    hostTotalScore += r.hostNormScore + r.hostBonusScore;
    guestTotalScore += r.guestNormScore + r.guestBonusScore;
    hostTotalTimeMs += r.hostTimeMs;
    guestTotalTimeMs += r.guestTimeMs;

    if (r.winner === 'host') hostRoundWins++;
    else if (r.winner === 'guest') guestRoundWins++;
  }

  let winner: PlayerSide | 'tie' = 'tie';
  let victoryReason: 'score' | 'round_wins' | 'total_time' | 'tie' = 'score';

  if (hostTotalScore > guestTotalScore) {
    winner = 'host';
    victoryReason = 'score';
  } else if (guestTotalScore > hostTotalScore) {
    winner = 'guest';
    victoryReason = 'score';
  } else {
    // Tie in total score -> Check most round wins
    if (hostRoundWins > guestRoundWins) {
      winner = 'host';
      victoryReason = 'round_wins';
    } else if (guestRoundWins > hostRoundWins) {
      winner = 'guest';
      victoryReason = 'round_wins';
    } else {
      // Tie in round wins -> Check least total execution time
      if (hostTotalTimeMs > 0 && guestTotalTimeMs > 0) {
        if (hostTotalTimeMs < guestTotalTimeMs) {
          winner = 'host';
          victoryReason = 'total_time';
        } else if (guestTotalTimeMs < hostTotalTimeMs) {
          winner = 'guest';
          victoryReason = 'total_time';
        } else {
          winner = 'tie';
          victoryReason = 'tie';
        }
      } else {
        winner = 'tie';
        victoryReason = 'tie';
      }
    }
  }

  const banterText = getMatchBanter(winner, hostTotalScore, guestTotalScore, victoryReason);

  return {
    matchSize,
    hostTotalScore,
    guestTotalScore,
    hostRoundWins,
    guestRoundWins,
    hostTotalTimeMs,
    guestTotalTimeMs,
    winner,
    victoryReason,
    banterText,
  };
}

/**
 * Contextual Libyan dialect commentary per round
 */
function getRoundBanter(
  pickedBy: PlayerSide,
  roundWinner: PlayerSide | 'tie',
  hostScore: number,
  guestScore: number
): string {
  if (roundWinner === 'tie') {
    return 'تعادل أسطوري! 🤝 رأس برأس لآخر ثانية!';
  }

  // Did the player who picked the game lose it?
  const pickerLost =
    (pickedBy === 'host' && roundWinner === 'guest') ||
    (pickedBy === 'guest' && roundWinner === 'host');

  if (pickerLost) {
    const quotes = [
      'خسرت في اللعبة اللي اخترتها بروحك؟ خطة فاشلة يا غالي 😂',
      'جبتها لروحك! اخترت لعبتك وخسرت فيها هههه 🔥',
      'تكتيكك خانك! اللعبة اللي اخترتها كلاها عليك الخصم 💥',
    ];
    return quotes[Math.abs(hostScore - guestScore) % quotes.length]!;
  }

  // Normal round win
  const margin = Math.abs(hostScore - guestScore);
  if (margin > 800) {
    return 'فارق Points يطير! ركز في الجولة الجاية قبل ما تضيع المباراة 🚀';
  }

  return 'فوز مستحق في الجولة! التنافس شاعل نار 🔥';
}

/**
 * Contextual Libyan dialect victory announcement
 */
function getMatchBanter(
  winner: PlayerSide | 'tie',
  hostScore: number,
  guestScore: number,
  reason: 'score' | 'round_wins' | 'total_time' | 'tie'
): string {
  if (winner === 'tie') {
    return 'مباراة تاريخية! تعادل كامل في النقاط والجولات 🤝';
  }

  if (reason === 'total_time') {
    return 'حسمتها بالمللي ثانية وبسرعة البديهة! سرعة خرافية ⚡';
  }

  if (reason === 'round_wins') {
    return 'حسمها بعدد الجولات الرابحة! تكتيك عالي واقتناص فرص 🎯';
  }

  const gap = Math.abs(hostScore - guestScore);
  if (gap >= 600) {
    return 'كأس التحدي عندك اليوم! أداء أسطوري وفارق خرافي 🏆';
  }

  return 'جاب البطولة بجدارة بعد منافسة نارية! مين يسترجل يطلب إعادة؟ ⚔️';
}
