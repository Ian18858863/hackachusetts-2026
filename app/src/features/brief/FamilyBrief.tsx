/**
 * "Notes for my specialist" in family mode (T30a): one printable page with
 * the confirmed features and the sentence of the notes each came from, the
 * notes as written and the questions, plus the phenopacket export.
 *
 * It uses the same /api/brief call as the clinician brief (the phenopacket
 * comes from there), but never renders brief.candidates, genes, tests,
 * specialists or trials, and announces nothing that names a disease.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { BriefResponse, CaseTerm, Question } from '../../shared/contract';
import { useLocale, useT } from '../../shared/i18n';
import audienceMessages from '../../shared/i18n/messages/audience';
import briefMessages from '../../shared/i18n/messages/brief';
import common from '../../shared/i18n/messages/common';
import { useCase, useCaseActions } from '../../shared/store';
import { ATTRIBUTION, hpoAttribution, PRODUCT_NAME } from '../../shared/text';
import {
  ApiErrorState,
  Button,
  EmptyState,
  Icon,
  Skeleton,
  SkeletonGroup,
  SkeletonText,
  Spinner,
  useAnnounce,
} from '../../shared/ui';
import { fillTemplate } from '../../components/ui/fillTemplate';
import doc from './BriefDocument.module.css';
import styles from './BriefStep.module.css';
import family from './FamilyBrief.module.css';
import { formatDateTime, isoDay } from './format';
import { downloadJson, phenopacketFileName } from './download';
import { useBrief } from './useBrief';

/** The sentence of the notes that holds the quote, or the quote itself. */
export function sourceSentence(notes: string, term: CaseTerm): string | null {
  const { quote, start, end } = term;
  if (start === undefined || end === undefined || notes.slice(start, end) !== quote) return quote ?? null;
  let from = start;
  while (from > 0 && !/[.!?\n]/.test(notes[from - 1]!)) from -= 1;
  let to = end;
  while (to < notes.length && !/[.!?\n]/.test(notes[to]!)) to += 1;
  if (to < notes.length && notes[to] !== '\n') to += 1;
  return notes.slice(from, to).trim();
}

export function FamilyBrief() {
  const { caseObject } = useCase();
  const { goToStep } = useCaseActions();
  const state = useBrief();
  const announce = useAnnounce();
  const announced = useRef<BriefResponse | null>(null);
  const t = useT(audienceMessages);
  const tb = useT(briefMessages);
  const data = state.result?.data ?? null;

  useEffect(() => {
    if (state.phase !== 'ready' || !data || announced.current === data) return;
    announced.current = data;
    announce(t('announceReady'));
  }, [state.phase, data, announce, t]);

  if (state.phase === 'empty') {
    const hasNotes = caseObject.notes.trim().length > 0;
    return (
      <div data-testid="family-brief">
        <EmptyState
          icon="document"
          titleLevel={2}
          title={t('briefEmptyTitle')}
          description={t('briefEmptyDesc')}
          action={
            <Button
              variant="primary"
              iconEnd={<Icon name="arrowRight" size={16} />}
              onClick={() => goToStep(hasNotes ? 'features' : 'notes')}
            >
              {hasNotes ? tb('checkFeatures') : tb('addNotes')}
            </Button>
          }
        />
      </div>
    );
  }

  if (!data) {
    if (state.phase === 'error' && state.error) {
      return (
        <div data-testid="family-brief">
          <ApiErrorState error={state.error} onRetry={state.retry} />
        </div>
      );
    }
    // Neutral step name: the shared hook's labels mention ranking and matches.
    const step = t('preparingBrief');
    return (
      <div className={styles.step} data-testid="family-brief">
        <Toolbar>
          <span className={styles.updating}>
            <Spinner size={14} />
            {step}
          </span>
        </Toolbar>
        <div className={styles.layout}>
          <SkeletonGroup label={step} className={`${styles.paper} ${styles.skeleton}`}>
            <Skeleton height="1.6em" width="60%" />
            <SkeletonText lines={6} />
            <SkeletonText lines={5} />
          </SkeletonGroup>
        </div>
      </div>
    );
  }

  return <FamilyBriefReady data={data} state={state} />;
}

function FamilyBriefReady({ data, state }: { data: BriefResponse; state: ReturnType<typeof useBrief> }) {
  const { caseObject } = useCase();
  const announce = useAnnounce();
  const t = useT(audienceMessages);
  const tb = useT(briefMessages);
  const previewId = useId();
  const [saved, setSaved] = useState<string | null>(null);
  const fileName = phenopacketFileName(data.phenopacket);
  const locked = state.stale;

  useEffect(() => {
    const printing = styles.printing;
    if (!printing) return;
    document.body.classList.add(printing);
    return () => document.body.classList.remove(printing);
  }, []);

  const print = useCallback(() => {
    const previous = document.title;
    const who = caseObject.demo ? caseObject.demo.caseId : tb('printTitleCase');
    document.title = t('printTitle', { who, day: isoDay(data.brief.generatedAt) }).trim();
    const restore = () => {
      document.title = previous;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }, [caseObject.demo, data.brief.generatedAt, t, tb]);

  const exportPhenopacket = useCallback(() => {
    downloadJson(fileName, data.phenopacket);
    setSaved(fileName);
    announce(tb('announceSaved', { file: fileName }));
  }, [announce, data.phenopacket, fileName, tb]);

  const docProps = {
    data,
    terms: caseObject.terms,
    notes: caseObject.notes,
    questions: data.brief.questions,
  };

  return (
    <div className={styles.step}>
      <Toolbar onPrint={print} onExport={exportPhenopacket} disabled={locked}>
        {state.updating ? (
          <span className={styles.updating}>
            <Spinner size={14} />
            {t('preparingBrief')}
          </span>
        ) : locked ? (
          <span className={styles.outdated}>
            <Icon name="alert" size={16} />
            {t('outOfDate')}
          </span>
        ) : saved ? (
          <span className={styles.saved}>
            <Icon name="check" size={16} />
            {fillTemplate(tb('savedFile'), { file: <span className={styles.file}>{saved}</span> })}
          </span>
        ) : (
          <>{tb('printHint')}</>
        )}
      </Toolbar>

      {state.phase === 'error' && state.error && (
        <ApiErrorState compact titleLevel={3} error={state.error} onRetry={state.retry} />
      )}

      <div className={styles.layout}>
        <div
          className={styles.paper}
          data-testid="family-brief"
          data-stale={locked || undefined}
          aria-busy={state.updating || undefined}
        >
          <FamilyDocument {...docProps} idPrefix={`${previewId}-screen`} />
        </div>
      </div>

      {createPortal(
        <div className={styles.printRoot} aria-hidden="true">
          <FamilyDocument {...docProps} idPrefix={`${previewId}-print`} />
        </div>,
        document.body,
      )}
    </div>
  );
}

function FamilyDocument({
  data,
  terms,
  notes,
  questions,
  idPrefix,
}: {
  data: BriefResponse;
  terms: CaseTerm[];
  notes: string;
  questions: Question[];
  idPrefix: string;
}) {
  const t = useT(audienceMessages);
  const tc = useT(common);
  const tb = useT(briefMessages);
  const { locale } = useLocale();
  const id = (name: string) => `${idPrefix}-${name}`;
  const { brief } = data;
  const present = terms.filter((x) => x.status === 'observed');
  const absent = terms.filter((x) => x.status === 'excluded');
  // Only the HPO release and credit (contract section 13, always) and the demo source credit:
  // nothing from the ranking services is shown on this page.
  const hpoVersion = brief.dataVersions.hpo;
  const credits = [
    ...(hpoVersion ? [hpoAttribution(hpoVersion)] : []),
    ...(brief.patientSummary.demo ? [ATTRIBUTION.phenopacketStore] : []),
  ];
  const gap = locale === 'zh' || locale === 'ja' ? '' : ' ';

  return (
    <article className={doc.doc} aria-labelledby={id('title')}>
      <header className={doc.top}>
        <div className={doc.topLine}>
          <p className={doc.brand}>{PRODUCT_NAME}</p>
          <p className={doc.generated}>
            {fillTemplate(t('prepared'), {
              date: <time dateTime={brief.generatedAt}>{formatDateTime(brief.generatedAt, locale)}</time>,
            })}
          </p>
        </div>
        <p className={family.kicker}>{t('docKicker')}</p>
        <h2 id={id('title')} className={doc.title}>
          {t('briefTitle')}
        </h2>
        {brief.patientSummary.demo && brief.patientSummary.demoLabel && (
          <div className={doc.demo}>
            <Icon name="flask" size={14} />
            <p>
              <strong>{tb('demoNotReal')}</strong> {brief.patientSummary.demoLabel}.
            </p>
          </div>
        )}
        <p className={doc.disclaimer}>
          <Icon name="info" size={16} />
          <span>
            <strong>{tc('disclaimerLead')}</strong>
            {gap}
            {t('banner')}
          </span>
        </p>
      </header>

      <section className={doc.section} aria-labelledby={id('features')} data-testid="family-brief-features">
        <h3 id={id('features')} className={doc.heading}>
          {t('featuresHeading')}
        </h3>
        <FeatureList title={t('presentHeading')} terms={present} notes={notes} />
        <FeatureList title={t('notPresentHeading')} terms={absent} notes={notes} />
      </section>

      <section className={doc.section} aria-labelledby={id('notes')} data-testid="family-brief-notes">
        <h3 id={id('notes')} className={doc.heading}>
          {t('notesHeading')}
        </h3>
        {notes.trim() ? (
          <blockquote className={`${doc.excerpt} ${family.notes}`}>
            <p>{notes}</p>
          </blockquote>
        ) : (
          <p className={family.none}>{t('noNotes')}</p>
        )}
      </section>

      <section className={doc.section} aria-labelledby={id('questions')} data-testid="family-brief-questions">
        <h3 id={id('questions')} className={doc.heading}>
          {t('questionsHeading')}
        </h3>
        {questions.length > 0 ? (
          <ol className={family.questions}>
            {questions.map((q) => (
              <li key={q.hpoId}>{q.question}</li>
            ))}
          </ol>
        ) : (
          <p className={family.none}>{t('noQuestions')}</p>
        )}
      </section>

      <footer className={family.foot}>
        <p>{t('phenopacketNote')}</p>
        <p>{tc('medicalTermsNote')}</p>
        {credits.map((c) => (
          <p key={c} lang="en">
            {c}
          </p>
        ))}
      </footer>
    </article>
  );
}

function FeatureList({ title, terms, notes }: { title: string; terms: CaseTerm[]; notes: string }) {
  const t = useT(audienceMessages);
  return (
    <div className={family.group}>
      <h4 className={family.groupTitle}>{title}</h4>
      {terms.length === 0 ? (
        <p className={family.none}>{t('noFeatures')}</p>
      ) : (
        <ul className={family.features}>
          {terms.map((term) => {
            const sentence = sourceSentence(notes, term);
            return (
              <li key={term.hpoId} className={family.feature}>
                <span className={family.label}>
                  {term.label} <span className="code">{term.hpoId}</span>
                </span>
                <span className={family.source}>
                  {sentence ? (
                    <>
                      {t('fromNotes')} <q>{sentence}</q>
                    </>
                  ) : (
                    t('addedByHand')
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** The two actions and a status line; the phenopacket button carries the family test id. */
function Toolbar({
  onPrint,
  onExport,
  disabled = false,
  children,
}: {
  onPrint?: () => void;
  onExport?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const tb = useT(briefMessages);
  return (
    <div className={styles.toolbar}>
      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={onPrint}
          disabled={disabled || !onPrint}
          iconStart={<Icon name="document" size={18} />}
        >
          {tb('printButton')}
        </Button>
        <Button
          variant="secondary"
          onClick={onExport}
          data-testid="family-export-phenopacket"
          disabled={disabled || !onExport}
          iconStart={<Icon name="list" size={18} />}
        >
          {tb('exportButton')}
        </Button>
      </div>
      <p className={styles.hint} role="status">
        {children}
      </p>
    </div>
  );
}
