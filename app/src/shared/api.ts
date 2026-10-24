/**
 * Typed client for the Rare Disease Detective API (docs/CONTRACT.md v0.1).
 *
 * - The app calls only /api/* on its own site root, never third-party APIs.
 * - Client timeouts are the contract's server budgets (section 7) plus a small
 *   margin, so the server's own error or demo fallback can arrive first.
 * - Every call takes an optional AbortSignal (use it to cancel a superseded,
 *   debounced re-rank). An aborted call rejects with code "ABORTED"; callers
 *   normally ignore it (see isAbortError).
 * - Offline-mock fallback: ONLY in development (import.meta.env.DEV) when an
 *   endpoint is unreachable or not built yet (network error while online,
 *   HTTP 404 or 501, or a 2xx that is not JSON, e.g. a dev-server HTML page).
 *   The result then has origin "mock" and the view must show
 *   OFFLINE_MOCK_LABEL. Contract errors (4xx/5xx with the contract error
 *   shape) are thrown as ApiRequestError and never mocked.
 * - Production never falls back to mocks: the same conditions throw a
 *   retryable ApiRequestError (UNREACHABLE or BAD_RESPONSE), so the view shows
 *   its error state with "Try again" (Requirement 11.3). Demo fallback in
 *   production comes from the server (source: "demo", contract 7.4).
 * - Add ?mock=1 to the app URL to force mocks in any build (UI work and demos
 *   without a backend).
 */
import { useSyncExternalStore } from 'react';
import {
  LIMITS,
  type ApiError,
  type BriefResponse,
  type CaseObject,
  type ErrorCode,
  type ExtractRequest,
  type ExtractResponse,
  type HealthResponse,
  type NextQuestionsRequest,
  type NextQuestionsResponse,
  type RankRequest,
  type RankResponse,
  type TermsQuery,
  type TermsResponse,
  type TrialsQuery,
  type TrialsResponse,
} from './contract';
import {
  MockContractError,
  mockBrief,
  mockExtract,
  mockNextQuestions,
  mockRank,
  mockTerms,
  mockTrials,
} from './mocks';

// ---------------------------------------------------------------------------
// Endpoints and timeouts
// ---------------------------------------------------------------------------

export type Endpoint = 'extract' | 'terms' | 'rank' | 'nextQuestions' | 'trials' | 'brief';

export const API_PATHS: Record<Endpoint | 'health', string> = {
  health: '/api/health',
  extract: '/api/extract',
  terms: '/api/terms',
  rank: '/api/rank',
  nextQuestions: '/api/next-questions',
  trials: '/api/trials',
  brief: '/api/brief',
};

/** Server-side budgets from contract sections 7.2 to 7.7. */
export const SERVER_BUDGET_MS: Record<Endpoint, number> = {
  extract: 20_000,
  terms: 2_000,
  rank: 12_000,
  nextQuestions: 5_000,
  trials: 6_000,
  brief: 2_000,
};

const CLIENT_MARGIN_MS = 2_000;
const HEALTH_TIMEOUT_MS = 5_000;

export const CLIENT_TIMEOUT_MS: Record<Endpoint, number> = Object.fromEntries(
  Object.entries(SERVER_BUDGET_MS).map(([k, v]) => [k, v + CLIENT_MARGIN_MS]),
) as Record<Endpoint, number>;

/** Small artificial delay for mocks so loading states are exercised. */
const MOCK_DELAY_MS: Record<Endpoint, number> = {
  extract: 450,
  terms: 120,
  rank: 600,
  nextQuestions: 300,
  trials: 250,
  brief: 200,
};

// ---------------------------------------------------------------------------
// Results and errors
// ---------------------------------------------------------------------------

/** "api": the server answered. "mock": the app's bundled offline mock answered. */
export type DataOrigin = 'api' | 'mock';

export interface ApiResult<T> {
  data: T;
  origin: DataOrigin;
}

export interface RequestOptions {
  signal?: AbortSignal;
  /** Override the default client timeout (ms). */
  timeoutMs?: number;
}

/** Contract error codes plus client-side conditions. */
export type ClientErrorCode = ErrorCode | 'TIMEOUT' | 'ABORTED' | 'OFFLINE' | 'UNREACHABLE' | 'BAD_RESPONSE';

export class ApiRequestError extends Error {
  readonly code: ClientErrorCode;
  /** HTTP status, or null when the request never got an HTTP answer. */
  readonly status: number | null;
  readonly retryable: boolean;
  readonly endpoint: Endpoint | 'health';

  constructor(init: {
    code: ClientErrorCode;
    message: string;
    retryable: boolean;
    status: number | null;
    endpoint: Endpoint | 'health';
  }) {
    super(init.message);
    this.name = 'ApiRequestError';
    this.code = init.code;
    this.status = init.status;
    this.retryable = init.retryable;
    this.endpoint = init.endpoint;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.code === 'ABORTED';
}

/** Normalise anything thrown into an ApiRequestError for display. */
export function toApiRequestError(error: unknown, endpoint: Endpoint | 'health'): ApiRequestError {
  if (error instanceof ApiRequestError) return error;
  return new ApiRequestError({
    code: 'INTERNAL',
    message: 'Something went wrong in the app. Your work is kept; try again.',
    retryable: true,
    status: null,
    endpoint,
  });
}

const CLIENT_MESSAGES = {
  TIMEOUT: 'The server did not answer in time. Your notes and terms are kept; try again.',
  OFFLINE: 'You are offline. Your case is saved in this browser; reconnect to continue.',
  UNREACHABLE: 'The server could not be reached. Your notes and terms are kept; try again.',
  BAD_RESPONSE: 'The server sent an answer the app could not read. Your work is kept; try again.',
  ABORTED: 'The request was cancelled.',
} as const;

function clientError(
  code: keyof typeof CLIENT_MESSAGES,
  endpoint: Endpoint | 'health',
  status: number | null = null,
): ApiRequestError {
  return new ApiRequestError({
    code,
    message: CLIENT_MESSAGES[code],
    retryable: code !== 'ABORTED',
    status,
    endpoint,
  });
}

function invalid(endpoint: Endpoint, message: string, code: ErrorCode = 'INVALID_REQUEST'): ApiRequestError {
  return new ApiRequestError({ code, message, retryable: false, status: null, endpoint });
}

function isContractError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false;
  const error = (value as { error?: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

// ---------------------------------------------------------------------------
// Offline-mock log (drives the global "Demo data (offline mock)" label)
// ---------------------------------------------------------------------------

type MockLog = Readonly<Partial<Record<Endpoint, DataOrigin>>>;
let mockLog: MockLog = {};
const listeners = new Set<() => void>();

function record(endpoint: Endpoint, origin: DataOrigin) {
  if (mockLog[endpoint] === origin) return;
  mockLog = { ...mockLog, [endpoint]: origin };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Endpoints whose latest answer in this session came from offline mocks. */
export function useOfflineMockEndpoints(): Endpoint[] {
  const log = useSyncExternalStore(subscribe, () => mockLog);
  return (Object.keys(log) as Endpoint[]).filter((key) => log[key] === 'mock');
}

function mocksForced(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('mock') === '1';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

interface RequestSpec<T> {
  endpoint: Endpoint;
  method: 'GET' | 'POST';
  url: string;
  body?: unknown;
  mock: () => T;
  /** Minimal shape check on a 2xx JSON body. */
  isValid: (data: unknown) => boolean;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

async function answerWithMock<T>(spec: RequestSpec<T>, signal?: AbortSignal): Promise<ApiResult<T>> {
  try {
    await wait(MOCK_DELAY_MS[spec.endpoint], signal);
  } catch {
    throw clientError('ABORTED', spec.endpoint);
  }
  let data: T;
  try {
    data = spec.mock();
  } catch (error) {
    if (error instanceof MockContractError) {
      throw new ApiRequestError({
        code: error.error.code,
        message: error.error.message,
        retryable: error.error.retryable,
        status: error.status,
        endpoint: spec.endpoint,
      });
    }
    throw error;
  }
  record(spec.endpoint, 'mock');
  return { data, origin: 'mock' };
}

/** Automatic mock fallback is a development aid only (?mock=1 is handled earlier). */
const AUTO_MOCK_FALLBACK = import.meta.env.DEV;

async function request<T>(spec: RequestSpec<T>, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { endpoint } = spec;
  const { signal } = options;
  if (signal?.aborted) throw clientError('ABORTED', endpoint);
  if (mocksForced()) return answerWithMock(spec, signal);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw clientError('OFFLINE', endpoint);

  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? CLIENT_TIMEOUT_MS[endpoint]);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  const stop = () => {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  };
  const abortReason = () => (timedOut ? clientError('TIMEOUT', endpoint) : clientError('ABORTED', endpoint));

  let response: Response;
  try {
    response = await fetch(spec.url, {
      method: spec.method,
      headers: {
        Accept: 'application/json',
        ...(spec.body !== undefined ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
      },
      body: spec.body !== undefined ? JSON.stringify(spec.body) : undefined,
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    stop();
    if (controller.signal.aborted) throw abortReason();
    // Network error while the browser says it is online: endpoint unreachable.
    if (AUTO_MOCK_FALLBACK) return answerWithMock(spec, signal);
    throw clientError('UNREACHABLE', endpoint);
  }

  const isJson = (response.headers.get('content-type') ?? '').includes('application/json');

  // Not built yet (404/501) or a non-API HTML answer: offline mock in DEV only.
  const notBuilt = response.status === 404 || response.status === 501;
  if (notBuilt || (response.ok && !isJson)) {
    stop();
    if (AUTO_MOCK_FALLBACK) return answerWithMock(spec, signal);
    throw clientError(notBuilt ? 'UNREACHABLE' : 'BAD_RESPONSE', endpoint, response.status);
  }

  let body: unknown;
  try {
    body = isJson ? await response.json() : undefined;
  } catch {
    stop();
    if (controller.signal.aborted) throw abortReason();
    throw clientError('BAD_RESPONSE', endpoint, response.status);
  }
  stop();

  if (!response.ok) {
    if (isContractError(body)) {
      throw new ApiRequestError({
        code: body.error.code,
        message: body.error.message,
        retryable: Boolean(body.error.retryable),
        status: response.status,
        endpoint,
      });
    }
    throw clientError('BAD_RESPONSE', endpoint, response.status);
  }

  if (!spec.isValid(body)) throw clientError('BAD_RESPONSE', endpoint, response.status);
  record(endpoint, 'api');
  return { data: body as T, origin: 'api' };
}

function hasArray(key: string) {
  return (data: unknown) =>
    typeof data === 'object' && data !== null && Array.isArray((data as Record<string, unknown>)[key]);
}

// ---------------------------------------------------------------------------
// Endpoint functions
// ---------------------------------------------------------------------------

/** POST /api/extract. Send caseId with a demo narrative to get its prepared extraction. */
export function extract(req: ExtractRequest, options?: RequestOptions): Promise<ApiResult<ExtractResponse>> {
  if (req.text.trim().length === 0) {
    return Promise.reject(invalid('extract', 'Please add some text first.'));
  }
  if (req.text.length > LIMITS.notesMaxChars) {
    return Promise.reject(
      invalid('extract', 'Text is too long. The limit is 8,000 characters.', 'TEXT_TOO_LONG'),
    );
  }
  return request(
    {
      endpoint: 'extract',
      method: 'POST',
      url: API_PATHS.extract,
      body: req,
      mock: () => mockExtract(req),
      isValid: hasArray('terms'),
    },
    options,
  );
}

/** GET /api/terms?q=&limit= for adding a term by hand. */
export function searchTerms(query: TermsQuery, options?: RequestOptions): Promise<ApiResult<TermsResponse>> {
  const q = query.q.trim();
  if (q.length < LIMITS.termsQueryMin || q.length > LIMITS.termsQueryMax) {
    return Promise.reject(invalid('terms', 'Type between 2 and 100 characters to search.'));
  }
  const params = new URLSearchParams({ q });
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  return request(
    {
      endpoint: 'terms',
      method: 'GET',
      url: `${API_PATHS.terms}?${params.toString()}`,
      mock: () => mockTerms({ ...query, q }),
      isValid: hasArray('terms'),
    },
    options,
  );
}

/** POST /api/rank. Pass a signal and abort it when a newer re-rank starts. */
export function rank(req: RankRequest, options?: RequestOptions): Promise<ApiResult<RankResponse>> {
  if (req.observed.length === 0) {
    return Promise.reject(invalid('rank', 'Keep at least one feature as present to look for matches.'));
  }
  return request(
    {
      endpoint: 'rank',
      method: 'POST',
      url: API_PATHS.rank,
      body: req,
      mock: () => mockRank(req),
      isValid: hasArray('candidates'),
    },
    options,
  );
}

/** POST /api/next-questions with the top 2 to 5 candidate ids. */
export function nextQuestions(
  req: NextQuestionsRequest,
  options?: RequestOptions,
): Promise<ApiResult<NextQuestionsResponse>> {
  if (req.candidates.length < LIMITS.questionsCandidatesMin) {
    return Promise.reject(invalid('nextQuestions', 'At least two possible matches are needed to compare.'));
  }
  return request(
    {
      endpoint: 'nextQuestions',
      method: 'POST',
      url: API_PATHS.nextQuestions,
      body: { ...req, candidates: req.candidates.slice(0, LIMITS.questionsCandidatesMax) },
      mock: () => mockNextQuestions(req),
      isValid: hasArray('questions'),
    },
    options,
  );
}

/** GET /api/trials?condition=&ids= (recruiting studies for one candidate). */
export function trials(query: TrialsQuery, options?: RequestOptions): Promise<ApiResult<TrialsResponse>> {
  const params = new URLSearchParams({ condition: query.condition });
  if (query.ids && query.ids.length > 0) params.set('ids', query.ids.join(','));
  return request(
    {
      endpoint: 'trials',
      method: 'GET',
      url: `${API_PATHS.trials}?${params.toString()}`,
      mock: () => mockTrials(query),
      isValid: hasArray('studies'),
    },
    options,
  );
}

/** POST /api/brief with the whole case object. */
export function brief(caseObject: CaseObject, options?: RequestOptions): Promise<ApiResult<BriefResponse>> {
  return request(
    {
      endpoint: 'brief',
      method: 'POST',
      url: API_PATHS.brief,
      body: { case: caseObject },
      mock: () => mockBrief(caseObject, new Date()),
      isValid: (data) => typeof data === 'object' && data !== null && 'brief' in data && 'phenopacket' in data,
    },
    options,
  );
}

/** GET /api/health. No mock: a failed check is reported as an error. */
export async function health(options: RequestOptions = {}): Promise<HealthResponse> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), options.timeoutMs ?? HEALTH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const res = await fetch(API_PATHS.health, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) {
      throw clientError('BAD_RESPONSE', 'health', res.status);
    }
    return (await res.json()) as HealthResponse;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw controller.signal.aborted ? clientError('TIMEOUT', 'health') : clientError('OFFLINE', 'health');
  } finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

export const api = { extract, searchTerms, rank, nextQuestions, trials, brief, health } as const;
