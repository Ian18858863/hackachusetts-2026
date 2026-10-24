// Engine / fallback dispatch for the T18b functions, behind a server-side switch (T18g).
//
// Why the switch: Jerry's engine implementations (rankCandidates, nextQuestions,
// searchTrials, buildBrief) can land on main before they are checked against
// the contract v0.1.2 rules that Ian's fallback already follows (10 s Monarch
// timeout, coverage = exact + 0.5 x broader, next-questions hierarchy filter,
// trials relevance). The demo video is recorded from production, so production
// must not change path just because an engine placeholder was replaced.
//
// How to switch (Pages environment variables, or `--binding` for local dev):
//   RDD_ENGINE_PATH            "fallback" (default when unset) | "engine"
//   RDD_ENGINE_PATH_<ENDPOINT> per-endpoint override, wins over RDD_ENGINE_PATH:
//                              RDD_ENGINE_PATH_RANK, RDD_ENGINE_PATH_NEXT_QUESTIONS,
//                              RDD_ENGINE_PATH_TRIALS, RDD_ENGINE_PATH_BRIEF
// Any other value is treated as "fallback".
//
// "fallback": Ian's fallback in this folder runs directly, even if the engine
//   function is implemented.
// "engine":   the engine function runs first; only a NotImplementedError (the
//   engine placeholder) switches to the fallback. Any other engine error is
//   returned as is, so one response always comes from one path.
//
// The path that produced the response is reported in the X-RDD-Path response
// header for QA; it is not part of the JSON contract. Handlers put the chosen
// mode in their cache keys so engine and fallback results never mix.

import { NotImplementedError } from "../../../engine/index";

export type RddPath = "engine" | "fallback";
export const PATH_HEADER = "X-RDD-Path";

export type RddEndpoint = "rank" | "next-questions" | "trials" | "brief";

export interface PathError {
  path: RddPath;
  error: unknown;
}

export type PathResult<T> = { ok: true; path: RddPath; value: T } | ({ ok: false } & PathError);

function parseMode(v: unknown): RddPath | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase();
  if (s === "engine" || s === "fallback") return s;
  return undefined;
}

/** Path mode for one endpoint: per-endpoint override, then RDD_ENGINE_PATH, else "fallback". */
export function enginePathMode(env: Record<string, unknown> | undefined, endpoint: RddEndpoint): RddPath {
  const specific = `RDD_ENGINE_PATH_${endpoint.toUpperCase().replace(/-/g, "_")}`;
  const raw = env?.[specific] ?? env?.RDD_ENGINE_PATH;
  return parseMode(raw) ?? "fallback";
}

/**
 * mode "engine": run `engine`; on NotImplementedError run `fallback`.
 * mode "fallback": run `fallback` only. Never throws.
 */
export async function engineFirst<T>(
  mode: RddPath,
  engine: () => Promise<T> | T,
  fallback: () => Promise<T> | T,
): Promise<PathResult<T>> {
  if (mode === "engine") {
    try {
      return { ok: true, path: "engine", value: await engine() };
    } catch (err) {
      if (!(err instanceof NotImplementedError)) return { ok: false, path: "engine", error: err };
    }
  }
  try {
    return { ok: true, path: "fallback", value: await fallback() };
  } catch (err) {
    return { ok: false, path: "fallback", error: err };
  }
}
