// Shared response helpers for Pages Functions (docs/CONTRACT.md section 4).
//
// - JSON bodies with the contract version and `Content-Type: application/json; charset=utf-8`.
// - One error shape: { version, error: { code, message, retryable } } with the
//   HTTP status from the contract table.
// - Engine errors (engine/errors.ts) mapped to that shape.
//
// Messages are plain English and safe to show to the user. They never contain
// note text, upstream bodies or stack traces.

import { InvalidInput, UpstreamError, UpstreamTimeout } from "../../engine/index";
import type { ApiError, ContractVersion, ErrorCode, UpstreamName } from "../../engine/index";

export const CONTRACT_VERSION: ContractVersion = "0.1";

/** Minimal Pages Functions context; only what our handlers use. */
export interface PagesContext<Env> {
  request: Request;
  env: Env;
  waitUntil(promise: Promise<unknown>): void;
}

const BASE_HEADERS: Readonly<Record<string, string>> = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, "Cache-Control": "no-store", ...headers },
  });
}

/** Status and retryable flag for every contract error code. */
const ERROR_TABLE: Readonly<Record<ErrorCode, { status: number; retryable: boolean }>> = {
  INVALID_REQUEST: { status: 400, retryable: false },
  METHOD_NOT_ALLOWED: { status: 405, retryable: false },
  TEXT_TOO_LONG: { status: 413, retryable: false },
  NO_TERMS_FOUND: { status: 422, retryable: false },
  RATE_LIMITED: { status: 429, retryable: true },
  UPSTREAM_ERROR: { status: 502, retryable: true },
  LLM_UNAVAILABLE: { status: 503, retryable: false },
  UPSTREAM_TIMEOUT: { status: 504, retryable: true },
  INTERNAL: { status: 500, retryable: true },
};

export function apiError(code: ErrorCode, message: string, headers: Record<string, string> = {}): Response {
  const { status, retryable } = ERROR_TABLE[code];
  const body: ApiError = { version: CONTRACT_VERSION, error: { code, message, retryable } };
  return json(body, status, headers);
}

export function invalid(message: string): Response {
  return apiError("INVALID_REQUEST", message);
}

/** 405 with an Allow header listing the supported methods. */
export function methodNotAllowed(allowed: readonly string[]): Response {
  const list = allowed.join(", ");
  return apiError("METHOD_NOT_ALLOWED", `This endpoint only accepts ${list} requests.`, { Allow: list });
}

export function internal(): Response {
  return apiError("INTERNAL", "Something went wrong on our side. Your input is kept; try again.");
}

/** Plain-language names for upstream services, used in user-facing messages. */
const UPSTREAM_NAMES: Readonly<Record<UpstreamName, string>> = {
  hpoSearch: "The HPO term search service",
  hpoTerm: "The HPO term service",
  hpoAnnotation: "The HPO annotation service",
  monarchSemsim: "The ranking service",
  orphadata: "The Orphanet service",
  pubCaseFinder: "The PubCaseFinder service",
  clinicalTrials: "The ClinicalTrials.gov service",
};

/** True for engine errors that map to 502 or 504 (where a demo fallback may apply). */
export function isUpstreamFailure(err: unknown): boolean {
  return err instanceof UpstreamTimeout || (err instanceof UpstreamError && err.status !== 429);
}

/** Actionable messages for the fields the engine validates (engine InvalidInput.field). */
const INVALID_FIELD_MESSAGES: Readonly<Record<string, string>> = {
  text: "`text` must be 1 to 8,000 characters. Paste the symptom history, or shorten it, and try again.",
  proposals: "The extraction step produced an unreadable term list. Your notes are kept; try again.",
  q: "`q` needs 2 to 100 characters. Type a longer or shorter search and try again.",
  limit: "`limit` must be a whole number from 1 to 20.",
};

/**
 * Map an engine error to the contract error response.
 * `keptWhat` completes the message, e.g. "Your notes are kept".
 * Anything that is not a known engine error becomes 500 INTERNAL.
 */
export function engineErrorResponse(err: unknown, keptWhat = "Your input is kept"): Response {
  if (err instanceof InvalidInput) {
    return invalid(
      INVALID_FIELD_MESSAGES[err.field] ?? `The field \`${err.field}\` is not valid. Check it and try again.`,
    );
  }
  if (err instanceof UpstreamTimeout) {
    return apiError(
      "UPSTREAM_TIMEOUT",
      `${UPSTREAM_NAMES[err.upstream]} did not answer in time. ${keptWhat}; try again.`,
    );
  }
  if (err instanceof UpstreamError) {
    if (err.status === 429) {
      return apiError(
        "RATE_LIMITED",
        `${UPSTREAM_NAMES[err.upstream]} is receiving too many requests. ${keptWhat}; wait a moment and try again.`,
      );
    }
    return apiError(
      "UPSTREAM_ERROR",
      `${UPSTREAM_NAMES[err.upstream]} returned an error. ${keptWhat}; try again.`,
    );
  }
  logError("engine", err);
  return internal();
}

/**
 * Log an error by class name only. Never pass note text here; engine and LLM
 * error messages do not contain it, but we still log only the name and code.
 */
export function logError(where: string, err: unknown, code?: string): void {
  const name = err instanceof Error ? err.name : typeof err;
  console.error(`[rdd] ${where}: ${name}${code ? ` (${code})` : ""}`);
}

export type BodyResult = { ok: true; value: unknown } | { ok: false; response: Response };

/**
 * Read and parse a JSON request body with a byte cap.
 * Over the cap -> `tooLarge` (default 413 TEXT_TOO_LONG, for bodies whose only
 * large field is `text`; endpoints without `text` pass 400 INVALID_REQUEST);
 * unreadable or malformed JSON -> 400 INVALID_REQUEST.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
  tooLarge: { code: ErrorCode; message: string } = {
    code: "TEXT_TOO_LONG",
    message: "The text is too long. The limit is 8,000 characters; shorten it and try again.",
  },
): Promise<BodyResult> {
  const tooLong = (): BodyResult => ({
    ok: false,
    response: apiError(tooLarge.code, tooLarge.message),
  });
  const declared = Number(request.headers.get("Content-Length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) return tooLong();

  let raw: string;
  try {
    const buf = await request.arrayBuffer();
    if (buf.byteLength > maxBytes) return tooLong();
    raw = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return { ok: false, response: invalid("The request body could not be read as UTF-8 text.") };
  }
  if (raw.trim() === "") return { ok: false, response: invalid("The request body is empty; send a JSON object.") };
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, response: invalid("The request body is not valid JSON.") };
  }
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Demo-cache payload as returned to the client: `source: "demo"` and
 * `dataVersions.demoCache` always set (contract 7.4 failure table). When a
 * recording lacks `demoCache`, its recording date is taken from `fetchedAt`,
 * which for demo data is the recording time (contract section 5).
 */
export function asDemoPayload<T extends { dataVersions: { fetchedAt: string; demoCache?: string } }>(recorded: T): T {
  const dv = { ...recorded.dataVersions };
  if (!dv.demoCache) dv.demoCache = dv.fetchedAt.slice(0, 10);
  return { ...recorded, version: CONTRACT_VERSION, source: "demo", dataVersions: dv };
}

/** Copy of `res` with one extra header (Response headers can be immutable). */
export function withHeader(res: Response, name: string, value: string): Response {
  const headers = new Headers(res.headers);
  headers.set(name, value);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** The Workers default cache, or undefined where the Cache API is not available. */
export function defaultCache(): Cache | undefined {
  const storage = (globalThis as { caches?: { default?: Cache } }).caches;
  return storage?.default;
}
