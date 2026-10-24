import { Fragment, type ReactNode } from 'react';
import type { Locale } from '../../shared/i18n';

/**
 * Fills `{name}` placeholders with React nodes (a styled number, a link, a
 * <time>), so translated sentences keep their own word order. Unknown
 * placeholders stay as written.
 */
export function fillTemplate(template: string, slots: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    const node = name !== undefined && Object.prototype.hasOwnProperty.call(slots, name) ? slots[name] : part;
    return <Fragment key={i}>{node}</Fragment>;
  });
}

/** Intl locale for dates. English stays en-US so the English UI is unchanged. */
const INTL_LOCALES: Record<Locale, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  es: 'es-ES',
  ko: 'ko-KR',
  fr: 'fr-FR',
};

export function intlLocale(locale: Locale): string {
  return INTL_LOCALES[locale];
}
