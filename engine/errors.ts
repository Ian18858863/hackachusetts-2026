// Typed engine errors (design.md "Error handling"). Pages Functions map them to
// the contract error shape (CONTRACT.md section 4). Messages never contain note
// text or stack details meant for users.

import type { UpstreamName } from "./types";

/** Base class so callers can tell engine errors from anything else. */
export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** An upstream service did not answer within its timeout (maps to 504 UPSTREAM_TIMEOUT). */
export class UpstreamTimeout extends EngineError {
  readonly upstream: UpstreamName;
  constructor(upstream: UpstreamName) {
    super(`Upstream ${upstream} timed out`);
    this.upstream = upstream;
  }
}

/** An upstream service returned non-2xx or invalid JSON (maps to 502 UPSTREAM_ERROR). */
export class UpstreamError extends EngineError {
  readonly upstream: UpstreamName;
  readonly status: number | null; // null for network errors or invalid JSON
  constructor(upstream: UpstreamName, status: number | null) {
    super(`Upstream ${upstream} failed${status === null ? "" : ` with HTTP ${status}`}`);
    this.upstream = upstream;
    this.status = status;
  }
}

/** Engine input failed validation (maps to 400 INVALID_REQUEST). */
export class InvalidInput extends EngineError {
  readonly field: string;
  constructor(field: string, detail?: string) {
    super(`Invalid input: ${field}${detail ? ` (${detail})` : ""}`);
    this.field = field;
  }
}

/**
 * Thrown by engine functions that are still placeholders in this skeleton.
 * Never caught inside the engine: a placeholder must fail loudly rather than
 * return anything that looks like medical analysis. Functions should map it to
 * 500 INTERNAL (or fall back to the demo cache where the contract allows).
 */
export class NotImplementedError extends EngineError {
  readonly fn: string;
  constructor(fn: string) {
    super(`Engine function ${fn} is not implemented yet (skeleton placeholder)`);
    this.fn = fn;
  }
}
