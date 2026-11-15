'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './supabase-browser';

export interface PlayerProfile {
  id: string;
  nickname: string;
  avatar: string;
  email?: string;
  cityId?: string;
  cityName?: string;
  cityUpdatedAt?: string;
  friends: string[];
  isGuest: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: PlayerProfile;
  isLoading: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
    nickname?: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (nickname: string, avatar: string) => Promise<{ success: boolean; error?: string }>;
  checkNicknameAvailable: (nickname: string, excludeId?: string) => Promise<{ available: boolean; error?: string }>;
  updateCity: (
    cityId: string,
    cityName: string
  ) => Promise<{ success: boolean; error?: string; daysRemaining?: number }>;
  addFriend: (friendId: string) => Promise<{ success: boolean; error?: string }>;
  removeFriend: (friendId: string) => Promise<boolean>;
}

/**
 * Generates an 8-character random alphanumeric suffix for guest names (e.g. guest-a8f3b29c).
 */
export function generateRandomGuestNickname(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `guest-${rand}`;
}

const DEFAULT_GUEST_PROFILE: PlayerProfile = {
  id: 'guest',
  nickname: 'guest-00000000',
  avatar: '⚡',
  friends: [],
  isGuest: true,
};

/**
 * Strict validator to ensure only true cloud accounts are considered authenticated.
 * Prevents anonymous sessions from ever leaking into registered status.
 */
export function isRealCloudUser(user: User | null): boolean {
  if (!user) return false;
  if (user.is_anonymous) return false;
  if (user.app_metadata?.provider === 'anonymous') return false;
  if (!user.email && (!user.identities || user.identities.length === 0)) return false;
  return true;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: DEFAULT_GUEST_PROFILE,
  isLoading: true,
  signInWithGoogle: async () => ({ error: null }),
  signInWithPassword: async () => ({ error: null }),
  signUpWithPassword: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => ({ success: false }),
  checkNicknameAvailable: async () => ({ available: true }),
  updateCity: async () => ({ success: false }),
  addFriend: async () => ({ success: false }),
  removeFriend: async () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_GUEST_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  // Load guest profile or real session on mount
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // 1. Initial guest defaults from localStorage
    let guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
    let guestNick = '';
    let guestAv = '⚡';
    let guestCityId: string | undefined = undefined;
    let guestCityName: string | undefined = undefined;
    let guestCityUpdatedAt: string | undefined = undefined;
    let storedFriends: string[] = [];

    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('fg_guest_id');
      if (storedId) guestId = storedId;
      else localStorage.setItem('fg_guest_id', guestId);

      const storedNick = localStorage.getItem('fg_guest_nickname');
      // If no nickname, or legacy "بطل التحدي", replace with unique guest-XXXXXXXX
      if (!storedNick || storedNick === 'بطل التحدي') {
        guestNick = generateRandomGuestNickname();
        localStorage.setItem('fg_guest_nickname', guestNick);
      } else {
        guestNick = storedNick;
      }

      const storedAv = localStorage.getItem('fg_guest_avatar');
      if (storedAv) guestAv = storedAv;

      guestCityId = localStorage.getItem('fg_guest_city_id') || undefined;
      guestCityName = localStorage.getItem('fg_guest_city_name') || undefined;
      guestCityUpdatedAt = localStorage.getItem('fg_guest_city_updated_at') || undefined;

      try {
        const rawFriends = localStorage.getItem('fg_friends');
        if (rawFriends) storedFriends = JSON.parse(rawFriends);
      } catch {
        storedFriends = [];
      }
    } else {
      guestNick = generateRandomGuestNickname();
    }

    // Default state MUST be guest
    setProfile({
      id: guestId,
      nickname: guestNick,
      avatar: guestAv,
      cityId: guestCityId,
      cityName: guestCityName,
      cityUpdatedAt: guestCityUpdatedAt,
      friends: storedFriends,
      isGuest: true,
    });

    // 2. Check for active Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && isRealCloudUser(session.user)) {
        await handleUserAuthenticated(session.user, guestNick);
      } else {
        // If an anonymous session exists from earlier runs, purge it immediately
        if (session?.user && !isRealCloudUser(session.user)) {
          try {
            await supabase.auth.signOut();
            if (typeof window !== 'undefined') {
              localStorage.removeItem('sb-wiulcvbvpifpxmuxdtus-auth-token');
            }
          } catch {
            // ignore
          }
        }
        setUser(null);
        setProfile({
          id: guestId,
          nickname: guestNick,
          avatar: guestAv,
          cityId: guestCityId,
          cityName: guestCityName,
          cityUpdatedAt: guestCityUpdatedAt,
          friends: storedFriends,
          isGuest: true,
        });
        setIsLoading(false);
      }
    });

    // 3. Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && isRealCloudUser(session.user)) {
        await handleUserAuthenticated(session.user, guestNick);
      } else {
        setUser(null);
        setProfile({
          id: guestId,
          nickname: guestNick,
          avatar: guestAv,
          cityId: guestCityId,
          cityName: guestCityName,
          cityUpdatedAt: guestCityUpdatedAt,
          friends: storedFriends,
          isGuest: true,
        });
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUserAuthenticated = async (authUser: User, localGuestNick?: string) => {
    if (!isRealCloudUser(authUser)) return;

    setUser(authUser);
    const supabase = getSupabaseBrowserClient();

    try {
      // Fetch profile record in Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (data && !error) {
        // If the nickname in DB is legacy "بطل التحدي", upgrade to guest-XXXXXXXX or preserve custom in-game name
        let activeNick = data.nickname;
        if (!activeNick || activeNick === 'بطل التحدي') {
          activeNick = localGuestNick && localGuestNick !== 'بطل التحدي'
            ? localGuestNick
            : generateRandomGuestNickname();
          await supabase.from('profiles').update({ nickname: activeNick }).eq('id', authUser.id);
        }

        // Friends
        let friendsArr: string[] = [];
        if (Array.isArray(data.friends)) {
          friendsArr = data.friends;
        } else if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('fg_friends');
          if (raw) {
            try { friendsArr = JSON.parse(raw); } catch { friendsArr = []; }
          }
        }

        setProfile({
          id: data.id,
          nickname: activeNick,
          avatar: data.avatar || '⚡',
          email: authUser.email,
          cityId: data.city_id || undefined,
          cityName: data.city_name || data.city || undefined,
          cityUpdatedAt: data.city_updated_at || undefined,
          friends: friendsArr,
          isGuest: false,
        });
      } else {
        // First-time sync: ALWAYS use the in-game chosen nickname, NEVER Google full_name
        const gameNickname =
          localGuestNick && localGuestNick !== 'بطل التحدي'
            ? localGuestNick
            : generateRandomGuestNickname();

        const newProfile: PlayerProfile = {
          id: authUser.id,
          nickname: gameNickname,
          avatar: '⚡',
          email: authUser.email,
          friends: [],
          isGuest: false,
        };

        await supabase.from('profiles').upsert({
          id: authUser.id,
          nickname: newProfile.nickname,
          avatar: newProfile.avatar,
        });

        setProfile(newProfile);
      }
    } catch (err) {
      console.warn('Profile sync notice:', err);
      setProfile((prev) => ({
        ...prev,
        id: authUser.id,
        email: authUser.email,
        isGuest: false,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check if a proposed nickname is unique and non-duplicate in Supabase
   */
  const checkNicknameAvailable = async (
    candidateNickname: string,
    excludeId?: string
  ): Promise<{ available: boolean; error?: string }> => {
    const trimmed = candidateNickname.trim();
    if (!trimmed) {
      return { available: false, error: 'الاسم لا يمكن أن يكون فارغاً' };
    }
    if (trimmed.length < 3) {
      return { available: false, error: 'الاسم يجب أن يتكون من 3 أحرف على الأقل' };
    }
    if (trimmed.length > 16) {
      return { available: false, error: 'الاسم يجب ألا يتجاوز 16 حرفاً' };
    }

    try {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from('profiles')
        .select('id, nickname')
        .ilike('nickname', trimmed);

      const targetId = excludeId || (profile.isGuest ? undefined : profile.id);
      if (targetId) {
        query = query.neq('id', targetId);
      }

      const { data, error } = await query.limit(1);
      if (!error && data && data.length > 0) {
        return {
          available: false,
          error: 'هذا الاسم مستخدم بالفعل من لاعب آخر، يرجى اختيار اسم مميز غير مكرر.',
        };
      }
      return { available: true };
    } catch {
      return { available: true };
    }
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const isGhPages = typeof window !== 'undefined' && window.location.pathname.startsWith('/FunnyGame');
      const redirectUrl = `${origin}${isGhPages ? '/FunnyGame' : ''}/profile/`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('تعذر بدء تسجيل الدخول');
      return { error };
    }
  };

  const signInWithPassword = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      if (data.user) {
        await handleUserAuthenticated(data.user);
      }
      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('تعذر تسجيل الدخول');
      return { error };
    }
  };

  const signUpWithPassword = async (
    email: string,
    password: string,
    chosenNickname?: string
  ): Promise<{ error: Error | null; needsEmailConfirmation?: boolean }> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const trimmedNick = chosenNickname?.trim() || profile.nickname || generateRandomGuestNickname();

      // Check uniqueness first
      const check = await checkNicknameAvailable(trimmedNick);
      if (!check.available) {
        return { error: new Error(check.error || 'هذا الاسم مستخدم بالفعل') };
      }

      const cleanAvatar = profile.avatar || '⚡';

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nickname: trimmedNick,
            avatar: cleanAvatar,
          },
        },
      });

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          return {
            error: new Error(
              'تم تجاوز حد إرسال الرسائل في خادم Supabase. يمكنك تسجيل الدخول بكلمة المرور مباشرة بعد مراجعة إعداد تأكيد البريد.'
            ),
          };
        }
        return { error: new Error(error.message) };
      }

      // If Supabase confirmed session immediately
      if (data.session && data.user) {
        await handleUserAuthenticated(data.user, trimmedNick);
        return { error: null, needsEmailConfirmation: false };
      }

      // If user needs email confirmation
      return { error: null, needsEmailConfirmation: true };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('تعذر إنشاء الحساب');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-wiulcvbvpifpxmuxdtus-auth-token');
      }
    } catch (err) {
      console.warn('Sign out notice:', err);
    } finally {
      setUser(null);
      const guestId =
        (typeof window !== 'undefined' && localStorage.getItem('fg_guest_id')) ||
        'guest_' + Math.random().toString(36).substring(2, 9);
      const guestNick =
        (typeof window !== 'undefined' && localStorage.getItem('fg_guest_nickname')) ||
        generateRandomGuestNickname();
      const guestAv =
        (typeof window !== 'undefined' && localStorage.getItem('fg_guest_avatar')) || '⚡';

      setProfile({
        id: guestId,
        nickname: guestNick,
        avatar: guestAv,
        friends: [],
        isGuest: true,
      });
    }
  };

  const updateProfile = async (
    newNickname: string,
    newAvatar: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmed = newNickname.trim();
    if (!trimmed) {
      return { success: false, error: 'الاسم لا يمكن أن يكون فارغاً' };
    }
    if (trimmed.length < 3) {
      return { success: false, error: 'الاسم يجب أن يتكون من 3 أحرف على الأقل' };
    }
    if (trimmed.length > 16) {
      return { success: false, error: 'الاسم يجب ألا يتجاوز 16 حرفاً' };
    }

    // Check uniqueness if changing to a new nickname
    if (trimmed.toLowerCase() !== profile.nickname.toLowerCase()) {
      const check = await checkNicknameAvailable(trimmed, profile.isGuest ? undefined : profile.id);
      if (!check.available) {
        return { success: false, error: check.error };
      }
    }

    if (profile.isGuest) {
      // Save locally
      if (typeof window !== 'undefined') {
        localStorage.setItem('fg_guest_nickname', trimmed);
        localStorage.setItem('fg_guest_avatar', newAvatar);
      }
      setProfile((prev) => ({
        ...prev,
        nickname: trimmed,
        avatar: newAvatar,
      }));
      return { success: true };
    }

    // Save to Supabase for registered user
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: trimmed,
          avatar: newAvatar,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) {
        return { success: false, error: 'تعذر تحديث الاسم: ' + error.message };
      }

      setProfile((prev) => ({
        ...prev,
        nickname: trimmed,
        avatar: newAvatar,
      }));
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'تعذر تحديث الملف الشخصي',
      };
    }
  };

  /**
   * Enforces 30-day anti-hopping rule when updating player's city
   */
  const updateCity = async (
    cityId: string,
    cityName: string
  ): Promise<{ success: boolean; error?: string; daysRemaining?: number }> => {
    if (profile.cityUpdatedAt) {
      const lastUpdate = new Date(profile.cityUpdatedAt).getTime();
      const now = Date.now();
      const diffDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);
      if (diffDays < 30) {
        const daysRemaining = Math.max(1, Math.ceil(30 - diffDays));
        return {
          success: false,
          daysRemaining,
          error: `ما تقدرش تغيّر مدينتك إلا مرة في الشهر يا غالي.. خليك وفي لمدينتك 😉 (باقي ${daysRemaining} يوم)`,
        };
      }
    }

    const nowIso = new Date().toISOString();

    if (profile.isGuest) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fg_guest_city_id', cityId);
        localStorage.setItem('fg_guest_city_name', cityName);
        localStorage.setItem('fg_guest_city_updated_at', nowIso);
      }
      setProfile((prev) => ({
        ...prev,
        cityId,
        cityName,
        cityUpdatedAt: nowIso,
      }));
      return { success: true };
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          city_id: cityId,
          city_name: cityName,
          city: cityName, // backward-compat with old column
          city_updated_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', profile.id);

      if (error) {
        console.warn('City update notice:', error);
      }

      setProfile((prev) => ({
        ...prev,
        cityId,
        cityName,
        cityUpdatedAt: nowIso,
      }));
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'تعذر تحديث المدينة',
      };
    }
  };

  const addFriend = async (friendId: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = friendId.trim().replace(/^#/, '');
    if (!cleanId) return { success: false, error: 'يرجى كتابة معرّف الصديق' };
    if (cleanId === profile.id) return { success: false, error: 'لا يمكنك إضافة معرّف حسابك كصديق!' };

    const currentFriends = profile.friends || [];
    if (currentFriends.includes(cleanId)) {
      return { success: false, error: 'هذا الصديق مضاف مسبقاً في قائمتك!' };
    }

    const updated = [...currentFriends, cleanId];

    if (typeof window !== 'undefined') {
      localStorage.setItem('fg_friends', JSON.stringify(updated));
    }

    setProfile((prev) => ({ ...prev, friends: updated }));

    if (!profile.isGuest) {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase
          .from('profiles')
          .update({
            friends: updated,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);
      } catch (err) {
        console.warn('Friends sync notice:', err);
      }
    }

    return { success: true };
  };

  const removeFriend = async (friendId: string): Promise<boolean> => {
    const currentFriends = profile.friends || [];
    const updated = currentFriends.filter((id) => id !== friendId);

    if (typeof window !== 'undefined') {
      localStorage.setItem('fg_friends', JSON.stringify(updated));
    }

    setProfile((prev) => ({ ...prev, friends: updated }));

    if (!profile.isGuest) {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase
          .from('profiles')
          .update({
            friends: updated,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);
      } catch (err) {
        console.warn('Friends remove notice:', err);
      }
    }

    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        signInWithGoogle,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        updateProfile,
        checkNicknameAvailable,
        updateCity,
        addFriend,
        removeFriend,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
