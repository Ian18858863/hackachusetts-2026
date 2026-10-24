// Copy of app/src/shared/i18n/locales.ts (T28a). Keep in step: same locales and the same storage key,
// so a language chosen on the landing page carries into the app.
/**
 * UI languages. English is the default and is never replaced by browser
 * detection: judges and the recorded demo video see English unless the user
 * picks another language or the URL has ?lang=.
 */

export const LOCALES = ['en', 'zh', 'ja', 'es', 'ko', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** `htmlLang` goes on <html lang>; `nativeName` is the switcher option text. */
export const LOCALE_META: Record<Locale, { htmlLang: string; nativeName: string }> = {
  en: { htmlLang: 'en', nativeName: 'English' },
  zh: { htmlLang: 'zh-Hans', nativeName: '简体中文' },
  ja: { htmlLang: 'ja', nativeName: '日本語' },
  es: { htmlLang: 'es', nativeName: 'Español' },
  ko: { htmlLang: 'ko', nativeName: '한국어' },
  fr: { htmlLang: 'fr', nativeName: 'Français' },
};

export const LOCALE_STORAGE_KEY = 'rdd.lang.v1';

/** Accepts the six locale codes plus zh-CN / zh-Hans (any case); otherwise null. */
export function parseLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'zh-cn' || v === 'zh-hans') return 'zh';
  return (LOCALES as readonly string[]).includes(v) ? (v as Locale) : null;
}
