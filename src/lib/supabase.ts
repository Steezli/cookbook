import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL. Create a .env from .env.example."
  );
}

if (!anonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Create a .env from .env.example."
  );
}

const storage =
  Platform.OS === "web"
    ? {
        getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key: string, value: string) =>
          Promise.resolve(localStorage.setItem(key, value)),
        removeItem: (key: string) =>
          Promise.resolve(localStorage.removeItem(key))
      }
    : AsyncStorage;

// Simple in-memory lock set for serializing auth operations (token refresh, etc.)
const _activeLocks = new Set<string>();

export const supabase = createClient(url, anonKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // React Native has no Web Locks API (navigator.locks).
    // Provide a proper sequential lock to serialize auth operations and prevent
    // overlapping token refreshes that produce duplicate state change events.
    lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
      const key = `lock:${name}`;
      // Wait for any existing lock to release
      const start = Date.now();
      while (_activeLocks.has(key)) {
        if (Date.now() - start > acquireTimeout) {
          throw new Error(`Lock acquisition timed out: ${name}`);
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      _activeLocks.add(key);
      try {
        return await fn();
      } finally {
        _activeLocks.delete(key);
      }
    },
  }
});

