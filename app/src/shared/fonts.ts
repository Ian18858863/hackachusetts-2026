import type { Locale } from './i18n';

/**
 * CJK display faces load on demand (T35): their @font-face sheets are large
 * (hundreds of unicode-range slices), so only the language in use pulls its
 * own sheet in. Latin Noto Serif and Inter are imported in main.tsx.
 */
const LOADERS: Partial<Record<Locale, () => Promise<unknown>>> = {
  zh: () => import('@fontsource/noto-serif-sc/500.css'),
  ja: () => import('@fontsource/noto-serif-jp/500.css'),
  ko: () => import('@fontsource/noto-serif-kr/500.css'),
};

const loaded = new Set<Locale>();

export function loadDisplayFont(locale: Locale): void {
  const load = LOADERS[locale];
  if (!load || loaded.has(locale)) return;
  loaded.add(locale);
  void load().catch(() => loaded.delete(locale));
}
