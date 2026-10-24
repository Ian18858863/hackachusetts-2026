import { useId, type ChangeEvent } from 'react';
import { LOCALES, LOCALE_META, parseLocale, useLocale, useT } from '../../shared/i18n';
import common from '../../shared/i18n/messages/common';
import styles from './LanguageSwitcher.module.css';

/**
 * Compact native <select> at the right end of the top bar. Options show each
 * language's own name; the label ("Language", translated) is for assistive tech.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT(common);
  const id = useId();

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = parseLocale(event.target.value);
    if (next) setLocale(next);
  }

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className="sr-only">
        {t('languageLabel')}
      </label>
      <select
        id={id}
        className={styles.select}
        value={locale}
        onChange={onChange}
        title={t('languageLabel')}
        data-testid="language-switcher"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} lang={LOCALE_META[code].htmlLang}>
            {LOCALE_META[code].nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
