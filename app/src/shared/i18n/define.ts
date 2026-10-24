import type { Locale } from './locales.ts';

/** Every locale's dictionary for one message area, keyed like the English one. */
export type Messages<K extends string> = Readonly<Record<Locale, Readonly<Record<K, string>>>>;

/**
 * Declares one message area. `en` is the source of truth; each other locale
 * must have exactly the same keys, so a missing or extra key is a compile error.
 * English strings must stay byte-identical to the UI text they replace.
 */
export function defineMessages<const E extends Record<string, string>>(
  en: E,
  others: Record<Exclude<Locale, 'en'>, { [K in keyof E]: string }>,
): Messages<Extract<keyof E, string>> {
  return { en, ...others } as Messages<Extract<keyof E, string>>;
}

/** The key union of one message area, e.g. `MessageKey<typeof common>`. */
export type MessageKey<M> = M extends Messages<infer K> ? K : never;

export type FormatVars = Record<string, string | number>;

/** Replaces `{name}` placeholders. Unknown placeholders are left as they are. */
export function format(template: string, vars?: FormatVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}
