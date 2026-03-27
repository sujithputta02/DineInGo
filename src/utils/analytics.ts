import posthog from 'posthog-js';

/**
 * Initialize PostHog for non-React code or utility functions
 */
export const initAnalytics = () => {
  if (typeof window !== 'undefined') {
    posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN, {
      api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
      person_profiles: 'always', // or 'identified_only'
    });
  }
};

/**
 * Track a custom event
 * @param eventName Name of the event
 * @param properties Additional properties to track
 */
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  posthog.capture(eventName, properties);
};

/**
 * Identify a user
 * @param userId Unique identifier for the user
 * @param userProperties Additional properties for the user
 */
export const identifyUser = (userId: string, userProperties?: Record<string, any>) => {
  posthog.identify(userId, userProperties);
};

/**
 * Reset the user identity (on logout)
 */
export const resetUser = () => {
  posthog.reset();
};

export default {
  trackEvent,
  identifyUser,
  resetUser,
};
