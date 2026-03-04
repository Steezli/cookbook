import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session ?? null);
        if (data.session?.user) {
          ensureProfile(data.session.user.id, data.session.user.email ?? '');
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        ensureProfile(nextSession.user.id, nextSession.user.email ?? '');
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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

