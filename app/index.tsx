import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { useSession } from "@/features/auth/session";

export default function RootIndex() {
  const { session, isLoading } = useSession();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    if (session) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(public)");
    }
  }, [isLoading, session]);

  return null;
}
