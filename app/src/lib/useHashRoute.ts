import { useEffect, useState } from 'react';

/**
 * Minimal hash routing ("#/features", "#primitives").
 * Hash routes need no server rewrite rules under the /app/ base path.
 * Returns the hash without "#" and without a leading "/".
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
