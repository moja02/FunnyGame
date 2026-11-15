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
  signOut: () => Promise<void>;
  updateProfile: (nickname: string, avatar: string) => Promise<boolean>;
}

const DEFAULT_GUEST_PROFILE: PlayerProfile = {
  id: 'guest',
  nickname: 'بطل التحدي',
  avatar: '⚡',
  isGuest: true,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: DEFAULT_GUEST_PROFILE,
  isLoading: true,
  signInWithGoogle: async () => ({ error: null }),
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

    setProfile({
      id: guestId,
      nickname: guestNick,
      avatar: guestAv,
      isGuest: true,
    });

    // 2. Check for active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUserAuthenticated(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // 3. Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        handleUserAuthenticated(session.user);
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
        const metaNick = authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'بطل التحدي';
        const newProfile: PlayerProfile = {
          id: authUser.id,
          nickname: metaNick.split(' ')[0] || 'بطل التحدي',
          avatar: '👑',
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
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname.startsWith('/FunnyGame') ? '/FunnyGame' : ''}/profile`
          : undefined;

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

  const signOut = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
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
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
