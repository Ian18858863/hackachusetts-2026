import styles from './StatusToggle.module.css';

import type { PresenceStatus } from './model';

export type { PresenceStatus };

/**
 * Present / Not present as a custom-styled radio pair. Native radios give
 * arrow-key movement and a real label for free. Each option also carries an
 * icon shape, so the state never depends on colour alone.
 */
export function StatusToggle({
  name,
  value,
  onChange,
  legend,
  idPrefix,
  size = 'md',
  testIds,
}: {
  name: string;
  value: PresenceStatus;
  onChange: (next: PresenceStatus) => void;
  /** Screen-reader legend, e.g. "Feature 13, never had a seizure". */
  legend: string;
  /** Radio ids become `${idPrefix}-observed` and `${idPrefix}-excluded`. */
  idPrefix: string;
  size?: 'sm' | 'md';
  /** data-testid for each radio, used by the scripted demo video. */
  testIds?: Partial<Record<PresenceStatus, string>>;
}) {
  const options: Array<{ value: PresenceStatus; label: string }> = [
    { value: 'observed', label: 'Present' },
    { value: 'excluded', label: 'Not present' },
  ];
  return (
    <fieldset className={styles.toggle} data-size={size}>
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={styles.option} data-value={option.value}>
          <input
            id={`${idPrefix}-${option.value}`}
            className={styles.input}
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            data-testid={testIds?.[option.value]}
          />
          <span className={styles.mark} aria-hidden="true" />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
