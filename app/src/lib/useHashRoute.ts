import { useEffect, useState } from 'react';

/**
 * Minimal hash routing ("#primitives"), enough for an internal preview page.
 * Hash routes need no server rewrite rules under the /app/ base path.
 * Swap for a real router once the product has more than a couple of views.
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
