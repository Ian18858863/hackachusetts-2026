/**
 * The one-page specialist brief (Requirement 6.1–6.3, 6.6, 8.1, 8.2, 9.1).
 * A direct rendering of the /api/brief response: nothing here adds a disease
 * fact, frequency, gene, specialist or test (Requirement 9.3). Sections for
 * specialists and tests appear only when the response has entries.
 *
 * The same component renders the on-screen preview and the print copy.
 */
import type { Brief, BriefFeature, Candidate, FrequencyInfo, Question } from '../../shared/contract';
import { PRODUCT_NAME } from '../../shared/text';
import { fillTemplate } from '../../components/ui/fillTemplate';
import { useLocale, useT } from '../../shared/i18n';
import briefMessages from '../../shared/i18n/messages/brief';
import common from '../../shared/i18n/messages/common';
import rankingMessages from '../../shared/i18n/messages/ranking';
import shellMessages from '../../shared/i18n/messages/shell';
import { frequencyState } from '../ranking/format';
import { Icon } from '../../shared/ui';
import { headingText, useFitHeading } from '../../components/ui/useFitHeading';
import styles from './BriefDocument.module.css';
import { candidateIds, formatDateTime, frequencyText, overlapWords, versionPairs } from './format';

export interface BriefDocumentProps {
  brief: Brief;
  phenopacketId: string;
  /** The response came from the app's offline mock, not the server. */
  offlineMock: boolean;
  /** Heading ids must be unique when the preview and the print copy are both in the page. */
  idPrefix: string;
}

export function BriefDocument({ brief, phenopacketId, offlineMock, idPrefix }: BriefDocumentProps) {
  const { patientSummary: summary, features } = brief;
  const id = (name: string) => `${idPrefix}-${name}`;
  const t = useT(briefMessages);
  const tc = useT(common);
  const ts = useT(shellMessages);
  const { locale } = useLocale();
  const title = headingText(locale === 'en' ? brief.title : ts('briefTitle'));
  const titleRef = useFitHeading<HTMLHeadingElement>(title, { min: 20 });

  return (
    <article className={styles.doc} aria-labelledby={id('title')}>
      <header className={styles.top}>
        <div className={styles.topLine}>
          <p className={styles.brand}>{PRODUCT_NAME}</p>
          <p className={styles.generated}>
            {fillTemplate(t('generated'), {
              time: <time dateTime={brief.generatedAt}>{formatDateTime(brief.generatedAt, locale)}</time>,
            })}
          </p>
        </div>
        <div className={styles.titleRow}>
        <h2 id={id('title')} ref={titleRef} className={styles.title}>
          {/* The server's English title; other languages show the app's own step title (T34). */}
          {title}
        </h2>
        <dl className={styles.summary}>
          {summary.ageText && (
            <div>
              <dt>{t('age')}</dt>
              <dd>{summary.ageText}</dd>
            </div>
          )}
          <div>
            <dt>{t('features')}</dt>
            <dd>
              {t('featureCounts', { present: features.observed.length, absent: features.excluded.length })}
            </dd>
          </div>
          <div>
            <dt>{t('possibleMatches')}</dt>
            <dd>{brief.candidates.length}</dd>
          </div>
        </dl>
        </div>
        {(summary.demo || offlineMock) && (
          // The one demo line of the printed brief (T34); localized per contract section 13 v0.1.6,
          // the phenopacket-store id verbatim.
          <p className={styles.demo} data-demo-notice>
            <Icon name="flask" size={14} />
            <span>
              {summary.demo && demoLine(summary.demoLabel, tc)}
              {offlineMock && <> {t('offlineMockNote', { label: tc('demoDataOffline') })}</>}
            </span>
          </p>
        )}
        <p className={styles.disclaimer}>
          <Icon name="info" size={16} />
          {/* Contract section 13: English is the verbatim sentence; other languages its faithful translation. */}
          {locale === 'en' ? (
            <span>{brief.disclaimer}</span>
          ) : (
            // Clinical document: the translation, then the server's verbatim English sentence once (contract section 13).
            <span>
              {tc('disclaimer')}
              <span lang="en" className={styles.disclaimerEn}>
                {brief.disclaimer}
              </span>
            </span>
          )}
        </p>
        {summary.notesExcerpt && (
          <blockquote className={styles.excerpt}>
            <p>{summary.notesExcerpt}</p>
          </blockquote>
        )}
      </header>

      <section className={styles.section} aria-labelledby={id('features')}>
        <h3 id={id('features')} className={styles.heading}>
          {t('features')}
        </h3>
        <FeatureTable caption={t('present')} rows={features.observed} />
        {features.excluded.length > 0 && <FeatureTable caption={t('notPresent')} rows={features.excluded} />}
      </section>

      <section className={styles.section} aria-labelledby={id('matches')}>
        <h3 id={id('matches')} className={styles.heading}>
          {t('matchesHeading')}
        </h3>
        {brief.candidates.length === 0 ? (
          <p className={styles.none}>{t('noMatches')}</p>
        ) : (
          <ol className={styles.candidates}>
            {brief.candidates.map((c) => (
              <CandidateEntry
                key={c.diseaseId}
                candidate={c}
                detailed={c.rank <= DETAILED_CANDIDATES}
                genesListedInTests={brief.testsToAsk.some((t) => t.diseaseId === c.diseaseId)}
              />
            ))}
          </ol>
        )}
        {brief.candidates.some((c) => c.rank <= DETAILED_CANDIDATES && c.matched.some((m) => m.via === 'ancestor')) && (
          <p className={styles.printNote}>
            {t('broaderNote')}
          </p>
        )}
      </section>

      {brief.questions.length > 0 && (
        <section className={styles.section} aria-labelledby={id('questions')}>
          <h3 id={id('questions')} className={styles.heading}>
            {t('questionsHeading')}
          </h3>
          <ol className={styles.questions}>
            {brief.questions.map((q) => (
              <QuestionEntry key={q.hpoId} question={q} />
            ))}
          </ol>
        </section>
      )}

      {(brief.specialists.length > 0 || brief.testsToAsk.length > 0) && (
        <div className={styles.pair}>
          {brief.specialists.length > 0 && (
            <section className={styles.section} aria-labelledby={id('specialists')}>
              <h3 id={id('specialists')} className={styles.heading}>
                {t('specialistsHeading')}
              </h3>
              <ul className={styles.plainList}>
                {brief.specialists.map((s) => (
                  <li key={s.specialty}>
                    <span className={styles.strong}>{s.specialty}</span>
                    <span className={styles.muted}> · {t('becauseOf', { list: s.becauseOf.join(', ') })}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {brief.testsToAsk.length > 0 && (
            <section className={styles.section} aria-labelledby={id('tests')}>
              <h3 id={id('tests')} className={styles.heading}>
                {t('testsHeading')}
              </h3>
              <ul className={styles.plainList}>
                {brief.testsToAsk.map((t) => (
                  <li key={`${t.diseaseId}-${t.gene.id}`}>{t.text}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <footer className={styles.footer}>
        {locale !== 'en' && <p className={styles.termsNote}>{tc('medicalTermsNote')}</p>}
        <p className={styles.versions}>
          <span className={styles.footLabel}>{t('dataVersions')}</span>{' '}
          {versionPairs(brief.dataVersions, t, locale).map(([name, value], i) => (
            <span key={name}>
              {i > 0 && ' · '}
              {name} <span className={styles.nums}>{value}</span>
            </span>
          ))}
        </p>
        <ul className={styles.attributions}>
          {brief.attributions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className={styles.fileRef}>
          {fillTemplate(t('fileRef'), {
            product: PRODUCT_NAME,
            id: <span className={styles.code}>{phenopacketId}</span>,
          })}
        </p>
      </footer>
    </article>
  );
}

function FeatureTable({ caption, rows }: { caption: string; rows: BriefFeature[] }) {
  const t = useT(briefMessages);
  return (
    <table className={styles.table}>
      <caption className={styles.caption}>
        {caption} <span className={styles.count}>{rows.length}</span>
      </caption>
      <thead>
        <tr>
          <th scope="col">{t('colInNotes')}</th>
          <th scope="col">{t('colHpoTerm')}</th>
          <th scope="col" className={styles.idCol}>
            {t('colHpoId')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((f) => (
          <tr key={f.id}>
            <td className={styles.quote}>
              {f.quote ? t('quoted', { quote: f.quote }) : <span className={styles.muted}>{t('addedByHand')}</span>}
            </td>
            <td className={styles.term}>{f.label}</td>
            <td className={`${styles.code} ${styles.idCol}`}>{f.id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The top 3 get the full evidence (the same top 3 that specialists and tests
 * come from, contract 7.7); the rest get one line, so the brief fits a page.
 * Contradictions are always shown.
 */
const DETAILED_CANDIDATES = 3;

/** Whole-sentence key for the match count, so plural and word order stay per language. */
function countKey(exact: number, broader: number, total: number) {
  const one = total === 1;
  if (exact === total) return one ? 'countAllOne' : 'countAllMany';
  if (broader > 0) return one ? 'countBroaderOne' : 'countBroaderMany';
  return one ? 'countOne' : 'countMany';
}

function CandidateEntry({
  candidate: c,
  detailed,
  genesListedInTests,
}: {
  candidate: Candidate;
  detailed: boolean;
  genesListedInTests: boolean;
}) {
  const t = useT(briefMessages);
  const tc = useT(common);
  const tr = useT(rankingMessages);
  const { locale } = useLocale();
  // The matches view's band words, lower case inside the sentence where the script has case.
  const band = (label: NonNullable<FrequencyInfo['label']>) =>
    frequencyState({ label, source: '' }, tr).word.toLocaleLowerCase(locale);
  const observedTotal = c.matched.length + c.unmatched.length;
  // Counted like Step 3 (contract 7.4 step 8): exact matches in the headline, broader-term matches separately.
  const exact = c.matched.filter((m) => m.via === 'exact').length;
  const broader = c.matched.length - exact;
  // Placeholder candidates in the offline mock link nowhere useful.
  const links = c.diseaseId.startsWith('MOCK:') ? [] : [
    c.links.orphanet ? { href: c.links.orphanet, text: 'Orphanet' } : null,
    c.links.omim ? { href: c.links.omim, text: 'OMIM' } : null,
    c.links.monarch ? { href: c.links.monarch, text: 'Monarch' } : null,
  ].filter((l): l is { href: string; text: string } => l !== null);

  return (
    <li className={styles.candidate}>
      <span className={styles.rank} aria-hidden="true">
        {c.rank}
      </span>
      <div className={styles.candidateBody}>
        <p className={styles.candidateHead}>
          <span className="sr-only">{t('rankSr', { rank: c.rank })}</span>
          <span className={styles.candidateName}>{c.name}</span>
          <span className={styles.overlap}>{overlapWords(c.overlap, t)}</span>
          <span className={styles.ids}>
            {candidateIds(c).join(' · ')}
            {links.map((l) => (
              <span key={l.text}>
                {' · '}
                <a href={l.href} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                  {l.text}
                  <span className="sr-only">{t('opensNewTab')}</span>
                </a>
              </span>
            ))}
          </span>
        </p>
        <p className={styles.evidence}>
          <span className={styles.evidenceLabel}>
            {t(countKey(exact, broader, observedTotal), { exact, broader, total: observedTotal })}
            {detailed && c.matched.length > 0 ? t('listColon') : ''}
          </span>{' '}
          {!detailed
            ? null
            : c.matched.map((m, i) => (
                <span key={`${m.patientTerm.id}-${m.diseaseTerm.id}`}>
                  {i > 0 && '; '}
                  {m.patientTerm.label}
                  {m.via === 'ancestor' && (
                    <>
                      <span className={`${styles.muted} ${styles.via}`}>
                        {' '}
                        {m.ancestor
                          ? t('viaNamed', { ancestor: m.ancestor.label, term: m.diseaseTerm.label })
                          : t('viaUnnamed', { term: m.diseaseTerm.label })}
                      </span>
                      <span className={styles.viaMark} aria-hidden="true">
                        †
                      </span>
                    </>
                  )}
                  <span className={styles.freq}> {frequencyText(m.frequency, t, band, c.evidenceComplete === false, tc('evidenceCouldNotLoad'))}</span>
                </span>
              ))}
        </p>
        {c.contradicted.length > 0 && (
          <p className={styles.evidence}>
            <span className={styles.evidenceLabel}>{t('contradictedLabel')}</span>{' '}
            {c.contradicted.map((f, i) => (
              <span key={f.term.id}>
                {i > 0 && '; '}
                {f.term.label}
                <span className={styles.freq}> {frequencyText(f.frequency, t, band)}</span>
              </span>
            ))}
          </p>
        )}
        {detailed && c.notReported.length > 0 && (
          <p className={`${styles.evidence} ${c.rank > 1 ? styles.screenOnly : ''}`}>
            <span className={styles.evidenceLabel}>{t('notReportedLabel')}</span>{' '}
            {c.notReported.map((f, i) => (
              <span key={f.term.id}>
                {i > 0 && '; '}
                {f.term.label}
                <span className={styles.freq}> {frequencyText(f.frequency, t, band)}</span>
              </span>
            ))}
          </p>
        )}
        {/* On paper the genes appear once, in "Tests to ask about" (same top-3 genes, contract 7.7). */}
        {detailed && c.genes.length > 0 && (
          <p className={`${styles.evidence} ${genesListedInTests ? styles.screenOnly : ''}`}>
            <span className={styles.evidenceLabel}>{t('genesLabel')}</span>{' '}
            {c.genes.map((g) => g.symbol).join(', ')}
          </p>
        )}
      </div>
    </li>
  );
}

function QuestionEntry({ question: q }: { question: Question }) {
  return (
    <li className={styles.question}>
      <p className={styles.questionText}>{q.question}</p>
      {/* The "why" line is on screen; the printed page keeps the question, term and id. */}
      <p className={styles.why}>
        <span className={styles.term}>{q.label}</span> <span className={styles.code}>{q.hpoId}</span> · {q.why}
      </p>
    </li>
  );
}

/** The localized demo provenance line; the phenopacket-store id is read from the server's verbatim label. */
function demoLine(serverLabel: string | undefined, tc: (key: 'demoCaseLabel', vars: { id: string }) => string): string {
  const id = serverLabel ? /phenopacket-store\s+([^\s)]+)/.exec(serverLabel)?.[1] : undefined;
  return id ? tc('demoCaseLabel', { id }) : (serverLabel ?? '');
}
