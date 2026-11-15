'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './supabase-browser';

export interface PlayerProfile {
  id: string;
  nickname: string;
  avatar: string;
  email?: string;
  city?: string;
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
  updateProfile: (nickname: string, avatar: string) => Promise<boolean>;
}

const DEFAULT_GUEST_PROFILE: PlayerProfile = {
  id: 'guest',
  nickname: 'بطل التحدي',
  avatar: '⚡',
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
  updateProfile: async () => false,
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
    let guestNick = 'بطل التحدي';
    let guestAv = '⚡';

    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('fg_guest_id');
      if (storedId) guestId = storedId;
      else localStorage.setItem('fg_guest_id', guestId);

      const storedNick = localStorage.getItem('fg_guest_nickname');
      if (storedNick) guestNick = storedNick;

      const storedAv = localStorage.getItem('fg_guest_avatar');
      if (storedAv) guestAv = storedAv;
    }

    // Default state MUST be guest
    setProfile({
      id: guestId,
      nickname: guestNick,
      avatar: guestAv,
      isGuest: true,
    });

    // 2. Check for active Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && isRealCloudUser(session.user)) {
        await handleUserAuthenticated(session.user);
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
        await handleUserAuthenticated(session.user);
      } else {
        setUser(null);
        setProfile({
          id: guestId,
          nickname: guestNick,
          avatar: guestAv,
          isGuest: true,
        });
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUserAuthenticated = async (authUser: User) => {
    if (!isRealCloudUser(authUser)) return;

    setUser(authUser);
    const supabase = getSupabaseBrowserClient();

    try {
      // Fetch or create profile record in Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (data && !error) {
        setProfile({
          id: data.id,
          nickname: data.nickname || 'بطل التحدي',
          avatar: data.avatar || '⚡',
          email: authUser.email,
          city: data.city || undefined,
          isGuest: false,
        });
      } else {
        // Fallback to user metadata or create
        const metaNick =
          authUser.user_metadata?.nickname ||
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          'بطل التحدي';
        const metaAvatar = authUser.user_metadata?.avatar || '👑';

        const newProfile: PlayerProfile = {
          id: authUser.id,
          nickname: metaNick.split(' ')[0] || 'بطل التحدي',
          avatar: metaAvatar,
          email: authUser.email,
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
      setProfile({
        id: authUser.id,
        nickname: authUser.email?.split('@')[0] || 'بطل التحدي',
        avatar: '👑',
        email: authUser.email,
        isGuest: false,
      });
    } finally {
      setIsLoading(false);
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
    nickname?: string
  ): Promise<{ error: Error | null; needsEmailConfirmation?: boolean }> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const cleanNick = nickname?.trim() || profile.nickname || 'بطل التحدي';
      const cleanAvatar = profile.avatar || '⚡';

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nickname: cleanNick,
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

      // If Supabase has confirmed session already
      if (data.session && data.user) {
        await handleUserAuthenticated(data.user);
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
        (typeof window !== 'undefined' && localStorage.getItem('fg_guest_nickname')) || 'بطل التحدي';
      const guestAv =
        (typeof window !== 'undefined' && localStorage.getItem('fg_guest_avatar')) || '⚡';

      setProfile({
        id: guestId,
        nickname: guestNick,
        avatar: guestAv,
        isGuest: true,
      });
    }
  };

  const updateProfile = async (newNickname: string, newAvatar: string): Promise<boolean> => {
    const trimmed = newNickname.trim() || 'بطل التحدي';

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
      return true;
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
        console.error('Failed to update cloud profile:', error);
        return false;
      }

      setProfile((prev) => ({
        ...prev,
        nickname: trimmed,
        avatar: newAvatar,
      }));
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      return false;
    }
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
