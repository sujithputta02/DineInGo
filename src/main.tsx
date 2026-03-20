import { suppressProductionLogs } from './utils/consoleGuard';
suppressProductionLogs(); // Must be first — silences console in production

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
