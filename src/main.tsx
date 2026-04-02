import { suppressProductionLogs } from './utils/consoleGuard';
suppressProductionLogs(); // Must be first — silences console in production

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { clearAuthSession } from './firebase';

// Global error listener to catch Firebase Auth session corruption (400 errors)
window.addEventListener('error', (event) => {
  if (event.message?.includes('identitytoolkit') && event.message?.includes('400')) {
    console.warn('[DineInGo] Detected Firebase session corruption, clearing storage...');
    clearAuthSession();
  }
}, true); // Use capture phase to catch resource errors

import { PostHogProvider } from '@posthog/react';
import { HelmetProvider } from 'react-helmet-async';

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
