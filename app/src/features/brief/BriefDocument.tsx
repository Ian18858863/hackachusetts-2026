/**
 * The one-page specialist brief (Requirement 6.1–6.3, 6.6, 8.1, 8.2, 9.1).
 * A direct rendering of the /api/brief response: nothing here adds a disease
 * fact, frequency, gene, specialist or test (Requirement 9.3). Sections for
 * specialists and tests appear only when the response has entries.
 *
 * The same component renders the on-screen preview and the print copy.
 */
import type { Brief, BriefFeature, Candidate, Question } from '../../shared/contract';
import { OFFLINE_MOCK_LABEL, PRODUCT_NAME } from '../../shared/text';
import { Icon } from '../../shared/ui';
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

  return (
    <article className={styles.doc} aria-labelledby={id('title')}>
      <header className={styles.top}>
        <div className={styles.topLine}>
          <p className={styles.brand}>{PRODUCT_NAME}</p>
          <p className={styles.generated}>
            Generated <time dateTime={brief.generatedAt}>{formatDateTime(brief.generatedAt)}</time>
          </p>
        </div>
        <div className={styles.titleRow}>
        <h2 id={id('title')} className={styles.title}>
          {brief.title}
        </h2>
        <dl className={styles.summary}>
          {summary.ageText && (
            <div>
              <dt>Age</dt>
              <dd>{summary.ageText}</dd>
            </div>
          )}
          <div>
            <dt>Features</dt>
            <dd>
              {features.observed.length} present, {features.excluded.length} not present
            </dd>
          </div>
          <div>
            <dt>Possible matches</dt>
            <dd>{brief.candidates.length}</dd>
          </div>
        </dl>
        </div>
        {(summary.demo || offlineMock) && (
          <div className={styles.demo}>
            <Icon name="flask" size={14} />
            <p>
              <strong>Demo data, not a real patient.</strong>
              {/* Contract section 13 label, verbatim from the server; no made-up fallback text. */}
              {summary.demo && summary.demoLabel && <> {summary.demoLabel}.</>}
              {offlineMock && <> {OFFLINE_MOCK_LABEL}: frequencies and comparison conditions are illustrative.</>}
            </p>
          </div>
        )}
        <p className={styles.disclaimer}>
          <Icon name="info" size={16} />
          <span>{brief.disclaimer}</span>
        </p>
        {summary.notesExcerpt && (
          <blockquote className={styles.excerpt}>
            <p>{summary.notesExcerpt}</p>
          </blockquote>
        )}
      </header>

      <section className={styles.section} aria-labelledby={id('features')}>
        <h3 id={id('features')} className={styles.heading}>
          Features
        </h3>
        <FeatureTable caption="Present" rows={features.observed} />
        {features.excluded.length > 0 && <FeatureTable caption="Not present" rows={features.excluded} />}
      </section>

      <section className={styles.section} aria-labelledby={id('matches')}>
        <h3 id={id('matches')} className={styles.heading}>
          Possible matches to discuss
        </h3>
        {brief.candidates.length === 0 ? (
          <p className={styles.none}>No possible matches were found for these features.</p>
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
            † Matched through a broader HPO term; the on-screen brief names the term.
          </p>
        )}
      </section>

      {brief.questions.length > 0 && (
        <section className={styles.section} aria-labelledby={id('questions')}>
          <h3 id={id('questions')} className={styles.heading}>
            Questions to ask
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
                Specialists to consider
              </h3>
              <ul className={styles.plainList}>
                {brief.specialists.map((s) => (
                  <li key={s.specialty}>
                    <span className={styles.strong}>{s.specialty}</span>
                    <span className={styles.muted}> · because of {s.becauseOf.join(', ')}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {brief.testsToAsk.length > 0 && (
            <section className={styles.section} aria-labelledby={id('tests')}>
              <h3 id={id('tests')} className={styles.heading}>
                Tests to ask about
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
        <p className={styles.versions}>
          <span className={styles.footLabel}>Data versions</span>{' '}
          {versionPairs(brief.dataVersions).map(([name, value], i) => (
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
          {PRODUCT_NAME} v0.1 · Phenopacket file <span className={styles.code}>{phenopacketId}</span> (GA4GH Phenopacket v2; features
          only, no diagnosis)
        </p>
      </footer>
    </article>
  );
}

function FeatureTable({ caption, rows }: { caption: string; rows: BriefFeature[] }) {
  return (
    <table className={styles.table}>
      <caption className={styles.caption}>
        {caption} <span className={styles.count}>{rows.length}</span>
      </caption>
      <thead>
        <tr>
          <th scope="col">In the notes</th>
          <th scope="col">HPO term</th>
          <th scope="col" className={styles.idCol}>
            HPO ID
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((f) => (
          <tr key={f.id}>
            <td className={styles.quote}>
              {f.quote ? `“${f.quote}”` : <span className={styles.muted}>Added by hand</span>}
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

function CandidateEntry({
  candidate: c,
  detailed,
  genesListedInTests,
}: {
  candidate: Candidate;
  detailed: boolean;
  genesListedInTests: boolean;
}) {
  const observedTotal = c.matched.length + c.unmatched.length;
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
          <span className="sr-only">Rank {c.rank}: </span>
          <span className={styles.candidateName}>{c.name}</span>
          <span className={styles.overlap}>{overlapWords(c.overlap)}</span>
          <span className={styles.ids}>
            {candidateIds(c).join(' · ')}
            {links.map((l) => (
              <span key={l.text}>
                {' · '}
                <a href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.text}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </span>
            ))}
          </span>
        </p>
        <p className={styles.evidence}>
          <span className={styles.evidenceLabel}>
            Matches {c.matched.length} of {observedTotal} {observedTotal === 1 ? 'feature' : 'features'}
            {detailed && c.matched.length > 0 ? ':' : ''}
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
                        (via {m.ancestor?.label ?? 'a broader term'}, listed as {m.diseaseTerm.label})
                      </span>
                      <span className={styles.viaMark} aria-hidden="true">
                        †
                      </span>
                    </>
                  )}
                  <span className={styles.freq}> {frequencyText(m.frequency)}</span>
                </span>
              ))}
        </p>
        {c.contradicted.length > 0 && (
          <p className={styles.evidence}>
            <span className={styles.evidenceLabel}>Not present here, but usual in this condition:</span>{' '}
            {c.contradicted.map((f, i) => (
              <span key={f.term.id}>
                {i > 0 && '; '}
                {f.term.label}
                <span className={styles.freq}> {frequencyText(f.frequency)}</span>
              </span>
            ))}
          </p>
        )}
        {detailed && c.notReported.length > 0 && (
          <p className={`${styles.evidence} ${c.rank > 1 ? styles.screenOnly : ''}`}>
            <span className={styles.evidenceLabel}>Not mentioned, frequent in this condition:</span>{' '}
            {c.notReported.map((f, i) => (
              <span key={f.term.id}>
                {i > 0 && '; '}
                {f.term.label}
                <span className={styles.freq}> {frequencyText(f.frequency)}</span>
              </span>
            ))}
          </p>
        )}
        {/* On paper the genes appear once, in "Tests to ask about" (same top-3 genes, contract 7.7). */}
        {detailed && c.genes.length > 0 && (
          <p className={`${styles.evidence} ${genesListedInTests ? styles.screenOnly : ''}`}>
            <span className={styles.evidenceLabel}>Genes in HPO annotations:</span>{' '}
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
