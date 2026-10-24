import {
  BENCHMARK_URL,
  CLINICAL_TRIALS_ATTRIBUTION,
  DEMO_HREF,
  DEMO_LABEL,
  DISCLAIMER,
  HPO_VERSION,
  MONARCH_ATTRIBUTION,
  ORPHANET_ATTRIBUTION,
  OWN_EVALUATION,
  PHENOPACKET_STORE_ATTRIBUTION,
  PRODUCT_NAME,
  README_URL,
  REPO_URL,
  STATS,
  STEPS,
  STUDIES,
  SURVEY_NOTE,
} from './content';

const SECTIONS = [
  { id: 'problem', label: 'Problem' },
  { id: 'how', label: 'How it works' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'sources', label: 'Sources' },
] as const;

function Header() {
  return (
    <header className="top">
      <div className="wrap top-in">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">{PRODUCT_NAME}</span>
        </a>
        <nav className="sections" aria-label="Sections">
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <a className="btn btn-top" href={DEMO_HREF} aria-label="Open the demo">
          <span className="wide" aria-hidden="true">
            Open the demo
          </span>
          <span className="narrow" aria-hidden="true">
            Demo
          </span>
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero-in">
        <div className="hero-copy">
          <p className="kicker">
            <b>For families and clinicians</b> · rare disease decision support
          </p>
          <h1 id="hero-title">A specialist-ready brief in minutes, not a diagnosis in years.</h1>
          <p className="lede">Turn years of scattered notes into a specialist-ready brief in minutes.</p>
          <p className="safety">
            <b>Decision support, not a diagnosis.</b> Possible matches to discuss with a doctor, each with
            the evidence behind it.
          </p>
          <div className="actions">
            <a className="btn btn-lg" href={DEMO_HREF}>
              Try the demo case
            </a>
            <a className="link-quiet" href="#how">
              How it works
            </a>
          </div>
          <p className="demo-note">Opens a synthetic demo case with no sign-up. Not a real patient.</p>
        </div>

        <figure className="proof">
          <div className="proof-frame">
            <img
              src="/proof-matches-demo-npc1.webp"
              width={657}
              height={600}
              alt="Screenshot of the app's Possible matches step for a demo case, not a real patient. Rank 1 of 5 possible matches is Niemann-Pick disease, type C1, with strong overlap: 6 of 12 present features described, plus 6 through broader terms. Each feature is listed in plain words with its HPO term and how often it occurs in the condition, for example Frequency not listed."
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <figcaption>
            The live app on the demo case, rank 1 of 5 possible matches, captured on 2026-10-24.{' '}
            {DEMO_LABEL}.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="band" id="problem" aria-labelledby="problem-title">
      <div className="wrap">
        <h2 id="problem-title">Rare diseases take years to name</h2>
        <p className="dek">
          Families and non-specialist clinicians hold the clues in plain words. Rare-disease tools expect
          ontology terms.
        </p>
        <ul className="stats">
          {STATS.map((s) => (
            <li className="stat" key={s.value}>
              <p className="stat-value">{s.value}</p>
              <p className="stat-label">{s.label}</p>
              <p className="cite">
                <a href={s.href}>{s.source}</a>
              </p>
            </li>
          ))}
        </ul>
        <p className="note">{SURVEY_NOTE}</p>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="band" id="how" aria-labelledby="how-title">
      <div className="wrap">
        <h2 id="how-title">How it works</h2>
        <p className="dek">Five steps from a parent’s notes to something a specialist can check.</p>
        <div className="how">
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li className="step" key={s.title}>
                <span className="step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="panel">
            <h3>The ontology ranks; the LLM only translates</h3>
            <p>
              A language model proposes phrases from the notes. A feature is kept only if its phrase appears
              word for word in the notes and the Human Phenotype Ontology confirms the term.
            </p>
            <p>
              The ranking comes from the Monarch Initiative’s semantic similarity service. Disease names come
              from Monarch, HPO annotations and Orphadata; frequencies and genes come from HPO annotations.
              None of them come from the model.
            </p>
            <p className="panel-foot">
              Your notes are sent to the server only to extract features, using Cloudflare Workers AI. The app
              does not store them on a server or write them to logs; your case is kept in your browser.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Evidence() {
  return (
    <section className="band" id="evidence" aria-labelledby="evidence-title">
      <div className="wrap">
        <h2 id="evidence-title">Why the ontology does the ranking</h2>
        <p className="dek">Published work points to the same split of roles that this tool uses.</p>
        <ul className="studies">
          {STUDIES.map((s) => (
            <li className="study" key={s.href}>
              <h3>{s.claim}</h3>
              <p>{s.detail}</p>
              <p className="cite">
                <a href={s.href}>{s.source}</a>
              </p>
            </li>
          ))}
        </ul>
        <div className="panel own">
          <h3>Our own check</h3>
          <p className="own-result">{OWN_EVALUATION}</p>
          <p>
            The cases come from publications that may already feed the HPO annotations, so the result is
            likely optimistic. It is not a clinical validation.
          </p>
          <p>
            A pre-registered frequency-aware re-rank did not improve the result, so it was not shipped.{' '}
            <a href={BENCHMARK_URL}>Method and results</a>
          </p>
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="closing" aria-labelledby="closing-title">
      <div className="wrap closing-in">
        <div>
          <h2 id="closing-title">See it on the demo case</h2>
          <p className="dek">A 54-year-old with worsening memory and unsteady walking. Synthetic, not a real patient.</p>
        </div>
        <a className="btn btn-lg" href={DEMO_HREF}>
          Try the demo case
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="foot" id="sources" aria-labelledby="sources-title">
      <div className="wrap">
        <p className="foot-safety">{DISCLAIMER}</p>
        <h2 className="foot-h" id="sources-title">
          Sources and credits
        </h2>
        <ul className="foot-list">
          <li>
            This product uses the Human Phenotype Ontology (version {HPO_VERSION}). Find out more at{' '}
            <a href="https://hpo.jax.org">https://hpo.jax.org</a>
          </li>
          <li>{MONARCH_ATTRIBUTION}</li>
          <li>{ORPHANET_ATTRIBUTION}</li>
          <li>{CLINICAL_TRIALS_ATTRIBUTION}</li>
          <li>
            {DEMO_LABEL}. {PHENOPACKET_STORE_ATTRIBUTION}
          </li>
        </ul>
        <p className="foot-meta">
          <b>Built at Sundai</b> · Hackachusetts 2026 · <a href={REPO_URL}>Source on GitHub</a> ·{' '}
          <a href={README_URL}>README</a> · <a href={DEMO_HREF}>Open the demo</a>
        </p>
      </div>
    </footer>
  );
}

export function App() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div id="top" />
      <Header />
      <main id="main">
        <Hero />
        <Problem />
        <HowItWorks />
        <Evidence />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
