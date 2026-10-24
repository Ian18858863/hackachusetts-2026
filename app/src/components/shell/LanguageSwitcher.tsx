import { LOCALES, LOCALE_META, useLocale, useT } from '../../shared/i18n';
import common from '../../shared/i18n/messages/common';
import { Dropdown } from '../ui/Dropdown';

const OPTIONS = LOCALES.map((code) => ({
  value: code,
  label: LOCALE_META[code].nativeName,
  lang: LOCALE_META[code].htmlLang,
}));

/**
 * Language switcher at the right end of the top bar: an in-page dropdown
 * (button + listbox, T35). Options show each language's own name; the
 * translated "Language" label names the control for assistive tech.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT(common);
  return (
    <Dropdown
      className={className}
      value={locale}
      options={OPTIONS}
      onChange={setLocale}
      label={t('languageLabel')}
      testId="language-switcher"
    />
  );
}
