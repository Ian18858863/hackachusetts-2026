import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { isAbortError, searchTerms, toApiRequestError, type ApiRequestError, type DataOrigin } from '../../shared/api';
import { LIMITS, type CaseTerm, type HpoTerm, type TermRef } from '../../shared/contract';
import { useT } from '../../shared/i18n';
import review from '../../shared/i18n/messages/review';
import common from '../../shared/i18n/messages/common';
import { Button, Icon, OfflineMockLabel, Spinner, useOnlineStatus } from '../../shared/ui';
import { LocalIcon } from './LocalIcon';
import styles from './ManualAdd.module.css';
import { statusWordKey } from './model';
import { StatusToggle, type PresenceStatus } from './StatusToggle';

const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 8;

type Search =
  | { state: 'idle' }
  | { state: 'loading'; q: string }
  | { state: 'done'; q: string; terms: HpoTerm[]; origin: DataOrigin }
  | { state: 'error'; q: string; error: ApiRequestError };

/**
 * Add a feature by hand (Requirement 2.7): a combobox that searches
 * GET /api/terms as the user types. Arrow keys move through the results,
 * Enter adds the highlighted one, Escape closes the list.
 */
export function ManualAdd({
  terms,
  onAdd,
  inputRef,
  intro,
}: {
  terms: readonly CaseTerm[];
  onAdd: (term: TermRef, status: PresenceStatus) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  intro?: string;
}) {
  const t = useT(review);
  const tc = useT(common);
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const hintId = `${baseId}-hint`;
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const online = useOnlineStatus();

  const [query, setQuery] = useState('');
  const [addAs, setAddAs] = useState<PresenceStatus>('observed');
  const [search, setSearch] = useState<Search>({ state: 'idle' });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [attempt, setAttempt] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const q = query.trim();
  const searchable = q.length >= LIMITS.termsQueryMin && q.length <= LIMITS.termsQueryMax;

  useEffect(() => {
    if (!searchable || !online) {
      setSearch({ state: 'idle' });
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearch({ state: 'loading', q });
      searchTerms({ q, limit: RESULT_LIMIT }, { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) return;
          setSearch({ state: 'done', q, terms: result.data.terms, origin: result.origin });
          setActiveIndex(result.data.terms.length > 0 ? 0 : -1);
        })
        .catch((error: unknown) => {
          if (isAbortError(error) || controller.signal.aborted) return;
          setSearch({ state: 'error', q, error: toApiRequestError(error, 'terms') });
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q, searchable, online, attempt]);

  const results = search.state === 'done' ? search.terms : [];
  const showList = open && searchable && search.state !== 'idle';
  const activeOption = showList && activeIndex >= 0 ? results[activeIndex] : undefined;

  const choose = (term: HpoTerm) => {
    onAdd({ id: term.id, label: term.label }, addAs);
    setLastAdded(t('added', { label: term.label, status: t(statusWordKey(addAs)) }));
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    ref.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setOpen(true);
        if (results.length) setActiveIndex((i) => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setOpen(true);
        if (results.length) setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
        break;
      case 'Enter':
        if (activeOption) {
          event.preventDefault();
          choose(activeOption);
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
        } else if (query) {
          event.preventDefault();
          setQuery('');
        }
        break;
    }
  };

  const existing = (id: string) => terms.find((t) => t.hpoId === id);

  return (
    <section className={styles.add} aria-labelledby={`${baseId}-title`}>
      <div className={styles.head}>
        <h3 id={`${baseId}-title`} className={styles.title}>
          {t('addTitle')}
        </h3>
        <p id={hintId} className={styles.hint}>
          {intro ?? t('addHint')}
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.inputWrap}>
          <label htmlFor={inputId} className="sr-only">
            {t('searchLabel')}
          </label>
          <LocalIcon name="search" size={18} className={styles.searchIcon} />
          <input
            ref={ref}
            id={inputId}
            data-testid="term-search"
            className={styles.input}
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            placeholder={online ? t('searchPlaceholder') : t('searchOffline')}
            disabled={!online}
            value={query}
            maxLength={LIMITS.termsQueryMax}
            aria-describedby={hintId}
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={activeOption ? `${listId}-${activeIndex}` : undefined}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setLastAdded(null);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          {search.state === 'loading' && (
            <span className={styles.inputSpinner}>
              <Spinner size={14} />
            </span>
          )}
        </div>
        <div className={styles.addAs}>
          <span className={styles.addAsLabel} aria-hidden="true">
            {t('addAs')}
          </span>
          <StatusToggle
            name={`${baseId}-add-as`}
            idPrefix={`${baseId}-add-as`}
            value={addAs}
            legend={t('addAsLegend')}
            onChange={setAddAs}
            size="sm"
          />
        </div>
      </div>

      <div className={styles.results} data-open={showList || undefined}>
        {/* The listbox always exists so aria-controls points at a real element. */}
        <ul id={listId} role="listbox" aria-label={t('resultsLabel')} className={styles.list} hidden={!showList || results.length === 0}>
          {results.map((term, index) => {
            const already = existing(term.id);
            return (
              <li
                key={term.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={styles.option}
                data-active={index === activeIndex || undefined}
                onMouseEnter={() => setActiveIndex(index)}
                // Keep focus in the input while choosing with the pointer.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(term)}
              >
                <span className={styles.optionHead}>
                  <span className={styles.optionLabel}>{term.label}</span>
                  <span className={`code ${styles.optionId}`}>{term.id}</span>
                </span>
                {term.definition && <span className={styles.optionDef}>{term.definition}</span>}
                {already && already.status !== 'removed' && (
                  <span className={styles.optionNote}>
                    {t('alreadyInList', { current: t(statusWordKey(already.status)), next: t(statusWordKey(addAs)) })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {showList && search.state === 'done' && (
          <p className={styles.status}>
            {results.length === 0
              ? t('noMatches', { q: search.q })
              : t(results.length === 1 ? 'matchesOne' : 'matchesOther', { count: results.length })}
            {search.origin === 'mock' && <OfflineMockLabel />}
          </p>
        )}
        {showList && search.state === 'loading' && <p className={styles.status}>{t('searching', { q: search.q })}</p>}
        {showList && search.state === 'error' && (
          <div className={styles.error}>
            <Icon name="alert" size={16} />
            <span>{search.error.message}</span>
            {search.error.retryable && (
              <Button size="sm" variant="ghost" onClick={() => setAttempt((n) => n + 1)}>
                {tc('tryAgain')}
              </Button>
            )}
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {showList && search.state === 'done'
          ? results.length === 0
            ? t('srNoMatches')
            : t('srMatches', { count: results.length })
          : ''}
      </p>
      {lastAdded && (
        // Visible only: the parent announces the addition once through useAnnounce.
        <p className={styles.added}>
          <Icon name="check" size={16} />
          <span>{lastAdded}</span>
        </p>
      )}
    </section>
  );
}
