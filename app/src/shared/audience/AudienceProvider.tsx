import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Who the app is speaking to. Clinician mode is the full flow and the default.
 * Family mode prepares notes for a clinician and never shows disease names,
 * candidate lists, rankings, overlap labels, genes or trial titles.
 * The mode is never inferred: ?audience= first (and remembered), then the
 * stored choice, then clinician.
 */
export const AUDIENCES = ['clinician', 'family'] as const;
export type Audience = (typeof AUDIENCES)[number];
export const DEFAULT_AUDIENCE: Audience = 'clinician';
export const AUDIENCE_STORAGE_KEY = 'rdd.audience.v1';
const PARAM = 'audience';

export function parseAudience(value: string | null | undefined): Audience | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return (AUDIENCES as readonly string[]).includes(v) ? (v as Audience) : null;
}

function readStored(): Audience | null {
  try {
    return parseAudience(window.localStorage.getItem(AUDIENCE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function store(audience: Audience): void {
  try {
    window.localStorage.setItem(AUDIENCE_STORAGE_KEY, audience);
  } catch {
    // Storage can be full or blocked; the choice then lasts for this page only.
  }
}

function initialAudience(): Audience {
  if (typeof window === 'undefined') return DEFAULT_AUDIENCE;
  let fromUrl: Audience | null = null;
  try {
    fromUrl = parseAudience(new URLSearchParams(window.location.search).get(PARAM));
  } catch {
    fromUrl = null;
  }
  if (fromUrl) {
    store(fromUrl);
    return fromUrl;
  }
  return readStored() ?? DEFAULT_AUDIENCE;
}

/** Keeps an existing ?audience= in step with the choice, so a reload does not undo it. */
function syncUrl(audience: Audience): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(PARAM)) return;
    url.searchParams.set(PARAM, audience);
    window.history.replaceState(window.history.state, '', url);
  } catch {
    // Leave the URL as it is.
  }
}

interface AudienceContextValue {
  audience: Audience;
  isFamily: boolean;
  setAudience: (audience: Audience) => void;
}

const AudienceContext = createContext<AudienceContextValue>({
  audience: DEFAULT_AUDIENCE,
  isFamily: false,
  setAudience: () => {},
});

export function AudienceProvider({ children }: { children: ReactNode }) {
  const [audience, setState] = useState<Audience>(initialAudience);

  useLayoutEffect(() => {
    document.documentElement.dataset.audience = audience;
  }, [audience]);

  const setAudience = useCallback((next: Audience) => {
    store(next);
    syncUrl(next);
    setState(next);
  }, []);

  const value = useMemo(() => ({ audience, isFamily: audience === 'family', setAudience }), [audience, setAudience]);
  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>;
}

export function useAudience(): AudienceContextValue {
  return useContext(AudienceContext);
}
