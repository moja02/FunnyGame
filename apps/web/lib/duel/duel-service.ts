'use client';

import {
  type MatchSize,
  type PlayerSide,
  type DuelRoundResult,
  getDraftPickOrder,
  generateMatchRoundSeeds,
  evaluateDuelRound,
  evaluateDuelMatch,
} from '@funnygame/game-core';
import type { DuelMode, DuelPlayer, DuelRoomState } from './duel-types';
export type { DuelMode, DuelPlayer, DuelRoomState } from './duel-types';
import { getSupabaseBrowserClient } from '../supabase-browser';

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates an esports-styled tournament room code e.g. LY-8K2A
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return `LY-${code}`;
}

/**
 * Creates a new tournament duel room.
 */
export function createDuelRoom(
  mode: DuelMode,
  matchSize: MatchSize,
  host: DuelPlayer,
  customCode?: string
): DuelRoomState {
  const roomId = customCode ? customCode.toUpperCase() : generateRoomCode();
  const startingPlayer: PlayerSide = Math.random() < 0.5 ? 'host' : 'guest';
  const pickOrder = getDraftPickOrder(matchSize, startingPlayer);
  const seeds = generateMatchRoundSeeds(Date.now(), matchSize);

  const initialRounds: DuelRoundResult[] = seeds.map((seed, idx) => ({
    roundOrder: idx + 1,
    gameId: '',
    pickedBy: 'host',
    seed,
    hostRawScore: 0,
    guestRawScore: 0,
    hostNormScore: 0,
    guestNormScore: 0,
    hostBonusScore: 0,
    guestBonusScore: 0,
    hostTimeMs: 0,
    guestTimeMs: 0,
    winner: 'tie',
  }));

  const room: DuelRoomState = {
    roomId,
    mode,
    matchSize,
    status: mode === 'local' ? 'DRAFTING' : 'WAITING_FOR_OPPONENT',
    host,
    guest:
      mode === 'local'
        ? {
            id: 'local_player_2',
            nickname: 'اللاعب 2 (المنافس)',
            avatar: '🎯',
            isHost: false,
          }
        : null,
    draft: {
      startingPlayer,
      currentTurn: startingPlayer,
      turnIndex: 0,
      turnExpiresAt: Date.now() + 15000,
      pickOrder,
      pickedGames: [],
    },
    currentRoundIndex: 0,
    rounds: initialRounds,
    summary: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveDuelRoomLocal(room);
  broadcastDuelRoom(room);
  return room;
}

/**
 * Joins an existing room as a guest.
 */
export async function joinDuelRoom(
  roomCode: string,
  guest: DuelPlayer
): Promise<DuelRoomState | null> {
  const cleanCode = roomCode.trim().toUpperCase();
  let room = getDuelRoomLocal(cleanCode);

  // If not found locally, attempt to fetch from Supabase
  if (!room) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('duel_rooms')
        .select('*')
        .eq('room_code', cleanCode)
        .maybeSingle();

      if (data && data.room_state) {
        room = data.room_state as DuelRoomState;
      }
    } catch {
      // ignore
    }
  }

  if (!room) {
    return null;
  }

  if (room.host.id === guest.id) {
    // Reconnecting as host
    return room;
  }

  if (room.guest && room.guest.id !== guest.id) {
    // Room already has two players
    return room;
  }

  // Set guest and move to drafting
  room.guest = guest;
  if (room.status === 'WAITING_FOR_OPPONENT') {
    room.status = 'DRAFTING';
    room.draft.turnExpiresAt = Date.now() + 15000;
  }
  room.updatedAt = Date.now();

  saveDuelRoomLocal(room);
  broadcastDuelRoom(room);
  return room;
}

/**
 * Picks a game during the draft phase.
 */
export function pickDraftGame(
  room: DuelRoomState,
  gameId: string,
  picker: PlayerSide
): DuelRoomState {
  if (room.status !== 'DRAFTING') return room;
  if (room.draft.currentTurn !== picker) return room;

  // Cannot pick a game already chosen
  const isAlreadyPicked = room.draft.pickedGames.some((p) => p.gameId === gameId);
  if (isAlreadyPicked) return room;

  const currentRoundOrder = room.draft.turnIndex + 1;
  const newPicked = [
    ...room.draft.pickedGames,
    { gameId, pickedBy: picker, roundOrder: currentRoundOrder },
  ];

  // Update gameId on corresponding round
  const updatedRounds = [...room.rounds];
  if (updatedRounds[room.draft.turnIndex]) {
    updatedRounds[room.draft.turnIndex] = {
      ...updatedRounds[room.draft.turnIndex]!,
      gameId,
      pickedBy: picker,
    };
  }

  const nextTurnIndex = room.draft.turnIndex + 1;
  const isDraftComplete = nextTurnIndex >= room.matchSize;

  const nextTurn = !isDraftComplete
    ? room.draft.pickOrder[nextTurnIndex] || 'host'
    : room.draft.startingPlayer;

  const updatedRoom: DuelRoomState = {
    ...room,
    status: isDraftComplete ? 'PLAYING_ROUND' : 'DRAFTING',
    draft: {
      ...room.draft,
      pickedGames: newPicked,
      turnIndex: nextTurnIndex,
      currentTurn: nextTurn,
      turnExpiresAt: Date.now() + 15000,
    },
    rounds: updatedRounds,
    currentRoundIndex: 0,
    updatedAt: Date.now(),
  };

  saveDuelRoomLocal(updatedRoom);
  broadcastDuelRoom(updatedRoom);
  return updatedRoom;
}

/**
 * Records score for one player in a round.
 * If both players have submitted (or in local mode after both play), round is evaluated!
 */
export function recordRoundScore(
  room: DuelRoomState,
  roundOrder: number,
  playerSide: PlayerSide,
  rawScore: number,
  timeMs: number
): DuelRoomState {
  const roundIdx = roundOrder - 1;
  if (roundIdx < 0 || roundIdx >= room.rounds.length) return room;

  const curRound = room.rounds[roundIdx]!;
  const updatedRound: DuelRoundResult = {
    ...curRound,
    hostRawScore: playerSide === 'host' ? rawScore : curRound.hostRawScore,
    guestRawScore: playerSide === 'guest' ? rawScore : curRound.guestRawScore,
    hostTimeMs: playerSide === 'host' ? timeMs : curRound.hostTimeMs,
    guestTimeMs: playerSide === 'guest' ? timeMs : curRound.guestTimeMs,
  };

  // Check if both players played this round (or in local mode if currently completing)
  const isBothDone =
    (playerSide === 'host' && (updatedRound.guestRawScore > 0 || room.mode === 'online')) ||
    (playerSide === 'guest' && (updatedRound.hostRawScore > 0 || room.mode === 'online')) ||
    (updatedRound.hostRawScore > 0 && updatedRound.guestRawScore > 0);

  // Evaluate normalized scores & bonuses
  const evaluated = evaluateDuelRound(
    {
      roundOrder,
      gameId: updatedRound.gameId,
      pickedBy: updatedRound.pickedBy,
      seed: updatedRound.seed,
    },
    updatedRound.hostRawScore,
    updatedRound.guestRawScore,
    updatedRound.hostTimeMs,
    updatedRound.guestTimeMs
  );

  const updatedRounds = [...room.rounds];
  updatedRounds[roundIdx] = evaluated;

  const nextStatus = isBothDone ? 'ROUND_RESULT' : 'PLAYING_ROUND';
  const updatedRoom: DuelRoomState = {
    ...room,
    status: nextStatus,
    rounds: updatedRounds,
    updatedAt: Date.now(),
  };

  saveDuelRoomLocal(updatedRoom);
  broadcastDuelRoom(updatedRoom);
  return updatedRoom;
}

/**
 * Advances from Round Result to Next Round (or Completed Podium).
 */
export function advanceToNextRound(room: DuelRoomState): DuelRoomState {
  const nextRoundIndex = room.currentRoundIndex + 1;
  const isFinished = nextRoundIndex >= room.matchSize;

  let summary = room.summary;
  if (isFinished) {
    summary = evaluateDuelMatch(room.matchSize, room.rounds);
  }

  const updatedRoom: DuelRoomState = {
    ...room,
    currentRoundIndex: isFinished ? room.currentRoundIndex : nextRoundIndex,
    status: isFinished ? 'COMPLETED' : 'PLAYING_ROUND',
    summary,
    updatedAt: Date.now(),
  };

  saveDuelRoomLocal(updatedRoom);
  broadcastDuelRoom(updatedRoom);
  return updatedRoom;
}

/**
 * Resets the room with same players for a Rematch.
 */
export function rematchDuelRoom(room: DuelRoomState): DuelRoomState {
  const startingPlayer: PlayerSide = room.draft.startingPlayer === 'host' ? 'guest' : 'host';
  const pickOrder = getDraftPickOrder(room.matchSize, startingPlayer);
  const seeds = generateMatchRoundSeeds(Date.now(), room.matchSize);

  const freshRounds: DuelRoundResult[] = seeds.map((seed, idx) => ({
    roundOrder: idx + 1,
    gameId: '',
    pickedBy: 'host',
    seed,
    hostRawScore: 0,
    guestRawScore: 0,
    hostNormScore: 0,
    guestNormScore: 0,
    hostBonusScore: 0,
    guestBonusScore: 0,
    hostTimeMs: 0,
    guestTimeMs: 0,
    winner: 'tie',
  }));

  const rematchedRoom: DuelRoomState = {
    ...room,
    status: 'DRAFTING',
    currentRoundIndex: 0,
    rounds: freshRounds,
    summary: null,
    draft: {
      startingPlayer,
      currentTurn: startingPlayer,
      turnIndex: 0,
      turnExpiresAt: Date.now() + 15000,
      pickOrder,
      pickedGames: [],
    },
    updatedAt: Date.now(),
  };

  saveDuelRoomLocal(rematchedRoom);
  broadcastDuelRoom(rematchedRoom);
  return rematchedRoom;
}

/**
 * Local storage persistence
 */
export function saveDuelRoomLocal(room: DuelRoomState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`fg_duel_${room.roomId}`, JSON.stringify(room));
    localStorage.setItem('fg_active_duel_id', room.roomId);
  } catch (err) {
    console.warn('Duel save notice:', err);
  }
}

export function getDuelRoomLocal(roomId: string): DuelRoomState | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(`fg_duel_${roomId.toUpperCase()}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getActiveDuelId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fg_active_duel_id');
}

/**
 * Cross-tab & Supabase Realtime Broadcast synchronization
 */
export function broadcastDuelRoom(room: DuelRoomState): void {
  if (typeof window === 'undefined') return;

  // 1. Cross-tab storage event
  try {
    window.dispatchEvent(
      new CustomEvent('fg:duel_update', { detail: { roomId: room.roomId, room } })
    );
  } catch {
    // ignore
  }

  // 2. Supabase Realtime broadcast channel
  if (room.mode === 'online') {
    try {
      const supabase = getSupabaseBrowserClient();
      const channel = supabase.channel(`duel_room:${room.roomId}`);
      channel.send({
        type: 'broadcast',
        event: 'room_state',
        payload: room,
      });

      // Also persist to Supabase duel_rooms table if available
      supabase
        .from('duel_rooms')
        .upsert({
          room_code: room.roomId,
          status: room.status,
          match_size: room.matchSize,
          room_state: room,
          updated_at: new Date().toISOString(),
        })
        .then(() => {}, () => {});
    } catch {
      // ignore
    }
  }
}

/**
 * Subscribes to real-time duel room updates.
 */
export function subscribeToDuelRoom(
  roomId: string,
  onUpdate: (room: DuelRoomState) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const cleanId = roomId.toUpperCase();

  // 1. Local event listener
  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<{ roomId: string; room: DuelRoomState }>;
    if (custom.detail && custom.detail.roomId === cleanId) {
      onUpdate(custom.detail.room);
    }
  };
  window.addEventListener('fg:duel_update', handleLocalEvent);

  // 2. Supabase Realtime Channel
  let channel: any = null;
  try {
    const supabase = getSupabaseBrowserClient();
    channel = supabase
      .channel(`duel_room:${cleanId}`)
      .on('broadcast', { event: 'room_state' }, (payload: any) => {
        if (payload && payload.payload && payload.payload.roomId === cleanId) {
          saveDuelRoomLocal(payload.payload);
          onUpdate(payload.payload);
        }
      })
      .subscribe();
  } catch {
    // ignore
  }

  // 3. Fallback polling for mobile connections (every 2s)
  const pollTimer = setInterval(async () => {
    const local = getDuelRoomLocal(cleanId);
    if (local) {
      onUpdate(local);
    }
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('duel_rooms')
        .select('*')
        .eq('room_code', cleanId)
        .maybeSingle();

      if (data && data.room_state) {
        const remoteRoom = data.room_state as DuelRoomState;
        if (!local || remoteRoom.updatedAt > local.updatedAt) {
          saveDuelRoomLocal(remoteRoom);
          onUpdate(remoteRoom);
        }
      }
    } catch {
      // ignore
    }
  }, 2000);

  return () => {
    window.removeEventListener('fg:duel_update', handleLocalEvent);
    clearInterval(pollTimer);
    if (channel) {
      try {
        const supabase = getSupabaseBrowserClient();
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    }
  };
}
