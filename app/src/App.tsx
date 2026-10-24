import { useEffect, useRef, type ComponentType, type MouseEvent } from 'react';
import styles from './App.module.css';
import { PrimitivesPreview } from './components/shell/PrimitivesPreview';
import { StepHeader } from './components/shell/StepHeader';
import { TopBar } from './components/shell/TopBar';
import { BriefStep } from './features/brief';
import { IntakeStep } from './features/intake';
import { QuestionsStep } from './features/questions';
import { RankingStep } from './features/ranking';
import { ReviewStep } from './features/review';
import { TrialsPanel } from './features/trials';
import { useDemoParam } from './lib/useDemoParam';
import { useHashRoute } from './lib/useHashRoute';
import { I18nProvider, useT } from './shared/i18n';
import shell from './shared/i18n/messages/shell';
import { stepFromRoute, type StepId } from './shared/steps';
import { CaseProvider } from './shared/store';
import { AnnouncerProvider, AppFooter, OfflineNotice } from './shared/ui';

/**
 * What each step renders. Feature folders own these components; the shell
 * owns the frame around them (top bar, step header with h1 and labels,
 * safety line, footer). Trials sit inside the matches step.
 */
const STEP_VIEWS: Record<StepId, ComponentType[]> = {
  notes: [IntakeStep],
  features: [ReviewStep],
  matches: [RankingStep, TrialsPanel],
  questions: [QuestionsStep],
  brief: [BriefStep],
};

export function App() {
  return (
    <I18nProvider>
      <CaseProvider>
        <AnnouncerProvider>
          <Shell />
        </AnnouncerProvider>
      </CaseProvider>
    </I18nProvider>
  );
}

function Shell() {
  useDemoParam();
  const t = useT(shell);
  const route = useHashRoute();
  const isPreview = route === 'primitives';
  // Unknown hashes fall back to the first step.
  const step = isPreview ? null : (stepFromRoute(route) ?? 'notes');
  const viewKey = isPreview ? 'primitives' : step;

  const mainRef = useRef<HTMLElement>(null);
  const previousKey = useRef(viewKey);

  // On view change, move focus to the main region so keyboard and screen
  // reader users start at the new content (not on first load).
  useEffect(() => {
    if (previousKey.current === viewKey) return;
    previousKey.current = viewKey;
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [viewKey]);

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main" onClick={skipToMain}>
        {t('skipToContent')}
      </a>
      <TopBar current={step} />
      <OfflineNotice />
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        {/* Keyed so a view change dissolves in place. */}
        <div key={viewKey} className={styles.view}>
          {step ? (
            <>
              <StepHeader step={step} />
              <div className={styles.body}>
                {STEP_VIEWS[step].map((View, i) => (
                  <View key={i} />
                ))}
              </div>
            </>
          ) : (
            <PrimitivesPreview />
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

// The skip link must not change the hash, which drives routing.
function skipToMain(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  document.getElementById('main')?.focus();
}
