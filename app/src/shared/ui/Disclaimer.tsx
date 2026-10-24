import { useT } from '../i18n';
import common from '../i18n/messages/common';
import styles from './Disclaimer.module.css';

// "Decision support, not a diagnosis." leads in semibold, as in the specimen.
// In English the two parts are the verbatim contract string (DISCLAIMER in ../text);
// other languages use the faithful translations in i18n/messages/common.ts.

/**
 * The safety line from contract section 13 (verbatim in English), in body size.
 * Shown near every result (ranking, questions, trials) and in the brief.
 * Calm and permanent: not a banner, not dismissible, not fine print.
 * `inline` renders a span to open a lead paragraph (the step header does this).
 */
export function Disclaimer({ className, inline = false }: { className?: string; inline?: boolean }) {
  const t = useT(common);
  const content = (
    <>
      <strong className={styles.lead}>{t('disclaimerLead')}</strong>
      {t('disclaimerRest')}
    </>
  );
  if (inline) return <span className={className}>{content}</span>;
  return <p className={[styles.disclaimer, className].filter(Boolean).join(' ')}>{content}</p>;
}
