import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts (OFL-1.1, font-display: swap; T35 v2, Ian's option A 18:46 ET).
// Geist for display, body and numbers, weights 400 / 500 / 600 only (no faux bold:
// font-synthesis is off). Noto Sans SC / JP / KR (400, 500) load on demand for
// zh / ja / ko as unicode-range slices (fonts.ts).
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
