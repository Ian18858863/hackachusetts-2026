import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts (OFL-1.1, font-display: swap), the same packages and files as app/src/main.tsx.
// Newsreader: display face, variable with optical size and weight axes (400 and 500 used).
import '@fontsource-variable/newsreader/opsz.css';
// Source Sans 3: UI and body, weights 400 and 600 only.
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import './styles.css';
import { App } from './App';
import { I18nProvider } from './i18n';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
