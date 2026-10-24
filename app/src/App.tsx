import { useEffect, useRef, type MouseEvent } from 'react';
import styles from './App.module.css';
import { BuildingState } from './components/shell/BuildingState';
import { Footer } from './components/shell/Footer';
import { PrimitivesPreview } from './components/shell/PrimitivesPreview';
import { TopBar } from './components/shell/TopBar';
import { useHashRoute } from './lib/useHashRoute';

export function App() {
  const route = useHashRoute();
  const mainRef = useRef<HTMLElement>(null);
  const previousRoute = useRef(route);

  // On view change, move focus to the main region so keyboard and screen
  // reader users start at the new content (not on first load).
  useEffect(() => {
    if (previousRoute.current === route) return;
    previousRoute.current = route;
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [route]);

  const isPreview = route === 'primitives';

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main" onClick={skipToMain}>
        Skip to content
      </a>
      <TopBar />
      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className={[styles.main, isPreview ? styles.top : styles.centered].join(' ')}
      >
        {/* Keyed so a view change dissolves in place. */}
        <div key={route} className={styles.view}>
          {isPreview ? <PrimitivesPreview /> : <BuildingState />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// The skip link must not change the hash, which drives routing.
function skipToMain(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  document.getElementById('main')?.focus();
}
