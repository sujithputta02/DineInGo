import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApi } from '../utils/adminApi';

interface FeatureFlagConfig {
  enabled: boolean;
  showIfDisabled: boolean;
  mode: 'development' | 'testing' | 'maintenance' | 'coming_soon';
  caption: string;
  sticker: string;
}

interface FeatureFlags {
  arMenus: FeatureFlagConfig;
  preOrders: FeatureFlagConfig;
  events: FeatureFlagConfig;
  waitlist: FeatureFlagConfig;
}

interface FeatureFlagContextType {
  flags: FeatureFlags;
  loading: boolean;
  refreshFlags: () => Promise<void>;
  isEnabled: (feature: keyof FeatureFlags) => boolean;
  shouldShow: (feature: keyof FeatureFlags) => boolean;
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
  const defaultFlag: FeatureFlagConfig = {
    enabled: true,
    showIfDisabled: true,
    mode: 'development',
    caption: 'Under development, stay tuned for more updates!',
    sticker: 'dino_dev'
  };

  const [flags, setFlags] = useState<FeatureFlags>({
    arMenus: { ...defaultFlag },
    preOrders: { ...defaultFlag },
    events: { ...defaultFlag },
    waitlist: { ...defaultFlag },
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
    return flags[feature]?.enabled !== false;
  }

  function shouldShow(feature: keyof FeatureFlags) {
    const flag = flags[feature];
    if (!flag) return false;
    return flag.enabled || flag.showIfDisabled;
  }

  const value = {
    flags,
    loading,
    refreshFlags: fetchFlags,
    isEnabled,
    shouldShow,
  };

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}
