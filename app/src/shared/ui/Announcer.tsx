import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Announce = (message: string) => void;

const AnnouncerContext = createContext<Announce | null>(null);

/**
 * One polite live region for the whole app (Requirement 12.3). Use it for
 * results that arrive or change, e.g. "Ranking updated. 2 matches changed place".
 * Errors use ErrorState (role="alert") instead.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<number | undefined>(undefined);

  const announce = useCallback<Announce>((next) => {
    window.clearTimeout(timer.current);
    // Clear first so the same message is announced again when repeated.
    setMessage('');
    timer.current = window.setTimeout(() => setMessage(next), 60);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => announce, [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnounce(): Announce {
  const announce = useContext(AnnouncerContext);
  if (!announce) throw new Error('useAnnounce must be used inside <AnnouncerProvider>');
  return announce;
}
