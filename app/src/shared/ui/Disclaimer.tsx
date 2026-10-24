import { Icon } from '../../components/ui';
import { DISCLAIMER } from '../text';
import styles from './Disclaimer.module.css';

/**
 * The safety line from contract section 13, verbatim, in body size.
 * Shown near every result (ranking, questions, trials) and in the brief.
 * Calm and permanent: not a banner, not dismissible, not fine print.
 */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={[styles.disclaimer, className].filter(Boolean).join(' ')}>
      <span className={styles.icon}>
        <Icon name="info" size={18} />
      </span>
      <span>{DISCLAIMER}</span>
    </p>
  );
}
