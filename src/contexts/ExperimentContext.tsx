import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { API_CONFIG } from '../config/api';
import posthog from 'posthog-js';
import mixpanel from 'mixpanel-browser';
import ReactGA from 'react-ga4';

export type ExperimentVariant = 'control' | 'variant_b';

interface ExperimentConfig {
  experimentId: string;
  name: string;
  funnelStage: string;
  variants: Array<{ key: string; name: string; trafficAllocation: number }>;
}

interface ExperimentContextType {
  anonymousId: string;
  getVariant: (experimentId: string) => ExperimentVariant;
  trackExposure: (experimentId: string) => void;
  trackConversion: (experimentId: string, metricName?: string, value?: number) => void;
  setVariantOverride: (experimentId: string, variant: ExperimentVariant | null) => void;
  getVariantOverride: (experimentId: string) => ExperimentVariant | null;
}

const ExperimentContext = createContext<ExperimentContextType | null>(null);

/**
 * Deterministic string hash function returning 0..99
 */
function hashToBucket(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 100;
}

export const ExperimentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Maintain stable anonymous ID
  const [anonymousId] = useState<string>(() => {
    let id = localStorage.getItem('dineingo_ab_anon_id');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem('dineingo_ab_anon_id', id);
    }
    return id;
  });

  // Track exposures sent in current session to avoid duplicate pings
  const exposedExperiments = useMemo(() => new Set<string>(), []);

  // Check URL query parameters for dev/testing overrides (e.g. ?ab_exp_mobile_sticky_cta=variant_b)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.forEach((val, key) => {
        if (key.startsWith('ab_') && (val === 'control' || val === 'variant_b')) {
          const expId = key.substring(3);
          localStorage.setItem(`ab_override_${expId}`, val);
          console.log(`[A/B Testing] Override set via URL query: ${expId} = ${val}`);
        }
      });
    }
  }, []);

  const getVariantOverride = useCallback((experimentId: string): ExperimentVariant | null => {
    const override = localStorage.getItem(`ab_override_${experimentId}`);
    if (override === 'control' || override === 'variant_b') {
      return override as ExperimentVariant;
    }
    return null;
  }, []);

  const setVariantOverride = useCallback((experimentId: string, variant: ExperimentVariant | null) => {
    if (variant) {
      localStorage.setItem(`ab_override_${experimentId}`, variant);
    } else {
      localStorage.removeItem(`ab_override_${experimentId}`);
    }
    // Dispatch custom event to notify components of override change
    window.dispatchEvent(new CustomEvent('ab_override_changed', { detail: { experimentId, variant } }));
  }, []);

  /**
   * Determine variant deterministically
   */
  const getVariant = useCallback((experimentId: string): ExperimentVariant => {
    // 1. Check local override
    const override = getVariantOverride(experimentId);
    if (override) return override;

    // 2. Check PostHog feature flag if available
    try {
      const phFlag = posthog.getFeatureFlag(experimentId);
      if (phFlag === 'variant_b' || phFlag === 'test' || phFlag === 'variant') {
        return 'variant_b';
      }
      if (phFlag === 'control') {
        return 'control';
      }
    } catch {
      // fallback to internal deterministic bucket
    }

    // 3. Deterministic 50/50 hashing
    const bucket = hashToBucket(`${anonymousId}:${experimentId}`);
    return bucket < 50 ? 'control' : 'variant_b';
  }, [anonymousId, getVariantOverride]);

  /**
   * Track exposure to an experiment variant
   */
  const trackExposure = useCallback((experimentId: string) => {
    const variant = getVariant(experimentId);
    const exposureKey = `${experimentId}:${variant}`;

    if (exposedExperiments.has(exposureKey)) {
      return; // Already recorded in this session
    }
    exposedExperiments.add(exposureKey);

    console.log(`[A/B Testing] Exposure: ${experimentId} -> ${variant}`);

    // 1. Telemetry: PostHog
    posthog.capture('$feature_flag_called', {
      $feature_flag: experimentId,
      $feature_flag_response: variant,
      anonymousId
    });

    // 2. Telemetry: Mixpanel
    mixpanel.track('Experiment Exposure', {
      experimentId,
      variant,
      anonymousId
    });

    // 3. Telemetry: Google Analytics 4
    ReactGA.event({
      category: 'A/B Testing',
      action: 'Exposure',
      label: `${experimentId}:${variant}`
    });

    // 4. Ground-truth API
    fetch(`${API_CONFIG.BASE_URL}/api/v1/experiments/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experimentId,
        variantKey: variant,
        eventType: 'exposure'
      })
    }).catch(err => console.debug('A/B exposure tracking failed (offline/sandbox):', err));
  }, [anonymousId, exposedExperiments, getVariant]);

  /**
   * Track conversion on an experiment
   */
  const trackConversion = useCallback((experimentId: string, metricName?: string, value?: number) => {
    const variant = getVariant(experimentId);

    console.log(`[A/B Testing] Conversion recorded: ${experimentId} -> ${variant} (Metric: ${metricName || 'default'})`);

    // 1. Telemetry: PostHog
    posthog.capture('Experiment Conversion', {
      experimentId,
      variant,
      metricName: metricName || 'primary_conversion',
      value: value || 1,
      anonymousId
    });

    // 2. Telemetry: Mixpanel
    mixpanel.track('Experiment Conversion', {
      experimentId,
      variant,
      metricName: metricName || 'primary_conversion',
      value: value || 1,
      anonymousId
    });

    // 3. Telemetry: Google Analytics 4
    ReactGA.event({
      category: 'A/B Testing',
      action: 'Conversion',
      label: `${experimentId}:${variant}:${metricName || 'primary'}`
    });

    // 4. Ground-truth API
    fetch(`${API_CONFIG.BASE_URL}/api/v1/experiments/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experimentId,
        variantKey: variant,
        eventType: 'conversion'
      })
    }).catch(err => console.debug('A/B conversion tracking failed (offline/sandbox):', err));
  }, [anonymousId, getVariant]);

  return (
    <ExperimentContext.Provider
      value={{
        anonymousId,
        getVariant,
        trackExposure,
        trackConversion,
        setVariantOverride,
        getVariantOverride
      }}
    >
      {children}
    </ExperimentContext.Provider>
  );
};

/**
 * Convenient React Hook to consume an experiment
 */
export function useExperiment(experimentId: string) {
  const context = useContext(ExperimentContext);
  const [overrideState, setOverrideState] = useState<ExperimentVariant | null>(() => {
    return context ? context.getVariantOverride(experimentId) : null;
  });

  useEffect(() => {
    const handleOverrideChange = (e: any) => {
      if (e.detail?.experimentId === experimentId) {
        setOverrideState(e.detail.variant);
      }
    };
    window.addEventListener('ab_override_changed', handleOverrideChange);
    return () => window.removeEventListener('ab_override_changed', handleOverrideChange);
  }, [experimentId]);

  if (!context) {
    // Graceful fallback if outside Provider
    return {
      variant: 'control' as ExperimentVariant,
      isVariantB: false,
      trackExposure: () => {},
      trackConversion: () => {},
      setVariantOverride: () => {}
    };
  }

  const variant = overrideState || context.getVariant(experimentId);
  const isVariantB = variant === 'variant_b';

  return {
    variant,
    isVariantB,
    trackExposure: () => context.trackExposure(experimentId),
    trackConversion: (metricName?: string, value?: number) => context.trackConversion(experimentId, metricName, value),
    setVariantOverride: (v: ExperimentVariant | null) => context.setVariantOverride(experimentId, v)
  };
}
