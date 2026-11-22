'use client';

import type { PlayerProfile } from './auth-context';
import type { User } from '@supabase/supabase-js';

/**
 * Returns the stable, unique identifier for the currently active player account.
 * For registered cloud users: returns the user's UUID (from user or profile).
 * For guest players: returns the guest identifier (e.g. guest_abc123).
 */
export function getActiveUserId(
  profile?: Partial<PlayerProfile> | null,
  user?: Partial<User> | null
): string {
  if (user?.id && (!profile || !profile.isGuest)) {
    return user.id;
  }
  if (profile?.id && !profile.isGuest) {
    return profile.id;
  }
  if (profile?.id) {
    return profile.id;
  }
  return 'guest';
}

/**
 * Builds an account-scoped localStorage key.
 * Format: fg_u_<userId>_<baseKey>
 */
export function getUserStorageKey(baseKey: string, userId: string): string {
  const safeId = userId.trim() || 'guest';
  return `fg_u_${safeId}_${baseKey}`;
}

export function getUserPB(userId: string, gameId: string): number {
  if (typeof window === 'undefined') return 0;
  const val = localStorage.getItem(getUserStorageKey(`pb_${gameId}`, userId));
  return val ? Number(val) : 0;
}

export function setUserPB(userId: string, gameId: string, score: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getUserStorageKey(`pb_${gameId}`, userId), score.toString());
}

export function getUserTotalGames(userId: string): number {
  if (typeof window === 'undefined') return 0;
  const val = localStorage.getItem(getUserStorageKey('total_games', userId));
  return val ? Number(val) : 0;
}

export function setUserTotalGames(userId: string, count: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getUserStorageKey('total_games', userId), count.toString());
}

export function getUserGamePlays(userId: string, gameId: string): number {
  if (typeof window === 'undefined') return 0;
  const val = localStorage.getItem(getUserStorageKey(`plays_${gameId}`, userId));
  return val ? Number(val) : 0;
}

export function setUserGamePlays(userId: string, gameId: string, count: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getUserStorageKey(`plays_${gameId}`, userId), count.toString());
}

export function getUserTotalPoints(userId: string): number {
  if (typeof window === 'undefined') return 0;
  const val = localStorage.getItem(getUserStorageKey('total_points', userId));
  return val ? Number(val) : 0;
}

export function setUserTotalPoints(userId: string, points: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getUserStorageKey('total_points', userId), points.toString());
}

export function getUserStreak(userId: string): { days: number; lastDate: string | null } {
  if (typeof window === 'undefined') return { days: 0, lastDate: null };
  const days = Number(localStorage.getItem(getUserStorageKey('streak_days', userId)) || 0);
  const lastDate = localStorage.getItem(getUserStorageKey('last_streak_date', userId));
  return { days, lastDate };
}

export function setUserStreak(userId: string, days: number, lastDate: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getUserStorageKey('streak_days', userId), days.toString());
  localStorage.setItem(getUserStorageKey('last_streak_date', userId), lastDate);
}

export function getUserDailyResult<T = any>(userId: string, dateStr: string): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(getUserStorageKey(`daily_${dateStr}`, userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUserDailyResult<T = any>(userId: string, dateStr: string, result: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getUserStorageKey(`daily_${dateStr}`, userId), JSON.stringify(result));
}

export function getUserFriends(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(getUserStorageKey('friends', userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setUserFriends(userId: string, friends: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getUserStorageKey('friends', userId), JSON.stringify(friends));
}

/**
 * Removes legacy un-namespaced keys from localStorage to prevent cross-account pollution.
 * Also cleans up stale non-namespaced keys on log out or login.
 */
export function purgeLegacyUnscopedStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // Match legacy un-prefixed keys that were shared globally
      if (
        key.startsWith('fg_pb_') ||
        key.startsWith('fg_plays_') ||
        key.startsWith('fg_daily_result_') ||
        key === 'fg_total_games' ||
        key === 'fg_total_points' ||
        key === 'fg_streak_days' ||
        key === 'fg_last_streak_date' ||
        key === 'fg_friends'
      ) {
        keysToRemove.push(key);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch (err) {
    console.warn('Storage purge notice:', err);
  }
}
