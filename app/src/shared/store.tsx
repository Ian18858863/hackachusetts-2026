/**
 * The case store: one CaseObject (docs/CONTRACT.md section 8) for the whole app,
 * held in React context with a reducer and saved to localStorage under
 * rdd.case.v0.1. Nothing is sent to a server except through shared/api.ts.
 *
 * App-only state that is not part of the contract's case object (where each
 * payload came from, extraction warnings, request status) lives in `meta`
 * and `extractStatus`, saved separately under rdd.case.v0.1.meta.
 *
 * Feature code reads with useCase() and writes with useCaseActions(). The
 * selectors at the bottom compute ids for /api/rank and the stale flag.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { extract, isAbortError, toApiRequestError, type ApiRequestError, type DataOrigin } from './api';
import {
  CASE_STORAGE_KEY,
  CONTRACT_VERSION,
  LIMITS,
  type CaseObject,
  type CaseRanking,
  type CaseTerm,
  type DataVersions,
  type DiseaseId,
  type ExtractResponse,
  type HpoId,
  type Question,
  type RankResponse,
  type Source,
  type TermRef,
  type TermStatus,
} from './contract';
import { findDemoCase } from './mocks';
import { goToStep as navigateToStep, type StepId } from './steps';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const META_STORAGE_KEY = `${CASE_STORAGE_KEY}.meta`;

export interface CaseMeta {
  /** Extraction details that the case object does not keep. */
  extraction: {
    warnings: string[];
    model: string;
    source: Source;
    origin: DataOrigin;
    dataVersions: DataVersions;
  } | null;
  rankingOrigin: DataOrigin | null;
  questions: { origin: DataOrigin; source: Source; dataVersions: DataVersions } | null;
  /** Latest HPO release seen in any response, for the footer attribution. */
  hpoVersion: string | null;
}

export type RequestStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; error: ApiRequestError };

interface StoreState {
  caseObject: CaseObject;
  meta: CaseMeta;
  extractStatus: RequestStatus;
}

const EMPTY_META: CaseMeta = { extraction: null, rankingOrigin: null, questions: null, hpoVersion: null };

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function createEmptyCase(): CaseObject {
  const now = nowIso();
  return {
    version: CONTRACT_VERSION,
    caseId: randomId(),
    demo: null,
    notes: '',
    terms: [],
    lastRanking: null,
    questions: [],
    selectedCandidateId: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Persistence (localStorage can be missing, full or blocked: never throw)
// ---------------------------------------------------------------------------

function isCaseObject(value: unknown): value is CaseObject {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<CaseObject>;
  return (
    v.version === CONTRACT_VERSION &&
    typeof v.caseId === 'string' &&
    typeof v.notes === 'string' &&
    Array.isArray(v.terms) &&
    Array.isArray(v.questions)
  );
}

function loadInitialState(): StoreState {
  let caseObject = createEmptyCase();
  let meta = EMPTY_META;
  try {
    const stored = JSON.parse(localStorage.getItem(CASE_STORAGE_KEY) ?? 'null') as unknown;
    if (isCaseObject(stored)) {
      caseObject = stored;
      const storedMeta = JSON.parse(localStorage.getItem(META_STORAGE_KEY) ?? 'null') as unknown;
      if (typeof storedMeta === 'object' && storedMeta !== null) meta = { ...EMPTY_META, ...storedMeta };
    }
  } catch {
    // Unreadable or blocked storage: start a fresh case.
  }
  return { caseObject, meta, extractStatus: { state: 'idle' } };
}

function persist(state: StoreState) {
  try {
    localStorage.setItem(CASE_STORAGE_KEY, JSON.stringify(state.caseObject));
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(state.meta));
  } catch {
    // Storage full or unavailable (private mode): the case lasts for this visit.
  }
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: 'reset' }
  | { type: 'loadDemo'; caseId: string }
  | { type: 'setNotes'; notes: string }
  | { type: 'setExtraction'; response: ExtractResponse; origin: DataOrigin }
  | { type: 'setTermStatus'; hpoId: HpoId; status: TermStatus }
  | { type: 'addManualTerm'; term: TermRef; status: Exclude<TermStatus, 'removed'> }
  | { type: 'setRanking'; ranking: CaseRanking; origin: DataOrigin }
  | { type: 'setQuestions'; questions: Question[]; origin: DataOrigin; source: Source; dataVersions: DataVersions }
  | { type: 'selectCandidate'; diseaseId: DiseaseId | null }
  | { type: 'extractStatus'; status: RequestStatus };

function touch(c: CaseObject, patch: Partial<CaseObject>): CaseObject {
  return { ...c, ...patch, updatedAt: nowIso() };
}

function reducer(state: StoreState, action: Action): StoreState {
  const c = state.caseObject;
  switch (action.type) {
    case 'reset':
      return { caseObject: createEmptyCase(), meta: EMPTY_META, extractStatus: { state: 'idle' } };

    case 'loadDemo': {
      const demo = findDemoCase(action.caseId);
      if (!demo) return state;
      return {
        caseObject: {
          ...createEmptyCase(),
          demo: { caseId: demo.caseId, sourcePhenopacketId: demo.sourcePhenopacketId, label: demo.label },
          notes: demo.narrative,
        },
        meta: EMPTY_META,
        extractStatus: { state: 'idle' },
      };
    }

    case 'setNotes': {
      // Keep the full text, even over the limit: intake shows "Text is too long"
      // and blocks submit (Requirement 1.2); api.extract also refuses it.
      const notes = action.notes;
      // Edited text is no longer the bundled narrative, so it stops being a demo case.
      const demoText = findDemoCase(c.demo?.caseId)?.narrative;
      const demo = c.demo && demoText === notes ? c.demo : null;
      return { ...state, caseObject: touch(c, { notes, demo }) };
    }

    case 'setExtraction': {
      const { response, origin } = action;
      const now = nowIso();
      const provenance = response.source === 'demo' && c.demo ? 'demo' : 'llm';
      const extracted: CaseTerm[] = response.terms.map((t) => ({
        hpoId: t.hpoId,
        label: t.label,
        status: t.negated ? 'excluded' : 'observed',
        provenance,
        quote: t.quote,
        start: t.start,
        end: t.end,
        confidence: t.confidence,
        grounding: t.grounding,
        updatedAt: now,
      }));
      // Manual terms survive a new extraction; the user's own entry wins on a clash.
      const manual = c.terms.filter((t) => t.provenance === 'manual');
      const manualIds = new Set(manual.map((t) => t.hpoId));
      // A re-extracted term keeps the status the user last gave the same hpoId
      // (observed, excluded or removed), so corrections are not lost (Requirement 2.6).
      const previous = new Map(c.terms.map((t) => [t.hpoId, t] as const));
      const terms = [
        ...extracted
          .filter((t) => !manualIds.has(t.hpoId))
          .map((t) => {
            const before = previous.get(t.hpoId);
            return before ? { ...t, status: before.status } : t;
          }),
        ...manual,
      ];
      return {
        caseObject: touch(c, { terms }),
        meta: {
          ...state.meta,
          extraction: {
            warnings: response.warnings,
            model: response.model,
            source: response.source,
            origin,
            dataVersions: response.dataVersions,
          },
          hpoVersion: response.dataVersions.hpo ?? state.meta.hpoVersion,
        },
        extractStatus: { state: 'idle' },
      };
    }

    case 'setTermStatus': {
      let changed = false;
      const terms = c.terms.map((t) => {
        if (t.hpoId !== action.hpoId || t.status === action.status) return t;
        changed = true;
        return { ...t, status: action.status, updatedAt: nowIso() };
      });
      return changed ? { ...state, caseObject: touch(c, { terms }) } : state;
    }

    case 'addManualTerm': {
      const existing = c.terms.find((t) => t.hpoId === action.term.id);
      const terms = existing
        ? c.terms.map((t) => (t === existing ? { ...t, status: action.status, updatedAt: nowIso() } : t))
        : [
            ...c.terms,
            {
              hpoId: action.term.id,
              label: action.term.label,
              status: action.status,
              provenance: 'manual' as const,
              updatedAt: nowIso(),
            },
          ];
      return { ...state, caseObject: touch(c, { terms }) };
    }

    case 'setRanking': {
      const ids = action.ranking.response.candidates.map((x) => x.diseaseId);
      const selected =
        c.selectedCandidateId && ids.includes(c.selectedCandidateId) ? c.selectedCandidateId : (ids[0] ?? null);
      return {
        ...state,
        caseObject: touch(c, { lastRanking: action.ranking, selectedCandidateId: selected }),
        meta: {
          ...state.meta,
          rankingOrigin: action.origin,
          hpoVersion: action.ranking.response.dataVersions.hpo ?? state.meta.hpoVersion,
        },
      };
    }

    case 'setQuestions':
      return {
        ...state,
        caseObject: touch(c, { questions: action.questions }),
        meta: {
          ...state.meta,
          questions: { origin: action.origin, source: action.source, dataVersions: action.dataVersions },
          hpoVersion: action.dataVersions.hpo ?? state.meta.hpoVersion,
        },
      };

    case 'selectCandidate':
      return c.selectedCandidateId === action.diseaseId
        ? state
        : { ...state, caseObject: touch(c, { selectedCandidateId: action.diseaseId }) };

    case 'extractStatus':
      return { ...state, extractStatus: action.status };
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface CaseActions {
  /** Replace the case with a bundled demo case and fetch its prepared extraction. */
  loadDemoCase(caseId: string): Promise<void>;
  setNotes(notes: string): void;
  /** POST /api/extract for the current notes (or the given text) and store the terms. */
  runExtraction(text?: string): Promise<void>;
  setExtraction(response: ExtractResponse, origin: DataOrigin): void;
  setTermStatus(hpoId: HpoId, status: TermStatus): void;
  addManualTerm(term: TermRef, status?: Exclude<TermStatus, 'removed'>): void;
  setRanking(request: CaseRanking['request'], response: RankResponse, origin: DataOrigin): void;
  setQuestions(
    questions: Question[],
    info: { origin: DataOrigin; source: Source; dataVersions: DataVersions },
  ): void;
  selectCandidate(diseaseId: DiseaseId | null): void;
  goToStep(step: StepId): void;
  /** Start a new, empty case. */
  reset(): void;
}

const StateContext = createContext<StoreState | null>(null);
const ActionsContext = createContext<CaseActions | null>(null);

export function CaseProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const stateRef = useRef(state);
  const extractController = useRef<AbortController | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Save only when the case or its meta change, not on request-status changes.
  const { caseObject, meta } = state;
  useEffect(() => persist({ caseObject, meta, extractStatus: { state: 'idle' } }), [caseObject, meta]);

  const runExtractionFor = useCallback(async (text: string, caseId: string | undefined) => {
    extractController.current?.abort();
    const controller = new AbortController();
    extractController.current = controller;
    dispatch({ type: 'extractStatus', status: { state: 'loading' } });
    try {
      const result = await extract({ text, ...(caseId ? { caseId } : {}) }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      dispatch({ type: 'setExtraction', response: result.data, origin: result.origin });
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      dispatch({ type: 'extractStatus', status: { state: 'error', error: toApiRequestError(error, 'extract') } });
    } finally {
      if (extractController.current === controller) extractController.current = null;
    }
  }, []);

  const actions = useMemo<CaseActions>(
    () => ({
      async loadDemoCase(caseId) {
        const demo = findDemoCase(caseId);
        if (!demo) return;
        dispatch({ type: 'loadDemo', caseId });
        await runExtractionFor(demo.narrative, demo.caseId);
      },
      setNotes(notes) {
        dispatch({ type: 'setNotes', notes });
      },
      async runExtraction(text) {
        const current = stateRef.current.caseObject;
        const body = text ?? current.notes;
        const demo = findDemoCase(current.demo?.caseId);
        await runExtractionFor(body, demo && demo.narrative === body ? demo.caseId : undefined);
      },
      setExtraction(response, origin) {
        dispatch({ type: 'setExtraction', response, origin });
      },
      setTermStatus(hpoId, status) {
        dispatch({ type: 'setTermStatus', hpoId, status });
      },
      addManualTerm(term, status = 'observed') {
        dispatch({ type: 'addManualTerm', term, status });
      },
      setRanking(request, response, origin) {
        dispatch({ type: 'setRanking', ranking: { request, response, rankedAt: nowIso() }, origin });
      },
      setQuestions(questions, info) {
        dispatch({ type: 'setQuestions', questions, ...info });
      },
      selectCandidate(diseaseId) {
        dispatch({ type: 'selectCandidate', diseaseId });
      },
      goToStep(step) {
        navigateToStep(step);
      },
      reset() {
        extractController.current?.abort();
        dispatch({ type: 'reset' });
      },
    }),
    [runExtractionFor],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** Current case, app-only meta and extraction status. */
export function useCase(): StoreState {
  const value = useContext(StateContext);
  if (!value) throw new Error('useCase must be used inside <CaseProvider>');
  return value;
}

/** Stable action functions; safe in effect dependency lists. */
export function useCaseActions(): CaseActions {
  const value = useContext(ActionsContext);
  if (!value) throw new Error('useCaseActions must be used inside <CaseProvider>');
  return value;
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

function sortedIds(c: CaseObject, status: TermStatus): HpoId[] {
  return [...new Set(c.terms.filter((t) => t.status === status).map((t) => t.hpoId))].sort();
}

export function observedIds(c: CaseObject): HpoId[] {
  return sortedIds(c, 'observed');
}

export function excludedIds(c: CaseObject): HpoId[] {
  return sortedIds(c, 'excluded');
}

/** The /api/rank body for the current terms: sorted, deduplicated (contract 7.4 step 1). */
export function currentRankRequest(c: CaseObject, limit: number = LIMITS.rankDefaultLimit) {
  return { observed: observedIds(c), excluded: excludedIds(c), limit };
}

/** True when the observed or excluded set changed since the last ranking. */
export function isRankingStale(c: CaseObject): boolean {
  if (!c.lastRanking) return false;
  const now = currentRankRequest(c, c.lastRanking.request.limit);
  const then = c.lastRanking.request;
  const same = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
  return !same(now.observed, then.observed) || !same(now.excluded, then.excluded);
}

export function termCounts(c: CaseObject) {
  let observed = 0;
  let excluded = 0;
  let removed = 0;
  for (const t of c.terms) {
    if (t.status === 'observed') observed++;
    else if (t.status === 'excluded') excluded++;
    else removed++;
  }
  return { observed, excluded, removed };
}
