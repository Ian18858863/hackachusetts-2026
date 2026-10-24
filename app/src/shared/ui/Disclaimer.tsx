import { DISCLAIMER } from '../text';
import styles from './Disclaimer.module.css';

// "Decision support, not a diagnosis." leads in semibold, as in the specimen.
// The text stays the verbatim contract string; only its first sentence is weighted.
// If the marker is ever missing, the whole sentence renders unweighted.
const MARKER = DISCLAIMER.indexOf('. ');
const LEAD = MARKER >= 0 ? DISCLAIMER.slice(0, MARKER + 1) : '';
const REST = MARKER >= 0 ? DISCLAIMER.slice(MARKER + 1) : DISCLAIMER;

/**
 * The safety line from contract section 13, verbatim, in body size.
 * Shown near every result (ranking, questions, trials) and in the brief.
 * Calm and permanent: not a banner, not dismissible, not fine print.
 * `inline` renders a span to open a lead paragraph (the step header does this).
 */
export function Disclaimer({ className, inline = false }: { className?: string; inline?: boolean }) {
  const content = (
    <>
      {LEAD && <strong className={styles.lead}>{LEAD}</strong>}
      {REST}
    </>
  );
  if (inline) return <span className={className}>{content}</span>;
  return <p className={[styles.disclaimer, className].filter(Boolean).join(' ')}>{content}</p>;
}
