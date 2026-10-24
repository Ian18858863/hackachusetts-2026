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
import { FamilyQuestions } from './features/questions/FamilyQuestions';
import { useDemoParam } from './lib/useDemoParam';
import { useHashRoute } from './lib/useHashRoute';
import { AudienceProvider, useAudience } from './shared/audience';
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

/**
 * Family mode (T30a) never renders anything from the ranking: no matches
 * step (it redirects to questions), no trials, and its own questions view.
 * BriefStep picks the family brief by itself.
 */
const FAMILY_STEP_VIEWS: Record<Exclude<StepId, 'matches'>, ComponentType[]> = {
  notes: [IntakeStep],
  features: [ReviewStep],
  questions: [FamilyQuestions],
  brief: [BriefStep],
};

export function App() {
  return (
    <I18nProvider>
      <AudienceProvider>
        <CaseProvider>
          <AnnouncerProvider>
            <Shell />
          </AnnouncerProvider>
        </CaseProvider>
      </AudienceProvider>
    </I18nProvider>
  );
}

function Shell() {
  useDemoParam();
  const t = useT(shell);
  const route = useHashRoute();
  const isPreview = route === 'primitives';
  // Unknown hashes fall back to the first step.
  const { isFamily } = useAudience();
  const routed = isPreview ? null : (stepFromRoute(route) ?? 'notes');
  // Family mode has no matches step: show questions and fix the hash.
  const step = isFamily && routed === 'matches' ? 'questions' : routed;
  const viewKey = isPreview ? 'primitives' : step;
  const views = step === null ? [] : isFamily && step !== 'matches' ? FAMILY_STEP_VIEWS[step] : STEP_VIEWS[step];

  useEffect(() => {
    if (isFamily && routed === 'matches') window.location.replace('#/questions');
  }, [isFamily, routed]);

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
                {views.map((View, i) => (
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
