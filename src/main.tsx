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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
