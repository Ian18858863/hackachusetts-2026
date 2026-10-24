import { useEffect, useLayoutEffect, useRef, type CSSProperties, type PointerEvent } from 'react';
import {
  BENCHMARK_URL,
  CLINICAL_TRIALS_ATTRIBUTION,
  DEMO_LABEL,
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
} from './content';
import { LOCALES, LOCALE_META, useLocale, useT } from './i18n';
import { Dropdown } from './ui/Dropdown';
import { headingText, useFitHeading } from './ui/useFitHeading';
import commonMessages from './i18n/messages/common.ts';
import landingMessages from './i18n/messages/landing.ts';

function useLandingT() {
  return useT(landingMessages);
}

function useDemoHref(): string {
  return demoHref(useLocale().locale);
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

const LANGUAGE_OPTIONS = LOCALES.map((l) => ({ value: l, label: LOCALE_META[l].nativeName, lang: LOCALE_META[l].htmlLang }));

/** In-page language dropdown (T35): button + listbox, same component as the app's. */
function LanguageSelect() {
  const { locale, setLocale } = useLocale();
  const tc = useT(commonMessages);
  return (
    <Dropdown
      className="lang"
      value={locale}
      options={LANGUAGE_OPTIONS}
      onChange={setLocale}
      label={tc('languageLabel')}
      testId="language-switcher"
    />
  );
}

/**
 * Ink hover (T35): the fill spreads from where the pointer enters and drains
 * toward where it leaves (design lessons section 4). CSS reads --ink-x / --ink-y.
 */
function inkAt(event: PointerEvent<HTMLElement>) {
  const el = event.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--ink-x', `${event.clientX - r.left}px`);
  el.style.setProperty('--ink-y', `${event.clientY - r.top}px`);
}
const ink = { onPointerEnter: inkAt, onPointerLeave: inkAt };

/** Splits a heading into characters that come into focus one by one (blur 16px to 0, 1.3 s). */
function BlurTitle({ text }: { text: string }) {
  const words = text.split(/(\s+)/);
  const count = text.replace(/\s+/g, '').length;
  const stagger = Math.min(0.06, 0.9 / Math.max(1, count));
  let i = 0;
  return (
    <>
      <span aria-hidden="true">
        {words.map((word, w) =>
          /^\s+$/.test(word) ? (
            ' '
          ) : /[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(word) ? (
            // Han, kana and hangul may break between any two characters, so they are not grouped.
            [...word].map((ch) => (
              <span className="bt-c" key={i} style={{ '--d': `${(i++ * stagger).toFixed(3)}s` } as CSSProperties}>
                {ch}
              </span>
            ))
          ) : (
            <span className="bt-w" key={w}>
              {[...word].map((ch) => (
                <span className="bt-c" key={i} style={{ '--d': `${(i++ * stagger).toFixed(3)}s` } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
          ),
        )}
      </span>
    </>
  );
}

/**
 * The stat row's numbers share one size: the largest at which every number
 * still fits its column on one line (never below 28px, then they may wrap).
 */
function useSharedStatSize(key: unknown) {
  const ref = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    let lastWidth = -1;
    const fit = () => {
      lastWidth = list.clientWidth;
      const values = [...list.querySelectorAll<HTMLElement>('.stat-value')];
      list.style.removeProperty('--stat-size');
      const base = values[0] ? parseFloat(getComputedStyle(values[0]).fontSize) : 0;
      let ratio = 1;
      for (const v of values) if (v.scrollWidth > v.clientWidth) ratio = Math.min(ratio, v.clientWidth / v.scrollWidth);
      if (ratio < 1) list.style.setProperty('--stat-size', `${Math.max(28, Math.floor(base * ratio * 0.98))}px`);
    };
    fit();
    const ro = new ResizeObserver(() => list.clientWidth !== lastWidth && fit());
    ro.observe(list);
    let alive = true;
    document.fonts?.ready.then(() => alive && fit());
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [key]);
  return ref;
}

/** A section heading kept on one line (auto-shrink), without trailing punctuation. */
function H2({ id, text }: { id: string; text: string }) {
  const clean = headingText(text);
  const ref = useFitHeading<HTMLHeadingElement>(clean);
  return (
    <h2 ref={ref} id={id}>
      {clean}
    </h2>
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
          <a className="btn btn-top" href={href} aria-label={t('openDemo')} {...ink}>
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

const STAT_KEYS = [
  ['stat2Value', 'stat2Label', 1],
  ['stat3Value', 'stat3Label', 2],
  ['stat1Value', 'stat1Label', 0],
] as const;

/**
 * First screen (T35): function first. The action (demo case, family view) and
 * the cited numbers, nothing else. The proof screenshot follows in #problem.
 */
function Hero() {
  const t = useLandingT();
  const tc = useT(commonMessages);
  const href = useDemoHref();
  const title = headingText(t('heroTitle'));
  const titleRef = useFitHeading<HTMLHeadingElement>(title, { min: 30, phoneRatio: 0.7 });
  const statsRef = useSharedStatSize(t('stat1Value'));
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero-in">
        <p className="kicker">
          <span className="kicker-dot" aria-hidden="true" />
          <b>{t('kickerLead')}</b>
          {t('kickerRest')}
        </p>
        <h1 id="hero-title" ref={titleRef} aria-label={title}>
          <BlurTitle text={title} />
        </h1>
        <p className="lede">{t('heroLede')}</p>
        <div className="actions">
          <a className="btn btn-lg btn-primary" href={href} {...ink}>
            {t('tryDemo')}
            <span className="arrow" aria-hidden="true" />
          </a>
          <a className="btn btn-lg btn-ghost" href={`${href}&audience=family`} {...ink}>
            {t('forFamilies')}
          </a>
        </div>
        <p className="safety">
          <b>{tc('disclaimerLead')}</b>
          {t('heroSafetyRest')}
        </p>
        <p className="demo-note">{t('demoNote')}</p>
        <ul className="stats" ref={statsRef}>
          {STAT_KEYS.map(([valueKey, labelKey, citeIndex]) => {
            const cite = STAT_CITES[citeIndex]!;
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

/** The gap between plain words and ontology terms, and the proof that the app closes it. */
function Problem() {
  const t = useLandingT();
  const tc = useT(commonMessages);
  const { locale } = useLocale();
  return (
    <section className="band" id="problem" aria-labelledby="problem-title">
      <div className="wrap">
        <H2 id="problem-title" text={t('problemTitle')} />
        <p className="dek">{t('problemDek')}</p>
        <figure className="proof">
          <div className="proof-frame">
            <img
              src="/proof-matches-demo-npc1.webp"
              width={657}
              height={600}
              alt={t('proofAlt')}
              decoding="async"
              loading="lazy"
            />
          </div>
          <figcaption>
            {t('proofCaption')}
            {locale === 'zh' || locale === 'ja' ? '' : ' '}
            {DEMO_LABEL}.
            {locale !== 'en' && (
              <>
                {' '}
                <span className="terms-note">{tc('medicalTermsNote')}</span>
              </>
            )}
          </figcaption>
        </figure>
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
        <H2 id="how-title" text={t('howTitle')} />
        <p className="dek">{t('howDek')}</p>
        <div className="how">
          <ol className="steps">
            {STEP_KEYS.map(([titleKey, bodyKey], i) => (
              <li className="step" key={titleKey}>
                <span className="step-n" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3>{t(titleKey)}</h3>
                  <p>{t(bodyKey)}</p>
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
        <H2 id="evidence-title" text={t('evidenceTitle')} />
        <p className="dek">{t('evidenceDek')}</p>
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
          <H2 id="closing-title" text={t('closingTitle')} />
          <p className="dek">{t('closingDek')}</p>
        </div>
        <a className="btn btn-lg btn-primary" href={href} {...ink}>
          {t('tryDemo')}
          <span className="arrow" aria-hidden="true" />
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
            {DEMO_LABEL}. {PHENOPACKET_STORE_ATTRIBUTION}
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
