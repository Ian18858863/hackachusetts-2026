import { useEffect, useState } from 'react';

/**
 * Minimal hash routing ("#/features", "#primitives").
 * Hash routes need no server rewrite rules under the /app/ base path.
 * Returns the hash without "#" and without a leading "/".
 *
 * Step changes come into focus with a CSS animation (App.module.css), not the
 * View Transitions API: while a view transition runs, Chrome targets every
 * pointer event at <html> (measured in T35: elementFromPoint returned HTML at
 * 0 and 300 ms), so a click right after a step change would be lost.
 */
export function useHashRoute(): string {
  const [route, setRoute] = useState(() => readRoute());

  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

function readRoute(): string {
  return window.location.hash.replace(/^#\/?/, '');
}
