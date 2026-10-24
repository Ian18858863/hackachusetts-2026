/** i18n for the app. Import from "../../shared/i18n" (messages from "../../shared/i18n/messages/<area>"). */
export { defineMessages, format, type FormatVars, type MessageKey, type Messages } from './define.ts';
export { I18nProvider, useLocale, useT } from './I18nProvider.tsx';
export { DEFAULT_LOCALE, LOCALES, LOCALE_META, parseLocale, type Locale } from './locales.ts';
