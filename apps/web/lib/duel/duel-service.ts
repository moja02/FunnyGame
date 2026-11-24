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
import type { DuelMode, DuelPlayer, DuelRoomState, DuelStatus } from './duel-types';
export type { DuelMode, DuelPlayer, DuelRoomState, DuelStatus } from './duel-types';
import { getSupabaseBrowserClient } from '../supabase-browser';

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Normalizes user input room codes: handles lowercase, missing "LY-", spaces, dashes, or full URLs.
 */
export function normalizeRoomCode(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim().toUpperCase();
  // If user pasted a full URL e.g. https://.../duel/?room=LY-8K2A
  if (cleaned.includes('ROOM=')) {
    cleaned = cleaned.split('ROOM=')[1]?.split('&')[0] || cleaned;
  }
  // Remove hash or query marks
  cleaned = cleaned.replace(/^[#?@]/, '');
  // Normalize dashes or underscores
  cleaned = cleaned.replace(/[—–_]/g, '-');
  // Remove any surrounding quotes or spaces
  cleaned = cleaned.replace(/['"]/g, '').trim();
  // If user typed only the 4-char suffix (e.g. "8K2A")
  if (!cleaned.startsWith('LY-') && !cleaned.startsWith('LY')) {
    if (cleaned.length === 4 || cleaned.length === 5) {
      cleaned = `LY-${cleaned}`;
    }
  } else if (cleaned.startsWith('LY') && !cleaned.startsWith('LY-')) {
    // E.g. "LY8K2A" -> "LY-8K2A"
    cleaned = `LY-${cleaned.slice(2)}`;
  }
  return cleaned;
}

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

const activeChannels = new Map<string, any>();

function getOrCreateDuelChannel(roomCode: string) {
  const clean = normalizeRoomCode(roomCode);
  if (activeChannels.has(clean)) {
    return activeChannels.get(clean);
  }
  const supabase = getSupabaseBrowserClient();
  const channel = supabase.channel(`duel_room:${clean}`);
  activeChannels.set(clean, channel);
  return channel;
}

/**
 * Creates a new tournament duel room.
 */
export function createDuelRoom(
  mode: DuelMode,
  matchSize: MatchSize,
  host: DuelPlayer,
  customCode?: string,
  guestPlayer?: DuelPlayer
): DuelRoomState {
  if (mode === 'online' && host.isGuest) {
    throw new Error('يجب تسجيل الدخول بحساب رسمي لإنشاء غرفة تحدي ثنائي أونلاين.');
  }

  const roomId = customCode ? normalizeRoomCode(customCode) : generateRoomCode();
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

  const guest: DuelPlayer | null =
    mode === 'local'
      ? guestPlayer || {
          id: 'local_player_2',
          nickname: 'اللاعب 2',
          avatar: '🦅',
          isHost: false,
        }
      : null;

  const room: DuelRoomState = {
    roomId,
    mode,
    matchSize,
    status: mode === 'local' ? 'DRAFTING' : 'WAITING_FOR_OPPONENT',
    host,
    guest,
    draft: {
      startingPlayer,
      currentTurn: startingPlayer,
      turnIndex: 0,
      turnExpiresAt: mode === 'local' ? 0 : Date.now() + 15000,
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
 * Supports cross-device real-time discovery over Supabase Realtime Channels.
 */
export async function joinDuelRoom(
  roomCode: string,
  guest: DuelPlayer,
  timeoutMs = 6000
): Promise<DuelRoomState | null> {
  const cleanCode = normalizeRoomCode(roomCode);
  if (!cleanCode) return null;

  if (guest.isGuest) {
    console.warn('Guest users cannot join duel matches.');
    return null;
  }

  let room = getDuelRoomLocal(cleanCode);

  // 1. If found locally (same device or reconnecting host)
  if (room) {
    if (room.host.id === guest.id) {
      return room;
    }
    if (room.guest && room.guest.id !== guest.id) {
      return room;
    }
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

  // 2. Cross-device real-time handshake over Supabase Channel
  return new Promise<DuelRoomState | null>((resolve) => {
    let resolved = false;
    let pingInterval: any = null;
    const channel = getOrCreateDuelChannel(cleanCode);

    const cleanup = () => {
      if (pingInterval) clearInterval(pingInterval);
    };

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        const fallback = getDuelRoomLocal(cleanCode);
        resolve(fallback);
      }
    }, timeoutMs);

    channel
      .on('broadcast', { event: 'room_state' }, (msg: any) => {
        if (msg?.payload && msg.payload.roomId === cleanCode) {
          const remote = msg.payload as DuelRoomState;
          if (
            remote.status === 'WAITING_FOR_OPPONENT' ||
            !remote.guest ||
            remote.guest.id === guest.id
          ) {
            remote.guest = guest;
            if (remote.status === 'WAITING_FOR_OPPONENT') {
              remote.status = 'DRAFTING';
              remote.draft.turnExpiresAt = Date.now() + 15000;
            }
            remote.updatedAt = Date.now();
          }

          saveDuelRoomLocal(remote);
          broadcastDuelRoom(remote);

          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            cleanup();
            resolve(remote);
          }
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          const sendPing = async () => {
            if (resolved) return;
            try {
              await channel.send({
                type: 'broadcast',
                event: 'guest_join_req',
                payload: { roomCode: cleanCode, guest },
              });
              await channel.send({
                type: 'broadcast',
                event: 'ping_room',
                payload: { roomCode: cleanCode },
              });
            } catch {
              // ignore
            }
          };

          await sendPing();
          // Repeat ping every 500ms until host responds or timeout
          pingInterval = setInterval(sendPing, 500);
        }
      });
  });
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
      turnExpiresAt: room.mode === 'local' ? 0 : Date.now() + 15000,
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

  // Check if both players played this round
  const hasHostSubmitted = updatedRound.hostTimeMs > 0 || updatedRound.hostRawScore > 0;
  const hasGuestSubmitted = updatedRound.guestTimeMs > 0 || updatedRound.guestRawScore > 0;
  const isBothDone = hasHostSubmitted && hasGuestSubmitted;

  let evaluated: DuelRoundResult;
  if (isBothDone) {
    evaluated = evaluateDuelRound(
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
  } else {
    evaluated = {
      ...updatedRound,
      hostNormScore: 0,
      guestNormScore: 0,
      hostBonusScore: 0,
      guestBonusScore: 0,
      winner: 'tie',
      banterText: '',
    };
  }

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
 * Intelligently merges two room states across devices to ensure no player's submitted score is overwritten.
 */
export function mergeDuelRooms(current: DuelRoomState, remote: DuelRoomState): DuelRoomState {
  if (!current) return remote;
  if (!remote) return current;

  // Status priority
  const statusWeight: Record<DuelStatus, number> = {
    WAITING_FOR_OPPONENT: 1,
    DRAFTING: 2,
    PLAYING_ROUND: 3,
    ROUND_RESULT: 4,
    COMPLETED: 5,
  };

  const guest = remote.guest || current.guest;

  // Draft info: keep highest turn or picks
  const currentPicks = current.draft?.pickedGames || [];
  const remotePicks = remote.draft?.pickedGames || [];
  const pickedGames = remotePicks.length >= currentPicks.length ? remotePicks : currentPicks;
  const turnIndex = Math.max(current.draft?.turnIndex || 0, remote.draft?.turnIndex || 0);

  const matchSize = current.matchSize || remote.matchSize || 2;
  const currentRoundIndex = Math.max(current.currentRoundIndex || 0, remote.currentRoundIndex || 0);

  // Merge each round's host and guest scores
  const mergedRounds: DuelRoundResult[] = [];
  for (let i = 0; i < matchSize; i++) {
    const curR = current.rounds?.[i];
    const remR = remote.rounds?.[i];

    if (!curR && !remR) continue;
    const baseR = curR || remR!;

    const gameId = curR?.gameId || remR?.gameId || '';
    const pickedBy = curR?.pickedBy || remR?.pickedBy || 'host';
    const seed = curR?.seed || remR?.seed || 1000;

    // Host submission
    const curHostDone = (curR?.hostTimeMs ?? 0) > 0 || (curR?.hostRawScore ?? 0) > 0;
    const remHostDone = (remR?.hostTimeMs ?? 0) > 0 || (remR?.hostRawScore ?? 0) > 0;
    const hostRawScore = curHostDone ? curR!.hostRawScore : (remHostDone ? remR!.hostRawScore : 0);
    const hostTimeMs = curHostDone ? curR!.hostTimeMs : (remHostDone ? remR!.hostTimeMs : 0);

    // Guest submission
    const curGuestDone = (curR?.guestTimeMs ?? 0) > 0 || (curR?.guestRawScore ?? 0) > 0;
    const remGuestDone = (remR?.guestTimeMs ?? 0) > 0 || (remR?.guestRawScore ?? 0) > 0;
    const guestRawScore = curGuestDone ? curR!.guestRawScore : (remGuestDone ? remR!.guestRawScore : 0);
    const guestTimeMs = curGuestDone ? curR!.guestTimeMs : (remGuestDone ? remR!.guestTimeMs : 0);

    const isBothDone = (hostTimeMs > 0 || hostRawScore > 0) && (guestTimeMs > 0 || guestRawScore > 0);

    if (isBothDone) {
      const evaluated = evaluateDuelRound(
        { roundOrder: i + 1, gameId, pickedBy, seed },
        hostRawScore,
        guestRawScore,
        hostTimeMs,
        guestTimeMs
      );
      mergedRounds.push(evaluated);
    } else {
      mergedRounds.push({
        ...baseR,
        gameId,
        pickedBy,
        seed,
        hostRawScore,
        guestRawScore,
        hostTimeMs,
        guestTimeMs,
        hostNormScore: 0,
        guestNormScore: 0,
        hostBonusScore: 0,
        guestBonusScore: 0,
        winner: 'tie',
        banterText: '',
      });
    }
  }

  // Determine merged status
  let mergedStatus: DuelStatus =
    (statusWeight[remote.status] || 0) > (statusWeight[current.status] || 0)
      ? remote.status
      : current.status;

  // Check if current round has both players finished
  const curRound = mergedRounds[currentRoundIndex];
  const curRoundBothDone =
    curRound &&
    ((curRound.hostTimeMs > 0 || curRound.hostRawScore > 0) &&
     (curRound.guestTimeMs > 0 || curRound.guestRawScore > 0));

  if (curRoundBothDone && mergedStatus === 'PLAYING_ROUND') {
    mergedStatus = 'ROUND_RESULT';
  }

  // Check if all rounds done
  const allRoundsDone =
    mergedRounds.length === matchSize &&
    mergedRounds.every(
      (r) => (r.hostTimeMs > 0 || r.hostRawScore > 0) && (r.guestTimeMs > 0 || r.guestRawScore > 0)
    );

  let summary = current.summary || remote.summary;
  if (allRoundsDone && (mergedStatus === 'COMPLETED' || currentRoundIndex + 1 >= matchSize && mergedStatus === 'ROUND_RESULT')) {
    summary = evaluateDuelMatch(matchSize, mergedRounds);
  }

  return {
    ...current,
    status: mergedStatus,
    guest,
    matchSize,
    draft: {
      ...current.draft,
      pickedGames,
      turnIndex,
      currentTurn: remote.draft?.currentTurn || current.draft?.currentTurn,
    },
    currentRoundIndex,
    rounds: mergedRounds,
    summary,
    updatedAt: Math.max(current.updatedAt || 0, remote.updatedAt || 0, Date.now()),
  };
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
      turnExpiresAt: room.mode === 'local' ? 0 : Date.now() + 15000,
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
 * Helper to reliably send broadcasts over Supabase Realtime channel.
 * Automatically waits for subscription connection before sending if needed.
 */
export async function sendChannelBroadcast(
  roomCode: string,
  event: string,
  payload: any
): Promise<void> {
  if (typeof window === 'undefined') return;
  const clean = normalizeRoomCode(roomCode);
  const channel = getOrCreateDuelChannel(clean);

  if (channel.state === 'joined') {
    try {
      await channel.send({ type: 'broadcast', event, payload });
    } catch {
      // ignore
    }
    return;
  }

  return new Promise<void>((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve();
      }
    }, 4000);

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED' && !done) {
        done = true;
        clearTimeout(timer);
        try {
          await channel.send({ type: 'broadcast', event, payload });
        } catch {
          // ignore
        }
        resolve();
      }
    });
  });
}

/**
 * Broadcasts a single round submission directly to the opponent.
 */
export function broadcastRoundScore(
  roomId: string,
  roundOrder: number,
  playerSide: PlayerSide,
  rawScore: number,
  timeMs: number
): void {
  const cleanId = normalizeRoomCode(roomId);
  sendChannelBroadcast(cleanId, 'round_score', {
    roomCode: cleanId,
    roundOrder,
    playerSide,
    rawScore,
    timeMs,
  });
}

/**
 * Cross-tab & Supabase Realtime Broadcast synchronization
 */
export function broadcastDuelRoom(room: DuelRoomState): void {
  if (typeof window === 'undefined') return;
  const cleanId = normalizeRoomCode(room.roomId);

  // 1. Cross-tab storage event
  try {
    window.dispatchEvent(
      new CustomEvent('fg:duel_update', { detail: { roomId: cleanId, room } })
    );
  } catch {
    // ignore
  }

  // 2. Supabase Realtime broadcast channel
  if (room.mode === 'online') {
    sendChannelBroadcast(cleanId, 'room_state', room);
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

  const cleanId = normalizeRoomCode(roomId);

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
    channel = getOrCreateDuelChannel(cleanId);
    channel
      .on('broadcast', { event: 'room_state' }, (msg: any) => {
        if (msg?.payload && msg.payload.roomId === cleanId) {
          const remote = msg.payload as DuelRoomState;
          const current = getDuelRoomLocal(cleanId);
          if (!current) {
            saveDuelRoomLocal(remote);
            onUpdate(remote);
            return;
          }

          // Merge room states without overwriting either player's scores
          const merged = mergeDuelRooms(current, remote);
          saveDuelRoomLocal(merged);
          onUpdate(merged);

          // If status transitioned to ROUND_RESULT, broadcast merged state back so opponent gets it immediately
          if (merged.status !== current.status) {
            broadcastDuelRoom(merged);
          }
        }
      })
      .on('broadcast', { event: 'round_score' }, (msg: any) => {
        if (msg?.payload && msg.payload.roomCode === cleanId) {
          const { roundOrder, playerSide, rawScore, timeMs } = msg.payload;
          const current = getDuelRoomLocal(cleanId);
          if (current) {
            const updated = recordRoundScore(current, roundOrder, playerSide, rawScore, timeMs);
            saveDuelRoomLocal(updated);
            onUpdate(updated);
            if (updated.status === 'ROUND_RESULT') {
              broadcastDuelRoom(updated);
            }
          }
        }
      })
      .on('broadcast', { event: 'guest_join_req' }, (msg: any) => {
        if (msg?.payload && msg.payload.guest && msg.payload.roomCode === cleanId) {
          const current = getDuelRoomLocal(cleanId);
          if (
            current &&
            (current.status === 'WAITING_FOR_OPPONENT' ||
              !current.guest ||
              current.guest.id === msg.payload.guest.id)
          ) {
            current.guest = msg.payload.guest;
            if (current.status === 'WAITING_FOR_OPPONENT') {
              current.status = 'DRAFTING';
              current.draft.turnExpiresAt = Date.now() + 15000;
            }
            current.updatedAt = Date.now();
            saveDuelRoomLocal(current);
            broadcastDuelRoom(current);
            onUpdate(current);
          }
        }
      })
      .on('broadcast', { event: 'ping_room' }, (msg: any) => {
        if (msg?.payload && msg.payload.roomCode === cleanId) {
          const current = getDuelRoomLocal(cleanId);
          if (current) {
            if (msg.payload.room) {
              const merged = mergeDuelRooms(current, msg.payload.room);
              saveDuelRoomLocal(merged);
              onUpdate(merged);
              broadcastDuelRoom(merged);
            } else {
              broadcastDuelRoom(current);
            }
          }
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          const current = getDuelRoomLocal(cleanId);
          if (current && current.mode === 'online') {
            try {
              channel.send({
                type: 'broadcast',
                event: 'ping_room',
                payload: { roomCode: cleanId, room: current },
              });
              channel.send({
                type: 'broadcast',
                event: 'room_state',
                payload: current,
              });
            } catch {
              // ignore
            }
          }
        }
      });
  } catch {
    // ignore
  }

  // 3. Heartbeat & Active Polling Synchronization
  const pollTimer = setInterval(async () => {
    const local = getDuelRoomLocal(cleanId);
    if (local) {
      onUpdate(local);
      if (local.mode === 'online') {
        // Broadcast heartbeat if waiting for opponent OR if in live round waiting for opponent score
        if (local.status === 'WAITING_FOR_OPPONENT' || local.status === 'PLAYING_ROUND') {
          broadcastDuelRoom(local);
        }
      }
    }
  }, 1200);

  return () => {
    window.removeEventListener('fg:duel_update', handleLocalEvent);
    clearInterval(pollTimer);
    if (channel) {
      try {
        const supabase = getSupabaseBrowserClient();
        activeChannels.delete(cleanId);
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    }
  };
}
