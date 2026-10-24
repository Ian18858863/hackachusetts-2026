import { useAudience, type Audience } from '../../shared/audience';
import { useT } from '../../shared/i18n';
import audienceMessages from '../../shared/i18n/messages/audience';
import styles from './AudienceSwitch.module.css';

const OPTIONS: ReadonlyArray<{ value: Audience; key: 'optionClinician' | 'optionFamily' }> = [
  { value: 'clinician', key: 'optionClinician' },
  { value: 'family', key: 'optionFamily' },
];

/**
 * "For clinicians | For families": a small two-button segmented control next
 * to the language switcher. The pressed option is the current mode.
 */
export function AudienceSwitch({ className }: { className?: string }) {
  const { audience, setAudience } = useAudience();
  const t = useT(audienceMessages);
  return (
    <div
      role="group"
      aria-label={t('switchLabel')}
      className={[styles.group, className].filter(Boolean).join(' ')}
      data-testid="audience-switch"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={styles.option}
          aria-pressed={audience === o.value}
          onClick={() => setAudience(o.value)}
          data-testid={`audience-option-${o.value}`}
        >
          <span className={styles.label}>{t(o.key)}</span>
        </button>
      ))}
    </div>
  );
}
