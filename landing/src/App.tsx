import { useEffect, type ChangeEvent } from 'react';
import {
  BENCHMARK_URL,
  CLINICAL_TRIALS_ATTRIBUTION,
  DEMO_SOURCE_ID,
  HPO_VERSION,
  MONARCH_ATTRIBUTION,
  ORPHANET_ATTRIBUTION,
  PHENOPACKET_STORE_ATTRIBUTION,
  PRODUCT_NAME,
  README_URL,
  REPO_URL,
  STAT_CITES,
  STUDY_CITES,
  demoHref,
  familyHref,
} from './content';
import { LOCALES, LOCALE_META, parseLocale, useLocale, useT } from './i18n';
import commonMessages from './i18n/messages/common.ts';
import landingMessages from './i18n/messages/landing.ts';

function useLandingT() {
  return useT(landingMessages);
}

function useDemoHref(): string {
  return demoHref(useLocale().locale);
}

function useFamilyHref(): string {
  return familyHref(useLocale().locale);
}

/** Document title and meta description follow the language (English values equal index.html). */
function useDocumentMeta() {
  const t = useLandingT();
  const { locale } = useLocale();
  useEffect(() => {
    document.title = t('metaTitle');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('metaDescription'));
  }, [t, locale]);
}

function LanguageSelect() {
  const { locale, setLocale } = useLocale();
  const tc = useT(commonMessages);
  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = parseLocale(e.target.value);
    if (next) setLocale(next);
  };
  return (
    <select className="lang" value={locale} onChange={onChange} aria-label={tc('languageLabel')}>
      {LOCALES.map((l) => (
        <option key={l} value={l} lang={LOCALE_META[l].htmlLang}>
          {LOCALE_META[l].nativeName}
        </option>
      ))}
    </select>
  );
}

function Header() {
  const t = useLandingT();
  const href = useDemoHref();
  const sections = [
    { id: 'problem', label: t('navProblem') },
    { id: 'how', label: t('navHow') },
    { id: 'evidence', label: t('navEvidence') },
    { id: 'sources', label: t('navSources') },
  ];
  return (
    <header className="top">
      <div className="wrap top-in">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">{PRODUCT_NAME}</span>
        </a>
        <nav className="sections" aria-label={t('navLabel')}>
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="top-actions">
          <LanguageSelect />
          <a className="btn btn-top" href={href} aria-label={t('openDemo')}>
            <span className="wide" aria-hidden="true">
              {t('openDemo')}
            </span>
            <span className="narrow" aria-hidden="true">
              {t('openDemoShort')}
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const t = useLandingT();
  const tc = useT(commonMessages);
  const { locale } = useLocale();
  const href = useDemoHref();
  const familyLink = useFamilyHref();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero-in">
        <div className="hero-copy">
          <p className="kicker">
            <b>{t('kickerLead')}</b>
            {t('kickerRest')}
          </p>
          <h1 id="hero-title">{t('heroTitle')}</h1>
          <p className="safety">
            <b>{tc('disclaimerLead')}</b>
            {t('heroSafetyRest')}
          </p>
          <div className="actions">
            <a className="btn btn-lg" href={href}>
              {t('tryDemo')}
            </a>
            <a className="link-quiet" href="#how">
              {t('howLink')}
            </a>
            <a className="link-quiet" href={familyLink}>
              {t('familyCta')}
            </a>
          </div>
        </div>

        <figure className="proof">
          <div className="proof-frame">
            <img
              src="/proof-matches-demo-npc1.webp"
              width={657}
              height={600}
              alt={t('proofAlt')}
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <figcaption>
            {t('proofCaption')}
            {locale === 'zh' || locale === 'ja' ? '' : ' '}
            <span data-demo-notice>{tc('demoCaseLabel', { id: DEMO_SOURCE_ID })}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

const STAT_KEYS = [
  ['stat1Value', 'stat1Label'],
  ['stat2Value', 'stat2Label'],
  ['stat3Value', 'stat3Label'],
] as const;

function Problem() {
  const t = useLandingT();
  return (
    <section className="band" id="problem" aria-labelledby="problem-title">
      <div className="wrap">
        <h2 id="problem-title">{t('problemTitle')}</h2>
        <ul className="stats">
          {STAT_KEYS.map(([valueKey, labelKey], i) => {
            const cite = STAT_CITES[i]!;
            return (
              <li className="stat" key={valueKey}>
                <p className="stat-value">{t(valueKey)}</p>
                <p className="stat-label">{t(labelKey)}</p>
                <p className="cite">
                  <a href={cite.href} lang="en">
                    {cite.source}
                  </a>
                </p>
              </li>
            );
          })}
        </ul>
        <p className="note">{t('surveyNote')}</p>
      </div>
    </section>
  );
}

const STEP_KEYS = [
  ['step1Title', 'step1Body'],
  ['step2Title', 'step2Body'],
  ['step3Title', 'step3Body'],
  ['step4Title', 'step4Body'],
  ['step5Title', 'step5Body'],
] as const;

function HowItWorks() {
  const t = useLandingT();
  return (
    <section className="band" id="how" aria-labelledby="how-title">
      <div className="wrap">
        <h2 id="how-title">{t('howTitle')}</h2>
        <div className="how">
          <ol className="steps">
            {STEP_KEYS.map(([titleKey], i) => (
              <li className="step" key={titleKey}>
                <span className="step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{t(titleKey)}</h3>
                </div>
              </li>
            ))}
          </ol>
          <div className="panel">
            <h3>{t('panelTitle')}</h3>
            <p>{t('panelGrounding')}</p>
            <p>{t('panelSources')}</p>
            <p className="panel-foot">{t('panelPrivacy')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const STUDY_KEYS = [
  ['study1Claim', 'study1Detail'],
  ['study2Claim', 'study2Detail'],
] as const;

function Evidence() {
  const t = useLandingT();
  return (
    <section className="band" id="evidence" aria-labelledby="evidence-title">
      <div className="wrap">
        <h2 id="evidence-title">{t('evidenceTitle')}</h2>
        <ul className="studies">
          {STUDY_KEYS.map(([claimKey, detailKey], i) => {
            const cite = STUDY_CITES[i]!;
            return (
              <li className="study" key={cite.href}>
                <h3>{t(claimKey)}</h3>
                <p>{t(detailKey)}</p>
                <p className="cite">
                  <a href={cite.href} lang="en">
                    {cite.source}
                  </a>
                </p>
              </li>
            );
          })}
        </ul>
        <div className="panel own">
          <h3>{t('ownTitle')}</h3>
          <p className="own-result">{t('ownResult')}</p>
          <p>{t('ownCaveat')}</p>
          <p>
            {t('ownRerank')} <a href={BENCHMARK_URL}>{t('methodLink')}</a>
          </p>
        </div>
      </div>
    </section>
  );
}

function Closing() {
  const t = useLandingT();
  const href = useDemoHref();
  return (
    <section className="closing" aria-labelledby="closing-title">
      <div className="wrap closing-in">
        <div>
          <h2 id="closing-title">{t('closingTitle')}</h2>
        </div>
        <a className="btn btn-lg" href={href}>
          {t('tryDemo')}
        </a>
      </div>
    </section>
  );
}

function Footer() {
  const t = useLandingT();
  const tc = useT(commonMessages);
  const href = useDemoHref();
  return (
    <footer className="foot" id="sources" aria-labelledby="sources-title">
      <div className="wrap">
        <p className="foot-safety">{tc('disclaimer')}</p>
        <h2 className="foot-h" id="sources-title">
          {t('sourcesTitle')}
        </h2>
        {/* Contract section 13 licence and attribution lines: English in every language. */}
        <ul className="foot-list" lang="en">
          <li>
            This product uses the Human Phenotype Ontology (version {HPO_VERSION}). Find out more at{' '}
            <a href="https://hpo.jax.org">https://hpo.jax.org</a>
          </li>
          <li>{MONARCH_ATTRIBUTION}</li>
          <li>{ORPHANET_ATTRIBUTION}</li>
          <li>{CLINICAL_TRIALS_ATTRIBUTION}</li>
          <li>
            {PHENOPACKET_STORE_ATTRIBUTION}
          </li>
        </ul>
        <p className="foot-meta">
          <b lang="en">Built at Sundai</b> · Hackachusetts 2026 · <a href={REPO_URL}>{t('sourceOnGithub')}</a> ·{' '}
          <a href={README_URL}>README</a> · <a href={href}>{t('openDemo')}</a>
        </p>
      </div>
    </footer>
  );
}

export function App() {
  const t = useLandingT();
  useDocumentMeta();
  return (
    <>
      <a className="skip" href="#main">
        {t('skip')}
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
