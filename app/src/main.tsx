import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts (OFL-1.1, font-display: swap), as set in docs/ART_DIRECTION.md.
// Newsreader: display face, variable with optical size and weight axes (400 and 500 used).
import '@fontsource-variable/newsreader/opsz.css';
// Source Sans 3: UI and body, weights 400 and 600 only.
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
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
