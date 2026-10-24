import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from './Dropdown.module.css';

export interface DropdownOption<V extends string> {
  value: V;
  label: ReactNode;
  lang?: string;
}

interface DropdownProps<V extends string> {
  value: V;
  options: readonly DropdownOption<V>[];
  onChange: (value: V) => void;
  /** Accessible name of the control (e.g. "Language"). */
  label: string;
  className?: string;
  /** data-testid of the trigger button. */
  testId?: string;
  align?: 'start' | 'end';
  /** 44px tap height with a 32px drawn outline, for the app's compact utility row. */
  compact?: boolean;
}

/**
 * In-page dropdown (T35; replaces the native <select>, design lessons rule 12):
 * a button with aria-haspopup="listbox" and a listbox that opens below it (above
 * only when there is no room). Keys: ↑ ↓ Home End move, Enter / Space choose,
 * Esc and Tab close; focus returns to the button. The active option is exposed
 * through aria-activedescendant. The list has a fixed size, so opening it never
 * moves the page.
 */
export function Dropdown<V extends string>({
  value,
  options,
  onChange,
  label,
  className,
  testId,
  align = 'end',
  compact = false,
}: DropdownProps<V>) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const [flip, setFlip] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0]!;

  const openList = (index = options.findIndex((o) => o.value === value)) => {
    setActive(Math.max(0, index));
    setOpen(true);
  };
  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    close();
  };

  // Flip up only when the list does not fit below the button.
  useLayoutEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    const list = listRef.current;
    if (!button || !list) return;
    const rect = button.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    setFlip(below < list.offsetHeight + 12 && rect.top > below);
    list.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const onButtonKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openList();
    }
  };

  const onListKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(active);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${typeof current.label === 'string' ? current.label : current.value}`}
        title={label}
        data-testid={testId}
        data-open={open || undefined}
        data-compact={compact || undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKey}
      >
        <span className={styles.value} lang={current.lang}>
          {current.label}
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        tabIndex={-1}
        aria-label={label}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        className={styles.list}
        data-open={open || undefined}
        data-flip={flip || undefined}
        data-align={align}
        hidden={!open}
        onKeyDown={onListKey}
      >
        {options.map((option, i) => (
          <li
            key={option.value}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={option.value === value}
            data-active={i === active || undefined}
            lang={option.lang}
            className={styles.option}
            onPointerEnter={() => setActive(i)}
            onClick={() => choose(i)}
          >
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
