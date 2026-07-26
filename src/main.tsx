import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { suppressProductionLogs } from './utils/consoleGuard';
suppressProductionLogs();
import App from './App';
import './index.css';
import { clearAuthSession } from './firebase';
import { loadGoogleMapsScript } from './utils/googleMapsLoader';
import { initializeVideoPreloader } from './utils/videoPreloader';

// Load Google Maps API dynamically (security: API key from env var, not exposed in HTML)
loadGoogleMapsScript().catch(err => {
  console.warn('[DineInGo] Google Maps initialization warning:', err);
});

// Initialize video preloader for faster video retrieval
initializeVideoPreloader();
console.log('[DineInGo] Video preloader initialized for theme-aware stickers');

// Global error listener to catch Firebase Auth session corruption (400 errors)
window.addEventListener('error', (event) => {
  if (event.message?.includes('identitytoolkit') && event.message?.includes('400')) {
    console.warn('[DineInGo] Detected Firebase session corruption, clearing storage...');
    clearAuthSession();
  }
}, true); // Use capture phase to catch resource errors

import { PostHogProvider } from '@posthog/react';
import { HelmetProvider } from 'react-helmet-async';
import * as amplitude from '@amplitude/unified';
import ReactGA from 'react-ga4';
import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel
if (typeof window !== 'undefined') {
  mixpanel.init("1b02561abd137a1e4d6d44a3e3f50657", {
    debug: true,
    track_pageview: true,
    persistence: "localStorage",
    autocapture: true,
    // @ts-ignore
    record_sessions: true,
  });
}

// Initialize Amplitude Analytics & Session Replay
if (typeof window !== 'undefined') {
  amplitude.initAll('57e82f94c4aee277dbc5b94ca3c3c36b', {
    "analytics": {
      "autocapture": true
    },
    "sessionReplay": {
      "sampleRate": 1
    }
  });

  // Initialize Google Analytics (GA4)
  ReactGA.initialize('G-234CB1C58K');
  // Initial pageview tracking
  ReactGA.send({ hitType: "pageview", page: window.location.pathname });
}

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <PostHogProvider
        apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN}
        options={options}
      >
        <App />
      </PostHogProvider>
    </HelmetProvider>
  </StrictMode>
);
