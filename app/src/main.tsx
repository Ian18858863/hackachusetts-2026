import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts (OFL-1.1, font-display: swap; T35 v2 type system, docs/ART_DIRECTION.md "v2").
// Display serif for headings and numbers, one weight (500), in every language:
// Noto Serif for Latin here; Noto Serif SC / JP / KR load on demand for zh / ja / ko
// (shared/fonts.ts), as unicode-range slices, so a page fetches only the slices it shows.
import '@fontsource/noto-serif/500.css';
// UI and body: Inter 400 and 600 only.
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
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
