import type { Locale } from './i18n/locales.ts';

/**
 * CJK faces (Noto Sans SC / JP / KR) load on demand (T35): their @font-face sheets are large
 * (hundreds of unicode-range slices), so only the language in use pulls its
 * own sheet in. Geist is imported in main.tsx.
 */
const LOADERS: Partial<Record<Locale, () => Promise<unknown>>> = {
  zh: () => Promise.all([import('@fontsource/noto-sans-sc/400.css'), import('@fontsource/noto-sans-sc/500.css')]),
  ja: () => Promise.all([import('@fontsource/noto-sans-jp/400.css'), import('@fontsource/noto-sans-jp/500.css')]),
  ko: () => Promise.all([import('@fontsource/noto-sans-kr/400.css'), import('@fontsource/noto-sans-kr/500.css')]),
};

const loaded = new Set<Locale>();

export function loadDisplayFont(locale: Locale): void {
  const load = LOADERS[locale];
  if (!load || loaded.has(locale)) return;
  loaded.add(locale);
  void load().catch(() => loaded.delete(locale));
}
