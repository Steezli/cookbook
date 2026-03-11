import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * Returns true when the identity (user id + access token) has actually changed.
 * Prevents re-renders from Supabase firing onAuthStateChange with a new object
 * reference but the same logical session (e.g. during token refresh with the
 * same access_token, or duplicate INITIAL_SESSION / SIGNED_IN events).
 */
function hasSessionChanged(prev: Session | null, next: Session | null): boolean {
  if (prev === next) return false;
  if (!prev && !next) return false;
  if (!prev || !next) return true; // one is null, the other isn't
  // Same user, same access token → no meaningful change
  return (
    prev.user.id !== next.user.id ||
    prev.access_token !== next.access_token
  );
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);
  const profileEnsuredRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Subscribe FIRST so we don't miss events that fire between getSession
    // and subscription setup (per Supabase docs recommendation).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      if (hasSessionChanged(sessionRef.current, nextSession ?? null)) {
        sessionRef.current = nextSession ?? null;
        setSession(nextSession ?? null);
        if (nextSession?.user) {
          safeEnsureProfile(nextSession.user.id, nextSession.user.email ?? '');
        }
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        const incoming = data.session ?? null;
        // Only update if onAuthStateChange hasn't already set it
        if (hasSessionChanged(sessionRef.current, incoming)) {
          sessionRef.current = incoming;
          setSession(incoming);
          if (incoming?.user) {
            safeEnsureProfile(incoming.user.id, incoming.user.email ?? '');
          }
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /**
   * Only call ensureProfile once per user id to avoid repeated upserts
   * that could trigger additional auth state events.
   */
  function safeEnsureProfile(userId: string, email: string) {
    if (profileEnsuredRef.current === userId) return;
    profileEnsuredRef.current = userId;
    ensureProfile(userId, email);
  }

  const value = useMemo(() => ({ session, isLoading }), [session, isLoading]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

async function ensureProfile(userId: string, email: string) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, email: email.toLowerCase() }, { onConflict: 'user_id' });
  if (error) console.warn('Profile ensure failed:', error.message);
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}

