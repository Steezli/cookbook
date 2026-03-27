import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useSession } from '@/features/auth/session';
import { getScanCount } from '@/features/subscriptions/scan-count';
import { ENTITLEMENT_ID, FREE_SCAN_LIMIT } from '@/features/subscriptions/constants';
import type { CustomerInfo } from 'react-native-purchases';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubscriptionContextValue = {
  isSubscriber: boolean;
  scanCount: number;
  scansRemaining: number;
  isLoading: boolean;
  restorePurchases: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Pure computation — exported for testing without a React renderer
// ---------------------------------------------------------------------------

type CustomerInfoLike = {
  entitlements?: {
    active?: Record<string, unknown>;
  };
} | null;

export function computeSubscriptionState(
  customerInfo: CustomerInfoLike,
  scanCount: number,
): { isSubscriber: boolean; scanCount: number; scansRemaining: number } {
  const isSubscriber = !!(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
  const scansRemaining = Math.max(0, FREE_SCAN_LIMIT - scanCount);
  return { isSubscriber, scanCount, scansRemaining };
}

// ---------------------------------------------------------------------------
// Default / fallback state
// ---------------------------------------------------------------------------

const DEFAULT_STATE = {
  isSubscriber: false,
  scanCount: 0,
  scansRemaining: 3,
  isLoading: false,
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();

  const [state, setState] = useState<Omit<SubscriptionContextValue, 'restorePurchases' | 'refreshSubscription'>>({
    ...DEFAULT_STATE,
    isLoading: Platform.OS !== 'web',
  });

  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const userId = session?.user?.id;
      if (!userId) {
        setState({ ...DEFAULT_STATE });
        return;
      }

      let cancelled = false;

      async function loadWebState() {
        try {
          const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY ?? '';
          const { initializeWebBilling, getWebCustomerInfo } = await import('@/features/subscriptions/web-billing');
          await initializeWebBilling(apiKey, userId!);
          if (cancelled) return;
          const [customerInfo, count] = await Promise.all([
            getWebCustomerInfo(),
            getScanCount(userId!),
          ]);
          if (cancelled) return;
          const computed = computeSubscriptionState(customerInfo, count);
          setState({ ...computed, isLoading: false });
        } catch (err) {
          if (!cancelled) {
            console.warn('[SubscriptionProvider] web SDK failed:', err instanceof Error ? err.message : String(err));
            setState({ ...DEFAULT_STATE });
          }
        }
      }

      setState(s => ({ ...s, isLoading: true }));
      loadWebState();
      return () => { cancelled = true; };
    }

    // Clean up any previous listener before starting a new load cycle.
    // This prevents accumulation when the effect re-runs mid-flight.
    if (listenerRef.current) {
      listenerRef.current();
      listenerRef.current = null;
    }

    const userId = session?.user?.id;
    if (!userId) {
      setState({ ...DEFAULT_STATE });
      return;
    }

    let cancelled = false;

    async function loadSubscriptionState() {
      try {
        // Dynamic import so the module is only loaded on native
        const mod = await import('react-native-purchases').catch(() => null);
        if (!mod || cancelled) {
          if (!cancelled) setState({ ...DEFAULT_STATE });
          return;
        }

        const Purchases = mod.default;

        const [customerInfo, count] = await Promise.all([
          Purchases.getCustomerInfo(),
          getScanCount(userId!),
        ]);

        if (cancelled) return;

        const computed = computeSubscriptionState(customerInfo, count);
        setState({ ...computed, isLoading: false });

        // Register listener for live entitlement updates
        const callback = async (_updatedInfo: CustomerInfoLike) => {
          try {
            const updatedCount = await getScanCount(userId!);
            const updated = computeSubscriptionState(_updatedInfo, updatedCount);
            setState({ ...updated, isLoading: false });
          } catch {
            // ignore listener errors
          }
        };

        Purchases.addCustomerInfoUpdateListener(callback as (info: CustomerInfo) => void);
        listenerRef.current = () => Purchases.removeCustomerInfoUpdateListener(callback as (info: CustomerInfo) => void);
      } catch (err) {
        if (!cancelled) {
          console.warn('[SubscriptionProvider] loadSubscriptionState failed:', err instanceof Error ? err.message : String(err));
          setState({ ...DEFAULT_STATE });
        }
      }
    }

    loadSubscriptionState();

    return () => {
      cancelled = true;
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
    };
  }, [session?.user?.id]);

  const restorePurchases = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'web') {
      const mod = await import('react-native-purchases');
      const Purchases = mod.default;
      const customerInfo = await Purchases.restorePurchases();
      const count = session?.user?.id ? await getScanCount(session.user.id) : 0;
      const computed = computeSubscriptionState(customerInfo, count);
      setState({ ...computed, isLoading: false });
    } else {
      const userId = session?.user?.id;
      const { getWebCustomerInfo } = await import('@/features/subscriptions/web-billing');
      const customerInfo = await getWebCustomerInfo();
      const count = userId ? await getScanCount(userId) : 0;
      const computed = computeSubscriptionState(customerInfo, count);
      setState({ ...computed, isLoading: false });
    }
  }, [session?.user?.id]);

  const refreshSubscription = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') {
      const userId = session?.user?.id;
      const { getWebCustomerInfo } = await import('@/features/subscriptions/web-billing');
      const customerInfo = await getWebCustomerInfo();
      const count = userId ? await getScanCount(userId) : 0;
      const computed = computeSubscriptionState(customerInfo, count);
      setState({ ...computed, isLoading: false });
    } else {
      const userId = session?.user?.id;
      const mod = await import('react-native-purchases').catch(() => null);
      if (!mod) return;
      const Purchases = mod.default;
      const [customerInfo, count] = await Promise.all([
        Purchases.getCustomerInfo(),
        userId ? getScanCount(userId) : Promise.resolve(0),
      ]);
      const computed = computeSubscriptionState(customerInfo, count);
      setState({ ...computed, isLoading: false });
    }
  }, [session?.user?.id]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({ ...state, restorePurchases, refreshSubscription }),
    [state, restorePurchases, refreshSubscription],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
