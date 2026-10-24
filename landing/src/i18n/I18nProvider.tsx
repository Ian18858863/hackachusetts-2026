// Copy of app/src/shared/i18n/I18nProvider.tsx (T28a): same initial-locale rules (?lang=, then rdd.lang.v1, then English).
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { format, type FormatVars, type Messages } from './define.ts';
import { DEFAULT_LOCALE, LOCALE_META, LOCALE_STORAGE_KEY, parseLocale, type Locale } from './locales.ts';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: DEFAULT_LOCALE, setLocale: () => {} });

function readStored(): Locale | null {
  try {
    return parseLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function store(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be full or blocked; the choice then lasts for this page only.
  }
}

/**
 * ?lang= first (and remembered), then the stored choice, then English.
 * navigator.language is deliberately not used: English stays the default.
 */
function initialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  let fromUrl: Locale | null = null;
  try {
    fromUrl = parseLocale(new URLSearchParams(window.location.search).get('lang'));
  } catch {
    fromUrl = null;
  }
  if (fromUrl) {
    store(fromUrl);
    return fromUrl;
  }
  return readStored() ?? DEFAULT_LOCALE;
}

function applyToDocument(locale: Locale): void {
  const root = document.documentElement;
  root.lang = LOCALE_META[locale].htmlLang;
  root.dataset.locale = locale;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Layout effect so the first paint already has the right <html lang> (fonts follow :lang()).
  useLayoutEffect(() => {
    applyToDocument(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    store(next);
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** `t(key, vars?)` for one message area, in the current locale (English if a key is ever missing). */
export function useT<K extends string>(messages: Messages<K>): (key: K, vars?: FormatVars) => string {
  const { locale } = useLocale();
  return useCallback(
    (key: K, vars?: FormatVars) => format(messages[locale][key] ?? messages.en[key], vars),
    [messages, locale],
  );
}
