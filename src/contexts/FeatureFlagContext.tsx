import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApi } from '../utils/adminApi';

interface FeatureFlags {
  arMenus: boolean;
  preOrders: boolean;
  events: boolean;
  waitlist: boolean;
}

interface FeatureFlagContextType {
  flags: FeatureFlags;
  loading: boolean;
  refreshFlags: () => Promise<void>;
  isEnabled: (feature: keyof FeatureFlags) => boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>({
    arMenus: true,
    preOrders: true,
    events: true,
    waitlist: true,
  });
  const [loading, setLoading] = useState(true);

  async function fetchFlags() {
    try {
      const response = await adminApi.getFeatureFlags();
      if (response && response.success) {
        setFlags(response.flags);
      }
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFlags();
  }, []);

  function isEnabled(feature: keyof FeatureFlags) {
    return flags[feature] !== false;
  }

  const value = {
    flags,
    loading,
    refreshFlags: fetchFlags,
    isEnabled,
  };

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}
