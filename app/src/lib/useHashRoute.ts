import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * Minimal hash routing ("#/features", "#primitives").
 * Hash routes need no server rewrite rules under the /app/ base path.
 * Returns the hash without "#" and without a leading "/".
 *
 * Step changes dissolve through the View Transitions API (T35): the old view
 * blurs out, the new one comes into focus (styles in App.module.css). Without
 * support, or with prefers-reduced-motion: reduce, the route simply changes.
 */
export function useHashRoute(): string {
  const [route, setRoute] = useState(() => readRoute());

  useEffect(() => {
    const onChange = () => {
      const next = readRoute();
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (typeof doc.startViewTransition !== 'function' || reduce) {
        setRoute(next);
        return;
      }
      doc.startViewTransition(() => {
        flushSync(() => setRoute(next));
      });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

function readRoute(): string {
  return window.location.hash.replace(/^#\/?/, '');
}
