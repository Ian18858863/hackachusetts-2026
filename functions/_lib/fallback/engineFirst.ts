// Engine-first dispatch for the T18b functions.
//
// Each handler calls the engine function first. Only a NotImplementedError
// (the engine placeholder) switches to the Ian-owned fallback in this folder.
// Any other engine error is returned as is, so one response always comes from
// one path. When Jerry's implementations land, the engine path takes over
// with no handler change.
//
// The path is reported in the X-RDD-Path response header for QA; it is not
// part of the JSON contract.

import { NotImplementedError } from "../../../engine/index";

export type RddPath = "engine" | "fallback";
export const PATH_HEADER = "X-RDD-Path";

export interface PathError {
  path: RddPath;
  error: unknown;
}

export type PathResult<T> = { ok: true; path: RddPath; value: T } | ({ ok: false } & PathError);

/** Run `engine`; on NotImplementedError run `fallback`. Never throws. */
export async function engineFirst<T>(engine: () => Promise<T> | T, fallback: () => Promise<T> | T): Promise<PathResult<T>> {
  try {
    return { ok: true, path: "engine", value: await engine() };
  } catch (err) {
    if (!(err instanceof NotImplementedError)) return { ok: false, path: "engine", error: err };
  }
  try {
    return { ok: true, path: "fallback", value: await fallback() };
  } catch (err) {
    return { ok: false, path: "fallback", error: err };
  }
}
